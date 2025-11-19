# Action System Specification

## MODIFIED Requirements

### Action Cost for Memory Unlock

系統 SHALL 更新行動消耗邏輯，答題解鎖記憶不消耗行動力。

#### Scenario: Quiz unlock does not consume action points
- **WHEN** 玩家點擊未解鎖記憶進行答題
- **THEN** 答題過程不消耗行動力
- **AND** 答題完成後解鎖記憶並獲得資源
- **AND** 只有使用資源的行動才消耗行動力

### Action Cost Table

系統 SHALL 更新行動消耗表，移除「尋找絳珠」和「尋找寶玉領悟」的行動消耗。

#### Scenario: Action costs updated
- **WHEN** 玩家執行行動
- **THEN** 可用行動包括：
  - 澆灌花魂（消耗 1 點行動力）
  - 種植新花魂（消耗 2 點行動力）
  - 解鎖建築（不消耗行動力，只消耗靈石）
- **AND** 不再有「尋找絳珠」和「尋找寶玉領悟」行動

### Complete Seasonal Cycle Loop

系統 SHALL 更新每個節氣的完整循環，包含「答題解鎖記憶」和「使用資源進行行動」兩個部分。

#### Scenario: Complete seasonal cycle loop
- **WHEN** 玩家進入新節氣
- **THEN** 獲得 4 點行動力
- **AND** 可以進行以下操作：
  1. 答題解鎖記憶（不消耗行動力）→ 獲得資源
  2. 使用資源進行行動（消耗行動力）：
     - 解鎖建築（不消耗行動力，只消耗靈石）
     - 種植花魂（消耗 2 點行動力）
     - 澆灌花魂（消耗 1 點行動力，消耗絳珠）
- **AND** 花魂升級 → 解鎖新記憶 → 回到步驟 1

## REMOVED Requirements

### Memory Search Actions

系統 SHALL 移除「尋找絳珠」和「尋找寶玉領悟」行動按鈕。

#### Scenario: Memory search actions removed
- **WHEN** 玩家查看行動面板
- **THEN** 不再顯示「尋找絳珠」按鈕
- **AND** 不再顯示「尋找寶玉領悟」按鈕
- **AND** 記憶通過記憶發現機制自動出現在 UI 中

### Action Cost for Memory Search

系統 SHALL 移除「尋找絳珠」和「尋找寶玉領悟」的行動消耗。

#### Scenario: Memory search action costs removed
- **WHEN** 更新行動消耗表
- **THEN** 移除 `actionCosts.collectTears`
- **AND** 移除 `actionCosts.searchMemories`
- **AND** 保留 `actionCosts.waterFlower` 和 `actionCosts.plantFlower`

