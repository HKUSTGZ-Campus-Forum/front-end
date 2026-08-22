<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useCustomFileUpload } from "~/composables/useFileUpload";
import {
  onboardingErrorTranslationKey,
  safePostOnboardingReturnTo,
} from "~/utils/onboarding";

definePageMeta({
  layout: "keguang-auth",
  middleware: "auth",
});

const { t, locale } = useI18n();
const { getLocalePath } = useAppLocale();
const route = useRoute();
const router = useRouter();
const {
  user,
  completeOnboarding,
  updateUserProfile,
  logout,
} = useAuth();
const { uploadFile } = useCustomFileUpload();

const usernameInput = ref<HTMLInputElement | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const username = ref("");
const errorMessage = ref("");
const avatarMessage = ref("");
const isSaving = ref(false);
const isUploadingAvatar = ref(false);
const isLoggingOut = ref(false);

const normalizedUsername = computed(() => username.value.trim());
const usernameLength = computed(() => Array.from(normalizedUsername.value).length);
const usernameIsValid = computed(
  () => usernameLength.value >= 2 && usernameLength.value <= 50,
);
const maskedEmail = computed(() => {
  const email = user.value?.email || "";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, Math.min(6, local.length - visible.length)))}@${domain}`;
});
const submitDisabled = computed(
  () => !usernameIsValid.value || isSaving.value || isUploadingAvatar.value,
);

useHead(() => ({
  title: `${t("auth.onboarding.pageTitle")} - ${t("common.appName")}`,
  htmlAttrs: { lang: locale.value === "en" ? "en" : "zh-CN" },
}));

function showOnboardingError(value: unknown) {
  const code = value instanceof Error ? value.message : value;
  errorMessage.value = t(onboardingErrorTranslationKey(code));
}

function triggerAvatarInput() {
  if (!isUploadingAvatar.value) avatarInput.value?.click();
}

async function handleAvatarSelection(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";
  if (!file) return;

  avatarMessage.value = "";
  errorMessage.value = "";
  if (!/^image\/(?:jpeg|png)$/.test(file.type)) {
    errorMessage.value = t("auth.onboarding.errors.avatar_type");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = t("auth.onboarding.errors.avatar_size");
    return;
  }

  isUploadingAvatar.value = true;
  try {
    const entityId = Number(user.value?.id);
    if (!Number.isInteger(entityId) || entityId <= 0) {
      throw new Error("avatar_upload_failed");
    }
    const uploadResult = await uploadFile({
      file,
      fileType: "avatar",
      entityType: "user",
      entityId,
    });
    if (!uploadResult?.id) throw new Error("avatar_upload_failed");

    await updateUserProfile({ profile_picture_file_id: uploadResult.id });
    avatarMessage.value = t("auth.onboarding.avatarSuccess");
  } catch {
    errorMessage.value = t("auth.onboarding.errors.avatar_upload_failed");
  } finally {
    isUploadingAvatar.value = false;
  }
}

async function submitProfile() {
  errorMessage.value = "";
  if (!usernameIsValid.value) {
    errorMessage.value = t("auth.onboarding.errors.username_invalid");
    usernameInput.value?.focus();
    return;
  }

  isSaving.value = true;
  try {
    await completeOnboarding(normalizedUsername.value);
    const fallback = getLocalePath("/");
    await router.replace(
      safePostOnboardingReturnTo(route.query.redirect, fallback),
    );
  } catch (error) {
    showOnboardingError(error);
  } finally {
    isSaving.value = false;
  }
}

async function switchAccount() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await logout();
  } finally {
    isLoggingOut.value = false;
  }
}

onMounted(async () => {
  username.value = user.value?.username || "";
  await nextTick();
  usernameInput.value?.focus();
  usernameInput.value?.select();
});
</script>

<template>
  <main class="kg-onboarding" aria-labelledby="onboarding-title">
    <header class="kg-onboarding__header">
      <div class="kg-onboarding__step" :aria-label="t('auth.onboarding.stepAria')">
        <Icon name="lucide:circle-check" aria-hidden="true" />
        <span>{{ t("auth.onboarding.step") }}</span>
      </div>
      <h1 id="onboarding-title">{{ t("auth.onboarding.title") }}</h1>
      <p>{{ t("auth.onboarding.subtitle") }}</p>
    </header>

    <form class="kg-onboarding__form" @submit.prevent="submitProfile">
      <div
        v-if="errorMessage"
        id="onboarding-error"
        class="kg-onboarding__alert"
        role="alert"
        aria-live="assertive"
      >
        <Icon name="lucide:circle-alert" aria-hidden="true" />
        <span>{{ errorMessage }}</span>
      </div>

      <section class="kg-onboarding__avatar" aria-labelledby="avatar-title">
        <UserAvatar
          :avatar-url="user?.profile_picture_url"
          :username="normalizedUsername || user?.username"
          :user-id="user?.id"
          size="xl"
          :show-tooltip="false"
        />
        <div>
          <h2 id="avatar-title">{{ t("auth.onboarding.avatarTitle") }}</h2>
          <p>{{ t("auth.onboarding.avatarHint") }}</p>
          <input
            ref="avatarInput"
            class="kg-onboarding__file-input"
            type="file"
            tabindex="-1"
            aria-hidden="true"
            accept="image/jpeg,image/png"
            @change="handleAvatarSelection"
          />
          <button
            type="button"
            class="kg-onboarding__avatar-button"
            :disabled="isUploadingAvatar || isSaving"
            @click="triggerAvatarInput"
          >
            <span v-if="isUploadingAvatar" class="kg-onboarding__spinner" aria-hidden="true" />
            <Icon v-else name="lucide:camera" aria-hidden="true" />
            {{
              isUploadingAvatar
                ? t("auth.onboarding.uploadingAvatar")
                : t("auth.onboarding.chooseAvatar")
            }}
          </button>
          <p v-if="avatarMessage" class="kg-onboarding__success" aria-live="polite">
            <Icon name="lucide:check" aria-hidden="true" />
            {{ avatarMessage }}
          </p>
        </div>
      </section>

      <div class="kg-onboarding__field">
        <div class="kg-onboarding__label-row">
          <label for="onboarding-username">{{ t("auth.onboarding.usernameLabel") }}</label>
          <span :class="{ 'is-invalid': usernameLength > 50 }">
            {{ usernameLength }}/50
          </span>
        </div>
        <input
          id="onboarding-username"
          ref="usernameInput"
          v-model="username"
          type="text"
          minlength="2"
          maxlength="50"
          autocomplete="nickname"
          :placeholder="t('auth.onboarding.usernamePlaceholder')"
          :aria-describedby="errorMessage ? 'username-hint onboarding-error' : 'username-hint'"
          required
        />
        <p id="username-hint">{{ t("auth.onboarding.usernameHint") }}</p>
      </div>

      <div class="kg-onboarding__account">
        <Icon name="lucide:shield-check" aria-hidden="true" />
        <div>
          <span>{{ t("auth.onboarding.schoolAccount") }}</span>
          <strong>{{ maskedEmail }}</strong>
        </div>
        <span class="kg-onboarding__verified">{{ t("auth.onboarding.verified") }}</span>
      </div>

      <p class="kg-onboarding__policy">
        {{ t("auth.onboarding.policyPrefix") }}
        <NuxtLink :to="getLocalePath('/help/rules')">
          {{ t("auth.onboarding.rulesLink") }}
        </NuxtLink>
        {{ t("auth.onboarding.policyJoin") }}
        <NuxtLink :to="getLocalePath('/help/privacy')">
          {{ t("auth.onboarding.privacyLink") }}
        </NuxtLink>
      </p>

      <button class="kg-onboarding__submit" type="submit" :disabled="submitDisabled">
        <span v-if="isSaving" class="kg-onboarding__spinner" aria-hidden="true" />
        <Icon v-else name="lucide:arrow-right" aria-hidden="true" />
        {{ isSaving ? t("auth.onboarding.saving") : t("auth.onboarding.continue") }}
      </button>
    </form>

    <button
      type="button"
      class="kg-onboarding__switch"
      :disabled="isLoggingOut || isSaving || isUploadingAvatar"
      @click="switchAccount"
    >
      {{
        isLoggingOut
          ? t("auth.onboarding.loggingOut")
          : t("auth.onboarding.switchAccount")
      }}
    </button>
  </main>
</template>

<style lang="scss" scoped>
.kg-onboarding {
  width: min(100%, 620px);
  padding: 36px;
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-small);
  color: var(--text-primary);
}

.kg-onboarding__header {
  margin-bottom: 28px;

  h1 {
    margin: 10px 0 8px;
    font-size: 1.55rem;
    line-height: 1.25;
    text-wrap: balance;
  }

  > p {
    max-width: 58ch;
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.92rem;
    line-height: 1.6;
    text-wrap: pretty;
  }
}

.kg-onboarding__step {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--interactive-primary);
  font-size: 0.82rem;
  font-weight: 700;

  :deep(svg) {
    width: 17px;
    height: 17px;
  }
}

.kg-onboarding__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.kg-onboarding__alert {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--error-color) 30%, transparent);
  border-radius: 10px;
  background: var(--error-background);
  color: var(--error-color);
  font-size: 0.875rem;
  line-height: 1.5;

  :deep(svg) {
    width: 18px;
    height: 18px;
    margin-top: 1px;
    flex: 0 0 auto;
  }
}

.kg-onboarding__avatar {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px;
  border-radius: 12px;
  background: var(--surface-secondary);

  :deep(.user-avatar) {
    flex: 0 0 auto;
  }

  > div {
    min-width: 0;
  }

  h2 {
    margin: 0 0 3px;
    font-size: 1rem;
    line-height: 1.35;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.82rem;
    line-height: 1.5;
  }
}

.kg-onboarding__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.kg-onboarding__avatar-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  margin-top: 10px;
  padding: 7px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 9px;
  background: var(--surface-primary);
  color: var(--interactive-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  transition: border-color var(--transition-fast), background var(--transition-fast);

  &:hover:not(:disabled) {
    border-color: var(--interactive-primary);
    background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 28%, transparent);
    outline-offset: 2px;
  }

  :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

.kg-onboarding__success {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px !important;
  color: var(--success-color) !important;
  font-weight: 650;

  :deep(svg) {
    width: 15px;
    height: 15px;
  }
}

.kg-onboarding__label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;

  label {
    font-size: 0.9rem;
    font-weight: 700;
  }

  span {
    color: var(--text-muted);
    font-size: 0.76rem;

    &.is-invalid {
      color: var(--error-color);
    }
  }
}

.kg-onboarding__field {
  input {
    width: 100%;
    min-height: 48px;
    padding: 11px 13px;
    border: 1px solid var(--border-primary);
    border-radius: 10px;
    background: var(--surface-primary);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.95rem;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:hover {
      border-color: var(--border-secondary);
    }

    &:focus {
      border-color: var(--interactive-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 16%, transparent);
      outline: none;
    }

    &::placeholder {
      color: var(--text-secondary);
    }
  }

  > p {
    margin: 7px 0 0;
    color: var(--text-secondary);
    font-size: 0.8rem;
    line-height: 1.5;
  }
}

.kg-onboarding__account {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 13px;
  border-radius: 10px;
  background: var(--info-background);
  color: var(--text-primary);

  > :deep(svg) {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    color: var(--info-color);
  }

  > div {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 2px;

    span {
      color: var(--text-secondary);
      font-size: 0.74rem;
    }

    strong {
      overflow-wrap: anywhere;
      font-size: 0.84rem;
    }
  }
}

.kg-onboarding__verified {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--success-background);
  color: var(--success-color);
  font-size: 0.72rem;
  font-weight: 700;
}

.kg-onboarding__policy {
  margin: -2px 0 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.55;

  a {
    color: var(--interactive-primary);
    font-weight: 650;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid var(--interactive-primary);
      outline-offset: 2px;
      border-radius: 3px;
    }
  }
}

.kg-onboarding__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 50px;
  padding: 12px 18px;
  border: 0;
  border-radius: 11px;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
  cursor: pointer;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 750;
  transition: background var(--transition-fast), transform var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--btn-primary-bg-hover);
    transform: translateY(-1px);
  }

  &:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 28%, transparent);
    outline-offset: 2px;
  }

  :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

.kg-onboarding__switch {
  display: block;
  min-height: 42px;
  margin: 14px auto -8px;
  padding: 8px 12px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;

  &:hover:not(:disabled) {
    color: var(--interactive-primary);
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--interactive-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.kg-onboarding__spinner {
  width: 17px;
  height: 17px;
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: kg-onboarding-spin 0.8s linear infinite;
}

@keyframes kg-onboarding-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .kg-onboarding {
    padding: 28px 20px 24px;
  }

  .kg-onboarding__header {
    margin-bottom: 24px;
  }

  .kg-onboarding__avatar {
    align-items: flex-start;
    padding: 15px;
  }
}

@media (max-width: 390px) {
  .kg-onboarding__avatar {
    flex-direction: column;
  }

  .kg-onboarding__account {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .kg-onboarding__verified {
    margin-left: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kg-onboarding__avatar-button,
  .kg-onboarding__field input,
  .kg-onboarding__submit {
    transition: none;
  }

  .kg-onboarding__submit:hover:not(:disabled) {
    transform: none;
  }

  .kg-onboarding__spinner {
    animation-duration: 1.6s;
  }
}
</style>
