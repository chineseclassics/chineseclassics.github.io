<!--
  可拖動的浮動頭像按鈕
  移動端使用，點擊後展開放射狀菜單
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDraggable, useLocalStorage } from '@vueuse/core'
import { useAuthStore } from '@/stores/authStore'
import { useAvatarStore } from '@/stores/avatarStore'
import UserAvatar from '@/components/avatar/UserAvatar.vue'

const props = defineProps<{
  // 是否展開菜單
  isMenuOpen: boolean
}>()

const emit = defineEmits<{
  'update:isMenuOpen': [value: boolean]
  'toggle-menu': []
  'avatar-click': []
  'update:position': [x: number, y: number]
}>()

const authStore = useAuthStore()
const avatarStore = useAvatarStore()

// 按鈕元素引用
const buttonRef = ref<HTMLElement>()

// 從 localStorage 恢復位置，或使用默認位置（右下角）
const getDefaultPosition = () => {
  if (typeof window === 'undefined') return { x: 300, y: 600 }
  return {
    x: window.innerWidth - 80,
    y: window.innerHeight - 80
  }
}

const savedPosition = useLocalStorage('judou-floating-avatar-position', getDefaultPosition())

// 使用 VueUse 的 useDraggable
const { x, y, isDragging } = useDraggable(buttonRef, {
  initialValue: savedPosition.value,
  // 拖動時更新位置
  onEnd: () => {
    // 手動檢查邊界約束
    const buttonSize = 64
    if (typeof window !== 'undefined') {
      if (x.value > window.innerWidth - buttonSize) {
        x.value = window.innerWidth - buttonSize
      }
      if (y.value > window.innerHeight - buttonSize) {
        y.value = window.innerHeight - buttonSize
      }
      if (x.value < 0) x.value = 0
      if (y.value < 0) y.value = 0
    }
    savedPosition.value = { x: x.value, y: y.value }
    emit('update:position', x.value, y.value)
  }
})

// 監聽位置變化，手動檢查邊界並通知父組件
watch([x, y], ([newX, newY]) => {
  const buttonSize = 64
  if (typeof window !== 'undefined') {
    if (newX > window.innerWidth - buttonSize) {
      x.value = window.innerWidth - buttonSize
    }
    if (newY > window.innerHeight - buttonSize) {
      y.value = window.innerHeight - buttonSize
    }
    if (newX < 0) x.value = 0
    if (newY < 0) y.value = 0
  }
  emit('update:position', x.value, y.value)
}, { immediate: true })

// 長按計時器（用於區分點擊和拖動）
const longPressTimer = ref<number | null>(null)
const longPressDelay = 200 // 200ms 後進入拖動模式
const isLongPressing = ref(false)

// 處理觸摸開始
function handleTouchStart() {
  isLongPressing.value = false
  longPressTimer.value = window.setTimeout(() => {
    isLongPressing.value = true
  }, longPressDelay)
}

// 處理觸摸結束
function handleTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // 如果不是長按，且沒有拖動，則觸發點擊
  if (!isLongPressing.value && !isDragging.value) {
    handleClick()
  }
  
  isLongPressing.value = false
}

// 處理點擊（桌面端）
function handleClick() {
  if (!isDragging.value) {
    emit('toggle-menu')
  }
}

// 處理頭像點擊（跳轉到個人頁面）
function handleAvatarClick(e: Event) {
  e.stopPropagation()
  emit('avatar-click')
}

// 處理視窗大小變化
function handleResize() {
  if (typeof window === 'undefined') return
  // 確保按鈕不會超出視窗
  const buttonSize = 64
  if (x.value > window.innerWidth - buttonSize) {
    x.value = window.innerWidth - buttonSize
  }
  if (y.value > window.innerHeight - buttonSize) {
    y.value = window.innerHeight - buttonSize
  }
  if (x.value < 0) x.value = 0
  if (y.value < 0) y.value = 0
  savedPosition.value = { x: x.value, y: y.value }
  emit('update:position', x.value, y.value)
}

// 監聽視窗大小變化，調整位置
onMounted(() => {
  if (typeof window !== 'undefined') {
    // 初始位置通知
    emit('update:position', x.value, y.value)
    window.addEventListener('resize', handleResize)
  }
})

// 清理事件監聽器
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
  // 清理長按計時器
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
})

// 按鈕樣式（手動構建，不使用 useDraggable 的 style）
const buttonStyle = computed(() => {
  return {
    position: 'fixed' as const,
    left: `${x.value}px`,
    top: `${y.value}px`,
    zIndex: 1000,
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    cursor: (isDragging.value ? 'grabbing' : 'grab') as 'grabbing' | 'grab',
    transition: isDragging.value ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
    transform: props.isMenuOpen ? 'scale(1.1) rotate(45deg)' : 'scale(1)',
    boxShadow: isDragging.value
      ? '0 8px 24px rgba(0, 0, 0, 0.3)'
      : '0 4px 16px rgba(0, 0, 0, 0.2)'
  }
})
</script>

<template>
  <div
    ref="buttonRef"
    :style="buttonStyle"
    class="floating-avatar-button"
    :class="{
      'is-dragging': isDragging,
      'is-menu-open': isMenuOpen,
      'is-long-pressing': isLongPressing
    }"
    @click="handleClick"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- 已登入：顯示用戶頭像 -->
    <div
      v-if="authStore.isAuthenticated"
      class="avatar-wrapper"
      @click="handleAvatarClick"
    >
      <UserAvatar
        :src="avatarStore.currentAvatarUrl || authStore.avatarUrl"
        :size="64"
        :alt="authStore.displayName || '用戶'"
      />
      <!-- 拖動指示器 -->
      <div v-if="isDragging" class="drag-indicator">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="9" r="1"/>
          <circle cx="15" cy="9" r="1"/>
          <circle cx="9" cy="15" r="1"/>
          <circle cx="15" cy="15" r="1"/>
        </svg>
      </div>
    </div>
    
    <!-- 未登入：顯示登入圖標 -->
    <div v-else class="login-icon" @click.stop="handleClick">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.floating-avatar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border: 3px solid rgba(111, 150, 56, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.floating-avatar-button:active {
  transform: scale(0.95);
}

.floating-avatar-button.is-dragging {
  opacity: 0.9;
}

.floating-avatar-button.is-menu-open {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: rgba(34, 197, 94, 0.5);
}

.avatar-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.drag-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  pointer-events: none;
}

.login-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6f9638;
  cursor: pointer;
}

/* 減少動畫（用戶偏好） */
@media (prefers-reduced-motion: reduce) {
  .floating-avatar-button {
    transition: none;
  }
}
</style>

