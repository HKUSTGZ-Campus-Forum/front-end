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
      console.log("开始登录请求，发送数据:", { username });

      // 调用API进行登录
      const response = await fetch("https://dev.unikorn.axfff.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      console.log("收到响应状态:", response.status);

      if (!response.ok) {
        // 尝试读取错误响应内容
        let errorMessage = "登录失败";
        try {
          // 尝试解析错误响应为JSON
          const errorData = await response.json();
          console.error("登录错误详情:", errorData);
          errorMessage =
            errorData.message ||
            errorData.error ||
            errorData.msg ||
            `登录失败(${response.status})`;
        } catch (parseError) {
          // 如果JSON解析失败，尝试获取文本响应
          const errorText = await response.text();
          console.error("服务器返回非JSON错误:", errorText);
          errorMessage = `登录失败(${response.status}): ${errorText.substring(
            0,
            100
          )}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("登录成功，服务器响应:", data);

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
      console.error("登录过程中发生错误:", err);
      error.value = err instanceof Error ? err.message : "登录失败，请稍后重试";
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
      console.log("开始注册请求，发送数据:", { username, email });

      // 调用API进行注册
      const response = await fetch("https://dev.unikorn.axfff.com/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      console.log("收到响应状态:", response.status);

      if (!response.ok) {
        // 尝试读取错误响应内容
        let errorMessage = "注册失败";
        try {
          // 尝试解析错误响应为JSON
          const errorData = await response.json();
          console.error("服务器错误详情:", errorData);
          errorMessage =
            errorData.message ||
            errorData.error ||
            `服务器错误(${response.status})`;
        } catch (parseError) {
          // 如果JSON解析失败，尝试获取文本响应
          const errorText = await response.text();
          console.error("服务器返回非JSON错误:", errorText);
          errorMessage = `服务器错误(${response.status}): ${errorText.substring(
            0,
            100
          )}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("注册成功，服务器响应:", data);

      return { success: true, data };
    } catch (err) {
      console.error("注册过程中发生错误:", err);
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
