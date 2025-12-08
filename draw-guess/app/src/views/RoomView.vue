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

      <!-- 中間：工具欄 + 畫布 -->
      <div class="game-main">
        <!-- 頂部：提示詞區域 -->
        <div class="game-header">
          <!-- 當前詞語（僅畫家可見） -->
          <div v-if="isCurrentDrawer && gameStore.currentWord" class="word-display">
            <span class="word-label">提示</span>
            <span class="word-text">{{ gameStore.currentWord }}</span>
            <button class="skip-btn" @click="handleSkipWord" title="跳過此詞">跳過</button>
          </div>
          <!-- 非畫家顯示提示 -->
          <div v-else class="word-display">
            <span class="word-hint">猜猜畫的是什麼？</span>
          </div>
          
          <!-- 離開按鈕 -->
          <button class="leave-btn" @click="handleLeaveRoom" title="離開房間">✕</button>
        </div>

        <!-- 中間區域：工具欄 + 畫布 -->
        <div class="game-canvas-area">
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
        </div>

        <!-- 底部：答案區 + 聊天室 -->
        <div class="game-bottom">
          <!-- 答案區 -->
          <div class="game-answer">
            <div class="answer-header">答案</div>
            <div class="answer-messages">
              <div v-if="isCurrentDrawer" class="answer-info">
                <span class="info-icon">ℹ️</span> 等待玩家加入
              </div>
              <div class="answer-info">
                <span class="info-icon">✏️</span> {{ isCurrentDrawer ? '輪到你了！' : '輸入你的答案' }}
              </div>
            </div>
            <div class="answer-input">
              <input
                v-model="guessInput"
                type="text"
                :placeholder="isCurrentDrawer ? '輪到你了' : '輸入答案...'"
                maxlength="32"
                :disabled="loading || hasGuessed || isCurrentDrawer"
                @keyup.enter="handleSubmitGuess"
              />
            </div>
          </div>

          <!-- 聊天室 -->
          <div class="game-chat">
            <div class="chat-header">聊天室</div>
            <div class="chat-messages">
              <div class="chat-msg"><span class="chat-icon">ℹ️</span> 歡迎來到遊戲！</div>
            </div>
            <div class="chat-input">
              <input type="text" placeholder="請登入以發送訊息" disabled />
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
import { computed, onMounted, onUnmounted } from 'vue'
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
} = useGame()
const { hasGuessed, guessInput, submitGuess, loading: guessingLoading } = useGuessing()
const { leaveRoom } = useRoom()

const currentRoom = computed(() => roomStore.currentRoom)
const loading = computed(() => guessingLoading.value)

// 提交猜測
async function handleSubmitGuess() {
  if (!isCurrentDrawer.value && guessInput.value.trim()) {
    await submitGuess()
  }
}

// 處理開始遊戲
async function handleStartGame() {
  const result = await startGame()
  if (result.success) {
    // 遊戲已開始，界面會自動切換
  }
}

// 處理離開房間
async function handleLeaveRoom() {
  const result = await leaveRoom()
  if (result.success) {
    // 可以跳轉回首頁
  }
}

// 跳過詞語（TODO: 實現）
function handleSkipWord() {
  console.log('跳過詞語')
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

/* 畫布區域 */
.game-canvas-area {
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

/* 答案區 */
.game-answer {
  flex: 1;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.answer-header, .chat-header {
  background: var(--color-secondary);
  color: white;
  padding: 0.5rem 1rem;
  font-weight: bold;
  font-family: var(--font-head);
  text-align: center;
}

.answer-messages, .chat-messages {
  flex: 1;
  padding: 0.5rem;
  overflow-y: auto;
  font-size: 0.9rem;
}

.answer-info, .chat-msg {
  padding: 0.25rem 0;
  color: var(--text-secondary);
}

.info-icon, .chat-icon {
  margin-right: 0.25rem;
}

.answer-input, .chat-input {
  padding: 0.5rem;
  border-top: 1px solid var(--border-light);
}

.answer-input input, .chat-input input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--border-light);
  border-radius: 4px;
  font-family: var(--font-body);
}

.answer-input input:focus, .chat-input input:focus {
  border-color: var(--color-secondary);
  outline: none;
}

/* 聊天室 */
.game-chat {
  width: 280px;
  min-width: 280px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  }

  .game-canvas-area {
    min-height: 300px;
  }

  .game-toolbar {
    width: 50px;
    min-width: 50px;
  }

  .game-bottom {
    flex-direction: column;
    height: auto;
  }

  .game-chat {
    width: 100%;
    min-width: unset;
    height: 150px;
  }
}
</style>


