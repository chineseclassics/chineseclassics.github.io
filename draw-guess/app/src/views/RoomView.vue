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
        <div class="game-header">
          <!-- 倒計時顯示 -->
          <div v-if="isCountingDown && timeRemaining !== null" class="time-display">
            <span class="time-number" :class="{ 'time-warning': timeRemaining <= 10 }">{{ timeRemaining }}</span>
          </div>
          
          <!-- 當前詞語（僅畫家可見） -->
          <div v-if="isCurrentDrawer && gameStore.currentWord" class="word-display">
            <span class="word-label">你的詞語</span>
            <span class="word-text">{{ gameStore.currentWord }}</span>
            <button class="skip-btn" @click="handleSkipWord" title="跳過此詞">跳過</button>
          </div>
          <!-- 非畫家顯示提示（字母槽位風格，類似 skribbl.io） -->
          <div v-else class="word-display">
            <span class="word-slots">{{ getWordHint }}</span>
          </div>
          
          <!-- 離開按鈕 -->
          <button class="leave-btn" @click="handleLeaveRoom" title="離開房間">✕</button>
        </div>

        <!-- 主要區域：工具欄 + 畫布 + 聊天 -->
        <div class="game-content-area">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import DrawingCanvas from '../components/DrawingCanvas.vue'
import DrawingToolbar from '../components/DrawingToolbar.vue'
import PlayerList from '../components/PlayerList.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useRealtime } from '../composables/useRealtime'
import { useGame } from '../composables/useGame'
import { useRoom } from '../composables/useRoom'
import { useGuessing } from '../composables/useGuessing'

const route = useRoute()
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
  startGame,
  skipWord,
} = useGame()
const { hasGuessed, guessInput, submitGuess, loading: guessingLoading } = useGuessing()
const { leaveRoom } = useRoom()

const currentRoom = computed(() => roomStore.currentRoom)
const loading = computed(() => guessingLoading.value)
const errorMessage = ref<string | null>(null)
const chatMessagesRef = ref<HTMLElement | null>(null)

// 排序後的猜測記錄（按時間排序）
const sortedGuesses = computed(() => {
  return [...gameStore.guesses].sort((a, b) => 
    new Date(a.guessed_at).getTime() - new Date(b.guessed_at).getTime()
  )
})

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
}

/* 倒計時顯示 */
.time-display {
  position: absolute;
  left: 1rem;
}

.time-number {
  font-size: 1.8rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--color-secondary);
}

.time-number.time-warning {
  color: var(--color-danger);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
</style>


