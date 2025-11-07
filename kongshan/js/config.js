// =====================================================
// 空山應用配置文件
// =====================================================

// Supabase 配置
// 注意：這些是公開的 anon key，可以安全地放在前端
// 真正的安全性由 Row Level Security (RLS) 保證
export const SUPABASE_CONFIG = {
  url: 'https://hithpeekxopcipqhkhyu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdGhwZWVreG9wY2lwcWhraHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTg1MjUsImV4cCI6MjA3ODA5NDUyNX0.bc1sMs6cT8NcnWFA3qVDHJWniW-aWEar9FTb975MlwQ'
};

// API 端點
export const API_ENDPOINTS = {
  poemAnalyzer: '/functions/v1/poem-analyzer'
};

// 應用配置
export const APP_CONFIG = {
  name: '空山',
  version: '0.1.0',
  
  // 音效設置
  audio: {
    maxSimultaneousSounds: 5, // 最多同時播放的音效數量
    defaultVolume: 0.7, // 默認音量
    fadeInDuration: 2000, // 淡入時長（毫秒）
    fadeOutDuration: 2000 // 淡出時長（毫秒）
  },
  
  // 錄音設置
  recording: {
    maxDuration: 120, // 最長錄音時長（秒）
    preferredFormat: 'webm', // 優先格式
    sampleRate: 44100 // 採樣率
  },
  
  // UI 設置
  ui: {
    animationDuration: 300, // 動畫時長（毫秒）
    transitionDuration: 200 // 過渡時長（毫秒）
  },
  
  // 本地存儲鍵名
  storage: {
    currentPoem: 'kongshan_current_poem',
    currentAtmosphere: 'kongshan_current_atmosphere',
    userSettings: 'kongshan_user_settings'
  }
};

// 開發模式配置
export const DEV_CONFIG = {
  enableDebugLogs: true,
  mockData: false, // 設為 true 可以使用假數據測試
  showPerformanceMetrics: false
};

// 輔助函數：檢查配置是否完整
export function validateConfig() {
  const errors = [];
  
  if (!SUPABASE_CONFIG.url) {
    errors.push('❌ Supabase URL 未配置');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    errors.push('❌ Supabase Anon Key 未配置');
  }
  
  if (errors.length > 0) {
    console.warn('配置驗證警告：');
    errors.forEach(err => console.warn(err));
    console.warn('請在創建 Supabase 項目後配置 SUPABASE_CONFIG');
    return false;
  }
  
  console.log('✅ 配置驗證通過');
  return true;
}

// 導出默認配置對象
export default {
  SUPABASE_CONFIG,
  API_ENDPOINTS,
  APP_CONFIG,
  DEV_CONFIG,
  validateConfig
};

