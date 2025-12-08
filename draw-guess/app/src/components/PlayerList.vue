<template>
  <div class="player-list">
    <!-- 標題 -->
    <div class="player-list-header">
      <span class="player-count">玩家 ({{ rankings.length }})</span>
    </div>

    <!-- 玩家項目 -->
    <div
      v-for="(player, index) in rankings"
      :key="player.id"
      :class="[
        'player-item',
        { 'is-current': isCurrentUser(player.user_id) },
        { 'is-drawer': isCurrentDrawer(player.user_id) }
      ]"
    >
      <!-- 排名 -->
      <div class="player-rank">{{ index + 1 }}</div>

      <!-- 頭像 -->
      <div class="player-avatar" :class="{ 'drawing': isCurrentDrawer(player.user_id) }">
        {{ getParticipantName(player.user_id).charAt(0) }}
      </div>

      <!-- 信息 -->
      <div class="player-info">
        <div class="player-name">
          {{ getParticipantName(player.user_id) }}
          <span v-if="isCurrentDrawer(player.user_id)" class="drawer-badge">✏️</span>
          <span v-if="isHost(player.user_id)" class="host-badge">👑</span>
        </div>
        <div class="player-score">{{ player.score }} 分</div>
      </div>
    </div>

    <!-- 獲勝者標識（遊戲結束時） -->
    <div v-if="showWinner && winner" class="winner-banner">
      <div class="winner-icon">🏆</div>
      <div class="winner-text">
        <div class="winner-title">獲勝者</div>
        <div class="winner-name">{{ getParticipantName(winner.user_id) }}</div>
        <div class="winner-score">{{ winner.score }} 分</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useScoring } from '../composables/useScoring'

defineProps<{
  showWinner?: boolean
}>()

const roomStore = useRoomStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const { playerRankings, winner } = useScoring()

const rankings = computed(() => playerRankings.value)

function getParticipantName(userId: string): string {
  const participant = roomStore.participants.find(p => p.user_id === userId)
  return participant?.nickname || '未知玩家'
}

function isCurrentUser(userId: string): boolean {
  return authStore.user?.id === userId
}

function isHost(userId: string): boolean {
  return roomStore.currentRoom?.host_id === userId
}

function isCurrentDrawer(userId: string): boolean {
  return gameStore.currentRound?.drawer_id === userId
}
</script>

<style scoped>
.player-list {
  width: 100%;
}

.player-list-header {
  padding: 0.75rem;
  background: var(--color-secondary);
  color: white;
  font-weight: bold;
  font-family: var(--font-head);
  text-align: center;
  border-radius: 6px 6px 0 0;
  margin: -0.5rem -0.5rem 0.5rem -0.5rem;
}

.player-count {
  font-size: 0.9rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.2s;
}

.player-item:last-child {
  border-bottom: none;
}

.player-item.is-current {
  background: var(--bg-highlight);
}

.player-item.is-drawer {
  background: var(--color-warning-light, #fff8e1);
}

.player-rank {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--text-tertiary);
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--text-primary);
  border: 2px solid var(--border-light);
}

.player-avatar.drawing {
  background: var(--color-warning);
  border-color: var(--color-warning);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-badge, .host-badge {
  font-size: 0.7rem;
  margin-left: 0.25rem;
}

.player-score {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* 獲勝者 */
.winner-banner {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-success), var(--color-secondary));
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
}

.winner-icon {
  font-size: 2rem;
}

.winner-text {
  flex: 1;
}

.winner-title {
  font-size: 0.75rem;
  opacity: 0.9;
}

.winner-name {
  font-size: 1.1rem;
  font-weight: bold;
  font-family: var(--font-head);
}

.winner-score {
  font-size: 0.85rem;
  opacity: 0.9;
}
</style>

