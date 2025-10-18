# Format Examples Specification

## ADDED Requirements

### Requirement: 論文各部分範例展示
應用 SHALL 提供論文各部分的格式範例展示，包括標題、引言、正文、結論、參考文獻。

#### Scenario: 範例分類顯示
- **WHEN** 用戶進入格式範例庫
- **THEN** 顯示以下分類：
  - 標題格式
  - 引言格式
  - 正文格式
  - 結論格式
  - 參考文獻格式
- **AND** 每個分類顯示縮略圖和簡介

#### Scenario: 查看特定範例
- **WHEN** 用戶點擊某個分類
- **THEN** 展開該分類的詳細範例
- **AND** 顯示範例文本
- **AND** 顯示格式要點說明

### Requirement: 正確與錯誤對比
應用 SHALL 提供正確格式與錯誤格式的對比展示。

#### Scenario: 對比視圖切換
- **WHEN** 用戶在範例詳情頁
- **THEN** 提供「正確範例」和「錯誤範例」兩個標籤
- **AND** 默認顯示正確範例

#### Scenario: 查看錯誤範例
- **WHEN** 用戶切換到「錯誤範例」標籤
- **THEN** 顯示常見的錯誤格式
- **AND** 用紅色標記錯誤位置
- **AND** 提供錯誤說明文字

#### Scenario: 錯誤對比說明
- **WHEN** 用戶查看錯誤範例
- **THEN** 在範例下方顯示：
  - 錯誤類型
  - 錯誤原因
  - 正確做法
- **AND** 提供「查看正確範例」按鈕

### Requirement: 範例數據管理
應用 SHALL 從 JSON 文件加載範例數據，支持靈活擴展。

#### Scenario: 加載範例數據
- **WHEN** 應用初始化
- **THEN** 從 `assets/data/format-examples.json` 加載數據
- **AND** 解析 JSON 為 JavaScript 對象
- **AND** 緩存到內存中

#### Scenario: 範例數據結構
- **WHEN** 範例數據被解析
- **THEN** 每個範例包含以下字段：
  - id: 唯一標識符
  - category: 分類（title/intro/body/conclusion/references）
  - title: 範例標題
  - correctExample: 正確範例文本
  - incorrectExample: 錯誤範例文本
  - keyPoints: 格式要點數組
  - errorExplanation: 錯誤說明

### Requirement: 格式要點說明
應用 SHALL 為每個範例提供詳細的格式要點說明。

#### Scenario: 顯示格式要點
- **WHEN** 用戶查看範例
- **THEN** 在範例旁邊顯示格式要點列表
- **AND** 每個要點有圖標和文字說明
- **AND** 要點包括：字體、字號、對齊、縮進、行距等

#### Scenario: 要點高亮關聯
- **WHEN** 用戶懸停在某個格式要點上
- **THEN** 範例中對應的部分高亮顯示
- **AND** 幫助用戶理解要點與範例的對應關係

### Requirement: 範例代碼視圖
應用 SHALL 提供範例的代碼視圖，展示如何在文字處理軟件中實現。

#### Scenario: 切換到代碼視圖
- **WHEN** 用戶點擊「查看格式代碼」按鈕
- **THEN** 切換到代碼視圖模式
- **AND** 顯示格式設置的步驟說明
- **AND** 包括字體選擇、段落設置、樣式應用等

#### Scenario: 代碼視圖內容
- **WHEN** 代碼視圖顯示
- **THEN** 包含以下信息：
  - Word 格式設置步驟
  - Google Docs 格式設置步驟
  - 快捷鍵提示
- **AND** 使用圖標和截圖輔助說明

### Requirement: 範例切換功能
應用 SHALL 支持快速切換不同類型的範例。

#### Scenario: 範例導航
- **WHEN** 用戶查看某個範例
- **THEN** 顯示「上一個」和「下一個」按鈕
- **AND** 點擊按鈕切換到相鄰的範例

#### Scenario: 快速跳轉
- **WHEN** 用戶點擊範例列表按鈕
- **THEN** 顯示所有範例的縮略列表
- **AND** 可以直接跳轉到任意範例

