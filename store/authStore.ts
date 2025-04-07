import { defineStore } from 'pinia';

interface User {
  id: string;
  username: string;
  isFirstLogin: boolean;
  // 其他用户信息...
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    loading: false,
    error: null as string | null
  }),
  
  actions: {
    async login(username: string, password: string) {
      this.loading = true;
      this.error = null;
      
      try {
        // 调用API进行登录验证
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
          throw new Error('登录失败');
        }
        
        const data = await response.json();
        this.token = data.token;
        this.user = data.user;
        
        // 存储token到localStorage
        localStorage.setItem('auth_token', data.token);
        
        // 首次登录后重定向
        if (this.user?.isFirstLogin) {
          navigateTo('/setting/background');
        } else {
          navigateTo('/dashboard');
        }
        
        return this.user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '未知错误';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('auth_token');
      navigateTo('/login');
    }
  }
});