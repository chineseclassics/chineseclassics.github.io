// deno-lint-ignore-file no-explicit-any
// 太虛幻境：跨應用共用的在線 TTS 代理（Azure Speech）
// 說明：
// - 以 Supabase Edge Function 代理 Azure 語音合成，避免在前端暴露金鑰
// - 預設輸出 MP3，普通話女聲 zh-CN-XiaoxiaoNeural，可用 query/body 指定 voice
// - CORS 已開放（如需，請改為白名單）
// - 重要：請先在專案中設定 AZURE_SPEECH_KEY 與 AZURE_SPEECH_REGION 秘鑰
//   supabase secrets set --env-file ./supabase/.env
//   內容：
//     AZURE_SPEECH_KEY=你的金鑰
//     AZURE_SPEECH_REGION=eastasia（或你的資源區域）

// 讓 Deno 知道這是 Edge Runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// 若本地型別工具無法辨識 Deno 命名空間，以下宣告可避免編譯噪音（Edge 環境會提供實體）：
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"; // 普通話（女）

// 將簡單的拼音（僅限本專案教學用的子集）轉為 IPA，強制按拼音發音
function pinyinToIPA(pinyin: string): string | null {
  const p = (pinyin || '').trim().toLowerCase();
  switch (p) {
    case 'bo': return 'pwɔ';
    case 'po': return 'pʰwɔ';
    case 'mo': return 'mwɔ';
    case 'fo': return 'fwɔ';
    case 'de': return 'tɤ';
    case 'te': return 'tʰɤ';
    case 'ne': return 'nɤ';
    case 'le': return 'lɤ';
    case 'ge': return 'kɤ';
    case 'ke': return 'kʰɤ';
    case 'he': return 'xɤ';
    case 'ji': return 'tɕi';
    case 'qi': return 'tɕʰi';
    case 'xi': return 'ɕi';
    default: return null;
  }
}

// 多音字發音修正規則
// 使用 <sub> 標籤將多音字替換為同音字，這是最可靠的方法
// 注意：「為」有兩種寫法：為 (標準) 和 爲 (異體字)，需要同時支持
const PRONUNCIATION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // 「為/爲」讀 wéi（第二聲）的情況 - 用同音字「維」替換
  { pattern: /[為爲]業/g, replacement: '<sub alias="維業">為業</sub>' },
  { pattern: /[為爲]人/g, replacement: '<sub alias="維人">為人</sub>' },
  { pattern: /以[為爲]/g, replacement: '<sub alias="以維">以為</sub>' },
  { pattern: /成[為爲]/g, replacement: '<sub alias="成維">成為</sub>' },
  { pattern: /作[為爲]/g, replacement: '<sub alias="作維">作為</sub>' },
  { pattern: /[為爲]官/g, replacement: '<sub alias="維官">為官</sub>' },
  { pattern: /[為爲]師/g, replacement: '<sub alias="維師">為師</sub>' },
  { pattern: /[為爲]學/g, replacement: '<sub alias="維學">為學</sub>' },
  // 可繼續添加更多規則...
];

// 應用多音字發音修正
function applyPronunciationFixes(text: string): string {
  let result = text;
  for (const rule of PRONUNCIATION_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  // 添加調試日誌
  if (text !== result) {
    console.log('發音修正:', { original: text, fixed: result });
  }
  return result;
}

function buildSSML(
  text: string,
  voice: string = DEFAULT_VOICE,
  rate?: string | null,
  pinyinIPA?: string | null,
  pinyinText?: string | null
) {
  // 若提供 pinyinIPA，使用 <phoneme> 強制拼音發音。
  // 若提供 rate，使用 <prosody> 控制語速（Azure 支持 0.5-2.0 或百分比如 "-50%"）
  const safeText = (text || '').trim();
  const pText = (pinyinText || '').trim();
  
  // 應用多音字發音修正
  let content = applyPronunciationFixes(safeText);
  
  // 如果有拼音參數，追加拼音發音
  if (pText) {
    const tail = pinyinIPA
      ? `<phoneme alphabet="ipa" ph="${pinyinIPA}">${pText}</phoneme>`
      : pText;
    content = `${content ? content + ' ' : ''}${tail}`;
  }
  
  // 如果有語速設定，用 prosody 包裹
  if (rate) {
    content = `<prosody rate="${rate}">${content}</prosody>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="${voice}">${content}</voice>
</speak>`;
}

async function ttsWithAzure(text: string, voice?: string, rate?: string | null, pinyin?: string | null) {
  const key = Deno.env.get("AZURE_SPEECH_KEY");
  const region = Deno.env.get("AZURE_SPEECH_REGION");
  if (!key || !region) {
    return new Response(JSON.stringify({ error: "Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ipa = pinyin ? pinyinToIPA(pinyin) : null;
  const ssml = buildSSML(text, voice || DEFAULT_VOICE, rate, ipa, pinyin || null);
  
  // 調試：輸出生成的 SSML
  console.log('TTS Request:', { text: text.substring(0, 100), ssml: ssml.substring(0, 500) });

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "Ocp-Apim-Subscription-Key": key,
    },
    body: ssml,
  });

  if (!resp.ok) {
    const t = await resp.text();
    return new Response(JSON.stringify({ error: "Azure TTS error", status: resp.status, body: t }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const audio = new Uint8Array(await resp.arrayBuffer());
  return new Response(audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400", // 可視情況調整
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  // CORS 預檢
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    if (req.method === "GET") {
      const text = url.searchParams.get("text")?.trim();
      const voice = url.searchParams.get("voice")?.trim() || undefined;
      const rate = url.searchParams.get("rate")?.trim() || null;
      const pinyin = url.searchParams.get("pinyin")?.trim() || null;
      if (!text) {
        return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      return await ttsWithAzure(text, voice, rate, pinyin);
    }

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Expected application/json" }), { status: 415, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const body = (await req.json()) as { text?: string; voice?: string; rate?: string; pinyin?: string };
      const text = (body.text || "").trim();
      const voice = (body.voice || "").trim() || undefined;
      const rate = (body.rate || "").trim() || null;
      const pinyin = (body.pinyin || "").trim() || null;
      if (!text) {
        return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      return await ttsWithAzure(text, voice, rate, pinyin);
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Unhandled error", message: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
