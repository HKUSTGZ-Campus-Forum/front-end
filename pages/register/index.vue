<template>
    <HomeContainer>
      <div class="register-page-container">
        <h1 class="page-title">用户注册</h1>
        
        <!-- 使用注册组件 -->
        <RegisterComponent @register-success="handleRegisterSuccess" />
        
        <div class="login-link">
          已有账号? 
          <NuxtLink to="/login">立即登录</NuxtLink>
        </div>
      </div>
    </HomeContainer>
  </template>
  
  <script setup>
  import { useRouter, useRoute } from 'vue-router';
  import RegisterComponent from '~/components/setting/Register.vue';
  
  const router = useRouter();
  const route = useRoute();
  
  // 处理注册成功
  const handleRegisterSuccess = () => {
    // 注册成功后延迟跳转到登录页，保持redirect参数
    setTimeout(() => {
      const redirectParam = route.query.redirect ? `&redirect=${encodeURIComponent(route.query.redirect)}` : '';
      router.push(`/login?registered=true${redirectParam}`);
    }, 1500);
  };
  </script>
  
  <style lang="scss" scoped>
  .register-page-container {
    max-width: 550px;
    margin: 1rem auto;
    padding: 1rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    @media (min-width: 480px) {
      margin: 1.5rem auto;
      padding: 1.5rem;
    }

    @media (min-width: 768px) {
      margin: 2rem auto;
      padding: 2rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
  }
  
  .page-title {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #333;
    font-size: 1.5rem;
    font-weight: 600;

    @media (min-width: 480px) {
      font-size: 1.65rem;
    }

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
  
  .login-link {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.95rem;

    @media (max-width: 479px) {
      font-size: 1rem;
    }
    
    a {
      color: var(--color-blue-7, #9fc3e7);
      font-weight: 500;
      text-decoration: none;
      padding: 0.5rem;
      border-radius: 4px;
      display: inline-block;
      min-height: 44px; // Touch-friendly minimum size
      line-height: 1.2;

      @media (min-width: 480px) {
        padding: 0.25rem;
        min-height: auto;
      }
      
      &:hover {
        text-decoration: underline;
        background-color: rgba(159, 195, 231, 0.1);
      }

      &:active {
        background-color: rgba(159, 195, 231, 0.2);
      }
    }
  }
  </style>