# Implementation Plan

- [x] 1. 創建 Edge Function 基礎架構
  - [x] 1.1 創建 generate-words Edge Function 文件結構
    - 在 `draw-guess/supabase/functions/` 下創建 `generate-words/index.ts`
    - 引入 CORS 配置
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 實現 DeepSeek API 調用邏輯
    - 從 Supabase Secrets 讀取 `DEEPSEEK_API_KEY`
    - 構建 prompt 並調用 DeepSeek API
    - 處理 API 響應和錯誤
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 1.3 編寫 API 響應解析的屬性測試
    - **Property 2: API 響應解析正確性**
    - **Validates: Requirements 2.3**
  - [ ]* 1.4 編寫詞語驗證規則的屬性測試
    - **Property 3: 詞語驗證規則**
    - **Validates: Requirements 4.2, 4.3**

- [x] 2. 創建前端 Composable
  - [x] 2.1 創建 useAIWordGenerator composable
    - 在 `draw-guess/app/src/composables/` 下創建 `useAIWordGenerator.ts`
    - 實現 `generateWords` 方法調用 Edge Function
    - 實現載入狀態和錯誤處理
    - _Requirements: 1.3, 1.5, 7.1, 7.2, 7.3_
  - [x] 2.2 實現速率限制邏輯
    - 使用 localStorage 存儲調用記錄
    - 實現 5 分鐘 10 次的限制邏輯
    - 實現時間窗口過期自動解鎖
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 2.3 編寫速率限制器的屬性測試
    - **Property 4: 速率限制器正確性**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 2.4 實現詞語格式化函數
    - 將詞語列表格式化為逗號分隔的字符串
    - _Requirements: 1.4_
  - [ ]* 2.5 編寫詞語格式化的屬性測試
    - **Property 1: 詞語格式化一致性**
    - **Validates: Requirements 1.4**

- [x] 3. Checkpoint - 確保所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 修改 RoomCreate 組件
  - [x] 4.1 添加「AI 生成」按鈕 UI
    - 在「自定義詞語」標籤右側添加按鈕
    - 實現按鈕的載入狀態和禁用狀態
    - _Requirements: 1.1, 1.5_
  - [x] 4.2 集成 useAIWordGenerator composable
    - 點擊按鈕時調用 generateWords
    - 將生成的詞語填入輸入框
    - 處理主題為空的情況
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 4.3 實現錯誤提示和速率限制提示
    - 顯示各種錯誤情況的友好提示
    - 顯示速率限制提示
    - _Requirements: 6.1, 7.1, 7.2, 7.3_
  - [x] 4.4 實現主題調整提示
    - 當 AI 調整了主題時顯示提示信息
    - _Requirements: 3.3_

- [x] 5. 部署和配置
  - [x] 5.1 在 Supabase Secrets 中配置 DeepSeek API Key
    - 添加 `DEEPSEEK_API_KEY` secret
    - _Requirements: 2.1_
  - [x] 5.2 部署 Edge Function
    - 使用 `supabase functions deploy generate-words` 部署
    - _Requirements: 2.1_

- [x] 6. Final Checkpoint - 確保所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

