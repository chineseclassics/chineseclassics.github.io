# Format Specification System

## MODIFIED Requirements

### Requirement: Extended Format Specification Schema

The system SHALL extend format specification data structure to support word count constraints, paragraph count constraints, and content-specific requirements.

#### Scenario: Format specification with constraints
- **GIVEN** teacher creates custom format with word count and paragraph requirements
- **WHEN** format is saved
- **THEN** format specification includes:
  ```json
  {
    "id": "custom-uuid",
    "name": "張老師紅樓夢人物分析 2025",
    "based_on": "honglou-essay",
    "constraints": {
      "total_word_count": {
        "min": 1800,
        "max": 2000,
        "target": 1900
      },
      "paragraph_count": {
        "introduction": 1,
        "body_paragraphs": 3,
        "conclusion": 1
      }
    },
    "content_requirements": [...],
    "paragraph_types": [...],
    "is_shared": false,
    "shared_with": []
  }
  ```

#### Scenario: Word count validation during writing
- **GIVEN** assignment requires 1800-2000 words
- **WHEN** student is writing essay
- **THEN** editor displays real-time word count
- **AND** shows progress bar:
  - Red: < 1800 words (below minimum)
  - Green: 1800-2000 words (within range)
  - Yellow: > 2000 words (exceeding maximum)
- **WHEN** student requests AI feedback
- **THEN** feedback includes word count guidance if outside range

#### Scenario: Paragraph count validation
- **GIVEN** teacher requires exactly 3 body paragraphs
- **WHEN** student creates 4th body paragraph
- **THEN** editor shows warning: "此任務要求 3 個分論點"
- **BUT** does not block (allows flexibility)
- **WHEN** student requests AI feedback for 4th paragraph
- **THEN** AI notes: "注意：此任務要求 3 個分論點，您已創建 4 個"

---

### Requirement: Content-Specific Requirements

The system SHALL support content-specific requirements that translate into custom analysis dimensions.

#### Scenario: Add content requirement via AI parsing
- **GIVEN** teacher inputs "詳細分析林黛玉和薛寶釵的外貌描寫"
- **WHEN** AI parses this requirement
- **THEN** system adds to `content_requirements`:
  ```json
  {
    "type": "content_focus",
    "description": "紅樓夢人物外貌描寫分析",
    "specific_criteria": [
      "分析林黛玉的外貌描寫",
      "分析薛寶釵的外貌描寫"
    ],
    "applies_to": "body_paragraph",
    "analysis_dimension": {
      "name": "人物外貌描寫分析深度",
      "description": "分析外貌描寫的象徵意義和人物性格",
      "checks": [
        "是否引用原文中的外貌描寫",
        "是否分析外貌描寫的象徵意義",
        "是否聯繫人物性格和命運"
      ]
    }
  }
  ```

#### Scenario: AI feedback uses content requirements
- **GIVEN** format includes custom content requirement
- **WHEN** student writes body paragraph about 林黛玉
- **AND** student requests AI feedback
- **THEN** `ai-feedback-agent` checks:
  - All standard body paragraph requirements (from base template)
  - Additional "人物外貌描寫分析深度" dimension
  - Specific criteria (quotes, symbolism, character analysis)

---

### Requirement: Format Sharing Between Teachers

The system SHALL support sharing custom formats between teachers at the same school.

#### Scenario: Mark format as shareable
- **GIVEN** teacher has created custom format
- **WHEN** teacher edits format settings
- **AND** enables "分享給同校老師" checkbox
- **THEN** system updates:
  ```sql
  UPDATE format_specifications
  SET is_shared = true
  WHERE id = format_id;
  ```
- **AND** format becomes visible to teachers with same email domain

#### Scenario: Share with specific teachers
- **GIVEN** teacher wants to share with specific colleagues
- **WHEN** teacher inputs email list: "john@isf.edu.hk, mary@isf.edu.hk"
- **THEN** system updates:
  ```sql
  UPDATE format_specifications
  SET shared_with = ARRAY['john@isf.edu.hk', 'mary@isf.edu.hk']
  WHERE id = format_id;
  ```
- **AND** only these teachers can see format

#### Scenario: RLS policy for shared formats
- **GIVEN** format is shared
- **WHEN** querying `format_specifications`
- **THEN** RLS policy allows SELECT if:
  ```sql
  -- Teacher can see if:
  (created_by = auth.uid())  -- They created it
  OR
  (is_shared = true AND email_domain_matches())  -- Shared to school
  OR
  (auth.email() = ANY(shared_with))  -- Specifically shared to them
  ```

**Note**: Sharing feature is Phase 2, not MVP.

---

## ADDED Requirements

### Requirement: Format Export Functionality

The system SHALL provide export functionality to convert format specifications into human-readable document formats.

#### Scenario: Export format as Markdown
- **GIVEN** teacher has custom format
- **WHEN** teacher clicks "導出為 Markdown"
- **THEN** system generates `.md` file containing:
  ```markdown
  # 張老師紅樓夢人物分析 2025
  
  基於：紅樓夢論文格式 (系統內置)
  
  ## 字數要求
  - 總字數：1800-2000 字
  - 建議字數：1900 字
  
  ## 段落結構
  - 引言：1 段
  - 分論點：3 段
  - 結論：1 段
  
  ## 內容要求
  ### 人物外貌描寫分析
  - 詳細分析林黛玉的外貌描寫
  - 詳細分析薛寶釵的外貌描寫
  - 每個人物分析不少於 300 字
  
  ## 評價維度
  ...
  ```
- **AND** triggers browser download

#### Scenario: Export preserves rich text formatting
- **GIVEN** teacher used bold, italic, lists in requirements editor
- **WHEN** exporting to Markdown
- **THEN** system converts:
  - Bold → `**bold**`
  - Italic → `*italic*`
  - Bullet list → `- item`
  - Numbered list → `1. item`

---

### Requirement: Dynamic Template Updates

The system SHALL ensure assignments always reference the latest version of format specifications without snapshots.

#### Scenario: Assignment stores format reference
- **GIVEN** teacher creates assignment with custom format
- **WHEN** assignment is saved
- **THEN** database stores:
  ```sql
  INSERT INTO assignments (id, format_spec_id, ...)
  VALUES (uuid, 'custom-format-uuid', ...);
  ```
- **AND** does NOT store format JSON content

#### Scenario: Format update propagates to assignments
- **GIVEN** assignment is using custom format A
- **AND** student is actively writing
- **WHEN** teacher updates format A (e.g., changes word count)
- **THEN** next time student requests AI feedback:
  - System queries latest version of format A
  - AI uses updated word count in feedback
- **AND** no cache invalidation needed (query is fresh)

#### Scenario: Prevent deletion of in-use formats
- **GIVEN** custom format is used by assignment with future deadline
- **WHEN** teacher attempts to delete format
- **THEN** system checks:
  ```sql
  SELECT COUNT(*) FROM assignments
  WHERE format_spec_id = format_id
  AND deadline >= CURRENT_DATE;
  ```
- **IF** count > 0:
  - Block deletion
  - Show message: "此格式正在被使用，無法刪除"
  - List assignments using this format

