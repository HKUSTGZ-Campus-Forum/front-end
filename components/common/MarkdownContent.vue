<script setup lang="ts">
import { computed } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

withDefaults(defineProps<{
  content?: string | null
}>(), {
  content: '',
})

const editorId = `markdown-preview-${useId().replaceAll(':', '-')}`

// Follow the site theme so the markdown preview swaps to dark token colors in
// dark mode (code blocks, blockquotes, tables etc.) instead of staying on the
// library's light "white paper" palette.
const { isDarkTheme } = useTheme()
const markdownTheme = computed(() => (isDarkTheme.value ? 'dark' : 'light'))
</script>

<template>
  <MdPreview
    :editor-id="editorId"
    :model-value="content || ''"
    :theme="markdownTheme"
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

  /* Re-map the library's hard-coded light/dark palette (pure black code blocks
     on dark, white on light) onto the site theme tokens so markdown surfaces
     match the surrounding card in both themes. */
  --md-theme-bg-color: var(--surface-primary);
  --md-theme-bg-color-inset: var(--surface-secondary);
  --md-theme-color: var(--text-primary);
  --md-theme-color-hover: var(--surface-secondary);
  --md-theme-border-color: var(--border-primary);
  --md-theme-code-inline-bg-color: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-secondary));
  --md-theme-code-inline-color: var(--text-primary);
  --md-theme-code-before-bg-color: var(--surface-secondary);
  --md-theme-code-block-bg-color: var(--surface-secondary);
  --md-theme-code-block-color: var(--text-primary);
  --md-theme-code-copy-tips-bg-color: var(--surface-elevated);
  --md-theme-quote-bg-color: color-mix(in srgb, var(--interactive-primary) 7%, var(--surface-secondary));
  --md-theme-quote-color: var(--text-secondary);
  --md-theme-quote-border: 4px solid var(--interactive-primary);
  --md-theme-table-stripe-color: var(--surface-secondary);
  --md-theme-table-tr-bg-color: var(--surface-primary);
  --md-theme-table-td-border-color: var(--border-primary);
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

<!-- Global override: the MdPreview root `.md-editor` is painted with the
     library's hard light/dark `--md-bk-color` (white on light, black on dark).
     A scoped `:deep()` rule can't reliably target the component root, so this
     non-scoped rule pins it to the card surface to match the page in both
     themes instead of a flat white or flat black slab. -->
<style>
.safe-markdown-content.md-editor {
  background: var(--surface-primary) !important;
  border-color: var(--border-primary) !important;
}
</style>
