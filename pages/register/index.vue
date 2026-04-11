<script setup>
import { useRouter, useRoute } from 'vue-router';
import RegisterComponent from '~/components/setting/Register.vue';

definePageMeta({ layout: 'keguang-auth' });

const router = useRouter();
const route = useRoute();

const handleRegisterSuccess = () => {
  setTimeout(() => {
    const redirectParam = route.query.redirect ? `&redirect=${encodeURIComponent(route.query.redirect)}` : '';
    router.push(`/login?registered=true${redirectParam}`);
  }, 1500);
};
</script>

<template>
  <div class="kg-register-card">
    <h1 class="kg-register-title">加入我们</h1>
    <p class="kg-register-subtitle">创建您的 UniKorn 科广汇账号</p>

    <RegisterComponent @register-success="handleRegisterSuccess" />

    <div class="kg-form-footer">
      已有账号？
      <NuxtLink to="/login" class="kg-link">立即登录</NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-register-card {
  width: 100%;
  max-width: 480px;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(40, 57, 101, 0.12);
  padding: 40px 36px;
}

.kg-register-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1a2a4a;
  margin: 0 0 6px;
  text-align: center;
}

.kg-register-subtitle {
  font-size: 0.9rem;
  color: #4a6080;
  margin: 0 0 32px;
  text-align: center;
}

.kg-form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 0.9rem;
  color: #4a6080;
}

.kg-link {
  color: #26a4ff;
  text-decoration: none;
  font-weight: 600;
  &:hover { text-decoration: underline; }
}
</style>
