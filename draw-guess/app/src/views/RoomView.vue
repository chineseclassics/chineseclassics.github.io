<template>
  <div class="min-h-screen bg-bg-primary">
    <div class="container mx-auto p-4 h-screen flex flex-col">
      <!-- 房間信息 -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-2xl font-light text-text-primary">
            {{ currentRoom?.name || '遊戲房間' }}
          </h1>
          <!-- 倒計時顯示 -->
          <div
            v-if="isPlaying && isCountingDown"
            :class="[
              'text-lg font-mono',
              timeRemaining && timeRemaining <= 10 ? 'text-red-600' : 'text-text-primary'
            ]"
          >
            {{ formattedTime }}
          </div>
        </div>
        <div class="text-sm text-text-secondary">
          房間碼：<span class="font-mono">{{ currentRoom?.code }}</span>
          <span v-if="isPlaying" class="ml-4">
            第 {{ currentRoundNumber }} / {{ totalRounds }} 輪
          </span>
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

      <!-- 遊戲進行中 -->
      <div v-else-if="isPlaying" class="flex-1 flex gap-4 min-h-0">
        <!-- 左側：畫布和工具欄 -->
        <div class="flex-1 flex gap-4 min-w-0">
          <!-- 畫布區域 -->
          <div class="flex-1 flex flex-col min-w-0">
            <DrawingCanvas class="flex-1" />
          </div>

          <!-- 工具欄 -->
          <div class="flex-shrink-0">
            <DrawingToolbar />
          </div>
        </div>

        <!-- 右側：猜詞面板和玩家列表 -->
        <div class="flex-shrink-0 flex flex-col gap-4">
          <GuessingPanel />
          <PlayerList :show-winner="false" />
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
import GuessingPanel from '../components/GuessingPanel.vue'
import PlayerList from '../components/PlayerList.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useRealtime } from '../composables/useRealtime'
import { useGame } from '../composables/useGame'
import { useRoom } from '../composables/useRoom'

const route = useRoute()
const roomStore = useRoomStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const { subscribeRoom, subscribeGuesses, unsubscribeRoom } = useRealtime()
const {
  isPlaying,
  isWaiting,
  isFinished,
  currentRoundNumber,
  totalRounds,
  timeRemaining,
  isCountingDown,
  formattedTime,
  startGame,
} = useGame()
const { leaveRoom } = useRoom()

const currentRoom = computed(() => roomStore.currentRoom)

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


