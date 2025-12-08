<template>
  <div class="container margin-top-small">
    <div style="min-height: 100vh;">
      <!-- 頂部欄（參考 Gartic.io） -->
      <div v-if="isPlaying" class="row flex-middle flex-spaces margin-bottom-small">
        <!-- 左側：房間信息 -->
        <div class="col-6">
          <div class="row flex-middle">
            <h1 class="text-hand-title" style="margin: 0; margin-right: 1rem;">
              {{ currentRoom?.name || '遊戲房間' }}
            </h1>
            <div class="text-small">
              房間碼：<span style="font-family: monospace;">{{ currentRoom?.code }}</span>
            </div>
          </div>
        </div>

        <!-- 右側：遊戲控制按鈕 -->
        <div class="col-6 text-right">
          <div class="row flex-middle flex-right">
            <!-- 當前詞語（僅畫家可見） -->
            <div
              v-if="isCurrentDrawer && gameStore.currentWord"
              class="badge success margin-right-small"
              style="background-color: var(--color-secondary); color: white; font-family: var(--font-head);"
            >
              {{ gameStore.currentWord }}
            </div>

            <!-- 倒計時顯示 -->
            <div
              v-if="isCountingDown"
              :class="[
                'badge margin-right-small',
                timeRemaining && timeRemaining <= 10 ? 'badge-danger' : 'badge-secondary'
              ]"
              :style="{
                fontSize: '1.2rem',
                fontFamily: 'var(--font-head)',
                backgroundColor: timeRemaining && timeRemaining <= 10 ? 'var(--color-danger)' : 'var(--color-secondary)',
                color: 'white'
              }"
            >
              {{ formattedTime }}
            </div>

            <!-- 關閉按鈕 -->
            <button
              @click="handleLeaveRoom"
              class="paper-btn btn-small"
              title="離開房間"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 房間信息（非遊戲中時顯示） -->
      <div v-else class="margin-bottom-small">
        <h1 class="text-hand-title">
          {{ currentRoom?.name || '遊戲房間' }}
        </h1>
        <div class="text-small">
          房間碼：<span style="font-family: monospace;">{{ currentRoom?.code }}</span>
        </div>
      </div>

      <!-- 等待大廳 -->
      <div v-if="isWaiting" class="row flex-center">
        <div class="col-12 col-md-8">
          <WaitingLobby
            :room="currentRoom"
            :participants="roomStore.participants"
            @start-game="handleStartGame"
            @leave-room="handleLeaveRoom"
          />
        </div>
      </div>

      <!-- 遊戲進行中 - 參考 Gartic.io 佈局 -->
      <div v-else-if="isPlaying" class="row room-layout room-playing">
        <!-- 左側：玩家列表 -->
        <div class="col-12 col-md-3 room-column">
          <div class="card room-card player-card">
            <div class="card-body player-body">
              <h4 class="card-title text-hand-title">玩家列表</h4>
              <div class="player-scroll">
                <PlayerList :show-winner="false" />
              </div>
            </div>
          </div>
        </div>

        <!-- 中間：畫布區域 -->
        <div class="col-12 col-md-6 room-column">
          <!-- 畫布容器 -->
          <div class="card room-card canvas-card">
            <div class="card-body canvas-card-body">
              <div class="canvas-paper canvas-wrapper">
                <DrawingCanvas class="canvas-surface" />
              </div>
            </div>
          </div>

          <!-- 進度條（時間進度） -->
          <div v-if="isCountingDown && timeRemaining !== null" class="margin-top-small">
            <div class="progress">
              <div
                class="bar"
                :class="timeRemaining <= 10 ? 'bar-danger' : 'bar-success'"
                :style="{
                  width: `${(timeRemaining / drawTime) * 100}%`,
                  backgroundColor: timeRemaining <= 10 ? 'var(--color-danger)' : 'var(--color-secondary)'
                }"
              ></div>
            </div>
          </div>

          <!-- 底部：輸入區域 -->
          <div class="row margin-top-small guess-chat-row">
            <!-- 答案輸入區域 -->
            <div class="col-12 col-md-8">
              <div class="card room-card guess-card">
                <div class="card-body guess-card-body">
                  <h5 class="text-hand-title">答案</h5>
                  <div class="border margin-bottom-small" style="min-height: 60px; max-height: 100px; overflow-y: auto; padding: 0.5rem; background: #f4f4f4;">
                    <div v-if="isCurrentDrawer" class="text-center text-hand">
                      輪到你了！
                    </div>
                    <div v-else-if="hasGuessed" class="text-center" style="color: #41b883;">
                      已猜中！
                    </div>
                    <div v-else class="text-center text-small">
                      等待玩家加入...
                    </div>
                  </div>
                  <!-- 猜詞輸入（僅非畫家可見） -->
                  <div v-if="!isCurrentDrawer">
                    <form @submit.prevent="handleSubmitGuess" class="row flex-middle">
                      <div class="col-8">
                        <input
                          v-model="guessInput"
                          type="text"
                          placeholder="輪到你了"
                          maxlength="32"
                          :disabled="loading || hasGuessed"
                        />
                      </div>
                      <div class="col-4">
                        <button
                          type="submit"
                          :disabled="loading || hasGuessed || !guessInput.trim()"
                          class="paper-btn btn-primary btn-block"
                        >
                          {{ loading ? '提交中...' : hasGuessed ? '已猜中' : '提交' }}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右側：聊天室（暫時簡化） -->
            <div class="col-12 col-md-4">
              <div class="card room-card chat-card">
                <div class="card-body chat-card-body">
                  <h5 class="text-hand-title">聊天室</h5>
                  <div class="border" style="min-height: 60px; max-height: 100px; overflow-y: auto; padding: 0.5rem; background: #f4f4f4;">
                    <div class="text-center text-small">聊天功能即將推出</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右側：繪畫工具欄 -->
        <div class="col-12 col-md-3 room-column">
          <div class="card room-card">
            <div class="card-body">
              <DrawingToolbar />
            </div>
          </div>
        </div>
      </div>

      <!-- 遊戲結束 -->
      <div v-else-if="isFinished" class="row flex-center">
        <div class="col-12 col-md-8">
          <div class="card">
            <div class="card-body text-center">
              <h2 class="card-title text-hand-title">遊戲結束</h2>
              <PlayerList :show-winner="true" />
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
  formattedTime,
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
  await submitGuess()
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

onMounted(async () => {
  // 如果從路由參數獲取房間碼，嘗試載入房間
  const roomCode = route.params.code as string
  if (roomCode && !currentRoom.value) {
    // 可以添加邏輯來根據路由參數載入房間
  }

  // 如果已有房間，載入當前輪次並訂閱實時更新
  if (currentRoom.value && authStore.user) {
    await gameStore.loadCurrentRound(currentRoom.value.id)

    // 訂閱房間的所有實時更新
    subscribeRoom(
      currentRoom.value.code,
      currentRoom.value.id,
      authStore.user.id,
      {
        nickname: authStore.profile?.display_name || '玩家',
      }
    )

    // 如果已有當前輪次，訂閱猜測記錄
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


