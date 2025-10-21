# 音效文件映射說明

## 📂 音效來源

所有音效文件臨時使用貪吃龍遊戲的音效文件。

## 🎵 音效映射表

| Alice 音效文件 | 來源文件 | 用途 | 觸發時機 |
|---------------|---------|------|----------|
| `location-click.mp3` | `cilong/click.mp3` | 建築點擊 | 點擊地圖建築 |
| `hover.mp3` | `cilong/click.mp3` | 懸停音效 | 滑鼠懸停建築 |
| `pickup.mp3` | `cilong/click.mp3` | 拿起碎片 | 開始拖拽拼圖碎片 |
| `place.mp3` | `cilong/eat.mp3` | 放置碎片 | 放置碎片到網格 |
| `correct.mp3` | `cilong/score.mp3` | 正確放置 | 碎片放到正確位置 |
| `puzzle-complete.mp3` | `cilong/powerup.mp3` | 完成單張 | 完成一張照片拼圖 |
| `final-celebration.mp3` | `cilong/success.mp3` | 最終慶祝 | 完成所有拼圖 |
| `cake-select.mp3` | `cilong/click.mp3` | 蛋糕選項 | 選擇蛋糕底座/顏色 |
| `deco-place.mp3` | `cilong/eat.mp3` | 裝飾放置 | 放置蛋糕裝飾 |
| `cake-complete.mp3` | `cilong/success.mp3` | 完成蛋糕 | 完成蛋糕製作 |
| `locked.mp3` | `cilong/debuff.mp3` | 鎖定點擊 | 點擊鎖定建築 |

## 🎮 貪吃龍原始音效說明

| 原始文件 | 用途 | 大小 |
|---------|------|------|
| `click.mp3` | 按鈕點擊 | 32KB |
| `eat.mp3` | 吃到食物 | 30KB |
| `score.mp3` | 得分 | 58KB |
| `powerup.mp3` | 獲得能量 | 32KB |
| `success.mp3` | 成功/勝利 | 47KB |
| `debuff.mp3` | 錯誤/失敗 | 19KB |
| `gameover.mp3` | 遊戲結束 | 95KB（未使用）|

## 🔄 未來優化建議

### 可以考慮的改進
1. **錄製專屬音效**
   - 為 Alice 錄製個性化音效
   - 例如：Alice 說「好棒！」、「完成了！」

2. **添加背景音樂**
   - 輕快的生日主題音樂
   - 可以使用 royalty-free 音樂網站

3. **更細緻的音效**
   - 不同類型的碎片使用不同音效
   - 不同蛋糕裝飾使用不同音效

## ⚠️ 版權說明

- 當前音效來自貪吃龍遊戲
- 僅供個人使用（生日禮物）
- 不涉及商業用途

## 📝 使用說明

音效文件會自動在以下情況播放：
- ✅ 點擊建築時
- ✅ 拖拽拼圖碎片時
- ✅ 放置碎片到網格時
- ✅ 完成拼圖時
- ✅ 選擇蛋糕選項時
- ✅ 放置蛋糕裝飾時

音效系統會自動處理：
- 文件不存在時不會報錯
- 靜音模式下不播放
- 支持音量控制

---

**最後更新**：2025-10-21  
**維護者**：Alice in Birthdayland 開發團隊
