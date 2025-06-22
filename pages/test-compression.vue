<template>
  <div class="test-compression">
    <h1>Image Compression Test</h1>
    <p>This page demonstrates the image compression functionality.</p>
    
    <div class="test-sections">
      <!-- Avatar Upload Test -->
      <div class="test-section">
        <h2>Avatar Upload (512x512, 500KB max)</h2>
        <FileUpload
          file-type="avatar"
          accept="image/*"
          :max-size="5 * 1024 * 1024"
          :show-preview="true"
          :allow-delete="true"
          drag-text="Upload avatar image"
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
        />
      </div>

      <!-- Post Image Upload Test -->
      <div class="test-section">
        <h2>Post Image Upload (1920x1080, 2MB max)</h2>
        <FileUpload
          file-type="post_image"
          accept="image/*"
          :max-size="10 * 1024 * 1024"
          :show-preview="true"
          :allow-delete="true"
          drag-text="Upload post image"
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
        />
      </div>

      <!-- Custom Compression Test -->
      <div class="test-section">
        <h2>Custom Compression (1280x720, 90% quality)</h2>
        <FileUpload
          file-type="post_image"
          accept="image/*"
          :max-size="10 * 1024 * 1024"
          :show-preview="true"
          :allow-delete="true"
          :compression-options="{
            maxWidth: 1280,
            maxHeight: 720,
            quality: 0.9,
            outputFormat: 'image/jpeg'
          }"
          drag-text="Upload with custom compression"
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
        />
      </div>

      <!-- No Compression Test -->
      <div class="test-section">
        <h2>No Compression (Original Size)</h2>
        <FileUpload
          file-type="post_image"
          accept="image/*"
          :max-size="10 * 1024 * 1024"
          :show-preview="true"
          :allow-delete="true"
          :enable-compression="false"
          drag-text="Upload without compression"
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
        />
      </div>
    </div>

    <!-- Test Results -->
    <div v-if="uploadResults.length > 0" class="test-results">
      <h2>Upload Results</h2>
      <div class="results-grid">
        <div
          v-for="(result, index) in uploadResults"
          :key="index"
          class="result-card"
        >
          <h3>{{ result.type }}</h3>
          <p><strong>File:</strong> {{ result.filename }}</p>
          <p><strong>Status:</strong> {{ result.status }}</p>
          <p v-if="result.compression">
            <strong>Compression:</strong> 
            {{ result.compression.originalSize }} → {{ result.compression.compressedSize }} bytes
            ({{ Math.round((1 - result.compression.compressionRatio) * 100) }}% reduction)
          </p>
          <p v-if="result.error"><strong>Error:</strong> {{ result.error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileRecord } from '~/types/file'

interface UploadResult {
  type: string
  filename: string
  status: 'success' | 'error'
  compression?: {
    originalSize: number
    compressedSize: number
    compressionRatio: number
  }
  error?: string
}

const uploadResults = ref<UploadResult[]>([])

const handleUploadSuccess = (file: FileRecord) => {
  console.log('Upload success:', file)
  uploadResults.value.unshift({
    type: file.file_type,
    filename: file.original_filename,
    status: 'success'
  })
}

const handleUploadError = (error: Error) => {
  console.error('Upload error:', error)
  uploadResults.value.unshift({
    type: 'unknown',
    filename: 'unknown',
    status: 'error',
    error: error.message
  })
}
</script>

<style scoped>
.test-compression {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.test-sections {
  display: grid;
  gap: 2rem;
  margin: 2rem 0;
}

.test-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafafa;
}

.test-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
}

.test-results {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px solid #ddd;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.result-card {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 1rem;
  background: white;
}

.result-card h3 {
  margin: 0 0 0.5rem 0;
  color: #555;
  font-size: 1rem;
}

.result-card p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

h1 {
  color: #333;
  margin-bottom: 0.5rem;
}

h1 + p {
  color: #666;
  margin-bottom: 2rem;
}
</style>