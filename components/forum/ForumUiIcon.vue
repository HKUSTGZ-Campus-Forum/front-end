<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <svg v-if="name === 'back'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>

  <svg v-else-if="name === 'eye'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>

  <svg v-else-if="name === 'comment'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 4v-4H7.5A2.5 2.5 0 0 1 5 12.5Z" />
    <path d="M9 8.5h6" />
    <path d="M9 11.5h4.5" />
  </svg>

  <svg v-else-if="name === 'share'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 16 16 8" />
    <path d="M10 8h6v6" />
    <path d="M16 13v4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h4" />
  </svg>

  <svg v-else-if="name === 'check'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 7 10 17l-5-5" />
  </svg>

  <svg v-else-if="name === 'delete'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M7.5 7l.7 11a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-11" />
    <path d="M10 10.5v5" />
    <path d="M14 10.5v5" />
  </svg>

  <svg v-else-if="name === 'heart'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20.5 4.8 13.6A4.8 4.8 0 0 1 11.6 7l.4.5.4-.5a4.8 4.8 0 0 1 6.8 6.7Z" />
  </svg>

  <svg v-else-if="name === 'plus-one'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 6v12" />
    <path d="M6 10h8" />
    <path d="M16.5 8.5 19 7v10" />
  </svg>

  <svg v-else-if="name === 'celebrate'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 18 9.5 8.5 19 12 6 18Z" />
    <path d="M14.5 5.5v2" />
    <path d="M18.5 7.5 17 9" />
    <path d="M19.5 12h-2" />
    <path d="M12 4l.4.9L13.3 5l-.9.4-.4.9-.4-.9-.9-.4.9-.1Z" />
  </svg>

  <svg v-else-if="name === 'chevron-down'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>

  <svg v-else-if="name === 'info'" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10.5v5" />
    <path d="M12 7.5h.01" />
  </svg>

  <svg v-else viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
  </svg>
</template>

<style scoped>
svg {
  width: 1em;
  height: 1em;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
}
</style>
