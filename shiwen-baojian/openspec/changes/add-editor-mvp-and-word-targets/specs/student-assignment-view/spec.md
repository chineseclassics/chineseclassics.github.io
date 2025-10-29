## MODIFIED Requirements
### Requirement: Assignment List Display
The system SHALL display word count requirement only when the assignment defines a target range.

#### Scenario: Show requirement when present
- **WHEN** a student views the assignment list
- **AND** an assignment has a configured target (min and/or max)
- **THEN** the card shows “字數要求” with the configured range

#### Scenario: Hide requirement when absent
- **WHEN** a student views the assignment list
- **AND** an assignment has no configured target
- **THEN** the card omits “字數要求” entirely

### Requirement: Assignment Detail View
The system SHALL show word count requirement on the detail page only when configured.

#### Scenario: Detail page shows requirement when present
- **WHEN** student opens an assignment detail page
- **AND** the assignment has a configured target
- **THEN** the detail page shows the range (e.g., 600–800 for zh_chars, 150–250 words for en_words)

#### Scenario: Detail page hides requirement when absent
- **WHEN** student opens an assignment detail page
- **AND** the assignment has no target
- **THEN** the detail page omits any range display
