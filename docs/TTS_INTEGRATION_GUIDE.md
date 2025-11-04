# 太虛幻境在線 TTS 接入指南（Azure 版）

更新日期：2025-11-04

本文件說明如何在任一太虛幻境應用頁面中，接入「在線普通話 TTS」能力，並於失敗時回退到瀏覽器內建語音（SpeechSynthesis）。本方案以 Supabase Edge Function 代理 Azure Speech，避免在前端暴露金鑰。

> 平台級資源：Edge Function 放在倉庫根目錄的 `supabase/functions/tts-azure/`，供多個應用共用；應用端只需讀取全站配置並呼叫接口。

---

## 一、前置條件

- 你已部署 Edge Function：`tts-azure`
  - 正式端點類型：`https://<project-ref>.functions.supabase.co/tts-azure`
  - 函式會使用 Secrets `AZURE_SPEECH_KEY` 與 `AZURE_SPEECH_REGION` 自動拼出 Azure TTS API，無需額外設定 Azure 端點 URL。
- 已設定 Secrets（Supabase Dashboard 或 CLI）：
  - `AZURE_SPEECH_KEY=...`
  - `AZURE_SPEECH_REGION=eastasia`（依你的資源區域調整）
- 全站配置檔 `assets/js/taixu-config.js` 已設定：
  - `window.TAIXU_TTS_ENDPOINT = "https://<project-ref>.functions.supabase.co/tts-azure"`
  - `window.SUPABASE_ANON_KEY = "<你的 anon key>"`
- 頁面資源路徑遵守架構規範（使用絕對路徑，例如 `/assets/js/...`）。
- 每個應用頁尾仍需引入應用切換器（與本指南無直接關係，但屬平台規範）：
  - `<script src="/assets/js/taixu-app-switcher.js"></script>`

---

## 二、快速接入（最小代碼）

在你的應用 HTML 中，於 `<head>` 或 `<body>` 前段載入全站配置檔（確保在使用前已載入）：

```html
<script src="/assets/js/taixu-config.js"></script>
```

在你的頁面腳本中加入以下方法（可貼在現有 `<script>` 中）：

```html
<script>
// 以在線 TTS 優先，失敗時回退瀏覽器語音；可重複用於任意按鈕/互動
async function taixuSpeak(text, opts = {}) {
  const endpoint = (window.TAIXU_TTS_ENDPOINT || '').trim();
  const voice = opts.voice || 'zh-CN-XiaoxiaoNeural'; // 預設普通話女聲

  // 1) 在線 TTS（若已配置）
  if (endpoint) {
    try {
      const headers = {};
      const anon = (window.SUPABASE_ANON_KEY || '').trim();
      if (anon) {
        headers['apikey'] = anon;
        headers['Authorization'] = `Bearer ${anon}`;
      }
      const url = `${endpoint}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
      const resp = await fetch(url, { method: 'GET', headers });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      await audio.play();
      return true;
    } catch (e) {
      // 失敗則回退
    }
  }

  // 2) 瀏覽器內建語音回退
  try {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    // 優先找普通話（排除粵語）
    const voices = synth.getVoices();
    const pick = (pred) => voices.find(pred);
    const isZhCN = v => /^(zh|cmn)[-_]?(CN|Hans)/i.test(v.lang||'') || /Mandarin|普通话|PRC|Hans/i.test(v.name||'');
    const isZhTW = v => /^zh[-_]?TW/i.test(v.lang||'') || /Taiwan|台灣|臺灣/i.test(v.name||'');
    const isZhHK = v => /^zh[-_]?HK/i.test(v.lang||'') || /Cantonese|粵|粤/i.test(v.name||'');
    u.voice = pick(isZhCN) || pick(isZhTW) || pick(v => /^zh/i.test(v.lang||'') && !isZhHK(v));
    if (!u.voice) u.lang = 'zh-CN';
    u.pitch = 1.3;
    u.rate = 0.8;
    synth.speak(u);
    return true;
  } catch (e) {
    console.warn('speech fallback failed', e);
    return false;
  }
}
</script>
```

使用示例：

```html
<button onclick="taixuSpeak('請找到 bo')">播放提示</button>
```

---

## 三、API「小契約」

- 輸入：
  - `text`（必填）：要合成的中文內容
  - `opts.voice`（選填）：Azure 語音名稱，預設 `zh-CN-XiaoxiaoNeural`
- 行為：
  - 優先呼叫在線 TTS，成功時回傳 true；失敗則回退到內建語音
- 失敗模式：
  - 401/403：未帶驗證標頭（請檢查 `SUPABASE_ANON_KEY`）
  - 5xx：TTS 服務或網路問題（將回退）
  - Autoplay 限制：若不在使用者手勢中觸發，瀏覽器可能阻擋播放（建議置於點擊事件內）

---

## 四、常見問題（FAQ）

- Q：我直接在瀏覽器地址列打開函式 URL 為什麼 401？
  - A：函式啟用 JWT 驗證，地址列無法帶 Authorization 標頭；在前端 fetch 時我已示範如何附帶 anon key。

- Q：我要讓地址列也能直接播？
  - A：可將函式改為不驗證（`--no-verify-jwt`），但不建議；目前方案已在前端帶 anon key，安全性較佳。

- Q：CORS 需要改嗎？
  - A：函式預設 `Access-Control-Allow-Origin: *`。若要更嚴謹，可改為白名單你的正式網域。

- Q：語音人選有哪些？
  - A：預設使用 `zh-CN-XiaoxiaoNeural`。你可改傳 `voice=` 參數（例如 `zh-CN-YunxiNeural` 男聲、或台灣腔 `zh-TW-HsiaoChenNeural`）。實際可用清單請參考 Azure Speech 官方文件。

- Q：語速/音高可調嗎？
  - A：目前函式使用 Azure 預設的語速與音高（未調整 prosody）。若你想支持自訂語速/音高，可擴充函式加入對應的 query 參數並生成 SSML。

- Q：如何提升體驗與效能？
  - A：
    - 將相同 `text+voice` 的 MP3 以 Map/Cache 暫存，避免重複請求
    - 播放完成後釋放 `URL.createObjectURL` 產生的連結
    - 初次互動（點開始）時先預熱一小段，避免第一次播放延遲

---

## 五、測試方式

- 命令列測試（需帶 anon key）：

```bash
curl -i \
  -H "apikey: <YOUR_ANON_KEY>" \
  -H "Authorization: Bearer <YOUR_ANON_KEY>" \
  "https://<project-ref>.functions.supabase.co/tts-azure?text=你好&voice=zh-CN-XiaoxiaoNeural"
```

- 存檔後播放（macOS）：

```bash
curl -s \
  -H "apikey: <YOUR_ANON_KEY>" \
  -H "Authorization: Bearer <YOUR_ANON_KEY>" \
  "https://<project-ref>.functions.supabase.co/tts-azure?text=你好&voice=zh-CN-XiaoxiaoNeural" \
  -o out.mp3
afplay out.mp3
```

---

## 六、與太虛幻境規範的關係

- 路徑一律用絕對路徑（`/assets/js/taixu-config.js`）
- 每個應用需獨立可運行；本方案不強制耦合，只需讀取全站配置即可
- Edge Function 屬平台級能力，放在根目錄 `supabase/functions` 下，供各應用共用

---

## 七、進階：替換為其他雲 TTS

若想改用 Google Cloud TTS 或 Amazon Polly：
- 保持前端介面不變（同樣從 `TAIXU_TTS_ENDPOINT` 取端點）
- 新增另一個 Edge Function（例如 `tts-gcloud`），回傳 MP3 即可
- 修改 `taixu-config.js` 的 `TAIXU_TTS_ENDPOINT` 指向新端點

---

## 八、故障排除速查

- 401 Missing authorization header：
  - 確認前端 fetch 已帶 `apikey` 與 `Authorization: Bearer <anon>`
  - 確認 `assets/js/taixu-config.js` 已正確載入（用絕對路徑）
- 502 Azure TTS error：
  - 檢查 Secrets 是否正確（KEY/REGION）
  - 暫時性服務問題，稍後重試
- 無聲音或被阻擋：
  - 確保在使用者手勢（點擊）中觸發播放
  - iOS/Safari 可能更嚴格，建議在開始按鈕中做一次預熱播放

---

## 九、版本與維護

- 版本：v1（Azure 代理）
- 若你需要頁面組件化（例如封裝為 `/assets/js/taixu-tts.js`），或要支援離線快取（Service Worker），可提出需求再行擴充。

---

## 十、共用工具檔（推薦）

已提供封裝檔：`/assets/js/taixu-tts.js`

用法：

```html
<!-- 先載入全站配置，後載入封裝函式（絕對路徑） -->
<script src="/assets/js/taixu-config.js"></script>
<script src="/assets/js/taixu-tts.js"></script>

<!-- 任意按鈕直接呼叫 -->
<button onclick="window.taixuSpeak('請找到 bo')">播放提示</button>
```

說明：
- `taixuSpeak(text, opts)` 會優先使用在線 TTS（需在 `taixu-config.js` 中設定端點與 anon key），失敗時回退瀏覽器語音
- 內建簡單快取，避免同一段語音重複請求
- 可透過 `opts.voice` 指定 Azure 語音名稱，例如：`zh-CN-YunxiNeural`、`zh-TW-HsiaoChenNeural`
