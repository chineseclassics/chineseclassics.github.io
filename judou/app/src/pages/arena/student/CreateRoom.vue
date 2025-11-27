<script setup lang="ts">
/**
 * 學生模式 - 創建鬥豆場
 * 
 * 學生選擇文本、設置入場費和人數，創建 PvP 房間
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { useUserStatsStore } from '../../../stores/userStatsStore'
import { supabase } from '../../../lib/supabaseClient'
import { 
  TIME_MODE_OPTIONS, 
  ENTRY_FEE_OPTIONS, 
  SAFETY_LIMITS 
} from '../../../types/game'

const router = useRouter()
const gameStore = useGameStore()
const userStatsStore = useUserStatsStore()

// 表單數據
const selectedTextId = ref<string>('')
const maxPlayers = ref(2)
const timeLimit = ref(180)
const entryFee = ref(0)

// 數據
const texts = ref<any[]>([])
const loading = ref(false)
const error = ref('')

// 用戶豆子
const beans = computed(() => userStatsStore.profile?.total_beans ?? 0)

// 是否可以支付入場費
const canAffordFee = computed(() => {
  if (entryFee.value === 0) return true
  return beans.value - entryFee.value >= SAFETY_LIMITS.MIN_BALANCE
})


// 加載文本列表（系統公開文本）
async function loadTexts() {
  if (!supabase) return
  
  const { data } = await supabase
    .from('practice_texts')
    .select('id, title, author, content')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50)

  texts.value = data || []
}

// 創建房間
async function createRoom() {
  if (!selectedTextId.value) {
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
    textIds: [selectedTextId.value],  // 學生模式目前只支持單篇
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

onMounted(() => {
  loadTexts()
})
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

    <!-- 設置表單 -->
    <div class="settings-form">
      <!-- 選擇文本 -->
      <div class="form-section">
        <label class="section-label">選擇比賽文本</label>
        <div class="text-grid">
          <button
            v-for="text in texts.slice(0, 12)"
            :key="text.id"
            class="text-card"
            :class="{ selected: selectedTextId === text.id }"
            @click="selectedTextId = text.id"
          >
            <h4>{{ text.title }}</h4>
            <p v-if="text.author">{{ text.author }}</p>
          </button>
        </div>
        <button v-if="texts.length > 12" class="btn-text">
          查看更多 →
        </button>
      </div>

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
            class="option-btn"
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

      <!-- 錯誤提示 -->
      <p v-if="error" class="error-message">{{ error }}</p>

      <!-- 創建按鈕 -->
      <button 
        class="btn-primary btn-large"
        :disabled="loading || !selectedTextId || !canAffordFee"
        @click="createRoom"
      >
        {{ loading ? '創建中...' : '創建鬥豆場' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.create-room-page {
  max-width: 600px;
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
  margin-bottom: 2rem;
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

/* 設置表單 */
.settings-form {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.form-section {
  margin-bottom: 1.5rem;
}

.section-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

/* 文本選擇 */
.text-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.text-card {
  padding: 0.75rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.text-card:hover {
  background: var(--color-primary-50);
}

.text-card.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
}

.text-card h4 {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.3;
}

.text-card p {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
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

.option-btn {
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

/* 按鈕 */
.btn-primary {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
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

.btn-text {
  background: none;
  border: none;
  color: var(--color-primary-600);
  cursor: pointer;
  font-size: 0.875rem;
}

.error-message {
  color: var(--color-error);
  text-align: center;
  margin-bottom: 1rem;
}
</style>

