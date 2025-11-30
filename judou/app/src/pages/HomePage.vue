<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from '../stores/homeStore'
import { useUserStatsStore, type LeaderboardType } from '../stores/userStatsStore'
import { useAuthStore } from '../stores/authStore'
import BeanIcon from '../components/common/BeanIcon.vue'
import { BookOpen } from 'lucide-vue-next'

const router = useRouter()
const homeStore = useHomeStore()
const userStatsStore = useUserStatsStore()
const authStore = useAuthStore()

const { latestItems, latestLoading, latestError } = storeToRefs(homeStore)
const { rankInfo, leaderboard, leaderboardLoading, profile, level } = storeToRefs(userStatsStore)

// 從 profile 中獲取連續天數
const streakDays = computed(() => profile.value?.streak_days ?? 0)

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

// 格式化豆子數
function formatBeans(beans: number) {
  return new Intl.NumberFormat('zh-Hant').format(beans)
}

// 今日統計
const todayStats = computed(() => {
  if (!authStore.isAuthenticated || !profile.value) return null
  return {
    beans: profile.value.weekly_beans || 0, // 本週豆子
    streak: streakDays.value,
    level: level.value || 1
  }
})

// 切換排行榜類型
async function switchLeaderboard(type: LeaderboardType) {
  selectedLeaderboardType.value = type
  await userStatsStore.fetchLeaderboard(type)
}

// 處理最新內容點擊
function handleLatestItemClick(item: { id: string; type: 'practice' | 'reading' }) {
  if (item.type === 'practice') {
    // 句豆：直接開始斷句練習
    router.push({ 
      name: 'practice', 
      query: { textId: item.id } 
    })
  } else {
    // 品豆：進入閱讀頁面
    router.push({ 
      name: 'reading-detail', 
      params: { id: item.id } 
    })
  }
}

onMounted(async () => {
  if (!latestItems.value.length) {
    homeStore.fetchLatestItems()
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
    <div class="home-layout">
      <!-- 左側：快速進入、今日統計、最新詩文 -->
      <aside class="home-left">
        <!-- 今日統計（已登入時顯示） -->
        <article v-if="authStore.isAuthenticated && todayStats" class="edamame-glass hover-lift judou-card stats-card">
          <p class="edamame-text-level-subtitle">今日統計</p>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon">
                <BeanIcon :size="20" />
              </div>
              <div class="stat-content">
                <p class="stat-value">{{ formatBeans(todayStats.beans) }}</p>
                <p class="stat-label">本週句豆</p>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">🔥</div>
              <div class="stat-content">
                <p class="stat-value">{{ todayStats.streak }}</p>
                <p class="stat-label">連續天數</p>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">📖</div>
              <div class="stat-content">
                <p class="stat-value">Lv.{{ todayStats.level }}</p>
                <p class="stat-label">當前等級</p>
              </div>
            </div>
          </div>
        </article>

        <!-- 最新 -->
        <article class="edamame-glass hover-lift judou-card latest-card">
          <div class="latest-header">
            <p class="edamame-text-level-subtitle">最新</p>
            <span class="edamame-text-level-detail" v-if="latestLoading">載入中…</span>
          </div>

          <p v-if="latestError" class="latest-error edamame-text-level-detail">
            {{ latestError }}
          </p>

          <ul v-else class="latest-list">
            <li 
              v-for="item in latestItems" 
              :key="`${item.type}-${item.id}`" 
              class="latest-item"
              @click="handleLatestItemClick(item)"
            >
              <div class="item-type-badge" :class="item.type">
                <BeanIcon v-if="item.type === 'practice'" :size="14" />
                <BookOpen v-else :size="14" :stroke-width="1.5" />
                <span>{{ item.type === 'practice' ? '句豆' : '品豆' }}</span>
              </div>
              <div class="item-content">
                <p class="item-title edamame-text-level-subtitle">{{ item.title }}</p>
                <p class="item-author edamame-text-level-detail">{{ item.author || '佚名' }}</p>
              </div>
            </li>
            <li v-if="!latestItems.length && !latestLoading" class="latest-item empty">
              <p class="edamame-text-level-detail">暫無最新內容</p>
            </li>
          </ul>
        </article>
      </aside>

      <!-- 右側：排行榜（較長） -->
      <aside class="home-right">
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
      </aside>
        </div>
  </main>
</template>

<style scoped>
.judou-container {
  min-height: 100vh;
  padding: clamp(1.5rem, 3vw, 3rem);
  position: relative;
  overflow-x: hidden;
  /* 內容不超過視窗時不顯示滾動條，超過時自然滾動 */
}

/* 主佈局：兩欄（桌面）或單欄（移動） */
.home-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1.5rem, 3vw, 2rem);
  max-width: 1400px;
  margin: 0 auto;
}

/* 左側和右側卡片容器（移動端和桌面端都應用） */
.home-left,
.home-right {
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.25vw, 1rem);
}

/* 桌面端：兩欄佈局 */
@media (min-width: 1024px) {
  .home-layout {
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
  }
  
  .home-left {
    position: sticky;
    top: 2rem;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: clamp(0.75rem, 1.25vw, 1rem);
    height: 100%;
    min-height: 0;
  }
  
  .home-right {
    height: 100%;
  }
  
  /* 確保左側兩個卡片的高度加上 gap 等於右側卡片高度 */
  .home-left .stats-card {
    flex: 0 0 auto;
  }
  
  .home-left .latest-card {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  
  /* 最新卡片內容不滾動，自動適應高度 */
  .home-left .latest-card .latest-list {
    flex: 1;
    overflow: visible;
  }
}

.judou-card {
  padding: clamp(1.25rem, 2vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

/* 最新內容卡片 */
.latest-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.375rem;
  flex-shrink: 0;
}

.latest-header .edamame-text-level-subtitle {
  margin: 0;
}

.latest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.latest-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.latest-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(2px);
  border-color: var(--color-primary-300);
}

.latest-item.empty {
  cursor: default;
  background: transparent;
  border: none;
  padding: 0.75rem 0;
}

.latest-item.empty:hover {
  transform: none;
  border-color: transparent;
}

.item-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.item-type-badge.practice {
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  color: var(--color-primary-700);
}

.item-type-badge.reading {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
  color: #2563eb;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-author {
  margin: 0.1rem 0 0;
  font-size: var(--text-xs);
}

.latest-error {
  margin-top: 0.75rem;
  color: var(--color-error);
}

/* 今日統計卡片 */
.stats-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(239, 246, 229, 0.4));
}

.stats-card .edamame-text-level-subtitle {
  margin: 0 0 0.5rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-lg);
  text-align: center;
}

.stat-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.stat-icon img {
  display: block;
  margin: 0;
  padding: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-primary-700);
  margin: 0;
  line-height: 1.2;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin: 0;
}

/* 響應式調整 */
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  .stat-item {
    padding: 0.5rem;
  }
  
  .stat-value {
    font-size: var(--text-base);
  }
}
</style>
