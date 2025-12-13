<template>
  <div class="story-panel">
    <div class="wired-card">
      <div class="story-panel-content">
        <!-- 故事歷史區域 - 所有階段都顯示 -->
        <div class="story-history-section">
          <h4 class="section-title">
            <PhBookOpen :size="18" weight="fill" class="title-icon" />
            故事進展
          </h4>
          
          <!-- 故事歷史列表 -->
          <div class="story-history-list" ref="historyListRef">
            <!-- 空狀態 -->
            <div v-if="storyHistory.length === 0" class="empty-state">
              <PhNotePencil :size="32" weight="light" class="empty-icon" />
              <span>故事即將開始...</span>
            </div>
            
            <!-- 故事項目 -->
            <div 
              v-for="(item, index) in storyHistory" 
              :key="item.id"
              class="story-item"
              :class="{ 
                'is-text': item.itemType === 'text',
                'is-image': item.itemType === 'image',
                'is-opening': index === 0 && item.itemType === 'text'
              }"
            >
              <!-- 文字項目 -->
              <template v-if="item.itemType === 'text'">
                <div class="story-text-item">
                  <span class="story-badge" v-if="index === 0">開頭</span>
                  <span class="story-badge" v-else>第 {{ Math.ceil(index / 2) }} 幕</span>
                  <p class="story-text">{{ item.content }}</p>
                  <span class="story-author" v-if="item.authorName">
                    <PhUser :size="12" weight="fill" /> {{ item.authorName }}
                  </span>
                </div>
              </template>
              
              <!-- 圖片項目 -->
              <template v-else-if="item.itemType === 'image'">
                <div class="story-image-item">
                  <img 
                    :src="item.content" 
                    :alt="`第 ${Math.ceil(index / 2)} 幕畫作`"
                    class="story-image"
                    loading="lazy"
                  />
                  <span class="story-author" v-if="item.authorName">
                    <PhPaintBrush :size="12" weight="fill" /> {{ item.authorName }}
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 編劇階段：句子輸入區域 -->
        <div v-if="phase === 'writing'" class="writing-section">
          <div class="section-divider"></div>
          <h4 class="section-title">
            <PhPencilLine :size="18" weight="fill" class="title-icon" />
            撰寫下一句
          </h4>
          
          <!-- 已提交狀態 -->
          <div v-if="hasSubmitted" class="submitted-state">
            <div class="submitted-card">
              <PhCheckCircle :size="24" weight="fill" class="submitted-icon" />
              <div class="submitted-content">
                <span class="submitted-label">劇本已提交</span>
                <p class="submitted-text">{{ mySubmission }}</p>
              </div>
            </div>
            <button 
              class="wired-button wired-button-secondary edit-btn"
              @click="handleEditSubmission"
            >
              <PhPencil :size="16" weight="fill" /> 修改
            </button>
          </div>
          
          <!-- 輸入表單 -->
          <form v-else @submit.prevent="handleSubmit" class="writing-form">
            <div class="wired-input-wrapper">
              <textarea
                ref="sentenceInputRef"
                v-model="sentenceInput"
                class="wired-textarea"
                placeholder="根據畫面，寫下故事的下一句..."
                :maxlength="maxLength"
                rows="3"
                :disabled="isSubmitting"
                @input="clearError"
              ></textarea>
              <div class="input-footer">
                <span 
                  class="char-count"
                  :class="{ 'over-limit': isOverLimit }"
                >
                  {{ inputLength }} / {{ maxLength }}
                </span>
              </div>
            </div>
            <button
              type="submit"
              :disabled="!canSubmit"
              class="wired-button wired-button-primary submit-btn"
            >
              {{ isSubmitting ? '提交中...' : '提交劇本' }}
            </button>
          </form>
          
          <!-- 錯誤提示 -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>

        <!-- 投票階段：投票選項列表 -->
        <div v-if="phase === 'voting'" class="voting-section">
          <div class="section-divider"></div>
          <h4 class="section-title">
            <PhHandPointing :size="18" weight="fill" class="title-icon" />
            投票選擇最佳句子
          </h4>
          
          <!-- 無提交狀態 -->
          <div v-if="submissions.length === 0" class="empty-state">
            <PhWarningCircle :size="32" weight="light" class="empty-icon" />
            <span>沒有人提交句子</span>
          </div>
          
          <!-- 投票選項列表 -->
          <div v-else class="voting-list">
            <div
              v-for="submission in submissions"
              :key="submission.id"
              class="voting-option"
              :class="{ 
                'is-voted': votedSubmissionId === submission.id,
                'is-mine': submission.userId === currentUserId,
                'is-disabled': submission.userId === currentUserId
              }"
              @click="handleVote(submission)"
            >
              <div class="option-content">
                <p class="option-text">{{ submission.sentence }}</p>
                <span v-if="submission.userId === currentUserId" class="mine-badge">
                  我的
                </span>
              </div>
              <div class="option-indicator">
                <PhCheckCircle 
                  v-if="votedSubmissionId === submission.id" 
                  :size="24" 
                  weight="fill" 
                  class="voted-icon"
                />
                <PhCircle 
                  v-else 
                  :size="24" 
                  weight="regular" 
                  class="unvoted-icon"
                />
              </div>
            </div>
          </div>
          
          <!-- 投票狀態提示 -->
          <div v-if="votedSubmissionId" class="vote-status">
            <PhCheckCircle :size="16" weight="fill" class="status-icon" />
            已投票，可在倒計時結束前更改
          </div>
          <div v-else class="vote-hint">
            點擊選擇你認為最好的句子
          </div>
        </div>

        <!-- 結算階段：顯示投票結果 -->
        <div v-if="phase === 'summary'" class="summary-section">
          <div class="section-divider"></div>
          <h4 class="section-title">
            <PhTrophy :size="18" weight="fill" class="title-icon" />
            投票結果
          </h4>
          <div class="summary-hint">
            等待結算中...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
/**
 * StoryPanel 組件 - 分鏡接龍模式的故事面板
 * 
 * 根據不同階段顯示不同內容：
 * - 繪畫階段：顯示故事歷史（只讀）
 * - 編劇階段：故事歷史 + 句子輸入框
 * - 投票階段：投票選項列表
 * 
 * Requirements: 3.4, 4.2, 4.3, 4.5, 5.1
 */

import { ref, computed, watch, nextTick } from 'vue'
import { 
  PhBookOpen, 
  PhNotePencil, 
  PhUser, 
  PhPaintBrush,
  PhPencilLine,
  PhCheckCircle,
  PhPencil,
  PhHandPointing,
  PhWarningCircle,
  PhCircle,
  PhTrophy
} from '@phosphor-icons/vue'
import { useStoryboard } from '../composables/useStoryboard'
import { useVoting } from '../composables/useVoting'
import { useAuthStore } from '../stores/auth'
import type { StoryChainItem, Submission, StoryboardPhase } from '../types/storyboard'

// ============================================
// Props 定義
// ============================================

interface Props {
  /** 當前階段 */
  phase: StoryboardPhase
  /** 故事歷史 */
  storyHistory: StoryChainItem[]
  /** 當前輪次的句子提交列表（投票階段使用） */
  submissions?: Submission[]
  /** 當前用戶已提交的句子 */
  mySubmission?: string
  /** 當前用戶已投票的句子 ID */
  votedSubmissionId?: string
}

const props = withDefaults(defineProps<Props>(), {
  submissions: () => [],
  mySubmission: '',
  votedSubmissionId: ''
})

// ============================================
// Emits 定義
// ============================================

const emit = defineEmits<{
  /** 提交句子 */
  (e: 'submit', sentence: string): void
  /** 投票 */
  (e: 'vote', submissionId: string): void
}>()

// ============================================
// Composables 和 Stores
// ============================================

const authStore = useAuthStore()
const { 
  sentenceInput, 
  isSubmitting, 
  error,
  inputLength,
  isInputOverLimit: isOverLimit,
  canSubmit,
  SENTENCE_MAX_LENGTH: maxLength,
  submitSentence,
  clearError
} = useStoryboard()

const {
  castVote,
  canVoteFor
} = useVoting()

// ============================================
// 本地狀態
// ============================================

const sentenceInputRef = ref<HTMLTextAreaElement | null>(null)
const historyListRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)

// ============================================
// 計算屬性
// ============================================

/** 當前用戶 ID */
const currentUserId = computed(() => authStore.user?.id || '')

/** 是否已提交句子 */
const hasSubmitted = computed(() => {
  return !!props.mySubmission && !isEditing.value
})

// ============================================
// 方法
// ============================================

/**
 * 處理提交句子
 * Requirements: 4.4, 4.5
 */
async function handleSubmit() {
  if (!canSubmit.value) return
  
  const result = await submitSentence()
  if (result.success) {
    isEditing.value = false
    emit('submit', sentenceInput.value)
  }
}

/**
 * 處理編輯已提交的句子
 * Requirements: 4.9
 */
function handleEditSubmission() {
  isEditing.value = true
  sentenceInput.value = props.mySubmission || ''
  nextTick(() => {
    sentenceInputRef.value?.focus()
  })
}

/**
 * 處理投票
 * Requirements: 5.3, 5.4, 5.5
 */
async function handleVote(submission: Submission) {
  // 檢查是否可以投票
  const { canVote, reason } = canVoteFor(submission.id)
  if (!canVote) {
    console.log('[StoryPanel] 無法投票:', reason)
    return
  }
  
  const result = await castVote(submission.id)
  if (result.success) {
    emit('vote', submission.id)
  }
}

/**
 * 滾動故事歷史到底部
 */
function scrollHistoryToBottom() {
  if (historyListRef.value) {
    historyListRef.value.scrollTop = historyListRef.value.scrollHeight
  }
}

// ============================================
// 監聽器
// ============================================

// 當故事歷史更新時，滾動到底部
watch(() => props.storyHistory.length, () => {
  nextTick(scrollHistoryToBottom)
})

// 當階段變化時，重置編輯狀態
watch(() => props.phase, (newPhase) => {
  if (newPhase !== 'writing') {
    isEditing.value = false
  }
})

// 當 mySubmission 更新時，同步到編輯狀態
watch(() => props.mySubmission, (newVal) => {
  if (newVal && !isEditing.value) {
    // 如果有新的提交且不在編輯狀態，保持顯示已提交狀態
  }
})
</script>


<style scoped>
/* ============================================
   基礎佈局
   ============================================ */

.story-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.wired-card {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 4px 4px 0 var(--shadow-color);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.story-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ============================================
   區塊標題
   ============================================ */

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 2px dashed var(--border-light);
  flex-shrink: 0;
}

.title-icon {
  color: var(--color-secondary);
}

.section-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--border-light), transparent);
  margin: 0;
}

/* ============================================
   故事歷史區域
   Requirements: 3.4, 4.3
   ============================================ */

.story-history-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.story-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-tertiary);
  font-family: var(--font-body);
}

.empty-icon {
  opacity: 0.5;
}

/* 故事項目 */
.story-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 文字項目 */
.story-text-item {
  background: linear-gradient(135deg, var(--bg-highlight), var(--bg-secondary));
  border: 2px solid var(--border-light);
  border-radius: 8px;
  padding: 0.75rem;
  position: relative;
}

.story-item.is-opening .story-text-item {
  background: linear-gradient(135deg, var(--color-warning-light), var(--bg-highlight));
  border-color: var(--color-warning);
}

.story-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--color-secondary);
  background: var(--bg-card);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-light);
  margin-bottom: 0.5rem;
}

.story-item.is-opening .story-badge {
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.story-text {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.story-author {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

/* 圖片項目 */
.story-image-item {
  border: 2px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-card);
}

.story-image {
  width: 100%;
  height: auto;
  max-height: 150px;
  object-fit: contain;
  display: block;
  background: white;
}

.story-image-item .story-author {
  padding: 0.5rem;
  background: var(--bg-secondary);
  margin-top: 0;
}

/* ============================================
   編劇階段：句子輸入區域
   Requirements: 4.2, 4.5
   ============================================ */

.writing-section {
  flex-shrink: 0;
  border-top: 2px solid var(--border-light);
}

.writing-form {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 已提交狀態 */
.submitted-state {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.submitted-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  border: 2px solid var(--color-success);
  border-radius: 8px;
  padding: 0.75rem;
}

.submitted-icon {
  color: var(--color-success);
  flex-shrink: 0;
}

.submitted-content {
  flex: 1;
}

.submitted-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-success);
  font-family: var(--font-head);
}

.submitted-text {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--text-primary);
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}

.edit-btn {
  align-self: flex-start;
}

/* 輸入框 */
.wired-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.wired-textarea {
  width: 100%;
  padding: 0.75rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  border: 3px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  resize: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.wired-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.wired-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wired-textarea::placeholder {
  color: var(--text-tertiary);
}

.input-footer {
  display: flex;
  justify-content: flex-end;
}

.char-count {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: var(--font-body);
}

.char-count.over-limit {
  color: var(--color-danger);
  font-weight: 600;
}

/* 按鈕 */
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

.wired-button-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: auto;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

/* 錯誤提示 */
.error-message {
  margin: 0 0.75rem 0.75rem;
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

/* ============================================
   投票階段：投票選項列表
   Requirements: 5.1
   ============================================ */

.voting-section {
  flex-shrink: 0;
  border-top: 2px solid var(--border-light);
  max-height: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.voting-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.voting-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.voting-option:hover:not(.is-disabled) {
  border-color: var(--color-primary);
  background: var(--bg-hover);
  transform: translateX(3px);
}

.voting-option.is-voted {
  border-color: var(--color-success);
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
}

.voting-option.is-mine {
  opacity: 0.6;
  cursor: not-allowed;
}

.voting-option.is-disabled {
  cursor: not-allowed;
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-text {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
}

.mine-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  align-self: flex-start;
}

.option-indicator {
  flex-shrink: 0;
}

.voted-icon {
  color: var(--color-success);
}

.unvoted-icon {
  color: var(--border-light);
}

/* 投票狀態提示 */
.vote-status,
.vote-hint {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-family: var(--font-body);
  text-align: center;
  background: var(--bg-secondary);
}

.vote-status {
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.status-icon {
  flex-shrink: 0;
}

.vote-hint {
  color: var(--text-tertiary);
}

/* ============================================
   結算階段
   ============================================ */

.summary-section {
  flex-shrink: 0;
  border-top: 2px solid var(--border-light);
}

.summary-hint {
  padding: 1rem;
  text-align: center;
  color: var(--text-tertiary);
  font-family: var(--font-body);
}

/* ============================================
   滾動條樣式
   ============================================ */

.story-history-list::-webkit-scrollbar,
.voting-list::-webkit-scrollbar {
  width: 6px;
}

.story-history-list::-webkit-scrollbar-track,
.voting-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.story-history-list::-webkit-scrollbar-thumb,
.voting-list::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.story-history-list::-webkit-scrollbar-thumb:hover,
.voting-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}
</style>
