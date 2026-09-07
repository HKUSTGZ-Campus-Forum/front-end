<script setup lang="ts">
import type { MakerSpace } from '~/types/makerspace'
const props = defineProps<{ space: MakerSpace }>()
const emit = defineEmits<{ updated: [space: MakerSpace] }>()
const { t } = useI18n()
const { isLoggedIn, authInitialized } = useAuth()
const { getLocalePath } = useAppLocale()
const { request, errorMessage } = useMakerSpace()
const route = useRoute()
const busy = ref(false)
const error = ref('')
async function change(kind: 'likes' | 'favorites') {
  if (busy.value || !authInitialized.value) return
  if (!isLoggedIn.value) {
    await navigateTo({ path: getLocalePath('/login'), query: { redirect: route.fullPath } })
    return
  }
  busy.value = true; error.value = ''
  try {
    const selected = kind === 'likes' ? props.space.is_liked : props.space.is_favorited
    const state = await request<Pick<MakerSpace, 'likes_count' | 'favorites_count' | 'is_liked' | 'is_favorited'>>(`/${props.space.slug}/${kind}`, selected ? 'DELETE' : 'PUT')
    emit('updated', { ...props.space, ...state })
  } catch (cause) { error.value = errorMessage(cause) }
  finally { busy.value = false }
}
</script>
<template>
  <div v-if="space.status === 'published'" class="maker-social">
    <div class="maker-social__buttons">
      <button type="button" :aria-pressed="!!space.is_liked" :disabled="busy || !authInitialized" @click="change('likes')"><Icon name="lucide:heart" aria-hidden="true" /><span>{{ t(space.is_liked ? 'makerspace.social.liked' : 'makerspace.social.like') }}</span><span class="maker-social__count">{{ space.likes_count ?? 0 }}</span></button>
      <button type="button" :aria-pressed="!!space.is_favorited" :disabled="busy || !authInitialized" @click="change('favorites')"><Icon name="lucide:bookmark" aria-hidden="true" /><span>{{ t(space.is_favorited ? 'makerspace.social.favorited' : 'makerspace.social.favorite') }}</span><span class="maker-social__count">{{ space.favorites_count ?? 0 }}</span></button>
    </div>
    <p v-if="error" class="maker-social__error" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.maker-social { min-width: 0; }
.maker-social__buttons { display: flex; flex-wrap: wrap; gap: 8px; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 999px; background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: .875rem; cursor: pointer; }
button .iconify { width: 18px; height: 18px; flex: none; }
button[aria-pressed=true] { background: var(--surface-secondary); color: var(--interactive-primary); border-color: var(--interactive-primary); }
button:hover:not(:disabled) { color: var(--interactive-primary); }
button:focus-visible { outline: 3px solid var(--interactive-primary); outline-offset: 3px; }
button:disabled { opacity: .6; cursor: wait; }
.maker-social__count { font-variant-numeric: tabular-nums; }
.maker-social__error { margin: 8px 0 0; font-size: .875rem; color: var(--text-primary); }
</style>
