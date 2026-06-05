<template>
  <teleport to="body">
    <div v-if="show" class="success-overlay" @click="handleClose">
      <div class="success-container" @click.stop>
        <div class="success-icon-wrapper">
          <div class="loader"></div>
        </div>

        <h3 class="success-title">{{ resolvedTitle }}</h3>
        <p class="success-message">{{ resolvedMessage }}</p>

        <div class="success-footer" v-if="showButton">
          <button class="btn btn-success" @click="handleClose">
            {{ resolvedButtonText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, watch } from "vue";

const { t } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  buttonText: {
    type: String,
    default: "",
  },
  showButton: {
    type: Boolean,
    default: true,
  },
  autoClose: {
    type: Boolean,
    default: true,
  },
  autoCloseDelay: {
    type: Number,
    default: 3000,
  },
});

const emit = defineEmits(["close"]);
const resolvedTitle = computed(() => props.title || t("modals.success.title"));
const resolvedMessage = computed(() => props.message || t("modals.success.message"));
const resolvedButtonText = computed(() => props.buttonText || t("actions.submit"));

const handleClose = () => {
  emit("close");
};

watch(
  () => props.show,
  (newShow) => {
    if (newShow && props.autoClose) {
      setTimeout(() => {
        handleClose();
      }, props.autoCloseDelay);
    }
  }
);
</script>

<style lang="scss" scoped>
.success-overlay {
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

.success-container {
  background: var(--modal-bg);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: var(--modal-shadow, var(--shadow-large));
  max-width: 350px;
  width: 90%;
  animation: bounceIn 0.6s ease-out;
  border: 1px solid var(--border-primary);
}

.success-icon-wrapper {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.success-title {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.success-message {
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.success-footer {
  margin-top: 1rem;
}

.btn-success {
  background: linear-gradient(135deg, var(--semantic-success), var(--interactive-primary));
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(-50px);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) translateY(0);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes checkmark {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.loader {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid var(--surface-secondary);
  border-left-color: var(--semantic-success);
  animation: animation_collect 1s linear 1 both;
}

@keyframes animation_collect {
  0% {
    transform: rotate(270deg);
    border-left-color: var(--semantic-success);
  }
  25% {
    border-left-color: var(--semantic-success);
  }
  50% {
    border-left-color: var(--semantic-success);
  }
  75% {
    border-left-color: var(--semantic-success);
  }
  100% {
    border-left-color: var(--surface-secondary);
    transform: rotate(0deg);
  }
}

.loader::before {
  position: absolute;
  content: "";
  top: 50%;
  left: 15px;
  border: 4px solid var(--semantic-success);
  border-left-width: 0;
  border-bottom-width: 0;
  transform: scaleX(-1) rotate(135deg);
  transform-origin: left top;
  animation: animation_true 0.5s 1s linear 1 both;
  opacity: 0;
}

@keyframes animation_true {
  0% {
    opacity: 0;
    width: 0px;
    height: 0px;
  }
  33% {
    opacity: 1;
    width: 20px;
    height: 0px;
  }
  100% {
    opacity: 1;
    width: 20px;
    height: 40px;
  }
}

.success-title {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.success-message {
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.success-footer {
  margin-top: 1rem;
}

.btn-success {
  background: linear-gradient(135deg, var(--semantic-success), var(--interactive-primary));
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(-50px);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) translateY(0);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}
</style>
