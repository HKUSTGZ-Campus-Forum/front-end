<template>
  <div class="account-settings">
    <!-- Email Status Section -->
    <div class="settings-section">
      <h2 class="section-title">邮箱验证状态</h2>
      <div class="email-status-card">
        <div v-if="user?.email" class="email-info">
          <div class="email-display">
            <span class="email-address">{{ user.email }}</span>
            <div class="verification-badge">
              <span v-if="user.email_verified" class="verified">
                已验证
              </span>
              <span v-else class="unverified">
                未验证
              </span>
            </div>
          </div>
          
          <div v-if="!user.email_verified" class="verification-actions">
            <p class="verification-note">
              邮箱未验证将会在未来被限制某些功能
            </p>
          </div>
          
          <!-- Change Email Section -->
          <div class="email-change-section">
            <div class="email-actions-row">
              <button 
                v-if="!user.email_verified"
                @click="resendVerificationEmail" 
                class="verify-btn"
                :disabled="resendCooldown > 0 || isResending"
              >
                <span v-if="isResending">发送中...</span>
                <span v-else-if="resendCooldown > 0">{{ resendCooldown }}秒后重试</span>
                <span v-else>重新发送验证邮件</span>
              </button>
              <button 
                @click="showChangeEmailForm = !showChangeEmailForm" 
                class="change-email-btn"
                :class="{ 'is-open': showChangeEmailForm }"
              >
                {{ showChangeEmailForm ? '取消更换邮箱' : '更换邮箱地址' }}
              </button>
            </div>
            
            <div v-if="showChangeEmailForm" class="change-email-form">
              <h4>更换邮箱地址</h4>
              <p class="change-email-note">
                更换邮箱后需要重新验证，原邮箱的验证状态将失效
              </p>
              
              <!-- Error/Success Messages -->
              <div v-if="emailError" class="error-message">
                {{ emailError }}
              </div>
              <div v-if="emailSuccess" class="success-message">
                {{ emailSuccess }}
              </div>
              
              <div class="form-group">
                <label for="changeEmail">新邮箱地址</label>
                <input
                  id="changeEmail"
                  v-model="newEmail"
                  type="email"
                  placeholder="请输入新的HKUST-GZ邮箱"
                  :disabled="isAddingEmail"
                  class="email-input"
                />
                <div class="email-hint">
                  <p>只允许使用 HKUST-GZ 邮箱：</p>
                  <ul>
                    <li>@connect.hkust-gz.edu.cn</li>
                    <li>@hkust-gz.edu.cn</li>
                  </ul>
                </div>
              </div>
              
              <div class="form-actions">
                <button 
                  @click="changeEmail" 
                  class="add-email-btn"
                  :disabled="isAddingEmail || !isValidNewEmail"
                >
                  {{ isAddingEmail ? '更换中...' : '更换邮箱' }}
                </button>
                <button 
                  @click="cancelChangeEmail" 
                  class="cancel-btn"
                  :disabled="isAddingEmail"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-email">
          <p class="no-email-message">
            您还没有绑定邮箱地址。绑定邮箱后可以：
          </p>
          <ul class="benefits-list">
            <li>修改用户名</li>
            <li>接收重要通知</li>
          </ul>
          
          <div class="add-email-form" v-if="showAddEmailForm">
            <h3>添加邮箱</h3>
            
            <!-- Error/Success Messages -->
            <div v-if="emailError" class="error-message">
              {{ emailError }}
            </div>
            <div v-if="emailSuccess" class="success-message">
              {{ emailSuccess }}
            </div>
            
            <div class="form-group">
              <label for="newEmail">邮箱地址</label>
              <input
                id="newEmail"
                v-model="newEmail"
                type="email"
                placeholder="请输入HKUST-GZ邮箱"
                :disabled="isAddingEmail"
                class="email-input"
              />
              <div class="email-hint">
                <p>只允许使用 HKUST-GZ 邮箱：</p>
                <ul>
                  <li>@connect.hkust-gz.edu.cn</li>
                  <li>@hkust-gz.edu.cn</li>
                </ul>
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                @click="addEmail" 
                class="add-email-btn"
                :disabled="isAddingEmail || !isValidNewEmail"
              >
                {{ isAddingEmail ? '添加中...' : '添加邮箱' }}
              </button>
              <button 
                @click="cancelAddEmail" 
                class="cancel-btn"
                :disabled="isAddingEmail"
              >
                取消
              </button>
            </div>
          </div>
          
          <button 
            v-else
            @click="showAddEmailForm = true" 
            class="add-email-btn"
          >
            添加邮箱
          </button>
        </div>
      </div>
    </div>

    <!-- Email Verification Modal for existing users -->
    <div v-if="showEmailVerification && user?.id" class="modal-overlay" @click="closeEmailVerification">
      <div class="modal-content" @click.stop>
        <AuthEmailVerification
          :user-id="user.id"
          :user-email="user?.email || newEmail"
          :username="user?.username"
          @verification-success="handleEmailVerificationSuccess"
          @close="closeEmailVerification"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'

const { user, refreshUser } = useAuth()
const { fetchWithAuth } = useApi()

// Email management state
const showAddEmailForm = ref(false)
const newEmail = ref('')
const isAddingEmail = ref(false)
const isResending = ref(false)
const resendCooldown = ref(0)
const showEmailVerification = ref(false)
const emailError = ref('')
const emailSuccess = ref('')
const showChangeEmailForm = ref(false)

let cooldownTimer: NodeJS.Timeout | null = null

// Email validation
const isValidNewEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const hkustDomains = ['connect.hkust-gz.edu.cn', 'hkust-gz.edu.cn']
  
  if (!emailRegex.test(newEmail.value)) {
    return false
  }
  
  const emailLower = newEmail.value.toLowerCase().trim()
  const emailParts = emailLower.split('@')
  return emailParts.length === 2 && hkustDomains.includes(emailParts[1])
})

// Add email functionality
const addEmail = async () => {
  if (!isValidNewEmail.value) return
  
  isAddingEmail.value = true
  emailError.value = ''
  emailSuccess.value = ''
  
  try {
    const response = await fetchWithAuth(`/api/users/${user.value?.id}/add-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: newEmail.value.trim().toLowerCase()
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '添加邮箱失败')
    }

    // Refresh user data to get updated email
    await refreshUser()
    
    emailSuccess.value = '邮箱添加成功，正在发送验证邮件...'
    
    // Show verification modal
    showEmailVerification.value = true
    showAddEmailForm.value = false
    newEmail.value = ''
    
  } catch (err) {
    console.error('Add email error:', err)
    emailError.value = err instanceof Error ? err.message : '添加邮箱失败，请重试'
  } finally {
    isAddingEmail.value = false
  }
}

const cancelAddEmail = () => {
  showAddEmailForm.value = false
  newEmail.value = ''
  emailError.value = ''
  emailSuccess.value = ''
}

// Change email functionality
const changeEmail = async () => {
  if (!isValidNewEmail.value) return
  
  isAddingEmail.value = true
  emailError.value = ''
  emailSuccess.value = ''
  
  try {
    const response = await fetchWithAuth(`/api/users/${user.value?.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: newEmail.value.trim().toLowerCase()
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '更换邮箱失败')
    }

    // Refresh user data to get updated email
    await refreshUser()

    const verificationEmailSent = await resendVerificationEmail()
    emailSuccess.value = verificationEmailSent
      ? '邮箱更换成功，验证码已发送。'
      : '邮箱已更换，但验证码发送失败；请点击重新发送。'
    
    // Show verification modal
    showEmailVerification.value = true
    showChangeEmailForm.value = false
    newEmail.value = ''
    
  } catch (err) {
    console.error('Change email error:', err)
    emailError.value = err instanceof Error ? err.message : '更换邮箱失败，请重试'
  } finally {
    isAddingEmail.value = false
  }
}

const cancelChangeEmail = () => {
  showChangeEmailForm.value = false
  newEmail.value = ''
  emailError.value = ''
  emailSuccess.value = ''
}

// Resend verification email
const resendVerificationEmail = async () => {
  if (!user.value?.id || resendCooldown.value > 0) return false
  
  isResending.value = true
  
  try {
    const response = await fetchWithAuth('/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.value.id
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '发送验证邮件失败')
    }

    startCooldown()
    
    // Show verification modal after successful email send
    showEmailVerification.value = true
    return true
    
  } catch (err) {
    console.error('Resend verification error:', err)
    emailError.value = err instanceof Error ? err.message : '发送验证邮件失败'
    return false
  } finally {
    isResending.value = false
  }
}

// Start resend cooldown (60 seconds)
const startCooldown = () => {
  resendCooldown.value = 60
  
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
    }
  }, 1000)
}

// Email verification success handler
const handleEmailVerificationSuccess = async () => {
  showEmailVerification.value = false
  await refreshUser() // Refresh to get updated verification status
}

const closeEmailVerification = () => {
  showEmailVerification.value = false
}

// Cleanup timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})
</script>

<style lang="scss" scoped>
.account-settings {
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: 1.5rem;
  background: var(--surface-primary, rgba(255, 255, 255, 0.95));
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: var(--shadow-small, 0 2px 8px rgba(0, 0, 0, 0.1));
  
  @media (min-width: 768px) {
    padding: 1.5rem;
    box-shadow: var(--shadow-medium, 0 4px 15px rgba(0, 0, 0, 0.1));
  }
}

.section-title {
  color: var(--text-primary, #333);
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--border-primary, #e0e0e0);
  padding-bottom: 0.4rem;
  
  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
}

// Email Status Styles
.email-status-card {
  .email-info {
    .email-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
      
      .email-address {
        font-family: monospace;
        font-size: 1.1rem;
        color: var(--text-primary, #333);
        word-break: break-all;
        min-width: 0;
        flex: 1;
      }
      
      .verification-badge {
        flex-shrink: 0;
        .verified, .unverified {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .verified {
          color: var(--semantic-success);
          background: color-mix(in srgb, var(--semantic-success) 10%, transparent);
        }
        
        .unverified {
          color: var(--semantic-warning);
          background: color-mix(in srgb, var(--semantic-warning) 10%, transparent);
        }
      }
    }
  }
  
  .verification-actions {
    .verification-note {
      color: var(--text-secondary, #666);
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
  }
  
  .email-change-section {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-primary, #e0e0e0);
    
    .email-actions-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    
    .change-email-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.875rem;
      background: transparent;
      color: var(--interactive-primary);
      border: 1px solid var(--border-primary, #e0e0e0);
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      min-height: 44px;
      
      @media (min-width: 480px) {
        padding: 0.4rem 0.75rem;
        border-radius: 4px;
        min-height: auto;
      }
      
      &:hover:not(:disabled) {
        border-color: var(--interactive-primary);
        background: color-mix(in srgb, var(--interactive-primary) 8%, transparent);
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      &.is-open {
        border-color: var(--interactive-primary);
        background: color-mix(in srgb, var(--interactive-primary) 8%, transparent);
      }
    }
    
    .change-email-form {
      margin-top: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--border-primary, #e0e0e0);
      border-radius: 8px;
      background: var(--surface-secondary, #fafafa);
      
      h4 {
        margin: 0 0 0.4rem 0;
        color: var(--text-primary, #333);
        font-size: 1rem;
        font-weight: 600;
      }
      
      .change-email-note {
        color: var(--text-secondary, #666);
        font-size: 0.9rem;
        margin: 0 0 0.75rem 0;
        line-height: 1.4;
      }
    }
  }
  
  .no-email {
    .no-email-message {
      color: var(--text-secondary, #666);
      margin-bottom: 0.75rem;
      line-height: 1.4;
    }
    
    .benefits-list {
      margin: 0.75rem 0 1rem 1.5rem;
      color: var(--text-secondary, #666);
      
      li {
        margin-bottom: 0.25rem;
        line-height: 1.4;
      }
    }
  }
}

// Form Styles
.form-group {
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary, #333);
    font-size: 0.95rem;
  }
  
  .email-input {
    width: 100%;
    padding: 0.875rem;
    border: 1px solid var(--border-primary, #e0e0e0);
    border-radius: 6px;
    font-size: 1rem;
    min-height: 44px;
    -webkit-appearance: none;
    background: var(--surface-secondary, #fff);
    color: var(--text-primary, #333);
    
    @media (min-width: 480px) {
      padding: 0.75rem;
      border-radius: 4px;
      min-height: auto;
    }
    
    &:focus {
      border-color: var(--interactive-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 25%, transparent);
      outline: none;
    }
    
    &:disabled {
      background: var(--surface-secondary);
      cursor: not-allowed;
    }
    
    @media (max-width: 479px) {
      font-size: 16px; // Prevent zoom on iOS
    }
  }
}

.email-hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  
  p {
    margin: 0 0 0.25rem 0;
    font-weight: 500;
  }
  
  ul {
    margin: 0;
    padding-left: 1rem;
    
    li {
      margin-bottom: 0.125rem;
      font-family: monospace;
      color: var(--interactive-primary);
    }
  }
}

// Button Styles
.verify-btn, .add-email-btn {
  padding: 0.875rem 1.5rem;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  
  @media (min-width: 480px) {
    padding: 0.75rem 1.25rem;
    border-radius: 4px;
    min-height: auto;
  }
  
  &:hover:not(:disabled) {
    background: var(--btn-primary-bg-hover);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
    transform: none;
  }
}

.cancel-btn {
  padding: 0.875rem 1.5rem;
  background: transparent;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  margin-left: 0.75rem;
  
  @media (min-width: 480px) {
    padding: 0.75rem 1.25rem;
    border-radius: 4px;
    min-height: auto;
  }
  
  &:hover:not(:disabled) {
    border-color: var(--text-secondary, #666);
    background: var(--surface-secondary);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

// Message Styles
.error-text {
  display: block;
  color: var(--semantic-error);
  font-size: 0.85rem;
  margin-top: 0.25rem;
  
  @media (max-width: 479px) {
    font-size: 0.9rem;
  }
}

.error-message {
  padding: 1rem;
  background: color-mix(in srgb, var(--semantic-error) 8%, transparent);
  color: var(--semantic-error);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border-left: 4px solid var(--semantic-error);
  
  @media (min-width: 480px) {
    padding: 0.75rem;
    border-radius: 4px;
  }
}

.success-message {
  padding: 1rem;
  background: color-mix(in srgb, var(--semantic-success) 10%, transparent);
  color: var(--semantic-success);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border-left: 4px solid var(--semantic-success);
  
  @media (min-width: 480px) {
    padding: 0.75rem;
    border-radius: 4px;
  }
}

// Modal Overlay Styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

</style>
