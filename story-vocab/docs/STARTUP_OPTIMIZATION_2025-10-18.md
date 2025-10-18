# 詞遊記啟動速度優化（2025-10-18）

## 🎯 優化目標

減少應用啟動時的 Supabase 遠程查詢次數，提升啟動速度。

## 📊 優化前的問題

### 1. **重複的詞表信息查詢** ❌
- `standalone-auth.js` 查詢詞表時缺少 `code` 和 `type` 欄位
- `screens.js` 發現缺少 `code`，重新查詢了一次
- **結果**：同一個詞表查詢了 **2 次**

### 2. **詞表標籤重複加載** ❌
- 先從 Supabase 的 `wordlist_tags` 表查詢標籤
- 然後又從 JSON 文件重新加載標籤
- **結果**：系統詞表的標籤被加載了 **2 次**

### 3. **~~主題在啟動時立即加載~~** ❌ 誤判
- ~~詞表模式用戶不需要主題~~
- **更正**：經用戶指正，**兩種模式都需要主題選擇**
- 主題選擇在界面上標註為「始終顯示」
- **結論**：此項不需要優化

### 3. **啟動時的 Supabase 查詢次數**
```
✅ user_profiles: 1次（必需）
✅ user_wordlist_preferences: 1次（必需）
❌ wordlists: 2次（重複！）
❌ wordlist_tags: 1次（系統詞表可從JSON加載）
```

## ✅ 優化方案

### 1. **修復詞表查詢**（`standalone-auth.js:493`）

**優化前**：
```javascript
const { data: wordlist } = await this.supabase
  .from('wordlists')
  .select('*')  // 沒有包含 code 和 type
  .eq('id', prefs.default_wordlist_id)
  .maybeSingle();
```

**優化後**：
```javascript
const { data: wordlist } = await this.supabase
  .from('wordlists')
  .select('id, name, code, type, description')  // ✅ 明確包含所需欄位
  .eq('id', prefs.default_wordlist_id)
  .maybeSingle();
```

**效果**：避免 `screens.js` 中的重複查詢，**減少 1 次 Supabase 查詢**

---

### 2. **從 JSON 加載系統詞表標籤**（`standalone-auth.js:498-552`）

**優化前**：
```javascript
// 總是從數據庫查詢標籤
const { data: tags } = await this.supabase
  .from('wordlist_tags')
  .select('*')
  .eq('wordlist_id', wordlist.id)
  .order('tag_level')
  .order('sort_order');
```

**優化後**：
```javascript
// ✅ 如果是系統詞表，從 JSON 加載（更快）
if (wordlist.type === 'system' && wordlist.code) {
  try {
    const { getWordlistWithTags } = await import('../core/wordlist-loader.js');
    const jsonData = await getWordlistWithTags(wordlist.code);
    
    wordlistInfo = {
      id: wordlist.id,
      name: wordlist.name,
      code: wordlist.code,
      type: wordlist.type,
      tags: jsonData.tags || []
    };
    
    console.log('📚 詞表信息已從 JSON 加載');
  } catch (jsonError) {
    // 回退到數據庫查詢
    // ...
  }
} else {
  // 自定義詞表，仍從數據庫查詢
  // ...
}
```

**效果**：
- 系統詞表（如 HSK 標準詞表）**減少 1 次 Supabase 查詢**
- JSON 文件有緩存（`wordlistCache`），第二次加載幾乎無延遲
- 自定義詞表仍使用數據庫查詢，保持功能完整性

---

### 3. **優化 screens.js 的重複查詢邏輯**（`screens.js:146-180`）

**優化前**：
```javascript
// 檢查緩存是否有 code（舊版本可能沒有）
if (!wordlistInfo.code) {
  console.warn('⚠️ 緩存的詞表信息缺少 code，重新查詢...');
  // 重新查詢整個詞表
  const { data: wordlist } = await supabase
    .from('wordlists')
    .select('id, name, code, type')
    .eq('id', wordlistInfo.id)
    .maybeSingle();
  // ...
}
```

**優化後**：
```javascript
// ✅ 優化：認證服務已經提供了完整的詞表信息
console.log('📚 詞表信息（從認證服務）:', wordlistInfo.name);

// 只有在信息不完整時才補充查詢（向後兼容）
if (!wordlistInfo.code || !wordlistInfo.tags || wordlistInfo.tags.length === 0) {
  console.warn('⚠️ 詞表信息不完整，補充加載...');
  // 只查詢缺失的欄位
  // ...
}
```

**效果**：
- 正常情況下不再需要重複查詢
- 保留向後兼容性，處理舊版本緩存數據

---

### ~~4. 延遲加載主題~~（❌ 已撤回）

**原本計劃**：延遲加載主題到需要時

**撤回原因**：經用戶指正，詞表模式和 AI 模式**都需要主題選擇**
- 界面上主題選擇器標註為「始終顯示」
- 兩種模式都需要用戶選擇故事主題
- 延遲加載會導致詞表模式用戶看不到主題

**正確理解**：
- **AI 模式**：AI 說明 + 主題選擇 + 開始按鈕
- **詞表模式**：詞表層級選擇 + 主題選擇 + 開始按鈕

**結論**：主題加載**保持原樣**，不做優化

---

## 📈 優化效果預期

### 減少的 Supabase 查詢
- **詞表查詢**：從 2 次減少到 **1 次**（-50%）
- **詞表標籤查詢**：系統詞表從 1 次減少到 **0 次**（-100%）
- **總體減少**：啟動時減少 **1-2 次**遠程查詢

### 減少的網絡延遲
假設每次 Supabase 查詢延遲 100-300ms：
- **節省時間**：100-600ms（取決於網絡狀況）

### 綜合效果
- **總體啟動速度提升**：100-600ms
- **感知速度提升**：明顯減少「等待感」
- **用戶體驗**：啟動更流暢，響應更快

### ~~詞表模式用戶額外優化~~（已撤回）
- ~~不加載主題配置和 DOM~~
- ~~額外節省 50-100ms~~
- **更正**：主題在兩種模式下都需要，不做此優化

---

## 🔧 技術細節

### 詞表加載器緩存機制
```javascript
// wordlist-loader.js
const wordlistCache = new Map();

export async function loadWordlist(wordlistCode) {
  // 檢查緩存
  if (wordlistCache.has(wordlistCode)) {
    console.log(`✅ 從緩存加載詞表: ${wordlistCode}`);
    return wordlistCache.get(wordlistCode);
  }
  
  // 加載 JSON 文件
  const response = await fetch(`/assets/data/wordlists/${wordlistCode}.json`);
  const data = await response.json();
  
  // 存入緩存
  wordlistCache.set(wordlistCode, data);
  return data;
}
```

**優勢**：
- 第一次加載後，後續訪問幾乎無延遲
- 瀏覽器也會緩存 JSON 文件（HTTP 緩存）
- 雙層緩存機制確保最快訪問速度

---

## 🧪 測試建議

### 1. 啟動速度測試
```javascript
// 在 app.js 的 initializeApp() 開頭添加
const startTime = performance.now();

// 在結尾添加
const endTime = performance.now();
console.log(`⏱️ 啟動耗時: ${(endTime - startTime).toFixed(2)}ms`);
```

### 2. Supabase 查詢計數
在 Chrome DevTools 的 Network 面板：
- 篩選 `supabase.co/rest/v1/`
- 計算啟動時的請求數量
- **優化前**：約 4-5 個請求
- **優化後**：約 2-3 個請求

### 3. 用戶體驗測試
- **詞表模式用戶**：啟動是否更快？
- **AI 模式用戶**：主題加載是否順暢？
- **網絡慢的環境**：優化效果是否明顯？

---

## ✅ 檢查清單

- [x] 修復詞表查詢缺少 `code` 和 `type`
- [x] 系統詞表從 JSON 加載標籤
- [x] 優化 screens.js 的重複查詢邏輯
- [x] ~~延遲加載主題到需要時~~（已撤回，兩種模式都需要主題）
- [ ] 測試啟動速度（用戶驗證）
- [ ] 監控 Supabase 查詢次數
- [ ] 確認不同網絡環境下的效果

---

## 📝 後續優化方向

### 1. 預加載策略
- 在空閒時預加載常用詞表
- 使用 Service Worker 緩存 JSON 文件

### 2. 並行加載
- 用戶檔案和詞表信息可以並行查詢
- 使用 `Promise.all()` 減少總等待時間

### 3. 進度指示
- 顯示加載進度條
- 提供視覺反饋，減少等待焦慮

---

**優化日期**：2025-10-18  
**影響文件**：
- `story-vocab/js/auth/standalone-auth.js`（已優化）
- `story-vocab/js/ui/screens.js`（已優化）

**實際優化項目**：
1. ✅ 修復詞表查詢缺少 `code` 和 `type`（減少 1 次查詢）
2. ✅ 系統詞表從 JSON 加載標籤（減少 1 次查詢）
3. ✅ 優化重複查詢邏輯
4. ❌ 延遲加載主題（已撤回，經用戶指正兩種模式都需要主題）

**測試狀態**：待用戶驗證

