<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUserStatsStore } from '../stores/userStatsStore'

const authStore = useAuthStore()
const userStatsStore = useUserStatsStore()

// 用戶信息
const displayName = computed(() => authStore.displayName || '訪客')
const avatarUrl = computed(() => authStore.avatarUrl)
const email = computed(() => authStore.user?.email || '')
const roleLabel = computed(() => authStore.isTeacher ? '老師' : '學生')

// 統計數據
const stats = computed(() => userStatsStore.stats)
const level = computed(() => userStatsStore.level)
const levelProgress = computed(() => userStatsStore.levelProgress)
const expToNextLevel = computed(() => userStatsStore.expToNextLevel)
const accuracy = computed(() => userStatsStore.accuracy)

// 登出
async function handleLogout() {
  await authStore.logout()
  userStatsStore.reset()
}

onMounted(() => {
  if (authStore.isAuthenticated && !stats.value) {
    userStatsStore.fetchStats()
  }
})
</script>

<template>
  <main class="profile-container">
    <!-- 用戶基本信息卡片 -->
    <section class="profile-header edamame-glass">
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" class="avatar-img" />
          <div v-else class="avatar-placeholder">{{ displayName.charAt(0) }}</div>
        </div>
        <div class="level-badge">Lv.{{ level }}</div>
      </div>
      
      <div class="user-info">
        <h1 class="user-name">{{ displayName }}</h1>
        <p class="user-role">{{ roleLabel }}</p>
        <p class="user-email">{{ email }}</p>
      </div>

      <button v-if="authStore.isAuthenticated" class="logout-btn" @click="handleLogout">
        登出
      </button>
    </section>

    <!-- 豆子和等級 -->
    <section class="stats-section">
      <div class="stat-card edamame-glass beans-card">
        <div class="stat-icon">🫘</div>
        <div class="stat-content">
          <p class="stat-label">我的豆子</p>
          <p class="stat-value">{{ stats?.beans ?? 0 }}</p>
        </div>
      </div>

      <div class="stat-card edamame-glass level-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <p class="stat-label">當前等級</p>
          <p class="stat-value">Lv.{{ level }}</p>
          <div class="level-progress-bar">
            <div class="level-progress-fill" :style="{ width: levelProgress + '%' }"></div>
          </div>
          <p class="stat-detail">距離下一級還需 {{ expToNextLevel }} 經驗</p>
        </div>
      </div>
    </section>

    <!-- 學習統計 -->
    <section class="learning-stats edamame-glass">
      <h2 class="section-title">學習統計</h2>
      
      <div class="stats-grid">
        <div class="mini-stat">
          <p class="mini-stat-value">{{ stats?.total_practices ?? 0 }}</p>
          <p class="mini-stat-label">總練習次數</p>
        </div>
        
        <div class="mini-stat">
          <p class="mini-stat-value">{{ stats?.correct_count ?? 0 }}</p>
          <p class="mini-stat-label">正確次數</p>
        </div>
        
        <div class="mini-stat">
          <p class="mini-stat-value">{{ accuracy }}%</p>
          <p class="mini-stat-label">正確率</p>
        </div>
        
        <div class="mini-stat">
          <p class="mini-stat-value">{{ stats?.streak_days ?? 0 }}</p>
          <p class="mini-stat-label">連續學習天數</p>
        </div>
      </div>
    </section>

    <!-- 總經驗值 -->
    <section class="exp-section edamame-glass">
      <h2 class="section-title">經驗值</h2>
      <div class="exp-display">
        <span class="exp-value">{{ stats?.total_exp ?? 0 }}</span>
        <span class="exp-label">EXP</span>
      </div>
    </section>

    <!-- 未登入提示 -->
    <section v-if="!authStore.isAuthenticated" class="login-prompt edamame-glass">
      <p>登入後可查看完整的學習數據</p>
      <button class="login-btn" @click="authStore.loginWithGoogle">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        使用 Google 登入
      </button>
    </section>
  </main>
</template>

<style scoped>
.profile-container {
  padding: clamp(1.5rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

/* 用戶頭部 */
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  position: relative;
}

.avatar-section {
  position: relative;
}

.avatar-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-primary-700);
}

.level-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.user-info {
  flex: 1;
}

.user-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.user-role {
  margin: 0.25rem 0;
  color: var(--color-primary-600);
  font-weight: 500;
}

.user-email {
  margin: 0;
  color: var(--color-neutral-500);
  font-size: 0.875rem;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid #e53935;
  color: #e53935;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #ffebee;
}

/* 統計區域 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-content {
  flex: 1;
}

.stat-label {
  margin: 0;
  color: var(--color-neutral-500);
  font-size: 0.875rem;
}

.stat-value {
  margin: 0.25rem 0;
  font-size: 1.75rem;
  font-weight: bold;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-detail {
  margin: 0;
  color: var(--color-neutral-500);
  font-size: 0.75rem;
}

/* 等級進度條 */
.level-progress-bar {
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: 3px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.level-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400));
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 學習統計 */
.learning-stats {
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.mini-stat {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

.mini-stat-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-primary-600);
}

.mini-stat-label {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* 經驗值區域 */
.exp-section {
  padding: 1.5rem;
}

.exp-display {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.exp-value {
  font-size: 2.5rem;
  font-weight: bold;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.exp-label {
  font-size: 1rem;
  color: var(--color-neutral-500);
  font-weight: 500;
}

/* 登入提示 */
.login-prompt {
  padding: 2rem;
  text-align: center;
}

.login-prompt p {
  margin: 0 0 1rem;
  color: var(--color-neutral-600);
}

.login-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.login-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

/* 響應式 */
@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .logout-btn {
    position: static;
    margin-top: 1rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

