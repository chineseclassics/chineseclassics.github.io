// =====================================================
// 平台集成模式認證
// 接收太虛幻境傳來的用戶信息
// 通過 postMessage 通信
// =====================================================

import { AuthService } from './auth-service.js';
import { getSupabase } from '../supabase-client.js';

export class PlatformAuth extends AuthService {
  constructor() {
    super();
    this.supabase = null;
    this.currentUser = null;
    this.platformUser = null;
  }
  
  async initialize() {
    console.log('🌐 初始化平台集成認證...');
    
    this.supabase = getSupabase();
    
    // 等待平台傳遞用戶信息
    return new Promise((resolve) => {
      // 設置消息監聽器
      const messageHandler = async (event) => {
        // 驗證消息來源（同源策略）
        const allowedOrigins = [
          window.location.origin,
          'https://chineseclassics.github.io'
        ];
        
        if (!allowedOrigins.includes(event.origin)) {
          console.warn('⚠️ 忽略來自未授權來源的消息:', event.origin);
          return;
        }
        
        // 處理平台認證消息
        if (event.data.type === 'TAIXU_AUTH') {
          console.log('✅ 收到平台用戶信息');
          this.platformUser = event.data.user;
          
          // 同步到詞遊記的 users 表
          try {
            await this.syncPlatformUser(this.platformUser);
            resolve(this.currentUser);
          } catch (error) {
            console.error('❌ 同步平台用戶失敗:', error);
            resolve(null);
          }
        }
        
        // 處理平台認證狀態變化
        if (event.data.type === 'TAIXU_AUTH_CHANGED') {
          console.log('🔐 平台認證狀態變化');
          if (event.data.user) {
            await this.syncPlatformUser(event.data.user);
          } else {
            this.currentUser = null;
            this.platformUser = null;
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // 告訴平台：我準備好接收用戶信息了
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'TAIXU_APP_READY',
          app: 'story-vocab',
          timestamp: new Date().toISOString()
        }, '*');
        
        console.log('📤 已通知平台：應用準備就緒');
      }
      
      // 超時處理（10秒）
      setTimeout(() => {
        if (!this.currentUser) {
          console.warn('⚠️ 10秒內未收到平台用戶信息');
          console.warn('⚠️ 可能平台尚未實現統一登入，或不在平台環境中');
          resolve(null);
        }
      }, 10000);
    });
  }
  
  async getCurrentUser() {
    return this.currentUser;
  }
  
  async loginWithGoogle() {
    // 平台模式下，登入由太虛幻境主站處理
    console.log('🌐 平台模式：請在太虛幻境主站登入');
    
    // 通知主站需要登入
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'TAIXU_REQUEST_LOGIN',
        app: 'story-vocab',
        timestamp: new Date().toISOString()
      }, '*');
    }
    
    return { error: new Error('請在太虛幻境主站登入') };
  }
  
  async loginAnonymously() {
    // 平台模式下不支持匿名登入
    console.log('🌐 平台模式：不支持匿名登入');
    return null;
  }
  
  async logout() {
    console.log('🌐 平台模式：通知主站登出');
    
    // 通知主站登出
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'TAIXU_REQUEST_LOGOUT',
        app: 'story-vocab',
        timestamp: new Date().toISOString()
      }, '*');
    }
    
    this.currentUser = null;
    this.platformUser = null;
  }
  
  onAuthStateChange(callback) {
    // 平台模式下，監聽來自主站的消息
    const messageHandler = (event) => {
      const allowedOrigins = [
        window.location.origin,
        'https://chineseclassics.github.io'
      ];
      
      if (!allowedOrigins.includes(event.origin)) return;
      
      if (event.data.type === 'TAIXU_AUTH_CHANGED') {
        if (event.data.user) {
          this.syncPlatformUser(event.data.user).then(() => {
            callback('SIGNED_IN', this.currentUser);
          });
        } else {
          this.currentUser = null;
          callback('SIGNED_OUT', null);
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // 返回取消監聽函數
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }
  
  getRunMode() {
    return 'platform';
  }
  
  // =====================================================
  // 內部方法
  // =====================================================
  
  /**
   * 同步平台用戶到詞遊記的 users 表
   */
  async syncPlatformUser(platformUser) {
    try {
      const email = platformUser.email;
      
      if (!email) {
        throw new Error('平台用戶信息缺少 email');
      }
      
      // 1. 用 email 查找用戶（跨模式統一的關鍵）
      let { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (existingUser) {
        console.log('✅ 找到已存在的用戶（通過 email）');
        
        // 更新用戶信息和最後登入時間
        const { data: updatedUser } = await this.supabase
          .from('users')
          .update({
            display_name: platformUser.display_name || existingUser.display_name,
            avatar_url: platformUser.avatar_url || existingUser.avatar_url,
            last_login_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        
        this.currentUser = {
          ...updatedUser,
          run_mode: 'platform',
          platform_user: platformUser
        };
      } else {
        // 2. 創建新用戶（使用平台的用戶信息）
        console.log('📝 創建新用戶（來自平台）...');
        
        const { data: newUser, error: createError } = await this.supabase
          .from('users')
          .insert({
            email: email,
            display_name: platformUser.display_name || email.split('@')[0],
            avatar_url: platformUser.avatar_url,
            user_type: 'registered',
            last_login_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ 創建用戶失敗:', createError);
          throw createError;
        }
        
        this.currentUser = {
          ...newUser,
          run_mode: 'platform',
          platform_user: platformUser
        };
        
        console.log('✅ 平台用戶已同步到詞遊記');
      }
      
      // 3. 如果平台傳來了 Google ID，綁定身份
      if (platformUser.google_id) {
        await this.supabase
          .from('user_identities')
          .upsert({
            user_id: this.currentUser.id,
            provider: 'google',
            provider_id: platformUser.google_id,
            provider_data: {
              email: email,
              displayName: platformUser.display_name
            },
            last_used_at: new Date().toISOString()
          }, {
            onConflict: 'provider,provider_id'
          });
        
        console.log('✅ Google 身份已綁定');
      }
      
    } catch (error) {
      console.error('❌ 同步平台用戶失敗:', error);
      throw error;
    }
  }
  
  /**
   * 同步學習數據到平台用戶中心（可選）
   * 當應用有重要學習數據時調用
   */
  async syncLearningDataToPlatform(data) {
    if (!this.platformUser) {
      console.warn('⚠️ 無平台用戶，跳過數據同步');
      return;
    }
    
    // 通知平台更新學習數據
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'TAIXU_SYNC_LEARNING_DATA',
        app: 'story-vocab',
        data: data,
        timestamp: new Date().toISOString()
      }, '*');
      
      console.log('📤 學習數據已同步到平台');
    }
  }
}

export default PlatformAuth;

