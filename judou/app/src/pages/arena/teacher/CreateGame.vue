<script setup lang="ts">
/**
 * 老師模式 - 創建課堂鬥豆
 * 
 * 老師選擇文本、設置隊數和時間，創建班級比賽
 * 支持從系統文庫或自訂練習中選擇文章
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/authStore'
import { useGameStore } from '../../../stores/gameStore'
import { supabase } from '../../../lib/supabaseClient'
import { TIME_MODE_OPTIONS, TEAM_COUNT_OPTIONS } from '../../../types/game'
import TextSelector from '../../../components/arena/TextSelector.vue'

const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

// 步驟
const currentStep = ref(1)
const totalSteps = 3

// 表單數據
const selectedClassId = ref<string>('')
const selectedTextIds = ref<string[]>([])
const teamCount = ref(2)
const timeLimit = ref(180)

// 數據
const classes = ref<any[]>([])
const loading = ref(false)
const error = ref('')

// 文本選擇器引用
const textSelector = ref<InstanceType<typeof TextSelector> | null>(null)

// 已選文本詳情
const selectedTexts = computed(() => {
  return textSelector.value?.selectedTexts || []
})

// 隊伍預覽數量
const teamPreviewNumbers = computed(() => Array.from({ length: teamCount.value }, (_, i) => i + 1))

// 更新選中的文本 ID
function updateSelectedIds(ids: string[]) {
  selectedTextIds.value = ids
}

// 加載班級列表
async function loadClasses() {
  if (!supabase) return
  
  const { data } = await supabase
    .from('classes')
    .select('id, class_name')
    .eq('teacher_id', authStore.user?.id)
    .order('created_at', { ascending: false })

  classes.value = data || []
  
  // 默認選中第一個班級
  if (classes.value.length > 0 && !selectedClassId.value) {
    selectedClassId.value = classes.value[0].id
  }
}

// 下一步
function nextStep() {
  if (currentStep.value === 1 && !selectedClassId.value) {
    error.value = '請選擇班級'
    return
  }
  if (currentStep.value === 2 && selectedTextIds.value.length === 0) {
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

// 創建遊戲
async function createGame() {
  if (!selectedClassId.value || selectedTextIds.value.length === 0) {
    error.value = '請完成所有設置'
    return
  }

  loading.value = true
  error.value = ''

  const room = await gameStore.createRoom({
    hostType: 'teacher',
    gameMode: 'team_battle',
    textIds: selectedTextIds.value,
    timeLimit: timeLimit.value,
    teamCount: teamCount.value,
    classId: selectedClassId.value,
  })

  if (room) {
    router.push({ name: 'arena-teacher-lobby', params: { roomId: room.id } })
  } else {
    error.value = gameStore.error || '創建失敗'
  }

  loading.value = false
}

onMounted(async () => {
  await loadClasses()
})
</script>

<template>
  <div class="create-game-page">
    <!-- 返回按鈕 -->
    <button class="back-btn" @click="router.push({ name: 'arena' })">
      ← 返回鬥豆
    </button>

    <!-- 頁面標題 -->
    <header class="page-header">
      <h1>
        <span class="title-icon">📢</span>
        創建課堂鬥豆
      </h1>
      <p class="subtitle">設置比賽參數，讓學生分組競技</p>
    </header>

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
      <!-- 步驟 1：選擇班級 -->
      <div v-if="currentStep === 1" class="step-panel">
        <h2>選擇班級</h2>
        <p class="step-hint">選擇要進行比賽的班級</p>

        <div v-if="classes.length === 0" class="empty-state">
          <p>您還沒有創建班級</p>
          <router-link to="/my-classes" class="btn-secondary">
            去創建班級 →
          </router-link>
        </div>

        <div v-else class="class-grid">
          <button
            v-for="cls in classes"
            :key="cls.id"
            class="class-card"
            :class="{ selected: selectedClassId === cls.id }"
            @click="selectedClassId = cls.id"
          >
            <span class="class-icon">🏫</span>
            <span class="class-name">{{ cls.class_name }}</span>
          </button>
        </div>
      </div>

      <!-- 步驟 2：選擇文本 -->
      <div v-if="currentStep === 2" class="step-panel">
        <h2>選擇比賽文本</h2>
        <p class="step-hint">可選擇多篇文章，學生將按順序在限時內盡量完成</p>

        <TextSelector
          ref="textSelector"
          :show-custom-texts="true"
          @update:selected-ids="updateSelectedIds"
        />
      </div>

      <!-- 步驟 3：比賽設置 -->
      <div v-if="currentStep === 3" class="step-panel">
        <h2>比賽設置</h2>
        <p class="step-hint">設置隊伍數量和時間限制</p>

        <!-- 隊伍數量 -->
        <div class="setting-group">
          <label class="setting-label">隊伍數量</label>
          <div class="team-count-options">
            <button
              v-for="count in TEAM_COUNT_OPTIONS"
              :key="count"
              class="count-btn"
              :class="{ selected: teamCount === count }"
              @click="teamCount = count"
            >
              {{ count }} 隊
            </button>
          </div>
          
          <!-- 隊伍預覽 -->
          <div class="teams-preview">
            <div 
              v-for="num in teamPreviewNumbers" 
              :key="num"
              class="team-preview"
            >
              隊伍 {{ num }}
            </div>
          </div>
        </div>

        <!-- 時間限制 -->
        <div class="setting-group">
          <label class="setting-label">時間限制</label>
          <div class="time-options">
            <button
              v-for="option in TIME_MODE_OPTIONS"
              :key="option.value"
              class="time-btn"
              :class="{ selected: timeLimit === option.value }"
              @click="timeLimit = option.value"
            >
              <span class="time-label">{{ option.label }}</span>
              <span class="time-desc">{{ option.description }}</span>
            </button>
          </div>
        </div>

        <!-- 確認信息 -->
        <div class="confirm-card">
          <h3>確認信息</h3>
          <div class="confirm-row">
            <span class="confirm-label">班級</span>
            <span class="confirm-value">{{ classes.find(c => c.id === selectedClassId)?.class_name }}</span>
          </div>
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
            <span class="confirm-label">隊伍</span>
            <span class="confirm-value">{{ teamCount }} 隊</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">時間</span>
            <span class="confirm-value">
              {{ TIME_MODE_OPTIONS.find(t => t.value === timeLimit)?.description }}
            </span>
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
      >
        下一步
      </button>
      
      <button 
        v-if="currentStep === totalSteps"
        class="btn-primary" 
        @click="createGame"
        :disabled="loading"
      >
        {{ loading ? '創建中...' : '創建課堂鬥豆' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.create-game-page {
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
  margin-bottom: 2rem;
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

/* 步驟指示器 */
.steps-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  position: relative;
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
  z-index: 1;
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
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.step-panel h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.step-hint {
  color: var(--color-neutral-500);
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
}

/* 班級選擇 */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.class-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.class-card:hover {
  background: var(--color-primary-50);
}

.class-card.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
}

.class-icon {
  font-size: 2rem;
}

.class-name {
  font-weight: 600;
  text-align: center;
}

/* 文本來源切換 */
.source-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.source-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-tab:hover {
  background: var(--color-neutral-100);
}

.source-tab.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-label {
  font-weight: 600;
}

.tab-count {
  background: var(--color-neutral-200);
  color: var(--color-neutral-600);
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.source-tab.active .tab-count {
  background: var(--color-primary-500);
  color: white;
}

/* 加載狀態 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-neutral-500);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 文本選擇 */
.text-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.text-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  position: relative;
}

.text-card:hover {
  background: var(--color-primary-50);
}

.text-card.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
}

.text-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.text-info {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex: 1;
}

.text-title {
  margin: 0;
  font-size: 1rem;
}

.text-author {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.difficulty-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.difficulty-badge.diff-1 {
  background: var(--color-success-100, #d1fae5);
  color: var(--color-success-700, #047857);
}

.difficulty-badge.diff-2 {
  background: var(--color-warning-100, #fef3c7);
  color: var(--color-warning-700, #d97706);
}

.difficulty-badge.diff-3 {
  background: var(--color-error-100, #fee2e2);
  color: var(--color-error-700, #dc2626);
}

.text-preview {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  line-height: 1.5;
}

.selected-indicator {
  position: absolute;
  right: 1rem;
  bottom: 0.75rem;
  color: var(--color-primary-600);
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--color-primary-500);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}

/* 已選文本提示 */
.selected-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: 10px;
  margin-bottom: 1rem;
  font-weight: 500;
  color: var(--color-primary-700);
}

.summary-icon {
  font-size: 1.125rem;
}

.clear-btn {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: white;
  border: 1px solid var(--color-neutral-300);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--color-neutral-100);
  border-color: var(--color-neutral-400);
}

/* 確認信息中的多文本顯示 */
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

.btn-link {
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: 500;
}

.btn-link:hover {
  text-decoration: underline;
}

/* 設置組 */
.setting-group {
  margin-bottom: 1.5rem;
}

.setting-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.team-count-options,
.time-options {
  display: flex;
  gap: 0.75rem;
}

.count-btn,
.time-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.count-btn:hover,
.time-btn:hover {
  background: var(--color-primary-50);
}

.count-btn.selected,
.time-btn.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
}

.time-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.time-label {
  font-weight: 600;
}

.time-desc {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* 隊伍預覽 */
.teams-preview {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.team-preview {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: var(--color-primary-100, #eff6e5);
  border: 2px solid var(--color-primary-400, #a8c870);
  color: var(--color-primary-800, #456124);
  transition: all 0.2s ease;
}

.team-preview:hover {
  background: var(--color-primary-200, #deedc4);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(139, 178, 79, 0.2);
}

/* 確認卡片 */
.confirm-card {
  background: var(--color-neutral-50);
  border-radius: 12px;
  padding: 1.25rem;
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
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-neutral-400);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-neutral-500);
}

.error-message {
  color: var(--color-error);
  text-align: center;
  margin-bottom: 1rem;
}
</style>

