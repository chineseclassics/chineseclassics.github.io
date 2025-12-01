# 課堂鬥豆即時計分系統最佳實踐方案

## 核心決策
- 移除「提交」按鈕；每次斷句即視為提交，豆子不可撤回。
- 放豆即判定：命中正解 +1 並標 `correct`；錯放標 `extra`（不加分），已放豆不可再點擊。
- 寫入策略改為「即時增量 + 輕節流（約 200–300ms）」：只送最新狀態，避免 2 秒批次。
- Realtime 為主、輪詢為備：寫入成功後依賴 Realtime 推送分數/排名；斷線時啟用既有輪詢。
- 時間統計以「最後互動用時」為準：`time_spent = lastInteraction - started_at`，每次放豆同步更新。
- 結束條件：所有玩家豆子用完或時間到即結束跳結果頁，無需等待手動提交。

## 數據結構
- `BeanPlacement`: `{ index: number; isCorrect: boolean; placedAt: number }`，每篇文章各有獨立 `Map<number, BeanPlacement>`。
- `TextState`: `characters: string[]; correctBreaks: Set<number>; userBreaks: Map<number, BeanPlacement>`（每篇持有）。
- 個人進度：`score`、`correct_breaks`、`wrong_breaks`、`last_interaction` 寫入 `game_participants`。
- 文章進度：`game_text_progress` upsert `correct_count`、`wrong_count`、`last_interaction`、`text_index`。

## 前端（GamePlay.vue）
- `toggleBreak`：
  - 移除刪除邏輯；豆子用完後禁用未放置槽。
  - 立即判定正誤並寫入 `userBreaks` 的 `BeanPlacement`。
  - 樣式複用練習頁 `.bean-slot.correct/.extra` 動畫；音效/震動用 add/error，不再有 remove。
- 即時寫入：
  - 新增 `updateProgress`（節流 200–300ms）：攜帶當前累積 `correctCount`、`wrongCount`、`score`、`lastInteraction`。
  - 樂觀更新本地分數；寫入失敗時恢復本地值並提示。
- UI 調整：
  - 移除「提交答案」按鈕，改為「實時計分中／豆子用完即完成」提示。
  - 豆子庫存與斷句板保持練習頁視覺；進度提示即時顯示 `userBreaks.size / correctBreaks.size`。
  - 分數區：個人分數（本地/Realtime）與團隊平均分、排名（Realtime）。

## 後端／Store（gameStore.ts）
- 新增（或重構）`updateProgress`：
  - Upsert `game_text_progress`：累積 `correct_count`、`wrong_count`、`last_interaction`。
  - 更新 `game_participants`：`score`、`correct_breaks`、`wrong_breaks`、`last_interaction`、`current_text_index`（以正在作答的篇序）。
  - 團隊模式：立即重算團隊平均分。
- 團隊分數：使用所有成員當前 `score` 求平均（乘 100 儲存保留精度），不依賴 `status = 'completed'`。
- 時間口徑：`time_spent` = `last_interaction` - `started_at`（秒），排行榜與結算共用。
- 勝負判定：
  - 團隊：平均分降序；分數同則隊伍平均用時（同口徑）。
  - 個人：分數優先、用時次之；平分平時為平局。
- 結束條件：
  - 所有玩家 `usedBeans >= totalBeans` 或時間到 → 將房間設為 `finished`；Teacher/學生端 Realtime 監聽後跳結果。

## Realtime 與節流
- 訂閱：`game_participants`（score/time）與 `game_teams`（total_score）。
- 去重：前端收到推播時比對本地舊值，僅在數值變化時刷新 UI，避免抖動。
- 斷線備援：沿用現有輪詢；連線恢復後停止輪詢。
- 寫入節流：同一玩家 200–300ms 內多次點擊合併為最新一筆，降低寫入量與推播噪音。

## UI/UX 要點
- 清晰提示「豆子不可撤回」「錯放仍佔名額」；錯誤豆使用醒目抖動。
- 豆子用完時鎖定未放置槽並顯示完成提示。
- 分數／排名區與練習頁風格一致（edamame-glass）。

## 實施步驟
1) 調整 `GamePlay.vue`：移除提交按鈕與刪除邏輯，加入 `BeanPlacement`、節流版 `updateProgress`、即時判定與樣式。
2) 將練習頁的 `.bean-slot.correct/.extra` 動畫複用到對戰頁（或抽公共樣式）。
3) 重構 store：新增/改造 `updateProgress`，即時更新 `game_text_progress`、`game_participants`、`game_teams`，統一時間口徑。
4) 勝負與結束：以豆子用完或時間到觸發 `finished`，結果頁取最新分數與用時。
5) Realtime 優化：去重刷新、節流寫入、輪詢備援。
6) 測試：單人/團隊、多篇、弱網（離線後重連）、全部豆子提前用完、時間到自動結束、Realtime 斷線恢復。
