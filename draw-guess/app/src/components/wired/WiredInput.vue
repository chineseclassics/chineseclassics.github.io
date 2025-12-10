<template>
  <div class="wired-input-wrapper">
    <label v-if="label" class="wired-input-label">{{ label }}</label>
    <wired-input
      :modelValue="modelValue"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :type="type"
      :class="['wired-input', inputClass]"
      @input="handleInput"
      @change="handleChange"
    />
    <div v-if="hint" class="wired-input-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string | number
  label?: string
  placeholder?: string
  disabled?: boolean
  maxlength?: number
  type?: 'text' | 'email' | 'password' | 'number'
  hint?: string
  variant?: 'default' | 'primary'
}>(), {
  type: 'text',
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [event: Event]
  change: [event: Event]
}>()

const inputClass = computed(() => {
  return {
    'wired-input-primary': props.variant === 'primary',
  }
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value
  // 如果是數字類型，嘗試轉換為數字（但保留字符串以便 v-model 綁定）
  if (props.type === 'number') {
    // 允許空字符串或數字字符串
    if (value === '' || !isNaN(Number(value))) {
      emit('update:modelValue', value)
    }
  } else {
    emit('update:modelValue', value)
  }
  emit('input', event)
}

function handleChange(event: Event) {
  emit('change', event)
}

// Wired Elements 會自動處理更新，無需手動調用 requestUpdate
// 移除 onMounted 中的 requestUpdate 調用以避免無限遞歸
</script>

<style scoped>
.wired-input-wrapper {
  width: 100%;
}

.wired-input-label {
  display: block;
  margin-bottom: 0.5rem;
  font-family: var(--font-body, 'LXGW WenKai TC');
  font-size: 0.9rem;
  color: var(--text-primary, #2C2416);
  font-weight: 500;
}

wired-input {
  --wired-input-focus-color: var(--color-secondary, #6BAFB2);
  width: 100%;
  font-family: var(--font-body, 'LXGW WenKai TC');
  font-size: 1rem;
  padding: 0.5rem;
  color: var(--text-primary, #2C2416);
}

wired-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wired-input-primary {
  --wired-input-focus-color: var(--color-primary, #E07B67);
}

.wired-input-hint {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-secondary, #5C4A37);
  font-family: var(--font-body, 'LXGW WenKai TC');
}
</style>

