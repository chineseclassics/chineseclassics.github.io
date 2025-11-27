<script setup lang="ts">
/**
 * 共享組件 - 對戰結果頁面
 * 
 * 顯示比賽結果、排名、獎勵
 */

import { computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { useAuthStore } from '../../../stores/authStore'
import { useUserStatsStore } from '../../../stores/userStatsStore'
import { TEAM_COLORS, type TeamColor, getRankTitle } from '../../../types/game'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const authStore = useAuthStore()
const userStatsStore = useUserStatsStore()

const roomId = computed(() => route.params.roomId as string)
const room = computed(() => gameStore.currentRoom)
const myParticipant = computed(() => gameStore.myParticipant)

// 是否獲勝
const isWinner = computed(() => {
  if (!room.value || !authStore.user) return false
  
  if (room.value.game_mode === 'team_battle') {
    return myParticipant.value?.team_id === room.value.winner_team_id
  } else {
    return room.value.winner_user_id === authStore.user.id
  }
})

// 排名（PvP 模式）
const ranking = computed(() => {
  if (!room.value?.participants) return []
  return [...room.value.participants]
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({
      ...p,
      rank: index + 1,
    }))
})


// 按團隊分組排名（團隊模式）
const teamRanking = computed(() => {
  if (!room.value?.teams) return []
  return [...room.value.teams].sort((a, b) => b.total_score - a.total_score)
})

// 獎勵信息
const prizeInfo = computed(() => {
  const prize = myParticipant.value?.prize_won || 0
  return {
    prize,
    isWinner: prize > 0,
  }
})

// 用戶統計
const level = computed(() => userStatsStore.level)
const rankTitle = computed(() => getRankTitle(level.value))
const winStreak = computed(() => (userStatsStore.profile as any)?.pvp_win_streak ?? 0)

// 返回鬥豆主頁
function goBack() {
  gameStore.reset()
  router.push({ name: 'arena' })
}

// 再來一局
function playAgain() {
  gameStore.reset()
  if (authStore.isTeacher) {
    router.push({ name: 'arena-teacher-create' })
  } else {
    router.push({ name: 'arena-create' })
  }
}

// 監聽房間狀態
watch(() => room.value?.status, (status) => {
  // 如果房間還在進行中，等待
  if (status === 'playing') {
    // 可能是提前離開，跳轉回做題頁
  }
})

onMounted(() => {
  // 訂閱房間更新
  gameStore.subscribeToRoom(roomId.value)
  // 刷新用戶統計
  userStatsStore.fetchProfile()
})
</script>

<template>
  <div class="game-result" :class="{ winner: isWinner }">
    <!-- 結果標題 -->
    <header class="result-header">
      <div class="result-icon">
        {{ isWinner ? '🏆' : '💪' }}
      </div>
      <h1>{{ isWinner ? '恭喜收豆！' : '惜敗' }}</h1>
      <p v-if="isWinner && prizeInfo.prize > 0" class="prize-text">
        獲得 <span class="prize-value">{{ prizeInfo.prize }}</span> 豆
      </p>
      <p v-else class="encourage-text">
        再接再厲，下次一定贏！
      </p>
    </header>

    <!-- 我的成績 -->
    <section class="my-score-card">
      <h2>我的成績</h2>
      <div class="score-grid">
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.score || 0 }}</span>
          <span class="score-label">分數</span>
        </div>
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.accuracy?.toFixed(0) || 0 }}%</span>
          <span class="score-label">正確率</span>
        </div>
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.time_spent || 0 }}s</span>
          <span class="score-label">用時</span>
        </div>
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.attempt_count || 0 }}</span>
          <span class="score-label">嘗試次數</span>
        </div>
      </div>
    </section>

    <!-- 連勝信息 -->
    <div v-if="winStreak > 0 && isWinner" class="streak-card">
      <span class="streak-icon">🔥</span>
      <span class="streak-text">
        連勝 <strong>{{ winStreak }}</strong> 場！
      </span>
    </div>

    <!-- 排行榜（PvP 模式）-->
    <section v-if="room?.game_mode === 'pvp'" class="ranking-section">
      <h2>排行榜</h2>
      <div class="ranking-list">
        <div 
          v-for="p in ranking" 
          :key="p.id"
          class="ranking-item"
          :class="{ 
            me: p.user_id === authStore.user?.id,
            top: p.rank <= 3
          }"
        >
          <span class="rank" :class="`rank-${p.rank}`">
            {{ p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank }}
          </span>
          <img 
            v-if="p.user?.avatar_url" 
            :src="p.user.avatar_url" 
            :alt="p.user.display_name"
            class="avatar"
          />
          <span v-else class="avatar-placeholder">
            {{ p.user?.display_name?.charAt(0) || '?' }}
          </span>
          <span class="name">{{ p.user?.display_name || '未知' }}</span>
          <span class="score">{{ p.score }} 分</span>
          <span v-if="p.prize_won > 0" class="prize">+{{ p.prize_won }} 🫘</span>
        </div>
      </div>
    </section>

    <!-- 團隊排行榜（團隊模式）-->
    <section v-if="room?.game_mode === 'team_battle'" class="ranking-section">
      <h2>隊伍排行</h2>
      <div class="team-ranking-list">
        <div 
          v-for="(team, index) in teamRanking" 
          :key="team.id"
          class="team-ranking-item"
          :class="{ winner: index === 0 }"
          :style="{ 
            '--team-primary': TEAM_COLORS[team.team_color as TeamColor].primary,
            '--team-secondary': TEAM_COLORS[team.team_color as TeamColor].secondary,
          }"
        >
          <span class="rank">{{ index === 0 ? '🏆' : index + 1 }}</span>
          <span class="team-name">{{ team.team_name }}</span>
          <span class="team-score">{{ team.total_score }} 分</span>
        </div>
      </div>
    </section>

    <!-- 用戶稱號 -->
    <section class="rank-title-section">
      <p>當前稱號</p>
      <div class="rank-title-display" :style="{ color: rankTitle.color }">
        {{ rankTitle.title }}
      </div>
      <p class="level-text">Lv.{{ level }}</p>
    </section>

    <!-- 操作按鈕 -->
    <footer class="result-footer">
      <button class="btn-secondary" @click="goBack">
        返回鬥豆
      </button>
      <button class="btn-primary" @click="playAgain">
        再來一局
      </button>
    </footer>
  </div>
</template>

<style scoped>
.game-result {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
}

.game-result.winner {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}

/* 結果標題 */
.result-header {
  text-align: center;
  margin-bottom: 2rem;
}

.result-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.result-header h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
}

.prize-text {
  font-size: 1.25rem;
  color: var(--color-neutral-700);
}

.prize-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #d97706;
}

.encourage-text {
  color: var(--color-neutral-600);
}

/* 我的成績卡片 */
.my-score-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.my-score-card h2 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--color-neutral-500);
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.score-item {
  text-align: center;
}

.score-item .score-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-600);
}

.score-item .score-label {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* 連勝卡片 */
.streak-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.streak-icon {
  font-size: 1.5rem;
}

.streak-text {
  font-size: 1.1rem;
  color: #dc2626;
}

/* 排行榜 */
.ranking-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.ranking-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--color-neutral-500);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-neutral-50);
  border-radius: 10px;
  transition: all 0.2s;
}

.ranking-item.me {
  background: var(--color-primary-50);
  border: 2px solid var(--color-primary-400);
}

.ranking-item.top {
  background: linear-gradient(135deg, #fef3c7, #fef9c3);
}

.rank {
  font-size: 1.25rem;
  font-weight: 700;
  width: 32px;
  text-align: center;
}

.rank-1 { color: #d97706; }
.rank-2 { color: #6b7280; }
.rank-3 { color: #b45309; }

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.name {
  flex: 1;
  font-weight: 500;
}

.score {
  font-weight: 600;
  color: var(--color-primary-600);
}

.prize {
  color: #d97706;
  font-weight: 600;
}

/* 團隊排行 */
.team-ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.team-ranking-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--team-secondary);
  border-left: 4px solid var(--team-primary);
  border-radius: 10px;
}

.team-ranking-item.winner {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.team-name {
  flex: 1;
  font-weight: 600;
}

.team-score {
  font-size: 1.25rem;
  font-weight: 700;
}

/* 稱號顯示 */
.rank-title-section {
  text-align: center;
  padding: 1.5rem;
  background: white;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.rank-title-section p {
  margin: 0;
  color: var(--color-neutral-500);
  font-size: 0.875rem;
}

.rank-title-display {
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.level-text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* 底部操作 */
.result-footer {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-500-rgb), 0.3);
}

.btn-secondary {
  padding: 1rem 2rem;
  background: white;
  color: var(--color-neutral-700);
  border: 2px solid var(--color-neutral-200);
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--color-neutral-400);
}

/* 響應式 */
@media (max-width: 640px) {
  .score-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

