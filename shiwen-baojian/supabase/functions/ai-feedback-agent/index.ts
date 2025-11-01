// @ts-nocheck
// 時文寶鑑 AI 反饋 Agent（teacher-first；無分數；單一路徑優化版）

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const paragraph_role = normalizeParagraphRole(
      body.paragraph_role,
      body.paragraph_type_detailed || body.paragraph_type || 'body'
    )

  const teacher_guidelines_text: string = compressWhitespace(body.teacher_guidelines_text || '') // 壓縮空白，減少 token

  const rubric_id: string | null = body.rubric_id || null
    const rubric_mode: 'adaptive' | 'strict' = body.rubric_mode || 'adaptive'
    const rubric_selection: any = body.rubric_selection || null

  console.log('📝 收到 AI 反饋請求:', { paragraph_id, role: paragraph_role?.kind || 'body' })

    // 無 API key：降級
    if (!DEEPSEEK_API_KEY) {
      const fallback = buildFallbackFeedback()
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await saveFeedback(supabase, paragraph_id, fallback)
      return new Response(JSON.stringify({ success: true, feedback: fallback }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 構建提示
    const { systemPrompt, userPrompt } = buildDeepSeekPrompts({
      paragraph_text,
      sentences,
      paragraph_role,
  teacher_guidelines_text,
      
      rubric_id,
      rubric_mode,
      rubric_selection
    })

    // 調用 LLM
    let aiFeedback = await callDeepSeekForFeedback(systemPrompt, userPrompt)

    // 修形與保底
    aiFeedback = ensureFeedbackShape(aiFeedback)
    // 已移除 forbidden checks 相關優化（不再進行命中後降級處理）
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
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

function compressWhitespace(text: string): string {
  try { return (text || '').replace(/\s+/g, ' ').trim() } catch { return text || '' }
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
  rubric_id?: string | null,
  rubric_mode: 'adaptive' | 'strict',
  rubric_selection?: any
}) {
  const { paragraph_text, sentences, paragraph_role, teacher_guidelines_text, rubric_id, rubric_mode, rubric_selection } = input

  const systemPrompt = `你是該課老師的分身；使用繁體中文；僅輸出純 JSON（無 Markdown/額外文字）；不提供具體改寫句。\n\n【嚴格要求】\n- 僅使用指定鍵名；不得新增鍵。\n- 不發明老師未要求的硬性規則；形式建議放在 suggestions_form。\n- 依 paragraph_role.kind 調整重點：intro=主張定位；body=主題句→引用→細讀→回扣；conclusion=總結與提升。\n- 若提供 rubric：僅從最高等級抽 2–4 條轉為 [Rubric-*] 建議；不輸出 rubric_alignment 或分數；與老師文本衝突時以老師為準。\n- suggestions_form 必須為「純字串陣列」，每一項是一句可執行的建議；若來自 rubric 最高等級，需以 [Rubric-*] 為前綴。\n- 輸出收斂：overall_comment ≤120字；sentence_notes ≤3；guideline_alignment.checks ≤6。\n- confidence 僅在 status 為 not_met/partially_met 時輸出（0–1）。`

  const material = {
    paragraph_text,
    sentences,
    paragraph_role,
    teacher_guidelines_text,
    rubric: rubric_selection ? { selection: rubric_selection, mode: rubric_mode } : (rubric_id ? { rubric_id, mode: rubric_mode } : undefined)
  }

  const userPrompt = `【材料】\n${JSON.stringify(material)}\n\n【輸出契約（鍵名固定，值僅示意）】\n{\n\"overall_comment\":\"\",\n\"sentence_notes\":[{\"sentence_number\":1,\"comment\":\"\",\"severity\":\"major\"}],\n\"guideline_alignment\":{\"checks\":[{\"name\":\"\",\"status\":\"met\",\"source\":\"teacher\"}]},\n\"suggestions_form\":[\"[Rubric-示例] 聚焦主題句清晰\", \"以動詞開頭，提出可執行的修改\"],\n\"severity_level\":\"minor\",\n\"generated_at\":\"\"\n}`

  return { systemPrompt, userPrompt }
}

async function callDeepSeekForFeedback(systemPrompt: string, userPrompt: string) {
  const attempt = async (maxTokens: number, timeoutMs: number) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
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
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(`DeepSeek 調用失敗：${resp.status} ${t}`)
      }
      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content || ''
      return extractJSONStrict(content)
    } finally {
      clearTimeout(timeout)
    }
  }

  try {
    return await attempt(1200, 30000)
  } catch (err: any) {
    const msg = String(err?.message || err)
    if (msg.includes('AbortError')) {
      // 超時降級重試：減少 max_tokens 以縮短回應
      return await attempt(900, 30000)
    }
    throw err
  }
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
      checks: []
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
      .slice(0, 3)
  }
  // guideline_alignment
  if (typeof feedback.guideline_alignment !== 'object' || !feedback.guideline_alignment) {
    feedback.guideline_alignment = { checks: [], rationale_snippets: [], notes: [] }
  } else {
    const ga = feedback.guideline_alignment
    if (!Array.isArray(ga.checks)) ga.checks = []
    ga.checks = ga.checks
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => {
        const status = ['met','partially_met','not_met','not_applicable'].includes(c.status) ? c.status : 'not_applicable'
        const confRaw = typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : undefined
        const confidence = (status === 'not_met' || status === 'partially_met') ? confRaw : undefined
        return {
          name: typeof c.name === 'string' ? c.name : '未命名要點',
          status,
          source: c.source === 'teacher' ? 'teacher' : 'ai_default',
          confidence
        }
      })
    if (!Array.isArray(ga.rationale_snippets)) ga.rationale_snippets = []
    if (!Array.isArray(ga.notes)) ga.notes = []
    // 移除舊版固定免責說明邏輯（不再向 notes 自動附加提醒）。
    // 刪除任何殘留的分數欄位
    try { if ('score' in ga) delete ga.score } catch (_) {}
    // 硬性裁切 checks 數量，與提示一致
    if (Array.isArray(ga.checks)) ga.checks = ga.checks.slice(0, 6)
  }
  // rubric_alignment（可選）
  if (feedback.rubric_alignment && typeof feedback.rubric_alignment === 'object') {
    // 反饋系統不輸出任何 rubric 對齊；安全起見直接移除
    try { delete feedback.rubric_alignment } catch (_) {}
  }
  // suggestions_form / assumptions
  if (!Array.isArray(feedback.suggestions_form)) {
    feedback.suggestions_form = []
  } else {
    feedback.suggestions_form = feedback.suggestions_form
      .map((s: any) => {
        if (typeof s === 'string') return s.trim()
        if (s && typeof s === 'object') {
          // 盡量提取人類可讀文字欄位
          const cand = [s.description, s.text, s.title]
            .find((v: any) => typeof v === 'string' && v.trim().length > 0)
          return cand ? String(cand).trim() : ''
        }
        return ''
      })
      .filter((t: string) => t.length > 0)
  }
  // 前端不使用 assumptions：若存在則移除
  try { if (feedback && 'assumptions' in feedback) delete feedback.assumptions } catch (_) {}
  // generated_at
  if (typeof feedback.generated_at !== 'string') feedback.generated_at = new Date().toISOString()
  // severity_level（可選）
  if (feedback.severity_level && !['critical','major','moderate','minor','ready'].includes(feedback.severity_level)) {
    delete feedback.severity_level
  }
  return feedback
}

// 已移除 adjustForbiddenChecksToAdvisory：不再進行 forbidden patterns 降級處理

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

