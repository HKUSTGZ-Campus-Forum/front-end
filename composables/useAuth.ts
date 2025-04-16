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

  // 新增: 初始化函数，检查本地存储的令牌
  function init() {
    // 修改这一行，检查可能的两种token键名
    const storedToken =
      safeLocalStorage("get", "auth_token") ||
      safeLocalStorage("get", "access_token");

    if (storedToken) {
      // console.log("发现存储的认证令牌");
      token.value = storedToken;

      // 从令牌中解析基本用户信息或发送请求获取完整用户信息
      // 方案1: 如果你的令牌是JWT，可以解析其中的用户信息
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

      // 方案2: 调用API获取用户信息
      fetchUserProfile(storedToken);
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
        return;
      }

      // 创建请求头，确保令牌不被修改
      const headers: Record<string, string> = {};
      // console.log("请求头:", headers);
      // 方式1: 标准格式 (最常见)
      headers["Authorization"] = `Bearer ${authToken}`;

      console.log("请求详情:", {
        URL: `https://dev.unikorn.axfff.com/api/users/${userId}`,
        令牌前缀: authToken.substring(0, 10) + "...",
        令牌长度: authToken.length,
      });

      // 使用原始令牌，不做任何处理
      const response = await fetch(
        `https://dev.unikorn.axfff.com/api/users/${userId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // 其余逻辑保持不变...
    } catch (err) {
      console.error("获取用户资料异常:", err);
    }
  }

  // 更新用户资料 - 添加到useAuth中
  async function updateUserProfile(userData: Partial<User>) {
    if (!process.client || !token.value || !user.value) return null;

    loading.value = true;
    error.value = null;

    try {
      const userId = user.value.id;

      const response = await fetch(
        `https://dev.unikorn.axfff.com/api/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.value}`,
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

  // 初始化调用
  onMounted(() => {
    init();
  });

  // 登录函数
  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      console.log("开始登录请求，发送数据:", { username });

      // 调用API进行登录
      const response = await fetch(
        "https://dev.unikorn.axfff.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

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

      // 在login函数中的相关部分
      const data = await response.json();
      // console.log("登录成功，服务器响应:", data);

      // 直接使用原始令牌，不做任何修改
      const accessToken = data.access_token || data.token || "";
      // 不使用trim()或其他操作
      token.value = accessToken;
      user.value = data.user;

      // 存储用户信息以备使用
      if (data.user) {
        safeLocalStorage("set", "user_info", JSON.stringify(data.user));
      }

      // console.log("令牌格式检查:", {
      //   令牌长度: accessToken.length,
      //   部分数量: accessToken.split(".").length,
      //   首部分长度: accessToken.split(".")[0]?.length,
      // });

      // 存储令牌 - 完全原样，不做任何处理
      safeLocalStorage("set", "auth_token", accessToken);

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
      safeLocalStorage("remove", "auth_token");
      safeLocalStorage("remove", "access_token");

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
    init,
    updateUserProfile,
  };
}
