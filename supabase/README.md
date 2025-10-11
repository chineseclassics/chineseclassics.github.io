# 太虛幻境平台級 Supabase 配置

> 本目錄為太虛幻境平台級共享服務預留位置

## 架構說明

太虛幻境採用**兩層 Supabase 架構**：

### 平台級（本目錄）
- 用途：未來可能的跨應用共享服務
- 例如：統一用戶認證系統、跨應用數據分析等
- 目前狀態：預留，暫未使用

### 應用級（各子項目）
每個子項目完全獨立管理自己的 Supabase 資源：
- `story-vocab/supabase/` - 詞游記專屬
- 未來其他應用也在各自目錄內管理

## 部署原則

**絕對禁止**：將子項目的 supabase 資源複製到本目錄  
**正確做法**：在子項目目錄內直接部署

## 目錄結構

```
/supabase/
├── README.md      # 本文件（架構說明）
└── config.toml    # 平台級配置模板
```

**注意**：
- `functions/` 和 `migrations/` 空目錄會被 Git 忽略
- 子項目專屬的 Edge Functions 和遷移腳本都在各自的 `supabase/` 內

---

相關文檔：
- [太虛幻境架構文檔](../TAIXU_ARCHITECTURE.md)
- [Story-Vocab 部署指南](../story-vocab/docs/DEPLOYMENT.md)

