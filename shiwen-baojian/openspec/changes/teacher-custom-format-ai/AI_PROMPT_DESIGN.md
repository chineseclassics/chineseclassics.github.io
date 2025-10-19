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
你是一個專業的中文論文格式規範解析器。你的任務是理解中學老師用自然語言描述的論文寫作要求，並將其轉換為結構化的 JSON 格式，用於 AI 反饋引擎。

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

## 🎓 Few-shot Examples（基于真实教学案例）

### Example 1：极简任务（两段话，无完整结构）

**真实案例**：春江花月夜结构分析

**輸入**：
```json
{
  "mode": "custom",
  "teacher_input": "请从至少两个方面，写两段话（不需要开头结尾），分析《春江花月夜》结构安排的精妙之处。\n\n字数：400-600 字\n评分标准：B 理解"
}
```

**AI 輸出**：
```json
{
  "human_readable": "【任務類型】\n片段分析（無需完整論文結構）\n\n【字數要求】\n• 總字數：400-600 字\n\n【段落要求】\n兩段話（每段分析一個方面）\n\n【內容要求】\n• 分析《春江花月夜》的結構安排\n• 至少從兩個方面分析（如：意象穿插、句間過渡、部分呼應等）\n• 必須引用原文\n\n【檢查維度】\n結構分析充分性：\n- 是否引用了《春江花月夜》原文？\n- 是否分析了至少兩個結構方面？\n- 分析是否具體、有細節？\n\n【評分標準】\nIB MYP 標準 B（組織）",
  
  "format_json": {
    "metadata": {
      "name": "春江花月夜結構分析",
      "essay_type": "片段分析",
      "structure_type": "精簡式"
    },
    "structure": {
      "required_sections": [
        {
          "id": "analysis_para_1",
          "name": "分析段一",
          "order": 1,
          "description": "從一個方面分析結構"
        },
        {
          "id": "analysis_para_2",
          "name": "分析段二",
          "order": 2,
          "description": "從另一個方面分析結構"
        }
      ]
    },
    "paragraph_types": {
      "analysis": {
        "name": "分析段",
        "analysis_dimensions": [
          {
            "id": "structure_analysis_depth",
            "name": "結構分析充分性",
            "weight": 1.0,
            "checks": [
              "是否引用了《春江花月夜》原文？",
              "是否分析了至少兩個結構方面？",
              "分析是否具體、有細節？",
              "是否避免空泛評論？"
            ]
          }
        ],
        "required_elements": [
          {
            "id": "textual_reference",
            "name": "原文引用",
            "required": true
          },
          {
            "id": "analysis",
            "name": "具體分析",
            "required": true
          }
        ]
      }
    },
    "constraints": {
      "total_word_count": { "min": 400, "max": 600 },
      "required_paragraphs": 2
    },
    "grading_rubric": {
      "type": "ib-myp-chinese-literature",
      "active_criteria": ["B"]
    }
  },
  "understanding_summary": "我理解您的要求：這是一個片段分析任務，學生寫兩段話（無需開頭結尾），從至少兩個方面分析《春江花月夜》的結構安排，字數 400-600 字，使用 IB MYP 標準 B 評分。"
}
```

---

### Example 2：三段固定結構（短寫練習）

**真實案例**：鶯鶯傳人物分析短寫

**輸入**：
```json
{
  "mode": "custom",
  "teacher_input": "《鶯鶯傳》人物形象分析短寫\n\n結合對原文的引用，分析崔鶯鶯的一個人物形象特點，最少 400 字。\n\n按照以下三段格式：\n1. 開頭：崔鶯鶯的簡要背景，心路歷程梳理\n2. 概括人物一個最主要形象特點的主題句，兩到三處原文引用和分析，段末總結\n3. 結尾：整體形象總結，個人評價及延伸思考\n\n評分標準：A 分析、D 運用語言"
}
```

**AI 輸出**：
```json
{
  "human_readable": "【任務類型】\n人物形象分析短寫\n\n【字數要求】\n• 至少 400 字\n\n【段落結構】\n\n一、開頭段\n• 崔鶯鶯的簡要背景\n• 心路歷程梳理\n\n二、分析段（主體）\n• 主題句：概括一個最主要形象特點\n• 原文引用：2-3 處\n• 細讀分析\n• 段末總結\n\n三、結尾段\n• 整體形象總結\n• 個人評價\n• 延伸思考\n\n【內容要求】\n• 聚焦崔鶯鶯的**一個**形象特點（不要面面俱到）\n• 必須結合原文引用\n\n【檢查維度】\n人物形象分析深度：\n- 是否明確概括了一個形象特點？\n- 是否引用了 2-3 處原文？\n- 是否對引用進行了分析？\n- 是否聚焦單一特點（避免散亂）？\n\n【評分標準】\nIB MYP 標準 A（分析）、標準 D（運用語言）",
  
  "format_json": {
    "metadata": {
      "name": "人物形象分析短寫",
      "essay_type": "人物分析",
      "structure_type": "三段固定式"
    },
    "structure": {
      "required_sections": [
        {"id": "opening", "name": "開頭段", "order": 1},
        {"id": "analysis", "name": "分析段", "order": 2},
        {"id": "closing", "name": "結尾段", "order": 3}
      ]
    },
    "paragraph_types": {
      "opening": {
        "name": "開頭段",
        "required_elements": [
          {"id": "background", "name": "人物背景", "required": true},
          {"id": "journey", "name": "心路歷程", "required": true}
        ]
      },
      "analysis": {
        "name": "分析段",
        "required_elements": [
          {"id": "topic_sentence", "name": "主題句", "required": true, "description": "概括形象特點"},
          {"id": "textual_evidence", "name": "原文引用", "required": true, "min_count": 2, "max_count": 3},
          {"id": "close_reading", "name": "細讀分析", "required": true},
          {"id": "summary", "name": "段末總結", "required": true}
        ],
        "analysis_dimensions": [
          {
            "id": "character_analysis_depth",
            "name": "人物形象分析深度",
            "weight": 1.0,
            "checks": [
              "是否明確概括了一個形象特點？",
              "是否引用了 2-3 處原文？",
              "是否對引用進行了細讀分析？",
              "是否聚焦單一特點（避免面面俱到）？"
            ]
          }
        ]
      },
      "closing": {
        "name": "結尾段",
        "required_elements": [
          {"id": "overall_summary", "name": "整體形象總結", "required": true},
          {"id": "personal_view", "name": "個人評價", "required": true},
          {"id": "extension", "name": "延伸思考", "required": true}
        ]
      }
    },
    "constraints": {
      "total_word_count": { "min": 400 }
    },
    "content_requirements": [
      {
        "type": "content_focus",
        "description": "聚焦崔鶯鶯的一個形象特點",
        "specific_criteria": [
          "選擇一個最主要的形象特點",
          "不要面面俱到"
        ]
      }
    ],
    "grading_rubric": {
      "type": "ib-myp-chinese-literature",
      "active_criteria": ["A", "D"]
    }
  },
  "understanding_summary": "我理解您的要求：這是一個 400 字以上的短寫任務，三段固定結構（開頭、分析、結尾）。學生需要聚焦崔鶯鶯的一個形象特點，結合 2-3 處原文引用進行分析。使用 IB MYP 標準 A 和 D 評分。"
}
```

---

### Example 3：開放選題（選擇性要求）

**真實案例**：詩歌論文自選角度

**輸入**：
```json
{
  "mode": "custom",
  "teacher_input": "從以下詩歌賞析角度選擇一個，從以下詩歌範圍選擇一個，寫論文。\n\n角度：意象、意境、象徵、對比、感官描寫、呼應、重複...\n範圍：《詩經》及《古詩十九首》、魏晉詩、唐詩\n\n字數：1000-2000 字\n評分標準：A 分析、B 組織、D 運用語言"
}
```

**AI 輸出**：
```json
{
  "human_readable": "【任務類型】\n詩歌賞析（開放選題）\n\n【字數要求】\n• 總字數：1000-2000 字\n\n【選擇要求】\n\n一、選擇分析角度（選一個）：\n• 意象\n• 意境\n• 象徵\n• 對比、襯托\n• 感官描寫\n• 呼應\n• 重複、反復\n...更多選項\n\n二、選擇詩歌範圍（選一個）：\n• 《詩經》及《古詩十九首》\n• 魏晉詩\n• 唐詩\n\n【內容要求】\n• 論文主題明確\n• 論證充分\n• 必須引用原文並分析\n\n【檢查策略】\nAI 反饋時會：\n1. 識別學生選擇的角度和範圍\n2. 檢查論證是否圍繞該角度展開\n3. 檢查引用是否來自選定範圍\n4. 不強制要求特定分析角度（因為是學生自選）\n\n【評分標準】\nIB MYP 標準 A（分析）、B（組織）、D（運用語言）",
  
  "format_json": {
    "metadata": {
      "name": "詩歌賞析開放選題",
      "essay_type": "詩歌分析",
      "structure_type": "開放式"
    },
    "structure": {
      "required_sections": [
        {"id": "introduction", "name": "引言", "order": 1},
        {"id": "body", "name": "正文", "order": 2},
        {"id": "conclusion", "name": "結論", "order": 3}
      ]
    },
    "paragraph_types": {
      "any": {
        "name": "通用段落",
        "analysis_dimensions": [
          {
            "id": "argumentation_quality",
            "name": "論證充分性",
            "weight": 0.6,
            "checks": [
              "論點是否明確？",
              "是否引用了原文？",
              "是否進行了具體分析？",
              "論證是否圍繞選定角度展開？"
            ]
          },
          {
            "id": "textual_evidence",
            "name": "文本證據完整性",
            "weight": 0.4,
            "checks": [
              "是否引用了詩歌原文？",
              "引用是否來自選定範圍？",
              "引用是否準確？"
            ]
          }
        ]
      }
    },
    "constraints": {
      "total_word_count": { "min": 1000, "max": 2000 }
    },
    "content_requirements": [
      {
        "type": "optional_selection",
        "description": "學生自選分析角度和詩歌範圍",
        "selection_options": {
          "analysis_angle": ["意象", "意境", "象徵", "對比", "感官描寫", "呼應", "重複"],
          "poem_range": ["《詩經》及《古詩十九首》", "魏晉詩", "唐詩"]
        },
        "feedback_strategy": "識別學生選擇，基於該角度進行檢查，不強制特定角度"
      }
    ],
    "grading_rubric": {
      "type": "ib-myp-chinese-literature",
      "active_criteria": ["A", "B", "D"]
    }
  },
  "understanding_summary": "我理解您的要求：這是一個開放選題的詩歌分析任務。學生可以從多個角度選一個，從多個詩歌範圍選一個，寫 1000-2000 字論文。AI 反饋時會識別學生選擇，不強制特定角度。使用 IB MYP 標準 A、B、D 評分。"
}
```

---

### Example 4：基於系統格式的增量（標準用法）（增量模式）

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

