# Requirements Document

## Introduction

本功能為「你畫我猜」遊戲的傳統模式添加 AI 智能詞語生成功能。在創建房間頁面的「自定義詞語」區域，玩家可以點擊「AI 生成」按鈕，系統將根據玩家輸入的房間主題，調用 DeepSeek API 自動生成一組適合繪畫猜詞遊戲的詞語，並自動填入自定義詞語輸入框中。此功能通過 Supabase Edge Function 實現，API Key 存儲在 Supabase Secrets 中以確保安全。

## Glossary

- **AI 生成按鈕**：位於「自定義詞語」標籤右側的按鈕，點擊後觸發 AI 詞語生成流程
- **DeepSeek API**：用於生成詞語的大語言模型 API 服務
- **房間主題**：玩家在創建房間時輸入的「詞句主題」，用於指導 AI 生成相關詞語
- **Edge Function**：Supabase 提供的無服務器函數，用於安全地調用 DeepSeek API
- **Supabase Secrets**：Supabase 提供的安全密鑰存儲服務，用於存放 DeepSeek API Key
- **自定義詞語輸入框**：用戶輸入詞語的文本區域，詞語以逗號或換行分隔

## Requirements

### Requirement 1

**User Story:** As a 房主, I want to 點擊「AI 生成」按鈕自動生成詞語, so that 我不需要手動輸入大量詞語就能快速創建房間。

#### Acceptance Criteria

1. WHEN 玩家在傳統模式下創建房間時 THEN the RoomCreate 組件 SHALL 在「自定義詞語（至少 6 個，支持中英文詞語）」標籤右側顯示一個「AI 生成」按鈕
2. WHEN 玩家點擊「AI 生成」按鈕且房間主題為空 THEN the 系統 SHALL 顯示提示信息要求先輸入房間主題
3. WHEN 玩家點擊「AI 生成」按鈕且房間主題已填寫 THEN the 系統 SHALL 調用 Edge Function 開始生成詞語
4. WHEN AI 詞語生成完成 THEN the 系統 SHALL 將生成的詞語以逗號分隔的形式自動填入自定義詞語輸入框
5. WHEN AI 詞語生成過程中 THEN the 按鈕 SHALL 顯示載入狀態（如「生成中...」）並禁用點擊

### Requirement 2

**User Story:** As a 系統, I want to 通過 Edge Function 安全調用 DeepSeek API, so that API Key 不會暴露在前端代碼中。

#### Acceptance Criteria

1. WHEN Edge Function 被調用時 THEN the Edge Function SHALL 從 Supabase Secrets 讀取 DeepSeek API Key
2. WHEN Edge Function 調用 DeepSeek API 時 THEN the Edge Function SHALL 傳入房間主題和生成要求
3. WHEN DeepSeek API 返回結果 THEN the Edge Function SHALL 解析返回的詞語列表並以 JSON 格式返回給前端
4. WHEN DeepSeek API 調用失敗或超時 THEN the Edge Function SHALL 返回錯誤信息給前端

### Requirement 3

**User Story:** As a 系統, I want to 過濾不適當的主題內容, so that 生成的詞語適合中學生使用。

#### Acceptance Criteria

1. WHEN 玩家輸入的主題包含不適合中學生的內容 THEN the Edge Function SHALL 在 prompt 中指示 AI 忽略不當內容並生成安全主題詞語（如動物、食物、日常用品）
2. WHEN 玩家輸入的主題無法被 AI 理解或過於無厘頭 THEN the Edge Function SHALL 指示 AI 盡量理解意圖，若無法理解則生成通用主題詞庫
3. WHEN 系統生成了與原主題不同的詞語 THEN the 前端 SHALL 在詞語填入後顯示提示信息說明詞語已根據主題調整

### Requirement 4

**User Story:** As a 系統, I want to 確保生成的詞語適合你畫我猜遊戲, so that 玩家可以通過繪畫有效表達這些詞語。

#### Acceptance Criteria

1. WHEN AI 生成詞語時 THEN the Edge Function SHALL 在 prompt 中要求詞語符合用戶設定的主題，可包含具體名詞、動物、物品、動作、抽象概念、心情等
2. WHEN AI 生成詞語時 THEN the Edge Function SHALL 要求生成約 50 個詞語以確保遊戲有豐富的詞語可用
3. WHEN AI 生成詞語時 THEN the Edge Function SHALL 要求詞語難度適中，長度在 2-8 個中文字符之間

### Requirement 5

**User Story:** As a 房主, I want to 在 AI 生成後仍可編輯詞語, so that 我可以根據需要調整詞語列表。

#### Acceptance Criteria

1. WHEN AI 詞語填入輸入框後 THEN the 玩家 SHALL 能夠自由編輯、刪除或添加詞語
2. WHEN 玩家對生成結果不滿意 THEN the 玩家 SHALL 能夠再次點擊「AI 生成」按鈕重新生成
3. WHEN 玩家再次點擊「AI 生成」按鈕 THEN the 系統 SHALL 清空現有詞語並填入新生成的詞語

### Requirement 6

**User Story:** As a 系統, I want to 限制 AI 生成的調用頻率, so that 防止用戶濫用導致 API 消耗過大。

#### Acceptance Criteria

1. WHEN 玩家在 5 分鐘內點擊「AI 生成」按鈕超過 10 次 THEN the 前端 SHALL 禁用按鈕並顯示提示（如「請求次數已達上限，請 5 分鐘後再試」）
2. WHEN 5 分鐘時間窗口過期 THEN the 前端 SHALL 自動解鎖按鈕並重置計數器
3. WHEN 玩家刷新頁面 THEN the 前端 SHALL 從 localStorage 讀取調用記錄以維持限制狀態

### Requirement 7

**User Story:** As a 系統, I want to 處理 API 調用的各種錯誤情況, so that 用戶能獲得清晰的錯誤提示。

#### Acceptance Criteria

1. WHEN DeepSeek API 返回錯誤 THEN the 前端 SHALL 顯示友好的錯誤提示（如「AI 服務暫時不可用，請稍後再試或手動輸入詞語」）
2. WHEN API 調用超時（超過 15 秒） THEN the 前端 SHALL 顯示超時提示並恢復按鈕狀態
3. WHEN 網絡連接失敗 THEN the 前端 SHALL 顯示網絡錯誤提示

