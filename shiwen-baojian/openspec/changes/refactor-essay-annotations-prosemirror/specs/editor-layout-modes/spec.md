## ADDED Requirements
### Requirement: Editor Layout Modes
The system SHALL support two editor layout modes selected per assignment: `essay-structured`, `creative`.

#### Scenario: Mode selection by assignment
- **WHEN** a student opens an assignment
- **THEN** the editor loads with the layout mode specified by assignment.writing_mode

### Requirement: Essay-Structured Mode
The system SHALL provide structure guidance UI (intro/body sub-arguments/conclusion) over a single PM document.

#### Scenario: Structured outline overlay
- **WHEN** essay-structured mode is active
- **THEN** an outline/sidebar shows sections and sub-arguments
- **AND** students can add sub-arguments and paragraphs via UI controls
- **AND** each paragraph shows a "雨村評點" button

#### Scenario: Multi-paragraph sub-arguments
- **WHEN** a sub-argument needs multiple paragraphs
- **THEN** students can add multiple paragraphs under the sub-argument


### Requirement: Creative Mode
The system SHALL provide a distraction-free editor for creative writing; paragraph-level format checks are disabled. This mode is reserved for future enhancement.

#### Scenario: Distraction-free UI
- **WHEN** creative mode is active
- **THEN** the editor hides structure guidance and per-paragraph checks
- **AND** offers optional global suggestions (e.g.,靈感/風格建議)

### Requirement: Non-destructive Implementation
The system SHALL implement modes via plugins/overlays without changing PM JSON schema; annotations remain text-anchored.

#### Scenario: Annotations are independent of mode
- **WHEN** switching modes
- **THEN** existing annotations remain correctly anchored to text


