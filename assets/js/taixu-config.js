// 太虛幻境全站配置（可被各應用引用）
// 在線 TTS 函式端點（Supabase Functions）：
// 部署成功後自動填入，若更換專案請更新下列兩個值。
window.TAIXU_TTS_ENDPOINT = "https://fjvgfhdqrezutrmbidds.functions.supabase.co/tts-azure";

// Supabase 公開 anon key（用於存取需驗證的 Edge Functions）。
// anon key 並非機密，可安全置於前端，用於客戶端請求。
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmdmaGRxcmV6dXRybWJpZGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDE3ODIsImV4cCI6MjA3NjM3Nzc4Mn0.eVX46FM_UfLBk9vJiCfA_zC9PIMTJxmG8QNZQWdG8T8";