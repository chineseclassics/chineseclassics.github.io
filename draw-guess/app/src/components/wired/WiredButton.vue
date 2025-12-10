<template>
  <wired-button
    ref="buttonElement"
    :disabled="disabled"
    :class="['wired-button', buttonClass, { 'wired-button-loading': loading }]"
    :style="buttonStyle"
    @click="handleClick"
  >
    <slot />
  </wired-button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  block?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', event: Event): void
}>()

const buttonElement = ref<HTMLElement | null>(null)

const buttonClass = computed(() => {
  return {
    'wired-button-primary': props.variant === 'primary',
    'wired-button-secondary': props.variant === 'secondary',
    'wired-button-success': props.variant === 'success',
    'wired-button-warning': props.variant === 'warning',
    'wired-button-danger': props.variant === 'danger',
    'wired-button-block': props.block,
  }
})

const buttonStyle = computed(() => {
  return {
    width: props.block ? '100%' : undefined,
  }
})

function handleClick(event: Event) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// Wired Elements 會自動處理更新，無需手動調用 requestUpdate
// 移除 onMounted 中的 requestUpdate 調用以避免無限遞歸
</script>

<style scoped>
.wired-button {
  --wired-button-ink-color: var(--color-primary, #E07B67);
  font-family: var(--font-body, 'LXGW WenKai TC');
  cursor: pointer;
  transition: transform 0.1s ease;
}

.wired-button:hover:not(:disabled) {
  transform: translate(-1px, -1px);
}

.wired-button:active:not(:disabled) {
  transform: translate(1px, 1px);
}

.wired-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 變體樣式 */
.wired-button-primary {
  --wired-button-ink-color: var(--color-primary, #E07B67);
}

.wired-button-secondary {
  --wired-button-ink-color: var(--color-secondary, #6BAFB2);
}

.wired-button-success {
  --wired-button-ink-color: var(--color-success, #8DC26F);
}

.wired-button-warning {
  --wired-button-ink-color: var(--color-warning, #F0C078);
}

.wired-button-danger {
  --wired-button-ink-color: var(--color-danger, #D46A6A);
}

.wired-button-block {
  width: 100%;
}

.wired-button-loading {
  position: relative;
}

.wired-button-loading::after {
  content: '...';
  position: absolute;
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
</style>

