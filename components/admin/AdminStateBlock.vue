<template>
  <div class="admin-state-block" :class="`admin-state-block--${tone}`">
    <strong>{{ title }}</strong>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  message?: string
  tone?: 'neutral' | 'error'
}>(), {
  tone: 'neutral'
})
</script>

<style scoped lang="scss">
.admin-state-block {
  padding: 1.25rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-secondary);
  box-shadow: var(--card-shadow);

  strong {
    color: var(--text-primary);
  }

  p {
    margin: 0.45rem 0 0;
    line-height: 1.6;
  }
}

.admin-state-block--error {
  border-color: color-mix(in srgb, var(--semantic-error) 35%, var(--border-primary));

  strong {
    color: var(--semantic-error);
  }
}
</style>
