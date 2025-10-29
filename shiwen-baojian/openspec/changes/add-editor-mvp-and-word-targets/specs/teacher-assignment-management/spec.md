## MODIFIED Requirements
### Requirement: Set assignment details
The system SHALL allow teachers to optionally configure a word/length target before entering the writing guidance, using simple fields without enforcing an upper-bound constraint.

#### Scenario: Configure optional range before guidance
- **WHEN** the teacher fills the assignment form
- **THEN** the following fields are available before the writing guidance field:
  - Metric (required): `zh_chars` (Chinese characters) or `en_words` (English words)
  - Min (optional, integer ≥ 0)
  - Max (optional, integer ≥ 0)
- **AND** either Min or Max may be left empty
- **AND** both empty means “no word count requirement”

#### Scenario: Validation without reasonable upper bound
- **WHEN** both Min and Max are provided
- **THEN** the system validates that Min ≤ Max
- **AND** the system requires non-negative integers for Min and Max
- **AND** the system SHALL NOT apply any “reasonable upper limit” validation

#### Scenario: Structured persistence
- **WHEN** the teacher saves the assignment
- **THEN** the target is stored in a structured form under `assignments.editor_layout_json`, for example:
  - `primaryMetric = metric`
  - `targets[metric] = { min, max }` (omit when both are empty)
- **AND** students SHALL see range-based status only when a target exists; otherwise they see counters only
