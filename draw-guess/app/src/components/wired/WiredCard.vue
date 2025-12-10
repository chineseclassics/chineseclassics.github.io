<template>
  <wired-card
    :class="['wired-card', cardClass]"
    :elevation="elevation"
  >
    <slot />
  </wired-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  elevation?: number | string
  variant?: 'default' | 'primary' | 'secondary'
}>(), {
  elevation: 2,
  variant: 'default',
})

const cardClass = computed(() => {
  return {
    'wired-card-primary': props.variant === 'primary',
    'wired-card-secondary': props.variant === 'secondary',
  }
})
</script>

<style scoped>
wired-card {
  --wired-card-background: var(--bg-card, #FFFFFF);
  display: block;
  padding: 1.5rem;
  margin: 0;
  font-family: var(--font-body, 'LXGW WenKai TC');
  background-color: var(--bg-card, #FFFFFF);
  border-radius: 8px;
}

.wired-card-primary {
  --wired-card-background: var(--bg-secondary, #F5F1E8);
}

.wired-card-secondary {
  --wired-card-background: var(--bg-secondary, #F5F1E8);
}
</style>

