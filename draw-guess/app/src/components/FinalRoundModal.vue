<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-card">
      <!-- 標題 -->
      <div class="modal-header">
        <h2 class="modal-title">
          <PhFilmStrip :size="24" weight="duotone" class="title-icon" />
          一場完成！
        </h2>
      </div>

      <!-- 內容 -->
      <div class="modal-body">
        <p class="modal-description">
          所有玩家都已輪流擔任分鏡師一次。<br />
          請選擇接下來的遊戲方式：
        </p>

        <div class="options-container">
          <!-- 繼續下一場 -->
          <button 
            class="option-btn continue-btn"
            @click="handleContinue"
          >
            <PhArrowRight :size="24" weight="bold" class="option-icon" />
            <div class="option-content">
              <span class="option-title">繼續下一場</span>
              <span class="option-desc">故事繼續發展</span>
            </div>
          </button>

          <!-- 設為最後一場 -->
          <button 
            class="option-btn final-btn"
            @click="handleSetFinalRound"
          >
            <PhFlag :size="24" weight="bold" class="option-icon" />
            <div class="option-content">
              <span class="option-title">設為最後一場</span>
              <span class="option-desc">下一場結束後進入故事結局</span>
            </div>
          </button>

          <!-- 結束遊戲 -->
          <button 
            class="option-btn end-btn"
            @click="handleEndGame"
          >
            <PhStop :size="24" weight="bold" class="option-icon" />
            <div class="option-content">
              <span class="option-title">結束遊戲</span>
              <span class="option-desc">直接進入故事回顧</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * FinalRoundModal 組件 - 一局結束時詢問房主是否設為最後一局
 * 
 * Requirements: 7.3 - 一局結束且非單局模式時詢問房主是否將下一局設為最後一局或繼續
 */

import { PhFilmStrip, PhArrowRight, PhFlag, PhStop } from '@phosphor-icons/vue'

// ============================================
// Emits 定義
// ============================================

const emit = defineEmits<{
  /** 繼續下一局 */
  (e: 'continue'): void
  /** 設為最後一局 */
  (e: 'set-final-round'): void
  /** 結束遊戲 */
  (e: 'end-game'): void
  /** 關閉彈窗 */
  (e: 'close'): void
}>()

// ============================================
// 方法
// ============================================

function handleContinue() {
  emit('continue')
}

function handleSetFinalRound() {
  emit('set-final-round')
}

function handleEndGame() {
  emit('end-game')
}

function handleClose() {
  // 點擊背景不關閉，必須選擇一個選項
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
  max-width: 420px;
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
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
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
  color: var(--color-success);
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

.options-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.25rem;
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--shadow-color);
  text-align: left;
}

.option-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--shadow-color);
}

.option-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--shadow-color);
}

.option-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
}

.continue-btn .option-icon {
  background: var(--color-success);
}

.final-btn .option-icon {
  background: var(--color-warning);
  color: #333;
}

.end-btn .option-icon {
  background: var(--color-secondary);
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-title {
  font-size: 1.05rem;
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--text-primary);
}

.option-desc {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.continue-btn:hover {
  border-color: var(--color-success);
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
}

.final-btn:hover {
  border-color: var(--color-warning);
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
}

.end-btn:hover {
  border-color: var(--color-secondary);
  background: linear-gradient(135deg, #fce4ec, #f8bbd9);
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

  .option-btn {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .option-icon {
    width: 36px;
    height: 36px;
  }

  .option-title {
    font-size: 1rem;
  }

  .option-desc {
    font-size: 0.8rem;
  }
}
</style>
