// =====================================================
// 故事接龙 AI Agent - Supabase Edge Function
// 集成 DeepSeek API 实现智能故事生成
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildSystemPrompt } from './prompts.ts'

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
      currentRound,           // 当前轮次
      userGrade,              // 🎓 用戶年級（新增）
      userLevel,              // 🎯 用戶詞語水平（用於 highlight）
      maxRounds               // 🎮 最大輪數（支持自定義）
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
    
    // 1. 生成 AI 回應（故事下一句 + highlight 學習詞）
    console.log('🤖 生成 AI 故事句子 + highlight...')
    const { aiSentence, highlight } = await generateAiResponse({
      userSentence,
      conversationHistory,
      storyTheme,
      currentRound,
      userGrade: userGrade || 6,  // 🎓 傳入年級，默認6年級
      userLevel: userLevel || 2.0, // 🎯 傳入詞語水平，默認 L2.0
      maxRounds: maxRounds || 8,   // 🎮 傳入最大輪數，默認8輪
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

    // 3. 返回结果（故事句子 + highlight 學習詞）
    // 詞彙推薦由前端另外調用 vocab-recommender 獲取
    // 句子反饋由前端另外調用 sentence-feedback 獲取
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          aiSentence,              // AI 生成的句子
          highlight: highlight || [], // 🆕 標記的學習詞（0-2個）
          currentRound: currentRound + 1,
          isComplete: currentRound >= ((maxRounds || 8) - 1)  // 動態判斷完成
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
  userGrade,   // 🎓 新增參數
  userLevel,   // 🎯 用戶詞語水平
  maxRounds = 8,  // 🎮 最大輪數
  apiKey
}: {
  userSentence: string
  conversationHistory: string[]
  storyTheme: string
  currentRound: number
  userGrade: number   // 🎓 新增類型定義
  userLevel: number   // 🎯 用戶詞語水平（L1-L5）
  maxRounds: number   // 🎮 最大輪數
  apiKey: string
}): Promise<{ aiSentence: string; highlight: string[] }> {
  
  // 构建系统提示词（傳入年級、詞語水平和最大輪數）
  const systemPrompt = buildSystemPrompt(storyTheme, currentRound, userGrade, userLevel, maxRounds)
  
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
  let rawContent = data.choices[0].message.content.trim()
  
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
      rawContent = retryData.choices[0].message.content.trim()
      console.log('✅ 重試成功')
    }
  }
  
  // 🎯 嘗試解析 JSON 格式（包含 aiSentence 和 highlight）
  let aiSentence: string
  let highlight: string[] = []
  
  try {
    const parsed = JSON.parse(rawContent)
    if (parsed.aiSentence) {
      aiSentence = parsed.aiSentence
      highlight = parsed.highlight || []
      console.log('✅ 解析 JSON 成功，highlight:', highlight)
    } else {
      // JSON 格式錯誤，當作純文本
      aiSentence = rawContent
      console.log('📝 JSON 無 aiSentence 欄位，視為純文本')
    }
  } catch (e) {
    // 不是 JSON，視為純文本（向後兼容）
    aiSentence = rawContent
    console.log('📝 AI 返回純文本（非 JSON），highlight 為空')
  }
  
  // 確保句子以標點符號結尾
  const punctuation = /[。！？；」』、，]$/
  if (!punctuation.test(aiSentence)) {
    console.warn('⚠️ 句子缺少結尾標點，可能不完整:', aiSentence)
    // 添加句號
    aiSentence += '。'
  }
  
  console.log('✅ AI 生成:', aiSentence)
  return { aiSentence, highlight }
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

