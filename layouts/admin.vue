<script setup lang="ts">
import { computed, ref } from "vue";

const sidebarExpanded = ref(false);
const route = useRoute();
const { t } = useI18n();
const { getLocalePath } = useAppLocale();

const navItems = computed(() => [
  {
    key: "overview",
    label: t("adminShell.nav.overview"),
    to: getLocalePath("/admin"),
    match: "/admin",
    exact: true,
  },
  {
    key: "users",
    label: t("adminShell.nav.users"),
    to: getLocalePath("/admin/users"),
    match: "/admin/users",
    exact: false,
  },
  {
    key: "content",
    label: t("adminShell.nav.content"),
    to: getLocalePath("/admin/content"),
    match: "/admin/content",
    exact: false,
  },
  {
    key: "feedback",
    label: t("adminShell.nav.feedback"),
    to: getLocalePath("/admin/feedback"),
    match: "/admin/feedback",
    exact: false,
  },
  {
    key: "identity",
    label: t("adminShell.nav.identity"),
    to: getLocalePath("/admin/identity-management"),
    match: "/admin/identity-management",
    exact: false,
  },
  {
    key: "domains",
    label: t("adminShell.nav.domains"),
    to: getLocalePath("/admin/domains"),
    match: "/admin/domains",
    exact: false,
  },
  {
    key: "audit",
    label: t("adminShell.nav.audit"),
    to: getLocalePath("/admin/audit"),
    match: "/admin/audit",
    exact: false,
  },
]);

function isActive(match: string, exact = false) {
  const localizedMatch = getLocalePath(match);
  return exact ? route.path === localizedMatch : route.path.startsWith(localizedMatch);
}
</script>

<template>
  <div class="admin-layout">
    <HomeKeguangSidebar @update:expanded="sidebarExpanded = $event" />
    <HomeKeguangPinned :sidebar-expanded="sidebarExpanded" />

    <div
      class="admin-layout__main"
      :class="{ 'admin-layout__main--expanded': sidebarExpanded }"
    >
      <div class="admin-layout__content">
        <section class="admin-shell">
          <nav class="admin-shell__nav" :aria-label="t('nav.admin')">
            <NuxtLink
              v-for="item in navItems"
              :key="item.key"
              :to="item.to"
              class="admin-shell__nav-link"
              :class="{ 'admin-shell__nav-link--active': isActive(item.match, item.exact) }"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>

          <main class="admin-shell__body">
            <slot />
          </main>
        </section>
      </div>

      <CommonFooter />
    </div>

    <ClientOnly>
      <PwaInstallGuide />
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss">
.admin-layout {
  position: relative;
  min-height: 100vh;
  background: var(--bg-gradient, var(--bg-primary));
}

.admin-layout__main {
  margin-left: 72px;
  margin-top: 84px;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;

  &--expanded {
    margin-left: 200px;
  }
}

.admin-layout__content {
  flex: 1;
  padding: 20px 24px 60px;
}

.admin-shell {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
}

.admin-shell__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.admin-shell__nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-weight: 600;
  text-decoration: none;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);

  &:hover {
    border-color: var(--interactive-primary);
    color: var(--text-primary);
  }

  &--active {
    border-color: var(--interactive-primary);
    background: var(--interactive-primary);
    color: var(--text-inverse);
    box-shadow: var(--shadow-small);
  }
}

.admin-shell__body {
  min-width: 0;
}

@media (max-width: 768px) {
  .admin-layout__main {
    margin-left: 0;
    margin-top: 64px;
    min-height: calc(100vh - 64px);

    &--expanded {
      margin-left: 0;
    }
  }

  .admin-layout__content {
    padding: 1rem 0.9rem 2rem;
  }
}
</style>
