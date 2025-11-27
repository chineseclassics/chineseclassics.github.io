<script setup lang="ts">
/**
 * 老師模式 - 課堂鬥豆大屏幕展示（鬥豆台）
 * 
 * 實時顯示各隊伍分數、成員完成情況、倒計時
 * 使用平均分制確保人數不均時的公平性
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { TEAM_COLORS, type TeamColor, type GameTeam } from '../../../types/game'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId as string)

// 房間數據
const room = computed(() => gameStore.currentRoom)
const teams = computed(() => room.value?.teams || [])
const participants = computed(() => room.value?.participants || [])

// 倒計時
const remainingTime = ref(0)
let countdownInterval: any = null

// 是否已結束
const isFinished = computed(() => room.value?.status === 'finished')

// 計算每個隊伍的統計數據
interface TeamStats {
  team: GameTeam
  memberCount: number
  completedCount: number
  averageScore: number  // 平均分（顯示用）
}

const teamStats = computed((): TeamStats[] => {
  return teams.value.map(team => {
    const teamMembers = participants.value.filter(p => p.team_id === team.id)
    const completedMembers = teamMembers.filter(p => p.status === 'completed')
    
    // 計算平均分（從數據庫獲取的 total_score 已經是 平均分×100）
    const averageScore = team.total_score / 100
    
    return {
      team,
      memberCount: teamMembers.length,
      completedCount: completedMembers.length,
      averageScore,
    }
  })
})

// 按平均分排序的隊伍統計
const sortedTeamStats = computed(() => {
  return [...teamStats.value].sort((a, b) => b.averageScore - a.averageScore)
})

// 按團隊分組的參與者（含完成狀態）
const participantsByTeam = computed(() => {
  const result: Record<string, any[]> = {}
  for (const team of teams.value) {
    result[team.id] = participants.value
      .filter(p => p.team_id === team.id)
      .sort((a, b) => b.score - a.score)
  }
  return result
})

// 完成人數
const completedCount = computed(() => 
  participants.value.filter(p => p.status === 'completed').length
)

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 開始倒計時
function startCountdown() {
  if (!room.value?.started_at || !room.value?.time_limit) return
  
  const updateTime = () => {
    const startedAt = new Date(room.value!.started_at!).getTime()
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    remainingTime.value = Math.max(0, room.value!.time_limit - elapsed)
    
    if (remainingTime.value === 0) {
      clearInterval(countdownInterval)
      // 自動結束遊戲
      if (!isFinished.value) {
        gameStore.endGame()
      }
    }
  }
  
  updateTime()
  countdownInterval = setInterval(updateTime, 1000)
}

// 手動結束遊戲
async function endGameManually() {
  if (confirm('確定要結束比賽嗎？')) {
    await gameStore.endGame()
  }
}

// 返回鬥豆主頁
function goBack() {
  gameStore.reset()
  router.push({ name: 'arena' })
}

// 監聽房間狀態
watch(() => room.value?.status, (status) => {
  if (status === 'playing' && !countdownInterval) {
    startCountdown()
  }
})

onMounted(() => {
  // 訂閱房間更新
  gameStore.subscribeToRoom(roomId.value)
  
  // 如果已經在進行中，開始倒計時
  if (room.value?.status === 'playing') {
    startCountdown()
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<template>
  <div class="game-board" :class="{ finished: isFinished }">
    <!-- 頂部狀態欄 -->
    <header class="board-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          ← 離開
        </button>
        <div class="text-info">
          <h1>{{ room?.text?.title }}</h1>
          <p v-if="room?.text?.author">{{ room?.text?.author }}</p>
        </div>
      </div>
      
      <div class="header-center">
        <div class="countdown" :class="{ warning: remainingTime < 30 }">
          <span class="countdown-label">{{ isFinished ? '比賽結束' : '剩餘時間' }}</span>
          <span class="countdown-time">{{ formatTime(remainingTime) }}</span>
        </div>
      </div>
      
      <div class="header-right">
        <div class="progress-info">
          <span class="progress-label">完成進度</span>
          <span class="progress-value">{{ completedCount }} / {{ participants.length }}</span>
        </div>
        <button 
          v-if="!isFinished"
          class="btn-danger"
          @click="endGameManually"
        >
          結束比賽
        </button>
      </div>
    </header>

    <!-- 結束畫面 -->
    <div v-if="isFinished" class="finish-overlay">
      <div class="finish-content">
        <div class="trophy">🏆</div>
        <h2>比賽結束！</h2>
        
        <div class="final-ranking">
          <div 
            v-for="(stats, index) in sortedTeamStats" 
            :key="stats.team.id"
            class="ranking-item"
            :class="{ winner: index === 0 }"
            :style="{ 
              '--team-primary': TEAM_COLORS[stats.team.team_color as TeamColor].primary,
              '--team-secondary': TEAM_COLORS[stats.team.team_color as TeamColor].secondary,
            }"
          >
            <span class="rank">{{ index + 1 }}</span>
            <span class="team-name">{{ stats.team.team_name }}</span>
            <span class="team-members">{{ stats.completedCount }}/{{ stats.memberCount }} 人</span>
            <span class="team-avg-score">{{ stats.averageScore.toFixed(1) }} 分</span>
          </div>
        </div>
        
        <p class="scoring-note">* 以隊員平均分計算排名</p>
        
        <button class="btn-primary btn-large" @click="goBack">
          返回鬥豆
        </button>
      </div>
    </div>

    <!-- 主內容：隊伍對比 -->
    <main v-else class="board-main">
      <div class="teams-battle">
        <div 
          v-for="stats in sortedTeamStats" 
          :key="stats.team.id"
          class="team-column"
          :style="{ 
            '--team-primary': TEAM_COLORS[stats.team.team_color as TeamColor].primary,
            '--team-secondary': TEAM_COLORS[stats.team.team_color as TeamColor].secondary,
            '--team-text': TEAM_COLORS[stats.team.team_color as TeamColor].text,
          }"
        >
          <!-- 隊伍標題 -->
          <div class="team-title">
            <div class="team-name-row">
              <h2>{{ stats.team.team_name }}</h2>
              <span class="team-progress">{{ stats.completedCount }}/{{ stats.memberCount }}</span>
            </div>
            <div class="team-score">
              <span class="score-value">{{ stats.averageScore.toFixed(1) }}</span>
              <span class="score-label">平均分</span>
            </div>
          </div>
          
          <!-- 成員列表 -->
          <div class="members-list">
            <div 
              v-for="p in participantsByTeam[stats.team.id]" 
              :key="p.id"
              class="member-row"
              :class="{ completed: p.status === 'completed' }"
            >
              <div class="member-info">
                <img 
                  v-if="p.user?.avatar_url" 
                  :src="p.user.avatar_url" 
                  :alt="p.user.display_name"
                  class="avatar"
                />
                <span v-else class="avatar-placeholder">
                  {{ p.user?.display_name?.charAt(0) || '?' }}
                </span>
                <span class="member-name">{{ p.user?.display_name || '未知' }}</span>
              </div>
              
              <div class="member-status">
                <template v-if="p.status === 'completed'">
                  <span class="score">{{ p.score }} 分</span>
                  <span class="accuracy">{{ p.accuracy?.toFixed(0) }}%</span>
                </template>
                <template v-else-if="p.status === 'playing'">
                  <span class="status-badge playing">作答中...</span>
                </template>
                <template v-else>
                  <span class="status-badge waiting">等待中</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部分數條（按平均分比例顯示）-->
    <footer v-if="!isFinished" class="score-bar">
      <div 
        v-for="stats in teamStats" 
        :key="stats.team.id"
        class="score-segment"
        :style="{ 
          flex: Math.max(stats.averageScore, 1),
          background: TEAM_COLORS[stats.team.team_color as TeamColor].primary,
        }"
      >
        <span v-if="stats.averageScore > 0" class="segment-label">
          {{ stats.team.team_name }}
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.game-board {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
}

/* 頂部狀態欄 */
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.text-info h1 {
  margin: 0;
  font-size: 1.25rem;
}

.text-info p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.7;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.countdown {
  text-align: center;
  padding: 0.75rem 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.countdown.warning {
  background: rgba(239, 68, 68, 0.3);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.countdown-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 0.25rem;
}

.countdown-time {
  font-size: 2rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.progress-info {
  text-align: right;
}

.progress-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}

.progress-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 主內容 */
.board-main {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.teams-battle {
  display: flex;
  gap: 1.5rem;
  height: 100%;
}

.team-column {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  border-top: 4px solid var(--team-primary);
}

.team-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: rgba(var(--team-primary-rgb), 0.2);
  background: var(--team-secondary);
}

.team-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.team-title h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--team-text);
}

.team-progress {
  font-size: 0.875rem;
  color: var(--team-text);
  opacity: 0.7;
  padding: 0.125rem 0.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.team-score {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--team-primary);
}

.score-label {
  font-size: 0.75rem;
  color: var(--team-text);
  opacity: 0.7;
}

.members-list {
  padding: 1rem;
}

.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.member-row.completed {
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid #22c55e;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

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
  background: var(--team-secondary);
  color: var(--team-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.member-name {
  font-weight: 500;
}

.member-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score {
  font-size: 1.1rem;
  font-weight: 700;
  color: #22c55e;
}

.accuracy {
  font-size: 0.875rem;
  opacity: 0.7;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
}

.status-badge.playing {
  background: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.status-badge.waiting {
  background: rgba(255, 255, 255, 0.1);
  opacity: 0.5;
}

/* 底部分數條 */
.score-bar {
  display: flex;
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
}

.score-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: flex 0.5s ease;
  overflow: hidden;
}

.segment-label {
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
}

/* 結束畫面 */
.finish-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.finish-content {
  text-align: center;
  padding: 3rem;
}

.trophy {
  font-size: 6rem;
  margin-bottom: 1rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.finish-content h2 {
  font-size: 2.5rem;
  margin: 0 0 2rem 0;
}

.final-ranking {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  min-width: 400px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border-left: 4px solid var(--team-primary);
}

.ranking-item.winner {
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.05));
  border-left-color: #eab308;
  transform: scale(1.05);
}

.rank {
  font-size: 1.5rem;
  font-weight: 700;
  width: 40px;
}

.ranking-item.winner .rank {
  color: #eab308;
}

.ranking-item .team-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
}

.team-members {
  font-size: 0.875rem;
  opacity: 0.7;
  min-width: 60px;
  text-align: center;
}

.team-avg-score {
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 80px;
  text-align: right;
}

.scoring-note {
  font-size: 0.875rem;
  opacity: 0.5;
  margin-bottom: 2rem;
}

.btn-primary {
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(var(--color-primary-500-rgb), 0.4);
}

.btn-primary.btn-large {
  padding: 1.25rem 3rem;
  font-size: 1.25rem;
}
</style>

