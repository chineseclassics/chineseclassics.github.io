# 🚀 Alice in Birthdayland - 快速開始

## 🎯 給爸爸媽媽的簡單指南

### 1. 查看應用

#### 在線訪問（推薦）
直接在瀏覽器中打開：
```
https://chineseclassics.github.io/alice-in-birthdayland/
```

#### 從太虛幻境主頁訪問
1. 打開：`https://chineseclassics.github.io/`
2. 滾動到「雲外樓」區域
3. 點擊「🎂 Alice in Birthdayland」

### 2. 本地測試（開發時使用）

#### 方法 1：使用 Python（macOS 自帶）
```bash
# 在項目根目錄運行
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io/alice-in-birthdayland
python3 -m http.server 8000

# 然後在瀏覽器打開：http://localhost:8000
```

#### 方法 2：使用 VS Code（如果已安裝）
1. 在 VS Code 中打開 `alice-in-birthdayland` 文件夾
2. 安裝 "Live Server" 擴展
3. 右鍵點擊 `index.html`
4. 選擇 "Open with Live Server"

## ⚠️ 當前狀態說明

### ✅ 可以使用的功能
1. **主頁地圖**：粒子動畫、建築點擊、導航 ✓
2. **拼圖遊戲**：完整功能，可以立即玩！✓
3. **蛋糕製作**：完整功能，可以製作蛋糕 ✓
4. **所有 UI 和交互**：全部完成 ✓

### ⏳ 需要手動設置（可選）
1. **YouTube 影片 ID**：
   - ✅ 播放器已完成
   - ⏳ 需要設置實際影片 ID
   - **狀態**：未設置時顯示提示

2. **音效系統**：
   - ✅ 音效管理系統已完成
   - ⏳ 音效文件未添加（可選）
   - **狀態**：不影響遊戲功能

## 🛠️ 需要手動完成的任務

### 任務 1：添加音效文件（可選）

#### 下載音效
1. 訪問 [Freesound.org](https://freesound.org)
2. 搜索並下載以下音效：
   - "click" 或 "button click"
   - "correct" 或 "success"
   - "celebration" 或 "fanfare"
   - "whoosh" 或 "swipe"

#### 放置音效文件
將下載的音效文件重命名並放入：
```
alice-in-birthdayland/assets/audio/
├── pickup.mp3
├── place.mp3
├── correct.mp3
├── puzzle-complete.mp3
├── cake-complete.mp3
├── final-celebration.mp3
├── location-click.mp3
├── hover.mp3
└── locked.mp3
```

### 任務 2：設置 YouTube 影片 ID（5 分鐘）

**位置**：`js/features/puzzle-engine.js` 第 771 行

```javascript
function showVideoModal() {
    const videoId = 'YOUR_VIDEO_ID'; // 👈 改為實際的影片 ID
    // ...
}
```

**步驟**：
1. 上傳生日祝福影片到 YouTube
2. 設置為「不公開」（Unlisted）
3. 複製影片 ID（URL 中 `v=` 後面的部分）
4. 替換代碼中的 `YOUR_VIDEO_ID`

**示例**：
```
YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
影片 ID: dQw4w9WgXcQ
```

### 任務 3：iPad 測試（生日當天前）

在實際 iPad 上測試：
1. 打開 Safari
2. 訪問線上 URL
3. 測試觸摸操作
4. 測試橫豎屏切換
5. 檢查性能和流暢度

參考：`docs/IPAD_TESTING_GUIDE.md`

## 🎁 推薦使用方式

### 生日當天
1. **提前準備**：
   - 確保 iPad 電量充足
   - 連接穩定的 Wi-Fi
   - 上傳生日祝福影片到 YouTube（設為「不公開」）

2. **打開應用**：
   - 在 iPad Safari 中打開應用 URL
   - 將 YouTube 影片 ID 設置到拼圖遊戲中

3. **引導 Alice**：
   - 先玩蛋糕製作遊戲（完全可用）
   - 設計屬於自己的生日蛋糕
   - 添加自己和 Amos 的名字
   - 保存和分享

### 現在可以做的
- ✅ **拼圖遊戲**：完整可玩！
- ✅ **蛋糕製作**：設計專屬蛋糕
- ✅ **完成後驚喜**：生日祝福和影片（需設置 ID）
- ⏳ **音效**：可選添加

## 📝 常見問題

### Q1：拼圖遊戲可以玩了嗎？
**A**：是的！拼圖遊戲已經完整實現，可以立即開始玩了！包括照片切割、拖拽、完成檢測等所有功能。

### Q2：為什麼沒有聲音？
**A**：需要手動添加音效文件。音效管理系統已完成，添加文件後即可使用。

### Q3：iPad 上無法訪問？
**A**：確保：
1. iPad 已連接網絡
2. 使用 Safari 瀏覽器
3. URL 正確

### Q4：如何添加 YouTube 影片？
**A**：
1. 上傳影片到 YouTube
2. 設置為「不公開」（只有有連結的人可看）
3. 複製影片 ID
4. 在拼圖遊戲代碼中設置影片 ID

### Q5：能在 iPhone 上用嗎？
**A**：可以，但建議使用 iPad 獲得最佳體驗。

## 🎨 自定義建議

### 修改生日橫幅
編輯 `index.html` 中的橫幅文字：
```html
<h1 class="magical-title">
    ✨ Alice's Birthday Wonderland ✨
</h1>
<p class="subtitle">
    親愛的張思味（枸杞/Goji），7 歲生日快樂！🎂
</p>
```

### 修改蛋糕預設文字
編輯 `cake-studio.html` 中的文字選項：
```html
<select id="preset-text">
    <option value="Happy Birthday Alice">Happy Birthday Alice</option>
    <option value="7 歲生日快樂">7 歲生日快樂</option>
    <!-- 添加更多選項 -->
</select>
```

## 📞 需要幫助？

如果遇到問題，請參考：
- `README.md` - 完整說明
- `docs/DEVELOPMENT_SUMMARY.md` - 開發總結
- `docs/IPAD_TESTING_GUIDE.md` - 測試指南
- `docs/DEPLOYMENT_CHECKLIST.md` - 部署檢查清單

## 🎉 最後

希望 Alice 喜歡這個特別的生日禮物！  
祝 Alice 7 歲生日快樂！🎂✨🎈

---

**提示**：建議在生日前幾天進行完整測試，確保一切運行正常！
