<template>
  <div class="wired-textarea-wrapper">
    <label v-if="label" class="wired-textarea-label">{{ label }}</label>
    <wired-textarea
      :modelValue="modelValue"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :rows="rows"
      :class="['wired-textarea', textareaClass]"
      @input="handleInput"
      @change="handleChange"
    />
    <div v-if="hint" class="wired-textarea-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  maxlength?: number
  rows?: number
  hint?: string
  variant?: 'default' | 'primary'
}>(), {
  rows: 4,
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [event: Event]
  change: [event: Event]
}>()

const textareaClass = computed(() => {
  return {
    'wired-textarea-primary': props.variant === 'primary',
  }
})

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

function handleChange(event: Event) {
  emit('change', event)
}

// Wired Elements 會自動處理更新，無需手動調用 requestUpdate
// 移除 onMounted 中的 requestUpdate 調用以避免無限遞歸
</script>

<style scoped>
.wired-textarea-wrapper {
  width: 100%;
}

.wired-textarea-label {
  display: block;
  margin-bottom: 0.5rem;
  font-family: var(--font-body, 'LXGW WenKai TC');
  font-size: 0.9rem;
  color: var(--text-primary, #2C2416);
  font-weight: 500;
}

wired-textarea {
  --wired-input-focus-color: var(--color-secondary, #6BAFB2);
  width: 100%;
  font-family: var(--font-body, 'LXGW WenKai TC');
  font-size: 1rem;
  padding: 0.5rem;
  color: var(--text-primary, #2C2416);
  resize: vertical;
  min-height: 100px;
}

wired-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wired-textarea-primary {
  --wired-input-focus-color: var(--color-primary, #E07B67);
}

.wired-textarea-hint {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-secondary, #5C4A37);
  font-family: var(--font-body, 'LXGW WenKai TC');
}
</style>

