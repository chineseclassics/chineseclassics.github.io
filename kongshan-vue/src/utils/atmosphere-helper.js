/**
 * 聲色意境工具函數
 * 處理音效 URL 標準化和音效信息加載
 */

import { supabase } from '../lib/supabase'

/**
 * 標準化音效 URL
 * 將相對路徑轉換為完整的 Supabase Storage URL
 */
export function normalizeSoundUrl(url, supabaseClient = null) {
  if (!url) return ''

  // 如果已經是完整的 HTTP(S) URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 如果是相對路徑，轉換為 Supabase Storage URL
  if (supabaseClient) {
    const projectUrl = supabaseClient.supabaseUrl.replace('/rest/v1', '')
    
    // 處理不同的路徑格式
    if (url.startsWith('approved/') || url.startsWith('system/') || url.startsWith('pending/')) {
      return `${projectUrl}/storage/v1/object/public/kongshan_recordings/${url}`
    }
    
    if (url.startsWith('/storage/')) {
      return `${projectUrl}${url}`
    }
  }

  return url
}

/**
 * 從聲色意境配置中獲取音效列表
 */
export async function getAtmosphereSounds(atmosphere) {
  if (!atmosphere || !atmosphere.sound_combination) {
    return []
  }

  try {
    const combination = Array.isArray(atmosphere.sound_combination)
      ? atmosphere.sound_combination
      : []

    const systemConfigs = combination.filter((config) => (config.source_type || 'system') !== 'recording')
    const recordingConfigs = combination.filter((config) => (config.source_type || 'system') === 'recording')

    const sounds = []

    // 處理系統音效
    if (systemConfigs.length > 0 && supabase) {
      const soundIds = systemConfigs.map((s) => s.sound_id).filter(Boolean)
      
      if (soundIds.length > 0) {
        // 過濾有效的 UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const validUUIDs = soundIds.filter((id) => uuidRegex.test(id))

        if (validUUIDs.length > 0) {
          const { data: soundEffects, error } = await supabase
            .from('sound_effects')
            .select('*')
            .in('id', validUUIDs)

          if (!error && soundEffects) {
            soundEffects.forEach((effect) => {
              const config = systemConfigs.find((s) => s.sound_id === effect.id) || {}
              sounds.push({
                id: effect.id,
                name: effect.name,
                description: effect.description,
                file_url: normalizeSoundUrl(effect.file_url, supabase),
                duration: effect.duration,
                tags: effect.tags,
                volume: config.volume !== undefined ? config.volume : 1.0,
                loop: config.loop !== undefined ? config.loop : true,
                source_type: 'system',
              })
            })
          }
        }
      }
    }

    // 處理錄音音效
    if (recordingConfigs.length > 0 && supabase) {
      const recordingIds = recordingConfigs.map((config) => config.recording_id || config.sound_id).filter(Boolean)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const validRecordingIds = recordingIds.filter((id) => uuidRegex.test(id))

      if (validRecordingIds.length > 0) {
        const { data: recordingsData, error } = await supabase
          .from('recordings')
          .select('id, storage_path, status')
          .in('id', validRecordingIds)

        if (!error && recordingsData) {
          const recordingsMap = new Map()
          recordingsData.forEach((rec) => {
            recordingsMap.set(rec.id, {
              storage_path: rec.storage_path,
              status: rec.status,
            })
          })

          recordingConfigs.forEach((config) => {
            const recordingId = config.recording_id || config.sound_id
            const recordingInfo = recordingsMap.get(recordingId)
            const recordingPath = recordingInfo?.storage_path || config.recording_path || ''
            let fileUrl = ''

            if (recordingPath) {
              const projectUrl = supabase.supabaseUrl.replace('/rest/v1', '')
              
              if (recordingPath.startsWith('approved/') || recordingPath.startsWith('system/')) {
                fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${recordingPath}`
              }
            }

            if (!fileUrl) {
              fileUrl = normalizeSoundUrl(config.file_url || '', supabase)
            }

            sounds.push({
              id: recordingId,
              name: config.display_name || '錄音',
              description: null,
              file_url: fileUrl,
              duration: config.duration_seconds || null,
              tags: [],
              volume: config.volume !== undefined ? config.volume : 1.0,
              loop: config.loop !== undefined ? config.loop : true,
              source_type: 'recording',
            })
          })
        }
      }
    }

    return sounds
  } catch (error) {
    console.error('解析聲色意境音效失敗:', error)
    return []
  }
}

