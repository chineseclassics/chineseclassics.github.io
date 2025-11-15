# Design Notes: enhance-gameplay-mvp

## Architectural Intent
- 保持現有「單頁 Web + 原生 JS」的輕量結構，按模組分拆職責，避免一次性重構。
- 核心數據（資源/建築/花魂/記憶/節氣）保持原型與 ID 穩定，僅在其上擴展欄位（AP、buff、clarity、路線標籤等）。
- 功能以「能力開關」(feature flags) 逐步疊加，便於回退與 A/B 驗證。

## Module Boundaries
- state.js：全域遊戲狀態（AP、clarity、flags、config），事件匯流。
- garden.js：地圖格子、建築放置/移除、佈局掃描與 buff 計算。
- flowers.js：花魂生長、季節倍率、淚水偏好、雙路線與品質標記。
- memories.js：記憶生成/重溫、清晰度計算、列表視覺映射。
- ui-dialogs.js：對話框/教學/提示；行動按鈕的可用性控制。
- ai-integration.js：DeepSeek 輪迴短評、情緒補光、結局總結；快取與降級策略。

## Data Additions
- actionPointsPerJieqi:number、currentActionPoints:number
- buildingBuffs: {buildingId, area, rules[], effects[]}
- flower.route:"tragic"|"gentle"|"neutral"，quality:"common"|"rare"|"sublime"
- memory.clarity:number（0–100）、lastSeenAt:time
- featureFlags: { actionPoints:boolean, layoutBuffs:boolean, flowerRoutes:boolean, memoryClarity:boolean, aiFlavor:boolean, newUI:boolean }

## Visual System
- Tailwind 驅動卡片式格子與面板；SVG 圖標統一資源指示；插畫少量高質感可重用。
- 清晰度映射：100–70 完整文段；69–40 縮句；39–10 關鍵詞；<10 模糊占位。
- 佈局 Buff 顯示：在建築與花魂詳情中以徽章＋簡述提示。

## AI Calls
- 所有調用包裹為 promise，設計 `maxTokens`、`timeout`、`cacheKey`。
- 快取：localStorage by key（memoryId 或 cycleIndex 或 runId）。
- 降級：預製文本模板（依口吻：警幻/脂批/旁白）。

## Trade-offs
- 不用框架→學習曲線低、可快速交付；代價是 UI 狀態需謹慎管理。  
  緩解：模組邏輯與視覺解耦，狀態單向流轉（state→render）。


