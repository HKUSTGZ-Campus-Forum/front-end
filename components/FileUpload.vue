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

    <!-- Compression Info -->
    <div v-if="compressionInfo && compressionInfo.wasCompressed" class="compression-info">
      <span class="compression-text">
        📷 Compressed: {{ formatFileSize(compressionInfo.originalSize) }} → {{ formatFileSize(compressionInfo.compressedSize) }}
        ({{ Math.round((1 - compressionInfo.compressionRatio) * 100) }}% reduction)
      </span>
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
  /** Enable automatic image compression (default: true for images) */
  enableCompression?: boolean
  /** Custom compression options */
  compressionOptions?: import('~/utils/imageCompression').CompressionOptions
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

const { uploadFile, deleteFile, isUploading, uploadProgress, error, compressionInfo } = useFileUpload()

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
      enableCompression: props.enableCompression,
      compressionOptions: props.compressionOptions,
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
  border: 2px dashed var(--border-primary);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--surface-secondary);
}

.upload-button:hover {
  border-color: var(--border-secondary);
  background: var(--interactive-secondary);
}

.upload-button.is-uploading {
  cursor: not-allowed;
  border-style: solid;
  border-color: var(--interactive-primary);
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
  color: var(--text-secondary);
}

.upload-text {
  color: var(--text-secondary);
  font-size: 1rem;
}

.upload-hint {
  color: var(--text-muted);
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
  background: var(--surface-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--interactive-primary);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.error-message {
  margin-top: 0.5rem;
  color: var(--semantic-error);
  font-size: 0.875rem;
}

.compression-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 4px;
}

.compression-text {
  color: #2d5016;
  font-size: 0.875rem;
  font-weight: 500;
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
  background: var(--surface-secondary);
  border-radius: 4px;
}

.file-icon {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.file-name {
  font-size: 0.875rem;
  color: var(--text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem;
  min-width: 2rem;
  min-height: 2rem;
  background: rgba(255, 0, 0, 0.8);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.delete-button:hover {
  background: rgba(255, 0, 0, 1);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.3);
}
</style> 