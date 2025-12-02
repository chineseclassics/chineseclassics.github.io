<!--
  句豆 - 隊伍徽章顯示組件
  
  用於顯示隊伍的豆製品徽章圖標
-->

<template>
  <div
    class="team-badge"
    :class="{ clickable }"
    :style="badgeStyle"
    @click="handleClick"
  >
    <img
      v-if="badgeUrl"
      :src="badgeUrl"
      :alt="productName"
      class="badge-img"
    />
    <div v-else class="badge-fallback">
      <span class="fallback-text">{{ productName?.charAt(0) || '?' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getBeanProductBadgeUrl, getTeamBeanProductName, type BeanProductType } from '@/types/game'

const props = withDefaults(defineProps<{
  // 豆製品類型
  productType: BeanProductType
  // 徽章大小 (px 或 CSS 單位)
  size?: number | string
  // 是否可點擊
  clickable?: boolean
}>(), {
  size: 40,
  clickable: false
})

const emit = defineEmits<{
  click: []
}>()

// 徽章 URL
const badgeUrl = computed(() => {
  try {
    return getBeanProductBadgeUrl(props.productType)
  } catch {
    return null
  }
})

// 產品名稱
const productName = computed(() => getTeamBeanProductName(props.productType))

// 尺寸樣式
const badgeStyle = computed(() => {
  const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: sizeValue,
    height: sizeValue,
    minWidth: sizeValue,
    minHeight: sizeValue
  }
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.team-badge {
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.team-badge.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.team-badge.clickable:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.badge-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.badge-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-200), var(--color-primary-300));
}

.fallback-text {
  font-size: 0.6em;
  font-weight: 700;
  color: var(--color-primary-700);
  user-select: none;
}
</style>
