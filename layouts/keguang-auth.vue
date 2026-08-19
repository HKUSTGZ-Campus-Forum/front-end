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
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.kg-auth-header {
  height: 64px;
  background: var(--sidebar-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: var(--sidebar-shadow);
}

.kg-auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--interactive-primary);
    outline-offset: 5px;
    border-radius: 8px;
  }
}

.kg-auth-logo-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--overlay-text);
  border: 2px solid color-mix(in srgb, var(--overlay-text) 35%, transparent);
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
  color: var(--overlay-text);
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
  border: 1px solid color-mix(in srgb, var(--overlay-text) 25%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--overlay-text) 78%, transparent);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);

  &.active,
  &:hover {
    color: var(--overlay-text);
    border-color: color-mix(in srgb, var(--overlay-text) 48%, transparent);
    background: color-mix(in srgb, var(--overlay-text) 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--interactive-primary);
    outline-offset: 2px;
  }
}

.kg-auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

@media (max-width: 479px) {
  .kg-auth-header {
    height: 60px;
    padding: 0 16px;
  }

  .kg-auth-brand-name {
    font-size: 0.96rem;
  }

  .kg-auth-logo-wrap {
    width: 32px;
    height: 32px;
  }

  .kg-auth-locale-btn {
    min-width: 44px;
    min-height: 40px;
    padding: 6px 8px;
  }

  .kg-auth-main {
    align-items: flex-start;
    padding: 28px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kg-auth-locale-btn {
    transition: none;
  }
}
</style>
