## 時文寶鑑：段落級 AI 反饋 × 老師指引 AI 優化 對齊改進計劃（2025-11-01）

本計劃文件定義兩個 AI 系統的聯動優化方案：
- 段落級反饋系統（Paragraph Feedback Engine）
- 老師指引 AI 優化系統（Teacher Guideline Optimizer）

核心取向：
- 以「老師指引原文」為最高準則，模型在老師語境下產出反饋；不對老師撰寫指引的形式施加任何約束。
- 反饋輸出收斂為「段落總體反饋 + 句子級反饋」，同時「保留並顯示指引對齊度（guideline_alignment）」，且數值必須對齊老師文本、可解釋。
- 其它維度/分數為可選附加資訊，不作硬性要求。
- 評分標準（Rubric）作為第二訊號來源：在不違背老師指引的前提下，補充常見學術要求（如 A/B/D 維度與結構預期），並在老師未明確規定形式時提供建議與對齊提示。
- 系統已內建評分指引系統：老師在佈置作業時會選定「評分指引」並勾選「適用細項」；段落級反饋必須同時對齊「老師指引 + 已選評分細項（不限於結構，包含所有被選定的維度）」。

與太虛架構原則對齊：
- 變更僅限 `shiwen-baojian` 子項目，自包含，不外溢至平台根目錄。
- Edge Functions 繼續在 `shiwen-baojian/supabase/functions` 內獨立部署。
- 前端繼續在 `shiwen-baojian/js` 自包含，保持應用切換規範與絕對路徑。

---

## 1. 兩個系統的關係與目標

1) 老師指引 AI 優化系統（Teacher Guideline Optimizer）
- 任務：將「老師的自然語言指引」輕度整理（條列化）、並產出「最小可用的機器要點」，以便段落級反饋能精準遵循。
- 產物：
  - teacher_guidelines_text：保留老師語感的原文/條列化文本（主體）
  - guideline_min_hints（可選）：最小要點（如：各段必需元素、禁則/偏好簡表、元素權重提示）

2) 段落級 AI 反饋系統（Paragraph Feedback Engine）
 任務：針對單段文本，輸出「總體反饋 + 若干句子級反饋」，並提供「指引對齊度（僅評估老師指引中可推導的要點）」與可解釋清單；若配置了評分標準 Rubric，則同時提供「Rubric 對齊」的建議性對齊資訊。
- 產物：
  - overall_comment（必需）
  - sentence_notes（可選）
  - guideline_alignment（必需；以老師文本為準、可追溯）
  - 其它可選擴展（如 content_analysis 動態維度）

---

## 2. 介面契約（Inputs / Outputs）

### 2.1 段落級反饋系統（後端 Edge Function）

輸入（由前端傳入）：
- paragraph_id: string
- paragraph_content_html: string（原段落 HTML）
- paragraph_text: string（後端或前端清洗的純文本；建議後端保底清洗）
- paragraph_role: { kind: "introduction" | "body" | "conclusion", body_index?: number }
- sentences: string[]（由系統分句後提供，避免模型自行分句帶來偏差）
- teacher_guidelines_text: string（老師原文/條列化的指引文本，作為最高準則）
- guideline_min_hints（可選）：{ required_elements?: Element[], forbidden_patterns?: string[], weights?: Record<string, number> }
- traceability（可選，預設 true）: boolean（是否在輸出中引用老師指引片段以佐證主要評議）
 - rubric_id（可選）: string（系統內建評分標準的標識）
 - rubric_definition（可選）: object（自定義評分標準 JSON；若提供則覆蓋 rubric_id）
 - rubric_mode（可選，預設 "adaptive"）: "adaptive" | "strict"（adaptive：rubric 對齊以建議為主；strict：若 rubric 明確要求形式，將其視為必達，惟仍以老師文本優先）
 - rubric_selection（建議提供）: {
     rubric_id: string,
     selected_criteria: Array<{
       id: string,
       required?: boolean,       // 老師在作業中標示為必達
       weight?: number,          // 老師或 rubric 自帶權重（可選）
       scope?: "paragraph"|"essay"  // 若為整篇層級，段落反饋中以「貢獻度」方式提示
     }>
   }

說明：
- 嚴格度系統已取消。即使前端傳入舊字段 strictness_hint，後端亦忽略；全局採「advisory-only（建議導向）」策略，老師文本優先。

輸出（回傳前端並寫入 ai_feedback 表的 feedback_json）：
- overall_comment: string（繁體；總體評價與改進方向，不提供具體改寫句）
- sentence_notes?: Array<{ sentence_number: number, comment: string, severity?: "major" | "minor" }>
- guideline_alignment: {
  score: number,                   // 0–100，僅針對「適用且源自老師指引」的檢查項計分
  checks: Array<{
    name: string,
    status: "met" | "partially_met" | "not_met" | "not_applicable",
    source: "teacher" | "ai_default",
    confidence?: number            // 0–1，可選
  }>,
  rationale_snippets?: string[],   // 取自老師指引的短句，說明本段評議依據
  notes?: string[]
}
- severity_level?: "critical" | "major" | "moderate" | "minor"（可選：由完整度與句子級問題綜合）
- generated_at: ISOString
- content_analysis?: Record<string, { name?: string, score?: number, issues?: string[], sentence_numbers?: number[] }>（可選動態維度）
- suggestions_form?: string[]（可選；當老師未明確規定形式時，由 AI 提供的形式建議，明確標註為「建議」）
- assumptions?: string[]（可選；AI 的推斷前提，提升透明度）
 - rubric_alignment?: {
    score?: number,  // 0–100，可選；當有 required/weight 或 rubric_mode=strict 時可提供
    criteria: Array<{
      id: string,
      name: string,
      dimension?: string,  // 例如 "A"|"B"|"D"
      status: "met" | "partially_met" | "not_met" | "not_applicable",
      scope?: "paragraph"|"essay",
      paragraph_contribution?: "positive"|"neutral"|"negative", // essay 級準則下，本段的貢獻評述
      required?: boolean,
      weight?: number,
      notes?: string[]
    }>,
    rationale_snippets?: string[]   // 取自 rubric 的描述或等級說明
  }

注意：
- 僅強制 overall_comment 與 guideline_alignment 必須存在；sentence_notes 強烈建議，但允許為空。
- UI 顯示「指引對齊度」，重點是「對齊老師文本」與「解釋可追溯」，對於老師未規定的形式項一律標註為 not_applicable 或建議。

### 2.2 老師指引 AI 優化系統（Edge Function）

輸入：
- teacher_input_raw: string（老師的自然語言指引）

輸出：
- teacher_guidelines_text: string（繁體、可讀、忠實呈現老師語境；僅做輕度整理，不強加模板）
- guideline_min_hints（可選）：
  - required_elements?: Array<{ id: string, name: string, for: "introduction"|"body"|"conclusion", required: boolean, position?: string, markers?: string[], keywords?: string[], check_points?: string[] }>
  - forbidden_patterns?: string[]（如："這說明"、"這體現"）
  - weights?: Record<string, number>（若老師文本明示權重或重點時可提供）
  - normalization?: { provide_trad_and_simp: boolean }

說明：
- 絕不要求老師提供結構化模板；僅 teacher_guidelines_text 即可運作。
- 若 guideline_min_hints 出現，僅作輔助訊號；未提供時，反饋不會因此降級或施加形式約束。

---

## 3. 指引對齊度（guideline_alignment）與 Rubric 對齊（內容優先，形式自適）

目標：在不限制老師指引寫法的前提下，對齊老師文本提供段落級可追溯評議；僅對「老師明示或可合理推導」的要點做檢查，避免發明未被要求的硬性規則。

### 3.1 對齊流程（老師文本優先，AI 解釋透明）
1) 正規化處理：
  - 繁簡轉換（關鍵詞/標記詞/文本雙向對齊）；全半形、標點、空白折疊。
2) 句子切分：
  - 支援「。！？；」與換行；文言/詩詞採保守切分；提供 sentences[] 以避免模型自行分句。
3) 可適用要點抽取（from 老師指引）：
  - 從 teacher_guidelines_text 擷取與本段 paragraph_role 相關的理念/要求；並標註 source:"teacher"。
  - 若老師未明確形式，僅保留內容層面的對齊要點；形式建議可由 AI 另列為 suggestions_form（不計入評分）。
4) 輔助性推論（可選）：
  - 在不違背老師文本的前提下，由 AI 提供 ai_default 的「軟建議」要點（例如學術常見的清晰主題句、例證-分析鏈條）；這類要點僅作提醒，不作硬性考核。
5) 引用與細讀提示：
  - 嘗試偵測原文引用與細讀關係（保守啟發式 + tiebreaker 小提示）；但僅在老師文本對“引用/細讀”有所要求時，才計入對齊檢查。
6) 置信度與 tiebreaker：
  - 對模糊判定以一次小提示詞請 AI 回覆 yes/no；透明標註 confidence。
7) 學術慣例建議（老師未規定形式時）：
  - 由 AI 提供引言/分論點/結論的常見結構建議（如主題句—例證—細讀—回扣），以 suggestions_form 呈現，不做硬性考核；若 rubric 有同步要求，則轉為 rubric 對齊評述。

### 3.2 計分與解釋（僅針對可適用、源自老師文本）
- 僅統計 checks 中 source="teacher" 且 status ∈ {met, partially_met, not_met} 的項目：
  - score = round( met / (met + partially_met + not_met) * 100 )。
- checks 項目的 name 與 rationale_snippets 關聯，確保可追溯。
- ai_default 要點只在 notes 或 suggestions_form 呈現，不納入 score。

備註：
- 若老師文本或 guideline_min_hints 提供權重，允許對個別 teacher 要點做加權；否則不使用權重、維持等權統計。

### 3.3 Rubric 參考式對齊（不評分，只作建議）
- 優先序：teacher > rubric（參考）> ai_default。
- 用法：當提供 rubric（或 rubric_selection）時，僅抽取其「最高成績水平」的文字描述，轉化為可操作的建議，放入 suggestions_form。
  - 建議格式：在每條建議前加標籤（例如：[Rubric-A]、[Rubric-B]），內容為「最高等級描述 → 本段可採取的具體動作」。
  - 不生成 rubric_alignment.score；不將 rubric 參考項納入 guideline_alignment 計分。
  - 若與老師文本衝突，仍以老師文本為準，並於 guideline_alignment.notes 補充說明衝突點。
  - scope="essay" 的 rubric 條目可轉為「本段對整篇的建議性貢獻」提示（語氣溫和，不做硬判）。
  - A/B/D 維度可作為建議的標籤顯示，便於教師/學生對齊課內語彙。

---

## 4. 提示詞設計要點（不含程式碼，供實作參考）

### 4.1 段落級反饋（DeepSeek）
- System（摘要）：
  - 你是該課老師的分身，所有評議以老師指引為最高準則；使用繁體中文；不提供具體改寫句。
  - 僅輸出 JSON；不包含額外文字或 Markdown。
  - 嚴禁發明老師未要求的硬性規則；如無明確形式規定，形式建議以 suggestions_form 提供並標註為建議。
  - 使用 sentences[] 的編號進行句子對位；若啟用 traceability，請引用 1–3 句老師指引片段支撐主要評議。
  - 若提供 rubric_selection 或 rubric，請以老師在作業中勾選的 selected_criteria 為主進行全面對齊（不限於結構），對 paragraph/essay 範圍分別給出 criteria.status 或 paragraph_contribution；按 rubric_mode 呈現建議性或可選計分的對齊結果；若與老師文本衝突，仍以老師文本優先並於 notes 中說明。
- User（材料順序）：
  1) 段落純文本
  2) 句子清單（1..N）
  3) 老師指引原文（teacher_guidelines_text）
  4) paragraph_role + traceability（預設 true）
  5) rubric_selection（如有）或 rubric_id / rubric_definition（僅作參考，不評分）
  6) 輸出契約：overall_comment / sentence_notes / guideline_alignment（含 checks 與 snippets）/ suggestions_form（包含 [Rubric-*] 建議項）
- 參數建議：
  - temperature: 0.2–0.3
  - max_tokens: 1200–1600（段落級足夠）
  - response_format: { type: "json_object" }

### 4.2 老師指引優化（DeepSeek）
- System：
  - 僅做輕度整理（可條列化），保持忠實、不過度添加；不將老師文本轉化為硬性模板。
  - 可選：在不影響原意下，萃取最小提示 `guideline_min_hints`（若可得）。
- User：
  - 提供老師原文；可加註班級/學段背景（選填）。
  - 請先輸出條列化文本（teacher_guidelines_text），再輸出 guideline_min_hints JSON（可選）。

---

## 5. 前端 UI 與資料層對齊

- 將「結構完整度」卡片更名為「指引對齊度（guideline_alignment）」；數值按 3.2 規則產生（僅針對老師文本的可適用要點）。
- 新增/優先顯示：
  - 段落「總體反饋」：`overall_comment`
  - 句子級反饋列表：`sentence_notes[]`，可點擊定位到第 N 句
- guideline_alignment.checks 每項顯示來源標籤（teacher / ai_default）與狀態（含 not_applicable）。
- 若提供 rubric，顯示「評分標準對齊（rubric_alignment）」區塊：criteria 列表（含 A/B/D 標籤）、狀態與可選總分；與指引對齊並列展示，並明示優先序 teacher > rubric。
- content_analysis（若有）可置於「詳細分析」摺疊區，無則隱藏。
- 資料存儲：
  - `ai_feedback.feedback_json` 存整包 JSON；
  - `ai_grading_json`（若存在）僅老師可見；與本計劃無直接耦合。

---

## 6. 風險與邊界

- 空段/極短段：要求模型在 overall_comment 先指出「資訊不足」，並指明補充方向；sentence_notes 可為空。
- 超長段落：前端/後端可截斷至合理長度後提示 AI，避免溢出；不影響 guideline_alignment（只統計可適用要點）。
- 引文與分析比例：對正文/引用的粗檢需耐心調參（語料風格多樣）。
- 繁簡/變體：雙向同表策略 + 正規化，避免漏檢。
- 模型幻覺：禁止杜撰引用；所有句子編號必須對應提供的句子清單。
- 跨教師可比性：不同老師的自然語言指引差異較大，score 僅在同一指引下具備可比性；以 traceability 提升信任。

---

## 7. 成功標準與驗證

- 對齊性（Guideline）：
  - 在基準集上，teacher 來源的可適用要點識別準確率 ≥ 0.9；
  - 主要評議具備 traceability（≥ 90% 的段落回覆包含 1–3 條老師文本片段）。
- Rubric 參考（若配置）：
  - 能正確抽取「最高成績水平」的要點，並轉化為具體可操作建議（人工抽查一致）；
  - A/B/D 標籤對應正確率 ≥ 0.95；
  - 不產生任何評分或硬性缺失結論。
- 可用性（UX）：
  - 句子級點擊定位成功率 ≥ 0.98；
  - 過長段落仍能返回可讀總評（不報錯/不崩）。
- 穩定性：
  - 重複請求同段落（內容不變）輸出差異極小（措辭可變，結論一致）。
  - 在 adaptive 模式下，不會將未在老師文本中出現的形式規則當作硬性缺失。

---

## 8. 落地變更清單（工程視角，供開發排期）

後端（Edge Functions）
- 段落級反饋：
  - 新提示詞骨架（System/User）與參數（低溫/JSON 格式）。
  - guideline_alignment：
    - 僅抽取與 paragraph_role 相關、源自老師文本的可適用要點；
    - 對模糊項以小提示詞作 tiebreaker 並輸出 confidence；
    - 僅以老師來源要點計分；ai_default 僅作建議。
  - sentence_notes：依前端提供的 sentences 編號返回。
  - rubric 支援：
     - 接收 rubric_id 或 rubric_definition；
     - 僅抽取最高成績水平描述，轉為 suggestions_form 的 [Rubric-*] 建議項；
     - 若 teacher 與 rubric 衝突，以 teacher 為準並在 notes 中說明（rubric 僅建議）。
- 老師指引優化：
  - 輕度整理文本輸出（可條列化，不強加模板）；
  - 可選 guideline_min_hints JSON（若可得）。

前端
 - 渲染優先級：overall_comment / sentence_notes / guideline_alignment；content_analysis 摺疊顯示。
 - 將「結構完整度」改為「指引對齊度」；顯示來源標籤與 not_applicable。
 - 若提供 rubric，顯示 rubric_alignment 區塊與 A/B/D 標籤，並明示優先序 teacher > rubric。
 - 句子定位：以本地分句結果為準，對齊 sentence_number。
 - 嚴格度系統：已取消嚴格/自適模式的前端設定與傳輸（全域採建議導向）。
 - Rubric 呈現：將 [Rubric-*] 建議項一併展示於「改進建議（suggestions_form）」區塊，無分數、無硬性狀態判讀。

數據/規範
- 若老師選擇內建模板（如《紅樓夢》），則可直接提供較完整的 required_elements 與 weights；
 - 若老師使用自定義指引，僅用 teacher_guidelines_text 即可運作；若無 hints，不會導致過度形式化的檢查。

---

## 9. 輸入/輸出示例（參考）

### 9.1 段落級反饋：輸入（摘要）
{
  "paragraph_id": "para-001",
  "paragraph_text": "……（純文本）",
  "sentences": ["句1……", "句2……", "句3……"],
  "paragraph_role": { "kind": "body", "body_index": 2 },
  "teacher_guidelines_text": "• 主題句明確…\n• 引用後需細讀…\n• 避免『這說明』…",
  "guideline_min_hints": {
    "required_elements": [
      { "id": "topic_sentence", "name": "主題句", "for": "body", "required": true, "position": "開頭第一句", "markers": ["首先","其次"] },
      { "id": "textual_evidence", "name": "文本證據", "for": "body", "required": true, "min_count": 1 },
      { "id": "close_reading", "name": "文本細讀", "for": "body", "required": true, "min_percentage": 60 }
    ],
    "forbidden_patterns": ["這說明", "這體現"],
    "weights": { "topic_sentence": 10, "textual_evidence": 10, "close_reading": 35 }
  },
  "rubric_id": "ABD_v1",
  "rubric_mode": "adaptive"
}

### 9.2 段落級反饋：輸出（摘要）
{
  "overall_comment": "本段圍繞分論點展開，但引用偏少且細讀不足。建議補充至少一處原文並就關鍵詞進行分析，避免使用『這說明』類空泛表述。",
  "sentence_notes": [
    { "sentence_number": 1, "comment": "主題句可更明確對應總主張。", "severity": "minor" },
    { "sentence_number": 3, "comment": "僅概述情節，缺少對關鍵詞的細讀推論。", "severity": "major" }
  ],
  "guideline_alignment": {
    "score": 78,
    "checks": [
      { "name": "有明確分論點（對應總主張）", "status": "partially_met", "source": "teacher", "confidence": 0.8 },
      { "name": "至少一處原文引用並配合細讀", "status": "not_met", "source": "teacher", "confidence": 0.9 },
      { "name": "段落內部的結構銜接（建議）", "status": "not_applicable", "source": "ai_default" }
    ],
    "rationale_snippets": ["• 引用後需細讀", "• 主題句是否對應總主張？"],
    "notes": ["細讀可聚焦關鍵詞語。"]
  },
  "rubric_alignment": {
    "criteria": [
      { "id": "A", "name": "分析", "dimension": "A", "status": "partially_met", "notes": ["缺少對引用的細讀推論。"] },
      { "id": "B", "name": "組織", "dimension": "B", "status": "met" },
      { "id": "D", "name": "語言", "dimension": "D", "status": "met" }
    ],
    "rationale_snippets": ["A: 對文本例證需有分析", "B: 結構連貫性", "D: 用語準確"]
  },
  "generated_at": "2025-11-01T08:30:00Z",
  "suggestions_form": ["考慮在段首使用更聚焦的主題句。"]
}

### 9.3 老師指引優化：輸出（摘要）
{
  "teacher_guidelines_text": "【段落結構】\n• 正文段：開頭主題句；至少一處原文引用；引用後必有細讀；結尾可簡要收束。\n【檢查要點】\n- 主題句是否對應總主張？\n- 是否至少1處引用且準確？\n- 細讀是否聚焦字/詞/句，長度大於引用？\n【禁則】\n- 避免『這說明』『這體現』等空泛語。",
  "guideline_min_hints": {
    "required_elements": [
      { "id": "topic_sentence", "name": "主題句", "for": "body", "required": true, "position": "開頭第一句" },
      { "id": "textual_evidence", "name": "文本證據", "for": "body", "required": true, "min_count": 1 },
      { "id": "close_reading", "name": "文本細讀", "for": "body", "required": true, "min_percentage": 60 }
    ],
    "forbidden_patterns": ["這說明", "這體現"],
    "weights": { "topic_sentence": 10, "textual_evidence": 10, "close_reading": 35 },
    "normalization": { "provide_trad_and_simp": true }
  }
}

---

## 10. 後續工作與里程碑（建議）

- W1：完成兩個 Edge Functions 的提示詞更新草案；實作正規化/分句與元素偵測加強；接入 response_format/json_object；移除嚴格度系統並完成文檔同步；明確 Rubric 僅作參考（輸出到 suggestions_form）。
- W2：建立基準集（30 段），對完整度與缺失元素做標註與對比；調整權重與檢測閾值。
- W2（續）：用基準集驗證「最高成績水平 → 建議」的抽取/表達一致性（採人工抽查與簡單標註集）。
 - W3：前端渲染輕量調整（優先顯示總評/句子級；指引對齊度；content_analysis 摺疊）；釋出小班試用。
- W4：彙總數據，評估準確性/穩定性；若教師需要，再提供 Detailed 視圖切換。

---

（完）

---

## 11. ProseMirror 整合方案：句子級反饋

目標
- 在 ProseMirror 編輯器內提供穩定的句子級定位、著色與跳轉，支援即時編輯後的準確映射。
- 將「句子清單」作為後端 AI 的輸入，同時將 AI 的 `sentence_notes` 可靠地回貼到對應句子範圍。

設計總覽
- 採用一個輕量插件組合：
  1) SentenceMapPlugin：維護每個段落的分句邊界與索引。
  2) SentenceIssuesPlugin：根據 AI 回傳的 `sentence_notes` 生成裝飾（Decorations）。
  3) Tooltip/Sidebar 配合（沿用現有側欄/Overlay）：點擊側欄條目 → 滾動到句子；懸浮顯示建議。

### 11.1 SentenceMapPlugin（分句與對齊）

職責
- 為每個段落節點計算句子陣列與位置區間，並保存在插件 state。
- 在交易（transaction）後只對受影響的段落增量重算，將成本控制在 O(受影響文字長度)。

State 形狀（示意）
- paragraphs: Map<paraPosKey, { sentences: Array<{ idx: number, from: number, to: number, text: string }>, version: number }>
- docVersion: number（用於快取失效）

核心邏輯
- 初始化：遍歷文檔段落（paragraph/bullet_list/ordered_list 的 list_item 亦視作段落），以純文本做分句。
- 交易映射：對於 tr.docChanged 的區域，使用 tr.mapping 找到對應段落，僅重算這些段落的 sentences。
- 取得 API：
  - getParagraphSentences(paraPosKey) → sentences[]（text 陣列，供後端）
  - getSentenceRange(paraPosKey, idx) → { from, to }

中文分句規則（可擴充）
- 主要分隔符：/。|．|！|!|？|\?|；|;|…+/（連續省略號視為一個終止點）
- 夾帶引號（「」『』“”）結尾時，標點在內亦視為結束。
- 無標點長句：超過閾值（如 60–80 字）時按「自然段內硬換行」或「停用詞/逗號」做次級切分。
- 硬換行（hard_break）可作為弱邊界（僅在無終止標點時生效）。

效能策略
- Debounce 分句重算（輸入停止 200–300ms 後觸發）。
- 僅重算受影響段落；保留未變段落的快取。
- 超長段（>2k 字）採用 lazy 分段處理與進度提示。

輸出給後端
- 當用戶請求段落級反饋時，直接從插件 state 取 sentences（文字陣列），作為 AI 輸入中的 `sentences[]`，保證與編輯器實際邊界一致。

### 11.2 SentenceIssuesPlugin（裝飾與互動）

職責
- 接收 AI 回傳的 `sentence_notes`（含 sentence_number、severity、message、suggestion），將其轉為 DecorationSet。

裝飾策略
- Inline Decoration：對句子 [from,to] 範圍加 class，如 `ai-issue--minor|major|critical`，對應不同顏色/底紋。
- Widget Decoration：在句首插入小圖示（例如燈泡/警告標），支援 hover 顯示建議、點擊在側欄同步高亮。
- Map 與更新：使用 decorationSet.map(tr.mapping, tr.doc) 隨編輯自動映射；若 sentence_map 變動則按 idx→range 再生成。

互動
- 命令：revealSentence(paraPosKey, idx) → 滾動並閃爍高亮。
- 清除：clearSentenceIssues(paraPosKey) → 移除當段落裝飾。
- 事件：點擊側欄列表項（沿用現有 Overlay）→ 呼叫 revealSentence。

資料對齊
- 以 SentenceMapPlugin 的 from/to 為準；`sentence_number` 取自插件的 idx，避免前後端分句不一致。
- 若 AI 回傳索引越界或定位失敗，降級策略：
  1) 嘗試以 note.quote 的子串在該段內做最近匹配；
  2) 匹配失敗則落到段落頂部展示為未定位項。

### 11.3 與現有側欄/Overlay 的對接

- 沿用既有注解側欄組件，將資料源切換為 SentenceIssuesPlugin 的 state。
- 點擊側欄 → 編輯器 reveal；游標進入句子範圍時，側欄自動同步選中（可選）。
- 支援 Simple/Detailed：
  - Simple：`message` + 可選 `suggestion` 簡短版。
  - Detailed：展開 rule、severity 權重、引用比例等。

### 11.4 開發介面（建議）

- sentenceMap.getSentences(paraPosKey): string[]
- sentenceMap.getRange(paraPosKey, idx): { from: number; to: number }
- sentenceIssues.setNotes(paraPosKey, notes: Array<{ idx:number; severity:string; message:string; suggestion?:string; quote?:string }>)
- sentenceIssues.clear(paraPosKey)
- commands.revealSentence(paraPosKey, idx)

### 11.5 邊界與容錯

- 粘貼大量無標點文本：啟用硬換行/長度閾值切分；側欄提示「建議加標點以提升判讀」。
- 標點異常（全形/半形混用、罕見終止符）：發送 AI 前做繁簡/全半形/空白的正規化，插件側保持原文座標。
- 協作/多光標情境：Decorations 基於 mapping 運作；如使用 yjs-collab，重算時尊重遠端變更區間。

### 11.6 與薄契約/後端的一致性

- 前端 sentences[] 直接作為 AI 輸入，AI 僅以 `sentence_number` 定位；這保證 UI 與數據的一致性與可重現性。
- structure_check（段級）與句子裝飾（句級）相互獨立但可並列展示。

### 11.7 驗收標準（句子功能）

- 句子定位對齊率 ≥ 0.98（一般標點文本）；無標點長文 ≥ 0.95（啟用次級切分）。
- 編輯後映射準確率 ≥ 0.98（對 100 次隨機插刪測試）。
- 重新渲染耗時：中等段（300–500 字）< 20ms；超長段（>2k 字）漸進渲染，不阻塞輸入。

### 11.8 後續可選優化

- 規則/統計驅動的中文分句器（擴充標點表與停頓啟發式）。
- 句子穩定 ID：以文字 hash + 位置微環境（前後 6–10 字）生成，跨小幅編輯保持穩定，用於持久化註解。
- 自動修復：當句子索引失配且 quote 可匹配時，自動重掛裝飾並修正 idx。

---

## 附錄 A｜既有問題清單與重構後狀態對照

以下對照此前體檢中列出的主要問題，標註在本計劃下的處置狀態與落地舉措。

1) AI JSON 返回不穩定（極重要）
- 狀態：保留並修正（必改）
- 措施：
  - 後端請求強制 `response_format: { type: "json_object" }`；
  - 溫度降至 0.2–0.3；
  - 提示詞示例 JSON 一律使用具體數值（不再出現 `0-10` 這類區間字串）；
  - 解析器保留容錯（去除 code fence 等），但在理想情況下不再觸發。
- 驗收：同段內容重複請求，JSON 結構與鍵名穩定；解析錯誤率→趨近 0。

2) 規範語系不一致導致元素檢測偏差（高）
- 狀態：保留並修正（必改）
- 措施：
  - 文本與關鍵詞雙向繁簡正規化（含全半形、標點、空白折疊）；
  - keywords/markers 提供繁/簡同義；
  - 檢測以正規化後的內容比對。
- 驗收：必需元素命中準確率 ≥ 0.9；結構完整度誤差 ≤ ±5%。

3) 段落語義參數（paragraph_type_detailed/paragraph_role）未被使用（中高）
- 狀態：保留並修正（必改）
- 措施：
  - 將 `paragraph_role`（intro｜body-N｜conclusion）寫入提示詞，明確本段期望（如 body-1 偏主題句與首證據、body-3 偏收束/過渡）；
  - structure 檢測中的 position 規則也據此細化。
- 驗收：不同正文段落的反饋重點具體可辨（人工抽查一致）。

4) 內容分析維度與前端顯示對不上（中）
- 狀態：降級為可選（Detailed 視圖）
- 措施：
  - 本計劃的默認「Simple」視圖僅展示總評/句子級/結構完整度；
  - 若啟用「Detailed」，前端遍歷 content_analysis 的動態鍵名渲染（不再固定三欄）。
- 驗收：有返回即顯示，無則隱藏；不影響核心體驗。

5) 句子級問題對位規約不嚴（中）
- 狀態：由新方案解決（必落實）
- 措施：
  - 前端/後端提供 `sentences[]` 清單給模型；
  - 模型僅返回 `sentence_notes[{ sentence_number, comment }]`，嚴禁自行分句；
  - 點擊定位以提供的句號 index 為準。
- 驗收：句子定位成功率 ≥ 0.98。

6) 結構檢測啟發式過於簡單（中）
- 狀態：保留並修正（必改）
- 措施：
  - 納入 `min_count`/`min_percentage`/`forbidden_patterns` 等細粒度規則；
  - 引用 vs 細讀長度比例檢查（quote/analysis）；
  - 規則檢測信心落於模糊區間時，以一次小提示詞向 AI 請求 yes/no 校驗（規則優先）。
- 驗收：教師標註對照下，完整度誤差 ≤ ±5%。

7) 嚴重度判定未利用權重（中）
- 狀態：保留並修正（建議改）
- 措施：
  - 以 `weights_and_scoring.paragraph_weights` 與 `severity_levels` 校正：
    - 關鍵必需元素缺失（如 close_reading）直上 major/critical；
    - 其餘依權重/數量合成。
- 驗收：與教師期望排序一致性提升（抽樣評審）。

8) Prompt 未顯式注入任務上下文/禁則（次）
- 狀態：由新方案解決（必落實）
- 措施：
  - 直通 `teacher_guidelines_text`；
  - `guideline_min_hints.forbidden_patterns` 若存在，明列於提示詞；
  - 系統強制：不得杜撰引用、不得提供具體改寫句。
- 驗收：空泛評語比例顯著下降，貼合老師語境。

