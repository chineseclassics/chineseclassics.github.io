# database-schema Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: User Table Schema
The system SHALL maintain a users table to store teacher and student profiles.

#### Scenario: User record structure
- **WHEN** a new user is created
- **THEN** the users table stores:
  - id (UUID, from Google OAuth sub)
  - email (TEXT, unique)
  - display_name (TEXT)
  - role (TEXT, 'teacher' or 'student')
  - created_at (TIMESTAMP)
  - last_login (TIMESTAMP)

#### Scenario: Unique email constraint
- **WHEN** attempting to create a user with existing email
- **THEN** the database returns unique constraint violation
- **AND** the application updates existing user instead

### Requirement: Class Table Schema
The system SHALL support class management with single-class MVP and multi-class extensibility.

#### Scenario: Class record structure
- **WHEN** a teacher creates a class
- **THEN** the classes table stores:
  - id (UUID)
  - teacher_id (UUID, references users)
  - class_name (TEXT)
  - created_at (TIMESTAMP)
  - is_active (BOOLEAN, default true)

#### Scenario: Class membership tracking
- **WHEN** students are added to a class
- **THEN** the class_members junction table stores:
  - class_id (UUID)
  - student_id (UUID)
  - added_at (TIMESTAMP)

### Requirement: Assignment Table Schema
The system SHALL store writing assignments with format requirements and grading rubrics.

#### Scenario: Assignment record structure
- **WHEN** a teacher creates an assignment
- **THEN** the assignments table stores:
  - id (UUID)
  - class_id (UUID, references classes)
  - title (TEXT, e.g., "《红楼梦》论文")
  - description (TEXT)
  - format_spec_json (JSONB, format requirements)
  - grading_rubric_json (JSONB, IB criteria)
  - due_date (TIMESTAMP)
  - created_at (TIMESTAMP)

#### Scenario: Format spec JSON structure
- **WHEN** format_spec_json is queried
- **THEN** it contains the complete format specification with:
  - paragraph_types (introduction, body, conclusion)
  - required_elements per type
  - sentence_level_rules
  - common_errors

### Requirement: Essay and Hierarchy Tables
The system SHALL support hierarchical essay structure with essays, sub-arguments, and paragraphs.

#### Scenario: Essay record creation
- **WHEN** a student starts working on an assignment
- **THEN** an essay record is created:
  - id (UUID)
  - assignment_id (UUID)
  - student_id (UUID)
  - status ('draft', 'submitted', 'graded')
  - submitted_at (TIMESTAMP, nullable)
  - created_at (TIMESTAMP)

#### Scenario: Sub-argument record
- **WHEN** a student creates a sub-argument in the body section
- **THEN** a sub_arguments record stores:
  - id (UUID)
  - essay_id (UUID)
  - title (TEXT, e.g., "分论点一：园林命名的暗示")
  - order_index (INTEGER)
  - created_at (TIMESTAMP)

#### Scenario: Paragraph record with hierarchy
- **WHEN** a student writes a paragraph
- **THEN** the paragraphs table stores:
  - id (UUID)
  - essay_id (UUID)
  - sub_argument_id (UUID, nullable for intro/conclusion)
  - paragraph_type ('introduction', 'body', 'conclusion')
  - content (TEXT, Quill delta JSON)
  - order_index (INTEGER)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

### Requirement: Version History Schema
The system SHALL track paragraph version history for audit and recovery.

#### Scenario: Create version snapshot
- **WHEN** a student submits a paragraph for AI feedback
- **THEN** a record is created in paragraph_versions table:
  - id (UUID)
  - paragraph_id (UUID)
  - content (TEXT, snapshot of Quill delta)
  - created_at (TIMESTAMP)
  - trigger ('ai_feedback', 'manual_save', 'auto_save')

#### Scenario: Query version history
- **WHEN** retrieving version history for a paragraph
- **THEN** versions are returned in chronological order
- **AND** each version includes timestamp and trigger type

### Requirement: AI Feedback Storage
The system SHALL persist all AI feedback with sentence-level annotations.

#### Scenario: Store comprehensive feedback
- **WHEN** AI generates feedback for a paragraph
- **THEN** a record is created in ai_feedback table:
  - id (UUID)
  - paragraph_id (UUID)
  - paragraph_version_id (UUID)
  - feedback_json (JSONB, complete feedback structure)
  - ai_grading_json (JSONB, teacher-only grading estimation)
  - generated_at (TIMESTAMP)

#### Scenario: Feedback JSON structure
- **WHEN** feedback_json is queried
- **THEN** it contains:
  - structure_check (completeness, missing_elements)
  - sentence_level_issues (array of {sentence_num, issue, suggestion})
  - content_analysis (clarity, evidence, depth)
  - severity_level (critical, major, minor, suggestion)

### Requirement: Writing Behavior Tracking
The system SHALL record student writing behavior for integrity analysis.

#### Scenario: Paste event logging
- **WHEN** a student pastes content into the editor
- **THEN** a record is created in writing_events table:
  - id (UUID)
  - paragraph_id (UUID)
  - event_type ('paste')
  - event_data (JSONB: {content_length, timestamp})
  - created_at (TIMESTAMP)

#### Scenario: Typing pattern recording
- **WHEN** the system detects significant typing events
- **THEN** writing_events records store:
  - event_type ('typing_burst', 'long_pause', 'rapid_delete')
  - event_data (JSONB: {duration, character_count, speed})

#### Scenario: Generate integrity report
- **WHEN** a teacher requests the integrity report
- **THEN** the system aggregates all writing_events for an essay
- **AND** calculates:
  - total_paste_count
  - total_paste_length
  - average_typing_speed
  - pause_frequency
  - anomaly_score (0-100)

### Requirement: Teacher Annotations Storage
The system SHALL store teacher annotations on student paragraphs.

#### Scenario: Create annotation
- **WHEN** a teacher adds a comment to a paragraph
- **THEN** a record is created in annotations table:
  - id (UUID)
  - paragraph_id (UUID)
  - teacher_id (UUID)
  - content (TEXT, teacher's comment)
  - highlight_start (INTEGER, nullable, for inline highlights)
  - highlight_end (INTEGER, nullable)
  - created_at (TIMESTAMP)

#### Scenario: Multiple annotations per paragraph
- **WHEN** a teacher adds multiple comments to one paragraph
- **THEN** each annotation is stored separately
- **AND** all are retrieved when viewing the paragraph

### Requirement: Row-Level Security (RLS)
The system SHALL enforce data access permissions via Supabase RLS policies.

#### Scenario: Student can only view own essays
- **WHEN** a student queries the essays table
- **THEN** RLS policy returns only essays where student_id = auth.uid()

#### Scenario: Teacher can view class essays
- **WHEN** a teacher queries essays
- **THEN** RLS returns essays where:
  - assignment.class_id IN (teacher's classes)

#### Scenario: AI feedback access
- **WHEN** a student queries ai_feedback table
- **THEN** grading estimation fields are filtered out (teacher_only)
- **WHEN** a teacher queries ai_feedback
- **THEN** all fields including grading estimation are returned

