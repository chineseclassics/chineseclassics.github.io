// =====================================================
// vocab-recommender Edge Function
// AI 智能詞彙推薦服務
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { VOCAB_RECOMMENDER_SYSTEM_PROMPT, buildAIPrompt } from './prompts.ts'
import { getCalibrationWords, buildCumulativeUserProfile } from './helpers.ts'

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
      level3Tag = null             // 第三层级标签
    } = await req.json()

    if (!userId || !sessionId || !roundNumber) {
      throw new Error('缺少必要參數: userId, sessionId, roundNumber')
    }

    // 初始化 Supabase 客戶端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!profile || !profile.calibrated) {
        // AI模式且未校準：使用校準詞庫
        console.log(`[校準模式] 用戶 ${userId} 第一次遊戲，輪次 ${roundNumber}`)
        words = await getCalibrationWords(supabase, userId, roundNumber)
        source = 'calibration'
      } else {
        // AI模式且已校準：AI智能推薦
        console.log(`[AI 模式] 用戶 ${userId} 第 ${profile.total_games + 1} 次遊戲，輪次 ${roundNumber}`)
        words = await recommendByAI(supabase, userId, sessionId, roundNumber, storyContext)
        source = 'ai'
      }
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
    // 1. 构建查询条件
    let query = supabase
      .from('vocabulary')
      .select(`
        id,
        word,
        difficulty_level,
        category,
        frequency
      `)
      .eq('vocabulary_wordlist_mapping.wordlist_id', wordlistId)

    // 2. 添加层级过滤
    if (level2Tag) {
      query = query.eq('vocabulary_wordlist_mapping.level_2_tag', level2Tag)
    }
    if (level3Tag) {
      query = query.eq('vocabulary_wordlist_mapping.level_3_tag', level3Tag)
    }

    // 3. 获取候选词汇（使用JOIN查询）
    const { data: candidates, error } = await supabase.rpc('get_wordlist_vocabulary', {
      p_wordlist_id: wordlistId,
      p_level_2_tag: level2Tag,
      p_level_3_tag: level3Tag
    })

    if (error) {
      console.error('查询词表失败，使用备用方案:', error)
      // 备用方案：直接查询mapping表
      return await recommendFromWordlistFallback(supabase, wordlistId, level2Tag, level3Tag)
    }

    if (!candidates || candidates.length === 0) {
      console.warn('词表中没有词汇，降级到AI推荐')
      return await getCalibrationWords(supabase, userId, roundNumber)
    }

    // 4. 获取最近推荐的词（避免重复）
    const { data: recentRec } = await supabase
      .from('recommendation_history')
      .select('recommended_words')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(3)

    const recentWords = new Set(
      (recentRec || []).flatMap(r => r.recommended_words || [])
    )

    // 5. 过滤掉最近推荐的词
    const available = candidates.filter(w => !recentWords.has(w.word))

    if (available.length < 5) {
      // 如果过滤后不足5个，补充一些最近推荐的
      available.push(...candidates.filter(w => recentWords.has(w.word)))
    }

    // 6. 随机选择5个词（确保多样性）
    const selected = selectDiverseWords(available, 5)

    console.log(`[詞表推薦] 從詞表 ${wordlistId} 推薦了 ${selected.length} 個詞`)

    return selected.map(w => ({
      word: w.word,
      difficulty: w.difficulty_level,
      category: w.category,
      reason: `来自词表`
    }))

  } catch (error) {
    console.error('❌ 詞表推薦失敗:', error)
    // 降级到校准词库
    return await getCalibrationWords(supabase, userId, roundNumber)
  }
}

/**
 * 备用方案：直接查询
 */
async function recommendFromWordlistFallback(
  supabase: any,
  wordlistId: string,
  level2Tag: string | null,
  level3Tag: string | null
) {
  // 查询mapping
  let query = supabase
    .from('vocabulary_wordlist_mapping')
    .select('vocabulary_id, level_2_tag, level_3_tag')
    .eq('wordlist_id', wordlistId)

  if (level2Tag) {
    query = query.eq('level_2_tag', level2Tag)
  }
  if (level3Tag) {
    query = query.eq('level_3_tag', level3Tag)
  }

  const { data: mappings } = await query

  if (!mappings || mappings.length === 0) {
    return []
  }

  // 获取词汇
  const vocabIds = mappings.map(m => m.vocabulary_id)
  const { data: words } = await supabase
    .from('vocabulary')
    .select('*')
    .in('id', vocabIds)
    .limit(20)

  // 随机选择5个
  const shuffled = words.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 5).map(w => ({
    word: w.word,
    difficulty: w.difficulty_level,
    category: w.category,
    reason: '来自词表'
  }))
}

/**
 * 选择多样化的词汇（确保类型多样性）
 */
function selectDiverseWords(words: any[], count: number) {
  const selected: any[] = []
  const categories = new Set()

  // 按类别分组
  const byCategory = words.reduce((acc: any, word: any) => {
    const cat = word.category || '其他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(word)
    return acc
  }, {})

  // 优先从不同类别选择
  const categoryKeys = Object.keys(byCategory)
  
  for (let i = 0; i < count && selected.length < count; i++) {
    const catIndex = i % categoryKeys.length
    const category = categoryKeys[catIndex]
    const categoryWords = byCategory[category]

    if (categoryWords && categoryWords.length > 0) {
      const word = categoryWords.shift()
      selected.push(word)
      categories.add(category)
    }
  }

  // 如果还不够，随机补充
  while (selected.length < count && words.length > 0) {
    const randomIndex = Math.floor(Math.random() * words.length)
    const word = words.splice(randomIndex, 1)[0]
    if (!selected.includes(word)) {
      selected.push(word)
    }
  }

  return selected
}

/**
 * AI 智能推薦（第二次遊戲開始）
 */
async function recommendByAI(
  supabase: any,
  userId: string,
  sessionId: string,
  roundNumber: number,
  storyContext: string
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

    // 2. 構建用戶累積畫像
    const userProfile = await buildCumulativeUserProfile(supabase, userId)

    // 3. 構建動態 Prompt（包含已用詞列表）
    const usedWordsList = Array.from(recentWords).join('、')
    const prompt = buildAIPrompt(userProfile, storyContext, roundNumber, usedWordsList)

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
    
    // 6. 如果過濾後不足 5 個，從校準詞庫補充
    if (filteredWords.length < 5) {
      console.warn(`⚠️ AI 推薦過濾後只有 ${filteredWords.length} 個詞，從校準詞庫補充`)
      const calibrationWords = await getCalibrationWords(supabase, userId, roundNumber)
      
      // 補充到 5 個
      const needed = 5 - filteredWords.length
      const supplements = calibrationWords
        .filter((w: any) => !recentWords.has(w.word) && !filteredWords.some((fw: any) => fw.word === w.word))
        .slice(0, needed)
      
      filteredWords = [...filteredWords, ...supplements]
    }

    console.log(`[AI 推薦] 成功為用戶 ${userId} 推薦 ${filteredWords.length} 個詞（去重後）`)

    return filteredWords
  } catch (error) {
    console.error('❌ AI 推薦失敗:', error)
    // 降級到校準詞庫
    console.log('[降級] 使用校準詞庫作為備用')
    return await getCalibrationWords(supabase, userId, roundNumber)
  }
}

