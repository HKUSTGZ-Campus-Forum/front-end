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
                ✓ 已验证
              </span>
              <span v-else class="unverified">
                ⚠️ 未验证
              </span>
            </div>
          </div>
          
          <div v-if="!user.email_verified" class="verification-actions">
            <p class="verification-note">
              邮箱未验证将会在未来被限制某些功能
            </p>
            <button 
              @click="resendVerificationEmail" 
              class="verify-btn"
              :disabled="resendCooldown > 0 || isResending"
            >
              <span v-if="isResending">发送中...</span>
              <span v-else-if="resendCooldown > 0">{{ resendCooldown }}秒后重试</span>
              <span v-else>重新发送验证邮件</span>
            </button>
          </div>
          
          <!-- Change Email Section -->
          <div class="email-change-section">
            <button 
              @click="showChangeEmailForm = !showChangeEmailForm" 
              class="change-email-btn"
            >
              {{ showChangeEmailForm ? '取消更换邮箱' : '更换邮箱地址' }}
            </button>
            
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
            <li>找回密码</li>
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

    <!-- Password Change Section -->
    <div class="settings-section">
      <h2 class="section-title">修改密码</h2>
      <div class="password-card">
        <form @submit.prevent="changePassword" class="password-form">
          <div class="form-group">
            <label for="currentPassword">当前密码</label>
            <div class="password-field">
              <input
                id="currentPassword"
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                placeholder="请输入当前密码"
                required
                :disabled="isChangingPassword"
                class="password-input"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showCurrentPassword = !showCurrentPassword"
              >
                {{ showCurrentPassword ? "隐藏" : "显示" }}
              </button>
            </div>
            <span v-if="passwordErrors.current" class="error-text">{{ passwordErrors.current }}</span>
          </div>

          <div class="form-group">
            <label for="newPassword">新密码</label>
            <div class="password-field">
              <input
                id="newPassword"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="请输入新密码（至少6位）"
                required
                :disabled="isChangingPassword"
                class="password-input"
                @input="validateNewPassword"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showNewPassword = !showNewPassword"
              >
                {{ showNewPassword ? "隐藏" : "显示" }}
              </button>
            </div>
            <div class="password-strength">
              <div class="strength-bar">
                <div 
                  class="strength-fill" 
                  :class="passwordStrength.level"
                  :style="{ width: passwordStrength.percentage + '%' }"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrength.text }}</span>
            </div>
            <span v-if="passwordErrors.new" class="error-text">{{ passwordErrors.new }}</span>
          </div>

          <div class="form-group">
            <label for="confirmPassword">确认新密码</label>
            <div class="password-field">
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入新密码"
                required
                :disabled="isChangingPassword"
                class="password-input"
                @blur="validateConfirmPassword"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                {{ showConfirmPassword ? "隐藏" : "显示" }}
              </button>
            </div>
            <span v-if="passwordErrors.confirm" class="error-text">{{ passwordErrors.confirm }}</span>
          </div>

          <div v-if="passwordChangeError" class="error-message">
            {{ passwordChangeError }}
          </div>

          <div v-if="passwordChangeSuccess" class="success-message">
            {{ passwordChangeSuccess }}
          </div>

          <button 
            type="submit" 
            class="change-password-btn"
            :disabled="isChangingPassword || !isPasswordFormValid"
          >
            {{ isChangingPassword ? '修改中...' : '修改密码' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Connected Apps Section -->
    <div class="settings-section">
      <h2 class="section-title">已连接应用</h2>
      <div class="connected-apps-card">
        <p class="section-description">
          管理已授权访问您账号的第三方应用
        </p>
        
        <!-- Loading state -->
        <div v-if="isLoadingApps" class="loading-state">
          <div class="loading-spinner">⟳</div>
          <span>加载中...</span>
        </div>
        
        <!-- Connected apps list -->
        <div v-else-if="connectedApps.length > 0" class="apps-list">
          <div v-for="app in connectedApps" :key="app.id" class="app-item">
            <div class="app-info">
              <div class="app-header">
                <h4 class="app-name">{{ app.client_name }}</h4>
                <div class="app-status">
                  <span v-if="app.is_expired" class="status-expired">已过期</span>
                  <span v-else class="status-active">活跃</span>
                </div>
              </div>
              
              <p v-if="app.client_description" class="app-description">
                {{ app.client_description }}
              </p>
              
              <div class="app-details">
                <div class="detail-item">
                  <span class="detail-label">权限范围:</span>
                  <div class="scopes">
                    <span v-for="scope in getFormattedScopes(app.scope)" :key="scope" class="scope-tag">
                      {{ scope }}
                    </span>
                  </div>
                </div>
                
                <div class="detail-item">
                  <span class="detail-label">连接时间:</span>
                  <span class="detail-value">{{ formatDate(app.created_at) }}</span>
                </div>
                
                <div class="detail-item">
                  <span class="detail-label">最后使用:</span>
                  <span class="detail-value">{{ formatDate(app.last_used) }}</span>
                </div>
                
                <div v-if="app.client_uri" class="detail-item">
                  <span class="detail-label">应用网址:</span>
                  <a :href="app.client_uri" target="_blank" class="app-link">
                    {{ app.client_uri }}
                  </a>
                </div>
              </div>
            </div>
            
            <div class="app-actions">
              <button 
                @click="revokeAppAccess(app)"
                class="revoke-btn"
                :disabled="revokingAppId === app.id"
              >
                <span v-if="revokingAppId === app.id">撤销中...</span>
                <span v-else>撤销授权</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- No connected apps -->
        <div v-else class="no-apps">
          <div class="no-apps-icon">🔗</div>
          <h3>暂无已连接应用</h3>
          <p class="no-apps-description">
            您还没有授权任何第三方应用访问您的账号。
            当您使用"Campus Forum 账号登录"功能时，已连接的应用将在这里显示。
          </p>
        </div>
        
        <!-- Error state -->
        <div v-if="appsError" class="error-message">
          {{ appsError }}
        </div>
        
        <!-- Success message -->
        <div v-if="appsSuccessMessage" class="success-message">
          {{ appsSuccessMessage }}
        </div>
        
        <div class="apps-actions">
          <button 
            @click="refreshConnectedApps" 
            class="refresh-btn"
            :disabled="isLoadingApps"
          >
            <span class="refresh-icon">↻</span>
            刷新列表
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
          @back-to-register="closeEmailVerification"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
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

// Password change state
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isChangingPassword = ref(false)
const passwordChangeError = ref('')
const passwordChangeSuccess = ref('')
const passwordErrors = ref({
  current: '',
  new: '',
  confirm: ''
})

// OAuth apps state
const connectedApps = ref([])
const isLoadingApps = ref(false)
const revokingAppId = ref(null)
const appsError = ref('')
const appsSuccessMessage = ref('')

let cooldownTimer: NodeJS.Timeout | null = null

// Get API base URL
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl

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

// Password strength calculation
const passwordStrength = computed(() => {
  const password = newPassword.value
  if (!password) return { level: '', percentage: 0, text: '' }
  
  let score = 0
  let feedback = []
  
  // Length check
  if (password.length >= 8) score += 2
  else if (password.length >= 6) score += 1
  else feedback.push('至少6位')
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  
  const levels = [
    { min: 0, max: 2, level: 'weak', text: '弱', percentage: 25 },
    { min: 3, max: 4, level: 'medium', text: '中等', percentage: 50 },
    { min: 5, max: 5, level: 'good', text: '良好', percentage: 75 },
    { min: 6, max: 10, level: 'strong', text: '强', percentage: 100 }
  ]
  
  const level = levels.find(l => score >= l.min && score <= l.max) || levels[0]
  return level
})

// Form validation
const isPasswordFormValid = computed(() => {
  return currentPassword.value &&
         newPassword.value &&
         confirmPassword.value &&
         newPassword.value === confirmPassword.value &&
         newPassword.value.length >= 6 &&
         !passwordErrors.value.current &&
         !passwordErrors.value.new &&
         !passwordErrors.value.confirm
})

// Password validation functions
const validateNewPassword = () => {
  if (!newPassword.value) {
    passwordErrors.value.new = '请输入新密码'
  } else if (newPassword.value.length < 6) {
    passwordErrors.value.new = '密码至少需要6个字符'
  } else if (newPassword.value === currentPassword.value) {
    passwordErrors.value.new = '新密码不能与当前密码相同'
  } else {
    passwordErrors.value.new = ''
  }
  
  // Re-validate confirm password when new password changes
  if (confirmPassword.value) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    passwordErrors.value.confirm = '请确认新密码'
  } else if (newPassword.value !== confirmPassword.value) {
    passwordErrors.value.confirm = '两次输入的密码不一致'
  } else {
    passwordErrors.value.confirm = ''
  }
}

// Add email functionality
const addEmail = async () => {
  if (!isValidNewEmail.value) return
  
  isAddingEmail.value = true
  emailError.value = ''
  emailSuccess.value = ''
  
  try {
    const response = await fetchWithAuth(`${apiBaseUrl}/api/users/${user.value?.id}/add-email`, {
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
    const response = await fetchWithAuth(`${apiBaseUrl}/api/users/${user.value?.id}`, {
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
    
    emailSuccess.value = '邮箱更换成功，正在发送验证邮件...'
    
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
  if (!user.value?.id || resendCooldown.value > 0) return
  
  isResending.value = true
  
  try {
    const response = await fetchWithAuth(`${apiBaseUrl}/api/auth/resend-verification`, {
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
    
  } catch (err) {
    console.error('Resend verification error:', err)
    // Handle error display
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

// Change password functionality
const changePassword = async () => {
  // Validate all fields
  validateNewPassword()
  validateConfirmPassword()
  
  if (!isPasswordFormValid.value) return
  
  isChangingPassword.value = true
  passwordChangeError.value = ''
  passwordChangeSuccess.value = ''
  
  try {
    const response = await fetchWithAuth(`${apiBaseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        current_password: currentPassword.value,
        new_password: newPassword.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      if (data.msg?.includes('Current password is incorrect')) {
        passwordErrors.value.current = '当前密码错误'
      } else {
        passwordChangeError.value = data.msg || '修改密码失败'
      }
      return
    }

    // Success
    passwordChangeSuccess.value = '密码修改成功'
    
    // Clear form
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    Object.keys(passwordErrors.value).forEach(key => {
      passwordErrors.value[key as keyof typeof passwordErrors.value] = ''
    })
    
  } catch (err) {
    console.error('Change password error:', err)
    passwordChangeError.value = err instanceof Error ? err.message : '修改密码失败，请重试'
  } finally {
    isChangingPassword.value = false
  }
}

// Email verification success handler
const handleEmailVerificationSuccess = async () => {
  showEmailVerification.value = false
  await refreshUser() // Refresh to get updated verification status
}

const closeEmailVerification = () => {
  showEmailVerification.value = false
}

// OAuth Apps Management
const loadConnectedApps = async () => {
  if (!user.value?.id) return
  
  isLoadingApps.value = true
  appsError.value = ''
  
  try {
    const response = await fetchWithAuth(`${apiBaseUrl}/api/users/${user.value.id}/oauth-tokens`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.msg || '获取连接应用失败')
    }
    
    const data = await response.json()
    connectedApps.value = data.connected_apps || []
    
  } catch (err) {
    console.error('Load connected apps error:', err)
    appsError.value = err instanceof Error ? err.message : '获取连接应用失败，请重试'
  } finally {
    isLoadingApps.value = false
  }
}

const revokeAppAccess = async (app) => {
  if (!user.value?.id || !confirm(`确定要撤销 "${app.client_name}" 的访问权限吗？\n\n撤销后，该应用将无法继续访问您的账号信息。`)) {
    return
  }
  
  revokingAppId.value = app.id
  appsError.value = ''
  appsSuccessMessage.value = ''
  
  try {
    const response = await fetchWithAuth(`${apiBaseUrl}/api/users/${user.value.id}/oauth-tokens/${app.id}/revoke`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.msg || '撤销授权失败')
    }
    
    const data = await response.json()
    appsSuccessMessage.value = data.msg || `已成功撤销 "${app.client_name}" 的访问权限`
    
    // Remove the revoked app from the list
    connectedApps.value = connectedApps.value.filter(a => a.id !== app.id)
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      appsSuccessMessage.value = ''
    }, 5000)
    
  } catch (err) {
    console.error('Revoke app access error:', err)
    appsError.value = err instanceof Error ? err.message : '撤销授权失败，请重试'
  } finally {
    revokingAppId.value = null
  }
}

const refreshConnectedApps = async () => {
  appsSuccessMessage.value = ''
  appsError.value = ''
  await loadConnectedApps()
}

const getFormattedScopes = (scopeString) => {
  if (!scopeString) return []
  
  const scopeMap = {
    'profile': '基本信息',
    'email': '邮箱地址', 
    'courses': '课程数据'
  }
  
  return scopeString.split(' ')
    .map(scope => scopeMap[scope] || scope)
    .filter(Boolean)
}

const formatDate = (dateString) => {
  if (!dateString) return '未知'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays} 天前`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} 周前`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} 个月前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  } catch {
    return '未知'
  }
}

// Load connected apps on component mount
onMounted(() => {
  if (user.value?.id) {
    loadConnectedApps()
  }
})

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
  margin-bottom: 3rem;
  background: var(--surface-primary, rgba(255, 255, 255, 0.95));
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow-small, 0 2px 8px rgba(0, 0, 0, 0.1));
  
  @media (min-width: 768px) {
    padding: 2rem;
    box-shadow: var(--shadow-medium, 0 4px 15px rgba(0, 0, 0, 0.1));
  }
}

.section-title {
  color: var(--text-primary, #333);
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-primary, #e0e0e0);
  padding-bottom: 0.5rem;
  
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
      margin-bottom: 1rem;
      
      @media (max-width: 479px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .email-address {
        font-family: monospace;
        font-size: 1.1rem;
        color: var(--text-primary, #333);
        word-break: break-all;
      }
      
      .verification-badge {
        .verified {
          color: var(--success-color, #28a745);
          font-weight: 600;
          background: var(--success-background, rgba(40, 167, 69, 0.1));
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }
        
        .unverified {
          color: var(--warning-color, #ffc107);
          font-weight: 600;
          background: var(--warning-background, rgba(255, 193, 7, 0.1));
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }
      }
    }
  }
  
  .verification-actions {
    .verification-note {
      color: var(--text-secondary, #666);
      font-size: 0.9rem;
      margin-bottom: 1rem;
      line-height: 1.4;
    }
  }
  
  .no-email {
    .no-email-message {
      color: var(--text-secondary, #666);
      margin-bottom: 1rem;
      line-height: 1.4;
    }
    
    .benefits-list {
      margin: 1rem 0 1.5rem 1.5rem;
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
  
  .email-input, .password-input {
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
      border-color: var(--primary-color, #4361ee);
      box-shadow: 0 0 0 3px var(--primary-color-alpha, rgba(67, 97, 238, 0.25));
      outline: none;
    }
    
    &:disabled {
      background: var(--surface-disabled, #f5f5f5);
      cursor: not-allowed;
    }
    
    @media (max-width: 479px) {
      font-size: 16px; // Prevent zoom on iOS
    }
  }
}

.password-field {
  position: relative;
  
  .password-input {
    padding-right: 90px;
    
    @media (min-width: 480px) {
      padding-right: 80px;
    }
  }
  
  .toggle-password {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-secondary, #666);
    cursor: pointer;
    padding: 0.5rem;
    min-height: 44px;
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    
    @media (min-width: 480px) {
      right: 8px;
      padding: 0.25rem;
      min-height: auto;
      font-size: 0.8rem;
    }
    
    &:hover {
      color: var(--text-primary, #333);
    }
  }
}

.password-strength {
  margin-top: 0.5rem;
  
  .strength-bar {
    width: 100%;
    height: 4px;
    background: var(--surface-disabled, #f0f0f0);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.25rem;
    
    .strength-fill {
      height: 100%;
      transition: all 0.3s ease;
      
      &.weak {
        background: var(--error-color, #dc3545);
      }
      
      &.medium {
        background: var(--warning-color, #ffc107);
      }
      
      &.good {
        background: var(--info-color, #17a2b8);
      }
      
      &.strong {
        background: var(--success-color, #28a745);
      }
    }
  }
  
  .strength-text {
    font-size: 0.8rem;
    color: var(--text-tertiary, #888);
  }
}

.email-hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-tertiary, #888);
  
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
      color: var(--primary-color, #4361ee);
    }
  }
}

// Button Styles
.verify-btn, .add-email-btn, .change-password-btn {
  padding: 0.875rem 1.5rem;
  background: var(--primary-color, #4361ee);
  color: white;
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
    background: var(--primary-color-hover, #3a56d4);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: var(--surface-disabled, #a0a0a0);
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
    background: var(--surface-hover, rgba(0, 0, 0, 0.02));
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
  margin-top: 1.5rem;
}

// Message Styles
.error-text {
  display: block;
  color: var(--error-color, #dc3545);
  font-size: 0.85rem;
  margin-top: 0.25rem;
  
  @media (max-width: 479px) {
    font-size: 0.9rem;
  }
}

.error-message {
  padding: 1rem;
  background: var(--error-background, #ffebee);
  color: var(--error-color, #d32f2f);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border-left: 4px solid var(--error-color, #d32f2f);
  
  @media (min-width: 480px) {
    padding: 0.75rem;
    border-radius: 4px;
  }
}

.success-message {
  padding: 1rem;
  background: var(--success-background, rgba(40, 167, 69, 0.1));
  color: var(--success-color, #28a745);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border-left: 4px solid var(--success-color, #28a745);
  
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
  background: rgba(0, 0, 0, 0.5);
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

// Connected Apps Section Styles
.connected-apps-card {
  .section-description {
    color: var(--text-secondary, #666);
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    line-height: 1.4;
  }
  
  .loading-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary, #666);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    
    .loading-spinner {
      font-size: 1.5rem;
      animation: spin 1s linear infinite;
    }
  }
  
  .no-apps {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary, #666);
    
    .no-apps-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    
    h3 {
      color: var(--text-primary, #333);
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }
    
    .no-apps-description {
      max-width: 400px;
      margin: 0 auto;
      line-height: 1.5;
      font-size: 0.95rem;
    }
  }
  
  .apps-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .app-item {
    border: 1px solid var(--border-primary, #e0e0e0);
    border-radius: 8px;
    padding: 1.25rem;
    background: var(--surface-secondary, #fafafa);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    
    @media (max-width: 767px) {
      flex-direction: column;
      gap: 1rem;
    }
    
    .app-info {
      flex: 1;
      min-width: 0;
    }
    
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      gap: 1rem;
      
      @media (max-width: 479px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }
    
    .app-name {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary, #333);
      line-height: 1.3;
    }
    
    .app-status {
      .status-active {
        background: var(--success-background, rgba(40, 167, 69, 0.1));
        color: var(--success-color, #28a745);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      
      .status-expired {
        background: var(--warning-background, rgba(255, 193, 7, 0.1));
        color: var(--warning-color, #ffc107);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
      }
    }
    
    .app-description {
      color: var(--text-secondary, #666);
      margin: 0 0 1rem 0;
      line-height: 1.4;
      font-size: 0.95rem;
    }
    
    .app-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-size: 0.9rem;
      
      @media (max-width: 479px) {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
    
    .detail-label {
      font-weight: 500;
      color: var(--text-primary, #333);
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .detail-value {
      color: var(--text-secondary, #666);
    }
    
    .scopes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      
      .scope-tag {
        background: var(--primary-color-alpha, rgba(67, 97, 238, 0.1));
        color: var(--primary-color, #4361ee);
        padding: 0.25rem 0.75rem;
        border-radius: 16px;
        font-size: 0.8rem;
        font-weight: 500;
      }
    }
    
    .app-link {
      color: var(--primary-color, #4361ee);
      text-decoration: none;
      word-break: break-all;
      
      &:hover {
        text-decoration: underline;
      }
    }
    
    .app-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      
      @media (max-width: 767px) {
        width: 100%;
        justify-content: flex-end;
      }
    }
  }
  
  .apps-actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
  }
}

.revoke-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--error-color, #dc3545);
  border: 1px solid var(--error-color, #dc3545);
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  
  &:hover:not(:disabled) {
    background: var(--error-color, #dc3545);
    color: white;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    border-color: var(--text-secondary, #666);
    background: var(--surface-hover, rgba(0, 0, 0, 0.02));
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .refresh-icon {
    transition: transform 0.3s ease;
  }
  
  &:hover .refresh-icon {
    transform: rotate(180deg);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>