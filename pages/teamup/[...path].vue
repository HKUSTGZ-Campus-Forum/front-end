<script setup lang="ts">
import TeamUpHostPage from '~/components/teamup/TeamUpHostPage.vue'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
useSeoMeta({
  title: () => t('teamupIntegration.metaTitle'),
  description: () => t('teamupIntegration.metaDescription'),
})
</script>

<template>
  <TeamUpHostPage />
</template>
