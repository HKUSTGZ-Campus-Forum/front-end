// composables/useAuth.ts
import { ref, computed, onMounted } from "vue";

interface User {
  id: string;
  username: string;
  isFirstLogin: boolean;
  profile_picture_url?: string;
  // 其他用户信息
}

export function useAuth() {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isRefreshing = ref(false);
  
  // Global promise to prevent race conditions
  let refreshPromise: Promise<string | null> | null = null;
  
  // Get API base URL from runtime config
  const config = useRuntimeConfig();
  const apiBaseUrl = config.public.apiBaseUrl;

  /** 与 useApi.getApiUrl 一致：浏览器用相对路径，避免 localhost / 127.0.0.1 混用触发 CORS */
  function resolveAuthApiUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const clean = path.startsWith("/") ? path : `/${path}`;
    if (import.meta.client) return clean;
    const base = String(apiBaseUrl || "").replace(/\/$/, "");
    return base ? `${base}${clean}` : clean;
  }

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
    const storedUserInfo = safeLocalStorage("get", "user_info");

    if (storedAccessToken && storedRefreshToken) {
      accessToken.value = storedAccessToken;
      refreshToken.value = storedRefreshToken;

      // First try to restore from saved user info
      if (storedUserInfo) {
        try {
          const savedUser = JSON.parse(storedUserInfo);
          user.value = savedUser;
          console.log('👤 Restored user from localStorage:', savedUser.username);
        } catch (e) {
          console.error("Failed to parse stored user info:", e);
        }
      }

      // If no saved user info, parse basic info from access token
      if (!user.value) {
        try {
          const tokenParts = storedAccessToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            user.value = {
              id: payload.sub || payload.id,
              username: payload.username || "",
              isFirstLogin: false,
            };
            console.log('🔑 Parsed user from token:', user.value.username);
          }
        } catch (e) {
          console.error("Failed to parse token:", e);
        }
      }

      // Validate token and fetch fresh user profile if needed
      try {
        const tokenParts = storedAccessToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          // If token expires within 5 minutes, refresh it
          if (payload.exp - currentTime < 300) {
            console.log('🔄 Token expires soon, refreshing...');
            refreshAccessToken().catch(console.error);
          }
        }
      } catch (e) {
        console.error("Failed to check token expiry:", e);
      }

      // Fetch full user profile to ensure data is fresh
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
        resolveAuthApiUrl(`/api/users/${userId}`)
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取用户资料失败(${response.status}):`, errorText);
        
        // If unauthorized, don't immediately logout - let useApi handle token refresh
        if (response.status === 401) {
          console.warn("User profile fetch got 401, token may be expired");
          // Don't logout here - this might be normal token expiry
          // The useApi layer will handle token refresh if needed
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
        resolveAuthApiUrl(`/api/users/${userId}`),
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
      isRefreshing: isRefreshing.value,
      hasExistingPromise: !!refreshPromise
    });
    
    if (!refreshToken.value) {
      console.warn('❌ Cannot refresh: missing refresh token');
      return null;
    }

    // If already refreshing, return existing promise
    if (refreshPromise) {
      console.log('🔄 Token refresh already in progress, waiting...');
      return refreshPromise;
    }
    
    isRefreshing.value = true;
    refreshPromise = (async () => {
      try {
        console.log('📤 Sending refresh request to:', resolveAuthApiUrl('/api/auth/refresh'));
        const response = await fetch(resolveAuthApiUrl('/api/auth/refresh'), {
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
        
        // Update refresh token if provided
        if (data.refresh_token) {
          refreshToken.value = data.refresh_token;
          safeLocalStorage("set", "refresh_token", data.refresh_token);
        }
        
        return data.access_token;
      } catch (err) {
        console.error("❌ Token refresh failed:", err);
        await logout();
        throw err;
      } finally {
        isRefreshing.value = false;
        refreshPromise = null; // Clear the promise
      }
    })();
    
    return refreshPromise;
  }

  // Login function
  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(resolveAuthApiUrl('/api/auth/login'), {
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

      // Don't auto-redirect here - let the calling page handle redirects
      // This allows for proper "return to previous page" functionality

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
        await authFetch(resolveAuthApiUrl('/api/auth/logout'), {
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

  // Register function with email verification
  async function register(username: string, email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      console.log("开始注册请求，发送数据:", { username, email: email || undefined });

      const response = await fetch(resolveAuthApiUrl('/api/auth/register'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          password,
          email // Email is required for verification
        }),
      });

      console.log("收到响应状态:", response.status);

      if (!response.ok) {
        let errorMessage = "注册失败";
        try {
          const errorData = await response.json();
          console.error("服务器错误详情:", errorData);
          
          // Handle specific error messages
          if (errorData.msg === "Username already exists") {
            errorMessage = "该用户名已被使用，请选择其他用户名";
          } else if (errorData.msg === "Email already registered") {
            errorMessage = "该邮箱已被注册，请使用其他邮箱";
          } else if (errorData.msg === "Username is required") {
            errorMessage = "请输入用户名";
          } else if (errorData.msg === "Password is required") {
            errorMessage = "请输入密码";
          } else if (errorData.msg === "Invalid email format") {
            errorMessage = "邮箱格式不正确";
          } else if (errorData.msg && errorData.msg.includes("email")) {
            errorMessage = errorData.msg;
          } else {
            errorMessage = errorData.msg || errorData.error || `服务器错误(${response.status})`;
          }
        } catch (parseError) {
          const errorText = await response.text();
          console.error("服务器返回非JSON错误:", errorText);
          errorMessage = `服务器错误(${response.status}): ${errorText.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("注册成功，服务器响应:", data);

      // Return registration data including user_id for email verification
      return { 
        success: true, 
        data,
        userId: data.user_id,
        emailSent: data.email_sent,
        emailError: data.email_error
      };
    } catch (err) {
      console.error("注册过程中发生错误:", err);
      error.value = err instanceof Error ? err.message : "注册失败，请稍后再试";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Email verification function
  async function verifyEmail(userId: number, verificationCode: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(resolveAuthApiUrl('/api/auth/verify-email'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          verification_code: verificationCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "邮箱验证失败");
      }

      return { success: true, message: data.msg };
    } catch (err) {
      console.error("邮箱验证错误:", err);
      error.value = err instanceof Error ? err.message : "邮箱验证失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Resend verification email
  async function resendVerification(userId: number) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(resolveAuthApiUrl('/api/auth/resend-verification'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "重发验证邮件失败");
      }

      return { success: true, message: data.msg };
    } catch (err) {
      console.error("重发验证邮件错误:", err);
      error.value = err instanceof Error ? err.message : "重发验证邮件失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Forgot password function
  async function forgotPassword(email: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(resolveAuthApiUrl('/api/auth/forgot-password'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "发送重置邮件失败");
      }

      return { success: true, message: data.msg };
    } catch (err) {
      console.error("忘记密码错误:", err);
      error.value = err instanceof Error ? err.message : "发送重置邮件失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Reset password function
  async function resetPassword(token: string, newPassword: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(resolveAuthApiUrl('/api/auth/reset-password'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "密码重置失败");
      }

      return { success: true, message: data.msg };
    } catch (err) {
      console.error("密码重置错误:", err);
      error.value = err instanceof Error ? err.message : "密码重置失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Change password function (for authenticated users)
  async function changePassword(currentPassword: string, newPassword: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await authFetch(resolveAuthApiUrl('/api/auth/change-password'), {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "密码修改失败");
      }

      return { success: true, message: data.msg };
    } catch (err) {
      console.error("密码修改错误:", err);
      error.value = err instanceof Error ? err.message : "密码修改失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Refresh user data from server
  async function refreshUser() {
    if (!process.client || !accessToken.value || !user.value) return;
    
    console.log('🔄 Refreshing user data...');
    await fetchUserProfile(accessToken.value);
    
    // Update localStorage with fresh data
    if (user.value) {
      safeLocalStorage("set", "user_info", JSON.stringify(user.value));
    }
  }

  // 强制刷新用户资料数据
  async function forceRefreshUserProfile() {
    if (!process.client || !accessToken.value) return;
    console.log('🔄 强制刷新用户资料...');
    await fetchUserProfile(accessToken.value);
  }

  // 更新本地用户数据（用于用户名修改等场景）
  function updateLocalUserData(updates: Partial<User>) {
    if (!user.value) return;
    
    // Update user data
    user.value = { ...user.value, ...updates };
    
    // Update localStorage
    if (process.client) {
      safeLocalStorage("set", "user_info", JSON.stringify(user.value));
    }
    
    console.log('👤 本地用户数据已更新:', updates);
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
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshUser,
    init,
    updateUserProfile,
    refreshAccessToken,
    forceRefreshUserProfile,
    updateLocalUserData,
    // 导出内部 fetch 函数供其他地方使用
    authFetch,
  };
}
