<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const {
  loading,
  authStatus,
  authMessage,
  isAuthenticated,
  visitorCount,
  signInWithGoogle,
} = useAuth()

const subtitle = computed(() => {
  if (authMessage.value) return authMessage.value
  if (visitorCount.value) return `已有 ${visitorCount.value} 位旅人到訪`
  return '以聲色意境，迎接每一位旅人'
})

const buttonDisabled = computed(() => {
  return authStatus.value === 'initializing' || 
         authStatus.value === 'connecting'
})

const handleEnterApp = async () => {
  if (isAuthenticated.value) {
    router.push('/poems')
  } else {
    await signInWithGoogle()
  }
}

// 如果已登入，自動跳轉
onMounted(() => {
  if (isAuthenticated.value) {
    setTimeout(() => {
      router.push('/poems')
    }, 500)
  }
})
</script>

<template>
  <!-- 登入覆蓋層（使用原版樣式） -->
  <div 
    id="auth-overlay" 
    :class="['auth-overlay', { 'hidden': isAuthenticated }]" 
    aria-live="polite"
  >
    <div class="auth-card">
      <i class="fas fa-mountain-sun auth-icon" aria-hidden="true"></i>
      <h1 class="auth-title">空山</h1>
      <p class="auth-subtitle">{{ subtitle }}</p>
      <button 
        class="auth-cta" 
        id="google-login-btn" 
        type="button"
        :disabled="buttonDisabled"
        @click="handleEnterApp"
      >
        進入空山
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局樣式 */
</style>
