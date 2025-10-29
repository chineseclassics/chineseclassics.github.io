## ADDED Requirements
### Requirement: Text Anchoring and Re-anchoring
The system SHALL anchor annotations to text using offsets and quotes, and SHALL re-anchoring them after edits.

#### Scenario: Primary anchoring by offsets
- **WHEN** creating an annotation
- **THEN** text_start/text_end are stored relative to the PM document

#### Scenario: Fallback anchoring by quote
- **WHEN** offsets no longer match after edits
- **THEN** the system re-locates the quote using text_quote with text_prefix/text_suffix

#### Scenario: Context-based and fuzzy matching
- **WHEN** both offset and exact quote fail
- **THEN** the system tries context and fuzzy matching to find the best location

#### Scenario: Orphan annotation state
- **WHEN** re-anchoring fails
- **THEN** the annotation becomes 'orphan' and displays with a degraded style


