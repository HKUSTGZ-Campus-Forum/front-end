<script setup lang="ts">
import type { FileRecord } from '~/types/file'
import type {
  HomeCarouselAdminSlide,
  HomeCarouselLocale,
  HomeCarouselWritePayload,
} from '~/types/homeCarousel'

definePageMeta({ middleware: 'admin', layout: 'admin' })

const { t } = useI18n()
const { getSlides, createSlide, updateSlide, reorderSlides, setSlideArchived } = useHomeCarouselAdmin()
const { deleteFile } = useCustomFileUpload()

const slides = ref<HomeCarouselAdminSlide[]>([])
const loading = ref(true)
const saving = ref(false)
const busyKey = ref('')
const error = ref('')
const notice = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const uploadedFile = ref<FileRecord | null>(null)
const uploadKey = ref(0)
const form = reactive({
  locale: 'all' as HomeCarouselLocale,
  alt_text_zh: '',
  alt_text_en: '',
  href: '',
  is_active: true,
})

const currentSlides = computed(() => slides.value.filter((slide) => !slide.is_deleted))
const archivedSlides = computed(() => slides.value.filter((slide) => slide.is_deleted))
const editingSlide = computed(() => slides.value.find((slide) => slide.id === editingId.value) || null)

function setNotice(type: 'success' | 'error', message: string) {
  notice.value = { type, message }
  window.setTimeout(() => { notice.value = null }, 3600)
}

function resetForm() {
  editingId.value = null
  uploadedFile.value = null
  form.locale = 'all'
  form.alt_text_zh = ''
  form.alt_text_en = ''
  form.href = ''
  form.is_active = true
  uploadKey.value += 1
}

async function discardPendingUpload() {
  if (!uploadedFile.value) return
  const pendingFile = uploadedFile.value
  uploadedFile.value = null
  try {
    await deleteFile(pendingFile.id)
  } catch {
    // Stale unbound uploads are handled by the backend cleanup job.
  }
}

async function openCreate() {
  await discardPendingUpload()
  resetForm()
  formOpen.value = true
}

async function openEdit(slide: HomeCarouselAdminSlide) {
  await discardPendingUpload()
  editingId.value = slide.id
  uploadedFile.value = null
  form.locale = slide.locale
  form.alt_text_zh = slide.alt_text_zh || ''
  form.alt_text_en = slide.alt_text_en || ''
  form.href = slide.href || ''
  form.is_active = slide.is_active
  uploadKey.value += 1
  formOpen.value = true
}

async function closeForm() {
  if (saving.value) return
  await discardPendingUpload()
  formOpen.value = false
  resetForm()
}

async function loadSlides() {
  loading.value = true
  error.value = ''
  try {
    slides.value = (await getSlides()).slides
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('adminCarousel.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function handleUpload(file: FileRecord) {
  if (uploadedFile.value && uploadedFile.value.id !== file.id) {
    await deleteFile(uploadedFile.value.id).catch(() => undefined)
  }
  uploadedFile.value = file
}

async function clearUploadedFile() {
  uploadedFile.value = null
}

async function submitForm() {
  if (!editingId.value && !uploadedFile.value) {
    setNotice('error', t('adminCarousel.errors.imageRequired'))
    return
  }
  const payload: HomeCarouselWritePayload = {
    locale: form.locale,
    alt_text_zh: form.alt_text_zh.trim(),
    alt_text_en: form.alt_text_en.trim(),
    href: form.href.trim(),
    is_active: form.is_active,
  }
  if (uploadedFile.value) payload.image_file_id = uploadedFile.value.id

  saving.value = true
  try {
    if (editingId.value) {
      await updateSlide(editingId.value, payload)
      setNotice('success', t('adminCarousel.messages.updated'))
    } else {
      await createSlide(payload)
      setNotice('success', t('adminCarousel.messages.created'))
    }
    uploadedFile.value = null
    formOpen.value = false
    resetForm()
    await loadSlides()
  } catch (err) {
    setNotice('error', err instanceof Error ? err.message : t('adminCarousel.errors.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function moveSlide(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= currentSlides.value.length) return
  const reordered = [...currentSlides.value]
  ;[reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]
  busyKey.value = 'reorder'
  try {
    await reorderSlides(reordered.map((slide) => slide.id))
    setNotice('success', t('adminCarousel.messages.reordered'))
    await loadSlides()
  } catch (err) {
    setNotice('error', err instanceof Error ? err.message : t('adminCarousel.errors.reorderFailed'))
  } finally {
    busyKey.value = ''
  }
}

async function toggleArchive(slide: HomeCarouselAdminSlide) {
  const archive = !slide.is_deleted
  const prompt = archive ? t('adminCarousel.confirm.archive') : t('adminCarousel.confirm.restore')
  if (!window.confirm(prompt)) return
  busyKey.value = `archive-${slide.id}`
  try {
    await setSlideArchived(slide.id, archive)
    setNotice('success', archive ? t('adminCarousel.messages.archived') : t('adminCarousel.messages.restored'))
    await loadSlides()
  } catch (err) {
    setNotice('error', err instanceof Error ? err.message : t('adminCarousel.errors.saveFailed'))
  } finally {
    busyKey.value = ''
  }
}

function localeLabel(locale: HomeCarouselLocale) {
  return t(`adminCarousel.locales.${locale}`)
}

onMounted(loadSlides)
</script>

<template>
  <section class="carousel-admin">
    <AdminPageHeader
      :eyebrow="t('nav.admin')"
      :title="t('adminCarousel.title')"
      :description="t('adminCarousel.description')"
    >
      <template #actions>
        <button class="button button--secondary" type="button" :disabled="loading" @click="loadSlides">
          {{ t('adminCarousel.actions.refresh') }}
        </button>
        <button class="button button--primary" type="button" @click="openCreate">
          {{ t('adminCarousel.actions.add') }}
        </button>
      </template>
    </AdminPageHeader>

    <p v-if="notice" class="notice" :class="`notice--${notice.type}`" role="status">
      {{ notice.message }}
    </p>

    <section v-if="formOpen" class="editor" :aria-label="editingId ? t('adminCarousel.form.editTitle') : t('adminCarousel.form.createTitle')">
      <div class="editor__header">
        <div>
          <p class="editor__eyebrow">{{ editingId ? t('adminCarousel.form.editEyebrow') : t('adminCarousel.form.createEyebrow') }}</p>
          <h2>{{ editingId ? t('adminCarousel.form.editTitle') : t('adminCarousel.form.createTitle') }}</h2>
        </div>
        <button class="text-button" type="button" :disabled="saving" @click="closeForm">
          {{ t('adminCarousel.actions.cancel') }}
        </button>
      </div>

      <div class="editor__grid">
        <div class="editor__preview-column">
          <div v-if="editingSlide?.image_url && !uploadedFile" class="image-preview">
            <img :src="editingSlide.image_url" :alt="form.alt_text_zh || form.alt_text_en">
            <span>{{ t('adminCarousel.form.currentImage') }}</span>
          </div>
          <FileUpload
            :key="uploadKey"
            file-type="carousel_image"
            entity-type="home_carousel"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :max-size="10 * 1024 * 1024"
            :show-preview="true"
            :allow-delete="true"
            :drag-text="editingId ? t('adminCarousel.form.replaceImage') : t('adminCarousel.form.uploadImage')"
            @upload-success="handleUpload"
            @upload-error="(err) => setNotice('error', err.message)"
            @delete-success="clearUploadedFile"
          />
          <p class="field-hint">{{ t('adminCarousel.form.imageHint') }}</p>
        </div>

        <div class="editor__fields">
          <label class="field">
            <span>{{ t('adminCarousel.form.locale') }}</span>
            <select v-model="form.locale">
              <option value="all">{{ t('adminCarousel.locales.all') }}</option>
              <option value="zh">{{ t('adminCarousel.locales.zh') }}</option>
              <option value="en">{{ t('adminCarousel.locales.en') }}</option>
            </select>
          </label>

          <label v-if="form.locale !== 'en'" class="field">
            <span>{{ t('adminCarousel.form.altZh') }}</span>
            <input v-model="form.alt_text_zh" type="text" maxlength="255" required>
          </label>
          <label v-if="form.locale !== 'zh'" class="field">
            <span>{{ t('adminCarousel.form.altEn') }}</span>
            <input v-model="form.alt_text_en" type="text" maxlength="255" required>
          </label>
          <label class="field">
            <span>{{ t('adminCarousel.form.href') }}</span>
            <input v-model="form.href" type="text" maxlength="2048" :placeholder="t('adminCarousel.form.hrefPlaceholder')">
            <small>{{ t('adminCarousel.form.hrefHint') }}</small>
          </label>
          <label class="toggle-field">
            <input v-model="form.is_active" type="checkbox">
            <span>{{ t('adminCarousel.form.active') }}</span>
          </label>
        </div>
      </div>

      <div class="editor__actions">
        <button class="button button--secondary" type="button" :disabled="saving" @click="closeForm">
          {{ t('adminCarousel.actions.cancel') }}
        </button>
        <button class="button button--primary" type="button" :disabled="saving" @click="submitForm">
          {{ saving ? t('adminCarousel.actions.saving') : t('adminCarousel.actions.save') }}
        </button>
      </div>
    </section>

    <p v-if="error" class="state state--error" role="alert">
      {{ error }}
      <button class="text-button" type="button" @click="loadSlides">{{ t('adminCarousel.actions.retry') }}</button>
    </p>
    <p v-else-if="loading" class="state">{{ t('adminCarousel.loading') }}</p>
    <p v-else-if="!currentSlides.length" class="state">{{ t('adminCarousel.empty') }}</p>

    <div v-else class="slide-list">
      <article v-for="(slide, index) in currentSlides" :key="slide.id" class="slide-card">
        <img v-if="slide.image_url" class="slide-card__image" :src="slide.image_url" :alt="slide.alt_text_zh || slide.alt_text_en || ''">
        <div v-else class="slide-card__missing">{{ t('adminCarousel.missingImage') }}</div>
        <div class="slide-card__body">
          <div class="slide-card__badges">
            <span class="badge">{{ localeLabel(slide.locale) }}</span>
            <span class="badge" :class="slide.is_active ? 'badge--active' : 'badge--muted'">
              {{ slide.is_active ? t('adminCarousel.status.active') : t('adminCarousel.status.inactive') }}
            </span>
            <span v-if="slide.presentation_variant === 'scheduler'" class="badge">{{ t('adminCarousel.status.scheduler') }}</span>
          </div>
          <h2>{{ slide.alt_text_zh || slide.alt_text_en || t('adminCarousel.untitled') }}</h2>
          <p>{{ slide.alt_text_en && slide.alt_text_zh ? slide.alt_text_en : t('adminCarousel.singleLanguageAlt') }}</p>
          <code v-if="slide.href">{{ slide.href }}</code>
        </div>
        <div class="slide-card__actions">
          <div class="order-actions" :aria-label="t('adminCarousel.actions.reorder')">
            <button type="button" :disabled="index === 0 || busyKey === 'reorder'" :aria-label="t('adminCarousel.actions.moveUp')" @click="moveSlide(index, -1)">↑</button>
            <button type="button" :disabled="index === currentSlides.length - 1 || busyKey === 'reorder'" :aria-label="t('adminCarousel.actions.moveDown')" @click="moveSlide(index, 1)">↓</button>
          </div>
          <button class="text-button" type="button" @click="openEdit(slide)">{{ t('adminCarousel.actions.edit') }}</button>
          <button class="text-button text-button--danger" type="button" :disabled="busyKey === `archive-${slide.id}`" @click="toggleArchive(slide)">
            {{ t('adminCarousel.actions.archive') }}
          </button>
        </div>
      </article>
    </div>

    <section v-if="archivedSlides.length" class="archive-section">
      <h2>{{ t('adminCarousel.archivedTitle') }}</h2>
      <article v-for="slide in archivedSlides" :key="slide.id" class="archived-row">
        <span>{{ slide.alt_text_zh || slide.alt_text_en || t('adminCarousel.untitled') }}</span>
        <button class="text-button" type="button" :disabled="busyKey === `archive-${slide.id}`" @click="toggleArchive(slide)">
          {{ t('adminCarousel.actions.restore') }}
        </button>
      </article>
    </section>
  </section>
</template>

<style scoped lang="scss">
.carousel-admin { display: grid; gap: 1rem; }
.button, .text-button, .order-actions button { min-height: 40px; border-radius: 999px; font: inherit; font-weight: 700; cursor: pointer; }
.button { padding: .6rem 1rem; border: 1px solid var(--border-primary); }
.button--primary { border-color: var(--interactive-primary); background: var(--interactive-primary); color: var(--text-inverse); }
.button--secondary { background: var(--surface-primary); color: var(--text-primary); }
.button:disabled, .text-button:disabled, .order-actions button:disabled { cursor: not-allowed; opacity: .48; }
.text-button { padding: .35rem .7rem; border: 0; background: transparent; color: var(--interactive-primary); }
.text-button--danger { color: var(--error-color); }
.notice, .state { margin: 0; padding: .85rem 1rem; border: 1px solid var(--border-primary); border-radius: 12px; background: var(--surface-primary); color: var(--text-secondary); }
.notice--success { border-color: var(--success-color); background: var(--success-background); color: var(--success-color); }
.notice--error, .state--error { border-color: var(--error-color); background: var(--error-background); color: var(--error-color); }
.editor, .archive-section { padding: clamp(1rem, 2.6vw, 1.6rem); border: 1px solid var(--border-primary); border-radius: 18px; background: var(--surface-primary); box-shadow: var(--shadow-small); }
.editor__header, .editor__actions, .slide-card__badges, .slide-card__actions, .order-actions, .archived-row { display: flex; align-items: center; }
.editor__header { justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.editor__header h2, .slide-card h2, .archive-section h2 { margin: 0; color: var(--text-primary); }
.editor__eyebrow { margin: 0 0 .25rem; color: var(--interactive-primary); font-size: .75rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.editor__grid { display: grid; grid-template-columns: minmax(260px, .85fr) minmax(0, 1.15fr); gap: 1.4rem; }
.editor__preview-column, .editor__fields { display: grid; align-content: start; gap: .9rem; }
.image-preview { position: relative; overflow: hidden; border-radius: 12px; aspect-ratio: 3 / 1; background: var(--surface-secondary); }
.image-preview img { width: 100%; height: 100%; object-fit: cover; }
.image-preview span { position: absolute; left: .6rem; bottom: .6rem; padding: .25rem .55rem; border-radius: 999px; background: var(--overlay-backdrop); color: var(--text-on-interactive); font-size: .75rem; }
.field { display: grid; gap: .4rem; color: var(--text-primary); font-weight: 700; }
.field input, .field select { width: 100%; min-height: 44px; box-sizing: border-box; padding: .65rem .75rem; border: 1px solid var(--border-primary); border-radius: 10px; background: var(--surface-primary); color: var(--text-primary); font: inherit; }
.field input:focus, .field select:focus { outline: 3px solid color-mix(in srgb, var(--interactive-primary) 22%, transparent); border-color: var(--interactive-primary); }
.field small, .field-hint { margin: 0; color: var(--text-muted); font-size: .8rem; font-weight: 400; }
.toggle-field { display: flex; align-items: center; gap: .55rem; color: var(--text-primary); font-weight: 700; }
.toggle-field input { width: 18px; height: 18px; accent-color: var(--interactive-primary); }
.editor__actions { justify-content: flex-end; gap: .65rem; margin-top: 1.25rem; }
.slide-list { display: grid; gap: .9rem; }
.slide-card { display: grid; grid-template-columns: 210px minmax(0, 1fr) auto; gap: 1rem; align-items: center; padding: .85rem; border: 1px solid var(--border-primary); border-radius: 16px; background: var(--surface-primary); box-shadow: var(--shadow-small); }
.slide-card__image, .slide-card__missing { width: 210px; aspect-ratio: 3 / 1; border-radius: 10px; object-fit: cover; background: var(--surface-secondary); }
.slide-card__missing { display: grid; place-items: center; color: var(--text-muted); }
.slide-card__body { min-width: 0; }
.slide-card__badges { flex-wrap: wrap; gap: .4rem; }
.badge { padding: .22rem .55rem; border-radius: 999px; background: var(--interactive-secondary); color: var(--text-secondary); font-size: .72rem; font-weight: 750; }
.badge--active { background: var(--success-background); color: var(--success-color); }
.badge--muted { background: var(--surface-secondary); color: var(--text-muted); }
.slide-card h2 { margin-top: .55rem; font-size: 1rem; }
.slide-card p { margin: .28rem 0; color: var(--text-secondary); font-size: .84rem; }
.slide-card code { display: block; overflow: hidden; color: var(--text-muted); text-overflow: ellipsis; white-space: nowrap; }
.slide-card__actions { justify-content: flex-end; flex-wrap: wrap; gap: .2rem; }
.order-actions { gap: .25rem; }
.order-actions button { width: 40px; padding: 0; border: 1px solid var(--border-primary); background: var(--surface-primary); color: var(--text-primary); }
.archive-section { display: grid; gap: .5rem; }
.archive-section h2 { font-size: 1rem; }
.archived-row { justify-content: space-between; gap: 1rem; padding: .6rem .75rem; border-radius: 10px; background: var(--surface-secondary); color: var(--text-secondary); }
@media (max-width: 840px) {
  .editor__grid { grid-template-columns: 1fr; }
  .slide-card { grid-template-columns: 120px minmax(0, 1fr); }
  .slide-card__image, .slide-card__missing { width: 120px; }
  .slide-card__actions { grid-column: 1 / -1; justify-content: space-between; border-top: 1px solid var(--border-primary); padding-top: .65rem; }
}
@media (max-width: 520px) {
  .slide-card { grid-template-columns: 1fr; }
  .slide-card__image, .slide-card__missing { width: 100%; }
  .slide-card__actions { grid-column: auto; }
  .editor__actions .button { flex: 1; }
}
</style>
