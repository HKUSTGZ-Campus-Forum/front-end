<script setup>
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "~/composables/useAuth";
import { oidcErrorTranslationKey, safeOidcReturnTo } from "~/utils/oidc";

definePageMeta({ layout: "keguang-auth" });

const { login, getOidcStatus, getOidcLoginUrl, exchangeOidcCode } = useAuth();
const { t, locale } = useI18n();
const { getLocalePath } = useAppLocale();
const username = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const errorMessage = ref("");
const isLoading = ref(false);
const isOidcLoading = ref(false);
const isOidcStatusLoading = ref(true);
const isOidcEnabled = ref(false);

const router = useRouter();
const route = useRoute();

function oidcErrorCopy(code) {
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
    await router.replace(safeOidcReturnTo(result.return_to, getLocalePath("/")));
  } catch (error) {
    const code = error instanceof Error ? error.message : "authorization_failed";
    errorMessage.value = oidcErrorCopy(code);
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

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = t("auth.login.errors.required");
    return;
  }

  try {
    isLoading.value = true;
    errorMessage.value = "";
    const user = await login(username.value, password.value, rememberMe.value);
    if (user?.isFirstLogin) {
      router.push(getLocalePath("/setting/theme"));
    } else {
      const redirectPath =
        typeof route.query.redirect === "string"
          ? route.query.redirect
          : getLocalePath("/");
      router.push(redirectPath);
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("auth.login.errors.invalid");
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="kg-login-card">
    <h1 class="kg-login-title">{{ t("auth.login.title") }}</h1>
    <p class="kg-login-subtitle">{{ t("auth.login.subtitle") }}</p>

    <section class="kg-sso-section" :aria-busy="isOidcStatusLoading || isOidcLoading">
      <button
        type="button"
        class="kg-sso-btn"
        :disabled="isOidcStatusLoading || isOidcLoading || !isOidcEnabled"
        @click="startOidcLogin"
      >
        <span
          v-if="isOidcLoading"
          class="kg-sso-icon kg-sso-icon--loading"
          aria-hidden="true"
        />
        <svg
          v-else
          class="kg-sso-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10h18" />
          <path d="M5 10v8" />
          <path d="M9 10v8" />
          <path d="M15 10v8" />
          <path d="M19 10v8" />
          <path d="M3 18h18" />
          <path d="m12 3 9 5H3z" />
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
    </section>

    <div class="kg-login-divider" role="separator">
      <span>{{ t("auth.login.localAccountDivider") }}</span>
    </div>

    <form class="kg-form" @submit.prevent="handleLogin">
      <div class="kg-form-group">
        <label for="username">{{ t("auth.login.usernameLabel") }}</label>
        <input
          id="username"
          v-model="username"
          class="kg-input"
          type="text"
          :placeholder="t('auth.login.usernamePlaceholder')"
          autocomplete="username"
          :disabled="isLoading || isOidcLoading"
          required
        />
      </div>

      <div class="kg-form-group">
        <label for="password">{{ t("auth.login.passwordLabel") }}</label>
        <div class="kg-password-field">
          <input
            id="password"
            v-model="password"
            class="kg-input"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('auth.login.passwordPlaceholder')"
            autocomplete="current-password"
            :disabled="isLoading || isOidcLoading"
            required
          />
          <button
            type="button"
            class="kg-toggle-pwd"
            :aria-label="showPassword ? t('common.hide') : t('common.show')"
            :disabled="isLoading || isOidcLoading"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? t("common.hide") : t("common.show") }}
          </button>
        </div>
      </div>

      <div class="kg-form-options">
        <label class="kg-checkbox-label">
          <input type="checkbox" v-model="rememberMe" />
          {{ t("auth.login.rememberMe") }}
        </label>
        <NuxtLink :to="getLocalePath('/forgot-password')" class="kg-forgot-link">{{ t("auth.login.forgotPassword") }}</NuxtLink>
      </div>

      <div v-if="errorMessage" class="kg-error-msg" role="alert" aria-live="polite">
        <svg
          class="kg-error-icon"
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

      <button type="submit" class="kg-submit-btn" :disabled="isLoading || isOidcLoading">
        {{ isLoading ? t("auth.login.submitting") : t("auth.login.submit") }}
      </button>
    </form>

    <div class="kg-form-footer">
      {{ t("auth.login.noAccount") }}
      <NuxtLink :to="getLocalePath('/register')" class="kg-link">{{ t("auth.login.registerNow") }}</NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-login-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-large);
  padding: 40px 36px;
}

.kg-login-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 6px;
  text-align: center;
}

.kg-login-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 28px;
  text-align: center;
}

.kg-sso-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.kg-sso-btn {
  width: 100%;
  min-height: 48px;
  padding: 11px 16px;
  border: none;
  border-radius: 12px;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
  font: inherit;
  font-weight: 750;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
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

.kg-sso-icon {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
}

.kg-sso-icon--loading {
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: kg-spin 0.8s linear infinite;
}

.kg-sso-hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.5;
  text-align: center;
}

.kg-login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
  color: var(--text-secondary);
  font-size: 0.78rem;

  &::before,
  &::after {
    content: "";
    height: 1px;
    flex: 1;
    background: var(--border-secondary);
  }
}

.kg-form { display: flex; flex-direction: column; gap: 18px; }

.kg-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
}

.kg-input {
  padding: 11px 14px;
  border: 1.5px solid var(--border-primary);
  border-radius: 12px;
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 0.93rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
  &:focus {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 18%, transparent);
  }
  &:disabled { cursor: not-allowed; opacity: 0.68; }
  &::placeholder { color: var(--text-muted); }
}

.kg-password-field {
  position: relative;
  .kg-input { padding-right: 60px; }
}

.kg-toggle-pwd {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 4px;
  &:hover { color: var(--interactive-primary); }
  &:focus-visible { outline: 2px solid var(--interactive-primary); border-radius: 4px; }
}

.kg-form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kg-checkbox-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  input { accent-color: var(--interactive-primary); }
}

.kg-forgot-link {
  font-size: 0.875rem;
  color: var(--interactive-primary);
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.kg-error-msg {
  padding: 10px 14px;
  background: var(--error-background);
  border: 1px solid color-mix(in srgb, var(--error-color) 30%, transparent);
  border-radius: 10px;
  color: var(--error-color);
  font-size: 0.875rem;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  svg { flex: 0 0 auto; margin-top: 1px; }
}

.kg-error-icon {
  width: 18px;
  height: 18px;
}

.kg-submit-btn {
  width: 100%;
  padding: 12px;
  background: var(--surface-primary);
  color: var(--interactive-active-text);
  border: 1.5px solid var(--interactive-primary);
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-primary));
  }
  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 24%, transparent);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.kg-form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.kg-link {
  color: var(--interactive-primary);
  text-decoration: none;
  font-weight: 600;
  &:hover { text-decoration: underline; }
}

@keyframes kg-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 479px) {
  .kg-login-card {
    padding: 30px 22px;
  }

  .kg-form-options {
    gap: 12px;
  }

  .kg-checkbox-label,
  .kg-forgot-link {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kg-sso-btn,
  .kg-submit-btn {
    transition: none;
  }

  .kg-sso-btn:hover:not(:disabled) {
    transform: none;
  }

  .kg-sso-icon--loading {
    animation-duration: 1.6s;
  }
}
</style>
