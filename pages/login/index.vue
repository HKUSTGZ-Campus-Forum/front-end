<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";

definePageMeta({ layout: 'keguang-auth' });

const { login } = useAuth();
const username = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const errorMessage = ref("");
const isLoading = ref(false);

const router = useRouter();
const route = useRoute();

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = "请输入用户名和密码";
    return;
  }
  try {
    isLoading.value = true;
    errorMessage.value = "";
    const user = await login(username.value, password.value, rememberMe.value);
    if (user?.isFirstLogin) {
      router.push("/setting/background");
    } else {
      const redirectPath = route.query.redirect || "/";
      router.push(redirectPath);
    }
  } catch (error) {
    errorMessage.value = error.message || "用户名或密码错误，请重试";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="kg-login-card">
    <h1 class="kg-login-title">欢迎回来</h1>
    <p class="kg-login-subtitle">登录到 UniKorn 科广汇</p>

    <form class="kg-form" @submit.prevent="handleLogin">
      <div class="kg-form-group">
        <label for="username">用户名或邮箱</label>
        <input
          id="username"
          v-model="username"
          class="kg-input"
          type="text"
          placeholder="请输入用户名或邮箱"
          autocomplete="username"
          required
        />
      </div>

      <div class="kg-form-group">
        <label for="password">密码</label>
        <div class="kg-password-field">
          <input
            id="password"
            v-model="password"
            class="kg-input"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
            required
          />
          <button type="button" class="kg-toggle-pwd" @click="showPassword = !showPassword">
            {{ showPassword ? "隐藏" : "显示" }}
          </button>
        </div>
      </div>

      <div class="kg-form-options">
        <label class="kg-checkbox-label">
          <input type="checkbox" v-model="rememberMe" />
          记住我
        </label>
        <NuxtLink to="/forgot-password" class="kg-forgot-link">忘记密码?</NuxtLink>
      </div>

      <div v-if="errorMessage" class="kg-error-msg">{{ errorMessage }}</div>

      <button type="submit" class="kg-submit-btn" :disabled="isLoading">
        {{ isLoading ? "登录中..." : "登录" }}
      </button>
    </form>

    <div class="kg-form-footer">
      还没有账号？
      <NuxtLink to="/register" class="kg-link">立即注册</NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-login-card {
  width: 100%;
  max-width: 420px;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(40, 57, 101, 0.12);
  padding: 40px 36px;
}

.kg-login-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1a2a4a;
  margin: 0 0 6px;
  text-align: center;
}

.kg-login-subtitle {
  font-size: 0.9rem;
  color: #4a6080;
  margin: 0 0 32px;
  text-align: center;
}

.kg-form { display: flex; flex-direction: column; gap: 20px; }

.kg-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label { font-size: 0.875rem; font-weight: 600; color: #4a6080; }
}

.kg-input {
  padding: 11px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  background: #fff;
  color: #1a2a4a;
  font-size: 0.93rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
  &:focus { border-color: #26a4ff; }
  &::placeholder { color: #9ab0c6; }
}

.kg-password-field {
  position: relative;
  .kg-input { padding-right: 60px; }
}

.kg-toggle-pwd {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6a85a0;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 4px;
  &:hover { color: #26a4ff; }
}

.kg-form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kg-checkbox-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.875rem;
  color: #4a6080;
  cursor: pointer;
  input { accent-color: #26a4ff; }
}

.kg-forgot-link {
  font-size: 0.875rem;
  color: #26a4ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.kg-error-msg {
  padding: 10px 14px;
  background: rgba(224, 90, 90, 0.1);
  border: 1px solid rgba(224, 90, 90, 0.3);
  border-radius: 10px;
  color: #e05a5a;
  font-size: 0.875rem;
}

.kg-submit-btn {
  width: 100%;
  padding: 12px;
  background: #283965;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #1a5fa8; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.kg-form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 0.9rem;
  color: #4a6080;
}

.kg-link {
  color: #26a4ff;
  text-decoration: none;
  font-weight: 600;
  &:hover { text-decoration: underline; }
}
</style>
