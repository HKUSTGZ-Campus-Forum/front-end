<template>
    <div class="register-setting">
      
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      
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
        
        <!-- 邮箱字段 -->
        <div class="form-group">
          <label for="settingEmail">邮箱</label>
          <input
            id="settingEmail"
            v-model="email"
            type="email"
            placeholder="请输入邮箱"
            required
            @blur="validateEmail"
          />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
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
  
  // 获取auth组合式函数
  const { register } = useAuth();
  
  // 表单验证函数
  const validateUsername = () => {
    if (!username.value) {
      errors.value.username = '请输入用户名';
    } else if (username.value.length < 3) {
      errors.value.username = '用户名至少需要3个字符';
    } else if (username.value.length > 20) {
      errors.value.username = '用户名不能超过20个字符';
    } else {
      errors.value.username = '';
    }
  };
  
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value) {
      errors.value.email = '请输入邮箱地址';
    } else if (!emailRegex.test(email.value)) {
      errors.value.email = '请输入有效的邮箱地址';
    } else {
      errors.value.email = '';
    }
  };
  
  const validatePassword = () => {
    if (!password.value) {
      errors.value.password = '请设置密码';
    } else if (password.value.length < 8) {
      errors.value.password = '密码至少需要8个字符';
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
      email.value &&
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
      
      await register(username.value, email.value, password.value);
      
      // 注册成功
      successMessage.value = '注册成功！账户已创建。';
      
      // 清除表单
      username.value = '';
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
      
      // 触发事件
      emit('register-success');
    } catch (err) {
      registerError.value = err instanceof Error ? err.message : '注册失败，请稍后再试';
    } finally {
      isLoading.value = false;
    }
  };
  
  // 定义事件
  const emit = defineEmits(['register-success']);
  </script>
  
  <style lang="scss" scoped>
  .register-setting {
    padding: 1.5rem;
    // background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
    }
    
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      
      &:focus {
        outline: none;
        border-color: var(--color-blue-7, #9fc3e7);
        box-shadow: 0 0 0 2px rgba(159, 195, 231, 0.2);
      }
    }
  }
  
  .password-field {
    position: relative;
    
    input {
      padding-right: 80px;
    }
    
    .toggle-password {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      
      &:hover {
        color: #333;
      }
    }
  }
  
  .error-text {
    display: block;
    color: #dc3545;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }
  
  .global-error {
    color: #dc3545;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: rgba(220, 53, 69, 0.1);
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .register-btn {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--color-blue-7, #9fc3e7);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover:not(:disabled) {
      background-color: #7ba8d6; // 手动指定的较深蓝色
    }
    
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
  
  .success-message {
    padding: 1rem;
    background-color: rgba(40, 167, 69, 0.1);
    border-radius: 4px;
    color: #28a745;
    margin-bottom: 1rem;
  }
  </style>