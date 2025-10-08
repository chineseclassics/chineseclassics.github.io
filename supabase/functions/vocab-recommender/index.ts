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
    // 解析請求
    const { userId, sessionId, roundNumber, storyContext } = await req.json()

    if (!userId || !sessionId || !roundNumber) {
      throw new Error('缺少必要參數: userId, sessionId, roundNumber')
    }

    // 初始化 Supabase 客戶端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 檢查用戶是否已完成校準
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    let words: any[]
    let source: string

    if (!profile || !profile.calibrated) {
      // 第一次遊戲：使用校準詞庫
      console.log(`[校準模式] 用戶 ${userId} 第一次遊戲，輪次 ${roundNumber}`)
      words = await getCalibrationWords(supabase, userId, roundNumber)
      source = 'calibration'
    } else {
      // 第二次及以後：AI 智能推薦
      console.log(`[AI 模式] 用戶 ${userId} 第 ${profile.total_games + 1} 次遊戲，輪次 ${roundNumber}`)
      words = await recommendByAI(supabase, userId, sessionId, roundNumber, storyContext)
      source = 'ai'
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
    // 1. 構建用戶累積畫像
    const userProfile = await buildCumulativeUserProfile(supabase, userId)

    // 2. 構建動態 Prompt
    const prompt = buildAIPrompt(userProfile, storyContext, roundNumber)

    // 3. 調用 DeepSeek API
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

    console.log(`[AI 推薦] 成功為用戶 ${userId} 推薦 ${aiWords.words?.length || 0} 個詞`)

    return aiWords.words || []
  } catch (error) {
    console.error('❌ AI 推薦失敗:', error)
    // 降級到校準詞庫
    console.log('[降級] 使用校準詞庫作為備用')
    return await getCalibrationWords(supabase, userId, roundNumber)
  }
}

