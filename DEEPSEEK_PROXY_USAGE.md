## DeepSeek Vercel 代理使用指南（前端安全用法）

本指南教你如何在任何前端（含 GitHub Pages）安全調用 DeepSeek，而不在瀏覽器暴露金鑰。你已經部署好的代理端點如下：

- 代理 URL：`https://deepseek-proxy-chi.vercel.app/api/deepseek`

原理：前端把請求 POST 到你的代理；代理在伺服器端使用金鑰向 DeepSeek 轉發並回傳結果。


### A. 在任意前端的最小整合步驟

1) 設定代理 URL（擇一）
- 臨時（僅當前瀏覽器）：
```javascript
localStorage.setItem('DEEPSEEK_PROXY_URL','https://deepseek-proxy-chi.vercel.app/api/deepseek')
```
- 在頁面最上方寫死（所有使用者都生效）：
```html
<script>window.DEEPSEEK_PROXY_URL='https://deepseek-proxy-chi.vercel.app/api/deepseek'</script>
```
- 在程式中定義常量：
```javascript
const DEEPSEEK_PROXY_URL = 'https://deepseek-proxy-chi.vercel.app/api/deepseek';
```

2) 發送請求（非串流，最穩定）
```javascript
async function callDeepSeek(messages) {
  const url = window.DEEPSEEK_PROXY_URL || localStorage.getItem('DEEPSEEK_PROXY_URL') || DEEPSEEK_PROXY_URL;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,               // [{ role:'user', content:'你好' }]
      temperature: 0.7,
      max_tokens: 512
    })
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}
```

3) 在頁面呼叫
```javascript
const reply = await callDeepSeek([{ role:'user', content:'你好' }]);
console.log('AI 回覆：', reply);
```

4) 若頁面有 Content-Security-Policy（CSP）
- 請把 `connect-src` 加入你的代理域名：
```html
<meta http-equiv="Content-Security-Policy" content="connect-src 'self' https://deepseek-proxy-chi.vercel.app;">
```


### B. Vercel 端維護（偶爾需要）

1) 允許你的前端網域（CORS 白名單）
- 代理應回傳 CORS 標頭，並限制允許的來源域名。`api/deepseek.js` 範例：
```javascript
// api/deepseek.js
const ALLOWED_ORIGINS = ['https://chineseclassics.github.io'];

function setCors(res, origin) {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  if (req.method === 'OPTIONS') {
    setCors(res, allowed);
    return res.status(204).end();
  }

  setCors(res, allowed); // 所有回應都帶上 CORS

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API key not configured' });
  }

  const body = req.body || {};
  const safeBody = {
    model: 'deepseek-chat',
    messages: Array.isArray(body.messages) ? body.messages : [],
    temperature: Math.min(body.temperature ?? 0.7, 1.0),
    max_tokens: Math.min(body.max_tokens ?? 1024, 2048),
    stream: false,
  };

  try {
    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(safeBody),
    });

    const text = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error', detail: String(err) });
  }
}
```
- 若你新增其他前端網域（自訂網域/本機開發），把該網域加到 `ALLOWED_ORIGINS` 陣列後重新部署即可。

2) 設定或旋轉金鑰
- Vercel 專案 → Settings → Environment Variables → 新增/更新 `DEEPSEEK_API_KEY` → Redeploy。

3) 重新部署
- 將程式編輯提交到 main，Vercel 會自動部署；或至 Deployments 頁點 Redeploy。


### C. 測試方式（快速檢查）

在你的頁面打開瀏覽器 Console，依序執行：

1) 設定代理 URL 並重新載入
```javascript
localStorage.setItem('DEEPSEEK_PROXY_URL','https://deepseek-proxy-chi.vercel.app/api/deepseek');
location.reload();
```

2) 發送最小請求
```javascript
fetch(localStorage.getItem('DEEPSEEK_PROXY_URL'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role:'user', content:'你好，這是代理連線測試' }],
    max_tokens: 64,
    temperature: 0.7
  })
}).then(r=>r.json()).then(console.log).catch(console.error);
```
- 正常會拿到 `choices[0].message.content` 的回應。


### D. 常見錯誤與排解

- CORS 錯誤（No 'Access-Control-Allow-Origin'）
  - 原因：代理未允許你的前端網域。
  - 解法：把前端網域加入 `ALLOWED_ORIGINS`，重新部署。

- 405 Method Not Allowed（GET）
  - 原因：端點僅接受 POST。
  - 解法：用上面的 POST 範例。

- 401/403（授權或來源不允許）
  - 檢查 Vercel 環境變數 `DEEPSEEK_API_KEY` 是否存在，來源網域是否在白名單。

- 5xx（上游錯誤）
  - 可能是上游 DeepSeek 回覆錯誤或參數超限；確認 `model/messages/max_tokens` 等參數。


### E. 進階（需要串流 SSE 時）

目前指南為非串流版；若要逐字串流，需要把 Vercel 函數改為 Edge runtime 並回傳 `text/event-stream`。等你需要時再調整即可。


### F. 安全建議（務必遵守）

- 前端永遠不要放 API Key（不要變相注入、不要混淆）。
- 金鑰只放在代理（伺服器）環境變數；必要時定期旋轉金鑰。
- 代理端應限制允許網域、限制可用模型與參數上限，必要時加上速率限制。


