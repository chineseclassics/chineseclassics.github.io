/**
 * 时文宝鉴 - Supabase 客户端配置
 * 
 * 注意：这是前端配置文件
 * 实际的 API Keys 需要在 Supabase Dashboard 创建项目后获取
 */

// Supabase 项目配置
// 项目：时文宝鉴（shiwen-baojian）
// 项目 ID: ohseemszgahvojgocjqq
export const SUPABASE_CONFIG = {
  // Supabase 项目 URL
  url: 'https://ohseemszgahvojgocjqq.supabase.co',
  
  // Supabase 匿名密钥（Anon Key）
  // 这是公开的，可以在前端使用
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc2VlbXN6Z2Fodm9qZ29janFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTAyMDIsImV4cCI6MjA3NjM2NjIwMn0.Q79ML8tgC4CJ0Nf9PHZy4DzUMd4ApBBF9lMWKB1MYi8',
  
  // 项目标识
  projectId: 'shiwen-baojian'
};

// Edge Functions URL
export const EDGE_FUNCTIONS = {
  aiFeedbackAgent: `${SUPABASE_CONFIG.url}/functions/v1/ai-feedback-agent`
};

// 认证配置
export const AUTH_CONFIG = {
  // 自动角色识别规则
  teacherEmailPattern: /@isf\.edu\.hk$/,      // 老师邮箱格式
  studentEmailPattern: /@student\.isf\.edu\.hk$/,  // 学生邮箱格式
  
  // 会话配置
  sessionDuration: 7 * 24 * 60 * 60,  // 7 天（秒）
  
  // 重定向 URL
  redirectUrls: {
    afterLogin: '/shiwen-baojian/index.html',
    afterLogout: '/shiwen-baojian/index.html'
  }
};

// 运行模式检测
export function detectRunMode() {
  // 检查是否有强制模式标志（用于测试）
  const forceMode = localStorage.getItem('FORCE_RUN_MODE');
  if (forceMode === 'standalone' || forceMode === 'platform') {
    return forceMode;
  }
  
  // 检查平台标识
  if (window.TAIXU_PLATFORM_MODE === true) {
    return 'platform';
  }
  
  // 默认：独立模式
  return 'standalone';
}

// 导出运行模式
export const RUN_MODE = detectRunMode();

console.log(`🎯 时文宝鉴运行模式: ${RUN_MODE}`);

