import { ref } from 'vue'
import type { UploadOptions, UploadUrlResponse, FileRecord, FileType } from '~/types/file'
import { useApi } from './useApi'
import { compressImage, COMPRESSION_PRESETS, type CompressionOptions, type CompressionResult } from '~/utils/imageCompression'
import { FileUploadError } from '~/utils/fileUploadError'

export const useCustomFileUpload = () => {
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<Error | null>(null)
  const compressionInfo = ref<CompressionResult | null>(null)
  const { fetchWithAuth } = useApi()

  const uploadFile = async (options: UploadOptions) => {
    const { file, fileType, entityType, entityId, maxUploadBytes, onProgress, onSuccess, onError, enableCompression, compressionOptions } = options
    
    try {
      isUploading.value = true
      error.value = null
      uploadProgress.value = 0
      compressionInfo.value = null

      // Step 1: Compress image if enabled and file is an image
      let fileToUpload = file
      const isImage = file.type.startsWith('image/')
      const shouldCompress = enableCompression !== false && isImage // Default to true for images

      if (shouldCompress) {
        try {
          // Choose compression preset based on file type
          let compressionOpts = compressionOptions
          if (!compressionOpts) {
            switch (fileType) {
              case 'avatar':
                compressionOpts = COMPRESSION_PRESETS.avatar
                break
              case 'post_image':
                compressionOpts = COMPRESSION_PRESETS.web
                break
              default:
                compressionOpts = COMPRESSION_PRESETS.web
            }
          }

          const compressionResult = await compressImage(file, compressionOpts)
          compressionInfo.value = compressionResult
          fileToUpload = compressionResult.file

          // Log compression results for debugging
          if (compressionResult.wasCompressed) {
            console.log(`Image compressed: ${compressionResult.originalSize} → ${compressionResult.compressedSize} bytes (${Math.round(compressionResult.compressionRatio * 100)}%)`)
          }
        } catch (compressionError) {
          console.warn('Image compression failed, uploading original file:', compressionError)
          // Continue with original file if compression fails
        }
      }

      if (maxUploadBytes != null && fileToUpload.size > maxUploadBytes) {
        throw new FileUploadError(
          'file_too_large',
          `File exceeds the ${Math.round(maxUploadBytes / (1024 * 1024))} MB upload limit.`,
        )
      }

      const effectiveContentType =
        fileToUpload.type && fileToUpload.type.trim().length > 0
          ? fileToUpload.type
          : 'application/octet-stream'

      // Step 2: Get signed URL from backend
      let response: Response
      try {
        response = await fetchWithAuth('/api/files/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: fileToUpload.name,
            file_type: fileType,
            entity_type: entityType,
            entity_id: entityId,
            content_type: effectiveContentType,
            file_size: fileToUpload.size
          })
        })
      } catch (cause) {
        throw new FileUploadError('signing_failed', 'Could not prepare the upload.', { cause })
      }

      if (!response.ok) {
        throw new FileUploadError('signing_failed', 'Could not prepare the upload.')
      }

      const uploadUrlData = await response.json().catch((cause) => {
        throw new FileUploadError('signing_failed', 'The upload service returned an invalid response.', { cause })
      }) as UploadUrlResponse
      const { signed_url, file_id } = uploadUrlData
      if (typeof signed_url !== 'string' || !Number.isInteger(file_id)) {
        throw new FileUploadError('signing_failed', 'The upload service returned an invalid response.')
      }

      // Fix Mixed Content issue: Force HTTPS for OSS uploads
      const httpsSignedUrl = signed_url.replace(/^http:\/\//, 'https://')

      // Step 2: Upload file to OSS using signed URL
      const xhr = new XMLHttpRequest()
      
      // Setup progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          uploadProgress.value = progress
          onProgress?.(progress)
        }
      }

      // Create a promise to handle the upload
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new FileUploadError('storage_rejected', 'The storage service rejected the upload.'))
          }
        }
        xhr.onerror = () => reject(new FileUploadError(
          'storage_network_error',
          'Could not connect to the file storage service.',
        ))
        xhr.onabort = xhr.onerror
        xhr.ontimeout = xhr.onerror
      })

      // Start the upload
      xhr.open('PUT', httpsSignedUrl)
      xhr.timeout = 60_000
      xhr.setRequestHeader('Content-Type', effectiveContentType)
      xhr.send(fileToUpload)

      // Wait for upload to complete
      await uploadPromise

      // Step 3: Poll for file status (since we're using callback)
      const pollInterval = 1000 // 1 second
      const maxAttempts = 30 // 30 seconds timeout
      let attempts = 0

      const pollFileStatus = async (): Promise<FileRecord> => {
        let response: Response
        try {
          response = await fetchWithAuth(`/api/files/${file_id}`)
        } catch (cause) {
          throw new FileUploadError('status_failed', 'Could not confirm the uploaded file.', { cause })
        }
        
        if (!response.ok) {
          throw new FileUploadError('status_failed', 'Could not confirm the uploaded file.')
        }

        const fileData = await response.json() as FileRecord

        if (fileData.status === 'uploaded') {
          return fileData
        }

        if (fileData.status === 'error') {
          throw new FileUploadError('upload_failed', 'The file upload failed.')
        }

        if (attempts >= maxAttempts) {
          throw new FileUploadError('status_timeout', 'Timed out while confirming the uploaded file.')
        }

        attempts++
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        return pollFileStatus()
      }

      const fileRecord = await pollFileStatus()
      onSuccess?.(fileRecord)
      return fileRecord

    } catch (err) {
      const uploadError = err instanceof Error
        ? err
        : new FileUploadError('upload_failed', 'The file upload failed.')
      error.value = uploadError
      onError?.(uploadError)
      throw uploadError
    } finally {
      isUploading.value = false
    }
  }

  const deleteFile = async (fileId: number) => {
    try {
      const response = await fetchWithAuth(`/api/files/${fileId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to delete file: ${response.status} ${errorText}`)
      }
    } catch (err) {
      const deleteError = err instanceof Error ? err : new Error('Failed to delete file')
      error.value = deleteError
      throw deleteError
    }
  }

  return {
    uploadFile,
    deleteFile,
    isUploading,
    uploadProgress,
    error,
    compressionInfo
  }
}
