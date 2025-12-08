# 代碼問題分析：Supabase 查詢超時的根本原因

## 🔍 問題回顧

之前的超時問題可能不是 Supabase 客戶端本身的問題，而是代碼實現的問題。

## 🐛 可能的代碼問題

### 1. **使用 `.single()` 而不是 `.maybeSingle()`**

**問題**：
```typescript
// ❌ 錯誤：如果查詢結果為空，會拋出錯誤
const { data, error } = await supabase
  .from('room_participants')
  .select('*')
  .eq('room_id', room.id)
  .eq('user_id', userId)
  .single()  // 如果沒有記錄，會拋出 PGRST116 錯誤
```

**正確做法**：
```typescript
// ✅ 正確：使用 maybeSingle，如果沒有記錄返回 null
const { data, error } = await supabase
  .from('room_participants')
  .select('*')
  .eq('room_id', room.id)
  .eq('user_id', userId)
  .maybeSingle()  // 如果沒有記錄，返回 null，不拋出錯誤
```

**影響**：
- 如果錯誤沒有被正確處理，Promise 可能會一直 pending
- 導致 UI 卡在「加入中...」狀態

---

### 2. **錯誤處理不完整**

**問題**：
```typescript
// ❌ 錯誤：沒有處理所有可能的錯誤情況
const { data, error } = await supabase
  .from('game_rooms')
  .select('*')
  .eq('code', code)
  .single()

if (error) {
  throw new Error('房間不存在')  // 只處理了一種情況
}
```

**正確做法**：
```typescript
// ✅ 正確：檢查錯誤代碼，區分不同情況
const { data, error } = await supabase
  .from('game_rooms')
  .select('*')
  .eq('code', code)
  .single()

if (error) {
  // PGRST116 表示未找到記錄
  if (error.code === 'PGRST116') {
    throw new Error('房間不存在')
  }
  // 其他錯誤（網絡錯誤、權限錯誤等）
  throw error
}
```

---

### 3. **沒有正確等待異步操作完成**

**問題**：
```typescript
// ❌ 錯誤：沒有等待 loadParticipants 完成
currentRoom.value = room
loadParticipants(room.id)  // 沒有 await，可能還沒完成就返回了
return { success: true, room }
```

**正確做法**：
```typescript
// ✅ 正確：等待所有異步操作完成
currentRoom.value = room
await loadParticipants(room.id)  // 等待完成
return { success: true, room }
```

---

### 4. **並發請求問題**

**問題**：
```typescript
// ❌ 錯誤：多個請求同時發送，可能互相阻塞
const roomPromise = supabase.from('game_rooms').select('*').eq('code', code).single()
const participantPromise = supabase.from('room_participants').select('*').eq('room_id', room.id).single()

// 如果第一個請求還在進行，第二個請求可能會等待
```

**正確做法**：
```typescript
// ✅ 正確：按順序執行，或者使用 Promise.all 並行執行
// 方案 1：按順序執行
const { data: room } = await supabase.from('game_rooms').select('*').eq('code', code).single()
if (room) {
  const { data: participant } = await supabase.from('room_participants').select('*').eq('room_id', room.id).maybeSingle()
}

// 方案 2：並行執行（如果兩個查詢互不依賴）
const [roomResult, participantResult] = await Promise.all([
  supabase.from('game_rooms').select('*').eq('code', code).single(),
  supabase.from('room_participants').select('*').eq('room_id', room.id).maybeSingle()
])
```

---

### 5. **循環依賴或死鎖**

**問題**：
```typescript
// ❌ 錯誤：Store A 調用 Store B，Store B 又調用 Store A
// roomStore.createRoom() → authStore.loadProfile() → roomStore.loadRoom() → ...
```

**正確做法**：
```typescript
// ✅ 正確：避免循環依賴，使用單向數據流
// roomStore.createRoom() → authStore.loadProfile() （單向）
// 不要在 authStore 中調用 roomStore 的方法
```

---

## ✅ 已修復的問題

### `joinRoom` 函數

**修復前**（使用 fetch，代碼冗長）：
- 使用 fetch API，代碼冗長
- 手動處理超時
- 手動構建查詢參數

**修復後**（使用 Supabase 客戶端，與句豆一致）：
```typescript
// ✅ 使用 Supabase 客戶端
const { data: room, error: roomError } = await supabase
  .from('game_rooms')
  .select('*')
  .eq('code', code)
  .single()

// ✅ 使用 maybeSingle 檢查是否已加入
const { data: existingParticipant } = await supabase
  .from('room_participants')
  .select('*')
  .eq('room_id', room.id)
  .eq('user_id', authStore.user.id)
  .maybeSingle()  // 關鍵：使用 maybeSingle 而不是 single
```

**關鍵改進**：
1. ✅ 使用 `.maybeSingle()` 而不是 `.single()` 來檢查是否已加入
2. ✅ 正確處理錯誤（區分不同錯誤類型）
3. ✅ 等待所有異步操作完成（`await loadParticipants`）

---

## 📊 對比：句豆 vs 你畫我猜

### 句豆的實現（完全使用 Supabase 客戶端）

```typescript
// 查詢房間
const { data: room, error: findError } = await supabase
  .from('game_rooms')
  .select(`*, host:users(*), participants:game_participants(*)`)
  .eq('room_code', roomCode.toUpperCase())
  .single()  // 使用 single，因為確信會有結果

// 檢查是否已加入（在關聯查詢中）
const existingParticipant = room.participants?.find(
  (p: GameParticipant) => p.user_id === authStore.user!.id
)
```

**優點**：
- 代碼簡潔
- 一次查詢獲取所有數據（包括關聯數據）
- 類型安全

### 你畫我猜的實現（修復後）

```typescript
// 查詢房間
const { data: room, error: roomError } = await supabase
  .from('game_rooms')
  .select('*')
  .eq('code', code)
  .single()

// 檢查是否已加入（單獨查詢）
const { data: existingParticipant } = await supabase
  .from('room_participants')
  .select('*')
  .eq('room_id', room.id)
  .eq('user_id', authStore.user.id)
  .maybeSingle()  // 關鍵：使用 maybeSingle
```

**優點**：
- 使用 `.maybeSingle()` 正確處理可能為空的情況
- 錯誤處理完整

---

## 🎯 最佳實踐總結

### 1. **選擇正確的查詢方法**

| 場景 | 使用 | 說明 |
|------|------|------|
| 確信有且只有一條記錄 | `.single()` | 如果沒有記錄會拋出錯誤 |
| 可能有 0 或 1 條記錄 | `.maybeSingle()` | 如果沒有記錄返回 null |
| 可能有多條記錄 | `.select()` | 返回數組 |

### 2. **正確處理錯誤**

```typescript
const { data, error } = await supabase.from('table').select('*').eq('id', id).single()

if (error) {
  // 檢查錯誤代碼
  if (error.code === 'PGRST116') {
    // 未找到記錄
    return null
  }
  // 其他錯誤
  throw error
}
```

### 3. **等待異步操作完成**

```typescript
// ✅ 正確
await loadParticipants(room.id)
return { success: true }

// ❌ 錯誤
loadParticipants(room.id)  // 沒有 await
return { success: true }  // 可能還沒完成就返回了
```

### 4. **避免循環依賴**

- Store A 可以調用 Store B
- Store B 不應該調用 Store A
- 使用單向數據流

---

## 🔧 建議的改進

### 1. **統一使用 Supabase 客戶端**

既然問題是代碼實現，不是客戶端本身，建議：
- ✅ `joinRoom`：已改回使用 Supabase 客戶端
- ⚠️ `createRoom`：可以考慮改回，但需要處理房間碼重複的重試邏輯
- ✅ `leaveRoom`：可以改回使用 Supabase 客戶端

### 2. **添加錯誤處理工具函數**

```typescript
function handleSupabaseError(error: any, defaultMessage: string) {
  if (error.code === 'PGRST116') {
    return { success: false, error: '記錄不存在' }
  }
  if (error.code === '23505') {
    return { success: false, error: '記錄已存在' }
  }
  return { success: false, error: error.message || defaultMessage }
}
```

### 3. **統一查詢模式**

參考句豆的方式，使用關聯查詢一次性獲取所有數據：
```typescript
const { data: room } = await supabase
  .from('game_rooms')
  .select(`
    *,
    participants:room_participants(*, user:users(*))
  `)
  .eq('code', code)
  .single()
```

---

## 📝 結論

**之前的超時問題很可能是因為**：
1. 使用了 `.single()` 而不是 `.maybeSingle()` 來檢查是否已加入
2. 錯誤處理不完整，導致 Promise 一直 pending
3. 沒有正確等待異步操作完成

**修復後**：
- ✅ 使用 `.maybeSingle()` 正確處理可能為空的情況
- ✅ 完整的錯誤處理
- ✅ 等待所有異步操作完成

**建議**：統一使用 Supabase 客戶端（與句豆一致），這樣代碼更簡潔、類型更安全。

