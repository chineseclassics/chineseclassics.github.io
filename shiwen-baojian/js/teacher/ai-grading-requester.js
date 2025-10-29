/**
 * AI 評分建議請求模組（TipTap 專用）
 * 
 * 功能：調用 grading-agent Edge Function 獲取 AI 評分建議
 * 說明：系統已切換至 TipTap/ProseMirror，僅支持 `essays.content_json`，不再保留舊 Quill/paragraphs 兼容邏輯。
 */

/**
 * 請求 AI 評分建議
 * @param {string} essayId - 論文 ID
 * @param {Object} gradingRubricJson - 評分標準 JSON
 * @param {Object} supabaseClient - Supabase 客戶端
 * @returns {Object} AI 評分結果
 */
export async function requestAIGradingSuggestion(essayId, gradingRubricJson, supabaseClient) {
  try {
    console.log('📊 請求 AI 評分建議...');
    console.log('論文 ID:', essayId);
    console.log('評分標準:', gradingRubricJson);

    // 1) 準備論文內容（僅 TipTap JSON）
    let essayText = '';
    let essayHTML = '';
    let essayContentJSON = null;

    try {
      const { data: essayRow, error: essayErr } = await supabaseClient
        .from('essays')
        .select('content_json, id')
        .eq('id', essayId)
        .single();
      if (essayErr) throw essayErr;

      const raw = essayRow?.content_json;
      const json = typeof raw === 'string' ? safeParseJSON(raw) : raw;
      if (json && typeof json === 'object') {
        essayContentJSON = json;
        essayText = extractTextFromPM(json);
        essayHTML = pmToBasicHTML(json);
      } else {
        throw new Error('缺少有效的 TipTap JSON');
      }
    } catch (e) {
      console.error('❌ 無法讀取 essays.content_json：', e?.message || e);
      throw new Error('此論文缺少 TipTap 內容（essays.content_json）。請確認學生端已使用新編輯器保存內容。');
    }

    // 2) Edge Function URL 與認證
    const supabaseUrl = supabaseClient.supabaseUrl;
    const functionUrl = `${supabaseUrl}/functions/v1/grading-agent`;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('未登入');

    // 3) 組裝請求體（TipTap 路徑）
    const payload = {
      essay_id: essayId,
      grading_rubric_json: gradingRubricJson,
      // TipTap 專用：
      essay_text: essayText || null,
      essay_html: essayHTML || null,
      essay_content_json: essayContentJSON || null
    };

    try {
      const preview = (payload.essay_text || '').slice(0, 120);
      console.log('📦 傳送至 grading-agent 的負載預覽:', { has_text: !!payload.essay_text, text_preview: preview, has_html: !!payload.essay_html, has_json: !!payload.essay_content_json });
    } catch (_) {}

    // 4) 調用 Edge Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // 兼容非 JSON 的錯誤響應
      let errMsg = `AI 評分失敗（${response.status}）`;
      try {
        const text = await response.text();
        try {
          const json = safeParseJSON(text);
          if (json && (json.error || json.message)) {
            errMsg = json.error || json.message;
          } else if (text) {
            errMsg = text;
          }
        } catch (_) {
          if (text) errMsg = text;
        }
      } catch (_) {}
      throw new Error(errMsg);
    }

    const result = await response.json();
    console.log('✅ AI 評分建議獲取成功:', result);
    return result;
  } catch (error) {
    console.error('❌ 請求 AI 評分失敗:', error);
    throw error;
  }
}

// ========== 本地工具函式：TipTap JSON 提取 ==========
function safeParseJSON(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function extractTextFromPM(json) {
  try {
    const parts = [];
    const walk = (node) => {
      if (!node) return;
      const type = node.type;
      if (type === 'text') {
        if (node.text) parts.push(node.text);
        return;
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(child => walk(child));
        if (type === 'paragraph') parts.push('\n\n');
      }
    };
    walk(json);
    const text = parts.join('').replace(/\n{3,}/g, '\n\n').trim();
    return text;
  } catch (_) { return ''; }
}

function pmToBasicHTML(json) {
  try {
    const paras = [];
    const paragraphTexts = [];
    const collect = (node, acc) => {
      if (!node) return;
      const type = node.type;
      if (type === 'text') {
        acc.push(node.text || '');
        return;
      }
      let buf = acc;
      if (type === 'paragraph') {
        buf = [];
      }
      if (Array.isArray(node.content)) node.content.forEach(child => collect(child, buf));
      if (type === 'paragraph') {
        const raw = buf.join('');
        const escaped = escapeHtml(raw);
        paragraphTexts.push(`<p>${escaped}</p>`);
      }
    };
    collect(json, paras);
    return paragraphTexts.join('');
  } catch (_) { return ''; }
}

function escapeHtml(s) {
  try {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } catch (_) { return ''; }
}

/**
 * 加載已保存的 AI 評分建議（如果存在）
 * @param {string} essayId - 論文 ID
 * @param {Object} supabaseClient - Supabase 客戶端
 * @returns {Object|null} 已保存的 AI 評分建議
 */
export async function loadSavedAISuggestion(essayId, supabaseClient) {
  try {
    const { data, error } = await supabaseClient
      .from('ai_grading_suggestions')
      .select('*')
      .eq('essay_id', essayId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    // 轉換資料庫結構為前端期望的格式
    // 資料庫: criterion_a_score, criterion_b_score, etc. + reasoning + overall_comment
    // 前端期望: criteria_scores = { "A": { "score": 6, "reason": "..." }, ... } + overall_comment
    const criteriaScores = {};
    
    if (data.criterion_a_score !== null) {
      criteriaScores.A = {
        score: data.criterion_a_score,
        reason: data.reasoning?.A || ''
      };
    }
    if (data.criterion_b_score !== null) {
      criteriaScores.B = {
        score: data.criterion_b_score,
        reason: data.reasoning?.B || ''
      };
    }
    if (data.criterion_c_score !== null) {
      criteriaScores.C = {
        score: data.criterion_c_score,
        reason: data.reasoning?.C || ''
      };
    }
    if (data.criterion_d_score !== null) {
      criteriaScores.D = {
        score: data.criterion_d_score,
        reason: data.reasoning?.D || ''
      };
    }

    // 解析總評（如果存在）
    let overallComment = null;
    if (data.overall_comment) {
      try {
        overallComment = JSON.parse(data.overall_comment);
      } catch (e) {
        console.warn('解析總評失敗:', e);
      }
    }

    return {
      ...data,
      criteria_scores: criteriaScores,
      overall_comment: overallComment
    };
  } catch (error) {
    console.error('加載 AI 評分建議失敗:', error);
    return null;
  }
}

