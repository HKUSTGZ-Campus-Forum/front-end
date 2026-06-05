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
