<template>
  <div class="modal-overlay" @click.self="handleSkip">
    <div class="modal-card">
      <!-- 標題 -->
      <div class="modal-header">
        <h2 class="modal-title">
          <PhStar :size="24" weight="duotone" class="title-icon" />
          故事結局
        </h2>
      </div>

      <!-- 內容 -->
      <div class="modal-body">
        <p class="modal-description">
          故事即將結束！<br />
          <span v-if="isHost">作為房主，你可以為這個故事寫一個結尾。</span>
          <span v-else>等待房主輸入故事結尾...</span>
        </p>

        <!-- 房主輸入區域 -->
        <div v-if="isHost" class="input-section">
          <label class="input-label">故事結尾（可選）</label>
          <textarea
            v-model="endingSentence"
            class="ending-input"
            :placeholder="placeholderText"
            maxlength="200"
            rows="3"
            @input="handleInput"
          ></textarea>
          <div class="char-count" :class="{ 'near-limit': charCount > 180 }">
            {{ charCount }} / 200
          </div>
        </div>

        <!-- 非房主等待提示 -->
        <div v-else class="waiting-section">
          <div class="waiting-spinner">
            <PhSpinner :size="32" weight="bold" class="spinner-icon" />
          </div>
          <p class="waiting-text">等待房主輸入故事結尾...</p>
        </div>

        <!-- 操作按鈕（僅房主可見） -->
        <div v-if="isHost" class="action-buttons">
          <button 
            class="action-btn submit-btn"
            :disabled="isSubmitting"
            @click="handleSubmit"
          >
            <PhPaperPlaneTilt :size="18" weight="bold" />
            {{ endingSentence.trim() ? '提交結尾' : '跳過結尾' }}
          </button>
          <button 
            v-if="endingSentence.trim()"
            class="action-btn skip-btn"
            :disabled="isSubmitting"
            @click="handleSkip"
          >
            <PhX :size="18" weight="bold" />
            跳過
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StoryEndingModal 組件 - 最後一局結束時顯示故事結尾輸入
 * 
 * Requirements: 7.7, 7.8 - 最後一局結束時進入故事結局階段，提示房主輸入故事結尾句子（可選）
 */

import { ref, computed } from 'vue'
import { PhStar, PhPaperPlaneTilt, PhX, PhSpinner } from '@phosphor-icons/vue'

// ============================================
// Props 定義
// ============================================

interface Props {
  /** 是否為房主 */
  isHost: boolean
  /** 故事開頭（用於生成佔位符提示） */
  storyOpening?: string
}

const props = withDefaults(defineProps<Props>(), {
  isHost: false,
  storyOpening: ''
})

// ============================================
// Emits 定義
// ============================================

const emit = defineEmits<{
  /** 提交故事結尾 */
  (e: 'submit', ending: string): void
  /** 跳過故事結尾 */
  (e: 'skip'): void
}>()

// ============================================
// 狀態
// ============================================

const endingSentence = ref('')
const isSubmitting = ref(false)

// ============================================
// 計算屬性
// ============================================

const charCount = computed(() => endingSentence.value.length)

const placeholderText = computed(() => {
  if (props.storyOpening) {
    return `為「${props.storyOpening.slice(0, 20)}${props.storyOpening.length > 20 ? '...' : ''}」的故事寫一個結尾...`
  }
  return '為這個故事寫一個結尾...'
})

// ============================================
// 方法
// ============================================

function handleInput() {
  // 輸入處理（可以添加驗證邏輯）
}

async function handleSubmit() {
  if (isSubmitting.value) return
  
  isSubmitting.value = true
  
  try {
    const trimmedEnding = endingSentence.value.trim()
    emit('submit', trimmedEnding)
  } finally {
    isSubmitting.value = false
  }
}

function handleSkip() {
  if (!props.isHost) return
  emit('skip')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  box-shadow: 8px 8px 0 var(--shadow-color);
  width: 100%;
  max-width: 480px;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 3px solid var(--border-color);
  background: linear-gradient(135deg, #fce4ec, #f8bbd9);
}

.modal-title {
  font-size: 1.4rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.title-icon {
  color: var(--color-primary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-description {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

/* 輸入區域 */
.input-section {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.ending-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  font-family: var(--font-body);
  color: var(--text-primary);
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ending-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(224, 123, 103, 0.2);
}

.ending-input::placeholder {
  color: var(--text-tertiary);
}

.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-top: 0.35rem;
}

.char-count.near-limit {
  color: var(--color-warning);
}

/* 等待區域 */
.waiting-section {
  text-align: center;
  padding: 2rem 1rem;
}

.waiting-spinner {
  margin-bottom: 1rem;
}

.spinner-icon {
  color: var(--color-secondary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.waiting-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0;
}

/* 操作按鈕 */
.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-head);
  border: 3px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.action-btn:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--shadow-color);
}

.action-btn:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--shadow-color);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.submit-btn:hover:not(:disabled) {
  background: #c9604c;
}

.skip-btn {
  background: var(--bg-card);
  color: var(--text-secondary);
  flex: 0 0 auto;
  padding: 0.875rem 1.25rem;
}

.skip-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
}

/* 移動端優化 */
@media (max-width: 480px) {
  .modal-card {
    max-width: 100%;
    margin: 0.5rem;
  }

  .modal-header {
    padding: 1rem 1.25rem;
  }

  .modal-title {
    font-size: 1.2rem;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .ending-input {
    font-size: 0.95rem;
    padding: 0.75rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }

  .skip-btn {
    flex: 1;
  }
}
</style>
