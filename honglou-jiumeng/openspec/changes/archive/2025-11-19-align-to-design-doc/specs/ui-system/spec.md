# UI System Specification

## ADDED Requirements

### Quiz Dialog Interface

系統 SHALL 實現答題對話框界面，用於顯示題目和收集答案。

#### Scenario: Quiz dialog displays questions
- **WHEN** 玩家點擊未解鎖記憶
- **THEN** 顯示答題對話框，包含：
  - 標題：「第 X 回的記憶 - 回憶名稱」
  - 進度顯示：「題目 1/3」
  - 時間倒計時：「剩餘時間：30 秒」
  - 問題內容
  - 選項按鈕（3-4 個選項）
  - 反饋信息（答對/答錯）
- **AND** 玩家選擇答案後自動進入下一題
- **AND** 完成所有 3 題後顯示資源獎勵並解鎖記憶

#### Scenario: Quiz timer display
- **WHEN** 答題界面顯示
- **THEN** 顯示時間倒計時（30 秒）
- **AND** 時間倒計時實時更新
- **AND** 時間到達 0 時顯示超時提示

#### Scenario: Quiz feedback display
- **WHEN** 玩家選擇答案
- **THEN** 顯示答對/答錯反饋
- **AND** 顯示當前資源獲得比例（根據時間和答錯次數）
- **AND** 答錯時提示「建議重新閱讀第 X 回原文」

### Memory List UI Updates

系統 SHALL 更新記憶列表 UI，顯示記憶狀態和回目標註。

#### Scenario: Memory list shows status
- **WHEN** 玩家查看記憶列表
- **THEN** 顯示記憶狀態：
  - 已解鎖：綠色標記
  - 未解鎖：灰色標記
- **AND** 標註「第 X 回的記憶」（隱性化設計）
- **AND** 點擊未解鎖記憶時顯示答題界面

### Resource Display Updates

系統 SHALL 確保資源顯示 UI 使用 `tear`（絳珠）命名。

#### Scenario: Resource display updated
- **WHEN** 玩家查看資源顯示
- **THEN** 顯示「絳珠」
- **AND** 使用 `tear-count` 元素 ID
- **AND** 資源變化時顯示動畫效果

## MODIFIED Requirements

### Memory Panel UI

系統 SHALL 更新記憶面板 UI，移除舊的行動按鈕，更新記憶列表顯示。

#### Scenario: Memory panel updated
- **WHEN** 玩家查看記憶面板
- **THEN** 不再顯示「尋找絳珠」和「尋找寶玉領悟」按鈕
- **AND** 記憶列表顯示所有記憶（已解鎖/未解鎖）
- **AND** 點擊未解鎖記憶時顯示答題界面

### Action Panel UI

系統 SHALL 更新行動面板 UI，移除「尋找絳珠」和「尋找寶玉領悟」按鈕。

#### Scenario: Action panel updated
- **WHEN** 玩家查看行動面板
- **THEN** 不再顯示「尋找絳珠」按鈕
- **AND** 不再顯示「尋找寶玉領悟」按鈕
- **AND** 保留「推進節氣」按鈕（如有）

## REMOVED Requirements

### Old Memory Collection UI

系統 SHALL 移除舊的記憶收集 UI 元素。

#### Scenario: Old memory collection UI removed
- **WHEN** 更新 UI
- **THEN** 移除「尋找絳珠」按鈕
- **AND** 移除「尋找寶玉領悟」按鈕
- **AND** 移除相關的事件監聽器

