## MODIFIED Requirements
### Requirement: Hierarchical Paragraph Structure
The system SHALL support a single rich-text document with natural paragraphs (Enter) while preserving conceptual sections (introduction, body, conclusion) for AI purposes.

#### Scenario: Natural paragraphing
- **WHEN** a student presses Enter
- **THEN** a new paragraph node is created in the PM document
- **AND** no separate paragraph editors are spawned

#### Scenario: Section identification for AI
- **WHEN** the document is analyzed
- **THEN** the system identifies introduction/body/conclusion sections from text context
- **AND** exposes this to AI feedback without enforcing multiple editors

### Requirement: Quill.js Rich Text Editor Integration
The system SHALL use ProseMirror as the rich-text editor and store content as PM JSON.

#### Scenario: Basic text editing
- **WHEN** a student types
- **THEN** text is edited within a single PM editor instance
- **AND** styling and toolbar are limited to allowed features

### Requirement: Word Count Display
The system SHALL display real-time word count for the entire essay.
### Requirement: Mode-driven UI Overlays
The system SHALL render structure/controls based on editor layout mode (assignment.writing_mode) without altering PM JSON schema.

#### Scenario: Essay-structured controls
- **WHEN** essay-structured mode is active
- **THEN** UI provides: add sub-argument, add paragraph under sub-argument, per-paragraph "雨村評點" button
- **AND** restores the original structured essay writing interface with clear section guidance

#### Scenario: Creative controls
- **WHEN** creative mode is active
- **THEN** enable distraction-free toolbar and optional style/inspiration helpers; disable paragraph-level format checks
- 

#### Scenario: Essay-level word count
- **WHEN** a student writes
- **THEN** total word count updates based on PM doc text content


