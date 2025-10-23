# student-assignment-view Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Assignment List Display
The system SHALL display all available assignments to students in their class.

#### Scenario: View assignment list
- **WHEN** a student logs in and navigates to dashboard
- **THEN** all published assignments for their class are displayed
- **AND** each assignment card shows:
  - 任务标题
  - 截止日期（倒计时或已过期）
  - 状态（未开始/进行中/已提交/已批改）
  - 字数要求

#### Scenario: Assignment status indicators
- **WHEN** displaying assignments
- **THEN** status is visually distinguished:
  - 🔵 未开始（灰色，"开始写作" 按钮）
  - 🟡 进行中（黄色，"继续写作" 按钮，显示进度条）
  - 🟢 已提交（绿色，"查看作业" 按钮）
  - ⭐ 已批改（蓝色，显示分数，"查看评分" 按钮）

#### Scenario: Due date warning
- **WHEN** assignment due date is within 3 days
- **THEN** deadline is highlighted in orange
- **AND** shows "还剩 X 天 Y 小时"
- **WHEN** assignment is overdue
- **THEN** deadline is highlighted in red
- **AND** shows "已逾期 X 天"

#### Scenario: Sort and filter options
- **WHEN** student has multiple assignments
- **THEN** sorting options are available:
  - 按截止日期（最近到期优先）
  - 按状态
  - 按创建时间
- **AND** filter options:
  - 全部
  - 进行中
  - 已提交
  - 已批改

### Requirement: Assignment Detail View
The system SHALL show detailed assignment information before student starts writing.

#### Scenario: View assignment details
- **WHEN** student clicks on an assignment card
- **THEN** assignment detail page displays:
  - 完整的任务描述
  - 格式要求概览
  - 评分标准说明
  - 截止日期
  - 字数要求
  - 老师补充说明

#### Scenario: Preview format requirements
- **WHEN** student views format requirements
- **THEN** a structured checklist is shown:
  - ✓ 引言必需元素（背景、定义、缺口、主张、预告）
  - ✓ 正文必需元素（主题句、证据、细读、总结）
  - ✓ 结论必需元素（重申、总结、引申）

#### Scenario: View grading rubric
- **WHEN** student clicks "查看评分标准"
- **THEN** IB criteria table is displayed
- **WITH** level descriptors for each score range
- **AND** helps student understand expectations

### Requirement: Start Essay Writing
The system SHALL allow students to start writing an essay for an assignment.

#### Scenario: Start new essay
- **WHEN** student clicks "开始写作" on an unstarted assignment
- **THEN** an essay record is created with status 'draft'
- **AND** student is redirected to essay editor
- **AND** editor is initialized with default structure:
  - 1 introduction paragraph
  - 1 sub-argument container
  - 1 conclusion paragraph

#### Scenario: Continue existing essay
- **WHEN** student clicks "继续写作" on in-progress assignment
- **THEN** student is redirected to essay editor
- **AND** editor loads existing content from database
- **AND** scroll position is restored to last edit location

#### Scenario: View submitted essay
- **WHEN** student clicks "查看作业" on submitted essay
- **THEN** essay is displayed in read-only mode
- **AND** all AI feedback history is visible
- **AND** "修改作业" option is available if not graded

#### Scenario: View graded essay
- **WHEN** student clicks "查看评分" on graded essay
- **THEN** essay is displayed with:
  - Teacher's annotations visible
  - Criterion scores and comments
  - Overall comment from teacher
  - AI feedback history (for reference)
- **AND** essay cannot be edited (finalized)

### Requirement: Essay Submission
The system SHALL allow students to submit completed essays to teachers.

#### Scenario: Submit essay for grading
- **WHEN** student clicks "提交论文" button
- **THEN** validation checks are performed:
  - 字数是否在要求范围内（1500-2500）
  - 所有必需段落是否完成
- **WHEN** validation passes
- **THEN** confirmation dialog "确定提交？提交后将无法修改"
- **AND** if confirmed:
  - Essay status changes to 'submitted'
  - submitted_at timestamp is set
  - Version snapshots created for all paragraphs

#### Scenario: Word count validation before submission
- **WHEN** total word count < min_word_count (e.g., 1500)
- **THEN** warning appears "字数不足，至少需要 1500 字（当前：XXX 字）"
- **AND** submission is blocked
- **WHEN** total word count > max_word_count (e.g., 2500)
- **THEN** warning appears "字数过多，建议不超过 2500 字（当前：XXX 字）"
- **AND** submission is allowed but shows warning

#### Scenario: Unsubmit essay (before grading)
- **WHEN** student realizes they want to make changes after submission
- **AND** essay has not been graded yet
- **THEN** "撤回提交" option is available
- **WHEN** clicked
- **THEN** essay status returns to 'draft'
- **AND** student can continue editing

### Requirement: Progress Tracking
The system SHALL show students their writing progress for each assignment.

#### Scenario: Display progress indicator
- **WHEN** student is writing an essay
- **THEN** progress indicators are shown:
  - 段落完成度（X/Y 段落已有内容）
  - 字数进度（XXX / 1500-2500）
  - AI 反馈次数（已获得 X 次反馈）
  - 版本快照数（已保存 X 个版本）

#### Scenario: Suggest next steps
- **WHEN** student pauses on in-progress essay
- **THEN** smart suggestions appear:
  - "引言已完成，建议添加第一个分论点"
  - "正文段 2 还未提交 AI 反馈，建议获取反馈"
  - "当前字数 1234，还需约 300 字"

