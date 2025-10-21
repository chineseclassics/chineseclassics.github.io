# 記憶拼圖屋 - 遊戲指南

## 🎮 遊戲簡介

記憶拼圖屋是 Alice in Birthdayland 的核心遊戲之一，玩家需要從混合的照片碎片中完成 3 張照片拼圖，解鎖生日驚喜影片。

## 🎯 遊戲目標

- 從 8 張照片中隨機選擇 3 張
- 將每張照片切割成 3x3 = 9 個碎片
- 所有 27 個碎片混合在一起
- 玩家需要將碎片放回正確的位置
- 完成所有 3 張照片後解鎖生日祝福和影片

## 📋 遊戲規則

### 基本操作
1. **選擇照片**：點擊照片縮圖，激活對應的拼圖網格
2. **拖拽碎片**：從碎片池拖拽碎片到拼圖網格
3. **放置碎片**：將碎片放到合適的位置
4. **使用提示**：最多可以使用 3 次提示功能

### 完成條件
- 每張照片的 9 個碎片都正確放置
- 完成 3 張照片後觸發慶祝動畫
- 顯示生日祝福文字
- 播放 YouTube 驚喜影片

## 🔧 技術實現

### 照片切割邏輯

拼圖引擎使用 Canvas API 切割照片：

```javascript
// js/features/puzzle-engine.js
function cutPhotoIntoPieces(photo) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const pieceWidth = photo.width / 3;
    const pieceHeight = photo.height / 3;
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;
            
            // 繪製碎片
            ctx.drawImage(
                photo.element,
                col * pieceWidth, row * pieceHeight,
                pieceWidth, pieceHeight,
                0, 0,
                pieceWidth, pieceHeight
            );
            
            // 轉換為 Data URL
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            pieces.push({ dataURL, row, col });
        }
    }
}
```

### 拖拽系統

使用 HTML5 Drag and Drop API：

```javascript
// 拖拽開始
element.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('pieceId', piece.id);
    e.dataTransfer.effectAllowed = 'move';
});

// 放置
slot.addEventListener('drop', (e) => {
    e.preventDefault();
    const pieceId = e.dataTransfer.getData('pieceId');
    placePiece(pieceId, row, col);
});
```

### 完成檢測

```javascript
function checkPhotoCompletion(photoId) {
    const grid = PuzzleState.grids[photoId];
    const allCorrect = grid.pieces.every((piece, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        return piece.row === row && piece.col === col;
    });
    
    if (allCorrect) {
        // 觸發完成動畫
        showCompletionAnimation();
    }
}
```

## 🎨 UI 元素

### 主要區域
1. **頂部控制欄**
   - 返回按鈕
   - 遊戲標題
   - 計時器顯示

2. **進度指示器**
   - 進度條
   - 完成數量（x / 3）

3. **碎片池**（左側）
   - 顯示所有未放置的碎片
   - 支持拖拽操作
   - 提示按鈕（3次）
   - 重新排列按鈕

4. **拼圖工作區**（右側）
   - 照片縮圖選擇
   - 3個 3x3 拼圖網格
   - 每個網格有 9 個格子

5. **完成模態框**
   - 慶祝動畫
   - 完成時間
   - 生日祝福文字
   - 影片播放按鈕

## 🎬 YouTube 影片設置

### 步驟 1：上傳影片
1. 上傳生日祝福影片到 YouTube
2. 設置為「不公開」（Unlisted）
3. 複製影片 ID

### 步驟 2：設置影片 ID

在 `puzzle-engine.js` 中修改：

```javascript
// 第 771 行
function showVideoModal() {
    const videoId = 'YOUR_VIDEO_ID'; // 替換為實際的影片 ID
    // ...
}
```

或在 `puzzle-ui.js` 中修改：

```javascript
// 第 394 行
showVideoModal() {
    const videoId = 'YOUR_VIDEO_ID'; // 替換為實際的影片 ID
    // ...
}
```

### 影片 ID 獲取方法

YouTube 影片 URL 格式：
```
https://www.youtube.com/watch?v=VIDEO_ID_HERE
```

例如：
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
影片 ID: dQw4w9WgXcQ
```

## 🎵 音效列表

拼圖遊戲使用以下音效：

| 音效文件 | 觸發時機 | 說明 |
|---------|----------|------|
| `pickup.mp3` | 拖拽開始 | 拿起碎片 |
| `place.mp3` | 錯誤放置 | 放置到錯誤位置 |
| `correct.mp3` | 正確放置 | 放置到正確位置 |
| `puzzle-complete.mp3` | 完成單張 | 完成一張照片 |
| `final-celebration.mp3` | 全部完成 | 完成所有照片 |

## 🐛 已知問題和解決方案

### 問題 1：照片載入失敗
**症狀**：碎片池為空，無法開始遊戲  
**原因**：照片文件路徑錯誤或文件不存在  
**解決**：
1. 確認 `assets/images/` 目錄下有 `photo-1.jpg` 至 `photo-8.jpg`
2. 檢查文件名大小寫
3. 確認文件格式為 JPG

### 問題 2：拖拽不工作
**症狀**：無法拖拽碎片  
**原因**：瀏覽器不支持或觸摸設備  
**解決**：
1. 使用最新版本的 Safari/Chrome
2. iPad 上使用觸摸拖拽
3. 檢查控制台錯誤信息

### 問題 3：影片無法播放
**症狀**：點擊影片按鈕沒有反應  
**原因**：影片 ID 未設置或網絡問題  
**解決**：
1. 設置正確的 YouTube 影片 ID
2. 確認網絡連接正常
3. 確認影片權限為「不公開」或「公開」

### 問題 4：計時器不啟動
**症狀**：時間顯示為 00:00 且不變化  
**原因**：計時器未正確初始化  
**解決**：
1. 檢查 `timer.js` 是否正確載入
2. 檢查控制台錯誤
3. 確認 `timer-display` 元素存在

## 📱 iPad 優化

### 觸摸操作
- 使用原生觸摸拖拽
- 碎片和格子大小適中（最小 44x44px）
- 支持橫豎屏切換

### 性能優化
- 使用 Canvas 切割照片
- 碎片圖片壓縮（JPEG 90% 質量）
- 動畫使用 CSS transforms
- 避免過多 DOM 操作

### 響應式設計
```css
/* iPad 橫向 */
@media (min-width: 1024px) and (orientation: landscape) {
    .puzzle-workspace {
        grid-template-columns: 300px 1fr;
    }
}

/* iPad 豎向 */
@media (min-width: 768px) and (orientation: portrait) {
    .puzzle-workspace {
        grid-template-columns: 1fr;
    }
}
```

## 🧪 測試檢查清單

### 功能測試
- [ ] 照片正確載入和顯示
- [ ] 照片切割為 3x3 碎片
- [ ] 碎片隨機混合
- [ ] 拖拽碎片到網格
- [ ] 正確放置時鎖定
- [ ] 錯誤放置時可移動
- [ ] 提示功能正常（顯示完整照片 3 秒）
- [ ] 重新排列功能正常
- [ ] 進度條更新
- [ ] 計時器運行
- [ ] 完成單張照片時提示
- [ ] 完成所有照片時慶祝
- [ ] 生日祝福文字顯示
- [ ] YouTube 影片正常播放

### UI/UX 測試
- [ ] 按鈕響應及時
- [ ] 動畫流暢
- [ ] 音效播放正常
- [ ] 提示清晰明確
- [ ] 視覺反饋及時

### 性能測試
- [ ] 照片載入時間 < 3 秒
- [ ] 拖拽流暢無卡頓
- [ ] 動畫幀率 > 30fps
- [ ] 內存使用穩定

### 兼容性測試
- [ ] iPad Safari 正常
- [ ] iPhone Safari 正常
- [ ] Chrome 桌面版正常
- [ ] 橫豎屏切換正常

## 🎓 遊戲提示

### 給玩家的建議
1. **先看照片**：點擊照片縮圖查看完整照片
2. **用提示功能**：不確定時使用提示
3. **從邊緣開始**：邊緣和角落的碎片更容易識別
4. **找特徵**：注意照片中的特殊元素
5. **慢慢來**：不用著急，享受拼圖過程

### 給爸爸媽媽的建議
1. **選好照片**：選擇色彩豐富、特徵明顯的照片
2. **調整難度**：可以修改為 2x2 降低難度
3. **準備影片**：提前上傳生日祝福影片
4. **測試遊戲**：生日前測試確保一切正常
5. **引導玩耍**：第一次玩時可以適當引導

## 🔄 自定義選項

### 調整難度

修改 `puzzle-engine.js` 中的配置：

```javascript
const PHOTO_CONFIG = {
    totalPhotos: 8,     // 總照片數量
    selectCount: 3,     // 需要完成的照片數
    pieceSize: 3,       // 每張照片切成 NxN (3 = 3x3 = 9片)
    pieceCount: 9       // 每張照片的碎片數
};
```

降低難度：
```javascript
pieceSize: 2,  // 改為 2x2 = 4 片
pieceCount: 4
```

增加難度：
```javascript
pieceSize: 4,  // 改為 4x4 = 16 片
pieceCount: 16
```

### 修改提示次數

```javascript
// puzzle-engine.js 第 20 行
PuzzleState.maxHints = 3  // 改為想要的次數
```

### 修改生日祝福文字

編輯 `puzzle-house.html` 中的祝福文字：

```html
<div class="birthday-message">
    <h3>🎂 生日快樂，親愛的張思味（枸杞）！🎂</h3>
    <p>你成功完成了記憶拼圖挑戰！</p>
    <p>這些美好的回憶都是我們和毛豆一起創造的。</p>
    <p>希望你永遠保持這份好奇心、創造力和甜蜜笑容。</p>
    <p class="signature">爸爸媽媽和 Amos 永遠愛你！❤️</p>
</div>
```

## 📞 需要幫助？

如果遊戲遇到問題，請檢查：
1. 瀏覽器控制台（按 F12）查看錯誤信息
2. 確認所有照片文件存在
3. 確認網絡連接正常
4. 嘗試刷新頁面

---

**祝 Alice 7 歲生日快樂！**  
**希望這個拼圖遊戲帶來歡樂和美好回憶！** 🎂✨
