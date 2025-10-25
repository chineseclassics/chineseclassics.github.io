# Cursor Commands 說明

## 命令分類

### Spec Kit 命令（全局 + 應用感知）

所有 `speckit.*` 命令在根目錄 `.cursor/commands/` 中定義，可以在任何子項目中使用。

**自動檢測子項目**：這些命令會自動檢測當前打開的文件屬於哪個子項目：
- 如果正在編輯 `pinyin-pinpinle/js/app.js`，會自動使用 `pinyin-pinpinle/.specify/` 配置
- 如果正在編輯 `story-vocab/index.html`，會自動使用 `story-vocab/.specify/` 配置
- 如果無法檢測，會提示您指定子項目名稱

可用的命令：

- `/speckit.constitution` - 建立或更新項目憲法
- `/speckit.specify` - 定義需求和用戶故事  
- `/speckit.plan` - 制定技術實施計劃
- `/speckit.tasks` - 生成任務清單
- `/speckit.implement` - 執行實施
- `/speckit.clarify` - 澄清需求
- `/speckit.analyze` - 一致性分析
- `/speckit.checklist` - 質量檢查清單

### OpenSpec 命令（全局）

`openspec.*` 命令用於管理 OpenSpec 文檔：

- `/openspec-proposal` - 創建提案
- `/openspec-apply` - 應用提案
- `/openspec-archive` - 歸檔提案
- `/openspec-show-app` - 顯示應用信息
- `/openspec-apply-app` - 應用應用配置
- `/openspec-archive-app` - 歸檔應用

## 使用 Spec Kit 的步驟

### 在子項目中使用（例如 pinyin-pinpinle）

1. **確保子項目有 `.specify/` 配置**
   ```bash
   cd pinyin-pinpinle
   # 應該存在 pinyin-pinpinle/.specify/ 目錄
   ```

2. **在 Cursor 中使用斜槓命令**
   - 輸入 `/speckit.constitution` 來建立項目憲法
   - AI 會自動檢測到 `pinyin-pinpinle/.specify/`
   - 所有操作都在子項目的 `.specify/` 目錄中進行

3. **繼續工作流程**
   - `/speckit.specify` - 定義需求
   - `/speckit.plan` - 制定計劃  
   - `/speckit.tasks` - 生成任務
   - `/speckit.implement` - 實施

### 項目結構

```
chineseclassics.github.io/          ← 根目錄
├── .cursor/commands/               ← 全局命令（這裡）
│   ├── speckit.*.md                ← Spec Kit 命令
│   └── openspec-*.md               ← OpenSpec 命令
│
└── pinyin-pinpinle/               ← 子項目
    ├── .specify/                  ← 子項目專屬 Spec Kit 配置
    │   ├── memory/
    │   │   └── constitution.md    ← 項目憲法
    │   ├── templates/
    │   └── scripts/
    └── ...
```

## 重要說明

- ✅ 命令在**根目錄**定義，所有子項目共用
- ✅ 配置在**子項目**中，每個子項目獨立
- ✅ 命令會自動檢測當前工作的子項目
- ✅ 每個子項目的 Spec Kit 配置完全獨立

## 如何為新子項目添加 Spec Kit

如果需要為新的子項目添加 Spec Kit：

```bash
cd [子項目目錄]
specify init --here --ai cursor-agent --force
```

這會在子項目中創建 `.specify/` 配置，然後就可以使用根目錄的 `/speckit.*` 命令了。
