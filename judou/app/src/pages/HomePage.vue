<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from '../stores/homeStore'
import { useUserStatsStore, type LeaderboardType } from '../stores/userStatsStore'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const homeStore = useHomeStore()
const userStatsStore = useUserStatsStore()
const authStore = useAuthStore()

const { topPoems, poemsLoading, poemsError } = storeToRefs(homeStore)
const { rankInfo, leaderboard, leaderboardLoading } = storeToRefs(userStatsStore)

// 排行榜類型標籤
const leaderboardTabs = [
  { type: 'total' as LeaderboardType, label: '總榜' },
  { type: 'weekly' as LeaderboardType, label: '周榜' },
  { type: 'monthly' as LeaderboardType, label: '月榜' }
]

// 排行榜數據
const myRank = computed(() => rankInfo.value?.rank ?? '-')
const totalUsers = computed(() => rankInfo.value?.totalUsers ?? 0)

// 當前選中的排行榜類型
const selectedLeaderboardType = ref<LeaderboardType>('total')

function goToRoute(routeName: string) {
  router.push({ name: routeName })
}

// 格式化豆子數
function formatBeans(beans: number) {
  return new Intl.NumberFormat('zh-Hant').format(beans)
}

// 切換排行榜類型
async function switchLeaderboard(type: LeaderboardType) {
  selectedLeaderboardType.value = type
  await userStatsStore.fetchLeaderboard(type)
}

onMounted(async () => {
  if (!topPoems.value.length) {
    homeStore.fetchLatestPoems()
  }
  
  // 獲取排行榜
  await userStatsStore.fetchLeaderboard('total')
  
  // 獲取當前用戶的資料
  if (authStore.isAuthenticated) {
    await userStatsStore.fetchProfile()
  }
})
</script>

<template>
  <main class="judou-container edamame-bg">
    <section class="judou-grid">
      <!-- 排行榜：前 10 名 -->
      <article class="edamame-glass hover-lift judou-card leaderboard-card">
        <div class="leaderboard-header">
          <p class="edamame-text-level-subtitle">🏆 排行榜 TOP 10</p>
          <span v-if="authStore.isAuthenticated && myRank !== '-'" class="my-rank-badge">
            我的排名：#{{ myRank }} / {{ totalUsers }}
          </span>
        </div>
        
        <!-- 排行榜類型切換 -->
        <div class="leaderboard-tabs">
          <button
            v-for="tab in leaderboardTabs"
            :key="tab.type"
            class="leaderboard-tab"
            :class="{ active: selectedLeaderboardType === tab.type }"
            @click="switchLeaderboard(tab.type)"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <!-- 載入中 -->
        <div v-if="leaderboardLoading" class="leaderboard-loading">
          <p>載入中...</p>
        </div>
        
        <!-- 排行榜列表 -->
        <ul v-else-if="leaderboard.length" class="top10-list">
          <li 
            v-for="entry in leaderboard" 
            :key="entry.userId"
            class="top10-item"
            :class="{ 'is-current-user': entry.isCurrentUser }"
          >
            <span class="top10-rank" :class="`rank-${entry.rank}`">
              <template v-if="entry.rank === 1">🥇</template>
              <template v-else-if="entry.rank === 2">🥈</template>
              <template v-else-if="entry.rank === 3">🥉</template>
              <template v-else>#{{ entry.rank }}</template>
            </span>
            <span class="top10-name">{{ entry.name }}</span>
            <span class="top10-beans">{{ formatBeans(entry.beans) }} 豆</span>
          </li>
        </ul>
        
        <!-- 空狀態 -->
        <div v-else class="leaderboard-empty">
          <p>暫無排行數據</p>
          <p class="empty-hint">完成練習即可上榜！</p>
        </div>
      </article>

      <!-- 快速操作 -->
      <article class="edamame-glass hover-lift judou-card">
        <p class="edamame-text-level-subtitle">快速進入</p>
        <div class="actions-grid">
          <button
            class="edamame-sidebar-item judou-action"
            @click="goToRoute('practice')"
          >
            <div>
              <p class="edamame-text-level-subtitle">開始練習</p>
              <p class="edamame-text-level-detail">選擇文章斷句</p>
            </div>
          </button>
        </div>
      </article>

      <article class="edamame-glass hover-lift judou-card">
        <div class="poem-header">
          <p class="edamame-text-level-subtitle">最新詩文</p>
          <span class="edamame-text-level-detail" v-if="poemsLoading">載入中…</span>
        </div>

        <p v-if="poemsError" class="poem-error edamame-text-level-detail">
          {{ poemsError }}
        </p>

        <ul v-else class="poem-list">
          <li v-for="poem in topPoems" :key="poem.id" class="poem-item">
            <p class="poem-title edamame-text-level-subtitle">{{ poem.title }}</p>
            <p class="poem-author edamame-text-level-detail">{{ poem.author || '佚名' }}</p>
          </li>
          <li v-if="!topPoems.length && !poemsLoading" class="poem-item">
            <p class="edamame-text-level-detail">暫無練習文章</p>
          </li>
        </ul>
      </article>
    </section>
  </main>
</template>

<style scoped>
.judou-container {
  min-height: 100vh;
  padding: clamp(1.5rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  position: relative;
}

.judou-card {
  padding: clamp(1.25rem, 2vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.judou-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.judou-action {
  text-decoration: none;
}

/* 排行榜卡片 */
.leaderboard-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(254, 243, 199, 0.3));
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.my-rank-badge {
  font-size: var(--text-sm);
  color: var(--color-primary-600);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-weight: 500;
}

/* 排行榜類型切換 */
.leaderboard-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
}

.leaderboard-tab {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-neutral-500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.leaderboard-tab:hover {
  color: var(--color-neutral-700);
  background: rgba(255, 255, 255, 0.5);
}

.leaderboard-tab.active {
  background: white;
  color: var(--color-primary-600);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.leaderboard-loading,
.leaderboard-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-neutral-500);
}

.empty-hint {
  font-size: var(--text-sm);
  margin-top: 0.5rem;
  color: var(--color-neutral-400);
}

/* 前 10 名列表 */
.top10-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.top10-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.top10-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(2px);
}

.top10-item.is-current-user {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
  border-color: rgba(59, 130, 246, 0.2);
}

.top10-rank {
  min-width: 2rem;
  text-align: center;
  font-weight: 600;
  color: var(--color-neutral-500);
}

.top10-rank.rank-1,
.top10-rank.rank-2,
.top10-rank.rank-3 {
  font-size: 1.25rem;
}

.top10-name {
  flex: 1;
  font-weight: 500;
  color: var(--color-neutral-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top10-item.is-current-user .top10-name {
  color: var(--color-primary-700);
}

.top10-beans {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  font-weight: 500;
}

.poem-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.poem-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.poem-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.poem-item:last-of-type {
  border-bottom: none;
}

.poem-title {
  margin: 0;
}

.poem-author {
  margin: 0.125rem 0 0;
}

.poem-error {
  margin-top: 0.75rem;
  color: var(--color-error);
}
</style>
