<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "~/composables/useAuth";
import { oidcErrorTranslationKey, safeOidcReturnTo } from "~/utils/oidc";

definePageMeta({ layout: "keguang-auth" });

const { getOidcStatus, getOidcLoginUrl, exchangeOidcCode } = useAuth();
const { t, locale } = useI18n();
const { getLocalePath } = useAppLocale();
const router = useRouter();
const route = useRoute();

const errorMessage = ref("");
const isOidcLoading = ref(false);
const isOidcStatusLoading = ref(true);
const isOidcEnabled = ref(false);

useHead(() => ({
  title: `${t("auth.login.title")} - ${t("common.appName")}`,
  htmlAttrs: {
    lang: locale.value === "en" ? "en" : "zh-CN",
  },
}));

function oidcErrorCopy(code: string) {
  return t(oidcErrorTranslationKey(code));
}

async function loadOidcStatus() {
  isOidcStatusLoading.value = true;
  try {
    const status = await getOidcStatus();
    isOidcEnabled.value = Boolean(status.enabled);
  } catch {
    isOidcEnabled.value = false;
  } finally {
    isOidcStatusLoading.value = false;
  }
}

function startOidcLogin() {
  if (!isOidcEnabled.value || isOidcLoading.value) return;
  isOidcLoading.value = true;
  errorMessage.value = "";
  const returnTo = safeOidcReturnTo(route.query.redirect, getLocalePath("/"));
  window.location.assign(getOidcLoginUrl(returnTo, locale.value));
}

async function handleOidcCallback() {
  const callbackError =
    typeof route.query.oidc_error === "string"
      ? route.query.oidc_error
      : null;
  if (callbackError) {
    errorMessage.value = oidcErrorCopy(callbackError);
  }

  const code =
    typeof route.query.oidc_code === "string" ? route.query.oidc_code : null;
  if (!code) return;

  isOidcLoading.value = true;
  errorMessage.value = "";
  try {
    const result = await exchangeOidcCode(code);
    const returnTo = safeOidcReturnTo(result.return_to, getLocalePath("/"));
    if (result.user.onboarding_required) {
      await router.replace({
        path: getLocalePath("/onboarding"),
        query: { redirect: returnTo },
      });
    } else {
      await router.replace(returnTo);
    }
  } catch (error) {
    const errorCode =
      error instanceof Error ? error.message : "authorization_failed";
    errorMessage.value = oidcErrorCopy(errorCode);
    const nextQuery = { ...route.query };
    delete nextQuery.oidc_code;
    delete nextQuery.oidc_error;
    await router.replace({ path: route.path, query: nextQuery });
  } finally {
    isOidcLoading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadOidcStatus(), handleOidcCallback()]);
});
</script>

<template>
  <main class="kg-login-card" aria-labelledby="login-title">
    <div class="kg-login-emblem" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 10h18" />
        <path d="M5 10v8" />
        <path d="M9 10v8" />
        <path d="M15 10v8" />
        <path d="M19 10v8" />
        <path d="M3 18h18" />
        <path d="m12 3 9 5H3z" />
      </svg>
    </div>

    <h1 id="login-title" class="kg-login-title">
      {{ t("auth.login.title") }}
    </h1>
    <p class="kg-login-subtitle">{{ t("auth.login.subtitle") }}</p>

    <div
      v-if="errorMessage"
      class="kg-login-message kg-login-message--error"
      role="alert"
      aria-live="polite"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 17h.01" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <section
      class="kg-sso-section"
      :aria-busy="isOidcStatusLoading || isOidcLoading"
    >
      <button
        type="button"
        class="kg-sso-btn"
        :disabled="isOidcStatusLoading || isOidcLoading || !isOidcEnabled"
        @click="startOidcLogin"
      >
        <span
          v-if="isOidcStatusLoading || isOidcLoading"
          class="kg-sso-spinner"
          aria-hidden="true"
        />
        <svg
          v-else
          class="kg-sso-btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="m10 17 5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
        <span>
          {{
            isOidcLoading
              ? t("auth.login.sso.redirecting")
              : isOidcStatusLoading
                ? t("auth.login.sso.checking")
                : isOidcEnabled
                  ? t("auth.login.sso.submit")
                  : t("auth.login.sso.unavailable")
          }}
        </span>
      </button>

      <p class="kg-sso-hint">
        {{
          isOidcEnabled
            ? t("auth.login.sso.hint")
            : t("auth.login.sso.unavailableHint")
        }}
      </p>

      <button
        v-if="!isOidcStatusLoading && !isOidcEnabled"
        type="button"
        class="kg-sso-retry"
        @click="loadOidcStatus"
      >
        {{ t("auth.login.sso.retry") }}
      </button>
    </section>

  </main>
</template>

<style lang="scss" scoped>
.kg-login-card {
  width: min(100%, 440px);
  padding: 40px 36px 34px;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-large);
  color: var(--text-primary);
}

.kg-login-emblem {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 18px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
  color: var(--interactive-primary);

  svg {
    width: 27px;
    height: 27px;
  }
}

.kg-login-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
  text-wrap: balance;
}

.kg-login-subtitle {
  max-width: 38ch;
  margin: 8px auto 26px;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
  text-align: center;
  text-wrap: pretty;
}

.kg-login-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 18px;
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 0.875rem;
  line-height: 1.5;

  svg {
    width: 18px;
    height: 18px;
    margin-top: 1px;
    flex: 0 0 auto;
  }
}

.kg-login-message--error {
  background: var(--error-background);
  border: 1px solid color-mix(in srgb, var(--error-color) 30%, transparent);
  color: var(--error-color);
}

.kg-sso-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.kg-sso-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 50px;
  padding: 12px 18px;
  border: 0;
  border-radius: 12px;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
  cursor: pointer;
  font: inherit;
  font-size: 0.98rem;
  font-weight: 750;
  transition: background var(--transition-fast), transform var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--btn-primary-bg-hover);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 28%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
  }
}

.kg-sso-btn-icon,
.kg-sso-spinner {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
}

.kg-sso-spinner {
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: kg-spin 0.8s linear infinite;
}

.kg-sso-hint {
  max-width: 43ch;
  margin: 11px 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
  text-align: center;
  text-wrap: pretty;
}

.kg-sso-retry {
  min-height: 42px;
  margin-top: 8px;
  padding: 8px 14px;
  border: 0;
  background: transparent;
  color: var(--interactive-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 650;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--interactive-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

@keyframes kg-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 479px) {
  .kg-login-card {
    padding: 32px 22px 28px;
  }

  .kg-sso-btn {
    min-height: 52px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kg-sso-btn {
    transition: none;
  }

  .kg-sso-btn:hover:not(:disabled) {
    transform: none;
  }

  .kg-sso-spinner {
    animation-duration: 1.6s;
  }
}
</style>
