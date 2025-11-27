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

function buildSSML(
  text: string,
  voice: string = DEFAULT_VOICE,
  rate?: string | null,
  pinyinIPA?: string | null,
  pinyinText?: string | null
) {
  // 若提供 pinyinIPA，使用 <phoneme> 強制拼音發音。
  // 若提供 rate，使用 <prosody> 控制語速（Azure 支持 0.5-2.0 或百分比如 "-50%"）
  // 注意：多音字發音修正已移至前端處理（taixu-tts.js）
  const safeText = (text || '').trim();
  const pText = (pinyinText || '').trim();
  
  let content = safeText;
  
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
