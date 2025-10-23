# teacher-class-management Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Create New Class
The system SHALL allow teachers to create a new class for organizing students.

#### Scenario: Create class with basic info
- **WHEN** a teacher clicks "创建班级" button
- **THEN** a class creation form is displayed
- **AND** teacher can enter class name (required)
- **AND** teacher can enter class description (optional)
- **WHEN** form is submitted with valid data
- **THEN** a new class record is created in database
- **AND** teacher is set as the class owner
- **AND** class is marked as active

#### Scenario: Class name validation
- **WHEN** teacher attempts to create a class without a name
- **THEN** validation error appears "请输入班级名称"
- **AND** form submission is blocked

#### Scenario: Single class constraint in MVP
- **WHEN** teacher already has one active class
- **AND** attempts to create another class
- **THEN** a notice appears "MVP 版本仅支持单个班级，多班级功能即将推出"
- **AND** creation is blocked
- **BUT** database schema supports multiple classes for future extension

### Requirement: Batch Add Students by Email
The system SHALL allow teachers to add multiple students by pasting a list of Google emails.

#### Scenario: Paste email list
- **WHEN** teacher clicks "批量添加学生"
- **THEN** a text area appears for pasting email list
- **AND** placeholder shows format example:
  ```
  3015174@student.isf.edu.hk
  3015175@student.isf.edu.hk
  3015176@student.isf.edu.hk
  ```

#### Scenario: Parse and validate emails
- **WHEN** teacher pastes email list and clicks "添加"
- **THEN** system parses emails (one per line or comma-separated)
- **AND** validates each email matches `*@student.isf.edu.hk` pattern
- **AND** shows validation summary:
  - "✅ 有效邮箱：15 个"
  - "⚠️ 无效邮箱：2 个（已忽略）"

#### Scenario: Create user records if not exist
- **WHEN** processing valid student emails
- **FOR EACH** email not in users table
- **THEN** system creates a user record with:
  - email
  - display_name (extracted from email or set to "学生-XXXXX")
  - role = 'student'
  - status = 'pending' (student hasn't logged in yet)

#### Scenario: Add students to class
- **WHEN** user records are ready
- **THEN** system creates class_members records
- **AND** sets added_by to current teacher's user_id
- **AND** displays "成功添加 15 名学生到班级"

#### Scenario: Duplicate email handling
- **WHEN** an email already exists in the class
- **THEN** system skips the duplicate
- **AND** shows in summary "已在班级中：3 个（已跳过）"

### Requirement: View Class Member List
The system SHALL display all students in a class with their status and activity.

#### Scenario: Display student list
- **WHEN** teacher views class details
- **THEN** a student list table is displayed with columns:
  - 姓名 (display_name)
  - 邮箱 (email)
  - 状态 (已登录/未登录)
  - 作业进度 (X/Y 完成)
  - 加入时间 (added_at)

#### Scenario: Sort student list
- **WHEN** teacher clicks a column header
- **THEN** list is sorted by that column
- **AND** sort order toggles between ascending/descending

#### Scenario: Search students
- **WHEN** teacher types in search box
- **THEN** list filters to show matching students
- **BY** name or email

### Requirement: Remove Student from Class
The system SHALL allow teachers to remove students from a class.

#### Scenario: Remove student with confirmation
- **WHEN** teacher clicks "移除" button next to a student
- **THEN** confirmation dialog appears "确定将 [学生姓名] 移出班级？"
- **AND** if confirmed, class_members record is deleted
- **AND** student's essays remain intact (not deleted)

#### Scenario: Student loses access after removal
- **WHEN** a student is removed from a class
- **THEN** they can no longer view that class's assignments
- **BUT** their existing essays are preserved
- **AND** they can still view their own completed work

### Requirement: Class Status Management
The system SHALL allow teachers to activate or deactivate classes.

#### Scenario: Deactivate class
- **WHEN** teacher clicks "停用班级"
- **THEN** class.is_active is set to false
- **AND** students can no longer submit new essays
- **BUT** students can still view existing work
- **AND** teacher can still view and grade existing essays

#### Scenario: Reactivate class
- **WHEN** teacher clicks "激活班级" on an inactive class
- **THEN** class.is_active is set to true
- **AND** all functionalities are restored

### Requirement: Class Statistics Display
The system SHALL display class-level statistics for teachers.

#### Scenario: View class overview
- **WHEN** teacher views class dashboard
- **THEN** statistics are displayed:
  - 学生总数
  - 活跃学生数（最近 7 天登录）
  - 任务总数
  - 待批改作业数
  - 平均完成率

#### Scenario: Student activity indicator
- **WHEN** displaying student list
- **THEN** each student shows activity status:
  - 🟢 活跃（最近 3 天登录）
  - 🟡 不活跃（3-7 天未登录）
  - 🔴 长期未登录（> 7 天）

