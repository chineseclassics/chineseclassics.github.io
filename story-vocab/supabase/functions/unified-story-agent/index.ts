// =====================================================
// unified-story-agent Edge Function
// 同時生成故事句子和推薦詞語（性能優化）
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { UNIFIED_SYSTEM_PROMPT, buildUnifiedPrompt } from './prompts.ts'
import { buildCumulativeUserProfile } from '../vocab-recommender/helpers.ts'

serve(async (req) => {
  // 處理 CORS preflight 請求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 解析請求
    const {
      userSentence,
      selectedWord,
      sessionId,
      conversationHistory,
      userLevel,
      storyTheme,
      currentRound,
      usedWords,
      userGrade = 0,
      cachedUserProfile = null,
      explorationMode = false
    } = await req.json()

    // 驗證必要參數
    if (!sessionId || !userLevel || !storyTheme) {
      throw new Error('缺少必要參數')
    }

    // 從請求頭獲取用戶的 auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('缺少 Authorization header')
    }

    // 初始化 Supabase 客戶端
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

    // 從 auth token 提取 userId
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser } } = await supabase.auth.getUser(token)
    
    if (!authUser) {
      throw new Error('無效的認證 token')
    }

    // 查詢 user_identities 獲取真實的 user_id
    const { data: identity } = await supabase
      .from('user_identities')
      .select('user_id')
      .eq('provider_id', authUser.id)
      .single()

    const userId = identity?.user_id
    if (!userId) {
      throw new Error('找不到用戶身份')
    }

    // 構建用戶檔案（優先使用緩存）
    let userProfile
    if (cachedUserProfile && cachedUserProfile.current_level) {
      // 使用前端緩存數據，補充遊戲歷史信息
      console.log('🚀 使用緩存的用戶數據')
      userProfile = await buildCumulativeUserProfile(supabase, userId)
      // 用緩存數據覆蓋基本字段（避免查詢）
      userProfile.baseline_level = cachedUserProfile.baseline_level
      userProfile.current_level = cachedUserProfile.current_level
      userProfile.total_games = cachedUserProfile.total_games
      userProfile.confidence = cachedUserProfile.confidence || 'medium'
    } else {
      // 完整構建用戶檔案
      userProfile = await buildCumulativeUserProfile(supabase, userId)
    }

    // 獲取本次會話已推薦的詞（去重）
    const { data: recentRec } = await supabase
      .from('recommendation_history')
      .select('recommended_words')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    const recentWords = new Set(
      (recentRec || []).flatMap(r => r.recommended_words || [])
    )
    
    // 合併 usedWords 和已推薦的詞
    const allUsedWords = [...new Set([...usedWords, ...Array.from(recentWords)])]

    // 構建統一 Prompt
    const prompt = buildUnifiedPrompt(
      userSentence,
      selectedWord,
      conversationHistory,
      userLevel,
      storyTheme,
      currentRound,
      allUsedWords,
      userProfile,
      explorationMode
    )

    console.log(`📤 調用 DeepSeek API（統一模式，輪次 ${currentRound}）`)

    // 調用 DeepSeek API
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
            content: UNIFIED_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ DeepSeek API 錯誤:', errorText)
      throw new Error(`DeepSeek API 錯誤: ${response.status}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)

    console.log('📥 AI 響應成功')
    console.log(`   - 句子長度: ${result.aiSentence?.length || 0}`)
    console.log(`   - 推薦詞數: ${result.words?.length || 0}`)
    console.log(`   - 標記學習詞: ${result.highlight?.length || 0}`)

    // 過濾重複的詞（雙重保險）
    const filteredWords = (result.words || []).filter((w: any) => 
      !allUsedWords.includes(w.word)
    )

    // 如果過濾後不足 5 個，補充默認詞
    if (filteredWords.length < 5) {
      console.warn(`⚠️ 過濾後只有 ${filteredWords.length} 個詞，補充默認詞`)
      const defaultWords = getDefaultWords(userProfile.current_level)
      const needed = 5 - filteredWords.length
      const supplements = defaultWords
        .filter(w => !allUsedWords.includes(w.word) && !filteredWords.some((fw: any) => fw.word === w.word))
        .slice(0, needed)
      filteredWords.push(...supplements)
    }

    // 記錄推薦歷史
    await supabase
      .from('recommendation_history')
      .insert({
        session_id: sessionId,
        round_number: currentRound,
        recommended_words: filteredWords.map(w => w.word),
        source: explorationMode ? 'unified_exploration' : 'unified'
      })

    // 返回統一結果（不包含 score 和 feedback）
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          aiSentence: result.aiSentence,
          currentRound: currentRound,
          isComplete: false,
          recommendedWords: filteredWords,
          highlight: result.highlight || []  // 🆕 學習詞標記
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ unified-story-agent 錯誤:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * 獲取默認詞彙（降級方案）
 */
function getDefaultWords(userLevel: number) {
  const allDefaults = [
    { word: '高興', difficulty: 1 },
    { word: '朋友', difficulty: 1 },
    { word: '探險', difficulty: 2 },
    { word: '勇敢', difficulty: 2 },
    { word: '發現', difficulty: 2 },
    { word: '寧靜', difficulty: 3 },
    { word: '凝視', difficulty: 3 },
    { word: '沉思', difficulty: 3 },
    { word: '翱翔', difficulty: 4 },
    { word: '蛻變', difficulty: 4 },
    { word: '悠然', difficulty: 5 },
    { word: '斟酌', difficulty: 5 }
  ];
  
  const minLevel = Math.max(1, userLevel - 1.5);
  const maxLevel = Math.min(5, userLevel + 1.5);
  
  return allDefaults.filter(w => 
    w.difficulty >= minLevel && w.difficulty <= maxLevel
  );
}

