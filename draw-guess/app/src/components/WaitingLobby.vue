<template>
  <div class="waiting-lobby">
    <div class="card">
      <div class="card-body">
        <!-- 房間信息 -->
        <div class="room-info text-center margin-bottom-medium">
          <h2 class="card-title text-hand-title">{{ room?.name }}</h2>
          <div class="room-details">
            <div class="detail-item margin-bottom-small">
              房間碼：<span class="badge badge-secondary room-code-badge">{{ room?.code }}</span>
            </div>
            <div class="detail-item margin-bottom-small">
              狀態：<span class="badge">{{ getStatusText(room?.status) }}</span>
            </div>
            <!-- 遊戲模式標識 -->
            <div class="detail-item">
              模式：<span 
                class="badge" 
                :class="room?.game_mode === 'storyboard' ? 'badge-success' : 'badge-primary'"
              >
                {{ getGameModeText(room?.game_mode) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 玩家列表 -->
        <div class="players-section margin-bottom-medium">
          <h4 class="text-hand-title margin-bottom-small">玩家列表 ({{ participants.length }})</h4>
          <div class="players-list">
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="player-item"
              :class="{ 'is-host': isParticipantHost(participant.user_id) }"
            >
              <div class="player-avatar">
                {{ participant.nickname.charAt(0).toUpperCase() }}
              </div>
              <div class="player-info">
                <div class="player-name">
                  {{ participant.nickname }}
                  <span v-if="isParticipantHost(participant.user_id)" class="badge badge-warning">
                    房主
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 房間設置 -->
        <div class="room-settings margin-bottom-medium">
          <div class="setting-item">
            <span class="setting-label">繪畫時間：</span>
            <span class="setting-value"><strong>{{ room?.settings.draw_time }}</strong>秒</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">每局輪數：</span>
            <span class="setting-value"><strong>{{ roundsPerGame }}</strong>輪</span>
          </div>
          <!-- 詞語總數（僅傳統模式顯示） -->
          <div v-if="room?.game_mode !== 'storyboard'" class="setting-item">
            <span class="setting-label">詞語總數：</span>
            <span class="setting-value"><strong>{{ room?.word_count }}</strong>個</span>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="lobby-actions">
          <button
            v-if="isCurrentUserHost && canStartGame"
            :disabled="loading"
            class="paper-btn btn-primary btn-block margin-bottom-small"
            @click="handleStartGame"
          >
            {{ loading ? '開始中' : '開始遊戲' }}
          </button>
          <div v-else-if="isCurrentUserHost" class="alert alert-warning text-center">
            至少需要 {{ minPlayersRequired }} 個玩家才能開始遊戲
            <template v-if="room?.game_mode === 'storyboard'">
              （分鏡接龍模式）
            </template>
          </div>
          <button
            :disabled="loading"
            class="paper-btn btn-secondary btn-block"
            @click="handleLeaveRoom"
          >
            {{ loading ? '離開中' : '離開房間' }}
          </button>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="error" class="alert alert-danger margin-top-small">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const { isHost: isCurrentUserHost, canStartGame, minPlayersRequired, leaveRoom, loading, error } = useRoom()
const { startGame } = useGame()

// 每局輪數：優先使用房間設定，否則按目前玩家數量（至少 1）
const roundsPerGame = computed(() => {
  const settingRounds = props.room?.settings.rounds || 0
  const participantCount = props.participants.length
  const value = settingRounds > 0 ? settingRounds : participantCount
  return value > 0 ? value : 1
})

function getStatusText(status?: string) {
  const statusMap: Record<string, string> = {
    waiting: '等待中',
    playing: '遊戲中',
    finished: '已結束',
  }
  return statusMap[status || ''] || status || '未知'
}

function getGameModeText(mode?: string) {
  const modeMap: Record<string, string> = {
    classic: '傳統模式',
    storyboard: '分鏡接龍',
  }
  return modeMap[mode || ''] || '傳統模式'
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

/* 房間信息 */
.room-info {
  text-align: center;
}

.room-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.room-code-badge {
  font-size: 1.2rem;
  padding: 0.4rem 0.8rem;
  letter-spacing: 0.1em;
}

/* 玩家列表 */
.players-section {
  border-top: 2px dashed var(--border-light);
  border-bottom: 2px dashed var(--border-light);
  padding: 1rem 0;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 0;
  transition: all 0.2s ease;
  animation: fadeIn 0.3s ease;
}

.player-item:hover {
  background: var(--bg-hover);
  transform: translateX(2px);
}

.player-item.is-host {
  background: linear-gradient(135deg, var(--color-warning-light), #FFF9E6);
  border: 2px dashed var(--color-warning);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  color: var(--text-primary);
  font-weight: bold;
  font-size: 1.1rem;
  border: 2px solid var(--border-light);
  flex-shrink: 0;
}

.player-item.is-host .player-avatar {
  border-color: var(--color-warning);
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-family: var(--font-body);
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* 房間設置 */
.room-settings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--border-light);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  color: var(--text-secondary);
}

.setting-value {
  text-align: right;
  color: var(--text-primary);
}

.setting-value strong {
  color: var(--text-primary);
  font-weight: 600;
  margin-right: 0.1em;
}

/* 操作按鈕 */
.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ============================================
   移動端優化
   ============================================ */
@media (max-width: 768px) {
  .waiting-lobby {
    max-width: 100%;
    padding: 0 0.5rem;
  }

  .card-title {
    font-size: 1.5rem;
  }

  .room-code-badge {
    font-size: 1.1rem;
    padding: 0.35rem 0.7rem;
  }

  .players-section {
    padding: 0.75rem 0;
  }

  .player-item {
    padding: 0.6rem;
  }

  .player-avatar {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .player-name {
    font-size: 0.9rem;
  }

  .room-settings {
    font-size: 0.85rem;
  }

  .setting-item {
    padding: 0.4rem 0;
  }

  .lobby-actions {
    gap: 0.6rem;
  }

  /* 按鈕觸摸優化 */
  .paper-btn {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    min-height: 48px; /* 確保足夠的觸摸區域 */
  }
}

@media (max-width: 480px) {
  .card-title {
    font-size: 1.3rem;
  }

  .room-code-badge {
    font-size: 1rem;
  }

  .player-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
}
</style>

