# 音效文件管理說明

## 📁 文件位置

**系統預設音效**：`kongshan/assets/sounds/`

## 🎵 當前音效文件

| 數據庫名稱 | 文件名 | 說明 | 狀態 |
|----------|--------|------|------|
| 風聲 | `wind.mp3` | 輕柔的風吹過樹林 | ✅ |
| 流水 | `stream.mp3` | 溪流潺潺的聲音 | ✅ |
| 鳥鳴 | `birds.mp3` | 清晨鳥兒啼鳴 | ✅ |
| 夜晚 | `night.mp3` | 夜晚的環境音 | ✅ |

## 📋 添加新音效的步驟

### 1. 放置文件
將音效文件放到 `kongshan/assets/sounds/` 目錄

### 2. 更新數據庫
在 Supabase 中執行以下 SQL：

```sql
-- 插入新的系統音效
INSERT INTO sound_effects (name, description, file_url, tags, source, status)
VALUES (
  '新音效名稱',
  '音效描述',
  '/kongshan/assets/sounds/新文件名.mp3',  -- 相對路徑
  ARRAY['標籤1', '標籤2'],
  'system',
  'approved'
);
```

### 3. 文件格式建議
- **格式**：MP3（推薦）或 WebM
- **大小**：建議每個文件 < 5MB
- **時長**：建議 30-120 秒（會循環播放）
- **質量**：128kbps 或更高

## 🔄 混合方案說明

### 系統預設音效（GitHub Pages）
- **位置**：`kongshan/assets/sounds/`
- **URL 格式**：`/kongshan/assets/sounds/[文件名].mp3`
- **特點**：
  - 穩定可靠
  - 版本控制
  - 免費托管
  - 適合系統預設音效

### 用戶上傳音效（Supabase Storage）
- **位置**：Supabase Storage `sound-effects` bucket
- **URL 格式**：`https://hithpeekxopcipqhkhyu.supabase.co/storage/v1/object/public/sound-effects/[文件名]`
- **特點**：
  - 支持用戶上傳
  - 權限控制
  - 審核流程
  - 適合用戶創作內容

## ✅ 代碼自動處理

代碼會自動識別和處理兩種 URL 格式：
- 相對路徑（`/kongshan/assets/sounds/...`）→ 系統音效
- Supabase Storage URL → 用戶上傳音效

無需手動區分，`normalizeSoundUrl()` 函數會自動處理。

## 📝 注意事項

1. **文件命名**：使用英文和數字，避免中文和特殊字符
2. **路徑格式**：相對路徑必須以 `/` 開頭
3. **文件大小**：注意 GitHub 倉庫大小限制
4. **版本控制**：音效文件會納入 Git 版本控制

