<template>
  <div class="reset-password-page">
    <div class="page-container">
      <AuthPasswordReset 
        :token="resetToken" 
        @reset-success="handleResetSuccess"
        @go-to-login="goToLogin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({ layout: 'keguang-auth' })

const route = useRoute()
const router = useRouter()
const resetToken = ref('')
const { t } = useI18n()
const { getLocalePath } = useAppLocale()

onMounted(() => {
  const token = route.query.token as string
  if (token) {
    resetToken.value = token
  } else {
    router.push(getLocalePath('/login'))
  }
})

function handleResetSuccess() {
  setTimeout(() => {
    router.push(getLocalePath('/login'))
  }, 2000)
}

function goToLogin() {
  router.push(getLocalePath('/login'))
}

useHead(() => ({
  title: `${t('auth.resetPassword.pageTitle')} - UniKorn Campus`,
}))
</script>

<style lang="scss" scoped>
.reset-password-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }
}

.page-container {
  width: 100%;
  max-width: 500px;
}
</style>
