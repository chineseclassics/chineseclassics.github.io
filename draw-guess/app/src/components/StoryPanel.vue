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
            
            <!-- 故事開頭（獨立顯示） -->
            <div v-if="storyOpening" class="story-item is-opening">
              <div class="story-opening-item">
                <span class="story-badge opening-badge">故事開頭</span>
                <p class="story-text opening-text">{{ storyOpening.content }}</p>
                <span class="story-author" v-if="storyOpening.authorName">
                  <PhUser :size="12" weight="fill" /> {{ storyOpening.authorName }}
                </span>
              </div>
            </div>
            
            <!-- 漫畫分鏡：圖像+文字合併顯示 -->
            <div 
              v-for="panel in comicPanels" 
              :key="panel.roundNumber"
              class="story-item comic-panel"
              :class="{ 'is-latest': panel.roundNumber === latestRoundNumber }"
            >
              <div class="comic-panel-content">
                <!-- 分鏡標籤 -->
                <span class="story-badge panel-badge">第 {{ panel.roundNumber }} 鏡</span>
                
                <!-- 圖像區域 -->
                <div class="comic-image-area" v-if="panel.image">
                  <img 
                    :src="panel.image.content" 
                    :alt="`第 ${panel.roundNumber} 鏡畫作`"
                    class="comic-image"
                    loading="lazy"
                  />
                  <span class="comic-author drawer-author" v-if="panel.image.authorName">
                    <PhPaintBrush :size="11" weight="fill" /> {{ panel.image.authorName }}
                  </span>
                </div>
                
                <!-- 文字區域（對話氣泡風格） -->
                <div class="comic-text-area" v-if="panel.text">
                  <div class="speech-bubble">
                    <p class="comic-text">{{ panel.text.content }}</p>
                  </div>
                  <span class="comic-author writer-author" v-if="panel.text.authorName">
                    <PhUser :size="11" weight="fill" /> {{ panel.text.authorName }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 編劇階段：提示信息（輸入區已移至畫布下方） -->
        <div v-if="phase === 'writing'" class="writing-hint-section">
          <div class="section-divider"></div>
          <div class="writing-hint">
            <PhPencilLine :size="18" weight="fill" class="hint-icon" />
            <span>請在畫布下方輸入框描述這一鏡的故事</span>
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

import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { 
  PhBookOpen, 
  PhNotePencil, 
  PhUser, 
  PhPaintBrush,
  PhPencilLine,
  PhHandPointing,
  PhWarningCircle,
  PhCircle,
  PhTrophy
} from '@phosphor-icons/vue'
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
  castVote,
  canVoteFor
} = useVoting()

// ============================================
// 本地狀態
// ============================================

const historyListRef = ref<HTMLElement | null>(null)

// ============================================
// 計算屬性
// ============================================

/** 當前用戶 ID */
const currentUserId = computed(() => authStore.user?.id || '')

/** 故事開頭（第一個 roundNumber = 0 的文字項目） */
const storyOpening = computed(() => {
  return props.storyHistory.find(
    item => item.itemType === 'text' && item.roundNumber === 0
  ) || null
})

/** 漫畫分鏡數據（將圖像和對應文字配對） */
interface ComicPanel {
  roundNumber: number
  image: typeof props.storyHistory[0] | null
  text: typeof props.storyHistory[0] | null
}

const comicPanels = computed<ComicPanel[]>(() => {
  // 過濾掉故事開頭（roundNumber = 0）和結尾（roundNumber = -1）
  const panels = props.storyHistory.filter(
    item => item.roundNumber > 0 && item.roundNumber !== -1
  )
  
  // 按輪次分組
  const panelMap = new Map<number, ComicPanel>()
  
  for (const item of panels) {
    if (!panelMap.has(item.roundNumber)) {
      panelMap.set(item.roundNumber, {
        roundNumber: item.roundNumber,
        image: null,
        text: null
      })
    }
    
    const panel = panelMap.get(item.roundNumber)!
    if (item.itemType === 'image') {
      panel.image = item
    } else if (item.itemType === 'text') {
      panel.text = item
    }
  }
  
  // 按輪次排序返回
  return Array.from(panelMap.values()).sort((a, b) => a.roundNumber - b.roundNumber)
})

/** 最新輪次號（用於高亮顯示） */
const latestRoundNumber = computed(() => {
  if (comicPanels.value.length === 0) return 0
  const lastPanel = comicPanels.value[comicPanels.value.length - 1]
  return lastPanel?.roundNumber ?? 0
})

// ============================================
// 方法
// ============================================

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

// 組件掛載時，滾動到最新內容
onMounted(() => {
  nextTick(scrollHistoryToBottom)
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

/* 故事開頭項目 */
.story-opening-item {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border: 2px solid var(--color-warning);
  border-radius: 8px;
  padding: 0.75rem;
  position: relative;
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

.story-badge.opening-badge {
  color: #e65100;
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-color: var(--color-warning);
}

.story-badge.panel-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1;
  margin-bottom: 0;
}

.story-text {
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 0;
}

.opening-text {
  text-align: center;
  font-size: 0.9rem;
}

.story-author {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

/* ============================================
   漫畫分鏡樣式 - 圖文合併
   ============================================ */

.comic-panel {
  margin-bottom: 0.5rem;
}

/* 最新分鏡高亮效果 */
.comic-panel.is-latest {
  animation: latestPanelHighlight 2s ease-in-out infinite;
}

.comic-panel.is-latest .comic-panel-content {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px rgba(107, 175, 178, 0.3);
}

.comic-panel.is-latest .panel-badge {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-color: var(--color-primary);
  animation: badgePulse 2s ease-in-out infinite;
}

.comic-panel.is-latest .panel-badge::after {
  content: ' · 最新';
  font-size: 0.65rem;
}

@keyframes latestPanelHighlight {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.01);
  }
}

@keyframes badgePulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.comic-panel-content {
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: border-color 0.3s, box-shadow 0.3s;
}

/* 圖像區域 */
.comic-image-area {
  position: relative;
  background: white;
}

.comic-image {
  width: 100%;
  height: auto;
  max-height: 120px;
  object-fit: contain;
  display: block;
  /* 覆蓋 PaperCSS 的手繪風格圖片邊框 */
  border: none;
  border-radius: 0;
}

.comic-author {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  color: var(--text-tertiary);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.drawer-author {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  background: rgba(255, 255, 255, 0.85);
}

/* 文字區域 - 對話氣泡風格 */
.comic-text-area {
  padding: 0.6rem 0.75rem;
  background: linear-gradient(135deg, var(--bg-highlight), var(--bg-secondary));
  border-top: 1px dashed var(--border-light);
}

.speech-bubble {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  box-shadow: 1px 1px 0 var(--shadow-color);
}

/* 對話氣泡尖角 */
.speech-bubble::before {
  content: '';
  position: absolute;
  left: 15px;
  top: -6px;
  border-width: 0 6px 6px 6px;
  border-style: solid;
  border-color: transparent transparent var(--border-light) transparent;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  left: 16px;
  top: -4px;
  border-width: 0 5px 5px 5px;
  border-style: solid;
  border-color: transparent transparent var(--bg-card) transparent;
}

.comic-text {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--text-primary);
  line-height: 1.35;
  margin: 0;
}

.writer-author {
  margin-top: 0.35rem;
  display: flex;
}

/* ============================================
   編劇階段：句子輸入區域
   Requirements: 4.2, 4.5
   ============================================ */

/* 編劇階段提示（輸入區已移至畫布下方） */
.writing-hint-section {
  flex-shrink: 0;
  border-top: 2px solid var(--border-light);
  padding: 0.75rem;
}

.writing-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  justify-content: center;
}

.writing-hint .hint-icon {
  color: var(--color-primary);
}

/* 保留舊樣式供兼容 */
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
