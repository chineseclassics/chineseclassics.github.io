<template>
  <div class="guessing-panel">
    <div class="wired-card">
      <div class="guessing-panel-content">
        <!-- 當前詞語（僅畫家可見） -->
        <div
          v-if="currentWord"
          class="current-word-card"
        >
          <div class="word-label">您要畫的詞語</div>
          <div class="word-text">{{ currentWord }}</div>
        </div>

        <!-- 猜詞輸入（非畫家） -->
        <div v-else class="guessing-input-section">
          <form @submit.prevent="handleSubmit" class="guessing-form">
            <div class="wired-input-wrapper">
              <label class="wired-input-label">輸入您的猜測</label>
              <input
                v-model="guessInput"
                type="text"
                class="wired-input"
                placeholder="輸入詞語..."
                :maxlength="32"
                :disabled="loading || hasGuessed"
                @input="clearError"
              />
              <span class="wired-input-hint">{{ guessInput.length }} / 32 字符</span>
            </div>
            <button
              type="submit"
              :disabled="loading || hasGuessed || !guessInput.trim()"
              class="wired-button wired-button-primary submit-guess-button"
            >
              {{ loading ? '提交中' : hasGuessed ? '已猜中' : '提交' }}
            </button>
          </form>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- 已猜中玩家列表 -->
        <div v-if="correctGuesses.length > 0" class="correct-guesses-section">
          <h4 class="text-hand-title guesses-title">已猜中 ({{ correctGuesses.length }})</h4>
          <div class="guesses-list">
            <div
              v-for="(guess, index) in correctGuesses"
              :key="guess.id"
              class="guess-item"
            >
              <span class="wired-badge guess-rank">{{ index + 1 }}</span>
              <div class="guess-name">{{ getParticipantName(guess.user_id) }}</div>
              <div class="guess-score">+{{ guess.score_earned }} 分</div>
            </div>
          </div>
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

.guessing-panel-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 手繪風格卡片 */
.wired-card {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 4px 4px 0 var(--shadow-color);
}

/* 手繪風格輸入框 */
.wired-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wired-input-label {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.wired-input {
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 1rem;
  border: 3px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.wired-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.wired-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wired-input-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
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

/* 手繪風格徽章 */
.wired-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-secondary);
  color: white;
  border-radius: 4px;
  border: 2px solid var(--border-color);
}

/* 當前詞語卡片 */
.current-word-card {
  padding: 1rem;
  background: linear-gradient(135deg, var(--bg-secondary), var(--color-warning-light));
  border: 2px dashed var(--color-secondary);
  border-radius: 12px;
  text-align: center;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(107, 175, 178, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(107, 175, 178, 0);
  }
}

.word-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
  margin-bottom: 0.5rem;
}

.word-text {
  font-size: 1.5rem;
  color: var(--color-secondary);
  font-family: var(--font-head);
  font-weight: bold;
  letter-spacing: 2px;
}

/* 猜詞輸入區域 */
.guessing-input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.guessing-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.submit-guess-button {
  margin-top: 0.25rem;
}

/* 已猜中列表 */
.correct-guesses-section {
  border-top: 2px dashed var(--border-light);
  padding-top: 1rem;
}

.guesses-title {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.guesses-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.guess-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.guess-item:hover {
  background: var(--bg-hover);
  transform: translateX(3px);
}

.guess-rank {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.guess-name {
  flex: 1;
  font-family: var(--font-body);
  color: var(--text-primary);
  font-weight: 500;
}

.guess-score {
  font-family: var(--font-body);
  color: var(--color-success);
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
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

/* 滾動條樣式 */
.guesses-list::-webkit-scrollbar {
  width: 6px;
}

.guesses-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.guesses-list::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.guesses-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}
</style>

