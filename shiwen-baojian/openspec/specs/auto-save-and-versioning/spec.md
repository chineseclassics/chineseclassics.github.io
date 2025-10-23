# auto-save-and-versioning Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Automatic Content Saving
The system SHALL automatically save paragraph content without user intervention.

#### Scenario: Trigger auto-save on content change
- **WHEN** a student types or edits paragraph content
- **THEN** a 3-second debounce timer starts
- **AND** after 3 seconds of no further changes
- **THEN** content is automatically saved to Supabase

#### Scenario: Save status indicator
- **WHEN** auto-save is triggered
- **THEN** a "保存中..." indicator appears
- **WHEN** save completes successfully
- **THEN** indicator changes to "✓ 已保存" for 2 seconds
- **THEN** indicator fades out

#### Scenario: Save conflict handling
- **WHEN** auto-save detects the paragraph was modified elsewhere
- **THEN** the system uses "last write wins" strategy
- **AND** displays warning "内容已在其他设备更新，已保存为最新版本"

#### Scenario: Network error during save
- **WHEN** auto-save fails due to network error
- **THEN** indicator shows "❌ 保存失败"
- **AND** system retries every 10 seconds
- **AND** content is cached in localStorage until successful

### Requirement: Manual Save Option
The system SHALL provide manual save capability via button or keyboard shortcut.

#### Scenario: Manual save via button
- **WHEN** a student clicks the "保存" button
- **THEN** all unsaved changes are immediately saved
- **AND** debounce timer is bypassed

#### Scenario: Manual save via keyboard
- **WHEN** a student presses Cmd+S (Mac) or Ctrl+S (Windows)
- **THEN** all unsaved changes are immediately saved
- **AND** browser's default save dialog is prevented (preventDefault)
- **AND** "✓ 已保存" confirmation appears

### Requirement: Version Snapshot Creation
The system SHALL create version snapshots at strategic points for history tracking.

#### Scenario: Snapshot on AI feedback submission
- **WHEN** a student clicks "提交段落" to get AI feedback
- **THEN** a version snapshot is created in paragraph_versions table
- **WITH** trigger type: 'ai_feedback'
- **AND** snapshot includes complete Quill delta content
- **AND** timestamp is recorded

#### Scenario: Snapshot on essay submission
- **WHEN** a student clicks "提交论文" to submit to teacher
- **THEN** version snapshots are created for ALL paragraphs
- **WITH** trigger type: 'essay_submission'
- **AND** this marks a major milestone in version history

#### Scenario: Manual snapshot creation
- **WHEN** a student clicks "保存版本快照" (optional feature)
- **THEN** a snapshot is created with trigger type: 'manual'
- **AND** student can add an optional note (e.g., "第一版初稿")

### Requirement: Version History Retrieval
The system SHALL allow students and teachers to browse version history.

#### Scenario: Student views own version history
- **WHEN** a student clicks "查看历史版本"
- **THEN** a timeline is displayed showing:
  - All snapshots for that paragraph
  - Timestamp and trigger type
  - Preview of content (first 100 chars)

#### Scenario: Navigate between versions
- **WHEN** a student selects a historical version
- **THEN** the paragraph content is displayed (read-only)
- **AND** a "恢复此版本" button is available

#### Scenario: Restore previous version
- **WHEN** a student clicks "恢复此版本" on a historical snapshot
- **THEN** a confirmation dialog appears
- **AND** if confirmed, the paragraph content is replaced with the selected version
- **AND** a new snapshot is created with trigger type: 'restored'

### Requirement: Conflict Resolution
The system SHALL handle multi-device editing conflicts gracefully.

#### Scenario: Detect concurrent editing
- **WHEN** a student edits on device A
- **AND** the same paragraph is edited on device B
- **THEN** the last saved version overwrites previous
- **AND** a warning notification appears on both devices

#### Scenario: Version branching prevention
- **WHEN** concurrent edits create potential conflicts
- **THEN** the system does NOT create version branches
- **AND** uses simple "last write wins" strategy
- **AND** logs the conflict for teacher review if needed

### Requirement: Storage Optimization
The system SHALL optimize storage for version history to prevent database bloat.

#### Scenario: Incremental delta storage
- **WHEN** creating version snapshots
- **THEN** the system stores Quill delta format (not full HTML)
- **AND** deltas are compressed for storage efficiency

#### Scenario: Version retention policy
- **WHEN** an essay has > 50 versions for one paragraph
- **THEN** the system retains:
  - All snapshots with trigger 'ai_feedback' or 'essay_submission'
  - Only the most recent 10 auto-save snapshots
- **AND** older auto-save snapshots are archived or deleted

#### Scenario: Purge after grading completion
- **WHEN** an essay is graded and marked as final
- **AND** retention period (e.g., 30 days) has passed
- **THEN** non-essential version snapshots can be purged
- **BUT** AI feedback snapshots and final submission are always retained

### Requirement: Offline Editing Support
The system SHALL cache unsaved changes locally to prevent data loss.

#### Scenario: Cache in localStorage
- **WHEN** a student edits offline or network is unavailable
- **THEN** content is cached in browser localStorage
- **AND** a "离线模式" indicator is displayed

#### Scenario: Sync when online
- **WHEN** network connection is restored
- **THEN** cached content is automatically synced to Supabase
- **AND** localStorage is cleared after successful sync
- **AND** "已同步" confirmation appears

#### Scenario: LocalStorage recovery
- **WHEN** browser crashes or is closed unexpectedly
- **AND** unsaved changes exist in localStorage
- **THEN** upon reopening, the system detects cached content
- **AND** asks "检测到未保存的内容，是否恢复？"
- **AND** restores content if user confirms

