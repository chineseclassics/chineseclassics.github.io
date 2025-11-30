// =====================================================
// AI 生成註釋 Edge Function
// 使用 DeepSeek API 為古文文章自動生成註釋（含拼音）
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS 標頭配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// DeepSeek API 端點（直接調用，使用環境變量中的 API Key）
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface AnnotationResult {
  term: string
  start_index: number
  end_index: number
  annotation: string
  pinyin?: string | null
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      content,      // 文章內容（純文字，不含斷句符）
      title,        // 文章標題（可選，用於上下文）
      author        // 作者（可選，用於上下文）
    } = await req.json()

    // 驗證必需參數
    if (!content || typeof content !== 'string') {
      throw new Error('缺少必需參數：content（文章內容）')
    }

    console.log('📝 開始生成註釋，文章長度:', content.length)

    // 調用 DeepSeek API 生成註釋
    const annotations = await generateAnnotationsWithAI({
      content,
      title: title || null,
      author: author || null
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: annotations,
        count: annotations.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ 生成註釋失敗:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '生成註釋時發生錯誤'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// =====================================================
// AI 生成註釋函數
// =====================================================
async function generateAnnotationsWithAI({
  content,
  title,
  author
}: {
  content: string
  title: string | null
  author: string | null
}): Promise<AnnotationResult[]> {
  
  // 構建系統提示詞
  const systemPrompt = `你是一位專業的中文古文教學助手，擅長為古文文章生成準確的註釋。

你的任務是：
1. 識別文章中需要註釋的字詞（生僻字、多音字、典故、特殊語法）
2. 為每個字詞生成簡潔易懂的註釋
3. 對於難讀的字，必須提供拼音（使用標準拼音，帶聲調）
4. 註釋要適合中學生理解，使用繁體中文

輸出格式要求：
- 必須返回有效的 JSON 數組
- 每個註釋對象包含：term（字詞）、start_index（起始位置）、end_index（結束位置）、annotation（註釋內容）、pinyin（拼音，可選）
- start_index 和 end_index 是字詞在文章中的字符位置（從0開始，不含標點符號）
- 如果字詞是常見字，pinyin 可以為 null 或省略
- 如果字詞是難讀字或多音字，必須提供 pinyin

注意：
- 只註釋真正需要解釋的字詞，不要過度註釋
- 拼音使用標準格式，如：zhì、yú、shèng
- 註釋要簡潔，通常不超過20字`

  // 構建用戶提示詞
  const userPrompt = `請為以下古文文章生成註釋：

${title ? `標題：${title}\n` : ''}${author ? `作者：${author}\n` : ''}
文章內容：
${content}

請分析文章，識別需要註釋的字詞，並返回 JSON 數組。每個註釋必須包含：
- term: 被註釋的字詞原文
- start_index: 在文章中的起始位置（從0開始）
- end_index: 在文章中的結束位置（不包含該位置）
- annotation: 註釋內容（繁體中文，簡潔易懂）
- pinyin: 拼音（僅難讀字需要，格式如 "zhì"，常見字可為 null）

返回格式示例：
[
  {
    "term": "智",
    "start_index": 0,
    "end_index": 1,
    "annotation": "智慧，聰明",
    "pinyin": "zhì"
  },
  {
    "term": "於",
    "start_index": 5,
    "end_index": 6,
    "annotation": "在，介詞",
    "pinyin": null
  }
]

請直接返回 JSON 數組，不要包含其他文字說明。`

  // 獲取 DeepSeek API Key（從環境變量）
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY 環境變量未設置，請在 Supabase Dashboard 中配置')
  }

  // 調用 DeepSeek API（直接調用）
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,  // 降低隨機性，確保輸出穩定
      max_tokens: 2000,
      response_format: { type: 'json_object' }  // 強制 JSON 格式
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API 調用失敗: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const aiContent = data.choices?.[0]?.message?.content || ''

  // 解析 AI 返回的 JSON
  let annotations: AnnotationResult[] = []
  
  try {
    // 嘗試直接解析 JSON
    const parsed = JSON.parse(aiContent)
    
    // 如果返回的是對象，嘗試提取數組
    if (Array.isArray(parsed)) {
      annotations = parsed
    } else if (parsed.annotations && Array.isArray(parsed.annotations)) {
      annotations = parsed.annotations
    } else if (parsed.data && Array.isArray(parsed.data)) {
      annotations = parsed.data
    } else {
      // 如果 AI 返回的不是數組格式，嘗試從文本中提取 JSON
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        annotations = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('無法從 AI 回應中提取註釋數組')
      }
    }
  } catch (parseError: any) {
    console.error('解析 AI 回應失敗:', parseError)
    console.error('AI 回應內容:', aiContent)
    throw new Error(`解析註釋失敗: ${parseError.message}`)
  }

  // 驗證和清理註釋數據
  const validatedAnnotations: AnnotationResult[] = annotations
    .filter((ann: any) => {
      // 驗證必需字段
      return ann.term && 
             typeof ann.start_index === 'number' && 
             typeof ann.end_index === 'number' && 
             ann.annotation
    })
    .map((ann: any) => ({
      term: String(ann.term).trim(),
      start_index: Math.max(0, parseInt(ann.start_index) || 0),
      end_index: Math.max(parseInt(ann.start_index) + 1, parseInt(ann.end_index) || 0),
      annotation: String(ann.annotation).trim(),
      pinyin: ann.pinyin ? String(ann.pinyin).trim() : null
    }))
    .filter((ann: AnnotationResult) => {
      // 確保位置有效
      return ann.start_index >= 0 && ann.end_index > ann.start_index && ann.term.length > 0
    })
    .sort((a, b) => a.start_index - b.start_index)  // 按位置排序

  console.log(`✅ 成功生成 ${validatedAnnotations.length} 個註釋`)
  
  return validatedAnnotations
}

