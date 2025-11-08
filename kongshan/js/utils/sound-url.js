// =====================================================
// 音效 URL 處理工具
// =====================================================

/**
 * 規範化音效文件 URL
 * 支持三種來源：
 * 1. 系統預設音效：Supabase Storage 路徑（system/）或 GitHub Pages 路徑
 * 2. 審核通過的錄音：Supabase Storage 路徑（approved/）
 * 3. 用戶上傳音效：Supabase Storage URL（pending/ 需要簽名 URL）
 * 
 * @param {string} fileUrl - 原始文件 URL
 * @param {object} supabaseClient - Supabase 客戶端（可選，用於構建公開 URL）
 * @returns {string} 規範化後的 URL
 */
export function normalizeSoundUrl(fileUrl, supabaseClient = null) {
  if (!fileUrl) return '';
  
  // 如果已經是完整的 HTTP/HTTPS URL，直接返回
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  // 如果是 Supabase Storage 路徑（system/ 或 approved/），構建公開 URL
  if (fileUrl.startsWith('system/') || fileUrl.startsWith('approved/')) {
    if (supabaseClient?.supabaseUrl) {
      const projectUrl = supabaseClient.supabaseUrl.replace('/rest/v1', '');
      return `${projectUrl}/storage/v1/object/public/kongshan_recordings/${fileUrl}`;
    }
    // 如果沒有 supabaseClient，返回原路徑（調用方需要處理）
    return fileUrl;
  }
  
  // 如果是相對路徑（GitHub Pages），確保以 / 開頭
  if (fileUrl.startsWith('/')) {
    return fileUrl;
  }
  
  // 如果不是以 / 開頭，添加 /kongshan/assets/sounds/ 前綴（兼容舊的 GitHub Pages 路徑）
  return `/kongshan/assets/sounds/${fileUrl}`;
}

/**
 * 判斷音效是否為系統預設音效
 * @param {string} fileUrl - 文件 URL
 * @returns {boolean}
 */
export function isSystemSound(fileUrl) {
  if (!fileUrl) return false;
  
  // Supabase Storage 路徑（system/）
  if (fileUrl.startsWith('system/')) {
    return true;
  }
  
  // GitHub Pages 路徑
  return fileUrl.startsWith('/') || fileUrl.includes('/assets/sounds/');
}

/**
 * 判斷音效是否為用戶上傳音效（審核通過的錄音）
 * @param {string} fileUrl - 文件 URL
 * @returns {boolean}
 */
export function isUserUploadedSound(fileUrl) {
  if (!fileUrl) return false;
  
  // 審核通過的錄音：Supabase Storage 路徑（approved/）
  if (fileUrl.startsWith('approved/')) {
    return true;
  }
  
  // 用戶上傳音效：Supabase Storage URL（包含 supabase.co/storage）
  return fileUrl.includes('supabase.co/storage');
}

/**
 * 判斷音效是否需要簽名 URL
 * @param {string} fileUrl - 文件 URL 或路徑
 * @returns {boolean}
 */
export function needsSignedUrl(fileUrl) {
  if (!fileUrl) return false;
  
  // pending/ 路徑需要簽名 URL
  if (fileUrl.startsWith('pending/')) {
    return true;
  }
  
  // system/ 和 approved/ 路徑是公開的，不需要簽名 URL
  if (fileUrl.startsWith('system/') || fileUrl.startsWith('approved/')) {
    return false;
  }
  
  // 完整的 HTTP URL 不需要簽名
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return false;
  }
  
  // 其他情況（如舊的 GitHub Pages 路徑）不需要簽名
  return false;
}

