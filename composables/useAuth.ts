// composables/useAuth.ts
import { ref, computed } from "vue";

interface User {
  id: string;
  username: string;
  isFirstLogin: boolean;
  // 其他用户信息
}

export function useAuth() {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isLoggedIn = computed(() => !!user.value && !!token.value);


  // 登录函数
  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      // 调用API进行登录
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("登录失败");
      }

      const data = await response.json();
      token.value = data.token;
      user.value = data.user;

      // 存储令牌
      localStorage.setItem("auth_token", data.token);

      // 首次登录后重定向
      if (user.value?.isFirstLogin) {
        navigateTo("/setting/background");
      } else {
        navigateTo("/dashboard");
      }

      return user.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    error.value = null;

    try {
      // 可选：调用API进行登出
      // const response = await fetch('/api/auth/logout', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token.value}` }
      // });

      // 清除状态
      user.value = null;
      token.value = null;

      // 从localStorage中移除令牌
      localStorage.removeItem("auth_token");

      // 重定向到首页或登录页
      navigateTo("/");

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "登出失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(username: string, email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      // 调用API进行注册
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "注册失败");
      }

      const data = await response.json();
      
      // 注册成功，但不自动登录用户
      // 如果需要自动登录，可以在这里设置 token 和 user
      
      return { success: true, data };
    } catch (err) {
      error.value = err instanceof Error ? err.message : "注册失败，请稍后再试";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isLoggedIn,
    login,
    logout,
    register,
  };
}
