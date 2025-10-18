// 时文宝鉴 AI 反馈 Agent
// Edge Function for generating AI feedback on student paragraphs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  try {
    // CORS 处理
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { paragraph_id, paragraph_content, paragraph_type, format_spec } = await req.json()
    
    console.log('📝 收到 AI 反馈请求:', { paragraph_id, paragraph_type })

    // 创建 Supabase 客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 加载格式规范（从 format_spec 或默认）
    const formatRules = await loadFormatSpec(format_spec, supabaseClient)
    
    // 2. 识别段落类型对应的规则
    const paragraphRules = identifyParagraphRules(paragraph_type, formatRules)
    
    // 3. 结构完整性检查（基于规则）
    const structuralFeedback = performStructuralCheck(
      paragraph_content,
      paragraph_type,
      paragraphRules
    )

    // 4. 调用 DeepSeek API 进行内容分析
    const contentAnalysis = await analyzeContentWithDeepSeek(
      paragraph_content,
      paragraph_type,
      paragraphRules,
      structuralFeedback
    )

    // 5. 句子级问题定位
    const sentenceIssues = identifySentenceIssues(
      paragraph_content,
      structuralFeedback,
      contentAnalysis
    )

    // 6. 确定问题严重程度
    const severityLevel = determineSeverity(
      structuralFeedback,
      contentAnalysis,
      sentenceIssues
    )

    // 7. 生成改进建议（不含具体修改示例）
    const suggestions = generateSuggestions(
      structuralFeedback,
      contentAnalysis,
      sentenceIssues,
      paragraphRules
    )

    // 8. 生成评分预估（仅供老师参考）
    const gradingEstimation = estimateGrading(
      structuralFeedback,
      contentAnalysis,
      formatRules.grading_rubric || {}
    )

    // 9. 组合完整反馈
    const completeFeedback = {
      structure_check: structuralFeedback,
      content_analysis: contentAnalysis,
      sentence_level_issues: sentenceIssues,
      severity_level: severityLevel,
      improvement_suggestions: suggestions,
      generated_at: new Date().toISOString()
    }

    // 10. 保存到数据库
    const { data, error } = await supabaseClient
      .from('ai_feedback')
      .insert({
        paragraph_id,
        feedback_json: completeFeedback,
        ai_grading_json: gradingEstimation,  // 仅老师可见
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 保存反馈到数据库失败:', error)
      throw error
    }

    console.log('✅ AI 反馈生成并保存成功')

    // 11. 返回反馈（不包含评分预估）
    return new Response(
      JSON.stringify({
        success: true,
        feedback: completeFeedback,
        feedback_id: data.id
        // 注意：不返回 ai_grading_json 给学生
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ 生成 AI 反馈时出错:', error)
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

// ==================== 核心函数实现 ====================

/**
 * 加载格式规范（从传入的 JSON 或加载默认）
 */
async function loadFormatSpec(formatSpec: any, supabase: any) {
  if (formatSpec && typeof formatSpec === 'object') {
    console.log('✅ 使用传入的格式规范')
    return formatSpec
  }
  
  // 如果没有传入，加载默认的红楼梦论文格式
  console.log('⚠️ 未传入格式规范，使用默认（红楼梦论文格式）')
  
  // 注意：在 Edge Function 中无法直接读取文件
  // 需要将格式规范存储在数据库或环境变量中
  // 这里暂时返回一个基本结构，后续可以从数据库加载
  return {
    metadata: {
      name: '默认论文格式',
      essay_type: '学术论文'
    },
    paragraph_types: {},
    sentence_level_rules: {},
    weights_and_scoring: {}
  }
}

/**
 * 识别段落类型对应的格式规则
 */
function identifyParagraphRules(paragraphType: string, formatSpec: any) {
  const typeMap: Record<string, string> = {
    'introduction': 'introduction',
    'intro': 'introduction',
    '引言': 'introduction',
    'body': 'body_paragraph',
    'body_paragraph': 'body_paragraph',
    'paragraph': 'body_paragraph',
    '正文': 'body_paragraph',
    'conclusion': 'conclusion',
    '结论': 'conclusion'
  }
  
  const normalizedType = typeMap[paragraphType.toLowerCase()] || 'body_paragraph'
  const rules = formatSpec.paragraph_types?.[normalizedType] || {}
  
  console.log(`📋 段落类型: ${paragraphType} → ${normalizedType}`)
  
  return {
    type: normalizedType,
    ...rules
  }
}

/**
 * 结构完整性检查
 */
function performStructuralCheck(content: string, type: string, rules: any): any {
  const requiredElements = rules.required_elements || []
  const missingElements: string[] = []
  const presentElements: string[] = []
  const issues: any[] = []
  
  // 将内容分割成句子
  const sentences = splitIntoSentences(content)
  
  if (requiredElements.length === 0) {
    return {
      completeness: 100,
      missing_elements: [],
      present_elements: [],
      issues: [],
      sentences_count: sentences.length
    }
  }
  
  // 检查每个必需元素
  for (const element of requiredElements) {
    if (!element.required) continue
    
    const detected = detectElement(content, sentences, element)
    
    if (detected.present) {
      presentElements.push(element.name)
      
      // 检查该元素的检查点
      if (element.check_points && element.check_points.length > 0) {
        for (const checkPoint of element.check_points) {
          // 这里可以进行更详细的检查
          // 当前简化版本，后续可以通过 AI 分析
        }
      }
    } else {
      missingElements.push(element.name)
      issues.push({
        element: element.name,
        severity: 'critical',
        message: `缺少必需元素：${element.name}`,
        description: element.description
      })
    }
  }
  
  const completeness = Math.round(
    (presentElements.length / requiredElements.length) * 100
  )
  
  return {
    completeness,
    missing_elements: missingElements,
    present_elements: presentElements,
    issues,
    sentences_count: sentences.length,
    total_required: requiredElements.length
  }
}

/**
 * 检测特定元素是否存在
 */
function detectElement(content: string, sentences: string[], element: any): any {
  // 基础检测：根据关键词和标记词
  const keywords = element.keywords || []
  const markers = element.markers || []
  
  let present = false
  let confidence = 0
  
  // 检查是否包含关键词
  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      confidence += 0.3
    }
  }
  
  // 检查是否包含标记词
  for (const marker of markers) {
    if (content.includes(marker)) {
      confidence += 0.4
      present = true
    }
  }
  
  // 如果没有明确的关键词/标记词，根据位置判断
  if (!present && element.position) {
    if (element.position.includes('开头') && sentences.length > 0) {
      // 假设开头元素在前 1-2 句
      present = sentences.length >= 1
      confidence = 0.5
    } else if (element.position.includes('结尾') && sentences.length > 0) {
      // 假设结尾元素在最后 1-2 句
      present = sentences.length >= 1
      confidence = 0.5
    }
  }
  
  return {
    present: present || confidence > 0.3,
    confidence
  }
}

/**
 * 将文本分割成句子
 */
function splitIntoSentences(text: string): string[] {
  // 移除 HTML 标签
  const plainText = text.replace(/<[^>]*>/g, '')
  
  // 按中文句号、问号、感叹号分割
  const sentences = plainText
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  return sentences
}

/**
 * 调用 DeepSeek API 进行内容分析
 */
async function analyzeContentWithDeepSeek(
  content: string,
  type: string,
  rules: any,
  structural: any
): Promise<any> {
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️ DeepSeek API Key 未配置，跳过 AI 内容分析')
    return {
      clarity: { score: 0, issues: [] },
      evidence: { score: 0, issues: [] },
      depth: { score: 0, issues: [] },
      skipped: true
    }
  }
  
  try {
    // 构建 AI 分析提示词
    const prompt = buildAnalysisPrompt(content, type, rules, structural)
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位严谨的中文学术论文写作导师，专注于指导学生写作《红楼梦》相关的文学分析论文。你的反馈必须使用繁體中文，精准、具体、有建设性，只指出问题和改进方向，不提供具体的修改示例。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })
    
    if (!response.ok) {
      throw new Error(`DeepSeek API 返回错误: ${response.status}`)
    }
    
    const result = await response.json()
    const aiAnalysis = result.choices?.[0]?.message?.content || ''
    
    console.log('✅ DeepSeek API 分析完成')
    
    // 解析 AI 返回的 JSON
    try {
      const parsed = JSON.parse(aiAnalysis)
      return parsed
    } catch (e) {
      // 如果 AI 没有返回标准 JSON，返回文本分析
      return {
        clarity: { score: 0, analysis: aiAnalysis },
        evidence: { score: 0, analysis: aiAnalysis },
        depth: { score: 0, analysis: aiAnalysis },
        raw_analysis: aiAnalysis
      }
    }
    
  } catch (error) {
    console.error('❌ DeepSeek API 调用失败:', error)
    return {
      clarity: { score: 0, error: error.message },
      evidence: { score: 0, error: error.message },
      depth: { score: 0, error: error.message },
      error: true
    }
  }
}

/**
 * 构建 AI 分析提示词
 */
function buildAnalysisPrompt(
  content: string,
  type: string,
  rules: any,
  structural: any
): string {
  const elementsDesc = rules.required_elements
    ?.map((e: any) => `- ${e.name}: ${e.description}`)
    .join('\n') || '无特定要求'
  
  return `
请分析以下学生撰写的论文段落（类型：${rules.type || type}）。

【段落内容】
${content}

【格式要求】
${elementsDesc}

【结构检查结果】
- 完整度：${structural.completeness}%
- 缺少元素：${structural.missing_elements.join('、') || '无'}
- 句子数量：${structural.sentences_count}

【分析任务】
请从以下三个维度分析这个段落，并以 JSON 格式返回：

1. **clarity（论点清晰度）**：
   - 主题句是否清晰？
   - 论点是否明确？
   - 是否与总主张一致？

2. **evidence（文本证据）**：
   - 是否引用了原文？
   - 引用是否准确？
   - 引用是否充分支撑论点？

3. **depth（分析深度）**：
   - 是否进行了文本细读？
   - 是否从字、词、句层面分析？
   - 分析是否避免空泛议论？

【返回格式】
{
  "clarity": {
    "score": 0-10,
    "issues": ["问题1", "问题2"],
    "sentence_numbers": [1, 3]
  },
  "evidence": {
    "score": 0-10,
    "issues": ["问题1"],
    "sentence_numbers": [2]
  },
  "depth": {
    "score": 0-10,
    "issues": ["问题1", "问题2"],
    "sentence_numbers": [4, 5]
  }
}

注意：
- 只指出问题所在的句子编号和问题描述
- 不要提供具体的修改示例
- 问题描述要精准、有建设性
- 使用繁體中文
`
}

/**
 * 句子级问题定位
 */
function identifySentenceIssues(
  content: string,
  structural: any,
  contentAnalysis: any
): any[] {
  const issues: any[] = []
  const sentences = splitIntoSentences(content)
  
  // 从结构检查中提取问题
  if (structural.issues && structural.issues.length > 0) {
    for (const issue of structural.issues) {
      issues.push({
        sentence_number: 0, // 整体问题
        type: 'structure',
        severity: issue.severity || 'major',
        message: issue.message,
        suggestion: issue.description
      })
    }
  }
  
  // 从内容分析中提取句子级问题
  const dimensions = ['clarity', 'evidence', 'depth']
  for (const dim of dimensions) {
    const analysis = contentAnalysis[dim]
    if (!analysis) continue
    
    const dimIssues = analysis.issues || []
    const sentenceNumbers = analysis.sentence_numbers || []
    
    for (let i = 0; i < dimIssues.length; i++) {
      issues.push({
        sentence_number: sentenceNumbers[i] || 0,
        type: dim,
        severity: analysis.score < 5 ? 'major' : 'minor',
        message: dimIssues[i],
        suggestion: `请修改第 ${sentenceNumbers[i] || '相关'} 句`
      })
    }
  }
  
  return issues
}

/**
 * 确定问题严重程度
 */
function determineSeverity(
  structural: any,
  contentAnalysis: any,
  sentenceIssues: any[]
): string {
  // 统计各严重级别的问题数量
  const criticalCount = sentenceIssues.filter(i => i.severity === 'critical').length
  const majorCount = sentenceIssues.filter(i => i.severity === 'major').length
  
  // 如果结构完整度低于 50% 或有 critical 问题
  if (structural.completeness < 50 || criticalCount > 0) {
    return 'critical'
  }
  
  // 如果有 2 个以上 major 问题
  if (majorCount >= 2) {
    return 'major'
  }
  
  // 如果有 1 个 major 问题
  if (majorCount === 1) {
    return 'moderate'
  }
  
  // 其他情况
  return 'minor'
}

/**
 * 生成改进建议（不含具体修改示例）
 */
function generateSuggestions(
  structural: any,
  contentAnalysis: any,
  sentenceIssues: any[],
  rules: any
): string[] {
  const suggestions: string[] = []
  
  // 1. 结构问题建议
  if (structural.missing_elements && structural.missing_elements.length > 0) {
    suggestions.push(
      `⚠️ 请补充以下必需元素：${structural.missing_elements.join('、')}`
    )
  }
  
  // 2. 内容分析建议
  if (contentAnalysis.clarity && contentAnalysis.clarity.score < 7) {
    suggestions.push(
      '💡 建议：进一步明确主题句，确保论点清晰明确'
    )
  }
  
  if (contentAnalysis.evidence && contentAnalysis.evidence.score < 7) {
    suggestions.push(
      '💡 建议：增加文本证据，引用《红楼梦》原文或概述相关情节'
    )
  }
  
  if (contentAnalysis.depth && contentAnalysis.depth.score < 7) {
    suggestions.push(
      '💡 建议：深化文本细读，从具体的字、词、句层面进行分析'
    )
  }
  
  // 3. 常见错误建议
  const commonErrors = rules.common_errors || []
  for (const error of commonErrors) {
    // 简单匹配：如果内容中出现错误模式，提示修改方向
    // 这里可以根据实际需求扩展
  }
  
  // 4. 通用建议
  if (suggestions.length === 0) {
    suggestions.push('✅ 段落整体质量良好，请继续保持')
  }
  
  return suggestions
}

/**
 * 评分预估（仅供老师参考）
 */
function estimateGrading(
  structural: any,
  contentAnalysis: any,
  rubric: any
): any {
  // 基于 IB 标准估算评分
  // 每个标准 0-8 分
  
  // 标准 A：分析能力（基于 depth 分数）
  const criterionA = Math.min(8, Math.round((contentAnalysis.depth?.score || 0) * 0.8))
  
  // 标准 B：组织能力（基于结构完整度）
  const criterionB = Math.min(8, Math.round((structural.completeness / 100) * 8))
  
  // 标准 C：创作能力（基于 clarity）
  const criterionC = Math.min(8, Math.round((contentAnalysis.clarity?.score || 0) * 0.8))
  
  // 标准 D：语言运用（基于 evidence 和整体表现）
  const criterionD = Math.min(8, Math.round((contentAnalysis.evidence?.score || 0) * 0.8))
  
  return {
    criterion_a: criterionA,
    criterion_b: criterionB,
    criterion_c: criterionC,
    criterion_d: criterionD,
    total: criterionA + criterionB + criterionC + criterionD,
    max_total: 32,
    note: '此评分仅供老师参考，不显示给学生'
  }
}

