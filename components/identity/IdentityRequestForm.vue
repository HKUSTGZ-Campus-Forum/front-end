<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import type { IdentityType, IdentityVerificationRequest } from '~/types/identity'

interface IdentityRequestFormProps {
  identityTypes: IdentityType[]
  existingRequests?: any[]
}

interface IdentityRequestFormEmits {
  (e: 'request-submitted', request: any): void
  (e: 'close'): void
}

const props = defineProps<IdentityRequestFormProps>()
const emit = defineEmits<IdentityRequestFormEmits>()

const { fetchWithAuth } = useApi()
const { isLoggedIn } = useAuth()

// Form state
const selectedIdentityTypeId = ref<number | null>(null)
const documents = ref<File[]>([])
const notes = ref('')
const isSubmitting = ref(false)

// UI state
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')

// File input ref
const fileInput = ref<HTMLInputElement>()

// Computed properties
const selectedIdentityType = computed(() => {
  return props.identityTypes.find(type => type.id === selectedIdentityTypeId.value)
})

const hasExistingRequest = computed(() => {
  if (!props.existingRequests || !selectedIdentityTypeId.value) return false
  return props.existingRequests.some(req => 
    req.identity_type_id === selectedIdentityTypeId.value && 
    req.status === 'pending'
  )
})

const canSubmit = computed(() => {
  return selectedIdentityTypeId.value && 
         !isSubmitting.value && 
         !hasExistingRequest.value &&
         isLoggedIn.value
})

// Methods
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    documents.value = Array.from(target.files)
  }
}

const removeFile = (index: number) => {
  documents.value.splice(index, 1)
  // Clear the file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const submitRequest = async () => {
  if (!canSubmit.value) return

  isSubmitting.value = true
  showError.value = false

  try {
    // First, upload any documents
    const documentIds: number[] = []
    
    for (const file of documents.value) {
      try {
        // Request upload URL
        const uploadResponse = await fetchWithAuth('/api/files/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: file.name,
            file_type: 'identity_document',
            entity_type: 'identity_verification',
            entity_id: null, // Will be set after verification is created
            content_type: file.type
          })
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload URL request failed: ${uploadResponse.status}`)
        }

        const { upload_url, file_id } = await uploadResponse.json()

        // Upload file directly to OSS
        const uploadFileResponse = await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        })

        if (!uploadFileResponse.ok) {
          throw new Error(`File upload failed: ${uploadFileResponse.status}`)
        }

        documentIds.push(file_id)
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        errorMessage.value = `文件上传失败: ${file.name}`
        showError.value = true
        isSubmitting.value = false
        return
      }
    }

    // Submit identity verification request
    const requestData: IdentityVerificationRequest = {
      identity_type_id: selectedIdentityTypeId.value!,
      notes: notes.value.trim() || undefined
    }

    const response = await fetchWithAuth('/api/identities/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...requestData,
        document_file_ids: documentIds.length > 0 ? documentIds : undefined
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed: ${response.status}`)
    }

    const result = await response.json()

    // Success
    showSuccess.value = true
    resetForm()
    emit('request-submitted', result)

    // Auto-close success message after 3 seconds
    setTimeout(() => {
      showSuccess.value = false
      emit('close')
    }, 3000)

  } catch (error) {
    console.error('Identity request submission failed:', error)
    errorMessage.value = error instanceof Error ? error.message : '提交失败，请重试'
    showError.value = true
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  selectedIdentityTypeId.value = null
  documents.value = []
  notes.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const closeForm = () => {
  resetForm()
  emit('close')
}

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="identity-request-form">
    <div class="form-header">
      <h3>申请身份验证</h3>
      <button @click="closeForm" class="close-btn" aria-label="关闭">✕</button>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccess" class="alert alert-success">
      <span class="alert-icon">✓</span>
      <div class="alert-content">
        <strong>申请提交成功！</strong>
        <p>您的身份验证申请已提交，管理员将在24-48小时内审核。</p>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="showError" class="alert alert-error">
      <span class="alert-icon">⚠️</span>
      <div class="alert-content">
        <strong>申请失败</strong>
        <p>{{ errorMessage }}</p>
      </div>
      <button @click="showError = false" class="alert-close">✕</button>
    </div>

    <form @submit.prevent="submitRequest" class="form-content">
      <!-- Identity Type Selection -->
      <div class="form-group">
        <label class="form-label">选择身份类型 *</label>
        <div class="identity-type-grid">
          <div 
            v-for="identityType in identityTypes.filter(type => type.is_active)"
            :key="identityType.id"
            class="identity-type-option"
            :class="{ 
              'selected': selectedIdentityTypeId === identityType.id,
              'disabled': existingRequests?.some(req => 
                req.identity_type_id === identityType.id && req.status === 'pending'
              )
            }"
            @click="selectedIdentityTypeId = identityType.id"
          >
            <div class="identity-type-header">
              <span class="identity-type-icon" :style="{ color: identityType.color }">
                {{ identityType.icon_name === 'academic-cap' ? '🎓' : 
                   identityType.icon_name === 'user-group' ? '👥' :
                   identityType.icon_name === 'shield-check' ? '🛡️' :
                   identityType.icon_name === 'star' ? '⭐' : '🏷️' }}
              </span>
              <span class="identity-type-name">{{ identityType.display_name }}</span>
            </div>
            <p class="identity-type-description">{{ identityType.description }}</p>
            
            <!-- Existing request warning -->
            <div 
              v-if="existingRequests?.some(req => 
                req.identity_type_id === identityType.id && req.status === 'pending'
              )"
              class="existing-request-notice"
            >
              已有待审核申请
            </div>
          </div>
        </div>
      </div>

      <!-- Document Upload -->
      <div class="form-group">
        <label class="form-label">上传证明文件（可选）</label>
        <p class="form-hint">
          上传相关证明文件可以帮助加快审核过程。支持 PDF、JPG、PNG 格式，每个文件不超过 5MB。
        </p>
        
        <input 
          ref="fileInput"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          @change="handleFileSelect"
          class="file-input"
          :disabled="isSubmitting"
        />
        
        <!-- File List -->
        <div v-if="documents.length > 0" class="file-list">
          <div 
            v-for="(file, index) in documents"
            :key="index"
            class="file-item"
          >
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
            <button 
              type="button"
              @click="removeFile(index)"
              class="remove-file-btn"
              :disabled="isSubmitting"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Additional Notes -->
      <div class="form-group">
        <label class="form-label">补充说明（可选）</label>
        <textarea
          v-model="notes"
          placeholder="请提供任何有助于验证您身份的补充信息..."
          rows="4"
          class="form-textarea"
          :disabled="isSubmitting"
          maxlength="500"
        ></textarea>
        <div class="character-count">{{ notes.length }}/500</div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button
          type="button"
          @click="closeForm"
          class="btn btn-secondary"
          :disabled="isSubmitting"
        >
          取消
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!canSubmit"
        >
          <span v-if="isSubmitting" class="loading-spinner">⟳</span>
          {{ isSubmitting ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.identity-request-form {
  background: var(--surface-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-large);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  
  @media (max-width: 480px) {
    border-radius: 8px;
    max-width: 95vw;
    max-height: 95vh;
  }
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-primary);
  
  @media (max-width: 480px) {
    padding: 1rem 1.5rem;
  }

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.5rem;
    
    @media (max-width: 480px) {
      font-size: 1.25rem;
    }
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }
  }
}

.form-content {
  padding: 2rem;
  
  @media (max-width: 480px) {
    padding: 1.5rem;
  }
}

.form-group {
  margin-bottom: 2rem;
  
  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
  }
}

.form-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.form-hint {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.identity-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

.identity-type-option {
  border: 2px solid var(--border-primary);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  @media (max-width: 480px) {
    padding: 1rem;
  }

  &:hover:not(.disabled) {
    border-color: var(--interactive-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-small);
  }

  &.selected {
    border-color: var(--interactive-primary);
    background: var(--interactive-primary)10;
  }

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    
    .existing-request-notice {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: var(--warning);
      color: white;
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
  }

  .identity-type-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .identity-type-icon {
    font-size: 1.5rem;
  }

  .identity-type-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  .identity-type-description {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
  }
}

.file-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px dashed var(--border-primary);
  border-radius: 8px;
  background: var(--surface-secondary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--interactive-primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.file-list {
  margin-top: 1rem;
  space-y: 0.5rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-primary);
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  @media (max-width: 480px) {
    width: 100%;
  }

  .file-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .file-size {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
}

.remove-file-btn {
  background: var(--error);
  color: white;
  border: none;
  border-radius: 4px;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--error-dark);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--surface-primary);
  color: var(--text-primary);
  resize: vertical;
  min-height: 100px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px var(--interactive-primary)20;
  }

  &::placeholder {
    color: var(--text-muted);
  }

  &:disabled {
    opacity: 0.6;
    background: var(--surface-secondary);
  }
}

.character-count {
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.alert {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  position: relative;

  &.alert-success {
    background: var(--success)20;
    border: 1px solid var(--success);
    color: var(--success-dark);
  }

  &.alert-error {
    background: var(--error)20;
    border: 1px solid var(--error);
    color: var(--error-dark);
  }

  .alert-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .alert-content {
    flex: 1;

    strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
    }
  }

  .alert-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    
    &:hover {
      background: var(--surface-secondary);
    }
  }
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  
  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: var(--interactive-primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--interactive-primary-dark);
      transform: translateY(-1px);
    }
  }

  &.btn-secondary {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);

    &:hover:not(:disabled) {
      background: var(--surface-tertiary);
    }
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>