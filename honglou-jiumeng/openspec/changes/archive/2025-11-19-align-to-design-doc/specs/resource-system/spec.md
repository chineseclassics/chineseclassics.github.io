# Resource System Specification

## MODIFIED Requirements

### Unified Tear Resource

系統 SHALL 實現統一絳珠資源（保持 `tear` 命名），不分類型。

#### Scenario: Unified tear resource
- **WHEN** 系統初始化或更新資源
- **THEN** 使用 `gameData.resources.tear` 存儲統一絳珠資源
- **AND** UI 顯示為「絳珠」
- **AND** 所有資源引用使用 `tear`
- **AND** 所有花魂都使用相同的絳珠澆灌

### Resource Acquisition

系統 SHALL 更新資源獲取方式，從「尋找絳珠」行動改為「答題解鎖記憶獲得資源」。

#### Scenario: Resource acquired through memory unlock
- **WHEN** 玩家通過答題解鎖記憶
- **THEN** 根據記憶類型給予資源：
  - `type: "tear"` → 獲得絳珠（`tearReward`）
  - `type: "stone"` → 獲得靈石（`stoneReward`）
- **AND** 資源數量根據答題表現計算（時間 + 答錯懲罰）
- **AND** 不消耗行動力

## REMOVED Requirements

### Tear Type System

系統 SHALL 移除淚水類型系統。

#### Scenario: Tear types unified
- **WHEN** 更新資源系統
- **THEN** 移除所有淚水類型區分（葬花淚、焚稿淚等）
- **AND** 移除 `tears` 數組（如果存在）
- **AND** 使用統一絳珠資源（`tear`），不分類型

### Resource Acquisition Actions

系統 SHALL 移除「尋找絳珠」和「尋找寶玉領悟」行動。

#### Scenario: Resource acquisition actions removed
- **WHEN** 玩家需要獲得資源
- **THEN** 不再通過「尋找絳珠」行動生成記憶
- **AND** 不再通過「尋找寶玉領悟」行動生成記憶
- **AND** 資源通過答題解鎖記憶獲得

