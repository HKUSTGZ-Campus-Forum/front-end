<template>
  <Transition name="update-toast">
    <aside v-if="isUpdateAvailable" class="update-toast" role="status" aria-live="polite">
      <div class="update-toast__badge">{{ t("pwa.update.badge") }}</div>
      <div class="update-toast__content">
        <h2>{{ t("pwa.update.title") }}</h2>
        <p>{{ t("pwa.update.description") }}</p>
        <small v-if="availableVersion">{{ t("pwa.update.versionLabel", { version: availableVersion }) }}</small>
      </div>
      <div class="update-toast__actions">
        <button
          class="update-toast__button update-toast__button--primary"
          :disabled="isApplyingUpdate"
          @click="applyUpdate"
        >
          {{ isApplyingUpdate ? t("pwa.update.updating") : t("pwa.update.apply") }}
        </button>
        <button
          class="update-toast__button update-toast__button--secondary"
          :disabled="isApplyingUpdate"
          @click="dismissUpdate"
        >
          {{ t("pwa.update.later") }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { isUpdateAvailable, isApplyingUpdate, availableVersion, dismissUpdate, applyUpdate } =
  useServiceWorkerUpdate();
</script>

<style scoped lang="scss">
.update-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 10000;
  width: min(420px, calc(100vw - 32px));
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(79, 70, 229, 0.18);
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.85), transparent 40%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(238, 242, 255, 0.96));
  box-shadow: 0 24px 60px rgba(79, 70, 229, 0.16);
  backdrop-filter: blur(12px);
}

.update-toast__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.update-toast__content {
  margin-top: 12px;

  h2 {
    margin: 0;
    color: #111827;
    font-size: 20px;
    line-height: 1.2;
  }

  p {
    margin: 8px 0 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.6;
  }

  small {
    display: block;
    margin-top: 8px;
    color: #6366f1;
    font-size: 12px;
  }
}

.update-toast__actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.update-toast__button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }
}

.update-toast__button--primary {
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  color: #fff;
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.22);
}

.update-toast__button--secondary {
  background: rgba(255, 255, 255, 0.75);
  color: #374151;
}

.update-toast-enter-active,
.update-toast-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.update-toast-enter-from,
.update-toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 640px) {
  .update-toast {
    right: 16px;
    bottom: 16px;
    left: 16px;
    width: auto;
  }

  .update-toast__actions {
    flex-direction: column;
  }
}
</style>
