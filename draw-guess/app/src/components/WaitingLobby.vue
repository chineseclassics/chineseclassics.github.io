<template>
  <div class="waiting-lobby">
    <div class="card">
      <div class="card-body">
        <!-- 房間信息 -->
        <div class="margin-bottom-medium">
          <h2 class="card-title text-hand-title">{{ room?.name }}</h2>
          <div class="text-small">
            房間碼：<span style="font-family: monospace;">{{ room?.code }}</span>
          </div>
          <div class="text-small margin-top-small">
            狀態：{{ getStatusText(room?.status) }}
          </div>
        </div>

        <!-- 玩家列表 -->
        <div class="margin-bottom-medium">
          <h4 class="text-hand-title">玩家列表 ({{ participants.length }})</h4>
          <div class="margin-top-small">
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="row flex-middle margin-bottom-small border-bottom"
              style="padding-bottom: 10px;"
            >
            <div class="col-2">
              <div
                class="border"
                style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-secondary); border-color: var(--border-light); color: var(--text-primary);"
              >
                {{ participant.nickname.charAt(0) }}
              </div>
            </div>
              <div class="col-10">
                <div class="text-hand">
                  {{ participant.nickname }}
                  <span v-if="isParticipantHost(participant.user_id)" class="text-small">
                    (房主)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 房間設置 -->
        <div class="margin-bottom-medium text-small">
          <div>繪畫時間：{{ room?.settings.draw_time }} 秒</div>
          <div>輪數：{{ room?.settings.rounds }} 輪</div>
          <div>詞語總數：{{ room?.word_count }} 個</div>
        </div>

        <!-- 操作按鈕 -->
        <div>
          <button
            v-if="isCurrentUserHost && canStartGame"
            @click="handleStartGame"
            :disabled="loading"
            class="paper-btn btn-primary btn-block margin-bottom-small"
          >
            {{ loading ? '開始中...' : '開始遊戲' }}
          </button>
          <div v-else-if="isCurrentUserHost" class="text-small text-center margin-bottom-small">
            至少需要 2 個玩家才能開始遊戲
          </div>
          <button
            @click="handleLeaveRoom"
            :disabled="loading"
            class="paper-btn btn-secondary btn-block"
          >
            {{ loading ? '離開中...' : '離開房間' }}
          </button>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="error" class="alert alert-danger margin-top-medium">
          {{ error }}
        </div>
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
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>

