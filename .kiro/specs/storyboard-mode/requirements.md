# Requirements Document

## Introduction

本文檔定義了「分鏡接龍模式 (Storyboard Mode)」的需求規格。這是一個在現有「你畫我猜」遊戲基礎上新增的遊戲模式，將傳統的猜詞玩法轉變為合作創作故事的體驗。玩家不再猜測標準答案，而是根據畫面創作下一句故事劇情，通過投票選出最佳句子，最終產出一個由「圖+文」交替構成的完整故事鏈。

## Glossary

- **Storyboard_Mode**: 分鏡接龍模式，一種合作與競爭並存的漫畫創作遊戲模式
- **Story_Chain**: 故事鏈，存儲每一輪勝出結果的數據結構，包含文字和圖片交替的內容
- **Director**: 導演/畫家，當前輪次負責繪畫的玩家
- **Screenwriter**: 編劇/猜測者，當前輪次負責撰寫故事句子的玩家
- **Submission**: 劇本提交，編劇提交的故事句子
- **Voting_Phase**: 投票階段，所有玩家對提交的句子進行投票的階段
- **Drawing_Phase**: 繪畫階段，畫家根據上一輪勝出句子進行繪畫的階段
- **Winning_Sentence**: 勝出句子，投票階段獲得最高票數的句子
- **Canvas_Snapshot**: 畫布截圖，當前輪次結束時保存的畫布圖像，存儲於 Supabase_Storage
- **Supabase_Storage**: Supabase 提供的對象存儲服務，用於存儲畫布截圖
- **Game_Round**: 一局遊戲，每位玩家輪流擔任畫家一次為一局（與傳統模式定義相同）
- **Final_Round**: 最後一局，房主標記的最後一局，該局結束後故事結束
- **Single_Round_Mode**: 單局模式，房間設定選項，勾選後遊戲只進行一局即結束

## Requirements

### Requirement 1

**User Story:** As a 房主, I want to 在創建房間時選擇遊戲模式, so that 我可以決定玩傳統猜詞模式還是分鏡接龍模式.

#### Acceptance Criteria

1. WHEN 房主創建房間 THEN Game_System SHALL 提供「傳統模式」和「分鏡接龍模式」兩個選項供選擇
2. WHEN 房主選擇分鏡接龍模式 THEN Game_System SHALL 將房間的 game_mode 設置為 'storyboard'
3. WHEN 房間處於分鏡接龍模式 THEN Game_System SHALL 在等待大廳顯示當前模式標識
4. WHEN 分鏡接龍模式房間人數少於 3 人 THEN Game_System SHALL 禁止開始遊戲並提示需要至少 3 人

### Requirement 2

**User Story:** As a 房主, I want to 在遊戲開始時設定故事開頭, so that 所有玩家有一個共同的創作起點.

#### Acceptance Criteria

1. WHEN 分鏡接龍模式遊戲開始 THEN Game_System SHALL 提示房主輸入故事開頭句子
2. WHEN 房主提交故事開頭 THEN Game_System SHALL 將該句子作為 Story_Chain 的第一個元素存儲
3. WHEN 故事開頭為空或僅包含空白字符 THEN Game_System SHALL 拒絕提交並提示房主輸入有效內容
4. WHEN 故事開頭超過 100 個字符 THEN Game_System SHALL 拒絕提交並提示字數限制

### Requirement 3

**User Story:** As a 畫家（導演）, I want to 看到上一輪勝出的句子作為繪畫題目, so that 我可以根據劇情繪製下一個分鏡.

#### Acceptance Criteria

1. WHEN 新輪次開始且當前玩家是畫家 THEN Game_System SHALL 在頂部顯示上一輪勝出句子作為繪畫題目
2. WHEN 畫家開始繪畫 THEN Game_System SHALL 啟動 60 秒繪畫倒計時並同步畫筆數據給所有玩家
3. WHILE 繪畫階段進行中 THEN Game_System SHALL 同時允許編劇提交句子
4. WHEN 繪畫時間結束 THEN Game_System SHALL 自動進入投票階段

### Requirement 4

**User Story:** As a 編劇（猜測者）, I want to 根據畫面創作下一句故事劇情, so that 我可以參與故事的共同創作.

#### Acceptance Criteria

1. WHEN 新輪次開始且當前玩家是編劇 THEN Game_System SHALL 在頂部顯示上一輪勝出句子作為創作背景
2. WHEN 編劇提交句子 THEN Game_System SHALL 將句子存入當前輪次的 Submissions 列表
3. WHEN 編劇提交句子 THEN Game_System SHALL 向該編劇顯示「劇本已提交，等待投票」的確認訊息
4. WHEN 編劇提交句子 THEN Game_System SHALL 隱藏該句子不向其他玩家廣播
5. WHEN 編劇提交的句子為空或僅包含空白字符 THEN Game_System SHALL 拒絕提交
6. WHEN 編劇提交的句子超過 100 個字符 THEN Game_System SHALL 拒絕提交並提示字數限制
7. WHILE 投票階段尚未開始 THEN Game_System SHALL 允許編劇修改或重新提交句子
8. WHEN 投票階段開始 THEN Game_System SHALL 鎖定所有提交內容不允許修改

### Requirement 5

**User Story:** As a 玩家, I want to 在投票階段為最佳句子投票, so that 我可以參與決定故事的走向.

#### Acceptance Criteria

1. WHEN 繪畫時間結束 THEN Game_System SHALL 進入投票階段並顯示所有提交的句子
2. WHEN 投票階段開始 THEN Game_System SHALL 啟動 60 秒投票倒計時
3. WHEN 玩家點擊某個句子 THEN Game_System SHALL 記錄該玩家的投票選擇
4. WHEN 玩家投票 THEN Game_System SHALL 允許玩家在投票時間內更改投票
5. WHEN 玩家嘗試投票給自己提交的句子 THEN Game_System SHALL 拒絕該投票並提示不能投給自己
6. WHEN 投票時間結束或所有玩家都已投票 THEN Game_System SHALL 結束投票階段
7. WHEN 沒有任何編劇提交句子 THEN Game_System SHALL 跳過投票階段並使用「故事繼續發展中...」作為勝出句子
8. WHEN 畫家參與投票 THEN Game_System SHALL 允許畫家投票給任意編劇的句子

### Requirement 6

**User Story:** As a 玩家, I want to 在投票結束後看到結算結果, so that 我知道哪個句子勝出以及得分情況.

#### Acceptance Criteria

1. WHEN 投票結束 THEN Game_System SHALL 統計每個句子的得票數
2. WHEN 存在唯一最高票句子 THEN Game_System SHALL 將該句子標記為勝出句子
3. WHEN 存在多個票數相同的最高票句子 THEN Game_System SHALL 隨機選擇其中一個作為勝出句子
4. WHEN 勝出句子確定 THEN Game_System SHALL 將畫布截圖上傳到 Supabase_Storage
5. WHEN 畫布截圖上傳完成 THEN Game_System SHALL 將勝出句子和截圖 URL 添加到 Story_Chain
6. WHEN 結算完成 THEN Game_System SHALL 為勝出句子的作者增加 10 分
7. WHEN 結算完成 THEN Game_System SHALL 為當前畫家增加 5 分加上投票人數乘以 2 分
8. WHEN 結算完成 THEN Game_System SHALL 顯示投票結果、勝出句子和得分變化

### Requirement 7

**User Story:** As a 房主, I want to 控制故事的長度和結束時機, so that 玩家能夠有計劃地推進故事走向結局.

#### Acceptance Criteria

1. WHEN 房主創建分鏡接龍模式房間 THEN Game_System SHALL 提供「單局模式」選項供勾選
2. WHEN 房主勾選單局模式 THEN Game_System SHALL 在一局結束後自動進入故事結局階段
3. WHEN 一局結束且非單局模式 THEN Game_System SHALL 詢問房主是否將下一局設為最後一局或繼續
4. WHEN 房主設定下一局為最後一局 THEN Game_System SHALL 標記該局為 Final_Round
5. WHILE Final_Round 進行中 THEN Game_System SHALL 在頂部顯示「最後一局，距離結局還有 N 輪」的提示
6. WHEN 非 Final_Round 進行中 THEN Game_System SHALL 僅顯示當前局數和輪數，不顯示結局倒數
7. WHEN 最後一局結束 THEN Game_System SHALL 進入故事結局階段
8. WHEN 進入故事結局階段 THEN Game_System SHALL 提示房主輸入故事結尾句子（可選）
9. WHEN 房主提交或跳過故事結尾 THEN Game_System SHALL 結束遊戲並顯示完整 Story_Chain

### Requirement 8

**User Story:** As a 玩家, I want to 在遊戲結束後以漫畫書形式查看完整故事, so that 我可以像閱讀分鏡漫畫一樣回顧我們的創作.

#### Acceptance Criteria

1. WHEN 遊戲結束 THEN Game_System SHALL 進入故事回顧頁面
2. WHEN 顯示故事回顧 THEN Game_System SHALL 以分鏡漫畫形式呈現 Story_Chain
3. WHEN 呈現分鏡漫畫 THEN Game_System SHALL 將每輪的畫作作為分鏡格，勝出句子作為旁白或對話框
4. WHEN 顯示分鏡 THEN Game_System SHALL 標註每個畫作和句子的作者名稱
5. WHEN 顯示故事回顧 THEN Game_System SHALL 支持垂直滾動瀏覽整個故事
6. WHEN 顯示故事回顧 THEN Game_System SHALL 提供「重新開始」和「返回首頁」按鈕
7. WHEN 顯示故事回顧 THEN Game_System SHALL 顯示故事標題（使用房間名稱或故事開頭）

### Requirement 9

**User Story:** As a 玩家, I want to 了解我在故事創作中的貢獻和排名, so that 我有參與感和成就感.

#### Acceptance Criteria

1. WHEN 遊戲進行中 THEN Game_System SHALL 實時顯示每位玩家的當前得分
2. WHEN 編劇的句子勝出投票 THEN Game_System SHALL 為該編劇增加 10 分
3. WHEN 畫家完成繪畫 THEN Game_System SHALL 根據投票參與人數為畫家增加基礎分（5 分 + 投票人數 × 2 分）
4. WHEN 玩家為畫作評星 THEN Game_System SHALL 根據平均評星為畫家增加額外分數（平均星數 × 3 分）
5. WHEN 遊戲結束 THEN Game_System SHALL 顯示最終排行榜和每位玩家的貢獻統計
6. WHEN 顯示貢獻統計 THEN Game_System SHALL 包含句子勝出次數、繪畫次數和總得分

### Requirement 10

**User Story:** As a 開發者, I want to 最大程度複用現有代碼, so that 開發效率高且維護成本低.

#### Acceptance Criteria

1. WHEN 實現分鏡接龍模式 THEN Game_System SHALL 複用現有的畫板同步邏輯
2. WHEN 實現分鏡接龍模式 THEN Game_System SHALL 複用現有的聊天框組件
3. WHEN 實現分鏡接龍模式 THEN Game_System SHALL 複用現有的輪次控制邏輯
4. WHEN 實現分鏡接龍模式 THEN Game_System SHALL 複用現有的房間管理代碼
5. WHEN 實現分鏡接龍模式 THEN Game_System SHALL 複用現有的畫作評星功能
6. WHEN 實現分鏡接龍模式 THEN Game_System SHALL 通過模式標記區分不同的判定邏輯
