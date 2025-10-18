# Delta for Anti-Cheat System

## ADDED Requirements

### Requirement: Paste Behavior Monitoring
The system SHALL monitor and record all paste events in the editor.

#### Scenario: Record paste event
- **WHEN** a student pastes content into any paragraph editor
- **THEN** the system records to writing_events table:
  - event_type: 'paste'
  - pasted_content_length
  - timestamp
  - paragraph_id

#### Scenario: Excessive paste warning
- **WHEN** a student pastes content > 300 characters in one paste
- **OR** pastes more than 5 times in a single paragraph
- **THEN** a warning modal appears "检测到大量粘贴，请确保使用自己的语言写作"
- **AND** the paste is still allowed (not blocked)
- **AND** the warning event is logged with flag 'excessive_paste'

#### Scenario: Paste content preview storage
- **WHEN** storing paste event
- **THEN** the first 200 characters of pasted content are stored
- **AND** full content length is recorded
- **AND** teachers can view paste previews in integrity report

### Requirement: Typing Pattern Analysis
The system SHALL analyze student typing patterns to detect anomalies.

#### Scenario: Record typing speed
- **WHEN** a student types continuously for > 10 seconds
- **THEN** the system calculates characters per minute (CPM)
- **AND** records the typing burst event
- **AND** stores average_cpm in writing_events

#### Scenario: Detect unusually fast typing
- **WHEN** typing speed > 400 CPM (characters per minute)
- **AND** sustained for > 1 minute
- **THEN** an anomaly flag is set
- **AND** contributes to anomaly_score calculation

#### Scenario: Record pause patterns
- **WHEN** a student stops typing for > 30 seconds
- **THEN** the pause duration is recorded as 'long_pause' event
- **AND** subsequent typing burst is tracked separately

#### Scenario: Track deletion and revision
- **WHEN** a student deletes > 50 characters at once
- **OR** makes frequent back-and-forth edits
- **THEN** revision events are recorded
- **AND** low revision count may indicate copied content

### Requirement: Anomaly Score Calculation
The system SHALL calculate an anomaly score based on multiple behavioral factors.

#### Scenario: Normal writing pattern
- **WHEN** a student exhibits:
  - Moderate typing speed (100-250 CPM)
  - Frequent pauses (thinking time)
  - Regular deletions and revisions
  - Minimal paste usage (< 3 times, < 500 total chars)
- **THEN** anomaly_score is low (< 30)
- **AND** integrity report shows "✅ 正常写作模式"

#### Scenario: Suspicious pattern - rapid uniform typing
- **WHEN** a student exhibits:
  - Very fast typing (> 350 CPM)
  - Very few pauses (< 5% of writing time)
  - Minimal deletions (< 2% of content)
  - Large continuous text blocks
- **THEN** anomaly_score is high (> 70)
- **AND** integrity report flags "⚠️ 检测到异常快速且均匀的输入模式"

#### Scenario: Suspicious pattern - excessive pasting
- **WHEN** paste_count > 10
- **OR** total_paste_length > 1000 characters
- **OR** paste_length > 50% of total essay length
- **THEN** anomaly_score increases
- **AND** integrity report flags "⚠️ 检测到大量粘贴行为"

### Requirement: Real-Time Integrity Warnings
The system SHALL provide real-time warnings to students about suspicious behavior.

#### Scenario: Paste warning display
- **WHEN** excessive paste is detected
- **THEN** a non-blocking warning appears:
  - "检测到大量粘贴，请确保使用自己的语言写作"
  - Duration: 5 seconds
  - Style: Yellow warning banner at top
- **AND** student can continue writing

#### Scenario: Unusual pattern warning
- **WHEN** anomaly_score exceeds 60 during active writing
- **THEN** a gentle reminder appears:
  - "系统检测到异常写作模式，请确保独立完成论文"
  - Duration: 10 seconds
- **AND** student can dismiss and continue

#### Scenario: Warning frequency limit
- **WHEN** warnings have been shown > 3 times in one session
- **THEN** subsequent warnings are suppressed
- **BUT** events continue to be logged
- **AND** final integrity report includes all events

### Requirement: Teacher Integrity Report Interface
The system SHALL present integrity analysis to teachers in an easy-to-understand format.

#### Scenario: Display integrity dashboard
- **WHEN** a teacher views a student essay
- **THEN** an "诚信报告" card is displayed showing:
  - Anomaly score with visual indicator (color-coded)
  - Summary statistics (paste count, typing speed, pause frequency)
  - Flagged suspicious events
  - Timeline visualization of writing sessions

#### Scenario: Detailed event log access
- **WHEN** a teacher clicks "查看详细日志"
- **THEN** a chronological event log is displayed with:
  - All paste events (timestamp, length, preview)
  - Typing bursts (speed, duration)
  - Long pauses (duration)
  - Rapid deletions
- **AND** events are color-coded by suspicion level

#### Scenario: Integrity score interpretation
- **WHEN** displaying anomaly_score
- **THEN** the system provides interpretation:
  - 0-30: "✅ 正常写作模式"
  - 31-60: "⚠️ 部分行为需要关注"
  - 61-100: "🚨 强烈建议质询学生"

### Requirement: Privacy and Ethical Considerations
The system SHALL balance academic integrity monitoring with student privacy.

#### Scenario: Paste content limitation
- **WHEN** storing paste events
- **THEN** only first 200 characters are stored (not full content)
- **AND** content is only accessible to assigned teacher
- **AND** deleted after grading is complete (configurable retention)

#### Scenario: Aggregate metrics only
- **WHEN** generating integrity reports
- **THEN** focus on aggregate metrics (count, speed, patterns)
- **RATHER THAN** detailed keystroke logging
- **AND** respects student privacy while ensuring integrity

#### Scenario: Transparent to students
- **WHEN** students use the system
- **THEN** they are informed that writing behavior is monitored
- **AND** a notice is displayed: "本系统记录写作行为以确保学术诚信"
- **AND** students can view their own integrity metrics (optional)

