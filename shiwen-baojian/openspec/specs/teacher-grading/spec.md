# teacher-grading Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Student Essay Review Interface
The system SHALL provide teachers with a read-only view of student essays with comprehensive context.

#### Scenario: View complete essay
- **WHEN** a teacher opens a student's essay for grading
- **THEN** the interface displays:
  - Student name and email
  - Assignment title and requirements
  - Complete essay structure (introduction, sub-arguments, paragraphs, conclusion)
  - Current status (draft, submitted, graded)
  - Submission timestamp

#### Scenario: View essay in read-only mode
- **WHEN** displaying student essay content
- **THEN** all text editors are in read-only mode
- **AND** teacher cannot modify student content
- **AND** formatting is preserved exactly as student wrote

### Requirement: Paragraph-Level Annotations
The system SHALL allow teachers to add comments and highlights on specific paragraphs.

#### Scenario: Add paragraph comment
- **WHEN** a teacher clicks "添加批注" on a paragraph
- **THEN** an annotation input box appears
- **AND** teacher can type feedback
- **AND** annotation is saved with timestamp and teacher_id

#### Scenario: Inline text highlighting
- **WHEN** a teacher selects text within a paragraph
- **AND** clicks "高亮批注"
- **THEN** the selected text is highlighted
- **AND** teacher can attach a comment to the highlight
- **AND** student sees the highlight when viewing feedback

#### Scenario: Multiple annotations per paragraph
- **WHEN** a paragraph has multiple teacher annotations
- **THEN** all annotations are displayed in chronological order
- **AND** each shows the teacher's name and timestamp

### Requirement: Revision History Timeline
The system SHALL display a complete timeline of student revisions.

#### Scenario: View revision timeline
- **WHEN** a teacher clicks "查看修改历史"
- **THEN** a timeline is displayed showing:
  - All paragraph versions
  - Timestamps of each revision
  - What changed (diff view)
  - AI feedback received at each version

#### Scenario: Compare two versions
- **WHEN** a teacher selects two versions from the timeline
- **THEN** a side-by-side diff is displayed
- **AND** additions are highlighted in green
- **AND** deletions are highlighted in red

#### Scenario: Timeline filtering
- **WHEN** revision timeline has many entries
- **THEN** teacher can filter by:
  - Specific paragraph
  - Date range
  - "Major revisions only" (versions with AI feedback)

### Requirement: AI Feedback History Display
The system SHALL show teachers all AI feedback given to students.

#### Scenario: View AI feedback chronology
- **WHEN** a teacher views an essay
- **THEN** AI feedback history is displayed for each paragraph
- **AND** shows:
  - Timestamp of feedback
  - Paragraph version at time of feedback
  - Complete feedback content
  - Whether student revised after feedback

#### Scenario: AI grading estimation visibility
- **WHEN** displaying AI feedback to teacher
- **THEN** the grading estimation section is visible
- **AND** labeled "AI 评分预估（仅供参考）"
- **AND** shows estimated scores for criteria A, B, C, D

### Requirement: Writing Integrity Report
The system SHALL generate and display writing integrity reports to teachers.

#### Scenario: View integrity summary
- **WHEN** a teacher views an essay
- **THEN** an integrity report card is displayed with:
  - Total paste count
  - Total pasted character count
  - Average typing speed (characters per minute)
  - Pause frequency
  - Anomaly score (0-100, based on pattern analysis)

#### Scenario: View detailed paste log
- **WHEN** a teacher clicks "查看粘贴详情"
- **THEN** a detailed log is shown with:
  - Timestamp of each paste
  - Length of pasted content
  - Which paragraph was affected
  - Preview of pasted text (first 100 characters)

#### Scenario: Suspicious activity flagging
- **WHEN** integrity report shows anomaly score > 70
- **THEN** the report is highlighted in red
- **AND** displays "⚠️ 检测到可疑写作模式，建议质询学生"

### Requirement: IB Criteria Grading Interface
The system SHALL provide a structured grading interface based on IB assessment criteria.

#### Scenario: Display rubric from assignment
- **WHEN** a teacher begins grading
- **THEN** the grading interface loads the rubric from assignment.grading_rubric_json
- **AND** displays all criteria (A, B, C, D) with level descriptors

#### Scenario: Score criterion A (Analysis)
- **WHEN** a teacher selects a score for Criterion A
- **THEN** score range 0-8 is available
- **AND** level descriptors (1-2, 3-4, 5-6, 7-8) are shown as reference
- **AND** AI estimated score is displayed as hint

#### Scenario: Add criterion-specific comment
- **WHEN** a teacher scores a criterion
- **THEN** an optional comment field is available
- **AND** teacher can explain the score reasoning

#### Scenario: All criteria required for submission
- **WHEN** a teacher attempts to submit grading
- **AND** not all criteria (A, B, C, D) have scores
- **THEN** validation error appears "请为所有标准评分"
- **AND** submission is blocked

### Requirement: Overall Comments
The system SHALL allow teachers to provide overall essay comments beyond criterion-specific feedback.

#### Scenario: Add overall comment
- **WHEN** a teacher writes in the "总评" text area
- **THEN** the comment is stored separately from criterion scores
- **AND** can be up to 2000 characters

#### Scenario: View overall comment as student
- **WHEN** a student views graded essay
- **THEN** overall comment is prominently displayed
- **AND** shown before criterion-specific scores

### Requirement: Grading Submission and Status
The system SHALL track grading completion and update essay status accordingly.

#### Scenario: Submit complete grading
- **WHEN** a teacher completes all scores and comments
- **AND** clicks "提交批改"
- **THEN** grading is saved to grades table
- **AND** essay status changes from 'submitted' to 'graded'
- **AND** student is notified (via UI, not email in MVP)

#### Scenario: Save draft grading
- **WHEN** a teacher partially completes grading
- **AND** clicks "保存草稿"
- **THEN** grading is saved with status 'draft'
- **AND** essay status remains 'submitted'
- **AND** teacher can continue later

#### Scenario: View grading history
- **WHEN** an essay has been graded
- **THEN** the grading record is retrievable with:
  - All criterion scores
  - All comments (criterion-specific and overall)
  - Grading teacher and timestamp
  - AI grading reference that was shown

