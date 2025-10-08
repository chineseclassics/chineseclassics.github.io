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
      usedWords = [],         // 已使用的词汇列表（默认为空数组）
      requestFeedbackOnly = false  // 是否只请求反馈（不生成故事）
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

    // 是否是初始请求（開始故事）
    const isInitialRequest = userSentence === '開始故事'
    
    // ===== 只请求反馈模式 =====
    if (requestFeedbackOnly && !isInitialRequest && selectedWord) {
      console.log('👨‍🏫 只生成反饋...')
      const feedback = await generateFeedback({
        userSentence,
        selectedWord,
        conversationHistory,
        storyTheme,
        apiKey: deepseekApiKey
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          data: { feedback }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // ===== 正常流程：生成故事 =====
    
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
// 生成用戶句子反饋
// =====================================================
async function generateFeedback({
  userSentence,
  selectedWord,
  conversationHistory,
  storyTheme,
  apiKey
}: {
  userSentence: string
  selectedWord: string
  conversationHistory: string[]
  storyTheme: string
  apiKey: string
}): Promise<any> {
  
  // 構建反饋提示詞
  const feedbackPrompt = `你是一位溫暖但誠實的中文老師，正在幫助10-12歲的小朋友學習詞語和創作故事。

【學生造句】
選用詞語：「${selectedWord}」
句子：${userSentence}

【故事上下文】
${conversationHistory.slice(-4).join('\n')}

請用繁體中文評價，嚴格按照以下格式輸出（每個字段必須在同一行內）：

總分：X/10
評語：[60-80字的真誠評語，溫暖但客觀]
優化版句子：[優化後的完整句子，保留原意但更精彩，必須在同一行內完整輸出]

【評語撰寫原則】：
1. **真誠第一**：詞語學習是核心，必須指出用詞錯誤
2. **溫暖表達**：即使指出錯誤，也要用友善的語氣
3. **具體說明**：說明為什麼這樣用不對，正確用法是什麼
4. **鼓勵改進**：給出具體的改進方向

【評分標準】：
- 8-10分：詞語使用準確，創作質量好
- 5-7分：詞語基本正確但可改進，或創作需要加強
- 1-4分：詞語使用有明顯錯誤（搭配不當、理解有誤等）

【處理詞語錯誤的方式】：

**情況1：詞語搭配不當**
❌ 虛假鼓勵：「用得不錯！可以試試別的說法」
✅ 真誠指正：「『${selectedWord}』這個詞通常不這樣搭配喔。比如我們說『開心地笑』而不是『開心地吃』。你可以試試改成...」

**情況2：理解詞義有誤**
❌ 虛假鼓勵：「很有創意！不過可以調整一下」
✅ 真誠指正：「咦，『${selectedWord}』的意思是...，和你這裡想表達的有點不一樣。如果想說...,可以用...這個詞會更準確」

**情況3：用詞準確但可以更好**
✅ 溫暖建議：「『${selectedWord}』用得對！如果想讓句子更生動，可以試試加上...」

【語氣示範】：

**指出錯誤時**（保持溫和但明確）：
「『高興』通常用來形容人的心情，不太適合用在這裡喔」
「『終於』是表示等了很久之後發生的事，這裡用好像有點怪怪的」
「你可能把『安靜』和『乾淨』搞混了，『安靜』是說沒有聲音...」

**肯定正確時**（真心讚美）：
「『好奇』用得太好了！完美表達了想探索的感覺」
「這個詞用得真準確，看得出你理解了它的意思」

【重要提醒】：
- 不要虛假鼓勵，該指出的錯誤一定要說
- 但用溫和、具體、有幫助的方式說
- **優化版句子必須包含詞語「${selectedWord}」，不能更換**
- 優化版要示範正確用法，讓學生從例子中學習`

  // 調用 DeepSeek API
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你必須只使用繁體中文（Traditional Chinese）回答。' },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.3,  // 較低溫度，確保格式準確
      max_tokens: 350   // 增加 token 限制，確保優化版句子能完整輸出
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 錯誤（反饋）: ${error}`)
  }

  const data = await response.json()
  const feedbackText = data.choices[0].message.content.trim()
  
  console.log('✅ 反饋生成:', feedbackText)
  
  // 解析反饋文本
  return parseFeedbackText(feedbackText)
}

// =====================================================
// 解析反饋文本
// =====================================================
function parseFeedbackText(text: string): any {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  
  const feedback = {
    score: 0,
    comment: '',
    optimizedSentence: ''
  }
  
  let currentField = ''  // 追踪当前正在读取的字段
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 總分
    if (line.includes('總分')) {
      const match = line.match(/(\d+)/)
      if (match) feedback.score = parseInt(match[1])
      currentField = ''
    }
    // 評語
    else if (line.includes('評語')) {
      const content = line.split('：')[1]?.trim() || line.split(':')[1]?.trim() || ''
      feedback.comment = content
      currentField = content ? '' : 'comment'  // 如果内容为空，说明在下一行
    }
    // 優化版句子
    else if (line.includes('優化版句子')) {
      const content = line.split('：')[1]?.trim() || line.split(':')[1]?.trim() || ''
      feedback.optimizedSentence = content
      currentField = content ? '' : 'optimizedSentence'  // 如果内容为空，说明在下一行
    }
    // 继续读取上一个字段的内容（处理多行情况）
    else if (currentField && line) {
      if (currentField === 'comment') {
        feedback.comment = (feedback.comment ? feedback.comment + ' ' : '') + line
      } else if (currentField === 'optimizedSentence') {
        feedback.optimizedSentence = (feedback.optimizedSentence ? feedback.optimizedSentence + ' ' : '') + line
      }
      // 读取完一行后，假设字段结束（除非下一行也是普通文本）
      // 注意：这里不清空 currentField，让它继续读取，直到遇到新的字段标题
    }
  }
  
  // 清理和验证
  feedback.comment = feedback.comment.trim()
  feedback.optimizedSentence = feedback.optimizedSentence.trim()
  
  console.log('📝 解析反饋結果:', {
    score: feedback.score,
    commentLength: feedback.comment.length,
    optimizedSentenceLength: feedback.optimizedSentence.length
  })
  
  return feedback
}

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

