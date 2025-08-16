<template>
  <div class="login-container">
    <h1 class="page-title">欢迎回来</h1>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <form class="login-form" @submit.prevent="handleLogin">
      <!-- 用户名输入框 -->
      <div class="form-group">
        <label for="username">用户名</label>
        <div class="input-wrapper">
          <i class="fas fa-user"></i>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
            :disabled="loading"
          />
        </div>
      </div>

      <!-- 密码输入框 -->
      <div class="form-group">
        <label for="password">密码</label>
        <div class="input-wrapper password-field">
          <i class="fas fa-lock"></i>
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            required
            :disabled="loading"
          />
          <button
            type="button"
            class="password-toggle"
            @click="showPassword = !showPassword"
          >
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <!-- 选项区域 -->
      <div class="form-options">
        <div class="remember-me">
          <input
            id="rememberMe"
            v-model="rememberMe"
            type="checkbox"
            :disabled="loading"
          />
          <label for="rememberMe">记住我</label>
        </div>
        <button type="button" @click="showForgotPassword" class="forgot-password">忘记密码?</button>
      </div>

      <!-- Show forgot password component -->
      <AuthForgotPassword 
        v-if="showForgotPasswordModal" 
        @back-to-login="closeForgotPassword"
      />

      <!-- 登录按钮 -->
      <button type="submit" class="login-button" :disabled="loading">
        <span v-if="!loading">登录</span>
        <i v-else class="fas fa-spinner fa-spin"></i>
      </button>

      <!-- 注册链接 -->
      <div class="register-link">
        还没有账号? <NuxtLink to="/register">立即注册</NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";

// 表单状态
const username = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const showForgotPasswordModal = ref(false);

// 使用 useAuth composable
const { login, loading, error } = useAuth();

// 登录处理函数
async function handleLogin() {
  if (!username.value || !password.value) {
    return;
  }

  try {
    await login(username.value, password.value);

    // 记住我功能 (可以在 useAuth 中添加)
    if (rememberMe.value) {
      // 设置持久登录，比如增加 cookie 过期时间
      localStorage.setItem("remember_me", "true");
    }
  } catch (err) {
    // 错误已在 useAuth 中处理
    console.error("登录处理错误:", err);
  }
}

// Show forgot password modal
function showForgotPassword() {
  showForgotPasswordModal.value = true;
}

// Close forgot password modal
function closeForgotPassword() {
  showForgotPasswordModal.value = false;
}
</script>

<style lang="scss" scoped>
.login-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (min-width: 480px) {
    padding: 1.5rem;
  }

  @media (min-width: 768px) {
    padding: 2rem;
    background-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
}

.page-title {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.5rem;

  @media (min-width: 480px) {
    font-size: 1.65rem;
    margin-bottom: 1.75rem;
  }

  @media (min-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 2rem;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (min-width: 768px) {
    gap: 1.5rem;
  }
}

.form-group {
  display: flex;
  flex-direction: column;

  label {
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.95rem;

    @media (max-width: 479px) {
      font-size: 1rem;
    }
  }

  .input-wrapper {
    position: relative;

    i {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #6c757d;
      font-size: 1rem;

      @media (max-width: 479px) {
        font-size: 1.1rem;
      }
    }

    input {
      width: 100%;
      padding: 0.875rem 1rem 0.875rem 2.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      min-height: 44px; // Touch-friendly minimum height
      -webkit-appearance: none; // Remove iOS styling

      @media (min-width: 480px) {
        padding: 0.8rem 1rem 0.8rem 2.5rem;
        border-radius: 4px;
        min-height: auto;
      }

      &:focus {
        border-color: #4361ee;
        box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.25);
        outline: none;
      }

      // Prevent zoom on iOS
      @media (max-width: 479px) {
        font-size: 16px;
      }
    }
  }
}

.password-field {
  .password-toggle {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6c757d;
    cursor: pointer;
    padding: 0.5rem;
    min-height: 44px; // Touch-friendly minimum size
    display: flex;
    align-items: center;

    @media (min-width: 480px) {
      padding: 0.25rem;
      min-height: auto;
    }

    &:hover {
      color: #4361ee;
    }

    &:active {
      background-color: rgba(67, 97, 238, 0.1);
      border-radius: 4px;
    }
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  @media (max-width: 479px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .remember-me {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px; // Touch-friendly minimum size

    @media (min-width: 480px) {
      min-height: auto;
    }

    input {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    label {
      cursor: pointer;
      font-size: 0.95rem;

      @media (max-width: 479px) {
        font-size: 1rem;
      }
    }
  }

  .forgot-password {
    color: #4361ee;
    text-decoration: none;
    font-size: 0.9rem;
    padding: 0.5rem;
    border-radius: 4px;
    min-height: 44px; // Touch-friendly minimum size
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;

    @media (min-width: 480px) {
      padding: 0.25rem;
      min-height: auto;
    }

    @media (max-width: 479px) {
      font-size: 1rem;
    }

    &:hover {
      text-decoration: underline;
      background-color: rgba(67, 97, 238, 0.05);
    }

    &:active {
      background-color: rgba(67, 97, 238, 0.1);
    }
  }
}

.error-message {
  padding: 1rem;
  background-color: #ffebee;
  color: #d32f2f;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border-left: 4px solid #d32f2f;

  @media (min-width: 480px) {
    padding: 0.75rem;
    border-radius: 4px;
  }

  @media (max-width: 479px) {
    font-size: 1rem;
  }
}

.login-button {
  padding: 0.875rem;
  background-color: #4361ee;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px; // Touch-friendly minimum height
  display: flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 480px) {
    padding: 0.8rem;
    border-radius: 4px;
    min-height: auto;
  }

  &:hover:not(:disabled) {
    background-color: #3a56d4;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background-color: #a0a0a0;
    cursor: not-allowed;
  }
}

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.95rem;

  @media (max-width: 479px) {
    font-size: 1rem;
  }

  a {
    color: #4361ee;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem;
    border-radius: 4px;
    display: inline-block;
    min-height: 44px; // Touch-friendly minimum size
    line-height: 1.2;

    @media (min-width: 480px) {
      padding: 0.25rem;
      min-height: auto;
    }

    &:hover {
      text-decoration: underline;
      background-color: rgba(67, 97, 238, 0.05);
    }

    &:active {
      background-color: rgba(67, 97, 238, 0.1);
    }
  }
}
</style>
