# Design Document: AI 智能詞語生成

## Overview

本功能為「你畫我猜」遊戲添加 AI 智能詞語生成能力。用戶在創建房間時，可以點擊「AI 生成」按鈕，系統將根據房間主題調用 DeepSeek API 生成適合繪畫猜詞遊戲的詞語列表。

### 技術架構

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   RoomCreate    │────▶│  Edge Function   │────▶│  DeepSeek API   │
│   (Vue 組件)    │◀────│  (generate-words)│◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  localStorage   │     │ Supabase Secrets │
│  (速率限制)     │     │ (API Key)        │
└─────────────────┘     └──────────────────┘
```

## Architecture

### 前端架構

1. **RoomCreate.vue** - 修改現有組件，添加「AI 生成」按鈕
2. **useAIWordGenerator.ts** - 新建 composable，封裝 AI 生成邏輯和速率限制

### 後端架構

1. **generate-words Edge Function** - 新建 Supabase Edge Function
   - 從 Secrets 讀取 DeepSeek API Key
   - 構建 prompt 並調用 DeepSeek API
   - 解析返回結果並驗證詞語格式

## Components and Interfaces

### 前端組件

#### useAIWordGenerator Composable

```typescript
interface AIWordGeneratorOptions {
  maxCallsPerWindow: number  // 時間窗口內最大調用次數，默認 10
  windowDurationMs: number   // 時間窗口長度，默認 5 分鐘
}

interface AIWordGeneratorResult {
  words: string[]           // 生成的詞語列表
  isThemeAdjusted: boolean  // 主題是否被調整
  adjustedTheme?: string    // 調整後的主題（如有）
}

interface UseAIWordGenerator {
  // 狀態
  isGenerating: Ref<boolean>      // 是否正在生成
  isRateLimited: Ref<boolean>     // 是否被速率限制
  remainingCalls: Ref<number>     // 剩餘調用次數
  error: Ref<string | null>       // 錯誤信息
  
  // 方法
  generateWords: (theme: string) => Promise<AIWordGeneratorResult | null>
  resetRateLimit: () => void      // 手動重置（僅用於測試）
}
```

### 後端接口

#### Edge Function: generate-words

**請求：**
```typescript
interface GenerateWordsRequest {
  theme: string  // 房間主題
}
```

**響應：**
```typescript
interface GenerateWordsResponse {
  success: boolean
  words?: string[]           // 生成的詞語列表
  isThemeAdjusted?: boolean  // 主題是否被調整
  adjustedTheme?: string     // 調整後的主題
  error?: string             // 錯誤信息
}
```

## Data Models

### localStorage 數據結構

```typescript
interface RateLimitRecord {
  calls: number[]  // 調用時間戳數組
}

// 存儲 key: 'ai-word-generator-rate-limit'
```

### DeepSeek API Prompt 結構

```
你是一個「你畫我猜」遊戲的詞語生成助手。請根據用戶提供的主題生成適合遊戲的詞語。

要求：
1. 生成 50 個詞語
2. 每個詞語長度在 2-8 個中文字符之間
3. 詞語應符合用戶設定的主題
4. 可以包含具體名詞、動物、物品、動作，也可以包含抽象概念、心情、成語等
5. 詞語難度適中，適合中學生理解
6. 如果主題不適合中學生或無法理解，請自動選擇安全主題（如動物、食物、日常用品）

用戶主題：{theme}

請以 JSON 格式返回：
{
  "words": ["詞語1", "詞語2", ...],
  "isThemeAdjusted": false,
  "adjustedTheme": null
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 詞語格式化一致性
*For any* 詞語列表，將其填入輸入框時，應以中文逗號分隔，且每個詞語前後無多餘空格
**Validates: Requirements 1.4**

### Property 2: API 響應解析正確性
*For any* 有效的 DeepSeek API JSON 響應，解析後應得到正確的詞語數組和元數據
**Validates: Requirements 2.3**

### Property 3: 詞語驗證規則
*For any* AI 生成的詞語列表，應滿足：數量在 40-60 之間，每個詞語長度在 2-8 個中文字符之間
**Validates: Requirements 4.2, 4.3**

### Property 4: 速率限制器正確性
*For any* 調用序列，在 5 分鐘時間窗口內調用次數超過 10 次後應被限制，時間窗口過期後應自動解鎖
**Validates: Requirements 6.1, 6.2**

## Error Handling

### 前端錯誤處理

| 錯誤類型 | 處理方式 | 用戶提示 |
|---------|---------|---------|
| 主題為空 | 阻止調用 | 「請先輸入房間主題」 |
| 速率限制 | 禁用按鈕 | 「請求次數已達上限，請 5 分鐘後再試」 |
| API 超時 | 恢復按鈕 | 「AI 服務響應超時，請稍後再試」 |
| 網絡錯誤 | 恢復按鈕 | 「網絡連接失敗，請檢查網絡後重試」 |
| API 錯誤 | 恢復按鈕 | 「AI 服務暫時不可用，請稍後再試或手動輸入詞語」 |

### 後端錯誤處理

| 錯誤類型 | HTTP 狀態碼 | 響應 |
|---------|------------|------|
| 缺少主題 | 400 | `{ success: false, error: "缺少主題參數" }` |
| API Key 未配置 | 500 | `{ success: false, error: "服務配置錯誤" }` |
| DeepSeek API 錯誤 | 502 | `{ success: false, error: "AI 服務暫時不可用" }` |
| 解析失敗 | 500 | `{ success: false, error: "詞語生成失敗" }` |

## Testing Strategy

### 測試框架

- **前端單元測試**：Vitest
- **屬性測試**：fast-check
- **組件測試**：Vue Test Utils

### 單元測試

1. **useAIWordGenerator composable**
   - 測試速率限制邏輯
   - 測試 localStorage 持久化
   - 測試錯誤處理

2. **Edge Function**
   - 測試 prompt 構建
   - 測試響應解析
   - 測試錯誤處理

### 屬性測試

1. **Property 1: 詞語格式化**
   - 生成任意詞語列表，驗證格式化結果正確

2. **Property 2: API 響應解析**
   - 生成任意有效 JSON 響應，驗證解析正確

3. **Property 3: 詞語驗證**
   - 生成任意詞語列表，驗證數量和長度規則

4. **Property 4: 速率限制器**
   - 模擬任意調用序列，驗證限制邏輯正確

### 集成測試

1. **RoomCreate 組件**
   - 測試「AI 生成」按鈕顯示
   - 測試點擊後的載入狀態
   - 測試詞語填入輸入框

