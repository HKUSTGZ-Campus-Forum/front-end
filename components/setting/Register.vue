<template>
    <div class="register-setting">
      
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      
      <!-- Show email verification component if registration succeeded and email verification is needed -->
      <AuthEmailVerification
        v-if="showEmailVerification"
        :user-id="registeredUserId"
        :user-email="registeredEmail"
        :username="registeredUsername"
        @verification-success="handleVerificationSuccess"
        @back-to-register="resetRegistration"
      />
      
      <form v-else @submit.prevent="handleRegister" class="register-form">
        <!-- 用户名字段 -->
        <div class="form-group">
          <label for="settingUsername">用户名</label>
          <input
            id="settingUsername"
            v-model="username"
            type="text"
            placeholder="请设置用户名"
            required
            @blur="validateUsername"
          />
          <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
        </div>
        
        <!-- 邮箱字段 - 现在是必填的 -->
        <div class="form-group">
          <label for="settingEmail">邮箱 <span class="required">*</span></label>
          <input
            id="settingEmail"
            v-model="email"
            type="email"
            placeholder="请输入HKUST-GZ邮箱"
            required
            @blur="validateEmail"
          />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
          <div class="email-hint">
            <p>只允许使用 HKUST-GZ 邮箱注册：</p>
            <ul>
              <li>@connect.hkust-gz.edu.cn</li>
              <li>@hkust-gz.edu.cn</li>
            </ul>
          </div>
        </div>
        
        <!-- 密码字段 -->
        <div class="form-group">
          <label for="settingPassword">密码</label>
          <div class="password-field">
            <input
              id="settingPassword"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请设置密码"
              required
              @blur="validatePassword"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "隐藏" : "显示" }}
            </button>
          </div>
          <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
        </div>
        
        <!-- 确认密码字段 -->
        <div class="form-group">
          <label for="settingConfirmPassword">确认密码</label>
          <div class="password-field">
            <input
              id="settingConfirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              required
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
          <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
        </div>
        
        <!-- 错误提示 -->
        <div v-if="registerError" class="global-error">
          {{ registerError }}
        </div>
        
        <!-- 提交按钮 -->
        <button type="submit" class="register-btn" :disabled="isLoading || !formValid">
          {{ isLoading ? '注册中...' : '注册' }}
        </button>

        <!-- 邮箱验证说明 -->
        <div class="verification-notice">
          <p>注册后我们将向您的邮箱发送验证码，请确保邮箱地址正确</p>
          <div class="trash-mail-reminder">
            <strong>⚠️ 重要提醒：</strong>
            <p>如果没有收到验证邮件，请检查您的垃圾邮件箱（垃圾邮件/废纸篓/杂件箱）</p>
          </div>
        </div>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import { useAuth } from '~/composables/useAuth';
  
  // 表单数据
  const username = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const showPassword = ref(false);
  const showConfirmPassword = ref(false);
  
  // 错误和状态管理
  const errors = ref({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const registerError = ref('');
  const isLoading = ref(false);
  const successMessage = ref('');
  
  // Email verification state
  const showEmailVerification = ref(false);
  const registeredUserId = ref(null);
  const registeredEmail = ref('');
  const registeredUsername = ref('');
  
  // 获取auth组合式函数
  const { register } = useAuth();
  
  // 表单验证函数
  const validateUsername = () => {
    if (!username.value) {
      errors.value.username = '请输入用户名';
    } else if (username.value.length < 2) {
      errors.value.username = '用户名至少需要2个字符';
    } else if (username.value.length > 50) {
      errors.value.username = '用户名不能超过50个字符';
    } else {
      // Check for forbidden characters
      const forbiddenChars = /[<>"'&/\\|?*:;]/;
      if (forbiddenChars.test(username.value)) {
        errors.value.username = '用户名不能包含特殊符号如 < > " \' & / \\ | ? * : ;';
      } else {
        errors.value.username = '';
      }
    }
  };
  
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hkustDomains = ['connect.hkust-gz.edu.cn', 'hkust-gz.edu.cn'];
    
    if (!email.value) {
      errors.value.email = '请输入邮箱地址';
    } else if (!emailRegex.test(email.value)) {
      errors.value.email = '请输入有效的邮箱地址';
    } else {
      const emailLower = email.value.toLowerCase().trim();
      
      // Check if it's exactly one of the allowed domains
      const emailParts = emailLower.split('@');
      const isHkustEmail = emailParts.length === 2 && 
                          hkustDomains.includes(emailParts[1]);
      
      if (!isHkustEmail) {
        errors.value.email = '只允许使用 HKUST-GZ 邮箱注册 (@connect.hkust-gz.edu.cn 或 @hkust-gz.edu.cn)';
      } else {
        errors.value.email = '';
      }
    }
  };
  
  const validatePassword = () => {
    if (!password.value) {
      errors.value.password = '请设置密码';
    } else if (password.value.length < 6) {
      errors.value.password = '密码至少需要6个字符';
    } else {
      errors.value.password = '';
    }
  };
  
  const validateConfirmPassword = () => {
    if (!confirmPassword.value) {
      errors.value.confirmPassword = '请确认密码';
    } else if (password.value !== confirmPassword.value) {
      errors.value.confirmPassword = '两次输入的密码不一致';
    } else {
      errors.value.confirmPassword = '';
    }
  };
  
  // 计算属性：表单是否有效
  const formValid = computed(() => {
    return (
      username.value &&
      email.value && // Email is now required
      password.value &&
      confirmPassword.value &&
      !errors.value.username &&
      !errors.value.email &&
      !errors.value.password &&
      !errors.value.confirmPassword
    );
  });
  
  // 提交处理
  const handleRegister = async () => {
    // 验证所有字段
    validateUsername();
    validateEmail();
    validatePassword();
    validateConfirmPassword();
    
    // 检查是否有错误
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
      
      // 注册成功，显示邮箱验证界面
      if (result.success) {
        registeredUserId.value = result.userId;
        registeredEmail.value = email.value;
        registeredUsername.value = username.value;
        showEmailVerification.value = true;
        
        // Clear form data for security
        password.value = '';
        confirmPassword.value = '';
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '注册失败，请稍后再试';
      registerError.value = errorMessage;
      
      // 如果是用户名已存在的错误，将错误信息显示在用户名输入框下方
      if (errorMessage.includes('用户名') && errorMessage.includes('已被使用')) {
        errors.value.username = errorMessage;
        registerError.value = ''; // 清除全局错误信息
      }
      // 如果是邮箱已存在的错误，显示在邮箱输入框下方
      else if (errorMessage.includes('邮箱') && errorMessage.includes('已被注册')) {
        errors.value.email = errorMessage;
        registerError.value = ''; // 清除全局错误信息
      }
    } finally {
      isLoading.value = false;
    }
  };

  // Handle successful email verification
  const handleVerificationSuccess = (data) => {
    showEmailVerification.value = false;
    successMessage.value = '邮箱验证成功！您现在可以正常使用论坛了。';
    
    // Clear all form data
    resetForm();
    
    // 触发事件
    emit('register-success', data);
  };

  // Reset registration to go back to form
  const resetRegistration = () => {
    showEmailVerification.value = false;
    registeredUserId.value = null;
    registeredEmail.value = '';
    registeredUsername.value = '';
    // Keep form data so user can try again
  };

  // Reset form completely
  const resetForm = () => {
    username.value = '';
    email.value = '';
    password.value = '';
    confirmPassword.value = '';
    Object.keys(errors.value).forEach(key => {
      errors.value[key] = '';
    });
    registerError.value = '';
  };
  
  // 定义事件
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
      background-color: #7ba8d6; // 手动指定的较深蓝色
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