<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'keguang',
  middleware: 'auth',
  requiresAuth: true,
})

const { user } = useAuth()
const route = useRoute()
const { t } = useI18n()
const redirectError = ref('')

useHead(() => ({
  title: `${t('profileRedirect.pageTitle')} - UniKorn Campus`,
}))

const decodeJwtUserId = (token: string): string | null => {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return null
    const payload = JSON.parse(atob(payloadBase64))
    return String(payload.sub || payload.id || '') || null
  } catch {
    return null
  }
}

const resolveCurrentUserId = (): string | null => {
  if (user.value?.id) return String(user.value.id)

  if (!process.client) return null

  try {
    const storedUser = localStorage.getItem('user_info')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser?.id) {
        return String(parsedUser.id)
      }
    }
  } catch {
    // ignore malformed local data
  }

  const token = localStorage.getItem('auth_token')
  if (token) {
    return decodeJwtUserId(token)
  }

  return null
}

onMounted(async () => {
  const uid = resolveCurrentUserId()
  const prefix = route.path.startsWith('/en') ? '/en' : ''

  if (uid) {
    await navigateTo(`${prefix}/users/${uid}`, { replace: true })
    return
  }

  redirectError.value = t('profileRedirect.missingAuth')
  await navigateTo({
    path: `${prefix}/login`,
    query: { redirect: `${prefix}/profile` },
  }, { replace: true })
})
</script>

<template>
  <div class="profile-redirect-page">
    <div class="redirect-card">
      <div class="spinner" aria-hidden="true"></div>
      <p>{{ redirectError || t('profileRedirect.redirecting') }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-redirect-page {
  width: 100%;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.redirect-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1.5px solid #c8dff8;
  background: #f5fbfe;
  color: #4a6080;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: profile-redirect-spin 0.8s linear infinite;
}

@keyframes profile-redirect-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
