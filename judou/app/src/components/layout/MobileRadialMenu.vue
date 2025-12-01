<!--
  移動端放射狀菜單整合組件
  整合浮動頭像按鈕和放射狀菜單
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import FloatingAvatarButton from './FloatingAvatarButton.vue'
import RadialMenu, { type RadialMenuItem } from './RadialMenu.vue'
import { 
  Home, 
  BookOpen, 
  Swords, 
  Footprints, 
  Users, 
  PenLine,
  Library,
  BookMarked,
  UserCog,
  MoreHorizontal
} from 'lucide-vue-next'
import BeanIcon from '@/components/common/BeanIcon.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// 菜單展開狀態
const isMenuOpen = ref(false)
// 當前顯示的頁面：'main' 或 'more'
const currentPage = ref<'main' | 'more'>('main')

// 主要導航項目
const primaryNav: RadialMenuItem[] = [
  { label: '首頁', icon: Home, iconType: 'lucide', to: { name: 'home' } },
  { label: '句豆', icon: BeanIcon, iconType: 'bean', to: { name: 'practice' }, description: '練習' },
  { label: '品豆', icon: BookOpen, iconType: 'lucide', to: { name: 'reading-list' }, description: '閱讀' },
  { label: '鬥豆', icon: Swords, iconType: 'lucide', to: { name: 'arena' }, description: '對戰' },
  { label: '豆跡', icon: Footprints, iconType: 'lucide', to: { name: 'history' }, description: '歷史' },
  { label: '豆莢', icon: Users, iconType: 'lucide', to: { name: 'my-classes' }, description: '班級' },
  { label: '自訂練習', icon: PenLine, iconType: 'lucide', to: { name: 'my-texts' }, teacherOnly: true },
]

// 管理導航項目
const adminNav: RadialMenuItem[] = [
  { label: '練習文庫', icon: Library, iconType: 'lucide', to: { name: 'admin-texts' } },
  { label: '閱讀文庫', icon: BookMarked, iconType: 'lucide', to: { name: 'admin-reading' } },
  { label: '用戶管理', icon: UserCog, iconType: 'lucide', to: { name: 'admin-users' }, superAdminOnly: true },
]

// 過濾可見的主要導航
const visiblePrimaryNav = computed(() => {
  return primaryNav.filter(item => !item.teacherOnly || authStore.isTeacher)
})

// 過濾可見的管理導航
const visibleAdminNav = computed(() => {
  if (!authStore.isAuthenticated || !authStore.isAdmin) return []
  return adminNav.filter(item => {
    if (item.superAdminOnly) {
      return authStore.isSuperAdmin
    }
    return true
  })
})

// 主頁面顯示的項目：首頁、句豆、品豆、鬥豆、更多
const mainPageItems = computed(() => {
  const items = visiblePrimaryNav.value
  const mainItems = [
    items.find(item => item.label === '首頁'),
    items.find(item => item.label === '句豆'),
    items.find(item => item.label === '品豆'),
    items.find(item => item.label === '鬥豆'),
  ].filter(Boolean) as RadialMenuItem[]
  
  // 添加"更多"按鈕
  mainItems.push({
    label: '更多',
    icon: MoreHorizontal,
    iconType: 'lucide',
    to: undefined, // 沒有路由，點擊時切換頁面
    disabled: false
  })
  
  return mainItems
})

// 更多頁面顯示的項目：剩下的所有項目
const morePageItems = computed(() => {
  const items = visiblePrimaryNav.value
  const mainLabels = ['首頁', '句豆', '品豆', '鬥豆']
  const moreItems = items.filter(item => !mainLabels.includes(item.label))
  
  // 添加管理員項目
  moreItems.push(...visibleAdminNav.value)
  
  // 添加"返回"按鈕（使用首頁圖標，但標籤為"返回"）
  moreItems.unshift({
    label: '返回',
    icon: Home,
    iconType: 'lucide',
    to: undefined, // 沒有路由，點擊時切換回主頁面
    disabled: false
  })
  
  return moreItems
})

// 當前顯示的菜單項目
const currentMenuItems = computed(() => {
  const items = currentPage.value === 'main' ? mainPageItems.value : morePageItems.value
  console.log('[MobileRadialMenu] currentMenuItems:', {
    page: currentPage.value,
    count: items.length,
    items: items.map(i => i.label)
  })
  return items
})

// 切換菜單
function toggleMenu() {
  console.log('[MobileRadialMenu] toggleMenu 被調用，當前狀態:', isMenuOpen.value)
  isMenuOpen.value = !isMenuOpen.value
  // 打開菜單時重置到主頁面
  if (isMenuOpen.value) {
    currentPage.value = 'main'
  }
  console.log('[MobileRadialMenu] 新狀態:', isMenuOpen.value)
}

// 關閉菜單
function closeMenu() {
  isMenuOpen.value = false
  // 關閉時重置到主頁面
  currentPage.value = 'main'
}

// 處理菜單項點擊（在 RadialMenu 中處理，這裡只是為了類型）
function handleMenuItemClick(item: RadialMenuItem) {
  // 如果是"更多"按鈕，切換到更多頁面
  if (item.label === '更多' && !item.to) {
    currentPage.value = 'more'
    return
  }
  
  // 如果是"返回"按鈕，切換回主頁面
  if (item.label === '返回' && !item.to) {
    currentPage.value = 'main'
    return
  }
  
  // 其他項目正常跳轉
  if (item.to) {
    router.push(item.to)
    closeMenu()
  }
}

// 處理頭像點擊（跳轉到個人頁面）
function handleAvatarClick() {
  if (authStore.isAuthenticated) {
    router.push({ name: 'profile' })
    closeMenu()
  }
}

// 監聽路由變化，自動關閉菜單
watch(() => route.name, () => {
  if (isMenuOpen.value) {
    closeMenu()
  }
})

// 計算菜單中心點（固定右下角位置）
// 按鈕位置：right: 20px, bottom: 20px, 大小：64px
// 中心點：從右邊緣 20px + 32px = 52px，從底邊緣 20px + 32px = 52px
const menuCenterX = computed(() => {
  if (typeof window === 'undefined') return 300
  return window.innerWidth - 52
})

const menuCenterY = computed(() => {
  if (typeof window === 'undefined') return 600
  return window.innerHeight - 52
})
</script>

<template>
  <div class="mobile-radial-menu">
    <!-- 浮動頭像按鈕 -->
    <FloatingAvatarButton
      :is-menu-open="isMenuOpen"
      @toggle-menu="toggleMenu"
      @avatar-click="handleAvatarClick"
    />
    
    <!-- 放射狀菜單 -->
    <RadialMenu
      v-if="currentMenuItems.length > 0"
      :is-open="isMenuOpen"
      :items="currentMenuItems"
      :center-x="menuCenterX"
      :center-y="menuCenterY"
      :radius="120"
      @close="closeMenu"
      @item-click="handleMenuItemClick"
    />
    
    <!-- 調試信息 -->
    <div v-if="false" style="position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-size: 12px;">
      <div>isMenuOpen: {{ isMenuOpen }}</div>
      <div>currentPage: {{ currentPage }}</div>
      <div>currentMenuItems.length: {{ currentMenuItems.length }}</div>
      <div>menuCenterX: {{ menuCenterX }}</div>
      <div>menuCenterY: {{ menuCenterY }}</div>
    </div>
  </div>
</template>

<style scoped>
.mobile-radial-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
}

/* 允許按鈕和菜單接收點擊事件 */
.mobile-radial-menu :deep(.floating-avatar-button),
.mobile-radial-menu :deep(.radial-menu-container),
.mobile-radial-menu :deep(.radial-menu-overlay) {
  pointer-events: auto;
}

/* 只在移動端顯示 */
@media (min-width: 961px) {
  .mobile-radial-menu {
    display: none;
  }
}
</style>
