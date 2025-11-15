# Change Proposal: enhance-gameplay-mvp

## Summary
Introduce the first scoped upgrade of 《紅樓舊夢》核心循環與視覺呈現，落地「記憶與時間」主題下的最小可用改進（MVP）。本提案聚焦低風險、可分步交付的機制與 UI 風格，優先不引入新框架，維持 Web 單頁與模組化 JS 的方向。

## Motivation
- 讓核心循環更有「每天要做選擇」的張力（節氣行動力），提升可玩性。
- 透過園林佈局 Buff、花魂雙路線，讓建造與養成更有策略層次。
- 將「記憶與時間」主題落到系統：記憶清晰度淡化／強化。
- 引入低頻、短文本的 DeepSeek 文字調味（輪迴批語、情緒補光、結局敘事）。
- 統一 UI 視覺：淡彩中國風插畫＋SVG 圖標，替換 emoji。
- 為未來 iOS / Steam 打包預留路徑（不改棧，保持可包殼）。

## Scope
Included:
- 核心循環：節氣行動力、園林佈局連鎖 Buff、花魂雙路線與品質標記、記憶清晰度系統。
- AI 調用（低頻）：輪迴短評、記憶情緒補光（首抽）、結局總結（每局一次）。
- UI/美術方向：卡片式格子、SVG 圖標、少量高質感插畫（AI 生成）。
- 技術選型與打包策略：原生 JS 模組化、Capacitor / Electron 打包預留。

Excluded:
- 重寫為前端框架或引擎（Vue/React/Unity）。
- 高成本全套美術重置（僅做「少而精」插畫補強）。

## Non-Goals
- 不引入重度 PVP/PVE 或複雜戰鬥系統。
- 不一次性重構所有數據與場景，而是逐步晉級。

## Success Criteria
- 玩家能明顯感知「每個節氣需要取捨」；行動力用盡需要推進時間。
- 園林放置影響花魂成長或資源效率（玩家能觀察到 buff 圖示或提示）。
- 黛玉花魂在不同淚水搭配下出現不同走向（文本與數值有差異）。
- 記憶清晰度 UI 有弱化／強化的視覺或文案提示。
- Emoji 大幅減少，核心指示改為 SVG 圖標與卡片插畫。
- DeepSeek 調用頻率可控（輪迴 ≤1 次、記憶首抽 1 次、結局 1 次）。

## Risks & Mitigations
- 風險：功能擴展引發狀態錯綜。  
  緩解：每個能力獨立開關（config flags），按能力分批上線。
- 風險：插畫風格不一致。  
  緩解：限定色板、留白、淡彩水墨小場景，先小量可重用插畫。
- 風險：AI 調用成本波動。  
  緩解：本地快取、失敗降級到本地文案；嚴格頻率限制。

## Dependencies
- 參考文件：`docs/GAMEPLAY_AI_PLAN.md`、`docs/STORY_THEME_DESIGN.md`、`docs/LIN_DAIYU_TEARS.md`、`docs/DESIGN.md`
- DeepSeek 金鑰（已於平台層，僅低頻讀取）

## Spec Map
本變更拆分為以下能力規範：
1) core-loop-action-points  
2) layout-buff-system  
3) flower-soul-paths  
4) memory-clarity-system  
5) ai-text-flavor  
6) ui-visual-style  
7) packaging-plan


