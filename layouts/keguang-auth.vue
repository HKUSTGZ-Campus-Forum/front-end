<template>
  <div class="kg-auth-layout">
    <header class="kg-auth-header">
      <NuxtLink :to="getLocalePath('/')" class="kg-auth-brand">
        <span class="kg-auth-logo-wrap" aria-hidden="true">
          <img src="/image/uniKorn.png" alt="" class="kg-auth-logo" />
        </span>
        <span class="kg-auth-brand-name">{{ t("common.appName") }}</span>
      </NuxtLink>

      <div class="kg-auth-locale-switch">
        <button
          v-for="item in availableLocales"
          :key="item.code"
          type="button"
          :class="['kg-auth-locale-btn', { active: locale === item.code }]"
          @click="switchToLocale(item.code)"
        >
          {{ item.code === "zh" ? t("common.locale.zh") : t("common.locale.en") }}
        </button>
      </div>
    </header>
    <main class="kg-auth-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { locale, availableLocales, getLocalePath, switchToLocale } = useAppLocale();
</script>

<style lang="scss" scoped>
.kg-auth-layout {
  min-height: 100vh;
  background: #d7edf9;
  display: flex;
  flex-direction: column;
}

.kg-auth-header {
  height: 64px;
  background: #283965;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: 0 2px 8px rgba(40, 57, 101, 0.2);
}

.kg-auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.kg-auth-logo-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.35);
}

.kg-auth-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.kg-auth-brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}

.kg-auth-locale-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kg-auth-locale-btn {
  min-width: 48px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active,
  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.45);
    background: rgba(255, 255, 255, 0.12);
  }
}

.kg-auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}
</style>
