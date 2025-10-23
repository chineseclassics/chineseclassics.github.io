# auth-and-roles Specification

## Purpose
TBD - created by archiving change shiwen-baojian-mvp. Update Purpose after archive.
## Requirements
### Requirement: Google OAuth Authentication
The system SHALL provide Google OAuth 2.0 authentication for all users.

#### Scenario: Successful Google login
- **WHEN** a user clicks the "Google 登录" button
- **THEN** the system redirects to Google OAuth consent screen
- **AND** after successful authentication, the user is redirected back to the application
- **AND** a session is created in Supabase

#### Scenario: Failed authentication
- **WHEN** Google authentication fails or is cancelled
- **THEN** the system displays an error message "登录失败，请重试"
- **AND** the user remains on the login page

### Requirement: Automatic Role Detection
The system SHALL automatically detect user roles based on email domain.

#### Scenario: Teacher account detection
- **WHEN** a user logs in with email format `*@isf.edu.hk`
- **THEN** the system assigns role "teacher" to the user
- **AND** the user is redirected to the teacher dashboard

#### Scenario: Student account detection
- **WHEN** a user logs in with email format `*@student.isf.edu.hk`
- **THEN** the system assigns role "student" to the user
- **AND** the user is redirected to the student dashboard

#### Scenario: Invalid email domain
- **WHEN** a user logs in with an email not matching ISF domains
- **THEN** the system displays error "请使用 ISF 学校账号登录"
- **AND** the session is not created

### Requirement: Session Management
The system SHALL manage user sessions securely using Supabase Auth.

#### Scenario: Session persistence
- **WHEN** a user successfully logs in
- **THEN** the session persists across browser refreshes
- **AND** the session remains valid for 7 days by default

#### Scenario: Session expiration
- **WHEN** a session expires after 7 days
- **THEN** the user is redirected to the login page
- **AND** a message "会话已过期，请重新登录" is displayed

#### Scenario: Manual logout
- **WHEN** a user clicks the "登出" button
- **THEN** the session is immediately terminated
- **AND** the user is redirected to the login page

### Requirement: Dual-Mode Architecture Support
The system SHALL support both standalone mode and Taixu platform integration mode.

#### Scenario: Standalone mode detection
- **WHEN** the application is accessed directly (not in iframe)
- **AND** no platform flag is detected
- **THEN** the system runs in standalone mode
- **AND** displays its own login interface

#### Scenario: Platform mode detection
- **WHEN** the application detects `window.TAIXU_PLATFORM_MODE === true`
- **THEN** the system runs in platform integration mode
- **AND** listens for user authentication via postMessage

#### Scenario: Platform mode authentication
- **WHEN** running in platform mode
- **AND** receives a postMessage with type "TAIXU_AUTH" and user data
- **THEN** the system creates a session for the platform user
- **AND** does not display its own login interface

### Requirement: User Profile Management
The system SHALL maintain user profile information in the database.

#### Scenario: First-time user profile creation
- **WHEN** a user logs in for the first time
- **THEN** the system creates a user record with:
  - user_id (from Google OAuth)
  - email
  - display_name (from Google profile)
  - role (teacher or student, based on email)
  - created_at timestamp

#### Scenario: Returning user profile retrieval
- **WHEN** a returning user logs in
- **THEN** the system retrieves existing user profile
- **AND** updates last_login timestamp
- **AND** does not create duplicate records

