<script setup lang="ts">
/**
 * 學生模式 - 創建鬥豆場
 * 
 * 學生選擇文本、設置入場費和人數，創建 PvP 房間
 * 支持多篇文本選擇和年級分類篩選
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { useUserStatsStore } from '../../../stores/userStatsStore'
import TextSelector from '../../../components/arena/TextSelector.vue'
import { 
  TIME_MODE_OPTIONS, 
  ENTRY_FEE_OPTIONS, 
  SAFETY_LIMITS 
} from '../../../types/game'

const router = useRouter()
const gameStore = useGameStore()
const userStatsStore = useUserStatsStore()

// 步驟控制
const currentStep = ref(1)
const totalSteps = 2

// 表單數據
const selectedTextIds = ref<string[]>([])
const maxPlayers = ref(2)
const timeLimit = ref(180)
const entryFee = ref(0)

// 狀態
const loading = ref(false)
const error = ref('')

// 文本選擇器引用
const textSelector = ref<InstanceType<typeof TextSelector> | null>(null)

// 用戶豆子
const beans = computed(() => userStatsStore.profile?.total_beans ?? 0)

// 是否可以支付入場費
const canAffordFee = computed(() => {
  if (entryFee.value === 0) return true
  return beans.value - entryFee.value >= SAFETY_LIMITS.MIN_BALANCE
})

// 已選文本詳情
const selectedTexts = computed(() => {
  return textSelector.value?.selectedTexts || []
})

// 更新選中的文本 ID
function updateSelectedIds(ids: string[]) {
  selectedTextIds.value = ids
}

// 下一步
function nextStep() {
  if (currentStep.value === 1 && selectedTextIds.value.length === 0) {
    error.value = '請至少選擇一篇文本'
    return
  }
  error.value = ''
  currentStep.value++
}

// 上一步
function prevStep() {
  error.value = ''
  currentStep.value--
}

// 創建房間
async function createRoom() {
  if (selectedTextIds.value.length === 0) {
    error.value = '請選擇文本'
    return
  }

  if (!canAffordFee.value) {
    error.value = `豆子不足，賬戶需保留至少 ${SAFETY_LIMITS.MIN_BALANCE} 豆`
    return
  }

  loading.value = true
  error.value = ''

  const room = await gameStore.createRoom({
    hostType: 'student',
    gameMode: 'pvp',
    textIds: selectedTextIds.value,
    timeLimit: timeLimit.value,
    maxPlayers: maxPlayers.value,
    entryFee: entryFee.value,
  })

  if (room) {
    router.push({ name: 'arena-lobby', params: { roomId: room.id } })
  } else {
    error.value = gameStore.error || '創建失敗'
  }

  loading.value = false
}
</script>

<template>
  <div class="create-room-page">
    <!-- 返回按鈕 -->
    <button class="back-btn" @click="router.push({ name: 'arena' })">
      ← 返回鬥豆
    </button>

    <!-- 頁面標題 -->
    <header class="page-header">
      <h1>
        <span class="title-icon">➕</span>
        創建鬥豆場
      </h1>
      <p class="subtitle">邀請同學加入，贏取豆子！</p>
    </header>

    <!-- 豆子餘額 -->
    <div class="balance-card">
      <span class="balance-icon">🫘</span>
      <span class="balance-value">{{ beans }}</span>
      <span class="balance-label">我的豆子</span>
    </div>

    <!-- 步驟指示器 -->
    <div class="steps-indicator">
      <div 
        v-for="step in totalSteps" 
        :key="step"
        class="step-dot"
        :class="{ 
          active: currentStep === step,
          completed: currentStep > step 
        }"
      >
        <span v-if="currentStep > step">✓</span>
        <span v-else>{{ step }}</span>
      </div>
    </div>

    <!-- 步驟內容 -->
    <div class="step-content">
      <!-- 步驟 1：選擇文本 -->
      <div v-if="currentStep === 1" class="step-panel">
        <h2>選擇比賽文本</h2>
        <p class="step-hint">可選擇多篇文章，對戰時按順序完成</p>
        
        <TextSelector
          ref="textSelector"
          :show-custom-texts="false"
          @update:selected-ids="updateSelectedIds"
        />
      </div>

      <!-- 步驟 2：比賽設置 -->
      <div v-if="currentStep === 2" class="step-panel">
        <h2>比賽設置</h2>
        <p class="step-hint">設置對戰人數、時間和入場費</p>

        <!-- 人數設置 -->
        <div class="form-section">
          <label class="section-label">對戰人數</label>
          <div class="player-options">
            <button
              v-for="count in [2, 3, 4]"
              :key="count"
              class="option-btn"
              :class="{ selected: maxPlayers === count }"
              @click="maxPlayers = count"
            >
              {{ count }} 人
            </button>
          </div>
        </div>

        <!-- 時間設置 -->
        <div class="form-section">
          <label class="section-label">時間限制</label>
          <div class="time-options">
            <button
              v-for="option in TIME_MODE_OPTIONS"
              :key="option.value"
              class="option-btn time-btn"
              :class="{ selected: timeLimit === option.value }"
              @click="timeLimit = option.value"
            >
              <span class="option-label">{{ option.label }}</span>
              <span class="option-desc">{{ option.description }}</span>
            </button>
          </div>
        </div>

        <!-- 入場費設置 -->
        <div class="form-section">
          <label class="section-label">入場費</label>
          <div class="fee-options">
            <button
              v-for="fee in ENTRY_FEE_OPTIONS"
              :key="fee"
              class="fee-btn"
              :class="{ 
                selected: entryFee === fee,
                disabled: fee > 0 && beans - fee < SAFETY_LIMITS.MIN_BALANCE
              }"
              :disabled="fee > 0 && beans - fee < SAFETY_LIMITS.MIN_BALANCE"
              @click="entryFee = fee"
            >
              {{ fee === 0 ? '免費' : `${fee} 豆` }}
            </button>
          </div>
          
          <div v-if="entryFee > 0" class="fee-info">
            <p>
              入場費：<strong>{{ entryFee }} 豆</strong>
              × {{ maxPlayers }} 人
              = 獎池 <strong>{{ entryFee * maxPlayers }} 豆</strong>
            </p>
            <p class="fee-note">獲勝者收豆！</p>
          </div>

          <div class="safety-notice">
            <span class="notice-icon">🛡️</span>
            <span class="notice-text">
              每日入場費上限 {{ SAFETY_LIMITS.DAILY_FEE_LIMIT }} 豆 · 
              賬戶保留 {{ SAFETY_LIMITS.MIN_BALANCE }} 豆
            </span>
          </div>
        </div>

        <!-- 確認信息 -->
        <div class="confirm-card">
          <h3>確認信息</h3>
          <div class="confirm-row texts-row">
            <span class="confirm-label">文本</span>
            <div class="confirm-texts">
              <div 
                v-for="(text, index) in selectedTexts" 
                :key="text.id" 
                class="confirm-text-item"
              >
                <span class="text-order">{{ index + 1 }}.</span>
                <span class="text-name">{{ text.title }}</span>
              </div>
            </div>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">人數</span>
            <span class="confirm-value">{{ maxPlayers }} 人</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">時間</span>
            <span class="confirm-value">
              {{ TIME_MODE_OPTIONS.find(t => t.value === timeLimit)?.description }}
            </span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">入場費</span>
            <span class="confirm-value">{{ entryFee === 0 ? '免費' : `${entryFee} 豆` }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 錯誤提示 -->
    <p v-if="error" class="error-message">{{ error }}</p>

    <!-- 導航按鈕 -->
    <div class="nav-buttons">
      <button 
        v-if="currentStep > 1"
        class="btn-secondary" 
        @click="prevStep"
        :disabled="loading"
      >
        上一步
      </button>
      
      <button 
        v-if="currentStep < totalSteps"
        class="btn-primary" 
        @click="nextStep"
        :disabled="selectedTextIds.length === 0"
      >
        下一步
      </button>
      
      <button 
        v-if="currentStep === totalSteps"
        class="btn-primary" 
        @click="createRoom"
        :disabled="loading || !canAffordFee"
      >
        {{ loading ? '創建中...' : '創建鬥豆場' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.create-room-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-neutral-600);
  cursor: pointer;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  padding: 0;
}

.back-btn:hover {
  color: var(--color-primary-600);
}

.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.75rem;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.subtitle {
  color: var(--color-neutral-500);
  margin: 0;
}

/* 餘額卡片 */
.balance-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100));
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.balance-icon {
  font-size: 1.5rem;
}

.balance-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-600);
}

.balance-label {
  color: var(--color-neutral-600);
}

/* 步驟指示器 */
.steps-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.step-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-neutral-200);
  color: var(--color-neutral-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.step-dot.active {
  background: var(--color-primary-500);
  color: white;
  transform: scale(1.1);
}

.step-dot.completed {
  background: var(--color-success);
  color: white;
}

/* 步驟內容 */
.step-panel {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.step-panel h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.step-hint {
  color: var(--color-neutral-500);
  margin: 0 0 1.25rem 0;
  font-size: 0.875rem;
}

/* 設置表單 */
.form-section {
  margin-bottom: 1.5rem;
}

.section-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

/* 選項按鈕 */
.player-options,
.time-options,
.fee-options {
  display: flex;
  gap: 0.75rem;
}

.option-btn,
.fee-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.option-btn:hover:not(:disabled),
.fee-btn:hover:not(:disabled) {
  background: var(--color-primary-50);
}

.option-btn.selected,
.fee-btn.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
}

.option-btn:disabled,
.fee-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.time-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.option-label {
  font-weight: 600;
}

.option-desc {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* 入場費信息 */
.fee-info {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05));
  border-radius: 10px;
  text-align: center;
}

.fee-info p {
  margin: 0;
}

.fee-note {
  color: var(--color-primary-600);
  font-weight: 600;
  margin-top: 0.5rem !important;
}

.safety-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--color-neutral-50);
  border-radius: 8px;
  font-size: 0.75rem;
  color: var(--color-neutral-600);
}

.notice-icon {
  font-size: 1rem;
}

/* 確認卡片 */
.confirm-card {
  background: var(--color-neutral-50);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1.5rem;
}

.confirm-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-neutral-200);
}

.confirm-row:last-child {
  border-bottom: none;
}

.confirm-label {
  color: var(--color-neutral-500);
}

.confirm-value {
  font-weight: 600;
}

/* 多文本確認 */
.texts-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.confirm-texts {
  width: 100%;
}

.confirm-text-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  border-bottom: 1px dashed var(--color-neutral-200);
}

.confirm-text-item:last-child {
  border-bottom: none;
}

.text-order {
  color: var(--color-primary-500);
  font-weight: 600;
  min-width: 1.5rem;
}

.text-name {
  font-weight: 500;
}

/* 導航按鈕 */
.nav-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary {
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-500-rgb), 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.875rem 2rem;
  background: white;
  color: var(--color-neutral-700);
  border: 2px solid var(--color-neutral-200);
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-neutral-400);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: var(--color-error);
  text-align: center;
  margin-bottom: 1rem;
}
</style>
