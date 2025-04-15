import { ref, computed, onMounted } from "vue";
import { navigateTo } from "nuxt/app";
import { useNuxtApp } from "#app";

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
  const nuxtApp = useNuxtApp();

  // 安全访问localStorage的辅助函数
  function safeLocalStorage(action: 'get' | 'set' | 'remove', key: string, value?: string): string | null {
    // 检查是否在客户端环境
    if (process.client) {
      if (action === 'get') {
        return localStorage.getItem(key);
      } else if (action === 'set' && value !== undefined) {
        localStorage.setItem(key, value);
        return value;
      } else if (action === 'remove') {
        localStorage.removeItem(key);
      }
    }
    return null;
  }

  // 初始化函数
  function init() {
    if (!process.client) return; // 仅在客户端执行
    
    const storedToken = safeLocalStorage('get', "auth_token");
    if (storedToken) {
      console.log("发现存储的认证令牌");
      token.value = storedToken;

      try {
        const tokenParts = storedToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          user.value = {
            id: payload.sub || payload.id,
            username: payload.username || "",
            isFirstLogin: false,
          };
        }
      } catch (e) {
        console.error("解析令牌失败", e);
      }

      // 仅在客户端才获取用户资料
      fetchUserProfile(storedToken);
    }
  }

  // 获取用户资料
  async function fetchUserProfile(authToken: string) {
    if (!process.client) return; // 仅在客户端执行
    
    try {
      const response = await fetch(
        "https://dev.unikorn.axfff.com/api/auth/profile",
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        user.value = userData;
      } else {
        safeLocalStorage('remove', "auth_token");
        token.value = null;
      }
    } catch (err) {
      console.error("获取用户资料失败", err);
    }
  }

  // 登录函数
  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      console.log("开始登录请求，发送数据:", { username });

      const response = await fetch(
        "https://dev.unikorn.axfff.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!response.ok) {
        let errorMessage = "登录失败";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 
                         errorData.msg || `登录失败(${response.status})`;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = `登录失败(${response.status}): ${errorText.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      token.value = data.token;
      user.value = data.user;

      // 安全存储令牌
      if (process.client) {
        safeLocalStorage('set', "auth_token", data.token);
      }

      if (user.value?.isFirstLogin) {
        return navigateTo("/setting/background");
      } else {
        return navigateTo("/dashboard");
      }
    } catch (err) {
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
      user.value = null;
      token.value = null;

      if (process.client) {
        safeLocalStorage('remove', "auth_token");
      }
      
      return navigateTo("/");
    } catch (err) {
      error.value = err instanceof Error ? err.message : "登出失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(username: string, email: string, password: string) {
    // 保持原有实现，只需确保不访问客户端专用API
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch("https://dev.unikorn.axfff.com/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        let errorMessage = "注册失败";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 
                         `服务器错误(${response.status})`;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = `服务器错误(${response.status}): ${errorText.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      error.value = err instanceof Error ? err.message : "注册失败，请稍后再试";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // 仅在客户端初始化
  if (process.client) {
    nuxtApp.hook('app:mounted', () => {
      init();
    });
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
    init,
  };
}