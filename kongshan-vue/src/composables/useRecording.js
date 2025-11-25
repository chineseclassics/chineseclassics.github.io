/**
 * 錄音功能 Composable
 * 處理麥克風錄音、計時、上傳等功能
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { MAX_RECORDING_SECONDS } from '../stores/editor'

// MIME 類型候選列表
const MIME_CANDIDATES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/aac',
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
]

/**
 * 選擇支持的 MIME 類型
 */
function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return null
}

/**
 * 獲取備用 MIME 類型
 */
function getFallbackMimeType() {
  return 'audio/mp4'
}

/**
 * 標準化 MIME 類型
 */
function normalizeRecordingMimeType(mimeType) {
  if (!mimeType) return getFallbackMimeType()
  const lower = mimeType.toLowerCase()
  if (lower.includes('webm')) return 'audio/webm'
  if (lower.includes('mp4') || lower.includes('aac') || lower.includes('m4a')) return 'audio/mp4'
  if (lower.includes('ogg')) return 'audio/ogg'
  if (lower.includes('wav')) return 'audio/wav'
  return getFallbackMimeType()
}

/**
 * 推斷文件擴展名
 */
function inferFileExtension(mimeType) {
  const normalized = normalizeRecordingMimeType(mimeType)
  if (normalized.includes('webm')) return 'webm'
  if (normalized.includes('ogg')) return 'ogg'
  if (normalized.includes('wav')) return 'wav'
  return 'm4a'
}

/**
 * 構建安全的存儲文件名
 */
function buildSafeStorageFileBase(name) {
  if (!name || typeof name !== 'string') return 'recording'

  const normalized = name.normalize('NFKC').trim()
  if (!normalized) return 'recording'

  const safeSegments = []
  for (const char of normalized) {
    if (/\s/.test(char)) {
      safeSegments.push('_')
      continue
    }
    if (char === '-' || char === '_') {
      safeSegments.push(char)
      continue
    }
    const codePoint = char.codePointAt(0)
    const isAsciiDigit = codePoint >= 0x30 && codePoint <= 0x39
    const isAsciiUpper = codePoint >= 0x41 && codePoint <= 0x5a
    const isAsciiLower = codePoint >= 0x61 && codePoint <= 0x7a

    if (isAsciiDigit || isAsciiUpper || isAsciiLower) {
      safeSegments.push(char.toLowerCase())
    } else {
      const hex = codePoint.toString(16).toLowerCase()
      const paddedHex = codePoint <= 0xffff ? hex.padStart(4, '0') : hex
      safeSegments.push(`u${paddedHex}`)
    }
  }

  let result = safeSegments.join('')
  if (!result) return 'recording'

  result = result.replace(/_+/g, '_')
  result = result.replace(/-+/g, '-')
  result = result.replace(/^[_-]+|[_-]+$/g, '')

  return result ? result.slice(0, 60) : 'recording'
}

export function useRecording() {
  // 狀態
  const isRecording = ref(false)
  const isSupported = ref(false)
  const elapsedSeconds = ref(0)
  const remainingSeconds = ref(MAX_RECORDING_SECONDS)
  const recordingBlob = ref(null)
  const recordingUrl = ref(null)
  const recordingDuration = ref(0)
  const recordingMimeType = ref('')
  const isUploading = ref(false)
  const uploadError = ref(null)
  const locationName = ref(null)
  const isGettingLocation = ref(false)

  // 內部變量
  let mediaRecorder = null
  let recordingStream = null
  let recordingChunks = []
  let timerInterval = null
  let autoStopTimeout = null
  let startTimestamp = null

  // 計算屬性
  const formattedTime = computed(() => {
    const mins = Math.floor(elapsedSeconds.value / 60)
    const secs = elapsedSeconds.value % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const formattedMaxTime = computed(() => {
    const mins = Math.floor(MAX_RECORDING_SECONDS / 60)
    const secs = MAX_RECORDING_SECONDS % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const hasRecording = computed(() => !!recordingBlob.value)

  /**
   * 檢查錄音支持
   */
  function checkSupport() {
    isSupported.value =
      typeof window !== 'undefined' &&
      navigator?.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    return isSupported.value
  }

  /**
   * 開始錄音
   */
  async function startRecording() {
    if (isRecording.value || isUploading.value) return false

    try {
      cleanup()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStream = stream
      recordingChunks = []
      startTimestamp = Date.now()

      const preferredMime = pickSupportedMimeType()
      const recorderOptions = preferredMime ? { mimeType: preferredMime } : undefined
      const recorder = recorderOptions
        ? new MediaRecorder(stream, recorderOptions)
        : new MediaRecorder(stream)

      mediaRecorder = recorder
      recordingMimeType.value = recorder.mimeType || preferredMime || getFallbackMimeType()

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunks.push(event.data)
          if (!recordingMimeType.value && event.data.type) {
            recordingMimeType.value = event.data.type
          }
        }
      })

      recorder.addEventListener('stop', handleRecordingStop)
      recorder.start()

      isRecording.value = true
      elapsedSeconds.value = 0
      remainingSeconds.value = MAX_RECORDING_SECONDS

      // 計時器
      timerInterval = setInterval(() => {
        const elapsed = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000))
        elapsedSeconds.value = elapsed
        remainingSeconds.value = Math.max(0, MAX_RECORDING_SECONDS - elapsed)

        if (remainingSeconds.value <= 0) {
          stopRecording()
        }
      }, 1000)

      // 自動停止
      autoStopTimeout = setTimeout(() => {
        stopRecording()
      }, MAX_RECORDING_SECONDS * 1000)

      return true
    } catch (error) {
      console.error('啟動錄音失敗:', error)
      cleanup()
      return false
    }
  }

  /**
   * 停止錄音
   */
  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return

    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    if (autoStopTimeout) {
      clearTimeout(autoStopTimeout)
      autoStopTimeout = null
    }

    isRecording.value = false

    try {
      mediaRecorder.stop()
    } catch (error) {
      console.warn('停止錄音時發生錯誤:', error)
    }
  }

  /**
   * 處理錄音停止
   */
  function handleRecordingStop() {
    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop())
      recordingStream = null
    }

    const recordingDurationMs = startTimestamp ? Date.now() - startTimestamp : 0
    const elapsed = Math.max(1, Math.round(recordingDurationMs / 1000))
    recordingDuration.value = Math.min(MAX_RECORDING_SECONDS, elapsed)
    startTimestamp = null

    try {
      mediaRecorder = null
      const firstChunkType = recordingChunks[0]?.type
      const resolvedMime = recordingMimeType.value || firstChunkType || getFallbackMimeType()
      const blob = new Blob(recordingChunks, { type: resolvedMime })
      recordingMimeType.value = blob.type || resolvedMime
      recordingBlob.value = blob

      if (recordingUrl.value) {
        URL.revokeObjectURL(recordingUrl.value)
      }
      recordingUrl.value = URL.createObjectURL(blob)
    } catch (error) {
      console.error('處理錄音資料失敗:', error)
      recordingBlob.value = null
      recordingUrl.value = null
    }
  }

  /**
   * 上傳錄音
   */
  async function uploadRecording(displayName, trimmedBlob = null) {
    if (!recordingBlob.value && !trimmedBlob) {
      throw new Error('尚未產生可上傳的錄音')
    }

    if (!supabase) {
      throw new Error('Supabase 未配置')
    }

    isUploading.value = true
    uploadError.value = null

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('未能取得使用者身份')
      }

      const userId = user.id
      const blobToUpload = trimmedBlob || recordingBlob.value
      const duration = recordingDuration.value

      const rawMimeType = recordingMimeType.value || blobToUpload.type || getFallbackMimeType()
      const normalizedMimeType = normalizeRecordingMimeType(rawMimeType)
      const extension = inferFileExtension(normalizedMimeType)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeBaseName = buildSafeStorageFileBase(displayName)
      const finalFileName = `${safeBaseName}_${timestamp}.${extension}`
      const storagePath = `pending/${userId}/${finalFileName}`

      const uploadBlob = new Blob([blobToUpload], { type: normalizedMimeType })

      if (!uploadBlob || uploadBlob.size === 0) {
        throw new Error('錄音資料為空')
      }

      // 上傳到 Storage
      const { error: uploadError } = await supabase.storage
        .from('kongshan_recordings')
        .upload(storagePath, uploadBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: normalizedMimeType,
        })

      if (uploadError) throw uploadError

      // 插入數據庫記錄
      const { data: insertData, error: insertError } = await supabase
        .from('recordings')
        .insert({
          owner_id: userId,
          display_name: displayName,
          storage_path: storagePath,
          duration_seconds: Math.round(duration),
          status: 'pending',
          location_name: locationName.value || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 獲取簽名 URL
      let signedUrl = ''
      try {
        const { data: signedData } = await supabase.storage
          .from('kongshan_recordings')
          .createSignedUrl(storagePath, 3600)
        signedUrl = signedData?.signedUrl || ''
      } catch (e) {
        console.warn('生成錄音簽名網址失敗:', e)
      }

      return {
        id: insertData.id,
        display_name: insertData.display_name,
        storage_path: insertData.storage_path,
        duration_seconds: insertData.duration_seconds,
        file_url: signedUrl,
        owner_id: insertData.owner_id,
        status: insertData.status,
        location_name: insertData.location_name,
      }
    } catch (error) {
      console.error('上傳錄音失敗:', error)
      uploadError.value = error.message
      throw error
    } finally {
      isUploading.value = false
    }
  }

  /**
   * 獲取當前位置
   */
  async function getCurrentLocation() {
    if (locationName.value) {
      // 已有位置，點擊清除
      locationName.value = null
      return
    }

    isGettingLocation.value = true
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        })
      })

      const { latitude, longitude } = position.coords

      // 逆地理編碼
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'zh-TW,zh;q=0.9',
          },
        }
      )

      if (!response.ok) throw new Error('逆地理編碼失敗')

      const data = await response.json()
      const address = data.address || {}

      // 構建地點名稱
      let name = ''
      if (address.city || address.town || address.village) {
        name = address.city || address.town || address.village
      }
      if (address.suburb || address.neighbourhood) {
        name = name ? `${name} ${address.suburb || address.neighbourhood}` : (address.suburb || address.neighbourhood)
      }
      if (!name && address.county) {
        name = address.county
      }
      if (!name) {
        name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      }

      locationName.value = name
    } catch (error) {
      console.warn('獲取位置失敗:', error)
      locationName.value = null
    } finally {
      isGettingLocation.value = false
    }
  }

  /**
   * 清理資源
   */
  function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    if (autoStopTimeout) {
      clearTimeout(autoStopTimeout)
      autoStopTimeout = null
    }

    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop())
      recordingStream = null
    }

    if (recordingUrl.value) {
      URL.revokeObjectURL(recordingUrl.value)
    }

    mediaRecorder = null
    recordingChunks = []
    startTimestamp = null
    isRecording.value = false
    elapsedSeconds.value = 0
    remainingSeconds.value = MAX_RECORDING_SECONDS
    recordingBlob.value = null
    recordingUrl.value = null
    recordingDuration.value = 0
  }

  /**
   * 重置（保留錄音結果）
   */
  function reset() {
    if (recordingUrl.value) {
      URL.revokeObjectURL(recordingUrl.value)
    }
    recordingBlob.value = null
    recordingUrl.value = null
    recordingDuration.value = 0
    locationName.value = null
    uploadError.value = null
  }

  // 組件卸載時清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 狀態
    isRecording,
    isSupported,
    elapsedSeconds,
    remainingSeconds,
    recordingBlob,
    recordingUrl,
    recordingDuration,
    isUploading,
    uploadError,
    locationName,
    isGettingLocation,

    // 計算屬性
    formattedTime,
    formattedMaxTime,
    hasRecording,

    // 方法
    checkSupport,
    startRecording,
    stopRecording,
    uploadRecording,
    getCurrentLocation,
    cleanup,
    reset,
  }
}

