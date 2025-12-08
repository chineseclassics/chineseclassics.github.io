<template>
  <div class="guessing-panel">
    <div class="card-minimal">
      <!-- 當前詞語（僅畫家可見） -->
      <div v-if="currentWord" class="mb-4 p-3 bg-bg-secondary rounded-minimal">
        <div class="text-xs text-text-secondary mb-1">您要畫的詞語</div>
        <div class="text-lg font-medium text-text-primary">{{ currentWord }}</div>
      </div>

      <!-- 猜詞輸入（非畫家） -->
      <div v-else class="mb-4">
        <label class="block text-sm text-text-secondary mb-2">輸入您的猜測</label>
        <form @submit.prevent="handleSubmit" class="flex gap-2">
          <input
            v-model="guessInput"
            type="text"
            class="input-minimal flex-1"
            placeholder="輸入詞語..."
            maxlength="32"
            :disabled="loading || hasGuessed"
            @input="clearError"
          />
          <button
            type="submit"
            :disabled="loading || hasGuessed || !guessInput.trim()"
            class="btn-minimal px-4"
          >
            {{ loading ? '提交中...' : hasGuessed ? '已猜中' : '提交' }}
          </button>
        </form>
        <div class="text-xs text-text-secondary mt-1">
          {{ guessInput.length }} / 32 字符
        </div>
      </div>

      <!-- 錯誤提示 -->
      <div v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded-minimal border-thin border-red-200">
        {{ error }}
      </div>

      <!-- 已猜中玩家列表 -->
      <div v-if="correctGuesses.length > 0" class="mb-4">
        <h3 class="text-sm font-medium text-text-primary mb-2">
          已猜中 ({{ correctGuesses.length }})
        </h3>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="(guess, index) in correctGuesses"
            :key="guess.id"
            class="flex items-center gap-2 p-2 rounded-minimal border-thin border-border-light"
          >
            <div class="w-6 h-6 rounded-full bg-bg-secondary border-thin border-border-light flex items-center justify-center text-xs text-text-secondary">
              {{ index + 1 }}
            </div>
            <div class="flex-1 text-sm text-text-primary">
              {{ getParticipantName(guess.user_id) }}
            </div>
            <div class="text-xs text-text-secondary">
              +{{ guess.score_earned }} 分
            </div>
          </div>
        </div>
      </div>

      <!-- 提示區域（可選，MVP 階段可簡化） -->
      <div v-if="false" class="text-xs text-text-secondary">
        <div class="mb-1">提示：</div>
        <div class="text-text-primary">提示功能將在後續版本中實現</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGuessing } from '../composables/useGuessing'
import { useRoomStore } from '../stores/room'

const {
  guessInput,
  error,
  loading,
  currentWord,
  correctGuesses,
  hasGuessed,
  submitGuess,
  clearError,
} = useGuessing()

const roomStore = useRoomStore()

// 獲取參與者名稱
function getParticipantName(userId: string): string {
  const participant = roomStore.participants.find(p => p.user_id === userId)
  return participant?.nickname || '未知玩家'
}

// 提交猜測
async function handleSubmit() {
  await submitGuess()
}
</script>

<style scoped>
.guessing-panel {
  @apply w-full max-w-md;
}
</style>

