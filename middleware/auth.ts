import { useAuth } from '~/composables/useAuth';

export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useAuth();
  
  // 挂载了 auth 中间件的页面都应要求登录
  if (!isLoggedIn.value) {
    const loginPath = to.path.startsWith('/en') ? '/en/login' : '/login';
    return navigateTo({
      path: loginPath,
      query: { redirect: to.fullPath }
    });
  }
});
