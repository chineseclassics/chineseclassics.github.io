<!--
  浮動頭像按鈕（固定位置）
  移動端使用，點擊後展開放射狀菜單
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useAvatarStore } from '@/stores/avatarStore'
import UserAvatar from '@/components/avatar/UserAvatar.vue'

const props = defineProps<{
  // 是否展開菜單
  isMenuOpen: boolean
}>()

const emit = defineEmits<{
  'toggle-menu': []
  'avatar-click': []
}>()

const authStore = useAuthStore()
const avatarStore = useAvatarStore()

// 防止重複觸發
const lastTouchTime = ref(0)
const TOUCH_DELAY = 300 // 300ms 內不重複觸發

// 處理點擊（切換菜單）
function handleClick(e: Event) {
  e.stopPropagation()
  e.preventDefault()
  
  // 防止快速重複點擊
  const now = Date.now()
  if (now - lastTouchTime.value < TOUCH_DELAY) {
    return
  }
  lastTouchTime.value = now
  
  console.log('[FloatingAvatarButton] 點擊觸發，當前 isMenuOpen:', props.isMenuOpen)
  emit('toggle-menu')
}

// 按鈕樣式（固定右下角位置）
const buttonStyle = computed(() => {
  return {
    position: 'fixed' as const,
    right: '20px',
    bottom: '20px',
    zIndex: 1000,
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    // 只改變大小，不旋轉頭像
    transform: props.isMenuOpen ? 'scale(1.1)' : 'scale(1)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
  }
})
</script>

<template>
  <div
    :style="buttonStyle"
    class="floating-avatar-button"
    :class="{
      'is-menu-open': isMenuOpen
    }"
    @click="handleClick"
    @touchstart.prevent="handleClick"
  >
    <!-- 已登入：顯示用戶頭像 -->
    <div
      v-if="authStore.isAuthenticated"
      class="avatar-wrapper"
    >
      <UserAvatar
        :src="avatarStore.currentAvatarUrl || authStore.avatarUrl"
        :size="64"
        :alt="authStore.displayName || '用戶'"
      />
    </div>
    
    <!-- 未登入：顯示登入圖標 -->
    <div v-else class="login-icon">
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
  pointer-events: auto;
  touch-action: auto;
}

.floating-avatar-button:active {
  transform: scale(0.95);
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
