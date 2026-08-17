<script setup>
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import RegisterComponent from "~/components/setting/Register.vue";

definePageMeta({ layout: "keguang-auth" });

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { getLocalePath } = useAppLocale();

const handleRegisterSuccess = () => {
  setTimeout(() => {
    const redirectParam =
      typeof route.query.redirect === "string"
        ? `&redirect=${encodeURIComponent(route.query.redirect)}`
        : "";
    router.push(`${getLocalePath("/login")}?registered=true${redirectParam}`);
  }, 1500);
};
</script>

<template>
  <div class="kg-register-card">
    <h1 class="kg-register-title">{{ t("auth.register.title") }}</h1>
    <p class="kg-register-subtitle">{{ t("auth.register.subtitle") }}</p>

    <RegisterComponent @register-success="handleRegisterSuccess" />

    <div class="kg-form-footer">
      {{ t("auth.register.hasAccount") }}
      <NuxtLink :to="getLocalePath('/login')" class="kg-link">{{ t("auth.register.loginNow") }}</NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-register-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border-primary);
  border-radius: 20px;
  box-shadow: var(--shadow-large);
  padding: 40px 36px;
}

.kg-register-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 6px;
  text-align: center;
}

.kg-register-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 32px;
  text-align: center;
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
</style>
