<template>
  <wired-badge
    :class="['wired-badge', badgeClass]"
  >
    <slot />
  </wired-badge>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}>(), {
  variant: 'default',
})

const badgeClass = computed(() => {
  return {
    'wired-badge-primary': props.variant === 'primary',
    'wired-badge-secondary': props.variant === 'secondary',
    'wired-badge-success': props.variant === 'success',
    'wired-badge-warning': props.variant === 'warning',
    'wired-badge-danger': props.variant === 'danger',
  }
})
</script>

<style scoped>
wired-badge {
  font-family: var(--font-body, 'LXGW WenKai TC');
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
}

.wired-badge-primary {
  background-color: var(--color-primary, #E07B67);
  color: white;
}

.wired-badge-secondary {
  background-color: var(--color-secondary, #6BAFB2);
  color: white;
}

.wired-badge-success {
  background-color: var(--color-success, #8DC26F);
  color: white;
}

.wired-badge-warning {
  background-color: var(--color-warning, #F0C078);
  color: var(--text-primary, #2C2416);
}

.wired-badge-danger {
  background-color: var(--color-danger, #D46A6A);
  color: white;
}
</style>

