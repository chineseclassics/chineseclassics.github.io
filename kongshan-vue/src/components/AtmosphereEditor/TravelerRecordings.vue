<script setup>
/**
 * 旅人錄音列表組件
 * 顯示已發布的旅人錄音，支持分頁和選擇
 */
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../../stores/editor'
import SoundCard from './SoundCard.vue'
import Pagination from './Pagination.vue'

const store = useEditorStore()
const {
  travelerRecordingsLoading,
  travelerRecordingsPage,
  travelerRecordingsTotalPages,
  paginatedTravelerRecordings,
} = storeToRefs(store)

const handleRecordingClick = (recording) => {
  const success = store.toggleSoundSelection(recording)
  if (!success) {
    console.warn('已達到最大音效數量限制')
  }
}
</script>

<template>
  <div id="traveler-recordings-selector" class="sound-selector" style="margin-bottom: 12px;">
    <!-- 加載中 -->
    <div v-if="travelerRecordingsLoading" class="loading-text">
      加載旅人錄音...
    </div>
    
    <!-- 空狀態 -->
    <div v-else-if="paginatedTravelerRecordings.length === 0" class="empty-state">
      暫無已發布錄音
    </div>
    
    <!-- 錄音列表 -->
    <SoundCard
      v-else
      v-for="recording in paginatedTravelerRecordings"
      :key="recording.id"
      :sound="recording"
      :selected="store.isSoundSelected(recording.id)"
      @click="handleRecordingClick"
    />
  </div>
  
  <!-- 分頁 -->
  <Pagination
    v-model:current-page="travelerRecordingsPage"
    :total-pages="travelerRecordingsTotalPages"
  />
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>

