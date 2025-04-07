<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../store/authStore";

const username = ref("");
const password = ref("");
const errorMessage = ref("");
const authStore = useAuthStore();

// 登录函数
async function login() {
  try {
    errorMessage.value = "";
    const user = await authStore.login(username.value, password.value);

    // 首次登录后重定向到背景设置页面
    if (user && user.isFirstLogin) {
      navigateTo("/setting/background");
    } else {
      navigateTo("/dashboard");
    }
  } catch (error) {
    errorMessage.value = "登录失败，请检查用户名和密码";
    console.error("登录错误:", error);
  }
}
</script>

<template>
  <div class="login-container">
    <h1>用户登录</h1>

    <form @submit.prevent="login" class="login-form">
      <div class="form-group">
        <label for="username">用户名</label>
        <input
          id="username"
          v-model="username"
          type="text"
          required
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
        />
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <button type="submit" class="login-button">登录</button>
    </form>
  </div>
</template>
