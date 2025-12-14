<template>
  <div class="story-setup-overlay" @click.self="handleOverlayClick">
    <div class="story-setup-modal">
      <!-- 標題區域 -->
      <div class="modal-header">
        <div class="header-decoration">
          <PhBookOpenText :size="32" weight="duotone" class="header-icon" />
        </div>
        <h2 class="modal-title">🎬 開機！</h2>
        <p class="modal-subtitle">
          {{ isHost ? '作為導演，請為故事板寫下第一句' : '等待導演設定故事開頭...' }}
        </p>
      </div>

      <!-- 房主輸入區域 -->
      <div v-if="isHost" class="input-section">
        <!-- 提示文字 -->
        <div class="input-hint">
          <PhLightbulb :size="18" weight="fill" class="hint-icon" />
          <span>寫一個引人入勝的開頭，分鏡師將根據這句話創作第一鏡</span>
        </div>

        <!-- 輸入框 -->
        <div class="wired-input-wrapper">
          <textarea
            ref="inputRef"
            v-model="openingSentence"
            class="wired-textarea"
            :placeholder="placeholderText"
            :maxlength="maxLength"
            rows="4"
            :disabled="isSubmitting"
            @input="handleInput"
          ></textarea>
          <div class="input-footer">
            <span 
              class="char-count"
              :class="{ 
                'warning': charCount > maxLength * 0.8,
                'over-limit': isOverLimit 
              }"
            >
              {{ charCount }} / {{ maxLength }}
            </span>
          </div>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="errorMessage" class="error-message">
          <PhWarningCircle :size="16" weight="fill" class="error-icon" />
          {{ errorMessage }}
        </div>

        <!-- 提交按鈕 -->
        <button
          type="button"
          class="wired-button wired-button-primary submit-btn"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          <PhPaperPlaneTilt v-if="!isSubmitting" :size="20" weight="fill" />
          <PhSpinner v-else :size="20" weight="bold" class="spinner" />
          {{ isSubmitting ? '提交中...' : '開始故事' }}
        </button>
      </div>

      <!-- 非房主等待區域 -->
      <div v-else class="waiting-section">
        <div class="waiting-animation">
          <PhPencilLine :size="48" weight="duotone" class="waiting-icon" />
        </div>
        <p class="waiting-text">房主正在構思故事開頭...</p>
        <div class="waiting-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>

      <!-- 底部裝飾 -->
      <div class="modal-footer">
        <div class="footer-decoration">
          <PhSparkle :size="14" weight="fill" class="sparkle" />
          <span>分鏡接龍模式</span>
          <PhSparkle :size="14" weight="fill" class="sparkle" />
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
/**
 * StorySetupModal 組件 - 故事開頭輸入彈窗
 * 
 * 在分鏡接龍模式遊戲開始時顯示，讓房主輸入故事開頭句子
 * 
 * Requirements: 2.1, 2.3, 2.4
 * - 2.1: 分鏡接龍模式遊戲開始時提示房主輸入故事開頭句子
 * - 2.3: 故事開頭為空或僅包含空白字符時拒絕提交
 * - 2.4: 故事開頭超過 100 個字符時拒絕提交並提示字數限制
 */

import { ref, computed, onMounted, nextTick } from 'vue'
import {
  PhBookOpenText,
  PhLightbulb,
  PhWarningCircle,
  PhPaperPlaneTilt,
  PhSpinner,
  PhPencilLine,
  PhSparkle
} from '@phosphor-icons/vue'
import { isBlankSentence, isOverLimit as checkOverLimit } from '../types/storyboard'

// ============================================
// Props 定義
// Requirements: 2.1 - 區分房主和非房主
// ============================================

interface Props {
  /** 當前用戶是否為房主 */
  isHost: boolean
}

const props = defineProps<Props>()

// ============================================
// Emits 定義
// ============================================

const emit = defineEmits<{
  /** 提交故事開頭 */
  (e: 'submit', openingSentence: string): void
  /** 關閉彈窗（僅在特定情況下允許） */
  (e: 'close'): void
}>()

// ============================================
// 常量定義
// Requirements: 2.4 - 字數限制為 100 字符
// ============================================

/** 最大字數限制 */
const maxLength = 100

/** 佔位符文字 */
const placeholderText = '例如：在一個風雨交加的夜晚，小明獨自走在回家的路上...'

// ============================================
// 本地狀態
// ============================================

/** 輸入框引用 */
const inputRef = ref<HTMLTextAreaElement | null>(null)

/** 故事開頭句子 */
const openingSentence = ref('')

/** 是否正在提交 */
const isSubmitting = ref(false)

/** 錯誤訊息 */
const errorMessage = ref('')

// ============================================
// 計算屬性
// ============================================

/** 當前字數 */
const charCount = computed(() => openingSentence.value.length)

/** 是否超過字數限制 */
const isOverLimit = computed(() => checkOverLimit(openingSentence.value, maxLength))

/** 是否為空白內容 */
const isBlank = computed(() => isBlankSentence(openingSentence.value))

/** 是否可以提交 */
const canSubmit = computed(() => {
  return !isBlank.value && !isOverLimit.value && !isSubmitting.value
})

// ============================================
// 方法
// ============================================

/**
 * 處理輸入事件
 * 清除錯誤訊息
 */
function handleInput() {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
}

/**
 * 驗證輸入
 * Requirements: 2.3, 2.4
 * 
 * @returns 是否驗證通過
 */
function validateInput(): boolean {
  // Requirements: 2.3 - 空白驗證
  if (isBlank.value) {
    errorMessage.value = '請輸入故事開頭，不能為空'
    return false
  }

  // Requirements: 2.4 - 字數限制驗證
  if (isOverLimit.value) {
    errorMessage.value = `故事開頭不能超過 ${maxLength} 個字符`
    return false
  }

  return true
}

/**
 * 處理提交
 * Requirements: 2.1, 2.3, 2.4
 */
async function handleSubmit() {
  if (!canSubmit.value) return

  // 驗證輸入
  if (!validateInput()) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // 發送提交事件，傳遞去除首尾空白的句子
    emit('submit', openingSentence.value.trim())
  } catch (error) {
    console.error('[StorySetupModal] 提交失敗:', error)
    errorMessage.value = '提交失敗，請重試'
    isSubmitting.value = false
  }
}

/**
 * 處理遮罩層點擊
 * 故事開頭設定是必須的，不允許通過點擊遮罩關閉
 */
function handleOverlayClick() {
  // 不允許關閉，可以添加提示動畫
  if (props.isHost) {
    // 可以添加抖動動畫提示用戶必須輸入
    const modal = document.querySelector('.story-setup-modal')
    if (modal) {
      modal.classList.add('shake')
      setTimeout(() => modal.classList.remove('shake'), 500)
    }
  }
}

// ============================================
// 生命週期
// ============================================

onMounted(() => {
  // 如果是房主，自動聚焦輸入框
  if (props.isHost) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})
</script>


<style scoped>
/* ============================================
   遮罩層和基礎佈局
   ============================================ */

.story-setup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.story-setup-modal {
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  padding: 1.5rem;
  max-width: 480px;
  width: 100%;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  box-shadow: 8px 8px 0 var(--shadow-color);
  animation: modalPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

@keyframes modalPopIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 抖動動畫 - 提示用戶必須輸入 */
.story-setup-modal.shake {
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}

/* 裝飾性背景紋理 */
.story-setup-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 10% 10%, rgba(224, 123, 103, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 90% 90%, rgba(107, 175, 178, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

/* ============================================
   標題區域
   ============================================ */

.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;
  position: relative;
}

.header-decoration {
  margin-bottom: 0.75rem;
}

.header-icon {
  color: var(--color-primary);
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.modal-title {
  font-size: 1.5rem;
  font-family: var(--font-head);
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.modal-subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  font-family: var(--font-body);
}

/* ============================================
   輸入區域
   ============================================ */

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
}

.input-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #fff9e6, #fff3cd);
  border: 2px solid var(--color-warning);
  border-radius: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
}

.hint-icon {
  color: var(--color-warning);
  flex-shrink: 0;
}

/* 輸入框 */
.wired-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wired-textarea {
  width: 100%;
  padding: 1rem;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.6;
  border: 3px solid var(--border-color);
  border-radius: 0;
  background: var(--bg-card);
  color: var(--text-primary);
  resize: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.wired-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.wired-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

.wired-textarea::placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}

.input-footer {
  display: flex;
  justify-content: flex-end;
  padding-right: 0.25rem;
}

.char-count {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-family: var(--font-body);
  transition: color 0.2s;
}

.char-count.warning {
  color: var(--color-warning);
}

.char-count.over-limit {
  color: var(--color-danger);
  font-weight: 600;
}

/* 錯誤提示 */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--color-danger);
  color: white;
  border-radius: 0;
  font-family: var(--font-body);
  font-size: 0.9rem;
  animation: errorShake 0.3s ease;
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-icon {
  flex-shrink: 0;
}

/* 提交按鈕 */
.wired-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem 1.5rem;
  font-family: var(--font-body);
  font-size: 1.1rem;
  font-weight: 600;
  border: 3px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.wired-button:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--shadow-color);
}

.wired-button:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.wired-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wired-button-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.wired-button-primary:hover:not(:disabled) {
  background: var(--color-primary-dark, #c96a50);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================
   等待區域（非房主）
   ============================================ */

.waiting-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  gap: 1rem;
}

.waiting-animation {
  position: relative;
}

.waiting-icon {
  color: var(--color-secondary);
  animation: writingAnimation 2s ease-in-out infinite;
}

@keyframes writingAnimation {
  0%, 100% { 
    transform: translateX(0) rotate(0deg); 
    opacity: 1;
  }
  25% { 
    transform: translateX(5px) rotate(5deg); 
    opacity: 0.8;
  }
  50% { 
    transform: translateX(0) rotate(0deg); 
    opacity: 1;
  }
  75% { 
    transform: translateX(-5px) rotate(-5deg); 
    opacity: 0.8;
  }
}

.waiting-text {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.waiting-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--color-secondary);
  border-radius: 50%;
  animation: dotBounce 1.4s ease-in-out infinite;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotBounce {
  0%, 80%, 100% { 
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% { 
    transform: scale(1);
    opacity: 1;
  }
}

/* ============================================
   底部裝飾
   ============================================ */

.modal-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--border-light);
}

.footer-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-family: var(--font-body);
}

.sparkle {
  color: var(--color-warning);
  animation: sparkleAnimation 2s ease-in-out infinite;
}

.sparkle:nth-child(1) { animation-delay: 0s; }
.sparkle:nth-child(3) { animation-delay: 1s; }

@keyframes sparkleAnimation {
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    opacity: 0.6;
  }
  50% { 
    transform: scale(1.2) rotate(180deg);
    opacity: 1;
  }
}

/* ============================================
   滾動條樣式
   ============================================ */

.story-setup-modal::-webkit-scrollbar {
  width: 8px;
}

.story-setup-modal::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.story-setup-modal::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 4px;
}

.story-setup-modal::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}

/* ============================================
   移動端優化
   ============================================ */

@media (max-width: 768px) {
  .story-setup-overlay {
    padding: 0.5rem;
  }

  .story-setup-modal {
    padding: 1.25rem;
    max-height: calc(100dvh - 1rem);
    box-shadow: 6px 6px 0 var(--shadow-color);
  }

  .modal-title {
    font-size: 1.3rem;
  }

  .modal-subtitle {
    font-size: 0.9rem;
  }

  .header-icon {
    width: 28px;
    height: 28px;
  }

  .input-hint {
    font-size: 0.8rem;
    padding: 0.6rem;
  }

  .wired-textarea {
    padding: 0.75rem;
    font-size: 0.95rem;
  }

  .wired-button {
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
  }

  .waiting-icon {
    width: 40px;
    height: 40px;
  }

  .waiting-text {
    font-size: 0.9rem;
  }
}

/* 小屏幕進一步優化 */
@media (max-width: 480px) {
  .story-setup-modal {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.2rem;
  }

  .wired-textarea {
    rows: 3;
  }
}
</style>
