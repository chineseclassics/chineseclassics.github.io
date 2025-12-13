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
      <div class="player-rank" :class="{ 'rank-1': index === 0, 'rank-2': index === 1, 'rank-3': index === 2 }">{{ index + 1 }}</div>

      <!-- 頭像 -->
      <div class="player-avatar" :class="{ 'drawing': isCurrentDrawer(player.user_id) }">
        {{ getParticipantName(player.user_id).charAt(0) }}
      </div>

      <!-- 信息 -->
      <div class="player-info">
        <div class="player-name">
          {{ getParticipantName(player.user_id) }}
          <span v-if="isCurrentDrawer(player.user_id)" class="drawer-badge"><PhPencil :size="14" weight="duotone" /></span>
          <span v-if="isHost(player.user_id)" class="host-badge"><PhCrown :size="14" weight="duotone" /></span>
        </div>
        <div class="player-score">{{ player.score }} 分</div>
      </div>

      <!-- 踢人按鈕（只有房主可見，不能踢自己） -->
      <button
        v-if="canKick(player.user_id)"
        class="kick-btn"
        @click="handleKick(player.user_id, getParticipantName(player.user_id))"
        title="踢出玩家"
      >
        <PhX :size="16" weight="bold" />
      </button>
    </div>

    <!-- 獲勝者標識（遊戲結束時） -->
    <div v-if="showWinner && winner" class="winner-banner">
      <div class="winner-icon"><PhTrophy :size="32" weight="duotone" /></div>
      <div class="winner-text">
        <div class="winner-title">獲勝者</div>
        <div class="winner-name">{{ getParticipantName(winner.user_id) }}</div>
        <div class="winner-score">{{ winner.score }} 分</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhPencil, PhCrown, PhTrophy, PhX } from '@phosphor-icons/vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useScoring } from '../composables/useScoring'

defineProps<{
  showWinner?: boolean
}>()

const emit = defineEmits<{
  (e: 'player-kicked', userId: string): void
}>()

const roomStore = useRoomStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const { playerRankings, winner } = useScoring()

const rankings = computed(() => playerRankings.value)
const kicking = ref(false)

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
  // 檢查當前輪次的畫家，或者房間設定的當前畫家
  return gameStore.currentRound?.drawer_id === userId || 
         roomStore.currentRoom?.current_drawer_id === userId
}

// 判斷是否可以踢此玩家（房主可踢非自己的玩家）
function canKick(userId: string): boolean {
  return roomStore.isHost && !isCurrentUser(userId)
}

// 處理踢人
async function handleKick(userId: string, playerName: string) {
  if (kicking.value) return
  
  // 確認對話框
  const confirmed = window.confirm(`確定要踢出 ${playerName} 嗎？`)
  if (!confirmed) return

  kicking.value = true
  try {
    const result = await roomStore.kickPlayer(userId)
    if (result.success) {
      emit('player-kicked', userId)
    } else {
      alert(result.error || '踢出玩家失敗')
    }
  } catch (err) {
    console.error('踢人失敗:', err)
    alert('踢出玩家失敗')
  } finally {
    kicking.value = false
  }
}
</script>

<style scoped>
.player-list {
  width: 100%;
}

.player-list-header {
  padding: 0.875rem;
  background: linear-gradient(135deg, var(--color-secondary), #5a9ea1);
  color: white;
  font-weight: bold;
  font-family: var(--font-head);
  text-align: center;
  border-radius: 0;
  margin: -0.5rem -0.5rem 0.5rem -0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.player-count {
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem;
  border-bottom: 2px dashed var(--border-light);
  transition: all 0.2s ease;
  border-radius: 0;
  margin-bottom: 2px;
}

.player-item:last-child {
  border-bottom: none;
}

.player-item:hover {
  background: var(--bg-hover);
  transform: translateX(3px);
}

.player-item.is-current {
  background: var(--bg-highlight);
  border: 2px solid var(--color-warning);
  border-bottom: 2px solid var(--color-warning);
}

.player-item.is-drawer {
  background: linear-gradient(135deg, var(--color-warning-light), #fff3cd);
  animation: drawerGlow 2s ease-in-out infinite;
}

@keyframes drawerGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 192, 120, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(240, 192, 120, 0.4); }
}

.player-rank {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  border-radius: 50%;
}

/* 使用 data 屬性來標記排名，避免 nth-child 選擇器問題 */
.player-rank.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #333;
}

.player-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: #333;
}

.player-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b8722e);
  color: white;
}

.player-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  color: var(--text-primary);
  border: 3px solid var(--border-light);
  transition: all 0.3s ease;
}

.player-avatar.drawing {
  background: linear-gradient(135deg, var(--color-warning), #e5ac5a);
  border-color: var(--color-warning);
  animation: avatarPulse 1.5s ease-in-out infinite;
}

@keyframes avatarPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.drawer-badge, .host-badge {
  display: inline-flex;
  align-items: center;
  color: var(--color-warning);
}

.host-badge {
  color: var(--color-primary);
}

.player-score {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-family: var(--font-head);
}

/* 踢人按鈕 */
.kick-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.player-item:hover .kick-btn {
  opacity: 1;
}

.kick-btn:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
  transform: scale(1.1);
}

/* 獲勝者 */
.winner-banner {
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  color: var(--text-primary);
  box-shadow: 4px 4px 0 var(--shadow-color);
  animation: winnerSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes winnerSlideIn {
  from { 
    opacity: 0; 
    transform: translateY(20px) scale(0.9);
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1);
  }
}

.winner-icon {
  animation: trophyBounce 1s ease-in-out infinite;
}

@keyframes trophyBounce {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-5px) rotate(5deg); }
}

.winner-text {
  flex: 1;
}

.winner-title {
  font-size: 0.8rem;
  opacity: 0.9;
  letter-spacing: 1px;
}

.winner-name {
  font-size: 1.2rem;
  font-weight: bold;
  font-family: var(--font-head);
}

.winner-score {
  font-size: 0.9rem;
  opacity: 0.9;
}

/* ============================================
   移動端優化
   ============================================ */
@media (max-width: 768px) {
  .player-list-header {
    padding: 0.6rem;
    margin: -0.5rem -0.5rem 0.35rem -0.5rem;
  }

  .player-count {
    font-size: 0.85rem;
  }

  .player-item {
    padding: 0.4rem 0.5rem;
    gap: 0.4rem;
  }

  .player-rank {
    width: 20px;
    height: 20px;
    font-size: 0.75rem;
  }

  .player-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
    border-width: 2px;
  }

  .player-name {
    font-size: 0.85rem;
    gap: 0.25rem;
  }

  .player-score {
    font-size: 0.75rem;
  }

  .kick-btn {
    width: 24px;
    height: 24px;
    /* 移動端始終顯示踢人按鈕 */
    opacity: 0.6;
  }

  .winner-banner {
    padding: 0.75rem;
    gap: 0.6rem;
  }

  .winner-title {
    font-size: 0.75rem;
  }

  .winner-name {
    font-size: 1rem;
  }

  .winner-score {
    font-size: 0.85rem;
  }
}
</style>

