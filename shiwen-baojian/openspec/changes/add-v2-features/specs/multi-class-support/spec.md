## ADDED Requirements

### Requirement: Multi-Class Management
The system SHALL support teachers managing multiple classes with complete data isolation.

#### Scenario: Teacher creates new class
- **WHEN** a teacher navigates to class management
- **THEN** they can create a new class with name and description
- **AND** the class is immediately available for use

#### Scenario: Teacher switches between classes
- **WHEN** a teacher is viewing one class
- **THEN** they can switch to another class via class selector
- **AND** only data from the selected class is displayed
- **AND** the interface updates to show class-specific information

#### Scenario: Class data isolation
- **WHEN** a teacher views students in Class A
- **THEN** they cannot see students from Class B
- **AND** assignments in Class A are not visible in Class B
- **AND** essays from Class A students are not accessible in Class B

### Requirement: Class Student Management
The system SHALL allow teachers to manage students within each class.

#### Scenario: Teacher adds students to class
- **WHEN** a teacher selects a class
- **THEN** they can add students by email address
- **AND** students receive notification to join the class
- **AND** students can only see tasks from their assigned class

#### Scenario: Teacher removes student from class
- **WHEN** a teacher removes a student from a class
- **THEN** the student loses access to that class's tasks
- **AND** the student's essays remain in the class for teacher review
- **AND** the student cannot submit new essays to that class

### Requirement: Class Assignment Management
The system SHALL allow teachers to create assignments specific to each class.

#### Scenario: Teacher creates class-specific assignment
- **WHEN** a teacher creates an assignment
- **THEN** they must select which class the assignment is for
- **AND** only students in that class can see and work on the assignment
- **AND** the assignment appears in the class-specific assignment list

#### Scenario: Teacher views class assignment statistics
- **WHEN** a teacher views a class
- **THEN** they can see assignment completion statistics for that class only
- **AND** they can see which students have submitted essays
- **AND** they can see grading progress for that class

### Requirement: Class Data Persistence
The system SHALL maintain complete data isolation between classes.

#### Scenario: Class data integrity
- **WHEN** a teacher deletes a class
- **THEN** all class-specific data is preserved for historical reference
- **AND** the class is marked as archived rather than deleted
- **AND** students lose access but data remains for teacher review

#### Scenario: Cross-class data protection
- **WHEN** a student is in multiple classes
- **THEN** their data is completely separated between classes
- **AND** essays written for Class A are not visible in Class B
- **AND** teacher feedback is class-specific
