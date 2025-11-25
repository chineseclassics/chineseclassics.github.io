<script setup>
/**
 * 音效卡片組件
 * 用於音效選擇器和旅人錄音列表
 */
defineProps({
  sound: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])
</script>

<template>
  <div
    :class="['sound-card', { selected }]"
    :data-sound-id="sound.id"
    :data-sound-name="sound.name"
    :data-file-url="sound.file_url"
    :data-source-type="sound.sourceType || 'system'"
    :data-recording-path="sound.recordingPath || ''"
    role="button"
    tabindex="0"
    :aria-pressed="selected"
    :aria-label="`選擇音效 ${sound.name}`"
    @click="$emit('click', sound)"
    @keydown.enter="$emit('click', sound)"
    @keydown.space.prevent="$emit('click', sound)"
  >
    <div class="sound-card-name">{{ sound.name }}</div>
    <div class="sound-card-tags">
      <span v-for="tag in sound.tags" :key="tag" class="tag">
        {{ tag }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>

