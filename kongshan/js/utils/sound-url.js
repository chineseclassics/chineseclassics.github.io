// =====================================================
// 音效 URL 處理工具
// =====================================================

/**
 * 規範化音效文件 URL
 * 僅支持 Supabase Storage：
 * 1. 系統預設音效：Storage 路徑（system/）
 * 2. 審核通過的錄音：Storage 路徑（approved/）
 * 3. 待審核錄音：Storage 路徑（pending/，需要簽名 URL，簽名邏輯在上層處理）
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
    // 如果沒有 supabaseClient，返回原路徑（由上層補全或避免直接請求）
    return fileUrl;
  }
  
  // pending/ 路徑需簽名，上層負責生成簽名 URL，這裡直接返回原值以便上層識別
  if (fileUrl.startsWith('pending/')) {
    return fileUrl;
  }

  // 其他情況：不再提供 GitHub Pages 後備邏輯，直接返回（由上層決定是否處理）
  return fileUrl;
}

/**
 * 判斷音效是否為系統預設音效
 * @param {string} fileUrl - 文件 URL
 * @returns {boolean}
 */
export function isSystemSound(fileUrl) {
  if (!fileUrl) return false;
  
  // Supabase Storage 路徑（system/）或已構建的公開 URL
  return (
    fileUrl.startsWith('system/') ||
    fileUrl.includes('/storage/v1/object/public/kongshan_recordings/system/')
  );
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
  
  // 用戶上傳音效：Supabase Storage URL
  return fileUrl.includes('/storage/v1/object/');
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
  
  // 其他情況（不支援 GitHub Pages 路徑）默認不需要簽名
  return false;
}

