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
      currentRound            // 当前轮次
    } = await req.json()

    // 验证必需参数
    if (!userSentence || !sessionId) {
      throw new Error('缺少必需参数：userSentence 或 sessionId')
    }

    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 获取 DeepSeek API Key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      throw new Error('未配置 DEEPSEEK_API_KEY')
    }

    // 1. 生成 AI 回应（故事下一句）
    console.log('🤖 生成 AI 故事句子...')
    const aiSentence = await generateAiResponse({
      userSentence,
      conversationHistory,
      storyTheme,
      currentRound,
      apiKey: deepseekApiKey
    })

    // 2. 推荐下一组词汇（5个）
    console.log('📚 推荐词汇...')
    const recommendedWords = await recommendVocabulary({
      userLevel,
      storyTheme,
      conversationHistory: [...conversationHistory, userSentence, aiSentence],
      usedWords: [], // TODO: 从数据库获取已使用的词汇
      supabase
    })

    // 3. 更新数据库
    console.log('💾 更新故事会话...')
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
          isComplete: currentRound >= 17  // 18 轮完成
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
  
  // 构建对话历史
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
      max_tokens: 150,         // 单句故事（20-50字）
      top_p: 0.9
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 错误: ${error}`)
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
    'natural_exploration': '自然探索主题：引导故事在森林、山川、动物等自然环境中展开',
    'school_life': '校园生活主题：引导故事在学校、同学、老师、课堂等场景中展开',
    'fantasy_adventure': '奇幻冒险主题：引导故事在魔法、幻想生物、神秘世界中展开',
    'sci_fi': '科幻未来主题：引导故事在科技、太空、未来世界中展开'
  }

  const themeGuide = themeGuides[storyTheme] || '自由发挥'
  
  // 判断故事阶段
  let stageGuide = ''
  if (currentRound < 6) {
    stageGuide = '故事开始阶段：介绍场景、角色、初步展开情节'
  } else if (currentRound < 12) {
    stageGuide = '故事发展阶段：推进情节，出现转折或冲突'
  } else {
    stageGuide = '故事收尾阶段：解决冲突，走向结局'
  }

  return `你是一个富有创意的儿童文学作家，正在和一个学生一起创作故事。

【最重要的规则】接龙规则：
你必须紧密承接学生刚才写的句子！
- 从学生句子的结尾或关键元素继续
- 回应学生句子中的动作、情感或场景
- 不要跳跃或忽略学生的输入
- 让学生感觉你在认真倾听并延续他们的创意

【承接示例】
学生写："小明在森林里发现了一只小兔子。"
✅ 好的承接："小兔子的眼睛像红宝石一样，它好奇地盯着小明。"
❌ 错误："天空突然下起了雨。"（忽略了小兔子）

学生写："他小心翼翼地走近小兔子。"
✅ 好的承接："小兔子竟然没有跑开，反而轻轻蹭了蹭他的手。"
❌ 错误："森林深处传来奇怪的声音。"（跳跃太大）

核心原则：
1. 紧密承接：必须从学生的句子继续，不要跳跃
2. 创意发展：在承接的基础上，添加新的有趣元素
3. 简洁生动：1-2 句话（20-50 字），语言生动形象
4. 引导想象：为下一轮留下发展空间

当前故事设定：
- ${themeGuide}
- ${stageGuide}
- 当前轮次：${currentRound + 1}/18

反套路机制：
❌ 避免：「他们高高兴兴地回家了」
❌ 避免：「太阳升起，新的一天开始了」
❌ 避免：忽略学生刚才的输入
✅ 鼓励：紧密承接 + 意外转折 + 有趣细节

回应要求：
- 直接输出故事句子，不要任何解释
- 20-50 字为宜
- 必须承接学生刚才的句子
- 保持积极向上的基调`
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
    console.error('查询词汇错误:', error)
    throw new Error('词汇查询失败')
  }

  // 3. 过滤已使用的词汇
  const availableCandidates = candidates.filter(
    word => !usedWords.includes(word.word)
  )

  // 4. 智能选择 5 个词汇
  const selected = selectDiverseWords(availableCandidates, 5, {
    preferLevel: userLevel,
    storyTheme
  })

  console.log('✅ 推荐词汇:', selected.map(w => w.word).join(', '))
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

  // 优先选择不同类别的词汇
  for (const word of candidates) {
    if (selected.length >= count) break
    
    // 优先选择当前级别的词
    if (word.difficulty_level === options.preferLevel) {
      if (!usedCategories.has(word.category)) {
        selected.push(word)
        usedCategories.add(word.category)
        continue
      }
    }
  }

  // 如果不够，补充其他词汇
  for (const word of candidates) {
    if (selected.length >= count) break
    if (!selected.includes(word)) {
      selected.push(word)
    }
  }

  // 随机打乱
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
  
  // 获取当前会话
  const { data: session, error: fetchError } = await supabase
    .from('story_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (fetchError) {
    throw new Error('获取故事会话失败')
  }

  // 更新对话历史
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

  // 更新会话
  const { error: updateError } = await supabase
    .from('story_sessions')
    .update({
      conversation_history: updatedHistory,
      current_round: currentRound + 1,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (updateError) {
    throw new Error('更新故事会话失败')
  }

  console.log('✅ 会话已更新')
}

