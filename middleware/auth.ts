import { useAuth } from '~/composables/useAuth';

export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useAuth();
  
  // 如果用户未登录且要访问受保护的页面，则重定向到登录页
  if (!isLoggedIn.value && to.meta.requiresAuth) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    });
  }
});