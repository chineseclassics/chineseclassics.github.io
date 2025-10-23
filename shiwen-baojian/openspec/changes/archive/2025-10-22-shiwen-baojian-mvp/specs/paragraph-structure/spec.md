# Delta for Paragraph Structure Management

## ADDED Requirements

### Requirement: Hierarchical Structure Initialization
The system SHALL initialize essays with a default hierarchical structure.

#### Scenario: Create default essay structure
- **WHEN** a student starts a new essay
- **THEN** the following structure is created automatically:
  - 1 introduction section (fixed, cannot add more)
  - 1 body section container
    - 1 default sub-argument ("分论点一")
      - 1 empty paragraph
  - 1 conclusion section (fixed, cannot add more)

#### Scenario: Section order enforcement
- **WHEN** displaying essay structure
- **THEN** sections are always in fixed order:
  1. Introduction
  2. Body (with sub-arguments)
  3. Conclusion
- **AND** sections cannot be reordered
- **AND** introduction and conclusion cannot be deleted

### Requirement: Sub-Argument Management
The system SHALL allow students to add, edit, reorder, and delete sub-arguments in the body section.

#### Scenario: Add new sub-argument
- **WHEN** student clicks "添加分论点" in body section
- **THEN** a new sub-argument container is created
- **AND** automatically titled "分论点 [N]" (N = current count + 1)
- **AND** contains one empty paragraph
- **AND** positioned after existing sub-arguments

#### Scenario: Edit sub-argument title
- **WHEN** student clicks on sub-argument title
- **THEN** title becomes editable inline
- **AND** student can rename it (e.g., "分论点一：园林命名的暗示")
- **WHEN** pressing Enter or clicking outside
- **THEN** new title is saved automatically

#### Scenario: Reorder sub-arguments via drag-and-drop
- **WHEN** student drags a sub-argument container by its header
- **THEN** visual drag indicator appears
- **AND** drop zones between other sub-arguments are highlighted
- **WHEN** dropped in new position
- **THEN** sub-argument and all its paragraphs move together
- **AND** order_index is updated in database

#### Scenario: Delete sub-argument with confirmation
- **WHEN** student clicks delete button on a sub-argument
- **THEN** confirmation dialog "删除此分论点及其所有段落？（可从历史版本恢复）"
- **AND** if confirmed:
  - Sub-argument is soft deleted
  - All child paragraphs are soft deleted
  - Can be restored from version history

#### Scenario: Minimum sub-arguments requirement
- **WHEN** student attempts to delete the last remaining sub-argument
- **THEN** operation is prevented
- **AND** message "至少需要保留一个分论点"

### Requirement: Paragraph Management within Sub-Arguments
The system SHALL allow students to add, reorder, and delete paragraphs within a sub-argument.

#### Scenario: Add paragraph under sub-argument
- **WHEN** student clicks "添加段落" within a sub-argument
- **THEN** a new paragraph editor is created
- **AND** positioned at the end of that sub-argument
- **AND** paragraph type is automatically set to 'body'
- **AND** paragraph inherits sub-argument context

#### Scenario: Reorder paragraphs within sub-argument
- **WHEN** student drags a paragraph within the same sub-argument
- **THEN** paragraph moves to new position
- **AND** order_index is updated
- **AND** paragraph remains under the same sub-argument

#### Scenario: Cannot move paragraph across sub-arguments
- **WHEN** student attempts to drag a paragraph to a different sub-argument
- **THEN** drop is not allowed (visual feedback)
- **AND** message "段落不能跨分论点移动，请使用复制粘贴"

#### Scenario: Delete paragraph
- **WHEN** student clicks delete on a paragraph
- **THEN** confirmation "删除此段落？"
- **AND** if confirmed, paragraph is soft deleted
- **AND** can be restored from version history

### Requirement: Section Context Awareness
The system SHALL track which section and sub-argument each paragraph belongs to for context-aware AI feedback.

#### Scenario: Identify paragraph context for AI
- **WHEN** student submits a paragraph for AI feedback
- **THEN** system includes context information:
  - paragraph_type ('introduction', 'body', 'conclusion')
  - sub_argument_id (if applicable)
  - sub_argument_title (for better AI understanding)
  - position in essay (paragraph X of Y)
  - position in sub-argument (paragraph X of Y within this sub-argument)

#### Scenario: Context-aware feedback for multi-paragraph sub-argument
- **WHEN** a sub-argument has multiple paragraphs
- **AND** student submits the 2nd paragraph
- **THEN** AI feedback considers:
  - This is a continuation of the sub-argument theme
  - Should build upon or complement the 1st paragraph
  - Should not repeat the sub-argument topic sentence

### Requirement: Visual Structure Indicators
The system SHALL provide visual cues to help students understand the essay structure.

#### Scenario: Display structure overview
- **WHEN** essay editor is open
- **THEN** a collapsible structure outline is shown (sidebar or top):
  ```
  📄 论文结构
  ├── 📝 引言
  ├── 📚 正文
  │   ├── 📌 分论点一：园林命名暗示
  │   │   ├── 段落 1
  │   │   └── 段落 2
  │   ├── 📌 分论点二：竹林意象
  │   │   └── 段落 1
  │   └── ➕ 添加分论点
  └── 📝 结论
  ```

#### Scenario: Navigate via structure outline
- **WHEN** student clicks on a paragraph in the outline
- **THEN** editor scrolls to that paragraph
- **AND** paragraph is highlighted briefly

#### Scenario: Expand/collapse sections
- **WHEN** student clicks on a section header in outline
- **THEN** that section's paragraphs expand or collapse
- **AND** helps focus on specific sections

### Requirement: Structure Validation
The system SHALL validate that essay structure meets minimum requirements.

#### Scenario: Check minimum structure before submission
- **WHEN** student attempts to submit essay
- **THEN** system validates:
  - At least 1 introduction paragraph exists
  - At least 2 sub-arguments exist (can be configured)
  - At least 1 paragraph per sub-argument
  - At least 1 conclusion paragraph exists

#### Scenario: Structural warnings during writing
- **WHEN** student has been writing for > 30 minutes
- **AND** only has 1 sub-argument
- **THEN** gentle reminder "通常论文需要 2-3 个分论点来支撑主张"
- **BUT** not blocking, just a suggestion

