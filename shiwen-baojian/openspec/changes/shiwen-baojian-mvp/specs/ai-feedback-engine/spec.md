# Delta for AI Feedback Engine

## ADDED Requirements

### Requirement: Format Specification Loading
The system SHALL load and parse the essay format specification from JSON.

#### Scenario: Load red mansion essay format
- **WHEN** the AI feedback engine initializes
- **THEN** it loads `honglou-essay-format.json` from assets/data
- **AND** parses all required elements, common errors, and sentence rules
- **AND** caches the specification for subsequent requests

#### Scenario: Invalid format specification
- **WHEN** the format JSON is malformed or missing
- **THEN** the system logs an error
- **AND** falls back to basic structure checking
- **AND** notifies administrators of the issue

### Requirement: Paragraph Type Identification
The system SHALL automatically identify paragraph types based on context and content.

#### Scenario: Introduction paragraph detection
- **WHEN** a paragraph is the first in an essay
- **OR** is explicitly marked as "introduction" type
- **THEN** the system applies introduction-specific checking rules

#### Scenario: Body paragraph detection
- **WHEN** a paragraph is within a sub-argument container
- **THEN** the system applies body paragraph checking rules
- **AND** considers the sub-argument context

#### Scenario: Conclusion paragraph detection
- **WHEN** a paragraph is the last in an essay
- **OR** is explicitly marked as "conclusion" type
- **THEN** the system applies conclusion-specific checking rules

### Requirement: Structural Completeness Checking
The system SHALL check if all required elements are present in each paragraph type.

#### Scenario: Complete introduction paragraph
- **WHEN** an introduction paragraph contains all 5 required elements:
  - Background Hook
  - Keyword Definition
  - Research Gap
  - Thesis Statement
  - Roadmap
- **THEN** feedback includes "✅ 段落结构完整，包含所有必需元素"

#### Scenario: Incomplete introduction paragraph
- **WHEN** an introduction paragraph is missing one or more required elements
- **THEN** feedback includes "⚠️ 段落结构不完整，缺少：[列出缺少的元素]"
- **AND** each missing element is explained with its purpose

#### Scenario: Complete body paragraph
- **WHEN** a body paragraph contains all 4 required elements:
  - Topic Sentence
  - Textual Evidence (at least 1)
  - Close Reading Analysis (> 60% of paragraph)
  - Concluding Sentence
- **THEN** feedback includes "✅ 正文段结构完整"

#### Scenario: Insufficient close reading
- **WHEN** a body paragraph's analysis is < 60% of content
- **THEN** feedback includes "⚠️ 文本分析不够深入，建议从具体的字/词/句进行细读"
- **AND** highlights the evidence-to-analysis ratio

### Requirement: Sentence-Level Feedback
The system SHALL provide sentence-level feedback pinpointing specific issues.

#### Scenario: Identify problematic sentence
- **WHEN** the 3rd sentence in a paragraph violates a rule
- **THEN** feedback includes "📍 第3句存在问题：[问题描述]"
- **AND** does NOT provide a corrected example
- **AND** provides thinking prompts instead

#### Scenario: Vague thesis statement
- **WHEN** sentence analysis detects the thesis statement is > 40 characters
- **OR** lacks clarity markers
- **THEN** feedback includes "⚠️ 论文主张过于笼统。请用一句话精炼地陈述你的核心论点。"
- **AND** does NOT show an example correction

#### Scenario: Missing topic sentence
- **WHEN** a body paragraph's first sentence is not a clear topic sentence
- **THEN** feedback includes "⚠️ 主题句不够清晰。建议明确表达本段要证明的分论点。"
- **AND** points to topic sentence markers from format spec

### Requirement: Common Error Detection
The system SHALL detect common errors based on pre-defined error patterns.

#### Scenario: Detect "only quote, no analysis" error
- **WHEN** a body paragraph contains long quotes but minimal analysis
- **THEN** feedback matches this to `body_error_2` in format spec
- **AND** provides the corresponding fix guidance
- **AND** marks severity as "major"

#### Scenario: Detect empty statements error
- **WHEN** analysis contains forbidden patterns like "这说明...", "这体现..."
- **THEN** feedback includes "⚠️ 分析空泛，避免使用'这说明'类表述"
- **AND** suggests analyzing specific words/characters instead

### Requirement: DeepSeek API Integration for Content Analysis
The system SHALL use DeepSeek API for deeper content analysis beyond structural checking.

#### Scenario: Analyze argument clarity
- **WHEN** structural checks pass
- **THEN** the system sends paragraph content to DeepSeek API
- **WITH** prompt: "分析论点是否清晰，证据是否充分，分析是否深入"
- **AND** incorporates DeepSeek response into feedback

#### Scenario: DeepSeek API timeout
- **WHEN** DeepSeek API does not respond within 5 seconds
- **THEN** the system proceeds with structural feedback only
- **AND** includes note "内容深度分析暂时不可用，请稍后重试"

#### Scenario: DeepSeek API rate limiting
- **WHEN** API rate limit is exceeded
- **THEN** the system queues the request
- **AND** shows "反馈生成中，请稍候..."
- **AND** completes when API is available

### Requirement: AI Grading Estimation (Teacher-Only)
The system SHALL generate grading estimation based on IB criteria, visible only to teachers.

#### Scenario: Estimate criterion A (Analysis) score
- **WHEN** generating feedback for a complete paragraph
- **THEN** the system estimates Criterion A score (0-8)
- **BASED ON** quality of close reading and textual analysis
- **AND** stores this in ai_feedback table with `teacher_only=true` flag

#### Scenario: Student cannot see AI grading
- **WHEN** a student views their AI feedback
- **THEN** grading estimation is NOT displayed
- **AND** only structural and content improvement suggestions are shown

#### Scenario: Teacher views AI grading reference
- **WHEN** a teacher views a student's essay
- **THEN** AI grading estimation is displayed as reference
- **AND** labeled as "AI 评分预估（仅供参考）"

### Requirement: Feedback Principles Enforcement
The system SHALL adhere to educational feedback principles to encourage independent thinking.

#### Scenario: No concrete修改 examples provided
- **WHEN** generating any feedback
- **THEN** the system NEVER provides specific rewrite examples
- **AND** only points out issues and思考 directions

#### Scenario: Encouraging prompts instead of answers
- **WHEN** detecting空泛 analysis
- **THEN** feedback asks "你能分析一下'瀟湘'这两个字的含义吗？"
- **INSTEAD OF** "瀟湘二字源自湘妃洒泪典故..."

#### Scenario: Critical warnings without blocking
- **WHEN** detecting severe issues (e.g., missing thesis)
- **THEN** feedback includes "🚨 严重问题：缺少论文主张"
- **BUT** does NOT prevent student from continuing to other paragraphs

### Requirement: Feedback Response Time
The system SHALL generate feedback within acceptable time limits.

#### Scenario: Simple structural check
- **WHEN** only structural checking is needed (no DeepSeek API)
- **THEN** feedback is generated within 1 second

#### Scenario: Full feedback with AI analysis
- **WHEN** both structural and DeepSeek analysis are performed
- **THEN** feedback is generated within 5 seconds
- **AND** progress indicator shows "正在分析..."

### Requirement: Feedback History Tracking
The system SHALL store all AI feedback for future reference and learning.

#### Scenario: Store feedback with version
- **WHEN** AI feedback is generated
- **THEN** it is stored in ai_feedback table linked to:
  - paragraph_id
  - paragraph_version (snapshot at time of feedback)
  - timestamp
  - feedback_json (complete feedback object)

#### Scenario: View feedback history
- **WHEN** a student views a paragraph with previous feedback
- **THEN** all historical feedback is available
- **AND** shows "上次反馈 (3 days ago): ..."
- **AND** allows expanding to see full history

