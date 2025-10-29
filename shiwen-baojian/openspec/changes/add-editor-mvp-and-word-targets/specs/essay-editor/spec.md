## RENAMED Requirements
- FROM: `### Requirement: Quill.js Rich Text Editor Integration`
- TO: `### Requirement: TipTap/ProseMirror Editor Integration`

## MODIFIED Requirements
### Requirement: TipTap/ProseMirror Editor Integration
The system SHALL use TipTap/ProseMirror as the rich text editor and provide a minimal, safe toolbar suitable for Chinese and English essay writing without altering the literal text content.

#### Scenario: Basic text editing with MVP toolbar
- **WHEN** a student types in the editor
- **THEN** text appears immediately (WYSIWYG)
- **AND** the following formatting tools are available:
  - Bold, Italic, Underline (marks that do not change text content)
  - Paragraph (default block)
  - Hard break (Shift+Enter)
  - Undo/Redo (History)
- **AND** distracting features (images, tables, code blocks) are not available

#### Scenario: Keyboard shortcuts (MVP)
- **WHEN** text is selected and Cmd/Ctrl+B is pressed
- **THEN** the selection becomes bold
- **WHEN** Cmd/Ctrl+I is pressed
- **THEN** the selection becomes italic
- **WHEN** Cmd/Ctrl+U is pressed
- **THEN** the selection becomes underlined
- **WHEN** Cmd/Ctrl+Z or Shift+Cmd/Ctrl+Z is pressed
- **THEN** the editor performs undo or redo

### Requirement: Word Count Display
The system SHALL display real-time bilingual counters and optionally a target range when provided by the assignment, without blocking input.

#### Scenario: Bilingual counters update in real time
- **WHEN** a student writes text
- **THEN** the following counters update with throttling to preserve IME performance:
  - zh_chars: Count of Chinese Han characters (exclude whitespace and punctuation)
  - en_words: Count of English words (letter sequences; exclude pure numbers and punctuation)
  - paragraphs: Count of Paragraph nodes

#### Scenario: Show target range when present
- **WHEN** the assignment provides a target range (min and/or max) for a primary metric (zh_chars or en_words)
- **THEN** the UI shows current value with the configured range (e.g., 712 / 600–800)
- **AND** displays a non-blocking status: below range, within range, or above range
- **AND** input remains unrestricted in all cases

#### Scenario: Hide range when not present
- **WHEN** the assignment provides no target range
- **THEN** the editor shows only counters without any range or warnings

## ADDED Requirements
### Requirement: Paste Sanitization and Plain Text Preference
The system SHALL sanitize pasted content to maintain clean text and stable anchors.

#### Scenario: Sanitize pasted content
- **WHEN** a student pastes content from external sources
- **THEN** the editor removes inline styles, colors, and external fonts
- **AND** disallows images and tables
- **AND** preserves basic paragraphs and line breaks
- **AND** the literal text content is not auto-transformed (no smart punctuation), ensuring annotation anchors remain stable
