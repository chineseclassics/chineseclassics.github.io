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
    
    // 3. 獲取本會話用戶已選擇的詞彙（而不是推荐过的词）
    const { data: rounds, error: roundsError } = await supabase
      .from('game_rounds')
      .select('selected_word')
      .eq('session_id', sessionId)
    
    if (roundsError) {
      console.error('❌ 查詢 game_rounds 失敗:', roundsError)
      // 如果查詢失敗，繼續但不過濾（可能會有重複詞）
    }
    
    // 只排除用户已经选择过的词语
    const usedWords = new Set(
      rounds?.map(r => r.selected_word).filter(Boolean) || []
    )
    
    console.log(`📊 本會話用戶已選擇詞彙數: ${usedWords.size} 個`, Array.from(usedWords))
    
    // 4. 過濾已使用的詞彙
    const availableWords = words.filter(w => !usedWords.has(w.word))
    
    if (availableWords.length < 5) {
      const needed = 5 - availableWords.length
      console.warn(`⚠️  可用詞彙不足5個（剩餘 ${availableWords.length} 個），需要補充 ${needed} 個`)
      
      // 從已選擇的詞中隨機補充
      const alreadyUsed = words.filter(w => usedWords.has(w.word))
      const shuffled = alreadyUsed.sort(() => Math.random() - 0.5)
      const supplements = shuffled.slice(0, needed)
      
      console.log(`✅ 補充已選詞: ${supplements.map(w => w.word).join('、')}`)
      
      const finalWords = [...availableWords, ...supplements]
      
      return finalWords.map(w => ({
        word: w.word,
        difficulty: 3,
        category: 'flexible',
        isRepeated: usedWords.has(w.word) // 標記是否為重複詞
      }))
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
    // 降級到校準詞庫
    return await getCalibrationWords(supabase, userId, roundNumber)
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

