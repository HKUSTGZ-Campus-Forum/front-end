<template>
  <div class="password-reset">
    <div class="reset-header">
      <h2 class="reset-title">重置密码</h2>
      <p class="reset-subtitle">
        请输入您的新密码
      </p>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <form v-if="!resetSuccess" @submit.prevent="handlePasswordReset" class="reset-form">
      <div class="form-group">
        <label for="new-password">新密码</label>
        <div class="password-field">
          <input
            id="new-password"
            v-model="newPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入新密码"
            required
            :disabled="loading"
            class="password-input"
            @blur="validatePassword"
          />
          <button
            type="button"
            class="password-toggle"
            @click="showPassword = !showPassword"
          >
            <span v-if="showPassword">👁️‍🗨️</span>
            <span v-else>👁️</span>
          </button>
        </div>
        <div v-if="passwordStrength" class="password-strength">
          <div class="strength-bar">
            <div 
              class="strength-fill" 
              :class="passwordStrength.class"
              :style="{ width: passwordStrength.width }"
            ></div>
          </div>
          <span class="strength-text" :class="passwordStrength.class">
            {{ passwordStrength.text }}
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="confirm-password">确认新密码</label>
        <div class="password-field">
          <input
            id="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="请再次输入新密码"
            required
            :disabled="loading"
            class="password-input"
            @blur="validateConfirmPassword"
          />
          <button
            type="button"
            class="password-toggle"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <span v-if="showConfirmPassword">👁️‍🗨️</span>
            <span v-else>👁️</span>
          </button>
        </div>
        <div v-if="confirmPasswordError" class="field-error">
          {{ confirmPasswordError }}
        </div>
      </div>

      <button 
        type="submit" 
        class="reset-button" 
        :disabled="loading || !isFormValid"
      >
        <span v-if="!loading">重置密码</span>
        <span v-else class="loading-spinner">⟳</span>
      </button>
    </form>

    <div v-if="resetSuccess" class="reset-success">
      <div class="success-icon">✓</div>
      <h3>密码重置成功</h3>
      <p>您的密码已成功更新，请使用新密码登录。</p>
      
      <button @click="goToLogin" class="login-button">
        前往登录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  token: string
}

const props = defineProps<Props>()
const emit = defineEmits(['reset-success', 'go-to-login'])

// Reactive state
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const resetSuccess = ref(false)
const confirmPasswordError = ref('')

// Get API base URL from runtime config
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl

// Password strength calculation
const passwordStrength = computed(() => {
  if (!newPassword.value) return null
  
  let score = 0
  const password = newPassword.value
  
  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  
  if (score <= 2) {
    return {
      class: 'weak',
      width: '33%',
      text: '弱'
    }
  } else if (score <= 4) {
    return {
      class: 'medium',
      width: '66%',
      text: '中等'
    }
  } else {
    return {
      class: 'strong',
      width: '100%',
      text: '强'
    }
  }
})

// Form validation
const isFormValid = computed(() => {
  return newPassword.value.length >= 6 && 
         confirmPassword.value === newPassword.value &&
         !confirmPasswordError.value
})

// Validate password
function validatePassword() {
  if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
    validateConfirmPassword()
  }
}

// Validate confirm password
function validateConfirmPassword() {
  if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
    confirmPasswordError.value = '两次输入的密码不一致'
  } else {
    confirmPasswordError.value = ''
  }
}

// Handle password reset
async function handlePasswordReset() {
  if (!isFormValid.value) {
    error.value = '请检查输入的信息'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: props.token,
        password: newPassword.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || '密码重置失败')
    }

    resetSuccess.value = true
    successMessage.value = '密码重置成功'

  } catch (err) {
    console.error('Password reset error:', err)
    error.value = err instanceof Error ? err.message : '密码重置失败，请重试'
  } finally {
    loading.value = false
  }
}

// Go to login page
function goToLogin() {
  emit('go-to-login')
}

// Check token validity on mount
onMounted(() => {
  if (!props.token) {
    error.value = '重置链接无效或已过期'
  }
})
</script>

<style lang="scss" scoped>
.password-reset {
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

.reset-header {
  text-align: center;
  margin-bottom: 2rem;

  .reset-title {
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

  .reset-subtitle {
    color: var(--text-secondary, #666);
    font-size: 0.95rem;

    @media (max-width: 479px) {
      font-size: 1rem;
    }
  }
}

.reset-form {
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

    .password-field {
      position: relative;

      .password-input {
        width: 100%;
        padding: 0.875rem 3rem 0.875rem 1rem;
        border: 1px solid var(--border-primary, #e0e0e0);
        border-radius: 6px;
        font-size: 1rem;
        min-height: 44px;
        -webkit-appearance: none;
        background: var(--surface-secondary, #fff);
        color: var(--text-primary, #333);

        @media (min-width: 480px) {
          padding: 0.8rem 3rem 0.8rem 1rem;
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

      .password-toggle {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        min-height: 44px;
        display: flex;
        align-items: center;

        @media (min-width: 480px) {
          padding: 0.25rem;
          min-height: auto;
        }

        &:hover {
          opacity: 0.7;
        }
      }
    }

    .password-strength {
      margin-top: 0.5rem;

      .strength-bar {
        height: 4px;
        background: var(--border-primary, #e0e0e0);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 0.25rem;

        .strength-fill {
          height: 100%;
          transition: width 0.3s ease;

          &.weak {
            background: #ff4757;
          }

          &.medium {
            background: #ffa502;
          }

          &.strong {
            background: #2ed573;
          }
        }
      }

      .strength-text {
        font-size: 0.8rem;

        &.weak {
          color: #ff4757;
        }

        &.medium {
          color: #ffa502;
        }

        &.strong {
          color: #2ed573;
        }
      }
    }

    .field-error {
      margin-top: 0.25rem;
      color: var(--error-color, #d32f2f);
      font-size: 0.8rem;
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

.reset-success {
  text-align: center;
  padding: 2rem 1rem;

  .success-icon {
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
    margin-bottom: 2rem;
    line-height: 1.5;
  }

  .login-button {
    padding: 0.875rem 2rem;
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
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      min-height: auto;
    }

    &:hover {
      background: var(--primary-color-hover, #3a56d4);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
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