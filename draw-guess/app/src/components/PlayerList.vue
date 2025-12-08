<template>
  <div class="player-list">
    <div class="space-y-2">
      <div
        v-for="player in rankings"
        :key="player.id"
        :class="[
          'flex items-center gap-2 p-2 rounded-lg transition-all',
          isCurrentUser(player.user_id)
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700'
        ]"
      >
        <!-- 玩家頭像 -->
        <div
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
            isCurrentDrawer(player.user_id)
              ? 'bg-yellow-400 text-yellow-900'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          ]"
        >
          {{ getParticipantName(player.user_id).charAt(0) }}
        </div>

        <!-- 玩家信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <div class="text-sm text-text-primary truncate font-medium">
              {{ getParticipantName(player.user_id) }}
            </div>
            <!-- 畫家標記（鉛筆圖標） -->
            <i
              v-if="isCurrentDrawer(player.user_id)"
              class="fas fa-pencil-alt text-xs text-yellow-600 flex-shrink-0"
              title="畫家"
            ></i>
            <!-- 房主標記 -->
            <span
              v-if="isHost(player.user_id)"
              class="text-xs text-text-secondary flex-shrink-0"
              title="房主"
            >
              (房主)
            </span>
          </div>
          <!-- 分數 -->
          <div class="text-xs text-text-secondary">
            得分 {{ player.score }}
          </div>
        </div>
      </div>

      <!-- 獲勝者標識（遊戲結束時） -->
      <div
        v-if="showWinner && winner"
        class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
      >
        <div class="text-sm font-medium text-yellow-800 dark:text-yellow-300 text-center">
          🏆 獲勝者：{{ getParticipantName(winner.user_id) }}
        </div>
        <div class="text-xs text-yellow-600 dark:text-yellow-400 text-center mt-1">
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
  @apply w-full;
}
</style>

