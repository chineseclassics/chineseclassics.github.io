<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'

const historyStore = useHistoryStore()
const selectedLimit = ref(historyStore.limit)

watch(selectedLimit, (value) => {
  historyStore.fetchHistory(value)
})

onMounted(() => {
  historyStore.fetchHistory(selectedLimit.value)
})

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-Hant', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAccuracy(accuracy: number) {
  return `${Math.round(accuracy * 100)}%`
}
</script>

<template>
  <div class="history-shell">
    <section class="history-hero edamame-glass fade-in">
      <div>
        <p class="edamame-text-level-detail">練習足跡 · 成長旅程</p>
        <h1 class="edamame-heading-gradient">歷史紀錄</h1>
        <p class="hero-desc">
          每一次練習都會被紀錄下來，搭配豆點與準確率，幫助你快速回顧學習成果。
        </p>
      </div>
      <div class="hero-controls">
        <label>
          顯示最近
          <select v-model.number="selectedLimit">
            <option v-for="option in historyStore.getLimitOptions()" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          筆紀錄
        </label>
      </div>
    </section>

    <section class="history-timeline edamame-glass">
      <div v-if="historyStore.isLoading" class="state-info">載入歷史紀錄中...</div>
      <div v-else-if="historyStore.error" class="state-error">{{ historyStore.error }}</div>
      <div v-else-if="!historyStore.entries.length" class="state-info">
        尚未有任何練習紀錄，趕快開始第一次挑戰吧！
      </div>
      <ul v-else class="timeline-list">
        <li v-for="entry in historyStore.entries" :key="entry.id" class="timeline-item">
          <div class="timeline-dot" />
          <div class="timeline-content">
            <div class="timeline-header">
              <strong>{{ entry.display_name || entry.username || '匿名學員' }}</strong>
              <span>{{ formatDate(entry.created_at) }}</span>
            </div>
            <p class="timeline-text">
              {{ entry.text?.title || '未命名文章' }}
              <small>{{ entry.text?.category_name || '未分類' }}</small>
            </p>
            <div class="timeline-meta">
              <span>豆點 +{{ entry.score }}</span>
              <span>準確率 {{ formatAccuracy(entry.accuracy) }}</span>
              <span>耗時 {{ entry.elapsed_seconds }} 秒</span>
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
  gap: clamp(1rem, 2vw, 2rem);
}

.history-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  padding: clamp(1.5rem, 3vw, 2.5rem);
}

.hero-desc {
  margin-top: 0.5rem;
  color: var(--color-neutral-600);
  max-width: 520px;
}

.hero-controls select {
  margin: 0 0.35rem;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-200);
  font-size: var(--text-sm);
}

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
  left: 18px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(0, 0, 0, 0.08);
}

.timeline-item {
  position: relative;
  padding-left: 48px;
  margin-bottom: 1.5rem;
}

.timeline-dot {
  position: absolute;
  left: 10px;
  top: 6px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-primary-400);
  box-shadow: 0 0 0 4px rgba(139, 178, 79, 0.2);
}

.timeline-content {
  background: rgba(255, 255, 255, 0.85);
  border-radius: var(--radius-xl);
  padding: 1rem 1.25rem;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: var(--shadow-sm);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.timeline-header strong {
  color: var(--color-neutral-800);
  font-weight: var(--font-semibold);
}

.timeline-text {
  margin: 0.35rem 0;
  font-weight: var(--font-medium);
  color: var(--color-neutral-800);
}

.timeline-text small {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

.timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.state-info,
.state-error {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-neutral-600);
}

.state-error {
  color: var(--color-error-600);
}

@media (max-width: 768px) {
  .timeline-item {
    padding-left: 36px;
  }

  .timeline-list::before {
    left: 14px;
  }

  .timeline-dot {
    left: 7px;
  }
}
</style>

