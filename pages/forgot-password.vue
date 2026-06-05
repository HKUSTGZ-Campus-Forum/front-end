<template>
  <div class="forgot-password-container">
      <h1 class="page-title">{{ t("auth.forgotPassword.title") }}</h1>
      <p class="page-subtitle">{{ t("auth.forgotPassword.subtitle") }}</p>

      <div v-if="step === 1" class="email-step">
        <form class="forgot-password-form" @submit.prevent="handleSendResetEmail">
          <div class="form-group">
            <label for="email">{{ t("auth.forgotPassword.emailLabel") }}</label>
            <input
              id="email"
              v-model="email"
              type="email"
              :placeholder="t('auth.forgotPassword.emailPlaceholder')"
              autocomplete="email"
              required
              :disabled="isLoading"
              class="email-input"
            />
            <div class="email-hint">
              <p>{{ t("auth.forgotPassword.emailHint") }}</p>
            </div>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div v-if="successMessage" class="success-message">
            {{ successMessage }}
          </div>

          <button 
            type="submit" 
            class="send-reset-btn"
            :disabled="isLoading || !isValidEmail"
          >
            <span v-if="!isLoading">{{ t("auth.forgotPassword.sendLink") }}</span>
            <span v-else class="loading-spinner">⟳ {{ t("actions.sending") }}</span>
          </button>
        </form>
      </div>

      <div v-if="step === 2" class="success-step">
        <div class="success-icon">📧</div>
        <h2>{{ t("auth.forgotPassword.sentTitle") }}</h2>
        <p class="success-description">
          {{ t("auth.forgotPassword.sentDescription", { email }) }}
        </p>
        <div class="instructions">
          <h3>{{ t("auth.forgotPassword.nextSteps") }}</h3>
          <ol>
            <li>{{ t("auth.forgotPassword.stepOne") }}</li>
            <li>{{ t("auth.forgotPassword.stepTwo") }}</li>
            <li>{{ t("auth.forgotPassword.stepThree") }}</li>
          </ol>
        </div>
        <div class="resend-section">
          <p>{{ t("auth.forgotPassword.noMail") }}</p>
          <button 
            @click="handleResendEmail" 
            class="resend-btn"
            :disabled="resendCooldown > 0 || isLoading"
          >
            <span v-if="resendCooldown === 0 && !isLoading">{{ t("actions.resend") }}</span>
            <span v-else-if="isLoading">{{ t("actions.sending") }}</span>
            <span v-else>{{ t("auth.forgotPassword.resendAvailableIn", { seconds: resendCooldown }) }}</span>
          </button>
        </div>
      </div>

      <div class="navigation-links">
        <NuxtLink :to="getLocalePath('/login')" class="back-to-login">
          ← {{ t("auth.forgotPassword.backToLogin") }}
        </NuxtLink>
        <NuxtLink :to="getLocalePath('/register')" class="go-to-register">
          {{ t("auth.forgotPassword.goToRegister") }}
        </NuxtLink>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'

const { forgotPassword } = useAuth()
const { t } = useI18n()
const { getLocalePath } = useAppLocale()

const step = ref(1)
const email = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const resendCooldown = ref(0)

let cooldownTimer: NodeJS.Timeout | null = null

const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const hkustDomains = ['connect.hkust-gz.edu.cn', 'hkust-gz.edu.cn']
  
  if (!emailRegex.test(email.value)) {
    return false
  }
  
  const emailLower = email.value.toLowerCase().trim()
  const emailParts = emailLower.split('@')
  return emailParts.length === 2 && hkustDomains.includes(emailParts[1])
})

const handleSendResetEmail = async () => {
  if (!isValidEmail.value) {
    errorMessage.value = t('auth.forgotPassword.errors.emailInvalid')
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await forgotPassword(email.value.trim().toLowerCase())
    
    if (result.success) {
      step.value = 2
      startCooldown()
    }
  } catch (err) {
    console.error('Forgot password error:', err)
    errorMessage.value = err instanceof Error ? err.message : t('auth.forgotPassword.errors.sendFailed')
  } finally {
    isLoading.value = false
  }
}

const handleResendEmail = async () => {
  if (resendCooldown.value > 0) return
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const result = await forgotPassword(email.value.trim().toLowerCase())
    
    if (result.success) {
      successMessage.value = t('auth.forgotPassword.success.resent')
      startCooldown()
    }
  } catch (err) {
    console.error('Resend reset email error:', err)
    errorMessage.value = err instanceof Error ? err.message : t('auth.forgotPassword.errors.resendFailed')
  } finally {
    isLoading.value = false
  }
}

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

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})

definePageMeta({
  layout: 'keguang'
})

useHead(() => ({
  title: `${t('auth.forgotPassword.title')} - ${t('common.appName')}`,
  meta: [
    { name: 'description', content: t('auth.forgotPassword.subtitle') }
  ]
}))
</script>

<style lang="scss" scoped>
.forgot-password-container {
  max-width: 480px;
  margin: 2rem auto;
  padding: 1rem;
  
  @media (min-width: 768px) {
    margin: 3rem auto;
    padding: 2rem;
  }
}

.page-title {
  text-align: center;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary, #333);
  
  @media (min-width: 768px) {
    font-size: 2rem;
  }
}

.page-subtitle {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-secondary, #666);
  line-height: 1.5;
  font-size: 0.95rem;
  
  @media (min-width: 768px) {
    font-size: 1rem;
  }
}

.email-step {
  .forgot-password-form {
    background: var(--surface-primary, rgba(255, 255, 255, 0.95));
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: var(--shadow-small, 0 2px 8px rgba(0, 0, 0, 0.1));
    
    @media (min-width: 768px) {
      padding: 2rem;
      box-shadow: var(--shadow-medium, 0 4px 15px rgba(0, 0, 0, 0.1));
    }
  }
}

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
    background: var(--surface-secondary, #fff);
    color: var(--text-primary, #333);
    transition: border-color 0.2s;
    
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
  
  .email-hint {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-tertiary, #888);
    
    p {
      margin: 0;
    }
  }
}

.send-reset-btn {
  width: 100%;
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
  
  .loading-spinner {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.success-step {
  text-align: center;
  background: var(--surface-primary, rgba(255, 255, 255, 0.95));
  border-radius: 8px;
  padding: 2rem 1.5rem;
  box-shadow: var(--shadow-small, 0 2px 8px rgba(0, 0, 0, 0.1));
  
  @media (min-width: 768px) {
    padding: 3rem 2rem;
    box-shadow: var(--shadow-medium, 0 4px 15px rgba(0, 0, 0, 0.1));
  }
  
  .success-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  h2 {
    color: var(--success-color, #28a745);
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .success-description {
    color: var(--text-secondary, #666);
    margin-bottom: 2rem;
    line-height: 1.5;
    
    strong {
      color: var(--text-primary, #333);
      font-weight: 600;
    }
  }
  
  .instructions {
    text-align: left;
    background: var(--surface-secondary, #f8f9fa);
    border-radius: 6px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    
    h3 {
      color: var(--text-primary, #333);
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
    }
    
    ol {
      margin: 0;
      padding-left: 1.25rem;
      
      li {
        color: var(--text-secondary, #666);
        margin-bottom: 0.5rem;
        line-height: 1.4;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
  
  .resend-section {
    p {
      color: var(--text-secondary, #666);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    
    .resend-btn {
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--primary-color, #4361ee);
      border: 1px solid var(--primary-color, #4361ee);
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      
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
}

.navigation-links {
  margin-top: 2rem;
  text-align: center;
  
  a {
    display: inline-block;
    margin: 0.5rem;
    color: var(--primary-color, #4361ee);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
    
    &:hover {
      color: var(--primary-color-hover, #3a56d4);
      text-decoration: underline;
    }
  }
  
  .back-to-login {
    font-weight: 500;
  }
  
  .go-to-register {
    color: var(--text-secondary, #666);
    
    &:hover {
      color: var(--text-primary, #333);
    }
  }
}

// Error and Success Messages
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
</style>
