<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import type { IdentityType, IdentityVerificationRequest } from '~/types/identity'

interface IdentityRequestFormProps {
  identityTypes: IdentityType[]
  existingRequests?: any[]
  preSelectedTypeId?: number | null
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

const isIdentityLocked = computed(() => !!props.preSelectedTypeId)

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

const triggerFilePicker = () => {
  if (isSubmitting.value) return
  fileInput.value?.click()
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

const getIcon = (iconName?: string): string => {
  if (!iconName) return '🏷️'

  const iconMap: Record<string, string> = {
    'academic-cap': '🎓',
    'user-group': '👥',
    'shield-check': '🛡️',
    'star': '⭐'
  }

  return iconMap[iconName] || '🏷️'
}

// Pre-select identity type if provided
onMounted(() => {
  if (props.preSelectedTypeId) {
    selectedIdentityTypeId.value = props.preSelectedTypeId
  }
})
</script>

<template>
  <div class="identity-request-form">
    <div class="form-header">
      <div class="header-copy">
        <h3>申请身份验证</h3>
        <p>补充一些能帮助审核的信息，我们会把材料和说明一起提交给管理员。</p>
      </div>
      <button @click="closeForm" class="close-btn" aria-label="关闭">✕</button>
    </div>

    <form @submit.prevent="submitRequest" class="form-content">
      <div v-if="showSuccess" class="alert alert-success">
        <span class="alert-icon">✓</span>
        <div class="alert-content">
          <strong>申请提交成功！</strong>
          <p>您的身份验证申请已提交，管理员将在24-48小时内审核。</p>
        </div>
      </div>

      <div v-if="showError" class="alert alert-error">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <strong>申请失败</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <button @click="showError = false" class="alert-close">✕</button>
      </div>

      <!-- Identity Type Selection -->
      <section class="form-section">
        <label class="form-label">{{ isIdentityLocked ? '当前申请身份' : '选择身份类型 *' }}</label>

        <div
          v-if="isIdentityLocked && selectedIdentityType"
          class="locked-identity-card"
        >
          <div class="locked-identity-header">
            <div class="locked-identity-badge" :style="{ color: selectedIdentityType.color }">
              <span class="locked-identity-icon">
                {{ getIcon(selectedIdentityType.icon_name) }}
              </span>
            </div>
            <div class="locked-identity-details">
              <span class="locked-identity-chip">待提交</span>
              <h4 class="locked-identity-title">{{ selectedIdentityType.display_name }}</h4>
              <p class="locked-identity-label">你目前正在申请该身份认证，提交后将进入人工审核流程。</p>
              <p class="locked-identity-description">
                {{ selectedIdentityType.description }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="identity-type-grid">
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
      </section>

      <!-- Document Upload -->
      <section class="form-section">
        <label class="form-label">上传证明文件（可选）</label>
        <p class="form-hint">
          上传相关证明文件可以帮助加快审核过程。支持 PDF、JPG、PNG 格式，每个文件不超过 5MB。
        </p>

        <div class="upload-shell" :class="{ 'upload-shell--disabled': isSubmitting }">
          <input 
            ref="fileInput"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            @change="handleFileSelect"
            class="file-input"
            :disabled="isSubmitting"
          />

          <div class="upload-content">
            <div class="upload-visual">↑</div>
            <div class="upload-copy">
              <h4>添加证明材料</h4>
              <p>支持教师证明、工牌、学生组织任命材料等，文件将仅用于审核。</p>
            </div>
            <button
              type="button"
              class="upload-trigger"
              :disabled="isSubmitting"
              @click="triggerFilePicker"
            >
              选择文件
            </button>
          </div>
        </div>

        <div v-if="documents.length > 0" class="file-list">
          <div 
            v-for="(file, index) in documents"
            :key="index"
            class="file-item"
          >
            <div class="file-info">
              <span class="file-badge">材料 {{ index + 1 }}</span>
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
      </section>

      <!-- Additional Notes -->
      <section class="form-section">
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
      </section>

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
  background: #fcfeff;
  border-radius: 24px;
  box-shadow: 0 28px 72px rgba(34, 65, 118, 0.18);
  border: 1px solid rgba(181, 212, 255, 0.9);
  max-width: 760px;
  width: 100%;
  max-height: min(88vh, 920px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 480px) {
    border-radius: 18px;
    max-width: 96vw;
    max-height: 92vh;
  }
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.75rem 2rem 1.25rem;
  border-bottom: 1px solid rgba(188, 214, 248, 0.9);
  background:
    linear-gradient(180deg, rgba(240, 248, 255, 0.95) 0%, rgba(252, 254, 255, 0.95) 100%);
  
  @media (max-width: 480px) {
    padding: 1.25rem 1.25rem 1rem;
  }

.header-copy {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    h3 {
      margin: 0;
      color: #20335a;
      font-size: 2rem;
      font-weight: 800;

      @media (max-width: 480px) {
        font-size: 1.45rem;
      }
    }

    p {
      margin: 0;
      color: #5e7497;
      font-size: 0.98rem;
      line-height: 1.6;
    }
  }

  .close-btn {
    background: #ffffff;
    border: 1px solid rgba(188, 214, 248, 0.95);
    font-size: 1.45rem;
    color: #6d82a5;
    cursor: pointer;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border-radius: 999px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: #eef6ff;
      color: #20335a;
      transform: translateY(-1px);
    }
  }
}

.form-content {
  padding: 1.5rem 2rem 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  
  @media (max-width: 480px) {
    padding: 1rem 1.25rem 0;
  }
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.form-label {
  display: block;
  font-weight: 700;
  color: #22355c;
  font-size: 1.1rem;
}

.form-hint {
  margin: 0;
  font-size: 0.98rem;
  color: #6f84a6;
  line-height: 1.7;
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

.locked-identity-card {
  border: 1px solid rgba(171, 205, 252, 0.95);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(240, 248, 255, 0.96) 0%, rgba(247, 251, 255, 0.96) 100%);
  padding: 1.2rem 1.25rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.locked-identity-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
}

.locked-identity-badge {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(189, 216, 249, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.locked-identity-icon {
  font-size: 1.7rem;
  line-height: 1;
}

.locked-identity-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.locked-identity-chip {
  align-self: flex-start;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  background: rgba(46, 130, 255, 0.1);
  color: #2f73de;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.locked-identity-title {
  margin: 0;
  color: #1f3157;
  font-size: 1.55rem;
  font-weight: 800;
}

.locked-identity-label {
  margin: 0;
  color: #445a80;
  font-size: 0.98rem;
  line-height: 1.55;
}

.locked-identity-description {
  margin: 0;
  color: #7c90af;
  line-height: 1.6;
  font-size: 0.96rem;
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

.upload-shell {
  position: relative;
  border: 2px dashed rgba(182, 211, 250, 0.95);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(245, 250, 255, 0.95) 0%, rgba(252, 254, 255, 0.98) 100%);
  padding: 1.2rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(86, 155, 255, 0.95);
    background:
      linear-gradient(180deg, rgba(239, 247, 255, 0.98) 0%, rgba(250, 253, 255, 1) 100%);
  }
}

.upload-shell--disabled {
  opacity: 0.7;
}

.upload-content {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    justify-items: flex-start;
  }
}

.upload-visual {
  width: 3rem;
  height: 3rem;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(187, 215, 249, 0.95);
  color: #2f73de;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  box-shadow: 0 10px 20px rgba(80, 140, 220, 0.1);
}

.upload-copy {
  h4 {
    margin: 0 0 0.3rem;
    color: #20345d;
    font-size: 1rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #7085a7;
    line-height: 1.6;
    font-size: 0.94rem;
  }
}

.upload-trigger {
  border: none;
  border-radius: 12px;
  padding: 0.85rem 1.15rem;
  min-width: 6.5rem;
  background: #2f73de;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #235fbf;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(194, 218, 248, 0.95);
  box-shadow: 0 10px 25px rgba(55, 92, 143, 0.07);
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  
  @media (max-width: 480px) {
    width: 100%;
  }

  .file-badge {
    font-size: 0.76rem;
    font-weight: 700;
    color: #2f73de;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .file-name {
    font-weight: 700;
    color: #21355c;
  }

  .file-size {
    font-size: 0.85rem;
    color: #7186a8;
  }
}

.remove-file-btn {
  background: #fff2f2;
  color: #d34a4a;
  border: 1px solid rgba(238, 178, 178, 0.95);
  border-radius: 12px;
  min-width: 2.5rem;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #ffe4e4;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-textarea {
  width: 100%;
  padding: 1rem 1.05rem;
  border: 1px solid rgba(191, 216, 248, 0.95);
  border-radius: 18px;
  background: #ffffff;
  color: #20345d;
  resize: vertical;
  min-height: 152px;
  font-family: inherit;
  line-height: 1.6;
  box-shadow: inset 0 1px 2px rgba(20, 57, 104, 0.03);

  &:focus {
    outline: none;
    border-color: #5b9fff;
    box-shadow: 0 0 0 4px rgba(91, 159, 255, 0.14);
  }

  &::placeholder {
    color: #91a2bb;
  }

  &:disabled {
    opacity: 0.6;
    background: #f4f8fc;
  }
}

.character-count {
  text-align: right;
  font-size: 0.8rem;
  color: #8fa1b9;
  margin-top: 0.35rem;
}

.alert {
  padding: 1rem 1rem 1rem 1.05rem;
  border-radius: 16px;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  position: relative;

  &.alert-success {
    background: rgba(52, 181, 120, 0.09);
    border: 1px solid rgba(72, 181, 128, 0.34);
    color: #18734c;
  }

  &.alert-error {
    background: rgba(239, 99, 99, 0.1);
    border: 1px solid rgba(226, 116, 116, 0.3);
    color: #b84242;
  }

  .alert-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
    margin-top: 0.05rem;
  }

  .alert-content {
    flex: 1;

    strong {
      display: block;
      margin-bottom: 0.2rem;
    }

    p {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.55;
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
  margin-top: auto;
  padding: 1.15rem 0 1.35rem;
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, rgba(252, 254, 255, 0) 0%, rgba(252, 254, 255, 0.96) 22%, rgba(252, 254, 255, 1) 100%);
  border-top: 1px solid rgba(228, 239, 253, 0.95);
  
  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
}

.btn {
  padding: 0.9rem 1.4rem;
  border: none;
  border-radius: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  justify-content: center;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: linear-gradient(135deg, #2f73de 0%, #4f9cff 100%);
    color: white;
    box-shadow: 0 12px 28px rgba(47, 115, 222, 0.24);

    &:hover:not(:disabled) {
      filter: brightness(0.98);
      transform: translateY(-1px);
    }
  }

  &.btn-secondary {
    background: #ffffff;
    color: #33486d;
    border: 1px solid rgba(194, 218, 248, 0.95);

    &:hover:not(:disabled) {
      background: #f3f8ff;
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
