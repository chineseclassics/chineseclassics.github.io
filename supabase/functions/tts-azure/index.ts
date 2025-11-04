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
const DEFAULT_RATE = "-20%"; // 稍慢，配合教學
const DEFAULT_PITCH = "+3st"; // 稍高，親和

function buildSSML(text: string, voice: string = DEFAULT_VOICE, rate: string = DEFAULT_RATE, pitch: string = DEFAULT_PITCH) {
  // 使用 SSML 控制語速與音高
  return `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xml:lang="zh-CN">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}">${text}</prosody>
  </voice>
</speak>`;
}

async function ttsWithAzure(text: string, voice?: string) {
  const key = Deno.env.get("AZURE_SPEECH_KEY");
  const region = Deno.env.get("AZURE_SPEECH_REGION");
  if (!key || !region) {
    return new Response(JSON.stringify({ error: "Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = buildSSML(text, voice || DEFAULT_VOICE);

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
      if (!text) {
        return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      return await ttsWithAzure(text, voice);
    }

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Expected application/json" }), { status: 415, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const body = (await req.json()) as { text?: string; voice?: string };
      const text = (body.text || "").trim();
      const voice = (body.voice || "").trim() || undefined;
      if (!text) {
        return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      return await ttsWithAzure(text, voice);
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Unhandled error", message: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
