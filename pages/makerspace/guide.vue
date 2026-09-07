<script setup lang="ts">
definePageMeta({ layout: 'keguang' })
const { t } = useI18n()
const { getLocalePath } = useAppLocale()
useHead({ title: computed(() => t('makerspace.guide')) })
</script>
<template>
  <main class="maker-page"><header class="maker-header"><div><h1>{{ t('makerspace.guide') }}</h1><p>{{ t('makerspace.guideIntro') }}</p></div><NuxtLink class="maker-button maker-button--primary" :to="getLocalePath('/makerspace/new')">{{ t('makerspace.create') }}</NuxtLink></header>
    <div class="maker-guide"><section v-for="step in ['prepare', 'connect', 'build', 'review', 'update']" :key="step" class="maker-card"><h2>{{ t(`makerspace.steps.${step}.title`) }}</h2><p>{{ t(`makerspace.steps.${step}.body`) }}</p><pre v-if="step === 'prepare'">{{ t('makerspace.example') }}</pre></section></div>
    <section class="maker-card"><h2>{{ t('makerspace.runtimeRules') }}</h2><p>{{ t('makerspace.runtimeRulesText') }}</p><p>{{ t('makerspace.resourceRules') }}</p><p>{{ t('makerspace.privacyRules') }}</p></section>
    <section class="maker-card"><h2>{{ t('makerspace.privateRepoHelp') }}</h2><p>{{ t('makerspace.deployKeyHelp') }}</p><a href="https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys" target="_blank" rel="noopener noreferrer">{{ t('makerspace.githubGuide') }}</a></section>
    <NuxtLink class="maker-button" :to="getLocalePath('/makerspace')">{{ t('makerspace.back') }}</NuxtLink>
  </main>
</template>
<style src="~/assets/css/makerspace.scss" lang="scss" />
