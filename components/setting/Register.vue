<template>
  <div class="register-setting">
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <AuthEmailVerification
      v-if="showEmailVerification"
      :user-id="registeredUserId"
      :user-email="registeredEmail"
      :username="registeredUsername"
      @verification-success="handleVerificationSuccess"
      @back-to-register="resetRegistration"
    />

    <form v-else @submit.prevent="handleRegister" class="register-form">
      <div class="form-group">
        <label for="settingUsername">{{ t("auth.register.username") }}</label>
        <input
          id="settingUsername"
          v-model="username"
          type="text"
          :placeholder="t('auth.register.usernamePlaceholder')"
          required
          @blur="validateUsername"
        />
        <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
      </div>

      <div class="form-group">
        <label for="settingEmail">{{ t("auth.register.email") }} <span class="required">*</span></label>
        <input
          id="settingEmail"
          v-model="email"
          type="email"
          :placeholder="t('auth.register.emailPlaceholder')"
          required
          @blur="validateEmail"
        />
        <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        <div class="email-hint">
          <p>{{ t("auth.register.emailHintTitle") }}</p>
          <ul>
            <li>@connect.hkust-gz.edu.cn</li>
            <li>@hkust-gz.edu.cn</li>
          </ul>
        </div>
      </div>

      <div class="form-group">
        <label for="settingPassword">{{ t("auth.register.password") }}</label>
        <div class="password-field">
          <input
            id="settingPassword"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('auth.register.passwordPlaceholder')"
            required
            @blur="validatePassword"
          />
          <button
            type="button"
            class="toggle-password"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? t("common.hide") : t("common.show") }}
          </button>
        </div>
        <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
      </div>

      <div class="form-group">
        <label for="settingConfirmPassword">{{ t("auth.register.confirmPassword") }}</label>
        <div class="password-field">
          <input
            id="settingConfirmPassword"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            :placeholder="t('auth.register.confirmPasswordPlaceholder')"
            required
            @blur="validateConfirmPassword"
          />
          <button
            type="button"
            class="toggle-password"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            {{ showConfirmPassword ? t("common.hide") : t("common.show") }}
          </button>
        </div>
        <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
      </div>

      <div v-if="registerError" class="global-error">
        {{ registerError }}
      </div>

      <button type="submit" class="register-btn" :disabled="isLoading || !formValid">
        {{ isLoading ? t("auth.register.submitting") : t("auth.register.submit") }}
      </button>

      <div class="verification-notice">
        <p>{{ t("auth.register.verificationNotice") }}</p>
        <div class="trash-mail-reminder">
          <strong>⚠️ {{ t("auth.register.verificationWarningTitle") }}</strong>
          <p>{{ t("auth.register.verificationWarningBody") }}</p>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '~/composables/useAuth';

const { t } = useI18n();
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const errors = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});
const registerError = ref('');
const isLoading = ref(false);
const successMessage = ref('');

const showEmailVerification = ref(false);
const registeredUserId = ref(null);
const registeredEmail = ref('');
const registeredUsername = ref('');

const { register } = useAuth();

const validateUsername = () => {
  if (!username.value) {
    errors.value.username = t('auth.register.errors.usernameRequired');
  } else if (username.value.length < 2) {
    errors.value.username = t('auth.register.errors.usernameMin');
  } else if (username.value.length > 50) {
    errors.value.username = t('auth.register.errors.usernameMax');
  } else {
    const forbiddenChars = /[<>"'&/\\|?*:;]/;
    if (forbiddenChars.test(username.value)) {
      errors.value.username = t('auth.register.errors.usernameForbidden');
    } else {
      errors.value.username = '';
    }
  }
};

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hkustDomains = ['connect.hkust-gz.edu.cn', 'hkust-gz.edu.cn'];

  if (!email.value) {
    errors.value.email = t('auth.register.errors.emailRequired');
  } else if (!emailRegex.test(email.value)) {
    errors.value.email = t('auth.register.errors.emailInvalid');
  } else {
    const emailLower = email.value.toLowerCase().trim();
    const emailParts = emailLower.split('@');
    const isHkustEmail = emailParts.length === 2 && hkustDomains.includes(emailParts[1]);

    if (!isHkustEmail) {
      errors.value.email = t('auth.register.errors.emailDomain');
    } else {
      errors.value.email = '';
    }
  }
};

const validatePassword = () => {
  if (!password.value) {
    errors.value.password = t('auth.register.errors.passwordRequired');
  } else if (password.value.length < 6) {
    errors.value.password = t('auth.register.errors.passwordMin');
  } else {
    errors.value.password = '';
  }
};

const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    errors.value.confirmPassword = t('auth.register.errors.confirmRequired');
  } else if (password.value !== confirmPassword.value) {
    errors.value.confirmPassword = t('auth.register.errors.confirmMismatch');
  } else {
    errors.value.confirmPassword = '';
  }
};

const formValid = computed(() => {
  return (
    username.value &&
    email.value &&
    password.value &&
    confirmPassword.value &&
    !errors.value.username &&
    !errors.value.email &&
    !errors.value.password &&
    !errors.value.confirmPassword
  );
});

const handleRegister = async () => {
  validateUsername();
  validateEmail();
  validatePassword();
  validateConfirmPassword();

  if (
    errors.value.username ||
    errors.value.email ||
    errors.value.password ||
    errors.value.confirmPassword
  ) {
    return;
  }

  try {
    isLoading.value = true;
    registerError.value = '';

    const result = await register(username.value, email.value, password.value);

    if (result.success) {
      registeredUserId.value = result.userId;
      registeredEmail.value = email.value;
      registeredUsername.value = username.value;
      showEmailVerification.value = true;
      password.value = '';
      confirmPassword.value = '';
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : t('auth.register.errors.registerFailed');
    const normalizedError = errorMessage.toLowerCase();
    registerError.value = errorMessage;

    if (
      normalizedError.includes('username already exists') ||
      normalizedError.includes('username_taken')
    ) {
      errors.value.username = t('auth.register.errors.usernameTaken');
      registerError.value = '';
    } else if (
      normalizedError.includes('email already registered') ||
      normalizedError.includes('email_taken')
    ) {
      errors.value.email = t('auth.register.errors.emailTaken');
      registerError.value = '';
    }
  } finally {
    isLoading.value = false;
  }
};

const handleVerificationSuccess = (data) => {
  showEmailVerification.value = false;
  successMessage.value = t('auth.register.success');
  resetForm();
  emit('register-success', data);
};

const resetRegistration = () => {
  showEmailVerification.value = false;
  registeredUserId.value = null;
  registeredEmail.value = '';
  registeredUsername.value = '';
};

const resetForm = () => {
  username.value = '';
  email.value = '';
  password.value = '';
  confirmPassword.value = '';
  Object.keys(errors.value).forEach((key) => {
    errors.value[key] = '';
  });
  registerError.value = '';
};

const emit = defineEmits(['register-success']);
</script>
  
  <style lang="scss" scoped>
  .register-setting {
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    @media (min-width: 480px) {
      padding: 1.25rem;
    }

    @media (min-width: 768px) {
      padding: 1.5rem;
    }
  }
  
//   .section-title {
//     margin-bottom: 1.5rem;
//     font-size: 1.5rem;
//     font-weight: 600;
//     color: #333;
//   }
  
  .register-form {
    max-width: 500px;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
      font-size: 0.95rem;

      @media (max-width: 479px) {
        font-size: 1rem;
      }
    }
    
    input {
      width: 100%;
      padding: 0.875rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      min-height: 44px; // Touch-friendly minimum height
      -webkit-appearance: none; // Remove iOS styling

      @media (min-width: 480px) {
        padding: 0.75rem;
        border-radius: 4px;
        min-height: auto;
      }
      
      &:focus {
        outline: none;
        border-color: var(--color-blue-7, #9fc3e7);
        box-shadow: 0 0 0 3px rgba(159, 195, 231, 0.2);
      }

      // Prevent zoom on iOS
      @media (max-width: 479px) {
        font-size: 16px;
      }
    }
  }
  
  .password-field {
    position: relative;
    
    input {
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
      color: #666;
      cursor: pointer;
      padding: 0.5rem;
      min-height: 44px; // Touch-friendly minimum size
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
        color: #333;
      }

      &:active {
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
      }
    }
  }
  
  .error-text {
    display: block;
    color: #dc3545;
    font-size: 0.85rem;
    margin-top: 0.25rem;

    @media (max-width: 479px) {
      font-size: 0.9rem;
    }
  }
  
  .global-error {
    color: #dc3545;
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: rgba(220, 53, 69, 0.1);
    border-radius: 6px;
    font-size: 0.9rem;
    border-left: 4px solid #dc3545;

    @media (min-width: 480px) {
      padding: 0.75rem;
      border-radius: 4px;
    }

    @media (max-width: 479px) {
      font-size: 1rem;
    }
  }
  
  .register-btn {
    width: 100%;
    padding: 0.875rem;
    background-color: var(--color-blue-7, #9fc3e7);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px; // Touch-friendly minimum height
    display: flex;
    align-items: center;
    justify-content: center;

    @media (min-width: 480px) {
      padding: 0.75rem;
      border-radius: 4px;
      min-height: auto;
    }
    
    &:hover:not(:disabled) {
      background-color: #7ba8d6; // Manually tuned darker blue shade
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
  
  .success-message {
    padding: 1rem;
    background-color: rgba(40, 167, 69, 0.1);
    border-radius: 6px;
    color: #28a745;
    margin-bottom: 1rem;
    border-left: 4px solid #28a745;
    font-size: 0.95rem;

    @media (min-width: 480px) {
      border-radius: 4px;
    }

    @media (max-width: 479px) {
      font-size: 1rem;
    }
  }

  .required {
    color: var(--error-color, #dc3545);
    font-weight: bold;
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

  .verification-notice {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--info-background, rgba(33, 150, 243, 0.1));
    border-radius: 6px;
    border-left: 4px solid var(--info-color, #2196f3);

    @media (min-width: 480px) {
      padding: 0.75rem;
      border-radius: 4px;
    }

    p {
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
      color: var(--info-text, #1976d2);
      line-height: 1.4;

      @media (max-width: 479px) {
        font-size: 1rem;
      }
    }

    .trash-mail-reminder {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--warning-background, rgba(255, 193, 7, 0.1));
      border-radius: 4px;
      border-left: 3px solid var(--warning-color, #ffc107);

      strong {
        color: var(--warning-text, #f57c00);
        font-size: 0.85rem;
      }

      p {
        margin: 0.25rem 0 0 0;
        font-size: 0.8rem;
        color: var(--warning-text, #f57c00);
        line-height: 1.3;

        @media (max-width: 479px) {
          font-size: 0.9rem;
        }
      }
    }
  }
  </style>
