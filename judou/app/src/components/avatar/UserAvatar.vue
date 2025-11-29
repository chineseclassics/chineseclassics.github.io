<!--
  句豆 - 用戶頭像顯示組件
  
  用於在導航、列表等處顯示用戶頭像
-->

<template>
  <div
    class="user-avatar"
    :class="{ clickable }"
    :style="avatarStyle"
    @click="handleClick"
  >
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="alt"
      class="avatar-img"
    />
    <div v-else class="avatar-fallback">
      <BeanIcon :size="fallbackIconSize" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAvatarStore } from '@/stores/avatarStore'
import BeanIcon from '@/components/common/BeanIcon.vue'

const props = withDefaults(defineProps<{
  // 頭像大小 (px 或 CSS 單位)
  size?: number | string
  // 自定義頭像 URL（如果不使用 store）
  src?: string | null
  // alt 文字
  alt?: string
  // 是否可點擊
  clickable?: boolean
}>(), {
  size: 40,
  src: undefined,
  alt: '用戶頭像',
  clickable: false
})

const emit = defineEmits<{
  click: []
}>()

const avatarStore = useAvatarStore()

// 頭像 URL（優先使用 props，否則使用 store）
const avatarUrl = computed(() => {
  if (props.src !== undefined) return props.src
  return avatarStore.currentAvatarUrl
})

// 尺寸樣式
const avatarStyle = computed(() => {
  const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: sizeValue,
    height: sizeValue,
    minWidth: sizeValue,
    minHeight: sizeValue
  }
})

// fallback 圖標大小
const fallbackIconSize = computed(() => {
  const size = typeof props.size === 'number' ? props.size : parseInt(props.size)
  return Math.round(size * 0.5)
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.user-avatar {
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar.clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.user-avatar.clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-500);
}
</style>

