<script setup lang="ts">
/**
 * 句豆圖標組件
 * 用於顯示豆子/積分的統一圖標
 */

interface Props {
  /** 圖標尺寸 (px) */
  size?: number | string
  /** 是否顯示為內聯元素 */
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 20,
  inline: true
})

// 計算尺寸
const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size
</script>

<template>
  <img
    src="/images/bean-icon.png"
    alt="豆"
    class="bean-icon"
    :class="{ inline }"
    :style="{ width: sizeValue, height: sizeValue }"
  />
</template>

<style scoped>
.bean-icon {
  object-fit: contain;
  vertical-align: middle;
  flex-shrink: 0;
}

.bean-icon.inline {
  display: inline-block;
}
</style>

