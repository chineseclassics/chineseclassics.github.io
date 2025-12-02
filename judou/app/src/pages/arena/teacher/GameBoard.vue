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
import { TEAM_COLORS, type TeamColor, type GameTeam, getTeamBeanProduct } from '../../../types/game'
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

const completedCount = computed(() => 
  participants.value.filter(p => p.status === 'completed').length
)

const totalParticipants = computed(() => participants.value.length)

const completionRate = computed(() => {
  if (totalParticipants.value === 0) return 0
  return Math.round((completedCount.value / totalParticipants.value) * 100)
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

const averageSpeed = computed(() => {
  const completed = participants.value.filter(p => p.status === 'completed' && p.time_spent)
  if (completed.length === 0) return null
  
  const totalTime = completed.reduce((sum, p) => sum + (p.time_spent || 0), 0)
  const avgSeconds = totalTime / completed.length
  const minutes = Math.floor(avgSeconds / 60)
  const seconds = Math.floor(avgSeconds % 60)
  return { minutes, seconds }
})

const highestScore = computed(() => {
  if (participants.value.length === 0) return 0
  return Math.max(...participants.value.map(p => p.score || 0), 0)
})

const recentCompletions = computed(() => {
  return participants.value
    .filter(p => p.status === 'completed' && p.completed_at)
    .sort((a, b) => {
      const timeA = new Date(a.completed_at!).getTime()
      const timeB = new Date(b.completed_at!).getTime()
      return timeB - timeA
    })
    .slice(0, 5)
})

const mostActiveTeam = computed(() => {
  if (teamStats.value.length === 0) return null
  return teamStats.value.reduce((max, current) => 
    current.completedCount > max.completedCount ? current : max
  )
})

const timeProgress = computed(() => {
  if (!room.value?.started_at || !room.value?.time_limit) return 0
  const startedAt = new Date(room.value.started_at).getTime()
  const elapsed = Math.floor((Date.now() - startedAt) / 1000)
  const progress = Math.min(elapsed / room.value.time_limit, 1)
  return progress * 100
})

const topThreeScores = computed(() => {
  return [...participants.value]
    .filter(p => p.score > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)
    .map((p, index) => ({
      ...p,
      rank: index + 1,
    }))
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

    <!-- 大型隊伍賽道（大屏幕版）-->
    <div v-if="!isFinished && raceTrackTeams.length" class="team-progress-section">
      <RaceTrack
        :teams="raceTrackTeams"
        :height="150"
        :racer-size="72"
        :show-rankings="true"
        class="teacher-race-track"
      />

      <!-- 時間進度條 -->
      <div class="time-progress-container">
        <div class="time-progress-header">
          <span class="time-progress-label">比賽進度</span>
          <span class="time-progress-text">{{ Math.round(timeProgress) }}%</span>
        </div>
        <div class="time-progress-bar">
          <div 
            class="time-progress-fill"
            :style="{ width: `${timeProgress}%` }"
            :class="{ warning: timeProgress > 80 }"
          ></div>
        </div>
      </div>

      <!-- 實時統計面板 -->
      <div class="stats-panel">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ completionRate }}%</div>
            <div class="stat-label">完成率</div>
            <div class="stat-detail">{{ completedCount }} / {{ totalParticipants }} 人</div>
          </div>
        </div>
        
        <div class="stat-card" v-if="averageSpeed">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-value">{{ averageSpeed.minutes }}:{{ averageSpeed.seconds.toString().padStart(2, '0') }}</div>
            <div class="stat-label">平均速度</div>
            <div class="stat-detail">已完成學生</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-content">
            <div class="stat-value">{{ highestScore }}</div>
            <div class="stat-label">最高分</div>
            <div class="stat-detail">個人記錄</div>
          </div>
        </div>
        
        <div class="stat-card" v-if="mostActiveTeam">
          <div class="stat-icon">🔥</div>
          <div class="stat-content">
            <div class="stat-value">{{ mostActiveTeam.completedCount }}</div>
            <div class="stat-label">最活躍</div>
            <div class="stat-detail">
              <TeamBadge
                v-if="getTeamBeanProduct(mostActiveTeam.team)"
                :product-type="getTeamBeanProduct(mostActiveTeam.team)!"
                :size="20"
                class="team-badge-in-stat"
              />
              {{ mostActiveTeam.team.team_name }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 側邊欄：排行榜和活動流 -->
    <aside v-if="!isFinished" class="board-sidebar">
      <!-- 得分前三名 -->
      <div class="top-scores-panel">
        <h3 class="panel-title">🏆 得分前三</h3>
        <div class="top-scores-list">
          <div 
            v-for="participant in topThreeScores"
            :key="participant.id"
            class="top-score-item"
            :class="{ 'rank-1': participant.rank === 1, 'rank-2': participant.rank === 2, 'rank-3': participant.rank === 3 }"
          >
            <span class="rank-badge">{{ participant.rank }}</span>
            <img 
              v-if="participant.user?.avatar_url" 
              :src="participant.user.avatar_url" 
              :alt="participant.user.display_name"
              class="top-score-avatar"
            />
            <span v-else class="top-score-avatar-placeholder">
              {{ participant.user?.display_name?.charAt(0) || '?' }}
            </span>
            <div class="top-score-info">
              <span class="top-score-name">{{ participant.user?.display_name || '未知' }}</span>
              <span class="top-score-value">{{ participant.score }} 分</span>
            </div>
          </div>
          <div v-if="topThreeScores.length === 0" class="no-scores">
            暫無分數
          </div>
        </div>
      </div>

      <!-- 實時活動流 -->
      <div class="activity-stream-panel">
        <h3 class="panel-title">⚡ 實時動態</h3>
        <div class="activity-stream-list">
          <div 
            v-for="activity in activityStream"
            :key="activity.id"
            class="activity-item"
            :class="activity.action"
          >
            <img 
              v-if="activity.participant.user?.avatar_url" 
              :src="activity.participant.user.avatar_url" 
              :alt="activity.participant.user.display_name"
              class="activity-avatar"
            />
            <span v-else class="activity-avatar-placeholder">
              {{ activity.participant.user?.display_name?.charAt(0) || '?' }}
            </span>
            <div class="activity-content">
              <span class="activity-text">
                <strong>{{ activity.participant.user?.display_name || '未知' }}</strong>
                <span v-if="activity.action === 'completed'"> 完成了答題！</span>
                <span v-else-if="activity.action === 'scored'"> 得分 {{ activity.score }}</span>
              </span>
            </div>
          </div>
          <div v-if="activityStream.length === 0" class="no-activity">
            等待活動...
          </div>
        </div>
      </div>
    </aside>

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

    <!-- 主內容：隊伍對比 -->
    <main v-else class="board-main">
      <div class="board-main-content">
        <!-- 最近完成列表 -->
        <div v-if="recentCompletions.length > 0" class="recent-completions">
          <h3 class="section-title">🎉 最近完成</h3>
          <div class="completions-list">
            <div 
              v-for="participant in recentCompletions"
              :key="participant.id"
              class="completion-item"
            >
              <img 
                v-if="participant.user?.avatar_url" 
                :src="participant.user.avatar_url" 
                :alt="participant.user.display_name"
                class="completion-avatar"
              />
              <span v-else class="completion-avatar-placeholder">
                {{ participant.user?.display_name?.charAt(0) || '?' }}
              </span>
              <div class="completion-info">
                <span class="completion-name">{{ participant.user?.display_name || '未知' }}</span>
                <span class="completion-score">{{ participant.score }} 分</span>
              </div>
            </div>
          </div>
        </div>

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
              <TeamBadge
                v-if="getTeamBeanProduct(stats.team)"
                :product-type="getTeamBeanProduct(stats.team)!"
                :size="40"
                class="team-badge-in-title"
              />
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
      </div>
    </main>

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
  display: flex;
  gap: 2rem;
}

.board-main-content {
  flex: 1;
  min-width: 0;
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

/* 大型隊伍進度條區域 */
.team-progress-section {
  background: rgba(0, 0, 0, 0.2);
  padding: 1.5rem 2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
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
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.time-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.time-progress-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.time-progress-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  font-variant-numeric: tabular-nums;
}

.time-progress-bar {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.time-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 6px;
  transition: width 1s ease;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.time-progress-fill.warning {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
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
  color: white;
  margin: 0 0 1rem 0;
}

/* 得分前三名面板 */
.top-scores-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.top-scores-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-score-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.top-score-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.top-score-item.rank-1 {
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.05));
  border-left: 3px solid #eab308;
}

.top-score-item.rank-2 {
  background: linear-gradient(90deg, rgba(156, 163, 175, 0.2), rgba(156, 163, 175, 0.05));
  border-left: 3px solid #9ca3af;
}

.top-score-item.rank-3 {
  background: linear-gradient(90deg, rgba(180, 83, 9, 0.2), rgba(180, 83, 9, 0.05));
  border-left: 3px solid #b45309;
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
  color: white;
  flex-shrink: 0;
}

.top-score-item.rank-1 .rank-badge {
  background: #eab308;
  color: #1a1a2e;
}

.top-score-item.rank-2 .rank-badge {
  background: #9ca3af;
}

.top-score-item.rank-3 .rank-badge {
  background: #b45309;
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
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
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
  color: white;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-score-value {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.no-scores {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 2rem;
  font-size: 0.875rem;
}

/* 實時活動流面板 */
.activity-stream-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
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
  background: rgba(255, 255, 255, 0.1);
}

.activity-item.completed {
  border-left: 3px solid #22c55e;
}

.activity-item.scored {
  border-left: 3px solid #3b82f6;
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
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

.activity-text strong {
  color: white;
  font-weight: 600;
}

.no-activity {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 2rem;
  font-size: 0.875rem;
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

.team-badge-in-mini-ranking {
  flex-shrink: 0;
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

/* 獲勝隊伍獎勵區域 */
.winner-reward-section {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.05));
  border-radius: 16px;
  border: 2px solid rgba(234, 179, 8, 0.3);
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
  color: #eab308;
  margin: 0 0 0.25rem 0;
}

.winner-reward-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
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
  color: #eab308;
  line-height: 1;
}

.reward-bean-icon {
  flex-shrink: 0;
}

.winner-reward-note {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
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
