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
}>()

const router = useRouter()
const route = useRoute()

// 默認半徑
const radius = computed(() => props.radius || 100)

// 計算每個按鈕的位置（扇形排列，從右下角向左上方展開）
const menuItemsWithPosition = computed(() => {
  const items = props.items
  const count = items.length
  
  console.log('[RadialMenu] menuItemsWithPosition 計算，count:', count, 'isOpen:', props.isOpen)
  
  // 如果沒有項目，返回空數組
  if (count === 0) return []
  
  // 扇形角度範圍：從右下角向左上方展開（90度象限）
  // 起始角度：-90度（正下方）
  // 結束角度：-180度（正左方）
  // 總角度：90度（四分之一圓，從下到左）
  // 注意：totalAngle 不再需要，因為我們分兩層計算
  
  // 如果只有一個項目，放在左上方（-135度）
  if (count === 1) {
    const item = items[0]
    if (!item) return []
    const angle = -Math.PI * 3 / 4 // -135度（左上方）
    const itemRadius = radius.value * 0.7 // 內層半徑
    return [{
      label: item.label,
      icon: item.icon,
      iconType: item.iconType,
      to: item.to,
      disabled: item.disabled,
      description: item.description,
      teacherOnly: item.teacherOnly,
      superAdminOnly: item.superAdminOnly,
      x: Math.cos(angle) * itemRadius,
      y: Math.sin(angle) * itemRadius,
      angle: (angle * 180) / Math.PI,
      index: 0,
      total: 1,
      layer: 0 // 內層
    }]
  }
  
  // 多個項目：分兩層排列
  // 內層：前一半項目，半徑較小
  // 外層：後一半項目，半徑較大
  const innerLayerCount = Math.ceil(count / 2)
  const outerLayerCount = count - innerLayerCount
  const innerRadius = radius.value * 0.7 // 內層半徑（70%）
  const outerRadius = radius.value * 1.0 // 外層半徑（100%）
  
  return items.map((item, index) => {
    // 判斷屬於哪一層
    const isInnerLayer = index < innerLayerCount
    const layerIndex = isInnerLayer ? index : index - innerLayerCount
    const layerCount = isInnerLayer ? innerLayerCount : outerLayerCount
    const itemRadius = isInnerLayer ? innerRadius : outerRadius
    
    // 計算角度
    // 內層：從 -90度（下）到 -135度（左上方）
    // 外層：從 -135度（左上方）到 -180度（左）
    let angle: number
    if (isInnerLayer) {
      // 內層：從下到左上方
      const innerStartAngle = -Math.PI / 2 // -90度
      const innerEndAngle = -Math.PI * 3 / 4 // -135度
      const innerAngleStep = layerCount > 1 
        ? (innerEndAngle - innerStartAngle) / (layerCount - 1)
        : 0
      angle = innerStartAngle + (layerIndex * innerAngleStep)
    } else {
      // 外層：從左上方到左
      const outerStartAngle = -Math.PI * 3 / 4 // -135度
      const outerEndAngle = -Math.PI // -180度
      const outerAngleStep = layerCount > 1
        ? (outerEndAngle - outerStartAngle) / (layerCount - 1)
        : 0
      angle = outerStartAngle + (layerIndex * outerAngleStep)
    }
    
    const x = Math.cos(angle) * itemRadius
    const y = Math.sin(angle) * itemRadius
    
    return {
      ...item,
      x,
      y,
      angle: (angle * 180) / Math.PI, // 轉換為度數（用於動畫）
      index,
      total: count, // 用於動畫延遲計算
      layer: isInnerLayer ? 0 : 1 // 層級：0=內層，1=外層
    }
  })
})

// 檢查當前路由是否激活
const isActive = (item: RadialMenuItem) => {
  if (!item.to) return false
  return route.name === item.to.name
}

// 處理菜單項點擊
function handleItemClick(item: RadialMenuItem) {
  if (item.disabled || !item.to) return
  
  // 關閉菜單
  emit('close')
  
  // 延遲跳轉，讓關閉動畫先執行
  setTimeout(() => {
    router.push(item.to!)
  }, 200)
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
const menuStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${props.centerX}px`,
  top: `${props.centerY}px`,
  transform: 'translate(-50%, -50%)',
  zIndex: 1000,
  pointerEvents: (props.isOpen ? 'auto' : 'none') as 'auto' | 'none'
}))
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
    v-if="isOpen"
    :style="menuStyle"
    class="radial-menu-container"
  >
    <TransitionGroup
      name="radial-item"
      tag="div"
      class="radial-menu-items"
    >
      <button
        v-for="(item, index) in menuItemsWithPosition"
        :key="`${item.label}-${index}`"
        :class="[
          'radial-menu-item',
          {
            'is-active': isActive(item),
            'is-disabled': item.disabled
          }
        ]"
        :style="{
          '--x': `${item.x}px`,
          '--y': `${item.y}px`,
          '--index': item.index,
          '--total': item.total,
          '--layer': item.layer || 0
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
}

.radial-menu-items {
  position: relative;
  width: 0;
  height: 0;
}

.radial-menu-item {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%);
  
  width: 56px;
  height: 56px;
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
  opacity: 1;
  pointer-events: auto;
  z-index: 1001; /* 確保按鈕在遮罩層之上 */
}

.radial-menu-item:hover {
  transform: translate(-50%, -50%) scale(1.1);
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
  transform: translate(-50%, -50%) scale(0.95);
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
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* 內層先出現，外層後出現，每層內按順序 */
  transition-delay: calc(var(--layer) * 0.1s + var(--index) * 0.05s);
}

.radial-item-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0) rotate(-180deg);
}

.radial-item-enter-to {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) rotate(0deg);
}

/* 收合動畫 */
.radial-item-leave-active {
  transition: all 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19);
  /* 外層先消失，內層後消失，每層內按倒序 */
  transition-delay: calc((1 - var(--layer)) * 0.1s + (var(--total) - var(--index)) * 0.03s);
}

.radial-item-leave-from {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) rotate(0deg);
}

.radial-item-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0) rotate(180deg);
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
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>

