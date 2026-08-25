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

        <button
          type="button"
          class="mascot-icon-button mascot-collapse"
          :aria-label="t('mascot.collapse')"
          :title="t('mascot.collapse')"
          @click="collapse"
        >
          <Icon name="lucide:chevron-down" aria-hidden="true" />
        </button>
      </div>

      <button
        v-if="collapsed"
        type="button"
        class="mascot-launcher"
        :aria-label="t('mascot.expand')"
        :title="t('mascot.expand')"
        @click="expand"
      >
        <Icon name="lucide:cat" aria-hidden="true" />
      </button>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n, useRuntimeConfig } from "#imports";
import { L2dMascotRenderer } from "~/utils/mascotL2d";

type MascotStatus = "idle" | "loading" | "ready" | "error";

const STORAGE_KEY = "unikorn_mascot_collapsed";
const config = useRuntimeConfig();
const { t } = useI18n();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const collapsed = ref(true);
const status = ref<MascotStatus>("idle");
const message = ref("");
const renderer = new L2dMascotRenderer();
const enabled = computed(() => String(config.public.mascotEnabled) === "true");
const modelUrl = computed(() => String(config.public.mascotModelUrl || ""));

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

async function loadMascot(): Promise<void> {
  if (!enabled.value || !canvasRef.value || !modelUrl.value || disposed) return;
  status.value = "loading";
  message.value = "";

  try {
    await renderer.mount(canvasRef.value, {
      modelUrl: modelUrl.value,
      scale: 0.36,
      position: [0, -0.22],
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
.mascot-launcher:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--interactive-primary) 55%, transparent);
  outline-offset: 2px;
}

.mascot-icon-button,
.mascot-launcher {
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

.mascot-icon-button:hover,
.mascot-launcher:hover {
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.mascot-icon-button :deep(svg),
.mascot-launcher :deep(svg) {
  width: 19px;
  height: 19px;
}

.mascot-collapse {
  position: absolute;
  left: 2px;
  bottom: 2px;
}

.mascot-launcher {
  width: 44px;
  height: 44px;
}

.mascot-launcher :deep(svg) {
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

.mascot-bubble-enter-active,
.mascot-bubble-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.mascot-bubble-enter-from,
.mascot-bubble-leave-to {
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

  .mascot-error {
    width: 188px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mascot-spinner {
    animation-duration: 1.6s;
  }

  .mascot-bubble-enter-active,
  .mascot-bubble-leave-active {
    transition: none;
  }
}

@media print {
  .mascot-overlay {
    display: none;
  }
}
</style>
