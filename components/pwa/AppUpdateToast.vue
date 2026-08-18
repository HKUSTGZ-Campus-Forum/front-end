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
  border: 1px solid color-mix(in srgb, var(--semantic-purple) 25%, transparent);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--semantic-purple) 14%, var(--surface-elevated)), transparent 40%),
    var(--surface-elevated);
  box-shadow: 0 24px 60px color-mix(in srgb, var(--semantic-purple) 16%, transparent);
  backdrop-filter: blur(12px);
}

.update-toast__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--purple-background);
  color: var(--purple-color);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.update-toast__content {
  margin-top: 12px;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 20px;
    line-height: 1.2;
  }

  p {
    margin: 8px 0 0;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.6;
  }

  small {
    display: block;
    margin-top: 8px;
    color: var(--purple-color);
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
  background: var(--semantic-purple);
  color: var(--text-inverse);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--semantic-purple) 22%, transparent);
  &:hover {
    background: color-mix(in srgb, var(--semantic-purple) 85%, white);
  }
}

.update-toast__button--secondary {
  background: var(--surface-secondary);
  color: var(--text-secondary);
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
