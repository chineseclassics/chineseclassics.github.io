---
name: Storyboard詞句庫編劇
overview: 在分鏡接龍新增「依詞句庫編劇」開局選項；詞句庫模式下每輪編劇由系統隨機抽取一個詞/句（不重複，邏輯與經典模式一致），所有提交必須包含該詞句，並最大化複用既有詞句庫選擇/生成/自訂流程。
todos:
  - id: ui-room-create-mode-toggle
    content: 在分鏡模式的房間建立畫面加入「自由編劇/依詞句庫編劇」選項，並用同一套詞句庫 UI 支援（預設詞句庫、AI 生成、自訂詞語）。
    status: pending
  - id: persist-room-setting
    content: 在 `game_rooms.settings` 保存 `storyboard_writing_mode`，並更新前端型別與驗證（storyboard + wordlist 時要求至少 6 個詞句）。
    status: pending
    dependencies:
      - ui-room-create-mode-toggle
  - id: db-add-round-prompt-columns
    content: 新增 migration：在 `game_rounds` 增加 `storyboard_writing_prompt_text/source` 欄位，用於持久化每輪編劇提示詞句（避免刷新/晚加入看不到）。
    status: pending
    dependencies:
      - persist-room-setting
  - id: assign-prompt-per-round
    content: 在 `enterStoryboardWritingPhase()` 進入編劇階段時，由系統用既有 `getNextWord()` 隨機抽取本輪 prompt（同一房間跨多場盡量不重複；用盡後才允許重複），寫入 `game_rounds` 並廣播（由房主端執行以避免競態，但不是房主手選）。
    status: pending
    dependencies:
      - db-add-round-prompt-columns
  - id: enforce-prompt-in-writing-ui
    content: 在 `RoomView.vue` 編劇輸入區顯示本輪 prompt，未包含則禁用/提示；刷新後仍正確（從 `game_rounds` 讀取）。
    status: pending
    dependencies:
      - assign-prompt-per-round
  - id: centralize-validation
    content: 在 `useStoryboard.validateSentence()` 加入「必須包含 prompt」驗證，並復用 `useGuessing` 的文字標準化策略。
    status: pending
    dependencies:
      - assign-prompt-per-round
  - id: extend-realtime-payload
    content: 擴充 `useRealtime.broadcastGameState()` payload 型別，加入 storyboard prompt 欄位，並在 RoomView 訂閱時即時更新顯示。
    status: pending
    dependencies:
      - assign-prompt-per-round
---

# 分鏡接龍：依詞句庫編劇（每輪系統隨機抽取指定詞句）

## 目標行為（已確認規格）

- 房主可在分鏡接龍開局選擇兩種編劇模式：
  - 自由編劇（維持目前行為）
  - 依詞句庫編劇（新增）：每一輪進入編劇階段時，系統從房間詞句庫隨機抽取一個「詞/句」作為本輪提示，抽取規則與經典模式一致（優先未用過；用盡後才允許重複），且「不重複」的範圍以同一房間跨多場累積計算。本輪所有玩家提交句子都必須包含該詞句。
- 詞句庫的建立方式與經典模式一致（預設詞句庫下拉、AI 依主題生成、自訂詞語輸入），並盡量共用同一套程式碼。
- 分鏡模式詞句庫的主題：直接沿用「故事標題」（不新增額外主題欄位）。

## 現況對照（可複用點）

- 經典模式的詞句庫 UI/邏輯集中在 [`draw-guess/app/src/components/RoomCreate.vue`](draw-guess/app/src/components/RoomCreate.vue)（預設詞句庫下拉、詳情勾選、一鍵加入、AI 生成、自訂詞語輸入）。
- 經典模式避免重複的抽詞邏輯已存在於 [`draw-guess/app/src/composables/useGame.ts`](draw-guess/app/src/composables/useGame.ts) 的 `getNextWord()`（使用全域 `globalUsedWordIndices`）。
- 分鏡模式的編劇輸入目前在 [`draw-guess/app/src/views/RoomView.vue`](draw-guess/app/src/views/RoomView.vue) 的 `isStoryboardWriting` 區塊；提交走 [`draw-guess/app/src/composables/useStoryboard.ts`](draw-guess/app/src/composables/useStoryboard.ts) → `storyStore.submitSentence()`。
- 文字標準化比對（去空白/全形空白、英文轉小寫）已有實作：[`draw-guess/app/src/composables/useGuessing.ts`](draw-guess/app/src/composables/useGuessing.ts)；可用來做「包含 prompt」的健壯判斷。
- 後端現況（MCP 查詢）：`game_rooms` 尚無任何 prompt 欄位；`game_rounds.word_options` 目前完全未使用，但你已決定採用「新增語義化欄位」。

## 實作方案

### 1) 房間建立：分鏡模式新增「編劇模式」選項，並復用詞句庫 UI

- 修改 [`draw-guess/app/src/components/RoomCreate.vue`](draw-guess/app/src/components/RoomCreate.vue)
  - 在 `form.gameMode === 'storyboard'` 區塊新增單選：`自由編劇` / `依詞句庫編劇`
  - 抽出 `isWordLibraryEnabled`：
    - `classic` 一律為 true
    - `storyboard` 僅在「依詞句庫編劇」為 true
  - 把目前被 `v-if="form.gameMode === 'classic'"` 包起來的兩段（預設詞句庫下拉 + 自訂/AI 生成/詞語輸入）改用 `isWordLibraryEnabled` 顯示，達到 UI/功能直接共用
  - 分鏡模式下不重複出現「自訂詞句主題」欄位：改為顯示「詞句主題：沿用故事標題」的只讀提示（AI 生成仍使用 `form.name`）
  - `isFormValid` 調整：
    - 分鏡＋自由編劇：只驗證故事標題
    - 分鏡＋依詞句庫編劇：同經典模式，需至少 6 個詞句、字數上限等
  - `handleSubmit` 調整：
    - 分鏡＋自由編劇：`words: []`
    - 分鏡＋依詞句庫編劇：`words` 使用現有 `uniqueWords` + `libraryWords` 來源標記

### 2) 房間資料：保存「分鏡編劇模式」設定

- 修改 [`draw-guess/app/src/stores/room.ts`](draw-guess/app/src/stores/room.ts)
  - 擴充 `GameRoom['settings']` 型別，加入可選欄位：`storyboard_writing_mode?: 'free' | 'wordlist'`
  - `createRoom()` 前端驗證規則：
    - `classic`：仍要求 `words.length >= 6`
    - `storyboard`：若 `settings.storyboard_writing_mode === 'wordlist'` 也要求 `words.length >= 6`
  - 舊房間（未設此欄位）預設視為 `free`，避免破壞既有流程

### 3) 資料庫：持久化「本輪指定詞句」（避免刷新/晚加入看不到）

- 新增 migration（在 `draw-guess/supabase/migrations/`）加入欄位到 `game_rounds`：
  - `storyboard_writing_prompt_text TEXT NULL`
  - `storyboard_writing_prompt_source TEXT NULL CHECK (storyboard_writing_prompt_source IN ('wordlist','custom'))`
- 理由：prompt 是每一輪編劇階段的屬性，與 `game_rounds` 的粒度一致；刷新後只要載入當前輪次即可恢復 prompt。

### 4) 遊戲流程：進入編劇階段時系統隨機抽取「本輪指定詞句」（不重複）

- 修改 [`draw-guess/app/src/composables/useGame.ts`](draw-guess/app/src/composables/useGame.ts)
  - 在 `enterStoryboardWritingPhase()`：
    - 若 `roomStore.currentRoom.settings.storyboard_writing_mode === 'wordlist'`：
      - 直接複用既有 `getNextWord()` 取得 `prompt`（避免重複，與經典模式一致）
      - 不在「每完成一場」時重置已用集合，讓提示詞句能跨多場累積不重複
      - 由房主端執行抽取並寫入 `game_rounds.storyboard_writing_prompt_*`（確保只有一個來源決定本輪 prompt，避免競態）
      - 同步廣播 `game_state`（讓 UI 立即更新）
    - 若為自由編劇：不設定 prompt（或清空本輪 prompt 欄位；以最少 DB 更新為原則）

### 5) UI/提交檢查：編劇提交必須包含指定詞句

- 修改 [`draw-guess/app/src/views/RoomView.vue`](draw-guess/app/src/views/RoomView.vue)
  - 編劇階段顯示 `本輪指定詞句：{prompt}`（可複製）
  - 提交按鈕在未包含 prompt 時禁用，並顯示原因
  - 從 `gameStore.currentRound`（或補充查詢）讀取 `storyboard_writing_prompt_text`，確保刷新仍可顯示
- 修改 [`draw-guess/app/src/composables/useStoryboard.ts`](draw-guess/app/src/composables/useStoryboard.ts)
  - 在 `validateSentence()` 增加驗證：若房間是 `storyboard_writing_mode === 'wordlist'` 且存在 prompt，則句子必須包含 prompt
  - 包含判斷採用 `useGuessing.ts` 類似的標準化策略（至少去空白/全形空白、英文小寫），避免學生多打一個空格就被判失敗

### 6) Realtime payload 型別擴充

- 修改 [`draw-guess/app/src/composables/useRealtime.ts`](draw-guess/app/src/composables/useRealtime.ts)
  - 擴充 `broadcastGameState()` payload 型別，加入：
    - `storyboardWritingPromptText?: string`
    - `storyboardWritingPromptSource?: 'wordlist' | 'custom'`
- `RoomView.vue` 的 `subscribeGameState` 回呼若收到 prompt，可先更新本地顯示（真正持久化以 DB 欄位為準）

## 驗收方式（你可用來測）

- 自由編劇：建立分鏡房間（自由）→ 開始遊戲 → 編劇階段不出現 prompt，也不做包含檢查
- 依詞句庫編劇：建立分鏡房間（詞句庫）並建立詞句庫 → 開始遊戲 → 每輪進入編劇階段都會自動出現一個 prompt（不重複）
  - 句子不包含 prompt：不可提交或提交後報錯
  - 句子包含 prompt：可正常提交與投票
  - 刷新頁面/晚加入：仍能看到本輪 prompt（從 `game_rounds` 欄位讀取）

## 影響檔案清單

- [`draw-guess/app/src/components/RoomCreate.vue`](draw-guess/app/src/components/RoomCreate.vue)
- [`draw-guess/app/src/stores/room.ts`](draw-guess/app/src/stores/room.ts)
- [`draw-guess/app/src/composables/useGame.ts`](draw-guess/app/src/composables/useGame.ts)
- [`draw-guess/app/src/views/RoomView.vue`](draw-guess/app/src/views/RoomView.vue)
- [`draw-guess/app/src/composables/useStoryboard.ts`](draw-guess/app/src/composables/useStoryboard.ts)
- [`draw-guess/app/src/composables/useRealtime.ts`](draw-guess/app/src/composables/useRealtime.ts)
- 新增：`draw-guess/supabase/migrations/*_add_storyboard_writing_prompt_to_game_rounds.sql`


