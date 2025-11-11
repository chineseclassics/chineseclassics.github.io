// =====================================================
// 管理員後台管理模塊
// =====================================================

/**
 * 管理員管理器
 * 負責管理員權限檢查、音效審核、詩句管理、音效管理、用戶管理、數據統計、操作日誌記錄等核心功能
 */
export class AdminManager {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * 檢查用戶是否為管理員
   * @param {string} userId - 用戶 ID
   * @returns {Promise<boolean>}
   */
  async isAdmin(userId) {
    if (!userId || !this.supabase) {
      return false;
    }

    try {
      // 使用 RPC 函數避免 RLS 遞迴問題
      const { data, error } = await this.supabase
        .rpc('check_is_admin', { check_user_id: userId });

      if (error) {
        console.error('檢查管理員權限失敗:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('檢查管理員權限異常:', error);
      return false;
    }
  }

  /**
   * 獲取管理員角色
   * @param {string} userId - 用戶 ID
   * @returns {Promise<string|null>} 'super_admin' | 'admin' | null
   */
  async getAdminRole(userId) {
    if (!userId || !this.supabase) {
      return null;
    }

    try {
      // 使用 RPC 函數避免 RLS 遞迴問題
      const { data, error } = await this.supabase
        .rpc('get_admin_role', { check_user_id: userId });

      if (error) {
        console.error('獲取管理員角色失敗:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('獲取管理員角色異常:', error);
      return null;
    }
  }

  /**
   * 檢查用戶是否為超級管理員
   * @param {string} userId - 用戶 ID
   * @returns {Promise<boolean>}
   */
  async isSuperAdmin(userId) {
    const role = await this.getAdminRole(userId);
    return role === 'super_admin';
  }

  /**
   * 記錄操作日誌
   * @param {string} adminId - 管理員 ID
   * @param {string} actionType - 操作類型
   * @param {string} targetType - 目標類型
   * @param {string|null} targetId - 目標 ID
   * @param {object|null} details - 操作詳情
   * @param {string|null} ipAddress - IP 地址
   * @returns {Promise<boolean>}
   */
  async logAdminAction(adminId, actionType, targetType, targetId = null, details = null, ipAddress = null) {
    if (!adminId || !this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('admin_logs')
        .insert({
          admin_id: adminId,
          action_type: actionType,
          target_type: targetType,
          target_id: targetId,
          details: details,
          ip_address: ipAddress
        });

      if (error) {
        console.error('記錄操作日誌失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('記錄操作日誌異常:', error);
      return false;
    }
  }

  /**
   * 獲取操作日誌列表
   * @param {number} page - 頁碼（從 1 開始）
   * @param {number} limit - 每頁數量
   * @param {string|null} actionType - 篩選操作類型
   * @param {string|null} targetType - 篩選目標類型
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAdminLogs(page = 1, limit = 50, actionType = null, targetType = null) {
    if (!this.supabase) {
      return { data: [], total: 0 };
    }

    try {
      let query = this.supabase
        .from('admin_logs')
        .select('*', { count: 'exact' });

      if (actionType) {
        query = query.eq('action_type', actionType);
      }

      if (targetType) {
        query = query.eq('target_type', targetType);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('獲取操作日誌失敗:', error);
        return { data: [], total: 0 };
      }

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('獲取操作日誌異常:', error);
      return { data: [], total: 0 };
    }
  }

  // =====================================================
  // 音效審核功能
  // =====================================================

  /**
   * 獲取待審核錄音列表（分頁）
   * @param {number} page - 頁碼（從 1 開始）
   * @param {number} limit - 每頁數量
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getPendingRecordings(page = 1, limit = 50) {
    if (!this.supabase) {
      return { data: [], total: 0 };
    }

    try {
      // 先查詢 recordings
      const { data: recordings, error: recordingsError, count } = await this.supabase
        .from('recordings')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (recordingsError) {
        console.error('獲取待審核錄音失敗:', recordingsError);
        return { data: [], total: 0 };
      }

      if (!recordings || recordings.length === 0) {
        return {
          data: [],
          total: count || 0
        };
      }

      // 獲取所有 owner_id
      const ownerIds = [...new Set(recordings.map(r => r.owner_id).filter(Boolean))];
      
      // 查詢對應的 travelers 信息
      let ownersMap = new Map();
      if (ownerIds.length > 0) {
        const { data: travelers, error: travelersError } = await this.supabase
          .from('travelers')
          .select('user_id, display_name, email')
          .in('user_id', ownerIds);

        if (!travelersError && Array.isArray(travelers)) {
          travelers.forEach(t => {
            ownersMap.set(t.user_id, {
              display_name: t.display_name,
              email: t.email
            });
          });
        }
      }

      // 合併數據
      const data = recordings.map(recording => ({
        ...recording,
        owner: ownersMap.get(recording.owner_id) || {
          display_name: null,
          email: null
        }
      }));

      return {
        data,
        total: count || 0
      };
    } catch (error) {
      console.error('獲取待審核錄音異常:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 審核錄音
   * @param {string} recordingId - 錄音 ID
   * @param {string} status - 'approved' | 'rejected'
   * @param {string} reviewerId - 審核者 ID
   * @param {string|null} rejectionReason - 拒絕原因（拒絕時必填）
   * @param {string|null} reviewNotes - 審核備註（可選）
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async reviewRecording(recordingId, status, reviewerId, rejectionReason = null, reviewNotes = null) {
    if (!recordingId || !status || !reviewerId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    if (status === 'rejected' && !rejectionReason) {
      return { success: false, error: '拒絕時必須提供拒絕原因' };
    }

    try {
      // 獲取錄音信息（包括 storage_path）
      const { data: recording, error: fetchError } = await this.supabase
        .from('recordings')
        .select('storage_path, owner_id')
        .eq('id', recordingId)
        .single();

      if (fetchError || !recording) {
        console.error('獲取錄音信息失敗:', fetchError);
        return { success: false, error: '無法找到錄音記錄' };
      }

      let newStoragePath = recording.storage_path;

      // 如果審核通過，移動文件從 pending/ 到 approved/
      if (status === 'approved' && recording.storage_path) {
        const oldPath = recording.storage_path;
        
        // 檢查是否已經在 approved/ 路徑下
        if (!oldPath.startsWith('approved/')) {
          // 提取文件名（去掉 pending/{user_id}/ 前綴）
          const pathParts = oldPath.split('/');
          const fileName = pathParts[pathParts.length - 1];
          newStoragePath = `approved/${fileName}`;

          try {
            // 複製文件到新路徑
            const { data: fileData, error: downloadError } = await this.supabase
              .storage
              .from('kongshan_recordings')
              .download(oldPath);

            if (downloadError) {
              console.error('下載原文件失敗:', downloadError);
              return { success: false, error: '無法移動文件：下載失敗' };
            }

            // 上傳到新路徑
            const { error: uploadError } = await this.supabase
              .storage
              .from('kongshan_recordings')
              .upload(newStoragePath, fileData, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError) {
              console.error('上傳到新路徑失敗:', uploadError);
              return { success: false, error: '無法移動文件：上傳失敗' };
            }

            // 刪除舊文件
            const { error: deleteError } = await this.supabase
              .storage
              .from('kongshan_recordings')
              .remove([oldPath]);

            if (deleteError) {
              console.warn('刪除舊文件失敗（可忽略）:', deleteError);
            }
          } catch (moveError) {
            console.error('移動文件異常:', moveError);
            return { success: false, error: '移動文件時發生錯誤' };
          }
        }
      }

      // 更新錄音狀態和 storage_path
      const updateData = {
        status: status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        storage_path: newStoragePath
      };

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      if (reviewNotes) {
        updateData.review_notes = reviewNotes;
      }

      const { error: updateError } = await this.supabase
        .from('recordings')
        .update(updateData)
        .eq('id', recordingId);

      if (updateError) {
        console.error('更新錄音狀態失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      // 如果審核通過，更新使用該錄音的聲色意境狀態
      if (status === 'approved') {
        await this.approveAtmospheresUsingRecording(recordingId);
      }

      // 記錄操作日誌
      await this.logAdminAction(
        reviewerId,
        'review_recording',
        'recording',
        recordingId,
        { status, rejection_reason: rejectionReason, review_notes: reviewNotes }
      );

      // 發送通知
      if (recording?.owner_id) {
        await this.notifyUserReviewResult(
          recording.owner_id,
          recordingId,
          status,
          rejectionReason,
          reviewNotes
        );
      }

      return { success: true };
    } catch (error) {
      console.error('審核錄音異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 審核通過時，自動批准使用該錄音的聲色意境
   * @param {string} recordingId - 錄音 ID
   * @returns {Promise<void>}
   */
  async approveAtmospheresUsingRecording(recordingId) {
    if (!recordingId || !this.supabase) {
      return;
    }

    try {
      // 查找使用該錄音的聲色意境
      // 注意：這裡需要根據實際的數據結構來查詢
      // 假設 sound_combination 中包含 recording_id
      const { data: atmospheres } = await this.supabase
        .from('poem_atmospheres')
        .select('id, sound_combination')
        .eq('status', 'pending');

      if (!atmospheres || atmospheres.length === 0) {
        return;
      }

      const recordingIdStr = recordingId;
      const atmospheresToApprove = atmospheres.filter(atmosphere => {
        if (!atmosphere.sound_combination || !Array.isArray(atmosphere.sound_combination)) {
          return false;
        }
        return atmosphere.sound_combination.some(sound => {
          return sound.source_type === 'recording' && sound.recording_id === recordingIdStr;
        });
      });

      if (atmospheresToApprove.length === 0) {
        return;
      }

      // 批量更新聲色意境狀態
      const atmosphereIds = atmospheresToApprove.map(a => a.id);
      await this.supabase
        .from('poem_atmospheres')
        .update({ status: 'approved' })
        .in('id', atmosphereIds);
    } catch (error) {
      console.error('自動批准聲色意境失敗:', error);
    }
  }

  /**
   * 通知用戶審核結果
   * @param {string} userId - 用戶 ID
   * @param {string} recordingId - 錄音 ID
   * @param {string} status - 'approved' | 'rejected'
   * @param {string|null} rejectionReason - 拒絕原因
   * @param {string|null} reviewNotes - 審核備註
   * @returns {Promise<void>}
   */
  async notifyUserReviewResult(userId, recordingId, status, rejectionReason = null, reviewNotes = null) {
    if (!userId || !recordingId || !this.supabase) {
      return;
    }

    try {
      const title = status === 'approved' ? '音效審核通過' : '音效審核未通過';
      let message = status === 'approved'
        ? '您上傳的音效已通過審核，現在可以被其他用戶使用了。'
        : `您上傳的音效未通過審核。`;

      if (rejectionReason) {
        message += `\n\n拒絕原因：${rejectionReason}`;
      }

      if (reviewNotes) {
        message += `\n\n備註：${reviewNotes}`;
      }

      await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'review_result',
          title: title,
          message: message,
          related_id: recordingId
        });
    } catch (error) {
      console.error('發送審核通知失敗:', error);
    }
  }

  // =====================================================
  // 詩句庫管理功能
  // =====================================================

  /**
   * 獲取所有詩句（分頁）
   * @param {number} page - 頁碼（從 1 開始）
   * @param {number} limit - 每頁數量
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAllPoems(page = 1, limit = 50) {
    if (!this.supabase) {
      return { data: [], total: 0 };
    }

    try {
      const { data, error, count } = await this.supabase
        .from('poems')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error('獲取詩句列表失敗:', error);
        return { data: [], total: 0 };
      }

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('獲取詩句列表異常:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 創建新詩句
   * @param {object} poemData - 詩句數據
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createPoem(poemData) {
    if (!poemData || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      const { data, error } = await this.supabase
        .from('poems')
        .insert({
          title: poemData.title,
          author: poemData.author || null,
          dynasty: poemData.dynasty || null,
          content: poemData.content
        })
        .select()
        .single();

      if (error) {
        console.error('創建詩句失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('創建詩句異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新詩句
   * @param {string} poemId - 詩句 ID
   * @param {object} poemData - 詩句數據
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async updatePoem(poemId, poemData) {
    if (!poemId || !poemData || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      const { data, error } = await this.supabase
        .from('poems')
        .update({
          title: poemData.title,
          author: poemData.author || null,
          dynasty: poemData.dynasty || null,
          content: poemData.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', poemId)
        .select()
        .single();

      if (error) {
        console.error('更新詩句失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('更新詩句異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 刪除詩句
   * @param {string} poemId - 詩句 ID
   * @param {string} adminId - 管理員 ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deletePoem(poemId, adminId) {
    if (!poemId || !adminId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      const { error } = await this.supabase
        .from('poems')
        .delete()
        .eq('id', poemId);

      if (error) {
        console.error('刪除詩句失敗:', error);
        return { success: false, error: error.message };
      }

      // 記錄操作日誌
      await this.logAdminAction(
        adminId,
        'delete_poem',
        'poem',
        poemId,
        { poem_id: poemId }
      );

      return { success: true };
    } catch (error) {
      console.error('刪除詩句異常:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // 旅人錄音管理功能（用於音效管理界面）
  // =====================================================

  /**
   * 獲取所有旅人錄音（分頁，可選狀態過濾）
   * @param {number} page - 頁碼（從 1 開始）
   * @param {number} limit - 每頁數量
   * @param {string|null} statusFilter - 狀態過濾（'pending' | 'approved' | 'rejected' | null 表示全部）
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAllRecordings(page = 1, limit = 50, statusFilter = null) {
    if (!this.supabase) {
      return { data: [], total: 0 };
    }

    try {
      let query = this.supabase
        .from('recordings')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: recordings, error: recordingsError, count } = await query;

      if (recordingsError) {
        console.error('獲取旅人錄音列表失敗:', recordingsError);
        return { data: [], total: 0 };
      }

      if (!recordings || recordings.length === 0) {
        return {
          data: [],
          total: count || 0
        };
      }

      // 獲取所有 owner_id
      const ownerIds = [...new Set(recordings.map(r => r.owner_id).filter(Boolean))];
      
      // 查詢對應的 travelers 信息
      let ownersMap = new Map();
      if (ownerIds.length > 0) {
        const { data: travelers, error: travelersError } = await this.supabase
          .from('travelers')
          .select('user_id, display_name, email')
          .in('user_id', ownerIds);

        if (!travelersError && Array.isArray(travelers)) {
          travelers.forEach(t => {
            ownersMap.set(t.user_id, {
              display_name: t.display_name,
              email: t.email
            });
          });
        }
      }

      // 合併數據
      const data = recordings.map(recording => ({
        ...recording,
        owner: ownersMap.get(recording.owner_id) || {
          display_name: null,
          email: null
        }
      }));

      return {
        data,
        total: count || 0
      };
    } catch (error) {
      console.error('獲取旅人錄音列表異常:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 更新旅人錄音（名稱、狀態等）
   * @param {string} recordingId - 錄音 ID
   * @param {object} recordingData - 錄音數據
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async updateRecording(recordingId, recordingData) {
    if (!recordingId || !recordingData || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (recordingData.display_name !== undefined) {
        updateData.display_name = recordingData.display_name;
      }
      if (recordingData.status !== undefined) {
        updateData.status = recordingData.status;
      }

      const { data, error } = await this.supabase
        .from('recordings')
        .update(updateData)
        .eq('id', recordingId)
        .select()
        .single();

      if (error) {
        console.error('更新旅人錄音失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('更新旅人錄音異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 刪除旅人錄音
   * @param {string} recordingId - 錄音 ID
   * @param {string} adminId - 管理員 ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteRecording(recordingId, adminId) {
    if (!recordingId || !adminId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      // 先獲取錄音信息（包括 storage_path）
      const { data: recording, error: fetchError } = await this.supabase
        .from('recordings')
        .select('storage_path, owner_id')
        .eq('id', recordingId)
        .single();

      if (fetchError) {
        console.error('獲取錄音信息失敗:', fetchError);
        return { success: false, error: '無法找到錄音記錄' };
      }

      // 查找使用該錄音的聲色意境
      const { data: atmospheres } = await this.supabase
        .from('poem_atmospheres')
        .select('id, sound_combination')
        .eq('status', 'approved');

      const recordingIdStr = recordingId;
      const atmospheresToDelete = atmospheres?.filter(atmosphere => {
        if (!atmosphere.sound_combination || !Array.isArray(atmosphere.sound_combination)) {
          return false;
        }
        return atmosphere.sound_combination.some(sound => {
          return sound.source_type === 'recording' && sound.recording_id === recordingIdStr;
        });
      }) || [];

      // 刪除使用該錄音的聲色意境
      if (atmospheresToDelete.length > 0) {
        const atmosphereIds = atmospheresToDelete.map(a => a.id);
        await this.supabase
          .from('poem_atmospheres')
          .delete()
          .in('id', atmosphereIds);
      }

      // 刪除錄音記錄
      const { error } = await this.supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) {
        console.error('刪除錄音失敗:', error);
        return { success: false, error: error.message };
      }

      // 刪除 Storage 文件
      if (recording?.storage_path) {
        try {
          const { error: storageError } = await this.supabase
            .storage
            .from('kongshan_recordings')
            .remove([recording.storage_path]);

          if (storageError) {
            console.warn('刪除 Storage 文件失敗（可忽略）:', storageError);
          }
        } catch (storageError) {
          console.warn('刪除 Storage 文件異常（可忽略）:', storageError);
        }
      }

      // 記錄操作日誌
      await this.logAdminAction(
        adminId,
        'delete_recording',
        'recording',
        recordingId,
        { recording_id: recordingId }
      );

      return { success: true };
    } catch (error) {
      console.error('刪除錄音異常:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // 系統音效庫管理功能
  // =====================================================

  /**
   * 獲取所有系統音效（分頁）
   * @param {number} page - 頁碼（從 1 開始）
   * @param {number} limit - 每頁數量
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAllSoundEffects(page = 1, limit = 50) {
    if (!this.supabase) {
      return { data: [], total: 0 };
    }

    try {
      const { data, error, count } = await this.supabase
        .from('sound_effects')
        .select('*', { count: 'exact' })
        .eq('source', 'system')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error('獲取音效列表失敗:', error);
        return { data: [], total: 0 };
      }

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('獲取音效列表異常:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 創建新音效
   * @param {object} soundData - 音效數據
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createSoundEffect(soundData) {
    if (!soundData || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      const { data, error } = await this.supabase
        .from('sound_effects')
        .insert({
          name: soundData.name,
          description: soundData.description || null,
          file_url: soundData.file_url,
          duration: soundData.duration || null,
          tags: soundData.tags || null,
          source: soundData.source || 'system',
          status: soundData.status || 'approved'
        })
        .select()
        .single();

      if (error) {
        console.error('創建音效失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('創建音效異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新音效（包括改名）
   * @param {string} soundId - 音效 ID
   * @param {object} soundData - 音效數據
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async updateSoundEffect(soundId, soundData) {
    if (!soundId || !soundData || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (soundData.name !== undefined) updateData.name = soundData.name;
      if (soundData.description !== undefined) updateData.description = soundData.description;
      if (soundData.file_url !== undefined) updateData.file_url = soundData.file_url;
      if (soundData.duration !== undefined) updateData.duration = soundData.duration;
      if (soundData.tags !== undefined) updateData.tags = soundData.tags;
      if (soundData.source !== undefined) updateData.source = soundData.source || 'system';
      if (soundData.status !== undefined) updateData.status = soundData.status || 'approved';

      const { data, error } = await this.supabase
        .from('sound_effects')
        .update(updateData)
        .eq('id', soundId)
        .select()
        .single();

      if (error) {
        console.error('更新音效失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('更新音效異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 刪除音效
   * @param {string} soundId - 音效 ID
   * @param {string} adminId - 管理員 ID
   * @returns {Promise<{success: boolean, error?: string, deletedAtmospheres?: number}>}
   */
  async deleteSoundEffect(soundId, adminId) {
    if (!soundId || !adminId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      // 先獲取音效信息（包括 file_url）
      const { data: sound, error: fetchError } = await this.supabase
        .from('sound_effects')
        .select('file_url')
        .eq('id', soundId)
        .single();

      if (fetchError) {
        console.error('獲取音效信息失敗:', fetchError);
        return { success: false, error: '無法找到音效記錄' };
      }

      // 查找使用該音效的聲色意境
      const { data: atmospheres } = await this.supabase
        .from('poem_atmospheres')
        .select('id, sound_combination')
        .eq('status', 'approved');

      const soundIdStr = soundId;
      const atmospheresToDelete = atmospheres?.filter(atmosphere => {
        if (!atmosphere.sound_combination || !Array.isArray(atmosphere.sound_combination)) {
          return false;
        }
        return atmosphere.sound_combination.some(sound => {
          return sound.sound_id === soundIdStr || sound.sound_effect_id === soundIdStr;
        });
      }) || [];

      // 刪除使用該音效的聲色意境
      if (atmospheresToDelete.length > 0) {
        const atmosphereIds = atmospheresToDelete.map(a => a.id);
        await this.supabase
          .from('poem_atmospheres')
          .delete()
          .in('id', atmosphereIds);
      }

      // 刪除音效記錄
      const { error } = await this.supabase
        .from('sound_effects')
        .delete()
        .eq('id', soundId);

      if (error) {
        console.error('刪除音效失敗:', error);
        return { success: false, error: error.message };
      }

      // 如果 file_url 是 Supabase Storage 路徑（system/ 或 approved/），刪除文件
      if (sound?.file_url && (sound.file_url.startsWith('system/') || sound.file_url.startsWith('approved/'))) {
        try {
          const { error: storageError } = await this.supabase
            .storage
            .from('kongshan_recordings')
            .remove([sound.file_url]);

          if (storageError) {
            console.warn('刪除 Storage 文件失敗（可忽略）:', storageError);
          }
        } catch (storageError) {
          console.warn('刪除 Storage 文件異常（可忽略）:', storageError);
        }
      }

      // 記錄操作日誌
      await this.logAdminAction(
        adminId,
        'delete_sound',
        'sound_effect',
        soundId,
        {
          sound_id: soundId,
          deleted_atmospheres_count: atmospheresToDelete.length
        }
      );

      return {
        success: true,
        deletedAtmospheres: atmospheresToDelete.length
      };
    } catch (error) {
      console.error('刪除音效異常:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // 用戶管理功能
  // =====================================================

  /**
   * 獲取所有用戶列表（分頁）
   * @param {number} page - 頁碼（從 1 開始）
   * @param {number} limit - 每頁數量
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAllUsers(page = 1, limit = 50) {
    if (!this.supabase) {
      return { data: [], total: 0 };
    }

    try {
      const { data, error, count } = await this.supabase
        .from('travelers')
        .select('*', { count: 'exact' })
        .order('first_seen', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error('獲取用戶列表失敗:', error);
        return { data: [], total: 0 };
      }

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('獲取用戶列表異常:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 刪除用戶（匿名化處理）
   * @param {string} userId - 用戶 ID
   * @param {string} adminId - 管理員 ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteUser(userId, adminId) {
    if (!userId || !adminId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    try {
      // 匿名化用戶創作的聲色意境
      await this.supabase
        .from('poem_atmospheres')
        .update({ created_by: null })
        .eq('created_by', userId);

      // 刪除用戶的錄音記錄（可選，根據需求決定）
      // await this.supabase
      //   .from('recordings')
      //   .delete()
      //   .eq('owner_id', userId);

      // 刪除用戶記錄
      const { error } = await this.supabase
        .from('travelers')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('刪除用戶失敗:', error);
        return { success: false, error: error.message };
      }

      // 記錄操作日誌
      await this.logAdminAction(
        adminId,
        'delete_user',
        'user',
        userId,
        { user_id: userId }
      );

      return { success: true };
    } catch (error) {
      console.error('刪除用戶異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 提升用戶為管理員
   * @param {string} userId - 用戶 ID
   * @param {string} adminId - 操作的管理員 ID（必須是超級管理員）
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async promoteToAdmin(userId, adminId) {
    if (!userId || !adminId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    // 檢查操作者是否為超級管理員
    const isSuper = await this.isSuperAdmin(adminId);
    if (!isSuper) {
      return { success: false, error: '只有超級管理員可以任命管理員' };
    }

    try {
      const { error } = await this.supabase
        .from('admins')
        .insert({
          user_id: userId,
          role: 'admin',
          created_by: adminId
        });

      if (error) {
        // 如果已存在，則更新角色
        if (error.code === '23505') {
          const { error: updateError } = await this.supabase
            .from('admins')
            .update({ role: 'admin', created_by: adminId })
            .eq('user_id', userId);

          if (updateError) {
            console.error('更新管理員角色失敗:', updateError);
            return { success: false, error: updateError.message };
          }
        } else {
          console.error('提升用戶為管理員失敗:', error);
          return { success: false, error: error.message };
        }
      }

      // 記錄操作日誌
      await this.logAdminAction(
        adminId,
        'promote_admin',
        'admin',
        userId,
        { promoted_user_id: userId, role: 'admin' }
      );

      return { success: true };
    } catch (error) {
      console.error('提升用戶為管理員異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 撤銷管理員權限
   * @param {string} userId - 用戶 ID
   * @param {string} adminId - 操作的管理員 ID（必須是超級管理員）
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async revokeAdmin(userId, adminId) {
    if (!userId || !adminId || !this.supabase) {
      return { success: false, error: '參數不完整' };
    }

    // 檢查操作者是否為超級管理員
    const isSuper = await this.isSuperAdmin(adminId);
    if (!isSuper) {
      return { success: false, error: '只有超級管理員可以撤銷管理員權限' };
    }

    // 不能撤銷自己的權限
    if (userId === adminId) {
      return { success: false, error: '不能撤銷自己的管理員權限' };
    }

    try {
      const { error } = await this.supabase
        .from('admins')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('撤銷管理員權限失敗:', error);
        return { success: false, error: error.message };
      }

      // 記錄操作日誌
      await this.logAdminAction(
        adminId,
        'revoke_admin',
        'admin',
        userId,
        { revoked_user_id: userId }
      );

      return { success: true };
    } catch (error) {
      console.error('撤銷管理員權限異常:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // 數據統計功能
  // =====================================================

  /**
   * 獲取管理員統計數據
   * @param {string} month - 月份（格式：YYYY-MM），默認為當前月份
   * @returns {Promise<object>}
   */
  async getAdminStatistics(month = null) {
    if (!this.supabase) {
      return this.getEmptyStatistics();
    }

    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      const startDate = `${targetMonth}-01T00:00:00Z`;
      const nextMonth = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1));
      const endDate = nextMonth.toISOString();

      // 用戶統計
      const { count: totalUsers } = await this.supabase
        .from('travelers')
        .select('*', { count: 'exact', head: true });

      const { count: newUsersThisMonth } = await this.supabase
        .from('travelers')
        .select('*', { count: 'exact', head: true })
        .gte('first_seen', startDate)
        .lt('first_seen', endDate);

      // 聲色意境統計
      const { count: totalAtmospheres } = await this.supabase
        .from('poem_atmospheres')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { count: newAtmospheresThisMonth } = await this.supabase
        .from('poem_atmospheres')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      // 音效統計
      const { count: systemSounds } = await this.supabase
        .from('sound_effects')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'system')
        .eq('status', 'approved');

      const { count: userSounds } = await this.supabase
        .from('sound_effects')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'user')
        .eq('status', 'approved');

      const { count: pendingRecordings } = await this.supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 詩句統計
      const { count: totalPoems } = await this.supabase
        .from('poems')
        .select('*', { count: 'exact', head: true });

      // 用戶增長趨勢（按月）
      const { data: userGrowthData } = await this.supabase
        .from('travelers')
        .select('first_seen')
        .order('first_seen', { ascending: true });

      // 聲色意境創建趨勢（按月）
      const { data: atmosphereGrowthData } = await this.supabase
        .from('poem_atmospheres')
        .select('created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      // 熱門詩句（按聲色意境數量）
      const { data: popularPoems } = await this.supabase
        .from('poem_atmospheres')
        .select('poem_id')
        .eq('status', 'approved');

      return {
        users: {
          total: totalUsers || 0,
          newThisMonth: newUsersThisMonth || 0
        },
        atmospheres: {
          total: totalAtmospheres || 0,
          newThisMonth: newAtmospheresThisMonth || 0
        },
        sounds: {
          system: systemSounds || 0,
          user: userSounds || 0,
          pending: pendingRecordings || 0
        },
        poems: {
          total: totalPoems || 0
        },
        trends: {
          userGrowth: this.processGrowthData(userGrowthData, 'first_seen'),
          atmosphereGrowth: this.processGrowthData(atmosphereGrowthData, 'created_at'),
          popularPoems: this.processPopularPoems(popularPoems)
        }
      };
    } catch (error) {
      console.error('獲取統計數據失敗:', error);
      return this.getEmptyStatistics();
    }
  }

  /**
   * 處理增長趨勢數據
   * @param {Array} data - 原始數據
   * @param {string} dateField - 日期字段名
   * @returns {Array} 按月統計的數據
   */
  processGrowthData(data, dateField) {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    const monthlyCounts = {};
    data.forEach(item => {
      const date = new Date(item[dateField]);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthlyCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * 處理熱門詩句數據
   * @param {Array} data - 聲色意境數據
   * @returns {Array} 按數量排序的詩句統計
   */
  processPopularPoems(data) {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    const poemCounts = {};
    data.forEach(item => {
      if (item.poem_id) {
        poemCounts[item.poem_id] = (poemCounts[item.poem_id] || 0) + 1;
      }
    });

    return Object.entries(poemCounts)
      .map(([poemId, count]) => ({ poemId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 取前 10 名
  }

  /**
   * 獲取空統計數據
   * @returns {object}
   */
  getEmptyStatistics() {
    return {
      users: { total: 0, newThisMonth: 0 },
      atmospheres: { total: 0, newThisMonth: 0 },
      sounds: { system: 0, user: 0, pending: 0 },
      poems: { total: 0 },
      trends: {
        userGrowth: [],
        atmosphereGrowth: [],
        popularPoems: []
      }
    };
  }
}

