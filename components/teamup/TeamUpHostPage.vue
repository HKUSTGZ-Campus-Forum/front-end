<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

type TeamUpMessage =
  | { type: 'teamup:ready'; path?: string }
  | { type: 'teamup:height'; height?: number }
  | { type: 'teamup:navigate'; path?: string }

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { locale, getLocalePath } = useAppLocale()
const { isDarkTheme } = useTheme()

const frame = ref<HTMLIFrameElement>()
const frameSrc = ref('')
const frameHeight = ref(640)
const isReady = ref(false)
const loadError = ref('')
let readyTimer: ReturnType<typeof setTimeout> | undefined

const innerPath = computed(() => {
  const localizedPrefix = locale.value === 'en' ? '/en/teamup' : '/teamup'
  let path = route.path.startsWith(localizedPrefix)
    ? route.path.slice(localizedPrefix.length)
    : route.path.replace(/^\/en(?=\/)/, '').replace(/^\/teamup/, '')
  if (!path) path = '/'
  if (!path.startsWith('/')) path = `/${path}`
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(route.query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item != null) query.append(key, String(item))
    }
  }
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
})

function embeddedUrl() {
  const [path, existingQuery = ''] = innerPath.value.split('?')
  const runtimePath = path === '/' ? '/teamup/app/' : `/teamup/app${path}`
  return existingQuery ? `${runtimePath}?${existingQuery}` : runtimePath
}

function isSafeInnerPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('..')
}

function sendHostState() {
  if (!frame.value?.contentWindow || !process.client) return
  frame.value.contentWindow.postMessage({
    type: 'unikorn:teamup:state',
    locale: locale.value,
    theme: isDarkTheme.value ? 'deep-dark' : 'keguang-blue',
    path: innerPath.value,
  }, window.location.origin)
}

function startReadyTimer() {
  if (readyTimer) clearTimeout(readyTimer)
  readyTimer = setTimeout(() => {
    if (!isReady.value) loadError.value = t('teamupIntegration.loadErrorBody')
  }, 12000)
}

async function loadFrame() {
  loadError.value = ''
  isReady.value = false
  frameSrc.value = ''
  try {
    const response = await fetch('/teamup/app/health', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`TeamUp health returned ${response.status}`)
    frameSrc.value = embeddedUrl()
    startReadyTimer()
  } catch {
    loadError.value = t('teamupIntegration.loadErrorBody')
  }
}

async function navigateFromFrame(path: string) {
  const parsed = new URL(path, window.location.origin)
  const suffix = parsed.pathname === '/' ? '' : parsed.pathname
  const localizedPath = getLocalePath(`/teamup${suffix}`)
  const query = Object.fromEntries(parsed.searchParams.entries())
  if (route.path !== localizedPath || JSON.stringify(route.query) !== JSON.stringify(query)) {
    await router.replace({ path: localizedPath, query })
  }
}

function onMessage(event: MessageEvent<TeamUpMessage>) {
  if (event.origin !== window.location.origin || event.source !== frame.value?.contentWindow) return
  const message = event.data
  if (!message || typeof message.type !== 'string') return
  if (message.type === 'teamup:ready') {
    isReady.value = true
    loadError.value = ''
    if (readyTimer) clearTimeout(readyTimer)
    sendHostState()
  } else if (message.type === 'teamup:height' && typeof message.height === 'number' && Number.isFinite(message.height)) {
    frameHeight.value = Math.min(20000, Math.max(480, Math.ceil(Number(message.height))))
  } else if (message.type === 'teamup:navigate' && isSafeInnerPath(message.path)) {
    void navigateFromFrame(message.path)
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  void loadFrame()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  if (readyTimer) clearTimeout(readyTimer)
})

watch([innerPath, locale, isDarkTheme], sendHostState, { flush: 'post' })
</script>

<template>
  <section class="teamup-host" :aria-busy="!isReady && !loadError">
    <div v-if="loadError" class="teamup-host__state" role="alert">
      <span class="teamup-host__state-icon" aria-hidden="true">
        <Icon name="lucide:unplug" />
      </span>
      <h1>{{ t('teamupIntegration.loadErrorTitle') }}</h1>
      <p>{{ loadError }}</p>
      <button type="button" class="teamup-host__retry" @click="loadFrame">
        <Icon name="lucide:refresh-cw" aria-hidden="true" />
        {{ t('teamupIntegration.retry') }}
      </button>
    </div>

    <template v-else>
      <div v-if="!isReady" class="teamup-host__loading" role="status">
        <span class="teamup-host__loading-line teamup-host__loading-line--nav" />
        <span class="teamup-host__loading-line teamup-host__loading-line--title" />
        <span class="teamup-host__loading-line teamup-host__loading-line--copy" />
        <span class="teamup-host__loading-card" />
        <span class="teamup-host__sr-only">{{ t('teamupIntegration.loading') }}</span>
      </div>
      <iframe
        v-if="frameSrc"
        ref="frame"
        class="teamup-host__frame"
        :class="{ 'teamup-host__frame--ready': isReady }"
        :src="frameSrc"
        :title="t('teamupIntegration.frameTitle')"
        :style="{ height: `${frameHeight}px` }"
      />
    </template>
  </section>
</template>

<style scoped lang="scss">
.teamup-host {
  position: relative;
  width: 100%;
  min-height: 540px;
}

.teamup-host__frame {
  display: block;
  width: 100%;
  min-height: 480px;
  border: 0;
  background: transparent;
  opacity: 0;
  transition: opacity 180ms ease-out;

  &--ready {
    opacity: 1;
  }
}

.teamup-host__loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 24px;
}

.teamup-host__loading-line,
.teamup-host__loading-card {
  display: block;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-secondary) 82%, var(--border-secondary));
  border-radius: 10px;
  animation: teamup-pulse 1.4s ease-in-out infinite alternate;
}

.teamup-host__loading-line {
  height: 22px;

  &--nav { width: min(520px, 82%); }
  &--title { width: min(300px, 58%); height: 34px; margin-top: 20px; }
  &--copy { width: min(620px, 90%); }
}

.teamup-host__loading-card {
  height: 230px;
  margin-top: 18px;
}

.teamup-host__state {
  width: min(100% - 32px, 680px);
  margin: 48px auto;
  padding: 40px 28px;
  text-align: center;
  color: var(--text-primary);
  background: var(--surface-primary);
  border-radius: 14px;
  box-shadow: var(--shadow-small);

  h1 {
    margin: 14px 0 8px;
    font-size: 1.35rem;
  }

  p {
    max-width: 56ch;
    margin: 0 auto 22px;
    color: var(--text-secondary);
    line-height: 1.65;
  }
}

.teamup-host__state-icon {
  display: inline-grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: var(--interactive-active);
  background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
  border-radius: 50%;

  :deep(svg) { width: 24px; height: 24px; }
}

.teamup-host__retry {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  color: var(--text-inverse);
  font-weight: 650;
  background: var(--interactive-active);
  border: 0;
  border-radius: 12px;

  &:hover { background: var(--btn-primary-bg-hover); }
  &:focus-visible { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent); outline-offset: 2px; }
}

.teamup-host__sr-only {
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

@keyframes teamup-pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

@media (max-width: 640px) {
  .teamup-host__loading { padding: 18px 16px; }
  .teamup-host__state { margin-block: 28px; padding: 32px 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .teamup-host__frame { transition: none; }
  .teamup-host__loading-line,
  .teamup-host__loading-card { animation: none; }
}
</style>
