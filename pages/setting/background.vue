<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePersistHomeStore } from "~/store/modules/home";
import { useThemeStore } from "~/store/themeStore";

// 获取主页状态
const homeStore = usePersistHomeStore();
const themeStore = useThemeStore();

// 自动重定向到新的主题设置页面
onMounted(() => {
  // 立即跳转，不显示通知
  navigateTo('/setting/theme');
});
</script>

<template>
  <HomeContainer>
    <div class="redirect-container">
      <div class="redirect-content">
        <h1 class="redirect-title">页面已升级</h1>
        <div class="redirect-message">
          <p class="main-message">
            🎨 背景设置已升级为更强大的主题系统！
          </p>
          <p class="sub-message">
            新的主题系统包含：
          </p>
          <ul class="feature-list">
            <li>✨ 6个精美预设主题</li>
            <li>🌙 智能深色模式</li>
            <li>🎯 一键主题切换</li>
            <li>📱 更好的移动端体验</li>
          </ul>
          <p class="redirect-note">
            正在为您跳转到新的主题设置页面...
          </p>
        </div>
        
        <div class="redirect-actions">
          <button 
            class="action-btn primary-btn"
            @click="navigateTo('/setting/theme')"
          >
            <span class="btn-icon">🚀</span>
            立即体验新主题系统
          </button>
          
          <button 
            class="action-btn secondary-btn"
            @click="navigateTo('/')"
          >
            <span class="btn-icon">🏠</span>
            返回主页
          </button>
        </div>
        
        <div class="compatibility-note">
          <p>💡 您的现有背景设置已自动迁移到新系统</p>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
.redirect-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
  
  @media (min-width: 768px) {
    margin: 3rem auto;
    padding: 2rem;
  }
}

.redirect-content {
  background: var(--surface-primary);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: var(--shadow-large);
  border: 1px solid var(--border-primary);
  
  @media (max-width: 767px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
}

.redirect-title {
  margin: 0 0 1.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  
  @media (max-width: 767px) {
    font-size: 1.75rem;
  }
}

.redirect-message {
  margin-bottom: 2rem;
  
  .main-message {
    font-size: 1.2rem;
    color: var(--text-primary);
    margin-bottom: 1rem;
    font-weight: 500;
  }
  
  .sub-message {
    color: var(--text-secondary);
    margin-bottom: 1rem;
    font-size: 1rem;
  }
  
  .feature-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
    text-align: left;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
    
    li {
      padding: 0.5rem 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
  }
  
  .redirect-note {
    color: var(--text-muted);
    font-size: 0.9rem;
    font-style: italic;
    margin-top: 1.5rem;
  }
}

.redirect-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: center;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 1rem;
  text-decoration: none;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  .btn-icon {
    font-size: 1.1rem;
  }
  
  &.primary-btn {
    background: var(--interactive-primary);
    color: var(--text-inverse);
    
    &:hover {
      background: var(--interactive-hover);
    }
  }
  
  &.secondary-btn {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: 2px solid var(--border-primary);
    
    &:hover {
      background: var(--surface-elevated);
      border-color: var(--interactive-primary);
    }
  }
}

.compatibility-note {
  padding: 1rem;
  background: var(--surface-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--semantic-info);
  
  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
}
</style>
