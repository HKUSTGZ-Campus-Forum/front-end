<template>
  <nav class="breadcrumbs" aria-label="导航路径">
    <ol class="breadcrumb-list">
      <li class="breadcrumb-item">
        <NuxtLink to="/matching" class="breadcrumb-link">
          <Icon name="users" class="breadcrumb-icon" />
          团队匹配
        </NuxtLink>
      </li>
      <li v-for="(item, index) in breadcrumbItems" :key="index" class="breadcrumb-item">
        <Icon name="chevron-right" class="breadcrumb-separator" />
        <NuxtLink v-if="item.href && !item.current" :to="item.href" class="breadcrumb-link">
          {{ item.title }}
        </NuxtLink>
        <span v-else class="breadcrumb-current">{{ item.title }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbItems = computed(() => {
  const path = route.path
  const items = []

  if (path.startsWith('/matching/profile')) {
    items.push({ title: '个人资料设置', current: true })
  } else if (path.startsWith('/matching/discover')) {
    items.push({ title: '发现项目', current: true })
  } else if (path.startsWith('/matching/projects/create')) {
    items.push({ title: '项目', href: '/matching/projects' })
    items.push({ title: '创建项目', current: true })
  } else if (path.startsWith('/matching/projects/') && path.includes('/edit')) {
    items.push({ title: '项目', href: '/matching/projects' })
    items.push({ title: '编辑项目', current: true })
  } else if (path.startsWith('/matching/projects/') && route.params.id) {
    items.push({ title: '项目', href: '/matching/projects' })
    items.push({ title: '项目详情', current: true })
  } else if (path.startsWith('/matching/projects')) {
    items.push({ title: '我的项目', current: true })
  } else if (path.startsWith('/matching/applications')) {
    items.push({ title: '我的申请', current: true })
  }

  return items
})
</script>

<style scoped>
.breadcrumbs {
  margin-bottom: 24px;
  padding: 12px 0;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #7f8c8d);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.breadcrumb-link:hover {
  color: var(--interactive-primary, #3498db);
  background: var(--surface-secondary, #f8f9fa);
}

.breadcrumb-current {
  color: var(--text-primary, #2c3e50);
  font-weight: 500;
  padding: 4px 8px;
}

.breadcrumb-icon {
  font-size: 1rem;
}

.breadcrumb-separator {
  font-size: 0.8rem;
  color: var(--text-tertiary, #bdc3c7);
  margin: 0 4px;
}

@media (max-width: 768px) {
  .breadcrumb-list {
    font-size: 0.8rem;
  }

  .breadcrumb-link,
  .breadcrumb-current {
    padding: 2px 4px;
  }

  .breadcrumb-icon {
    display: none;
  }
}
</style>