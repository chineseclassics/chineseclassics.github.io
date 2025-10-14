// =====================================================
// 故事接龙 AI Agent - Supabase Edge Function
// 集成 DeepSeek API 实现智能故事生成
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 主函数
serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 获取请求数据
    const { 
      userSentence,           // 用户输入的句子
      selectedWord,           // 用户选择的词汇
      sessionId,              // 故事会话 ID
      conversationHistory,    // 对话历史
      storyTheme,             // 故事主题
      currentRound            // 当前轮次
      // 注意：反饋功能已移至專門的 sentence-feedback Edge Function
    } = await req.json()

    // 驗證必需參數
    if (!userSentence || !sessionId) {
      throw new Error('缺少必需參數：userSentence 或 sessionId')
    }

    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 獲取 DeepSeek API Key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      throw new Error('未配置 DEEPSEEK_API_KEY')
    }

    // ===== 生成故事流程 =====
    // 注意：反饋評價由專門的 sentence-feedback Edge Function 處理
    
    // 1. 生成 AI 回應（故事下一句）
    console.log('🤖 生成 AI 故事句子...')
    const aiSentence = await generateAiResponse({
      userSentence,
      conversationHistory,
      storyTheme,
      currentRound,
      apiKey: deepseekApiKey
    })

    // 2. 更新數據庫
    // 注意：反饋評價由專門的 sentence-feedback Edge Function 處理
    // 注意：詞彙推薦由專門的 vocab-recommender Edge Function 處理
    console.log('💾 更新故事會話...')
    await updateStorySession({
      sessionId,
      userSentence,
      selectedWord,
      aiSentence,
      currentRound,
      supabase
    })

    // 3. 返回结果（只包含故事句子）
    // 詞彙推薦由前端另外調用 vocab-recommender 獲取
    // 句子反饋由前端另外調用 sentence-feedback 獲取
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          aiSentence,              // AI 生成的句子
          currentRound: currentRound + 1,
          isComplete: currentRound >= 9  // 10 轮完成
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// =====================================================
// AI 故事生成
// =====================================================
async function generateAiResponse({
  userSentence,
  conversationHistory,
  storyTheme,
  currentRound,
  apiKey
}: {
  userSentence: string
  conversationHistory: string[]
  storyTheme: string
  currentRound: number
  apiKey: string
}): Promise<string> {
  
  // 构建系统提示词
  const systemPrompt = buildSystemPrompt(storyTheme, currentRound)
  
  // 构建对话历史（保留完整歷史以保證故事連貫性）
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((text, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: text
    })),
    { role: 'user', content: userSentence }
  ]

  // 调用 DeepSeek API
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,        // 降低以提高承接连贯性
      max_tokens: 300,         // 增加到300，確保句子完整（中文約100-150字）
      top_p: 0.9
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 錯誤: ${error}`)
  }

  const data = await response.json()
  let aiSentence = data.choices[0].message.content.trim()
  
  // 檢查是否被截斷
  const finishReason = data.choices[0].finish_reason
  const usage = data.usage
  
  console.log('📊 Token 使用:', {
    prompt_tokens: usage?.prompt_tokens,
    completion_tokens: usage?.completion_tokens,
    total_tokens: usage?.total_tokens,
    finish_reason: finishReason
  })
  
  if (finishReason === 'length') {
    console.warn('⚠️ 句子被截斷（達到 max_tokens 限制），重試中...')
    
    // 重試一次，增加 max_tokens
    const retryResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,  // 重試時更大的限制
        top_p: 0.9
      })
    })
    
    if (retryResponse.ok) {
      const retryData = await retryResponse.json()
      aiSentence = retryData.choices[0].message.content.trim()
      console.log('✅ 重試成功')
    }
  }
  
  // 確保句子以標點符號結尾
  const punctuation = /[。！？；」』、，]$/
  if (!punctuation.test(aiSentence)) {
    console.warn('⚠️ 句子缺少結尾標點，可能不完整:', aiSentence)
    // 添加句號
    aiSentence += '。'
  }
  
  console.log('✅ AI 生成:', aiSentence)
  return aiSentence
}

// =====================================================
// 构建系统提示词
// =====================================================
function buildSystemPrompt(storyTheme: string, currentRound: number): string {
  const themeGuides: Record<string, string> = {
    'natural_exploration': '自然探索：森林、山川、動物',
    'school_life': '校園生活：學校、同學、老師',
    'fantasy_adventure': '奇幻冒險：魔法、神秘世界',
    'sci_fi': '科幻未來：科技、太空'
  }

  const themeGuide = themeGuides[storyTheme] || '自由發揮'
  
  // 判斷故事階段
  let stageGuide = ''
  if (currentRound < 4) {
    stageGuide = '開場（介紹場景角色）'
  } else if (currentRound < 7) {
    stageGuide = '發展（推進情節、轉折）'
  } else {
    stageGuide = '收尾（解決衝突、結局）'
  }

  return `你是兒童文學作家，與學生共創故事。使用繁體中文（這裡學開樹發現），禁用簡體字（这里学开树发现）。

【接龍規則】必須緊密承接學生的句子
- 從結尾或關鍵詞繼續
- 回應動作、情感或場景
- 不要跳躍或忽略輸入

示例：
學生：「小明發現一隻小兔子。」
✅ 好：「小兔子眼睛像紅寶石，好奇盯著小明。」
❌ 差：「天空突然下雨。」（忽略兔子）

【創作要點】
1. 緊密承接學生句子
2. 添加有趣細節或轉折
3. 1-2句（20-50字）
4. 為下輪留空間

【當前設定】
主題：${themeGuide} | 階段：${stageGuide} | 輪次：${currentRound + 1}/10

【避免】套路結局（「高興回家了」）、跳躍過大、忽略學生輸入

直接輸出繁體中文故事句，無需解釋。`
}

// =====================================================
// 更新故事会话
// =====================================================
async function updateStorySession({
  sessionId,
  userSentence,
  selectedWord,
  aiSentence,
  currentRound,
  supabase
}: {
  sessionId: string
  userSentence: string
  selectedWord: string
  aiSentence: string
  currentRound: number
  supabase: any
}) {
  
  // 獲取當前會話
  const { data: session, error: fetchError } = await supabase
    .from('story_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (fetchError) {
    throw new Error('獲取故事會話失敗')
  }

  // 更新對話歷史（推薦詞彙由 vocab-recommender 記錄在 recommendation_history 表）
  const updatedHistory = [
    ...session.conversation_history,
    {
      round: currentRound,
      user: userSentence,
      selectedWord: selectedWord,
      ai: aiSentence,
      timestamp: new Date().toISOString()
    }
  ]

  // 更新會話
  const { error: updateError } = await supabase
    .from('story_sessions')
    .update({
      conversation_history: updatedHistory,
      current_round: currentRound + 1,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (updateError) {
    throw new Error('更新故事會話失敗')
  }

  console.log('✅ 會話已更新')
}

