// 时文宝鉴 AI 反馈 Agent
// Edge Function for generating AI feedback on student paragraphs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

serve(async (req) => {
  try {
    // CORS 处理
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { paragraph_id, paragraph_content, paragraph_type, format_spec } = await req.json()

    // 创建 Supabase 客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 结构检查（基于 format_spec）
    const structuralFeedback = performStructuralCheck(
      paragraph_content,
      paragraph_type,
      format_spec
    )

    // 2. 调用 DeepSeek API 进行内容分析
    const contentAnalysis = await analyzeContentWithDeepSeek(
      paragraph_content,
      paragraph_type,
      format_spec
    )

    // 3. 生成评分预估（仅供老师参考）
    const gradingEstimation = estimateGrading(
      structuralFeedback,
      contentAnalysis,
      format_spec.grading_rubric
    )

    // 4. 组合完整反馈
    const completeFeedback = {
      structure_check: structuralFeedback,
      content_analysis: contentAnalysis,
      sentence_level_issues: identifySentenceIssues(paragraph_content, structuralFeedback),
      severity_level: determineSeverity(structuralFeedback, contentAnalysis),
      improvement_suggestions: generateSuggestions(structuralFeedback, contentAnalysis),
      generated_at: new Date().toISOString()
    }

    // 5. 保存到数据库
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

    if (error) throw error

    // 6. 返回反馈（不包含评分预估）
    return new Response(
      JSON.stringify({
        success: true,
        feedback: completeFeedback
        // 注意：不返回 ai_grading_json 给学生
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating feedback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ==================== 辅助函数（待实现）====================

function performStructuralCheck(content: string, type: string, spec: any) {
  // TODO: 实施时根据 format_spec 检查段落结构
  return {
    completeness: {},
    missing_elements: [],
    present_elements: []
  }
}

async function analyzeContentWithDeepSeek(content: string, type: string, spec: any) {
  // TODO: 调用 DeepSeek API 分析内容
  return {
    clarity: {},
    evidence: {},
    depth: {}
  }
}

function estimateGrading(structural: any, content: any, rubric: any) {
  // TODO: 基于 IB 标准估算评分
  return {
    criterion_a: 0,
    criterion_b: 0,
    criterion_c: 0,
    criterion_d: 0
  }
}

function identifySentenceIssues(content: string, feedback: any) {
  // TODO: 句子级问题定位
  return []
}

function determineSeverity(structural: any, content: any) {
  // TODO: 确定问题严重程度
  return 'minor'
}

function generateSuggestions(structural: any, content: any) {
  // TODO: 生成改进建议（不含具体示例）
  return []
}

