<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

withDefaults(defineProps<{
  content?: string | null
}>(), {
  content: '',
})

const editorId = `markdown-preview-${useId().replaceAll(':', '-')}`
</script>

<template>
  <MdPreview
    :editor-id="editorId"
    :model-value="content || ''"
    preview-theme="default"
    class="safe-markdown-content"
  />
</template>

<style scoped>
:deep(.md-editor-preview-wrapper) {
  padding: 0;
}

:deep(.md-editor-preview) {
  color: var(--text-primary);
  background: transparent;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.78;
  overflow-wrap: anywhere;
}

:deep(.md-editor-preview > :first-child) {
  margin-top: 0;
}

:deep(.md-editor-preview > :last-child) {
  margin-bottom: 0;
}

:deep(.md-editor-preview a) {
  color: var(--color-primary);
}

:deep(.md-editor-preview img),
:deep(.md-editor-preview video) {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
}

:deep(.md-editor-preview pre) {
  max-width: 100%;
  overflow-x: auto;
  border-radius: 0.75rem;
}

:deep(.md-editor-preview table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}
</style>
