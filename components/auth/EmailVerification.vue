<template>
  <div class="email-verification">
    <div class="verification-header">
      <h2 class="verification-title">邮箱验证</h2>
      <p class="verification-subtitle">
        我们已向 <strong>{{ userEmail }}</strong> 发送了验证邮件
      </p>
      <p class="verification-description">
        请查收邮件并输入6位验证码完成注册
      </p>
      <div class="trash-mail-notice">
        <span class="notice-icon">📬</span>
        <p>如果没有收到邮件，请检查您的 <strong>垃圾邮件箱</strong></p>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <form @submit.prevent="handleVerification" class="verification-form">
      <div class="code-input-group">
        <label for="verification-code">验证码</label>
        <input
          id="verification-code"
          v-model="verificationCode"
          type="text"
          placeholder="请输入6位验证码"
          maxlength="6"
          pattern="[0-9]{6}"
          required
          :disabled="loading"
          class="code-input"
          @input="formatCode"
        />
        <div class="code-hint">验证码有效期为10分钟</div>
      </div>

      <button 
        type="submit" 
        class="verify-button" 
        :disabled="loading || verificationCode.length !== 6"
      >
        <span v-if="!loading">验证邮箱</span>
        <span v-else class="loading-spinner">⟳</span>
      </button>
    </form>

    <div class="verification-actions">
      <button 
        @click="resendCode" 
        class="resend-button"
        :disabled="loading || resendCooldown > 0"
      >
        <span v-if="resendCooldown === 0">重新发送验证码</span>
        <span v-else>{{ resendCooldown }}秒后可重新发送</span>
      </button>

      <button @click="goBackToRegister" class="back-button">
        返回注册页面
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useApi } from '~/composables/useApi'

interface Props {
  userId: number
  userEmail: string
  username?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['verification-success', 'back-to-register'])

const { fetchWithAuth } = useApi()

// Reactive state
const verificationCode = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const resendCooldown = ref(0)

let cooldownTimer: NodeJS.Timeout | null = null

// Get API base URL from runtime config
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl

// Format verification code input (numbers only)
function formatCode(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '') // Remove non-digits
  verificationCode.value = value.slice(0, 6) // Limit to 6 digits
}

// Handle email verification
async function handleVerification() {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    error.value = '请输入6位验证码'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: props.userId,
        verification_code: verificationCode.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '验证失败')
    }

    successMessage.value = '邮箱验证成功！正在跳转...'
    
    // Emit success event after a brief delay
    setTimeout(() => {
      emit('verification-success', {
        userId: props.userId,
        username: props.username,
        email: props.userEmail
      })
    }, 1500)

  } catch (err) {
    console.error('Email verification error:', err)
    error.value = err instanceof Error ? err.message : '验证失败，请重试'
  } finally {
    loading.value = false
  }
}

// Resend verification code
async function resendCode() {
  if (resendCooldown.value > 0) return

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: props.userId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '重发失败')
    }

    successMessage.value = '验证码已重新发送，请查收邮件'
    
    // Start cooldown
    startCooldown()
    
  } catch (err) {
    console.error('Resend verification error:', err)
    error.value = err instanceof Error ? err.message : '重发失败，请重试'
  } finally {
    loading.value = false
  }
}

// Start resend cooldown (60 seconds)
function startCooldown() {
  resendCooldown.value = 60
  
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
    }
  }, 1000)
}

// Go back to register page
function goBackToRegister() {
  emit('back-to-register')
}

// Cleanup timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})

// Auto-focus on verification code input
onMounted(() => {
  const codeInput = document.getElementById('verification-code')
  if (codeInput) {
    codeInput.focus()
  }
})
</script>

<style lang="scss" scoped>
.email-verification {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
  background: var(--surface-primary, rgba(255, 255, 255, 0.95));
  border-radius: 8px;
  box-shadow: var(--shadow-small, 0 2px 8px rgba(0, 0, 0, 0.1));

  @media (min-width: 480px) {
    padding: 1.5rem;
  }

  @media (min-width: 768px) {
    padding: 2rem;
    background: var(--surface-primary, rgba(255, 255, 255, 0.9));
    box-shadow: var(--shadow-medium, 0 4px 15px rgba(0, 0, 0, 0.1));
  }
}

.verification-header {
  text-align: center;
  margin-bottom: 2rem;

  .verification-title {
    color: var(--text-primary, #333);
    font-size: 1.5rem;
    margin-bottom: 0.5rem;

    @media (min-width: 480px) {
      font-size: 1.65rem;
    }

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }

  .verification-subtitle {
    color: var(--text-secondary, #666);
    font-size: 1rem;
    margin-bottom: 0.5rem;

    strong {
      color: var(--text-primary, #333);
    }
  }

  .verification-description {
    color: var(--text-tertiary, #888);
    font-size: 0.9rem;
  }

  .trash-mail-notice {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--warning-background, rgba(255, 193, 7, 0.1));
    border-radius: 6px;
    border-left: 3px solid var(--warning-color, #ffc107);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .notice-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--warning-text, #f57c00);
      line-height: 1.3;

      strong {
        font-weight: 600;
      }

      @media (max-width: 479px) {
        font-size: 0.9rem;
      }
    }
  }
}

.verification-form {
  margin-bottom: 2rem;

  .code-input-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--text-primary, #333);
      font-size: 0.95rem;

      @media (max-width: 479px) {
        font-size: 1rem;
      }
    }

    .code-input {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 1px solid var(--border-primary, #e0e0e0);
      border-radius: 6px;
      font-size: 1.2rem;
      text-align: center;
      letter-spacing: 0.5rem;
      font-family: monospace;
      min-height: 44px;
      -webkit-appearance: none;
      background: var(--surface-secondary, #fff);
      color: var(--text-primary, #333);

      @media (min-width: 480px) {
        padding: 0.8rem 1rem;
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

      // Prevent zoom on iOS
      @media (max-width: 479px) {
        font-size: 16px;
      }
    }

    .code-hint {
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: var(--text-tertiary, #888);
      text-align: center;
    }
  }
}

.verify-button {
  width: 100%;
  padding: 0.875rem;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 480px) {
    padding: 0.8rem;
    border-radius: 4px;
    min-height: auto;
  }

  &:hover:not(:disabled) {
    background: var(--primary-color-hover, #3a56d4);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--surface-disabled, #a0a0a0);
    cursor: not-allowed;
    transform: none;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
    font-size: 1.2rem;
  }
}

.verification-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;

  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: space-between;
  }

  .resend-button,
  .back-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--border-primary, #e0e0e0);
    background: var(--surface-secondary, #fff);
    color: var(--text-secondary, #666);
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;

    @media (min-width: 480px) {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      min-height: auto;
    }

    &:hover:not(:disabled) {
      border-color: var(--primary-color, #4361ee);
      color: var(--primary-color, #4361ee);
      background: var(--primary-color-alpha, rgba(67, 97, 238, 0.05));
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .back-button {
    color: var(--text-tertiary, #888);
    border-color: var(--border-secondary, #ddd);

    &:hover:not(:disabled) {
      border-color: var(--text-secondary, #666);
      color: var(--text-secondary, #666);
      background: var(--surface-hover, rgba(0, 0, 0, 0.02));
    }
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

  @media (max-width: 479px) {
    font-size: 1rem;
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

  @media (max-width: 479px) {
    font-size: 1rem;
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