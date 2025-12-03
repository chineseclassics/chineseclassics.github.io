# Implementation Tasks: implement-core-mvp

## Phase 1: 項目基礎設置

- [x] 創建 Vue 項目結構
  - [x] 創建 `app/` 目錄
  - [x] 初始化 Vite + Vue 3 項目（`npm create vite@latest`）
  - [x] 安裝核心依賴（Vue 3, Pinia, Vue Router, TypeScript, Tailwind CSS）
  - [x] 安裝 UI 和工具庫（@headlessui/vue, @heroicons/vue, @vueuse/core）
  - [x] 安裝表單驗證庫（zod, @vee-validate/zod）
  - [x] 創建 `app/src/` 目錄結構（components/, views/, stores/, composables/, router/, lib/）
  - [x] 創建 `app/public/` 目錄
  - [x] 創建 `supabase/` 目錄結構

- [ ] 配置 Supabase
  - [ ] 創建 Supabase 項目（需要手動在 Supabase Dashboard 創建）
  - [ ] 配置 Google OAuth（在 Supabase Dashboard 配置）
  - [ ] 獲取 Project URL 和 Anon Key
  - [x] 創建 `app/src/lib/supabase.ts` 配置文件（模板已創建，待填入實際配置）

- [x] 設置基礎 Vue 應用
  - [x] 配置 `vite.config.ts`
  - [x] 配置 `tailwind.config.js`
  - [x] 創建 `app/src/main.ts`（應用入口）
  - [x] 創建 `app/src/App.vue`（根組件）
  - [x] 配置 Vue Router
  - [x] 配置 Pinia
  - [x] 引入太虛幻境應用切換器組件
  - [x] 創建基礎樣式（極簡風格、低調配色）

## Phase 2: 數據庫架構

- [x] 設計數據庫架構
  - [x] 設計 `users` 表（UUID 主鍵）
  - [x] 設計 `user_identities` 表（多重身份）
  - [x] 設計 `game_rooms` 表
  - [x] 設計 `room_participants` 表
  - [x] 設計 `game_rounds` 表
  - [x] 設計 `guesses` 表

- [ ] 實施數據庫遷移
  - [x] 創建遷移文件 `001_initial_schema.sql`
  - [ ] 在 Supabase Dashboard 執行遷移（需要先創建 Supabase 項目）
  - [x] 配置 RLS 策略（已在遷移文件中）
  - [ ] 測試數據庫連接（需要 Supabase 項目配置完成後）

## Phase 3: 用戶系統

- [ ] 實現 Supabase 客戶端
  - [ ] 創建 `app/src/lib/supabase.ts`
  - [ ] 初始化 Supabase 客戶端
  - [ ] 導出 Supabase 實例供其他模組使用

- [ ] 實現匿名遊玩模式
  - [ ] 創建匿名會話
  - [ ] 保存匿名用戶信息（暱稱）
  - [ ] 實現匿名用戶標識

- [ ] 實現 Google OAuth 登入
  - [ ] 創建 `app/src/stores/auth.ts`（Pinia store）
  - [ ] 實現 Google 登入流程
  - [ ] 實現登出功能
  - [ ] 實現用戶資料管理
  - [ ] 實現認證狀態監聽

- [ ] 實現用戶資料 UI
  - [ ] 創建 `app/src/components/UserAuth.vue` 組件
  - [ ] 登入/登出按鈕
  - [ ] 用戶信息顯示
  - [ ] 登入狀態管理（使用 Pinia store）

## Phase 4: 房間系統

- [ ] 實現房間管理核心邏輯
  - [ ] 創建 `app/src/stores/room.ts`（Pinia store）
  - [ ] 創建 `app/src/composables/useRoom.ts`
  - [ ] 實現房間創建功能（生成 6 位房間碼）
  - [ ] 實現房間加入功能（通過房間碼）
  - [ ] 實現房間離開功能
  - [ ] 實現房間狀態管理

- [ ] 實現房間數據庫操作
  - [ ] 創建房間（插入 `game_rooms` 表）
  - [ ] 加入房間（插入 `room_participants` 表）
  - [ ] 查詢房間信息
  - [ ] 更新房間狀態

- [ ] 實現房間 UI
  - [ ] 創建 `app/src/views/HomeView.vue`（房間列表頁面）
  - [ ] 創建 `app/src/components/RoomList.vue`（房間列表組件）
  - [ ] 創建 `app/src/components/RoomCreate.vue`（創建房間表單）
  - [ ] 創建 `app/src/components/RoomJoin.vue`（加入房間表單）
  - [ ] 創建 `app/src/components/WaitingLobby.vue`（等待大廳組件）

## Phase 5: 繪畫系統

- [ ] 實現 Canvas 繪圖基礎
  - [ ] 創建 `app/src/components/DrawingCanvas.vue`（Canvas 組件）
  - [ ] 創建 `app/src/stores/drawing.ts`（繪畫狀態管理）
  - [ ] 創建 `app/src/composables/useDrawing.ts`（繪畫邏輯）
  - [ ] 初始化 Canvas 元素（使用 Vue ref）
  - [ ] 實現鼠標繪畫（mousedown, mousemove, mouseup）
  - [ ] 實現觸摸繪畫（touchstart, touchmove, touchend）
  - [ ] 實現畫筆繪製邏輯

- [ ] 實現繪畫工具
  - [ ] 創建 `app/src/components/DrawingToolbar.vue`（工具欄組件）
  - [ ] 畫筆工具（顏色選擇、粗細調整）
  - [ ] 橡皮擦工具
  - [ ] 清空畫布功能
  - [ ] 工具狀態管理（使用 Pinia store）

- [ ] 實現繪畫數據序列化
  - [ ] 創建 `app/src/lib/canvas-utils.ts`（Canvas 工具函數）
  - [ ] 繪畫筆觸數據結構設計
  - [ ] 序列化繪畫數據（JSON）
  - [ ] 反序列化繪畫數據（重繪）
  - [ ] 數據壓縮優化

- [ ] 實現繪畫實時同步
  - [ ] 在 `useDrawing.ts` 中集成 Supabase Realtime broadcast
  - [ ] 節流處理（減少傳輸頻率）
  - [ ] 接收其他玩家的繪畫數據
  - [ ] 實時重繪畫作

## Phase 6: 猜詞系統

- [ ] 實現猜詞核心邏輯
  - [ ] 創建 `app/src/composables/useGuessing.ts`（猜詞邏輯）
  - [ ] 實現詞語輸入（支持中文）
  - [ ] 實現匹配判斷（精確匹配）
  - [ ] 實現猜中處理

- [ ] 實現提示系統
  - [ ] 提示數據結構（詞語、提示列表）
  - [ ] 提示顯示邏輯（逐步顯示）
  - [ ] 在 `GuessingPanel.vue` 中實現提示 UI

- [ ] 實現猜詞數據庫操作
  - [ ] 保存猜詞記錄（插入 `guesses` 表）
  - [ ] 查詢猜中玩家列表
  - [ ] 更新遊戲輪次狀態

- [ ] 實現猜詞 UI
  - [ ] 創建 `app/src/components/GuessingPanel.vue`（猜詞組件）
  - [ ] 猜詞輸入框
  - [ ] 已猜中玩家列表
  - [ ] 提示顯示區域

## Phase 7: 計分系統

- [ ] 實現計分核心邏輯
  - [ ] 在 `app/src/stores/game.ts` 中添加計分邏輯
  - [ ] 創建 `app/src/composables/useScoring.ts`（計分邏輯）
  - [ ] 實現猜中得分計算（根據順序：100%, 80%, 60%...）
  - [ ] 實現繪畫得分計算（根據猜中玩家數量）
  - [ ] 實現獲勝獎勵計算

- [ ] 實現分數顯示
  - [ ] 創建 `app/src/components/PlayerList.vue`（玩家列表和排行榜組件）
  - [ ] 實時分數更新（響應式）
  - [ ] 分數排行榜 UI
  - [ ] 最終排名顯示

## Phase 8: 實時同步

- [ ] 實現實時同步核心
  - [ ] 創建 `app/src/composables/useRealtime.ts`（實時同步邏輯）
  - [ ] 實現 Supabase Realtime Channels 連接
  - [ ] 實現房間狀態同步（postgres_changes）
  - [ ] 實現繪畫數據同步（broadcast）
  - [ ] 實現猜詞結果同步（postgres_changes）

- [ ] 實現連接管理
  - [ ] 連接狀態監聽（在 composable 中）
  - [ ] 連接重試機制
  - [ ] 錯誤處理和降級方案

## Phase 9: 遊戲流程

- [ ] 實現遊戲狀態管理
  - [ ] 創建 `app/src/stores/game.ts`（遊戲狀態管理）
  - [ ] 實現遊戲狀態機（waiting → playing → finished）
  - [ ] 實現輪次管理（當前輪次、當前畫家）
  - [ ] 實現詞語選擇（畫家選擇詞語）

- [ ] 實現遊戲流程控制
  - [ ] 創建 `app/src/composables/useGame.ts`（遊戲流程邏輯）
  - [ ] 開始遊戲邏輯
  - [ ] 輪次切換邏輯
  - [ ] 結束遊戲邏輯
  - [ ] 倒計時功能（使用 Vue 響應式）

## Phase 10: 核心 UI

- [ ] 實現房間列表 UI
  - [ ] 在 `HomeView.vue` 中實現房間列表
  - [ ] 房間卡片設計（極簡風格，Vue 組件）
  - [ ] 創建房間按鈕
  - [ ] 加入房間按鈕

- [ ] 實現遊戲界面 UI
  - [ ] 創建 `app/src/views/RoomView.vue`（遊戲房間頁面）
  - [ ] 畫布區域（`DrawingCanvas.vue` 組件，占據主要空間）
  - [ ] 工具欄（`DrawingToolbar.vue` 組件，低調設計）
  - [ ] 猜詞區域（`GuessingPanel.vue` 組件）
  - [ ] 玩家信息區域（`PlayerList.vue` 組件，排行榜、當前畫家）
  - [ ] 倒計時顯示（Vue 響應式）

- [ ] 實現等待大廳 UI
  - [ ] 在 `RoomView.vue` 中實現等待大廳狀態
  - [ ] 玩家列表（`PlayerList.vue` 組件）
  - [ ] 房間設置顯示
  - [ ] 開始遊戲按鈕（僅房主可見，條件渲染）

- [ ] 應用極簡設計風格
  - [ ] 在全局樣式中應用低調配色（灰色系、米色）
  - [ ] 組件樣式：細線條邊框
  - [ ] 組件樣式：極少裝飾元素
  - [ ] 確保突出畫作和文字

## Phase 11: 測試和優化

- [ ] 功能測試
  - [ ] 測試房間創建和加入
  - [ ] 測試繪畫功能（桌面端）
  - [ ] 測試猜詞功能
  - [ ] 測試實時同步（多設備）
  - [ ] 測試計分系統

- [ ] 性能優化
  - [ ] 繪畫數據壓縮優化
  - [ ] 實時同步節流優化
  - [ ] 頁面加載優化

- [ ] 錯誤處理
  - [ ] 網絡錯誤處理
  - [ ] 連接失敗處理
  - [ ] 用戶友好的錯誤提示

## Phase 12: 文檔和部署

- [ ] 構建和部署配置
  - [ ] 配置 Vite 構建輸出到 `assets/` 目錄
  - [ ] 配置構建腳本（`npm run build`）
  - [ ] 測試構建後的靜態文件
  - [ ] 配置 GitHub Pages 部署

- [ ] 更新文檔
  - [ ] 更新 README.md（Vue 3 開發說明）
  - [ ] 創建部署指南
  - [ ] 創建使用說明

- [ ] 部署準備
  - [ ] 檢查所有功能
  - [ ] 測試生產構建
  - [ ] 準備部署說明

