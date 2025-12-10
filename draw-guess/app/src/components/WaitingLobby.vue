<template>
  <div class="waiting-lobby">
    <div class="wired-card">
      <div class="waiting-lobby-content">
        <!-- 房間信息 -->
        <div class="room-info">
          <h2 class="text-hand-title room-name">{{ room?.name }}</h2>
          <div class="room-details">
            <div class="detail-item">
              房間碼：<span class="room-code">{{ room?.code }}</span>
            </div>
            <div class="detail-item">
              狀態：{{ getStatusText(room?.status) }}
            </div>
          </div>
        </div>

        <!-- 玩家列表 -->
        <div class="players-section">
          <h4 class="text-hand-title players-title">玩家列表 ({{ participants.length }})</h4>
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
                  <span v-if="isParticipantHost(participant.user_id)" class="wired-badge host-badge">
                    房主
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 房間設置 -->
        <div class="room-settings">
          <div class="setting-item">
            繪畫時間：<strong>{{ room?.settings.draw_time }}</strong> 秒
          </div>
          <div class="setting-item">
            輪數：<strong>{{ room?.settings.rounds }}</strong> 輪
          </div>
          <div class="setting-item">
            詞語總數：<strong>{{ room?.word_count }}</strong> 個
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="lobby-actions">
          <button
            v-if="isCurrentUserHost && canStartGame"
            :disabled="loading"
            class="wired-button wired-button-primary"
            @click="handleStartGame"
          >
            {{ loading ? '開始中' : '開始遊戲' }}
          </button>
          <div v-else-if="isCurrentUserHost" class="warning-text">
            至少需要 2 個玩家才能開始遊戲
          </div>
          <button
            :disabled="loading"
            class="wired-button wired-button-secondary"
            @click="handleLeaveRoom"
          >
            {{ loading ? '離開中' : '離開房間' }}
          </button>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

.waiting-lobby-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 房間信息 */
.room-info {
  text-align: center;
}

.room-name {
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.room-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
}

.room-code {
  font-family: monospace;
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  letter-spacing: 0.1em;
  padding: 0.2em 0.4em;
  background: var(--bg-secondary);
  border-radius: 4px;
}

/* 手繪風格卡片 */
.wired-card {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 4px 4px 0 var(--shadow-color);
}

/* 手繪風格按鈕 */
.wired-button {
  display: block;
  width: 100%;
  padding: 0.75rem 1.5rem;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  border: 3px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.wired-button:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--shadow-color);
}

.wired-button:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.wired-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wired-button-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.wired-button-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--border-color);
}

/* 手繪風格徽章 */
.wired-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-warning);
  color: white;
  border-radius: 4px;
  border: 2px solid var(--border-color);
}

/* 玩家列表 */
.players-section {
  border-top: 2px dashed var(--border-light);
  border-bottom: 2px dashed var(--border-light);
  padding: 1rem 0;
}

.players-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
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
  border-radius: 12px;
  transition: all 0.2s ease;
  animation: fadeIn 0.3s ease;
}

.player-item:hover {
  background: var(--bg-hover);
  transform: translateX(3px);
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
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.player-item.is-host .player-avatar {
  border-color: var(--color-warning);
  box-shadow: 2px 2px 0 var(--color-warning);
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

.host-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
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
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--border-light);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item strong {
  color: var(--text-primary);
  font-weight: 600;
}

/* 操作按鈕 */
.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.warning-text {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.error-message {
  padding: 0.75rem;
  background-color: var(--color-danger);
  color: white;
  border-radius: 8px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  text-align: center;
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 響應式設計 */
@media (max-width: 640px) {
  .room-name {
    font-size: 1.5rem;
  }
  
  .players-title {
    font-size: 1.1rem;
  }
}
</style>

