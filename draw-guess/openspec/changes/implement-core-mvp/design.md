# Design Document: implement-core-mvp

## Architecture Overview

### 技術架構

```
前端（Vue 3 + Vite）
    ├── Components (Vue 組件)
    ├── Stores (Pinia 狀態管理)
    ├── Composables (可復用邏輯)
    └── Router (Vue Router)
    ↓
Supabase Client
    ↓
Supabase Services
├── Authentication (Google OAuth + Anonymous)
├── Database (PostgreSQL)
└── Realtime (Channels)
```

### 數據流

**房間創建流程**：
```
用戶輸入房間信息
  → 生成 6 位房間碼
  → 插入 game_rooms 表
  → 創建 Realtime Channel
  → 返回房間信息
```

**繪畫同步流程**：
```
畫家繪畫
  → 序列化繪畫數據
  → 節流處理（每 50ms）
  → Broadcast 到 Realtime Channel
  → 其他玩家接收並重繪
```

**猜詞流程**：
```
玩家輸入猜測
  → 匹配判斷（精確匹配）
  → 如果匹配：插入 guesses 表
  → 觸發 postgres_changes
  → 所有玩家收到更新
  → 更新分數
```

## Database Design

### 核心表結構

**users 表**：
- `id` (UUID, PRIMARY KEY)
- `email` (TEXT, UNIQUE, nullable)
- `display_name` (TEXT, NOT NULL)
- `avatar_url` (TEXT, nullable)
- `user_type` (TEXT, DEFAULT 'registered')
- `created_at`, `last_login_at`

**user_identities 表**：
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FOREIGN KEY)
- `provider` (TEXT, NOT NULL) - 'google' | 'anonymous'
- `provider_id` (TEXT, NOT NULL)
- `provider_data` (JSONB)

**game_rooms 表**：
- `id` (UUID, PRIMARY KEY)
- `code` (TEXT, UNIQUE, NOT NULL) - 6 位房間碼
- `name` (TEXT, NOT NULL)
- `host_id` (UUID, FOREIGN KEY)
- `words` (JSONB, NOT NULL) - 詞語列表
- `word_count` (INT, NOT NULL) - 詞語總數
- `status` (TEXT, DEFAULT 'waiting') - 'waiting' | 'playing' | 'finished'
- `settings` (JSONB) - 遊戲設置
- `current_round` (INT, DEFAULT 0)
- `current_drawer_id` (UUID, nullable)
- `created_at`

**room_participants 表**：
- `id` (UUID, PRIMARY KEY)
- `room_id` (UUID, FOREIGN KEY)
- `user_id` (UUID, FOREIGN KEY)
- `nickname` (TEXT, NOT NULL)
- `score` (INT, DEFAULT 0)
- `joined_at`

**game_rounds 表**：
- `id` (UUID, PRIMARY KEY)
- `room_id` (UUID, FOREIGN KEY)
- `round_number` (INT, NOT NULL)
- `drawer_id` (UUID, FOREIGN KEY)
- `word_text` (TEXT, NOT NULL)
- `word_source` (TEXT) - 'wordlist' | 'custom'
- `drawing_data` (JSONB) - 繪畫數據
- `started_at`, `ended_at`

**guesses 表**：
- `id` (UUID, PRIMARY KEY)
- `round_id` (UUID, FOREIGN KEY)
- `user_id` (UUID, FOREIGN KEY)
- `guess_text` (TEXT, NOT NULL)
- `is_correct` (BOOLEAN, DEFAULT FALSE)
- `score_earned` (INT, DEFAULT 0)
- `guessed_at`

## Realtime Architecture

### Channel 設計

**房間 Channel**：`room:{room_code}`
- **presence**：玩家在線狀態
- **broadcast**：繪畫數據（高頻率）
- **postgres_changes**：房間狀態變化、猜詞結果

### 同步策略

**繪畫數據**：
- 使用 `broadcast` 消息（低延遲）
- 節流處理：每 50ms 發送一次
- 數據壓縮：只發送筆觸增量

**房間狀態**：
- 使用 `postgres_changes` 監聽（可靠）
- 監聽 `game_rooms` 表的變化
- 監聽 `room_participants` 表的變化

**猜詞結果**：
- 使用 `postgres_changes` 監聽
- 監聽 `guesses` 表的變化
- 實時更新猜中玩家列表

## Code Structure

### 文件組織

```
js/
├── config.js                 # Supabase 配置
├── supabase-client.js        # Supabase 客戶端封裝
├── app.js                    # 應用入口
├── core/
│   ├── room-manager.js       # 房間管理
│   ├── game-state.js         # 遊戲狀態
│   └── realtime-sync.js      # 實時同步
├── features/
│   ├── drawing-canvas.js     # 繪畫功能
│   ├── guessing-system.js    # 猜詞系統
│   └── scoring-system.js     # 計分系統
└── ui/
    ├── screens.js            # 界面顯示
    └── modals.js             # 彈窗管理
```

### 核心模組職責

**room-manager.js**：
- 房間 CRUD 操作
- 房間碼生成和驗證
- 玩家加入/離開管理

**game-state.js**：
- 遊戲狀態機管理
- 輪次管理
- 詞語選擇邏輯

**realtime-sync.js**：
- Realtime Channel 管理
- 連接狀態管理
- 消息發送和接收

**drawing-canvas.js**：
- Canvas 繪圖邏輯
- 繪畫工具管理
- 繪畫數據序列化

**guessing-system.js**：
- 猜詞輸入處理
- 匹配判斷
- 提示管理

**scoring-system.js**：
- 分數計算邏輯
- 分數更新
- 排行榜管理

## UI Design Principles

### 極簡設計

**配色方案**：
- 背景：白色或極淺灰色（#FAFAFA）
- 文字：深灰色（#333333, #555555）
- 邊框：淺灰色（#E0E0E0, #CCCCCC）
- 強調：深灰色（#666666, #888888）

**視覺元素**：
- 細線條邊框（1px）
- 極少或無陰影
- 圓角設計（4px）
- 低調的圖標（細線條）

**動畫**：
- 適量的、優雅的、微妙的動畫
- 淡入淡出效果
- 平滑的過渡
- 輕微的懸停效果

### 布局重點

**遊戲界面**：
- 畫布占據主要視覺空間（70-80%）
- 工具欄極簡設計（細線條圖標）
- 猜詞區域低調（不搶奪畫作焦點）
- 玩家信息區域簡約

## Performance Considerations

### 繪畫優化

**數據壓縮**：
- 只發送筆觸增量（起點、終點、顏色、粗細）
- 使用 JSON 序列化（輕量）
- 考慮使用二進制格式（未來優化）

**節流策略**：
- 繪畫數據：每 50ms 發送一次
- 使用 `requestAnimationFrame` 優化繪製
- 批量處理多個筆觸

### 實時同步優化

**連接管理**：
- 單一 Channel 連接（避免多連接）
- 連接狀態監聽和重試
- 錯誤處理和降級

**消息優化**：
- 只同步必要的數據
- 避免重複消息
- 使用消息去重

## Security Considerations

### RLS 策略

**game_rooms 表**：
- 所有人可以讀取公開房間
- 只有房主可以更新房間設置
- 只有房主可以刪除房間

**room_participants 表**：
- 房間內玩家可以讀取
- 玩家可以加入房間
- 玩家可以離開自己的記錄

**guesses 表**：
- 房間內玩家可以讀取
- 玩家可以插入自己的猜測
- 玩家不能修改他人的猜測

### 數據驗證

**房間創建**：
- 驗證房間名稱（長度、字符）
- 驗證詞語列表（最少 6 個）
- 驗證遊戲設置（時間、輪數）

**猜詞輸入**：
- 驗證輸入長度
- 防止 SQL 注入（使用參數化查詢）
- 防止 XSS（輸入轉義）

## Testing Strategy

### 單元測試（手動）

**房間系統**：
- 測試房間創建
- 測試房間加入
- 測試房間離開
- 測試房間狀態切換

**繪畫系統**：
- 測試鼠標繪畫
- 測試觸摸繪畫
- 測試工具切換
- 測試數據序列化

**猜詞系統**：
- 測試輸入處理
- 測試匹配判斷
- 測試提示顯示

**實時同步**：
- 測試多設備同步
- 測試連接重試
- 測試錯誤處理

### 集成測試

**完整遊戲流程**：
- 創建房間 → 加入房間 → 開始遊戲 → 繪畫 → 猜詞 → 計分 → 結束

**多玩家測試**：
- 2-4 個玩家同時參與
- 測試實時同步延遲
- 測試分數計算準確性

