<template>
  <div class="background-settings">
    <div class="setting-group">
      <label class="setting-label">背景颜色</label>
      <input
        type="color"
        :value="themeStore.backgroundColor"
        @input="updateBackgroundColor"
      />
    </div>

    <div class="setting-group">
      <label class="setting-label">背景图片</label>
      <input type="file" accept="image/*" @change="handleImageUpload" />
    </div>

    <div class="setting-group" v-if="themeStore.backgroundImage">
      <label class="setting-label"
        >图片透明度: {{ themeStore.backgroundOpacity }}</label
      >
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.1"
        :value="themeStore.backgroundOpacity"
        @input="updateBackgroundOpacity"
      />
    </div>
    <div class="button-container">
      <button
        v-if="themeStore.backgroundImage"
        class="remove-btn"
        @click="removeBackgroundImage"
      >
        移除背景图片
      </button>
      <button class="home-btn" @click="navigateToHome">返回主页</button>
    </div>
  </div>
</template>

<script setup>
import { useThemeStore } from "~/store/themeStore";

const themeStore = useThemeStore();

// 更新背景颜色
function updateBackgroundColor(event) {
  themeStore.setBackgroundColor(event.target.value);
}

// 处理图片上传
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
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

// 移除背景图片
function removeBackgroundImage() {
  themeStore.setBackgroundImage(null);
}

// 添加导航函数
function navigateToHome() {
  navigateTo("/");
}
</script>

<style lang="scss" scoped>
.background-settings {
  padding: 1rem;
  background-color: rgb(193, 243, 243);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 1000px;
  margin: 0 auto;
  font-size: 2 rem;

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .setting-group {
    margin-bottom: 1rem;
    .setting-label {
      font-size: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
    }

    input {
      width: 100%;
    }
  }

  .remove-btn {
    padding: 0.5rem 1rem;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #d32f2f;
    }
  }
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 1rem;
}

.home-btn {
  padding: 0.5rem 1rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0d8bf2;
  }
}

.button-container {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  gap: 1rem; /* 按钮间距 */
  margin-top: 1.5rem;

  .remove-btn,
  .home-btn {
    width: 20%; /* 让按钮占满容器宽度 */
    /* 其他样式保持不变 */
  }
}
</style>
