// @ts-nocheck
// 時文寶鑑 AI 反饋 Agent（teacher-first；無分數；單一路徑優化版）

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const ADVISORY_NOTE = '本工具僅提供寫作建議；最終評分由 grading-agent 與教師決定'

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const body = await req.json()

    // 參數整理
    const paragraph_id: string = body.paragraph_id
    const paragraph_content_html: string = body.paragraph_content_html || body.paragraph_content || ''
    const paragraph_text: string = body.paragraph_text || stripHtml(paragraph_content_html)
    const sentences: string[] = Array.isArray(body.sentences) && body.sentences.length > 0
      ? body.sentences
      : splitIntoSentences(paragraph_text)

    const paragraph_type: string = body.paragraph_type || 'body'
    const paragraph_type_detailed: string = body.paragraph_type_detailed || paragraph_type
    const paragraph_role = normalizeParagraphRole(body.paragraph_role, paragraph_type_detailed)

    const teacher_guidelines_text: string = body.teacher_guidelines_text || '' // 單一路徑：不截斷
    const guideline_min_hints = body.guideline_min_hints || null
    const strictness_hint: 'adaptive' | 'strict' = 'adaptive' // 廢棄，保留佔位
    const traceability: boolean = typeof body.traceability === 'boolean' ? body.traceability : true

    const rubric_id: string | null = body.rubric_id || null
    const rubric_definition: any = null // 提速：忽略大型 rubric 定義
    const rubric_mode: 'adaptive' | 'strict' = body.rubric_mode || 'adaptive'
    const rubric_selection: any = body.rubric_selection || null

    console.log('📝 收到 AI 反饋請求:', { paragraph_id, role: paragraph_role?.kind || paragraph_type })

    // Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 無 API key：降級
    if (!DEEPSEEK_API_KEY) {
      const fallback = buildFallbackFeedback()
      await saveFeedback(supabase, paragraph_id, fallback)
      return new Response(JSON.stringify({ success: true, feedback: fallback }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 構建提示
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

    // 調用 LLM
    let aiFeedback = await callDeepSeekForFeedback(systemPrompt, userPrompt)

    // 修形與保底
    aiFeedback = ensureFeedbackShape(aiFeedback)
    try {
      if (guideline_min_hints && Array.isArray(guideline_min_hints.forbidden_patterns)) {
        aiFeedback = adjustForbiddenChecksToAdvisory(aiFeedback, guideline_min_hints.forbidden_patterns)
      }
    } catch (_) {}
  try { if (aiFeedback && aiFeedback.guideline_alignment) delete aiFeedback.guideline_alignment.score } catch (_) {}
  try { if (aiFeedback && 'rubric_alignment' in aiFeedback) delete aiFeedback.rubric_alignment } catch (_) {}
  // 兼容舊鍵名：若模型或歷史資料殘留 structure_check，後端直接移除
  try { if (aiFeedback && 'structure_check' in aiFeedback) delete aiFeedback.structure_check } catch (_) {}

    // 修訂等級（類別）
    const revision = computeRevisionIndicator(aiFeedback)
    if (revision) {
      aiFeedback.revision_indicator = revision
      const map: any = { major: 'major', moderate: 'moderate', minor: 'minor', ready: 'ready' }
      aiFeedback.severity_level = map[revision.level] || 'minor'
    }

    if (!aiFeedback.generated_at) aiFeedback.generated_at = new Date().toISOString()

    // 寫入資料庫（無回讀）
    await saveFeedback(supabase, paragraph_id, aiFeedback)

    return new Response(JSON.stringify({ success: true, feedback: aiFeedback, feedback_id: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('❌ 生成 AI 反饋時出錯:', error)
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

// ========= 工具 =========

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

  const systemPrompt = `你是該課老師的分身，所有評議以老師指引為最高準則；使用繁體中文；不提供具體改寫句。\n\n【嚴格輸出要求】\n- 僅輸出 JSON；不要任何多餘文字或 Markdown；不要使用代碼塊。\n- 嚴禁發明老師未要求的硬性規則；如無明確形式規定，形式建議以 suggestions_form 提供並標註為建議。\n- 使用 sentences[] 的編號進行句子對位；若啟用 traceability，請引用 1–3 句老師指引片段支撐主要評議。\n- 根據 paragraph_role.kind（introduction/body/conclusion）與（若為 body）body_index 調整判斷重點：\n  • introduction：主題句/提出總主張、鋪陳背景或議題定位、避免過早細讀。\n  • body：段首主題句→引用原文→緊跟細讀→段尾回扣主張（本課標準流程）。\n  • conclusion：總結收束、提升/回扣總主張、避免引入全新論點。\n  若與老師文本衝突，仍以老師文本優先。\n- 若提供 rubric（或 rubric_selection），僅作參考：請從 rubric 的「最高成績水平」描述中抽取 2–4 條與本段最相關的要點，轉為 suggestions_form 的 [Rubric-*] 建議項；不要輸出任何 rubric_alignment 或分數；若與老師文本衝突，仍以老師文本優先。\n- 對模糊判定進行最小 tiebreaker：先用 yes/no 做判斷並給出 0–1 的 confidence。\n- 若 guideline_min_hints.forbidden_patterns 存在，僅作建議（source:\"ai_default\"），不作硬性判斷或量化分數；並附上固定提醒：\"本工具僅提供寫作建議；最終評分由 grading-agent 與教師決定\"。\n- 輸出收斂：overall_comment 不超過 120 字；sentence_notes 最多 3 條；guideline_alignment.checks 最多 6 條（優先教師要點）。`

  const material = {
    paragraph_text,
    sentences,
    paragraph_role,
    teacher_guidelines_text,
    guideline_min_hints: guideline_min_hints || undefined,
    traceability,
    rubric: rubric_selection ? { selection: rubric_selection, mode: rubric_mode } : (rubric_id ? { rubric_id, mode: rubric_mode } : undefined),
    rubric_mode,
    rubric_selection: rubric_selection || undefined
  }

  const userPrompt = `【材料】\n${JSON.stringify(material, null, 2)}\n\n【輸出契約（必須完全匹配鍵名）】\n{\n  \"overall_comment\": string,\n  \"sentence_notes\": Array<{ \"sentence_number\": number, \"comment\": string, \"severity\"?: \"major\"|\"minor\" }>,\n  \"guideline_alignment\": {\n    \"checks\": Array<{ \"name\": string, \"status\": \"met\"|\"partially_met\"|\"not_met\"|\"not_applicable\", \"source\": \"teacher\"|\"ai_default\", \"confidence\"?: number }>\n  },\n  \"suggestions_form\"?: string[],\n  \"assumptions\"?: string[],\n  \"severity_level\"?: \"critical\"|\"major\"|\"moderate\"|\"minor\",\n  \"generated_at\": string\n}`

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
      temperature: 0.2,
      max_tokens: 1200,
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
  try { return JSON.parse(s) } catch (_) {}
  let t = s.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(t) } catch (_) {}
  const matches = t.match(/\{[\s\S]*\}/g) || []
  const sorted = matches.sort((a, b) => b.length - a.length)
  for (const m of sorted) { try { return JSON.parse(m) } catch (_) {} }
  throw new Error('未找到有效 JSON')
}

async function saveFeedback(supabase: any, paragraph_id: string, feedback: any) {
  const { error } = await supabase
    .from('ai_feedback')
    .insert({ paragraph_id, feedback_json: feedback, generated_at: new Date().toISOString() })
  if (error) throw error
  return null
}

function buildFallbackFeedback() {
  return {
    overall_comment: '系統暫時無法連線至 AI 服務。請稍後重試。',
    sentence_notes: [],
    guideline_alignment: {
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
        comment: typeof n.comment === 'string' ? sanitizeSentenceComment(n.comment) : '',
        severity: n.severity === 'major' ? 'major' : (n.severity === 'minor' ? 'minor' : undefined)
      }))
  }
  // guideline_alignment
  if (typeof feedback.guideline_alignment !== 'object' || !feedback.guideline_alignment) {
    feedback.guideline_alignment = { checks: [], rationale_snippets: [], notes: [] }
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
    // 刪除任何殘留的分數欄位
    try { if ('score' in ga) delete ga.score } catch (_) {}
  }
  // rubric_alignment（可選）
  if (feedback.rubric_alignment && typeof feedback.rubric_alignment === 'object') {
    // 反饋系統不輸出任何 rubric 對齊；安全起見直接移除
    try { delete feedback.rubric_alignment } catch (_) {}
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

//（feedback 秉持「僅提供建議」：不做任何分數計算或輸出）

/**
 * computeRevisionIndicator：以「老師要點 + rubric 最高等級建議」推導修訂等級（類別，不涉分數）。
 * 規則（teacher-first）：
 * - 任一老師要點 not_met → level='major'
 * - 否則任一老師要點 partially_met → level='moderate'
 * - 否則若 rubric 衍生的建議（[Rubric-*] 前綴）數量 ≥ 2 → level='minor'
 * - 否則 → level='ready'
 */
function computeRevisionIndicator(fb: any): { level: 'major'|'moderate'|'minor'|'ready', drivers: string[] } | null {
  if (!fb || !fb.guideline_alignment) return null
  try {
    const checks = Array.isArray(fb.guideline_alignment.checks) ? fb.guideline_alignment.checks : []
    const teacherChecks = checks.filter((c: any) => c && c.source === 'teacher')
    const notMet = teacherChecks.filter((c: any) => c.status === 'not_met')
    const partial = teacherChecks.filter((c: any) => c.status === 'partially_met')

    const suggestions: string[] = Array.isArray(fb.suggestions_form) ? fb.suggestions_form : []
    const rubricSuggests = suggestions.filter(s => typeof s === 'string' && /^\s*\[Rubric-[^\]]+\]/i.test(s))

    if (notMet.length > 0) {
      return { level: 'major', drivers: notMet.map((c: any) => `老師要點未達：${c.name || ''}`) }
    }
    if (partial.length > 0) {
      return { level: 'moderate', drivers: partial.map((c: any) => `老師要點部分達成：${c.name || ''}`) }
    }
    if (rubricSuggests.length >= 2) {
      return { level: 'minor', drivers: [`Rubric 最高等級建議可補強：${rubricSuggests.length} 項`] }
    }
    return { level: 'ready', drivers: ['老師要點皆已達成；僅需微調或可提交'] }
  } catch (_) {
    return null
  }
}

/**
 * sanitizeSentenceComment：移除句子備註中的來源附註，例如：（source: ...）或 (source: ...)、（來源: ...）等。
 */
function sanitizeSentenceComment(text: string): string {
  if (typeof text !== 'string') return ''
  try {
    let t = text
    // 全形括號：移除包含 source: 或 來源:
    t = t.replace(/（\s*source:[\s\S]*?）/gi, '')
    t = t.replace(/（\s*來源:[\s\S]*?）/gi, '')
    // 半形括號：移除包含 source: 或 來源:
    t = t.replace(/\(\s*source:[\s\S]*?\)/gi, '')
    t = t.replace(/\(\s*來源:[\s\S]*?\)/gi, '')
    // 合併多餘空白
    t = t.replace(/\s{2,}/g, ' ').trim()
    return t
  } catch (_) {
    return text
  }
}

