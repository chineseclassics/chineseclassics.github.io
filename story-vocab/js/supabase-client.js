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
    // 动态加载 Supabase 客户端库
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    
    // 配置選項：明確指定存儲方式和認證流程
    const options = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,  // 明確使用 localStorage
        storageKey: 'sb-auth-token',   // 自定義 key
        flowType: 'pkce'                // PKCE 流程更安全
      }
    };
    
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      options
    );
    
    console.log('✅ Supabase 客户端初始化成功');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Supabase 客户端初始化失败:', error);
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

/**
 * 获取推荐词汇
 */
export async function getRecommendedVocabulary(userId, level, theme, count = 4) {
  const supabase = getSupabase();
  
  // 获取用户已学词汇
  const { data: learnedVocab } = await supabase
    .from('user_vocabulary')
    .select('vocabulary_id')
    .eq('user_id', userId)
    .gte('last_reviewed_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()); // 最近2天
  
  const learnedIds = learnedVocab?.map(v => v.vocabulary_id) || [];
  
  // 查询候选词汇
  let query = supabase
    .from('vocabulary')
    .select('*')
    .eq('difficulty_level', level);
  
  // 如果有主题，添加主题过滤
  if (theme) {
    query = query.contains('theme', [theme]);
  }
  
  // 排除最近学过的词
  if (learnedIds.length > 0) {
    query = query.not('id', 'in', `(${learnedIds.join(',')})`);
  }
  
  // 随机获取
  const { data, error } = await query.limit(count * 3); // 多获取一些以便筛选
  
  if (error) throw error;
  
  // 按类型分类并选择
  const byCategory = {
    action: data.filter(v => v.category === 'action'),
    emotion: data.filter(v => v.category === 'emotion'),
    description: data.filter(v => v.category === 'description'),
    flexible: data.filter(v => v.category === 'flexible')
  };
  
  const selected = [];
  for (const [category, words] of Object.entries(byCategory)) {
    if (words.length > 0) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      selected.push(randomWord);
    }
  }
  
  // 如果不足4个，从所有剩余词中补充
  while (selected.length < count && data.length > selected.length) {
    const remaining = data.filter(v => !selected.includes(v));
    if (remaining.length === 0) break;
    selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }
  
  return selected.slice(0, count);
}

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
  getRecommendedVocabulary,
  recordVocabularyUsage,
  addToWordbook,
  getUserWordbook,
  
  // AI
  callStoryAgent
};

