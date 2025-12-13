<template>
  <div class="tutorial-overlay" @click.self="handleClose">
    <div class="tutorial-modal">
      <!-- 標題區域 -->
      <div class="modal-header">
        <div class="header-icon-wrapper">
          <PhPaintBrush :size="36" weight="duotone" class="header-icon" />
        </div>
        <h2 class="modal-title">你是這一輪的畫手！</h2>
      </div>

      <!-- 教學內容 -->
      <div class="tutorial-content">
        <!-- 流程說明 -->
        <div class="flow-diagram">
          <div class="flow-step">
            <div class="step-icon">📖</div>
            <div class="step-text">你看到上一句故事</div>
          </div>
          <div class="flow-arrow">
            <PhArrowRight :size="24" weight="bold" />
          </div>
          <div class="flow-step highlight">
            <div class="step-icon">🎨</div>
            <div class="step-text">畫出<strong>接下來</strong>發生了什麼</div>
          </div>
          <div class="flow-arrow">
            <PhArrowRight :size="24" weight="bold" />
          </div>
          <div class="flow-step">
            <div class="step-icon">✍️</div>
            <div class="step-text">編劇根據你的畫續寫故事</div>
          </div>
        </div>

        <!-- 重點提示 -->
        <div class="key-point">
          <div class="point-header">
            <PhWarning :size="20" weight="fill" class="warning-icon" />
            <span>重點：不是「圖解」，而是「續創」！</span>
          </div>
          <div class="example-box">
            <div class="example-item wrong">
              <span class="example-label">❌ 錯誤</span>
              <span class="example-text">上一句說「他推開了門」→ 畫一個人推門</span>
              <span class="example-note">（這只是重複上一句）</span>
            </div>
            <div class="example-item correct">
              <span class="example-label">✅ 正確</span>
              <span class="example-text">上一句說「他推開了門」→ 畫門裡面的場景</span>
              <span class="example-note">（這是創作新情節）</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按鈕 -->
      <div class="modal-footer">
        <label class="dont-show-again">
          <input type="checkbox" v-model="dontShowAgain" />
          <span>不再顯示此提示</span>
        </label>
        <button class="confirm-btn" @click="handleClose">
          <PhCheck :size="20" weight="bold" />
          我明白了！
        </button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
/**
 * DrawerTutorialModal 組件 - 畫手首輪教學彈窗
 * 
 * 在分鏡接龍模式中，當玩家第一次成為畫手時顯示，
 * 說明畫手的任務是「續創」而不是「圖解」上一句故事。
 */

import { ref } from 'vue'
import { 
  PhPaintBrush, 
  PhArrowRight, 
  PhWarning, 
  PhCheck 
} from '@phosphor-icons/vue'

// ============================================
// Emits 定義
// ============================================

const emit = defineEmits<{
  (e: 'close', dontShowAgain: boolean): void
}>()

// ============================================
// 本地狀態
// ============================================

const dontShowAgain = ref(false)

// ============================================
// 方法
// ============================================

function handleClose() {
  emit('close', dontShowAgain.value)
}
</script>


<style scoped>
/* ============================================
   覆蓋層
   ============================================ */

.tutorial-overlay {
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
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ============================================
   彈窗主體
   ============================================ */

.tutorial-modal {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 6px 6px 0 var(--shadow-color);
  max-width: 520px;
  width: 100%;
  animation: slideUp 0.3s ease-out;
  overflow: hidden;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================
   標題區域
   ============================================ */

.modal-header {
  text-align: center;
  padding: 1.5rem 1.5rem 1rem;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-bottom: 2px dashed var(--border-light);
}

.header-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: var(--bg-card);
  border: 3px solid var(--color-primary);
  border-radius: 50%;
  margin-bottom: 0.75rem;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.header-icon {
  color: var(--color-primary);
}

.modal-title {
  font-family: var(--font-head);
  font-size: 1.4rem;
  color: var(--text-primary);
  margin: 0;
}

/* ============================================
   教學內容
   ============================================ */

.tutorial-content {
  padding: 1.25rem 1.5rem;
}

/* 流程圖 */
.flow-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  min-width: 100px;
}

.flow-step.highlight {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-color: var(--color-success);
  transform: scale(1.05);
}

.step-icon {
  font-size: 1.5rem;
}

.step-text {
  font-size: 0.8rem;
  font-family: var(--font-body);
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.3;
}

.flow-step.highlight .step-text {
  color: #2e7d32;
  font-weight: 600;
}

.flow-arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* 重點提示 */
.key-point {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border: 2px solid var(--color-warning);
  border-radius: 10px;
  padding: 1rem;
}

.point-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-head);
  font-size: 0.95rem;
  font-weight: 600;
  color: #e65100;
  margin-bottom: 0.75rem;
}

.warning-icon {
  color: var(--color-warning);
}

/* 範例框 */
.example-box {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  font-family: var(--font-body);
}

.example-item.wrong {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.example-item.correct {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.example-label {
  font-size: 0.75rem;
  font-weight: 600;
}

.example-item.wrong .example-label {
  color: #c62828;
}

.example-item.correct .example-label {
  color: #2e7d32;
}

.example-text {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.example-note {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

/* ============================================
   底部按鈕
   ============================================ */

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-top: 2px solid var(--border-light);
  gap: 1rem;
}

.dont-show-again {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-family: var(--font-body);
  color: var(--text-secondary);
  cursor: pointer;
}

.dont-show-again input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: 3px solid var(--color-primary);
  border-radius: 8px;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.confirm-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--shadow-color);
}

.confirm-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

/* ============================================
   響應式調整
   ============================================ */

@media (max-width: 520px) {
  .tutorial-modal {
    margin: 0.5rem;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-title {
    font-size: 1.2rem;
  }
  
  .tutorial-content {
    padding: 1rem;
  }
  
  .flow-diagram {
    flex-direction: column;
  }
  
  .flow-arrow {
    transform: rotate(90deg);
  }
  
  .flow-step {
    width: 100%;
    flex-direction: row;
    min-width: auto;
    gap: 0.75rem;
  }
  
  .flow-step.highlight {
    transform: none;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .confirm-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>

