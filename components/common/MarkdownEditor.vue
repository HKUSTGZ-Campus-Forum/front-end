<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import type { ExposeParam, UploadImgCallBack } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const modelValue = defineModel<string>({ default: '' })

const { locale } = useI18n()
const editorRef = ref<ExposeParam | null>(null)
const isMobile = ref(false)
let mobileQuery: MediaQueryList | null = null

defineProps<{
  height?: string
  toolbars?: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  uploadImage: [files: File[], callback: UploadImgCallBack]
  uploadFiles: [files: File[], insertImages: boolean]
}>()

const defaultToolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', '-',
  'link', 'image', 'table', 'code', 'codeRow', '-',
  'revoke', 'next', '=',
  'preview',
]

const editorLanguage = computed(() => locale.value.startsWith('zh') ? 'zh-CN' : 'en-US')

const syncMobilePreview = () => {
  isMobile.value = Boolean(mobileQuery?.matches)
  nextTick(() => editorRef.value?.togglePreview(!isMobile.value))
}
onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 640px)')
  syncMobilePreview()
  mobileQuery.addEventListener('change', syncMobilePreview)
})
onBeforeUnmount(() => mobileQuery?.removeEventListener('change', syncMobilePreview))

const handlePasteCapture = (event: ClipboardEvent) => {
  const files = Array.from(event.clipboardData?.files || [])
  const nonImages = files.filter((file) => !file.type.startsWith('image/'))
  if (nonImages.length) emit('uploadFiles', nonImages, false)
}

const handleDropCapture = (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  if (!files.length) return
  event.preventDefault()
  event.stopPropagation()
  emit('uploadFiles', files, true)
}

const insertMarkdown = (markdown: string) => {
  editorRef.value?.insert(() => ({ targetValue: markdown, select: false }))
  editorRef.value?.focus()
}

defineExpose({ insertMarkdown })
</script>

<template>
  <div class="markdown-editor-shell" @paste.capture="handlePasteCapture" @drop.capture="handleDropCapture">
    <MdEditor
      ref="editorRef"
      v-model="modelValue"
      :toolbars="(toolbars || defaultToolbars) as any"
      preview-theme="default"
      :preview="!isMobile"
      :language="editorLanguage"
      :placeholder="placeholder"
      :style="{ height: height || '300px' }"
      @on-upload-img="(files, callback) => emit('uploadImage', files, callback)"
    />
  </div>
</template>

<style scoped>
:deep(.md-editor) {
  border-radius: 12px !important;
  border-color: var(--border-primary, #c8dff8) !important;
}

.markdown-editor-shell {
  min-width: 0;
}

:deep(.md-editor-input-wrapper textarea) {
  font-size: 15px;
  line-height: 1.7;
}
</style>
