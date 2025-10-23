/**
 * AI 格式規範生成器 Edge Function（兩階段版本）
 * 
 * 階段 1：AI 生成結構化人類可讀文本（3-5秒）
 * 階段 2：純代碼解析轉換為 JSON（毫秒級）
 * 
 * @created 2025-10-19
 * @updated 2025-10-19 - 重構為兩階段流程
 * @related teacher-custom-format-ai (階段 1)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// 階段 1：AI 生成人類可讀文本的 System Prompt
// ============================================================

const SYSTEM_PROMPT_GENERATE_READABLE = `你是一個專業的中文論文格式規範解析器。你的任務是將老師的自然語言要求轉換為結構化的、人類可讀的格式說明文本。

【核心原則】
1. 只做客觀檢查，不做主觀判斷
2. 忠實於老師要求，不過度添加
3. 靈活適應不同複雜度（從 400 字到 2500 字）

【輸出格式要求】
你必須嚴格按照以下模板輸出，只包含格式說明內容：

【任務類型】
[片段分析 / 完整論文 / 短寫練習 / 比較研習 / 開放選題]

【字數要求】
• 總字數：[min]-[max] 字（僅在老師明確提到字數要求時才輸出此部分）

【段落結構】
[描述段落組織方式]
• 第一段：[功能描述]
• 第二段：[功能描述]
...

【內容要求】
• 作品：[文學作品名稱]
• 主題：[分析主題]
• 要求：[具體要求列表]

【檢查維度】
[維度名稱]：
- [檢查點1：是否...？]
- [檢查點2：是否...？]
- [檢查點3：是否...？]

⚠️ 注意：只輸出老師明確提到的部分，不要添加任何額外的提示、說明或注意事項。如果老師沒有提到字數要求，則完全省略【字數要求】部分。不要包含評分標準（A/B/C/D）。

【教學場景理解】
- 大論文（1500-2500 字，完整結構）
- 短寫練習（400-600 字，簡化結構）
- 片段分析（兩段話，無開頭結尾）
- 比較研習（相似點-不同點-原因）
- 開放選題（學生自選角度）

輸出純文本，不要用 JSON 或 markdown 代碼塊包裹。`;

// ============================================================
// 階段 2：純代碼解析函數（文本 → JSON）
// ============================================================

/**
 * 解析人類可讀文本為 JSON 格式規範
 */
function parseHumanReadableToJSON(text: string): any {
  const result: any = {
    metadata: {
      name: '自定義格式',
      essay_type: 'custom',
      structure_type: 'custom'
    },
    constraints: {},
    structure: {
      required_sections: []
    },
    content_requirements: [],
    analysis_dimensions: []
  };

  try {
    // 1. 解析任務類型
    const taskTypeMatch = text.match(/【任務類型】\s*\n([^\n【]+)/);
    if (taskTypeMatch) {
      const taskType = taskTypeMatch[1].trim();
      const typeMap: Record<string, string> = {
        '片段分析': 'fragment_analysis',
        '完整論文': 'complete_essay',
        '短寫練習': 'short_writing',
        '比較研習': 'comparative_study',
        '開放選題': 'open_topic'
      };
      result.metadata.essay_type = typeMap[taskType] || 'custom';
      result.metadata.structure_type = taskType;
    }

    // 2. 解析字數要求
    const wordCountMatch = text.match(/總字數：(\d+)-(\d+)\s*字/);
    if (wordCountMatch) {
      result.constraints.total_word_count = {
        min: parseInt(wordCountMatch[1]),
        max: parseInt(wordCountMatch[2])
      };
    } else {
      // 嘗試其他格式："至少 XXX 字"、"XXX 字以上"
      const minMatch = text.match(/至少\s*(\d+)\s*字|(\d+)\s*字以上/);
      if (minMatch) {
        result.constraints.total_word_count = {
          min: parseInt(minMatch[1] || minMatch[2])
        };
      }
    }

    // 3. 解析段落結構
    const paragraphSection = text.match(/【段落結構】\s*\n([\s\S]*?)(?=\n【|$)/);
    if (paragraphSection) {
      const paragraphText = paragraphSection[1];
      
      // 提取段落數量
      const paragraphMatches = paragraphText.match(/第[一二三四五六七八九十]+段|第\d+段/g);
      if (paragraphMatches) {
        result.constraints.required_paragraphs = paragraphMatches.length;
        
        // 解析每段的功能
        paragraphMatches.forEach((match, index) => {
          const sectionOrder = index + 1;
          const descMatch = paragraphText.match(new RegExp(`${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}：([^\\n•]+)`));
          
          result.structure.required_sections.push({
            id: `section_${sectionOrder}`,
            name: `第 ${sectionOrder} 段`,
            order: sectionOrder,
            description: descMatch ? descMatch[1].trim() : ''
          });
        });
      }
      
      // 檢查是否無需引言結論
      if (paragraphText.includes('無需') || paragraphText.includes('不需要')) {
        if (paragraphText.includes('開頭') || paragraphText.includes('引言')) {
          result.constraints.exclude_introduction = true;
        }
        if (paragraphText.includes('結尾') || paragraphText.includes('結論')) {
          result.constraints.exclude_conclusion = true;
        }
      }
    }

    // 4. 解析內容要求
    const contentSection = text.match(/【內容要求】\s*\n([\s\S]*?)(?=\n【|$)/);
    if (contentSection) {
      const contentText = contentSection[1];
      const contentReq: any = {
        type: 'content_focus',
        specific_criteria: []
      };

      // 提取作品
      const workMatch = contentText.match(/作品：([^\n•]+)/);
      if (workMatch) {
        contentReq.literary_work = workMatch[1].trim();
      }

      // 提取主題
      const themeMatch = contentText.match(/主題：([^\n•]+)/);
      if (themeMatch) {
        contentReq.theme = themeMatch[1].trim();
      }

      // 提取要求列表
      const requirementMatches = contentText.match(/要求：([^\n]+)/);
      if (requirementMatches) {
        const reqText = requirementMatches[1].trim();
        // 分割多個要求
        const requirements = reqText.split(/[、，,]/).map(r => r.trim()).filter(r => r);
        contentReq.specific_criteria = requirements;
      }

      // 添加其他列表項
      const bulletPoints = contentText.match(/•\s*([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const cleaned = point.replace(/^•\s*/, '').trim();
          if (!cleaned.startsWith('作品：') && !cleaned.startsWith('主題：') && !cleaned.startsWith('要求：')) {
            contentReq.specific_criteria.push(cleaned);
          }
        });
      }

      if (Object.keys(contentReq).length > 1) {
        result.content_requirements.push(contentReq);
      }
    }

    // 5. 解析檢查維度
    const checkSection = text.match(/【檢查維度】\s*\n([\s\S]*?)(?=\n【|$)/);
    if (checkSection) {
      const checkText = checkSection[1];
      
      // 提取維度名稱和檢查點
      const dimensionMatches = checkText.match(/([^：\n]+)：\s*\n((?:-[^\n]+\n?)+)/g);
      if (dimensionMatches) {
        dimensionMatches.forEach((dimMatch, index) => {
          const parts = dimMatch.match(/([^：\n]+)：\s*\n((?:-[^\n]+\n?)+)/);
          if (parts) {
            const dimensionName = parts[1].trim();
            const checksText = parts[2];
            const checks = checksText
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.replace(/^-\s*/, '').trim())
              .filter(check => check);

            result.analysis_dimensions.push({
              id: `dimension_${index + 1}`,
              name: dimensionName,
              weight: 1.0,  // 浮点数格式
              checks: checks
            });
          }
        });
      }
    }

    // 6. 生成名稱（如果能識別作品）
    if (result.content_requirements.length > 0 && result.content_requirements[0].literary_work) {
      const work = result.content_requirements[0].literary_work.replace(/《|》/g, '');
      const theme = result.content_requirements[0].theme || result.metadata.structure_type;
      result.metadata.name = `${work}${theme}`;
    }

  } catch (error) {
    console.error('[parseHumanReadableToJSON] 解析錯誤:', error);
    // 即使解析失敗，也返回基本結構
  }

  return result;
}

// ============================================================
// 輔助函數
// ============================================================

/**
 * 構建 User Prompt（階段 1：生成人類可讀文本）
 */
function buildUserPromptForReadable(teacherInput: string, baseTemplate?: any): string {
  let prompt = `請將以下老師的論文要求轉換為結構化的格式說明文本：

【老師輸入】
${teacherInput}

`;

  if (baseTemplate) {
    prompt += `【參考模板】
你可以參考以下系統模板，但要根據老師的具體要求進行調整：
- 模板名稱：${baseTemplate.name}
- 模板類型：${baseTemplate.description || ''}

`;
  }

  prompt += `請嚴格按照【輸出格式要求】中的模板輸出，確保：
1. 格式標題使用【】包裹
2. 列表項使用 • 開頭
3. 檢查點使用 - 開頭，並以問句形式（"是否...？"）
4. 不要包含評分標準
5. 不要使用 JSON 或代碼塊

輸出純文本格式說明。`;

  return prompt;
}

/**
 * 調用 DeepSeek API
 */
async function callDeepSeekAPI(systemPrompt: string, userPrompt: string): Promise<string> {
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
      temperature: 0.3,
      max_tokens: 2000,
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
    const requestBody = await req.json();
    const { stage, mode, teacher_input, human_readable, base_template_id } = requestBody;

    // 驗證 stage 參數
    if (!stage || !['generate_readable', 'convert_to_json'].includes(stage)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'stage 參數必須是 generate_readable 或 convert_to_json' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }}
      );
    }

    // ============================================================
    // 階段 1：生成人類可讀文本
    // ============================================================
    if (stage === 'generate_readable') {
      if (!teacher_input) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少 teacher_input 參數' }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }}
        );
      }

      // 加載基礎模板（如果是增量模式）
      let baseTemplate = null;
      if (mode === 'incremental' && base_template_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: templateData } = await supabase
          .from('format_specifications')
          .select('*')
          .eq('id', base_template_id)
          .single();

        if (templateData) {
          baseTemplate = {
            id: templateData.id,
            name: templateData.name,
            description: templateData.description
          };
        }
      }

      // 構建 Prompt 並調用 AI
      const userPrompt = buildUserPromptForReadable(teacher_input, baseTemplate);
      console.log('[Stage 1] 調用 AI 生成人類可讀文本...');
      
      const humanReadableText = await callDeepSeekAPI(SYSTEM_PROMPT_GENERATE_READABLE, userPrompt);
      console.log('[Stage 1] AI 生成完成，長度:', humanReadableText.length);

      return new Response(
        JSON.stringify({
          success: true,
          stage: 'generate_readable',
          human_readable: humanReadableText.trim(),
          message: '格式說明已生成，請確認後點擊「保存」轉換為 JSON'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // ============================================================
    // 階段 2：轉換為 JSON（純代碼解析）
    // ============================================================
    if (stage === 'convert_to_json') {
      if (!human_readable) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少 human_readable 參數' }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }}
        );
      }

      console.log('[Stage 2] 純代碼解析轉換為 JSON...');
      const startTime = Date.now();
      
      const formatJSON = parseHumanReadableToJSON(human_readable);
      
      const duration = Date.now() - startTime;
      console.log(`[Stage 2] 解析完成，耗時: ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          stage: 'convert_to_json',
          format_json: formatJSON,
          human_readable: human_readable,
          parse_duration_ms: duration,
          message: '格式規範已成功轉換為 JSON'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
});
