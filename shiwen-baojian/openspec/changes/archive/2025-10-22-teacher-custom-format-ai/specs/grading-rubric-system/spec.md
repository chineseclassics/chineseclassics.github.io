# Grading Rubric System

## ADDED Requirements

### Requirement: System Built-in Grading Rubrics

The system SHALL provide built-in grading rubrics for common Chinese literature courses.

#### Scenario: Load IB MYP Chinese Literature rubric
- **GIVEN** teacher creates assignment
- **WHEN** selecting grading rubric
- **THEN** system offers "IB MYP 中國古典文學" as option
- **WHEN** teacher selects this rubric
- **THEN** system loads rubric from `/assets/data/grading-rubrics/ib-myp-chinese-literature.json`
- **AND** rubric contains four criteria:
  - **Criterion A: 分析** (0-8 points)
  - **Criterion B: 組織** (0-8 points)
  - **Criterion C: 創作文本/材料** (0-8 points)
  - **Criterion D: 運用知識及語言** (0-8 points)

#### Scenario: Rubric JSON structure
- **GIVEN** system loads grading rubric
- **THEN** JSON structure includes:
  ```json
  {
    "id": "ib-myp-chinese-literature",
    "name": "IB MYP 中國古典文學評分標準",
    "type": "system",
    "criteria": [
      {
        "code": "A",
        "name": "分析",
        "max_score": 8,
        "descriptors": [
          {
            "score_range": "0",
            "description": "學生沒有達到以下任何細則所描述的標準。"
          },
          {
            "score_range": "1-2",
            "description": "i. 對文本/材料的內容、背景、語言... 稍有分析..."
          },
          ...
        ]
      },
      ...
    ]
  }
  ```

---

### Requirement: Grading Rubric Selection

The system SHALL allow teachers to select grading rubrics when creating assignments.

#### Scenario: Select rubric during assignment creation
- **GIVEN** teacher is creating assignment
- **WHEN** reaching "評分標準" step
- **THEN** system shows rubric selector with:
  - System built-in rubrics
  - Teacher's custom rubrics (if any)
- **WHEN** teacher selects "IB MYP 中國古典文學"
- **THEN** assignment is linked to this rubric
- **AND** rubric ID is stored in assignment record

#### Scenario: Preview rubric before selection
- **GIVEN** teacher views rubric options
- **WHEN** teacher clicks "預覽" on a rubric
- **THEN** system displays full rubric content:
  - All four criteria
  - Score ranges and descriptors
  - Examples (if available)

---

### Requirement: AI Grading Agent Edge Function

The system SHALL provide an AI-powered Edge Function that generates grading suggestions based on the selected rubric.

#### Scenario: Generate grading suggestion
- **GIVEN** student has submitted complete essay
- **AND** assignment uses "IB MYP 中國古典文學" rubric
- **WHEN** teacher clicks "AI 評分建議"
- **THEN** system calls `grading-agent` Edge Function with:
  - Essay content (all paragraphs)
  - Rubric JSON
- **THEN** Edge Function returns:
  ```json
  {
    "criterion_a_score": 6,
    "criterion_b_score": 7,
    "criterion_c_score": 5,
    "criterion_d_score": 6,
    "reasoning": {
      "A": "學生熟練地分析了文本內容和人物形象...",
      "B": "文章組織結構清晰，論點環環相扣...",
      "C": "展示出相當好的見解和想象...",
      "D": "語言運用恰當，極少錯誤..."
    }
  }
  ```

#### Scenario: Processing time under 15 seconds
- **GIVEN** typical essay (1500-2000 words)
- **WHEN** generating AI grading suggestion
- **THEN** Edge Function completes within 15 seconds

---

### Requirement: AI Grading Suggestion Display (Teacher Only)

The system SHALL display AI grading suggestions to teachers for reference, ensuring students cannot see them.

#### Scenario: Display AI suggestion to teacher
- **GIVEN** AI has generated grading suggestion
- **WHEN** teacher views suggestion
- **THEN** system displays:
  - Four criteria with suggested scores (0-8)
  - Reasoning for each criterion
  - Total score (sum of four criteria, max 32)
  - "採用建議" button
  - "忽略建議" button

#### Scenario: Adopt AI suggestion
- **GIVEN** teacher reviews AI suggestion
- **WHEN** teacher clicks "採用建議"
- **THEN** system auto-fills grading form with suggested scores
- **AND** teacher can still manually adjust before submitting

#### Scenario: Students cannot see AI suggestions
- **GIVEN** teacher has viewed AI grading suggestion
- **WHEN** student views their essay status
- **THEN** student sees:
  - Submission status (e.g., "已提交，等待批改")
  - Own essay content
  - AI feedback history (paragraph-level)
- **AND** student does NOT see:
  - AI grading suggestion
  - Teacher's grading form
- **ONLY AFTER** teacher submits final grade:
  - Student sees teacher's final score and comments

---

### Requirement: AI Grading Based on Final Version Only

The system SHALL ensure AI grading analyzes only the final submitted version of the essay, not the revision history.

#### Scenario: Ignore revision history
- **GIVEN** student has revised essay 10 times during writing process
- **AND** student has submitted final version
- **WHEN** teacher requests AI grading suggestion
- **THEN** Edge Function analyzes:
  - Final version of introduction paragraph
  - Final versions of all body paragraphs
  - Final version of conclusion paragraph
- **AND** does NOT consider:
  - Paragraph-level AI feedback history
  - Number of revisions
  - Writing behavior data (paste events, typing speed)

---

### Requirement: Separation of Format Requirements and Grading Standards

The system SHALL maintain clear separation between format requirements (used during writing) and grading standards (used for final evaluation).

#### Scenario: Format requirements drive paragraph feedback
- **GIVEN** student is writing body paragraph
- **WHEN** student requests AI feedback
- **THEN** `ai-feedback-agent` Edge Function uses:
  - Format specification (e.g., "honglou-essay" + teacher's custom requirements)
  - Checks for required elements, structure, analysis dimensions
- **AND** does NOT consider grading rubric criteria

#### Scenario: Grading standards drive final scoring
- **GIVEN** student has submitted complete essay
- **WHEN** teacher requests AI grading suggestion
- **THEN** `grading-agent` Edge Function uses:
  - Grading rubric (e.g., "IB MYP 中國古典文學")
  - Evaluates against four criteria descriptors
- **AND** does NOT strictly check format compliance
- **BUT** may consider format as part of "組織" criterion

---

### Requirement: Custom Grading Rubrics (Future Feature)

The system SHALL support teachers uploading custom grading rubrics (Phase 2).

#### Scenario: Teacher uploads custom rubric (Phase 2)
- **GIVEN** teacher has custom grading standard
- **WHEN** teacher clicks "上傳自定義評分標準"
- **THEN** system provides form to define:
  - Rubric name
  - Number of criteria (flexible)
  - Each criterion: name, max score, score descriptors
- **WHEN** teacher saves
- **THEN** system stores in `grading_rubrics` table
- **AND** rubric becomes available for teacher's assignments

**Note**: This is a Phase 2 feature, not included in MVP.

