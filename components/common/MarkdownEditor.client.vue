<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const props = defineProps<{
  modelValue: string
  height?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const toolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', '-',
  'link', 'image', 'table', 'code', 'codeRow', '-',
  'revoke', 'next', '=',
  'preview',
] as any[]
</script>

<template>
  <MdEditor
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :toolbars="toolbars"
    preview-theme="default"
    language="zh-CN"
    :style="{ height: height || '300px', borderRadius: '12px' }"
  />
</template>
