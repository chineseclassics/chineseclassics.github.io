# User System

## Requirements

### Requirement: 匿名遊玩模式
系統 SHALL 支持用戶無需登入即可遊玩。

#### Scenario: 匿名用戶創建
- 用戶訪問應用，選擇「匿名遊玩」
- 系統創建匿名會話（使用 Supabase 匿名認證）
- 系統生成臨時暱稱（如「訪客1234」）
- 用戶可以立即開始遊戲，無需註冊

#### Scenario: 匿名用戶標識
- 匿名用戶在房間中顯示臨時暱稱
- 匿名用戶的數據不保存到數據庫（僅 session）
- 匿名用戶離開後，數據不保留

### Requirement: Google OAuth 登入
系統 SHALL 支持用戶使用 Google 賬號登入。

#### Scenario: Google 登入流程
- 用戶點擊「Google 登入」按鈕
- 系統跳轉到 Google OAuth 授權頁面
- 用戶授權後，系統獲取用戶信息
- 系統創建或更新用戶記錄（UUID 主鍵）
- 用戶成功登入，可以累積分數和統計

#### Scenario: 用戶資料管理
- 登入用戶顯示 Google 頭像和名稱
- 用戶可以查看個人資料
- 用戶可以登出

### Requirement: UUID 主鍵 + 多重身份系統
系統 SHALL 使用 UUID 作為用戶主鍵，支持多種登入方式。

#### Scenario: 用戶主表設計
- `users` 表使用 UUID 作為主鍵
- 支持 `email`（Google 用戶有，匿名為 NULL）
- 支持 `display_name`（顯示名稱）
- 支持 `user_type`（'registered' | 'anonymous'）

#### Scenario: 身份關聯表設計
- `user_identities` 表關聯用戶和登入方式
- 支持 `provider`（'google' | 'anonymous'）
- 支持 `provider_id`（提供商的用戶 ID）
- 一個用戶可以有多個身份（預留未來擴展）

### Requirement: 用戶認證狀態管理
系統 SHALL 管理用戶的認證狀態。

#### Scenario: 認證狀態監聽
- 系統監聽 Supabase 認證狀態變化
- 認證狀態變化時，更新 UI
- 認證狀態變化時，更新用戶信息

#### Scenario: 認證狀態持久化
- 登入狀態保存在 Supabase session
- 刷新頁面後，登入狀態保持
- 登出後，清除 session

