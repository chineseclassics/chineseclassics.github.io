<!--
  放射狀菜單組件
  從中心點（頭像按鈕）向外放射展開功能按鈕
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Component } from 'vue'
import BeanIcon from '@/components/common/BeanIcon.vue'

// 圖標類型
type IconType = 'bean' | 'lucide' | 'emoji'

export interface RadialMenuItem {
  label: string
  icon?: Component | string
  iconType?: IconType
  to?: { name: string }
  disabled?: boolean
  description?: string
  teacherOnly?: boolean
  superAdminOnly?: boolean
}

const props = defineProps<{
  // 是否展開
  isOpen: boolean
  // 菜單項列表
  items: RadialMenuItem[]
  // 中心點位置（頭像按鈕的位置）
  centerX: number
  centerY: number
  // 半徑（按鈕距離中心的距離）
  radius?: number
}>()

const emit = defineEmits<{
  'close': []
  'item-click': [item: RadialMenuItem]
}>()

const router = useRouter()
const route = useRoute()

// 默認半徑
const radius = computed(() => props.radius || 100)

// 計算每個按鈕的樣式（參考 vue-radial-menu 的實現方式）
// 使用 Math.cos() 和 Math.sin() 計算 left 和 top 位置，更簡單直接
const menuItemsWithStyle = computed(() => {
  const items = props.items
  const count = items.length
  
  // 如果沒有項目，返回空數組
  if (count === 0) return []
  
  // 扇形角度範圍：從右下角向左上方展開（90度象限）
  // 起始角度：-90度（正上方，12點鐘方向）
  // 結束角度：-180度（正左方，9點鐘方向）
  // 總角度：90度
  // 這樣會從上方開始，逆時針向左方展開，形成向左上方的扇形
  const startAngleDeg = -90 // -90度（正上方）
  const endAngleDeg = -180 // -180度（正左方）
  const totalAngleDeg = Math.abs(endAngleDeg - startAngleDeg) // 90度
  
  // 按鈕大小
  const itemSize = 56
  
  // 如果只有一個項目，放在中間位置（-135度，左上方向）
  if (count === 1) {
    const item = items[0]
    if (!item) return []
    const angleDeg = -135 // -135度（左上方）
    const angleRad = (angleDeg * Math.PI) / 180
    // 計算位置：從中心點 (0, 0) 開始
    const left = Math.cos(angleRad) * radius.value - itemSize / 2
    const top = Math.sin(angleRad) * radius.value - itemSize / 2
    
    return [{
      ...item,
      left,
      top,
      angle: angleDeg,
      index: 0,
      total: 1,
      itemSize
    }]
  }
  
  // 計算每個項目的樣式（參考 vue-radial-menu 的計算方式）
  const result = items.map((item, index) => {
    // 均勻分佈在90度圓弧上
    // 第一個項目在上（-90度），最後一個項目在左（-180度）
    const angleStepDeg = count > 1 ? totalAngleDeg / (count - 1) : 0
    const angleDeg = startAngleDeg - (index * angleStepDeg) // 從 -90 度開始，向負方向（逆時針）展開到 -180 度
    const angleRad = (angleDeg * Math.PI) / 180
    
    // 使用 Math.cos() 和 Math.sin() 計算位置（參考 vue-radial-menu）
    // 從中心點 (0, 0) 開始計算，然後減去 itemSize/2 來居中按鈕
    const left = Math.cos(angleRad) * radius.value - itemSize / 2
    const top = Math.sin(angleRad) * radius.value - itemSize / 2
    
    return {
      ...item,
      left,
      top,
      angle: angleDeg,
      index,
      total: count,
      itemSize
    }
  })
  
  return result
})

// 檢查當前路由是否激活
const isActive = (item: RadialMenuItem) => {
  if (!item.to) return false
  return route.name === item.to.name
}

// 處理菜單項點擊
function handleItemClick(item: RadialMenuItem) {
  if (item.disabled) return
  
  // 先觸發 item-click 事件，讓父組件處理（如"更多"、"返回"按鈕）
  emit('item-click', item)
  
  // 如果有路由，跳轉並關閉菜單
  if (item.to) {
    emit('close')
    setTimeout(() => {
      router.push(item.to!)
    }, 200)
  }
  // 如果沒有路由（如"更多"、"返回"），不關閉菜單，只切換頁面
}

// 處理遮罩點擊（關閉菜單）
function handleOverlayClick() {
  emit('close')
}

// 遮罩層樣式
const overlayStyle = computed(() => ({
  position: 'fixed' as const,
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  zIndex: 999,
  opacity: props.isOpen ? 1 : 0,
  pointerEvents: (props.isOpen ? 'auto' : 'none') as 'auto' | 'none',
  transition: 'opacity 0.3s ease'
}))

// 菜單容器樣式（以中心點為基準）
const menuStyle = computed(() => {
  const style = {
    position: 'fixed' as const,
    left: `${props.centerX}px`,
    top: `${props.centerY}px`,
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    pointerEvents: (props.isOpen ? 'auto' : 'none') as 'auto' | 'none'
  }
  return style
})
</script>

<template>
  <!-- 遮罩層 -->
  <div
    :style="overlayStyle"
    class="radial-menu-overlay"
    @click="handleOverlayClick"
  />
  
  <!-- 菜單容器 -->
  <div
    v-show="isOpen"
    :style="menuStyle"
    class="radial-menu-container"
  >
    <TransitionGroup
      v-if="isOpen && menuItemsWithStyle.length > 0"
      name="radial-item"
      tag="div"
      class="radial-menu-items"
    >
      <button
        v-for="(item, index) in menuItemsWithStyle"
        :key="`${item.label}-${index}`"
        :class="[
          'radial-menu-item',
          {
            'is-active': isActive(item),
            'is-disabled': item.disabled
          }
        ]"
        :style="{
          left: `${item.left}px`,
          top: `${item.top}px`,
          width: `${item.itemSize}px`,
          height: `${item.itemSize}px`,
          '--index': item.index,
          '--total': item.total,
          '--angle': `${item.angle}deg`
        }"
        :disabled="item.disabled"
        @click="handleItemClick(item)"
      >
        <!-- 圖標 -->
        <span class="item-icon">
          <BeanIcon v-if="item.iconType === 'bean'" :size="24" />
          <component
            v-else-if="item.iconType === 'lucide' && item.icon"
            :is="item.icon"
            :size="24"
            :stroke-width="2"
            class="lucide-icon"
          />
          <template v-else-if="item.icon">{{ item.icon }}</template>
        </span>
        
        <!-- 標籤（懸停時顯示） -->
        <span class="item-label">{{ item.label }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.radial-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 999;
}

.radial-menu-container {
  position: fixed;
  z-index: 1000;
  pointer-events: none; /* 容器本身不攔截點擊，但子元素可以 */
  /* 確保容器可見 */
  visibility: visible;
  opacity: 1;
}

.radial-menu-items {
  position: relative;
  /* 容器本身在中心點，按鈕的 left 和 top 是相對於這個容器的 */
  /* width 和 height 為 0，但按鈕可以超出容器範圍 */
  width: 0;
  height: 0;
  /* 確保容器可見 */
  visibility: visible;
}

.radial-menu-item {
  position: absolute;
  /* 按鈕位置：使用 left 和 top 直接定位（參考 vue-radial-menu） */
  /* left 和 top 在 :style 中動態設置，已經計算好居中位置 */
  /* 確保按鈕可見 */
  visibility: visible !important;
  
  /* width 和 height 在 :style 中動態設置 */
  /* 默認值，會被 :style 覆蓋 */
  width: 56px;
  height: 56px;
  
  /* 注意：left 和 top 在 :style 中動態設置，不要在這裡設置，避免覆蓋 */
  border-radius: 50%;
  border: 2px solid rgba(111, 150, 56, 0.3);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(239, 246, 229, 0.9) 100%
  );
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  
  /* 確保按鈕可見（動畫會覆蓋這個） */
  opacity: 1 !important; /* 強制可見，動畫會覆蓋 */
  pointer-events: auto;
  z-index: 1001; /* 確保按鈕在遮罩層之上 */
  visibility: visible !important; /* 確保可見 */
}

.radial-menu-item:hover {
  /* 懸停時放大 */
  transform: scale(1.1);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 1) 0%,
    rgba(220, 252, 231, 0.95) 100%
  );
  border-color: rgba(34, 197, 94, 0.5);
  box-shadow: 
    0 6px 20px rgba(34, 197, 94, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.radial-menu-item:active {
  /* 點擊時縮小 */
  transform: scale(0.95);
}

.radial-menu-item.is-active {
  background: linear-gradient(
    135deg,
    rgba(220, 252, 231, 1) 0%,
    rgba(187, 247, 208, 1) 100%
  );
  border-color: rgba(34, 197, 94, 0.6);
  box-shadow: 
    0 4px 16px rgba(34, 197, 94, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.radial-menu-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6f9638;
  transition: color 0.2s ease;
}

.radial-menu-item:hover .item-icon {
  color: #22c55e;
}

.item-icon .lucide-icon {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

.item-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #6f9638;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.2s ease;
  pointer-events: none;
  position: absolute;
  bottom: -24px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  white-space: nowrap;
}

.radial-menu-item:hover .item-label {
  opacity: 1;
  transform: translateY(0);
}

/* 展開動畫 */
.radial-item-enter-active {
  /* 只過渡 opacity 和 transform，不過渡 left 和 top（位置應該立即生效） */
  transition: opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* 單層排列，按順序出現 */
  transition-delay: calc(var(--index) * 0.05s);
}

.radial-item-enter-from {
  opacity: 0;
  /* 初始狀態：縮小（只影響 scale，不影響位置） */
  transform: scale(0);
  /* 注意：不設置 left 和 top，讓 :style 中的值生效 */
  /* 內聯樣式的優先級已經最高，不需要 !important */
}

.radial-item-enter-to {
  opacity: 1;
  /* 結束狀態：恢復正常大小（只影響 scale，不影響位置） */
  transform: scale(1);
  /* 注意：不設置 left 和 top，讓 :style 中的值生效 */
  /* 內聯樣式的優先級已經最高，不需要 !important */
}

/* 收合動畫 */
.radial-item-leave-active {
  /* 只過渡 opacity 和 transform，不過渡 left 和 top（位置保持不變直到消失） */
  transition: opacity 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19), transform 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19);
  /* 按倒序消失 */
  transition-delay: calc((var(--total) - var(--index)) * 0.03s);
}

.radial-item-leave-from {
  opacity: 1;
  /* 使用實際的 transform（在 :style 中設置） */
}

.radial-item-leave-to {
  opacity: 0;
  /* 收合時：縮小（只影響 scale，不影響位置） */
  transform: scale(0);
  /* 注意：不設置 left 和 top，保持原有位置直到消失 */
  /* 內聯樣式的優先級已經最高，不需要 !important */
}

/* 減少動畫（用戶偏好） */
@media (prefers-reduced-motion: reduce) {
  .radial-menu-item,
  .radial-item-enter-active,
  .radial-item-leave-active {
    transition: none;
  }
  
  .radial-menu-item {
    opacity: 1;
    transform: scale(1);
    /* 注意：不設置 left 和 top，讓 :style 中的值生效 */
  }
}
</style>

