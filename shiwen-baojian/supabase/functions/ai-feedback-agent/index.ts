// @ts-nocheck
// 時文寶鑑 AI 反饋 Agent（新版：teacher-text-first + rubric 對齊）

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const ADVISORY_NOTE = '本分數僅作為建議，最終評分由 grading-agent 與教師決定'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  try {
    // CORS 預檢
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const body = await req.json()

    // 兼容舊參數名 → 新契約
    const paragraph_id: string = body.paragraph_id
    const paragraph_content_html: string = body.paragraph_content_html || body.paragraph_content || ''
    const paragraph_text: string = body.paragraph_text || stripHtml(paragraph_content_html)
    const sentences: string[] = Array.isArray(body.sentences) && body.sentences.length > 0
      ? body.sentences
      : splitIntoSentences(paragraph_text)

    const paragraph_type: string = body.paragraph_type || 'body'
    const paragraph_type_detailed: string = body.paragraph_type_detailed || paragraph_type
    const paragraph_role = normalizeParagraphRole(body.paragraph_role, paragraph_type_detailed)

    const teacher_guidelines_text: string = body.teacher_guidelines_text || ''
    const guideline_min_hints = body.guideline_min_hints || null
  // 嚴格度設置（已廢棄）：即使前端傳入也忽略，保持建議定位
  const strictness_hint: 'adaptive' | 'strict' = 'adaptive'
    const traceability: boolean = typeof body.traceability === 'boolean' ? body.traceability : true

    const rubric_id: string | null = body.rubric_id || null
    const rubric_definition: any = body.rubric_definition || null
    const rubric_mode: 'adaptive' | 'strict' = body.rubric_mode || 'adaptive'
    const rubric_selection: any = body.rubric_selection || null

    console.log('📝 收到 AI 反饋請求:', { paragraph_id, role: paragraph_role?.kind || paragraph_type })

    // Supabase 客戶端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 若未配置 DeepSeek，返回降級訊息
    if (!DEEPSEEK_API_KEY) {
      const fallback = buildFallbackFeedback()
      await saveFeedback(supabase, paragraph_id, fallback)
      return new Response(
        JSON.stringify({ success: true, feedback: fallback }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 構建提示詞
    const { systemPrompt, userPrompt } = buildDeepSeekPrompts({
      paragraph_text,
      sentences,
      paragraph_role,
      teacher_guidelines_text,
      guideline_min_hints,
      traceability,
      rubric_id,
      rubric_definition,
      rubric_mode,
      rubric_selection
    })

    // 調用 DeepSeek 取得 JSON 反饋
  let aiFeedback = await callDeepSeekForFeedback(systemPrompt, userPrompt)

  // 保底：修正/補齊欄位
  aiFeedback = ensureFeedbackShape(aiFeedback)
  // 額外收斂：任何 forbidden_patterns 僅作建議 → 強制標為 ai_default
  try {
    if (guideline_min_hints && Array.isArray(guideline_min_hints.forbidden_patterns)) {
      aiFeedback = adjustForbiddenChecksToAdvisory(aiFeedback, guideline_min_hints.forbidden_patterns)
    }
  } catch (_) {}
  // 重計分（僅 teacher 來源）
  aiFeedback.guideline_alignment.score = recomputeGuidelineScore(aiFeedback.guideline_alignment)

    // 注入時間戳（若模型未返回）
    if (!aiFeedback.generated_at) aiFeedback.generated_at = new Date().toISOString()

    // 保存
    const row = await saveFeedback(supabase, paragraph_id, aiFeedback)

    return new Response(
      JSON.stringify({ success: true, feedback: aiFeedback, feedback_id: row?.id || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ 生成 AI 反饋時出錯:', error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ==================== 新版核心函式 ====================

function stripHtml(html: string): string {
  if (!html) return ''
  try { return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() } catch { return html }
}

function splitIntoSentences(text: string): string[] {
  const t = (text || '').trim()
  if (!t) return []
  return t
    .split(/[。．!！?？；;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function normalizeParagraphRole(role: any, detailed: string) {
  if (role && typeof role === 'object' && role.kind) return role
  // 兼容 body-2 這類
  if (typeof detailed === 'string') {
    if (detailed.startsWith('body-')) {
      const idx = Number(detailed.split('-')[1])
      return { kind: 'body', body_index: Number.isFinite(idx) ? idx : null }
    }
    if (['introduction', 'intro', '引言'].includes(detailed)) return { kind: 'introduction' }
    if (['conclusion', '結論', '结论'].includes(detailed)) return { kind: 'conclusion' }
  }
  return { kind: 'body' }
}

function buildDeepSeekPrompts(input: {
  paragraph_text: string,
  sentences: string[],
  paragraph_role: { kind: string, body_index?: number | null },
  teacher_guidelines_text: string,
  guideline_min_hints?: any,
  traceability: boolean,
  rubric_id?: string | null,
  rubric_definition?: any,
  rubric_mode: 'adaptive' | 'strict',
  rubric_selection?: any
}) {
  const { paragraph_text, sentences, paragraph_role, teacher_guidelines_text, guideline_min_hints, traceability, rubric_id, rubric_definition, rubric_mode, rubric_selection } = input

  const systemPrompt = `你是該課老師的分身，所有評議以老師指引為最高準則；使用繁體中文；不提供具體改寫句。\n\n【嚴格輸出要求】\n- 僅輸出 JSON；不要任何多餘文字或 Markdown；不要使用代碼塊。\n- 嚴禁發明老師未要求的硬性規則；如無明確形式規定，形式建議以 suggestions_form 提供並標註為建議。\n- 使用 sentences[] 的編號進行句子對位；若啟用 traceability，請引用 1–3 句老師指引片段支撐主要評議。\n- 若提供 rubric_selection 或 rubric，請以老師在作業中勾選的 selected_criteria 為主進行全面對齊（不限於結構），對 paragraph/essay 範圍分別給出 criteria.status 或 paragraph_contribution；按 rubric_mode 呈現建議性或可選計分的對齊結果；若與老師文本衝突，仍以老師文本優先並於 notes 中說明。\n- 對模糊判定（尤其來自老師指引的可適用要點）進行最小 tiebreaker：先用 yes/no 做判斷並給出 0–1 的 confidence。\n- 若 guideline_min_hints.forbidden_patterns 存在，僅作建議（source:"ai_default"），不納入計分；請避免將其視為老師明確規定。並在 guideline_alignment.notes 中提醒："本分數僅作為建議，最終評分由 grading-agent 與教師決定"。`

  // 用戶材料與輸出契約（標明鍵名）
  const material = {
    paragraph_text,
    sentences,
    paragraph_role,
    teacher_guidelines_text,
    guideline_min_hints: guideline_min_hints || undefined,
    traceability,
    rubric: rubric_definition || rubric_id || undefined,
    rubric_mode,
    rubric_selection: rubric_selection || undefined
  }

  const userPrompt = `【材料】\n${JSON.stringify(material, null, 2)}\n\n【輸出契約（必須完全匹配鍵名）】\n{\n  "overall_comment": string,\n  "sentence_notes": Array<{ "sentence_number": number, "comment": string, "severity"?: "major"|"minor" }>,\n  "guideline_alignment": {\n    "score": number,\n    "checks": Array<{ "name": string, "status": "met"|"partially_met"|"not_met"|"not_applicable", "source": "teacher"|"ai_default", "confidence"?: number }>,\n    "rationale_snippets"?: string[],\n    "notes"?: string[]\n  },\n  "rubric_alignment"?: {\n    "score"?: number,\n    "criteria": Array<{\n      "id": string, "name": string, "dimension"?: string,\n      "status": "met"|"partially_met"|"not_met"|"not_applicable",\n      "scope"?: "paragraph"|"essay",\n      "paragraph_contribution"?: "positive"|"neutral"|"negative",\n      "required"?: boolean, "weight"?: number, "notes"?: string[]\n    }>,\n    "rationale_snippets"?: string[]\n  },\n  "suggestions_form"?: string[],\n  "assumptions"?: string[],\n  "severity_level"?: "critical"|"major"|"moderate"|"minor",\n  "generated_at": string\n}`

  return { systemPrompt, userPrompt }
}

async function callDeepSeekForFeedback(systemPrompt: string, userPrompt: string) {
  const resp = await fetch(DEEPSEEK_API_URL, {
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
      temperature: 0.25,
      max_tokens: 1600,
      response_format: { type: 'json_object' }
    })
  })

  if (!resp.ok) {
    const t = await resp.text()
    throw new Error(`DeepSeek 調用失敗：${resp.status} ${t}`)
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content || ''

  return extractJSONStrict(content)
}
 

function extractJSONStrict(text: string): any {
  const s = (text || '').trim()
  // 1) 直解析
  try { return JSON.parse(s) } catch (_) {}
  // 2) 去除常見 code fence
  let t = s.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(t) } catch (_) {}
  // 3) 匹配最長的大括號片段
  const matches = t.match(/\{[\s\S]*\}/g) || []
  const sorted = matches.sort((a, b) => b.length - a.length)
  for (const m of sorted) {
    try { return JSON.parse(m) } catch (_) {}
  }
  throw new Error('未找到有效 JSON')
}

async function saveFeedback(supabase: any, paragraph_id: string, feedback: any) {
  const { data, error } = await supabase
    .from('ai_feedback')
    .insert({
      paragraph_id,
      feedback_json: feedback,
      generated_at: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return data
}

function buildFallbackFeedback() {
  return {
    overall_comment: '系統暫時無法連線至 AI 服務。請稍後重試。',
    sentence_notes: [],
    guideline_alignment: {
      score: 0,
      checks: [],
      rationale_snippets: [],
      notes: ['離線模式']
    },
    severity_level: 'minor',
    generated_at: new Date().toISOString()
  }
}

// ============== 保底與重計分輔助 ==============

/**
 * ensureFeedbackShape：補齊必要鍵名與型別，避免前端渲染或資料寫入出錯。
 * 僅修形，不更動模型語意內容。
 */
function ensureFeedbackShape(fb: any) {
  const feedback = typeof fb === 'object' && fb ? fb : {}
  // overall_comment
  if (typeof feedback.overall_comment !== 'string') {
    feedback.overall_comment = '（系統保底）本段反饋已生成，但缺少總評內容。'
  }
  // sentence_notes
  if (!Array.isArray(feedback.sentence_notes)) {
    feedback.sentence_notes = []
  } else {
    feedback.sentence_notes = feedback.sentence_notes
      .filter((n: any) => n && typeof n === 'object')
      .map((n: any) => ({
        sentence_number: Number(n.sentence_number) || 1,
        comment: typeof n.comment === 'string' ? n.comment : '',
        severity: n.severity === 'major' ? 'major' : (n.severity === 'minor' ? 'minor' : undefined)
      }))
  }
  // guideline_alignment
  if (typeof feedback.guideline_alignment !== 'object' || !feedback.guideline_alignment) {
    feedback.guideline_alignment = { score: 0, checks: [], rationale_snippets: [], notes: [] }
  } else {
    const ga = feedback.guideline_alignment
    if (!Array.isArray(ga.checks)) ga.checks = []
    ga.checks = ga.checks
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => ({
        name: typeof c.name === 'string' ? c.name : '未命名要點',
        status: ['met','partially_met','not_met','not_applicable'].includes(c.status) ? c.status : 'not_applicable',
        source: c.source === 'teacher' ? 'teacher' : 'ai_default',
        confidence: typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : undefined
      }))
    if (!Array.isArray(ga.rationale_snippets)) ga.rationale_snippets = []
    if (!Array.isArray(ga.notes)) ga.notes = []
    // 附加「僅作建議」的固定說明
    try {
      if (!ga.notes.includes(ADVISORY_NOTE)) ga.notes.push(ADVISORY_NOTE)
    } catch (_) {}
    if (typeof ga.score !== 'number') ga.score = 0
  }
  // rubric_alignment（可選）
  if (feedback.rubric_alignment && typeof feedback.rubric_alignment === 'object') {
    const ra = feedback.rubric_alignment
    if (!Array.isArray(ra.criteria)) ra.criteria = []
    if (!Array.isArray(ra.rationale_snippets)) ra.rationale_snippets = []
    if (ra.score != null && typeof ra.score !== 'number') delete ra.score
  }
  // suggestions_form / assumptions
  if (feedback.suggestions_form && !Array.isArray(feedback.suggestions_form)) feedback.suggestions_form = []
  if (feedback.assumptions && !Array.isArray(feedback.assumptions)) feedback.assumptions = []
  // generated_at
  if (typeof feedback.generated_at !== 'string') feedback.generated_at = new Date().toISOString()
  // severity_level（可選）
  if (feedback.severity_level && !['critical','major','moderate','minor'].includes(feedback.severity_level)) {
    delete feedback.severity_level
  }
  return feedback
}

/**
 * adjustForbiddenChecksToAdvisory：將命中 forbidden_patterns 的檢查強制標為 ai_default（建議，不計分）。
 */
function adjustForbiddenChecksToAdvisory(fb: any, patterns: string[]) {
  if (!fb || !fb.guideline_alignment || !Array.isArray(fb.guideline_alignment.checks)) return fb
  const pats = (patterns || []).filter((p: any) => typeof p === 'string' && p.trim().length > 0)
  if (pats.length === 0) return fb
  try {
    fb.guideline_alignment.checks = fb.guideline_alignment.checks.map((c: any) => {
      const name = (c?.name ?? '').toString()
      const hit = pats.some(p => name.includes(p))
      if (hit) {
        return { ...c, source: 'ai_default' }
      }
      return c
    })
  } catch (_) {}
  return fb
}

/**
 * recomputeGuidelineScore：僅統計 source="teacher" 且 status ∈ {met, partially_met, not_met}
 * 分數：round( met / (met + partially + not) * 100 )；如分母為 0 → 0。
 */
function recomputeGuidelineScore(ga: any): number {
  if (!ga || !Array.isArray(ga.checks)) return 0
  let met = 0, part = 0, notm = 0
  for (const c of ga.checks) {
    if (!c || c.source !== 'teacher') continue
    if (c.status === 'met') met++
    else if (c.status === 'partially_met') part++
    else if (c.status === 'not_met') notm++
  }
  const denom = met + part + notm
  if (denom === 0) return 0
  return Math.round((met / denom) * 100)
}

