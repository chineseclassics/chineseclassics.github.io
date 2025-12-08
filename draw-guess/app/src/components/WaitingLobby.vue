<template>
  <div class="waiting-lobby">
    <div class="card-minimal">
      <!-- 房間信息 -->
      <div class="mb-6">
        <h2 class="text-xl font-light text-text-primary mb-2">{{ room?.name }}</h2>
        <div class="text-sm text-text-secondary">
          房間碼：<span class="font-mono text-text-primary">{{ room?.code }}</span>
        </div>
        <div class="text-sm text-text-secondary mt-1">
          狀態：<span class="text-text-primary">{{ getStatusText(room?.status) }}</span>
        </div>
      </div>

      <!-- 玩家列表 -->
      <div class="mb-6">
        <h3 class="text-sm font-medium text-text-primary mb-3">
          玩家列表 ({{ participants.length }})
        </h3>
        <div class="space-y-2">
          <div
            v-for="participant in participants"
            :key="participant.id"
            class="flex items-center gap-3 p-2 rounded-minimal border-thin border-border-light"
          >
            <div class="w-8 h-8 rounded-full bg-bg-secondary border-thin border-border-light flex items-center justify-center text-text-secondary text-sm">
              {{ participant.nickname.charAt(0) }}
            </div>
            <div class="flex-1">
              <div class="text-sm text-text-primary">
                {{ participant.nickname }}
                <span v-if="isParticipantHost(participant.user_id)" class="text-xs text-text-secondary ml-2">
                  (房主)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 房間設置 -->
      <div class="mb-6 text-sm text-text-secondary">
        <div>繪畫時間：{{ room?.settings.draw_time }} 秒</div>
        <div>輪數：{{ room?.settings.rounds }} 輪</div>
        <div>詞語總數：{{ room?.word_count }} 個</div>
      </div>

      <!-- 操作按鈕 -->
      <div class="space-y-3">
        <button
          v-if="isCurrentUserHost && canStartGame"
          @click="handleStartGame"
          :disabled="loading"
          class="btn-minimal w-full"
        >
          {{ loading ? '開始中...' : '開始遊戲' }}
        </button>
        <div v-else-if="isCurrentUserHost" class="text-sm text-text-secondary text-center">
          至少需要 2 個玩家才能開始遊戲
        </div>
        <button
          @click="handleLeaveRoom"
          :disabled="loading"
          class="btn-minimal w-full"
        >
          {{ loading ? '離開中...' : '離開房間' }}
        </button>
      </div>

      <!-- 錯誤提示 -->
      <div v-if="error" class="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded-minimal border-thin border-red-200">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// computed 未使用，但保留以備將來使用
// import { computed } from 'vue'
import { useRoom } from '../composables/useRoom'
import { useGame } from '../composables/useGame'
import type { GameRoom, RoomParticipant } from '../stores/room'

const props = defineProps<{
  room: GameRoom | null
  participants: RoomParticipant[]
}>()

const emit = defineEmits<{
  startGame: []
  leaveRoom: []
}>()

const { isHost: isCurrentUserHost, canStartGame, leaveRoom, loading, error } = useRoom()
const { startGame } = useGame()

function getStatusText(status?: string) {
  const statusMap: Record<string, string> = {
    waiting: '等待中',
    playing: '遊戲中',
    finished: '已結束',
  }
  return statusMap[status || ''] || status || '未知'
}

function isParticipantHost(userId: string) {
  return props.room?.host_id === userId
}

async function handleStartGame() {
  const result = await startGame()
  if (result.success) {
    emit('startGame')
  }
}

async function handleLeaveRoom() {
  const result = await leaveRoom()
  if (result.success) {
    emit('leaveRoom')
  }
}
</script>

<style scoped>
.waiting-lobby {
  @apply w-full max-w-md mx-auto;
}
</style>

