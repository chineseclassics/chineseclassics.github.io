/**
 * Session 管理器 - 統一管理 Supabase Session
 * 
 * 核心理念：
 * 1. 只在認證事件時獲取 session（通過 onAuthStateChange）
 * 2. 其他地方都使用緩存的 session
 * 3. 提供統一的 API 獲取 session 和 token
 */

import { getSupabase } from '../supabase-client.js';

class SessionManager {
  constructor() {
    this.cachedSession = null;
    this.sessionPromise = null;
    this.isInitialized = false;
    this.authSubscription = null;
  }
  
  /**
   * 初始化 Session 管理器
   * 監聽認證狀態變化，自動更新緩存
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ SessionManager 已經初始化');
      return;
    }
    
    console.log('🔧 初始化 SessionManager...');
    const supabase = getSupabase();
    
    // 立即獲取當前 session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      this.cachedSession = session;
      console.log('✅ 初始 session 已緩存:', session?.user?.email || '未登入');
    } catch (error) {
      console.error('❌ 獲取初始 session 失敗:', error);
    }
    
    // 監聽認證狀態變化，自動更新緩存
    this.authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 SessionManager: 認證狀態變化 [${event}]`);
      this.cachedSession = session;
      
      if (event === 'SIGNED_OUT') {
        console.log('🚪 用戶登出，清除 session 緩存');
        this.cachedSession = null;
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('✅ Session 已更新:', session?.user?.email);
      }
    });
    
    this.isInitialized = true;
    console.log('✅ SessionManager 初始化完成');
  }
  
  /**
   * 獲取當前 session（優先使用緩存）
   * @param {boolean} forceRefresh - 是否強制刷新
   * @returns {Promise<Session|null>}
   */
  async getSession(forceRefresh = false) {
    // 如果有緩存且不強制刷新，直接返回
    if (this.cachedSession && !forceRefresh) {
      console.log('♻️ 使用緩存的 session');
      return this.cachedSession;
    }
    
    // 如果有正在進行的請求，等待它完成
    if (this.sessionPromise) {
      console.log('⏳ 等待現有的 session 請求完成...');
      return this.sessionPromise;
    }
    
    // 發起新的請求
    console.log('🔑 從 Supabase 獲取 session...');
    const supabase = getSupabase();
    
    this.sessionPromise = supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('❌ 獲取 session 失敗:', error);
          throw error;
        }
        this.cachedSession = session;
        return session;
      })
      .finally(() => {
        this.sessionPromise = null;
      });
    
    return this.sessionPromise;
  }
  
  /**
   * 獲取當前 access token（用於 API 調用）
   * @returns {Promise<string|null>}
   */
  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  }
  
  /**
   * 獲取當前用戶（來自 session）
   * @returns {Promise<User|null>}
   */
  async getUser() {
    const session = await this.getSession();
    return session?.user || null;
  }
  
  /**
   * 檢查用戶是否已登入
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.cachedSession?.user;
  }
  
  /**
   * 獲取 provider token（如 Google OAuth token）
   * @returns {Promise<string|null>}
   */
  async getProviderToken() {
    const session = await this.getSession();
    return session?.provider_token || null;
  }
  
  /**
   * 清除緩存（登出時調用）
   */
  clear() {
    console.log('🧹 清除 SessionManager 緩存');
    this.cachedSession = null;
    this.sessionPromise = null;
  }
  
  /**
   * 銷毀管理器（清理訂閱）
   */
  destroy() {
    console.log('💥 銷毀 SessionManager');
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    this.clear();
    this.isInitialized = false;
  }
  
  /**
   * 等待 session 就緒（用於啟動時）
   * @param {number} timeout - 超時時間（毫秒），默認 10 秒
   * @returns {Promise<boolean>}
   */
  async waitForSession(timeout = 10000) {
    console.log('⏳ 等待 session 就緒...');
    
    // 如果已經有 session，立即返回
    if (this.cachedSession?.user) {
      console.log('✅ Session 已就緒');
      return true;
    }
    
    // 等待認證事件或超時
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('⚠️ 等待 session 超時');
        resolve(false);
      }, timeout);
      
      // 檢查 session（每 500ms 一次）
      const checkInterval = setInterval(async () => {
        const session = await this.getSession();
        if (session?.user) {
          clearTimeout(timer);
          clearInterval(checkInterval);
          console.log('✅ Session 已就緒');
          resolve(true);
        }
      }, 500);
    });
  }
}

// 創建單例
const sessionManager = new SessionManager();

// 導出單例和類型
export { sessionManager };
export default sessionManager;
