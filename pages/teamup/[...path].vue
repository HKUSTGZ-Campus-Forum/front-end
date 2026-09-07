<script setup lang="ts">
import { TEAMUP_SPACE_PATH, teamUpInnerPath } from '~/utils/makerspaceUrl'
definePageMeta({ layout: 'keguang' })
const route = useRoute()
const { getLocalePath } = useAppLocale()
const inner = teamUpInnerPath(route.path, '/teamup')
await navigateTo({ path: getLocalePath(`${TEAMUP_SPACE_PATH}${inner === '/' ? '' : inner}`), query: route.query, hash: route.hash }, { redirectCode: 308, replace: true })
</script>

<template><div /></template>
