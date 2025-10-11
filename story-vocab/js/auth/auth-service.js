// =====================================================
// 認證服務抽象層
// 定義統一的認證接口，支持多種實現
// =====================================================

/**
 * 認證服務基類
 * 所有認證實現都要繼承這個類
 */
export class AuthService {
  /**
   * 初始化認證服務
   * @returns {Promise<User|null>} 當前用戶（如果已登入）
   */
  async initialize() {
    throw new Error('子類必須實現 initialize()');
  }
  
  /**
   * 獲取當前用戶
   * @returns {Promise<User|null>}
   */
  async getCurrentUser() {
    throw new Error('子類必須實現 getCurrentUser()');
  }
  
  /**
   * Google 登入
   * @returns {Promise<{error?: Error}>}
   */
  async loginWithGoogle() {
    throw new Error('子類必須實現 loginWithGoogle()');
  }
  
  /**
   * 匿名登入（訪客試用）
   * @returns {Promise<User|null>}
   */
  async loginAnonymously() {
    throw new Error('子類必須實現 loginAnonymously()');
  }
  
  /**
   * 登出
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error('子類必須實現 logout()');
  }
  
  /**
   * 監聽認證狀態變化
   * @param {Function} callback - 狀態變化時的回調函數 (event, user) => void
   * @returns {Function} 取消監聽的函數
   */
  onAuthStateChange(callback) {
    throw new Error('子類必須實現 onAuthStateChange()');
  }
  
  /**
   * 獲取運行模式
   * @returns {'standalone' | 'platform'}
   */
  getRunMode() {
    throw new Error('子類必須實現 getRunMode()');
  }
}

/**
 * 用戶數據類型
 * @typedef {Object} User
 * @property {string} id - 用戶 ID (UUID)
 * @property {string} [email] - 郵箱（Google 用戶有，匿名用戶無）
 * @property {string} display_name - 顯示名稱
 * @property {string} [avatar_url] - 頭像 URL
 * @property {number} current_level - 當前等級
 * @property {string} user_type - 用戶類型 ('registered' | 'anonymous')
 * @property {'standalone' | 'platform'} run_mode - 運行模式
 */

// =====================================================
// 認證服務工廠
// =====================================================

import { getRunMode } from './run-mode-detector.js';

/**
 * 創建適合當前運行模式的認證服務
 * @returns {Promise<AuthService>}
 */
export async function createAuthService() {
  const runMode = getRunMode();
  
  console.log(`🔐 創建認證服務（${runMode}模式）...`);
  
  let authService;
  
  if (runMode === 'platform') {
    // 動態導入平台模式實現
    const { PlatformAuth } = await import('./platform-auth.js');
    authService = new PlatformAuth();
  } else {
    // 動態導入獨立模式實現
    const { StandaloneAuth } = await import('./standalone-auth.js');
    authService = new StandaloneAuth();
  }
  
  // 初始化認證服務
  await authService.initialize();
  
  console.log('✅ 認證服務初始化完成');
  
  return authService;
}

// =====================================================
// 導出
// =====================================================

export default {
  AuthService,
  createAuthService
};

