<template>
  <div class="voting-modal-overlay" @click.self="$emit('close')">
    <div class="voting-modal">
      <!-- 標題區域 -->
      <div class="modal-header">
        <h2 class="modal-title">
          <PhHandPointing :size="24" weight="duotone" class="title-icon" />
          投票選擇最佳句子
        </h2>
        <div class="round-info" v-if="roundInfo">
          第 {{ roundInfo.gameNumber || 1 }} 局 · 第 {{ roundInfo.roundNumber }} 輪
        </div>
      </div>

      <!-- 倒計時區域 -->
      <div class="countdown-section">
        <div class="countdown-ring" :class="{ 'warning': timeRemaining <= 10 }">
          <span class="countdown-number">{{ timeRemaining }}</span>
        </div>
        <div class="countdown-text">
          {{ timeRemaining <= 10 ? '即將結束投票！' : '請選擇你認為最好的句子' }}
        </div>
      </div>

      <!-- 投票選項列表 -->
      <div class="voting-options">
        <!-- 無提交狀態 -->
        <div v-if="submissions.length === 0" class="empty-state">
          <PhWarningCircle :size="48" weight="light" class="empty-icon" />
          <span class="empty-text">沒有人提交句子</span>
          <span class="empty-hint">將使用「故事繼續發展中...」作為本輪句子</span>
        </div>

        <!-- 投票選項 -->
        <div
          v-else
          v-for="(submission, index) in submissions"
          :key="submission.id"
          class="voting-option"
          :class="{
            'is-voted': votedId === submission.id,
            'is-mine': submission.userId === myUserId,
            'is-disabled': submission.userId === myUserId
          }"
          @click="handleVote(submission)"
        >
          <!-- 序號 -->
          <div class="option-number">{{ index + 1 }}</div>
          
          <!-- 內容區域 -->
          <div class="option-content">
            <p class="option-text">{{ submission.sentence }}</p>
            <span v-if="submission.userId === myUserId" class="mine-badge">
              <PhUser :size="12" weight="fill" /> 我的句子
            </span>
          </div>

          <!-- 投票指示器 -->
          <div class="option-indicator">
            <PhCheckCircle
              v-if="votedId === submission.id"
              :size="28"
              weight="fill"
              class="voted-icon"
            />
            <PhCircle
              v-else-if="submission.userId !== myUserId"
              :size="28"
              weight="regular"
              class="unvoted-icon"
            />
            <PhProhibit
              v-else
              :size="28"
              weight="regular"
              class="disabled-icon"
            />
          </div>
        </div>
      </div>

      <!-- 投票狀態提示 -->
      <div class="voting-status">
        <div v-if="votedId" class="status-voted">
          <PhCheckCircle :size="18" weight="fill" class="status-icon" />
          <span>已投票，可在倒計時結束前更改</span>
        </div>
        <div v-else-if="submissions.length > 0" class="status-hint">
          <PhInfo :size="18" weight="fill" class="status-icon" />
          <span>點擊選擇你認為最好的句子（不能投給自己）</span>
        </div>
      </div>

      <!-- 投票人數統計 -->
      <div class="vote-stats" v-if="totalVoters > 0">
        <PhUsers :size="16" weight="fill" class="stats-icon" />
        <span>{{ totalVoters }} 人已投票</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * VotingModal 組件 - 分鏡接龍模式的投票彈窗
 * 
 * 顯示所有提交的句子，讓玩家投票選擇最佳句子
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */

import {
  PhHandPointing,
  PhWarningCircle,
  PhCheckCircle,
  PhCircle,
  PhProhibit,
  PhUser,
  PhInfo,
  PhUsers
} from '@phosphor-icons/vue'
import type { Submission } from '../types/storyboard'

// ============================================
// Props 定義
// Requirements: 5.2 - 顯示所有句子、投票倒計時、已投票狀態
// ============================================

interface Props {
  /** 當前輪次的句子提交列表 */
  submissions: Submission[]
  /** 當前用戶 ID */
  myUserId: string
  /** 當前用戶已投票的句子 ID */
  votedId?: string
  /** 投票倒計時剩餘時間（秒） */
  timeRemaining: number
  /** 已投票人數 */
  totalVoters?: number
  /** 輪次信息（可選） */
  roundInfo?: {
    gameNumber?: number
    roundNumber: number
  }
}

const props = withDefaults(defineProps<Props>(), {
  votedId: '',
  totalVoters: 0,
  roundInfo: undefined
})

// ============================================
// Emits 定義
// ============================================

const emit = defineEmits<{
  /** 投票事件 */
  (e: 'vote', submissionId: string): void
  /** 關閉彈窗 */
  (e: 'close'): void
}>()

// ============================================
// 方法
// ============================================

/**
 * 處理投票點擊
 * Requirements: 5.4 - 點擊選擇、更改投票
 * Requirements: 5.5 - 禁止自投
 * 
 * @param submission 被點擊的句子
 */
function handleVote(submission: Submission) {
  // Requirements: 5.5 - 不能投給自己的句子
  if (submission.userId === props.myUserId) {
    console.log('[VotingModal] 不能投給自己的句子')
    return
  }

  // 發送投票事件（支持更改投票）
  // Requirements: 5.4 - 允許在投票時間內更改投票
  emit('vote', submission.id)
}
</script>


<style scoped>
/* ============================================
   遮罩層和基礎佈局
   ============================================ */

.voting-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
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

.voting-modal {
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  padding: 1.5rem;
  max-width: 500px;
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

/* 裝飾性背景紋理 */
.voting-modal::before {
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
  margin-bottom: 1rem;
  position: relative;
}

.modal-title {
  font-size: 1.4rem;
  font-family: var(--font-head);
  margin: 0 0 0.35rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-primary);
}

.title-icon {
  color: var(--color-primary);
  animation: iconBounce 2s ease-in-out infinite;
}

@keyframes iconBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.round-info {
  color: var(--text-secondary);
  font-size: 0.85rem;
  background: var(--bg-secondary);
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 0;
}

/* ============================================
   倒計時區域
   ============================================ */

.countdown-section {
  text-align: center;
  margin-bottom: 1.25rem;
}

.countdown-ring {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border: 4px solid var(--color-secondary);
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
  font-size: 1.8rem;
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

/* ============================================
   投票選項列表
   ============================================ */

.voting-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  position: relative;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-light);
  border-radius: 0;
}

.empty-icon {
  color: var(--text-tertiary);
  opacity: 0.6;
}

.empty-text {
  font-size: 1rem;
  font-family: var(--font-head);
  color: var(--text-secondary);
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

/* 投票選項 */
.voting-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--bg-card);
  border: 3px solid var(--border-light);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: optionSlideIn 0.3s ease-out both;
}

.voting-option:nth-child(1) { animation-delay: 0.05s; }
.voting-option:nth-child(2) { animation-delay: 0.1s; }
.voting-option:nth-child(3) { animation-delay: 0.15s; }
.voting-option:nth-child(4) { animation-delay: 0.2s; }
.voting-option:nth-child(5) { animation-delay: 0.25s; }

@keyframes optionSlideIn {
  from {
    opacity: 0;
    transform: translateX(-15px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.voting-option:hover:not(.is-disabled) {
  border-color: var(--color-secondary);
  background: #e3f2fd;
  transform: translateX(4px);
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.voting-option.is-voted {
  border-color: var(--color-success);
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  box-shadow: 4px 4px 0 rgba(40, 167, 69, 0.3);
}

.voting-option.is-mine {
  opacity: 0.65;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

.voting-option.is-disabled {
  cursor: not-allowed;
}

/* 序號 */
.option-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: bold;
  font-family: var(--font-head);
  flex-shrink: 0;
}

.voting-option.is-voted .option-number {
  background: var(--color-success);
}

.voting-option.is-mine .option-number {
  background: var(--text-tertiary);
}

/* 內容區域 */
.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.option-text {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
}

.mine-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-card);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-light);
  align-self: flex-start;
}

/* 投票指示器 */
.option-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voted-icon {
  color: var(--color-success);
  animation: voteCheck 0.3s ease-out;
}

@keyframes voteCheck {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.unvoted-icon {
  color: var(--border-light);
  transition: color 0.2s;
}

.voting-option:hover:not(.is-disabled) .unvoted-icon {
  color: var(--color-secondary);
}

.disabled-icon {
  color: var(--text-tertiary);
  opacity: 0.5;
}

/* ============================================
   投票狀態提示
   ============================================ */

.voting-status {
  text-align: center;
  margin-bottom: 0.75rem;
}

.status-voted,
.status-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  border-radius: 0;
}

.status-voted {
  color: var(--color-success);
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  border: 2px solid var(--color-success);
}

.status-hint {
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 2px dashed var(--border-light);
}

.status-icon {
  flex-shrink: 0;
}

/* ============================================
   投票人數統計
   ============================================ */

.vote-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 0;
}

.stats-icon {
  color: var(--color-secondary);
}

/* ============================================
   滾動條樣式
   ============================================ */

.voting-modal::-webkit-scrollbar {
  width: 8px;
}

.voting-modal::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.voting-modal::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 4px;
}

.voting-modal::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}

/* ============================================
   移動端優化
   ============================================ */

@media (max-width: 768px) {
  .voting-modal-overlay {
    padding: 0.5rem;
  }

  .voting-modal {
    padding: 1rem;
    max-height: calc(100dvh - 1rem);
    box-shadow: 6px 6px 0 var(--shadow-color);
  }

  .modal-title {
    font-size: 1.2rem;
    gap: 0.35rem;
  }

  .round-info {
    font-size: 0.8rem;
  }

  .countdown-ring {
    width: 60px;
    height: 60px;
  }

  .countdown-number {
    font-size: 1.5rem;
  }

  .countdown-text {
    font-size: 0.85rem;
  }

  .voting-option {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .option-number {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
  }

  .option-text {
    font-size: 0.9rem;
  }

  .status-voted,
  .status-hint {
    font-size: 0.8rem;
    padding: 0.4rem 0.75rem;
  }

  .vote-stats {
    font-size: 0.8rem;
  }
}

/* 小屏幕進一步優化 */
@media (max-width: 480px) {
  .voting-modal {
    padding: 0.75rem;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .countdown-ring {
    width: 55px;
    height: 55px;
  }

  .countdown-number {
    font-size: 1.3rem;
  }

  .voting-option {
    padding: 0.6rem;
  }

  .option-text {
    font-size: 0.85rem;
  }
}
</style>
