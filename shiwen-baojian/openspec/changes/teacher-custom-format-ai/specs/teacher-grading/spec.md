# Teacher Grading

## ADDED Requirements

### Requirement: AI Grading Suggestion

The system SHALL provide AI-powered grading suggestions to assist teachers in evaluating student essays based on the assignment's grading rubric.

#### Scenario: Request AI grading suggestion
- **GIVEN** student has submitted complete essay
- **AND** teacher opens grading page for this essay
- **WHEN** teacher clicks "AI 評分建議" button
- **THEN** system:
  - Displays loading animation
  - Calls `grading-agent` Edge Function
  - Passes essay content and grading rubric
- **WITHIN** 15 seconds:
  - System displays AI grading suggestion

#### Scenario: Display AI grading suggestion
- **GIVEN** AI has generated grading suggestion
- **WHEN** displaying to teacher
- **THEN** system shows:
  - **Criterion A (分析)**: score (0-8) + reasoning
  - **Criterion B (組織)**: score (0-8) + reasoning
  - **Criterion C (創作)**: score (0-8) + reasoning
  - **Criterion D (語言)**: score (0-8) + reasoning
  - **Total**: sum of four scores (max 32)
  - **Disclaimer**: "此為 AI 建議，僅供參考。請老師根據專業判斷做最終評分。"

#### Scenario: Adopt AI suggestion
- **GIVEN** teacher reviews AI grading suggestion
- **WHEN** teacher clicks "採用建議"
- **THEN** system auto-fills grading form with:
  - `criterion_a_score`: AI suggested value
  - `criterion_b_score`: AI suggested value
  - `criterion_c_score`: AI suggested value
  - `criterion_d_score`: AI suggested value
- **AND** teacher can manually adjust any score
- **AND** teacher must still write comments before submitting

#### Scenario: Ignore AI suggestion
- **GIVEN** teacher reviews AI grading suggestion
- **WHEN** teacher clicks "忽略建議" or closes suggestion panel
- **THEN** grading form remains empty
- **AND** teacher fills scores manually

---

### Requirement: AI Grading Visibility Control

The system SHALL ensure AI grading suggestions are visible only to teachers, never to students.

#### Scenario: Teacher views AI suggestion
- **GIVEN** teacher is on grading page
- **WHEN** teacher requests AI suggestion
- **THEN** suggestion is displayed
- **AND** suggestion is saved to `ai_grading_suggestions` table
- **AND** table has RLS policy:
  ```sql
  POLICY "Teachers can view AI suggestions for their assignments"
  ON ai_grading_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM essays e
      JOIN assignments a ON e.assignment_id = a.id
      WHERE e.id = ai_grading_suggestions.essay_id
      AND a.teacher_id = auth.uid()
    )
  );
  ```

#### Scenario: Student cannot access AI suggestions
- **GIVEN** AI grading suggestion exists for student's essay
- **WHEN** student views their essay page
- **THEN** student can see:
  - Essay content
  - Paragraph-level AI feedback history
  - Submission status
- **AND** student CANNOT see:
  - AI grading suggestion (query returns empty)
  - Teacher's draft scores (before teacher submits)
- **ONLY AFTER** teacher submits final grade:
  - Student sees teacher's final score and comments
  - Student does NOT see AI suggestion (remains hidden)

---

### Requirement: Integration with Existing Grading Workflow

The system SHALL integrate AI grading suggestions seamlessly into the existing teacher grading workflow.

#### Scenario: Complete grading workflow with AI assistance
- **GIVEN** teacher opens student essay for grading
- **THEN** grading page shows:
  1. **Student essay content** (read-only)
  2. **Paragraph comments** (teacher can add)
  3. **Revision history timeline** (expand/collapse)
  4. **AI feedback history** (paragraph-level, student received)
  5. **Writing integrity report** (paste events, behavior analysis)
  6. **AI grading suggestion** (new section) ← **NEW**
  7. **Grading form** (four criteria, 0-8 each)
  8. **Overall comments** (teacher's written feedback)
  9. **Submit grade** button

#### Scenario: Grading form shows rubric criteria
- **GIVEN** assignment uses "IB MYP 中國古典文學" rubric
- **WHEN** teacher views grading form
- **THEN** each criterion shows:
  - Criterion code and name (e.g., "A: 分析")
  - Score input (0-8, number field or slider)
  - Rubric descriptors (expandable reference)
  - AI suggested score (if available, with "採用" button)

