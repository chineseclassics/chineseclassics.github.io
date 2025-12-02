<script setup lang="ts">
/**
 * 共享組件 - 對戰結果頁面
 * 
 * 顯示比賽結果、排名、獎勵
 * 支持查看每題的答案詳情（正確/錯誤/遺漏）
 * 多篇可切換查看
 * 
 * 2025-11-28 更新：
 * - 添加得豆/失豆的老虎機滾動動畫
 * - 刪除「我的成績」區域，在排行榜中顯示正確率
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { useAuthStore } from '../../../stores/authStore'
import { useUserStatsStore } from '../../../stores/userStatsStore'
import { getTeamBeanProduct } from '../../../types/game'
import BeanIcon from '../../../components/common/BeanIcon.vue'
import TeamBadge from '../../../components/arena/TeamBadge.vue'

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
const participants = computed(() => room.value?.participants || [])
const teams = computed(() => room.value?.teams || [])

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
  if (!teams.value.length) return []
  return teams.value
    .map(team => {
      const teamMembers = participants.value.filter(p => p.team_id === team.id)
      const totalScore = teamMembers.reduce((sum, p) => sum + (p.score || 0), 0)
      const localAvg = teamMembers.length > 0 ? totalScore / teamMembers.length : 0
      const authAvg = typeof team.total_score === 'number' ? team.total_score / 100 : 0
      const displayAvg = authAvg || localAvg
      return { ...team, averageScore: displayAvg }
    })
    .sort((a, b) => b.averageScore - a.averageScore)
})


// 用戶統計
const winStreak = computed(() => (userStatsStore.profile as any)?.pvp_win_streak ?? 0)

// 得豆/失豆動畫相關
const showBeanAnimation = ref(false)
const animatedBeanValue = ref(0)
const beanAnimationComplete = ref(false)

// 計算我的得豆/失豆情況
const myBeanChange = computed(() => {
  if (!myParticipant.value || !room.value) {
    return { amount: 0, type: 'neutral' as const }
  }
  
  // 團隊模式：獲勝隊伍每個成員獲得 20 豆
  if (room.value.game_mode === 'team_battle') {
    if (isWinner.value) {
      return { amount: 20, type: 'win' as const }
    }
    return { amount: 0, type: 'neutral' as const }
  }
  
  // PvP 模式：使用獎池邏輯
  const feePaid = myParticipant.value.fee_paid || room.value.entry_fee || 0
  const playerCount = room.value.participants?.length || 0
  
  if (isTie.value) {
    // 平局：退還入場費
    return { amount: 0, type: 'tie' as const }
  } else if (isWinner.value && feePaid > 0) {
    // 贏家：獲得整個獎池
    const totalPrize = feePaid * playerCount
    return { amount: totalPrize, type: 'win' as const }
  } else if (!isWinner.value && feePaid > 0) {
    // 輸家：失去入場費
    return { amount: -feePaid, type: 'lose' as const }
  }
  
  return { amount: 0, type: 'neutral' as const }
})

// 老虎機數字滾動動畫
function startBeanAnimation() {
  const target = Math.abs(myBeanChange.value.amount)
  const type = myBeanChange.value.type
  
  // 如果沒有變化（免費房間或數據不完整），直接完成
  if (target === 0 && type !== 'tie') {
    beanAnimationComplete.value = true
    return
  }
  
  showBeanAnimation.value = true
  animatedBeanValue.value = 0
  beanAnimationComplete.value = false
  
  // 動畫持續 2.5 秒
  const duration = 2500
  const startTime = Date.now()
  const maxValue = target > 0 ? target : 100
  
  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    if (progress < 1) {
      if (progress < 0.8) {
        // 前 80% 時間快速滾動
        animatedBeanValue.value = Math.floor(Math.random() * maxValue * 1.5)
      } else {
        // 最後 20% 時間逐漸接近目標值
        const remaining = (progress - 0.8) / 0.2
        animatedBeanValue.value = Math.floor(target * remaining + Math.random() * (target * (1 - remaining)))
      }
      requestAnimationFrame(animate)
    } else {
      // 動畫結束
      animatedBeanValue.value = target
      beanAnimationComplete.value = true
    }
  }
  
  // 延遲 0.5 秒後開始動畫
  setTimeout(() => {
    requestAnimationFrame(animate)
  }, 500)
}

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
  
  // 啟動得豆動畫
  startBeanAnimation()
})
</script>

<template>
  <div class="game-result" :class="{ winner: isWinner, tie: isTie }">
    <!-- 結果標題 -->
    <header class="result-header">
      <div v-if="isTie || isWinner" class="result-icon">
        {{ isTie ? '🤝' : '🏆' }}
      </div>
      <h1 v-if="!isTie && isWinner">恭喜獲勝！</h1>
      <h1 v-else-if="isTie">平局！</h1>
      
      <!-- 得豆/失豆動畫區域 -->
      <div 
        v-if="showBeanAnimation || myBeanChange.type !== 'neutral'" 
        class="bean-change-display"
        :class="[myBeanChange.type, { complete: beanAnimationComplete }]"
      >
        <span class="bean-sign">{{ myBeanChange.type === 'lose' ? '-' : myBeanChange.type === 'win' ? '+' : '' }}</span>
        <span class="bean-number" :class="{ rolling: !beanAnimationComplete }">
          {{ animatedBeanValue }}
        </span>
        <BeanIcon :size="40" class="bean-icon-img" />
        <span v-if="isTie && beanAnimationComplete" class="bean-note">入場費已退還</span>
      </div>
    </header>

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
          <span class="accuracy">{{ p.accuracy?.toFixed(0) || 0 }}%</span>
          <span class="time">{{ p.time_spent }}s</span>
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
        >
          <span class="rank">{{ index === 0 ? '🏆' : index + 1 }}</span>
          <TeamBadge
            v-if="getTeamBeanProduct(team)"
            :product-type="getTeamBeanProduct(team)!"
            :size="40"
            class="team-badge-in-ranking"
          />
          <div class="team-name-group">
            <span class="team-name">{{ team.team_name }}</span>
            <div v-if="index === 0" class="team-reward-badge">
              <BeanIcon :size="16" />
              <span>每位成員 +20 豆</span>
            </div>
          </div>
          <span class="team-score">{{ team.averageScore.toFixed(2) }} 分</span>
        </div>
      </div>
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
  background: linear-gradient(135deg, var(--color-primary-50, #f8faf5), var(--color-primary-100, #eff6e5));
}

.game-result.winner {
  background: linear-gradient(135deg, var(--color-secondary-100, #fbf5e3), var(--color-secondary-200, #f6eac4));
}

.game-result.tie {
  background: linear-gradient(135deg, var(--color-neutral-50, #fafaf9), var(--color-neutral-100, #f5f5f4));
}

.tie-text {
  font-size: 1.1rem;
  color: var(--color-neutral-600, #57534e);
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
  color: var(--color-neutral-800, #292524);
  font-weight: 700;
}

.prize-text {
  font-size: 1.25rem;
  color: var(--color-neutral-700);
}

.prize-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-harvest, #e3a63d);
}

.encourage-text {
  color: var(--color-neutral-600);
}

/* 得豆/失豆動畫區域 */
.bean-change-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 1rem;
  padding: 1rem 2rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bean-change-display.win {
  background: linear-gradient(135deg, var(--color-primary-100, #eff6e5), var(--color-primary-200, #deedc4));
  border: 2px solid var(--color-primary-400, #a8c870);
}

.bean-change-display.lose {
  background: linear-gradient(135deg, rgba(220, 107, 107, 0.15), rgba(220, 107, 107, 0.25));
  border: 2px solid rgba(220, 107, 107, 0.3);
}

.bean-change-display.tie {
  background: linear-gradient(135deg, var(--color-neutral-50, #fafaf9), var(--color-neutral-100, #f5f5f4));
  border: 2px solid var(--color-neutral-300, #d6d3d1);
}

.bean-sign {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.bean-change-display.win .bean-sign {
  color: var(--color-success, #8bb24f);
}

.bean-change-display.lose .bean-sign {
  color: var(--color-error, #dc6b6b);
}

.bean-number {
  font-size: 3rem;
  font-weight: 800;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  line-height: 1;
  min-width: 80px;
  text-align: center;
}

.bean-change-display.win .bean-number {
  color: var(--color-success, #8bb24f);
}

.bean-change-display.lose .bean-number {
  color: var(--color-error, #dc6b6b);
}

.bean-change-display.tie .bean-number {
  color: var(--color-neutral-700, #44403c);
}

/* 滾動中的模糊效果 */
.bean-number.rolling {
  filter: blur(1px);
  animation: numberShake 0.1s ease infinite;
}

@keyframes numberShake {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-2px); }
  75% { transform: translateY(2px); }
}

/* 動畫完成後的效果 */
.bean-change-display.complete .bean-number {
  filter: blur(0);
  animation: numberPop 0.3s ease;
}

@keyframes numberPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.bean-change-display.complete.win {
  animation: winGlow 0.5s ease;
}

@keyframes winGlow {
  0%, 100% { box-shadow: 0 0 0 rgba(139, 178, 79, 0); }
  50% { box-shadow: 0 0 30px rgba(139, 178, 79, 0.4); }
}

.bean-icon {
  font-size: 2.5rem;
  margin-left: 0.25rem;
}

.bean-note {
  position: absolute;
  bottom: -1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.875rem;
  color: var(--color-neutral-600, #57534e);
  white-space: nowrap;
}

.bean-change-display {
  position: relative;
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
  color: var(--color-success, #8bb24f);
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
  color: var(--color-success, #8bb24f);
}

.stat.wrong {
  color: var(--color-error, #dc6b6b);
}

.stat.missed {
  color: var(--color-warning, #e3a63d);
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
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
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
  background: linear-gradient(135deg, var(--color-secondary-100, #fbf5e3), var(--color-secondary-200, #f6eac4));
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border: 2px solid var(--color-harvest, #e3a63d);
}

.streak-icon {
  display: inline-flex;
  align-items: center;
  font-size: 1.5rem;
}

.streak-text {
  font-size: 1.1rem;
  color: var(--color-harvest, #e3a63d);
  font-weight: 600;
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
  background: linear-gradient(135deg, var(--color-secondary-100, #fbf5e3), var(--color-secondary-50, #fdfaf3));
  border: 2px solid var(--color-harvest, #e3a63d);
}

.rank {
  font-size: 1.25rem;
  font-weight: 700;
  width: 32px;
  text-align: center;
}

.rank-1 { color: var(--color-harvest, #e3a63d); }
.rank-2 { color: var(--color-neutral-600, #57534e); }
.rank-3 { color: var(--color-secondary-600, #b88d36); }

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

.accuracy {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  background: var(--color-neutral-100);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
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
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--color-neutral-50, #fafaf9);
  border-left: 4px solid var(--color-primary-500, #8bb24f);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.team-ranking-item:hover {
  background: var(--color-neutral-100, #f5f5f4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.team-ranking-item.winner {
  background: linear-gradient(135deg, var(--color-secondary-100, #fbf5e3), var(--color-secondary-50, #fdfaf3));
  border-left-color: var(--color-harvest, #e3a63d);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(227, 166, 61, 0.2);
}

.team-badge-in-ranking {
  flex-shrink: 0;
}

.team-name-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.team-name {
  font-weight: 600;
}

.team-score {
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 80px;
  text-align: right;
}

.team-reward-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  background: var(--color-primary-100, #eff6e5);
  border: 1px solid var(--color-primary-300, #c5dd9a);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary-700, #587a2b);
  white-space: nowrap;
  line-height: 1.2;
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
