<template>
  <div class="game-container">
    <!-- 等待大廳 -->
    <div v-if="isWaiting" class="container margin-top-large">
      <div class="row flex-center">
        <div class="col-12 col-md-8">
          <WaitingLobby
            :room="currentRoom"
            :participants="roomStore.participants"
            @start-game="handleStartGame"
            @leave-room="handleLeaveRoom"
          />
        </div>
      </div>
    </div>

    <!-- 遊戲進行中 - 參考 Gartic.io 佈局 -->
    <div v-else-if="isPlaying" class="game-layout">
      <!-- 左側：玩家列表 -->
      <div class="game-sidebar game-players">
        <div class="player-list-container">
          <PlayerList :show-winner="false" />
        </div>
      </div>

      <!-- 中間：工具欄 + 畫布 + 聊天面板 -->
      <div class="game-main">
        <!-- 頂部：提示詞區域 -->
        <div class="game-header" :class="{ 'time-critical': timeRemaining !== null && timeRemaining <= 10 }">
          <!-- 倒計時顯示（繪畫階段） -->
          <div v-if="isDrawing && isCountingDown && timeRemaining !== null" class="time-display">
            <span class="time-number" :class="{ 
              'time-warning': timeRemaining <= 10,
              'time-critical-pulse': timeRemaining <= 5 
            }">{{ timeRemaining }}</span>
            <span class="time-label">秒</span>
          </div>
          
          <!-- 總結階段倒計時 -->
          <div v-else-if="isSummary && summaryTimeRemaining !== null" class="time-display summary">
            <span class="time-number">{{ summaryTimeRemaining }}</span>
            <span class="time-label">秒後繼續</span>
          </div>
          
          <!-- 輪次信息 -->
          <div class="round-info">
            <span class="round-label">第 {{ currentRoundNumber }} / {{ totalRounds }} 輪</span>
            <span v-if="isSummary" class="phase-label">輪次結算</span>
          </div>
          
          <!-- 當前詞語（僅繪畫階段且畫家可見） -->
          <div v-if="isDrawing && isCurrentDrawer && gameStore.currentWord" class="word-display">
            <span class="word-label">你的詞語</span>
            <span class="word-text">{{ gameStore.currentWord }}</span>
          </div>
          <!-- 非畫家顯示提示和畫家名稱（繪畫階段） -->
          <div v-else-if="isDrawing" class="word-display">
            <span class="drawer-hint"><PhPaintBrush :size="18" weight="fill" class="hint-icon" /> {{ currentDrawerName }} 正在畫</span>
            <span class="word-slots">{{ getWordHint }}</span>
          </div>
          <!-- 總結階段：顯示答案 -->
          <div v-else-if="isSummary && gameStore.currentWord" class="word-display summary-word">
            <span class="word-label">答案是</span>
            <span class="word-text revealed">{{ gameStore.currentWord }}</span>
          </div>
          
          <!-- 離開按鈕 -->
          <button class="leave-btn" @click="handleLeaveRoom" title="離開房間">
            <PhX :size="20" weight="bold" />
          </button>
        </div>

        <!-- 主要區域 -->
        <div class="game-content-area">
          <!-- 畫布區域 - DrawingCanvas 始終存在 -->
          <div class="game-canvas-wrapper">
            <div class="game-canvas">
              <!-- 畫布始終渲染，確保 watch 持續有效 -->
              <DrawingCanvas />
              
              <!-- 進度條（繪畫階段顯示） -->
              <div v-if="!isSummary && isCountingDown && timeRemaining !== null" class="time-progress">
                <div 
                  class="time-bar" 
                  :class="{ 'time-warning': timeRemaining <= 10 }"
                  :style="{ width: `${(timeRemaining / drawTime) * 100}%` }"
                ></div>
              </div>
              
              <!-- 總結階段覆蓋層 -->
              <div v-if="isSummary" class="summary-overlay">
                <RoundSummary
                  :round-number="currentRoundNumber"
                  :total-rounds="totalRounds"
                  :correct-answer="gameStore.currentWord || ''"
                  :drawer-name="currentDrawerName"
                  :drawer-id="gameStore.currentRound?.drawer_id || ''"
                  :drawer-score="drawerScoreForRound"
                  :correct-guessers="correctGuessersForSummary"
                  :round-id="gameStore.currentRound?.id || ''"
                  :is-host="roomStore.isHost"
                  :is-last-round="isLastRound"
                  :next-drawer-name="isLastRound ? '' : nextDrawerName"
                  @rating-submitted="handleRating"
                />
              </div>
            </div>
            
            <!-- 工具欄 - 橫向放在畫布下方 -->
            <div class="game-toolbar" :class="{ disabled: isSummary }">
              <DrawingToolbar :horizontal="true" />
            </div>
          </div>

          <!-- 聊天面板 - 始終顯示所有猜測記錄，不因總結階段改變 -->
          <div class="game-chat-panel">
            <div class="chat-messages-container" ref="chatMessagesRef">
              <!-- 系統消息 -->
              <div class="chat-msg system-msg">
                <PhGameController :size="16" weight="fill" class="msg-icon" /> 遊戲開始！
              </div>
              
              <!-- 猜測記錄 - 始終顯示所有猜測 -->
              <div 
                v-for="guess in sortedGuesses" 
                :key="guess.id"
                class="chat-msg"
                :class="{ 
                  'correct-guess': guess.is_correct,
                  'wrong-guess': !guess.is_correct 
                }"
              >
                <span class="msg-player">{{ getParticipantName(guess.user_id) }}</span>
                <span v-if="guess.is_correct" class="msg-correct">猜中了！ +{{ guess.score_earned }}</span>
                <span v-else class="msg-text">{{ guess.guess_text }}</span>
              </div>
              
              <!-- 已猜中提示 -->
              <div v-if="hasGuessed" class="chat-msg correct-self">
                <PhCheckCircle :size="16" weight="fill" class="msg-icon" /> 你已猜中答案！
              </div>
            </div>
            
            <!-- 輸入區 - 總結階段也可以輸入 -->
            <div class="chat-input-area">
              <input
                v-model="guessInput"
                type="text"
                :placeholder="getInputPlaceholder"
                maxlength="32"
                :disabled="loading || hasGuessed || isCurrentDrawer"
                @keyup.enter="handleSubmitGuess"
                class="chat-input-field"
              />
              <button 
                @click="handleSubmitGuess"
                :disabled="loading || hasGuessed || isCurrentDrawer || !guessInput.trim()"
                class="chat-send-btn"
              >
                發送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 遊戲結束 -->
    <div v-else-if="isFinished" class="container margin-top-large">
      <div class="row flex-center">
        <div class="col-12 col-md-8">
          <div class="card">
            <div class="card-body text-center">
              <h2 class="card-title text-hand-title"><PhConfetti :size="28" weight="fill" class="title-icon" /> 遊戲結束</h2>
              <PlayerList :show-winner="true" />
              <button @click="handleLeaveRoom" class="paper-btn btn-primary margin-top-medium">
                返回首頁
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhPaintBrush, PhGameController, PhCheckCircle, PhX, PhConfetti } from '@phosphor-icons/vue'
import DrawingCanvas from '../components/DrawingCanvas.vue'
import DrawingToolbar from '../components/DrawingToolbar.vue'
import PlayerList from '../components/PlayerList.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import RoundSummary from '../components/RoundSummary.vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useRealtime } from '../composables/useRealtime'
import { useGame } from '../composables/useGame'
import { useRoom } from '../composables/useRoom'
import { useGuessing } from '../composables/useGuessing'

const route = useRoute()
const router = useRouter()
const roomStore = useRoomStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const { subscribeRoom, unsubscribeRoom, subscribeGameState } = useRealtime()
const {
  isPlaying,
  isWaiting,
  isFinished,
  timeRemaining,
  isCountingDown,
  isCurrentDrawer,
  drawTime,
  currentRoundNumber,
  totalRounds,
  startGame,
  // 輪次狀態（簡化：只有 drawing 和 summary）
  isDrawing,
  isSummary,
  summaryTimeRemaining,
  startSummaryCountdown,
  stopSummaryCountdown,
  startCountdown,
  stopCountdown,
} = useGame()
const { hasGuessed, guessInput, submitGuess, loading: guessingLoading } = useGuessing()
const { leaveRoom } = useRoom()

const currentRoom = computed(() => roomStore.currentRoom)
const loading = computed(() => guessingLoading.value)
const errorMessage = ref<string | null>(null)
const chatMessagesRef = ref<HTMLElement | null>(null)

// 當前畫家名稱
const currentDrawerName = computed(() => {
  const drawerId = currentRoom.value?.current_drawer_id
  if (!drawerId) return '畫家'
  const participant = roomStore.participants.find(p => p.user_id === drawerId)
  return participant?.nickname || '畫家'
})

// 下一位畫手名稱（用於總結畫面顯示）
const nextDrawerName = computed(() => {
  if (!currentRoom.value || roomStore.participants.length === 0) return ''
  
  const currentRoundNum = currentRoom.value.current_round || 0
  // 下一輪的畫家索引
  const nextDrawerIndex = currentRoundNum % roomStore.participants.length
  const nextDrawer = roomStore.participants[nextDrawerIndex]
  
  return nextDrawer?.nickname || '下一位畫家'
})

// 是否是最後一輪
const isLastRound = computed(() => {
  return currentRoundNumber.value >= totalRounds.value
})

// 排序後的猜測記錄（按時間排序）
const sortedGuesses = computed(() => {
  return [...gameStore.guesses].sort((a, b) => 
    new Date(a.guessed_at).getTime() - new Date(b.guessed_at).getTime()
  )
})

// 自動滾動到聊天底部
function scrollToBottom() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

// 監聽猜測記錄變化，自動滾動
watch(sortedGuesses, () => {
  nextTick(scrollToBottom)
}, { deep: true })

// 監聽參與者列表變化，檢測是否被踢出
watch(() => roomStore.participants, (newParticipants) => {
  if (!authStore.user || !currentRoom.value) return
  
  // 檢查當前用戶是否還在參與者列表中
  const isStillInRoom = newParticipants.some(p => p.user_id === authStore.user!.id)
  if (!isStillInRoom && currentRoom.value) {
    console.log('[RoomView] 檢測到被踢出房間')
    alert('你已被房主踢出房間')
    // 清理並返回首頁
    roomStore.clearRoom()
    router.push('/')
  }
}, { deep: true })

// 獲取參與者名稱
function getParticipantName(userId: string): string {
  const participant = roomStore.participants.find(p => p.user_id === userId)
  return participant?.nickname || '未知玩家'
}

// 獲取輸入框提示文字
const getInputPlaceholder = computed(() => {
  if (isCurrentDrawer.value) return '你是畫家，不能打字哦~'
  if (hasGuessed.value) return '你已猜中！等待其他人...'
  return '輸入你的猜測...'
})

// 獲取詞語提示（類似 skribbl.io 的下劃線風格）
const getWordHint = computed(() => {
  if (!gameStore.currentWord) return '猜猜畫的是什麼？'
  // 將每個字替換為下劃線，中間用空格分開
  return gameStore.currentWord.split('').map(() => '_').join(' ')
})

// 計算畫家在當前輪次的得分（根據猜中人數）
const drawerScoreForRound = computed(() => {
  const correctCount = gameStore.currentRoundCorrectGuesses.length
  // 每個猜中的人給畫家 5 分
  return correctCount * 5
})

// 轉換猜中玩家列表為 RoundSummary 需要的格式（當前輪次）
const correctGuessersForSummary = computed(() => {
  return gameStore.currentRoundCorrectGuesses.map(g => ({
    userId: g.user_id,
    name: getParticipantName(g.user_id),
    score: g.score_earned
  }))
})

// 上一輪信息（用於選詞階段顯示給非畫家）
interface LastRoundInfo {
  roundNumber: number
  answer: string
  drawerName: string
  drawerId: string
  drawerScore: number
  correctGuessers: Array<{ userId: string; name: string; score: number }>
  roundId: string
}

const lastRoundInfo = ref<LastRoundInfo | null>(null)

// 保存上一輪信息（在輪次結束時調用）
function saveLastRoundInfo() {
  if (!gameStore.currentRound || !gameStore.currentWord) return
  
  lastRoundInfo.value = {
    roundNumber: currentRoundNumber.value,
    answer: gameStore.currentWord,
    drawerName: currentDrawerName.value,
    drawerId: gameStore.currentRound.drawer_id,
    drawerScore: drawerScoreForRound.value,
    correctGuessers: correctGuessersForSummary.value,
    roundId: gameStore.currentRound.id
  }
}

// 監聯輪次狀態變化，在進入總結階段時保存輪次信息
watch(isSummary, (newVal, oldVal) => {
  if (newVal && !oldVal && currentRoundNumber.value > 0) {
    // 剛剛進入總結階段，保存當前輪信息
    saveLastRoundInfo()
  }
})

// 顯示錯誤訊息
function showError(message: string) {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = null
  }, 3000)
}

// 提交猜測
async function handleSubmitGuess() {
  if (!isCurrentDrawer.value && guessInput.value.trim()) {
    await submitGuess()
  }
}


// 處理開始遊戲
async function handleStartGame() {
  const result = await startGame()
  if (!result.success && result.error) {
    showError(result.error)
  }
}

// 處理離開房間
async function handleLeaveRoom() {
  const result = await leaveRoom()
  
  // 取消房間訂閱
  if (currentRoom.value) {
    unsubscribeRoom(currentRoom.value.code)
  }
  
  // 無論成功或失敗，都導航回首頁
  await router.push('/')
  
  if (!result.success && result.error) {
    showError(result.error)
  }
}

// 處理評分
async function handleRating(rating: number) {
  if (!gameStore.currentRound) return
  
  const result = await gameStore.submitRating(
    gameStore.currentRound.id,
    gameStore.currentRound.drawer_id,
    rating
  )
  
  if (!result.success && result.error) {
    showError(result.error)
  }
}

onMounted(async () => {
  console.log('[RoomView] onMounted 開始')
  console.log('[RoomView] 路由參數:', route.params)
  console.log('[RoomView] 當前房間:', currentRoom.value)
  console.log('[RoomView] 當前用戶:', authStore.user?.id)

  // 如果從路由參數獲取房間碼，嘗試載入房間
  const roomCode = route.params.code as string
  if (roomCode && !currentRoom.value) {
    console.log('[RoomView] 從路由參數載入房間:', roomCode)
  }

  // 如果已有房間，載入當前輪次並訂閱實時更新
  if (currentRoom.value && authStore.user) {
    console.log('[RoomView] 房間狀態:', currentRoom.value.status)
    await gameStore.loadCurrentRound(currentRoom.value.id)

    // ========== 初始化遊戲狀態（修復錯過廣播的問題） ==========
    // 如果房間正在遊戲中，且有當前輪次，需要初始化 roundStatus 和倒計時
    // 這是因為玩家可能在廣播發送後才進入 RoomView，錯過了廣播
    if (currentRoom.value.status === 'playing' && gameStore.currentRound) {
      const round = gameStore.currentRound
      console.log('[RoomView] 檢測到進行中的輪次:', { 
        roundNumber: round.round_number, 
        startedAt: round.started_at, 
        endedAt: round.ended_at,
        drawerId: round.drawer_id
      })
      
      // 確保當前畫家 ID 被設置（用於 PlayerList 顯示畫家 badge）
      if (round.drawer_id) {
        roomStore.setCurrentDrawer(round.drawer_id)
      }
      
      // 如果輪次已開始但未結束，應該是繪畫階段
      // 這種情況主要是頁面刷新時恢復狀態
      if (round.started_at && !round.ended_at) {
        console.log('[RoomView] 輪次進行中，初始化繪畫階段')
        gameStore.setRoundStatus('drawing')
        
        // 頁面刷新時，根據 started_at 計算剩餘時間
        const startTime = new Date(round.started_at).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        const remaining = Math.max(0, drawTime.value - elapsed)
        console.log('[RoomView] 刷新恢復倒計時:', remaining, '秒')
        startCountdown(remaining)
      } else if (round.ended_at) {
        console.log('[RoomView] 輪次已結束，可能是總結階段')
      }
    }
    // ========== 初始化遊戲狀態結束 ==========

    // 等待 Channel 連接完成
    try {
      await subscribeRoom(
        currentRoom.value.code,
        currentRoom.value.id,
        authStore.user.id,
        { nickname: authStore.profile?.display_name || '玩家' }
      )
      console.log('[RoomView] Realtime Channel 連接成功')
    } catch (err) {
      console.error('[RoomView] Realtime Channel 連接失敗:', err)
    }

    // 訂閱遊戲狀態廣播（同步 roundStatus、wordOptions 等）
    // 現在 broadcast self: true，所有人（包括房主）都會收到廣播，統一處理
    subscribeGameState(currentRoom.value.code, async (state) => {
      console.log('[RoomView] 收到遊戲狀態廣播:', state)
      
      // 先更新當前畫家 ID
      if (state.drawerId && currentRoom.value) {
        console.log('[RoomView] 更新畫家 ID:', state.drawerId)
        roomStore.setCurrentDrawer(state.drawerId)
      }
      
      // 更新輪次狀態 - 所有人統一處理
      if (state.roundStatus) {
        console.log('[RoomView] 更新輪次狀態:', state.roundStatus)
        gameStore.setRoundStatus(state.roundStatus)
        
        // 進入繪畫階段
        if (state.roundStatus === 'drawing') {
          // 停止之前的總結倒計時
          stopSummaryCountdown()
          // 清除評分
          gameStore.clearRatings()
          
          // 畫布清空由 DrawingCanvas 組件的 watch 自動處理
          
          // 根據服務器時間戳計算剩餘時間，確保所有玩家倒計時同步
          let remaining = drawTime.value
          if (state.startedAt) {
            const startTime = new Date(state.startedAt).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            remaining = Math.max(0, drawTime.value - elapsed)
            console.log('[RoomView] 根據服務器時間計算剩餘時間:', remaining, '秒 (elapsed:', elapsed, '秒)')
          }
          
          console.log('[RoomView] 開始倒計時:', remaining, '秒')
          startCountdown(remaining)
        }
        
        // 進入總結階段
        if (state.roundStatus === 'summary') {
          // 停止繪畫倒計時
          stopCountdown()
          // 如果是最後一輪，5秒後結束遊戲；否則開始總結倒計時
          if (state.isLastRound) {
            // 最後一輪，5秒後由房主結束遊戲
            if (roomStore.isHost) {
              setTimeout(async () => {
                const { endGame } = useGame()
                await endGame()
              }, 5000)
            }
          } else {
            // 還有下一輪，開始總結倒計時
            startSummaryCountdown()
          }
        }
      }
      
      // 重新載入房間和輪次以獲取最新數據
      if (currentRoom.value) {
        await roomStore.loadRoom(currentRoom.value.id)
        await gameStore.loadCurrentRound(currentRoom.value.id)
      }
    })

    // 載入整場遊戲的所有猜測記錄
    await gameStore.loadAllGuesses(currentRoom.value.id)
  }
})

onUnmounted(() => {
  if (currentRoom.value) {
    unsubscribeRoom(currentRoom.value.code)
  }
})
</script>

<style scoped>
/* 遊戲容器 - 全屏 */
.game-container {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* 遊戲主佈局 - 類似 Gartic.io */
.game-layout {
  display: flex;
  height: 100vh;
  gap: 0;
  padding: 0.5rem;
  box-sizing: border-box;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 左側玩家列表 - 與聊天面板同寬 */
.game-players {
  width: 280px;
  min-width: 280px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 4px 0 var(--shadow-color);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.game-players:hover {
  box-shadow: 5px 5px 0 var(--shadow-color);
  transform: translate(-0.5px, -0.5px);
}

.player-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

/* 中間主區域 */
.game-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 0.5rem;
  gap: 0.5rem;
  min-width: 0;
}

/* 頂部提示區 */
.game-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 125px 25px 185px 25px / 25px 205px 25px 205px;
  position: relative;
  box-shadow: 3px 3px 0 var(--shadow-color);
  transition: all 0.3s ease;
}

.game-header:hover {
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.word-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 時間緊迫時的頂部欄樣式 */
.game-header.time-critical {
  background: linear-gradient(135deg, #fff5f5, #ffe0e0);
  border-color: var(--color-danger);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* 倒計時顯示 */
.time-display {
  position: absolute;
  left: 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.time-number {
  font-size: 2rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--color-secondary);
  min-width: 2.5rem;
  text-align: center;
}

.time-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.time-number.time-warning {
  color: var(--color-danger);
  animation: pulse 1s infinite;
}

.time-number.time-critical-pulse {
  color: var(--color-danger);
  animation: critical-pulse 0.5s infinite;
  font-size: 2.2rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes critical-pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.1);
  }
}

/* 輪次信息 */
.round-info {
  position: absolute;
  left: 5rem;
}

.round-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-head);
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 28px 125px 15px 225px / 125px 30px 205px 225px;
}

.word-label {
  background: var(--color-warning);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 250px 15px 20px 115px / 15px 80px 105px 115px;
  font-weight: bold;
  font-family: var(--font-head);
}

.word-text {
  font-size: 1.5rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--text-primary);
}

/* 詞語提示槽位（下劃線風格） */
.word-slots {
  font-size: 1.5rem;
  font-weight: bold;
  font-family: monospace;
  letter-spacing: 0.3em;
  color: var(--text-primary);
}

.word-hint {
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-family: var(--font-head);
}

.skip-btn {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  padding: 0.25rem 0.75rem;
  border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;
  cursor: pointer;
  font-family: var(--font-body);
}

.skip-btn:hover {
  background: var(--bg-hover);
}

.leave-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.25rem 0.5rem;
}

.leave-btn:hover {
  color: var(--color-danger);
}

/* 主要內容區域（畫布 + 聊天） */
.game-content-area {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  min-height: 0;
}

/* 畫布包裝（畫布 + 工具欄） */
.game-canvas-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

/* 工具欄 - 橫向在畫布下方 */
.game-toolbar {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 15px 225px 25px 115px / 225px 150px 155px 25px;
  padding: 0.5rem;
  box-shadow: 3px 3px 0 var(--shadow-color);
  transition: all 0.3s ease;
}

.game-toolbar:hover {
  box-shadow: 4px 4px 0 var(--shadow-color);
}

/* 畫布 */
.game-canvas {
  flex: 1;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 300px;
  box-shadow: 4px 4px 0 var(--shadow-color);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.game-canvas:hover {
  box-shadow: 5px 5px 0 var(--shadow-color);
  transform: translate(-0.5px, -0.5px);
}

/* 總結階段覆蓋層 - 毛玻璃效果 */
.summary-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(250, 248, 243, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
  animation: fadeInOverlay 0.4s ease-out;
}

@keyframes fadeInOverlay {
  from { 
    opacity: 0;
    backdrop-filter: blur(0);
    -webkit-backdrop-filter: blur(0);
  }
  to { 
    opacity: 1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}

/* 工具欄禁用狀態 */
.game-toolbar.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 時間進度條 */
.time-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: var(--bg-secondary);
}

.time-bar {
  height: 100%;
  background: var(--color-secondary);
  transition: width 1s linear;
}

.time-bar.time-warning {
  background: var(--color-danger);
}

/* 底部區域 */
.game-bottom {
  display: flex;
  gap: 0.5rem;
  height: 160px;
  min-height: 160px;
}

/* 右側聊天面板（整合猜詞和聊天）- 與玩家列表同寬 */
.game-chat-panel {
  width: 280px;
  min-width: 280px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-left: 0.5rem;
  box-shadow: 4px 4px 0 var(--shadow-color);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.game-chat-panel:hover {
  box-shadow: 5px 5px 0 var(--shadow-color);
  transform: translate(-0.5px, -0.5px);
}

.chat-messages-container {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.chat-msg {
  padding: 0.5rem 0.75rem;
  border-radius: 15px 225px 25px 115px / 225px 150px 155px 25px;
  line-height: 1.4;
  animation: slideInMsg 0.3s ease-out;
}

@keyframes slideInMsg {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.system-msg {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.85rem;
  border: 2px dashed var(--border-light);
}

.word-hint-msg {
  background: linear-gradient(135deg, #fff3cd, #ffeeba);
  color: #856404;
  border: 2px solid var(--color-warning);
}

.correct-guess {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border-left: 4px solid var(--color-success);
  animation: correctPop 0.4s ease-out;
}

@keyframes correctPop {
  0% { transform: scale(0.9); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

.correct-self {
  background: linear-gradient(135deg, #cce5ff, #b8daff);
  color: #004085;
  text-align: center;
  border: 2px solid var(--color-secondary);
}

.wrong-guess {
  background: transparent;
  border-left: 3px solid var(--border-light);
}

.msg-icon {
  margin-right: 0.25rem;
}

.msg-player {
  font-weight: bold;
  color: var(--color-primary);
  margin-right: 0.5rem;
}

.msg-player::after {
  content: ':';
}

.msg-correct {
  color: #28a745;
  font-weight: bold;
}

.msg-text {
  color: var(--text-primary);
}

/* 輸入區 */
.chat-input-area {
  padding: 0.75rem;
  border-top: 2px dashed var(--border-light);
  display: flex;
  gap: 0.5rem;
  background: var(--bg-secondary);
}

.chat-input-field {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 2px solid var(--border-light);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  background: var(--bg-card);
  transition: all 0.3s ease;
}

.chat-input-field:focus {
  border-color: var(--color-secondary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(107, 175, 178, 0.2);
}

.chat-input-field:disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
}

.chat-send-btn {
  padding: 0.6rem 1.25rem;
  background: var(--color-secondary);
  color: white;
  border: 2px solid var(--border-color);
  border-radius: 125px 25px 185px 25px / 25px 205px 25px 205px;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: bold;
  box-shadow: 2px 2px 0 var(--shadow-color);
  transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  background: #5a9ea1;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.chat-send-btn:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--shadow-color);
}

.chat-send-btn:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
  box-shadow: none;
}

/* 響應式 */
@media (max-width: 1200px) {
  .game-players {
    width: 240px;
    min-width: 240px;
  }
  
  .game-chat-panel {
    width: 240px;
    min-width: 240px;
  }
}

@media (max-width: 1024px) {
  .game-players {
    width: 200px;
    min-width: 200px;
  }
  
  .game-chat-panel {
    width: 200px;
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .game-layout {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .game-players {
    width: 100%;
    min-width: unset;
    max-height: 150px;
  }

  .game-main {
    margin-left: 0;
    margin-top: 0.5rem;
    flex-direction: column;
  }

  .game-canvas-area {
    min-height: 300px;
  }

  .game-toolbar {
    width: 100%;
    min-width: unset;
  }

  .game-chat-panel {
    width: 100%;
    min-width: unset;
    height: 200px;
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .summary-overlay {
    padding: 1rem;
  }
}

/* ============================================
   第一輪等待選詞樣式
   ============================================ */
.first-round-waiting {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
  padding: 1rem;
}

.first-round-waiting .waiting-card {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 6px 6px 0 var(--shadow-color);
}

.first-round-waiting .waiting-icon {
  margin-bottom: 1rem;
  font-size: 3rem;
}

.first-round-waiting .pencil-animate {
  display: inline-block;
  animation: pencil-write 1s ease-in-out infinite;
}

@keyframes pencil-write {
  0%, 100% {
    transform: rotate(-10deg) translateY(0);
  }
  50% {
    transform: rotate(10deg) translateY(-3px);
  }
}

.first-round-waiting .waiting-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.first-round-waiting .waiting-hint {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.first-round-waiting .waiting-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.first-round-waiting .dot {
  width: 8px;
  height: 8px;
  background: var(--color-secondary);
  border-radius: 50%;
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.first-round-waiting .dot:nth-child(1) {
  animation-delay: 0s;
}

.first-round-waiting .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.first-round-waiting .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>


