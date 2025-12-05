// =====================================================
// Supabase 客户端封装
// 提供统一的数据访问接口
// =====================================================

import { SUPABASE_CONFIG, validateConfig } from './config.js';

// 全局 Supabase 客户端实例
let supabaseClient = null;

/**
 * 初始化 Supabase 客户端
 */
export async function initSupabase() {
  // 如果已经初始化，直接返回
  if (supabaseClient) {
    console.log('ℹ️ Supabase 客户端已存在，跳过重复初始化');
    return supabaseClient;
  }
  
  // 验证配置
  if (!validateConfig()) {
    throw new Error('Supabase 配置不完整');
  }
  
  try {
    // 動態加載 Supabase 客戶端庫
    // 使用 esm.sh 確保正確的 ES 模組支持
    const supabaseModule = await import('https://esm.sh/@supabase/supabase-js@2');
    const { createClient } = supabaseModule;
    
    // 配置選項
    const options = {
      auth: {
        autoRefreshToken: true,          // 自動刷新 token
        persistSession: true,            // 保留 session 持久化
        detectSessionInUrl: true,        // 檢測 OAuth 回調 URL
        storage: window.localStorage     // 使用 localStorage
      }
    };
    
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      options
    );
    
    console.log('✅ Supabase 客戶端初始化成功');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Supabase 客戶端初始化失敗:', error);
    console.error('錯誤詳情:', error.message, error.stack);
    throw error;
  }
}

/**
 * 获取 Supabase 客户端实例
 */
export function getSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase 客户端未初始化，请先调用 initSupabase()');
  }
  return supabaseClient;
}

// =====================================================
// 用户相关 API
// =====================================================

/**
 * 匿名登录（已棄用）
 * @deprecated 請使用新的認證系統：auth/standalone-auth.js 中的 loginAnonymously()
 * 
 * 新的使用方式：
 * import { createAuthService } from './auth/auth-service.js';
 * const authService = await createAuthService();
 * const user = await authService.loginAnonymously();
 */
export async function signInAnonymously() {
  console.warn('⚠️ signInAnonymously() 已棄用');
  console.warn('⚠️ 請使用新的認證系統：auth/standalone-auth.js');
  
  throw new Error('signInAnonymously() 已棄用，請使用新的認證系統');
}

/**
 * 获取当前用户（已棄用）
 * @deprecated 請使用認證服務：authService.getCurrentUser()
 * 
 * 新的使用方式：
 * import { createAuthService } from './auth/auth-service.js';
 * const authService = await createAuthService();
 * const user = await authService.getCurrentUser();
 */
export async function getCurrentUser() {
  console.warn('⚠️ getCurrentUser() 已棄用');
  console.warn('⚠️ 請使用認證服務：authService.getCurrentUser()');
  
  const supabase = getSupabase();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    if (!user) return null;
    
    // 🔧 修復：通過 user_identities 查找正確的 users.id
    const { data: identity, error: identityError } = await supabase
      .from('user_identities')
      .select('*, users(*)')
      .eq('provider_id', user.id)
      .maybeSingle();
    
    if (identityError) throw identityError;
    
    if (identity && identity.users) {
      return identity.users;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 获取当前用户失败:', error);
    return null;
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(userId, updates) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// =====================================================
// 故事会话相关 API
// =====================================================

/**
 * 创建新的故事会话
 */
export async function createStorySession(userId, sessionData) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('story_sessions')
    .insert({
      user_id: userId,
      story_theme: sessionData.theme,
      initial_choice: sessionData.choice,
      opening_variant: sessionData.variant || 1,
      max_rounds: sessionData.maxRounds || 15
    })
    .select()
    .single();
  
  if (error) throw error;
  
  console.log('✅ 故事会话创建成功:', data.id);
  return data;
}

/**
 * 更新故事会话
 */
export async function updateStorySession(sessionId, updates) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('story_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 获取故事会话
 */
export async function getStorySession(sessionId) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('story_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 添加对话到故事历史
 */
export async function addConversationToSession(sessionId, message) {
  const supabase = getSupabase();
  
  // 获取当前历史
  const session = await getStorySession(sessionId);
  const history = session.conversation_history || [];
  
  // 添加新消息
  history.push(message);
  
  // 更新
  const { data, error } = await supabase
    .from('story_sessions')
    .update({
      conversation_history: history,
      current_round: session.current_round + (message.role === 'ai' ? 1 : 0)
    })
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 完成故事会话
 */
export async function completeStorySession(sessionId, creativityScore, creativityDetails) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('story_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      creativity_score: creativityScore,
      creativity_details: creativityDetails
    })
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  
  // 更新用户统计
  const session = data;
  await supabase.rpc('increment', {
    table_name: 'users',
    row_id: session.user_id,
    column_name: 'total_stories_completed',
    amount: 1
  });
  
  console.log('✅ 故事完成:', sessionId);
  return data;
}

// =====================================================
// 词汇相关 API
// =====================================================

// =====================================================
// 📝 註：getRecommendedVocabulary 函數已刪除
// 原因：vocabulary 表已刪除（架構重構 2025-10-13）
// 詞彙推薦現在統一通過 vocab-recommender Edge Function
// =====================================================

/**
 * 记录词汇使用
 */
export async function recordVocabularyUsage(userId, vocabularyId, sentence, storyId) {
  const supabase = getSupabase();
  
  // 检查是否已有记录
  const { data: existing } = await supabase
    .from('user_vocabulary')
    .select('*')
    .eq('user_id', userId)
    .eq('vocabulary_id', vocabularyId)
    .single();
  
  if (existing) {
    // 更新已有记录
    const sentences = existing.user_sentences || [];
    sentences.push({
      sentence,
      story_id: storyId,
      date: new Date().toISOString()
    });
    
    const { data, error } = await supabase
      .from('user_vocabulary')
      .update({
        times_used: existing.times_used + 1,
        user_sentences: sentences,
        last_reviewed_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // 创建新记录
    const { data, error } = await supabase
      .from('user_vocabulary')
      .insert({
        user_id: userId,
        vocabulary_id: vocabularyId,
        times_used: 1,
        user_sentences: [{
          sentence,
          story_id: storyId,
          date: new Date().toISOString()
        }]
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

/**
 * 添加到生词本
 */
export async function addToWordbook(userId, vocabularyId, fromStoryId, exampleSentence) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('user_wordbook')
    .upsert({
      user_id: userId,
      vocabulary_id: vocabularyId,
      from_story_id: fromStoryId,
      example_sentence: exampleSentence
    })
    .select()
    .single();
  
  if (error) throw error;
  
  console.log('✅ 已添加到生词本');
  return data;
}

/**
 * 获取用户生词本
 */
export async function getUserWordbook(userId) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('user_wordbook')
    .select(`
      *,
      vocabulary:vocabulary_id (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// =====================================================
// Edge Functions 调用
// =====================================================

/**
 * 调用 AI 故事生成
 */
export async function callStoryAgent(sessionId, userInput, selectedWord) {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase.functions.invoke('story-agent', {
      body: {
        sessionId,
        userInput,
        selectedWord
      }
    });
    
    if (error) throw error;
    
    console.log('✅ AI 回应生成成功');
    return data;
  } catch (error) {
    console.error('❌ AI 调用失败:', error);
    throw error;
  }
}

// =====================================================
// 导出所有 API
// =====================================================

export default {
  initSupabase,
  getSupabase,
  
  // 用户
  signInAnonymously,
  getCurrentUser,
  updateUser,
  
  // 故事会话
  createStorySession,
  updateStorySession,
  getStorySession,
  addConversationToSession,
  completeStorySession,
  
  // 词汇
  recordVocabularyUsage,
  addToWordbook,
  getUserWordbook,
  
  // AI
  callStoryAgent
};

