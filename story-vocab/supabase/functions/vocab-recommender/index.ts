// =====================================================
// vocab-recommender Edge Function
// AI 智能詞彙推薦服務
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { VOCAB_RECOMMENDER_SYSTEM_PROMPT, buildAIPrompt, buildSimplifiedPrompt } from './prompts.ts'
import { buildCumulativeUserProfile, buildSimplifiedUserProfile } from './helpers.ts'

serve(async (req) => {
  // 處理 CORS preflight 請求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 解析請求（新增词表模式参数）
    const { 
      userId, 
      sessionId, 
      roundNumber, 
      storyContext,
      wordlistMode = 'ai',        // 'ai' | 'wordlist'
      wordlistId = null,           // 指定词表ID
      level2Tag = null,            // 第二层级标签
      level3Tag = null,            // 第三层级标签
      userGrade = 0,               // 🎓 用戶年級（僅AI模式使用）
      cachedUserProfile = null,    // 🚀 緩存的用戶數據（優化性能）
      explorationMode = false      // 🔍 探索模式（前3次遊戲）
    } = await req.json()

    if (!userId || !sessionId || !roundNumber) {
      throw new Error('缺少必要參數: userId, sessionId, roundNumber')
    }

    // 從請求頭獲取用戶的 auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('缺少 Authorization header')
    }

    // 初始化 Supabase 客戶端（使用用戶的 auth token，保持 RLS 策略生效）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    let words: any[]
    let source: string

    // 1. 優先檢查詞表模式（詞表模式無需校準檢查）
    if (wordlistMode === 'wordlist' && wordlistId) {
      // 詞表模式：直接從詞表推薦，無需校準
      console.log(`[詞表模式] 詞表ID: ${wordlistId}, L2: ${level2Tag}, L3: ${level3Tag}`)
      words = await recommendFromWordlist(supabase, wordlistId, level2Tag, level3Tag, userId, sessionId, roundNumber)
      source = 'wordlist'
    } else {
      // 2. AI模式：檢查用戶校準狀態
      // 🚀 優化：優先使用緩存數據，避免查詢 user_profiles
      let profile: any = null
      
      if (cachedUserProfile && cachedUserProfile.calibrated !== undefined) {
        // 使用前端傳來的緩存數據
        profile = cachedUserProfile
        console.log('🚀 使用緩存的用戶數據（避免數據庫查詢）')
      } else {
        // 降級：查詢數據庫
        const { data: dbProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        profile = dbProfile
        console.log('⚠️ 緩存數據不可用，查詢數據庫')
      }

      // AI 智能推薦（所有用戶統一使用）
      const totalGames = profile?.total_games || 0
      const modeLabel = explorationMode ? '探索模式' : 'AI 模式'
      console.log(`[${modeLabel}] 用戶 ${userId} 第 ${totalGames + 1} 次遊戲，輪次 ${roundNumber}`)
      
      // 🎓 傳入年級、探索模式標記
      words = await recommendByAI(supabase, userId, sessionId, roundNumber, storyContext, userGrade, explorationMode)
      source = explorationMode ? 'ai_exploration' : 'ai'
    }

    // 記錄推薦歷史
    await supabase
      .from('recommendation_history')
      .insert({
        session_id: sessionId,
        round_number: roundNumber,
        recommended_words: words.map(w => w.word),
        source: source
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        words,
        source
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  } catch (error) {
    console.error('❌ vocab-recommender 錯誤:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})

/**
 * 从指定词表推荐词汇
 */
/**
 * 從詞表推薦詞彙（統一查詢邏輯）
 * 適用於系統詞表和自定義詞表
 */
async function recommendFromWordlist(
  supabase: any,
  wordlistId: string,
  level2Tag: string | null,
  level3Tag: string | null,
  userId: string,
  sessionId: string,
  roundNumber: number
) {
  try {
    // 1. 從統一詞彙表查詢
    let query = supabase
      .from('wordlist_vocabulary')
      .select('word, level_2_tag, level_3_tag')
      .eq('wordlist_id', wordlistId)
    
    // 2. 添加層級過濾
    if (level2Tag) {
      query = query.eq('level_2_tag', level2Tag)
    }
    if (level3Tag) {
      query = query.eq('level_3_tag', level3Tag)
    }
    
    const { data: words, error } = await query
    
    if (error) {
      console.error('❌ 查詢詞表詞彙失敗:', error)
      return []
    }
    
    if (!words || words.length === 0) {
      console.warn(`⚠️  詞表 ${wordlistId} 在指定層級沒有詞彙`)
      return []
    }
    
    console.log(`✅ 從詞表獲取 ${words.length} 個候選詞彙`)
    
    // 3. 根據詞表類型決定去重策略
    // - 自定義詞表：只排除已選擇的詞（詞數可能不足）
    // - 系統詞表/AI模式：排除已推薦的詞（保證新鮮感）
    
    // 先獲取詞表類型
    const { data: wordlistData } = await supabase
      .from('wordlists')
      .select('type, name')
      .eq('id', wordlistId)
      .single()
    
    const isCustomWordlist = wordlistData?.type === 'custom'
    
    // 根據類型選擇不同的去重字段
    const selectField = isCustomWordlist ? 'selected_word' : 'recommended_words'
    
    const { data: rounds, error: roundsError } = await supabase
      .from('game_rounds')
      .select(selectField)
      .eq('session_id', sessionId)
    
    if (roundsError) {
      console.error('❌ 查詢 game_rounds 失敗:', roundsError)
    }
    
    let usedWords: Set<string>
    
    if (isCustomWordlist) {
      // 自定義詞表：只排除已選擇的詞
      usedWords = new Set(
        rounds?.map(r => r.selected_word).filter(Boolean) || []
      )
      console.log(`📊 [自定義詞表] 用戶已選擇詞彙數: ${usedWords.size} 個`, Array.from(usedWords))
    } else {
      // 系統詞表/AI模式：排除所有已推薦的詞
      usedWords = new Set(
        rounds?.flatMap(r => r.recommended_words?.map((w: any) => w.word) || []) || []
      )
      console.log(`📊 [系統詞表] 已推薦詞彙數: ${usedWords.size} 個`, Array.from(usedWords))
    }
    
    // 4. 過濾已使用的詞彙
    const availableWords = words.filter(w => !usedWords.has(w.word))
    
    if (availableWords.length < 5) {
      const needed = 5 - availableWords.length
      
      if (isCustomWordlist) {
        // 自定義詞表：允許補充已選擇的詞
        console.warn(`⚠️  [自定義詞表] 可用詞彙不足5個（剩餘 ${availableWords.length} 個），需要補充 ${needed} 個`)
        
        const alreadySelected = words.filter(w => usedWords.has(w.word))
        const shuffled = alreadySelected.sort(() => Math.random() - 0.5)
        const supplements = shuffled.slice(0, needed)
        
        console.log(`✅ 補充已選詞: ${supplements.map(w => w.word).join('、')}`)
        
        const finalWords = [...availableWords, ...supplements]
        
        return finalWords.map(w => ({
          word: w.word,
          difficulty: 3,
          category: 'flexible',
          isRepeated: usedWords.has(w.word)
        }))
      } else {
        // 系統詞表：理論上不應該發生詞數不足
        console.error(`❌ [系統詞表] 嚴重錯誤：詞彙不足！詞表: ${wordlistData?.name}, 可用: ${availableWords.length}`)
        
        // 降級處理：返回所有可用詞
        if (availableWords.length === 0) {
          console.error('❌ 完全沒有可用詞彙，返回空數組')
          return []
        }
        
        return availableWords.map(w => ({
          word: w.word,
          difficulty: 3,
          category: 'flexible',
          isRepeated: false
        }))
      }
    }
    
    // 5. 隨機選擇5個
    const shuffled = availableWords.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 5)
    
    console.log(`✅ 推薦了 ${selected.length} 個詞`)
    
    return selected.map(w => ({
      word: w.word,
      difficulty: 3,
      category: 'flexible'
    }))

  } catch (error) {
    console.error('❌ 詞表推薦失敗:', error)
    // 降級：使用默認詞彙
    return getDefaultFallbackWords(2)  // 使用 L2 默認詞彙
  }
}


/**
 * AI 智能推薦（第二次遊戲開始）
 */
async function recommendByAI(
  supabase: any,
  userId: string,
  sessionId: string,
  roundNumber: number,
  storyContext: string,
  userGrade: number = 0,        // 🎓 用戶年級（僅作輔助參考）
  explorationMode: boolean = false  // 🔍 探索模式（前3次遊戲）
) {
  try {
    // 1. 獲取本次會話已推薦的詞（去重）
    const { data: recentRec } = await supabase
      .from('recommendation_history')
      .select('recommended_words')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    const recentWords = new Set(
      (recentRec || []).flatMap(r => r.recommended_words || [])
    )
    
    console.log(`[AI 推薦去重] 本次會話已推薦 ${recentWords.size} 個詞`)

    // 2. 構建用戶畫像（探索模式使用簡化版，減少查詢）
    const userProfile = explorationMode 
      ? await buildSimplifiedUserProfile(supabase, userId)
      : await buildCumulativeUserProfile(supabase, userId)

    // 3. 構建 Prompt（探索模式使用簡化版，減少 token 數量）
    const usedWordsList = Array.from(recentWords).join('、')
    const prompt = explorationMode
      ? buildSimplifiedPrompt(userProfile, storyContext, roundNumber, usedWordsList)
      : buildAIPrompt(userProfile, storyContext, roundNumber, usedWordsList, userGrade, explorationMode)

    // 4. 調用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: VOCAB_RECOMMENDER_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API 錯誤: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const aiWords = JSON.parse(data.choices[0].message.content)

    // 5. 過濾掉已推薦的詞（雙重保險）
    let filteredWords = (aiWords.words || []).filter((w: any) => !recentWords.has(w.word))
    
    // 6. 如果過濾後不足 5 個，使用默認詞彙補充
    if (filteredWords.length < 5) {
      console.warn(`⚠️ AI 推薦過濾後只有 ${filteredWords.length} 個詞，使用默認詞彙補充`)
      const defaultWords = getDefaultFallbackWords(userProfile.current_level)
      
      // 補充到 5 個
      const needed = 5 - filteredWords.length
      const supplements = defaultWords
        .filter((w: any) => !recentWords.has(w.word) && !filteredWords.some((fw: any) => fw.word === w.word))
        .slice(0, needed)
      
      filteredWords = [...filteredWords, ...supplements]
    }

    console.log(`[AI 推薦] 成功為用戶 ${userId} 推薦 ${filteredWords.length} 個詞（去重後）`)

    return filteredWords
  } catch (error) {
    console.error('❌ AI 推薦失敗:', error)
    // 降級：使用默認詞彙
    console.log('[降級] 使用默認詞彙作為備用')
    return getDefaultFallbackWords(2)  // 使用 L2 作為安全默認值
  }
}

/**
 * 獲取默認備用詞彙（基於用戶水平）
 * @param {number} userLevel - 用戶難度水平 (1-5)
 * @returns {Array} 默認詞彙列表
 */
function getDefaultFallbackWords(userLevel: number) {
  // 根據用戶水平提供不同難度的默認詞彙
  const allDefaults = [
    // L1
    { word: '高興', difficulty: 1 },
    { word: '朋友', difficulty: 1 },
    // L2
    { word: '探險', difficulty: 2 },
    { word: '勇敢', difficulty: 2 },
    { word: '發現', difficulty: 2 },
    // L3
    { word: '寧靜', difficulty: 3 },
    { word: '凝視', difficulty: 3 },
    { word: '沉思', difficulty: 3 },
    // L4
    { word: '翱翔', difficulty: 4 },
    { word: '蛻變', difficulty: 4 },
    // L5
    { word: '悠然', difficulty: 5 },
    { word: '斟酌', difficulty: 5 }
  ];
  
  // 過濾出用戶水平附近的詞（±1.5 級）
  const minLevel = Math.max(1, userLevel - 1.5);
  const maxLevel = Math.min(5, userLevel + 1.5);
  
  return allDefaults.filter(w => 
    w.difficulty >= minLevel && w.difficulty <= maxLevel
  );
}

