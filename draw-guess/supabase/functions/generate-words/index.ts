// AI 智能詞語生成 Edge Function
// 調用 DeepSeek API 根據主題生成適合「你畫我猜」遊戲的詞語

// CORS 標頭配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

// 請求和響應類型定義
interface GenerateWordsRequest {
  theme: string
}

interface GenerateWordsResponse {
  success: boolean
  words?: string[]
  isThemeAdjusted?: boolean
  adjustedTheme?: string
  error?: string
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

// 構建 prompt
function buildPrompt(theme: string): DeepSeekMessage[] {
  const systemPrompt = `你是一個「你畫我猜」遊戲的詞語生成助手。

【核心原則】：請仔細閱讀並理解用戶的主題，精準生成符合主題要求的內容。不要機械套用規則，而是根據主題的具體含義來決定生成什麼。

【基本要求】：
1. 生成 50 個【不重複】的詞語或句子
2. 每個詞語/句子長度在 2-12 個中文字符之間
3. 詞語難度適中，適合中學生理解
4. 確保所有詞語都是不同的，不要有任何重複
5. 如果該主題無法生成 50 個，請用相關聯的內容補充
6. 如果主題不適合中學生，請自動選擇安全主題並標記 isThemeAdjusted 為 true

【主題理解指南 - 請仔細區分】：

詩人相關主題的不同類型：
- 「李白名句」「李白詩句」「李白著名詩句」→ 生成完整詩句，如「床前明月光」「舉頭望明月」
- 「李白意象」→ 生成李白詩中的意象詞語，如「明月」「長江」「白雲」「劍」「酒」「瀑布」
- 「李白」（單獨詩人名）→ 綜合生成：意象、詩句、相關人物、地點、典故、生平事件等
- 「唐詩意象」→ 生成唐詩中常見的意象詞語，不是完整詩句
- 「宋詞名句」→ 生成完整的宋詞句子

其他主題類型：
- 「香港小吃」→ 具體的小吃名稱
- 「動物」→ 各種動物名稱
- 「成語」→ 四字成語
- 「電影」→ 電影名稱或電影相關詞語

【關鍵詞識別】：
- 含「名句」「詩句」「詞句」→ 生成完整句子
- 含「意象」「元素」「象徵」→ 生成詞語（2-4字為主）
- 單獨人名/朝代 → 綜合生成相關內容

請以 JSON 格式返回，不要包含任何其他文字：
{
  "words": ["詞語1", "詞語2", ...],
  "isThemeAdjusted": false,
  "adjustedTheme": null
}`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `用戶主題：${theme}` }
  ]
}

// 解析 AI 響應
function parseAIResponse(content: string): { words: string[], isThemeAdjusted: boolean, adjustedTheme?: string } | null {
  try {
    // 嘗試提取 JSON 部分（處理可能的 markdown 代碼塊）
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    const parsed = JSON.parse(jsonStr)
    
    if (!Array.isArray(parsed.words)) {
      return null
    }
    
    // 過濾、驗證和去重詞語
    const seen = new Set<string>()
    const validWords = parsed.words
      .filter((word: unknown): word is string => typeof word === 'string')
      .map((word: string) => word.trim())
      .filter((word: string) => word.length >= 2 && word.length <= 12)
      .filter((word: string) => {
        // 去重：只保留第一次出現的詞語
        if (seen.has(word)) {
          return false
        }
        seen.add(word)
        return true
      })
    
    return {
      words: validWords,
      isThemeAdjusted: !!parsed.isThemeAdjusted,
      adjustedTheme: parsed.adjustedTheme || undefined
    }
  } catch {
    return null
  }
}

// 主處理函數
Deno.serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 獲取 API Key
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: '服務配置錯誤' } as GenerateWordsResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 解析請求
    const body = await req.json() as GenerateWordsRequest
    const { theme } = body

    if (!theme || typeof theme !== 'string' || theme.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少主題參數' } as GenerateWordsResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 調用 DeepSeek API
    const messages = buildPrompt(theme.trim())
    
    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text()
      console.error('DeepSeek API error:', deepseekResponse.status, errorText)
      return new Response(
        JSON.stringify({ success: false, error: 'AI 服務暫時不可用' } as GenerateWordsResponse),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deepseekData = await deepseekResponse.json() as DeepSeekResponse
    const content = deepseekData.choices?.[0]?.message?.content

    if (!content) {
      console.error('Empty response from DeepSeek')
      return new Response(
        JSON.stringify({ success: false, error: '詞語生成失敗' } as GenerateWordsResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 解析響應
    const parsed = parseAIResponse(content)
    
    if (!parsed || parsed.words.length === 0) {
      console.error('Failed to parse AI response:', content)
      return new Response(
        JSON.stringify({ success: false, error: '詞語生成失敗' } as GenerateWordsResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 返回成功響應
    const response: GenerateWordsResponse = {
      success: true,
      words: parsed.words,
      isThemeAdjusted: parsed.isThemeAdjusted,
      adjustedTheme: parsed.adjustedTheme
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'AI 服務暫時不可用' } as GenerateWordsResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
