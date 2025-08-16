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

// Get reset token from URL query parameters
const route = useRoute()
const router = useRouter()
const resetToken = ref('')

onMounted(() => {
  // Get token from URL parameters
  const token = route.query.token as string
  if (token) {
    resetToken.value = token
  } else {
    // If no token, redirect to login
    router.push('/login')
  }
})

// Handle successful password reset
function handleResetSuccess() {
  // Redirect to login page after successful reset
  setTimeout(() => {
    router.push('/login')
  }, 2000)
}

// Go to login page
function goToLogin() {
  router.push('/login')
}

// Set page title
useHead({
  title: '重置密码 - uniKorn 校园论坛'
})
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