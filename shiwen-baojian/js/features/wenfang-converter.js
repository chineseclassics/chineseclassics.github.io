/**
 * 文房之寶 - 繁簡轉換模組（單一輸入/輸出）
 * - 採單一 textarea，轉換後覆寫內容
 * - 首次使用時懶載入本地 vendor：/shiwen-baojian/assets/vendor/opencc/
 * - 提供『還原原文』與『複製全文』
 * - 若未安裝完整 OpenCC，使用 shim.js 進行輕量降級轉換（僅少數常見字，供開發測試）
 * 註釋採繁體中文
 */

// ---------- 狀態 ----------
let originalBackup = null; // 第一次轉換前的原文備份
let openccReady = false;
let openccLoading = false;

function $(id) { return document.getElementById(id); }

function setStatus(msg) {
  const el = $('converter-status'); if (el) el.textContent = msg || '';
}

function openModal() {
  const modal = $('converter-modal'); if (!modal) return;
  modal.classList.remove('hidden');
  const ta = $('converter-textarea'); if (ta) ta.focus();
  setStatus('');
}

function closeModal() {
  const modal = $('converter-modal'); if (!modal) return;
  modal.classList.add('hidden');
}

// ---------- Vendor 載入 ----------
/**
 * 優先載入完整 OpenCC（若提供），否則退回 shim.js。
 * 要求 vendor 暴露全域：window.opencc = { toSimplified(text), toTraditional(text) }
 */
async function ensureOpenCC() {
  if (openccReady) return true;
  if (openccLoading) { await waitFor(() => openccReady, 8000); return openccReady; }
  openccLoading = true;
  setStatus('載入轉換引擎中…');

  // 嘗試載入完整版（若已安裝，可將檔名調整為實際文件名）
  const candidates = [
    '/shiwen-baojian/assets/vendor/opencc/opencc.min.js',
    '/shiwen-baojian/assets/vendor/opencc/index.js',
    '/shiwen-baojian/assets/vendor/opencc/shim.js' // 最後嘗試 shim
  ];
  for (const src of candidates) {
    try {
      // 已載入則跳過
      if (window.opencc && typeof window.opencc.toSimplified === 'function') { openccReady = true; break; }
      // 以動態 script 方式載入（UMD/全域）
      // 使用絕對路徑（遵循平台規範）
      // eslint-disable-next-line no-await-in-loop
      await loadScript(src);
      if (window.opencc && typeof window.opencc.toSimplified === 'function') { openccReady = true; break; }
    } catch (_) { /* 繼續嘗試下一個候選 */ }
  }

  openccLoading = false;
  setStatus(openccReady ? '' : 'OpenCC 資源未安裝，無法進行完整轉換。');
  return openccReady;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.async = true; el.crossOrigin = 'anonymous';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(el);
  });
}

function waitFor(cond, timeout = 5000, interval = 50) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (cond()) return resolve(true);
      if (Date.now() - t0 > timeout) return resolve(false);
      setTimeout(tick, interval);
    };
    tick();
  });
}

// ---------- 轉換操作 ----------
function backupIfFirst() {
  const ta = $('converter-textarea'); if (!ta) return;
  if (originalBackup === null) originalBackup = ta.value;
}

async function handleConvert(direction) {
  const ta = $('converter-textarea'); if (!ta) return;
  const text = String(ta.value || '');
  if (!text.trim()) { setStatus('請貼上要轉換的文字'); return; }

  backupIfFirst();

  // 載入 OpenCC（完整或 shim）
  const ok = await ensureOpenCC();
  if (!ok) {
    // 若仍無法使用，保持原樣並提示
    setStatus('無法載入轉換引擎，請安裝本地 vendor 或稍後重試。');
    window.toast && window.toast.warning && window.toast.warning('OpenCC 未安裝：目前使用受限。請參見 vendor 說明。');
    return;
  }

  try {
    disableButtons(true);
    const fn = direction === 's2t' ? window.opencc.toTraditional : window.opencc.toSimplified;
    // 注意：這裡 direction===s2t 表示「簡→繁」或「轉為繁體」？
    // UI 標示：to-traditional-btn = 轉為繁體 ⇒ 應使用 toTraditional（簡→繁）
    //         to-simplified-btn  = 轉為簡體 ⇒ 應使用 toSimplified（繁→簡）
    const output = typeof fn === 'function' ? fn(text) : text;
    ta.value = output;
    setStatus('轉換完成');
  } catch (e) {
    console.error('轉換錯誤', e);
    setStatus('轉換失敗');
    window.toast && window.toast.error && window.toast.error('轉換失敗，請重試。');
  } finally {
    disableButtons(false);
  }
}

function disableButtons(disabled) {
  ['to-simplified-btn', 'to-traditional-btn', 'copy-text-btn', 'restore-original-btn']
    .forEach(id => { const el = $(id); if (el) el.disabled = !!disabled; });
}

function handleCopy() {
  const ta = $('converter-textarea'); if (!ta) return;
  const txt = String(ta.value || '');
  if (!txt) { setStatus('無可複製內容'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt)
      .then(() => { setStatus('已複製'); window.toast && window.toast.success && window.toast.success('已複製到剪貼簿'); })
      .catch(() => { setStatus('複製失敗（請手動選取複製）'); });
  } else {
    try {
      ta.select(); document.execCommand('copy');
      setStatus('已複製');
    } catch (_) {
      setStatus('複製失敗（請手動選取複製）');
    }
  }
}

function handleRestore() {
  const ta = $('converter-textarea'); if (!ta) return;
  if (originalBackup === null) { setStatus('尚無原文備份'); return; }
  ta.value = originalBackup;
  setStatus('已還原原文');
}

// ---------- 綁定事件（單次） ----------
function bindOnce() {
  if (window.__converterBound) return; window.__converterBound = true;

  // 開啟/關閉
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('#open-converter-tool-btn');
    if (openBtn) { e.preventDefault(); openModal(); }
    const closer = e.target.closest('[data-modal-close="true"]');
    const modal = $('converter-modal');
    if (closer && modal && !modal.classList.contains('hidden')) { e.preventDefault(); closeModal(); }
  });

  // 轉換按鈕
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'to-simplified-btn') {
      e.preventDefault(); handleConvert('t2s'); // 轉為簡體：繁→簡
    }
    if (e.target && e.target.id === 'to-traditional-btn') {
      e.preventDefault(); handleConvert('s2t'); // 轉為繁體：簡→繁
    }
  });

  // 複製 / 還原
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'copy-text-btn') { e.preventDefault(); handleCopy(); }
    if (e.target && e.target.id === 'restore-original-btn') { e.preventDefault(); handleRestore(); }
  });

  // ESC 關閉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = $('converter-modal');
      if (modal && !modal.classList.contains('hidden')) closeModal();
    }
  });

  console.log('🈶️ 文房之寶：繁簡轉換已就緒');
}

(function init() {
  try { bindOnce(); } catch (e) { console.error('繁簡轉換模組初始化錯誤', e); }
})();
