// =====================================================
// 音效 URL 處理工具
// =====================================================

/**
 * 規範化音效文件 URL
 * 支持兩種來源：
 * 1. 系統預設音效：相對路徑（GitHub Pages）
 * 2. 用戶上傳音效：Supabase Storage URL
 * 
 * @param {string} fileUrl - 原始文件 URL
 * @returns {string} 規範化後的 URL
 */
export function normalizeSoundUrl(fileUrl) {
  if (!fileUrl) return '';
  
  // 如果已經是完整的 HTTP/HTTPS URL，直接返回
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  // 如果是相對路徑，確保以 / 開頭
  if (fileUrl.startsWith('/')) {
    return fileUrl;
  }
  
  // 如果不是以 / 開頭，添加 /kongshan/assets/sounds/ 前綴
  return `/kongshan/assets/sounds/${fileUrl}`;
}

/**
 * 判斷音效是否為系統預設音效
 * @param {string} fileUrl - 文件 URL
 * @returns {boolean}
 */
export function isSystemSound(fileUrl) {
  if (!fileUrl) return false;
  
  // 系統音效：相對路徑或包含 /assets/sounds/
  return fileUrl.startsWith('/') || fileUrl.includes('/assets/sounds/');
}

/**
 * 判斷音效是否為用戶上傳音效
 * @param {string} fileUrl - 文件 URL
 * @returns {boolean}
 */
export function isUserUploadedSound(fileUrl) {
  if (!fileUrl) return false;
  
  // 用戶上傳音效：Supabase Storage URL
  return fileUrl.includes('supabase.co/storage');
}

