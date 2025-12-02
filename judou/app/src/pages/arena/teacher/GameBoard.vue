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
import { type GameTeam, getTeamBeanProduct } from '../../../types/game'
import TeamBadge from '../../../components/arena/TeamBadge.vue'
import RaceTrack from '../../../components/arena/RaceTrack.vue'
import BeanIcon from '../../../components/common/BeanIcon.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId as string)

// 房間數據
const room = computed(() => gameStore.currentRoom)
const teams = computed(() => room.value?.teams || [])
const participants = computed(() => room.value?.participants || [])

const remainingTime = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

const isFinished = computed(() => room.value?.status === 'finished')

interface TeamStats {
  team: GameTeam
  memberCount: number
  completedCount: number
  averageScore: number
}

const teamStats = computed((): TeamStats[] => {
  return teams.value.map(team => {
    const teamMembers = participants.value.filter(p => p.team_id === team.id)
    const completedMembers = teamMembers.filter(p => p.status === 'completed')
    const totalScore = teamMembers.reduce((sum, p) => sum + (p.score || 0), 0)
    const averageScore = teamMembers.length > 0 ? totalScore / teamMembers.length : 0
    
    return {
      team,
      memberCount: teamMembers.length,
      completedCount: completedMembers.length,
      averageScore,
    }
  })
})

const sortedTeamStats = computed(() => {
  return [...teamStats.value].sort((a, b) => b.averageScore - a.averageScore)
})

// 獲勝隊伍（第一名）
const winningTeam = computed(() => {
  return sortedTeamStats.value[0] || null
})

// 獲勝隊伍的成員列表
const winningTeamMembers = computed(() => {
  if (!winningTeam.value) return []
  return participants.value.filter(p => p.team_id === winningTeam.value!.team.id)
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

// 賽道用：準備隊伍數據
const raceTrackTeams = computed(() => {
  if (!teamStats.value.length) return []
  
  return teamStats.value.map(stat => {
    const productType = getTeamBeanProduct(stat.team)
    const rank = sortedTeamStats.value.findIndex(t => t.team.id === stat.team.id) + 1
    
    return {
      id: stat.team.id,
      team: stat.team,
      displayAvg: stat.averageScore,
      rank,
      productType,
      isMyTeam: false,  // 老師端不需要標記「我的隊伍」
      name: stat.team.team_name,
      memberCount: stat.memberCount,
      completedCount: stat.completedCount,
    }
  })
})

const timeProgress = computed(() => {
  if (!room.value?.started_at || !room.value?.time_limit) return 0
  const startedAt = new Date(room.value.started_at).getTime()
  const elapsed = Math.floor((Date.now() - startedAt) / 1000)
  const progress = Math.min(elapsed / room.value.time_limit, 1)
  return progress * 100
})

interface ActivityItem {
  id: string
  participant: any
  action: string
  score?: number
  timestamp: number
}

const activityStream = ref<ActivityItem[]>([])

watch(() => participants.value, (newParticipants, oldParticipants) => {
  if (!oldParticipants || oldParticipants.length === 0) return
  
  newParticipants.forEach(newP => {
    const oldP = oldParticipants.find(p => p.id === newP.id)
    if (!oldP) return
    
    if (newP.status === 'completed' && oldP.status !== 'completed') {
      activityStream.value.unshift({
        id: `${newP.id}-${Date.now()}`,
        participant: newP,
        action: 'completed',
        score: newP.score,
        timestamp: Date.now(),
      })
    } else if (newP.score !== oldP.score && newP.score > oldP.score) {
      activityStream.value.unshift({
        id: `${newP.id}-${Date.now()}`,
        participant: newP,
        action: 'scored',
        score: newP.score,
        timestamp: Date.now(),
      })
    }
  })
  
  if (activityStream.value.length > 10) {
    activityStream.value = activityStream.value.slice(0, 10)
  }
}, { deep: true })

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function startCountdown() {
  if (!room.value?.started_at || !room.value?.time_limit) return
  
  const updateTime = () => {
    const startedAt = new Date(room.value!.started_at!).getTime()
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    remainingTime.value = Math.max(0, room.value!.time_limit - elapsed)
    
    if (remainingTime.value === 0) {
      if (countdownInterval) {
      clearInterval(countdownInterval)
        countdownInterval = null
      }
      if (!isFinished.value) {
        gameStore.endGame()
      }
    }
  }
  
  updateTime()
  countdownInterval = setInterval(updateTime, 1000)
}

async function endGameManually() {
  if (confirm('確定要結束比賽嗎？')) {
    await gameStore.endGame()
  }
}

function goBack() {
  gameStore.reset()
  router.push({ name: 'arena' })
}

watch(() => room.value?.status, (status) => {
  if (status === 'playing' && !countdownInterval) {
    startCountdown()
  }
})

onMounted(() => {
  gameStore.subscribeToRoom(roomId.value)
  
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
      
      <div class="header-right">
        <button 
          v-if="!isFinished"
          class="btn-danger"
          @click="endGameManually"
        >
          結束比賽
        </button>
      </div>
    </header>

    <!-- 大型隊伍賽道（大屏幕版）-->
    <div v-if="!isFinished && raceTrackTeams.length" class="main-content-wrapper">
      <!-- 1. 比分賽道（頂部）-->
      <RaceTrack
        :teams="raceTrackTeams"
        :height="150"
        :racer-size="72"
        :show-rankings="false"
        class="teacher-race-track"
      />

      <!-- 2. 時間進度條（賽道下方）-->
      <div class="time-progress-container">
        <div class="time-progress-header">
          <span class="time-progress-label">剩餘時間</span>
          <span class="time-progress-text" :class="{ warning: remainingTime < 30 }">
            {{ formatTime(remainingTime) }}
          </span>
        </div>
        <div class="time-progress-bar">
          <div 
            class="time-progress-fill"
            :style="{ width: `${timeProgress}%` }"
            :class="{ warning: timeProgress > 80 }"
          ></div>
        </div>
        <div class="time-progress-footer">
          <span class="time-progress-start">開始</span>
          <span class="time-progress-end">結束</span>
        </div>
      </div>
      
      <!-- 3. 隊伍卡片（水平排列）-->
      <div class="teams-cards-container">
        <div 
          v-for="stats in sortedTeamStats" 
          :key="stats.team.id"
          class="team-card"
        >
          <!-- 隊伍頭像和名稱 -->
          <div class="team-card-header">
            <TeamBadge
              v-if="getTeamBeanProduct(stats.team)"
              :product-type="getTeamBeanProduct(stats.team)!"
              :size="48"
              class="team-card-badge"
            />
            <div class="team-card-title">
              <h3>{{ stats.team.team_name }}</h3>
              <span class="team-card-progress">{{ stats.completedCount }}/{{ stats.memberCount }} 人</span>
            </div>
            <div class="team-card-score">
              <span class="score-value">{{ stats.averageScore.toFixed(1) }}</span>
              <span class="score-label">平均分</span>
            </div>
          </div>
          
          <!-- 成員列表 -->
          <div class="team-card-members">
            <div 
              v-for="(p, index) in participantsByTeam[stats.team.id]" 
              :key="p.id"
              class="member-item"
              :class="{ 
                completed: p.status === 'completed',
                'top-scorer': index === 0 && p.score > 0
              }"
            >
              <div class="member-info">
                <img 
                  v-if="p.user?.avatar_url" 
                  :src="p.user.avatar_url" 
                  :alt="p.user.display_name"
                  class="member-avatar"
                />
                <span v-else class="member-avatar-placeholder">
                  {{ p.user?.display_name?.charAt(0) || '?' }}
                </span>
                <span class="member-name">{{ p.user?.display_name || '未知' }}</span>
              </div>
              
              <div v-if="index === 0 && p.score > 0" class="member-status">
                <span class="score">{{ p.score }} 分</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>

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
          >
            <span class="rank">{{ index === 0 ? '🏆' : index + 1 }}</span>
            <TeamBadge
              v-if="getTeamBeanProduct(stats.team)"
              :product-type="getTeamBeanProduct(stats.team)!"
              :size="28"
              class="team-badge-in-mini-ranking"
            />
            <span class="team-name">{{ stats.team.team_name }}</span>
            <span class="team-members">{{ stats.completedCount }}/{{ stats.memberCount }} 人</span>
            <span class="team-avg-score">{{ stats.averageScore.toFixed(1) }} 分</span>
          </div>
        </div>
        
        <!-- 獲勝隊伍獎勵信息 -->
        <div v-if="winningTeam" class="winner-reward-section">
          <div class="winner-reward-header">
            <TeamBadge
              v-if="getTeamBeanProduct(winningTeam.team)"
              :product-type="getTeamBeanProduct(winningTeam.team)!"
              :size="40"
              class="winner-badge"
            />
            <div class="winner-reward-title">
              <h3>{{ winningTeam.team.team_name }} 獲勝！</h3>
              <p class="winner-reward-subtitle">每位成員獲得</p>
            </div>
          </div>
          <div class="winner-reward-amount">
            <span class="reward-number">20</span>
            <BeanIcon :size="48" class="reward-bean-icon" />
          </div>
          <p class="winner-reward-note">共 {{ winningTeamMembers.length }} 位成員</p>
        </div>
        
        <p class="scoring-note">* 以隊員平均分計算排名</p>
        
        <button class="btn-primary btn-large" @click="goBack">
          返回鬥豆
        </button>
      </div>
    </div>


  </div>
</template>

<style scoped>
.game-board {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  /* 使用句豆綠色系的深色主題，適合大屏幕投影 */
  background: linear-gradient(135deg, 
    var(--color-primary-900, #3a5020), 
    var(--color-primary-800, #456124)
  );
  color: var(--color-primary-50, #f8faf5);
}

/* 頂部狀態欄 */
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(58, 80, 32, 0.4);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(139, 178, 79, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: rgba(139, 178, 79, 0.2);
  border: 1px solid rgba(139, 178, 79, 0.3);
  color: var(--color-primary-100, #eff6e5);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.back-btn:hover {
  background: rgba(139, 178, 79, 0.3);
  border-color: rgba(139, 178, 79, 0.5);
  color: var(--color-primary-50, #f8faf5);
}

.text-info h1 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-primary-50, #f8faf5);
  font-weight: 600;
}

.text-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  opacity: 0.9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: var(--color-error, #dc6b6b);
  border: none;
  border-radius: 8px;
  color: var(--color-primary-50, #f8faf5);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: rgba(220, 107, 107, 0.8);
}

/* 主內容 */
.board-main {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  display: flex;
  gap: 2rem;
}

.board-main-content {
  flex: 1;
  min-width: 0;
}

/* 隊伍卡片容器（水平排列，均勻分布）*/
.teams-cards-container {
  display: flex;
  gap: 1.5rem;
  width: 100%;
}

/* 隊伍卡片 */
.team-card {
  flex: 1;
  min-width: 0;
  background: rgba(58, 80, 32, 0.3);
  border-radius: 16px;
  overflow: hidden;
  border-top: 4px solid var(--color-primary-500, #8bb24f);
  border: 1px solid rgba(139, 178, 79, 0.2);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(4px);
}

/* 隊伍卡片頭部（包含頭像、名稱、分數）*/
.team-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: rgba(58, 80, 32, 0.4);
  border-bottom: 1px solid rgba(139, 178, 79, 0.15);
}

.team-card-badge {
  flex-shrink: 0;
}

.team-card-title {
  flex: 1;
  min-width: 0;
}

.team-card-title h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: var(--color-primary-100, #eff6e5);
  font-weight: 600;
}

.team-card-progress {
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  opacity: 0.8;
}

.team-card-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.team-card-score .score-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary-300, #c5dd9a);
  line-height: 1;
}

.team-card-score .score-label {
  font-size: 0.75rem;
  color: var(--color-primary-200, #deedc4);
  opacity: 0.8;
}

/* 隊伍卡片成員列表 */
.team-card-members {
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  background: rgba(58, 80, 32, 0.2);
  border: 1px solid rgba(139, 178, 79, 0.1);
  transition: all 0.3s ease;
}

.member-item.completed {
  background: rgba(139, 178, 79, 0.15);
  border-left: 3px solid var(--color-success, #8bb24f);
}

.member-item.top-scorer {
  background: linear-gradient(90deg, rgba(227, 166, 61, 0.2), rgba(227, 166, 61, 0.05));
  border-left: 4px solid var(--color-harvest, #e3a63d);
  border-top: 2px solid rgba(227, 166, 61, 0.3);
  border-bottom: 2px solid rgba(227, 166, 61, 0.3);
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 8px rgba(227, 166, 61, 0.2);
  position: relative;
}

.member-item.top-scorer::before {
  content: '⭐';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.member-item.top-scorer .member-name {
  font-weight: 700;
  color: var(--color-harvest, #e3a63d);
}

.member-item.top-scorer .member-status .score {
  font-size: 1.25rem;
  color: var(--color-harvest, #e3a63d);
  font-weight: 800;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.member-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(139, 178, 79, 0.3);
  color: var(--color-primary-100, #eff6e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  border: 1px solid rgba(139, 178, 79, 0.4);
}

.member-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-primary-100, #eff6e5);
}

.member-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.member-status .score {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-success, #8bb24f);
}

.member-status .accuracy {
  font-size: 0.875rem;
  opacity: 0.7;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
}

.status-badge.playing {
  background: rgba(139, 178, 79, 0.3);
  color: var(--color-primary-400, #a8c870);
}

.status-badge.waiting {
  background: rgba(88, 122, 43, 0.2);
  color: var(--color-primary-300, #c5dd9a);
  opacity: 0.6;
}

/* 大型隊伍進度條區域 */
.main-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
}

.teacher-race-track {
  width: 100%;
  margin-bottom: 0;
}

.team-progress-bar-large {
  display: flex;
  width: 100%;
  height: 100px;
  gap: 4px;
  margin-bottom: 1.5rem;
}

.team-progress-item-large {
  position: relative;
  transition: flex 0.5s ease;
}

.team-progress-segment-large {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border-right: 3px solid rgba(255, 255, 255, 0.3);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.team-progress-item-large:first-child .team-progress-segment-large {
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
}

.team-progress-item-large:last-child .team-progress-segment-large {
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;
  border-right: none;
}

.team-progress-content-large {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}

.team-badge-large {
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.team-info-large {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.team-name-row-large {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.team-badge-in-title {
  flex-shrink: 0;
}

.team-badge-in-stat {
  flex-shrink: 0;
  vertical-align: middle;
  margin-right: 0.5rem;
}

.team-name-large {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-rank-large {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  flex-shrink: 0;
}

.team-stats-large {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.team-score-large {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 1);
  font-variant-numeric: tabular-nums;
}

.team-score-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

.team-divider {
  color: rgba(0, 0, 0, 0.3);
}

.team-completion {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
}

.team-completion-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

/* 實時統計面板 */
.stats-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.25rem;
}

.stat-detail {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.125rem;
}

/* 最近完成列表 */
.recent-completions {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 1rem 0;
}

.completions-list {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.completion-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: all 0.3s ease;
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.completion-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.completion-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.completion-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.completion-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.completion-name {
  font-weight: 600;
  color: white;
  font-size: 1rem;
}

.completion-score {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* 時間進度條 */
.time-progress-container {
  width: 100%;
  padding: 1rem;
  background: rgba(58, 80, 32, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(139, 178, 79, 0.2);
  backdrop-filter: blur(4px);
}

.time-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.time-progress-label {
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  font-weight: 500;
}

.time-progress-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-100, #eff6e5);
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', monospace;
}

.time-progress-text.warning {
  color: var(--color-error, #dc6b6b);
  animation: pulse 1s infinite;
}

.time-progress-bar {
  width: 100%;
  height: 12px;
  background: rgba(58, 80, 32, 0.5);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(139, 178, 79, 0.2);
}

.time-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-500, #8bb24f), var(--color-primary-400, #a8c870));
  border-radius: 6px;
  transition: width 1s ease;
  box-shadow: 0 0 10px rgba(139, 178, 79, 0.5);
}

.time-progress-fill.warning {
  background: linear-gradient(90deg, var(--color-error, #dc6b6b), rgba(220, 107, 107, 0.8));
  box-shadow: 0 0 10px rgba(220, 107, 107, 0.5);
}

.time-progress-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-primary-300, #c5dd9a);
  opacity: 0.8;
}

/* 側邊欄 */
.board-sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary-100, #eff6e5);
  margin: 0 0 1rem 0;
}

/* 前五名排行榜（全寬）*/
.top-scores-panel-full {
  width: 100%;
  background: rgba(58, 80, 32, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(139, 178, 79, 0.2);
  backdrop-filter: blur(4px);
}

/* 前五名排行榜列表（水平排列）*/
.top-scores-panel-full .top-scores-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-around;
}

.top-score-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(58, 80, 32, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(139, 178, 79, 0.15);
  transition: all 0.3s ease;
  flex: 0 1 calc(20% - 0.8rem);
  min-width: 180px;
}

.top-score-item:hover {
  background: rgba(58, 80, 32, 0.5);
  border-color: rgba(139, 178, 79, 0.3);
  transform: translateY(-2px);
}

.top-score-item.rank-1 {
  background: linear-gradient(90deg, rgba(227, 166, 61, 0.2), rgba(227, 166, 61, 0.05));
  border-left: 3px solid var(--color-harvest, #e3a63d);
}

.top-score-item.rank-2 {
  background: linear-gradient(90deg, rgba(88, 122, 43, 0.2), rgba(88, 122, 43, 0.05));
  border-left: 3px solid var(--color-primary-600, #6f9638);
}

.top-score-item.rank-3 {
  background: linear-gradient(90deg, rgba(184, 141, 54, 0.2), rgba(184, 141, 54, 0.05));
  border-left: 3px solid var(--color-secondary-600, #b88d36);
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 178, 79, 0.3);
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-primary-100, #eff6e5);
  flex-shrink: 0;
  border: 1px solid rgba(139, 178, 79, 0.4);
}

.top-score-item.rank-1 .rank-badge {
  background: var(--color-harvest, #e3a63d);
  color: var(--color-neutral-900, #1c1917);
}

.top-score-item.rank-2 .rank-badge {
  background: var(--color-primary-600, #6f9638);
}

.top-score-item.rank-3 .rank-badge {
  background: var(--color-secondary-600, #b88d36);
}

.top-score-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.top-score-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(139, 178, 79, 0.3);
  color: var(--color-primary-100, #eff6e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid rgba(139, 178, 79, 0.4);
  flex-shrink: 0;
}

.top-score-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.top-score-name {
  font-weight: 600;
  color: var(--color-primary-100, #eff6e5);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-score-value {
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  font-weight: 500;
}

.no-scores {
  text-align: center;
  color: var(--color-primary-300, #c5dd9a);
  opacity: 0.7;
  padding: 2rem;
  font-size: 0.875rem;
}

/* 實時活動流面板 */
.activity-stream-panel {
  background: rgba(58, 80, 32, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(139, 178, 79, 0.2);
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  backdrop-filter: blur(4px);
}

.activity-stream-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(58, 80, 32, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(139, 178, 79, 0.1);
  animation: slideInRight 0.5s ease;
  transition: all 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.activity-item:hover {
  background: rgba(58, 80, 32, 0.5);
  border-color: rgba(139, 178, 79, 0.2);
}

.activity-item.completed {
  border-left: 3px solid var(--color-success, #8bb24f);
}

.activity-item.scored {
  border-left: 3px solid var(--color-primary-400, #a8c870);
}

.activity-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.activity-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(139, 178, 79, 0.3);
  color: var(--color-primary-100, #eff6e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid rgba(139, 178, 79, 0.4);
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.875rem;
  color: var(--color-primary-100, #eff6e5);
  line-height: 1.4;
}

.activity-text strong {
  color: var(--color-primary-50, #f8faf5);
  font-weight: 600;
}

.no-activity {
  text-align: center;
  color: var(--color-primary-300, #c5dd9a);
  opacity: 0.7;
  padding: 2rem;
  font-size: 0.875rem;
}

/* 結束畫面 */
.finish-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, 
    rgba(58, 80, 32, 0.95), 
    rgba(69, 97, 36, 0.95)
  );
  backdrop-filter: blur(8px);
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
  color: var(--color-primary-50, #f8faf5);
  font-weight: 700;
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
  background: rgba(58, 80, 32, 0.4);
  border-radius: 12px;
  border-left: 4px solid var(--color-primary-500, #8bb24f);
  border: 1px solid rgba(139, 178, 79, 0.2);
  backdrop-filter: blur(4px);
}

.ranking-item.winner {
  background: linear-gradient(90deg, rgba(227, 166, 61, 0.2), rgba(227, 166, 61, 0.05));
  border-left-color: var(--color-harvest, #e3a63d);
  transform: scale(1.05);
}

.rank {
  font-size: 1.5rem;
  font-weight: 700;
  width: 40px;
  color: var(--color-primary-200, #deedc4);
}

.ranking-item.winner .rank {
  color: var(--color-harvest, #e3a63d);
}

.team-badge-in-mini-ranking {
  flex-shrink: 0;
}

.ranking-item .team-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
  color: var(--color-primary-100, #eff6e5);
}

.team-members {
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  opacity: 0.8;
  min-width: 60px;
  text-align: center;
}

.team-avg-score {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary-300, #c5dd9a);
  min-width: 80px;
  text-align: right;
}

.scoring-note {
  font-size: 0.875rem;
  color: var(--color-primary-300, #c5dd9a);
  opacity: 0.7;
  margin-bottom: 2rem;
}

/* 獲勝隊伍獎勵區域 */
.winner-reward-section {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(227, 166, 61, 0.2), rgba(227, 166, 61, 0.05));
  border-radius: 16px;
  border: 2px solid rgba(227, 166, 61, 0.3);
  text-align: center;
}

.winner-reward-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.winner-badge {
  flex-shrink: 0;
}

.winner-reward-title h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-harvest, #e3a63d);
  margin: 0 0 0.25rem 0;
}

.winner-reward-subtitle {
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  margin: 0;
}

.winner-reward-amount {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 1rem 0;
}

.reward-number {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-harvest, #e3a63d);
  line-height: 1;
}

.reward-bean-icon {
  flex-shrink: 0;
}

.winner-reward-note {
  font-size: 0.875rem;
  color: var(--color-primary-200, #deedc4);
  opacity: 0.8;
  margin: 0.5rem 0 0 0;
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

/* 響應式設計 */
@media (max-width: 1200px) {
  .team-progress-bar-large {
    height: 80px;
  }
  
  .team-name-large {
    font-size: 1.25rem;
  }
  
  .team-score-large {
    font-size: 1.25rem;
  }
}

@media (max-width: 1400px) {
  .board-sidebar {
    width: 280px;
  }
}

@media (max-width: 1200px) {
  .board-main {
    flex-direction: column;
  }
  
  .board-sidebar {
    width: 100%;
    flex-direction: row;
    gap: 1rem;
  }
  
  .top-scores-panel,
  .activity-stream-panel {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .team-progress-section {
    padding: 1rem;
  }
  
  .team-progress-bar-large {
    flex-direction: column;
    height: auto;
    gap: 0.5rem;
  }
  
  .team-progress-item-large {
    min-width: 100%;
  }
  
  .team-progress-segment-large {
    border-right: none;
    border-bottom: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px !important;
  }
  
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .board-main {
    padding: 1rem;
  }
  
  .teams-battle {
    flex-direction: column;
  }
  
  .board-sidebar {
    flex-direction: column;
  }
}
</style>
