// composables/useAuth.ts
import { ref, computed } from "vue";
import { useApi } from "./useApi";

interface User {
  id: string;
  username: string;
  isFirstLogin: boolean;
  // 其他用户信息
}

export function useAuth() {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isRefreshing = ref(false);
  const { fetchWithAuth } = useApi();

  const isLoggedIn = computed(() => !!user.value && !!accessToken.value);

  // Initialize function to check stored tokens
  function init() {
    if (!process.client) return;

    const storedAccessToken = safeLocalStorage("get", "auth_token");
    const storedRefreshToken = safeLocalStorage("get", "refresh_token");

    if (storedAccessToken && storedRefreshToken) {
      accessToken.value = storedAccessToken;
      refreshToken.value = storedRefreshToken;

      // Parse basic user info from access token
      try {
        const tokenParts = storedAccessToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          user.value = {
            id: payload.sub || payload.id,
            username: payload.username || "",
            isFirstLogin: false,
          };
        }
      } catch (e) {
        console.error("Failed to parse token:", e);
      }

      // Fetch full user profile
      fetchUserProfile(storedAccessToken);
    }
  }

  function safeLocalStorage(
    action: "get" | "set" | "remove",
    key: string,
    value?: string
  ): string | null {
    // 检查是否在客户端环境
    if (process.client) {
      if (action === "get") {
        return localStorage.getItem(key);
      } else if (action === "set" && value !== undefined) {
        localStorage.setItem(key, value);
        return value;
      } else if (action === "remove") {
        localStorage.removeItem(key);
      }
    }
    return null;
  }

  // 获取用户资料
  async function fetchUserProfile(authToken: string) {
    if (!process.client) return;
    loading.value = true;

    try {
      // 解析令牌获取用户ID (不修改令牌本身)
      let userId = null;
      try {
        const tokenParts = authToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub || payload.id || user.value?.id;
        }
      } catch (e) {
        console.error("解析令牌获取用户ID失败", e);
      }

      if (!userId) {
        console.error("无法获取用户ID，无法获取用户资料");
        loading.value = false;
        return;
      }

      const response = await fetchWithAuth(
        `https://dev.unikorn.axfff.com/api/users/${userId}`
      );

      // 处理响应
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取用户资料失败(${response.status}):`, errorText);
        error.value = `获取用户资料失败(${response.status})`;
        return;
      }

      // 解析并更新用户信息
      const userData = await response.json();
      console.log("获取用户资料成功:", userData);

      // 更新用户信息
      user.value = {
        id: userData.id || userId,
        username: userData.username || user.value?.username || "",
        isFirstLogin: userData.isFirstLogin || false,
        ...userData,
      };
    } catch (err) {
      console.error("获取用户资料异常:", err);
      error.value = err instanceof Error ? err.message : "获取用户资料失败";
    } finally {
      loading.value = false;
    }
  }

  // 更新用户资料
  async function updateUserProfile(userData: Partial<User>) {
    if (!process.client || !accessToken.value || !user.value) return null;

    loading.value = true;
    error.value = null;

    try {
      const userId = user.value.id;

      const response = await fetchWithAuth(
        `https://dev.unikorn.axfff.com/api/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `更新用户资料失败(${response.status})`;
        throw new Error(errorMessage);
      }

      // 获取更新后的用户数据
      const responseData = await response.json();
      const updatedUserData = responseData.user || responseData;
      user.value = { ...user.value, ...updatedUserData };

      return user.value;
    } catch (err) {
      console.error("更新用户资料失败:", err);
      error.value = err instanceof Error ? err.message : "更新用户资料失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Token refresh function
  async function refreshAccessToken() {
    if (!refreshToken.value || isRefreshing.value) return null;
    
    isRefreshing.value = true;
    try {
      const response = await fetch("https://dev.unikorn.axfff.com/api/auth/refresh", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${refreshToken.value}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      accessToken.value = data.access_token;
      safeLocalStorage("set", "auth_token", data.access_token);
      return data.access_token;
    } catch (err) {
      console.error("Token refresh failed:", err);
      // If refresh fails, logout the user
      await logout();
      throw err;
    } finally {
      isRefreshing.value = false;
    }
  }

  // Modified login function to store both tokens
  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch("https://dev.unikorn.axfff.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorData.msg || `Login failed (${response.status})`;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = `Login failed (${response.status}): ${errorText.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      accessToken.value = data.access_token;
      refreshToken.value = data.refresh_token;
      user.value = data.user;

      // Store both tokens and user info
      safeLocalStorage("set", "auth_token", data.access_token);
      safeLocalStorage("set", "refresh_token", data.refresh_token);
      if (data.user) {
        safeLocalStorage("set", "user_info", JSON.stringify(data.user));
      }

      if (user.value?.isFirstLogin) {
        navigateTo("/setting/background");
      } else {
        navigateTo("/");
      }

      return user.value;
    } catch (err) {
      console.error("Login error:", err);
      error.value = err instanceof Error ? err.message : "Login failed, please try again";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Modified logout function to use fetchWithAuth
  async function logout() {
    loading.value = true;
    error.value = null;

    try {
      if (accessToken.value) {
        // Call logout API to blacklist the token
        await fetchWithAuth("https://dev.unikorn.axfff.com/api/auth/logout", {
          method: "POST",
        }).catch(console.error); // Ignore logout API errors
      }

      // Clear state
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;

      // Remove tokens from storage
      safeLocalStorage("remove", "auth_token");
      safeLocalStorage("remove", "refresh_token");
      safeLocalStorage("remove", "user_info");

      navigateTo("/");
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Logout failed";
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

  // 初始化调用
  onMounted(() => {
    init();
  });

  return {
    user,
    token: accessToken, // Keep token for backward compatibility
    accessToken,
    refreshToken,
    loading,
    error,
    isLoggedIn,
    login,
    logout,
    register,
    init,
    updateUserProfile,
    refreshAccessToken,
  };
}
