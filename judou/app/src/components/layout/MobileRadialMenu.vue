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
  UserCog
} from 'lucide-vue-next'
import BeanIcon from '@/components/common/BeanIcon.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// 菜單展開狀態
const isMenuOpen = ref(false)

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

// 合併所有導航項目（主要功能在前，管理功能在後）
const allMenuItems = computed(() => {
  const items = [...visiblePrimaryNav.value, ...visibleAdminNav.value]
  console.log('[MobileRadialMenu] allMenuItems:', items.length, items)
  return items
})

// 切換菜單
function toggleMenu() {
  console.log('[MobileRadialMenu] toggleMenu 被調用，當前狀態:', isMenuOpen.value)
  isMenuOpen.value = !isMenuOpen.value
  console.log('[MobileRadialMenu] 新狀態:', isMenuOpen.value)
}

// 關閉菜單
function closeMenu() {
  isMenuOpen.value = false
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
      v-if="allMenuItems.length > 0"
      :is-open="isMenuOpen"
      :items="allMenuItems"
      :center-x="menuCenterX"
      :center-y="menuCenterY"
      :radius="100"
      @close="closeMenu"
    />
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
