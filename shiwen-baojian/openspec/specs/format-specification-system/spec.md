# format-specification-system Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Two-Layer Format System

The system SHALL support a two-layer format specification architecture to balance standardization and customization.

#### Scenario: Teacher selects system built-in format
- **GIVEN** teacher is creating a new assignment
- **WHEN** teacher selects "红楼梦论文格式" from system formats
- **THEN** the assignment uses the complete format specification from `honglou-essay.json`
- **AND** students receive AI feedback based on this format's analysis dimensions

#### Scenario: Teacher modifies system format
- **GIVEN** teacher has selected "红楼梦论文格式"
- **WHEN** teacher clicks "基于此修改"
- **THEN** system opens a format editor with current format loaded
- **AND** teacher can add new required elements
- **AND** teacher can modify analysis dimension weights
- **AND** teacher can adjust checks for each dimension
- **WHEN** teacher saves modifications
- **THEN** system creates a new custom format record in database
- **AND** links the assignment to this custom format

#### Scenario: Teacher creates fully custom format
- **GIVEN** teacher is creating assignment
- **WHEN** teacher selects "完全自定义"
- **THEN** system provides empty format editor
- **AND** teacher can define paragraph types
- **AND** teacher can define analysis dimensions for each type
- **AND** teacher can define required elements
- **WHEN** teacher saves
- **THEN** system stores complete format in `format_specifications` table

---

### Requirement: System Built-in Formats (Layer 1)

The system SHALL provide multiple built-in format specifications as complete, independent JSON files.

#### Scenario: Loading Honglou essay format
- **GIVEN** student is writing an essay for an assignment
- **WHEN** assignment uses "system:honglou-essay" as format source
- **THEN** system loads `/assets/data/format-specs/honglou-essay.json`
- **AND** format includes all paragraph types: introduction, body_paragraph, conclusion
- **AND** each paragraph type has complete analysis dimensions and required elements

#### Scenario: Multiple system formats available
- **GIVEN** teacher is selecting format for assignment
- **WHEN** teacher opens format selector
- **THEN** system displays all available system formats:
  - 红楼梦论文格式 (honglou-essay)
  - IB EE 论文格式 (ib-ee-essay)
  - 议论文格式 (argumentative-essay)
  - 说明文格式 (expository-essay)
  - 记叙文格式 (narrative-essay)
- **AND** each format shows metadata: name, description, word count, target audience

#### Scenario: Adding new system format
- **GIVEN** development team creates new format JSON
- **WHEN** file is placed in `/assets/data/format-specs/`
- **THEN** format becomes available to all teachers
- **AND** no database changes required
- **AND** format can be loaded via CDN with high performance

---

### Requirement: Teacher Custom Formats (Layer 2)

The system SHALL allow teachers to create and manage custom format specifications in the database.

#### Scenario: Custom format based on system format
- **GIVEN** teacher creates custom format based on "honglou-essay"
- **WHEN** custom format is saved
- **THEN** database stores:
  - `id`: UUID
  - `name`: teacher-provided name
  - `created_by`: teacher's user ID
  - `type`: "custom"
  - `based_on`: "honglou-essay"
  - `modifications`: JSON with additions/modifications/deletions
  - `created_at`, `updated_at`
- **AND** teacher can view, edit, delete this format
- **AND** teacher can use it for multiple assignments

#### Scenario: Fully custom format
- **GIVEN** teacher creates format from scratch
- **WHEN** custom format is saved
- **THEN** database stores complete format definition
- **AND** `based_on` is NULL
- **AND** `paragraph_types` contains full specification

#### Scenario: Custom format privacy
- **GIVEN** teacher has created custom format
- **WHEN** another teacher views format list
- **THEN** other teacher cannot see private custom formats
- **AND** other teacher can only see their own custom formats
- **AND** other teacher can see all system formats
- **BUT** if format is marked `is_public: true`
- **THEN** other teachers can see and use it

---

### Requirement: Format Specification JSON Structure

Each format specification SHALL follow a standardized JSON schema with metadata, paragraph types, analysis dimensions, and required elements.

#### Scenario: Complete format specification structure
- **GIVEN** a format specification JSON file
- **THEN** it MUST contain:
  - `metadata` object with: id, name, version, type, category, description
  - `paragraph_types` object with at least one paragraph type
- **AND** each paragraph type MUST contain:
  - `name`: display name
  - `purpose`: description of paragraph purpose
  - `analysis_dimensions`: array of dimension objects
  - `required_elements`: array of element objects (optional)
- **AND** each analysis dimension MUST contain:
  - `id`: unique identifier
  - `name`: display name
  - `weight`: decimal 0-1 (weights sum to 1.0 within paragraph type)
  - `checks`: array of check questions

#### Scenario: Analysis dimensions drive AI feedback
- **GIVEN** format specifies introduction paragraph with dimensions:
  - `structure_completeness` (weight: 0.4)
  - `thesis_clarity` (weight: 0.4)
  - `roadmap` (weight: 0.2)
- **WHEN** Edge Function receives introduction paragraph for feedback
- **THEN** AI analyzes using these three dimensions only
- **AND** returns scores and issues for each dimension
- **AND** does NOT analyze using body paragraph dimensions (e.g., textual_evidence, close_reading)

#### Scenario: Required elements define structural checks
- **GIVEN** format specifies introduction requires:
  - "背景引入 (Hook)"
  - "关键词定义"
  - "研究缺口"
  - "核心问题与论文主张"
  - "结构预告"
- **WHEN** Edge Function performs structural check
- **THEN** it detects presence of each element using keywords and markers
- **AND** reports missing elements
- **AND** calculates completeness percentage

---

### Requirement: Format Loading and Merging

The system SHALL load format specifications from appropriate sources and merge custom modifications with base formats.

#### Scenario: Load system format directly
- **GIVEN** assignment has `format_spec_source: "system:honglou-essay"`
- **WHEN** student requests AI feedback
- **THEN** frontend loads `/assets/data/format-specs/honglou-essay.json`
- **AND** passes complete format to Edge Function
- **AND** no database query needed

#### Scenario: Load custom format based on system format
- **GIVEN** assignment has `format_spec_source: "custom:uuid-123"`
- **WHEN** student requests AI feedback
- **THEN** frontend queries `format_specifications` table for uuid-123
- **AND** retrieves `based_on: "honglou-essay"` and `modifications`
- **AND** loads base format from `/assets/data/format-specs/honglou-essay.json`
- **AND** applies modifications to base format
- **AND** passes merged format to Edge Function

#### Scenario: Load fully custom format
- **GIVEN** assignment has `format_spec_source: "custom:uuid-456"`
- **AND** custom format has `based_on: null`
- **WHEN** student requests AI feedback
- **THEN** frontend queries database for complete format
- **AND** uses format directly without merging
- **AND** passes to Edge Function

---

### Requirement: Format Modification Operations

Custom formats based on system formats SHALL support add, modify, and remove operations on elements and dimensions.

#### Scenario: Add required element
- **GIVEN** base format "honglou-essay" has 5 required elements in introduction
- **WHEN** teacher adds new element with `action: "add"`:
  ```json
  {
    "id": "historical_context",
    "name": "历史背景",
    "required": true,
    "action": "add"
  }
  ```
- **THEN** merged format has 6 required elements
- **AND** AI checks for this additional element

#### Scenario: Modify analysis dimension
- **GIVEN** base format has `thesis_clarity` with weight 0.4
- **WHEN** teacher modifies with:
  ```json
  {
    "id": "thesis_clarity",
    "weight": 0.6,
    "checks": [...new checks...],
    "action": "modify"
  }
  ```
- **THEN** merged format uses new weight and checks
- **AND** AI feedback reflects increased importance

#### Scenario: Remove required element
- **GIVEN** base format requires "研究缺口"
- **WHEN** teacher removes with `action: "remove"`, `id: "research_gap"`
- **THEN** merged format does not check for this element
- **AND** students not penalized for omission

---

### Requirement: Database Schema for Custom Formats

The system SHALL store custom format specifications in a dedicated table with proper indexing and RLS policies.

#### Scenario: Format specifications table structure
- **GIVEN** `format_specifications` table exists
- **THEN** it has columns:
  - `id` UUID PRIMARY KEY
  - `name` TEXT NOT NULL
  - `description` TEXT
  - `created_by` UUID REFERENCES users(id)
  - `type` TEXT (always 'custom')
  - `based_on` TEXT (NULL or system format id)
  - `modifications` JSONB (NULL if fully custom)
  - `spec_json` JSONB (full spec if fully custom)
  - `is_public` BOOLEAN DEFAULT false
  - `created_at` TIMESTAMPTZ
  - `updated_at` TIMESTAMPTZ
- **AND** has index on `created_by`
- **AND** has RLS policies for privacy

#### Scenario: RLS policy - view own formats
- **GIVEN** teacher A has created custom formats
- **WHEN** teacher B queries format_specifications
- **THEN** teacher B sees only:
  - Formats created by teacher B
  - Formats with `is_public: true`
- **AND** does NOT see teacher A's private formats

#### Scenario: RLS policy - modify own formats
- **GIVEN** teacher owns custom format
- **WHEN** teacher updates format
- **THEN** operation succeeds
- **BUT** when teacher tries to update another teacher's format
- **THEN** operation fails with permission error

---

### Requirement: Format Selector UI

The system SHALL provide a user-friendly interface for teachers to select or create format specifications when creating assignments.

#### Scenario: Format selection interface
- **GIVEN** teacher is creating assignment
- **WHEN** teacher reaches format selection step
- **THEN** interface shows two main options:
  - "使用系统内置格式"
  - "使用或创建自定义格式"
- **AND** each option is clearly described

#### Scenario: Browse system formats
- **GIVEN** teacher selected "使用系统内置格式"
- **WHEN** interface loads
- **THEN** displays cards for each system format showing:
  - Format name
  - Category
  - Description
  - Target audience
  - Word count guideline
  - Preview button
- **AND** teacher can select one directly
- **OR** click "基于此修改" to customize

#### Scenario: View my custom formats
- **GIVEN** teacher selected "使用或创建自定义格式"
- **WHEN** interface loads
- **THEN** displays teacher's existing custom formats
- **AND** each shows: name, based on, last modified
- **AND** teacher can select, edit, duplicate, or delete
- **AND** "创建新格式" button is prominently displayed

---

### Requirement: Performance Optimization

The system SHALL optimize format loading for performance using caching and CDN delivery.

#### Scenario: System format caching
- **GIVEN** student loads assignment with system format
- **WHEN** format JSON is fetched first time
- **THEN** browser caches the JSON file
- **AND** subsequent requests use cached version
- **AND** format served from CDN for fast global access

#### Scenario: Custom format caching
- **GIVEN** assignment uses custom format
- **WHEN** format is loaded from database
- **THEN** merged result is cached in memory
- **AND** subsequent students in same session use cached version
- **AND** cache invalidates on format update

---

