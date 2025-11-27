<script setup lang="ts">
/**
 * 共享組件 - 對戰結果頁面
 * 
 * 顯示比賽結果、排名、獎勵
 * 支持查看每題的答案詳情（正確/錯誤/遺漏）
 * 多篇可切換查看
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { useAuthStore } from '../../../stores/authStore'
import { useUserStatsStore } from '../../../stores/userStatsStore'
import { TEAM_COLORS, type TeamColor, getRankTitle } from '../../../types/game'

interface TextResult {
  textId: string
  userBreaks: number[]
  correctBreaks: number[]
  correctCount: number
  wrongCount: number
  missedCount: number
}

interface TextItem {
  id: string
  title: string
  author: string | null
  content: string
}

interface GameResultData {
  texts: TextItem[]
  results: TextResult[]
  totalCorrect: number
  totalBreaks: number
  accuracy: number
  timeSpent: number
}

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const authStore = useAuthStore()
const userStatsStore = useUserStatsStore()

const roomId = computed(() => route.params.roomId as string)
const room = computed(() => gameStore.currentRoom)
const myParticipant = computed(() => gameStore.myParticipant)

// 答案詳情數據
const gameResultData = ref<GameResultData | null>(null)
const currentResultIndex = ref(0)

// 當前查看的文章結果
const currentTextResult = computed(() => {
  if (!gameResultData.value) return null
  const text = gameResultData.value.texts[currentResultIndex.value]
  const result = gameResultData.value.results[currentResultIndex.value]
  if (!text || !result) return null
  return { text, result }
})

// 解析文本內容為字符數組
function parseCharacters(content: string): string[] {
  const chars: string[] = []
  for (const char of content) {
    if (char !== '|' && char !== '\n' && char !== '\r') {
      chars.push(char)
    }
  }
  return chars
}

// 獲取斷點狀態
function getBreakStatus(index: number): 'correct' | 'wrong' | 'missed' | 'none' {
  if (!currentTextResult.value?.result) return 'none'
  
  const result = currentTextResult.value.result
  const isUserBreak = result.userBreaks.includes(index)
  const isCorrectBreak = result.correctBreaks.includes(index)
  
  if (isUserBreak && isCorrectBreak) return 'correct'
  if (isUserBreak && !isCorrectBreak) return 'wrong'
  if (!isUserBreak && isCorrectBreak) return 'missed'
  return 'none'
}

// 是否獲勝（包括平局情況）
const isWinner = computed(() => {
  if (!room.value || !authStore.user) return false
  
  if (room.value.game_mode === 'team_battle') {
    return myParticipant.value?.team_id === room.value.winner_team_id
  } else {
    // 如果有明確的獲勝者
    if (room.value.winner_user_id) {
      return room.value.winner_user_id === authStore.user.id
    }
    // 如果沒有明確獲勝者（平局），檢查是否是分數最高者之一
    if (!room.value.participants) return false
    const myScore = myParticipant.value?.score ?? 0
    const myTime = myParticipant.value?.time_spent ?? 999999
    const topScore = Math.max(...room.value.participants.map(p => p.score))
    const topPlayers = room.value.participants.filter(p => p.score === topScore)
    const topTime = Math.min(...topPlayers.map(p => p.time_spent ?? 999999))
    return myScore === topScore && myTime === topTime
  }
})

// 是否平局
const isTie = computed(() => {
  if (!room.value || room.value.game_mode === 'team_battle') return false
  // 沒有明確獲勝者且自己是贏家 = 平局
  return !room.value.winner_user_id && isWinner.value
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

// 切換文章結果
function switchResult(index: number) {
  if (gameResultData.value && index >= 0 && index < gameResultData.value.texts.length) {
    currentResultIndex.value = index
  }
}

// 返回鬥豆主頁
function goBack() {
  gameStore.reset()
  sessionStorage.removeItem(`game-result-${roomId.value}`)
  router.push({ name: 'arena' })
}

// 再來一局
function playAgain() {
  gameStore.reset()
  sessionStorage.removeItem(`game-result-${roomId.value}`)
  if (authStore.isTeacher) {
    router.push({ name: 'arena-teacher-create' })
  } else {
    router.push({ name: 'arena-create' })
  }
}

// 監聽房間狀態
watch(() => room.value?.status, (status) => {
  if (status === 'playing') {
    // 可能是提前離開
  }
})

onMounted(() => {
  // 訂閱房間更新
  gameStore.subscribeToRoom(roomId.value)
  // 刷新用戶統計
  userStatsStore.fetchProfile()
  
  // 讀取詳細結果數據
  const savedData = sessionStorage.getItem(`game-result-${roomId.value}`)
  if (savedData) {
    try {
      gameResultData.value = JSON.parse(savedData)
    } catch {
      // 忽略解析錯誤
    }
  }
})
</script>

<template>
  <div class="game-result" :class="{ winner: isWinner, tie: isTie }">
    <!-- 結果標題 -->
    <header class="result-header">
      <div class="result-icon">
        {{ isTie ? '🤝' : isWinner ? '🏆' : '💪' }}
      </div>
      <h1>{{ isTie ? '平局！' : isWinner ? '恭喜收豆！' : '惜敗' }}</h1>
      <p v-if="isTie" class="tie-text">
        勢均力敵，旗鼓相當！
      </p>
      <p v-else-if="isWinner && prizeInfo.prize > 0" class="prize-text">
        獲得 <span class="prize-value">{{ prizeInfo.prize }}</span> 豆
      </p>
      <p v-else class="encourage-text">
        再接再厲，下次一定贏！
      </p>
    </header>

    <!-- 排行榜（PvP 模式）- 放在最前面 -->
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
          <span class="time">{{ p.time_spent }}s</span>
          <span v-if="p.prize_won > 0" class="prize">+{{ p.prize_won }} 🫘</span>
        </div>
      </div>
    </section>

    <!-- 我的成績 -->
    <section class="my-score-card">
      <h2>我的成績</h2>
      <div class="score-grid">
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.score || 0 }}</span>
          <span class="score-label">正確斷句</span>
        </div>
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.accuracy?.toFixed(0) || 0 }}%</span>
          <span class="score-label">正確率</span>
        </div>
        <div class="score-item">
          <span class="score-value">{{ myParticipant?.time_spent || 0 }}s</span>
          <span class="score-label">用時</span>
        </div>
        <div class="score-item" v-if="gameResultData">
          <span class="score-value">{{ gameResultData.texts.length }}</span>
          <span class="score-label">題目數</span>
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

    <!-- 答案詳情區域（默認展示）-->
    <section v-if="gameResultData" class="answers-section">
      <h2>答案詳情</h2>
      
      <!-- 多篇切換標籤 -->
      <div v-if="gameResultData.texts.length > 1" class="result-tabs">
        <button 
          v-for="(t, index) in gameResultData.texts" 
          :key="t.id"
          class="result-tab"
          :class="{ active: index === currentResultIndex }"
          @click="switchResult(index)"
        >
          <span class="tab-number">{{ index + 1 }}</span>
          <span class="tab-title">{{ t.title }}</span>
          <span class="tab-stats">
            ✓{{ gameResultData.results[index]?.correctCount || 0 }}
          </span>
        </button>
      </div>

      <!-- 當前文章的答案展示 -->
      <div v-if="currentTextResult && currentTextResult.text && currentTextResult.result" class="answer-detail">
        <div class="answer-header">
          <h3>{{ currentTextResult.text.title }}</h3>
          <span v-if="currentTextResult.text.author" class="answer-author">
            {{ currentTextResult.text.author }}
          </span>
        </div>
        
        <!-- 統計信息 -->
        <div class="answer-stats">
          <span class="stat correct">
            <span class="bean-legend correct"></span>
            正確 {{ currentTextResult.result.correctCount }}
          </span>
          <span class="stat wrong">
            <span class="bean-legend wrong"></span>
            錯誤 {{ currentTextResult.result.wrongCount }}
          </span>
          <span class="stat missed">
            <span class="bean-legend missed"></span>
            遺漏 {{ currentTextResult.result.missedCount }}
          </span>
        </div>

        <!-- 答案展示（使用豆子樣式）-->
        <div class="answer-content">
          <div class="answer-line">
            <template v-for="(char, index) in parseCharacters(currentTextResult.text.content)" :key="index">
              <span class="char-unit">
                <span class="answer-char">{{ char }}</span>
                <span 
                  v-if="index < parseCharacters(currentTextResult.text.content).length - 1 && getBreakStatus(index) !== 'none'"
                  class="bean-slot"
                  :class="getBreakStatus(index)"
                >
                  <span class="bean"></span>
                </span>
              </span>
            </template>
          </div>
        </div>

        <!-- 圖例說明 -->
        <div class="answer-legend">
          <span class="legend-item">
            <span class="bean-legend correct"></span> 正確
          </span>
          <span class="legend-item">
            <span class="bean-legend wrong"></span> 錯誤
          </span>
          <span class="legend-item">
            <span class="bean-legend missed"></span> 遺漏
          </span>
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

.game-result.tie {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
}

.tie-text {
  font-size: 1.1rem;
  color: #0369a1;
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

/* 答案詳情區域 */
.answers-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.answers-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--color-neutral-500);
}

/* 結果標籤 */
.result-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.result-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-neutral-100);
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.result-tab:hover {
  background: var(--color-neutral-200);
}

.result-tab.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.tab-number {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-300);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
}

.result-tab.active .tab-number {
  background: var(--color-primary-500);
  color: white;
}

.tab-title {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-stats {
  color: #10b981;
  font-weight: 600;
}

/* 答案詳情 */
.answer-detail {
  border-top: 1px solid var(--color-neutral-100);
  padding-top: 1rem;
}

.answer-header {
  margin-bottom: 1rem;
}

.answer-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.answer-author {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* 統計信息 */
.answer-stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.stat.correct {
  color: #10b981;
}

.stat.wrong {
  color: #ef4444;
}

.stat.missed {
  color: #f59e0b;
}

/* 豆子圖例 */
.bean-legend {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  vertical-align: middle;
}

.bean-legend.correct {
  background: linear-gradient(145deg, #6dd400 0%, #43a047 50%, #2e7d32 100%);
  box-shadow: 0 1px 2px rgba(67, 160, 71, 0.4);
}

.bean-legend.wrong {
  background: linear-gradient(145deg, #ff6b6b 0%, #e53935 50%, #c62828 100%);
  box-shadow: 0 1px 2px rgba(229, 57, 53, 0.4);
}

.bean-legend.missed {
  background: linear-gradient(145deg, #ffeb3b 0%, #fbc02d 50%, #f9a825 100%);
  box-shadow: 0 1px 2px rgba(251, 192, 45, 0.4);
}

/* 答案內容 */
.answer-content {
  background: var(--color-neutral-50);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.answer-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 1.25rem;
  line-height: 2.4;
  font-family: var(--font-main, 'Noto Serif TC', serif);
}

.char-unit {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.answer-char {
  display: inline;
}

/* 豆子槽 - 和練習模式一致 */
.bean-slot {
  width: 20px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 -2px;
}

.bean-slot .bean {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* 正確（綠豆）*/
.bean-slot.correct .bean {
  background: linear-gradient(145deg, #6dd400 0%, #43a047 50%, #2e7d32 100%);
  box-shadow: 
    0 0 8px rgba(67, 160, 71, 0.6),
    0 2px 4px rgba(46, 125, 50, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
}

/* 錯誤（紅豆）*/
.bean-slot.wrong .bean {
  background: linear-gradient(145deg, #ff6b6b 0%, #e53935 50%, #c62828 100%);
  box-shadow: 
    0 0 8px rgba(229, 57, 53, 0.5),
    0 2px 4px rgba(198, 40, 40, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  animation: bean-shake 400ms ease-in-out;
}

/* 遺漏（黃豆）*/
.bean-slot.missed .bean {
  background: linear-gradient(145deg, #ffeb3b 0%, #fbc02d 50%, #f9a825 100%);
  box-shadow: 
    0 0 8px rgba(251, 192, 45, 0.6),
    0 2px 4px rgba(249, 168, 37, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  animation: bean-blink 600ms ease-in-out infinite;
}

@keyframes bean-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

@keyframes bean-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

/* 圖例 */
.answer-legend {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  
  .answer-stats {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  
  .answer-legend {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}
</style>
