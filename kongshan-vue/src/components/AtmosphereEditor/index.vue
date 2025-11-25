<script setup>
/**
 * 聲色意境編輯器主組件
 * 完全使用 Vue 響應式重構，替代原版 DOM 操作
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../../stores/editor'
import { supabase } from '../../lib/supabase'
import { normalizeSoundUrl } from '../../utils/atmosphere-helper'
import SoundSelector from './SoundSelector.vue'
import RecordingPanel from './RecordingPanel.vue'
import SelectedSounds from './SelectedSounds.vue'
import BackgroundSelector from './BackgroundSelector.vue'

const props = defineProps({
  soundMixer: {
    type: Object,
    default: null,
  },
  backgroundRenderer: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save', 'close', 'preview'])

const store = useEditorStore()
const {
  visible,
  poem,
  originalAtmosphere,
  selectedSounds,
  selectedBackground,
  selectedBackgroundConfig,
  canPublish,
  hasChanges,
  isPreviewMode,
} = storeToRefs(store)

// 動畫控制
const animationVisible = ref(false)

// 原始狀態（用於關閉時恢復）
const originalState = ref(null)

// 自動預覽定時器
let autoPreviewTimer = null
let isAutoPreviewRunning = false

// 監聽編輯器打開/關閉
watch(visible, (newVal) => {
  if (newVal) {
    // 打開時保存原始狀態
    saveOriginalState()
    // 延遲顯示動畫
    setTimeout(() => {
      animationVisible.value = true
    }, 10)
  } else {
    animationVisible.value = false
  }
})

// 監聽選擇變化，觸發自動預覽
watch([selectedSounds, selectedBackground], () => {
  if (visible.value && hasChanges.value) {
    scheduleAutoPreview()
  }
}, { deep: true })

// 保存原始狀態
function saveOriginalState() {
  originalState.value = {
    atmosphere: originalAtmosphere.value ? { ...originalAtmosphere.value } : null,
  }
}

// 調度自動預覽
function scheduleAutoPreview() {
  if (autoPreviewTimer) {
    clearTimeout(autoPreviewTimer)
  }

  autoPreviewTimer = setTimeout(() => {
    autoPreviewSelectedSounds()
  }, 120)
}

// 取消自動預覽
function cancelAutoPreview() {
  if (autoPreviewTimer) {
    clearTimeout(autoPreviewTimer)
    autoPreviewTimer = null
  }
}

// 自動預覽已選音效和背景
async function autoPreviewSelectedSounds() {
  if (!props.soundMixer || isAutoPreviewRunning) return

  isAutoPreviewRunning = true

  try {
    // 清空現有音效
    await props.soundMixer.clear()

    if (selectedSounds.value.length === 0) {
      isAutoPreviewRunning = false
      return
    }

    // 添加已選音效
    for (const sound of selectedSounds.value) {
      let fileUrl = sound.file_url

      // 如果是錄音且沒有 URL，嘗試獲取
      if ((!fileUrl || fileUrl === '') && sound.sourceType === 'recording' && sound.recording_path && supabase) {
        const recordingPath = sound.recording_path
        if (recordingPath.startsWith('approved/') || recordingPath.startsWith('system/')) {
          const projectUrl = supabase.supabaseUrl.replace('/rest/v1', '')
          fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${recordingPath}`
        } else {
          try {
            const { data: signedData, error: signedError } = await supabase
              .storage
              .from('kongshan_recordings')
              .createSignedUrl(recordingPath, 3600)
            if (!signedError && signedData?.signedUrl) {
              fileUrl = signedData.signedUrl
            }
          } catch (e) {
            console.warn('獲取錄音簽名 URL 失敗:', e)
          }
        }
      }

      if (fileUrl) {
        await props.soundMixer.addTrack({
          id: sound.id,
          name: sound.display_name || sound.name,
          file_url: normalizeSoundUrl(fileUrl, supabase),
          volume: sound.volume,
          loop: sound.loop,
        })
      }
    }

    // 播放
    if (props.soundMixer.getTracks().length > 0) {
      await props.soundMixer.playAll()
    }

    // 應用背景預覽
    if (props.backgroundRenderer && selectedBackgroundConfig.value) {
      await props.backgroundRenderer.setConfigWithTransition(selectedBackgroundConfig.value, 300)
      // 應用文字顏色
      applyBackgroundTextColor(selectedBackgroundConfig.value)
    }
  } catch (error) {
    console.error('自動預覽失敗:', error)
  } finally {
    isAutoPreviewRunning = false
  }
}

// 背景文字顏色映射表
const backgroundTextColorMap = {
  'night': '#FFFFFF',
  'dawn': '#2C3E50',
  'autumn': '#FFFFFF',
  'spring': '#2C3E50',
  'sunset': '#FFFFFF',
  'bamboo': '#FFFFFF',
  'winter-snow': '#2C3E50',
  'plum-blossom': '#2C3E50',
  'starry-night': '#FFFFFF',
  'rotating-stars': '#FDF7FF',
  'twinkling-stars': '#FFFFFF',
  'green-mountain': '#FFFFFF',
  'cloud-mist': '#2C3E50',
  'falling-flowers': '#2C3E50',
  'lantern-valley': '#FFFFFF',
  'rainfall': '#FFFFFF',
}

// 計算顏色亮度（用於自動判斷文字顏色）
function getLuminance(hex) {
  const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!rgb) return 0
  
  const r = parseInt(rgb[1], 16) / 255
  const g = parseInt(rgb[2], 16) / 255
  const b = parseInt(rgb[3], 16) / 255
  
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

// 根據背景配置獲取目標文字顏色
function getTargetTextColor(backgroundConfig) {
  if (!backgroundConfig?.color_scheme?.colors) {
    return '#2C3E50'
  }

  const bgId = backgroundConfig.color_scheme.id
  const colors = backgroundConfig.color_scheme.colors
  
  // 自定義配色：根據亮度自動判斷
  if (!bgId || bgId.startsWith('custom-')) {
    const avgLuminance = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length
    return avgLuminance > 0.5 ? '#2C3E50' : '#FFFFFF'
  }
  
  // 預設配色：使用映射表
  return backgroundTextColorMap[bgId] || '#2C3E50'
}

// 應用背景文字顏色
function applyBackgroundTextColor(backgroundConfig) {
  const textColor = getTargetTextColor(backgroundConfig)

  const root = document.documentElement
  root.style.setProperty('--poem-text-color', textColor)
  root.style.setProperty('--poem-glow-color', textColor)
  root.style.setProperty('--poem-meta-color', textColor)
  
  // 更新發光效果
  updatePoemTextGlow(textColor)
}

// 更新詩歌文字發光效果
function updatePoemTextGlow(textColor) {
  const root = document.documentElement
  const isLight = textColor === '#FFFFFF' || textColor === '#FDF7FF'
  
  if (isLight) {
    root.style.setProperty('--poem-glow-shadow-min', '0 0 8px rgba(255, 255, 255, 0.3), 0 0 12px rgba(255, 255, 255, 0.18)')
    root.style.setProperty('--poem-glow-shadow-max', '0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.48)')
  } else {
    root.style.setProperty('--poem-glow-shadow-min', '0 0 8px rgba(44, 62, 80, 0.15), 0 0 12px rgba(44, 62, 80, 0.1)')
    root.style.setProperty('--poem-glow-shadow-max', '0 0 15px rgba(44, 62, 80, 0.3), 0 0 25px rgba(44, 62, 80, 0.2)')
  }
}

// 預覽按鈕
async function handlePreview() {
  const data = store.collectAtmosphereData('preview')
  if (!data) return

  store.isPreviewMode = true
  emit('preview', data)

  // 關閉編輯器但不停止音效
  animationVisible.value = false
  setTimeout(() => {
    store.close()
  }, 300)

  // 顯示預覽提示
  showPreviewTip()
}

// 顯示預覽提示
function showPreviewTip() {
  const tip = document.createElement('div')
  tip.className = 'preview-tip'
  tip.textContent = '正在預覽聲色意境，音效已自動播放'
  document.body.appendChild(tip)

  setTimeout(() => tip.classList.add('visible'), 100)
  setTimeout(() => {
    tip.classList.remove('visible')
    setTimeout(() => tip.remove(), 300)
  }, 3000)
}

// 發布按鈕
async function handlePublish() {
  if (!canPublish.value) {
    alert('請至少選擇一個音效')
    return
  }

  // 檢查是否需要覆蓋舊意境
  if (poem.value?.id && supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingAtmospheres, error } = await supabase
          .from('poem_atmospheres')
          .select('id, status, created_at')
          .eq('poem_id', poem.value.id)
          .eq('created_by', user.id)

        if (!error && existingAtmospheres && existingAtmospheres.length > 0) {
          const oldStatus = existingAtmospheres[0].status
          const statusText = {
            'approved': '已發布',
            'pending': '待審核',
            'draft': '草稿',
            'rejected': '已拒絕'
          }[oldStatus] || '未知狀態'

          const confirmed = confirm(
            `你已經為這首詩創作過一個聲色意境（狀態：${statusText}）。\n\n` +
            `發布新的意境將會覆蓋舊的意境，舊的意境將被刪除。\n\n` +
            `確定要繼續發布嗎？`
          )

          if (!confirmed) {
            return
          }
        }
      }
    } catch (error) {
      console.warn('檢查舊意境時發生錯誤:', error)
    }
  }

  // 獲取當前用戶 ID
  let currentUserId = null
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      currentUserId = user?.id || null
    } catch (e) {
      console.warn('獲取用戶 ID 失敗:', e)
    }
  }

  // 收集意境數據（會自動判斷是否需要審核）
  const data = store.collectAtmosphereData('pending', currentUserId)
  if (!data) return

  // 根據最終狀態顯示提示信息
  if (data.status === 'approved') {
    alert('你的聲色意境已直接發佈！')
  } else {
    alert('你的聲色意境包含個人錄音，已提交審核並可先由你自己預覽。')
  }

  emit('save', data)
  handleClose()
}

// 關閉按鈕
function handleClose() {
  cancelAutoPreview()
  animationVisible.value = false

  // 如果有編輯過，恢復原始狀態
  if (hasChanges.value && originalState.value && !store.isPreviewMode) {
    restoreOriginalState()
  }

  setTimeout(() => {
    store.close()
    emit('close')
  }, 300)
}

// 恢復原始狀態
async function restoreOriginalState() {
  if (!originalState.value) return

  // 清空編輯效果
  if (props.soundMixer) {
    await props.soundMixer.clear()
  }

  // 恢復原始意境
  if (originalState.value.atmosphere) {
    emit('restore', originalState.value.atmosphere)
  } else {
    // 沒有原始意境，清除背景
    if (props.backgroundRenderer) {
      props.backgroundRenderer.clear()
    }
    // 恢復默認文字顏色
    const root = document.documentElement
    root.style.removeProperty('--poem-text-color')
    root.style.removeProperty('--poem-glow-color')
    root.style.removeProperty('--poem-meta-color')
  }
}

// 點擊背景關閉
function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

// ESC 鍵關閉
function handleKeydown(event) {
  if (event.key === 'Escape' && visible.value) {
    handleClose()
  }
}

// 生命週期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  cancelAutoPreview()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      id="atmosphere-editor"
      :class="['atmosphere-editor', { visible: animationVisible }]"
      @click="handleBackdropClick"
    >
      <div class="editor-sidebar">
        <!-- 頭部 -->
        <div class="editor-header">
          <h2 class="editor-title">聲色意境編輯器</h2>
          <button
            class="editor-close-btn"
            type="button"
            aria-label="關閉編輯器"
            @click="handleClose"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
            <span class="sr-only">關閉</span>
          </button>
        </div>

        <!-- 內容區 -->
        <div class="editor-content">
          <!-- 音效選擇 -->
          <SoundSelector />

          <!-- 錄音功能 -->
          <RecordingPanel @recording-added="scheduleAutoPreview" />

          <!-- 已選音效 -->
          <SelectedSounds />

          <!-- 背景配色 -->
          <BackgroundSelector :background-renderer="backgroundRenderer" />
        </div>

        <!-- 底部按鈕 -->
        <div class="editor-footer">
          <button
            class="editor-btn editor-btn-secondary"
            id="preview-btn"
            type="button"
            @click="handlePreview"
          >
            預覽
          </button>
          <button
            class="editor-btn editor-btn-primary"
            id="publish-btn"
            type="button"
            :disabled="!canPublish"
            @click="handlePublish"
          >
            發佈
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>
