# 📚 故事詞彙接龍 - 智慧故事坊

與AI共創精彩故事，輕鬆積累詞彙的創意學習應用

> **📂 文檔組織規範**: 本項目採用規範化的文件結構，所有詳細文檔都在 [docs/](./docs/) 文件夾內。  
> 查看完整規範: [FILE_ORGANIZATION_RULES.md](./docs/FILE_ORGANIZATION_RULES.md)

---

## 🎮 快速開始

### 1️⃣ 啟動本地服務器

```bash
cd story-vocab
./start-server.sh
```

或手動啟動：
```bash
python3 -m http.server 8000
```

### 2️⃣ 開始遊戲

打開瀏覽器訪問：**http://localhost:8000/story-game.html**

開始與AI創作故事！

### 3️⃣ 管理後台（可選）

訪問管理後台：**http://localhost:8000/admin/**

- 📥 導入更多詞彙
- 📖 瀏覽詞彙庫
- 🤖 測試AI Agent
- 📊 查看統計數據

---

## ✨ 已完成功能

### 🎯 核心遊戲功能
- ✅ **6個難度級別** (L1-L6，覆蓋7-18歲學生)
- ✅ **4種故事主題** (自然探索、校園生活、奇幻冒險、科幻未來)
- ✅ **三種詞表模式** (AI智能推薦、系統預設詞表、自定義詞表)
- ✅ **智能詞彙推薦** (基於級別和主題的個性化推薦)
- ✅ **18輪故事接龍** (AI與用戶交替創作)
- ✅ **實時詞彙查詢** (集成萌典API)
- ✅ **生詞本功能** (收藏喜歡的詞彙)
- ✅ **完整故事展示** (創作統計和分享功能)

### 📚 詞表系統（新增）
- ✅ **模式一：系統預設詞表** - 支持HSK、教材等標準詞表
- ✅ **模式二：自定義詞表** - 老師/家長可上傳自己的詞表
- ✅ **模式三：AI智能推薦** - 不限詞表，AI自動推薦
- ✅ **靈活層級系統** - 支持第二/三層級標籤（等級、單元等）
- ✅ **AI自動評級** - 基於150個黃金標準詞，AI自動評估詞彙難度
- ✅ **校準詞管理** - 可視化管理和調整校準詞庫
- ✅ **詞表導入工具** - 支持CSV格式批量導入

### 🤖 AI Agent
- ✅ **DeepSeek API 集成** (部署在 Supabase Edge Function)
- ✅ **上下文感知** (根據故事歷史智能續寫)
- ✅ **階段控制** (開始/發展/收尾不同策略)
- ✅ **詞彙多樣性** (避免重複，類別平衡)
- ✅ **詞彙難度評估** (AI自動評估系統，基於黃金標準)

### 🛠️ 管理工具
- ✅ **詞彙導入工具** (批量導入JSON格式詞彙)
- ✅ **詞彙瀏覽器** (篩選、搜索、分頁)
- ✅ **AI測試工具** (調試和優化AI響應)
- ✅ **統計面板** (實時數據統計)
- ✅ **校準詞管理器** - 管理150個黃金標準詞
- ✅ **系統詞表導入** - 導入HSK等標準詞表
- ✅ **自定義詞表上傳** - 用戶上傳自己的詞表

### 💾 數據系統
- ✅ **Supabase 數據庫** (用戶、詞彙、故事會話、詞表系統)
- ✅ **RLS 安全策略** (數據訪問控制)
- ✅ **150個校準詞彙** (L1-L6黃金標準詞彙)
- ✅ **多層級標籤系統** (支持詞表的靈活組織)
- ✅ **本地存儲** (生詞本持久化)

---

## 📁 項目結構

```
story-vocab/
├── index.html               # 🎮 主遊戲頁面（單頁應用）
├── settings.html            # ⚙️ 設置頁面（詞表管理）
│
├── admin/                   # 🛠️ 管理後台
│   ├── index.html           # 後台首頁
│   ├── import-calibration-words.html      # 導入校準詞庫
│   ├── calibration-manager.html           # 校準詞管理器
│   ├── import-system-wordlist.html        # 系統詞表導入
│   ├── upload-custom-wordlist.html        # 自定義詞表上傳
│   ├── browse-vocabulary.html             # 詞彙瀏覽器
│   ├── test-ai-agent.html                 # AI Agent 測試
│   └── templates/                         # 📄 模板文件
│       ├── 词表导入模板.csv
│       └── README.md
│
├── js/                      # 📦 JavaScript 模塊
│   ├── config.js            # 配置文件（Supabase URL/Key）
│   ├── supabase-client.js   # Supabase 客戶端封裝
│   ├── app.js               # 應用入口
│   ├── core/                # 核心邏輯
│   │   ├── game-state.js    # 遊戲狀態管理
│   │   ├── story-engine.js  # 故事引擎
│   │   ├── session-manager.js  # 會話管理
│   │   ├── story-storage.js    # 故事存儲
│   │   └── vocab-integration.js # 詞彙推薦集成
│   ├── features/            # 功能模塊
│   │   ├── calibration-game.js  # 校準遊戲
│   │   ├── word-manager.js      # 詞彙管理
│   │   ├── wordbook.js          # 生詞本
│   │   ├── dictionary.js        # 萌典API集成
│   │   └── profile-updater.js   # 用戶畫像更新
│   └── ui/                  # UI組件
│       ├── screens.js       # 界面顯示
│       ├── navigation.js    # 導航控制
│       ├── modals.js        # 彈窗管理
│       ├── story-card.js    # 故事卡片
│       └── wordlist-selector.js  # 詞表選擇器（新增）
│
├── supabase/                # 🗄️ 後端服務
│   ├── migrations/          # 數據庫遷移腳本
│   │   ├── 001_initial_schema.sql
│   │   ├── 006_ai_vocab_system.sql
│   │   └── 007_wordlist_system.sql        # 詞表系統（新增）
│   └── functions/           # Edge Functions
│       ├── story-agent/                   # AI 故事生成服務
│       ├── vocab-recommender/             # 詞彙推薦服務
│       └── vocab-difficulty-evaluator/    # 難度評估服務（新增）
│
├── data/                    # 📊 數據文件
│   └── calibration-vocabulary.json  # 校準詞庫（150個黃金標準詞）
│
└── docs/                    # 📚 設計文檔
    ├── DESIGN.md            # 完整設計文檔（產品規劃、架構設計）
    ├── WORDLIST_SYSTEM_IMPLEMENTATION.md  # 詞表系統實施文檔（新增）
    └── ...
```

---

## 🚀 部署指南

### 架構說明

Story-Vocab 採用**完全獨立的 Supabase 架構**：
- ✅ 所有 Supabase 資源都在 `story-vocab/supabase/` 內
- ✅ 在 story-vocab 目錄內直接部署，無需複製到其他位置
- ✅ 符合太虛幻境兩層架構原則

### 前提條件

1. ✅ Supabase 賬戶和項目
2. ✅ DeepSeek API Key
3. ✅ Supabase CLI（用於部署 Edge Function）

### 快速部署步驟

#### 步驟 1: 配置 Supabase

1. **創建 Supabase 項目**
   - 訪問 [https://supabase.com](https://supabase.com)
   - 創建新項目並記錄 Project URL 和 Anon Key

2. **運行數據庫遷移**
   - 在 Supabase Dashboard → SQL Editor 中依次執行遷移文件

3. **配置 API 密鑰**
   - 在 Supabase Dashboard → Edge Functions → Settings → Secrets 中添加：
     ```
     DEEPSEEK_API_KEY=sk-your-deepseek-key
     ```

#### 步驟 2: 配置前端

編輯 `js/config.js`：

```javascript
export const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key'
};
```

#### 步驟 3: 部署 Edge Function

```bash
# 安裝 Supabase CLI (macOS)
brew install supabase/tap/supabase

# 進入 story-vocab 目錄
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io/story-vocab

# 連接項目
supabase link --project-ref bjykaipbeokbbykvseyr

# 部署所有函數
supabase functions deploy story-agent
supabase functions deploy vocab-recommender
supabase functions deploy vocab-difficulty-evaluator
```

**重要**：在 story-vocab 目錄內直接部署，Supabase CLI 會自動從 `supabase/functions/` 讀取代碼。

詳細步驟參見：[EDGE_FUNCTION_DEPLOY.md](./docs/EDGE_FUNCTION_DEPLOY.md)

#### 步驟 4: 導入詞彙數據

1. 啟動本地服務器
2. 訪問 http://localhost:8000/admin/
3. 點擊「詞彙導入」→「加載詞彙數據」→「開始導入」

#### 步驟 5: 測試遊戲

訪問 http://localhost:8000/story-game.html，開始創作故事！

---

## 🎨 遊戲玩法

### 1. 選擇級別和主題
- 根據年齡選擇合適的難度級別（L1-L6）
- 選擇感興趣的故事主題

### 2. 開始創作
- AI 會給出故事開頭
- 從推薦的 6 個詞彙中選擇一個
- 用選中的詞造句，繼續故事

### 3. 學習詞彙
- 點擊任何詞語查看詳細釋義（萌典API）
- 收藏喜歡的詞彙到生詞本
- 查看拼音、定義和例句

### 4. 完成故事
- 經過 18 輪接龍，完成完整故事
- 查看創作統計（使用詞彙數、故事字數）
- 分享或再玩一次

---

## 🛠️ 開發指南

### 本地開發

```bash
# 啟動服務器
./start-server.sh

# 訪問遊戲
open http://localhost:8000/story-game.html

# 訪問管理後台
open http://localhost:8000/admin/
```

### 測試 AI Agent

1. 訪問 http://localhost:8000/admin/test-ai-agent.html
2. 選擇級別、主題、輪次
3. 查看 AI 響應和推薦詞彙

---

## 📊 數據庫結構

### 核心數據表

- **`vocabulary`** - 詞彙表（詞語、難度等級、類型等，全局唯一）
- **`wordlists`** - 詞表定義（系統詞表和自定義詞表）
- **`wordlist_tags`** - 詞表標籤（第二/三層級標籤）
- **`vocabulary_wordlist_mapping`** - 詞彙-詞表關聯（多對多）
- **`user_wordlist_preferences`** - 用戶詞表偏好設置
- **`story_sessions`** - 故事會話（對話歷史、進度、分數）
- **`user_vocabulary`** - 用戶學習記錄（掌握度、使用次數）
- **`user_wordbook`** - 生詞本（用戶收藏的詞彙）

詳細的數據庫設計請參見：
- [docs/DESIGN.md](./docs/DESIGN.md) - 完整設計文檔
- [docs/WORDLIST_SYSTEM_IMPLEMENTATION.md](./docs/WORDLIST_SYSTEM_IMPLEMENTATION.md) - 詞表系統實施文檔

---

## 🐛 故障排查

### ❌ "Failed to fetch" 錯誤
**原因**: Supabase 連接問題或 RLS 策略未配置

**解決方案**:
1. 檢查 `js/config.js` 中的 URL 和 Key 是否正確
2. 確認已執行數據庫遷移腳本
3. 查看瀏覽器控制台的詳細錯誤信息

### ❌ AI 不響應
**原因**: Edge Function 未部署或 API Key 未配置

**解決方案**:
1. 確認 Edge Function 已部署
2. 檢查 DEEPSEEK_API_KEY 環境變量
3. 查看函數日誌: `npx supabase functions logs story-agent`

### ❌ 詞彙推薦為空
**原因**: 詞彙數據未導入或級別不匹配

**解決方案**:
1. 訪問管理後台確認詞彙數量 > 0
2. 使用「詞彙瀏覽器」查看各級別詞彙分布
3. 使用「詞彙導入工具」導入示例數據

### ❌ CORS 錯誤
**原因**: 直接打開 HTML 文件（file:// 協議）

**解決方案**:
必須使用本地服務器:
```bash
python3 -m http.server 8000
```
然後訪問 http://localhost:8000

---

## 📈 未來計劃

### 短期（1-2週）
- [ ] 用戶登錄/註冊功能
- [ ] 創意度評分算法優化
- [ ] 故事分享功能（社交媒體）
- [ ] 更多詞彙數據（擴展到 1500+ 詞）

### 中期（1-2月）
- [ ] 多人協作故事接龍
- [ ] 學習報告和統計
- [ ] 徽章和成就系統
- [ ] 語音朗讀功能

### 長期（3-6月）
- [ ] 故事社區（瀏覽他人作品）
- [ ] AI 故事插圖生成
- [ ] 移動端 App
- [ ] 教師管理後台（班級管理）

---

## 📚 相關文檔

- 📐 [完整設計文檔](./docs/DESIGN.md) - 產品規劃、架構設計、技術方案
- 🚀 [Edge Function 部署指南](./docs/EDGE_FUNCTION_DEPLOY.md) - 詳細部署步驟
- 🗄️ [Supabase CLI 使用指南](./docs/SUPABASE_CLI_GUIDE.md) - 數據庫管理工具
- 📖 [萌典 API](https://github.com/g0v/moedict-webkit) - 詞典數據來源

---

## 🙏 致謝

- **萌典 API**: 提供權威的中文詞典數據
- **DeepSeek**: 提供強大的中文AI模型
- **Supabase**: 提供完整的後端服務

---

**最後更新**: 2025-10-07  
**版本**: 1.0.0-MVP  
**狀態**: ✅ MVP 核心功能已完成

🎮 **立即開始遊戲**: http://localhost:8000/story-game.html
