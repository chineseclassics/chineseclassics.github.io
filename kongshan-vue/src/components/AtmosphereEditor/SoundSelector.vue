<script setup>
/**
 * 音效選擇器組件
 * 顯示系統音效列表，支持分頁和選擇
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../../stores/editor'
import SoundCard from './SoundCard.vue'
import Pagination from './Pagination.vue'

const store = useEditorStore()
const {
  systemSoundsLoading,
  systemSoundsPage,
  systemSoundsTotalPages,
  paginatedSystemSounds,
} = storeToRefs(store)

const handleSoundClick = (sound) => {
  const success = store.toggleSoundSelection(sound)
  if (!success) {
    // 已達上限，可以顯示提示
    console.warn('已達到最大音效數量限制')
  }
}
</script>

<template>
  <div class="editor-section">
    <label class="editor-label">
      空山音效
      <span class="editor-hint">最多選擇 5 個</span>
    </label>
    
    <div id="sound-selector" class="sound-selector">
      <!-- 加載中 -->
      <div v-if="systemSoundsLoading" class="loading-text">
        加載音效庫...
      </div>
      
      <!-- 空狀態 -->
      <div v-else-if="paginatedSystemSounds.length === 0" class="empty-state">
        暫無可用音效
      </div>
      
      <!-- 音效列表 -->
      <SoundCard
        v-else
        v-for="sound in paginatedSystemSounds"
        :key="sound.id"
        :sound="sound"
        :selected="store.isSoundSelected(sound.id)"
        @click="handleSoundClick"
      />
    </div>
    
    <!-- 分頁 -->
    <Pagination
      v-model:current-page="systemSoundsPage"
      :total-pages="systemSoundsTotalPages"
    />
  </div>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>

