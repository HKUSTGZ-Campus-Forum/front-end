// composables/useAuth.ts
import { ref, computed } from "vue";
import { selectApiBaseUrl } from "../utils/apiBaseUrl";
import type { User } from "~/types/user";

/**
 * 全应用共享一份认证状态。
 * 若每次 useAuth() 都 new 一套 ref，则个人页 logout 清空的是实例 A，顶栏仍读实例 B，导致 UI 不同步。
 */
const user = ref<User | null>(null);
const accessToken = ref<string | null>(null);
const refreshToken = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const isRefreshing = ref(false);
const authInitialized = ref(false);
let refreshPromise: Promise<string | null> | null = null;

const isLoggedIn = computed(() => !!user.value && !!accessToken.value);

function resolveAuthApiUrl(path: string): string {
  const apiBaseUrl = selectApiBaseUrl(useRuntimeConfig(), import.meta.client);
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.client) {
    if (typeof window !== "undefined" && apiBaseUrl) {
      try {
        const base = new URL(String(apiBaseUrl));
        if (base.origin !== window.location.origin) {
          return `${apiBaseUrl}${clean}`;
        }
      } catch {
        /* ignore malformed base url */
      }
    }
    return clean;
  }
  return apiBaseUrl ? `${apiBaseUrl}${clean}` : clean;
}

async function authFetch(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken.value) {
    headers.Authorization = `Bearer ${accessToken.value}`;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

function applyAuthPayload(data: {
  access_token: string;
  refresh_token: string;
  user: User;
}) {
  accessToken.value = data.access_token;
  refreshToken.value = data.refresh_token;
  user.value = data.user;

  safeLocalStorage("set", "auth_token", data.access_token);
  safeLocalStorage("set", "refresh_token", data.refresh_token);
  if (data.user) {
    safeLocalStorage("set", "user_info", JSON.stringify(data.user));
  }
}

function safeLocalStorage(
  action: "get" | "set" | "remove",
  key: string,
  value?: string
): string | null {
  if (!process.client) return null;

  try {
    if (action === "get") {
      return localStorage.getItem(key);
    } else if (action === "set" && value !== undefined) {
      localStorage.setItem(key, value);
      return value;
    } else if (action === "remove") {
      localStorage.removeItem(key);
    }
  } catch (storageError) {
    console.warn(`Unable to ${action} browser authentication storage`, storageError);
  }
  return null;
}

async function fetchUserProfile(authToken: string) {
  if (!process.client) return;
  loading.value = true;

  try {
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

      if (response.status === 401) {
        console.warn("User profile fetch got 401, token may be expired");
        return;
      }

      error.value = `获取用户资料失败(${response.status})`;
      return;
    }

    const userData = await response.json();

    user.value = {
      id: userData.id || userId,
      username: userData.username || user.value?.username || "",
      ...userData,
    };
  } catch (err) {
    console.error("获取用户资料异常:", err);
    error.value = err instanceof Error ? err.message : "获取用户资料失败";
  } finally {
    loading.value = false;
  }
}

async function logout() {
  console.log("🚪 Logging out user...");
  loading.value = true;
  error.value = null;

  try {
    let oidcLogoutUrl: string | null = null;
    if (accessToken.value) {
      console.log("📤 Sending logout request to server...");
      const response = await authFetch(resolveAuthApiUrl("/api/auth/logout"), {
        method: "POST",
      }).catch((logoutError) => {
        console.error(logoutError);
        return null;
      });
      if (response?.ok) {
        const payload = await response.json().catch(() => ({}));
        oidcLogoutUrl =
          typeof payload.oidc_logout_url === "string"
            ? payload.oidc_logout_url
            : null;
      }
    }

    console.log("🧹 Clearing auth state and localStorage...");
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;

    safeLocalStorage("remove", "auth_token");
    safeLocalStorage("remove", "refresh_token");
    safeLocalStorage("remove", "user_info");

    console.log("✅ Logout complete, redirecting to home");
    if (oidcLogoutUrl && typeof window !== "undefined") {
      window.location.assign(oidcLogoutUrl);
      return true;
    }
    const isEnglishRoute =
      typeof window !== "undefined" && window.location.pathname.startsWith("/en");
    navigateTo(isEnglishRoute ? "/en" : "/");
    return true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Logout failed";
    throw err;
  } finally {
    loading.value = false;
  }
}

async function refreshAccessToken() {
  console.log("🔄 Attempting token refresh...", {
    hasRefreshToken: !!refreshToken.value,
    isRefreshing: isRefreshing.value,
    hasExistingPromise: !!refreshPromise,
  });

  if (!refreshToken.value) {
    console.warn("❌ Cannot refresh: missing refresh token");
    return null;
  }

  if (refreshPromise) {
    console.log("🔄 Token refresh already in progress, waiting...");
    return refreshPromise;
  }

  isRefreshing.value = true;
  refreshPromise = (async () => {
    try {
      console.log(
        "📤 Sending refresh request to:",
        resolveAuthApiUrl("/api/auth/refresh")
      );
      const response = await fetch(resolveAuthApiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken.value}`,
        },
      });

      console.log("📥 Refresh response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("❌ Refresh failed:", response.status, errorText);
        throw new Error(
          `Failed to refresh token: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      console.log("✅ Token refresh successful, new token received");
      accessToken.value = data.access_token;
      safeLocalStorage("set", "auth_token", data.access_token);

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
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function init() {
  if (!process.client || authInitialized.value) return;

  try {
    const storedAccessToken = safeLocalStorage("get", "auth_token");
    const storedRefreshToken = safeLocalStorage("get", "refresh_token");
    const storedUserInfo = safeLocalStorage("get", "user_info");

    if (storedAccessToken && storedRefreshToken) {
      accessToken.value = storedAccessToken;
      refreshToken.value = storedRefreshToken;

      if (storedUserInfo) {
        try {
          const savedUser = JSON.parse(storedUserInfo);
          user.value = savedUser;
          console.log("👤 Restored user from localStorage:", savedUser.username);
        } catch (e) {
          console.error("Failed to parse stored user info:", e);
        }
      }

      if (!user.value) {
        try {
          const tokenParts = storedAccessToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            user.value = {
              id: payload.sub || payload.id,
              username: payload.username || "",
            };
            console.log("🔑 Parsed user from token:", user.value.username);
          }
        } catch (e) {
          console.error("Failed to parse token:", e);
        }
      }

      try {
        const tokenParts = storedAccessToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);

          if (payload.exp - currentTime < 300) {
            console.log("🔄 Token expires soon, refreshing...");
            refreshAccessToken().catch(console.error);
          }
        }
      } catch (e) {
        console.error("Failed to check token expiry:", e);
      }

      fetchUserProfile(storedAccessToken);
    }
  } finally {
    authInitialized.value = true;
  }
}

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
        errorData.message || errorData.msg || `更新用户资料失败(${response.status})`;
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

async function getOidcStatus(): Promise<{ enabled: boolean; provider: string }> {
  const response = await fetch(resolveAuthApiUrl("/api/auth/oidc/status"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Unable to load SSO status (${response.status})`);
  }
  return response.json();
}

function getOidcLoginUrl(returnTo: string, locale: string): string {
  const endpoint = resolveAuthApiUrl("/api/auth/oidc/login");
  const query = new URLSearchParams({
    return_to: returnTo,
    locale: locale === "en" ? "en" : "zh",
  });
  return `${endpoint}?${query.toString()}`;
}

async function exchangeOidcCode(code: string) {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(resolveAuthApiUrl("/api/auth/oidc/exchange"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.code || "invalid_login_ticket");
    }
    applyAuthPayload(payload);
    return payload as {
      user: User;
      return_to: string;
    };
  } catch (err) {
    error.value = err instanceof Error ? err.message : "SSO login failed";
    throw err;
  } finally {
    loading.value = false;
  }
}

async function completeOnboarding(username: string): Promise<User> {
  if (!process.client || !accessToken.value || !user.value) {
    throw new Error("authentication_required");
  }

  loading.value = true;
  error.value = null;
  try {
    const response = await authFetch(
      resolveAuthApiUrl("/api/users/me/onboarding"),
      {
        method: "POST",
        body: JSON.stringify({ username }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.code || "save_failed");
    }

    const updatedUser = payload.user as User;
    user.value = { ...user.value, ...updatedUser };
    safeLocalStorage("set", "user_info", JSON.stringify(user.value));
    return user.value as User;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "save_failed";
    throw err;
  } finally {
    loading.value = false;
  }
}

async function verifyEmail(userId: number, verificationCode: string) {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(resolveAuthApiUrl("/api/auth/verify-email"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        verification_code: verificationCode,
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

async function resendVerification(userId: number) {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(
      resolveAuthApiUrl("/api/auth/resend-verification"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
        }),
      }
    );

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

async function refreshUser() {
  if (!process.client || !accessToken.value || !user.value) return;

  console.log("🔄 Refreshing user data...");
  await fetchUserProfile(accessToken.value);

  if (user.value) {
    safeLocalStorage("set", "user_info", JSON.stringify(user.value));
  }
}

async function forceRefreshUserProfile() {
  if (!process.client || !accessToken.value) return;
  console.log("🔄 强制刷新用户资料...");
  await fetchUserProfile(accessToken.value);
}

function updateLocalUserData(updates: Partial<User>) {
  if (!user.value) return;

  user.value = { ...user.value, ...updates };

  if (process.client) {
    safeLocalStorage("set", "user_info", JSON.stringify(user.value));
  }

  console.log("👤 本地用户数据已更新:", updates);
}

export function useAuth() {
  return {
    user,
    token: accessToken,
    accessToken,
    refreshToken,
    loading,
    error,
    isLoggedIn,
    authInitialized,
    getOidcStatus,
    getOidcLoginUrl,
    exchangeOidcCode,
    completeOnboarding,
    logout,
    verifyEmail,
    resendVerification,
    refreshUser,
    init,
    updateUserProfile,
    refreshAccessToken,
    forceRefreshUserProfile,
    updateLocalUserData,
    authFetch,
  };
}
