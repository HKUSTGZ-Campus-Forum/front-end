<template>
  <div class="theme-settings">
    <!-- Theme Categories -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">🎨</i>
        主题选择
      </h3>
      
      <!-- Category Tabs -->
      <div class="category-tabs">
        <button
          v-for="category in categories"
          :key="category.id"
          class="category-tab"
          :class="{ active: activeCategory === category.id }"
          @click="activeCategory = category.id"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-name">{{ category.name }}</span>
        </button>
      </div>
      
      <!-- Theme Grid -->
      <div class="theme-grid">
        <div
          v-for="theme in filteredThemes"
          :key="theme.id"
          class="theme-card"
          :class="{ active: themeStore.currentTheme === theme.id }"
          @click="selectTheme(theme.id)"
        >
          <div class="theme-preview" :style="getThemePreviewStyle(theme)">
            <div class="preview-content">
              <div class="preview-element sidebar"></div>
              <div class="preview-element topbar"></div>
              <div class="preview-element card"></div>
            </div>
          </div>
          
          <div class="theme-info">
            <h4 class="theme-name">{{ theme.name }}</h4>
            <p class="theme-description">{{ theme.description }}</p>
          </div>
          
          <div v-if="themeStore.currentTheme === theme.id" class="active-indicator">
            <span class="check-icon">✓</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Options -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">⚙️</i>
        高级设置
      </h3>
      
      <div class="advanced-options">
        <!-- Auto Dark Mode -->
        <div class="option-group">
          <label class="option-label">
            <input 
              type="checkbox" 
              v-model="autoDarkMode"
              @change="toggleAutoDarkMode"
              class="option-checkbox"
            />
            <span class="option-text">
              <strong>自动深色模式</strong>
              <span class="option-description">根据系统设置自动切换主题</span>
            </span>
          </label>
        </div>
        
      </div>
    </div>

    <!-- Custom Theme (Future Feature) -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">🎪</i>
        自定义主题
      </h3>
      
      <div class="custom-theme-info">
        <p class="info-text">
          🚧 自定义主题功能正在开发中，敬请期待！
        </p>
        <p class="info-description">
          未来您将能够：
        </p>
        <ul class="feature-list">
          <li>调整颜色搭配</li>
          <li>上传自定义背景</li>
          <li>调节透明度和模糊效果</li>
          <li>保存和分享主题</li>
        </ul>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">⚡</i>
        快速操作
      </h3>
      
      <div class="quick-actions">
        <button
          class="action-btn reset-btn"
          @click="resetTheme"
        >
          <i class="icon">🔄</i>
          恢复默认主题
        </button>
        
        <button
          class="action-btn preview-btn"
          @click="togglePreviewMode"
        >
          <i class="icon">👁️</i>
          {{ previewMode ? '退出预览' : '预览模式' }}
        </button>
        
        <button class="action-btn home-btn" @click="navigateToHome">
          <i class="icon">🏠</i>
          返回主页
        </button>
      </div>
    </div>

    <!-- Theme Application Status -->
    <div v-if="isApplyingTheme" class="applying-overlay">
      <div class="applying-content">
        <div class="spinner">⟳</div>
        <p>正在应用主题...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useThemeStore } from "~/store/themeStore";
import { themes, getThemesByCategory } from '~/utils/themes';

const themeStore = useThemeStore();

// Reactive state
const activeCategory = ref('light');
const autoDarkMode = ref(false);
const previewMode = ref(false);
const isApplyingTheme = ref(false);

// Categories
const categories = [
  { id: 'light', name: '浅色', icon: '☀️' },
  { id: 'dark', name: '深色', icon: '🌙' },
  { id: 'colored', name: '彩色', icon: '🌈' }
];

// Computed properties
const filteredThemes = computed(() => {
  return getThemesByCategory(activeCategory.value);
});

// Theme selection
function selectTheme(themeId) {
  if (isApplyingTheme.value) return;
  
  isApplyingTheme.value = true;
  
  // Small delay for visual feedback
  setTimeout(() => {
    themeStore.setTheme(themeId);
    isApplyingTheme.value = false;
  }, 300);
}

// Generate preview style for theme cards
function getThemePreviewStyle(theme) {
  return {
    background: theme.background.gradient || theme.background.primary,
    transition: 'all 0.2s ease'
  };
}

// Auto dark mode
function toggleAutoDarkMode() {
  if (autoDarkMode.value) {
    // Enable auto dark mode
    enableAutoTheme();
  } else {
    // Disable auto dark mode
    disableAutoTheme();
  }
}

let mediaQuery = null;

function enableAutoTheme() {
  if (window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (autoDarkMode.value) {
        const preferredTheme = e.matches ? 'dark' : 'light';
        selectTheme(preferredTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Apply initial theme
    const preferredTheme = mediaQuery.matches ? 'dark' : 'light';
    selectTheme(preferredTheme);
  }
}

function disableAutoTheme() {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', () => {});
    mediaQuery = null;
  }
}

// Quick actions
function resetTheme() {
  selectTheme('light');
  autoDarkMode.value = false;
  disableAutoTheme();
}

function togglePreviewMode() {
  previewMode.value = !previewMode.value;
  // Future: implement preview mode functionality
}

function navigateToHome() {
  navigateTo("/");
}

// Lifecycle
onMounted(() => {
  // Initialize auto dark mode if user prefers dark theme
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    if (themeStore.currentTheme === 'dark') {
      autoDarkMode.value = true;
      enableAutoTheme();
    }
  }
});

onUnmounted(() => {
  disableAutoTheme();
});

// Watch for theme changes to update active category
watch(() => themeStore.currentTheme, (newTheme) => {
  const theme = themes.find(t => t.id === newTheme);
  if (theme) {
    activeCategory.value = theme.category;
  }
});
</script>

<style lang="scss" scoped>
.theme-settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
}

.settings-section {
  background: var(--surface-primary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--border-primary);
  backdrop-filter: var(--effect-blur);
  transition: all var(--transition-normal);
  
  @media (max-width: 767px) {
    padding: 1rem;
    border-radius: 12px;
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  
  .icon {
    font-size: 1.4rem;
  }
  
  @media (min-width: 768px) {
    font-size: 1.4rem;
    gap: 1rem;
  }
}

// Category tabs
.category-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 4px;
  background: var(--surface-secondary);
  border-radius: 12px;
  overflow-x: auto;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  font-weight: 500;
  
  &:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--interactive-primary);
    color: var(--text-inverse);
    box-shadow: var(--shadow-small);
  }
  
  .category-icon {
    font-size: 1.1rem;
  }
  
  .category-name {
    font-size: 0.9rem;
  }
}

// Theme grid
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.theme-card {
  position: relative;
  border: 2px solid var(--border-primary);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--surface-primary);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-large);
    border-color: var(--interactive-primary);
  }
  
  &.active {
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
}

.theme-preview {
  height: 120px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.preview-content {
  display: grid;
  grid-template-columns: 1fr 3fr;
  grid-template-rows: auto 1fr;
  gap: 4px;
  width: 100%;
  height: 80px;
  opacity: 0.8;
}

.preview-element {
  border-radius: 2px;
  
  &.sidebar {
    grid-row: 1 / -1;
    background: var(--sidebar-bg);
    opacity: 0.9;
  }
  
  &.topbar {
    background: var(--topbar-bg);
    opacity: 0.9;
  }
  
  &.card {
    background: var(--card-bg);
    opacity: 0.9;
  }
}

.theme-info {
  padding: 1rem;
  
  .theme-name {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .theme-description {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }
}

.active-indicator {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 24px;
  height: 24px;
  background: var(--interactive-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .check-icon {
    color: white;
    font-size: 0.8rem;
    font-weight: bold;
  }
}

// Advanced options
.advanced-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.option-group {
  .option-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    
    .option-checkbox {
      margin-top: 2px;
      width: 18px;
      height: 18px;
      accent-color: var(--interactive-primary);
    }
    
    .option-text {
      flex: 1;
      
      strong {
        display: block;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }
      
      .option-description {
        font-size: 0.9rem;
        color: var(--text-secondary);
      }
    }
  }
}

.setting-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--text-primary);
}

// Custom theme info
.custom-theme-info {
  .info-text {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  
  .info-description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }
  
  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: 0.25rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      
      &::before {
        content: "✨ ";
        margin-right: 0.5rem;
      }
    }
  }
}

// Quick actions
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
  
  .icon {
    font-size: 1rem;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-medium);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &.reset-btn {
    background: var(--semantic-warning);
    color: var(--text-inverse);
    
    &:hover {
      background: #d97706;
    }
  }
  
  &.preview-btn {
    background: var(--semantic-info);
    color: var(--text-inverse);
    
    &:hover {
      background: #2563eb;
    }
  }
  
  &.home-btn {
    background: var(--interactive-primary);
    color: var(--text-inverse);
    
    &:hover {
      background: var(--interactive-hover);
    }
  }
}

// Applying overlay
.applying-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: var(--effect-blur);
}

.applying-content {
  background: var(--modal-bg);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--modal-shadow);
  
  .spinner {
    font-size: 2rem;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0;
    color: var(--text-primary);
    font-weight: 500;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>