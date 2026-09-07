<script setup lang="ts">
import { MAKERSPACE_PUBLIC_PREFIX, makerSpaceUrl } from '~/utils/makerspaceUrl'
import type { MakerDraft } from '~/types/makerspace'
const model = defineModel<MakerDraft>({ required: true })
defineProps<{ editing?: boolean; disabled?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <fieldset :disabled="disabled" style="border: 0; padding: 0; margin: 0; min-width: 0">
    <div class="maker-fields">
      <label v-if="!editing" class="maker-wide">{{ t('makerspace.form.slug') }}<small>{{ MAKERSPACE_PUBLIC_PREFIX }}/</small><input v-model="model.slug" required pattern="[a-z][a-z0-9-]{2,39}" maxlength="40" autocomplete="off" /><small>{{ t('makerspace.form.slugHint') }}</small><output class="maker-url-preview">{{ model.slug ? makerSpaceUrl(model.slug) : `${MAKERSPACE_PUBLIC_PREFIX}/${t('makerspace.form.slugExample')}` }}</output></label>
      <label>{{ t('makerspace.form.titleZh') }}<input v-model="model.title_zh" required maxlength="100" lang="zh" /></label>
      <label>{{ t('makerspace.form.titleEn') }}<input v-model="model.title_en" required maxlength="100" lang="en" /></label>
      <label>{{ t('makerspace.form.descriptionZh') }}<textarea v-model="model.description_zh" required maxlength="3000" lang="zh" /></label>
      <label>{{ t('makerspace.form.descriptionEn') }}<textarea v-model="model.description_en" required maxlength="3000" lang="en" /></label>
      <label>{{ t('makerspace.form.category') }}<select v-model="model.category"><option v-for="category in ['tools', 'learning', 'campus', 'games', 'other']" :key="category" :value="category">{{ t(`makerspace.categories.${category}`) }}</option></select></label>
      <label>{{ t('makerspace.form.runtime') }}<select v-model="model.settings.runtime"><option value="static">{{ t('makerspace.form.static') }}</option><option value="node">Node.js</option><option value="python">Python</option></select></label>
      <label>{{ t('makerspace.form.repository') }}<input v-model="model.repository" required maxlength="200" placeholder="owner/repository" spellcheck="false" /><small>{{ t('makerspace.form.repositoryHint') }}</small></label>
      <label>{{ t('makerspace.form.branch') }}<input v-model="model.branch" required maxlength="100" spellcheck="false" /></label>
      <label>{{ t('makerspace.form.directory') }}<input v-model="model.settings.directory" required maxlength="160" spellcheck="false" /></label>
      <label v-if="model.settings.runtime === 'static'">{{ t('makerspace.form.output') }}<input v-model="model.settings.output_directory" required maxlength="160" spellcheck="false" /></label>
      <label class="maker-wide">{{ t('makerspace.form.build') }}<input v-model="model.settings.build_command" maxlength="1000" spellcheck="false" /><small>{{ t('makerspace.form.buildHint') }}</small></label>
      <label v-if="model.settings.runtime !== 'static'" class="maker-wide">{{ t('makerspace.form.start') }}<input v-model="model.settings.start_command" required maxlength="1000" spellcheck="false" /><small>{{ t('makerspace.form.startHint') }}</small></label>
      <label class="maker-wide maker-check"><input v-model="model.auto_deploy" type="checkbox" />{{ t('makerspace.form.autoDeploy') }}</label>
    </div>
  </fieldset>
</template>

<style scoped>
.maker-url-preview { overflow-wrap: anywhere; font-size: 0.875rem; line-height: 1.5; color: var(--text-secondary); }
</style>
