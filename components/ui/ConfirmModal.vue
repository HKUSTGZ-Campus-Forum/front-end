<!-- components/ui/ConfirmModal.vue -->
<template>
  <teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <i class="fas fa-exclamation-triangle warning-icon"></i>
          <h3>{{ resolvedTitle }}</h3>
        </div>
        
        <div class="modal-body">
          <p>{{ resolvedMessage }}</p>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="handleCancel">
            {{ resolvedCancelText }}
          </button>
          <button class="btn btn-confirm" @click="handleConfirm">
            {{ resolvedConfirmText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue';

const { t } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: ''
  },
  cancelText: {
    type: String,
    default: ''
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['confirm', 'cancel', 'close']);
const resolvedTitle = computed(() => props.title || t('modals.confirm.title'));
const resolvedMessage = computed(() => props.message || t('modals.confirm.message'));
const resolvedConfirmText = computed(() => props.confirmText || t('actions.submit'));
const resolvedCancelText = computed(() => props.cancelText || t('actions.cancel'));

const handleConfirm = () => {
  emit('confirm');
  emit('close');
};

const handleCancel = () => {
  emit('cancel');
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleCancel();
  }
};
</script>

<style lang="scss" scoped>
.modal-overlay {
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

.modal-container {
  background: var(--modal-bg);
  border-radius: 12px;
  box-shadow: var(--modal-shadow, var(--shadow-large));
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.3s ease-out;
  border: 1px solid var(--border-primary);
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-secondary);

  .warning-icon {
    font-size: 3rem;
    color: var(--semantic-warning);
    margin-bottom: 0.5rem;
    animation: pulse 2s infinite;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }
}

.modal-body {
  padding: 1rem 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.5;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;

  &.btn-cancel {
    background-color: var(--surface-secondary);
    color: var(--text-muted);
    border: 1px solid var(--border-secondary);

    &:hover {
      background-color: var(--surface-elevated);
      transform: translateY(-1px);
    }
  }

  &.btn-confirm {
    background-color: var(--semantic-error);
    color: var(--text-inverse);

    &:hover {
      background-color: var(--interactive-active);
      transform: translateY(-1px);
      box-shadow: var(--shadow-medium);
    }
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

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
