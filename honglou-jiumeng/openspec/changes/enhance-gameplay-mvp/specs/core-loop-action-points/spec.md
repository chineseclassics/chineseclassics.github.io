## ADDED Requirements

### Requirement: 節氣行動力（AP）作為每日取捨核心
玩家在每個節氣擁有固定行動力；當 AP 用盡前只能執行有限行動，AP 為 0 時需推進節氣。

#### Scenario: 顯示與重置
- 初始設定 `actionPointsPerJieqi = 4`（可配置）。
- 進入新節氣時，`currentActionPoints` 重置為 `actionPointsPerJieqi`。
- UI 在頂部或面板顯示 AP，如 `4/4`，並在消耗時即時更新。

#### Scenario: 行為消耗
- 澆灌花魂消耗 1 AP；修復建築消耗 2–3 AP（按衰敗程度）；種植花魂/花苗消耗 2 AP；尋找記憶消耗 1–2 AP（按類型）。
- 若 AP 不足，按鈕禁用並顯示提示文字（例如：「行動力不足，請推進節氣」）。

#### Scenario: 推進節氣
- 當玩家選擇「推進節氣」，AP 重置；觸發季節檢查、事件、清晰度衰減等行為。

### Requirement: 行動提示與教學
當 AP 將用盡（≤1）時，以提示氣泡建議玩家合理收尾（例如修復或澆灌）。

#### Scenario: 新手引導
- 教學步驟包含「今天的行動力只有 X 點，請選擇…」，點亮對應按鈕並高亮地圖。

