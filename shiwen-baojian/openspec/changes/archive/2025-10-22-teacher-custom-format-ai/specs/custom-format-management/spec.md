# Custom Format Management

## ADDED Requirements

### Requirement: Format List and Display

The system SHALL provide a management interface for teachers to view all available format specifications (system and custom).

#### Scenario: View all formats
- **GIVEN** teacher opens format management page
- **WHEN** page loads
- **THEN** system displays:
  - System built-in formats (cannot be edited or deleted)
  - Teacher's own custom formats
  - Shared custom formats from other teachers (if any)
- **AND** each format shows:
  - Name
  - Description
  - Created date (for custom formats)
  - Status: "系统内置" or "自定义" or "同事分享"

#### Scenario: Format card display
- **GIVEN** teacher views format list
- **WHEN** viewing a custom format
- **THEN** format card shows:
  - Format name
  - Based on (system template name or "完全自定义")
  - Constraints summary (word count, paragraph count)
  - Content requirements summary
  - Created date
  - Action buttons: "查看详情", "编辑", "删除", "导出"

---

### Requirement: Format Editing

The system SHALL allow teachers to edit their custom formats.

#### Scenario: Edit custom format
- **GIVEN** teacher has created custom format "张老师红楼梦人物分析 2025"
- **WHEN** teacher clicks "编辑"
- **THEN** system opens format editor
- **AND** editor pre-fills with current requirements text
- **AND** teacher can modify text and resubmit to AI
- **WHEN** teacher saves changes
- **THEN** system updates format record in database
- **AND** `updated_at` timestamp is updated

#### Scenario: Cannot edit system formats
- **GIVEN** teacher views system format "honglou-essay"
- **WHEN** teacher attempts to edit
- **THEN** system shows "系统内置格式不可编辑"
- **AND** suggests "基于此格式创建自定义版本"

---

### Requirement: Format Deletion with Usage Check

The system SHALL prevent deletion of custom formats that are currently in use by active assignments.

#### Scenario: Delete unused custom format
- **GIVEN** teacher has custom format not used by any assignment
- **WHEN** teacher clicks "删除"
- **THEN** system shows confirmation dialog
- **WHEN** teacher confirms
- **THEN** system deletes format record
- **AND** shows success message

#### Scenario: Cannot delete format in use
- **GIVEN** teacher has custom format used by assignment "红楼梦论文作业"
- **AND** assignment has not ended (deadline not passed)
- **WHEN** teacher clicks "删除"
- **THEN** system shows error message:
  - "此格式正在被以下任务使用，无法删除："
  - List of assignments using this format
  - Suggestion: "任务结束后可删除"
- **AND** deletion is blocked

#### Scenario: Cannot delete system formats
- **GIVEN** teacher views system format
- **WHEN** teacher attempts to delete
- **THEN** "删除" button is disabled
- **AND** tooltip shows "系统内置格式不可删除"

---

### Requirement: Dynamic Template Reference

The system SHALL ensure assignments always use the latest version of custom formats (no snapshot).

#### Scenario: Format update reflects in active assignment
- **GIVEN** teacher has assignment using custom format "张老师红楼梦 2025"
- **AND** assignment is active (students are writing)
- **WHEN** teacher edits format (e.g., increases word count to 2000)
- **THEN** students immediately see updated word count requirement
- **AND** next AI feedback uses updated format specification

#### Scenario: Assignment stores format ID not content
- **GIVEN** teacher creates assignment
- **WHEN** selecting custom format
- **THEN** assignment record stores:
  ```sql
  format_spec_id = 'uuid-of-custom-format'
  ```
- **AND** does NOT store snapshot of format JSON
- **WHEN** student requests AI feedback
- **THEN** system queries latest version from `format_specifications` table

---

### Requirement: Format Search and Filtering

The system SHALL provide search and filtering capabilities for format management.

#### Scenario: Search by name
- **GIVEN** teacher has multiple custom formats
- **WHEN** teacher types "红楼梦" in search box
- **THEN** system filters to show only formats with "红楼梦" in name or description

#### Scenario: Filter by type
- **GIVEN** teacher views format list
- **WHEN** teacher selects filter "仅显示自定义格式"
- **THEN** system hides system built-in formats
- **AND** shows only teacher's custom formats

#### Scenario: Sort by date
- **GIVEN** teacher views custom formats
- **WHEN** teacher selects "按创建日期排序"
- **THEN** system sorts formats newest first

---

### Requirement: Format Naming and Description

The system SHALL allow teachers to assign custom names and descriptions to their formats.

#### Scenario: Name custom format during creation
- **GIVEN** teacher has confirmed AI-generated specification
- **WHEN** saving format
- **THEN** system prompts for:
  - **Format name** (required, max 100 characters)
  - **Description** (optional, max 500 characters)
- **AND** default name is "自定义格式 YYYY-MM-DD"
- **WHEN** teacher provides name "张老师红楼梦人物分析 2025"
- **THEN** format is saved with this name

#### Scenario: Duplicate name warning
- **GIVEN** teacher already has format named "红楼梦论文格式"
- **WHEN** creating new format with same name
- **THEN** system shows warning "已存在同名格式，建议使用不同名称"
- **AND** allows teacher to proceed (does not block)

---

### Requirement: Format Sharing (Optional Feature)

The system SHALL support sharing custom formats with other teachers at the same school.

#### Scenario: Mark format as shareable
- **GIVEN** teacher has created custom format
- **WHEN** teacher enables "分享给同校老师" option
- **THEN** system sets `is_shared = true`
- **AND** format becomes visible to all teachers with same email domain

#### Scenario: View shared formats from colleagues
- **GIVEN** Teacher A (@isf.edu.hk) has shared format
- **WHEN** Teacher B (@isf.edu.hk) opens format list
- **THEN** Teacher B can see Teacher A's shared format
- **AND** format card shows "来自：Teacher A"
- **AND** Teacher B can use it but cannot edit or delete it

#### Scenario: Copy shared format to customize
- **GIVEN** Teacher B views Teacher A's shared format
- **WHEN** Teacher B clicks "基于此创建我的版本"
- **THEN** system copies format specification
- **AND** creates new custom format owned by Teacher B
- **AND** Teacher B can freely edit the copy

**Note**: This feature is marked for Phase 2 implementation.

