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

  @media (min-width: 768px) {
    padding: 1.25rem;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
    font-size: 1.2rem;
    color: #444;

    @media (min-width: 480px) {
      font-size: 1.25rem;
    }

    @media (min-width: 768px) {
      font-size: 1.3rem;
    }
  }

  .setting-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 500;
      font-size: 0.95rem;

      @media (max-width: 479px) {
        font-size: 1rem;
      }
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      min-height: 44px; // Touch-friendly minimum height
      -webkit-appearance: none; // Remove iOS styling

      @media (min-width: 480px) {
        padding: 0.5rem;
        min-height: auto;
      }

      &:focus {
        outline: none;
        border-color: var(--color-blue-7, #9fc3e7);
        box-shadow: 0 0 0 2px rgba(159, 195, 231, 0.2);
      }

      // Prevent zoom on iOS
      @media (max-width: 479px) {
        font-size: 16px;
      }
    }
  }

  .remove-btn,
  .home-btn {
    display: inline-block;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px; // Touch-friendly minimum height
    display: flex;
    align-items: center;
    justify-content: center;

    @media (min-width: 480px) {
      padding: 0.6rem 1rem;
      border-radius: 4px;
      min-height: auto;
      display: inline-block;
    }

    @media (max-width: 479px) {
      font-size: 1rem;
      flex: 1;
    }
  }

  .remove-btn {
    background-color: #f44336;
    color: white;
    margin-right: 0;

    @media (min-width: 480px) {
      margin-right: 0.75rem;
    }

    &:hover {
      background-color: #d32f2f;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .home-btn {
    background-color: var(--color-blue-7, #9fc3e7);
    color: white;

    &:hover {
      background-color: #7ba8d6;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .button-group {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 12px;

    @media (max-width: 479px) {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
}

.settings-container {
  max-width: 1000px;
  margin: 1rem auto;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (min-width: 480px) {
    margin: 1.5rem auto;
    padding: 1.25rem;
  }

  @media (min-width: 768px) {
    margin: 2rem auto;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .page-title {
    text-align: center;
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    padding: 0;

    @media (min-width: 480px) {
      font-size: 1.75rem;
    }

    @media (min-width: 768px) {
      text-align: left;
      font-size: 2rem;
    }
  }
}
</style>
