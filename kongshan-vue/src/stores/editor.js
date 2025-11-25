/**
 * 聲色意境編輯器 Store
 * 管理編輯器的所有狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeSoundUrl } from '../utils/atmosphere-helper'

// 常量配置
export const MAX_SELECTED_SOUNDS = 5
export const ITEMS_PER_PAGE = 10
export const MAX_RECORDING_SECONDS = 120
export const MIN_TRIM_DURATION = 2

// 背景配色預設（與原版完全一致）
export const BACKGROUND_PRESETS = [
  { id: 'night', name: '夜色', colors: ['#1A1A2E', '#16213E'], direction: 'diagonal', particle_animation: { type: 'threejs', preset: 'stardust', config: {} } },
  { id: 'dawn', name: '晨曦', colors: ['#FFE5B4', '#FFDAB9'], direction: 'vertical' },
  { id: 'autumn', name: '秋色', colors: ['#2F4F4F', '#708090'], direction: 'vertical', particle_animation: { type: 'threejs', preset: 'falling-leaves', config: {} } },
  { id: 'spring', name: '春意', colors: ['#E8F4F8', '#D4E8F0'], direction: 'diagonal' },
  { id: 'sunset', name: '暮色', colors: ['#FF6B6B', '#FFA07A'], direction: 'diagonal' },
  { id: 'bamboo', name: '竹林', colors: ['#2D5016', '#4A7C2E'], direction: 'diagonal' },
  { id: 'winter-snow', name: '冬雪', colors: ['#F5F5F5', '#E0E0E0'], direction: 'diagonal', particle_animation: { type: 'particlesjs', preset: 'snowflakes', config: {} } },
  { id: 'plum-blossom', name: '梅花', colors: ['#FFF3E0', '#FFE0B2'], direction: 'diagonal' },
  { id: 'starry-night', name: '星夜', colors: ['#070825', '#0A0D2E'], direction: 'diagonal', particle_animation: { type: 'particlesjs', preset: 'codepen-stars', config: {} } },
  { id: 'rotating-stars', name: '星移', colors: ['#000000', '#0A0D2E'], direction: 'diagonal', particle_animation: { type: 'particlesjs', preset: 'rotating-stars', config: { hue: 217 } } },
  { id: 'twinkling-stars', name: '靜夜星空', colors: ['#02040d', '#0a1230'], direction: 'diagonal', particle_animation: { type: 'canvas', preset: 'twinkling-stars', config: { backgroundColor: '#030510', backgroundAlpha: 0.82, starIntensity: 1.2, starSizeMultiplier: 1.08, brightnessRange: [0.35, 0.95], twinkleSpeedRange: [0.006, 0.02], sparkleChance: 0.03, sparkleBoost: 0.22, starColorPalette: ['#fefefe', '#cfe8ff', '#ffe7c4', '#ffd2c2', '#c7d8ff'] } } },
  { id: 'lantern-valley', name: '元宵', colors: ['#1A0F1F', '#3A1F36'], direction: 'vertical', particle_animation: { type: 'particlesjs', preset: 'lantern-glow', config: {} } },
  { id: 'rainfall', name: '雨幕', colors: ['#0B132B', '#1F3558'], direction: 'vertical', particle_animation: { type: 'particlesjs', preset: 'rainfall', config: {} } },
  { id: 'green-mountain', name: '青山', colors: ['#4A7C2E', '#6B8E23'], direction: 'diagonal' },
  { id: 'cloud-mist', name: '雲霧', colors: ['#ECEFF1', '#CFD8DC'], direction: 'diagonal' },
  { id: 'falling-flowers', name: '落花', colors: ['#FFE5E8', '#FFCCD0'], direction: 'diagonal', particle_animation: { type: 'particlesjs', preset: 'falling-petals', config: {} } },
]

export const useEditorStore = defineStore('editor', () => {
  // ========== 編輯器狀態 ==========
  const visible = ref(false)
  const poem = ref(null)
  const originalAtmosphere = ref(null)
  const hasChanges = ref(false)
  const isPreviewMode = ref(false)

  // ========== 系統音效 ==========
  const systemSounds = ref([])
  const systemSoundsLoading = ref(false)
  const systemSoundsPage = ref(1)

  // ========== 旅人錄音 ==========
  const travelerRecordings = ref([])
  const travelerRecordingsLoading = ref(false)
  const travelerRecordingsPage = ref(1)

  // ========== 已選音效 ==========
  const selectedSounds = ref([])

  // ========== 背景配色 ==========
  const selectedBackground = ref(null)
  const customColors = ref({ color1: '#1A1A2E', color2: '#16213E', direction: 'diagonal' })
  const showCustomColorPicker = ref(false)

  // ========== 錄音狀態 ==========
  const isRecording = ref(false)
  const recordingDuration = ref(0)
  const recordingBlob = ref(null)
  const recordingUrl = ref(null)
  const recordingName = ref('')
  const recordingLocation = ref(null)
  const isUploadingRecording = ref(false)

  // 波形編輯
  const trimStart = ref(0)
  const trimEnd = ref(0)

  // ========== 計算屬性 ==========
  const systemSoundsTotalPages = computed(() => Math.ceil(systemSounds.value.length / ITEMS_PER_PAGE))
  const paginatedSystemSounds = computed(() => {
    const start = (systemSoundsPage.value - 1) * ITEMS_PER_PAGE
    return systemSounds.value.slice(start, start + ITEMS_PER_PAGE)
  })

  const travelerRecordingsTotalPages = computed(() => Math.ceil(travelerRecordings.value.length / ITEMS_PER_PAGE))
  const paginatedTravelerRecordings = computed(() => {
    const start = (travelerRecordingsPage.value - 1) * ITEMS_PER_PAGE
    return travelerRecordings.value.slice(start, start + ITEMS_PER_PAGE)
  })

  const canAddMoreSounds = computed(() => selectedSounds.value.length < MAX_SELECTED_SOUNDS)
  const canPublish = computed(() => selectedSounds.value.length > 0)

  const selectedBackgroundConfig = computed(() => {
    if (!selectedBackground.value) return null

    if (selectedBackground.value.isCustom) {
      // 自定義配色不包含 id，這樣其他用戶也能正確顯示
      return {
        color_scheme: {
          colors: [customColors.value.color1, customColors.value.color2],
          direction: customColors.value.direction,
        },
        abstract_elements: [],
      }
    }

    const preset = BACKGROUND_PRESETS.find(p => p.id === selectedBackground.value.id)
    if (!preset) return null

    // 預設配色包含 id，用於識別配色方案
    return {
      color_scheme: {
        id: preset.id,
        colors: preset.colors,
        direction: preset.direction || 'diagonal',
      },
      particle_animation: preset.particle_animation || null,
      abstract_elements: [],
    }
  })

  // ========== 方法 ==========

  /**
   * 打開編輯器
   */
  function open(poemData, currentAtmosphere = null) {
    poem.value = poemData
    originalAtmosphere.value = currentAtmosphere
    hasChanges.value = false
    isPreviewMode.value = false
    visible.value = true

    // 重置狀態
    selectedSounds.value = []
    selectedBackground.value = null
    showCustomColorPicker.value = false
    systemSoundsPage.value = 1
    travelerRecordingsPage.value = 1
    resetRecording()

    // 從當前聲色意境中提取音效 ID 列表（用於排序，讓當前使用的音效排在前面）
    let currentSystemSoundIds = []
    let currentRecordingIds = []

    if (currentAtmosphere?.sound_combination && Array.isArray(currentAtmosphere.sound_combination)) {
      currentAtmosphere.sound_combination.forEach(config => {
        const sourceType = config.source_type || 'system'
        if (sourceType === 'system' && config.sound_id) {
          currentSystemSoundIds.push(config.sound_id)
        } else if (sourceType === 'recording' && (config.recording_id || config.sound_id)) {
          currentRecordingIds.push(config.recording_id || config.sound_id)
        }
      })
    }

    // 如果有當前意境，載入數據
    if (currentAtmosphere) {
      loadAtmosphereData(currentAtmosphere)
    }

    // 加載音效庫（傳入當前使用的音效 ID，讓它們排在前面）
    loadSystemSounds(currentSystemSoundIds)
    loadTravelerRecordings(currentRecordingIds)
  }

  /**
   * 關閉編輯器
   */
  function close() {
    visible.value = false
    resetRecording()
  }

  /**
   * 加載系統音效
   */
  async function loadSystemSounds(currentSoundIds = []) {
    if (!supabase) return

    systemSoundsLoading.value = true
    try {
      const { data, error } = await supabase
        .from('sound_effects')
        .select('*')
        .eq('source', 'system')
        .eq('status', 'approved')
        .order('name')

      if (error) throw error

      let sounds = (data || []).map(effect => ({
        id: effect.id,
        name: effect.name,
        tags: effect.tags || [],
        file_url: normalizeSoundUrl(effect.file_url, supabase),
        sourceType: 'system',
      }))

      // 如果有當前使用的音效，排在前面
      if (currentSoundIds.length > 0) {
        sounds.sort((a, b) => {
          const aIsCurrent = currentSoundIds.includes(a.id)
          const bIsCurrent = currentSoundIds.includes(b.id)
          if (aIsCurrent && !bIsCurrent) return -1
          if (!aIsCurrent && bIsCurrent) return 1
          return a.name.localeCompare(b.name, 'zh-TW')
        })
      }

      systemSounds.value = sounds
      console.log(`✅ 載入 ${sounds.length} 個系統音效`)
    } catch (error) {
      console.error('載入系統音效失敗:', error)
    } finally {
      systemSoundsLoading.value = false
    }
  }

  /**
   * 加載旅人錄音
   */
  async function loadTravelerRecordings(currentRecordingIds = []) {
    if (!supabase) return

    travelerRecordingsLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

      let query = supabase
        .from('recordings')
        .select('id, display_name, storage_path, created_at, owner_id, status, location_name')
        .order('created_at', { ascending: false })
        .limit(50)

      if (userId) {
        query = query.or(`status.eq.approved,and(status.eq.pending,owner_id.eq.${userId})`)
      } else {
        query = query.eq('status', 'approved')
      }

      const { data, error } = await query
      if (error) throw error

      const recordings = await Promise.all((data || []).map(async (record) => {
        if (!record.storage_path) return null

        let fileUrl = ''
        const storagePath = record.storage_path

        if (storagePath.startsWith('approved/') || storagePath.startsWith('system/')) {
          const projectUrl = supabase.supabaseUrl.replace('/rest/v1', '')
          fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${storagePath}`
        } else {
          try {
            const { data: signedData, error: signedError } = await supabase
              .storage
              .from('kongshan_recordings')
              .createSignedUrl(storagePath, 3600)
            if (!signedError && signedData?.signedUrl) {
              fileUrl = signedData.signedUrl
            }
          } catch (e) {
            console.warn('獲取錄音簽名 URL 失敗:', e)
            return null
          }
        }

        if (!fileUrl) return null

        const tags = []
        if (record.location_name?.trim()) {
          tags.push(record.location_name.trim())
        }
        if (record.status !== 'approved') {
          tags.push('待審核')
        }

        return {
          id: record.id,
          name: record.display_name || '旅人錄音',
          tags,
          file_url: fileUrl,
          sourceType: 'recording',
          recordingPath: record.storage_path,
          recordingId: record.id,
          ownerId: record.owner_id,
          recordingStatus: record.status,
          locationName: record.location_name,
        }
      }))

      let filteredRecordings = recordings.filter(Boolean)

      // 如果有當前使用的錄音，排在前面
      if (currentRecordingIds.length > 0) {
        filteredRecordings.sort((a, b) => {
          const aIsCurrent = currentRecordingIds.includes(a.id)
          const bIsCurrent = currentRecordingIds.includes(b.id)
          if (aIsCurrent && !bIsCurrent) return -1
          if (!aIsCurrent && bIsCurrent) return 1
          return 0
        })
      }

      travelerRecordings.value = filteredRecordings
      console.log(`✅ 載入 ${filteredRecordings.length} 個旅人錄音`)
    } catch (error) {
      console.error('載入旅人錄音失敗:', error)
    } finally {
      travelerRecordingsLoading.value = false
    }
  }

  /**
   * 載入當前意境數據到編輯器
   */
  function loadAtmosphereData(atmosphere) {
    if (!atmosphere) return

    // 載入已選音效
    if (atmosphere.sound_combination && Array.isArray(atmosphere.sound_combination)) {
      selectedSounds.value = atmosphere.sound_combination.map(config => ({
        id: config.source_type === 'recording' ? (config.recording_id || config.sound_id) : config.sound_id,
        name: config.display_name || '音效',
        file_url: config.file_url || '',
        sourceType: config.source_type || 'system',
        volume: config.volume !== undefined ? config.volume : 0.7,
        loop: config.loop !== undefined ? config.loop : true,
        sound_id: config.sound_id,
        recording_id: config.recording_id,
        display_name: config.display_name,
        recording_path: config.recording_path,
        // 補充缺失的屬性，用於發布時判斷是否需要審核
        recordingStatus: config.recording_status || (config.source_type === 'system' ? 'approved' : null),
        ownerId: config.recording_owner_id || null,
      }))
    }

    // 載入背景配色
    if (atmosphere.background_config?.color_scheme) {
      const colors = atmosphere.background_config.color_scheme.colors
      const preset = BACKGROUND_PRESETS.find(p => 
        JSON.stringify(p.colors) === JSON.stringify(colors)
      )
      if (preset) {
        selectedBackground.value = preset
      } else if (colors && colors.length >= 2) {
        // 自定義配色
        customColors.value = {
          color1: colors[0],
          color2: colors[1],
          direction: atmosphere.background_config.color_scheme.direction || 'diagonal',
        }
        selectedBackground.value = { id: 'custom', isCustom: true }
      }
    }
  }

  /**
   * 切換音效選擇
   */
  function toggleSoundSelection(sound) {
    const index = selectedSounds.value.findIndex(s => s.id === sound.id)

    if (index >= 0) {
      // 已選中，移除
      selectedSounds.value.splice(index, 1)
    } else {
      // 未選中，添加
      if (!canAddMoreSounds.value) {
        return false // 已達上限
      }

      // 確定 recordingStatus
      // 系統音效默認為 approved，錄音使用傳入的狀態
      const sourceType = sound.sourceType || 'system'
      let recordingStatus = 'approved' // 默認值
      if (sourceType === 'recording') {
        recordingStatus = sound.recordingStatus || 'pending'
      }

      selectedSounds.value.push({
        id: sound.id,
        name: sound.name,
        file_url: sound.file_url,
        sourceType: sourceType,
        volume: 0.7,
        loop: true,
        sound_id: sourceType === 'recording' ? null : sound.id,
        recording_id: sourceType === 'recording' ? sound.id : null,
        display_name: sound.name,
        recording_path: sound.recordingPath || null,
        recordingStatus: recordingStatus,
        ownerId: sound.ownerId || null,
      })
    }

    hasChanges.value = true
    return true
  }

  /**
   * 檢查音效是否已選中
   */
  function isSoundSelected(soundId) {
    return selectedSounds.value.some(s => s.id === soundId)
  }

  /**
   * 移除已選音效
   */
  function removeSelectedSound(index) {
    selectedSounds.value.splice(index, 1)
    hasChanges.value = true
  }

  /**
   * 更新音效音量
   */
  function updateSoundVolume(index, volume) {
    if (selectedSounds.value[index]) {
      selectedSounds.value[index].volume = Math.max(0, Math.min(1, volume))
      hasChanges.value = true
    }
  }

  /**
   * 切換音效循環
   */
  function toggleSoundLoop(index) {
    if (selectedSounds.value[index]) {
      selectedSounds.value[index].loop = !selectedSounds.value[index].loop
      hasChanges.value = true
    }
  }

  /**
   * 選擇背景配色
   */
  function selectBackground(background) {
    selectedBackground.value = background
    showCustomColorPicker.value = false
    hasChanges.value = true
  }

  /**
   * 打開自定義配色選擇器
   */
  function openCustomColorPicker() {
    showCustomColorPicker.value = true
  }

  /**
   * 保存自定義配色
   */
  function saveCustomColor() {
    selectedBackground.value = {
      id: `custom-${Date.now()}`,
      name: '自定義',
      colors: [customColors.value.color1, customColors.value.color2],
      direction: customColors.value.direction,
      isCustom: true,
    }
    showCustomColorPicker.value = false
    hasChanges.value = true
  }

  /**
   * 取消自定義配色
   */
  function cancelCustomColor() {
    showCustomColorPicker.value = false
  }

  /**
   * 重置錄音狀態
   */
  function resetRecording() {
    isRecording.value = false
    recordingDuration.value = 0
    recordingBlob.value = null
    if (recordingUrl.value) {
      URL.revokeObjectURL(recordingUrl.value)
    }
    recordingUrl.value = null
    recordingName.value = ''
    recordingLocation.value = null
    trimStart.value = 0
    trimEnd.value = 0
  }

  /**
   * 設置錄音結果
   */
  function setRecordingResult(blob, duration) {
    recordingBlob.value = blob
    recordingDuration.value = duration
    if (recordingUrl.value) {
      URL.revokeObjectURL(recordingUrl.value)
    }
    recordingUrl.value = URL.createObjectURL(blob)
    trimStart.value = 0
    trimEnd.value = duration
  }

  /**
   * 收集意境數據
   * @param {string} status - 初始狀態（'pending' 或 'preview'）
   * @param {string|null} currentUserId - 當前用戶 ID（用於判斷錄音所有權）
   */
  function collectAtmosphereData(status = 'pending', currentUserId = null) {
    const fallbackName = poem.value?.title ? `${poem.value.title} 聲色意境` : '未命名聲色意境'

    // 構建音效組合數據
    const soundCombination = selectedSounds.value.map(sound => ({
      sound_id: sound.sound_id || sound.id,
      recording_id: sound.recording_id,
      display_name: sound.display_name || sound.name,
      file_url: sound.file_url,
      source_type: sound.sourceType || 'system',
      volume: sound.volume,
      loop: sound.loop,
      recording_path: sound.recording_path,
      recording_owner_id: sound.ownerId || null,
      recording_status: sound.recordingStatus || null,
    }))

    // 判斷最終狀態：如果只使用系統音效或已審核的錄音，則直接發布
    let finalStatus = status
    if (status === 'pending') {
      const requiresReview = soundCombination.some(soundConfig => {
        const sourceType = soundConfig.source_type || 'system'
        
        // 如果不是錄音類型的音效，不需要審核
        if (sourceType !== 'recording') {
          return false
        }
        
        // 如果錄音狀態是 'approved' 或 'published'，不需要審核
        const recordingStatus = (soundConfig.recording_status || '').toLowerCase()
        if (recordingStatus === 'approved' || recordingStatus === 'published') {
          return false
        }
        
        // 其他情況（私有錄音、待審核錄音）需要審核
        return true
      })

      finalStatus = requiresReview ? 'pending' : 'approved'
    }

    return {
      poem_id: poem.value?.id,
      name: fallbackName,
      description: '',
      sound_combination: soundCombination,
      background_config: selectedBackgroundConfig.value,
      source: 'user',
      status: finalStatus,
      is_ai_generated: false,
    }
  }

  /**
   * 清空編輯器
   */
  function reset() {
    poem.value = null
    originalAtmosphere.value = null
    hasChanges.value = false
    isPreviewMode.value = false
    selectedSounds.value = []
    selectedBackground.value = null
    showCustomColorPicker.value = false
    systemSoundsPage.value = 1
    travelerRecordingsPage.value = 1
    resetRecording()
  }

  return {
    // 狀態
    visible,
    poem,
    originalAtmosphere,
    hasChanges,
    isPreviewMode,
    systemSounds,
    systemSoundsLoading,
    systemSoundsPage,
    travelerRecordings,
    travelerRecordingsLoading,
    travelerRecordingsPage,
    selectedSounds,
    selectedBackground,
    customColors,
    showCustomColorPicker,
    isRecording,
    recordingDuration,
    recordingBlob,
    recordingUrl,
    recordingName,
    recordingLocation,
    isUploadingRecording,
    trimStart,
    trimEnd,

    // 計算屬性
    systemSoundsTotalPages,
    paginatedSystemSounds,
    travelerRecordingsTotalPages,
    paginatedTravelerRecordings,
    canAddMoreSounds,
    canPublish,
    selectedBackgroundConfig,

    // 方法
    open,
    close,
    loadSystemSounds,
    loadTravelerRecordings,
    loadAtmosphereData,
    toggleSoundSelection,
    isSoundSelected,
    removeSelectedSound,
    updateSoundVolume,
    toggleSoundLoop,
    selectBackground,
    openCustomColorPicker,
    saveCustomColor,
    cancelCustomColor,
    resetRecording,
    setRecordingResult,
    collectAtmosphereData,
    reset,
  }
})

