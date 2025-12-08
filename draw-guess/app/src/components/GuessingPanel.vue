<template>
  <div class="guessing-panel">
    <div class="card">
      <div class="card-body">
        <!-- 當前詞語（僅畫家可見） -->
        <div
          v-if="currentWord"
          class="margin-bottom-medium border padding-small"
          style="background-color: var(--bg-secondary); border-color: var(--color-secondary);"
        >
          <div class="text-small margin-bottom-small" style="color: var(--text-secondary);">您要畫的詞語</div>
          <div class="text-hand-title" style="font-size: 1.5rem; color: var(--color-secondary);">{{ currentWord }}</div>
        </div>

        <!-- 猜詞輸入（非畫家） -->
        <div v-else class="margin-bottom-medium">
          <label>輸入您的猜測</label>
          <form @submit.prevent="handleSubmit" class="row flex-middle margin-top-small">
            <div class="col-8">
              <input
                v-model="guessInput"
                type="text"
                placeholder="輸入詞語..."
                maxlength="32"
                :disabled="loading || hasGuessed"
                @input="clearError"
              />
            </div>
            <div class="col-4">
              <button
                type="submit"
                :disabled="loading || hasGuessed || !guessInput.trim()"
                class="paper-btn btn-primary btn-block"
              >
                {{ loading ? '提交中...' : hasGuessed ? '已猜中' : '提交' }}
              </button>
            </div>
          </form>
          <div class="text-small margin-top-small">
            {{ guessInput.length }} / 32 字符
          </div>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="error" class="alert alert-danger margin-bottom-medium">
          {{ error }}
        </div>

        <!-- 已猜中玩家列表 -->
        <div v-if="correctGuesses.length > 0" class="margin-bottom-medium">
          <h4 class="text-hand-title">已猜中 ({{ correctGuesses.length }})</h4>
          <div style="max-height: 200px; overflow-y: auto; margin-top: 0.5rem;">
            <div
              v-for="(guess, index) in correctGuesses"
              :key="guess.id"
              class="row flex-middle margin-bottom-small border-bottom"
              style="padding-bottom: 5px;"
            >
              <div class="col-2">
                <div class="badge secondary">{{ index + 1 }}</div>
              </div>
              <div class="col-6 text-hand">
                {{ getParticipantName(guess.user_id) }}
              </div>
              <div class="col-4 text-right text-small">
                +{{ guess.score_earned }} 分
              </div>
            </div>
          </div>
        </div>

        <!-- 提示區域（可選，MVP 階段可簡化） -->
        <div v-if="false" class="text-small">
          <div class="margin-bottom-small">提示：</div>
          <div>提示功能將在後續版本中實現</div>
        </div>
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
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>

