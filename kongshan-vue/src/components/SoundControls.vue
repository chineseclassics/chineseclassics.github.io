<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  soundMixer: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

// 狀態
const masterVolume = ref(100)
const trackVolumes = ref({})

// 計算屬性
const isPlaying = computed(() => props.soundMixer?.getIsPlaying() || false)
const tracks = computed(() => props.soundMixer?.getTracks() || [])

// 初始化音量值
tracks.value.forEach(track => {
  trackVolumes.value[track.soundEffect.id] = Math.round(track.volume * 100)
})

// 播放/暫停
const togglePlayPause = async () => {
  if (isPlaying.value) {
    props.soundMixer.stopAll()
  } else {
    await props.soundMixer.playAll()
  }
}

// 設置主音量
const handleMasterVolumeChange = (e) => {
  const value = parseFloat(e.target.value) / 100
  masterVolume.value = e.target.value
  props.soundMixer.setMasterVolume(value)
}

// 設置軌道音量
const handleTrackVolumeChange = (trackId, e) => {
  const value = parseFloat(e.target.value) / 100
  trackVolumes.value[trackId] = e.target.value
  props.soundMixer.setTrackVolume(trackId, value)
}
</script>

<template>
  <div class="sound-controls">
    <!-- 主控制 -->
    <div class="main-controls">
      <!-- 播放/暫停按鈕 -->
      <button 
        class="control-btn play-pause-btn" 
        aria-label="播放/暫停"
        @click="togglePlayPause"
      >
        <svg v-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      </button>

      <!-- 主音量控制 -->
      <div class="volume-control">
        <label class="volume-label">主音量</label>
        <input 
          type="range" 
          class="volume-slider" 
          min="0" 
          max="100" 
          :value="masterVolume"
          @input="handleMasterVolumeChange"
        />
        <span class="volume-value">{{ masterVolume }}%</span>
      </div>
    </div>

    <!-- 音效軌道列表 -->
    <div v-if="tracks.length > 0" class="tracks-list">
      <div 
        v-for="track in tracks" 
        :key="track.soundEffect.id"
        class="track-control"
      >
        <div class="track-name">{{ track.soundEffect.name }}</div>
        <div class="volume-control">
          <label class="volume-label">音量</label>
          <input 
            type="range" 
            class="volume-slider" 
            min="0" 
            max="100" 
            :value="trackVolumes[track.soundEffect.id] || 100"
            @input="(e) => handleTrackVolumeChange(track.soundEffect.id, e)"
          />
          <span class="volume-value">{{ trackVolumes[track.soundEffect.id] || 100 }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 CSS 中的 sound-controls.css */
</style>

