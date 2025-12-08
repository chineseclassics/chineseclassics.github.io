<template>
  <div class="user-auth">
    <!-- 未登入狀態 -->
    <div v-if="!authStore.isAuthenticated">
      <button
        @click="handleAnonymousSignIn"
        :disabled="authStore.loading"
        class="paper-btn btn-primary btn-block margin-bottom-small"
      >
        {{ authStore.loading ? '處理中...' : '匿名遊玩' }}
      </button>
      
      <button
        @click="handleGoogleSignIn"
        :disabled="authStore.loading"
        class="paper-btn btn-secondary btn-block"
      >
        {{ authStore.loading ? '處理中...' : 'Google 登入' }}
      </button>
    </div>

    <!-- 已登入狀態 -->
    <div v-else class="row flex-middle">
      <!-- 用戶信息 -->
      <div class="col-8">
        <div class="row flex-middle">
          <div class="col-2">
            <img
              v-if="authStore.profile?.avatar_url"
              :src="authStore.profile.avatar_url"
              :alt="authStore.profile.display_name"
              class="border"
              style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border-color: var(--border-color);"
            />
            <div
              v-else
              class="border"
              style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-secondary); border-color: var(--border-light); color: var(--text-primary);"
            >
              {{ authStore.profile?.display_name?.charAt(0) || '?' }}
            </div>
          </div>
          <div class="col-10">
            <div class="text-hand">
              {{ authStore.profile?.display_name || '用戶' }}
            </div>
            <div class="text-small">
              {{ authStore.isAnonymous ? '匿名遊玩' : '已登入' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 登出按鈕 -->
      <div class="col-4 text-right">
        <button
          @click="handleSignOut"
          :disabled="authStore.loading"
          class="paper-btn btn-small"
        >
          {{ authStore.loading ? '處理中...' : '登出' }}
        </button>
      </div>
    </div>

    <!-- 錯誤提示 -->
    <div
      v-if="authStore.error"
      class="alert alert-danger margin-top-small"
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
  width: 100%;
}
</style>

