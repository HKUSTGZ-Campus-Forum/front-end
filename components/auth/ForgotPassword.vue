<template>
  <div class="forgot-password">
    <div class="forgot-header">
      <h2 class="forgot-title">忘记密码</h2>
      <p class="forgot-subtitle">
        输入您的 HKUST-GZ 邮箱地址，我们将发送重置密码链接
      </p>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <form v-if="!emailSent" @submit.prevent="handleForgotPassword" class="forgot-form">
      <div class="form-group">
        <label for="email">邮箱地址</label>
        <div class="input-wrapper">
          <span class="input-icon">📧</span>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入您的HKUST-GZ邮箱"
            required
            :disabled="loading"
            class="email-input"
          />
        </div>
      </div>

      <button 
        type="submit" 
        class="reset-button" 
        :disabled="loading || !isValidEmail"
      >
        <span v-if="!loading">发送重置链接</span>
        <span v-else class="loading-spinner">⟳</span>
      </button>
    </form>

    <div v-if="emailSent" class="email-sent-info">
      <div class="sent-icon">✓</div>
      <h3>邮件已发送</h3>
      <p>
        如果邮箱地址 <strong>{{ email }}</strong> 已注册，
        您将收到密码重置邮件。
      </p>
      <p class="email-hint">
        请检查您的邮箱（包括垃圾邮件文件夹），
        密码重置链接有效期为1小时。
      </p>
      
      <button @click="resendResetEmail" class="resend-button" :disabled="resendCooldown > 0">
        <span v-if="resendCooldown === 0">重新发送</span>
        <span v-else>{{ resendCooldown }}秒后可重新发送</span>
      </button>
    </div>

    <div class="back-to-login">
      <button @click="goBackToLogin" class="back-button">
        返回登录页面
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const emit = defineEmits(['back-to-login'])

// Reactive state
const email = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const emailSent = ref(false)
const resendCooldown = ref(0)

let cooldownTimer: NodeJS.Timeout | null = null

// Get API base URL from runtime config
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl

// Computed properties
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const hkustDomains = ['connect.hkust-gz.edu.cn', 'hkust-gz.edu.cn']
  
  if (!emailRegex.test(email.value)) {
    return false
  }
  
  const emailLower = email.value.toLowerCase().trim()
  return hkustDomains.some(domain => emailLower.endsWith('@' + domain))
})

// Handle forgot password request
async function handleForgotPassword() {
  if (!isValidEmail.value) {
    error.value = '请输入有效的 HKUST-GZ 邮箱地址'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value.trim().toLowerCase()
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '发送失败')
    }

    emailSent.value = true
    successMessage.value = data.msg || '如果邮箱已注册，重置邮件已发送'
    startCooldown()

  } catch (err) {
    console.error('Forgot password error:', err)
    error.value = err instanceof Error ? err.message : '发送失败，请重试'
  } finally {
    loading.value = false
  }
}

// Resend reset email
async function resendResetEmail() {
  if (resendCooldown.value > 0) return
  
  await handleForgotPassword()
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

// Go back to login
function goBackToLogin() {
  emit('back-to-login')
}

// Cleanup timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})
</script>

<style lang="scss" scoped>
.forgot-password {
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

.forgot-header {
  text-align: center;
  margin-bottom: 2rem;

  .forgot-title {
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

  .forgot-subtitle {
    color: var(--text-secondary, #666);
    font-size: 0.95rem;
    line-height: 1.4;

    @media (max-width: 479px) {
      font-size: 1rem;
    }
  }
}

.forgot-form {
  margin-bottom: 2rem;

  .form-group {
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

    .input-wrapper {
      position: relative;

      .input-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
        z-index: 1;

        @media (max-width: 479px) {
          font-size: 1.1rem;
        }
      }

      .email-input {
        width: 100%;
        padding: 0.875rem 1rem 0.875rem 2.75rem;
        border: 1px solid var(--border-primary, #e0e0e0);
        border-radius: 6px;
        font-size: 1rem;
        min-height: 44px;
        -webkit-appearance: none;
        background: var(--surface-secondary, #fff);
        color: var(--text-primary, #333);

        @media (min-width: 480px) {
          padding: 0.8rem 1rem 0.8rem 2.5rem;
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
    }
  }
}

.reset-button {
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

.email-sent-info {
  text-align: center;
  padding: 2rem 1rem;

  .sent-icon {
    font-size: 3rem;
    color: var(--success-color, #28a745);
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--text-primary, #333);
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  p {
    color: var(--text-secondary, #666);
    margin-bottom: 1rem;
    line-height: 1.5;

    strong {
      color: var(--text-primary, #333);
    }
  }

  .email-hint {
    font-size: 0.9rem;
    color: var(--text-tertiary, #888);
    margin-bottom: 2rem;
  }

  .resend-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--primary-color, #4361ee);
    background: transparent;
    color: var(--primary-color, #4361ee);
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;

    @media (min-width: 480px) {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      min-height: auto;
    }

    &:hover:not(:disabled) {
      background: var(--primary-color, #4361ee);
      color: white;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.back-to-login {
  text-align: center;
  margin-top: 2rem;

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

    @media (min-width: 480px) {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      min-height: auto;
    }

    &:hover {
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