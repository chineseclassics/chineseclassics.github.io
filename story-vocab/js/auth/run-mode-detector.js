// =====================================================
// 運行模式檢測器
// 判斷應用是在平台內(iframe)還是獨立運行
// =====================================================
//
// 設計原則：
// 1. 默認為「獨立模式」，即使在 iframe 中運行
// 2. 只有太虛幻境主站明確設置 window.TAIXU_PLATFORM_MODE = true 時
//    才啟用「平台模式」
// 3. 這確保了向後兼容：在主站實現統一登入之前，應用始終使用獨立模式
//
// 未來：當太虛幻境實現統一登入系統後，會在加載 iframe 前設置：
//   <script>window.TAIXU_PLATFORM_MODE = true;</script>
//   <iframe src="story-vocab/index.html"></iframe>
// =====================================================

/**
 * 檢測當前運行模式
 * @returns {'standalone' | 'platform'}
 */
export function detectRunMode() {
  // 方法 1：localStorage 強制模式（用於開發測試）
  const forceMode = localStorage.getItem('FORCE_RUN_MODE');
  if (forceMode === 'standalone' || forceMode === 'platform') {
    console.log(`🔧 強制運行模式: ${forceMode}`);
    return forceMode;
  }
  
  // 方法 2：檢查平台標識（太虛幻境會注入）
  // 這是判斷平台模式的**唯一**標準
  const hasPlatformFlag = window.TAIXU_PLATFORM_MODE === true;
  
  if (hasPlatformFlag) {
    console.log('🌐 檢測到平台集成模式（TAIXU_PLATFORM_MODE = true）');
    return 'platform';
  }
  
  // 默認：獨立運行模式
  // 即使在 iframe 中，只要沒有平台標識，就是獨立模式
  const isInIframe = window.self !== window.top;
  if (isInIframe) {
    console.log('📱 檢測到獨立運行模式（在 iframe 中，但無平台標識）');
  } else {
    console.log('📱 檢測到獨立運行模式');
  }
  
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

