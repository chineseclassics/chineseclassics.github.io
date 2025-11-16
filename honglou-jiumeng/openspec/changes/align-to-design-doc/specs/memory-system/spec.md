# Memory System Specification

## ADDED Requirements

### Memory Quiz Verification System

系統 SHALL 實現答題驗證機制，玩家必須通過答題才能解鎖記憶。

#### Scenario: Player unlocks memory through quiz
- **WHEN** 玩家點擊未解鎖記憶
- **THEN** 系統顯示答題界面，包含 3 個題目
- **AND** 每個題目有 30 秒時間限制
- **AND** 玩家必須連續答對所有 3 個題目才能解鎖回憶
- **AND** 答錯可以重試，但每次答錯都會降低資源獲得比例

#### Scenario: Quiz timer expires
- **WHEN** 玩家在 30 秒內未完成答題
- **THEN** 該題目無法獲得資源（0%）
- **AND** 玩家可以繼續下一題或重試

#### Scenario: Resource reward calculation
- **WHEN** 玩家完成所有 3 個題目
- **THEN** 系統計算資源獎勵（基礎資源 × 時間係數 × 答錯係數）
- **AND** 時間係數：10 秒內 +10%，10-25 秒 100%，25-30 秒 -10%，超過 30 秒 0%
- **AND** 答錯係數：第一次答對 100%，答錯 1 次後 80%，答錯 2 次後 60%，依此類推
- **AND** 最終資源 = 所有題目的資源總和

### Memory Discovery Mechanism

系統 SHALL 實現記憶發現機制，記憶自動出現在 UI 中，不消耗行動力。

#### Scenario: Memory appears in UI
- **WHEN** 遊戲進度達到記憶解鎖條件
- **THEN** 記憶自動出現在記憶列表中
- **AND** 標註「第 X 回的記憶」（隱性化設計）
- **AND** 顯示記憶狀態（已解鎖/未解鎖）
- **AND** 不消耗行動力

### Chapter-Memory-Seasonal Cycle Mapping

系統 SHALL 實現回目、回憶、題目與節氣的對應關係。

#### Scenario: One chapter maps to multiple seasonal cycles
- **WHEN** 玩家讀完某回目
- **THEN** 該回目的所有回憶連續分佈在多個節氣中
- **AND** 每個節氣解鎖一個回憶
- **AND** 玩家需要連續答對所有題目才能解鎖所有回憶

## MODIFIED Requirements

### Memory Data Structure

系統 SHALL 更新記憶數據結構，包含以下屬性：

#### Scenario: Memory structure includes chapter mapping
- **WHEN** 創建新記憶
- **THEN** 記憶必須包含 `relatedChapter` 屬性（對應回目）
- **AND** 記憶必須包含 `questions` 數組（每個記憶 3 個題目）
- **AND** 記憶必須包含 `baseReward` 屬性（基礎資源獎勵）
- **AND** 記憶必須包含 `type` 屬性（"tear" 或 "stone"）
- **AND** 記憶必須包含 `readingRequired`、`readingVerified`、`unlocked` 屬性

### Memory Collection Flow

系統 SHALL 更新記憶收集流程，從直接收集改為答題驗證解鎖。

#### Scenario: Memory unlock through quiz
- **WHEN** 玩家點擊未解鎖記憶
- **THEN** 系統檢查 `readingRequired` 和 `readingVerified`
- **AND** 如果未驗證，顯示答題界面
- **AND** 玩家完成答題後，記憶解鎖（`unlocked = true`）
- **AND** 系統給予資源獎勵（根據記憶類型：tear 或 stone）

## REMOVED Requirements

### Direct Memory Collection

系統 SHALL 移除直接收集記憶的機制。

#### Scenario: Direct collection removed
- **WHEN** 玩家點擊記憶
- **THEN** 不再直接收集記憶
- **AND** 不再直接獲得資源
- **AND** 必須通過答題驗證才能解鎖

### Memory Type Standardization

系統 SHALL 標準化記憶類型，使用 `type: "tear"` 表示黛玉相關記憶（獲得絳珠）。

#### Scenario: Memory type standardized
- **WHEN** 更新記憶數據
- **THEN** 黛玉相關記憶使用 `type: "tear"`（獲得絳珠）
- **AND** 寶玉相關記憶使用 `type: "stone"`（獲得靈石）
- **AND** 移除 `relatedTear` 屬性（不再需要）

