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

    // 1. 查询论文内容
    const { data: essay, error: essayError } = await supabase
      .from('essays')
      .select('id, title, student_id, assignment_id')
      .eq('id', essay_id)
      .single()

    if (essayError || !essay) {
      return new Response(
        JSON.stringify({ error: '论文不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. 查询所有段落
    const { data: paragraphs, error: paragraphsError } = await supabase
      .from('paragraphs')
      .select('paragraph_type, content, paragraph_order')
      .eq('essay_id', essay_id)
      .order('paragraph_order')

    if (paragraphsError) {
      return new Response(
        JSON.stringify({ error: '查询段落失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. 组装完整论文
    const essayText = paragraphs
      .map(p => `【${p.paragraph_type}】\n${p.content}`)
      .join('\n\n')

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

    // 构建 System Prompt
    const systemPrompt = `你是一位专业的文学教师，负责基于 IB MYP 评分标准为学生论文评分。

**核心原则**：
1. ✅ 只做客观评分：严格按照评分标准描述符判断
2. ❌ 不做主观判断：不评价观点的对错，不建议思考方向
3. 📊 基于证据：每个评分必须有论文中的具体证据支持

**评分标准说明**：
${criteria.map(c => `
**${c.id}. ${c.name}**（0-8 分）
${c.descriptors.map(d => `- ${d.range} 分：${d.description}`).join('\n')}
`).join('\n')}

**输出格式**：
返回 JSON 格式，包含每个标准的评分和理由：
{
  "A": { "score": 6, "reason": "客观理由..." },
  "B": { "score": 7, "reason": "客观理由..." },
  ...
}

**理由撰写要求**：
- 必须引用论文中的具体内容作为证据
- 说明符合哪个分数段的描述符
- 避免主观评价（如"观点深刻"），只陈述客观事实（如"引用了 3 处原文"）`

    // 构建 User Prompt
    const userPrompt = `请为以下论文评分：

**论文标题**：${essay.title || '无标题'}

**论文内容**：
${essayText}

**评分要求**：
- 只为以下标准评分：${criteria.map(c => c.id).join('、')}
- 每个标准 0-8 分
- 提供客观的评分理由`

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
    let criteriaScores: Record<string, { score: number; reason: string }>
    try {
      // 尝试提取 JSON（AI 可能返回带有说明的文本）
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        criteriaScores = JSON.parse(jsonMatch[0])
      } else {
        criteriaScores = JSON.parse(aiContent)
      }
    } catch (parseError) {
      console.error('解析 AI 返回的 JSON 失败:', aiContent)
      return new Response(
        JSON.stringify({ error: 'AI 返回格式错误', raw_content: aiContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. 保存评分建议到数据库
    const { data: suggestion, error: saveError } = await supabase
      .from('ai_grading_suggestions')
      .insert({
        essay_id: essay_id,
        criteria_scores: criteriaScores,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('保存评分建议失败:', saveError)
      return new Response(
        JSON.stringify({ error: '保存评分建议失败', criteria_scores: criteriaScores }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        criteria_scores: criteriaScores,
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

