<!--
  句豆 - 通用模態框組件
  
  毛玻璃風格的彈窗組件，符合句豆 UI 設計系統
  
  用法：
  <BaseModal v-model="showModal" title="標題" icon="🫛">
    <template #stats>統計信息</template>
    內容...
  </BaseModal>
-->

<template>
  <Teleport to="body">
    <Transition name="judou-modal">
      <div 
        v-if="modelValue" 
        class="judou-modal-overlay"
        @click.self="handleOverlayClick"
      >
        <div 
          class="judou-modal-content"
          :class="[sizeClass, { 'bottom-sheet': bottomSheet }]"
          :style="customStyle"
        >
          <!-- 標題欄 -->
          <div v-if="title || $slots.header" class="judou-modal-header">
            <slot name="header">
              <h2 class="judou-modal-title">
                <span v-if="icon" class="title-icon">{{ icon }}</span>
                {{ title }}
              </h2>
            </slot>
            <button 
              v-if="closable" 
              class="judou-modal-close" 
              @click="close"
              aria-label="關閉"
            >
              ×
            </button>
          </div>

          <!-- 統計欄（可選） -->
          <div v-if="$slots.stats" class="judou-modal-stats">
            <slot name="stats" />
          </div>

          <!-- 主要內容 -->
          <div class="judou-modal-body" :class="{ 'no-padding': noPadding }">
            <slot />
          </div>

          <!-- 底部操作（可選） -->
          <div v-if="$slots.footer" class="judou-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  icon?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnOverlay?: boolean
  bottomSheet?: boolean
  noPadding?: boolean
  maxWidth?: string
  maxHeight?: string
}>(), {
  title: '',
  icon: '',
  size: 'md',
  closable: true,
  closeOnOverlay: true,
  bottomSheet: false,
  noPadding: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const sizeClass = computed(() => `size-${props.size}`)

const customStyle = computed(() => ({
  maxWidth: props.maxWidth || undefined,
  maxHeight: props.maxHeight || undefined
}))

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close()
  }
}

// 暴露方法
defineExpose({ close })
</script>

<style scoped>
/* =====================================================
   句豆通用模態框 - 毛玻璃風格
   ===================================================== */

.judou-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(58, 80, 32, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.judou-modal-content {
  /* 毛玻璃效果 */
  background: linear-gradient(
    145deg,
    rgba(248, 250, 245, 0.95) 0%,
    rgba(239, 246, 229, 0.92) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 178, 79, 0.2);
  border-radius: 1.5rem;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 8px 32px rgba(58, 80, 32, 0.15),
    0 2px 8px rgba(139, 178, 79, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* 尺寸變體 */
.size-sm { max-width: 360px; }
.size-md { max-width: 480px; }
.size-lg { max-width: 600px; }
.size-xl { max-width: 800px; }
.size-full { max-width: 95vw; max-height: 95vh; }

/* 底部彈出樣式（移動端） */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 100%;
  max-height: 90vh;
  border-radius: 1.5rem 1.5rem 0 0;
  margin: 0;
}

/* =====================================================
   標題欄
   ===================================================== */
.judou-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(139, 178, 79, 0.15);
  background: linear-gradient(
    180deg,
    rgba(248, 250, 245, 0.98) 0%,
    rgba(248, 250, 245, 0.95) 100%
  );
  flex-shrink: 0;
}

.judou-modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #587a2b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 1.1rem;
}

.judou-modal-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(139, 178, 79, 0.2);
  background: rgba(255, 255, 255, 0.7);
  color: #78716c;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 300;
  flex-shrink: 0;
}

.judou-modal-close:hover {
  background: rgba(139, 178, 79, 0.1);
  color: #587a2b;
  border-color: #8bb24f;
  transform: rotate(90deg);
}

/* =====================================================
   統計欄
   ===================================================== */
.judou-modal-stats {
  padding: 0.875rem 1.5rem;
  background: linear-gradient(90deg, rgba(139, 178, 79, 0.08), rgba(139, 178, 79, 0.03));
  border-bottom: 1px solid rgba(139, 178, 79, 0.1);
  font-size: 0.875rem;
  color: #57534e;
  flex-shrink: 0;
}

/* =====================================================
   內容區
   ===================================================== */
.judou-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

.judou-modal-body.no-padding {
  padding: 0;
}

/* 滾動條美化 */
.judou-modal-body::-webkit-scrollbar {
  width: 6px;
}

.judou-modal-body::-webkit-scrollbar-track {
  background: rgba(139, 178, 79, 0.05);
  border-radius: 3px;
}

.judou-modal-body::-webkit-scrollbar-thumb {
  background: rgba(139, 178, 79, 0.3);
  border-radius: 3px;
}

.judou-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 178, 79, 0.5);
}

/* =====================================================
   底部操作
   ===================================================== */
.judou-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(139, 178, 79, 0.15);
  background: rgba(248, 250, 245, 0.8);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}

/* =====================================================
   動畫
   ===================================================== */
.judou-modal-enter-active,
.judou-modal-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.judou-modal-enter-from,
.judou-modal-leave-to {
  opacity: 0;
}

.judou-modal-enter-from .judou-modal-content,
.judou-modal-leave-to .judou-modal-content {
  transform: scale(0.92) translateY(30px);
  opacity: 0;
}

.judou-modal-enter-active .judou-modal-content,
.judou-modal-leave-active .judou-modal-content {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 底部彈出動畫 */
.bottom-sheet.judou-modal-enter-from,
.bottom-sheet.judou-modal-leave-to {
  transform: translateY(100%);
}

/* =====================================================
   響應式
   ===================================================== */
@media (max-width: 640px) {
  .judou-modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .judou-modal-content:not(.bottom-sheet) {
    max-height: 90vh;
    border-radius: 1.5rem 1.5rem 0 0;
    margin-top: auto;
  }

  .judou-modal-header {
    padding: 1rem 1.25rem;
  }

  .judou-modal-body {
    padding: 1rem 1.25rem;
  }

  .judou-modal-footer {
    padding: 0.875rem 1.25rem;
  }
}
</style>

