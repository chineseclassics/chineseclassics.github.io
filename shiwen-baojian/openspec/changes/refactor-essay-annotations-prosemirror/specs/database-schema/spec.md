## MODIFIED Requirements
### Requirement: Essay and Hierarchy Tables
The system SHALL store essay content as ProseMirror JSON in essays.content_json. The paragraphs table remains for legacy read-only fallback.

#### Scenario: Essay record creation
- **WHEN** a student starts writing
- **THEN** an essays record is created with status 'writing' (legacy 'draft' mapped to 'writing')
- **AND** content_json persists PM JSON for the entire document

### Requirement: Teacher Annotations Storage
The system SHALL store text anchoring fields in annotations for resilient mapping.

#### Scenario: Create annotation with anchoring
- **WHEN** a teacher adds an annotation
- **THEN** annotations table stores:
  - text_start (INTEGER, nullable)
  - text_end (INTEGER, nullable)
  - text_quote (TEXT, nullable)
  - text_prefix (TEXT, nullable)
  - text_suffix (TEXT, nullable)
  - anchor_version (INTEGER, default 1)

### Requirement: Status Semantics
The system SHALL simplify essay status to 'writing' and 'graded'.
### Requirement: Assignment Writing Mode
The system SHALL store editor layout mode per assignment.

#### Scenario: Assignment mode columns
- **WHEN** a teacher creates an assignment
- **THEN** assignments table stores:
  - writing_mode (TEXT, one of: 'essay-structured','creative', default: 'essay-structured')
  - editor_layout_json (JSONB, optional, layout configuration like word goals, outline templates)
- 

#### Scenario: Finalize grading
- **WHEN** teacher submits grading
- **THEN** essays.status = 'graded' and the essay becomes read-only


