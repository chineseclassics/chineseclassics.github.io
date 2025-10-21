/**
 * grading-agent Edge Function
 * 
 * 功能：基于评分标准为学生论文生成 AI 评分建议
 * 
 * 输入：
 *   - essay_id: 论文 ID
 *   - grading_rubric_json: 评分标准 JSON（可能只包含部分标准，如 A/C/D）
 * 
 * 输出：
 *   - criteria_scores: { A: { score: 6, reason: "..." }, C: { score: 7, reason: "..." }, ... }
 * 
 * AI 职责边界：
 *   ✅ 只做客观评分（基于标准描述符）
 *   ❌ 不做主观判断（不评价观点质量）
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 从数据库 content 字段提取纯文本
 * @param content 数据库中的 content 字段（可能是 { html: "..." } 或 Quill Delta 或纯文本）
 * @returns 纯文本字符串
 */
function extractTextFromContent(content: any): string {
  // 如果是字符串，直接返回
  if (typeof content === 'string') {
    return content
  }
  
  // 如果是 { html: "..." } 格式（时文宝鉴的存储格式）
  if (content && content.html) {
    // html 字段可能是 Quill Delta JSON 或纯文本
    if (typeof content.html === 'string') {
      return content.html
    }
    // 如果是 Quill Delta
    if (content.html.ops && Array.isArray(content.html.ops)) {
      return content.html.ops
        .map((op: any) => {
          if (typeof op.insert === 'string') {
            return op.insert
          }
          return ''
        })
        .join('')
        .trim()
    }
  }
  
  // 如果是 Quill Delta 格式
  if (content && content.ops && Array.isArray(content.ops)) {
    return content.ops
      .map((op: any) => {
        if (typeof op.insert === 'string') {
          return op.insert
        }
        return ''
      })
      .join('')
      .trim()
  }
  
  // 其他情况，返回空字符串（避免 [object Object]）
  console.warn('⚠️ 未知的 content 格式:', typeof content)
  return ''
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 解析请求参数
    const { essay_id, grading_rubric_json } = await req.json()

    // 参数验证
    if (!essay_id) {
      return new Response(
        JSON.stringify({ error: '缺少 essay_id 参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!grading_rubric_json) {
      return new Response(
        JSON.stringify({ error: '缺少 grading_rubric_json 参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 查询论文内容及关联的任务信息
    const { data: essay, error: essayError } = await supabase
      .from('essays')
      .select(`
        id, 
        title, 
        student_id, 
        assignment_id,
        assignment:assignments(
          title,
          format_spec_id,
          format_spec:format_specifications(spec_json)
        )
      `)
      .eq('id', essay_id)
      .single()

    if (essayError || !essay) {
      return new Response(
        JSON.stringify({ error: '论文不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 提取写作指引
    const formatSpec = essay.assignment?.format_spec?.spec_json
    console.log('📖 任务写作指引:', formatSpec ? '已加载' : '无')
    if (formatSpec) {
      console.log('📖 写作指引预览:', JSON.stringify(formatSpec).substring(0, 200))
    }

    // 2. 查询所有段落
    const { data: paragraphs, error: paragraphsError } = await supabase
      .from('paragraphs')
      .select('paragraph_type, content, order_index')
      .eq('essay_id', essay_id)
      .order('order_index')

    if (paragraphsError) {
      return new Response(
        JSON.stringify({ error: '查询段落失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. 组装完整论文（从 Quill Delta JSON 提取纯文本）
    console.log('📊 段落数量:', paragraphs.length)
    console.log('📊 第一个段落 content 类型:', typeof paragraphs[0]?.content)
    console.log('📊 第一个段落 content 内容:', JSON.stringify(paragraphs[0]?.content).substring(0, 200))
    
    const essayText = paragraphs
      .map(p => {
        const text = extractTextFromContent(p.content)
        return `【${p.paragraph_type}】\n${text}`
      })
      .join('\n\n')
    
    console.log('📝 论文文本长度:', essayText.length)
    console.log('📝 论文文本预览:', essayText.substring(0, 500))

    // 4. 解析评分标准（可能只包含部分标准）
    const criteria = grading_rubric_json.criteria || []
    
    if (criteria.length === 0) {
      return new Response(
        JSON.stringify({ error: '评分标准为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. 调用 DeepSeek API 评分
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'DEEPSEEK_API_KEY 未配置' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 构建写作指引文本
    let formatGuidelines = ''
    if (formatSpec) {
      // 提取写作指引的关键信息
      const sections = formatSpec.sections || []
      formatGuidelines = `
**本次任务的写作要求**：
${sections.map((s: any) => `- ${s.title || s.name}: ${s.description || s.requirements || ''}`).join('\n')}
${formatSpec.metadata?.word_count ? `- 字数要求：${formatSpec.metadata.word_count}` : ''}
${formatSpec.metadata?.structure ? `- 结构要求：${formatSpec.metadata.structure}` : ''}
`
    }

    // 构建 System Prompt
    const systemPrompt = `你是一位專業的文學教師，負責基於 IB MYP 評分標準為學生論文評分。

**🌏 語言要求：所有輸出必須使用繁體中文！**

**核心原則**：
1. ✅ 只做客觀評分：嚴格按照評分標準描述符判斷
2. ❌ 不做主觀判斷：不評價觀點的對錯，不建議思考方向
3. 📊 基於證據：每個評分必須有論文中的具體證據支持
${formatGuidelines ? '\n4. 📖 結合任務要求：檢查是否符合本次任務的寫作要求\n' : ''}
**评分标准说明**：
${criteria.map(c => `
**${c.code}. ${c.name}**（0-8 分）
${c.descriptors.map(d => `- ${d.range} 分：${d.description}`).join('\n')}
`).join('\n')}
${formatGuidelines}
**輸出格式**：
返回 JSON 格式，包含每個標準的評分、理由和總評（**必須使用繁體中文**）：
{
  "criteria": {
    "A": { "score": 6, "reason": "客觀理由..." },
    "B": { "score": 7, "reason": "客觀理由..." }
  },
  "overall_comment": {
    "strengths": "學生做得好的方面（2-3點，具體客觀，繁體中文）",
    "improvements": "學生需要改進的方面（2-3點，具體客觀，繁體中文）"
  }
}

**評分理由撰寫要求**：
- 必須引用論文中的具體內容作為證據
- 說明符合哪個分數段的描述符
- 結合任務要求檢查（如字數、結構、主題）
- 避免主觀評價（如"觀點深刻"），只陳述客觀事實（如"引用了 3 處原文"）
- **使用繁體中文**

**總評撰寫要求**：
- strengths：指出 2-3 個具體優點（如"引用原文恰當"、"結構清晰"等）
- improvements：指出 2-3 個具體改進點（如"分論點數量不足"、"分析深度可加強"等）
- 語氣客觀友善，重點是幫助學生進步
- **必須使用繁體中文撰寫**`

    // 构建 User Prompt
    const userPrompt = `請為以下論文評分（**必須使用繁體中文**）：

**論文標題**：${essay.title || '無標題'}
**任務名稱**：${essay.assignment?.title || '無任務'}

**論文內容**：
${essayText}

**評分要求**：
- 只為以下標準評分：${criteria.map(c => c.code).join('、')}
- 每個標準 0-8 分
- 提供客觀的評分理由
- 撰寫總評（優點 + 改進建議）
- **所有輸出必須使用繁體中文**`

    // 调用 DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,  // 降低温度，使评分更一致
        max_tokens: 2000
      })
    })

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text()
      console.error('DeepSeek API 调用失败:', errorText)
      return new Response(
        JSON.stringify({ error: 'AI 评分失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deepseekData = await deepseekResponse.json()
    const aiContent = deepseekData.choices[0].message.content

    // 解析 AI 返回的 JSON
    let aiResult: {
      criteria: Record<string, { score: number; reason: string }>;
      overall_comment: { strengths: string; improvements: string };
    }
    
    try {
      // 尝试提取 JSON（AI 可能返回带有说明的文本）
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0])
      } else {
        aiResult = JSON.parse(aiContent)
      }
      
      // 验证结构
      if (!aiResult.criteria || !aiResult.overall_comment) {
        throw new Error('AI 返回结构不完整')
      }
    } catch (parseError) {
      console.error('解析 AI 返回的 JSON 失败:', aiContent)
      return new Response(
        JSON.stringify({ error: 'AI 返回格式错误', raw_content: aiContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const criteriaScores = aiResult.criteria
    const overallComment = aiResult.overall_comment

    // 6. 转换为数据库表结构并保存
    // 表结构：criterion_a_score, criterion_b_score, criterion_c_score, criterion_d_score, reasoning, overall_comment
    const insertData: any = {
      essay_id: essay_id,
      grading_rubric_id: null,  // 暂时设为 NULL（因为我们没有在 grading_rubrics 表中创建记录）
      reasoning: {},  // 存储所有标准的评分理由
      overall_comment: JSON.stringify(overallComment)  // 存储总评（strengths + improvements）
    }

    // 提取分数和理由
    for (const [code, scoreData] of Object.entries(criteriaScores)) {
      const columnName = `criterion_${code.toLowerCase()}_score`
      insertData[columnName] = (scoreData as any).score
      insertData.reasoning[code] = (scoreData as any).reason
    }

    const { data: suggestion, error: saveError } = await supabase
      .from('ai_grading_suggestions')
      .insert(insertData)
      .select()
      .single()

    if (saveError) {
      console.error('保存评分建议失败:', saveError)
      return new Response(
        JSON.stringify({ error: '保存评分建议失败', details: saveError.message, criteria_scores: criteriaScores }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        criteria_scores: criteriaScores,
        overall_comment: overallComment,
        suggestion_id: suggestion.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 错误:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

