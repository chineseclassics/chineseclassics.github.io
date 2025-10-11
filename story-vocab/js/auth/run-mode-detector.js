// =====================================================
// 運行模式檢測器
// 判斷應用是在平台內(iframe)還是獨立運行
// =====================================================

/**
 * 檢測當前運行模式
 * @returns {'standalone' | 'platform'}
 */
export function detectRunMode() {
  // 方法 1：檢查是否在 iframe 中
  const isInIframe = window.self !== window.top;
  
  // 方法 2：檢查 URL 是否在太虛幻境域名
  const hostname = window.location.hostname;
  const isInPlatformDomain = hostname === 'chineseclassics.github.io';
  
  // 方法 3：檢查是否有平台標識（太虛幻境會注入）
  const hasPlatformFlag = window.TAIXU_PLATFORM_MODE === true;
  
  // 方法 4：localStorage 強制模式（用於開發測試）
  const forceMode = localStorage.getItem('FORCE_RUN_MODE');
  if (forceMode === 'standalone' || forceMode === 'platform') {
    console.log(`🔧 強制運行模式: ${forceMode}`);
    return forceMode;
  }
  
  // 判斷邏輯：任何一個條件滿足就是平台模式
  if (hasPlatformFlag || (isInIframe && isInPlatformDomain)) {
    console.log('🌐 檢測到平台集成模式');
    return 'platform';
  }
  
  console.log('📱 檢測到獨立運行模式');
  return 'standalone';
}

/**
 * 獲取當前運行模式（緩存結果）
 */
let cachedMode = null;

export function getRunMode() {
  if (!cachedMode) {
    cachedMode = detectRunMode();
  }
  return cachedMode;
}

/**
 * 重置運行模式檢測（用於測試）
 */
export function resetRunMode() {
  cachedMode = null;
  console.log('🔄 運行模式檢測已重置');
}

/**
 * 強制設置運行模式（用於開發測試）
 * @param {'standalone' | 'platform' | null} mode
 */
export function setForceMode(mode) {
  if (mode === null) {
    localStorage.removeItem('FORCE_RUN_MODE');
    console.log('✅ 已清除強制模式');
  } else if (mode === 'standalone' || mode === 'platform') {
    localStorage.setItem('FORCE_RUN_MODE', mode);
    console.log(`✅ 已設置強制模式: ${mode}`);
  } else {
    console.error('❌ 無效的模式，只能是 "standalone"、"platform" 或 null');
  }
  resetRunMode();
}

export default {
  detectRunMode,
  getRunMode,
  resetRunMode,
  setForceMode
};

