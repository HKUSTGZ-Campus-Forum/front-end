import { computed, ref } from 'vue'
import type { UploadOptions, UploadUrlResponse, FileRecord, FileType } from '~/types/file'
import { useApi } from './useApi'
import { compressImage, COMPRESSION_PRESETS, type CompressionOptions, type CompressionResult } from '~/utils/imageCompression'
import { FileUploadError } from '~/utils/fileUploadError'

export const useCustomFileUpload = () => {
  const activeUploads = ref(0)
  const isUploading = computed(() => activeUploads.value > 0)
  const uploadProgress = ref(0)
  const error = ref<Error | null>(null)
  const compressionInfo = ref<CompressionResult | null>(null)
  const { fetchWithAuth } = useApi()

  const readApiError = async (response: Response, fallback: string) => {
    const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null
    return payload?.message || payload?.error || fallback
  }

  const uploadFile = async (options: UploadOptions) => {
    const { file, fileType, entityType, entityId, maxUploadBytes, onProgress, onSuccess, onError, enableCompression, compressionOptions, signal } = options
    
    try {
      activeUploads.value += 1
      error.value = null
      uploadProgress.value = 0
      compressionInfo.value = null

      // Step 1: Compress image if enabled and file is an image
      let fileToUpload = file
      const isImage = file.type.startsWith('image/')
      const preservesAnimationOrVector = file.type === 'image/gif' || file.type === 'image/svg+xml'
      const shouldCompress = enableCompression !== false && isImage && !preservesAnimationOrVector

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

          // Forum images keep their original alpha-capable format. Converting
          // every PNG/WebP to JPEG used to destroy transparency.
          if (fileType === 'post_image' && file.type === 'image/png') {
            compressionOpts = { ...compressionOpts, outputFormat: 'image/png' }
          } else if (fileType === 'post_image' && file.type === 'image/webp') {
            compressionOpts = { ...compressionOpts, outputFormat: 'image/webp' }
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
        throw new FileUploadError(
          'signing_failed',
          await readApiError(response, 'Could not prepare the upload.'),
        )
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
        xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
        xhr.ontimeout = xhr.onerror
      })

      const abortUpload = () => xhr.abort()
      signal?.addEventListener('abort', abortUpload, { once: true })

      // Start the upload
      xhr.open('PUT', httpsSignedUrl)
      xhr.timeout = 60_000
      xhr.setRequestHeader('Content-Type', effectiveContentType)
      xhr.send(fileToUpload)

      // Wait for upload to complete
      try {
        await uploadPromise
      } finally {
        signal?.removeEventListener('abort', abortUpload)
      }

      // Step 3: Authenticated server-side verification against OSS metadata.
      let completionResponse: Response
      try {
        completionResponse = await fetchWithAuth(`/api/files/${file_id}/complete`, {
          method: 'POST'
        })
      } catch (cause) {
        throw new FileUploadError('status_failed', 'Could not confirm the uploaded file.', { cause })
      }
      if (!completionResponse.ok) {
        throw new FileUploadError(
          'status_failed',
          await readApiError(completionResponse, 'File upload verification failed'),
        )
      }
      const fileRecord = await completionResponse.json() as FileRecord
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
      activeUploads.value = Math.max(0, activeUploads.value - 1)
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
