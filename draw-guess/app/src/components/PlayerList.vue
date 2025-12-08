<template>
  <div class="player-list">
    <div class="card-minimal">
      <h3 class="text-sm font-medium text-text-primary mb-3">
        玩家排行榜
      </h3>

      <div class="space-y-2">
        <div
          v-for="(player, index) in rankings"
          :key="player.id"
          :class="[
            'flex items-center gap-3 p-2 rounded-minimal border-thin transition-all',
            isCurrentUser(player.user_id)
              ? 'border-border-medium bg-bg-secondary'
              : 'border-border-light'
          ]"
        >
          <!-- 排名 -->
          <div
            :class="[
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
              index === 0
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-bg-secondary text-text-secondary'
            ]"
          >
            {{ player.rank }}
          </div>

          <!-- 玩家信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-bg-secondary border-thin border-border-light flex items-center justify-center text-xs text-text-secondary">
                {{ getParticipantName(player.user_id).charAt(0) }}
              </div>
              <div class="text-sm text-text-primary truncate">
                {{ getParticipantName(player.user_id) }}
                <span v-if="isHost(player.user_id)" class="text-xs text-text-secondary ml-1">
                  (房主)
                </span>
                <span v-if="isCurrentDrawer(player.user_id)" class="text-xs text-text-secondary ml-1">
                  (畫家)
                </span>
              </div>
            </div>
          </div>

          <!-- 分數 -->
          <div
            :key="`score-${player.user_id}-${player.score}`"
            class="text-sm font-medium text-text-primary transition-all duration-300 score-update"
          >
            <span class="inline-block">{{ player.score }}</span>
            <span class="text-text-secondary ml-1">分</span>
          </div>
        </div>
      </div>

      <!-- 獲勝者標識（遊戲結束時） -->
      <div
        v-if="showWinner && winner"
        class="mt-4 p-3 bg-yellow-50 border-thin border-yellow-200 rounded-minimal"
      >
        <div class="text-sm font-medium text-yellow-800 text-center">
          🏆 獲勝者：{{ getParticipantName(winner.user_id) }}
        </div>
        <div class="text-xs text-yellow-600 text-center mt-1">
          總分：{{ winner.score }} 分
        </div>
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
  @apply w-full max-w-sm;
}
</style>

