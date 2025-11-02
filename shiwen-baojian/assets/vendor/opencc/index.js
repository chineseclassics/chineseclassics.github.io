/*
 * OpenCC Adapter（opencc-js UMD 版）
 * 對接 opencc-js 的全域 OpenCC，提供 window.opencc.{toSimplified,toTraditional}
 *
 * 依賴檔：full.js（opencc-js 的 UMD 完整版）
 * 放置路徑：/shiwen-baojian/assets/vendor/opencc/full.js
 *
 * 若要使用更精簡的方向檔（cn2t.js / t2cn.js），請相應調整下方 load 路徑與 Converter 初始參數。
 * 註釋採繁體中文
 */
(function(){
  if (window.opencc && typeof window.opencc.toSimplified === 'function') return;

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src; el.async = true; el.crossOrigin = 'anonymous';
      el.onload = () => resolve();
      el.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(el);
    });
  }

  async function ensureOpenCCJS(){
    // 若全域已有 OpenCC（可能其他腳本已載入），直接返回
    if (window.OpenCC && typeof window.OpenCC.Converter === 'function') return true;
    // 嘗試載入 UMD 完整版檔案（請確保已將 opencc-js 的 dist/umd/full.js 放到此路徑）
    try {
      await loadScript('/shiwen-baojian/assets/vendor/opencc/full.js');
      return !!(window.OpenCC && typeof window.OpenCC.Converter === 'function');
    } catch (_) {
      return false;
    }
  }

  (async function init(){
    const ok = await ensureOpenCCJS();
    if (!ok) {
      // 交由上層 loader（wenfang-converter.js）回退到 shim.js
      throw new Error('OpenCC UMD (full.js) not found');
    }

  // 以 opencc-js 建立轉換器
  // 預設使用：繁（香港）↔ 簡（大陸）
  const toCN = window.OpenCC.Converter({ from: 'hk', to: 'cn' }); // 繁（港澳）→簡（大陸）
  const toTW = window.OpenCC.Converter({ from: 'cn', to: 'hk' }); // 簡（大陸）→繁（港澳）

    // 暴露統一介面
    window.opencc = {
      toSimplified(text){ return toCN(String(text||'')); },
      toTraditional(text){ return toTW(String(text||'')); }
    };

    console.log('[OpenCC] opencc-js 已載入，使用 hk↔cn 轉換。');
  })();
})();
