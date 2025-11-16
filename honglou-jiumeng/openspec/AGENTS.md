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

Instructions for AI coding assistants using OpenSpec for spec-driven development in 《紅樓舊夢》。

## Project Context

《紅樓舊夢》是一個教育遊戲，核心目標是通過遊戲化機制促進學生閱讀《紅樓夢》前八十回。

**關鍵設計原則**：
- 閱讀驅動遊戲：讀完對應回目才能解鎖相關記憶
- 答題不消耗行動力：答題解鎖記憶不消耗行動力，可以隨時進行
- 資源稀缺性：絳珠有限，需要策略性分配
- 隱性化設計：不在遊戲中明確告訴玩家「去閱讀」，而是通過題目自然引導

**技術棧**：
- HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- 不使用框架（Vue/React）
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
- [ ] Read `docs/GAME_REDESIGN_PLAN copy.md` for game design context
- [ ] Read `docs/UPDATE_PLAN.md` for current update plan
- [ ] Run `openspec list` to see active changes
- [ ] Run `openspec list --specs` to see existing capabilities

## Spec File Format

### Critical: Scenario Formatting

**CORRECT** (use #### headers):
```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

**WRONG** (don't use bullets or bold):
```markdown
- **Scenario: User login**  ❌
**Scenario**: User login     ❌
### Scenario: User login      ❌
```

Every requirement MUST have at least one scenario.

### Requirement Wording
- Use SHALL/MUST for normative requirements (avoid should/may unless intentionally non-normative)
- All requirements must start with "系統 SHALL 實現以下功能：" or similar phrasing containing SHALL/MUST

### Delta Operations

- `## ADDED Requirements` - New capabilities
- `## MODIFIED Requirements` - Changed behavior
- `## REMOVED Requirements` - Deprecated features
- `## RENAMED Requirements` - Name changes

## CLI Commands

```bash
# Essential commands
openspec list                  # List active changes
openspec list --specs          # List specifications
openspec show [item]           # Display change or spec
openspec validate [item] --strict  # Validate changes or specs
openspec archive [change] --yes    # Archive after deployment
```

## Directory Structure

```
openspec/
├── project.md              # Project conventions
├── AGENTS.md               # This file
├── changes/                # Proposals - what SHOULD change
│   ├── [change-name]/
│   │   ├── proposal.md     # Why, what, impact
│   │   ├── tasks.md        # Implementation checklist
│   │   ├── design.md       # Technical decisions (optional)
│   │   └── specs/          # Delta changes
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # Completed changes
└── specs/                  # Current capability specs (optional)
    └── [capability]/
        └── spec.md
```

## Current Active Changes

目前沒有活躍的變更提案。根據 `docs/UPDATE_PLAN.md`，需要創建變更提案來對齊設計文檔。

## Key Design Documents

- `docs/GAME_REDESIGN_PLAN copy.md` - 完整遊戲設計文檔（主要參考）
- `docs/UPDATE_PLAN.md` - 遊戲更新計劃（對齊設計文檔）

## Code Style

- **語言**：所有代碼註釋使用繁體中文
- **命名**：
  - 文件名：kebab-case（如 `game-state.js`）
  - CSS 類名：kebab-case（如 `.memory-item`）
  - JavaScript 變量：camelCase（如 `gameState`）
  - JavaScript 常量：UPPER_SNAKE_CASE（如 `MAX_ACTION_POINTS`）
- **縮進**：使用 2 空格

## Best Practices

### Simplicity First
- Default to <100 lines of new code
- Single-file implementations until proven insufficient
- Avoid frameworks without clear justification
- Choose boring, proven patterns

### Game Design Principles
- Always refer to `docs/GAME_REDESIGN_PLAN copy.md` for design decisions
- Maintain core design principles (reading-driven, no action cost for questions)
- Keep resources balanced (絳珠 scarcity, 靈石 for buildings)

### Clear References
- Use `file.js:42` format for code locations
- Reference specs as `specs/memory-system/spec.md`
- Link related changes and PRs

