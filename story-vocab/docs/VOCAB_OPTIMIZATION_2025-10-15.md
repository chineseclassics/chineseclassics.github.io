# 詞彙推薦系統全面重構總結

**日期**：2025-10-15  
**版本**：2.0  
**類型**：架構重構 + 性能優化

---

## 🎯 核心目標

1. **性能提升**：詞彙推薦時間從 5-9 秒縮短到 3-5 秒（40-60%）
2. **架構簡化**：移除校準遊戲，改用年級基礎 + 動態調整
3. **難度重構**：L1-L6 改為 L1-L5，對應 5 個年級階段
4. **用戶體驗**：新用戶註冊後立即玩，無需摸底測試

---

## 📊 重大變更

### 1. 難度分級體系：L1-L6 → L1-L5

#### 舊體系（L1-L6）
- L1-L6 六個等級
- 參考 HSK 分級
- 與年級階段不對應
- L5 和 L6 邊界模糊

#### 新體系（L1-L5）
- L1-L5 五個等級
- 基於中文母語者認知發展
- 對應 5 個年級階段：
  - L1：低年級（1-3年級）
  - L2：中年級（4-6年級）
  - L3：初中（7-9年級）
  - L4：高中（10-12年級）
  - L5：大學及以上（13年級+）

#### 新定義特點
- ✅ 不參考 HSK（HSK 不是針對中文母語者）
- ✅ 基於詞頻、字數、認知水平
- ✅ 每級 20-30 個示例詞
- ✅ 明確邊界詞

---

### 2. 移除校準遊戲系統

#### 舊系統
- 第一次遊戲：10 輪摸底測試
- 前 5 輪：固定詞表探索
- 後 5 輪：動態測試
- 最後：計算 baseline_level

**問題**：
- ❌ 用戶體驗差（像考試）
- ❌ 時間成本高（20-30 分鐘）
- ❌ 數據不準（用戶隨意選詞）
- ❌ 有年級數據後變得多餘

#### 新系統
- 註冊時選擇年級 → 立即設置初始水平
- 前 3 次遊戲：探索期（推薦範圍更寬）
- 第 4+ 次遊戲：精準推薦
- 持續動態調整

**優點**：
- ✅ 極佳用戶體驗（立即玩遊戲）
- ✅ 自然學習曲線
- ✅ 更準確（基於真實遊戲數據）
- ✅ 架構簡化（刪除 ~500 行代碼）

---

### 3. 合併 AI 調用

#### 舊架構（兩次調用）
```
story-agent        → 生成句子     (~2-4秒)
  ↓
vocab-recommender  → 推薦詞語     (~3-5秒)
────────────────────────────────────
總時間：5-9秒（串行）
```

#### 新架構（一次調用）
```
unified-story-agent → 句子 + 詞語  (~3-5秒)
────────────────────────────────────
總時間：3-5秒（並行）
```

**優點**：
- ✅ 速度提升 40-60%
- ✅ AI 同時考慮句子和詞語的連貫性
- ✅ 減少 HTTP 請求
- ✅ 節省成本（1次 AI 調用）

**降級策略**：
- 保留舊 API 作為備份
- 如果統一 API 失敗，自動回退

---

### 4. 簡化輸出格式

#### 舊格式
```json
{
  "word": "探索",
  "difficulty": 2,
  "category": "動詞",     ← 刪除
  "reason": "符合冒險情境" ← 刪除
}
```

#### 新格式
```json
{
  "word": "探索",
  "difficulty": 2
}
```

**優點**：
- ✅ 減少 30-40% token 消耗
- ✅ 更快的 AI 響應
- ✅ 更簡潔（category 和 reason 本來就沒用）

---

### 5. 用戶資料緩存

#### 登入時一次性加載
```javascript
gameState.user = {
  // 基本信息
  id, email, display_name, grade,
  
  // 用戶檔案（新增緩存）
  calibrated: true,
  baseline_level: 2.5,
  current_level: 2.8,
  total_games: 5,
  confidence: 'medium',
  
  // 詞表偏好（新增緩存）
  wordlist_preference: {
    default_mode: 'ai',
    wordlist_info: { ... }
  }
}
```

#### 遊戲中直接讀取記憶體
- ✅ 不再查詢數據庫
- ✅ 避免競態條件
- ✅ 解決第 2 輪卡頓問題

---

## 📝 變更文件清單

### 新增文件
- ✅ `js/config/difficulty-levels.js` - L1-L5 難度定義
- ✅ `supabase/migrations/022_update_to_L5_system.sql` - 數據庫遷移
- ✅ `supabase/functions/unified-story-agent/index.ts` - 統一 Edge Function
- ✅ `supabase/functions/unified-story-agent/prompts.ts` - 統一 Prompt
- ✅ `deploy-vocab-optimization.sh` - 部署腳本

### 刪除文件
- ❌ `js/features/calibration-game.js` - 校準遊戲邏輯
- ❌ `data/calibration-vocabulary.json` - 校準詞庫

### 修改文件
- ✅ `js/auth/standalone-auth.js` - 登入時加載完整資料、根據年級初始化
- ✅ `js/core/vocab-integration.js` - 移除校準邏輯、添加探索期
- ✅ `js/core/story-engine.js` - 統一 API 調用 + 降級策略
- ✅ `js/ui/screens.js` - 從緩存讀取詞表偏好、打字機速度 130ms
- ✅ `js/utils/grade-manager.js` - 更新年級映射（L1-L5）
- ✅ `js/features/profile-updater.js` - 探索期調整、信心度更新
- ✅ `supabase/functions/vocab-recommender/index.ts` - 支持探索模式、使用緩存
- ✅ `supabase/functions/vocab-recommender/prompts.ts` - L1-L5 體系、簡化輸出
- ✅ `supabase/functions/vocab-recommender/helpers.ts` - 刪除校準函數

---

## 🚀 部署步驟

### 方法 1：使用部署腳本（推薦）
```bash
cd story-vocab
./deploy-vocab-optimization.sh
```

### 方法 2：手動部署
```bash
cd story-vocab

# 1. 數據庫遷移
supabase db push

# 2. 部署 Edge Functions
supabase functions deploy vocab-recommender
supabase functions deploy unified-story-agent

# 3. 驗證
supabase functions list
```

---

## 🧪 測試計劃

### 測試 1：新用戶體驗
1. 註冊新帳號，選擇年級（例如：6 年級）
2. 觀察控制台：
   ```
   ✅ 新用戶檔案已創建：年級 6 → L2.5
   ```
3. 立即開始遊戲（無需校準）
4. 第 1-3 次遊戲：觀察是否為探索模式

### 測試 2：詞卡加載速度
1. 開始遊戲
2. 觀察控制台：
   ```
   🚀 調用統一 API（unified-story-agent）...
   ✅ 統一 API 成功（句子 + 詞語）
   ```
3. 觀察打字機完成時，詞卡是否立即顯示
4. 預期：幾乎同時出現（vs 舊版等待 3秒）

### 測試 3：難度範圍
1. 檢查推薦的詞語難度是否在 L1-L5 範圍
2. 探索期：觀察範圍是否更寬
3. 正常期：觀察範圍是否精準

### 測試 4：降級策略
1. 暫時停用 unified-story-agent
2. 觀察是否自動降級到分離調用
3. 遊戲是否正常運行

---

## 📈 預期成果

### 性能提升
| 指標 | 修改前 | 修改後 | 改善 |
|------|--------|--------|------|
| 詞彙推薦時間 | 5-9秒 | 3-5秒 | ↓ 40-60% |
| 數據庫查詢/遊戲 | 3-5次 | 0-1次 | ↓ 80% |
| Token 消耗 | 高 | 中 | ↓ 30-40% |
| 新用戶啟動時間 | 20-30分鐘 | 立即 | ↓ 100% |

### 用戶體驗
- ✅ 新用戶：註冊後立即玩，無需校準
- ✅ 詞卡顯示：打字機結束時幾乎同時出現
- ✅ 難度更合理：基於中文母語者標準
- ✅ 動態調整：前 3 次遊戲快速找到真實水平

### 代碼質量
- ✅ 刪除 ~500 行冗餘代碼（校準邏輯）
- ✅ Prompt 簡化 ~50 行
- ✅ 架構更清晰
- ✅ 維護成本降低

---

## 🔄 向後兼容

### 舊用戶數據
- ✅ L6 用戶自動轉為 L5（數據庫遷移）
- ✅ 已完成的校準遊戲數據保留
- ✅ game_rounds 中的 difficulty 自動遷移

### API 兼容
- ✅ 保留 story-agent API（降級備份）
- ✅ 保留 vocab-recommender API（降級備份）
- ✅ 新的 unified-story-agent 優先使用
- ✅ 失敗時自動降級

---

## 🐛 已知問題與解決

### 問題 1：第 2 輪詞卡卡頓
**原因**：每輪都查詢 user_profiles 表，認證狀態變化時卡住  
**解決**：登入時緩存用戶資料，遊戲中從記憶體讀取

### 問題 2：詞彙推薦慢
**原因**：兩次 AI 調用串行執行（story + vocab）  
**解決**：合併為一次調用，並行生成

### 問題 3：校準遊戲體驗差
**原因**：第一次玩就要做 10 輪測試  
**解決**：移除校準，改用年級初始化 + 探索期

### 問題 4：難度體系不清晰
**原因**：L1-L6 與 5 個年級階段不對應  
**解決**：重構為 L1-L5，每級對應一個明確的教育階段

---

## 📚 相關文檔

- [L1-L5 難度定義](../js/config/difficulty-levels.js)
- [數據庫遷移腳本](../supabase/migrations/022_update_to_L5_system.sql)
- [統一 Prompt 設計](../supabase/functions/unified-story-agent/prompts.ts)
- [部署腳本](../deploy-vocab-optimization.sh)

---

## 🎓 設計決策

### Q: 為什麼移除校準遊戲？
**A**: 
1. 年級已經是很好的起點
2. 用戶來玩遊戲，不是來考試
3. 真實遊戲數據比「測試」更準確
4. 探索期（前3次）可以快速調整

### Q: 為什麼改為 L1-L5？
**A**:
1. 對應 5 個年級階段（完美對稱）
2. L5-L6 本來差異就小
3. 每輪推薦 5 個詞 = 5 個等級
4. 邊界更清晰

### Q: 為什麼合併 AI 調用？
**A**:
1. 速度提升 40-60%（最直接的優化）
2. 詞語推薦更貼合剛生成的句子
3. 節省成本（1次 vs 2次）
4. 更好的用戶體驗

### Q: 為什麼不參考 HSK？
**A**:
1. HSK 是針對外國人學中文
2. 中文母語者的詞彙發展不同
3. 基於年齡、詞頻、認知更準確

---

## ⚠️ 注意事項

1. **必須執行數據庫遷移**
   - L6 數據會轉為 L5
   - 不可逆，建議先備份

2. **必須部署 Edge Functions**
   - vocab-recommender（更新版）
   - unified-story-agent（新版）

3. **舊數據保留**
   - 已完成的校準遊戲數據不刪除
   - 但新用戶不再使用校準邏輯

4. **降級策略已就緒**
   - 統一 API 失敗會自動降級
   - 不影響遊戲進行

---

**維護者**：詞遊記開發團隊  
**更新時間**：2025-10-15

