<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'

interface NavItem {
  label: string
  description?: string
  to?: { name: string }
  disabled?: boolean
  teacherOnly?: boolean
}

const authStore = useAuthStore()

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

const adminNav: NavItem[] = [
  { label: '班級管理', description: '管理班級成員', to: { name: 'admin-texts' }, teacherOnly: true },
  { label: '文章管理', description: '建立/編輯練習', to: { name: 'admin-texts' }, teacherOnly: true },
]

// 過濾管理導航（只有老師可見）
const visibleAdminNav = computed(() => {
  if (!authStore.isAuthenticated) return []
  return adminNav.filter(item => !item.teacherOnly || authStore.isTeacher)
})

const route = useRoute()

const isActive = (item: NavItem) => {
  if (!item.to) return false
  return route.name === item.to.name
}

// 用戶顯示名稱
const displayName = computed(() => {
  if (!authStore.isAuthenticated) return '訪客'
  return authStore.displayName || '豆友'
})

// 用戶頭像首字母
const initials = computed(() => {
  return displayName.value.charAt(0)
})

// 角色標籤
const roleLabel = computed(() => {
  if (!authStore.isAuthenticated) return '未登入'
  return authStore.isTeacher ? '老師' : '學生'
})

// 登入/登出
const showUserMenu = ref(false)

async function handleLogin() {
  await authStore.loginWithGoogle()
}

async function handleLogout() {
  await authStore.logout()
  showUserMenu.value = false
}
</script>

<template>
  <aside class="sidebar-shell edamame-sidebar edamame-glass">
    <!-- 用戶區域 -->
    <div class="sidebar-brand" @click="showUserMenu = !showUserMenu">
      <div class="brand-avatar" :class="{ 'has-avatar': authStore.avatarUrl }">
        <img v-if="authStore.avatarUrl" :src="authStore.avatarUrl" :alt="displayName" />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="brand-info">
        <p class="brand-title">{{ displayName }}</p>
        <p class="brand-subtitle">{{ roleLabel }}</p>
      </div>
    </div>

    <!-- 用戶選單 -->
    <div v-if="showUserMenu" class="user-menu-dropdown">
      <button v-if="!authStore.isAuthenticated" class="login-btn" @click="handleLogin">
        <svg class="google-icon" viewBox="0 0 24 24" width="16" height="16">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        使用 Google 登入
      </button>
      <button v-else class="logout-btn" @click="handleLogout">
        登出
      </button>
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

    <!-- 管理區域（僅老師可見） -->
    <nav v-if="visibleAdminNav.length > 0" class="sidebar-section">
      <p class="section-label">管理</p>
      <ul>
        <li v-for="item in visibleAdminNav" :key="item.label">
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
  cursor: pointer;
  padding: 0.5rem;
  margin: -0.5rem;
  border-radius: var(--radius-lg, 12px);
  transition: background 0.2s;
}

.sidebar-brand:hover {
  background: rgba(0, 0, 0, 0.05);
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
  overflow: hidden;
}

.brand-avatar.has-avatar {
  background: transparent;
}

.brand-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-info {
  flex: 1;
}

/* 用戶選單下拉 */
.user-menu-dropdown {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: -0.5rem;
}

.login-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.login-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.google-icon {
  flex-shrink: 0;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  text-align: center;
  cursor: pointer;
  border-radius: 8px;
  color: #e53935;
  font-size: 14px;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #ffebee;
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
