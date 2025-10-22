# Teacher Assignment Management

## ADDED Requirements

### Requirement: Assignment Creation Workflow

The system SHALL provide a multi-step workflow for teachers to create writing assignments, now including custom format specification and grading rubric selection.

#### Scenario: Create assignment with custom format
- **GIVEN** teacher clicks "創建新任務"
- **WHEN** following assignment creation workflow
- **THEN** teacher completes these steps:
  1. **基本信息**: title, description, deadline
  2. **班級選擇**: select target class
  3. **格式要求**: select or create format specification ← **NEW**
  4. **評分標準**: select grading rubric ← **NEW**
  5. **預覽確認**: review all settings
  6. **發布**: publish assignment
- **WHEN** teacher publishes
- **THEN** assignment record includes:
  - `format_spec_id`: UUID (reference to custom or system format)
  - `grading_rubric_id`: UUID (reference to rubric)

#### Scenario: Select existing custom format
- **GIVEN** teacher is on "格式要求" step
- **WHEN** viewing format options
- **THEN** teacher sees:
  - System built-in formats (e.g., "紅樓夢論文格式")
  - Teacher's custom formats (e.g., "張老師紅樓梦人物分析 2025")
  - Shared formats from colleagues (if any)
- **WHEN** teacher selects custom format
- **THEN** system shows format preview
- **AND** teacher can proceed to next step

#### Scenario: Create new custom format during assignment creation
- **GIVEN** teacher is on "格式要求" step
- **WHEN** teacher clicks "創建新格式"
- **THEN** system opens format editor (Quill.js)
- **AND** teacher can:
  - Choose base template (optional)
  - Write requirements in natural language
  - Submit to AI for parsing
  - Confirm AI understanding
  - Name and save format
- **WHEN** format is saved
- **THEN** system returns to assignment creation
- **AND** new format is auto-selected

---

## ADDED Requirements

### Requirement: Format Export in Assignment Context

The system SHALL allow teachers to export assignment format specifications for sharing with students.

#### Scenario: Export format as Markdown
- **GIVEN** teacher has created assignment with custom format
- **WHEN** teacher clicks "導出格式要求"
- **THEN** system generates Markdown file containing:
  - Assignment title and description
  - Word count and paragraph count requirements
  - Content-specific requirements
  - Analysis dimensions and checks
- **AND** downloads as `{assignment_name}_格式要求.md`

#### Scenario: Share format document with students
- **GIVEN** teacher has exported format as Markdown
- **WHEN** teacher distributes file via email/Google Classroom
- **THEN** students can read requirements in any text editor
- **AND** format matches what AI will check during writing

