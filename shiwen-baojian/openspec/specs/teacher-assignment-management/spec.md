# teacher-assignment-management Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Create Writing Assignment
The system SHALL allow teachers to create writing assignments with format requirements and grading rubrics.

#### Scenario: Create assignment with built-in template
- **WHEN** teacher clicks "创建任务"
- **THEN** assignment creation interface is displayed
- **AND** a template selector shows:
  - 📚 红楼梦论文模板
  - 📝 议论文模板
  - ✏️ 自定义（空白模板）
- **WHEN** teacher selects "红楼梦论文模板"
- **THEN** format_spec_json is pre-filled with `honglou-essay-format.json`
- **AND** grading_rubric_json is pre-filled with IB MYP criteria

#### Scenario: Customize format requirements
- **WHEN** teacher selects custom template
- **THEN** a structured form editor is displayed with sections:
  - 引言要求（可添加/删除元素）
  - 正文要求（可定义分论点结构）
  - 结论要求（可定义元素）
- **AND** each element can be marked as required or optional

#### Scenario: Upload format file
- **WHEN** teacher clicks "上传格式文件"
- **THEN** file picker opens accepting .md or .json files
- **WHEN** a valid Markdown file is uploaded
- **THEN** system parses it into format_spec_json structure
- **AND** preview is shown for confirmation

#### Scenario: Set grading rubric
- **WHEN** teacher configures grading rubric
- **THEN** rubric editor shows:
  - IB MYP 标准（默认选中）
  - IB DP 标准
  - 自定义标准
- **WHEN** teacher selects IB MYP
- **THEN** four criteria (A, B, C, D) are configured
- **AND** each criterion has 0-8 score range with level descriptors

#### Scenario: Customize rubric
- **WHEN** teacher chooses to customize
- **THEN** they can:
  - Modify criterion names
  - Adjust score ranges
  - Edit level descriptors (1-2, 3-4, 5-6, 7-8)
  - Add custom criteria

#### Scenario: Set assignment details
- **WHEN** teacher fills assignment form
- **THEN** required fields are:
  - 任务标题 (e.g., "《红楼梦》研习论文")
  - 截止日期
  - 字数要求（默认 1500-2500）
- **AND** optional fields are:
  - 任务描述
  - 补充说明

#### Scenario: Save as draft
- **WHEN** teacher clicks "保存草稿"
- **THEN** assignment is saved with is_published = false
- **AND** students cannot see it yet
- **AND** teacher can continue editing later

#### Scenario: Publish assignment
- **WHEN** teacher clicks "发布任务"
- **AND** all required fields are filled
- **THEN** assignment is saved with is_published = true
- **AND** all students in the class can see it
- **AND** notification appears "任务已发布，学生现在可以看到"

### Requirement: View and Manage Assignments
The system SHALL provide teachers with an overview of all assignments.

#### Scenario: Display assignment list
- **WHEN** teacher views "我的任务" page
- **THEN** all assignments are listed showing:
  - 任务标题
  - 班级名称
  - 截止日期
  - 状态（草稿/已发布）
  - 提交情况（X/Y 已提交）
  - 批改进度（X/Y 已批改）

#### Scenario: Filter assignments
- **WHEN** teacher has multiple assignments
- **THEN** filter options are available:
  - 按状态（全部/草稿/已发布）
  - 按截止日期（即将到期/已过期/全部）
  - 按班级（当有多班级时）

#### Scenario: Quick stats per assignment
- **WHEN** hovering over an assignment card
- **THEN** tooltip shows:
  - 已提交：X/Y 人
  - 已批改：X/Y 人
  - 平均字数：XXXX
  - 平均 AI 反馈次数：X.X

### Requirement: Edit Assignment
The system SHALL allow teachers to edit draft assignments and update published assignments with restrictions.

#### Scenario: Edit draft assignment
- **WHEN** teacher clicks "编辑" on a draft assignment
- **THEN** assignment creation form opens with existing data
- **AND** all fields are editable
- **AND** teacher can save changes

#### Scenario: Edit published assignment with warning
- **WHEN** teacher attempts to edit a published assignment
- **THEN** warning appears "任务已发布，学生可能已开始写作。确定要修改吗？"
- **AND** if confirmed, format and rubric can be updated
- **BUT** changes affect new submissions only
- **AND** existing essays use original format

#### Scenario: Extend deadline
- **WHEN** teacher updates due_date on a published assignment
- **THEN** change takes effect immediately
- **AND** students see updated deadline
- **AND** notification "截止日期已延长至 [新日期]"

### Requirement: Delete Assignment
The system SHALL allow teachers to delete assignments with data handling.

#### Scenario: Delete draft assignment
- **WHEN** teacher deletes a draft assignment
- **THEN** confirmation dialog appears
- **AND** if confirmed, assignment is permanently deleted
- **AND** no student data is affected (since not published)

#### Scenario: Delete published assignment with essays
- **WHEN** teacher attempts to delete an assignment with student essays
- **THEN** warning appears "此任务有 X 篇学生作业，删除后无法恢复。确定删除？"
- **AND** requires second confirmation
- **AND** if confirmed, assignment and all related essays are cascade deleted

### Requirement: Duplicate Assignment
The system SHALL allow teachers to duplicate existing assignments for reuse.

#### Scenario: Duplicate assignment to new term
- **WHEN** teacher clicks "复制" on an assignment
- **THEN** a copy is created with:
  - Same format_spec_json and grading_rubric_json
  - Title appended with " (副本)"
  - Status set to 'draft'
  - New due_date (empty, requires setting)
- **AND** teacher can edit before publishing

