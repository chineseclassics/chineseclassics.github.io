/**
 * 文房之寶 - 中英詞典模組
 * 功能：
 * - 英→中：優先使用 Supabase Edge Function 代理 Microsoft Translator Dictionary Lookup/Examples
 * - 中→英：使用萌典 API（/a 與 /c），顯示釋義、英文翻譯、近義詞（若有）
 * - 兜底：英→中查詢失敗或配額不足時，使用輕量 CEDICT 本地索引（cedict-mini.json）
 * - 介面：模態視窗、即時搜尋、防抖、快取、錯誤提示
 * 註釋採繁體中文
 */

// ---------- 常量（本應用專用 Supabase 專案） ----------
const SUPABASE_URL = 'https://fjvgfhdqrezutrmbidds.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmdmaGRxcmV6dXRybWJpZGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDE3ODIsImV4cCI6MjA3NjM3Nzc4Mn0.eVX46FM_UfLBk9vJiCfA_zC9PIMTJxmG8QNZQWdG8T8';
const FUNC_BASE = `${SUPABASE_URL}/functions/v1/translator-proxy`;

// ---------- 輔助：防抖 / 偵測語言 / 內存快取 ----------
const debounce = (fn, ms = 300) => {
  let t; return function(...args){ clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
};

function detectLang(text) {
  // 粗略：含英文字母→en，含中日韓統一表意文字→zh，否則預設 zh
  if (/[A-Za-z]/.test(text)) return 'en';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  return 'zh';
}

const cache = new Map(); // key: `${dir}|${q}`

function setStatus(msg) {
  const el = document.getElementById('dict-status'); if (el) el.textContent = msg || '';
}

function setResultsHtml(html) {
  const el = document.getElementById('dict-results'); if (!el) return;
  el.innerHTML = html;
}

function sanitize(s) {
  return String(s || '').replace(/[\u200b\u200c\uFEFF]/g, '').trim();
}

// ---------- Moedict 相關 ----------
async function fetchMoedict(word) {
  // 試 a（詞）→ 若 404 再試 uni（單字）
  const tryUrls = [
    `https://www.moedict.tw/a/${encodeURIComponent(word)}.json`,
    `https://www.moedict.tw/uni/${encodeURIComponent(word)}.json`
  ];
  for (const url of tryUrls) {
    try {
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (r.ok) return await r.json();
    } catch (_) {}
  }
  return null;
}

async function fetchMoedictTaiwan(word) {
  // 兩岸詞典，可能包含英譯
  const url = `https://www.moedict.tw/c/${encodeURIComponent(word)}.json`;
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

function parseMoedictEntries(json) {
  if (!json) return [];
  const entries = [];
  const hs = json.h || []; // 條目陣列
  for (const h of hs) {
    const defs = h.d || []; // 釋義陣列
    const senses = defs.map(d => {
      // d.f 是釋義文字，可能含標記符號；做基本清理
      const raw = (d.f || '').replace(/[\[\]{}（）]/g, '').replace(/[｜]/g, '');
      const clean = sanitize(raw);
      // 近義詞（若有字段 s 或 a）
      const syns = Array.isArray(d.s) ? d.s : (Array.isArray(d.a) ? d.a : []);
      return { def: clean, syns };
    }).filter(x => x.def);
    if (senses.length) entries.push({ senses });
  }
  return entries;
}

// ---------- Microsoft Dictionary 代理 ----------
async function getSupabaseAccessToken() {
  try {
    // 優先使用全局 sb（若 app 已建立）
    if (window.sb?.auth) {
      const { data } = await window.sb.auth.getSession();
      return data?.session?.access_token || null;
    }
    // 次選：若全局未建立，建立一個客戶端以讀取現有會話（同域 LocalStorage）
    if (window.supabase && !window.__dictSb) {
      window.__dictSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    }
    if (window.__dictSb?.auth) {
      const { data } = await window.__dictSb.auth.getSession();
      return data?.session?.access_token || null;
    }
  } catch (_) {}
  return null;
}

async function msLookupEnToZh(word) {
  const key = `ms|${word}`;
  if (cache.has(key)) return cache.get(key);
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    setResultsHtml('<div class="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded">請先登入後使用英→中詞典功能。</div>');
    throw new Error('no_auth');
  }
  const payload = [{ text: word }];
  const r = await fetch(`${FUNC_BASE}/dictionary/lookup?from=en&to=zh-Hant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(`MS Lookup 失敗：${r.status}`);
  const json = await r.json();
  if (!json || !json.ok) throw new Error('MS 回應異常');
  cache.set(key, json.data);
  return json.data;
}

async function msExamplesEnToZh(text, translation) {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('no_auth');
  const payload = [{ text, translation }];
  const r = await fetch(`${FUNC_BASE}/dictionary/examples?from=en&to=zh-Hant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(`MS Examples 失敗：${r.status}`);
  const json = await r.json();
  if (!json || !json.ok) throw new Error('MS 回應異常');
  return json.data;
}

// ---------- CEDICT 兜底 ----------
let cedictLite = null; // { en: [zh1, zh2, ...] }
async function ensureCedictLite() {
  if (cedictLite) return cedictLite;
  try {
    const r = await fetch('./js/data/cedict-mini.json');
    if (r.ok) cedictLite = await r.json();
  } catch (_) {}
  return cedictLite || {};
}

async function cedictFallback(en) {
  const data = await ensureCedictLite();
  const list = data[en.toLowerCase()] || [];
  return list.map(t => ({ target: t, source: en }));
}

// ---------- 渲染 ----------
function renderMoedict(word, parsed, twJson) {
  const enFromTw = twJson?.translation?.English || [];
  const enList = Array.isArray(enFromTw) ? enFromTw : (enFromTw ? [enFromTw] : []);
  const sensesHtml = parsed.map((e, idx) => {
    const syn = e.senses.flatMap(s => s.syns || []).filter(Boolean);
    const defs = e.senses.map((s, i) => `<li class="mb-1 leading-6">${escapeHtml(s.def)}</li>`).join('');
    const synHtml = syn.length ? `<div class="text-xs text-stone-600 mt-1">近義：${escapeHtml(Array.from(new Set(syn)).join('、'))}</div>` : '';
    return `<div class="border-b border-stone-100 py-2">
      <div class="text-stone-700 font-medium">義項 ${idx+1}</div>
      <ul class="list-disc pl-5 mt-1">${defs}</ul>
      ${synHtml}
    </div>`;
  }).join('');
  const enHtml = enList.length ? `<div class="mt-3 text-sm"><span class="text-stone-600">英文：</span>${escapeHtml(enList.join(', '))}</div>` : '';
  return `<div class="p-4">
    <div class="text-lg font-bold text-stone-800 mb-2">${escapeHtml(word)}</div>
    ${sensesHtml || '<div class="text-sm text-stone-500">（未找到詳細釋義）</div>'}
    ${enHtml}
  </div>`;
}

function renderMsLookup(word, msData) {
  // msData: [ { normalizedSource, displaySource, translations: [ { normalizedTarget, displayTarget, posTag, confidence, backTranslations } ] } ]
  const item = Array.isArray(msData) ? msData[0] : null;
  const translations = item?.translations || [];
  if (!translations.length) return `<div class="p-4 text-sm text-stone-500">無結果</div>`;
  const rows = translations.slice(0, 8).map(t => {
    const backs = (t.backTranslations || []).slice(0, 4).map(b => `${escapeHtml(b.displayText || b.normalizedText || '')}${b.frequency ? `<span class="text-xs text-stone-400"> ×${b.frequency}</span>` : ''}`).join('、');
    const pos = t.posTag ? `<span class="text-xs px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">${escapeHtml(t.posTag)}</span>` : '';
    const conf = (t.confidence != null) ? `<span class="text-xs text-stone-400">(${(t.confidence*100).toFixed(0)}%)</span>` : '';
    return `<div class="py-2 border-b border-stone-100">
      <div class="flex items-center gap-2">
        <div class="text-stone-900 font-medium">${escapeHtml(t.displayTarget || t.normalizedTarget)}</div>
        ${pos} ${conf}
        <button class="ml-auto text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-100" data-example="${encodeURIComponent(JSON.stringify({ s: item.displaySource || item.normalizedSource, t: t.displayTarget || t.normalizedTarget }))}">例句</button>
      </div>
      ${backs ? `<div class="text-xs text-stone-600 mt-1">反向常見：${backs}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="p-2">
    <div class="px-2 py-1 text-sm text-stone-600">查詢：<span class="font-medium">${escapeHtml(item.displaySource || item.normalizedSource || word)}</span></div>
    <div class="divide-y">${rows}</div>
    <div id="dict-examples" class="mt-3"></div>
  </div>`;
}

function renderCedictFallback(word, pairs) {
  if (!pairs.length) return `<div class="p-4 text-sm text-stone-500">無結果（兜底）。</div>`;
  const items = pairs.slice(0, 8).map(p => `<li class="mb-1">${escapeHtml(p.target)}</li>`).join('');
  return `<div class="p-4">
    <div class="text-stone-600 text-sm mb-2">（使用 CEDICT 簡化兜底）</div>
    <div class="text-stone-900 font-medium mb-1">${escapeHtml(word)}</div>
    <ul class="list-disc pl-5">${items}</ul>
  </div>`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ---------- 主流程 ----------
async function queryDictionary(q, fromLang, toLang) {
  const key = `${fromLang}>${toLang}|${q}`;
  if (cache.has(key)) return cache.get(key);

  setStatus('查詢中…');
  try {
    if (fromLang === 'zh') {
      const [main, tw] = await Promise.all([fetchMoedict(q), fetchMoedictTaiwan(q)]);
      const parsed = parseMoedictEntries(main);
      const html = renderMoedict(q, parsed, tw);
      cache.set(key, html);
      return html;
    } else {
      // 英→中
      try {
        const ms = await msLookupEnToZh(q);
        const html = renderMsLookup(q, ms);
        cache.set(key, html);
        return html;
      } catch (e) {
        console.warn('MS 失敗，啟用 CEDICT 兜底：', e);
        const pairs = await cedictFallback(q);
        const html = renderCedictFallback(q, pairs);
        cache.set(key, html);
        return html;
      }
    }
  } finally {
    setStatus('');
  }
}

const runQuery = debounce(async () => {
  const input = document.getElementById('dict-query');
  if (!input) return;
  const q = sanitize(input.value);
  if (!q) { setResultsHtml('<div class="px-4 py-3 text-sm text-stone-500 bg-stone-50">請輸入要查詢的詞語</div>'); return; }

  const auto = document.getElementById('dict-auto');
  let from = document.getElementById('dict-from-label')?.textContent === 'EN' ? 'en' : 'zh';
  let to = document.getElementById('dict-to-label')?.textContent === '中' ? 'zh' : 'en';
  if (auto?.checked) {
    const guess = detectLang(q);
    from = guess; to = (guess === 'en' ? 'zh' : 'en');
    updateLangBadges(from, to);
  }

  const html = await queryDictionary(q, from, to);
  setResultsHtml(html);
}, 350);

function updateLangBadges(from, to) {
  const fromLabel = document.getElementById('dict-from-label');
  const toLabel = document.getElementById('dict-to-label');
  if (fromLabel) fromLabel.textContent = (from === 'en' ? 'EN' : '中');
  if (toLabel) toLabel.textContent = (to === 'zh' ? '中' : 'EN');
}

function openDictModal() {
  const modal = document.getElementById('dictionary-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  // 清空狀態
  const input = document.getElementById('dict-query'); if (input) input.focus();
  setResultsHtml('<div class="px-4 py-3 text-sm text-stone-500 bg-stone-50">請輸入要查詢的詞語</div>');
  setStatus('');
}

function closeDictModal() {
  const modal = document.getElementById('dictionary-modal');
  if (!modal) return; modal.classList.add('hidden');
}

function bindOnce() {
  if (window.__dictBound) return; window.__dictBound = true;

  // 開啟/關閉
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#open-dictionary-tool-btn');
    if (btn) { e.preventDefault(); openDictModal(); }
    const closer = e.target.closest('[data-modal-close="true"]');
    if (closer && document.getElementById('dictionary-modal') && !document.getElementById('dictionary-modal').classList.contains('hidden')) {
      e.preventDefault(); closeDictModal();
    }
  });

  // 查詢輸入
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'dict-query') runQuery();
  });

  // 交換方向（關閉自動）
  document.addEventListener('click', (e) => {
    const swap = e.target.closest('#dict-swap');
    if (swap) {
      e.preventDefault();
      const auto = document.getElementById('dict-auto'); if (auto) auto.checked = false;
      const fromLabel = document.getElementById('dict-from-label');
      const toLabel = document.getElementById('dict-to-label');
      const from = fromLabel?.textContent === 'EN' ? 'zh' : 'en';
      const to = toLabel?.textContent === '中' ? 'EN' : '中';
      if (fromLabel) fromLabel.textContent = (from === 'en' ? 'EN' : '中');
      if (toLabel) toLabel.textContent = to;
      runQuery();
    }
  });

  // 範例句觸發（動態委派）
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-example]');
    if (!btn) return;
    try {
      const payload = JSON.parse(decodeURIComponent(btn.getAttribute('data-example')));
      const data = await msExamplesEnToZh(payload.s, payload.t);
      const list = Array.isArray(data) ? data[0]?.examples || [] : [];
      const html = list.slice(0, 5).map(ex => `<li class="mb-1"><span class="text-stone-900">${escapeHtml(ex.sourcePrefix||'')}${escapeHtml(ex.sourceTerm||'')}${escapeHtml(ex.sourceSuffix||'')}</span><span class="text-stone-500"> → ${escapeHtml(ex.targetPrefix||'')}${escapeHtml(ex.targetTerm||'')}${escapeHtml(ex.targetSuffix||'')}</span></li>`).join('');
      const exEl = document.getElementById('dict-examples');
      if (exEl) exEl.innerHTML = `<div class="mt-2 border-t border-stone-200 pt-2"><div class="text-sm text-stone-700 mb-1">例句：</div><ul class="list-disc pl-5 text-sm">${html || '<li class=\"text-stone-500\">暫無</li>'}</ul></div>`;
    } catch (err) {
      console.warn('例句獲取失敗', err);
    }
  });

  // ESC 關閉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('dictionary-modal');
      if (modal && !modal.classList.contains('hidden')) closeDictModal();
    }
  });
}

(function init() {
  try {
    bindOnce();
    console.log('📗 文房之寶：中英詞典已就緒');
  } catch (e) {
    console.error('字典模組初始化錯誤', e);
  }
})();
