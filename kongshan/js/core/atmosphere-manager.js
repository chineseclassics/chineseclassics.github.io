// =====================================================
// 聲色意境管理模塊
// =====================================================

import { normalizeSoundUrl } from '../utils/sound-url.js';

/**
 * 聲色意境管理器
 * 負責聲色意境數據的加載和管理
 */
export class AtmosphereManager {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * 加載詩歌的默認聲色意境
   * @param {string} poemId - 詩歌 ID
   */
  async loadDefaultAtmosphere(poemId) {
    try {
      if (!this.supabase) {
        console.warn('Supabase 未配置');
        return null;
      }

      const { data, error } = await this.supabase
        .from('poem_atmospheres')
        .select('*')
        .eq('poem_id', poemId)
        .eq('is_default', true)
        .eq('status', 'approved')
        .maybeSingle(); // 使用 maybeSingle 而不是 single，避免 406 錯誤

      if (error) {
        // 406 錯誤通常表示沒有找到記錄，這是正常的
        if (error.code === 'PGRST116' || error.status === 406 || error.status === 404) {
          return null;
        }
        console.error('加載默認聲色意境失敗:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('加載默認聲色意境異常:', error);
      return null;
    }
  }

  /**
   * 加載詩歌的所有聲色意境
   * @param {string} poemId - 詩歌 ID
   */
  async loadAtmospheres(poemId) {
    try {
      if (!this.supabase) {
        console.warn('Supabase 未配置');
        return [];
      }

      const { data, error } = await this.supabase
        .from('poem_atmospheres')
        .select('*')
        .eq('poem_id', poemId)
        .eq('status', 'approved')
        .order('like_count', { ascending: false });

      if (error) {
        console.error('加載聲色意境列表失敗:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('加載聲色意境列表異常:', error);
      return [];
    }
  }

  /**
   * 加載音效詳細信息
   * @param {array} soundIds - 音效 ID 數組
   */
  async loadSoundEffects(soundIds) {
    try {
      if (!this.supabase || !soundIds || soundIds.length === 0) {
        return [];
      }

      // 過濾出有效的 UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUUIDs = soundIds.filter(id => uuidRegex.test(id));

      if (validUUIDs.length === 0) {
        console.warn('沒有有效的 UUID，跳過數據庫查詢');
        return [];
      }

      const { data, error } = await this.supabase
        .from('sound_effects')
        .select('*')
        .in('id', validUUIDs);

      if (error) {
        // 400 錯誤可能是因為查詢格式問題，這是可以接受的
        if (error.status === 400 || error.status === 406) {
          console.warn('加載音效信息失敗（可能是查詢格式問題）:', error);
        } else {
          console.error('加載音效信息失敗:', error);
        }
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('加載音效信息異常:', error);
      return [];
    }
  }

  /**
   * 從聲色意境配置中提取音效列表（包含音量和循環設置）
   * @param {object} atmosphere - 聲色意境對象
   */
  async getAtmosphereSounds(atmosphere) {
    if (!atmosphere || !atmosphere.sound_combination) {
      return [];
    }

    try {
      const combination = Array.isArray(atmosphere.sound_combination)
        ? atmosphere.sound_combination
        : [];

      const systemConfigs = combination.filter(config => (config.source_type || 'system') !== 'recording');
      const recordingConfigs = combination.filter(config => (config.source_type || 'system') === 'recording');

      const sounds = [];

      if (systemConfigs.length > 0) {
        const soundIds = systemConfigs.map(s => s.sound_id);
        const soundEffects = await this.loadSoundEffects(soundIds);

        soundEffects.forEach(effect => {
          const config = systemConfigs.find(s => s.sound_id === effect.id) || {};
          sounds.push({
            id: effect.id,
            name: effect.name,
            description: effect.description,
            file_url: normalizeSoundUrl(effect.file_url),
            duration: effect.duration,
            tags: effect.tags,
            volume: config.volume !== undefined ? config.volume : 1.0,
            loop: config.loop !== undefined ? config.loop : true,
            source_type: 'system'
          });
        });
      }

      if (recordingConfigs.length > 0 && this.supabase) {
        for (const config of recordingConfigs) {
          const recordingId = config.recording_id || config.sound_id;
          const recordingPath = config.recording_path || '';
          let fileUrl = config.file_url || '';

          if ((!fileUrl || fileUrl === '') && recordingPath) {
            try {
              const { data: signedData, error: signedError } = await this.supabase
                .storage
                .from('kongshan_recordings')
                .createSignedUrl(recordingPath, 3600);
              if (!signedError && signedData?.signedUrl) {
                fileUrl = signedData.signedUrl;
              }
            } catch (signedError) {
              console.warn('生成錄音簽名網址失敗:', signedError);
            }
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
            recording_path: recordingPath
          });
        }
      }

      return sounds;
    } catch (error) {
      console.error('解析聲色意境音效失敗:', error);
      return [];
    }
  }
}

