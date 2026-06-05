import { useAuth } from "~/composables/useAuth";

export default defineNuxtRouteMiddleware((to) => {
  const { init, isLoggedIn, user } = useAuth();

  if (import.meta.server) {
    return;
  }

  if (!user.value) {
    init();
  }

  if (!isLoggedIn.value) {
    const loginPath = to.path.startsWith("/en") ? "/en/login" : "/login";
    return navigateTo({
      path: loginPath,
      query: { redirect: to.fullPath },
    });
  }

  if (user.value?.role_name !== "admin") {
    return navigateTo(to.path.startsWith("/en") ? "/en" : "/");
  }
});
