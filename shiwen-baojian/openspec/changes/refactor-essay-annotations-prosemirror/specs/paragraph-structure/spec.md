## MODIFIED Requirements
### Requirement: Hierarchical Structure Initialization
The system SHALL NOT spawn multiple editors per paragraph. Instead, it initializes a single document (PM JSON) with optional initial content hints.

#### Scenario: Create default essay document
- **WHEN** a student starts a new essay
- **THEN** the system creates an empty ProseMirror document (with title placeholder optional)
- **AND** sections are logical (for AI), not enforced by multiple editors

### Requirement: Sub-Argument Management
The system SHALL allow students to express sub-arguments as normal paragraphs or headings, not as separate containers.

#### Scenario: Indicate sub-arguments via headings
- **WHEN** a student inserts a heading or bold topic sentence
- **THEN** AI can detect sub-arguments from context without rigid containers


