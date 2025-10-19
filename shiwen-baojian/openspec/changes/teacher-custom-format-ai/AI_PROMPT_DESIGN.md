# AI 格式規範生成器 - Prompt 設計

## 📋 概述

**Edge Function**：`format-spec-generator`  
**AI 模型**：DeepSeek API  
**任務**：將老師的自然語言要求轉換為結構化 JSON 格式規範

**核心特性**：
- 雙重輸出：一次 AI 調用生成人類可讀版本 + JSON 格式
- 支持兩種模式：增量模式（基於系統模板）和自定義模式（完全自定義）
- 智能合併：系統模板 + 老師增量要求 = 完整格式

---

## 🎯 System Prompt

```
你是一個專業的論文格式規範解析器。你的任務是理解中文老師用自然語言描述的論文寫作要求，並將其轉換為結構化的 JSON 格式。

你需要識別和提取以下信息：

1. **字數要求**：
   - 總字數（如：1800-2000 字）
   - 各段落字數（如：引言 150-250 字）

2. **段落數量要求**：
   - 分論點數量（如：必須 3 個分論點）
   - 正文段落數量

3. **內容焦點要求**：
   - 需要分析的主題、人物、情節
   - 需要引用的文本段落
   - 分析的具體角度

4. **分析深度要求**：
   - 從哪些維度進行分析
   - 需要檢查的具體要點

請務必：
- 準確識別數字要求（字數、段落數）
- 保留老師的原始表述（不要改寫）
- 將內容要求轉換為檢查點（checks）
- 提供清晰的理解總結，讓老師確認

輸出 JSON 格式（嚴格遵守以下結構）：
{
  "constraints": {
    "total_word_count": { "min": number, "max": number },
    "body_paragraphs": number
  },
  "content_requirements": [
    {
      "type": "content_focus" | "analysis_angle" | "specific_text",
      "description": string,
      "specific_criteria": string[],
      "analysis_dimension": {
        "id": string,
        "name": string,
        "weight": 0.3,
        "checks": string[]
      }
    }
  ],
  "understanding_summary": string
}
```

---

## 📝 User Prompt Template

```
請解析以下老師的論文要求：

【模式】
{mode}（'incremental' 或 'custom'）

【老師輸入】
{teacher_input}

【基礎模板】（僅 incremental 模式）
{base_template_name}（如：紅樓夢論文格式）

請提取：
1. 字數和段落數量要求
2. 內容焦點和分析角度要求
3. 將內容要求轉換為可檢查的分析維度

**重要**：你需要輸出兩種格式：
1. 人類可讀版本（用於顯示在編輯器中）
2. JSON 格式（用於保存和 AI 反饋）

輸出格式：
{
  "human_readable": "【段落結構】\n...",
  "format_json": {...},
  "understanding_summary": "我理解您要求：..."
}
```

---

## 🎓 Few-shot Examples

### Example 1：基本字數和段落要求（增量模式）

**輸入**：
```json
{
  "mode": "incremental",
  "teacher_input": "這篇論文要求總字數 1800-2000 字，必須包含 3 個分論點。",
  "base_template_name": "紅樓夢論文格式"
}
```

**AI 輸出**（雙重輸出）：
```json
{
  "human_readable": "【字數要求】\n• 總字數：1800-2000 字\n• 分論點數量：3 個\n\n【段落結構】\n（繼承紅樓夢論文格式的所有要求）",
  "format_json": {
    "constraints": {
      "total_word_count": { "min": 1800, "max": 2000 },
      "body_paragraphs": 3
    },
    "content_requirements": []
  },
  "mode": "incremental",
  "understanding_summary": "我理解您的要求：在紅樓夢論文格式基礎上，添加總字數 1800-2000 字，3 個分論點的要求。"
}
```

---

### Example 2：包含內容焦點要求

**老師輸入**：
```
論文總字數 1500-2000 字，必須 3 個分論點。
學生需要詳細分析紅樓夢中林黛玉和薛寶釵的外貌描寫，
每個人物的分析不少於 300 字。
```

**AI 輸出**：
```json
{
  "constraints": {
    "total_word_count": { "min": 1500, "max": 2000 },
    "body_paragraphs": 3
  },
  "content_requirements": [
    {
      "type": "content_focus",
      "description": "紅樓夢人物外貌描寫分析",
      "specific_criteria": [
        "分析林黛玉的外貌描寫",
        "分析薛寶釵的外貌描寫",
        "每個人物分析不少於 300 字"
      ],
      "analysis_dimension": {
        "id": "custom_character_appearance_analysis",
        "name": "人物外貌描寫分析深度",
        "weight": 0.3,
        "checks": [
          "是否引用了林黛玉的外貌描寫原文？",
          "是否引用了薛寶釵的外貌描寫原文？",
          "是否分析了外貌描寫的文學手法？",
          "是否闡釋了外貌描寫的象徵意義？",
          "每個人物的分析是否達到 300 字？"
        ]
      }
    }
  ],
  "understanding_summary": "我理解您的要求：總字數 1500-2000 字，3 個分論點。特殊要求：詳細分析林黛玉和薛寶釵的外貌描寫，每個人物不少於 300 字。我已將此轉換為一個分析維度，包含 5 個檢查點。"
}
```

---

### Example 3：指定文本段落要求

**老師輸入**：
```
總字數 2000 字左右，4-5 個分論點。
必須分析第五回「金陵十二釵判詞」，
並且從文學修辭和象徵意義兩個角度進行分析。
```

**AI 輸出**：
```json
{
  "constraints": {
    "total_word_count": { "min": 1800, "max": 2200 },
    "body_paragraphs": 4
  },
  "content_requirements": [
    {
      "type": "specific_text",
      "description": "必須分析第五回「金陵十二釵判詞」",
      "specific_criteria": [
        "引用第五回原文",
        "分析金陵十二釵判詞"
      ],
      "analysis_dimension": {
        "id": "custom_judgement_verse_analysis",
        "name": "判詞分析深度",
        "weight": 0.35,
        "checks": [
          "是否引用了第五回「金陵十二釵判詞」原文？",
          "是否從文學修辭角度進行分析？",
          "是否從象徵意義角度進行分析？",
          "是否分析了判詞與人物命運的關係？"
        ]
      }
    }
  ],
  "understanding_summary": "我理解您的要求：總字數約 2000 字（1800-2200），4-5 個分論點（建議 4 個）。特殊要求：必須分析第五回「金陵十二釵判詞」，從文學修辭和象徵意義兩個角度分析。我已創建一個分析維度包含 4 個檢查點。"
}
```

---

### Example 4：複雜的多層次要求

**老師輸入**：
```
這次論文要求如下：
1. 總字數 2500-3000 字
2. 引言 200-300 字，結論 150-200 字
3. 正文 3 個分論點，每個分論點 600-800 字
4. 必須從以下三個角度分析林黛玉的形象：
   - 外貌描寫
   - 性格特徵
   - 人物關係
5. 每個角度都要有原文引用和細讀分析
```

**AI 輸出**：
```json
{
  "constraints": {
    "total_word_count": { "min": 2500, "max": 3000 },
    "introduction_word_count": { "min": 200, "max": 300 },
    "conclusion_word_count": { "min": 150, "max": 200 },
    "body_paragraphs": 3,
    "body_paragraph_word_count": { "min": 600, "max": 800 }
  },
  "content_requirements": [
    {
      "type": "content_focus",
      "description": "林黛玉形象的多角度分析",
      "specific_criteria": [
        "從外貌描寫角度分析",
        "從性格特徵角度分析",
        "從人物關係角度分析",
        "每個角度都要有原文引用",
        "每個角度都要有細讀分析"
      ],
      "analysis_dimension": {
        "id": "custom_lin_daiyu_multidimensional",
        "name": "林黛玉形象多維度分析",
        "weight": 0.4,
        "checks": [
          "是否從外貌描寫角度分析了林黛玉？",
          "是否從性格特徵角度分析了林黛玉？",
          "是否從人物關係角度分析了林黛玉？",
          "每個角度是否都引用了原文？",
          "每個角度是否都進行了細讀分析（由小見大）？",
          "三個角度是否都有充分論述？"
        ]
      }
    }
  ],
  "understanding_summary": "我理解您的要求：總字數 2500-3000 字，引言 200-300 字，結論 150-200 字，正文 3 個分論點（每個 600-800 字）。特殊要求：從外貌描寫、性格特徵、人物關係三個角度分析林黛玉，每個角度都要有原文引用和細讀分析。我已創建一個分析維度包含 6 個檢查點。"
}
```

---

### Example 5：只有內容要求，沒有字數要求

**老師輸入**：
```
這次重點分析「瀟湘館」的環境描寫如何塑造林黛玉的形象。
要求從景物描寫、象徵意義、情感暗示三個層面分析。
```

**AI 輸出**：
```json
{
  "constraints": {},
  "content_requirements": [
    {
      "type": "content_focus",
      "description": "瀟湘館環境描寫與林黛玉形象塑造",
      "specific_criteria": [
        "分析瀟湘館的景物描寫",
        "分析景物的象徵意義",
        "分析景物的情感暗示",
        "論述環境描寫如何塑造林黛玉形象"
      ],
      "analysis_dimension": {
        "id": "custom_xiaoxiang_environment_analysis",
        "name": "瀟湘館環境描寫分析深度",
        "weight": 0.35,
        "checks": [
          "是否詳細分析了瀟湘館的景物描寫？",
          "是否闡釋了景物的象徵意義？",
          "是否分析了景物的情感暗示？",
          "是否論述了環境描寫與林黛玉形象的關係？",
          "是否引用了瀟湘館相關的原文段落？"
        ]
      }
    }
  ],
  "understanding_summary": "我理解您的要求：重點分析瀟湘館的環境描寫如何塑造林黛玉形象。分析角度包括：景物描寫、象徵意義、情感暗示。沒有指定字數要求。我已創建一個分析維度包含 5 個檢查點。"
}
```

---

## 🛠️ 實現細節

### Edge Function 結構（雙重輸出）

```typescript
// supabase/functions/format-spec-generator/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SYSTEM_PROMPT = `你是一個專業的論文格式規範解析器...`;

serve(async (req) => {
  try {
    const { teacher_input, mode, base_template_id } = await req.json();
    
    // 1. 構建 User Prompt
    const userPrompt = `
請解析以下老師的論文要求：

【老師輸入】
${teacher_input}

【基礎模板】
${base_template_name || '無'}

請提取字數、段落數量和內容要求，輸出 JSON 格式。
    `;
    
    // 2. 調用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,  // 較低溫度，確保輸出穩定
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    const aiOutput = data.choices[0].message.content;
    
    // 3. 解析 AI 輸出的 JSON
    const jsonMatch = aiOutput.match(/```json\n([\s\S]*?)\n```/) || 
                      aiOutput.match(/\{[\s\S]*\}/);
    const aiParsed = JSON.parse(jsonMatch[0].replace(/```json\n|\n```/g, ''));
    
    // 4. 根據模式生成完整 format_json
    let formatJSON;
    
    if (mode === 'incremental') {
      // 增量模式：加載系統模板並合併
      const baseTemplate = await loadSystemFormat(base_template_id);
      formatJSON = mergeFormatSpec(baseTemplate, aiParsed.format_json);
    } else {
      // 自定義模式：直接使用 AI 生成的 JSON
      formatJSON = aiParsed.format_json;
    }
    
    // 5. 將 JSON 轉換為人類可讀版本
    const humanReadable = formatJSONToHumanReadable(formatJSON);
    
    // 6. 返回雙重輸出
    return new Response(JSON.stringify({
      human_readable: humanReadable,    // ← 顯示在 Quill
      format_json: formatJSON,           // ← 緩存並保存
      mode: mode,
      understanding_summary: aiParsed.understanding_summary
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 🧪 測試策略

### 測試用例

1. **基本字數要求**（Example 1）
2. **內容焦點 + 字數**（Example 2）
3. **指定文本段落**（Example 3）
4. **複雜多層次**（Example 4）
5. **只有內容要求**（Example 5）

### 邊界情況

6. **模糊的字數表述**：
   ```
   輸入：「論文不要太短，也不要太長」
   期望：AI 提示無法識別具體字數，建議老師明確
   ```

7. **矛盾的要求**：
   ```
   輸入：「總字數 1500 字，但每段 600 字，要 3 段」
   期望：AI 檢測到矛盾（3×600=1800 > 1500），提示老師
   ```

8. **非常模糊的內容要求**：
   ```
   輸入：「要寫得好一點」
   期望：AI 提示無法轉換為具體檢查點
   ```

---

## 📊 預期準確率

| 類型 | 目標準確率 |
|------|-----------|
| 字數提取 | > 95% |
| 段落數提取 | > 90% |
| 內容焦點識別 | > 85% |
| 分析維度生成 | > 80% |

---

## 🔄 迭代計劃

### V1.0（MVP）
- 支持字數、段落數提取
- 支持基本內容要求識別
- 提供理解總結供老師確認

### V1.1
- 增加衝突檢測
- 支持更複雜的分析角度
- 優化 checks 生成質量

### V2.0
- 多輪對話澄清模糊要求
- 提供修改建議
- 學習老師偏好

---

## 🎯 成功標準

1. **老師滿意度** > 4/5（問卷調查）
2. **AI 理解準確率** > 85%（基於老師確認）
3. **平均生成時間** < 10 秒
4. **錯誤率** < 10%（需要老師手動修正的比例）

---

**最後更新**：2025-10-19  
**版本**：1.0  
**狀態**：設計階段

