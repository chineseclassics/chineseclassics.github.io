# Google OAuth 快速修復指南

> **問題**：在生產環境點擊 Google 登入，出現"localhost 拒絕連線"錯誤  
> **原因**：Supabase Site URL 還在使用開發環境的 localhost  
> **預計修復時間**：3 分鐘

---

## 🚨 立即修復步驟

### 步驟 1：訪問 Supabase URL 配置

打開瀏覽器訪問：
```
https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/auth/url-configuration
```

### 步驟 2：修改 Site URL

找到「Site URL」欄位，修改為：
```
https://chineseclassics.github.io/story-vocab/
```

### 步驟 3：確認 Redirect URLs

在「Redirect URLs」部分，確保包含以下 URL：

```
https://chineseclassics.github.io/story-vocab/*
https://chineseclassics.github.io/story-vocab/index.html
```

開發環境的 localhost 可以保留（用於本地測試）：
```
http://localhost:8000/**
```

### 步驟 4：保存設置

點擊頁面底部的 **「Save」** 按鈕。

### 步驟 5：驗證修復

1. 回到詞遊記頁面：https://chineseclassics.github.io/story-vocab/
2. 刷新頁面（Ctrl+F5 或 Cmd+Shift+R）
3. 點擊「使用 Google 登入」
4. 應該正確跳轉到 Google 登入頁面

---

## 📸 配置截圖說明

### Site URL 應該是這樣：
```
┌─────────────────────────────────────────────────┐
│ Site URL                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://chineseclassics.github.io/story-vocab/ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Redirect URLs 應該包含：
```
┌─────────────────────────────────────────────────┐
│ Redirect URLs                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://chineseclassics.github.io/story-vocab/*│
│ │ https://chineseclassics.github.io/story-vocab/index.html│
│ │ http://localhost:8000/**                     │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## ❓ 為什麼會出現這個問題？

### 錯誤配置的影響流程：

```
用戶點擊登入
  ↓
Supabase 啟動 Google OAuth
  ↓
使用配置的 Site URL 作為回調地址
  ↓
如果 Site URL = http://localhost:8000
  ↓
Google 登入後重定向到 localhost
  ↓
❌ 生產環境的瀏覽器無法訪問 localhost
  ↓
錯誤：localhost 拒絕連線
```

### 正確配置的流程：

```
用戶點擊登入
  ↓
Supabase 啟動 Google OAuth
  ↓
使用配置的 Site URL 作為回調地址
  ↓
Site URL = https://chineseclassics.github.io/story-vocab/
  ↓
Google 登入後重定向到正確的生產 URL
  ↓
✅ 成功登入並返回應用
```

---

## 🧪 測試清單

修復後，請測試以下場景：

- [ ] 從太虛幻境主站（iframe）打開詞遊記，點擊 Google 登入
- [ ] 直接訪問 https://chineseclassics.github.io/story-vocab/，點擊 Google 登入
- [ ] 登入成功後，應該看到用戶頭像和名字
- [ ] 刷新頁面後，用戶狀態保持（不需要重新登入）

---

## 🔍 驗證配置是否正確

如果修復後仍有問題，在瀏覽器控制台檢查：

1. 點擊 Google 登入
2. 查看控制台日誌：
   ```
   🔗 重定向 URL: https://chineseclassics.github.io/story-vocab/
   ```
   
3. 這個 URL 應該：
   - ✅ 是 https（不是 http）
   - ✅ 包含完整域名（不是 localhost）
   - ✅ 以斜杠結尾

---

## 📚 相關文檔

- [完整 Google OAuth 配置指南](GOOGLE_OAUTH_SETUP_GUIDE.md)
- [認證系統設計文檔](docs/AUTH_ARCHITECTURE.md)
- [部署指南](docs/DEPLOYMENT.md)

---

**修復完成後，應該立即可以正常使用 Google 登入了！** 🎉

