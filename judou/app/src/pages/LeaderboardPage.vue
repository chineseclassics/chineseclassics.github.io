<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeaderboardStore } from '@/stores/leaderboardStore'
import type { Profile } from '@/types/profile'

const leaderboardStore = useLeaderboardStore()
const selectedLimit = ref(leaderboardStore.limit)

const podiumEntries = computed(() => leaderboardStore.entries.slice(0, 3))
const listEntries = computed(() => leaderboardStore.entries.slice(3))

const podiumClasses = ['podium-second', 'podium-first', 'podium-third'] as const

function formatScore(score: number) {
  return new Intl.NumberFormat('zh-Hant', { maximumFractionDigits: 0 }).format(score)
}

function avatarLabel(entry: Profile) {
  return entry.display_name?.slice(0, 2) ?? entry.username.slice(0, 2)
}

function getRankLabel(index: number) {
  return index + 1
}

watch(selectedLimit, (value) => {
  leaderboardStore.fetchLeaderboard(value)
})

onMounted(() => {
  if (!leaderboardStore.entries.length) {
    leaderboardStore.fetchLeaderboard(selectedLimit.value)
  }
})
</script>

<template>
  <div class="leaderboard-shell">
    <section class="leaderboard-hero edamame-glass fade-in">
      <div>
        <p class="edamame-text-level-detail">豆點排名 · 榮譽殿堂</p>
        <h1 class="edamame-heading-gradient">排行榜</h1>
        <p class="hero-desc">
          依據累積豆點計算的總排行榜。保持出席與完成挑戰，就能讓名字躍上榜單。
        </p>
      </div>
      <div class="hero-controls">
        <label>
          顯示前
          <select v-model.number="selectedLimit">
            <option v-for="option in leaderboardStore.getLimitOptions()" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          名
        </label>
      </div>
    </section>

    <section class="podium-grid" v-if="podiumEntries.length">
      <article
        v-for="(entry, index) in podiumEntries"
        :key="entry.id"
        class="podium-card"
        :class="podiumClasses[index]"
      >
        <p class="rank-badge">#{{ getRankLabel(index) }}</p>
        <div class="avatar">{{ avatarLabel(entry) }}</div>
        <p class="podium-name">{{ entry.display_name }}</p>
        <p class="podium-meta">
          {{ entry.grade || '未知年級' }} · 連勝 {{ entry.streak }} 天
        </p>
        <p class="podium-score">
          {{ formatScore(entry.final_score) }}
          <span>豆點</span>
        </p>
      </article>
    </section>

    <section class="edamame-glass fade-in leaderboard-table">
      <header class="table-header">
        <p class="edamame-text-level-subtitle">完整榜單</p>
        <p class="edamame-text-level-detail">
          最近更新：{{ new Date().toLocaleString('zh-Hant') }}
        </p>
      </header>

      <div v-if="leaderboardStore.isLoading" class="state-info">
        正在集豆中，請稍候...
      </div>
      <div v-else-if="leaderboardStore.error" class="state-error">
        {{ leaderboardStore.error }}
      </div>
      <div v-else-if="!leaderboardStore.entries.length" class="state-info">
        目前尚未有任何豆點紀錄，快去完成第一次練習吧！
      </div>
      <ul v-else class="leaderboard-list">
        <li
          v-for="(entry, index) in listEntries"
          :key="entry.id"
          class="leaderboard-row"
        >
          <span class="rank">#{{ index + 4 }}</span>
          <span class="name">
            <strong>{{ entry.display_name }}</strong>
            <small>{{ entry.username }}</small>
          </span>
          <span class="meta">
            <small>{{ entry.grade || '未設定年級' }}</small>
            <small>連勝 {{ entry.streak }} 天</small>
          </span>
          <span class="score">{{ formatScore(entry.final_score) }} 豆</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.leaderboard-shell {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 2rem);
}

.leaderboard-hero {
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

.podium-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.podium-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: var(--radius-2xl);
  position: relative;
  overflow: hidden;
}

.podium-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15), transparent 70%);
  pointer-events: none;
}

.podium-first {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  box-shadow: var(--shadow-lg);
}

.podium-second {
  background: linear-gradient(135deg, #e2e8f0, #cbd5f5);
}

.podium-third {
  background: linear-gradient(135deg, #fce7d4, #fbd5ae);
}

.rank-badge {
  font-weight: var(--font-semibold);
  color: var(--color-neutral-500);
  margin-bottom: 0.5rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.85);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
  color: var(--color-primary-700);
}

.podium-name {
  margin: 1rem 0 0.25rem;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.podium-meta {
  margin: 0;
  color: var(--color-neutral-600);
  font-size: var(--text-sm);
}

.podium-score {
  margin-top: 0.5rem;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.podium-score span {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  margin-left: 0.25rem;
}

.leaderboard-table {
  padding: 1rem 1.5rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.leaderboard-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 140px;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.leaderboard-row .name small {
  display: block;
  color: var(--color-neutral-500);
  font-size: var(--text-xs);
}

.leaderboard-row .meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--color-neutral-600);
  font-size: var(--text-sm);
}

.leaderboard-row .score {
  text-align: right;
  font-weight: var(--font-semibold);
  color: var(--color-primary-700);
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
  .leaderboard-row {
    grid-template-columns: 1fr;
    text-align: left;
  }

  .leaderboard-row .score {
    text-align: left;
  }
}
</style>

