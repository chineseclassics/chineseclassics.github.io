# Delta for Essay Editor

## ADDED Requirements

### Requirement: Hierarchical Paragraph Structure
The system SHALL support a hierarchical essay structure with introduction, body (with sub-arguments), and conclusion sections.

#### Scenario: Create new essay with default structure
- **WHEN** a student opens a new assignment
- **THEN** the system creates an essay with default sections:
  - One introduction section
  - One body section (expandable to multiple sub-arguments)
  - One conclusion section

#### Scenario: Add new sub-argument
- **WHEN** a student clicks "添加分论点" button in the body section
- **THEN** a new sub-argument container is created
- **AND** the student can add multiple paragraphs under this sub-argument
- **AND** the sub-argument can be given a title

#### Scenario: Add paragraph under sub-argument
- **WHEN** a student clicks "添加段落" within a sub-argument
- **THEN** a new paragraph editor is created under that sub-argument
- **AND** the paragraph inherits the context of its parent sub-argument

### Requirement: Quill.js Rich Text Editor Integration
The system SHALL use Quill.js as the rich text editor for all paragraph content.

#### Scenario: Basic text editing
- **WHEN** a student types in a paragraph editor
- **THEN** the text appears immediately (WYSIWYG)
- **AND** basic formatting toolbar is available:
  - Bold, italic, underline
  - Text alignment
  - Lists (ordered/unordered)

#### Scenario: Quote formatting
- **WHEN** a student needs to quote from《红楼梦》
- **THEN** the blockquote tool is available in the toolbar
- **AND** quoted text is visually distinguished

#### Scenario: Toolbar customization
- **WHEN** the editor is initialized
- **THEN** only allowed formatting options are displayed
- **AND** potentially distracting features (images, videos, links) are hidden

### Requirement: Paragraph Type Management
The system SHALL track and enforce paragraph types (introduction, body, conclusion).

#### Scenario: Introduction paragraph constraints
- **WHEN** a student edits the introduction section
- **THEN** only one introduction paragraph is allowed
- **AND** AI feedback checks for introduction-specific requirements

#### Scenario: Body paragraph identification
- **WHEN** a student submits a body paragraph for feedback
- **THEN** the system identifies which sub-argument it belongs to
- **AND** provides context-aware feedback

#### Scenario: Conclusion paragraph constraints
- **WHEN** a student edits the conclusion section
- **THEN** only one conclusion paragraph is allowed
- **AND** AI feedback checks for conclusion-specific requirements

### Requirement: Paragraph Reordering
The system SHALL allow students to reorder paragraphs and sub-arguments via drag-and-drop.

#### Scenario: Reorder sub-arguments
- **WHEN** a student drags a sub-argument to a new position
- **THEN** the sub-argument and all its paragraphs move together
- **AND** the new order is saved automatically

#### Scenario: Reorder paragraphs within sub-argument
- **WHEN** a student drags a paragraph within the same sub-argument
- **THEN** only that paragraph moves
- **AND** the paragraph remains under the same sub-argument

#### Scenario: Cannot reorder sections
- **WHEN** a student attempts to reorder main sections (introduction, body, conclusion)
- **THEN** the operation is prevented
- **AND** sections remain in fixed order

### Requirement: Paragraph Deletion and Recovery
The system SHALL allow paragraph deletion with confirmation and soft delete for recovery.

#### Scenario: Delete paragraph with confirmation
- **WHEN** a student clicks the delete button on a paragraph
- **THEN** a confirmation dialog appears "确定删除此段落？"
- **AND** if confirmed, the paragraph is marked as deleted (soft delete)

#### Scenario: Recover deleted paragraph
- **WHEN** a student views version history
- **THEN** deleted paragraphs are shown with "(已删除)" label
- **AND** the student can restore a deleted paragraph

### Requirement: Word Count Display
The system SHALL display real-time word count for the entire essay and individual paragraphs.

#### Scenario: Essay-level word count
- **WHEN** a student writes in any paragraph
- **THEN** the total essay word count updates immediately
- **AND** is displayed as "总字数: 1234 / 1500-2500"

#### Scenario: Word count validation
- **WHEN** the total word count is below 1500
- **THEN** a warning is displayed "字数不足，至少需要 1500 字"
- **WHEN** the total word count exceeds 2500
- **THEN** a warning is displayed "字数过多，建议不超过 2500 字"

#### Scenario: Paragraph-level word count
- **WHEN** a student hovers over a paragraph
- **THEN** the paragraph word count is displayed
- **AND** helps the student balance paragraph lengths

### Requirement: Editor Performance
The system SHALL maintain responsive performance even with long essays.

#### Scenario: Large text handling
- **WHEN** an essay reaches 2500 words (upper limit)
- **THEN** typing response time remains < 100ms
- **AND** scrolling is smooth without lag

#### Scenario: Multiple paragraph editors
- **WHEN** an essay has 10+ paragraphs open
- **THEN** each editor initializes within 500ms
- **AND** editing in one paragraph does not affect others

### Requirement: Keyboard Shortcuts
The system SHALL support common keyboard shortcuts for efficient editing.

#### Scenario: Save shortcut
- **WHEN** a student presses Cmd+S (Mac) or Ctrl+S (Windows)
- **THEN** the essay is saved immediately
- **AND** a "已保存" notification appears

#### Scenario: Formatting shortcuts
- **WHEN** text is selected and Cmd/Ctrl+B is pressed
- **THEN** the selected text becomes bold

#### Scenario: Paragraph navigation
- **WHEN** a student presses Tab in a paragraph editor
- **THEN** focus moves to the next paragraph editor
- **WHEN** Shift+Tab is pressed
- **THEN** focus moves to the previous paragraph editor

