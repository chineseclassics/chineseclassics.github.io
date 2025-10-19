/**
 * AI 格式規範生成器 Edge Function
 * 
 * 功能：將老師的自然語言要求轉換為結構化 JSON 格式規範
 * 
 * @created 2025-10-19
 * @related teacher-custom-format-ai (階段 1)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// System Prompt（基於 AI_PROMPT_DESIGN.md）
// ============================================================

const SYSTEM_PROMPT = `你是一個專業的中文論文格式規範解析器。你的任務是理解中學老師用自然語言描述的論文寫作要求，並將其轉換為結構化的 JSON 格式，用於 AI 反饋引擎。

【核心原則：AI 的職責邊界】
⚠️ 重要：你生成的格式規範將用於檢查學生論文，但只做客觀檢查，不做主觀判斷。

✅ 應該檢查的（客觀）：
- 格式結構（是否包含必需元素、段落數量、字數）
- 組織邏輯（主題句位置、段落總結、呼應關係）
- 分析充分性（分析長度、是否緊扣文本、是否避免空泛）
- 引用完整性（是否引用原文、引用是否準確）

❌ 不應該檢查的（主觀）：
- 觀點質量（不評判觀點是否正確、深刻、新穎）
- 思考方向（不建議應該從哪個角度思考）
- 文學理解（不糾正對作品的理解）

【教學場景理解】
老師的任務類型多樣化：
- 大論文（1500-2500 字，完整結構，如紅樓夢分析）
- 短寫練習（400-600 字，簡化結構，如人物短寫）
- 片段分析（兩段話，無開頭結尾，如結構分析）
- 比較研習（相似點-不同點-原因，如小說對比）
- 開放選題（學生自選角度/範圍，如詩歌賞析）

你需要靈活適應不同複雜度，忠實於老師要求，不過度添加。

【你需要識別和提取】

1. **段落結構**：
   - 識別「第一段、第二段」等描述
   - 提取每段的必需元素（如：引入、分析、總結）
   - 轉換為 paragraph_types 和 required_elements
   - 適應簡化結構（如：兩段話、三段式）

2. **字數要求**：
   - 總字數範圍（如：1000-2000 字、700 字以上、至少 400 字）
   - 識別「以上」、「以下」、「左右」等表述
   - 各段落字數（如有明確要求）

3. **內容焦點**：
   - 需要分析的主題、人物、作品
   - 選擇性要求（如：從三個角度選一個）→ 標記為 optional_selection
   - 必需的引用和分析

4. **分析維度**（轉換為客觀檢查點）：
   - 「是否引用？」「是否分析？」「是否具體？」← 客觀
   - 避免：「分析得對嗎？」「觀點深刻嗎？」← 主觀

5. **評分標準引用**：
   - 識別 A/B/C/D 標準代碼
   - 關聯到系統內置的 IB MYP 評分標準

【輸出要求】
生成兩種輸出：
1. human_readable：結構化、條理化的人類可讀版本（顯示在編輯器中，老師可確認和復制）
2. format_json：完整的格式規範 JSON（保存到數據庫，供 AI 反饋引擎使用）

請保持：
- 忠實於老師的要求（不過度添加）
- 靈活適應不同複雜度（從 400 字到 2000 字）
- 只生成客觀檢查點（避免主觀判斷）
- 清晰的理解總結

輸出 JSON 格式：
{
  "human_readable": string,  // 人類可讀版本
  "format_json": {...},       // 完整格式 JSON
  "understanding_summary": string
}`;

// ============================================================
// 輔助函數
// ============================================================

/**
 * 構建 User Prompt
 */
function buildUserPrompt(mode: string, teacherInput: string, baseTemplate?: any): string {
  let prompt = `請解析以下老師的論文要求：

【模式】
${mode === 'incremental' ? '增量模式（基於系統模板添加要求）' : '自定義模式（完全自定義格式）'}

【老師輸入】
${teacherInput}
`;

  if (mode === 'incremental' && baseTemplate) {
    prompt += `
【基礎模板】
${baseTemplate.name}（${baseTemplate.description || ''}）

`;
  }

  prompt += `
請提取：
1. 字數和段落數量要求
2. 內容焦點和分析角度要求
3. 將內容要求轉換為可檢查的分析維度

**重要**：你需要輸出兩種格式：
1. 人類可讀版本（用於顯示在編輯器中）- 要包含清晰的標題、分段、列表
2. JSON 格式（用於保存和 AI 反饋）- 完整的格式規範結構

輸出格式（必須是有效的 JSON）：
{
  "human_readable": "【任務類型】\\n...\\n\\n【字數要求】\\n...",
  "format_json": {...},
  "understanding_summary": "我理解您的要求：..."
}`;

  return prompt;
}

/**
 * 調用 DeepSeek API
 */
async function callDeepSeekAPI(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 環境變量未設置');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,  // 較低的溫度，確保輸出一致性
      max_tokens: 3000,  // 足夠生成完整的格式規範
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 調用失敗: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('DeepSeek API 返回空結果');
  }

  return data.choices[0].message.content;
}

/**
 * 解析 AI 輸出（處理 JSON）
 */
function parseAIOutput(aiResponse: string): any {
  // 嘗試直接解析 JSON
  try {
    return JSON.parse(aiResponse);
  } catch (e) {
    // 如果 AI 返回的是帶有 markdown 代碼塊的文本，提取 JSON
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                     aiResponse.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    throw new Error('無法解析 AI 輸出為 JSON 格式');
  }
}

/**
 * 合併增量模式的格式（系統模板 + 老師要求）
 */
function mergeFormats(baseTemplate: any, teacherRequirements: any): any {
  const merged = JSON.parse(JSON.stringify(baseTemplate)); // 深拷貝
  
  // 合併 constraints
  if (teacherRequirements.constraints) {
    merged.constraints = {
      ...merged.constraints,
      ...teacherRequirements.constraints
    };
  }
  
  // 合併 content_requirements
  if (teacherRequirements.content_requirements && teacherRequirements.content_requirements.length > 0) {
    merged.content_requirements = merged.content_requirements || [];
    merged.content_requirements.push(...teacherRequirements.content_requirements);
  }
  
  // 合併 analysis_dimensions（如果老師添加了新的維度）
  if (teacherRequirements.analysis_dimensions && teacherRequirements.analysis_dimensions.length > 0) {
    merged.analysis_dimensions = merged.analysis_dimensions || [];
    merged.analysis_dimensions.push(...teacherRequirements.analysis_dimensions);
  }
  
  return merged;
}

/**
 * 驗證格式規範 JSON
 */
function validateFormatJSON(formatJSON: any): void {
  if (!formatJSON.metadata) {
    throw new Error('格式規範缺少 metadata 字段');
  }
  
  if (!formatJSON.structure) {
    throw new Error('格式規範缺少 structure 字段');
  }
  
  // 可選：更詳細的驗證
}

// ============================================================
// 主處理函數
// ============================================================

serve(async (req) => {
  // CORS 處理
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // 解析請求
    const { mode, teacher_input, base_template_id } = await req.json();

    // 驗證輸入
    if (!mode || !teacher_input) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '缺少必需參數：mode 和 teacher_input' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    if (!['incremental', 'custom'].includes(mode)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'mode 必須是 incremental 或 custom' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 如果是增量模式，加載基礎模板
    let baseTemplate = null;
    if (mode === 'incremental') {
      if (!base_template_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: '增量模式需要提供 base_template_id' 
          }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // 從數據庫加載系統模板
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: templateData, error: templateError } = await supabase
        .from('format_specifications')
        .select('*')
        .eq('id', base_template_id)
        .single();

      if (templateError || !templateData) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `未找到基礎模板: ${base_template_id}` 
          }),
          { 
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      baseTemplate = {
        id: templateData.id,
        name: templateData.name,
        description: templateData.description,
        spec_json: templateData.spec_json
      };
    }

    // 構建 User Prompt
    const userPrompt = buildUserPrompt(mode, teacher_input, baseTemplate);

    // 調用 DeepSeek API
    console.log('[format-spec-generator] 調用 DeepSeek API...');
    const aiResponse = await callDeepSeekAPI(SYSTEM_PROMPT, userPrompt);
    console.log('[format-spec-generator] AI 響應長度:', aiResponse.length);

    // 解析 AI 輸出
    const parsedOutput = parseAIOutput(aiResponse);

    // 驗證輸出結構
    if (!parsedOutput.human_readable || !parsedOutput.format_json || !parsedOutput.understanding_summary) {
      throw new Error('AI 輸出缺少必需字段');
    }

    // 如果是增量模式，合併格式
    let finalFormatJSON = parsedOutput.format_json;
    if (mode === 'incremental' && baseTemplate) {
      finalFormatJSON = mergeFormats(baseTemplate.spec_json, parsedOutput.format_json);
    }

    // 驗證最終格式 JSON
    validateFormatJSON(finalFormatJSON);

    // 返回成功響應
    return new Response(
      JSON.stringify({
        success: true,
        human_readable: parsedOutput.human_readable,
        format_json: finalFormatJSON,
        understanding_summary: parsedOutput.understanding_summary,
        mode: mode,
        based_on: mode === 'incremental' ? base_template_id : null
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error: any) {
    console.error('[format-spec-generator] 錯誤:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '處理請求時發生錯誤',
        details: error.stack
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});

