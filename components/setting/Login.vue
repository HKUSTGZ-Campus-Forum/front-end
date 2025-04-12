<template>
    <HomeContainer>
      <div class="login-container">
        <h1 class="page-title">登录</h1>
        
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">用户名或邮箱</label>
            <input 
              id="username"
              v-model="username"
              type="text"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="password">密码</label>
            <div class="password-field">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
                required
              />
              <button 
                type="button" 
                class="toggle-password" 
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          
          <div class="form-options">
            <label>
              <input type="checkbox" v-model="rememberMe" />
              记住我
            </label>
            <NuxtLink to="/forgot-password" class="forgot-password">
              忘记密码?
            </NuxtLink>
          </div>
          
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          
          <button 
            type="submit" 
            class="login-button" 
            :disabled="isLoading"
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </form>
        
        <div class="register-link">
          还没有账号? 
          <NuxtLink to="/register">立即注册</NuxtLink>
        </div>
      </div>
    </HomeContainer>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  // 状态变量
  const username = ref('');
  const password = ref('');
  const showPassword = ref(false);
  const rememberMe = ref(false);
  const errorMessage = ref('');
  const isLoading = ref(false);
  
  const router = useRouter();
  
  // 登录处理函数
  async function handleLogin() {
    if (!username.value || !password.value) {
      errorMessage.value = '请输入用户名和密码';
      return;
    }
    
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      // 在实际项目中替换为真实API调用
      // const response = await fetch('/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     username: username.value,
      //     password: password.value,
      //     remember_me: rememberMe.value
      //   })
      // });
      
      // const data = await response.json();
      // if (!response.ok) {
      //   throw new Error(data.message || '登录失败');
      // }
      
      // 模拟登录成功
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 存储用户信息和token
      const mockUserData = {
        id: 1,
        username: username.value,
        name: '测试用户',
        token: 'mock-jwt-token'
      };
      
      // 保存到localStorage或者使用auth模块
      localStorage.setItem('user', JSON.stringify(mockUserData));
      localStorage.setItem('token', mockUserData.token);
      
      // 登录成功后重定向
      router.push('/forum');
      
    } catch (error) {
      console.error('登录出错:', error);
      errorMessage.value = error.message || '用户名或密码错误，请重试';
    } finally {
      isLoading.value = false;
    }
  }
  </script>
  
  <style lang="scss" scoped>
  .login-container {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .page-title {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    input {
      padding: 0.75rem 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.3s;
      
      &:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
      }
    }
  }
  
  .password-field {
    position: relative;
    
    input {
      width: 100%;
      padding-right: 70px;
    }
    
    .toggle-password {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 0.8rem;
      
      &:hover {
        color: #333;
      }
    }
  }
  
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    
    .forgot-password {
      color: #3498db;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
  
  .error-message {
    background-color: #ffecec;
    color: #e74c3c;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .login-button {
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    background-color: #3498db;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s;
    
    &:hover:not(:disabled) {
      background-color: #2980b9;
    }
    
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
  
  .register-link {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.9rem;
    
    a {
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
  </style>