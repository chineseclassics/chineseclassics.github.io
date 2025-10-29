## MODIFIED Requirements
### Requirement: Auto Save
The system SHALL autosave PM JSON on debounced editor updates.

#### Scenario: Debounced autosave
- **WHEN** student edits the PM document
- **THEN** after ~1.5-3s of inactivity, essays.content_json is persisted

### Requirement: Versioning (Minimal for MVP)
The system MAY defer full paragraph-level version snapshots; optional later.

#### Scenario: Future snapshot integration
- **WHEN** versioning is enabled
- **THEN** snapshots reference PM ranges instead of paragraph IDs


