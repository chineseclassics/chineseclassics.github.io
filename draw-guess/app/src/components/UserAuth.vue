<template>
  <div class="user-auth">
    <!-- 未登入狀態 -->
    <div v-if="!authStore.isAuthenticated">
      <!-- 暫時隱藏匿名登入，優先引導 Google 登入 -->
      <button
        v-if="false"
        @click="handleAnonymousSignIn"
        :disabled="authStore.loading"
        class="paper-btn btn-primary btn-block margin-bottom-small"
      >
        {{ authStore.loading ? '處理中...' : '匿名遊玩' }}
      </button>

      <button
        @click="handleGoogleSignIn"
        :disabled="authStore.loading"
        class="paper-btn btn-primary btn-block"
      >
        {{ authStore.loading ? '處理中...' : 'Google 登入' }}
      </button>
    </div>

    <!-- 已登入狀態 -->
    <div v-else>
      <div class="user-info-card border margin-bottom-small">
        <div class="row flex-middle margin-bottom-small">
          <!-- 用戶信息 -->
          <div class="col-8">
            <div class="row flex-middle">
              <div class="col-auto">
                <img
                  v-if="authStore.profile?.avatar_url"
                  :src="authStore.profile.avatar_url"
                  :alt="authStore.profile.display_name"
                  class="user-avatar border"
                />
                <div
                  v-else
                  class="user-avatar border user-avatar-placeholder"
                >
                  {{ authStore.profile?.display_name?.charAt(0) || '?' }}
                </div>
              </div>
              <div class="col">
                <div class="text-hand user-name">
                  {{ authStore.profile?.display_name || '用戶' }}
                </div>
                <div class="text-small user-status">
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

        <!-- 用戶統計數據（僅限 Google 登入用戶） -->
        <div v-if="authStore.isRegistered && authStore.profile" class="user-stats-inline">
          <!-- 統計數據行 -->
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">總積分</span>
              <span class="stat-value">{{ formatNumber(authStore.profile.total_score || 0) }}</span>
            </div>
          </div>

          <!-- 預留遊戲化功能位置 -->
          <div class="gamification-placeholder margin-top-small">
            <!-- 等級顯示（預留） -->
            <!-- 
            <div class="level-badge">
              <span class="level-label">等級</span>
              <span class="level-value">Lv. {{ userLevel }}</span>
            </div>
            -->

            <!-- Badge 顯示（預留） -->
            <!-- 
            <div class="badges-container">
              <div v-for="badge in userBadges" :key="badge.id" class="badge-item" :title="badge.name">
                <img :src="badge.icon" :alt="badge.name" />
              </div>
            </div>
            -->
          </div>
        </div>
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

// 格式化數字（添加千分位分隔符）
function formatNumber(num: number): string {
  return num.toLocaleString('zh-TW')
}
</script>

<style scoped>
.user-auth {
  width: 100%;
}

/* 用戶信息卡片 - PaperCSS 直角風格 */
.user-info-card {
  padding: 0.875rem 1rem;
  background-color: var(--bg-card, #FFFFFF);
  border: 2px solid var(--border-color, #8B7355);
  border-radius: 0;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 0;
  object-fit: cover;
  border: 2px solid var(--border-color, #8B7355);
  display: block;
}

.user-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary, #F5F1E8);
  color: var(--text-primary, #2C2416);
  font-size: 1.25rem;
  font-weight: 600;
  font-family: var(--font-head, 'LXGW WenKai TC', serif);
}

.user-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #2C2416);
  margin-bottom: 0.25rem;
}

.user-status {
  color: var(--text-secondary, #5C4A37);
}

/* 用戶統計數據（合併到用戶信息卡片內） */
.user-stats-inline {
  padding-top: 0.75rem;
  border-top: 2px solid var(--border-light, #A89B8C);
}

.stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #666);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary, #E07B67);
  font-family: var(--font-head, 'LXGW WenKai TC', serif);
  letter-spacing: 1px;
}

.gamification-placeholder {
  padding-top: 0.75rem;
  border-top: 2px dashed var(--border-light, #A89B8C);
  min-height: 40px;
  /* 預留空間，將來添加等級和 badge 時使用 */
}

/* 預留的等級樣式（將來使用） */
.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-primary, #E07B67);
  color: white;
  border: 2px solid var(--border-color, #8B7355);
  /* PaperCSS 直角風格 */
  border-radius: 0;
  font-size: 0.875rem;
}

.level-label {
  opacity: 0.9;
}

.level-value {
  font-weight: 600;
  font-size: 1rem;
}

/* 預留的 Badge 樣式（將來使用） */
.badges-container {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border-color, #ddd);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary, #fff);
}

.badge-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

