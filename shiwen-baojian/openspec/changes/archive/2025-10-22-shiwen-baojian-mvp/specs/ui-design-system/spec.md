# UI Design System Specification

## Purpose
Provide a comprehensive, culturally-inspired design system for the 時文寶鑑 application that ensures visual consistency and enhances the user experience for Chinese literature education.

## ADDED Requirements

### Requirement: Design Token System

The system SHALL provide a comprehensive design token system that defines all visual design primitives for consistent UI implementation.

#### Scenario: Color tokens defined
- **WHEN** developers need to apply colors in CSS or JavaScript
- **THEN** they use CSS variables from `design-tokens.css`
- **AND** all colors follow the "青灰雅士" (Stone Blue Gray) color scheme
- **AND** no hardcoded hex color values are used

#### Scenario: Spacing tokens defined
- **WHEN** developers need to apply spacing (padding, margin, gap)
- **THEN** they use spacing variables based on 4px multiples
- **AND** spacing values are `--spacing-1` (4px) through `--spacing-24` (96px)

#### Scenario: Animation duration tokens defined
- **WHEN** developers need to apply animations or transitions
- **THEN** they use duration variables: `--duration-instant` (150ms), `--duration-fast` (200ms), `--duration-normal` (300ms), `--duration-slow` (500ms)
- **AND** all animations use consistent easing functions from design tokens

---

### Requirement: Unified Color Scheme - 青灰雅士 (Stone Blue Gray)

The system SHALL implement a unified color scheme inspired by traditional Chinese aesthetics that prioritizes low-key elegance, cultural depth, and content focus.

#### Scenario: Primary color system
- **WHEN** UI elements need primary color styling
- **THEN** they use the Stone Blue Gray color scale (`--primary-50` through `--primary-900`)
- **AND** the main color is `--primary-600` (#5f7d95)
- **AND** the color evokes the aesthetics of scholar's robes, stone inkstones, and misty Jiangnan

#### Scenario: Success color - 青苔綠 (Moss Green)
- **WHEN** indicating successful operations or completed states
- **THEN** success elements use `--success-500` (#7c9885)
- **AND** the color is muted and natural (not bright lime green)
- **AND** it evokes moss, bamboo leaves, and traditional green landscapes

#### Scenario: Warning color - 秋香色 (Autumn Fragrance)
- **WHEN** indicating warnings or attention-needed states
- **THEN** warning elements use `--warning-500` (#c4a574)
- **AND** the color is warm but not jarring (not bright yellow)
- **AND** it evokes autumn ginkgo leaves and aged paper

#### Scenario: Error color - 豆沙紅 (Red Bean Paste)
- **WHEN** indicating errors or destructive operations
- **THEN** error elements use `--error-500` (#b47c7c)
- **AND** the color is gentle but clear (not alarming bright red)
- **AND** it evokes red bean paste and cinnabar seal ink

#### Scenario: AI-specific color - 栗褐色 (Chestnut Brown)
- **WHEN** styling AI-related features (Jia Yucun 賈雨村)
- **THEN** AI elements use `--scholar-500` (#8b7355)
- **AND** the color evokes scholarly robes, aged books, and wooden desks
- **AND** it reinforces the "scholarly assistant" persona

#### Scenario: Background - 宣紙白 (Xuan Paper White)
- **WHEN** applying page backgrounds
- **THEN** the main background uses `--bg-primary` (#faf9f6)
- **AND** it is not pure white (#ffffff) but has a warm undertone
- **AND** it reduces eye strain during long writing sessions
- **AND** the editor area uses pure white for maximum content contrast

---

### Requirement: Unified Component Library

The system SHALL provide a comprehensive component library with consistent styling across all UI elements.

#### Scenario: Button components
- **WHEN** creating action buttons
- **THEN** developers use predefined button classes: `.btn-primary`, `.btn-success`, `.btn-warning`, `.btn-danger`, `.btn-ai`, `.btn-secondary`
- **AND** all buttons have consistent padding, border-radius, and hover effects
- **AND** all buttons use gradient backgrounds for primary actions
- **AND** hover effect includes translateY(-2px) and color-matched shadow

#### Scenario: Badge components
- **WHEN** displaying status indicators
- **THEN** developers use badge classes: `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-danger`
- **AND** badges have pill shape (border-radius: full)
- **AND** badge backgrounds use color-100 variants with color-700 text

#### Scenario: Feedback card components
- **WHEN** displaying AI feedback or notifications
- **THEN** developers use feedback card classes: `.feedback-card-success`, `.feedback-card-warning`, `.feedback-card-error`, `.feedback-card-info`
- **AND** cards have left border (3px) in the semantic color
- **AND** cards have light background using color-100 variants

#### Scenario: Input components
- **WHEN** creating form inputs
- **THEN** developers use `.input` class for text inputs
- **AND** focus state shows primary color border with 3px shadow
- **AND** placeholder text uses `--text-tertiary` color

---

### Requirement: Fluid Animation System

The system SHALL provide a fluid animation system that enhances user experience without being distracting.

#### Scenario: Page transitions
- **WHEN** navigating between pages or views
- **THEN** content uses `.animate-fade-in` class
- **AND** animation duration is `--duration-normal` (300ms)
- **AND** animation uses `--ease-out` easing function

#### Scenario: Button interactions
- **WHEN** user hovers over buttons
- **THEN** button translates up 2px with `--duration-fast` (200ms)
- **AND** button displays color-matched shadow
- **WHEN** user clicks button
- **THEN** ripple effect animation plays (optional)

#### Scenario: Modal animations
- **WHEN** modal dialog appears
- **THEN** backdrop fades in with `modalBackdropIn` animation
- **AND** content bounces in with `modalContentIn` animation using `--ease-bounce`

#### Scenario: Toast notifications
- **WHEN** toast notification appears
- **THEN** it slides in from right with `toastIn` animation
- **AND** it slides out after duration with `toastOut` animation

#### Scenario: Reduced motion support
- **WHEN** user has `prefers-reduced-motion: reduce` setting
- **THEN** all animations are reduced to minimal duration (0.01ms)
- **AND** complex animations are simplified or disabled

---

### Requirement: Cultural Design Philosophy

The system SHALL embody traditional Chinese aesthetic principles in its visual design.

#### Scenario: Low-key elegance
- **WHEN** applying colors throughout the UI
- **THEN** color saturation is reduced by 40-60% compared to standard web colors
- **AND** visual elements do not distract from content
- **AND** the overall aesthetic is understated and refined

#### Scenario: Content-first design
- **WHEN** student is using the essay editor
- **THEN** the editor area has pure white background (#ffffff)
- **AND** the surrounding UI uses muted colors (`--bg-primary`, `--gray-100`)
- **AND** visual emphasis is on the text content, not the interface

#### Scenario: Scholar's study atmosphere
- **WHEN** viewing any page in the application
- **THEN** the color palette evokes traditional scholar's study: stone inkstone, Xuan paper, ink wash painting
- **AND** button gradients are subtle, not vibrant
- **AND** spacing is generous (留白 - strategic emptiness)
- **AND** overall feeling is calm, focused, and culturally rooted

---

### Requirement: Jia Yucun (賈雨村) Visual Identity

The system SHALL establish a distinctive visual identity for the AI assistant "Jia Yucun" using traditional scholarly aesthetics.

#### Scenario: AI sidebar styling
- **WHEN** displaying Jia Yucun's AI feedback sidebar
- **THEN** the header uses `--scholar-600` to `--scholar-700` gradient background
- **AND** the title displays "賈雨村說" with wide letter-spacing (0.1em)
- **AND** the icon is `fa-pen-fancy` (scholar's brush)
- **AND** the overall aesthetic reinforces the "scholarly mentor" persona

#### Scenario: AI action buttons
- **WHEN** user triggers AI feedback ("雨村評點")
- **THEN** the button uses `.btn-ai` class
- **AND** background is chestnut brown gradient (`--scholar-500` to `--scholar-700`)
- **AND** the button stands out from other actions with its unique scholar color
- **AND** hover effect maintains the scholarly aesthetic

---

### Requirement: Design System Documentation

The system SHALL provide comprehensive documentation for the design system to ensure consistent implementation.

#### Scenario: Design tokens documentation
- **WHEN** developers need to understand available design tokens
- **THEN** they reference `docs/DESIGN_SYSTEM.md`
- **AND** documentation includes color swatches, CSS variable names, and usage scenarios
- **AND** documentation explains cultural significance of each color

#### Scenario: Component usage guidelines
- **WHEN** developers need to implement UI components
- **THEN** they find code examples in `docs/DESIGN_SYSTEM.md`
- **AND** documentation specifies when to use each button type
- **AND** documentation includes decision trees for component selection

#### Scenario: Visual testing page
- **WHEN** evaluating color scheme options
- **THEN** developers can use `test-color-schemes.html`
- **AND** page displays three color scheme variants side-by-side
- **AND** page includes real UI component previews

---

## ADDED Requirements

### Requirement: Application Visual Style

The system SHALL implement a flat, minimalist design style with subtle, culturally-rooted colors instead of bright, modern web colors.

**Previous behavior**: Used bright blue (#3498db), bright green (#4caf50), bright yellow (#ffc107), and bright red (#e74c3c) throughout the UI.

**New behavior**: Uses muted, traditional Chinese colors:
- Primary: Stone Blue Gray (#5f7d95) instead of bright blue
- Success: Moss Green (#7c9885) instead of bright green  
- Warning: Autumn Fragrance (#c4a574) instead of bright yellow
- Error: Red Bean Paste (#b47c7c) instead of bright red
- Background: Xuan Paper White (#faf9f6) instead of stark white

#### Scenario: Color migration from bright to muted
- **GIVEN** existing UI uses bright colors
- **WHEN** design token system is fully applied
- **THEN** all hardcoded hex colors are replaced with CSS variables
- **AND** visual appearance shifts from "modern tech" to "traditional elegance"
- **AND** user experience feels calmer and more focused on writing

#### Scenario: Long-term writing comfort
- **GIVEN** students write essays for extended periods (1-2 hours)
- **WHEN** using the updated color scheme
- **THEN** eye strain is reduced compared to bright colors
- **AND** visual distraction is minimized
- **AND** focus naturally centers on editor content

---

## Design Decisions

### Decision: "青灰雅士" (Stone Blue Gray) Color Scheme

**Context**: Application is a serious academic writing tool for high school students. UI should support focused, distraction-free writing while embodying traditional Chinese scholarly aesthetics.

**Chosen approach**: "青灰雅士" color scheme with:
- Low saturation (30%)
- Medium brightness (60-65%)
- Warm-toned backgrounds (#faf9f6 Xuan paper white)
- All colors derived from traditional Chinese color palette

**Alternatives considered**:
1. **水墨清韻** (Ink Wash) - Darker, more austere (#3d5a6b main color)
   - Rejected: Too dark, may feel heavy during long use
2. **素箋文心** (Plain Paper Literary Heart) - Similar but cooler tones (#4e6e7e)
   - Rejected: Less warmth, more generic

**Rationale**:
- Balances traditional aesthetics with modern usability
- Warm undertones reduce eye strain
- Not too dark (maintains accessibility)
- Cultural depth without being heavy-handed
- Student-tested preference (via visual comparison page)

---

### Decision: Separate AI Color Identity

**Context**: Jia Yucun (賈雨村) is the AI assistant, styled as a traditional scholar-mentor.

**Chosen approach**: Dedicated color system (`--scholar-*`) using chestnut brown (#8b7355)

**Rationale**:
- Creates clear visual distinction between AI features and user actions
- Chestnut brown evokes scholarly robes, aged books, traditional study
- Reinforces the "literary mentor" persona
- Prevents confusion with primary action buttons

---

### Decision: Xuan Paper White Background

**Context**: Pure white (#ffffff) can cause eye strain during long writing sessions.

**Chosen approach**: Main background uses #faf9f6 (slight warm undertone), editor area remains pure white.

**Rationale**:
- Xuan paper quality: warm, slightly aged aesthetic
- Reduces harsh contrast
- Editor remains pure white for maximum text legibility
- Traditional paper texture evokes cultural connection

---

## Implementation Notes

**Files created**:
- `css/design-tokens.css` (422 lines) - Complete design token system
- `css/components.css` (528 lines) - Unified component library  
- `css/animations.css` (420 lines) - Fluid animation system
- `docs/DESIGN_SYSTEM.md` (466 lines) - Design system documentation
- `test-color-schemes.html` - Visual color scheme comparison tool

**Files updated**:
- `css/base.css` - Migrated to design tokens
- `index.html` - Imported new CSS files in correct order

**Files pending update** (Phase 2):
- `css/editor.css` (67 color references)
- `css/sidebar.css` (7 color references)
- `css/dashboard.css` (14 color references)
- `css/class-management.css` (88 color references)
- `css/assignment-management.css` (260 color references)
- `css/format-editor.css` (4 color references)
- `js/ui/dialog.js` (inline styles)
- `js/ui/toast.js` (inline styles)
- `js/teacher/format-template-page.js` (inline styles)

**Migration strategy**: Replace all hardcoded colors with CSS variables systematically, file by file, with visual testing after each update.

---

## Success Criteria

- **Visual consistency**: All pages use colors from design token system
- **No hardcoded colors**: Zero hex color values in CSS/JS (except in design-tokens.css)
- **Cultural aesthetic**: UI evokes traditional Chinese scholarly atmosphere
- **Reduced eye strain**: Users can write comfortably for 1-2 hours
- **Maintained accessibility**: All color combinations meet WCAG AA contrast standards
- **60fps animations**: All transitions and animations are smooth

---

## Non-Goals

- ❌ Not creating a vibrant, colorful interface
- ❌ Not following modern Material Design or iOS guidelines
- ❌ Not using bright, saturated colors
- ❌ Not adding shadows or 3D effects (flat design maintained)
- ❌ Not supporting multiple theme variants (single cohesive theme)

