<template>
  <div class="identity-management-page">
    <div class="page-header">
      <h1>身份管理</h1>
      <p class="page-description">
        管理您的身份验证，申请新的身份类型，以及设置默认显示身份。
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <span class="loading-spinner">⟳</span>
      <span>加载中...</span>
    </div>

    <!-- Error State -->
    <div v-if="error && !isLoading" class="error-container">
      <span class="error-icon">⚠️</span>
      <div class="error-content">
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="fetchData" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="!isLoading && !error" class="content">
      <!-- Current Display Identity -->
      <section class="section">
        <div class="section-header">
          <h2>当前显示身份</h2>
          <p class="section-description">
            选择在发布帖子和评论时默认使用的身份。
          </p>
        </div>
        
        <div class="current-display-identity">
          <div class="identity-display">
            <div v-if="currentDisplayIdentity" class="selected-identity">
              <IdentityBadge 
                :identity="currentDisplayIdentity"
                size="md"
                :show-tooltip="false"
              />
              <div class="identity-details">
                <h3>{{ currentDisplayIdentity.identity_type.display_name }}</h3>
                <p>{{ currentDisplayIdentity.identity_type.description }}</p>
                <span class="status approved">已认证</span>
              </div>
            </div>
            <div v-else class="no-identity">
              <span class="icon">👤</span>
              <div class="details">
                <h3>普通用户</h3>
                <p>当前以普通身份发布内容</p>
              </div>
            </div>
          </div>

          <div class="display-actions">
            <button 
              @click="showIdentitySelector = true"
              class="btn btn-primary"
              :disabled="approvedIdentities.length === 0"
            >
              更改显示身份
            </button>
            <button 
              v-if="currentDisplayIdentity"
              @click="clearDisplayIdentity"
              class="btn btn-secondary"
              :disabled="updatingDisplay"
            >
              {{ updatingDisplay ? '更新中...' : '使用普通身份' }}
            </button>
          </div>
        </div>
      </section>

      <!-- My Identities -->
      <section class="section">
        <div class="section-header">
          <h2>我的身份</h2>
          <p class="section-description">
            查看和管理您已申请的身份认证状态。
          </p>
          <button 
            @click="showRequestForm = true"
            class="btn btn-primary"
          >
            申请新身份
          </button>
        </div>

        <div v-if="userIdentities.length === 0" class="empty-state">
          <span class="empty-icon">📝</span>
          <h3>暂无身份申请</h3>
          <p>您还没有申请任何身份认证，点击上方按钮开始申请。</p>
        </div>

        <div v-else class="identities-grid">
          <div 
            v-for="identity in userIdentities"
            :key="identity.id"
            class="identity-card"
            :class="`status-${identity.status}`"
          >
            <div class="card-header">
              <div class="identity-info">
                <div class="identity-icon-wrapper">
                  <span 
                    class="identity-icon"
                    :style="{ color: identity.identity_type.color }"
                  >
                    {{ getIcon(identity.identity_type.icon_name) }}
                  </span>
                </div>
                <div class="identity-details">
                  <h3>{{ identity.identity_type.display_name }}</h3>
                  <p>{{ identity.identity_type.description }}</p>
                </div>
              </div>
              
              <div class="status-badge" :class="`status-${identity.status}`">
                <span class="status-icon">{{ getStatusIcon(identity.status) }}</span>
                <span class="status-text">{{ getStatusText(identity.status) }}</span>
              </div>
            </div>

            <div class="card-content">
              <div class="timeline-info">
                <div class="timeline-item">
                  <span class="label">申请时间:</span>
                  <span class="value">{{ formatDate(identity.created_at) }}</span>
                </div>
                <div v-if="identity.verified_at" class="timeline-item">
                  <span class="label">验证时间:</span>
                  <span class="value">{{ formatDate(identity.verified_at) }}</span>
                </div>
                <div v-if="identity.expires_at" class="timeline-item">
                  <span class="label">过期时间:</span>
                  <span class="value">{{ formatDate(identity.expires_at) }}</span>
                </div>
              </div>

              <!-- Status-specific content -->
              <div v-if="identity.status === 'rejected'" class="rejection-info">
                <h4>拒绝原因</h4>
                <p>{{ identity.rejection_reason || '未提供具体原因' }}</p>
              </div>

              <div v-if="identity.notes" class="admin-notes">
                <h4>管理员备注</h4>
                <p>{{ identity.notes }}</p>
              </div>

              <!-- Actions -->
              <div class="card-actions">
                <button 
                  v-if="identity.status === 'approved'"
                  @click="setDisplayIdentity(identity)"
                  :disabled="currentDisplayIdentity?.id === identity.id || updatingDisplay"
                  class="btn btn-sm btn-primary"
                >
                  {{ currentDisplayIdentity?.id === identity.id ? '当前显示' : '设为默认' }}
                </button>
                
                <button 
                  v-if="identity.status === 'pending'"
                  @click="withdrawRequest(identity.id)"
                  :disabled="withdrawing.has(identity.id)"
                  class="btn btn-sm btn-danger"
                >
                  {{ withdrawing.has(identity.id) ? '撤回中...' : '撤回申请' }}
                </button>
                
                <button 
                  v-if="identity.status === 'rejected'"
                  @click="reapplyIdentity(identity)"
                  class="btn btn-sm btn-secondary"
                >
                  重新申请
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Available Identity Types -->
      <section class="section">
        <div class="section-header">
          <h2>可申请的身份类型</h2>
          <p class="section-description">
            以下是您可以申请的身份认证类型。
          </p>
        </div>

        <div class="available-types-grid">
          <div 
            v-for="identityType in availableTypes"
            :key="identityType.id"
            class="type-card"
            :class="{ 'type-disabled': hasExistingRequest(identityType.id) }"
          >
            <div class="type-header">
              <span 
                class="type-icon"
                :style="{ color: identityType.color }"
              >
                {{ getIcon(identityType.icon_name) }}
              </span>
              <div class="type-info">
                <h3>{{ identityType.display_name }}</h3>
                <p>{{ identityType.description }}</p>
              </div>
            </div>

            <div class="type-actions">
              <button 
                v-if="!hasExistingRequest(identityType.id)"
                @click="requestIdentity(identityType)"
                class="btn btn-sm btn-outline"
              >
                申请认证
              </button>
              <span 
                v-else
                class="existing-status"
              >
                {{ getExistingRequestStatus(identityType.id) }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modals -->
    <!-- Identity Selector Modal -->
    <div v-if="showIdentitySelector" class="modal-overlay" @click="showIdentitySelector = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>选择显示身份</h3>
          <button @click="showIdentitySelector = false" class="modal-close">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="identity-options">
            <!-- Regular user option -->
            <div 
              class="identity-option"
              :class="{ 'selected': !selectedDisplayId }"
              @click="selectedDisplayId = null"
            >
              <div class="option-content">
                <span class="option-icon">👤</span>
                <div class="option-details">
                  <h4>普通用户</h4>
                  <p>以普通身份发布内容</p>
                </div>
              </div>
            </div>

            <!-- Approved identities -->
            <div 
              v-for="identity in approvedIdentities"
              :key="identity.id"
              class="identity-option"
              :class="{ 'selected': selectedDisplayId === identity.id }"
              @click="selectedDisplayId = identity.id"
            >
              <div class="option-content">
                <span 
                  class="option-icon"
                  :style="{ color: identity.identity_type.color }"
                >
                  {{ getIcon(identity.identity_type.icon_name) }}
                </span>
                <div class="option-details">
                  <h4>{{ identity.identity_type.display_name }}</h4>
                  <p>{{ identity.identity_type.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showIdentitySelector = false" class="btn btn-secondary">取消</button>
          <button @click="confirmDisplayIdentity" class="btn btn-primary" :disabled="updatingDisplay">
            {{ updatingDisplay ? '更新中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Request Form Modal -->
    <div v-if="showRequestForm" class="modal-overlay" @click="showRequestForm = false">
      <div class="modal-content large" @click.stop>
        <IdentityRequestForm
          :identity-types="identityTypes"
          :existing-requests="userIdentities"
          :pre-selected-type-id="preSelectedTypeId"
          @request-submitted="handleRequestSubmitted"
          @close="showRequestForm = false"
        />
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="successMessage" class="toast toast-success">
      <span class="toast-icon">✓</span>
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="errorMessage" class="toast toast-error">
      <span class="toast-icon">⚠️</span>
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="toast-close">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useIdentity } from '~/composables/useIdentity'
import { useAuth } from '~/composables/useAuth'
import IdentityBadge from '~/components/identity/IdentityBadge.vue'
import IdentityRequestForm from '~/components/identity/IdentityRequestForm.vue'
import type { IdentityType, UserIdentity } from '~/types/identity'

// Page meta
definePageMeta({
  layout: 'keguang',
  middleware: 'auth'
})

// Composables
const {
  identityTypes,
  userIdentities,
  loading,
  error,
  approvedIdentities,
  fetchIdentityTypes,
  fetchUserIdentities,
  updateDisplayIdentity,
  withdrawRequest: withdrawIdentityRequest,
  clearError
} = useIdentity()

const { user } = useAuth()

// Local state
const isLoading = ref(true)
const showIdentitySelector = ref(false)
const showRequestForm = ref(false)
const selectedDisplayId = ref<number | null>(null)
const updatingDisplay = ref(false)
const withdrawing = ref(new Set<number>())

// Messages
const successMessage = ref('')
const errorMessage = ref('')

// Computed properties
const currentDisplayIdentity = computed(() => {
  return approvedIdentities.value.find(identity => 
    identity.id === user.value?.display_identity_id
  ) || null
})

const availableTypes = computed(() => {
  return identityTypes.value.filter(type => type.is_active)
})

// Utility functions
const getIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'academic-cap': '🎓',
    'user-group': '👥', 
    'shield-check': '🛡️',
    'star': '⭐'
  }
  return iconMap[iconName] || '🏷️'
}

const getStatusIcon = (status: string): string => {
  const statusIcons = {
    pending: '⏳',
    approved: '✓',
    rejected: '✕',
    revoked: '🚫'
  }
  return statusIcons[status as keyof typeof statusIcons] || '❓'
}

const getStatusText = (status: string): string => {
  const statusTexts = {
    pending: '待审核',
    approved: '已认证',
    rejected: '已拒绝',
    revoked: '已撤销'
  }
  return statusTexts[status as keyof typeof statusTexts] || '未知'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const hasExistingRequest = (identityTypeId: number): boolean => {
  return userIdentities.value.some(identity => 
    identity.identity_type_id === identityTypeId && 
    ['pending', 'approved'].includes(identity.status)
  )
}

const getExistingRequestStatus = (identityTypeId: number): string => {
  const existing = userIdentities.value.find(identity => 
    identity.identity_type_id === identityTypeId
  )
  return existing ? getStatusText(existing.status) : ''
}

// Methods
const fetchData = async () => {
  try {
    isLoading.value = true
    clearError()
    
    await Promise.all([
      fetchIdentityTypes(),
      fetchUserIdentities()
    ])
  } catch (err) {
    console.error('Failed to fetch data:', err)
    showError('加载数据失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const setDisplayIdentity = async (identity: UserIdentity) => {
  selectedDisplayId.value = identity.id
  await confirmDisplayIdentity()
}

const clearDisplayIdentity = async () => {
  selectedDisplayId.value = null
  await confirmDisplayIdentity()
}

const confirmDisplayIdentity = async () => {
  try {
    updatingDisplay.value = true
    
    await updateDisplayIdentity(selectedDisplayId.value)
    
    // Update user data
    if (user.value) {
      user.value.display_identity_id = selectedDisplayId.value
    }
    
    showSuccess('显示身份更新成功')
    showIdentitySelector.value = false
  } catch (err) {
    console.error('Failed to update display identity:', err)
    showError('更新显示身份失败')
  } finally {
    updatingDisplay.value = false
  }
}

const withdrawRequest = async (identityId: number) => {
  if (!confirm('确定要撤回此申请吗？撤回后需要重新申请。')) return
  
  try {
    withdrawing.value.add(identityId)
    
    await withdrawIdentityRequest(identityId)
    
    showSuccess('申请已撤回')
  } catch (err) {
    console.error('Failed to withdraw request:', err)
    showError('撤回申请失败')
  } finally {
    withdrawing.value.delete(identityId)
  }
}

const preSelectedTypeId = ref<number | null>(null)

const requestIdentity = (identityType: IdentityType) => {
  preSelectedTypeId.value = identityType.id
  showRequestForm.value = true
}

const reapplyIdentity = (identity: UserIdentity) => {
  // Open request form for reapplication
  showRequestForm.value = true
}

const handleRequestSubmitted = (request: any) => {
  showSuccess('身份申请提交成功，请等待管理员审核')
  showRequestForm.value = false
  // Refresh user identities
  fetchUserIdentities()
}

const showSuccess = (message: string) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
}

const showError = (message: string) => {
  errorMessage.value = message
}

// Lifecycle
onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.identity-management-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
}

.page-header {
  margin-bottom: 2.5rem;
  text-align: center;
  
  h1 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 2.5rem;
    
    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }
  
  .page-description {
    color: var(--text-muted);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
    
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
}

.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-muted);
}

.error-container {
  flex-direction: column;
  text-align: center;
  
  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  h3 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  .retry-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--interactive-primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    
    &:hover {
      background: var(--interactive-primary-dark);
    }
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
  font-size: 1.5rem;
}

.section {
  margin-bottom: 3rem;
  background: var(--surface-primary);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--shadow-small);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
  
  h2 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  .section-description {
    color: var(--text-muted);
    max-width: 600px;
  }
}

.current-display-identity {
  display: flex;
  gap: 2rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }
}

.identity-display {
  flex: 1;
}

.selected-identity,
.no-identity {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

.identity-details,
.details {
  h3 {
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }
  
  p {
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }
  
  .status {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    
    &.approved {
      background: var(--success)20;
      color: var(--success);
    }
  }
}

.display-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: row;
  }
}

.identities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.identity-card {
  background: var(--surface-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  overflow: hidden;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: var(--shadow-medium);
  }
  
  &.status-approved {
    border-color: var(--success);
  }
  
  &.status-pending {
    border-color: var(--warning);
  }
  
  &.status-rejected {
    border-color: var(--error);
  }
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.identity-info {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.identity-icon-wrapper {
  .identity-icon {
    font-size: 2rem;
  }
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  
  &.status-approved {
    background: var(--success)20;
    color: var(--success);
  }
  
  &.status-pending {
    background: var(--warning)20;
    color: var(--warning);
  }
  
  &.status-rejected {
    background: var(--error)20;
    color: var(--error);
  }
  
  &.status-revoked {
    background: var(--text-muted)20;
    color: var(--text-muted);
  }
}

.card-content {
  padding: 1.5rem;
}

.timeline-info {
  margin-bottom: 1.5rem;
}

.timeline-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  .label {
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  
  .value {
    color: var(--text-primary);
    font-weight: 500;
  }
}

.rejection-info,
.admin-notes {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--surface-tertiary);
  border-radius: 6px;
  
  h4 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  
  p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
  }
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.available-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.type-card {
  padding: 1.5rem;
  background: var(--surface-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &.type-disabled {
    opacity: 0.6;
  }
}

.type-header {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
  
  .type-icon {
    font-size: 1.5rem;
  }
  
  h3 {
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }
  
  p {
    color: var(--text-muted);
    font-size: 0.9rem;
  }
}

.existing-status {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }
  
  h3 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
}

// Modal styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--surface-primary);
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  
  &.large {
    max-width: 800px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-primary);
  
  h3 {
    color: var(--text-primary);
    margin: 0;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
    
    &:hover {
      color: var(--text-primary);
    }
  }
}

.modal-body {
  padding: 2rem;
}

.identity-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.identity-option {
  padding: 1rem;
  border: 2px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--interactive-primary);
  }
  
  &.selected {
    border-color: var(--interactive-primary);
    background: var(--interactive-primary)10;
  }
}

.option-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .option-icon {
    font-size: 1.5rem;
  }
  
  h4 {
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }
  
  p {
    color: var(--text-muted);
    margin: 0;
  }
}

.modal-actions {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--border-primary);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

// Toast notifications
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: var(--shadow-large);
  z-index: 1001;
  max-width: 400px;
  
  &.toast-success {
    background: var(--success);
    color: white;
  }
  
  &.toast-error {
    background: var(--error);
    color: white;
  }
  
  .toast-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    margin-left: auto;
  }
}

// Button styles
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.btn-primary {
    background: var(--interactive-primary);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--interactive-primary-dark);
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
  
  &.btn-danger {
    background: var(--error);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--error-dark);
    }
  }
  
  &.btn-outline {
    background: transparent;
    color: var(--interactive-primary);
    border: 1px solid var(--interactive-primary);
    
    &:hover:not(:disabled) {
      background: var(--interactive-primary);
      color: white;
    }
  }
  
  &.btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>