<template>
  <div class="min-h-screen bg-bg-primary">
    <div class="container mx-auto p-4 h-screen flex flex-col">
      <!-- 頂部欄（參考 Gartic.io） -->
      <div v-if="isPlaying" class="mb-4 flex items-center justify-between">
        <!-- 左側：房間信息 -->
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-light text-text-primary">
            {{ currentRoom?.name || '遊戲房間' }}
          </h1>
          <div class="text-sm text-text-secondary">
            房間碼：<span class="font-mono">{{ currentRoom?.code }}</span>
          </div>
        </div>

        <!-- 右側：遊戲控制按鈕 -->
        <div class="flex items-center gap-2">
          <!-- 提示按鈕（暫時隱藏，後續實現） -->
          <button
            v-if="false"
            class="btn-minimal text-sm px-3 py-1.5"
            title="提示"
          >
            <i class="fas fa-lightbulb"></i>
          </button>

          <!-- 當前詞語（僅畫家可見） -->
          <div
            v-if="isCurrentDrawer && gameStore.currentWord"
            class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            {{ gameStore.currentWord }}
          </div>

          <!-- 跳過按鈕（僅畫家可見，暫時隱藏） -->
          <button
            v-if="false && isCurrentDrawer"
            class="btn-minimal text-sm px-3 py-1.5"
            title="跳過"
          >
            跳過
          </button>

          <!-- 倒計時顯示 -->
          <div
            v-if="isCountingDown"
            :class="[
              'text-lg font-mono px-3 py-1.5 rounded-lg',
              timeRemaining && timeRemaining <= 10 
                ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' 
                : 'bg-gray-100 text-text-primary dark:bg-gray-800'
            ]"
          >
            {{ formattedTime }}
          </div>

          <!-- 信息圖標（暫時隱藏） -->
          <button
            v-if="false"
            class="btn-minimal text-sm px-2 py-1.5"
            title="信息"
          >
            <i class="fas fa-info-circle"></i>
          </button>

          <!-- 關閉按鈕 -->
          <button
            @click="handleLeaveRoom"
            class="btn-minimal text-sm px-2 py-1.5"
            title="離開房間"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- 房間信息（非遊戲中時顯示） -->
      <div v-else class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-2xl font-light text-text-primary">
            {{ currentRoom?.name || '遊戲房間' }}
          </h1>
        </div>
        <div class="text-sm text-text-secondary">
          房間碼：<span class="font-mono">{{ currentRoom?.code }}</span>
        </div>
      </div>

      <!-- 等待大廳 -->
      <div v-if="isWaiting" class="flex-1 flex items-center justify-center">
        <WaitingLobby
          :room="currentRoom"
          :participants="roomStore.participants"
          @start-game="handleStartGame"
          @leave-room="handleLeaveRoom"
        />
      </div>

      <!-- 遊戲進行中 - 參考 Gartic.io 佈局 -->
      <div v-else-if="isPlaying" class="flex-1 flex gap-4 min-h-0 overflow-hidden">
        <!-- 左側：玩家列表（白色可滾動面板） -->
        <div class="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div class="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-medium text-text-primary">玩家列表</h3>
          </div>
          <div class="flex-1 overflow-y-auto p-2">
            <PlayerList :show-winner="false" />
          </div>
        </div>

        <!-- 中間：畫布區域 -->
        <div class="flex-1 flex flex-col min-w-0 min-h-0">
          <!-- 畫布容器 -->
          <div class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex items-center justify-center p-4">
            <DrawingCanvas class="w-full h-full max-w-full max-h-full" />
          </div>

          <!-- 進度條（時間進度，參考 Gartic.io） -->
          <div v-if="isCountingDown && timeRemaining !== null" class="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-1000"
              :class="timeRemaining <= 10 ? 'bg-red-500' : 'bg-blue-500'"
              :style="{ width: `${(timeRemaining / drawTime) * 100}%` }"
            ></div>
          </div>

          <!-- 底部：輸入區域 -->
          <div class="mt-2 flex gap-4">
            <!-- 左側：答案輸入區域 -->
            <div class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 flex flex-col">
              <button class="btn-minimal text-sm mb-2 self-start">答案</button>
              <div class="bg-gray-50 dark:bg-gray-900 rounded p-2 mb-2 min-h-[60px] max-h-[100px] overflow-y-auto text-xs text-text-secondary flex-1">
                <div v-if="isCurrentDrawer" class="text-center text-text-primary font-medium">
                  輪到你了！
                </div>
                <div v-else-if="hasGuessed" class="text-center text-green-600">
                  已猜中！
                </div>
                <div v-else class="text-center text-text-secondary">
                  等待玩家加入...
                </div>
              </div>
              <!-- 猜詞輸入（僅非畫家可見） -->
              <div v-if="!isCurrentDrawer" class="space-y-2">
                <form @submit.prevent="handleSubmitGuess" class="flex gap-2">
                  <input
                    v-model="guessInput"
                    type="text"
                    class="input-minimal flex-1 text-sm"
                    placeholder="輪到你了"
                    maxlength="32"
                    :disabled="loading || hasGuessed"
                  />
                  <button
                    type="submit"
                    :disabled="loading || hasGuessed || !guessInput.trim()"
                    class="btn-minimal px-3 py-1.5 text-sm"
                  >
                    {{ loading ? '提交中...' : hasGuessed ? '已猜中' : '提交' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- 右側：聊天室（暫時簡化） -->
            <div class="w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 flex flex-col">
              <button class="btn-minimal text-sm mb-2 self-start">聊天室</button>
              <div class="bg-gray-50 dark:bg-gray-900 rounded p-2 mb-2 min-h-[60px] max-h-[100px] overflow-y-auto text-xs text-text-secondary flex-1">
                <div class="text-center text-text-secondary">聊天功能即將推出</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右側：繪畫工具欄（垂直面板，參考 Gartic.io） -->
        <div class="flex-shrink-0 w-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-y-auto">
          <DrawingToolbar />
        </div>
      </div>

      <!-- 遊戲結束 -->
      <div v-else-if="isFinished" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <h2 class="text-2xl font-light text-text-primary mb-4">遊戲結束</h2>
          <PlayerList :show-winner="true" />
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


