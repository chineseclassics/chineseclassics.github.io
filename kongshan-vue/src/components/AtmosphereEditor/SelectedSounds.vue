<script setup>
/**
 * 已選音效列表組件
 * 顯示已選擇的音效，支持音量調節、循環開關和移除
 */
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../../stores/editor'

const store = useEditorStore()
const { selectedSounds } = storeToRefs(store)

// 處理音量變化
const handleVolumeChange = (index, event) => {
  const value = parseFloat(event.target.value) / 100
  store.updateSoundVolume(index, value)
}

// 處理循環切換
const handleLoopToggle = (index) => {
  store.toggleSoundLoop(index)
}

// 處理移除
const handleRemove = (index) => {
  store.removeSelectedSound(index)
}
</script>

<template>
  <div class="editor-section">
    <label class="editor-label">已選音效</label>
    <div id="selected-sounds" class="selected-sounds">
      <!-- 空狀態 -->
      <div v-if="selectedSounds.length === 0" class="empty-state">
        尚未選擇音效
      </div>

      <!-- 已選音效列表 -->
      <div
        v-for="(sound, index) in selectedSounds"
        v-else
        :key="sound.id"
        class="selected-sound-item"
        :data-sound-id="sound.id"
        :data-file-url="sound.file_url"
        :data-source-type="sound.sourceType"
      >
        <!-- 第一行：名稱和移除按鈕 -->
        <div class="sound-item-header">
          <span class="sound-item-name">{{ sound.display_name || sound.name }}</span>
          <button
            class="sound-item-remove"
            type="button"
            aria-label="移除音效"
            @click="handleRemove(index)"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <!-- 第二行：音量控制和循環按鈕 -->
        <div class="sound-item-controls">
          <span class="volume-label">音量</span>
          <input
            type="range"
            class="volume-slider"
            min="0"
            max="100"
            :value="Math.round(sound.volume * 100)"
            @input="handleVolumeChange(index, $event)"
          />
          <span class="volume-value">{{ Math.round(sound.volume * 100) }}%</span>
          <label class="loop-checkbox" :title="sound.loop ? '循環播放' : '單次播放'">
            <input
              type="checkbox"
              :checked="sound.loop"
              @change="handleLoopToggle(index)"
            />
            <span class="loop-icon">
              <i :class="sound.loop ? 'fas fa-sync-alt' : 'fas fa-redo'" aria-hidden="true"></i>
            </span>
            <span class="sr-only">{{ sound.loop ? '循環播放' : '單次播放' }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>
