<script setup lang="ts">
import { useThemeStore } from '~/store/themeStore'

const themeStore = useThemeStore()

const isKeguangTheme = computed(() => {
  return themeStore.currentTheme === 'keguang-blue'
})
</script>

<template>
  <div>
    <HomeKeguangContainer v-if="isKeguangTheme">
      <slot />
    </HomeKeguangContainer>
    <HomeContainer v-else>
      <slot />
    </HomeContainer>
  </div>
</template>
