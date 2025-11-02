// deno-lint-ignore-file no-explicit-any
// 以 Supabase Edge Function 代理 Microsoft Translator 的 Dictionary/Examples 端點
// 說明：
// - 從 Supabase 環境變數讀取金鑰/區域/端點
// - 提供兩條路徑：/dictionary/lookup 與 /dictionary/examples
// - 統一處理 CORS，允許跨域呼叫
// - 僅作透傳與簡單參數整理，不在此保存任何使用者資料

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Fallback：本地型別檢查環境可能無法解析 Deno 型別，避免編譯器報錯
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

type LookupPayload = string | string[] | { text: string }[];

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-authorization, x-authorization, accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;
}

function jsonResponse(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
    status: init.status || 200,
  });
}

function getEnvOrThrow(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`缺少必要環境變數：${name}`);
  return v;
}

async function proxyToMicrosoft(req: Request, path: "/dictionary/lookup" | "/dictionary/examples") {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // 先處理預檢請求（避免因環境變數缺失而報錯 500）
  if (req.method === "OPTIONS") {
    return new Response("", { headers, status: 204 });
  }

  // 僅在非預檢時讀取環境變數
  const KEY = getEnvOrThrow("MICROSOFT_TRANSLATOR_KEY");
  const REGION = getEnvOrThrow("MICROSOFT_TRANSLATOR_REGION");
  const ENDPOINT = getEnvOrThrow("MICROSOFT_TRANSLATOR_ENDPOINT").replace(/\/$/, "");

  // 解析查詢參數與預設
  const from = url.searchParams.get("from") || "en"; // 預設英→中
  const to = url.searchParams.get("to") || "zh-Hant";

  if (req.method !== "POST") {
    return jsonResponse({ error: "請使用 POST" }, { status: 405, headers });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return jsonResponse({ error: "content-type 必須為 application/json" }, { status: 400, headers });
    }

    const body = (await req.json()) as any;

    let msUrl = `${ENDPOINT}/translator/text/v3.0${path}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    let msPayload: any[] = [];

    if (path === "/dictionary/lookup") {
      // 接受：
      // - { text: string }[]
      // - string
      // - string[]
      const payload = body as LookupPayload;
      if (Array.isArray(payload)) {
        if (payload.length === 0) {
          return jsonResponse({ error: "請提供至少一個查詢文本" }, { status: 400, headers });
        }
        if (typeof payload[0] === "string") {
          msPayload = (payload as string[]).map((t) => ({ text: String(t) }));
        } else {
          msPayload = payload as { text: string }[];
        }
      } else if (typeof payload === "string") {
        msPayload = [{ text: payload }];
      } else if (payload && typeof (payload as any).text === "string") {
        msPayload = [payload as { text: string }];
      } else {
        return jsonResponse({ error: "無效的請求正文，請提供 string | string[] | {text}[]" }, { status: 400, headers });
      }
    } else {
      // /dictionary/examples 需要 [{ text, translation }]
      // 允許：
      // - { text: string, translation: string }[]
      // - { text: string, translation: string }
      // - { text: string, candidate: string }
      // - { source: string, target: string }
      const normalize = (item: any) => {
        const text = item?.text ?? item?.source;
        const translation = item?.translation ?? item?.candidate ?? item?.target;
        if (!text || !translation) return null;
        return { text: String(text), translation: String(translation) };
      };
      if (Array.isArray(body)) {
        msPayload = body.map(normalize).filter(Boolean);
      } else if (body && typeof body === "object") {
        const once = normalize(body);
        if (once) msPayload = [once];
      }
      if (!msPayload.length) {
        return jsonResponse({ error: "請提供 { text, translation }" }, { status: 400, headers });
      }
    }

    const msResp = await fetch(msUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY,
        "Ocp-Apim-Subscription-Region": REGION,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(msPayload),
    });

    const respText = await msResp.text();
    const isJson = msResp.headers.get("content-type")?.includes("application/json");
    const data = isJson ? JSON.parse(respText) : respText;

    if (!msResp.ok) {
      return jsonResponse({ error: "translator_error", status: msResp.status, data }, { status: 502, headers });
    }

    return jsonResponse({ ok: true, data }, { headers });
  } catch (err: any) {
    return jsonResponse({ error: String(err?.message || err) }, { status: 500, headers: corsHeaders(req.headers.get("origin")) });
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // 全域預檢優先處理，避免任何路由或環境讀取造成 500
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers });
  }

  // 簡易來源白名單（即使關閉 JWT 也有限制）。如需擴展，調整此陣列。
  const allowed = new Set([
    "https://chineseclassics.github.io",
    "http://localhost:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8080",
  ]);
  if (origin && !allowed.has(origin)) {
    return jsonResponse({ error: "forbidden_origin" }, { status: 403, headers });
  }

  // 健康檢查
  if (url.pathname === "/" || url.pathname === "") {
    if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
    return jsonResponse({ service: "translator-proxy", status: "ok" }, { headers });
  }

  if (url.pathname.endsWith("/dictionary/lookup")) {
    return proxyToMicrosoft(req, "/dictionary/lookup");
  }
  if (url.pathname.endsWith("/dictionary/examples")) {
    return proxyToMicrosoft(req, "/dictionary/examples");
  }

  return jsonResponse({ error: "not_found" }, { status: 404, headers });
});
