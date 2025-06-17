<!-- components/ui/ErrorModal.vue -->
<template>
  <teleport to="body">
    <div v-if="show" class="error-overlay" @click="handleClose">
      <div class="error-container" @click.stop>
        <div class="error-icon-wrapper">
          <!-- 错误动画效果 -->
          <div class="error-loader"></div>
        </div>

        <h3 class="error-title">{{ title }}</h3>
        <p class="error-message">{{ message }}</p>

        <div class="error-footer">
          <button class="btn btn-error" @click="handleClose">
            {{ buttonText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "操作失败",
  },
  message: {
    type: String,
    default: "操作执行失败，请重试。",
  },
  buttonText: {
    type: String,
    default: "确定",
  },
});

const emit = defineEmits(["close"]);

const handleClose = () => {
  emit("close");
};
</script>

<style lang="scss" scoped>
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--modal-backdrop);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.error-container {
  background: var(--modal-bg);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: var(--modal-shadow, var(--shadow-large));
  max-width: 350px;
  width: 90%;
  animation: shakeIn 0.6s ease-out;
  border: 1px solid var(--border-primary);
}

.error-icon-wrapper {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

// 错误动画效果
.error-loader {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid var(--surface-secondary);
  border-left-color: var(--semantic-error);
  animation: error_animation_collect 1s linear 1 both;
}

// 错误圆圈旋转动画
@keyframes error_animation_collect {
  0% {
    transform: rotate(270deg);
    border-left-color: var(--semantic-error);
  }
  25% {
    border-left-color: var(--semantic-error);
  }
  50% {
    border-left-color: var(--semantic-error);
  }
  75% {
    border-left-color: var(--semantic-error);
  }
  100% {
    border-left-color: var(--surface-secondary);
    transform: rotate(0deg);
  }
}

// 叉号动画 - 第一条线
.error-loader::before {
  position: absolute;
  content: '';
  top: 50%;
  left: 50%;
  width: 40px;
  height: 4px;
  background: var(--semantic-error);
  transform: translate(-50%, -50%) rotate(45deg);
  transform-origin: center;
  animation: error_line1 0.3s 1s linear 1 both;
  opacity: 0;
}

// 叉号动画 - 第二条线
.error-loader::after {
  position: absolute;
  content: '';
  top: 50%;
  left: 50%;
  width: 40px;
  height: 4px;
  background: var(--semantic-error);
  transform: translate(-50%, -50%) rotate(-45deg);
  transform-origin: center;
  animation: error_line2 0.3s 1.3s linear 1 both;
  opacity: 0;
}

// 第一条线动画
@keyframes error_line1 {
  0% {
    opacity: 0;
    width: 0px;
  }
  100% {
    opacity: 1;
    width: 40px;
  }
}

// 第二条线动画
@keyframes error_line2 {
  0% {
    opacity: 0;
    width: 0px;
  }
  100% {
    opacity: 1;
    width: 40px;
  }
}

.error-title {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.error-message {
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.error-footer {
  margin-top: 1rem;
}

.btn-error {
  background: linear-gradient(135deg, var(--semantic-error), var(--interactive-active));
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 25px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-medium);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-large);
  }

  &:active {
    transform: translateY(0);
  }
}

// 弹窗进入动画
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes shakeIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateX(-30px);
  }
  25% {
    transform: scale(1.05) translateX(15px);
  }
  50% {
    opacity: 1;
    transform: scale(0.98) translateX(-10px);
  }
  75% {
    transform: scale(1.02) translateX(5px);
  }
  100% {
    transform: scale(1) translateX(0);
  }
}
</style>