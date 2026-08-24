import { XSSPlugin, config } from 'md-editor-v3'

// Raw HTML is useful in Markdown, but it must never become executable content.
// Register md-editor-v3's maintained XSS filter once for every editor/preview.
config({
  markdownItConfig(markdownIt) {
    markdownIt.use(XSSPlugin, {})
  },
})

export default defineNuxtPlugin(() => {})
