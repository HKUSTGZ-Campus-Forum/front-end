import { useAuth } from "~/composables/useAuth";
import {
  isLoginPath,
  isOnboardingPath,
  isOnboardingSupportPath,
  onboardingPathFor,
  safePostOnboardingReturnTo,
} from "~/utils/onboarding";

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const { init, isLoggedIn, user } = useAuth();
  if (!user.value) init();
  if (!isLoggedIn.value || !user.value) return;

  const fallback = to.path.startsWith("/en") ? "/en" : "/";
  const onOnboardingPage = isOnboardingPath(to.path);

  if (user.value.onboarding_required) {
    // Let the callback page exchange a fresh one-time SSO ticket before the
    // newly returned user state decides the next destination.
    if (isLoginPath(to.path) && typeof to.query.oidc_code === "string") return;
    if (isOnboardingSupportPath(to.path)) return;
    if (onOnboardingPage) return;

    return navigateTo({
      path: onboardingPathFor(to.path),
      query: {
        redirect: safePostOnboardingReturnTo(to.fullPath, fallback),
      },
    });
  }

  if (onOnboardingPage) {
    return navigateTo(
      safePostOnboardingReturnTo(to.query.redirect, fallback),
    );
  }
});
