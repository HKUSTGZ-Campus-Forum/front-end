// composables/useAuth.ts
import { ref, computed } from 'vue';

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('登录失败');
      }
      
      const data = await response.json();
      token.value = data.token;
      user.value = data.user;
      
      // 存储令牌
      localStorage.setItem('auth_token', data.token);
      
      // 首次登录后重定向
      if (user.value?.isFirstLogin) {
        navigateTo('/setting/background');
      } else {
        navigateTo('/dashboard');
      }
      
      return user.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  // 其他认证相关函数...
  
  return {
    user,
    token,
    loading,
    error,
    isLoggedIn,
    login,
    // 其他导出...
  };
}