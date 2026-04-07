<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const modelValue = defineModel<string>({ default: '' })

defineProps<{
  height?: string
  toolbars?: string[]
}>()

const defaultToolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', '-',
  'link', 'image', 'table', 'code', 'codeRow', '-',
  'revoke', 'next', '=',
  'preview',
]
</script>

<template>
  <MdEditor
    v-model="modelValue"
    :toolbars="(toolbars || defaultToolbars) as any"
    preview-theme="default"
    language="zh-CN"
    :style="{ height: height || '300px' }"
  />
</template>

<style scoped>
:deep(.md-editor) {
  border-radius: 12px !important;
  border-color: #c8dff8 !important;
}
</style>
