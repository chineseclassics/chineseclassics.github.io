# Supabase 客戶端 vs Fetch API 對比分析

## 📊 兩種方式對比

### 1. Supabase 客戶端（句豆使用的方式）

#### ✅ 優點

1. **類型安全**
   - 支持 TypeScript 類型推斷
   - 自動補全和類型檢查
   - 減少拼寫錯誤

2. **簡潔的 API**
   ```typescript
   const { data, error } = await supabase
     .from('game_rooms')
     .select('*, host:users(*)')
     .eq('code', code)
     .single()
   ```

3. **內建功能**
   - 自動處理認證（JWT token）
   - 自動重試機制
   - 連接池管理
   - Realtime 訂閱支持

4. **關聯查詢**
   - 支持複雜的關聯查詢（join）
   - 自動處理嵌套數據結構
   ```typescript
   .select(`
     *,
     host:users!game_rooms_host_id_fkey(id, display_name),
     participants:game_participants(*, user:users(*))
   `)
   ```

5. **錯誤處理**
   - 統一的錯誤格式
   - 自動處理 HTTP 狀態碼

#### ❌ 缺點

1. **超時問題**
   - 在某些網絡環境下可能卡住
   - 沒有明確的超時控制
   - 需要手動實現超時邏輯

2. **調試困難**
   - 錯誤信息可能不夠詳細
   - 難以追蹤具體的 HTTP 請求

3. **靈活性較低**
   - 受 Supabase 客戶端限制
   - 難以自定義請求頭或參數

---

### 2. Fetch API（你畫我猜目前使用的方式）

#### ✅ 優點

1. **完全控制**
   - 可以精確控制超時時間
   - 可以自定義所有請求參數
   - 可以實現重試邏輯

2. **調試友好**
   - 可以直接看到 HTTP 請求/響應
   - 錯誤信息更清晰
   - 可以添加詳細的日誌

3. **性能可控**
   - 可以實現請求取消
   - 可以實現請求優先級
   - 可以實現請求隊列

4. **兼容性好**
   - 不依賴 Supabase 客戶端版本
   - 可以在任何環境使用

#### ❌ 缺點

1. **代碼冗長**
   ```typescript
   const response = await fetch(`${supabaseUrl}/rest/v1/game_rooms?code=eq.${code}`, {
     method: 'GET',
     headers: {
       'apikey': supabaseAnonKey,
       'Authorization': `Bearer ${accessToken}`,
     },
   })
   ```

2. **手動處理**
   - 需要手動處理認證 token
   - 需要手動構建查詢參數
   - 需要手動處理錯誤

3. **類型安全缺失**
   - 沒有 TypeScript 類型推斷
   - 容易出現拼寫錯誤
   - 需要手動定義類型

4. **關聯查詢複雜**
   - 需要多次請求或手動構建複雜查詢
   - 需要手動處理嵌套數據

---

## 🎯 句豆的實踐方式

句豆**完全使用 Supabase 客戶端**，原因：

1. **穩定的網絡環境**
   - 學校網絡環境相對穩定
   - 超時問題較少

2. **複雜的關聯查詢**
   - 需要查詢多個關聯表
   - Supabase 客戶端的關聯查詢非常方便

3. **代碼簡潔性**
   - 減少代碼量
   - 提高可維護性

4. **類型安全**
   - TypeScript 類型推斷很重要
   - 減少運行時錯誤

---

## 💡 最佳實踐建議

### 推薦方案：**混合使用**

#### 使用 Supabase 客戶端的情況：

1. **簡單的 CRUD 操作**
   ```typescript
   // ✅ 推薦：使用客戶端
   const { data, error } = await supabase
     .from('users')
     .select('*')
     .eq('id', userId)
     .single()
   ```

2. **複雜的關聯查詢**
   ```typescript
   // ✅ 推薦：使用客戶端
   const { data } = await supabase
     .from('game_rooms')
     .select(`
       *,
       host:users(*),
       participants:game_participants(*, user:users(*))
     `)
   ```

3. **Realtime 訂閱**
   ```typescript
   // ✅ 必須使用客戶端
   supabase.channel('room:123')
     .on('postgres_changes', { ... })
     .subscribe()
   ```

#### 使用 Fetch API 的情況：

1. **關鍵操作（創建房間、加入房間）**
   ```typescript
   // ✅ 推薦：使用 fetch（避免超時）
   const response = await Promise.race([
     fetch(url, options),
     new Promise((_, reject) => 
       setTimeout(() => reject(new Error('超時')), 10000)
     )
   ])
   ```

2. **需要精確控制超時的操作**
   ```typescript
   // ✅ 推薦：使用 fetch
   // 可以精確控制超時時間和重試邏輯
   ```

3. **批量操作**
   ```typescript
   // ✅ 推薦：使用 fetch
   // 可以並行發送多個請求
   ```

---

## 🔧 針對你畫我猜的建議

### 當前問題分析

你畫我猜遇到的超時問題可能是因為：

1. **網絡環境不穩定**
   - 用戶可能在不同網絡環境下使用
   - Supabase 客戶端沒有明確的超時控制

2. **關鍵操作需要可靠性**
   - 創建房間、加入房間是關鍵操作
   - 用戶體驗要求高

### 建議方案

**保持當前的混合方式，但優化 Supabase 客戶端配置：**

1. **為 Supabase 客戶端添加超時包裝器**
   ```typescript
   async function supabaseWithTimeout<T>(
     query: Promise<{ data: T | null; error: any }>,
     timeout = 10000
   ): Promise<{ data: T | null; error: any }> {
     return Promise.race([
       query,
       new Promise<{ data: null; error: any }>((_, reject) =>
         setTimeout(() => reject({ data: null, error: { message: '請求超時' } }), timeout)
       )
     ])
   }
   ```

2. **關鍵操作繼續使用 fetch**
   - 創建房間 ✅
   - 加入房間 ✅
   - 離開房間 ✅

3. **簡單查詢使用 Supabase 客戶端**
   - 查詢用戶資料
   - 查詢房間列表
   - Realtime 訂閱

---

## 📝 總結

| 特性 | Supabase 客戶端 | Fetch API |
|------|----------------|-----------|
| **類型安全** | ✅ 優秀 | ❌ 需要手動定義 |
| **代碼簡潔性** | ✅ 優秀 | ❌ 冗長 |
| **關聯查詢** | ✅ 優秀 | ❌ 複雜 |
| **超時控制** | ❌ 困難 | ✅ 優秀 |
| **調試友好** | ⚠️ 一般 | ✅ 優秀 |
| **靈活性** | ⚠️ 受限 | ✅ 完全控制 |

**最佳實踐：根據場景選擇合適的方式**

- **句豆方式**：完全使用客戶端（適合穩定環境、複雜查詢）
- **你畫我猜方式**：混合使用（適合需要可靠性的關鍵操作）

