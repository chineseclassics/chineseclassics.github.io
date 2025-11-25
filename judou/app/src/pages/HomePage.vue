<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useHomeStore } from '../stores/homeStore'

const quickActions = [
  { label: '進入主頁', description: 'Latest feed & stats', href: '#', variant: 'primary' },
  { label: '練習中心', description: 'Select passages & submit', href: '#', variant: 'secondary' },
  { label: '排行榜', description: 'Realtime standings', href: '#', variant: 'outline' },
]

const highlights = [
  { title: '活躍豆友', value: '1,024', detail: '+128 今日' },
  { title: '提交練習', value: '8,530', detail: '本週' },
  { title: '豆子等級', value: 'Lv. 12', detail: '向前 65 exp' },
]

const homeStore = useHomeStore()
const { topPoems, poemsLoading, poemsError } = storeToRefs(homeStore)

onMounted(() => {
  if (!topPoems.value.length) {
    homeStore.fetchLatestPoems()
  }
})
</script>

<template>
  <main class="judou-container edamame-bg">
    <section class="judou-grid">
      <article class="edamame-glass hover-lift judou-card">
        <p class="edamame-text-level-subtitle">快速進入</p>
        <div class="actions-grid">
          <a
            v-for="action in quickActions"
            :key="action.label"
            class="edamame-sidebar-item judou-action"
            :href="action.href"
          >
            <div>
              <p class="edamame-text-level-subtitle">{{ action.label }}</p>
              <p class="edamame-text-level-detail">{{ action.description }}</p>
            </div>
          </a>
        </div>
      </article>

      <article class="edamame-glass hover-lift judou-card">
        <p class="edamame-text-level-subtitle">核心指標</p>
        <div class="stats-grid">
          <div v-for="stat in highlights" :key="stat.title" class="judou-stat">
            <p class="edamame-text-level-detail">{{ stat.title }}</p>
            <p class="edamame-heading-gradient stat-value">{{ stat.value }}</p>
            <p class="edamame-text-level-detail">{{ stat.detail }}</p>
          </div>
        </div>
      </article>

      <article class="edamame-glass hover-lift judou-card">
        <div class="poem-header">
          <p class="edamame-text-level-subtitle">最新詩文</p>
          <span class="edamame-text-level-detail" v-if="poemsLoading">載入中…</span>
        </div>

        <p v-if="poemsError" class="poem-error edamame-text-level-detail">
          {{ poemsError }}
        </p>

        <ul v-else class="poem-list">
          <li v-for="poem in topPoems" :key="poem.id" class="poem-item">
            <p class="poem-title edamame-text-level-subtitle">{{ poem.title }}</p>
            <p class="poem-author edamame-text-level-detail">{{ poem.author || '佚名' }}</p>
          </li>
          <li v-if="!topPoems.length && !poemsLoading" class="poem-item">
            <p class="edamame-text-level-detail">暫無練習文章</p>
          </li>
        </ul>
      </article>
    </section>
  </main>
</template>

<style scoped>
.judou-container {
  min-height: 100vh;
  padding: clamp(1.5rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  position: relative;
}

.judou-card {
  padding: clamp(1.25rem, 2vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.judou-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.judou-action {
  text-decoration: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.judou-stat {
  padding: 1rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: var(--shadow-sm);
}

.stat-value {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  margin: 0.2rem 0;
}

.poem-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.poem-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.poem-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.poem-item:last-of-type {
  border-bottom: none;
}

.poem-title {
  margin: 0;
}

.poem-author {
  margin: 0.125rem 0 0;
}

.poem-error {
  margin-top: 0.75rem;
  color: var(--color-error);
}
</style>
