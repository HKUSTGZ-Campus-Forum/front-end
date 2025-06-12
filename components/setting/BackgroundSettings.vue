<template>
  <div class="background-settings">
    <!-- Color Section -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">🎨</i>
        颜色设置
      </h3>
      
      <!-- Color Picker -->
      <div class="setting-group">
        <label class="setting-label">自定义颜色</label>
        <div class="color-picker-wrapper">
          <input
            type="color"
            :value="themeStore.backgroundColor"
            @input="updateBackgroundColor"
            class="color-input"
          />
          <span class="color-value">{{ themeStore.backgroundColor }}</span>
        </div>
      </div>

      <!-- Preset Colors -->
      <div class="setting-group">
        <label class="setting-label">预设颜色</label>
        <div class="color-presets">
          <button
            v-for="preset in colorPresets"
            :key="preset.name"
            class="color-preset-btn"
            :class="{ active: themeStore.backgroundColor === preset.color }"
            :style="{ backgroundColor: preset.color }"
            :title="preset.name"
            @click="themeStore.setBackgroundColor(preset.color)"
          >
            <span v-if="themeStore.backgroundColor === preset.color" class="check-icon">✓</span>
          </button>
        </div>
      </div>

      <!-- Gradient Options -->
      <div class="setting-group">
        <label class="setting-label">渐变背景</label>
        <div class="gradient-presets">
          <button
            v-for="gradient in gradientPresets"
            :key="gradient.name"
            class="gradient-preset-btn"
            :class="{ active: currentGradient === gradient.value }"
            :style="{ background: gradient.value }"
            :title="gradient.name"
            @click="applyGradient(gradient.value)"
          >
            <span v-if="currentGradient === gradient.value" class="check-icon">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Image Section -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">🖼️</i>
        背景图片
      </h3>
      
      <div class="setting-group">
        <label class="setting-label">选择图片</label>
        <div class="file-upload-wrapper">
          <input 
            type="file" 
            accept="image/*" 
            @change="handleImageUpload"
            class="file-input"
            id="background-upload"
          />
          <label for="background-upload" class="file-label">
            <i class="icon">📁</i>
            选择文件
          </label>
        </div>
      </div>

      <div class="setting-group" v-if="themeStore.backgroundImage">
        <label class="setting-label">
          图片透明度: {{ Math.round(themeStore.backgroundOpacity * 100) }}%
        </label>
        <div class="range-wrapper">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            :value="themeStore.backgroundOpacity"
            @input="updateBackgroundOpacity"
            class="range-input"
          />
          <div class="range-labels">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <!-- Background Position Options -->
      <div class="setting-group" v-if="themeStore.backgroundImage">
        <label class="setting-label">图片显示方式</label>
        <div class="background-options">
          <button
            v-for="option in backgroundOptions"
            :key="option.value"
            class="option-btn"
            :class="{ active: currentBackgroundSize === option.value }"
            @click="updateBackgroundSize(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
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
          @click="resetToDefault"
        >
          <i class="icon">🔄</i>
          重置为默认
        </button>
        
        <button
          v-if="themeStore.backgroundImage"
          class="action-btn remove-btn"
          @click="removeBackgroundImage"
        >
          <i class="icon">🗑️</i>
          移除背景图片
        </button>
        
        <button class="action-btn home-btn" @click="navigateToHome">
          <i class="icon">🏠</i>
          返回主页
        </button>
      </div>
    </div>

    <!-- Preview Section -->
    <div class="settings-section">
      <h3 class="section-title">
        <i class="icon">👁️</i>
        预览效果
      </h3>
      
      <div class="preview-container">
        <div 
          class="preview-box"
          :style="previewStyle"
        >
          <div class="preview-content">
            <h4>预览区域</h4>
            <p>这里显示当前背景设置的效果</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useThemeStore } from "~/store/themeStore";

const themeStore = useThemeStore();

// Current state tracking
const currentGradient = ref(null);
const currentBackgroundSize = ref('cover');

// Color presets
const colorPresets = [
  { name: '默认蓝', color: '#f0f8ff' },
  { name: '薄荷绿', color: '#f0fff4' },
  { name: '淡粉色', color: '#fff0f5' },
  { name: '浅黄色', color: '#fffacd' },
  { name: '淡紫色', color: '#f5f0ff' },
  { name: '天空蓝', color: '#e6f3ff' },
  { name: '海洋蓝', color: '#e0f6ff' },
  { name: '森林绿', color: '#f0fff0' },
  { name: '玫瑰金', color: '#fff5f0' },
  { name: '珍珠白', color: '#fafafa' },
  { name: '深邃灰', color: '#f5f5f5' },
  { name: '优雅黑', color: '#2c2c2c' }
];

// Gradient presets
const gradientPresets = [
  { name: '晨曦', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: '日落', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: '海洋', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: '森林', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: '彩虹', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: '梦幻', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: '星空', value: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' },
  { name: '紫罗兰', value: 'linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)' }
];

// Background size options
const backgroundOptions = [
  { label: '覆盖', value: 'cover' },
  { label: '包含', value: 'contain' },
  { label: '拉伸', value: '100% 100%' },
  { label: '平铺', value: 'auto' }
];

// Preview style computed property
const previewStyle = computed(() => {
  const style = {};
  
  if (currentGradient.value) {
    style.background = currentGradient.value;
  } else {
    style.backgroundColor = themeStore.backgroundColor;
  }
  
  if (themeStore.backgroundImage) {
    style.backgroundImage = `url(${themeStore.backgroundImage})`;
    style.backgroundSize = currentBackgroundSize.value;
    style.backgroundPosition = 'center';
    style.backgroundRepeat = currentBackgroundSize.value === 'auto' ? 'repeat' : 'no-repeat';
    style.opacity = themeStore.backgroundOpacity;
  }
  
  return style;
});

// 更新背景颜色
function updateBackgroundColor(event) {
  themeStore.setBackgroundColor(event.target.value);
  currentGradient.value = null; // Clear gradient when setting solid color
}

// Apply gradient
function applyGradient(gradient) {
  currentGradient.value = gradient;
  // Store gradient in theme store if it supports it
  if (themeStore.setBackgroundGradient) {
    themeStore.setBackgroundGradient(gradient);
  }
}

// 处理图片上传
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过 5MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      themeStore.setBackgroundImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

// 更新图片透明度
function updateBackgroundOpacity(event) {
  themeStore.setBackgroundOpacity(parseFloat(event.target.value));
}

// Update background size
function updateBackgroundSize(size) {
  currentBackgroundSize.value = size;
  // Store in theme store if it supports it
  if (themeStore.setBackgroundSize) {
    themeStore.setBackgroundSize(size);
  }
}

// 移除背景图片
function removeBackgroundImage() {
  themeStore.setBackgroundImage(null);
  currentBackgroundSize.value = 'cover';
}

// Reset to default
function resetToDefault() {
  themeStore.setBackgroundColor('#f0f8ff');
  themeStore.setBackgroundImage(null);
  themeStore.setBackgroundOpacity(1);
  currentGradient.value = null;
  currentBackgroundSize.value = 'cover';
}

// 添加导航函数
function navigateToHome() {
  navigateTo("/");
}
</script>

<style lang="scss" scoped>
.background-settings {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
  
  @media (min-width: 480px) {
    padding: 1.25rem;
  }
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
}

.settings-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  
  @media (max-width: 479px) {
    padding: 1rem;
    border-radius: 8px;
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
  
  .icon {
    font-size: 1.4rem;
  }
  
  @media (min-width: 480px) {
    font-size: 1.4rem;
    gap: 1rem;
  }
  
  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
}

.setting-group {
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.setting-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: #34495e;
  font-size: 0.95rem;
  
  @media (max-width: 479px) {
    font-size: 1rem;
  }
}

// Color picker styles
.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .color-input {
    width: 60px;
    height: 44px;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }
    
    @media (min-width: 480px) {
      width: 50px;
      height: 40px;
    }
  }
  
  .color-value {
    font-family: monospace;
    background: #f8f9fa;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #6c757d;
    border: 1px solid #e9ecef;
  }
}

// Color presets
.color-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 0.75rem;
  
  @media (max-width: 479px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
}

.color-preset-btn {
  width: 60px;
  height: 44px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (min-width: 480px) {
    width: 50px;
    height: 40px;
  }
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &.active {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
  }
  
  .check-icon {
    color: white;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    font-size: 1.2rem;
  }
}

// Gradient presets
.gradient-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.75rem;
  
  @media (max-width: 479px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
}

.gradient-preset-btn {
  height: 44px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (min-width: 480px) {
    height: 40px;
  }
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &.active {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
  }
  
  .check-icon {
    color: white;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
    font-size: 1.2rem;
  }
}

// File upload styles
.file-upload-wrapper {
  position: relative;
  
  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .file-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.25rem;
    background: #f8f9fa;
    border: 2px dashed #ced4da;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    color: #495057;
    min-height: 44px;
    
    @media (min-width: 480px) {
      padding: 0.75rem 1rem;
      min-height: auto;
    }
    
    &:hover {
      background: #e9ecef;
      border-color: #3498db;
      color: #3498db;
    }
    
    .icon {
      font-size: 1.1rem;
    }
  }
}

// Range slider styles
.range-wrapper {
  .range-input {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e9ecef;
    outline: none;
    appearance: none;
    
    &::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3498db;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    
    &::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3498db;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
  }
  
  .range-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #6c757d;
  }
}

// Background options
.background-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  
  @media (min-width: 480px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
}

.option-btn {
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;
  min-height: 44px;
  
  @media (min-width: 480px) {
    padding: 0.5rem;
    min-height: auto;
    font-size: 0.85rem;
  }
  
  &:hover {
    border-color: #3498db;
    background: #f8f9fa;
  }
  
  &.active {
    border-color: #3498db;
    background: #3498db;
    color: white;
  }
}

// Quick actions
.quick-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  
  @media (min-width: 480px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
  transition: all 0.2s ease;
  min-height: 44px;
  font-size: 0.95rem;
  
  @media (min-width: 480px) {
    padding: 0.75rem 1rem;
    min-height: auto;
    font-size: 0.9rem;
  }
  
  .icon {
    font-size: 1rem;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &.reset-btn {
    background: #6c757d;
    color: white;
    
    &:hover {
      background: #5a6268;
    }
  }
  
  &.remove-btn {
    background: #e74c3c;
    color: white;
    
    &:hover {
      background: #c0392b;
    }
  }
  
  &.home-btn {
    background: #3498db;
    color: white;
    
    &:hover {
      background: #2980b9;
    }
  }
}

// Preview container
.preview-container {
  .preview-box {
    height: 200px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border: 2px solid #e1e8ed;
    
    @media (min-width: 768px) {
      height: 250px;
    }
    
    .preview-content {
      background: rgba(255, 255, 255, 0.9);
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      backdrop-filter: blur(10px);
      
      h4 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
        font-size: 1.1rem;
      }
      
      p {
        margin: 0;
        color: #6c757d;
        font-size: 0.9rem;
      }
    }
  }
}

// Mobile responsive adjustments
@media (max-width: 479px) {
  .color-presets {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .gradient-presets {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .background-options {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    gap: 1rem;
  }
  
  .action-btn {
    padding: 1rem;
    font-size: 1rem;
  }
}
</style>
