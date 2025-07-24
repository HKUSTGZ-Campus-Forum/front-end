<template>
  <HomeContainer>
    <div class="login-container">
      <h1 class="page-title">登录</h1>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名或邮箱</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名或邮箱"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <div class="password-field">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "隐藏" : "显示" }}
            </button>
          </div>
        </div>

        <div class="form-options">
          <label>
            <input type="checkbox" v-model="rememberMe" />
            记住我
          </label>
          <NuxtLink to="/forgot-password" class="forgot-password">
            忘记密码?
          </NuxtLink>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="login-button" :disabled="isLoading">
          {{ isLoading ? "登录中..." : "登录" }}
        </button>
      </form>

      <div class="register-link">
        还没有账号?
        <NuxtLink to="/register">立即注册</NuxtLink>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";

// 获取认证功能
const { login } = useAuth();

// 状态变量
const username = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const errorMessage = ref("");
const isLoading = ref(false);

const router = useRouter();
const route = useRoute();

// 登录处理函数
async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = "请输入用户名和密码";
    return;
  }

  try {
    isLoading.value = true;
    errorMessage.value = "";

    const user = await login(username.value, password.value, rememberMe.value);

    // 登录成功后重定向
    if (user?.isFirstLogin) {
      // 首次登录用户去设置页面
      router.push("/setting/background");
    } else {
      // 返回用户之前访问的页面，或默认跳转到论坛
      const redirectPath = route.query.redirect || "/";
      router.push(redirectPath);
    }
  } catch (error) {
    console.error("登录出错:", error);
    errorMessage.value = error.message || "用户名或密码错误，请重试";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  max-width: 400px;
  margin: 1rem auto;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (min-width: 480px) {
    margin: 1.5rem auto;
    padding: 1.5rem;
  }

  @media (min-width: 768px) {
    margin: 2rem auto;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
}

.page-title {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;

  @media (min-width: 480px) {
    font-size: 1.75rem;
  }

  @media (min-width: 768px) {
    font-size: 2rem;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-weight: 500;
    font-size: 0.95rem;

    @media (max-width: 479px) {
      font-size: 1rem;
    }
  }

  input {
    padding: 0.875rem 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.3s;
    min-height: 44px; // Touch-friendly minimum height
    -webkit-appearance: none; // Remove iOS styling
    
    @media (min-width: 480px) {
      padding: 0.75rem 1rem;
      border-radius: 4px;
      min-height: auto;
    }

    &:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
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
    width: 100%;
    padding-right: 80px;

    @media (max-width: 479px) {
      padding-right: 90px;
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
    font-size: 0.85rem;
    padding: 0.5rem;
    min-height: 44px; // Touch-friendly size
    display: flex;
    align-items: center;

    @media (min-width: 480px) {
      font-size: 0.8rem;
      padding: 0.25rem;
      min-height: auto;
      right: 10px;
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

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  gap: 1rem;

  @media (max-width: 479px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    min-height: 44px; // Touch-friendly size

    @media (min-width: 480px) {
      min-height: auto;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
  }

  .forgot-password {
    color: #3498db;
    text-decoration: none;
    padding: 0.5rem;
    min-height: 44px; // Touch-friendly size
    display: flex;
    align-items: center;
    justify-content: center;

    @media (min-width: 480px) {
      padding: 0.25rem;
      min-height: auto;
    }

    &:hover {
      text-decoration: underline;
    }

    &:active {
      background-color: rgba(52, 152, 219, 0.1);
      border-radius: 4px;
    }
  }
}

.error-message {
  background-color: #ffecec;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  border-left: 4px solid #e74c3c;

  @media (min-width: 480px) {
    padding: 0.75rem;
    border-radius: 4px;
  }
}

.login-button {
  padding: 0.875rem;
  border: none;
  border-radius: 6px;
  background-color: #3498db;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
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
    background-color: #2980b9;
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

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.95rem;

  @media (max-width: 479px) {
    font-size: 1rem;
  }

  a {
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem;
    border-radius: 4px;
    display: inline-block;
    min-height: 44px;
    line-height: 1.2;

    @media (min-width: 480px) {
      padding: 0.25rem;
      min-height: auto;
    }

    &:hover {
      text-decoration: underline;
      background-color: rgba(52, 152, 219, 0.05);
    }

    &:active {
      background-color: rgba(52, 152, 219, 0.1);
    }
  }
}
</style>
