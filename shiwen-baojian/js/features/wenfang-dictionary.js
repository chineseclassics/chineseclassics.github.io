/**
 * 文房之寶 - 中英詞典模組
 * 功能：
 * - 英→中：改用 CEDICT 分片索引（不再依賴 Microsoft），動態載入對應字首分片
 * - 中→英：使用萌典 API（/a 與 /c），顯示釋義、英文翻譯、近義詞（若有）
 * - 兜底：若分片缺失或找不到詞條，可使用輕量 CEDICT 本地索引（cedict-mini.json）
 * - 介面：模態視窗、即時搜尋、防抖、快取、錯誤提示
 * 註釋採繁體中文
 */

// ---------- 常量 ----------
// 取消 Microsoft 依賴，英→中改為 CEDICT 分片；保留萌典用於中→英
// ---------- 引入 CEDICT 分片載入器（EN→ZH） ----------
import { cedictLookupEnToZh } from './cedict-loader.js';

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
function cleanMoedictText(text) {
  if (!text) return '';
  // 萌典常見特殊符號清理：` ~ 以及分隔符號
  return String(text).replace(/[`~￹￻]/g, '').trim();
}

function extractChineseWords(text) {
  if (!text) return [];
  // 先清理，再擷取連續中日韓統一表意文字
  const cleaned = cleanMoedictText(text);
  const words = cleaned.match(/[\u4E00-\u9FFF]+/g) || [];
  return words.filter(Boolean);
}

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
  const hs = json.h || []; // 詞語（/a）條目陣列
  for (const h of hs) {
    const defs = h.d || []; // 釋義陣列
    const senses = defs.map(d => {
      // d.f 是釋義文字，可能含標記符號；做基本清理
      const raw = (d.f || '').replace(/[\[\]{}（）]/g, '').replace(/[｜]/g, '');
      const clean = sanitize(cleanMoedictText(raw));
      // 近義詞：僅從 d.s 擷取（不混入反義詞 a）
      const synField = d.s;
      const synArr = Array.isArray(synField) ? synField : (synField ? [synField] : []);
      const syns = [...new Set(synArr.flatMap(extractChineseWords))];
      return { def: clean, syns };
    }).filter(x => x.def);
    if (senses.length) entries.push({ senses });
  }

  // 兼容單字（/uni）結構：heteronyms[].definitions
  const hets = json.heteronyms || [];
  for (const het of hets) {
    const defs = het.definitions || [];
    const senses = defs.map(d => {
      const raw = (d.def || '').replace(/[\[\]{}（）]/g, '').replace(/[｜]/g, '');
      const clean = sanitize(cleanMoedictText(raw));
      const synField = d.s;
      const synArr = Array.isArray(synField) ? synField : (synField ? [synField] : []);
      const syns = [...new Set(synArr.flatMap(extractChineseWords))];
      return { def: clean, syns };
    }).filter(x => x.def);
    if (senses.length) entries.push({ senses });
  }
  return entries;
}

// （移除 Microsoft 代理相關函式）

// ---------- CEDICT 兜底 ----------
let cedictLite = null; // { en: [zh1, zh2, ...] }
async function ensureCedictLite() {
  if (cedictLite) return cedictLite;
  try {
    // 使用絕對路徑，避免在其他應用頁面載入時相對路徑錯誤（依平台規範）
    const r = await fetch('/shiwen-baojian/js/data/cedict-mini.json');
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

  // 展平成單一義項清單（移除「義項 1」等標題）
  const allSenses = parsed.flatMap(e => e.senses || []);
  const defsHtml = allSenses.map(s => `<li class="mb-1 leading-6">${escapeHtml(s.def)}</li>`).join('');

  // 彙總近義詞（依據詞游記做法拆分、去重）
  const allSyns = [...new Set(allSenses.flatMap(s => s.syns || []).filter(Boolean))];
  const synHtml = allSyns.length
    ? `<div class="mt-2">
         <div class="text-xs text-stone-500 mb-1">近義：</div>
         <div class="flex flex-wrap gap-1">
           ${allSyns.map(w => `
             <button type="button" class="syn-tag inline-flex items-center px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs border border-stone-200" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>
           `).join('')}
         </div>
       </div>`
    : '';

  const enHtml = enList.length ? `<div class="mt-3 text-sm"><span class="text-stone-600">英文：</span>${escapeHtml(enList.join(', '))}</div>` : '';

  return `<div class="p-4">
    <div class="text-lg font-bold text-stone-800 mb-2">${escapeHtml(word)}</div>
    ${defsHtml ? `<ul class="list-disc pl-5">${defsHtml}</ul>${synHtml}` : '<div class="text-sm text-stone-500">（未找到詳細釋義）</div>'}
    ${enHtml}
  </div>`;
}

function renderCedictEn(word, items) {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="p-4 text-sm text-stone-500">無結果（CEDICT）</div>`;
  }
  const rows = items.slice(0, 12).map(e => {
    const senses = (e.senses || []).slice(0, 4).map(s => `<li class="mb-0.5">${escapeHtml(s)}</li>`).join('');
    const pinyin = e.pinyin ? `<span class="ml-2 text-xs text-stone-600">${escapeHtml(e.pinyin)}</span>` : '';
    return `<div class="py-2 border-b border-stone-100">
      <div class="text-stone-900 font-medium">${escapeHtml(e.hanzi)}${pinyin}</div>
      ${senses ? `<ul class="list-disc pl-5 text-sm text-stone-700 mt-1">${senses}</ul>` : ''}
    </div>`;
  }).join('');
  return `<div class="p-2">
    <div class="px-2 py-1 text-sm text-stone-600">查詢：<span class="font-medium">${escapeHtml(word)}</span></div>
    <div class="divide-y">${rows}</div>
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
      // 英→中：CEDICT 分片
      const items = await cedictLookupEnToZh(q);
      if (items && items.length) {
        const ranked = rankCedictResults(q, items);
        const html = renderCedictEn(q, ranked);
        cache.set(key, html);
        return html;
      }
      // 分片缺失或查無 → 使用迷你兜底
      const pairs = await cedictFallback(q);
      const html = renderCedictFallback(q, pairs);
      cache.set(key, html);
      return html;
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

  // 近義詞標籤點擊：填入查詢框並觸發查詢
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('.syn-tag');
    if (tag) {
      e.preventDefault();
      const w = tag.getAttribute('data-word') || '';
      const input = document.getElementById('dict-query');
      if (input) {
        input.value = w;
        // 若啟用自動語言偵測，runQuery 會自動將 zh→en
        // 若未啟用，沿用當前方向（通常為中→英）
        runQuery();
      }
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

  // 移除「例句」按鈕邏輯（EN→ZH 改用 CEDICT，暫無例句 API）

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

// ---------- 排序強化（通用）：優先一般義項，降權專名/地名/人名/百科化長敘 ----------
function rankCedictResults(query, items) {
  const q = String(query || '').toLowerCase().trim();

  // 去重（以漢字+拼音）
  const seen = new Set();
  const unique = [];
  for (const e of items) {
    const key = `${e.hanzi}#${e.pinyin||''}`;
    if (!seen.has(key)) { seen.add(key); unique.push(e); }
  }

  const properLowerHints = [
    'surname','given name','personal name','courtesy name','pen name','name of a person',
    'place name','county','city','province','prefecture','township','district','village',
    'river','lake','mountain','island','strait','bay','sea','ocean','gulf','cape','peninsula',
    'king','queen','duke','earl','baron','lord','emperor','empress','dynasty','kingdom','republic',
    'god','goddess','saint','bishop','minister','president','prime minister','actor','actress','poet','explorer'
  ];

  const negativeMeta = ['abbr.', 'variant of', 'also written'];

  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  function scoreEntry(e) {
    let s = 0;
    const hanzi = String(e.hanzi||'');
    const sensesArr = Array.isArray(e.senses) ? e.senses : [];
    const sensesLower = sensesArr.map(x=>String(x).toLowerCase());
    const sensesJoined = sensesArr.join(' \u0000 ');
    const sensesLowerJoined = sensesLower.join(' \u0000 ');

    // 1) 與查詢的語義相關度（整詞匹配）
    if (q) {
      const wb = new RegExp(`\\b${escapeRegExp(q)}\\b`);
      if (wb.test(sensesLowerJoined)) s += 12;
    }

    // 2) 語言與一般概念加權（不針對特定詞）
    if (/\blanguage\b|\bdialect\b|\bscript\b|\bwriting\b/.test(sensesLowerJoined)) s += 18;

    // 3) 降權：專名/地名/頭銜 等常見指示詞
    for (const kw of properLowerHints) { if (sensesLowerJoined.includes(kw)) { s -= 24; break; } }

    // 4) 降權：元資訊或旁註
    for (const m of negativeMeta) { if (sensesLowerJoined.includes(m)) s -= 6; }
    if (sensesLowerJoined.includes('cl:')) s -= 4; // 量詞標記，非負但降低排序

    // 5) 降權：英文義項中連續多個首字母大寫詞（常為專名）
    if (/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,})/.test(sensesJoined)) s -= 16;

    // 6) 以詞形外觀判斷：含間隔點/非常長的中文詞條 → 專名傾向
    if (hanzi.includes('·')) s -= 28;
    const hanziLen = hanzi.length;
    if (hanziLen <= 4) s += 5; else if (hanziLen >= 9) s -= 5;

    // 7) 定義長度啟發：短定義通常更核心，極長則可能百科化
    const firstLen = (sensesArr[0] ? String(sensesArr[0]).length : 0);
    if (firstLen > 0 && firstLen < 40) s += 6; else if (firstLen > 140) s -= 8;

    return s;
  }

  return unique
    .map(e => ({ e, s: scoreEntry(e) }))
    .sort((a,b) => b.s - a.s)
    .map(x => x.e)
    .slice(0, 50); // 供渲染層再取前 12
}
