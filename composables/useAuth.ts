// composables/useAuth.ts
import { ref, computed, onMounted } from "vue";

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

  const isLoggedIn = computed(() => !!user.value && !!accessToken.value);

  // 内部 fetch 函数，不依赖 useApi
  async function authFetch(url: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // 如果有 token，添加到 headers
    if (accessToken.value) {
      headers['Authorization'] = `Bearer ${accessToken.value}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }

  function safeLocalStorage(
    action: "get" | "set" | "remove",
    key: string,
    value?: string
  ): string | null {
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

  // 获取用户资料
  async function fetchUserProfile(authToken: string) {
    if (!process.client) return;
    loading.value = true;

    try {
      // 解析令牌获取用户ID
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

      const response = await authFetch(
        `https://dev.unikorn.axfff.com/api/users/${userId}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取用户资料失败(${response.status}):`, errorText);
        
        // If unauthorized, clear tokens and don't show error (silent fail)
        if (response.status === 401) {
          console.warn("Token expired or invalid, clearing auth state");
          logout();
          return;
        }
        
        error.value = `获取用户资料失败(${response.status})`;
        return;
      }

      const userData = await response.json();
      // console.log("获取用户资料成功:", userData);

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

      const response = await authFetch(
        `https://dev.unikorn.axfff.com/api/users/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `更新用户资料失败(${response.status})`;
        throw new Error(errorMessage);
      }

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
    console.log('🔄 Attempting token refresh...', {
      hasRefreshToken: !!refreshToken.value,
      isRefreshing: isRefreshing.value
    });
    
    if (!refreshToken.value || isRefreshing.value) {
      console.warn('❌ Cannot refresh: missing refresh token or already refreshing');
      return null;
    }
    
    isRefreshing.value = true;
    try {
      console.log('📤 Sending refresh request to:', "https://dev.unikorn.axfff.com/api/auth/refresh");
      const response = await fetch("https://dev.unikorn.axfff.com/api/auth/refresh", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${refreshToken.value}`
        }
      });

      console.log('📥 Refresh response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ Refresh failed:', response.status, errorText);
        throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Token refresh successful, new token received');
      accessToken.value = data.access_token;
      safeLocalStorage("set", "auth_token", data.access_token);
      return data.access_token;
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
      await logout();
      throw err;
    } finally {
      isRefreshing.value = false;
    }
  }

  // Login function
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
      console.log('🔑 Login response data:', {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        hasUser: !!data.user,
        dataKeys: Object.keys(data)
      });
      
      accessToken.value = data.access_token;
      refreshToken.value = data.refresh_token;
      user.value = data.user;

      console.log('💾 Storing tokens in localStorage...');
      safeLocalStorage("set", "auth_token", data.access_token);
      safeLocalStorage("set", "refresh_token", data.refresh_token);
      if (data.user) {
        safeLocalStorage("set", "user_info", JSON.stringify(data.user));
      }
      
      console.log('✅ Tokens stored. Current state:', {
        accessTokenSet: !!accessToken.value,
        refreshTokenSet: !!refreshToken.value,
        userSet: !!user.value
      });

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

  // Logout function
  async function logout() {
    console.log('🚪 Logging out user...');
    loading.value = true;
    error.value = null;

    try {
      if (accessToken.value) {
        console.log('📤 Sending logout request to server...');
        await authFetch("https://dev.unikorn.axfff.com/api/auth/logout", {
          method: "POST",
        }).catch(console.error);
      }

      console.log('🧹 Clearing auth state and localStorage...');
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;

      safeLocalStorage("remove", "auth_token");
      safeLocalStorage("remove", "refresh_token");
      safeLocalStorage("remove", "user_info");

      console.log('✅ Logout complete, redirecting to home');
      navigateTo("/");
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Logout failed";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Register function
  async function register(username: string, email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      console.log("开始注册请求，发送数据:", { username, email });

      const response = await fetch("https://dev.unikorn.axfff.com/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      console.log("收到响应状态:", response.status);

      if (!response.ok) {
        let errorMessage = "注册失败";
        try {
          const errorData = await response.json();
          console.error("服务器错误详情:", errorData);
          errorMessage =
            errorData.message ||
            errorData.error ||
            `服务器错误(${response.status})`;
        } catch (parseError) {
          const errorText = await response.text();
          console.error("服务器返回非JSON错误:", errorText);
          errorMessage = `服务器错误(${response.status}): ${errorText.substring(0, 100)}`;
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

  onMounted(() => {
    init();
  });

  return {
    user,
    token: accessToken,
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
    // 导出内部 fetch 函数供其他地方使用
    authFetch,
  };
}