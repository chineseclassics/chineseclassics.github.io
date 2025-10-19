# AI Format Specification Generator

## ADDED Requirements

### Requirement: Natural Language Format Parsing

The system SHALL provide an AI-powered Edge Function that parses teacher's natural language requirements and converts them into structured JSON format specifications.

#### Scenario: Parse word count requirement
- **GIVEN** teacher inputs "论文总字数 1800-2000 字"
- **WHEN** Edge Function processes the text
- **THEN** system extracts:
  ```json
  {
    "constraints": {
      "total_word_count": {
        "min": 1800,
        "max": 2000
      }
    }
  }
  ```

#### Scenario: Parse paragraph count requirement
- **GIVEN** teacher inputs "必须包含 3 个分论点"
- **WHEN** Edge Function processes the text
- **THEN** system extracts:
  ```json
  {
    "constraints": {
      "paragraph_count": {
        "body_paragraphs": 3
      }
    }
  }
  ```

#### Scenario: Parse content-specific requirement
- **GIVEN** teacher inputs "详细分析红楼梦中林黛玉和薛宝钗的外貌描写，每个人物不少于 300 字"
- **WHEN** Edge Function processes the text
- **THEN** system extracts:
  ```json
  {
    "content_requirements": [
      {
        "type": "content_focus",
        "description": "红楼梦人物外貌描写分析",
        "specific_criteria": [
          "分析林黛玉的外貌描写",
          "分析薛宝钗的外貌描写",
          "每个人物分析不少于 300 字"
        ],
        "analysis_dimension": {
          "name": "人物外貌描写分析深度",
          "checks": [
            "是否引用原文中的外貌描写",
            "是否分析外貌描写的象征意义",
            "是否联系人物性格和命运"
          ]
        }
      }
    ]
  }
  ```

---

### Requirement: Intelligent Template Merging

The system SHALL intelligently merge teacher's requirements with system built-in templates, resolving conflicts by prioritizing teacher's requirements.

#### Scenario: Merge with system template
- **GIVEN** teacher selects "honglou-essay" as base template
- **AND** teacher adds "必须 3 个分论点，总字数 1800-2000 字"
- **WHEN** Edge Function merges requirements
- **THEN** system produces merged specification containing:
  - All original template's analysis dimensions
  - Additional constraints from teacher
  - Combined content requirements

#### Scenario: Conflict resolution - teacher overrides template
- **GIVEN** system template does not limit paragraph count
- **AND** teacher requires "必须 3 个分论点"
- **WHEN** conflict is detected
- **THEN** system resolves:
  ```json
  {
    "conflicts_resolved": [
      {
        "item": "正文段落数量",
        "system_template": "不限制",
        "teacher_requirement": "必须 3 个",
        "resolution": "采用老师要求"
      }
    ]
  }
  ```
- **AND** final specification uses teacher's requirement

#### Scenario: No base template - fully custom
- **GIVEN** teacher does not select a system template
- **WHEN** Edge Function processes requirements
- **THEN** system creates fully custom specification
- **AND** all paragraph types and analysis dimensions come from teacher's requirements
- **AND** `based_on` field is NULL

---

### Requirement: Understanding Confirmation

The system SHALL present AI's understanding of teacher's requirements in human-readable format for confirmation.

#### Scenario: Display understanding summary
- **GIVEN** AI has parsed teacher's requirements
- **WHEN** displaying results to teacher
- **THEN** system shows:
  - **Word count**: min-max range or target
  - **Paragraph count**: specific numbers for each type
  - **Content focus**: main themes or topics
  - **Specific criteria**: bullet list of detailed requirements
  - **Conflicts resolved**: list of conflicts and how they were handled

#### Scenario: Teacher confirms understanding
- **GIVEN** teacher reviews understanding summary
- **WHEN** teacher clicks "确认"
- **THEN** system saves the generated JSON specification
- **AND** creates new custom format record in database

#### Scenario: Teacher rejects understanding
- **GIVEN** teacher reviews understanding summary
- **WHEN** teacher clicks "重新编辑"
- **THEN** system returns to editor
- **AND** previous text is preserved
- **AND** teacher can modify and resubmit

---

### Requirement: Edge Function Implementation

The system SHALL implement a Supabase Edge Function `format-spec-generator` that handles format generation requests.

#### Scenario: Successful API call
- **GIVEN** valid teacher requirements and optional template ID
- **WHEN** Edge Function is invoked
- **THEN** function returns status 200
- **AND** response contains:
  ```json
  {
    "success": true,
    "understood_requirements": { /* summary */ },
    "merged_specification": { /* complete JSON */ },
    "conflicts_resolved": [ /* list */ ]
  }
  ```

#### Scenario: DeepSeek API integration
- **GIVEN** Edge Function receives request
- **WHEN** calling DeepSeek API
- **THEN** function uses carefully crafted system prompt
- **AND** prompt includes:
  - Instructions to identify word count patterns
  - Instructions to identify paragraph count patterns
  - Instructions to identify content-specific requirements
  - Examples of valid JSON output
- **AND** function handles API errors gracefully

#### Scenario: Processing time under 10 seconds
- **GIVEN** typical teacher requirements (< 500 characters)
- **WHEN** Edge Function processes request
- **THEN** total processing time < 10 seconds
- **AND** includes time for:
  - Loading system template (if any)
  - DeepSeek API call
  - Merging logic
  - Conflict detection

---

### Requirement: Error Handling

The system SHALL handle parsing failures and ambiguous requirements gracefully.

#### Scenario: AI parsing fails
- **GIVEN** teacher's requirements are unclear or ambiguous
- **WHEN** AI cannot confidently parse requirements
- **THEN** system returns error with helpful message
- **AND** suggests teacher to:
  - Rephrase requirements more clearly
  - Provide specific numbers (e.g., "1800-2000 字" instead of "较长")
  - Separate different requirements into bullet points

#### Scenario: DeepSeek API timeout
- **GIVEN** Edge Function calls DeepSeek API
- **WHEN** API does not respond within timeout period
- **THEN** function returns error status 503
- **AND** error message suggests teacher to retry

#### Scenario: Invalid system template ID
- **GIVEN** teacher selects a system template
- **WHEN** template ID does not exist
- **THEN** function returns error status 404
- **AND** error message lists available templates

