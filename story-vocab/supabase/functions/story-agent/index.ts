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
      userLevel,              // 用户级别 (1-6)
      storyTheme,             // 故事主题
      currentRound,           // 当前轮次
      usedWords = []          // 已使用的词汇列表（默认为空数组）
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

    // 1. 生成 AI 回應（故事下一句）
    console.log('🤖 生成 AI 故事句子...')
    const aiSentence = await generateAiResponse({
      userSentence,
      conversationHistory,
      storyTheme,
      currentRound,
      apiKey: deepseekApiKey
    })

    // 2. 推薦下一組詞彙（5個）
    console.log('📚 推薦詞彙...')
    console.log('📋 已使用詞彙:', usedWords)
    const recommendedWords = await recommendVocabulary({
      userLevel,
      storyTheme,
      conversationHistory: [...conversationHistory, userSentence, aiSentence],
      usedWords: usedWords,  // 使用前端傳遞的已使用詞彙列表
      supabase
    })

    // 3. 更新數據庫
    console.log('💾 更新故事會話...')
    await updateStorySession({
      sessionId,
      userSentence,
      selectedWord,
      aiSentence,
      recommendedWords,
      currentRound,
      supabase
    })

    // 4. 返回结果
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          aiSentence,              // AI 生成的句子
          recommendedWords,        // 推荐的 5 个词汇
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
  
  // 构建对话历史（强制繁体中文）
  const messages = [
    { role: 'system', content: '你必須只使用繁體中文（Traditional Chinese）回答，絕對不可以使用簡體中文。使用「這、裡、學、開、樹、發現」等繁體字，而不是「这、里、学、开、树、发现」等簡體字。' },
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
      max_tokens: 150,         // 单句故事（20-50字）
      top_p: 0.9
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 錯誤: ${error}`)
  }

  const data = await response.json()
  const aiSentence = data.choices[0].message.content.trim()
  
  console.log('✅ AI 生成:', aiSentence)
  return aiSentence
}

// =====================================================
// 构建系统提示词
// =====================================================
function buildSystemPrompt(storyTheme: string, currentRound: number): string {
  const themeGuides: Record<string, string> = {
    'natural_exploration': '自然探索主題：引導故事在森林、山川、動物等自然環境中展開',
    'school_life': '校園生活主題：引導故事在學校、同學、老師、課堂等場景中展開',
    'fantasy_adventure': '奇幻冒險主題：引導故事在魔法、幻想生物、神秘世界中展開',
    'sci_fi': '科幻未來主題：引導故事在科技、太空、未來世界中展開'
  }

  const themeGuide = themeGuides[storyTheme] || '自由發揮'
  
  // 判斷故事階段（基於10轮）
  let stageGuide = ''
  if (currentRound < 4) {
    stageGuide = '故事開始階段：介紹場景、角色、初步展開情節'
  } else if (currentRound < 7) {
    stageGuide = '故事發展階段：推進情節，出現轉折或衝突'
  } else {
    stageGuide = '故事收尾階段：解決衝突，走向結局'
  }

  return `【語言要求】使用繁體中文（Traditional Chinese）
你是台灣或香港的兒童文學作家，只會使用繁體中文書寫。
絕對禁止使用簡體字：不用「这里发现学开树」，要用「這裡發現學開樹」

你是一個富有創意的兒童文學作家，正在和一個學生一起創作故事。

【最重要的規則】接龍規則：
你必須緊密承接學生剛才寫的句子！
- 從學生句子的結尾或關鍵元素繼續
- 回應學生句子中的動作、情感或場景
- 不要跳躍或忽略學生的輸入
- 讓學生感覺你在認真傾聽並延續他們的創意

【承接示例】
學生寫：「小明在森林裡發現了一隻小兔子。」
✅ 好的承接：「小兔子的眼睛像紅寶石一樣，牠好奇地盯著小明。」
❌ 錯誤：「天空突然下起了雨。」（忽略了小兔子）

學生寫：「他小心翼翼地走近小兔子。」
✅ 好的承接：「小兔子竟然沒有跑開，反而輕輕蹭了蹭他的手。」
❌ 錯誤：「森林深處傳來奇怪的聲音。」（跳躍太大）

核心原則：
1. 緊密承接：必須從學生的句子繼續，不要跳躍
2. 創意發展：在承接的基礎上，添加新的有趣元素
3. 簡潔生動：1-2 句話（20-50 字），語言生動形象
4. 引導想像：為下一輪留下發展空間

當前故事設定：
- ${themeGuide}
- ${stageGuide}
- 當前輪次：${currentRound + 1}/10

反套路機制：
❌ 避免：「他們高高興興地回家了」
❌ 避免：「太陽升起，新的一天開始了」
❌ 避免：忽略學生剛才的輸入
✅ 鼓勵：緊密承接 + 意外轉折 + 有趣細節

回應要求：
- **【絕對要求】只能使用繁體中文書寫，禁止簡體字**
- 常見繁體字：這、裡、學、開、發、樹、聽、說、讀、寫、會、來、對、時、間、們、關、歡、樂、從
- 直接輸出繁體中文故事句子，不要任何解釋
- 20-50 字為宜
- 必須承接學生剛才的句子
- 保持積極向上的基調
- 自我檢查：生成後確認沒有「这、里、学、开、发、树、听、说、读、写、会、来、对、时、间、们、关、欢、乐、从」等簡體字`
}

// =====================================================
// 词汇推荐算法
// =====================================================
async function recommendVocabulary({
  userLevel,
  storyTheme,
  conversationHistory,
  usedWords,
  supabase
}: {
  userLevel: number
  storyTheme: string
  conversationHistory: string[]
  usedWords: string[]
  supabase: any
}): Promise<any[]> {
  
  // 1. 确定难度级别范围（用户级别 ±1）
  const minLevel = Math.max(1, userLevel - 1)
  const maxLevel = Math.min(6, userLevel + 1)
  
  // 2. 从数据库查询候选词汇
  const { data: candidates, error } = await supabase
    .from('vocabulary')
    .select('*')
    .gte('difficulty_level', minLevel)
    .lte('difficulty_level', maxLevel)
    .order('frequency', { ascending: false })
    .limit(50)  // 获取 50 个候选词
  
  if (error) {
    console.error('查詢詞彙錯誤:', error)
    throw new Error('詞彙查詢失敗')
  }

  // 3. 過濾已使用的詞彙
  const availableCandidates = candidates.filter(
    word => !usedWords.includes(word.word)
  )

  // 4. 智能選擇 5 個詞彙
  const selected = selectDiverseWords(availableCandidates, 5, {
    preferLevel: userLevel,
    storyTheme
  })

  console.log('✅ 推薦詞彙:', selected.map(w => w.word).join(', '))
  return selected
}

// =====================================================
// 选择多样化的词汇
// =====================================================
function selectDiverseWords(
  candidates: any[], 
  count: number,
  options: { preferLevel: number, storyTheme: string }
): any[] {
  
  if (candidates.length <= count) {
    return candidates
  }

  const selected: any[] = []
  const usedCategories = new Set<string>()

  // 優先選擇不同類別的詞彙
  for (const word of candidates) {
    if (selected.length >= count) break
    
    // 優先選擇當前級別的詞
    if (word.difficulty_level === options.preferLevel) {
      if (!usedCategories.has(word.category)) {
        selected.push(word)
        usedCategories.add(word.category)
        continue
      }
    }
  }

  // 如果不夠，補充其他詞彙
  for (const word of candidates) {
    if (selected.length >= count) break
    if (!selected.includes(word)) {
      selected.push(word)
    }
  }

  // 隨機打亂
  return selected.sort(() => Math.random() - 0.5).slice(0, count)
}

// =====================================================
// 更新故事会话
// =====================================================
async function updateStorySession({
  sessionId,
  userSentence,
  selectedWord,
  aiSentence,
  recommendedWords,
  currentRound,
  supabase
}: {
  sessionId: string
  userSentence: string
  selectedWord: string
  aiSentence: string
  recommendedWords: any[]
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

  // 更新對話歷史
  const updatedHistory = [
    ...session.conversation_history,
    {
      round: currentRound,
      user: userSentence,
      selectedWord: selectedWord,
      ai: aiSentence,
      recommendedWords: recommendedWords.map(w => w.word),
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

