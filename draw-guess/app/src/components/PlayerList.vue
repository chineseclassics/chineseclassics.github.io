<template>
  <div class="player-list">
    <div
      v-for="player in rankings"
      :key="player.id"
      :class="[
        'row flex-middle margin-bottom-small border-bottom',
        isCurrentUser(player.user_id) ? 'border-primary' : ''
      ]"
      style="padding-bottom: 10px;"
    >
      <!-- 玩家頭像 -->
      <div class="col-2">
        <div
          :class="[
            'border',
            isCurrentDrawer(player.user_id) ? 'border-warning' : ''
          ]"
          :style="{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isCurrentDrawer(player.user_id) ? 'var(--color-warning)' : 'var(--bg-secondary)',
            borderColor: isCurrentDrawer(player.user_id) ? 'var(--color-warning)' : 'var(--border-light)',
            color: 'var(--text-primary)'
          }"
        >
          {{ getParticipantName(player.user_id).charAt(0) }}
        </div>
      </div>

      <!-- 玩家信息 -->
      <div class="col-8">
        <div class="text-hand">
          {{ getParticipantName(player.user_id) }}
          <span
            v-if="isCurrentDrawer(player.user_id)"
            class="badge warning"
            style="background-color: var(--color-warning); color: var(--text-primary);"
          >
            畫家
          </span>
          <span v-if="isHost(player.user_id)" class="text-small">(房主)</span>
        </div>
        <div class="text-small">
          得分 {{ player.score }}
        </div>
      </div>
    </div>

    <!-- 獲勝者標識（遊戲結束時） -->
    <div
      v-if="showWinner && winner"
      class="alert alert-success margin-top-medium"
      style="background-color: var(--color-success); color: white; border-color: var(--color-success);"
    >
      <div class="text-hand-title" style="color: white;">
        🏆 獲勝者：{{ getParticipantName(winner.user_id) }}
      </div>
      <div class="text-small margin-top-small" style="color: white;">
        總分：{{ winner.score }} 分
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
</style>

