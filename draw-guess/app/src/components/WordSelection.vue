<template>
  <div class="word-selection">
    <!-- 等待狀態：選詞後等待其他玩家查看結果 -->
    <div v-if="isWaiting" class="waiting-overlay">
      <div class="waiting-card">
        <div class="waiting-icon"><PhHourglass :size="48" weight="duotone" /></div>
        <h2 class="waiting-title">已選擇「{{ selectedWord }}」</h2>
        <p class="waiting-text">請稍等，其他玩家正在查看結果...</p>
        <div class="waiting-spinner"></div>
      </div>
    </div>
    
    <!-- 選詞界面 -->
    <div v-else class="selection-card">
      <!-- 標題 -->
      <div class="selection-header">
        <h2 class="selection-title"><PhPaintBrush :size="24" weight="duotone" class="title-icon" /> 輪到你畫畫了！</h2>
        <div class="round-info">第 {{ roundNumber }} / {{ totalRounds }} 輪</div>
      </div>

      <!-- 倒計時 -->
      <div class="countdown-section">
        <div class="countdown-ring" :class="{ 'warning': countdown <= 5 }">
          <span class="countdown-number">{{ countdown }}</span>
        </div>
        <div class="countdown-text">
          {{ countdown <= 5 ? '即將自動選擇！' : '請選擇一個詞語' }}
        </div>
      </div>

      <!-- 詞語選項 -->
      <div class="word-options">
        <button
          v-for="(word, index) in wordOptions"
          :key="index"
          class="word-option"
          :class="{ 'selected': selectedWord === word.text }"
          @click="selectWord(word.text)"
          :disabled="hasSelected"
        >
          <span class="word-text">{{ word.text }}</span>
          <span class="word-source" v-if="word.source === 'custom'">自訂</span>
        </button>
      </div>

      <!-- 確認按鈕 -->
      <div class="selection-footer">
        <button 
          class="confirm-btn"
          :disabled="!selectedWord || hasSelected"
          @click="confirmSelection"
        >
          {{ hasSelected ? '已選擇' : '確認選擇' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PhPaintBrush, PhHourglass } from '@phosphor-icons/vue'

const props = defineProps<{
  wordOptions: Array<{ text: string; source: 'wordlist' | 'custom' }>
  roundNumber: number
  totalRounds: number
  selectionTime: number // 選詞時間（秒）
  isWaiting?: boolean  // 選詞後等待狀態
}>()

const emit = defineEmits<{
  (e: 'word-selected', word: string): void
}>()

const selectedWord = ref<string | null>(null)
const hasSelected = ref(false)
const countdown = ref(props.selectionTime)
let countdownTimer: number | null = null

// 選擇詞語
function selectWord(word: string) {
  if (hasSelected.value) return
  selectedWord.value = word
}

// 確認選擇
function confirmSelection() {
  if (!selectedWord.value || hasSelected.value) return
  
  hasSelected.value = true
  emit('word-selected', selectedWord.value)
  
  // 停止倒計時
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
}

// 自動選擇（超時）
function autoSelect() {
  if (hasSelected.value) return
  
  // 隨機選擇一個詞
  const randomIndex = Math.floor(Math.random() * props.wordOptions.length)
  const randomWord = props.wordOptions[randomIndex]
  
  if (randomWord) {
    selectedWord.value = randomWord.text
    hasSelected.value = true
    emit('word-selected', randomWord.text)
  }
}

// 開始倒計時
function startCountdown() {
  countdown.value = props.selectionTime
  
  countdownTimer = window.setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      if (countdownTimer) {
        clearInterval(countdownTimer)
      }
      autoSelect()
    }
  }, 1000)
}

onMounted(() => {
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
.word-selection {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
  padding: 1rem;
}

.selection-card {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.selection-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.selection-title {
  font-size: 1.5rem;
  font-family: var(--font-head);
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.round-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 倒計時 */
.countdown-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.countdown-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border: 2px solid var(--color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.5rem;
  transition: all 0.3s;
}

.countdown-ring.warning {
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
  border-color: var(--color-danger);
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.countdown-number {
  font-size: 2rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--color-secondary);
}

.countdown-ring.warning .countdown-number {
  color: var(--color-danger);
}

.countdown-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* 詞語選項 */
.word-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.word-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  font-size: 1.2rem;
  font-family: var(--font-head);
  cursor: pointer;
  transition: all 0.2s;
}

.word-option:hover:not(:disabled) {
  border-color: var(--color-secondary);
  background: #e3f2fd;
  transform: translateY(-2px);
}

.word-option.selected {
  border-color: var(--color-secondary);
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.word-option:disabled {
  opacity: 0.7;
  cursor: default;
}

.word-text {
  font-weight: bold;
}

.word-source {
  font-size: 0.75rem;
  background: var(--color-warning);
  color: var(--text-primary);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

/* 確認按鈕 */
.selection-footer {
  text-align: center;
}

.confirm-btn {
  background: var(--color-secondary);
  color: white;
  border: none;
  padding: 0.875rem 2.5rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-family: var(--font-head);
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover:not(:disabled) {
  background: var(--color-secondary-dark, #0056b3);
  transform: translateY(-2px);
}

.confirm-btn:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}

/* 等待狀態樣式 */
.waiting-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
  padding: 1rem;
}

.waiting-card {
  background: var(--bg-card);
  border: 2px solid var(--color-secondary);
  border-radius: 8px;
  padding: 2.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.waiting-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.waiting-title {
  font-size: 1.5rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.waiting-text {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.waiting-spinner {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-color);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
