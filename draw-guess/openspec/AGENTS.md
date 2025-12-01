<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# OpenSpec Instructions

Instructions for AI coding assistants using OpenSpec for spec-driven development in 你畫我猜。

## Project Context

你畫我猜是一個支持中文的多人繪畫猜詞遊戲，核心目標是通過繪畫和猜測，幫助學生掌握概念名詞和詩句，實現視覺化學習。

**關鍵設計原則**：
- 極簡 UI + 低調配色，突出畫作和文字
- 支持中文詞彙、概念名詞、詩句
- 系統預設詞庫 + 自定義詞語混合模式
- 分數累積和遊戲粘性功能
- 適合課堂教學和日常挑戰

**技術棧**：
- HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- Supabase（數據庫、認證、實時同步）
- HTML5 Canvas（繪畫功能）
- GitHub Pages 部署

## TL;DR Quick Checklist

- Search existing work: `openspec spec list --long`, `openspec list` (use `rg` only for full-text search)
- Decide scope: new capability vs modify existing capability
- Pick a unique `change-id`: kebab-case, verb-led (`add-`, `update-`, `remove-`, `refactor-`)
- Scaffold: `proposal.md`, `tasks.md`, `design.md` (only if needed), and delta specs per affected capability
- Write deltas: use `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`; include at least one `#### Scenario:` per requirement
- Validate: `openspec validate [change-id] --strict` and fix issues
- Request approval: Do not start implementation until proposal is approved

## Three-Stage Workflow

### Stage 1: Creating Changes
Create proposal when you need to:
- Add features or functionality
- Make breaking changes (API, schema)
- Change architecture or patterns  
- Optimize performance (changes behavior)
- Update security patterns

Triggers (examples):
- "Help me create a change proposal"
- "Help me plan a change"
- "Help me create a proposal"
- "I want to create a spec proposal"
- "I want to create a spec"

Skip proposal for:
- Bug fixes (restore intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)
- Configuration changes
- Tests for existing behavior

**Workflow**
1. Review `openspec/project.md`, `openspec list`, and `openspec list --specs` to understand current context.
2. Choose a unique verb-led `change-id` and scaffold `proposal.md`, `tasks.md`, optional `design.md`, and spec deltas under `openspec/changes/<id>/`.
3. Draft spec deltas using `## ADDED|MODIFIED|REMOVED Requirements` with at least one `#### Scenario:` per requirement.
4. Run `openspec validate <id> --strict` and resolve any issues before sharing the proposal.

### Stage 2: Implementing Changes
Track these steps as TODOs and complete them one by one.
1. **Read proposal.md** - Understand what's being built
2. **Read design.md** (if exists) - Review technical decisions
3. **Read tasks.md** - Get implementation checklist
4. **Implement tasks sequentially** - Complete in order
5. **Confirm completion** - Ensure every item in `tasks.md` is finished before updating statuses
6. **Update checklist** - After all work is done, set every task to `- [x]` so the list reflects reality
7. **Approval gate** - Do not start implementation until the proposal is reviewed and approved

### Stage 3: Archiving Changes
After deployment, create separate PR to:
- Move `changes/[name]/` → `changes/archive/YYYY-MM-DD-[name]/`
- Update `specs/` if capabilities changed
- Use `openspec archive [change] --skip-specs --yes` for tooling-only changes
- Run `openspec validate --strict` to confirm the archived change passes checks

## Before Any Task

**Context Checklist:**
- [ ] Read relevant specs in `specs/[capability]/spec.md`
- [ ] Check pending changes in `changes/` for conflicts
- [ ] Read `openspec/project.md` for conventions
- [ ] Run `openspec list` to see active changes
- [ ] Run `openspec list --specs` to see existing capabilities

**Before Creating Specs:**
- Always check if capability already exists
- Prefer modifying existing specs over creating duplicates
- Use `openspec show [spec]` to review current state
- If request is ambiguous, ask 1–2 clarifying questions before scaffolding

### Search Guidance
- Use `openspec spec list --long` to see all capabilities
- Use `openspec list` to see active changes
- Use `rg` (ripgrep) for full-text search across codebase
- Avoid using `rg` for spec-only searches (use `openspec` commands instead)

## Spec Format

### Capability Specs
Located in `specs/[capability]/spec.md`:

```markdown
# [Capability Name]

## Requirements

### REQ-001: [Requirement Name]
**Type**: Functional | Non-functional
**Priority**: Must | Should | Could

**Description**: Clear description of what is required.

#### Scenario: [Scenario Name]
**Given**: Initial state
**When**: Action or trigger
**Then**: Expected outcome

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
```

### Change Specs
Located in `changes/[change-id]/specs/[capability]/spec.md`:

```markdown
# [Capability Name] - Change Deltas

## ADDED Requirements

### REQ-XXX: [New Requirement]
[Same format as capability specs]

## MODIFIED Requirements

### REQ-YYY: [Modified Requirement]
**Change**: What changed and why
[Updated requirement details]

## REMOVED Requirements

### REQ-ZZZ: [Removed Requirement]
**Reason**: Why it was removed
```

## Project-Specific Guidelines

### UI Design
- **極簡 UI**：減少裝飾元素，讓畫作成為焦點
- **低調配色**：灰色系、米色、淺色調
- **動畫**：適量的、優雅的、微妙的動畫
- **手繪風格**：細線條、低調圖標

### Code Style
- **語言**：所有代碼註釋使用繁體中文
- **命名**：kebab-case（文件）、camelCase（變量）、UPPER_SNAKE_CASE（常量）
- **縮進**：2 空格

### Architecture
- **應用獨立性**：完全自包含
- **Supabase 獨立**：使用獨立的 Supabase 項目
- **實時同步**：使用 Supabase Realtime Channels
- **繪畫性能**：繪畫數據需要壓縮和優化

### Testing
- **本地測試**：`python3 -m http.server 8000`
- **實時同步測試**：多設備同時測試
- **移動端測試**：觸摸繪畫功能

## Common Patterns

### Room Management
- 房間創建：生成 6 位房間碼
- 房間狀態：waiting, playing, finished
- 實時同步：使用 Supabase Realtime Channels

### Drawing System
- Canvas 繪圖：支持鼠標和觸摸
- 實時同步：繪畫筆觸需要壓縮和節流
- 工具欄：畫筆、橡皮擦、清空、顏色選擇

### Word System
- 系統詞庫：管理員維護的主題詞庫
- 自定義詞語：用戶輸入，最多 600 字符
- 混合模式：系統詞庫 + 自定義詞語
- 去重：自動去重

### User System
- 匿名遊玩：無需登入，不累積分數
- 登入遊玩：Google OAuth，累積分數和統計
- 分數累積：個人統計、成就、排行榜

## Important Notes

- **繁體中文**：所有界面和內容使用繁體中文
- **詞語限制**：最少 6 個，每個 1-32 字符，自定義最多 600 字符
- **管理員權限**：只有管理員可以管理系統預設詞庫
- **太虛幻境集成**：必須引入應用切換器組件

