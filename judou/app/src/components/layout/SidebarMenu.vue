<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface NavItem {
  label: string
  description?: string
  to?: { name: string }
  disabled?: boolean
}

const primaryNav: NavItem[] = [
  { label: '主頁', description: '最新資訊', to: { name: 'home' } },
  { label: '練習', description: '自主練習', to: { name: 'practice' } },
  { label: '排行榜', description: '豆點排名', to: { name: 'leaderboard' } },
  { label: '歷史紀錄', description: '練習足跡', to: { name: 'history' } },
]

const secondaryNav: NavItem[] = [
  { label: '設定', description: '敬請期待', disabled: true },
  { label: '反饋', description: '敬請期待', disabled: true },
]

const adminNav: NavItem[] = [{ label: '文章管理', description: '建立/編輯練習', to: { name: 'admin-texts' } }]

const route = useRoute()

const isActive = (item: NavItem) => {
  if (!item.to) return false
  return route.name === item.to.name
}

const initials = computed(() => '豆友')
</script>

<template>
  <aside class="sidebar-shell edamame-sidebar edamame-glass">
    <div class="sidebar-brand">
      <div class="brand-avatar">{{ initials }}</div>
      <div>
        <p class="brand-title">句豆 APP</p>
        <p class="brand-subtitle">種豆南山下</p>
      </div>
    </div>

    <nav class="sidebar-section">
      <p class="section-label">常用功能</p>
      <ul>
        <li v-for="item in primaryNav" :key="item.label">
          <router-link
            v-if="item.to && !item.disabled"
            class="edamame-sidebar-item"
            :class="{ active: isActive(item) }"
            :to="item.to"
          >
            <div>
              <p class="item-title">{{ item.label }}</p>
              <p class="item-desc">{{ item.description }}</p>
            </div>
          </router-link>
          <div v-else class="edamame-sidebar-item disabled">
            <div>
              <p class="item-title">{{ item.label }}</p>
              <p class="item-desc">{{ item.description }}</p>
            </div>
          </div>
        </li>
      </ul>
    </nav>

    <nav class="sidebar-section">
      <p class="section-label">管理</p>
      <ul>
        <li v-for="item in adminNav" :key="item.label">
          <router-link
            v-if="item.to && !item.disabled"
            class="edamame-sidebar-item"
            :class="{ active: isActive(item) }"
            :to="item.to"
          >
            <div>
              <p class="item-title">{{ item.label }}</p>
              <p class="item-desc">{{ item.description }}</p>
            </div>
          </router-link>
          <div v-else class="edamame-sidebar-item disabled">
            <div>
              <p class="item-title">{{ item.label }}</p>
              <p class="item-desc">{{ item.description }}</p>
            </div>
          </div>
        </li>
      </ul>
    </nav>

    <nav class="sidebar-section">
      <p class="section-label">更多</p>
      <ul>
        <li v-for="item in secondaryNav" :key="item.label">
          <div class="edamame-sidebar-item disabled">
            <div>
              <p class="item-title">{{ item.label }}</p>
              <p class="item-desc">{{ item.description }}</p>
            </div>
          </div>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <p>版本 2.0 Vue</p>
      <p class="item-desc">Supabase + PWA Ready</p>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-shell {
  width: 280px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-brand {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.brand-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: var(--color-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  color: var(--color-primary-700);
}

.brand-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.brand-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.sidebar-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-neutral-500);
  margin-bottom: 0.5rem;
}

.item-title {
  margin: 0;
  font-weight: var(--font-medium);
}

.item-desc {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

.edamame-sidebar-item.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.sidebar-footer {
  margin-top: auto;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

@media (max-width: 960px) {
  .sidebar-shell {
    width: 100%;
    height: auto;
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .sidebar-brand {
    width: 100%;
  }

  .sidebar-section {
    flex: 1 1 220px;
  }

  .sidebar-footer {
    width: 100%;
    margin-top: 0;
  }
}
</style>
