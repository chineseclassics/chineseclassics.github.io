<script setup lang="ts">
/**
 * 句豆 - 豆跡頁面（歷史記錄）
 * 
 * 整合顯示用戶的所有活動記錄：
 * - 練習記錄
 * - 對戰記錄
 * - 豆子收支
 * - 閱讀記錄
 */

import { onMounted, ref, watch, computed } from 'vue'
import { useHistoryStore, type RecordType, type TimeRange, type HistoryEntry } from '@/stores/historyStore'
import { getTransactionTypeLabel } from '@/types/history'
import BeanIcon from '@/components/common/BeanIcon.vue'

// 豆子圖標標識（用於判斷是否渲染 BeanIcon 組件）
const BEAN_ICON = 'bean'

const historyStore = useHistoryStore()
const selectedLimit = ref(historyStore.limit)

// 標籤頁選項
const tabs: { key: RecordType; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'practice', label: '練習', icon: BEAN_ICON },
  { key: 'game', label: '對戰', icon: '⚔️' },
  { key: 'bean', label: '收支', icon: '💰' },
  { key: 'reading', label: '閱讀', icon: '📖' }
]

// 時間範圍選項
const timeRanges: { key: TimeRange; label: string }[] = [
  { key: 'all', label: '全部時間' },
  { key: 'today', label: '今天' },
  { key: 'week', label: '本週' },
  { key: 'month', label: '本月' }
]

// 當前選中的標籤和時間範圍
const activeTab = ref<RecordType>('all')
const activeTimeRange = ref<TimeRange>('all')

// 監聯變化
watch(selectedLimit, (value) => {
  historyStore.fetchHistory(value)
})

watch(activeTab, (value) => {
  historyStore.setRecordType(value)
})

watch(activeTimeRange, (value) => {
  historyStore.setTimeRange(value)
})

onMounted(() => {
  historyStore.fetchHistory(selectedLimit.value)
  historyStore.fetchStats()
})

// 格式化函數
function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-Hant', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAccuracy(accuracy: number | null) {
  if (accuracy === null) return '-'
  return `${Math.round(accuracy * 100)}%`
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} 秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins} 分 ${secs} 秒` : `${mins} 分鐘`
}

// 計算豆子變化顯示
function formatBeanAmount(amount: number) {
  if (amount > 0) return `+${amount}`
  return amount.toString()
}

// 獲取記錄類型的圖標和顏色
function getEntryIcon(entry: HistoryEntry): { icon: string; color: string } {
  switch (entry.type) {
    case 'practice':
      return { icon: BEAN_ICON, color: 'primary' }
    case 'game':
      return entry.is_winner 
        ? { icon: '🏆', color: 'warning' }
        : { icon: '⚔️', color: 'neutral' }
    case 'bean':
      return entry.amount > 0 
        ? { icon: '💰', color: 'success' }
        : { icon: '💸', color: 'error' }
    case 'reading':
      return entry.is_completed
        ? { icon: '✅', color: 'success' }
        : { icon: '📖', color: 'primary' }
    default:
      return { icon: '📋', color: 'neutral' }
  }
}

// 獲取記錄的主標題
function getEntryTitle(entry: HistoryEntry): string {
  switch (entry.type) {
    case 'practice':
      return entry.text?.title || '練習'
    case 'game':
      return entry.text?.title || '對戰'
    case 'bean':
      return getTransactionTypeLabel(entry.transaction_type)
    case 'reading':
      return entry.text?.title || '閱讀'
    default:
      return '記錄'
  }
}

// 統計卡片數據
const statsCards = computed(() => {
  const stats = historyStore.stats
  if (!stats) return []
  
  return [
    { 
      label: '練習次數', 
      value: stats.totalPractices, 
      icon: BEAN_ICON,
      subLabel: `本週 ${stats.weeklyPractices}`,
      color: 'primary'
    },
    { 
      label: '對戰場數', 
      value: stats.totalGames, 
      icon: '⚔️',
      subLabel: `勝 ${stats.totalWins}`,
      color: 'warning'
    },
    { 
      label: '獲得豆子', 
      value: stats.totalBeansEarned, 
      icon: '💰',
      subLabel: `消耗 ${stats.totalBeansSpent}`,
      color: 'success'
    },
    { 
      label: '閱讀文章', 
      value: stats.totalReadings, 
      icon: '📖',
      subLabel: `完成 ${stats.completedReadings}`,
      color: 'info'
    }
  ]
})
</script>

<template>
  <div class="history-shell">
    <!-- 頁面標題 -->
    <section class="history-hero edamame-glass fade-in">
      <div>
        <p class="edamame-text-level-detail">練習足跡 · 成長旅程</p>
        <h1 class="edamame-heading-gradient">豆跡</h1>
        <p class="hero-desc">
          每一次練習、對戰、閱讀都會被記錄下來，見證你的學習成長。
        </p>
      </div>
    </section>

    <!-- 統計卡片 -->
    <section v-if="historyStore.stats" class="stats-grid">
      <div 
        v-for="card in statsCards" 
        :key="card.label" 
        class="stat-card edamame-glass"
        :class="`stat-${card.color}`"
      >
        <span class="stat-icon">
          <BeanIcon v-if="card.icon === BEAN_ICON" :size="28" />
          <template v-else>{{ card.icon }}</template>
        </span>
        <div class="stat-content">
          <p class="stat-value">{{ card.value }}</p>
          <p class="stat-label">{{ card.label }}</p>
          <p class="stat-sub">{{ card.subLabel }}</p>
        </div>
      </div>
    </section>

    <!-- 標籤頁和篩選 -->
    <section class="filter-section edamame-glass">
      <div class="tabs-row">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">
            <BeanIcon v-if="tab.icon === BEAN_ICON" :size="16" />
            <template v-else>{{ tab.icon }}</template>
          </span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>
      
      <div class="filter-row">
        <div class="time-filter">
          <select v-model="activeTimeRange">
            <option v-for="range in timeRanges" :key="range.key" :value="range.key">
              {{ range.label }}
            </option>
          </select>
        </div>
        
        <div class="limit-filter">
          <label>
            顯示
            <select v-model.number="selectedLimit">
              <option v-for="option in historyStore.getLimitOptions()" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            筆
          </label>
        </div>
      </div>
    </section>

    <!-- 記錄列表 -->
    <section class="history-timeline edamame-glass">
      <div v-if="historyStore.isLoading" class="state-info">
        <span class="loading-spinner"></span>
        載入歷史紀錄中...
      </div>
      <div v-else-if="historyStore.error" class="state-error">{{ historyStore.error }}</div>
      <div v-else-if="!historyStore.entries.length" class="state-info">
        <span class="empty-icon">📭</span>
        <p>尚未有任何{{ activeTab === 'all' ? '' : tabs.find(t => t.key === activeTab)?.label }}紀錄</p>
        <p class="empty-hint">趕快開始第一次挑戰吧！</p>
      </div>
      
      <ul v-else class="timeline-list">
        <li 
          v-for="entry in historyStore.entries" 
          :key="entry.id" 
          class="timeline-item"
          :class="`type-${entry.type}`"
        >
          <div class="timeline-dot" :class="getEntryIcon(entry).color">
            <BeanIcon v-if="getEntryIcon(entry).icon === BEAN_ICON" :size="14" />
            <template v-else>{{ getEntryIcon(entry).icon }}</template>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <strong class="entry-title">{{ getEntryTitle(entry) }}</strong>
              <span class="entry-time">{{ formatDate(entry.created_at) }}</span>
            </div>
            
            <!-- 練習記錄詳情 -->
            <div v-if="entry.type === 'practice'" class="entry-details practice-details">
              <span class="detail-item score">
                <BeanIcon :size="14" class="detail-icon" />
                {{ entry.score }} 豆
              </span>
              <span class="detail-item accuracy">
                <span class="detail-icon">🎯</span>
                {{ formatAccuracy(entry.accuracy) }}
              </span>
              <span class="detail-item time">
                <span class="detail-icon">⏱️</span>
                {{ entry.elapsed_seconds }} 秒
              </span>
              <span v-if="entry.text?.category_name" class="detail-item category">
                {{ entry.text.category_name }}
              </span>
            </div>
            
            <!-- 對戰記錄詳情 -->
            <div v-else-if="entry.type === 'game'" class="entry-details game-details">
              <span class="detail-item result" :class="entry.is_winner ? 'win' : 'lose'">
                {{ entry.is_winner ? '🏆 獲勝' : '💪 惜敗' }}
              </span>
              <span class="detail-item mode">
                {{ entry.game_mode === 'pvp' ? 'PK 競技' : '課堂鬥豆' }}
              </span>
              <span class="detail-item score">
                {{ entry.score }} 分
              </span>
              <span v-if="entry.prize_won > 0" class="detail-item prize">
                +{{ entry.prize_won }} 豆
              </span>
              <span v-if="entry.fee_paid > 0" class="detail-item fee">
                入場 {{ entry.fee_paid }} 豆
              </span>
            </div>
            
            <!-- 豆子交易詳情 -->
            <div v-else-if="entry.type === 'bean'" class="entry-details bean-details">
              <span class="detail-item amount" :class="entry.amount > 0 ? 'positive' : 'negative'">
                {{ formatBeanAmount(entry.amount) }} 豆
              </span>
              <span v-if="entry.balance_after !== null" class="detail-item balance">
                餘額 {{ entry.balance_after }} 豆
              </span>
              <span v-if="entry.description" class="detail-item desc">
                {{ entry.description }}
              </span>
            </div>
            
            <!-- 閱讀記錄詳情 -->
            <div v-else-if="entry.type === 'reading'" class="entry-details reading-details">
              <span class="detail-item status" :class="entry.is_completed ? 'completed' : ''">
                {{ entry.is_completed ? '✅ 已完成' : `📖 ${entry.progress}%` }}
              </span>
              <span v-if="entry.text?.author" class="detail-item author">
                {{ entry.text.author }}
              </span>
              <span class="detail-item count">
                閱讀 {{ entry.read_count }} 次
              </span>
              <span class="detail-item duration">
                {{ formatDuration(entry.read_duration) }}
              </span>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.history-shell {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.5rem);
}

/* 頁面標題 */
.history-hero {
  padding: clamp(1.5rem, 3vw, 2.5rem);
}

.hero-desc {
  margin-top: 0.5rem;
  color: var(--color-neutral-600);
  max-width: 520px;
}

/* 統計卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: var(--font-bold);
  color: var(--color-neutral-800);
}

.stat-label {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.stat-sub {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

.stat-primary .stat-value { color: var(--color-primary-600); }
.stat-warning .stat-value { color: #d97706; }
.stat-success .stat-value { color: #16a34a; }
.stat-info .stat-value { color: #0284c7; }

/* 篩選區域 */
.filter-section {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tabs-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-neutral-600);
  transition: all var(--duration-base) ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.tab-btn.active {
  background: var(--color-primary-500);
  color: white;
}

.tab-icon {
  font-size: 1rem;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.time-filter select,
.limit-filter select {
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-200);
  font-size: var(--text-sm);
  background: white;
}

.limit-filter {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.limit-filter select {
  margin: 0 0.35rem;
}

/* 時間軸列表 */
.history-timeline {
  padding: clamp(1rem, 2vw, 1.5rem);
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(0, 0, 0, 0.08);
}

.timeline-item {
  position: relative;
  padding-left: 56px;
  margin-bottom: 1.25rem;
}

.timeline-dot {
  position: absolute;
  left: 8px;
  top: 4px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  box-shadow: 0 0 0 3px rgba(139, 178, 79, 0.15);
  z-index: 1;
}

.timeline-dot.primary { box-shadow: 0 0 0 3px rgba(139, 178, 79, 0.2); }
.timeline-dot.warning { box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.2); }
.timeline-dot.success { box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2); }
.timeline-dot.error { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2); }
.timeline-dot.neutral { box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.2); }
.timeline-dot.info { box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2); }

.timeline-content {
  background: rgba(255, 255, 255, 0.85);
  border-radius: var(--radius-xl);
  padding: 1rem 1.25rem;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-base) ease;
}

.timeline-item:hover .timeline-content {
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.entry-title {
  color: var(--color-neutral-800);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
}

.entry-time {
  font-size: var(--text-sm);
  color: var(--color-neutral-400);
  white-space: nowrap;
}

/* 記錄詳情 */
.entry-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: var(--text-sm);
}

.detail-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-neutral-600);
}

.detail-icon {
  font-size: 0.875rem;
}

/* 練習記錄 */
.practice-details .score {
  color: var(--color-primary-600);
  font-weight: var(--font-semibold);
}

.practice-details .category {
  padding: 0.125rem 0.5rem;
  background: var(--color-neutral-100);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

/* 對戰記錄 */
.game-details .result.win {
  color: #d97706;
  font-weight: var(--font-semibold);
}

.game-details .result.lose {
  color: var(--color-neutral-500);
}

.game-details .prize {
  color: #16a34a;
  font-weight: var(--font-semibold);
}

.game-details .fee {
  color: var(--color-neutral-400);
}

/* 豆子記錄 */
.bean-details .amount {
  font-weight: var(--font-bold);
  font-size: var(--text-base);
}

.bean-details .amount.positive {
  color: #16a34a;
}

.bean-details .amount.negative {
  color: #dc2626;
}

.bean-details .balance {
  color: var(--color-neutral-400);
}

/* 閱讀記錄 */
.reading-details .status.completed {
  color: #16a34a;
  font-weight: var(--font-medium);
}

.reading-details .author {
  color: var(--color-neutral-500);
  font-style: italic;
}

/* 狀態信息 */
.state-info,
.state-error {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-neutral-500);
}

.state-error {
  color: var(--color-error-600);
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-neutral-200);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--color-neutral-400);
  margin-top: 0.5rem;
}

/* 響應式 */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .timeline-item {
    padding-left: 44px;
  }

  .timeline-list::before {
    left: 16px;
  }

  .timeline-dot {
    left: 5px;
    width: 22px;
    height: 22px;
    font-size: 0.75rem;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .tabs-row {
    -webkit-overflow-scrolling: touch;
  }

  .entry-details {
    gap: 0.375rem 0.75rem;
  }
}
</style>
