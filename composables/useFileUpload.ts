import { ref } from 'vue'
import type { UploadOptions, UploadUrlResponse, FileRecord, FileType } from '~/types/file'

export const useFileUpload = () => {
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<Error | null>(null)

  const uploadFile = async (options: UploadOptions) => {
    const { file, fileType, entityType, entityId, onProgress, onSuccess, onError } = options
    
    try {
      isUploading.value = true
      error.value = null
      uploadProgress.value = 0

      // Step 1: Get signed URL from backend
      const { data: uploadUrlData } = await useFetch<UploadUrlResponse>('/api/files/upload', {
        method: 'POST',
        body: {
          filename: file.name,
          file_type: fileType,
          entity_type: entityType,
          entity_id: entityId
        }
      })

      if (!uploadUrlData.value) {
        throw new Error('Failed to get upload URL')
      }

      const { signed_url, file_id } = uploadUrlData.value

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
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
      })

      // Start the upload
      xhr.open('PUT', signed_url)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)

      // Wait for upload to complete
      await uploadPromise

      // Step 3: Poll for file status (since we're using callback)
      const pollInterval = 1000 // 1 second
      const maxAttempts = 30 // 30 seconds timeout
      let attempts = 0

      const pollFileStatus = async (): Promise<FileRecord> => {
        const { data: fileData } = await useFetch<FileRecord>(`/api/files/${file_id}`)
        
        if (!fileData.value) {
          throw new Error('Failed to get file status')
        }

        if (fileData.value.status === 'uploaded') {
          return fileData.value
        }

        if (fileData.value.status === 'error') {
          throw new Error('File upload failed')
        }

        if (attempts >= maxAttempts) {
          throw new Error('File upload status check timeout')
        }

        attempts++
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        return pollFileStatus()
      }

      const fileRecord = await pollFileStatus()
      onSuccess?.(fileRecord)
      return fileRecord

    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Unknown upload error')
      error.value = uploadError
      onError?.(uploadError)
      throw uploadError
    } finally {
      isUploading.value = false
    }
  }

  const deleteFile = async (fileId: number) => {
    try {
      await useFetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })
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
    error
  }
} 