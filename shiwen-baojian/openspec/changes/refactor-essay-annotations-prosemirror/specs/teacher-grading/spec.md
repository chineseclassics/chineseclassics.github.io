## MODIFIED Requirements
### Requirement: Student Essay Review Interface
The system SHALL allow teachers to view and annotate student essays at any time during writing.

#### Scenario: View writing essay
- **WHEN** a teacher opens a student's writing essay
- **THEN** the PM document is shown in read-only mode for content
- **AND** annotation tools are enabled (highlight + comment)

### Requirement: Paragraph-Level Annotations
The system SHALL attach annotations via text anchoring (not paragraph IDs) and display via decorations.

#### Scenario: Click highlight to focus card
- **WHEN** teacher clicks a highlight decoration
- **THEN** the corresponding sidebar card scrolls into view and pulses

### Requirement: Grading Submission and Status
The system SHALL treat final grading as the only state transition (writing → graded).
### Requirement: Respect Editor Mode (Read-only)
The system SHALL render teacher view consistent with assignment.writing_mode (outline in essay-structured, distraction-free in creative) while keeping content read-only.

#### Scenario: Mode-consistent rendering
- **WHEN** teacher opens a student's essay
- **THEN** the view uses the same mode-specific layout cues as student (read-only)

#### Scenario: Submit complete grading
- **WHEN** a teacher completes grading and clicks 提交批改
- **THEN** essay status becomes 'graded' and content becomes read-only for both sides


