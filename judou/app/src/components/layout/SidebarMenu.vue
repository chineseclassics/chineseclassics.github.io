<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { useUserStatsStore } from '../../stores/userStatsStore'
import { useAssignmentStore } from '../../stores/assignmentStore'

interface NavItem {
  label: string
  icon?: string
  description?: string
  to?: { name: string }
  disabled?: boolean
  teacherOnly?: boolean
}

const authStore = useAuthStore()
const userStatsStore = useUserStatsStore()
const assignmentStore = useAssignmentStore()
const router = useRouter()

const primaryNav: NavItem[] = [
  { label: '首頁', icon: '🏠', to: { name: 'home' } },
  { label: '句豆', icon: '🫘', to: { name: 'practice' }, description: '練習' },
  { label: '品豆', icon: '📖', to: { name: 'reading-list' }, description: '閱讀' },
  { label: '鬥豆', icon: '⚔️', to: { name: 'arena' }, description: '對戰' },
  { label: '豆跡', icon: '👣', to: { name: 'history' }, description: '歷史' },
  { label: '豆莢', icon: '🫛', to: { name: 'my-classes' }, description: '班級' },
  { label: '自訂練習', icon: '✏️', to: { name: 'my-texts' }, teacherOnly: true },
]

const adminNav: NavItem[] = [
  { label: '練習文庫', to: { name: 'admin-texts' } },
  { label: '閱讀文庫', to: { name: 'admin-reading' } },
]

// 超級管理員導航
const superAdminNav: NavItem[] = [
  { label: '用戶管理', to: { name: 'admin-users' } },
]

// 過濾常用功能導航（老師專屬項目）
const visiblePrimaryNav = computed(() => {
  return primaryNav.filter(item => !item.teacherOnly || authStore.isTeacher)
})

// 過濾管理導航（只有管理員可見）
const visibleAdminNav = computed(() => {
  if (!authStore.isAuthenticated || !authStore.isAdmin) return []
  return adminNav
})

// 過濾超級管理員導航（只有超級管理員可見）
const visibleSuperAdminNav = computed(() => {
  if (!authStore.isAuthenticated || !authStore.isSuperAdmin) return []
  return superAdminNav
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

// 用戶統計（使用新的 profile 系統）
const beans = computed(() => userStatsStore.profile?.total_beans ?? 0)
const level = computed(() => userStatsStore.level)
const streakDays = computed(() => userStatsStore.profile?.streak_days ?? 0)

// ========== 豆子變化動畫（滾輪動畫） ==========
const displayBeans = ref(0)  // 顯示的數字
const isBeansAnimating = ref(false)
const beansChangeDirection = ref<'up' | 'down' | null>(null)

// 將數字拆分成位數數組（用於滾輪顯示）
const beansDigits = computed(() => {
  const str = displayBeans.value.toString()
  return str.split('').map(d => parseInt(d))
})

// 監聽豆子變化
watch(beans, (newVal, oldVal) => {
  // 初始化時直接設置
  if (oldVal === undefined || oldVal === 0) {
    displayBeans.value = newVal
    return
  }
  
  // 數值相同不做動畫
  if (newVal === oldVal) return
  
  // 設置動畫方向
  const diff = newVal - oldVal
  beansChangeDirection.value = diff > 0 ? 'up' : 'down'
  isBeansAnimating.value = true
  
  // 更新數字（觸發滾輪動畫）
  displayBeans.value = newVal
  
  // 動畫結束後重置狀態
  setTimeout(() => {
    isBeansAnimating.value = false
    beansChangeDirection.value = null
  }, 800)
}, { immediate: true })

// 登入
async function handleLogin() {
  await authStore.loginWithGoogle()
}

// 點擊用戶區域（已登入時跳轉到個人頁面）
function handleUserClick() {
  router.push({ name: 'profile' })
}

// 待完成作業數量（學生）
const pendingCount = ref(0)

// 監聯認證狀態，載入用戶 Profile
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      console.log('[Sidebar] 用戶已登入，載入 Profile')
      userStatsStore.fetchProfile()
      if (authStore.isStudent) {
        assignmentStore.fetchStudentAssignments().then(() => {
          assignmentStore.getPendingCount().then(count => {
            pendingCount.value = count
          })
        })
      }
    } else {
      pendingCount.value = 0
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (authStore.isAuthenticated && authStore.isStudent) {
    assignmentStore.fetchStudentAssignments().then(() => {
      assignmentStore.getPendingCount().then(count => {
        pendingCount.value = count
      })
    })
  }
})

// Logo URL（使用 BASE_URL 確保路徑正確）
const logoUrl = `${import.meta.env.BASE_URL}images/judou-logo.jpg`

</script>

<template>
  <aside class="sidebar-shell edamame-glass">
    <!-- 已登入：用戶區域（只顯示頭像和統計） -->
    <div v-if="authStore.isAuthenticated" class="sidebar-brand" @click="handleUserClick">
      <div class="brand-avatar" :class="{ 'has-avatar': authStore.avatarUrl }">
        <img v-if="authStore.avatarUrl" :src="authStore.avatarUrl" :alt="displayName" />
        <span v-else>{{ initials }}</span>
        <!-- 等級徽章 -->
        <div class="level-badge">{{ level }}</div>
      </div>
      <div class="brand-info">
        <!-- 豆子顯示區（滾輪動畫） -->
        <div 
          class="beans-card" 
          :class="{ 
            'beans-animating': isBeansAnimating,
            'beans-up': beansChangeDirection === 'up',
            'beans-down': beansChangeDirection === 'down'
          }"
        >
          <div class="beans-icon">
            <span class="bean-pod">🫛</span>
          </div>
          <!-- 滾輪數字顯示 -->
          <div class="beans-roller">
            <div 
              v-for="(digit, index) in beansDigits" 
              :key="index"
              class="digit-slot"
            >
              <div 
                class="digit-roller"
                :style="{ transform: `translateY(-${digit * 10}%)` }"
              >
                <span v-for="n in 10" :key="n" class="digit">{{ n - 1 }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 連續天數 -->
        <div v-if="streakDays > 0" class="secondary-stats">
          <span class="streak-display">🔥 {{ streakDays }}天</span>
        </div>
      </div>
      <!-- 箭頭指示 -->
      <svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>

    <!-- 未登入：直接顯示登入按鈕 -->
    <div v-else class="login-section">
      <button class="google-login-btn" @click="handleLogin">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>使用 Google 登入</span>
      </button>
      <p class="login-hint">登入後可保存學習進度</p>
    </div>

    <nav class="sidebar-section">
      <p class="section-label">常用功能</p>
      <ul>
        <li v-for="item in visiblePrimaryNav" :key="item.label">
          <router-link
            v-if="item.to && !item.disabled"
            class="edamame-sidebar-item"
            :class="{ active: isActive(item) }"
            :to="item.to"
          >
            <span v-if="item.icon" class="item-icon">{{ item.icon }}</span>
            <p class="item-title">
              {{ item.label }}
              <span v-if="item.label === '豆莢' && authStore.isStudent && pendingCount > 0" class="badge">
                {{ pendingCount }}
              </span>
            </p>
          </router-link>
          <div v-else class="edamame-sidebar-item disabled">
            <span v-if="item.icon" class="item-icon">{{ item.icon }}</span>
            <p class="item-title">{{ item.label }}</p>
          </div>
        </li>
      </ul>
    </nav>

    <!-- 管理區域（僅管理員可見） -->
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
            <p class="item-title">{{ item.label }}</p>
          </router-link>
          <div v-else class="edamame-sidebar-item disabled">
            <p class="item-title">{{ item.label }}</p>
          </div>
        </li>
      </ul>
    </nav>

    <!-- 超級管理員區域（僅超級管理員可見） -->
    <nav v-if="visibleSuperAdminNav.length > 0" class="sidebar-section super-admin-section">
      <p class="section-label">超級管理</p>
      <ul>
        <li v-for="item in visibleSuperAdminNav" :key="item.label">
          <router-link
            v-if="item.to && !item.disabled"
            class="edamame-sidebar-item super-admin-item"
            :class="{ active: isActive(item) }"
            :to="item.to"
          >
            <p class="item-title">{{ item.label }}</p>
          </router-link>
          <div v-else class="edamame-sidebar-item disabled">
            <p class="item-title">{{ item.label }}</p>
          </div>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-brand">
        <img :src="logoUrl" alt="句豆" class="footer-logo" />
        <span class="footer-title">句豆 2.0</span>
      </div>
      <div class="footer-credits">
        <p>開發：汪涵屹、張老師</p>
        <p>美術：丁奕辰、徐揚洋</p>
      </div>
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
  font-family: var(--font-ui, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
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
  /* 注意：不用 overflow: hidden，讓 badge 可以顯示在外面 */
}

.brand-avatar.has-avatar {
  background: transparent;
}

.brand-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-full);  /* 圖片自己處理圓角裁剪 */
}

.level-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  font-size: 0.625rem;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 2px solid white;
}

.brand-avatar {
  position: relative;
}

.brand-info {
  flex: 1;
  min-width: 0;
}

.brand-stats-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

/* ========== 豆子卡片（優化版） ========== */
.beans-card {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding: 0.25rem 0.625rem 0.25rem 0.375rem;
  border-radius: 20px;
  position: relative;
  box-shadow: 
    0 2px 4px rgba(76, 175, 80, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(76, 175, 80, 0.2);
  transition: transform 0.15s, box-shadow 0.15s;
}

.beans-card:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 4px 8px rgba(76, 175, 80, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* 豆子數字變化動畫 */
.beans-card.beans-animating {
  animation: beans-pulse 0.3s ease-out;
}

.beans-card.beans-animating .beans-value {
  animation: number-glow 0.8s ease-out;
}

/* 增加豆子時 - 綠色閃爍 */
.beans-card.beans-up {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: rgba(34, 197, 94, 0.4);
  box-shadow: 
    0 2px 8px rgba(34, 197, 94, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.beans-card.beans-up .digit {
  color: #15803d;
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

/* 減少豆子時 - 紅色閃爍 */
.beans-card.beans-down {
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow: 
    0 2px 8px rgba(239, 68, 68, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.beans-card.beans-down .digit {
  color: #dc2626;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

@keyframes beans-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes number-glow {
  0% { opacity: 1; }
  25% { opacity: 0.7; }
  50% { opacity: 1; }
  75% { opacity: 0.8; }
  100% { opacity: 1; }
}

.beans-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
}

.bean-pod {
  display: block;
  animation: bean-wiggle 3s ease-in-out infinite;
}

@keyframes bean-wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

/* ========== 滾輪數字動畫 ========== */
.beans-roller {
  display: flex;
  align-items: center;
  height: 1.25rem;
  overflow: hidden;
}

.digit-slot {
  height: 1.25rem;
  overflow: hidden;
  position: relative;
}

.digit-roller {
  display: flex;
  flex-direction: column;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.beans-animating .digit-roller {
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.digit {
  height: 1.25rem;
  line-height: 1.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: #2e7d32;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  text-align: center;
  min-width: 0.65rem;
}

/* ========== 次要統計信息 ========== */
.secondary-stats {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.streak-display {
  color: #dc2626;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
}

.arrow-icon {
  color: var(--color-neutral-400);
  transition: transform 0.2s;
}

.sidebar-brand:hover .arrow-icon {
  transform: translateX(2px);
  color: var(--color-primary-500);
}

/* ========== 登入區塊 ========== */
.login-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.google-login-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-lg, 12px);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #166534;
  transition: all 0.2s ease;
  box-shadow: 
    0 2px 8px rgba(34, 197, 94, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.google-login-btn:hover {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: rgba(34, 197, 94, 0.5);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(34, 197, 94, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.google-login-btn:active {
  transform: translateY(0);
  box-shadow: 
    0 2px 4px rgba(34, 197, 94, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.google-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
}

.login-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-neutral-400);
  text-align: center;
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
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--color-neutral-400);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.item-icon {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.item-title {
  margin: 0;
  font-weight: var(--font-medium);
  font-size: 0.95rem;
  font-family: var(--font-ui, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
}

.edamame-sidebar-item.disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* 超級管理員區域特殊樣式 */
.super-admin-section .section-label {
  color: #d97706;
}

.super-admin-item {
  border-left: 2px solid transparent;
}

.super-admin-item:hover {
  border-left-color: #fbbf24;
}

.super-admin-item.active {
  border-left-color: #d97706;
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.1), transparent);
}

.sidebar-footer {
  margin-top: auto;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.footer-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
}

.footer-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-700, #3d7c47);
}

.footer-credits {
  font-size: 0.7rem;
  color: var(--color-neutral-400);
  line-height: 1.5;
}

.footer-credits p {
  margin: 0;
}

.badge {
  display: inline-block;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--color-error);
  color: white;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  margin-left: 0.5rem;
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
