# Supabase 架構管理

## 核心原則
- ✅ 每個子項目擁有獨立的 `supabase/` 目錄和 `config.toml`
- ✅ 在子項目目錄內直接部署，使用相對路徑
- ✅ 根目錄 `/supabase/` 僅作為平台級預留位置
- ❌ 絕不將子項目的 Supabase 資源複製到根目錄
- ❌ 絕不在根目錄部署子項目的 Edge Functions

## 部署示例

### ✅ 正確做法：在子項目目錄內
```bash
cd story-vocab
supabase link --project-ref [project-id]
supabase functions deploy [function-name]
```

### ❌ 錯誤做法：複製到根目錄
```bash
# 絕不這樣做！
cp -r story-vocab/supabase/functions supabase/
```

## 架構說明

每個子項目完全獨立管理自己的 Supabase 資源：
- `story-vocab/supabase/` - 詞游記專屬
- 未來其他應用也在各自目錄內管理

根目錄 `/supabase/` 是平台級預留位置，用於未來可能的跨應用共享服務（如統一用戶認證）。

