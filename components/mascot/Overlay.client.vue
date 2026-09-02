<template>
  <Teleport to="body">
    <aside
      v-if="enabled"
      class="mascot-overlay"
      :class="{ 'is-collapsed': collapsed }"
      :aria-label="t('mascot.label')"
    >
      <div v-show="!collapsed" class="mascot-stage">
        <canvas
          ref="canvasRef"
          class="mascot-canvas"
          width="280"
          height="330"
          role="button"
          tabindex="0"
          :aria-label="t('mascot.interact')"
          @keydown.enter.prevent="playReaction"
          @keydown.space.prevent="playReaction"
        />

        <div
          class="mascot-quick-actions"
          :class="{ 'is-open': modelSettingsOpen }"
          :aria-label="t('mascot.quickActions')"
        >
          <button
            type="button"
            class="mascot-action-button"
            :aria-label="t('mascot.configureModel')"
            :title="t('mascot.configureModel')"
            @click.stop="openModelSettings"
          >
            <Icon name="lucide:settings-2" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="mascot-action-button"
            :aria-label="t('mascot.viewConversationHistory')"
            :title="t('mascot.viewConversationHistory')"
            @click.stop="openChatHistory"
          >
            <Icon name="lucide:history" aria-hidden="true" />
          </button>
        </div>

        <div v-if="status === 'loading'" class="mascot-loading" role="status">
          <span class="mascot-spinner" aria-hidden="true" />
          <span class="sr-only">{{ t("mascot.loading") }}</span>
        </div>

        <div v-else-if="status === 'error'" class="mascot-error" role="status">
          <Icon name="lucide:cloud-off" aria-hidden="true" />
          <span>{{ t("mascot.loadFailed") }}</span>
          <button
            type="button"
            class="mascot-icon-button"
            :aria-label="t('mascot.retry')"
            :title="t('mascot.retry')"
            @click="loadMascot"
          >
            <Icon name="lucide:refresh-cw" aria-hidden="true" />
          </button>
        </div>

        <Transition name="mascot-bubble">
          <p v-if="message" class="mascot-message" aria-live="polite">
            {{ message }}
          </p>
        </Transition>

        <Transition name="mascot-panel">
          <form
            v-if="modelSettingsOpen"
            class="mascot-model-panel"
            @submit.prevent="saveModelSettings"
          >
            <header>
              <strong>{{ t("mascot.modelSettingsTitle") }}</strong>
              <button
                type="button"
                class="mascot-panel-close"
                :aria-label="t('common.close')"
                :title="t('common.close')"
                @click="closeModelSettings"
              >
                <Icon name="lucide:x" aria-hidden="true" />
              </button>
            </header>
            <label>
              <span>{{ t("mascot.modelUrlLabel") }}</span>
              <input
                v-model="modelUrlDraft"
                type="text"
                inputmode="url"
                :placeholder="t('mascot.modelUrlPlaceholder')"
              />
            </label>
            <p v-if="modelSettingsError" class="mascot-panel-error" role="alert">
              {{ modelSettingsError }}
            </p>
            <div class="mascot-panel-actions">
              <button
                type="button"
                class="mascot-panel-button"
                @click="resetModelSettings"
              >
                <Icon name="lucide:rotate-ccw" aria-hidden="true" />
                <span>{{ t("mascot.resetModel") }}</span>
              </button>
              <button type="submit" class="mascot-panel-button is-primary">
                <Icon name="lucide:check" aria-hidden="true" />
                <span>{{ t("mascot.saveModel") }}</span>
              </button>
            </div>
          </form>
        </Transition>
      </div>

      <button
        type="button"
        class="mascot-icon-button mascot-toggle"
        :class="{ 'is-collapsed': collapsed }"
        :aria-label="t(collapsed ? 'mascot.expand' : 'mascot.collapse')"
        :title="t(collapsed ? 'mascot.expand' : 'mascot.collapse')"
        :aria-expanded="!collapsed"
        @click="toggleCollapsed"
      >
        <Icon
          :name="collapsed ? 'lucide:chevron-up' : 'lucide:chevron-down'"
          aria-hidden="true"
        />
      </button>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n, useRuntimeConfig } from "#imports";
import { L2dMascotRenderer } from "~/utils/mascotL2d";
import {
  isMascotModelUrlCandidate,
  normalizeMascotModelUrl,
} from "~/utils/mascotModelUrl";

type MascotStatus = "idle" | "loading" | "ready" | "error";

const STORAGE_KEY = "unikorn_mascot_collapsed";
const MODEL_STORAGE_KEY = "unikorn_mascot_model_url";
const config = useRuntimeConfig();
const { t } = useI18n();
const emit = defineEmits<{
  "open-chat-history": [];
}>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const collapsed = ref(true);
const status = ref<MascotStatus>("idle");
const message = ref("");
const customModelUrl = ref("");
const modelUrlDraft = ref("");
const modelSettingsOpen = ref(false);
const modelSettingsError = ref("");
const renderer = new L2dMascotRenderer();
const enabled = computed(() => String(config.public.mascotEnabled) === "true");
const defaultModelUrl = computed(() => String(config.public.mascotModelUrl || ""));
const modelUrl = computed(() => customModelUrl.value || defaultModelUrl.value);
const modelScale = computed(() => Number(config.public.mascotScale));
const modelPosition = computed<[number, number]>(() => [
  Number(config.public.mascotPositionX),
  Number(config.public.mascotPositionY),
]);

let messageTimer: ReturnType<typeof setTimeout> | undefined;
let mouthTimer: ReturnType<typeof setInterval> | undefined;
let mouthStopTimer: ReturnType<typeof setTimeout> | undefined;
let resizeObserver: ResizeObserver | undefined;
let disposed = false;

function clearSpeechTimers(): void {
  clearTimeout(messageTimer);
  clearInterval(mouthTimer);
  clearTimeout(mouthStopTimer);
  renderer.setMouthOpen(0);
}

function animateSpeech(text: string): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  clearInterval(mouthTimer);
  clearTimeout(mouthStopTimer);
  mouthTimer = window.setInterval(() => {
    renderer.setMouthOpen(0.25 + Math.random() * 0.75);
  }, 110);
  mouthStopTimer = window.setTimeout(() => {
    clearInterval(mouthTimer);
    renderer.setMouthOpen(0);
  }, Math.min(2600, Math.max(900, text.length * 110)));
}

function showMessage(text: string): void {
  clearTimeout(messageTimer);
  message.value = text;
  animateSpeech(text);
  messageTimer = window.setTimeout(() => {
    message.value = "";
  }, 4800);
}

function playReaction(): void {
  if (status.value !== "ready") return;
  renderer.playReaction();
  showMessage(t("mascot.reaction"));
}

function openChatHistory(): void {
  emit("open-chat-history");
  showMessage(t("mascot.historyOpening"));
}

async function loadMascot(): Promise<void> {
  if (!enabled.value || !canvasRef.value || !modelUrl.value || disposed) return;
  status.value = "loading";
  message.value = "";

  try {
    await renderer.mount(canvasRef.value, {
      modelUrl: modelUrl.value,
      scale: modelScale.value,
      position: modelPosition.value,
      onTap: playReaction,
    });
    if (disposed) return;
    status.value = "ready";
    renderer.resize();
    showMessage(t("mascot.greeting"));
  } catch (error) {
    console.error("Failed to load the forum mascot", error);
    if (!disposed) status.value = "error";
  }
}

function rememberCollapsed(value: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(value));
}

function collapse(): void {
  collapsed.value = true;
  modelSettingsOpen.value = false;
  message.value = "";
  clearSpeechTimers();
  rememberCollapsed(true);
}

async function expand(): Promise<void> {
  collapsed.value = false;
  rememberCollapsed(false);
  await nextTick();
  if (!renderer.isMounted && status.value !== "loading") await loadMascot();
  else renderer.resize();
}

async function toggleCollapsed(): Promise<void> {
  if (collapsed.value) await expand();
  else collapse();
}

function openModelSettings(): void {
  modelUrlDraft.value = customModelUrl.value || defaultModelUrl.value;
  modelSettingsError.value = "";
  modelSettingsOpen.value = true;
}

function closeModelSettings(): void {
  modelSettingsOpen.value = false;
  modelSettingsError.value = "";
}

async function applyModelUrl(value: string): Promise<void> {
  customModelUrl.value = value;
  if (value) localStorage.setItem(MODEL_STORAGE_KEY, value);
  else localStorage.removeItem(MODEL_STORAGE_KEY);
  clearSpeechTimers();
  message.value = "";
  status.value = "idle";
  renderer.dispose();
  modelSettingsOpen.value = false;
  await nextTick();
  if (!collapsed.value) await loadMascot();
}

async function saveModelSettings(): Promise<void> {
  const nextUrl = normalizeMascotModelUrl(modelUrlDraft.value);
  if (nextUrl && !isMascotModelUrlCandidate(nextUrl)) {
    modelSettingsError.value = t("mascot.modelUrlInvalid");
    return;
  }
  const usesDefault = !nextUrl || nextUrl === defaultModelUrl.value;
  await applyModelUrl(usesDefault ? "" : nextUrl);
  showMessage(t(usesDefault ? "mascot.modelReset" : "mascot.modelSaved"));
}

async function resetModelSettings(): Promise<void> {
  modelUrlDraft.value = "";
  modelSettingsError.value = "";
  await applyModelUrl("");
  showMessage(t("mascot.modelReset"));
}

function setMouthOpen(value: number): boolean {
  return renderer.setMouthOpen(value);
}

function speak(text: string): void {
  if (!text.trim()) return;
  showMessage(text.trim());
}

defineExpose({ playReaction, setMouthOpen, speak });

onMounted(async () => {
  if (!enabled.value) return;
  const storedModelUrl = normalizeMascotModelUrl(
    localStorage.getItem(MODEL_STORAGE_KEY) || ""
  );
  if (storedModelUrl && isMascotModelUrlCandidate(storedModelUrl)) {
    customModelUrl.value = storedModelUrl;
  } else if (storedModelUrl) {
    localStorage.removeItem(MODEL_STORAGE_KEY);
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  const compactByDefault = window.matchMedia(
    "(max-width: 720px), (prefers-reduced-motion: reduce)"
  ).matches;
  collapsed.value = stored === null ? compactByDefault : stored === "true";

  await nextTick();
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => renderer.resize());
    resizeObserver.observe(canvasRef.value);
  }
  if (!collapsed.value) await loadMascot();
});

onBeforeUnmount(() => {
  disposed = true;
  clearSpeechTimers();
  resizeObserver?.disconnect();
  renderer.dispose();
});
</script>

<style scoped>
.mascot-overlay {
  position: fixed;
  left: 28px;
  bottom: calc(26px + env(safe-area-inset-bottom, 0px));
  z-index: 1100;
  width: 280px;
  height: 330px;
  pointer-events: none;
}

.mascot-overlay.is-collapsed {
  width: 44px;
  height: 44px;
}

.mascot-stage {
  position: relative;
  width: 280px;
  height: 330px;
}

.mascot-canvas {
  display: block;
  width: 280px;
  height: 330px;
  cursor: pointer;
  pointer-events: auto;
  filter: drop-shadow(var(--shadow-large));
  outline: none;
}

.mascot-canvas:focus-visible,
.mascot-icon-button:focus-visible,
.mascot-action-button:focus-visible,
.mascot-panel-button:focus-visible,
.mascot-panel-close:focus-visible,
.mascot-toggle:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--interactive-primary) 55%, transparent);
  outline-offset: 2px;
}

.mascot-icon-button {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  min-height: 0;
  padding: 0;
  border: 1px solid var(--border-primary);
  border-radius: 50%;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--shadow-medium);
  cursor: pointer;
  pointer-events: auto;
}

.mascot-icon-button:hover {
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.mascot-icon-button :deep(svg) {
  width: 19px;
  height: 19px;
}

.mascot-quick-actions {
  position: absolute;
  left: 8px;
  bottom: 52px;
  z-index: 3;
  display: grid;
  gap: 10px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 160ms ease, transform 160ms ease;
  pointer-events: none;
}

.mascot-stage:hover .mascot-quick-actions,
.mascot-stage:focus-within .mascot-quick-actions,
.mascot-quick-actions.is-open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.mascot-action-button {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  min-height: 0;
  padding: 0;
  border: 1px solid var(--border-primary);
  border-radius: 50%;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--shadow-medium);
  cursor: pointer;
  pointer-events: auto;
}

.mascot-action-button:hover {
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.mascot-action-button :deep(svg) {
  width: 20px;
  height: 20px;
}

.mascot-toggle {
  position: absolute;
  left: 2px;
  bottom: 2px;
  z-index: 2;
}

.mascot-toggle.is-collapsed {
  left: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
}

.mascot-toggle.is-collapsed :deep(svg) {
  width: 23px;
  height: 23px;
}

.mascot-loading,
.mascot-error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.mascot-loading {
  display: grid;
  place-items: center;
}

.mascot-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: mascot-spin 0.8s linear infinite;
}

.mascot-error {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 240px;
  padding: 10px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--shadow-medium);
  font-size: 0.82rem;
}

.mascot-message {
  position: absolute;
  left: 46px;
  bottom: 14px;
  max-width: 210px;
  margin: 0;
  padding: 9px 11px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--shadow-medium);
  font-size: 0.84rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  pointer-events: none;
}

.mascot-model-panel {
  position: absolute;
  left: 56px;
  bottom: 60px;
  z-index: 4;
  display: grid;
  gap: 10px;
  width: min(290px, calc(100vw - 40px));
  padding: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--shadow-large);
  font-size: 0.82rem;
  pointer-events: auto;
}

.mascot-model-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mascot-model-panel label {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
}

.mascot-model-panel input {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-secondary);
  font: inherit;
}

.mascot-model-panel input:focus {
  border-color: var(--interactive-primary);
  outline: none;
}

.mascot-panel-close {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
}

.mascot-panel-close:hover {
  color: var(--text-primary);
  background: var(--surface-secondary);
}

.mascot-panel-close :deep(svg) {
  width: 17px;
  height: 17px;
}

.mascot-panel-error {
  margin: 0;
  color: var(--semantic-error-color);
  font-size: 0.78rem;
  line-height: 1.4;
}

.mascot-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mascot-panel-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-secondary);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.mascot-panel-button.is-primary {
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.mascot-panel-button:hover {
  border-color: var(--interactive-primary);
}

.mascot-panel-button :deep(svg) {
  width: 16px;
  height: 16px;
}

.mascot-bubble-enter-active,
.mascot-bubble-leave-active,
.mascot-panel-enter-active,
.mascot-panel-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.mascot-bubble-enter-from,
.mascot-bubble-leave-to,
.mascot-panel-enter-from,
.mascot-panel-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.sr-only {
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

@keyframes mascot-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .mascot-overlay,
  .mascot-stage {
    width: 210px;
    height: 250px;
  }

  .mascot-canvas {
    width: 210px;
    height: 250px;
  }

  .mascot-message {
    max-width: 155px;
  }

  .mascot-quick-actions {
    left: 6px;
    bottom: 48px;
  }

  .mascot-action-button {
    width: 38px;
    height: 38px;
  }

  .mascot-model-panel {
    left: 46px;
    bottom: 54px;
    width: min(245px, calc(100vw - 24px));
  }

  .mascot-panel-actions {
    flex-wrap: wrap;
  }

  .mascot-error {
    width: 188px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mascot-spinner {
    animation-duration: 1.6s;
  }

  .mascot-bubble-enter-active,
  .mascot-bubble-leave-active,
  .mascot-panel-enter-active,
  .mascot-panel-leave-active,
  .mascot-quick-actions {
    transition: none;
  }
}

@media print {
  .mascot-overlay {
    display: none;
  }
}
</style>
