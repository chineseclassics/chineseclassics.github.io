## MODIFIED Requirements
### Requirement: Assignment List Display
The system SHALL display statuses as 未開始/進行中/已批改 only. 提交/撤回流程被移除。

#### Scenario: Assignment status indicators
- **WHEN** displaying assignments
- **THEN** status is visually distinguished:
  - 未開始（開始寫作）
  - 進行中（繼續寫作）
  - 已批改（查看評分與批註）

### Requirement: Start Essay Writing
The system SHALL create essay with status 'writing' (or legacy 'draft' mapped to '進行中').

#### Scenario: Continue existing essay
- **WHEN** student clicks 繼續寫作
- **THEN** load PM JSON and keep autosaving during editing

### REMOVED Requirements
### Requirement: Essay Submission
**Reason**: 流程簡化，老師可隨時查看與批註，無需提交門檻。
**Migration**: 現有 'submitted' 視為 '進行中' 直到老師評分為止。

### Requirement: Display Mode Badge
The system SHALL show the editor mode on assignment cards and details.

#### Scenario: Mode badges
- **WHEN** listing assignments
- **THEN** show badge: 論文/創作 對應 essay-structured/creative


