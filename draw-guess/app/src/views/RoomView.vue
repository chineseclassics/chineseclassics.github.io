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
          
          <!-- 選詞階段倒計時 -->
          <div v-else-if="isSelecting && selectionTimeRemaining !== null" class="time-display selecting">
            <span class="time-number time-warning">{{ selectionTimeRemaining }}</span>
            <span class="time-label">秒選詞</span>
          </div>
          
          <!-- 總結階段倒計時 -->
          <div v-else-if="isSummary && summaryTimeRemaining !== null" class="time-display summary">
            <span class="time-number">{{ summaryTimeRemaining }}</span>
            <span class="time-label">秒後繼續</span>
          </div>
          
          <!-- 輪次信息 -->
          <div class="round-info">
            <span class="round-label">第 {{ currentRoundNumber + (isSelecting ? 1 : 0) }} / {{ totalRounds }} 輪</span>
            <span v-if="isSelecting" class="phase-label">選詞中</span>
            <span v-else-if="isSummary" class="phase-label">輪次結算</span>
          </div>
          
          <!-- 當前詞語（僅繪畫階段且畫家可見） -->
          <div v-if="isDrawing && isCurrentDrawer && gameStore.currentWord" class="word-display">
            <span class="word-label">你的詞語</span>
            <span class="word-text">{{ gameStore.currentWord }}</span>
            <button class="skip-btn" @click="handleSkipWord" title="跳過此詞">跳過</button>
          </div>
          <!-- 非畫家顯示提示（繪畫階段） -->
          <div v-else-if="isDrawing" class="word-display">
            <span class="word-slots">{{ getWordHint }}</span>
          </div>
          <!-- 選詞階段：畫家正在選詞 -->
          <div v-else-if="isSelecting" class="word-display">
            <span class="word-slots">{{ isCurrentDrawerForNextRound ? '請選擇要畫的詞語' : `${currentDrawerName} 正在選詞...` }}</span>
          </div>
          <!-- 總結階段：顯示答案 -->
          <div v-else-if="isSummary && gameStore.currentWord" class="word-display summary-word">
            <span class="word-label">答案是</span>
            <span class="word-text revealed">{{ gameStore.currentWord }}</span>
          </div>
          
          <!-- 離開按鈕 -->
          <button class="leave-btn" @click="handleLeaveRoom" title="離開房間">✕</button>
        </div>

        <!-- 主要區域 -->
        <div class="game-content-area">
          <!-- 選詞階段覆蓋層 -->
          <template v-if="isSelecting">
            <!-- 工具欄（隱藏或禁用） -->
            <div class="game-toolbar disabled">
              <DrawingToolbar :compact="true" />
            </div>

            <!-- 畫布區域顯示選詞界面 -->
            <div class="game-canvas selection-phase">
              <!-- 畫家看到選詞界面 -->
              <WordSelection
                v-if="isCurrentDrawerForNextRound"
                :word-options="wordOptions"
                :round-number="currentRoundNumber + 1"
                :total-rounds="totalRounds"
                :selection-time="15"
                @word-selected="handleWordSelect"
              />
              <!-- 非畫家看到上一輪總結（帶等待選詞提示）或純等待提示 -->
              <RoundSummary
                v-else-if="lastRoundInfo"
                :round-number="lastRoundInfo.roundNumber"
                :total-rounds="totalRounds"
                :correct-answer="lastRoundInfo.answer"
                :drawer-name="lastRoundInfo.drawerName"
                :drawer-id="lastRoundInfo.drawerId"
                :drawer-score="lastRoundInfo.drawerScore"
                :correct-guessers="lastRoundInfo.correctGuessers"
                :round-id="lastRoundInfo.roundId"
                :is-host="roomStore.isHost"
                :is-last-round="false"
                :is-waiting-for-selection="true"
                :next-drawer-name="currentDrawerName"
                @rating-submitted="handleRating"
              />
              <!-- 第一輪沒有上一輪信息時顯示簡單等待 -->
              <div v-else class="first-round-waiting">
                <div class="waiting-card">
                  <div class="waiting-icon">
                    <span class="pencil-animate">✏️</span>
                  </div>
                  <h2 class="waiting-title">{{ currentDrawerName }} 正在選詞...</h2>
                  <p class="waiting-hint">第一輪即將開始</p>
                  <div class="waiting-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 聊天面板 -->
            <div class="game-chat-panel">
              <div class="chat-messages-container" ref="chatMessagesRef">
                <div class="chat-msg system-msg">
                  <span class="msg-icon">⏳</span> 等待畫家選詞...
                </div>
              </div>
              <div class="chat-input-area">
                <input
                  type="text"
                  placeholder="等待選詞..."
                  disabled
                  class="chat-input-field"
                />
                <button disabled class="chat-send-btn">發送</button>
              </div>
            </div>
          </template>

          <!-- 總結階段覆蓋層 -->
          <template v-else-if="isSummary">
            <!-- 工具欄（隱藏或禁用） -->
            <div class="game-toolbar disabled">
              <DrawingToolbar :compact="true" />
            </div>

            <!-- 畫布區域顯示總結界面 -->
            <div class="game-canvas summary-phase">
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
                :is-last-round="currentRoundNumber >= totalRounds"
                @rating-submitted="handleRating"
              />
            </div>

            <!-- 聊天面板 -->
            <div class="game-chat-panel">
              <div class="chat-messages-container" ref="chatMessagesRef">
                <div class="chat-msg system-msg answer-revealed">
                  <span class="msg-icon">🎯</span> 答案是：<strong>{{ gameStore.currentWord }}</strong>
                </div>
                <!-- 正確猜測列表 -->
                <div 
                  v-for="guess in gameStore.correctGuesses" 
                  :key="guess.id"
                  class="chat-msg correct-guess"
                >
                  <span class="msg-player">{{ getParticipantName(guess.user_id) }}</span>
                  <span class="msg-correct">猜中了！ +{{ guess.score_earned }}</span>
                </div>
              </div>
              <div class="chat-input-area">
                <input
                  type="text"
                  placeholder="下一輪即將開始..."
                  disabled
                  class="chat-input-field"
                />
                <button disabled class="chat-send-btn">發送</button>
              </div>
            </div>
          </template>

          <!-- 繪畫階段 -->
          <template v-else>
            <!-- 工具欄（僅畫家顯示完整版） -->
            <div class="game-toolbar">
              <DrawingToolbar :compact="true" />
            </div>

            <!-- 畫布 -->
            <div class="game-canvas">
              <DrawingCanvas />
              <!-- 進度條 -->
              <div v-if="isCountingDown && timeRemaining !== null" class="time-progress">
                <div 
                  class="time-bar" 
                  :class="{ 'time-warning': timeRemaining <= 10 }"
                  :style="{ width: `${(timeRemaining / drawTime) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- 右側聊天面板 -->
            <div class="game-chat-panel">
            <div class="chat-messages-container" ref="chatMessagesRef">
              <!-- 系統消息 -->
              <div class="chat-msg system-msg">
                <span class="msg-icon">🎮</span> 遊戲開始！
              </div>
              
              <!-- 當前詞語提示（僅畫家可見） -->
              <div v-if="isCurrentDrawer && gameStore.currentWord" class="chat-msg word-hint-msg">
                <span class="msg-icon">🎨</span> 你要畫：<strong>{{ gameStore.currentWord }}</strong>
              </div>
              
              <!-- 猜測記錄和聊天消息 -->
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
                <span class="msg-icon">✅</span> 你已猜中答案！
              </div>
            </div>
            
            <!-- 輸入區 -->
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
          </template>
        </div>
      </div>
    </div>

    <!-- 遊戲結束 -->
    <div v-else-if="isFinished" class="container margin-top-large">
      <div class="row flex-center">
        <div class="col-12 col-md-8">
          <div class="card">
            <div class="card-body text-center">
              <h2 class="card-title text-hand-title">🎉 遊戲結束</h2>
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
import DrawingCanvas from '../components/DrawingCanvas.vue'
import DrawingToolbar from '../components/DrawingToolbar.vue'
import PlayerList from '../components/PlayerList.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import WordSelection from '../components/WordSelection.vue'
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
const { subscribeRoom, subscribeGuesses, unsubscribeRoom } = useRealtime()
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
  skipWord,
  // 輪次狀態
  isSelecting,
  isDrawing,
  isSummary,
  wordOptions,
  selectionTimeRemaining,
  summaryTimeRemaining,
  selectWord,
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

// 判斷當前用戶是否是下一輪的畫家（選詞階段用）
const isCurrentDrawerForNextRound = computed(() => {
  if (!currentRoom.value || !authStore.user) return false
  return currentRoom.value.current_drawer_id === authStore.user.id
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

// 獲取參與者名稱
function getParticipantName(userId: string): string {
  const participant = roomStore.participants.find(p => p.user_id === userId)
  return participant?.nickname || '未知玩家'
}

// 獲取輸入框提示文字
const getInputPlaceholder = computed(() => {
  if (isCurrentDrawer.value) return '你是畫家，請畫畫...'
  if (hasGuessed.value) return '你已猜中！'
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
  const correctCount = gameStore.correctGuesses.length
  // 每個猜中的人給畫家 5 分
  return correctCount * 5
})

// 轉換猜中玩家列表為 RoundSummary 需要的格式
const correctGuessersForSummary = computed(() => {
  return gameStore.correctGuesses.map(g => ({
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

// 監聯輪次狀態變化，在進入選詞階段前保存上一輪信息
watch(isSelecting, (newVal, oldVal) => {
  if (newVal && !oldVal && currentRoundNumber.value > 0) {
    // 剛剛進入選詞階段，保存上一輪信息
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

// 跳過詞語
async function handleSkipWord() {
  const result = await skipWord()
  if (!result.success && result.error) {
    showError(result.error)
  }
}

// 處理選詞
async function handleWordSelect(word: string) {
  // 從 wordOptions 中找到對應的選項
  const option = wordOptions.value.find(opt => opt.text === word)
  if (option) {
    const result = await selectWord(option)
    if (!result.success && result.error) {
      showError(result.error)
    }
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

    subscribeRoom(
      currentRoom.value.code,
      currentRoom.value.id,
      authStore.user.id,
      { nickname: authStore.profile?.display_name || '玩家' }
    )

    if (gameStore.currentRound) {
      subscribeGuesses(currentRoom.value.code, gameStore.currentRound.id)
    }
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
}

/* 左側玩家列表 */
.game-players {
  width: 180px;
  min-width: 180px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  position: relative;
}

.word-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
}

/* 時間緊迫時的頂部欄樣式 */
.game-header.time-critical {
  background: linear-gradient(135deg, #fff5f5, #ffe0e0);
  border-color: var(--color-danger);
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
  border-radius: 4px;
}

.word-label {
  background: var(--color-warning);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
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
  border-radius: 4px;
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

/* 主要內容區域（工具欄 + 畫布 + 聊天） */
.game-content-area {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  min-height: 0;
}

/* 工具欄 */
.game-toolbar {
  width: 60px;
  min-width: 60px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow-y: auto;
  padding: 0.5rem;
}

/* 畫布 */
.game-canvas {
  flex: 1;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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

/* 右側聊天面板（整合猜詞和聊天） */
.game-chat-panel {
  width: 280px;
  min-width: 280px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-left: 0.5rem;
}

.chat-messages-container {
  flex: 1;
  padding: 0.5rem;
  overflow-y: auto;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-msg {
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  line-height: 1.4;
}

.system-msg {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.85rem;
}

.word-hint-msg {
  background: linear-gradient(135deg, #fff3cd, #ffeeba);
  color: #856404;
  border: 1px solid #ffc107;
}

.correct-guess {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border-left: 3px solid #28a745;
}

.correct-self {
  background: linear-gradient(135deg, #cce5ff, #b8daff);
  color: #004085;
  text-align: center;
}

.wrong-guess {
  background: transparent;
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
  padding: 0.5rem;
  border-top: 2px solid var(--border-light);
  display: flex;
  gap: 0.5rem;
}

.chat-input-field {
  flex: 1;
  padding: 0.5rem;
  border: 2px solid var(--border-light);
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 0.9rem;
}

.chat-input-field:focus {
  border-color: var(--color-secondary);
  outline: none;
}

.chat-input-field:disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
}

.chat-send-btn {
  padding: 0.5rem 1rem;
  background: var(--color-secondary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: bold;
}

.chat-send-btn:hover:not(:disabled) {
  background: var(--color-secondary-dark, #0056b3);
}

.chat-send-btn:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}

/* 響應式 */
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
    width: 50px;
    min-width: 50px;
  }

  .game-chat-panel {
    width: 100%;
    min-width: unset;
    height: 200px;
    margin-left: 0;
    margin-top: 0.5rem;
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
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
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


