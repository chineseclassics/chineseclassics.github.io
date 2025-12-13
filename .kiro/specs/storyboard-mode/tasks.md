# Implementation Plan

> **注意**：數據庫遷移文件將存儲在 `draw-guess/supabase/migrations/` 目錄下，需要用戶手動執行。

## Phase 1: 數據庫和基礎設施

- [x] 1. 創建數據庫遷移和基礎類型
  - [x] 1.1 創建 story_chains 表的 SQL 遷移文件
    - 文件路徑：`draw-guess/supabase/migrations/20241213_create_story_chains.sql`
    - 包含 id, room_id, round_number, item_type, content, author_id, author_name, created_at
    - _Requirements: 6.5, 8.2_
  - [x] 1.2 創建 story_submissions 表的 SQL 遷移文件
    - 文件路徑：`draw-guess/supabase/migrations/20241213_create_story_submissions.sql`
    - 包含 id, round_id, user_id, sentence, vote_count, is_winner, created_at, updated_at
    - _Requirements: 4.4_
  - [x] 1.3 創建 story_votes 表的 SQL 遷移文件
    - 文件路徑：`draw-guess/supabase/migrations/20241213_create_story_votes.sql`
    - 包含 id, round_id, voter_id, submission_id, created_at
    - _Requirements: 5.3_
  - [x] 1.4 擴展 game_rooms 表添加 game_mode, single_round_mode, is_final_round 字段
    - 文件路徑：`draw-guess/supabase/migrations/20241213_alter_game_rooms_storyboard.sql`
    - _Requirements: 1.2, 7.1, 7.4_
  - [x] 1.5 創建 TypeScript 類型定義文件 (types/storyboard.ts)
    - 定義 StoryChainItem, Submission, Vote, StoryboardRoundStatus 接口
    - _Requirements: 10.1_

- [x] 2. Checkpoint - 用戶執行數據庫遷移
  - 用戶需要執行以下遷移文件（按順序）：
    1. `20241213_alter_game_rooms_storyboard.sql`
    2. `20241213_create_story_chains.sql`
    3. `20241213_create_story_submissions.sql`
    4. `20241213_create_story_votes.sql`

## Phase 2: Store 和 Composables

- [x] 3. 創建 Story Store
  - [x] 3.1 創建 stores/story.ts
    - 實現 storyChain, submissions, votes 狀態管理
    - 實現 loadStoryChain, addStoryChainItem 方法
    - _Requirements: 2.2, 6.5_

- [x] 4. 創建 useStoryboard Composable
  - [x] 4.1 實現句子提交邏輯 (submitSentence, updateSubmission)
    - 包含空白驗證和字數限制
    - _Requirements: 4.4, 4.7, 4.8_
  - [x] 4.2 實現畫布截圖上傳 (uploadCanvasSnapshot)
    - 上傳到 Supabase Storage
    - _Requirements: 6.4_
  - [x] 4.3 實現 Story_Chain 更新邏輯
    - _Requirements: 6.5_

- [x] 5. 創建 useVoting Composable
  - [x] 5.1 實現投票邏輯 (castVote, changeVote)
    - 包含自投限制檢查
    - _Requirements: 5.3, 5.4, 5.5_
  - [x] 5.2 實現投票統計和勝出選擇 (calculateWinner, getVoteCounts)
    - 包含平票隨機選擇邏輯
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. 擴展 useGame Composable
  - [x] 6.1 添加分鏡模式階段管理 (drawing → writing → voting → summary)
    - _Requirements: 3.5, 4.1, 4.10, 5.1_
  - [x] 6.2 添加得分計算邏輯
    - 編劇勝出 +10 分，畫家 5 + 投票人數×2 分，評星加分
    - _Requirements: 6.6, 6.7, 9.4_

- [x] 7. Checkpoint - 確保 Store 和 Composables 正常工作
  - 確保所有功能正常，如有問題請詢問用戶

## Phase 3: UI 組件

- [x] 8. 創建 StoryPanel 組件
  - [x] 8.1 實現故事歷史顯示區域
    - 顯示所有已確定的勝出句子
    - _Requirements: 3.4, 4.3_
  - [x] 8.2 實現句子輸入區域（編劇階段）
    - 包含字數提示和提交狀態反饋
    - _Requirements: 4.2, 4.5_
  - [x] 8.3 實現投票選項列表（投票階段）
    - 顯示所有提交的句子，支持點擊投票
    - _Requirements: 5.1_

- [x] 9. 創建 VotingModal 組件
  - [x] 9.1 實現投票界面
    - 顯示所有句子、投票倒計時、已投票狀態
    - _Requirements: 5.2, 5.3_
  - [x] 9.2 實現投票交互
    - 點擊選擇、更改投票、禁止自投
    - _Requirements: 5.4, 5.5_

- [x] 10. 創建 StorySetupModal 組件
  - [x] 10.1 實現故事開頭輸入界面
    - 包含字數限制提示和驗證
    - _Requirements: 2.1, 2.3, 2.4_

- [x] 11. 創建 StoryReview 組件
  - [x] 11.1 實現分鏡漫畫展示
    - 圖文交替顯示，標註作者
    - _Requirements: 8.2, 8.3, 8.4_
  - [x] 11.2 實現故事標題和操作按鈕
    - _Requirements: 8.6, 8.7_

- [x] 12. Checkpoint - 確保 UI 組件正常工作
  - 確保所有組件正常渲染，如有問題請詢問用戶

## Phase 4: 整合和擴展現有組件

- [x] 13. 擴展 RoomCreate 組件
  - [x] 13.1 添加遊戲模式選擇（傳統/分鏡接龍）
    - _Requirements: 1.1_
  - [x] 13.2 添加單局模式選項（分鏡模式專用）
    - _Requirements: 7.1_

- [x] 14. 擴展 WaitingLobby 組件
  - [x] 14.1 顯示當前遊戲模式標識
    - _Requirements: 1.3_
  - [x] 14.2 添加分鏡模式最少 3 人檢查
    - _Requirements: 1.4_

- [x] 15. 擴展 RoomView 組件
  - [x] 15.1 根據 game_mode 切換 UI 模式
    - 分鏡模式用 StoryPanel 替換 GuessingPanel
    - _Requirements: 10.2_
  - [x] 15.2 實現分鏡模式階段切換邏輯
    - drawing → writing → voting → summary
    - _Requirements: 3.5, 4.1, 4.10_
  - [x] 15.3 實現頂部提示欄分鏡模式適配
    - 顯示上一輪勝出句子、階段倒計時
    - _Requirements: 3.1, 4.2_
  - [x] 15.4 實現 Final_Round 結局倒數顯示
    - _Requirements: 7.5, 7.6_

- [x] 16. Checkpoint - 確保整合正常工作
  - 確保所有組件整合正常，如有問題請詢問用戶

## Phase 5: 遊戲流程和結算

- [x] 17. 實現遊戲開始流程
  - [x] 17.1 分鏡模式開始時顯示 StorySetupModal
    - _Requirements: 2.1_
  - [x] 17.2 房主提交故事開頭後開始第一輪
    - _Requirements: 2.2_

- [x] 18. 實現輪次結算流程
  - [x] 18.1 投票結束後計算勝出句子
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 18.2 上傳畫布截圖並更新 Story_Chain
    - _Requirements: 6.4, 6.5_
  - [x] 18.3 計算並更新玩家得分
    - _Requirements: 6.6, 6.7_
  - [x] 18.4 顯示結算結果
    - _Requirements: 6.8_

- [x] 19. 實現局結束和故事結局流程
  - [x] 19.1 一局結束時詢問房主是否設為最後一局
    - _Requirements: 7.3_
  - [x] 19.2 最後一局結束時顯示故事結尾輸入
    - _Requirements: 7.7, 7.8_
  - [x] 19.3 提交或跳過結尾後進入故事回顧
    - _Requirements: 7.9, 8.1_

- [x] 20. 實現遊戲結束頁面
  - [x] 20.1 顯示故事回顧（StoryReview 組件）
    - _Requirements: 8.1, 8.2_
  - [x] 20.2 顯示最終排行榜和貢獻統計
    - _Requirements: 9.5, 9.6_

- [x] 21. Final Checkpoint - 完整功能測試
  - 確保所有功能正常工作，如有問題請詢問用戶
