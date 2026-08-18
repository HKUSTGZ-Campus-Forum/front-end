<template>
  <div class="matching-navigation">
    <div class="nav-header">
      <h2>快速导航</h2>
      <p>选择你想要的操作</p>
    </div>

    <div class="nav-grid">
      <!-- Profile Setup -->
      <NuxtLink
        to="/matching/profile"
        class="nav-card"
        :class="{
          'nav-card--primary': !isProfileComplete,
          'nav-card--completed': isProfileComplete
        }"
      >
        <div class="nav-card-icon">
          <Icon :name="isProfileComplete ? 'check-circle' : 'user-circle'" />
        </div>
        <div class="nav-card-content">
          <h3>{{ t('Profile Settings') }}</h3>
          <p>{{ isProfileComplete ? t('Profile is complete') : t('Set your skills and interests') }}</p>
          <div class="nav-card-status">
            <span v-if="!isProfileComplete" class="status-badge status-required">{{ t('Required') }}</span>
            <span v-else class="status-badge status-completed">✓ {{ t('Completed') }}</span>
          </div>
        </div>
        <Icon name="arrow-right" class="nav-card-arrow" />
      </NuxtLink>

      <!-- Discover Projects -->
      <NuxtLink
        to="/matching/discover"
        class="nav-card"
        :class="{ 'nav-card--disabled': !isProfileComplete }"
      >
        <div class="nav-card-icon">
          <Icon name="search" />
        </div>
        <div class="nav-card-content">
          <h3>发现项目</h3>
          <p>找到与你匹配的项目</p>
          <div class="nav-card-status">
            <span v-if="!isProfileComplete" class="status-badge status-locked">需要完善资料</span>
            <span v-else class="status-badge status-available">推荐</span>
          </div>
        </div>
        <Icon name="arrow-right" class="nav-card-arrow" />
      </NuxtLink>

      <!-- Create Project -->
      <NuxtLink
        to="/matching/projects/create"
        class="nav-card"
      >
        <div class="nav-card-icon">
          <Icon name="plus-circle" />
        </div>
        <div class="nav-card-content">
          <h3>创建项目</h3>
          <p>发布你的项目想法</p>
          <div class="nav-card-status">
            <span class="status-badge status-optional">可选</span>
          </div>
        </div>
        <Icon name="arrow-right" class="nav-card-arrow" />
      </NuxtLink>

      <!-- My Applications -->
      <NuxtLink
        to="/matching/applications"
        class="nav-card"
        v-if="stats?.applications_sent > 0 || stats?.applications_received > 0"
      >
        <div class="nav-card-icon">
          <Icon name="inbox" />
        </div>
        <div class="nav-card-content">
          <h3>我的申请</h3>
          <p>查看申请状态</p>
          <div class="nav-card-status">
            <span v-if="stats?.applications_pending > 0" class="status-badge status-attention">
              {{ stats.applications_pending }} 待处理
            </span>
          </div>
        </div>
        <Icon name="arrow-right" class="nav-card-arrow" />
      </NuxtLink>

      <!-- My Projects -->
      <NuxtLink
        to="/matching/projects"
        class="nav-card"
        v-if="stats?.projects_created > 0"
      >
        <div class="nav-card-icon">
          <Icon name="briefcase" />
        </div>
        <div class="nav-card-content">
          <h3>我的项目</h3>
          <p>管理你的项目</p>
          <div class="nav-card-status">
            <span class="status-badge status-info">{{ stats.projects_created }} 个项目</span>
          </div>
        </div>
        <Icon name="arrow-right" class="nav-card-arrow" />
      </NuxtLink>
    </div>

    <div v-if="!isProfileComplete" class="nav-tip">
      <Icon name="info" class="tip-icon" />
      <span>完成个人资料设置后，将解锁更多功能并获得精准的项目推荐</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  profile: {
    type: Object,
    default: () => null
  },
  stats: {
    type: Object,
    default: () => ({})
  }
})

const isProfileComplete = computed(() => {
  return props.profile?.bio &&
         props.profile?.skills?.length >= 3 &&
         props.profile?.experience_level
})
</script>

<style scoped>
.matching-navigation {
  background: var(--surface-primary);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--border-primary);
}

.nav-header {
  text-align: center;
  margin-bottom: 24px;
}

.nav-header h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.nav-header p {
  margin: 0;
  color: var(--text-secondary, #7f8c8d);
}

.nav-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
}

.nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
}

.nav-card:hover:not(.nav-card--disabled) {
  border-color: var(--interactive-primary);
  box-shadow: var(--shadow-small);
  transform: translateY(-1px);
}

.nav-card--primary {
  background: linear-gradient(135deg, color-mix(in srgb, var(--interactive-primary) 5%, transparent), color-mix(in srgb, var(--interactive-primary) 8%, transparent));
  border-color: var(--interactive-primary);
}

.nav-card--completed {
  background: color-mix(in srgb, var(--semantic-success) 6%, transparent);
  border-color: var(--semantic-success);
}

.nav-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-secondary);
  border-radius: 8px;
  color: var(--interactive-primary);
  font-size: 1.5rem;
}

.nav-card--completed .nav-card-icon {
  background: color-mix(in srgb, var(--semantic-success) 10%, transparent);
  color: var(--semantic-success);
}

.nav-card-content {
  flex: 1;
}

.nav-card-content h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.nav-card-content p {
  margin: 0 0 8px 0;
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
}

.nav-card-status {
  margin-top: 8px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-required {
  background: var(--error-background);
  color: var(--error-color);
}

.status-completed {
  background: var(--success-background);
  color: var(--success-color);
}

.status-locked {
  background: color-mix(in srgb, var(--text-muted) 12%, transparent);
  color: var(--text-muted);
}

.status-available {
  background: var(--info-background);
  color: var(--info-color);
}

.status-optional {
  background: var(--purple-background);
  color: var(--purple-color);
}

.status-attention {
  background: var(--warning-background);
  color: var(--warning-color);
}

.status-info {
  background: var(--info-background);
  color: var(--info-color);
}

.nav-card-arrow {
  flex-shrink: 0;
  font-size: 1rem;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.nav-card:hover:not(.nav-card--disabled) .nav-card-arrow {
  color: var(--interactive-primary);
  transform: translateX(2px);
}

.nav-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: color-mix(in srgb, var(--interactive-primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 20%, transparent);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.tip-icon {
  flex-shrink: 0;
  color: var(--interactive-primary);
  margin-top: 2px;
}

@media (max-width: 768px) {
  .nav-card {
    padding: 16px;
    gap: 12px;
  }

  .nav-card-icon {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .nav-card-content h3 {
    font-size: 1rem;
  }

  .nav-card-content p {
    font-size: 0.85rem;
  }
}
</style>