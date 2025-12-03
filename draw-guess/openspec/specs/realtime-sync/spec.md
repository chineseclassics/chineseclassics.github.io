# Realtime Sync

## Requirements

### Requirement: Supabase Realtime Channels
系統 SHALL 使用 Supabase Realtime Channels 實現實時同步。

#### Scenario: Channel 創建
- 房間創建時，創建對應的 Realtime Channel
- Channel 名稱：`room:{room_code}`
- Channel 配置：presence, broadcast, postgres_changes

#### Scenario: Channel 訂閱
- 玩家加入房間時，訂閱房間 Channel
- 訂閱 presence（玩家在線狀態）
- 訂閱 broadcast（繪畫數據）
- 訂閱 postgres_changes（房間狀態、猜詞結果）

#### Scenario: Channel 取消訂閱
- 玩家離開房間時，取消訂閱
- 房間關閉時，所有玩家取消訂閱
- 取消訂閱時，清理相關資源

### Requirement: 房間狀態同步
系統 SHALL 實時同步房間狀態變化。

#### Scenario: 房間狀態監聽
- 監聽 `game_rooms` 表的變化（postgres_changes）
- 監聽 `room_participants` 表的變化（postgres_changes）
- 狀態變化時，所有玩家收到更新

#### Scenario: 狀態同步內容
- 房間狀態變化（waiting → playing → finished）
- 玩家加入/離開
- 當前輪次變化
- 當前畫家變化

#### Scenario: 狀態同步處理
- 收到狀態更新後，立即更新本地狀態
- 狀態更新觸發 UI 更新
- 狀態同步延遲盡量小（< 500ms）

### Requirement: 繪畫數據同步
系統 SHALL 實時同步繪畫數據。

#### Scenario: 繪畫數據發送
- 畫家繪畫時，序列化筆觸數據
- 使用 broadcast 消息發送到 Channel
- 節流處理（每 50ms 發送一次）
- 數據壓縮（只發送增量）

#### Scenario: 繪畫數據接收
- 其他玩家訂閱 broadcast 消息
- 收到數據後，立即反序列化
- 在本地 Canvas 上重繪
- 重繪流暢，無明顯延遲

#### Scenario: 繪畫同步優化
- 使用節流減少發送頻率
- 批量處理多個筆觸
- 數據壓縮（只發送必要數據）
- 錯誤處理（網絡失敗時重試）

### Requirement: 猜詞結果同步
系統 SHALL 實時同步猜詞結果。

#### Scenario: 猜詞結果監聽
- 監聽 `guesses` 表的變化（postgres_changes）
- 過濾條件：當前輪次（round_id）
- 只監聽猜中的記錄（is_correct = true）

#### Scenario: 猜詞結果同步
- 玩家猜中後，插入數據庫記錄
- 觸發 postgres_changes 事件
- 所有玩家收到更新
- 更新猜中玩家列表

#### Scenario: 猜詞同步處理
- 收到猜詞更新後，立即更新本地狀態
- 更新猜中玩家列表
- 更新分數顯示
- 同步延遲盡量小（< 1 秒）

### Requirement: 連接管理
系統 SHALL 管理 Realtime 連接狀態。

#### Scenario: 連接狀態監聽
- 監聽 Channel 連接狀態
- 連接成功時，更新 UI（可選提示）
- 連接失敗時，顯示錯誤提示
- 連接斷開時，嘗試重連

#### Scenario: 連接重試
- 連接失敗時，自動重試（最多 3 次）
- 重試間隔：1 秒、2 秒、5 秒
- 重試失敗後，顯示錯誤提示
- 用戶可以手動重試

#### Scenario: 錯誤處理
- 網絡錯誤：顯示友好提示，允許重試
- 權限錯誤：顯示權限提示
- 其他錯誤：顯示通用錯誤提示
- 錯誤提示低調設計（不搶奪畫作焦點）

### Requirement: Presence 管理
系統 SHALL 管理玩家在線狀態。

#### Scenario: Presence 更新
- 玩家加入房間時，更新 presence
- 玩家離開房間時，清除 presence
- Presence 包含：user_id, nickname, status

#### Scenario: Presence 顯示
- 顯示房間內所有在線玩家
- 顯示玩家在線狀態（可選）
- Presence 變化時，實時更新列表

