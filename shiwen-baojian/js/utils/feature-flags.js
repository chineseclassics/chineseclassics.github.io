/**
 * 功能開關（Feature Flags）
 * - 以 URL 參數 ?tiptap=1 或 localStorage.tiptap_enabled === '1' 控制
 */

export function isTiptapEnabled() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tiptap') === '1') return true;
    if (window.localStorage && localStorage.getItem('tiptap_enabled') === '1') return true;
  } catch (_) {}
  return false;
}

export function enableTiptapFlag() {
  try { localStorage.setItem('tiptap_enabled', '1'); } catch (_) {}
}

export function disableTiptapFlag() {
  try { localStorage.removeItem('tiptap_enabled'); } catch (_) {}
}


