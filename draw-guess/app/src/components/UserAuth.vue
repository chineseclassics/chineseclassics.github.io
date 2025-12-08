<template>
  <div class="user-auth">
    <!-- 未登入狀態 -->
    <div v-if="!authStore.isAuthenticated" class="space-y-3">
      <button
        @click="handleAnonymousSignIn"
        :disabled="authStore.loading"
        class="btn-minimal w-full"
      >
        {{ authStore.loading ? '處理中...' : '匿名遊玩' }}
      </button>
      
      <button
        @click="handleGoogleSignIn"
        :disabled="authStore.loading"
        class="btn-minimal w-full"
      >
        {{ authStore.loading ? '處理中...' : 'Google 登入' }}
      </button>
    </div>

    <!-- 已登入狀態 -->
    <div v-else class="flex items-center gap-3">
      <!-- 用戶信息 -->
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <img
          v-if="authStore.profile?.avatar_url"
          :src="authStore.profile.avatar_url"
          :alt="authStore.profile.display_name"
          class="w-8 h-8 rounded-full object-cover border-thin border-border-light"
        />
        <div
          v-else
          class="w-8 h-8 rounded-full bg-bg-secondary border-thin border-border-light flex items-center justify-center text-text-secondary text-sm"
        >
          {{ authStore.profile?.display_name?.charAt(0) || '?' }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm text-text-primary truncate">
            {{ authStore.profile?.display_name || '用戶' }}
          </div>
          <div class="text-xs text-text-secondary">
            {{ authStore.isAnonymous ? '匿名遊玩' : '已登入' }}
          </div>
        </div>
      </div>

      <!-- 登出按鈕 -->
      <button
        @click="handleSignOut"
        :disabled="authStore.loading"
        class="btn-minimal text-sm px-3 py-1.5"
      >
        {{ authStore.loading ? '處理中...' : '登出' }}
      </button>
    </div>

    <!-- 錯誤提示 -->
    <div
      v-if="authStore.error"
      class="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded-minimal border-thin border-red-200"
    >
      {{ authStore.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// 匿名登入處理
async function handleAnonymousSignIn() {
  const result = await authStore.signInAnonymously()
  if (result && !result.success) {
    console.error('匿名登入失敗:', result.error)
  }
}

// Google 登入處理
async function handleGoogleSignIn() {
  const result = await authStore.signInWithGoogle()
  if (result && !result.success) {
    console.error('Google 登入失敗:', result.error)
  }
}

// 登出處理
async function handleSignOut() {
  const result = await authStore.signOut()
  if (!result.success) {
    console.error('登出失敗:', result.error)
  }
}
</script>

<style scoped>
.user-auth {
  @apply w-full;
}
</style>

