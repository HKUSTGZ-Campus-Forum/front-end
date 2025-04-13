<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePersistHomeStore } from "~/store/homeStore";
import BackgroundSettings from "~/components/setting/BackgroundSettings.vue";

// 获取主页状态
const homeStore = usePersistHomeStore();
</script>

<template>
  <HomeContainer>
    <div class="settings-container">
      <h1 class="page-title">背景设置</h1>
      <BackgroundSettings />
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
.background-settings {
  padding: 1rem;
  background-color: rgba(193, 243, 243, 0.6); /* 降低透明度以使背景更微妙 */
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
    font-size: 1.3rem;
    color: #444;
  }

  .setting-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 500;
    }

    input {
      width: 100%;
    }
  }

  .remove-btn,
  .home-btn {
    display: inline-block;
    padding: 0.6rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .remove-btn {
    background-color: #f44336;
    color: white;
    margin-right: 0.75rem;

    &:hover {
      background-color: #d32f2f;
    }
  }

  .home-btn {
    background-color: var(--color-blue-7, #9fc3e7);
    color: white;

    &:hover {
      background-color: #7ba8d6;
    }
  }

  .button-group {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}

.settings-container {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  
  .page-title {
    text-align: left;  /* 改为左对齐，原来是居中 */
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    padding-left: 0;  /* 确保没有左内边距 */
  }
}
</style>
