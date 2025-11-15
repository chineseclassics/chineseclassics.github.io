## ADDED Requirements

### Requirement: 記憶連鎖與故事線
每段記憶具備 `storyLineId` 與 `orderIndex`，同一故事線按順序收集可獲額外獎勵。

#### Scenario: 黛玉·葬花線
- 範例線：初入賈府 → 與寶玉相知 → 葬花 → 焚稿 → 病重。
- UI 在記憶列表以「線索條」或「章節指示」顯示進度。

#### Scenario: 完成獎勵
- 湊滿前 N 段：發放高品質絳珠／靈石／花魂成長 boost。
- 完成整線：顯示小演出（RPG 對話或插畫），記錄於結局敘事。

### Requirement: 資料結構與 UI 呈現
`gameData.memories` 擴充為 { id, storyLineId, orderIndex, clarity, ... }；UI 提供檢視按故事線分組。


