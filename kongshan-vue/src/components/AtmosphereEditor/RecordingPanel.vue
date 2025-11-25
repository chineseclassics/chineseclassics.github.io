<script setup>
/**
 * 錄音面板組件
 * 包含錄音按鈕、計時器、波形編輯（含剪輯拖動標記）、命名和上傳
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useEditorStore, MIN_TRIM_DURATION } from '../../stores/editor'
import { useRecording } from '../../composables/useRecording'
import TravelerRecordings from './TravelerRecordings.vue'
import WaveSurfer from 'wavesurfer.js'

const store = useEditorStore()

const {
  isRecording,
  isSupported,
  formattedTime,
  formattedMaxTime,
  hasRecording,
  recordingUrl,
  recordingBlob,
  recordingDuration,
  recordingMimeType,
  isUploading,
  uploadError,
  locationName,
  isGettingLocation,
  checkSupport,
  startRecording,
  stopRecording,
  uploadRecording,
  getCurrentLocation,
  reset: resetRecording,
} = useRecording()

const emit = defineEmits(['recording-added'])

// 波形圖
const waveformContainer = ref(null)
const waveformWrapper = ref(null)
const trimHandleStart = ref(null)
const trimHandleEnd = ref(null)
const trimSelection = ref(null)
let wavesurfer = null

// 剪輯範圍（秒）
const trimStart = ref(0)
const trimEnd = ref(0)
const totalDuration = ref(0)

// 拖動狀態
let isDragging = null
let previewDebounceTimer = null
let previewTimeout = null
let previewTimeUpdateHandler = null

// 錄音名稱輸入
const nameInput = ref('')
const showNamePanel = ref(false)
const statusMessage = ref('')
const statusType = ref('') // 'error' | 'success' | ''

// 計算屬性
const canSave = computed(() => {
  return nameInput.value.trim() && hasRecording.value && !isUploading.value
})

const selectedDuration = computed(() => {
  return Math.max(0, trimEnd.value - trimStart.value)
})

const formattedSelectedTime = computed(() => {
  return formatTime(selectedDuration.value)
})

const formattedTotalTime = computed(() => {
  return formatTime(totalDuration.value)
})

const locationButtonText = computed(() => {
  if (isGettingLocation.value) return '📍 正在獲取地點...'
  if (locationName.value) return `✓ ${locationName.value}`
  return '📍 添加地點信息'
})

// 格式化時間
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 初始化
onMounted(() => {
  checkSupport()
  // 綁定全局拖動事件
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchmove', onTouchDrag, { passive: false })
  document.addEventListener('touchend', endDrag)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchmove', onTouchDrag)
  document.removeEventListener('touchend', endDrag)
  destroyWaveform()
})

// 監聽錄音 URL 變化，初始化波形圖
watch(recordingUrl, async (url) => {
  if (url) {
    showNamePanel.value = true
    statusMessage.value = '錄音完成，請調整剪切範圍後命名保存。'
    statusType.value = ''
    await nextTick()
    await initWaveform(url)
  } else {
    showNamePanel.value = false
    destroyWaveform()
  }
})

// 初始化波形圖
async function initWaveform(url) {
  if (!waveformContainer.value) return

  destroyWaveform()

  try {
    wavesurfer = WaveSurfer.create({
      container: waveformContainer.value,
      waveColor: getComputedStyle(document.documentElement).getPropertyValue('--color-text-tertiary').trim() || '#7a8574',
      progressColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#789262',
      cursorColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#789262',
      barWidth: 2,
      barRadius: 1,
      barGap: 1,
      height: 80,
      normalize: true,
      interact: true,
      backend: 'WebAudio',
      mediaControls: false,
    })

    await wavesurfer.load(url)

    totalDuration.value = wavesurfer.getDuration()
    trimStart.value = 0
    trimEnd.value = totalDuration.value

    // 點擊波形圖播放選中區域預覽
    wavesurfer.on('click', () => {
      if (wavesurfer.isPlaying()) {
        wavesurfer.pause()
      } else {
        playTrimmedPreview()
      }
    })

    // 更新拖動標記位置
    updateHandles()

    // 動畫提示
    if (trimHandleStart.value && trimHandleEnd.value) {
      trimHandleStart.value.classList.add('animate-hint')
      trimHandleEnd.value.classList.add('animate-hint')
      setTimeout(() => {
        trimHandleStart.value?.classList.remove('animate-hint')
        trimHandleEnd.value?.classList.remove('animate-hint')
      }, 3500)
    }
  } catch (error) {
    console.error('初始化波形圖失敗:', error)
    statusMessage.value = '波形圖載入失敗，但錄音已保存。'
    statusType.value = 'error'
  }
}

// 銷毀波形圖
function destroyWaveform() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
    previewDebounceTimer = null
  }
  if (previewTimeout) {
    clearTimeout(previewTimeout)
    previewTimeout = null
  }
  if (previewTimeUpdateHandler && wavesurfer) {
    try {
      wavesurfer.un('timeupdate', previewTimeUpdateHandler)
    } catch (e) {}
    previewTimeUpdateHandler = null
  }
  if (wavesurfer) {
    try {
      if (wavesurfer.isPlaying()) {
        wavesurfer.pause()
      }
      wavesurfer.destroy()
    } catch (e) {}
    wavesurfer = null
  }
}

// 更新拖動標記位置
function updateHandles() {
  if (!waveformWrapper.value || !trimHandleStart.value || !trimHandleEnd.value || !trimSelection.value) return
  if (totalDuration.value <= 0) return

  const startPercent = (trimStart.value / totalDuration.value) * 100
  const endPercent = (trimEnd.value / totalDuration.value) * 100

  trimHandleStart.value.style.left = `${startPercent}%`
  trimHandleEnd.value.style.left = `${endPercent}%`
  trimSelection.value.style.left = `${startPercent}%`
  trimSelection.value.style.width = `${endPercent - startPercent}%`
}

// 開始拖動
function startDrag(handle, event) {
  event.preventDefault()
  isDragging = handle
  if (handle === 'start') {
    trimHandleStart.value?.classList.add('dragging')
  } else {
    trimHandleEnd.value?.classList.add('dragging')
  }
}

// 拖動中
function onDrag(event) {
  if (!isDragging || !waveformWrapper.value) return

  const wrapperRect = waveformWrapper.value.getBoundingClientRect()
  const x = event.clientX - wrapperRect.left
  const percent = Math.max(0, Math.min(100, (x / wrapperRect.width) * 100))
  const newTime = (percent / 100) * totalDuration.value

  if (isDragging === 'start') {
    const maxTime = trimEnd.value - MIN_TRIM_DURATION
    trimStart.value = Math.max(0, Math.min(maxTime, newTime))
  } else if (isDragging === 'end') {
    const minTime = trimStart.value + MIN_TRIM_DURATION
    trimEnd.value = Math.min(totalDuration.value, Math.max(minTime, newTime))
  }

  updateHandles()
}

// 觸摸拖動
function onTouchDrag(event) {
  if (!isDragging || event.touches.length === 0) return
  event.preventDefault()
  const touch = event.touches[0]
  onDrag({ clientX: touch.clientX })
}

// 結束拖動
function endDrag() {
  if (isDragging) {
    trimHandleStart.value?.classList.remove('dragging')
    trimHandleEnd.value?.classList.remove('dragging')

    // 拖動結束後預覽
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer)
    }
    previewDebounceTimer = setTimeout(() => {
      playTrimmedPreview()
    }, 300)
  }
  isDragging = null
}

// 播放剪切後的預覽
async function playTrimmedPreview() {
  if (!wavesurfer || !recordingBlob.value) return

  const startTime = trimStart.value
  const endTime = trimEnd.value

  // 清除之前的播放
  if (wavesurfer.isPlaying()) {
    wavesurfer.pause()
  }
  if (previewTimeout) {
    clearTimeout(previewTimeout)
    previewTimeout = null
  }
  if (previewTimeUpdateHandler) {
    wavesurfer.un('timeupdate', previewTimeUpdateHandler)
    previewTimeUpdateHandler = null
  }

  // 設置播放位置
  wavesurfer.seekTo(startTime / totalDuration.value)

  try {
    await wavesurfer.play()

    const duration = endTime - startTime

    // 監聽時間更新，到達結束點時停止
    previewTimeUpdateHandler = () => {
      const currentTime = wavesurfer.getCurrentTime()
      if (currentTime >= endTime) {
        wavesurfer.pause()
        if (previewTimeUpdateHandler) {
          wavesurfer.un('timeupdate', previewTimeUpdateHandler)
          previewTimeUpdateHandler = null
        }
        if (previewTimeout) {
          clearTimeout(previewTimeout)
          previewTimeout = null
        }
      }
    }
    wavesurfer.on('timeupdate', previewTimeUpdateHandler)

    // 備份 timeout
    previewTimeout = setTimeout(() => {
      if (wavesurfer && wavesurfer.isPlaying()) {
        wavesurfer.pause()
      }
      if (previewTimeUpdateHandler) {
        wavesurfer.un('timeupdate', previewTimeUpdateHandler)
        previewTimeUpdateHandler = null
      }
      previewTimeout = null
    }, (duration + 0.2) * 1000)
  } catch (error) {
    console.error('播放預覽失敗:', error)
  }
}

// 處理錄音按鈕點擊
async function handleRecordingToggle() {
  if (isRecording.value) {
    stopRecording()
  } else {
    statusMessage.value = '錄音中...'
    statusType.value = ''
    await startRecording()
  }
}

// 音頻剪輯功能
async function trimAudio(blob, startTime, endTime) {
  if (!blob || startTime < 0 || endTime <= startTime) {
    return blob
  }

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const sampleRate = audioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const length = endSample - startSample

    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      const trimmedData = trimmedBuffer.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        trimmedData[i] = channelData[startSample + i]
      }
    }

    // 轉換為 WAV
    const wavBlob = audioBufferToWav(trimmedBuffer)
    await audioContext.close()

    return wavBlob
  } catch (error) {
    console.error('剪輯音頻失敗:', error)
    return blob
  }
}

// AudioBuffer 轉 WAV
function audioBufferToWav(buffer) {
  const length = buffer.length
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
  const view = new DataView(arrayBuffer)

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * numberOfChannels * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numberOfChannels * 2, true)
  view.setUint16(32, numberOfChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * numberOfChannels * 2, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

// 保存錄音
async function handleSave() {
  if (!canSave.value) return

  try {
    statusMessage.value = '錄音上傳中...'
    statusType.value = ''

    // 如果有剪輯，先剪輯音頻
    let blobToUpload = null
    if (trimStart.value > 0 || trimEnd.value < totalDuration.value) {
      blobToUpload = await trimAudio(recordingBlob.value, trimStart.value, trimEnd.value)
    }

    const result = await uploadRecording(nameInput.value.trim(), blobToUpload)

    // 將錄音添加到已選音效
    store.toggleSoundSelection({
      id: result.id,
      name: result.display_name,
      file_url: result.file_url,
      sourceType: 'recording',
      recordingPath: result.storage_path,
      recordingId: result.id,
      ownerId: result.owner_id,
      recordingStatus: result.status,
      locationName: result.location_name,
      tags: result.location_name ? [result.location_name, '待審核'] : ['待審核'],
    })

    // 重新加載旅人錄音列表
    await store.loadTravelerRecordings()

    // 重置錄音狀態
    handleCancel()

    statusMessage.value = '錄音已保存並加入音效清單。'
    statusType.value = 'success'

    emit('recording-added', result)
  } catch (error) {
    console.error('保存錄音失敗:', error)
    statusMessage.value = `錄音上傳失敗：${error.message || '請稍後再試'}`
    statusType.value = 'error'
  }
}

// 取消錄音
function handleCancel() {
  resetRecording()
  nameInput.value = ''
  showNamePanel.value = false
  trimStart.value = 0
  trimEnd.value = 0
  totalDuration.value = 0
  destroyWaveform()
  statusMessage.value = '已取消本次錄音。'
  statusType.value = ''
}
</script>

<template>
  <div class="editor-section" id="recording-section">
    <div class="recording-header">
      <span class="recording-label">旅人錄音</span>
      <span class="recording-subtext">單次最長 120 秒</span>
    </div>

    <!-- 已發布的旅人錄音 -->
    <TravelerRecordings />

    <!-- 錄音控制 -->
    <div class="recording-inline">
      <button
        class="recording-toggle"
        :class="{ 'recording-active': isRecording }"
        id="recording-toggle-btn"
        type="button"
        :disabled="!isSupported || isUploading"
        :aria-label="isRecording ? '停止錄音' : '開始錄音'"
        @click="handleRecordingToggle"
      >
        <i :class="isRecording ? 'fas fa-stop' : 'fas fa-circle'" aria-hidden="true"></i>
      </button>
      <div class="recording-timer-text" id="recording-timer">
        {{ formattedTime }} / {{ formattedMaxTime }}
      </div>
    </div>

    <!-- 錄音狀態提示 -->
    <div class="recording-status" id="recording-status">
      <span v-if="!isSupported" class="recording-status-error">
        此設備或瀏覽器不支援錄音功能
      </span>
      <span 
        v-else-if="statusMessage" 
        :class="{
          'recording-status-error': statusType === 'error',
          'recording-status-success': statusType === 'success'
        }"
      >
        {{ statusMessage }}
      </span>
    </div>

    <!-- 錄音命名面板 -->
    <div v-if="showNamePanel" class="recording-name-panel" id="recording-name-panel">
      <!-- 波形圖容器 -->
      <div class="recording-waveform-container">
        <div ref="waveformWrapper" class="recording-waveform-wrapper">
          <div ref="waveformContainer" id="recording-waveform" class="recording-waveform"></div>
          <!-- 自定義拖動標記 -->
          <div class="recording-trim-overlay">
            <div ref="trimSelection" class="recording-trim-selection" id="recording-trim-selection"></div>
            <div 
              ref="trimHandleStart" 
              class="recording-trim-handle recording-trim-handle-start" 
              id="recording-trim-handle-start"
              @mousedown="startDrag('start', $event)"
              @touchstart.prevent="startDrag('start', $event)"
            >
              <div class="recording-trim-handle-line"></div>
              <div class="recording-trim-handle-dot"></div>
            </div>
            <div 
              ref="trimHandleEnd" 
              class="recording-trim-handle recording-trim-handle-end" 
              id="recording-trim-handle-end"
              @mousedown="startDrag('end', $event)"
              @touchstart.prevent="startDrag('end', $event)"
            >
              <div class="recording-trim-handle-line"></div>
              <div class="recording-trim-handle-dot"></div>
            </div>
          </div>
        </div>
        <div class="recording-time-info">
          <span id="recording-selected-time">已選取 {{ formattedSelectedTime }}</span>
          <span class="recording-time-separator">/</span>
          <span id="recording-total-time">總長度 {{ formattedTotalTime }}</span>
        </div>
      </div>

      <!-- 命名輸入 -->
      <label class="recording-name-label" for="recording-name-input">為錄音命名</label>
      <div class="recording-name-input-group">
        <input
          v-model="nameInput"
          type="text"
          id="recording-name-input"
          class="editor-input"
          maxlength="50"
          placeholder="例如：松風入夜"
        />
        <button
          type="button"
          id="recording-location-btn"
          class="recording-location-btn"
          :class="{ 'has-location': locationName }"
          :disabled="isGettingLocation"
          aria-label="添加地點信息"
          @click="getCurrentLocation"
        >
          <span class="recording-location-btn-text">{{ locationButtonText }}</span>
        </button>
      </div>

      <!-- 操作按鈕 -->
      <div class="recording-name-actions">
        <button
          class="recording-action-primary"
          id="recording-save-btn"
          type="button"
          :disabled="!canSave"
          @click="handleSave"
        >
          保存錄音
        </button>
        <button
          class="recording-action-secondary"
          id="recording-cancel-btn"
          type="button"
          @click="handleCancel"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>
