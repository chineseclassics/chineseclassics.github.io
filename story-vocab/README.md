# 📚 故事詞彙接龍 - 智慧故事坊

與AI共創精彩故事，輕鬆積累詞彙的創意學習應用

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
- ✅ **智能詞彙推薦** (基於級別和主題的個性化推薦)
- ✅ **18輪故事接龍** (AI與用戶交替創作)
- ✅ **實時詞彙查詢** (集成萌典API)
- ✅ **生詞本功能** (收藏喜歡的詞彙)
- ✅ **完整故事展示** (創作統計和分享功能)

### 🤖 AI Agent
- ✅ **DeepSeek API 集成** (部署在 Supabase Edge Function)
- ✅ **上下文感知** (根據故事歷史智能續寫)
- ✅ **階段控制** (開始/發展/收尾不同策略)
- ✅ **詞彙多樣性** (避免重複，類別平衡)

### 🛠️ 管理工具
- ✅ **詞彙導入工具** (批量導入JSON格式詞彙)
- ✅ **詞彙瀏覽器** (篩選、搜索、分頁)
- ✅ **AI測試工具** (調試和優化AI響應)
- ✅ **統計面板** (實時數據統計)

### 💾 數據系統
- ✅ **Supabase 數據庫** (用戶、詞彙、故事會話)
- ✅ **RLS 安全策略** (數據訪問控制)
- ✅ **120個示例詞彙** (L1-L6精選詞彙)
- ✅ **本地存儲** (生詞本持久化)

---

## 📁 項目結構

```
story-vocab/
├── story-game.html           # 🎮 主遊戲頁面（單頁應用）
│
├── admin/                    # 🛠️ 管理後台
│   ├── index.html           # 後台首頁
│   ├── import-vocabulary.html    # 詞彙導入工具
│   ├── browse-vocabulary.html    # 詞彙瀏覽器
│   └── test-ai-agent.html   # AI Agent 測試
│
├── js/                       # 📦 JavaScript 模塊
│   ├── config.js            # 配置文件（Supabase URL/Key）
│   └── supabase-client.js   # Supabase 客戶端封裝
│
├── supabase/                 # 🗄️ 後端服務
│   ├── migrations/          # 數據庫遷移腳本
│   └── functions/           # Edge Functions
│       └── story-agent/     # AI 故事生成服務
│
├── data/                     # 📊 數據文件
│   └── sample-vocabulary.json   # 示例詞彙（120個）
│
└── docs/                     # 📚 設計文檔
    └── DESIGN.md            # 完整設計文檔（產品規劃、架構設計）
```

---

## 🚀 部署指南

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

# 部署函數
cd story-vocab
npx supabase functions deploy story-agent
```

詳細步驟參見：[EDGE_FUNCTION_DEPLOY.md](./EDGE_FUNCTION_DEPLOY.md)

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

- **`vocabulary`** - 詞彙表（詞語、拼音、級別、主題等）
- **`story_sessions`** - 故事會話（對話歷史、進度、分數）
- **`user_vocabulary`** - 用戶學習記錄（掌握度、使用次數）
- **`user_wordbook`** - 生詞本（用戶收藏的詞彙）

詳細的數據庫設計請參見 [docs/DESIGN.md](./docs/DESIGN.md)

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
- 🚀 [Edge Function 部署指南](./EDGE_FUNCTION_DEPLOY.md) - 詳細部署步驟
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
