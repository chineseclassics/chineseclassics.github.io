// =====================================================
// 通知管理模塊
// =====================================================

/**
 * 通知管理器
 * 負責通知的檢查、標記已讀、獲取通知列表等功能
 */
export class NotificationManager {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * 檢查用戶是否有新通知
   * @param {string} userId - 用戶 ID
   * @returns {Promise<number>} 未讀通知數量
   */
  async checkNotifications(userId) {
    if (!userId || !this.supabase) {
      return 0;
    }

    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('檢查通知失敗:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('檢查通知異常:', error);
      return 0;
    }
  }

  /**
   * 獲取用戶通知列表
   * @param {string} userId - 用戶 ID
   * @param {number} limit - 限制數量
   * @param {boolean} unreadOnly - 是否只獲取未讀通知
   * @returns {Promise<Array>}
   */
  async getNotifications(userId, limit = 50, unreadOnly = false) {
    if (!userId || !this.supabase) {
      return [];
    }

    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('獲取通知列表失敗:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('獲取通知列表異常:', error);
      return [];
    }
  }

  /**
   * 標記通知為已讀
   * @param {string} notificationId - 通知 ID
   * @param {string} userId - 用戶 ID（用於驗證）
   * @returns {Promise<boolean>}
   */
  async markAsRead(notificationId, userId) {
    if (!notificationId || !userId || !this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId); // 確保只能標記自己的通知

      if (error) {
        console.error('標記通知為已讀失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('標記通知為已讀異常:', error);
      return false;
    }
  }

  /**
   * 標記所有通知為已讀
   * @param {string} userId - 用戶 ID
   * @returns {Promise<boolean>}
   */
  async markAllAsRead(userId) {
    if (!userId || !this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('標記所有通知為已讀失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('標記所有通知為已讀異常:', error);
      return false;
    }
  }

  /**
   * 創建通知
   * @param {string} userId - 用戶 ID
   * @param {string} type - 通知類型
   * @param {string} title - 通知標題
   * @param {string} message - 通知內容
   * @param {string|null} relatedId - 相關記錄 ID
   * @returns {Promise<boolean>}
   */
  async createNotification(userId, type, title, message, relatedId = null) {
    if (!userId || !type || !title || !message || !this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: type,
          title: title,
          message: message,
          related_id: relatedId
        });

      if (error) {
        console.error('創建通知失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('創建通知異常:', error);
      return false;
    }
  }

  /**
   * 刪除通知
   * @param {string} notificationId - 通知 ID
   * @param {string} userId - 用戶 ID（用於驗證）
   * @returns {Promise<boolean>}
   */
  async deleteNotification(notificationId, userId) {
    if (!notificationId || !userId || !this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId); // 確保只能刪除自己的通知

      if (error) {
        console.error('刪除通知失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('刪除通知異常:', error);
      return false;
    }
  }
}

