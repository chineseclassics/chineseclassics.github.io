-- Migration: 020_ensure_honglou_system_template.sql
-- Purpose: 确保系统模板存在（红楼梦论文格式）
-- Date: 2025-10-20
-- Related: teacher-custom-format-ai

-- ============================================================
-- 确保红楼梦系统模板存在
-- ============================================================

-- 使用 INSERT ... ON CONFLICT 确保系统模板存在
INSERT INTO public.format_specifications (
  id,
  name, 
  description, 
  essay_type, 
  is_system,
  is_template,
  spec_json,
  human_input,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',  -- 固定 UUID，方便引用
  '紅樓夢論文格式',
  '適用於《紅樓夢》文學分析的標準論文格式，包含完整的結構要求和評價標準',
  'literary_analysis',
  true,  -- 系统格式
  true,  -- 通用模板
  '{
    "metadata": {
      "name": "紅樓夢論文格式",
      "essay_type": "literary_analysis",
      "structure_type": "完整論文",
      "target_work": "紅樓夢"
    },
    "constraints": [
      {
        "type": "length",
        "min": 1500,
        "max": 2500,
        "description": "總字數 1500-2500 字"
      },
      {
        "type": "structure",
        "description": "必須包含引言、正文、結論三個部分"
      },
      {
        "type": "paragraphs",
        "min": 3,
        "max": 5,
        "description": "正文需要 3-5 個分論點"
      }
    ],
    "content_requirements": [
      {
        "id": "intro",
        "category": "引言",
        "requirement": "背景引入、核心問題、論文主張、結構預告",
        "word_count": { "min": 150, "max": 200 },
        "priority": "required"
      },
      {
        "id": "body",
        "category": "正文",
        "requirement": "每個分論點包含：論點陳述、原文引用、細讀分析、回扣論點",
        "word_count": { "min": 300, "max": 400 },
        "priority": "required"
      },
      {
        "id": "conclusion",
        "category": "結論",
        "requirement": "論點總結、上升到更廣泛意義",
        "word_count": { "min": 150, "max": 200 },
        "priority": "required"
      },
      {
        "id": "citations",
        "category": "引用",
        "requirement": "必須引用《紅樓夢》原文，格式：「……」（第 X 回）",
        "priority": "required"
      }
    ]
  }'::jsonb,
  '【總體要求】
總字數：1500-2500 字
論文類型：學術論文（文學分析）
適用範圍：《紅樓夢》文學分析

【結構要求】

一、引言（150-200 字）
- 背景引入：從《紅樓夢》的藝術成就或文學價值切入
- 關鍵概念定義：明確核心分析對象（如人物、意象、主題等）
- 研究缺口：指出前人研究的不足或新的分析角度
- 核心問題：用疑問句明確提出研究問題（如「林黛玉的人物形象如何體現曹雪芹的藝術匠心？」）
- 論文主張：用一句話精煉陳述你的觀點（如「本文認為……」）
- 結構預告：說明將從哪幾個方面論證（如「本文將從外貌描寫、性格特徵、命運悲劇三個方面展開分析」）

二、正文（3-5 個分論點，每段 300-400 字）
每個分論點段落應包含：
- 分論點陳述：段首用一句話明確該段的核心觀點
- 原文引用：引用《紅樓夢》原文作為證據（至少 1-2 處）
- 細讀分析：分析引文的語言、修辭、象徵意義
- 回扣論點：段末總結該分論點如何支持論文主張

三、結論（150-200 字）
- 論點總結：簡要回顧論文主張和主要論據
- Zoom Out：從具體分析上升到更廣泛的文學或文化意義
- 避免：引入新觀點、重複正文內容

【引用要求】
- 必須引用《紅樓夢》原文
- 引用格式：「……」（第 X 回）
- 引用要準確，不可憑記憶篡改原文
- 引用後必須有分析，不能只堆砌引文

【語言要求】
- 使用學術語言，避免口語化表達
- 邏輯連接詞：因此、然而、此外、綜上所述
- 過渡句：確保段落之間有邏輯銜接
- 避免絕對化表述（如「完全」、「絕對」）

【寫作提示】
- 從宏觀到具體（Zoom In）：引言從大背景切入，逐步聚焦到研究問題
- 從具體到宏觀（Zoom Out）：結論從具體分析上升到更廣泛的意義
- 每個段落只支撐一個分論點
- 原文引用 + 細讀分析是核心方法
- 避免情感化評價，堅持客觀分析',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  human_input = EXCLUDED.human_input,
  is_template = true,  -- 确保系统格式也标记为模板
  updated_at = NOW();

-- ============================================================
-- 验证
-- ============================================================

-- 检查系统模板
-- SELECT id, name, is_system, is_template, 
--        length(human_input) as human_input_length,
--        length(spec_json::text) as spec_json_length
-- FROM public.format_specifications
-- WHERE is_system = true;

