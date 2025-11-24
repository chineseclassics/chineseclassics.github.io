## ADDED Requirements
### Requirement: Graded Essay DOCX Export
The system SHALL allow students to download a DOCX file of graded essays that preserves teacher annotations and overall feedback.

#### Scenario: Show export control
- **WHEN** a student opens a graded essay view
- **THEN** a "導出 Word" action is visible
- **AND** it is disabled/hidden for drafts or submissions without final grading

#### Scenario: Generate annotated DOCX
- **WHEN** a student clicks the export action
- **THEN** the system fetches essay content, teacher annotations, and grades
- **AND** generates a DOCX where:
  - Paragraph hierarchy matches the original submission
  - Teacher annotations appear as Word comments anchored to the same sentences
  - Teacher overall comment and scores append to the document ending
- **AND** browser download starts with a descriptive filename

#### Scenario: Handle export errors
- **WHEN** DOCX generation fails (network or serialization issue)
- **THEN** the student sees an inline/Toast error with retry guidance
- **AND** no partial/corrupt file is downloaded
