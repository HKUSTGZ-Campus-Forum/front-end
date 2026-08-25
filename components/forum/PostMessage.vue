<script setup lang="ts">
import type { UploadImgCallBack } from 'md-editor-v3'
import type { FileRecord } from '~/types/file'
import type { UserIdentity } from '~/types/identity'
import { formatFileSize } from '~/utils/imageCompression'
import {
  COMMON_POST_TAGS,
  MAX_POST_TAG_COUNT,
  MAX_POST_TAG_LENGTH,
  dedupePostTags,
  getPostTagKey,
  mergePostTagRecommendations,
  normalizePostTag,
} from '~/utils/postTags'

type AttachmentKind = 'image' | 'video' | 'file'
type AttachmentStatus = 'queued' | 'uploading' | 'ready' | 'error'

interface ComposerAttachment {
  clientId: string
  source: File
  kind: AttachmentKind
  status: AttachmentStatus
  progress: number
  previewUrl?: string
  record?: FileRecord
  error?: string
  abortController?: AbortController
  removed?: boolean
}

const props = withDefaults(defineProps<{
  initialTags?: string[]
  lockedTags?: string[]
  returnTo?: string | null
}>(), {
  initialTags: () => [],
  lockedTags: () => [],
  returnTo: null,
})

const emit = defineEmits<{ postSuccess: [postId: number] }>()
const { t } = useI18n()
const router = useRouter()
const { fetchPublic, fetchWithAuth, getApiUrl } = useApi()
const { uploadFile, deleteFile } = useCustomFileUpload()

const MAX_TAG_COUNT = MAX_POST_TAG_COUNT
const MAX_TAG_LENGTH = MAX_POST_TAG_LENGTH
const MAX_POST_IMAGES = 5
const MAX_OTHER_ATTACHMENTS = 30
const MAX_POST_FILE_BYTES = 10 * 1024 * 1024
const MAX_POST_VIDEO_BYTES = 100 * 1024 * 1024
const TAG_SEARCH_DEBOUNCE_MS = 280
const MAX_TAG_SEARCH_SUGGESTIONS = 8

const markdownEditor = ref<{ insertMarkdown: (markdown: string) => void } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const title = ref('')
const content = ref('')
const tagInput = ref('')
const selectedIdentityId = ref<number | null>(null)
const attachments = ref<ComposerAttachment[]>([])
const isPublishing = ref(false)
const errorMessage = ref('')
const attachmentPickerError = ref('')
const cleanupNotice = ref('')
const errors = reactive({ title: '', content: '', tags: '' })

const defaultTags = computed(() => dedupePostTags([...props.lockedTags, ...props.initialTags]))
const tags = ref<string[]>([...defaultTags.value])
const normalizedLockedTags = computed(() => new Set(props.lockedTags.map(getPostTagKey)))
const hasLockedTags = computed(() => normalizedLockedTags.value.size > 0)
const isLockedTag = (tag: string) => normalizedLockedTags.value.has(getPostTagKey(tag))
const isTagInputFocused = ref(false)
const isTagSearchLoading = ref(false)
const remoteTagSuggestions = ref<string[]>([])
const activeTagSuggestionIndex = ref(-1)
let tagSearchTimer: ReturnType<typeof setTimeout> | null = null
let tagSearchRequestSequence = 0
let useGlobalTagSearchFallback = false
const getTagSuggestionId = (index: number) => `postTagSuggestion-${index}`

const commonTagRecommendations = computed(() => mergePostTagRecommendations({
  commonTags: COMMON_POST_TAGS,
  selectedTags: tags.value,
  lockedTags: props.lockedTags,
  maxTagCount: MAX_TAG_COUNT,
}))

const tagSearchSuggestions = computed(() => mergePostTagRecommendations({
  commonTags: [],
  remoteTags: remoteTagSuggestions.value,
  selectedTags: tags.value,
  lockedTags: props.lockedTags,
  maxTagCount: MAX_TAG_COUNT,
  maxSuggestions: MAX_TAG_SEARCH_SUGGESTIONS,
}))

const normalizedTagQuery = computed(() => normalizePostTag(tagInput.value))
const showTagSearchPanel = computed(() => (
  isTagInputFocused.value
  && normalizedTagQuery.value.length >= 1
  && (isTagSearchLoading.value || tagSearchSuggestions.value.length > 0)
))
const activeTagSuggestionId = computed(() => (
  showTagSearchPanel.value && activeTagSuggestionIndex.value >= 0
    ? getTagSuggestionId(activeTagSuggestionIndex.value)
    : undefined
))

const imageCount = computed(() => attachments.value.filter((item) => item.kind === 'image').length)
const otherCount = computed(() => attachments.value.length - imageCount.value)
const isUploading = computed(() => attachments.value.some((item) => item.status === 'queued' || item.status === 'uploading'))
const hasUploadErrors = computed(() => attachments.value.some((item) => item.status === 'error'))
const overallUploadProgress = computed(() => {
  const uploadItems = attachments.value.filter((item) => item.status !== 'error')
  if (!uploadItems.length) return 0
  const totalBytes = uploadItems.reduce((total, item) => total + Math.max(item.source.size, 1), 0)
  return Math.round(uploadItems.reduce((total, item) => total + item.progress * Math.max(item.source.size, 1), 0) / totalBytes)
})
const formValid = computed(() => Boolean(
  title.value.trim().length >= 5
  && title.value.trim().length <= 100
  && content.value.trim().length >= 10
  && !errors.title
  && !errors.content
  && !errors.tags
  && !isUploading.value
  && !hasUploadErrors.value
))
const publishButtonLabel = computed(() => {
  if (isPublishing.value) return t('forum.create.actions.publishing')
  if (isUploading.value) return t('forum.create.actions.uploadingAttachments', { progress: overallUploadProgress.value })
  return t('forum.create.actions.publish')
})

const validateTitle = () => {
  const length = title.value.trim().length
  errors.title = length === 0
    ? t('forum.create.validation.titleRequired')
    : length < 5
      ? t('forum.create.validation.titleMin')
      : length > 100
        ? t('forum.create.validation.titleMax')
        : ''
}

const validateContent = () => {
  const length = content.value.trim().length
  errors.content = length === 0
    ? t('forum.create.validation.contentRequired')
    : length < 10
      ? t('forum.create.validation.contentMin')
      : ''
}

watch(title, () => {
  if (errors.title) validateTitle()
})

watch(content, () => {
  if (errors.content) validateContent()
})

const clearTagError = () => { errors.tags = '' }
const handleTagInputFocus = () => { isTagInputFocused.value = true }
const handleTagInputBlur = () => {
  isTagInputFocused.value = false
  activeTagSuggestionIndex.value = -1
  clearTagError()
}

const tryAddTag = (rawTag: string) => {
  const tag = normalizePostTag(rawTag)
  if (!tag) {
    clearTagError()
    return false
  }
  if (tag.length > MAX_TAG_LENGTH) errors.tags = t('forum.create.tags.errors.tooLong', { length: MAX_TAG_LENGTH })
  else if (tags.value.length >= MAX_TAG_COUNT) errors.tags = t('forum.create.tags.errors.tooMany', { count: MAX_TAG_COUNT })
  else if (tags.value.some((item) => getPostTagKey(item) === getPostTagKey(tag))) errors.tags = t('forum.create.tags.errors.duplicate')
  else {
    tags.value.push(tag)
    clearTagError()
    return true
  }
  return false
}

const addTag = () => {
  const added = tryAddTag(tagInput.value)
  if (added || !normalizePostTag(tagInput.value)) tagInput.value = ''
  return added
}

const selectTagSuggestion = (tag: string) => {
  if (!tryAddTag(tag)) return
  tagInput.value = ''
  remoteTagSuggestions.value = []
  activeTagSuggestionIndex.value = -1
}

const handleTagKeydown = (event: KeyboardEvent) => {
  if (event.isComposing || event.key === "Process" || event.keyCode === 229) return
  if (event.key === 'ArrowDown' && showTagSearchPanel.value && tagSearchSuggestions.value.length) {
    event.preventDefault()
    activeTagSuggestionIndex.value = (activeTagSuggestionIndex.value + 1) % tagSearchSuggestions.value.length
    return
  }
  if (event.key === 'ArrowUp' && showTagSearchPanel.value && tagSearchSuggestions.value.length) {
    event.preventDefault()
    activeTagSuggestionIndex.value = activeTagSuggestionIndex.value <= 0
      ? tagSearchSuggestions.value.length - 1
      : activeTagSuggestionIndex.value - 1
    return
  }
  if (event.key === 'Escape' && showTagSearchPanel.value) {
    event.preventDefault()
    activeTagSuggestionIndex.value = -1
    ;(event.currentTarget as HTMLInputElement | null)?.blur()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const suggestion = tagSearchSuggestions.value[activeTagSuggestionIndex.value]
    if (showTagSearchPanel.value && suggestion) {
      selectTagSuggestion(suggestion)
      return
    }
    addTag()
    return
  }
  if (event.key === ',') {
    event.preventDefault()
    addTag()
  }
}

const removeTag = (index: number) => {
  if (isLockedTag(tags.value[index])) {
    errors.tags = t('forum.create.tags.errors.locked')
    return
  }
  tags.value.splice(index, 1)
  clearTagError()
}

const applyRemoteTagSuggestions = (rawSuggestions: unknown) => {
  const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions : []
  remoteTagSuggestions.value = suggestions
    .map((suggestion: unknown) => (
      suggestion && typeof suggestion === 'object' && 'name' in suggestion && typeof suggestion.name === 'string'
        ? suggestion.name
        : ''
    ))
    .filter(Boolean)
  activeTagSuggestionIndex.value = remoteTagSuggestions.value.length ? 0 : -1
}

const fetchTagSuggestions = async (query: string, requestSequence: number) => {
  try {
    if (!useGlobalTagSearchFallback) {
      try {
        const params = new URLSearchParams({ q: query, limit: String(MAX_TAG_SEARCH_SUGGESTIONS) })
        const response = await fetchPublic(getApiUrl(`/api/search/tags?${params}`))
        if (requestSequence !== tagSearchRequestSequence) return
        if (response.ok) {
          const data = await response.json()
          if (requestSequence !== tagSearchRequestSequence) return
          applyRemoteTagSuggestions(data?.results)
          return
        }
      } catch {
        // Fall through to the global-search compatibility path.
      }
      if (requestSequence !== tagSearchRequestSequence) return
      useGlobalTagSearchFallback = true
    }
    if (query.length < 2) return
    const response = await fetchPublic(getApiUrl(`/api/search/global?q=${encodeURIComponent(query)}`))
    if (!response.ok) return
    const data = await response.json()
    if (requestSequence !== tagSearchRequestSequence) return
    applyRemoteTagSuggestions(data?.results?.tags)
  } catch {
    if (requestSequence === tagSearchRequestSequence) {
      remoteTagSuggestions.value = []
      activeTagSuggestionIndex.value = -1
    }
  } finally {
    if (requestSequence === tagSearchRequestSequence) isTagSearchLoading.value = false
  }
}

watch(tagInput, (rawQuery) => {
  if (tagSearchTimer) clearTimeout(tagSearchTimer)
  tagSearchRequestSequence += 1
  const requestSequence = tagSearchRequestSequence
  const query = normalizePostTag(rawQuery)
  remoteTagSuggestions.value = []
  activeTagSuggestionIndex.value = -1
  if (!query || (useGlobalTagSearchFallback && query.length < 2)) {
    isTagSearchLoading.value = false
    return
  }
  isTagSearchLoading.value = true
  tagSearchTimer = setTimeout(() => {
    tagSearchTimer = null
    void fetchTagSuggestions(query, requestSequence)
  }, TAG_SEARCH_DEBOUNCE_MS)
})

const classifyFile = (file: File): AttachmentKind => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}

const validateIncomingFile = (file: File, kind: AttachmentKind) => {
  if (kind === 'image' && imageCount.value >= MAX_POST_IMAGES) return t('forum.create.validation.imageCount', { count: MAX_POST_IMAGES })
  if (kind !== 'image' && otherCount.value >= MAX_OTHER_ATTACHMENTS) return t('forum.create.validation.attachmentCount', { count: MAX_OTHER_ATTACHMENTS })
  const maxBytes = kind === 'video' ? MAX_POST_VIDEO_BYTES : MAX_POST_FILE_BYTES
  if (kind !== 'image' && file.size > maxBytes) return t('forum.create.validation.fileSize', { name: file.name, size: formatFileSize(maxBytes) })
  return ''
}

const queueDraftCleanup = (fileId: number) => {
  void deleteFile(fileId).catch(() => {
    cleanupNotice.value = t('forum.create.upload.cleanupDeferred')
  })
}

const uploadAttachment = async (item: ComposerAttachment) => {
  item.status = 'uploading'
  item.progress = 0
  item.error = undefined
  item.abortController = new AbortController()
  try {
    const record = await uploadFile({
      file: item.source,
      fileType: item.kind === 'image' ? 'post_image' : 'post_attachment',
      entityType: 'post',
      maxUploadBytes: item.kind === 'video' ? MAX_POST_VIDEO_BYTES : MAX_POST_FILE_BYTES,
      enableCompression: item.kind === 'image',
      signal: item.abortController.signal,
      onProgress: (progress) => { item.progress = Math.round(progress) },
    })
    if (item.removed) {
      queueDraftCleanup(record.id)
      return
    }
    item.record = record
    item.status = 'ready'
    item.progress = 100
  } catch (error) {
    if (item.removed) return
    item.status = 'error'
    item.error = error instanceof Error ? error.message : t('forum.create.upload.failed')
  } finally {
    item.abortController = undefined
  }
}

const addFiles = async (files: File[]) => {
  errorMessage.value = ''
  const added: ComposerAttachment[] = []
  for (const file of files) {
    const kind = classifyFile(file)
    const validationError = validateIncomingFile(file, kind)
    if (validationError) {
      errorMessage.value = validationError
      continue
    }
    const item: ComposerAttachment = {
      clientId: crypto.randomUUID(),
      source: file,
      kind,
      status: 'queued',
      progress: 0,
      previewUrl: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : undefined,
    }
    attachments.value.push(item)
    added.push(item)
  }
  await Promise.all(added.map(uploadAttachment))
  return added
}

const insertUploadedImages = (items: ComposerAttachment[]) => {
  const markdown = items
    .filter((item) => item.kind === 'image' && item.status === 'ready' && item.previewUrl)
    .map((item) => `\n![${item.source.name}](${item.previewUrl})\n`)
    .join('')
  if (markdown) markdownEditor.value?.insertMarkdown(markdown)
}

const handleEditorImageUpload = async (files: File[], callback: UploadImgCallBack) => {
  const added = await addFiles(files)
  callback(added.filter((item) => item.status === 'ready' && item.previewUrl).map((item) => item.previewUrl!))
}

const handleEditorFiles = async (files: File[], insertImages: boolean) => {
  const added = await addFiles(files)
  if (insertImages) insertUploadedImages(added)
}

const openAttachmentPicker = () => {
  attachmentPickerError.value = ''
  fileInput.value?.click()
}

const handleAttachmentInput = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const selectedFiles = Array.from(input.files || [])
  const nonImageFiles = selectedFiles.filter((file) => !file.type.startsWith('image/'))
  attachmentPickerError.value = selectedFiles.length !== nonImageFiles.length
    ? t('forum.create.upload.imageUseEditor')
    : ''
  await addFiles(nonImageFiles)
  input.value = ''
}

const retryAttachment = (item: ComposerAttachment) => uploadAttachment(item)

const removeMarkdownReference = (item: ComposerAttachment) => {
  if (!item.previewUrl) return
  content.value = content.value.split(item.previewUrl).join('')
}

const removeAttachment = (item: ComposerAttachment) => {
  item.removed = true
  item.abortController?.abort()
  removeMarkdownReference(item)
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  attachments.value = attachments.value.filter((candidate) => candidate.clientId !== item.clientId)
  if (item.record) queueDraftCleanup(item.record.id)
}

const materializeMarkdown = () => {
  let markdown = content.value
  attachments.value.forEach((item) => {
    if (item.previewUrl && item.record) markdown = markdown.split(item.previewUrl).join(`/api/files/view/${item.record.id}`)
  })
  return markdown
}

const handleIdentityChange = (identity: UserIdentity | null) => {
  selectedIdentityId.value = identity?.id || null
}

const cleanupDraftUploads = async () => {
  attachments.value.forEach((item) => item.abortController?.abort())
  await Promise.allSettled(attachments.value.filter((item) => item.record).map((item) => deleteFile(item.record!.id)))
  attachments.value.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl))
  attachments.value = []
}

const handleCancel = async () => {
  const hasDraft = title.value || content.value || tagInput.value || attachments.value.length || tags.value.some((tag) => !isLockedTag(tag))
  if (hasDraft && !window.confirm(t('forum.create.confirmDiscard'))) return
  await cleanupDraftUploads()
  if (props.returnTo) await router.push(props.returnTo)
  else router.back()
}

const readPostError = async (response: Response) => {
  const payload = await response.json().catch(() => null) as { error?: string; message?: string; tag_errors?: string[] } | null
  if (payload?.tag_errors?.length) return payload.tag_errors.join('；')
  if (payload?.message) return payload.message
  if (response.status === 401) return t('forum.create.publish.loginRequired')
  if (response.status === 403) return t('forum.create.publish.forbidden')
  if (response.status === 429) return t('forum.create.publish.tooFrequent')
  if (response.status >= 500) return t('forum.create.publish.serverError')
  return payload?.error || t('forum.create.publish.failed')
}

const handleSubmit = async () => {
  validateTitle()
  validateContent()
  if (tagInput.value.trim() && !addTag()) return
  if (!formValid.value) {
    if (isUploading.value) errorMessage.value = t('forum.create.upload.wait')
    else if (hasUploadErrors.value) errorMessage.value = t('forum.create.upload.resolveErrors')
    return
  }

  isPublishing.value = true
  errorMessage.value = ''
  try {
    const response = await fetchWithAuth(getApiUrl('/api/posts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.value.trim(),
        content: materializeMarkdown(),
        tags: tags.value,
        file_ids: attachments.value.map((item) => item.record!.id),
        display_identity_id: selectedIdentityId.value,
      }),
    })
    if (!response.ok) throw new Error(await readPostError(response))
    const post = await response.json() as { id?: number; postId?: number }
    const postId = post.id || post.postId
    if (!postId) throw new Error(t('forum.create.publish.invalidResponse'))
    attachments.value.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl))
    emit('postSuccess', postId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('forum.create.publish.failed')
  } finally {
    isPublishing.value = false
  }
}

onBeforeUnmount(() => {
  tagSearchRequestSequence += 1
  if (tagSearchTimer) clearTimeout(tagSearchTimer)
  attachments.value.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl))
})
</script>

<template>
  <form class="composer" @submit.prevent="handleSubmit">
    <div class="field">
      <label for="post-title">{{ t('forum.create.fields.title') }}</label>
      <input id="post-title" v-model="title" maxlength="100" :placeholder="t('forum.create.placeholders.title')" @blur="validateTitle">
      <span v-if="errors.title" class="field-error" role="alert">{{ errors.title }}</span>
    </div>

    <div class="field">
      <div class="field-heading">
        <label>{{ t('forum.create.fields.content') }}</label>
        <span class="markdown-badge">Markdown</span>
      </div>
      <CommonMarkdownEditor ref="markdownEditor" v-model="content" height="360px" :placeholder="t('forum.create.placeholders.content')" @upload-image="handleEditorImageUpload" @upload-files="handleEditorFiles" />
      <p class="field-hint">{{ t('forum.create.markdownHint') }}</p>
      <span v-if="errors.content" class="field-error" role="alert">{{ errors.content }}</span>
    </div>

    <section class="upload-panel" aria-labelledby="upload-heading">
      <div class="upload-copy">
        <h2 id="upload-heading">{{ t('forum.create.upload.title') }}</h2>
        <p>{{ t('forum.create.upload.hint') }}</p>
      </div>
      <div class="upload-actions">
        <button type="button" class="secondary-button" @click="openAttachmentPicker"><Icon name="lucide:paperclip" aria-hidden="true" />{{ t('forum.create.upload.addFiles') }}</button>
        <input ref="fileInput" class="sr-only" type="file" multiple tabindex="-1" aria-hidden="true" @change="handleAttachmentInput">
      </div>
      <p class="upload-limits">{{ t('forum.create.upload.limits') }}</p>
      <p v-if="attachmentPickerError" class="upload-message upload-message--error" role="alert"><Icon name="lucide:circle-alert" aria-hidden="true" />{{ attachmentPickerError }}</p>
      <p v-if="cleanupNotice" class="upload-message" role="status"><Icon name="lucide:info" aria-hidden="true" />{{ cleanupNotice }}</p>

      <ul v-if="attachments.length" class="attachment-list" :aria-label="t('forum.create.upload.queue')">
        <li v-for="item in attachments" :key="item.clientId" class="attachment-item">
          <img v-if="item.kind === 'image'" :src="item.previewUrl" alt="" class="attachment-preview">
          <video v-else-if="item.kind === 'video'" :src="item.previewUrl" muted class="attachment-preview" />
          <span v-else class="attachment-file-icon"><Icon name="lucide:file" aria-hidden="true" /></span>
          <div class="attachment-main">
            <div class="attachment-name-row"><span class="attachment-name" :title="item.source.name">{{ item.source.name }}</span><span class="attachment-size">{{ formatFileSize(item.source.size) }}</span></div>
            <div v-if="item.status === 'uploading' || item.status === 'queued'" class="progress-track" role="progressbar" :aria-valuenow="item.progress" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${item.progress}%` }" /></div>
            <p v-if="item.status === 'error'" class="attachment-error">{{ item.error }}</p>
            <span v-else class="attachment-status" :class="`attachment-status--${item.status}`">{{ t(`forum.create.upload.status.${item.status}`, { progress: item.progress }) }}</span>
          </div>
          <button v-if="item.status === 'error'" type="button" class="icon-action" :aria-label="t('forum.create.upload.retry')" @click="retryAttachment(item)"><Icon name="lucide:refresh-cw" aria-hidden="true" /></button>
          <button type="button" class="icon-action" :aria-label="t('forum.create.upload.remove', { name: item.source.name })" @click="removeAttachment(item)"><Icon name="lucide:x" aria-hidden="true" /></button>
        </li>
      </ul>
    </section>

    <div class="field">
      <label for="post-tag">{{ t('forum.create.fields.tags') }}</label>
      <div class="tag-input-row">
        <div class="tag-input-shell">
          <input
            id="post-tag"
            v-model="tagInput"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="post-tag-suggestions"
            :aria-expanded="showTagSearchPanel"
            :aria-activedescendant="activeTagSuggestionId"
            :maxlength="MAX_TAG_LENGTH"
            :placeholder="t('forum.create.placeholders.tags')"
            @focus="handleTagInputFocus"
            @keydown="handleTagKeydown"
            @blur="handleTagInputBlur"
            @input="clearTagError"
          >
          <div
            v-if="showTagSearchPanel"
            id="post-tag-suggestions"
            class="tag-suggestions"
            role="listbox"
            :aria-label="t('forum.create.tags.suggestions')"
          >
            <div v-if="isTagSearchLoading" class="tag-suggestions__status">
              {{ t('forum.create.tags.searching') }}
            </div>
            <button
              v-for="(suggestion, index) in tagSearchSuggestions"
              :id="getTagSuggestionId(index)"
              :key="suggestion"
              type="button"
              role="option"
              tabindex="-1"
              class="tag-suggestions__option"
              :class="{ 'tag-suggestions__option--active': index === activeTagSuggestionIndex }"
              :aria-selected="index === activeTagSuggestionIndex"
              @mouseenter="activeTagSuggestionIndex = index"
              @mousedown.prevent
              @click="selectTagSuggestion(suggestion)"
            >
              # {{ suggestion }}
            </button>
          </div>
        </div>
        <button type="button" class="secondary-button" :disabled="tags.length >= MAX_TAG_COUNT" @click="addTag">{{ t('forum.create.actions.addTag') }}</button>
      </div>
      <div v-if="commonTagRecommendations.length && !normalizedTagQuery" class="common-tags">
        <span>{{ t('forum.create.tags.common') }}</span>
        <button v-for="tag in commonTagRecommendations" :key="tag" type="button" @click="selectTagSuggestion(tag)">
          # {{ tag }}
        </button>
      </div>
      <p class="field-hint">{{ t('forum.create.tagHint', { count: MAX_TAG_COUNT, length: MAX_TAG_LENGTH }) }}</p>
      <p v-if="hasLockedTags" class="field-hint">{{ t('forum.create.tags.lockedHint') }}</p>
      <div v-if="tags.length" class="tag-list">
        <span v-for="(tag, index) in tags" :key="tag" class="tag" :class="{ 'tag--locked': isLockedTag(tag) }">{{ tag }}<Icon v-if="isLockedTag(tag)" name="lucide:lock" aria-hidden="true" /><button v-else type="button" :aria-label="t('forum.create.actions.removeTag', { tag })" @click="removeTag(index)">×</button></span>
      </div>
      <span v-if="errors.tags" class="field-error" role="alert">{{ errors.tags }}</span>
    </div>

    <div class="field identity-field"><IdentitySelector v-model="selectedIdentityId" size="md" :show-label="true" @change="handleIdentityChange" /></div>

    <div v-if="errorMessage" class="global-error" role="alert"><Icon name="lucide:circle-alert" aria-hidden="true" /><span>{{ errorMessage }}</span></div>

    <div class="form-actions">
      <button type="button" class="cancel-button" :disabled="isPublishing" @click="handleCancel">{{ t('forum.create.actions.cancel') }}</button>
      <button type="submit" class="primary-button" :disabled="isPublishing || isUploading"><Icon v-if="isPublishing || isUploading" name="lucide:loader-circle" class="spin" aria-hidden="true" />{{ publishButtonLabel }}</button>
    </div>
  </form>
</template>

<style lang="scss" scoped>
.composer { display: grid; gap: 1.5rem; }
.field { display: grid; gap: .5rem; min-width: 0; }
.field label, .field-heading label { color: var(--text-primary); font-weight: 650; }
.field-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.markdown-badge { padding: .2rem .55rem; border-radius: 999px; background: color-mix(in srgb, var(--interactive-primary) 10%, transparent); color: var(--interactive-primary); font-size: .75rem; font-weight: 700; }
input { width: 100%; min-height: 44px; padding: .72rem .85rem; border: 1px solid var(--border-primary); border-radius: .65rem; background: var(--surface-primary); color: var(--text-primary); font: inherit; }
input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--border-focus) 15%, transparent); }
.field-hint, .upload-limits { margin: 0; color: var(--text-muted); font-size: .82rem; line-height: 1.5; }
.field-error, .attachment-error { margin: 0; color: var(--semantic-error); font-size: .83rem; }
.upload-panel { display: grid; gap: 1rem; padding: 1rem; border: 1px dashed var(--border-primary); border-radius: .85rem; background: color-mix(in srgb, var(--interactive-primary) 3%, var(--surface-primary)); }
.upload-copy h2 { margin: 0 0 .25rem; color: var(--text-primary); font-size: .95rem; }
.upload-copy p { margin: 0; color: var(--text-secondary); font-size: .86rem; line-height: 1.55; }
.upload-message { display: flex; align-items: flex-start; gap: .4rem; margin: 0; color: var(--text-secondary); font-size: .82rem; line-height: 1.5; }
.upload-message--error { color: var(--semantic-error); }
.upload-actions, .tag-input-row, .form-actions { display: flex; gap: .75rem; }
.secondary-button, .cancel-button, .primary-button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; padding: .65rem 1rem; border-radius: .65rem; font: inherit; font-weight: 650; cursor: pointer; transition: background .15s ease, border-color .15s ease, opacity .15s ease; }
.secondary-button, .cancel-button { border: 1px solid var(--border-primary); background: var(--surface-primary); color: var(--text-primary); }
.secondary-button:hover:not(:disabled), .cancel-button:hover:not(:disabled) { border-color: var(--interactive-primary); color: var(--interactive-primary); }
.primary-button { border: 1px solid var(--btn-primary-bg); background: var(--btn-primary-bg); color: var(--text-inverse); }
.primary-button:hover:not(:disabled) { background: var(--btn-primary-bg-hover); }
button:disabled { opacity: .55; cursor: not-allowed; }
.attachment-list { display: grid; gap: .6rem; margin: 0; padding: 0; list-style: none; }
.attachment-item { display: flex; align-items: center; gap: .75rem; min-width: 0; padding: .65rem; border: 1px solid var(--border-primary); border-radius: .7rem; background: var(--surface-primary); }
.attachment-preview, .attachment-file-icon { width: 46px; height: 46px; flex: 0 0 46px; border-radius: .5rem; object-fit: cover; background: var(--surface-secondary); }
.attachment-file-icon { display: grid; place-items: center; color: var(--interactive-primary); }
.attachment-main { flex: 1; min-width: 0; }
.attachment-name-row { display: flex; align-items: baseline; gap: .5rem; }
.attachment-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-size: .88rem; font-weight: 600; }
.attachment-size { flex: none; color: var(--text-muted); font-size: .75rem; }
.attachment-status { color: var(--text-muted); font-size: .76rem; }
.attachment-status--ready { color: var(--semantic-success); }
.progress-track { height: 4px; margin: .4rem 0 .25rem; overflow: hidden; border-radius: 999px; background: var(--surface-secondary); }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--interactive-primary); transition: width .25s cubic-bezier(.22, 1, .36, 1); }
.icon-action { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border: 0; border-radius: .55rem; background: transparent; color: var(--text-muted); cursor: pointer; }
.icon-action:hover { background: var(--surface-secondary); color: var(--text-primary); }
.icon-action:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.tag-input-shell { position: relative; flex: 1; min-width: 0; }
.tag-input-shell > input { width: 100%; }
.tag-suggestions { position: absolute; z-index: 20; top: calc(100% + .35rem); left: 0; right: 0; max-height: 15rem; overflow-y: auto; padding: .35rem; border: 1px solid var(--border-primary); border-radius: .7rem; background: var(--surface-primary); box-shadow: 0 12px 30px color-mix(in srgb, var(--text-primary) 12%, transparent); }
.tag-suggestions__status { padding: .55rem .65rem; color: var(--text-muted); font-size: .82rem; }
.tag-suggestions__option { width: 100%; display: block; padding: .55rem .65rem; border: 0; border-radius: .45rem; background: transparent; color: var(--text-primary); text-align: left; font: inherit; font-size: .86rem; cursor: pointer; }
.tag-suggestions__option:hover, .tag-suggestions__option--active { background: color-mix(in srgb, var(--interactive-primary) 10%, transparent); color: var(--interactive-primary); }
.common-tags { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; color: var(--text-muted); font-size: .8rem; }
.common-tags button { padding: .25rem .55rem; border: 1px solid var(--border-primary); border-radius: 999px; background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: .78rem; cursor: pointer; }
.common-tags button:hover { border-color: var(--interactive-primary); color: var(--interactive-primary); }
.tag-list { display: flex; flex-wrap: wrap; gap: .45rem; }
.tag { display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .65rem; border-radius: 999px; background: var(--btn-primary-bg); color: var(--text-inverse); font-size: .82rem; }
.tag button { border: 0; padding: 0; background: transparent; color: inherit; font-size: 1.05rem; cursor: pointer; }
.tag--locked { border: 1px solid color-mix(in srgb, var(--interactive-primary) 25%, transparent); background: color-mix(in srgb, var(--interactive-primary) 10%, transparent); color: var(--interactive-primary); }
.global-error { display: flex; align-items: flex-start; gap: .55rem; padding: .8rem 1rem; border: 1px solid color-mix(in srgb, var(--semantic-error) 30%, transparent); border-radius: .7rem; background: color-mix(in srgb, var(--semantic-error) 7%, transparent); color: var(--semantic-error); font-size: .88rem; }
.form-actions { justify-content: flex-end; padding-top: .5rem; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .progress-track span { transition: none; }
  .spin { animation-duration: 1.5s; }
}
@media (max-width: 640px) {
  .composer { gap: 1.25rem; }
  .upload-actions, .tag-input-row { flex-direction: column; }
  .tag-input-shell { width: 100%; }
  .upload-actions .secondary-button, .tag-input-row .secondary-button { width: 100%; }
  .form-actions { position: sticky; bottom: 0; z-index: 2; margin: 0 -1rem -1rem; padding: .75rem 1rem calc(.75rem + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--surface-primary) 94%, transparent); backdrop-filter: blur(8px); }
  .form-actions > button { flex: 1; }
  .attachment-size { display: none; }
  .icon-action { width: 44px; height: 44px; }
}
</style>
