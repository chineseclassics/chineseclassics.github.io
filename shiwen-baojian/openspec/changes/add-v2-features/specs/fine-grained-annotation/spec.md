## ADDED Requirements

### Requirement: Text Selection and Highlighting ✅ **IMPLEMENTED**
The system SHALL allow teachers to select and highlight specific text in student essays.

#### Scenario: Teacher highlights text for annotation ✅ **IMPLEMENTED**
- **WHEN** a teacher selects text in a student essay
- **THEN** the selected text is highlighted
- **AND** an annotation popup appears
- **AND** the teacher can add comments to the selected text

#### Scenario: Teacher creates annotation ✅ **IMPLEMENTED**
- **WHEN** a teacher adds a comment to selected text
- **THEN** the annotation is saved with text position information
- **AND** the annotation is visible to the student
- **AND** the annotation includes teacher name and timestamp

### Requirement: Annotation Management ✅ **IMPLEMENTED**
The system SHALL provide comprehensive annotation management capabilities.

#### Scenario: Teacher edits annotation ✅ **IMPLEMENTED**
- **WHEN** a teacher clicks on an existing annotation
- **THEN** they can edit the comment text
- **AND** the annotation history is preserved
- **AND** the student sees the updated annotation

#### Scenario: Teacher identity shown on annotation ✅ **IMPLEMENTED**
- **WHEN** a teacher creates or views an annotation
- **THEN** the annotation sidebar displays the teacher's name and initials
- **AND** the information comes from the authenticated Supabase session
- **AND** the identity persists after page reload

#### Scenario: Teacher deletes annotation ✅ **IMPLEMENTED**
- **WHEN** a teacher deletes an annotation
- **THEN** the annotation is marked as deleted
- **AND** it is no longer visible to the student
- **AND** the deletion is logged in annotation history

#### Scenario: Teacher views annotation history ⏳ **PARTIALLY IMPLEMENTED**
- **WHEN** a teacher views an essay
- **THEN** they can see all annotations with timestamps
- **AND** they can see annotation history and changes
- **AND** they can filter annotations by type or date

### Requirement: Student Annotation Interaction ⏳ **NOT IMPLEMENTED**
The system SHALL allow students to view, respond to, and create annotations.

#### Scenario: Student views annotations on submitted essay
- **WHEN** a student opens their submitted essay
- **THEN** they can see all teacher annotations
- **AND** annotations are highlighted in the text
- **AND** they can click on annotations to read comments
- **AND** they can see the annotation conversation thread

#### Scenario: Student responds to teacher annotation
- **WHEN** a student clicks on a teacher annotation
- **THEN** they can add a response comment
- **AND** the teacher receives an instant notification
- **AND** the response is linked to the original annotation
- **AND** the teacher can see the response immediately

#### Scenario: Student creates annotation on submitted essay
- **WHEN** a student selects text in their submitted essay
- **THEN** they can create their own annotation
- **AND** the annotation is visible to the teacher
- **AND** the teacher receives an instant notification
- **AND** the teacher can respond to the student's annotation

#### Scenario: Teacher responds to student annotation
- **WHEN** a teacher responds to a student's annotation
- **THEN** the student receives an instant notification
- **AND** the response is linked to the student's annotation
- **AND** the student can see the teacher's response immediately

### Requirement: Essay Revision Workflow ⏳ **NOT IMPLEMENTED**
The system SHALL support a collaborative revision process where students can modify their essays based on teacher annotations.

#### Scenario: Student withdraws submission after teacher annotations
- **WHEN** a student views their submitted essay with teacher annotations
- **AND** the essay status is 'submitted' (not yet graded)
- **THEN** they can click "撤回並編輯" to withdraw the submission
- **AND** the essay status changes to 'draft'
- **AND** all teacher annotations are preserved
- **AND** the student can continue editing the essay

#### Scenario: Student modifies essay with preserved annotations
- **WHEN** a student edits their essay after withdrawing submission
- **THEN** existing annotations remain visible
- **AND** annotations are repositioned if the corresponding text moves
- **AND** annotations on deleted text are marked as "orphaned"
- **AND** the student can see which annotations are affected by their changes

#### Scenario: Student resubmits revised essay
- **WHEN** a student completes their revisions
- **AND** clicks "提交論文" again
- **THEN** the essay status changes back to 'submitted'
- **AND** all annotations (including orphaned ones) are preserved
- **AND** the teacher can see the revision history
- **AND** the teacher can continue adding new annotations

#### Scenario: Teacher adds annotations during revision process
- **WHEN** a teacher adds annotations to a submitted essay
- **AND** the student has not yet withdrawn the submission
- **THEN** the annotations are immediately visible to the student
- **AND** the student can still withdraw and revise the essay
- **AND** the annotations persist through the revision process

#### Scenario: Final grading locks the essay
- **WHEN** a teacher completes grading and clicks "提交批改"
- **THEN** the essay status changes to 'graded'
- **AND** the student can no longer withdraw the submission
- **AND** all annotations become read-only
- **AND** the student can only view the final feedback

### Requirement: Annotation Display and Navigation ✅ **IMPLEMENTED**
The system SHALL provide intuitive annotation display and navigation.

#### Scenario: Annotation sidebar display ✅ **IMPLEMENTED**
- **WHEN** a teacher or student views an essay with annotations
- **THEN** annotations are displayed in a sidebar
- **AND** clicking on an annotation highlights the corresponding text
- **AND** the sidebar shows annotation count and status

#### Scenario: Annotation filtering and search
- **WHEN** a teacher views an essay with many annotations
- **THEN** they can filter annotations by type (suggestion, error, praise)
- **AND** they can search annotations by content
- **AND** they can sort annotations by date or importance

### Requirement: Real-time Notification System ⏳ **NOT IMPLEMENTED**
The system SHALL provide instant notifications for annotation interactions.

#### Scenario: Teacher receives student annotation notification
- **WHEN** a student creates or responds to an annotation
- **THEN** the teacher receives an instant notification
- **AND** the notification shows the student name and annotation preview
- **AND** the teacher can click to view the full annotation
- **AND** the notification persists until the teacher views it

#### Scenario: Student receives teacher annotation notification
- **WHEN** a teacher creates or responds to an annotation
- **THEN** the student receives an instant notification
- **AND** the notification shows the teacher name and annotation preview
- **AND** the student can click to view the full annotation
- **AND** the notification persists until the student views it

#### Scenario: Notification management
- **WHEN** a user receives notifications
- **THEN** they can mark notifications as read
- **AND** they can view notification history
- **AND** they can configure notification preferences
- **AND** they can disable notifications for specific essays

### Requirement: Annotation Export and Reporting ⏳ **NOT IMPLEMENTED**
The system SHALL allow teachers to export annotation data for reporting.

#### Scenario: Teacher exports annotation report
- **WHEN** a teacher requests an annotation report
- **THEN** they receive a summary of all annotations
- **AND** the report includes annotation statistics
- **AND** the report can be exported as PDF or CSV

#### Scenario: Teacher views annotation analytics
- **WHEN** a teacher views class analytics
- **THEN** they can see annotation frequency and types
- **AND** they can see which students have the most annotations
- **AND** they can track annotation response rates
