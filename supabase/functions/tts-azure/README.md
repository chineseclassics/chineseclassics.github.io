# tts-azure（Supabase Edge Function）

以 Azure Speech 提供普通話在線語音合成的代理函式，避免在前端暴露金鑰，回傳 MP3 音訊。

## 為何需要這個代理？
- 瀏覽器內建語音（Web Speech API）在不同系統/瀏覽器的可用聲音不一致，常出現預設轉到粵語。
- 透過雲端 TTS 可穩定指定普通話（例如 `zh-CN-XiaoxiaoNeural`）。
- 金鑰放在 Edge Function 的伺服端，前端只呼叫無密鑰的 API。

## 先決條件
- 你需要一組 Azure Cognitive Services Speech 的 `key` 與 `region`。
- 這是平台級共用能力，放在倉庫根目錄的 `supabase/functions` 下是合理的（供多個應用共用）。

## 設定環境變數

建議使用 Supabase CLI 的 secrets：

```bash
# 於倉庫根目錄
cd supabase

# 建立 .env 並填入：
# AZURE_SPEECH_KEY=xxxxx
# AZURE_SPEECH_REGION=eastasia  # 依你的資源區域調整

supabase secrets set --env-file ./.env
```

## 本地開發（可選）

```bash
# 在子資料夾啟動或於根資料夾指定函式名稱
supabase functions serve --env-file ./supabase/.env --no-verify-jwt tts-azure
# 本地預設端點類似：http://localhost:54321/functions/v1/tts-azure?text=你好
```

> 註：本地與正式的 Functions URL 不同。前端可用設定檔注入對應的 URL。

## 部署

```bash
# 連結你的 Supabase 專案（如未連結）
supabase link --project-ref <your-project-ref>

# 部署函式
supabase functions deploy tts-azure
```

部署後的正式端點：

```
https://<project-ref>.functions.supabase.co/tts-azure
```

### 使用方式
- GET：`/tts-azure?text=你好&voice=zh-CN-XiaoxiaoNeural`
- POST：`{ "text": "你好", "voice": "zh-CN-XiaoxiaoNeural" }`

回傳：`audio/mpeg`（MP3）。

## 前端整合建議
- 於 `/assets/js/taixu-config.js` 寫入：
  ```js
  window.TAIXU_TTS_ENDPOINT = "https://<project-ref>.functions.supabase.co/tts-azure";
  ```
- 前端先嘗試抓取此端點的音訊並播放，失敗時再回退到瀏覽器內建語音。

## 安全與限制
- 金鑰只存在 Edge Function 環境變數中；請勿在前端代碼出現金鑰。
- 如需限制來源，可將 `Access-Control-Allow-Origin` 改為你的網域白名單。
