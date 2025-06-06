<template>
  <div class="file-upload">
    <!-- Upload Button -->
    <div
      class="upload-button"
      :class="{ 'is-uploading': isUploading }"
      @click="triggerFileInput"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        class="hidden"
        @change="handleFileSelect"
      >
      
      <div v-if="!isUploading" class="upload-content">
        <Icon name="upload" class="upload-icon" />
        <span class="upload-text">
          {{ dragText || 'Click or drag files to upload' }}
        </span>
        <span v-if="maxSize" class="upload-hint">
          Max size: {{ formatFileSize(maxSize) }}
        </span>
      </div>

      <!-- Upload Progress -->
      <div v-else class="upload-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ Math.round(uploadProgress) }}%</span>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error.message }}
    </div>

    <!-- Preview (if enabled) -->
    <div v-if="showPreview && uploadedFile" class="preview-container">
      <img
        v-if="isImage"
        :src="uploadedFile.url"
        :alt="uploadedFile.original_filename"
        class="preview-image"
      >
      <div v-else class="preview-file">
        <Icon name="file" class="file-icon" />
        <span class="file-name">{{ uploadedFile.original_filename }}</span>
      </div>
      <button
        v-if="allowDelete"
        class="delete-button"
        @click="handleDelete"
      >
        <Icon name="delete" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FileType, FileRecord } from '~/types/file'
import { useFileUpload } from '~/composables/useFileUpload'

const props = defineProps<{
  fileType: FileType
  entityType?: string
  entityId?: number
  accept?: string
  maxSize?: number // in bytes
  showPreview?: boolean
  allowDelete?: boolean
  dragText?: string
}>()

const emit = defineEmits<{
  (e: 'upload-success', file: FileRecord): void
  (e: 'upload-error', error: Error): void
  (e: 'delete-success'): void
  (e: 'delete-error', error: Error): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploadedFile = ref<FileRecord | null>(null)
const isDragging = ref(false)

const { uploadFile, deleteFile, isUploading, uploadProgress, error } = useFileUpload()

const isImage = computed(() => {
  if (!uploadedFile.value?.url) return false
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(uploadedFile.value.original_filename)
})

const triggerFileInput = () => {
  if (!isUploading.value) {
    fileInput.value?.click()
  }
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  await processFile(file)
}

const handleDragOver = () => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    await processFile(file)
  }
}

const processFile = async (file: File) => {
  // Validate file size
  if (props.maxSize && file.size > props.maxSize) {
    emit('upload-error', new Error(`File size exceeds ${formatFileSize(props.maxSize)}`))
    return
  }

  try {
    const fileRecord = await uploadFile({
      file,
      fileType: props.fileType,
      entityType: props.entityType,
      entityId: props.entityId,
      onSuccess: (record) => {
        uploadedFile.value = record
        emit('upload-success', record)
      },
      onError: (err) => emit('upload-error', err)
    })
  } catch (err) {
    // Error is already handled by useFileUpload
    console.error('Upload failed:', err)
  }
}

const handleDelete = async () => {
  if (!uploadedFile.value) return

  try {
    await deleteFile(uploadedFile.value.id)
    uploadedFile.value = null
    emit('delete-success')
  } catch (err) {
    emit('delete-error', err as Error)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.upload-button {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-button:hover {
  border-color: #999;
  background: #f5f5f5;
}

.upload-button.is-uploading {
  cursor: not-allowed;
  border-style: solid;
  border-color: #4a90e2;
}

.hidden {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  font-size: 2rem;
  color: #666;
}

.upload-text {
  color: #666;
  font-size: 1rem;
}

.upload-hint {
  color: #999;
  font-size: 0.875rem;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4a90e2;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #666;
}

.error-message {
  margin-top: 0.5rem;
  color: #dc3545;
  font-size: 0.875rem;
}

.preview-container {
  margin-top: 1rem;
  position: relative;
  display: inline-block;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
}

.preview-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.file-icon {
  font-size: 1.5rem;
  color: #666;
}

.file-name {
  font-size: 0.875rem;
  color: #333;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
}

.delete-button:hover {
  background: rgba(0, 0, 0, 0.7);
}
</style> 