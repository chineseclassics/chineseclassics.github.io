/*
 * OpenCC Shim（開發測試用途）
 * 提供最小可用介面：window.opencc.toSimplified(text)、window.opencc.toTraditional(text)
 * 僅包含少量常見字替換，效果有限；請安裝完整 OpenCC 以獲得準確結果。
 *
 * 安裝完整 OpenCC 後，請在同目錄放置對應檔（例如 opencc.min.js）並實作相同 API，
 * 或在 wenfang-converter.js 的 candidates 陣列中調整實際檔名。
 */
(function(){
  if (window.opencc && typeof window.opencc.toSimplified === 'function') return;

  // 簡單字表（示意）：繁→簡
  const t2sMap = new Map([
    ['體','体'], ['國','国'], ['學','学'], ['藝','艺'], ['與','与'], ['萬','万'], ['門','门'], ['車','车'], ['書','书'], ['電','电'], ['畫','画'], ['雲','云'], ['風','风'], ['後','后'], ['發','发'], ['會','会'], ['問','问'], ['說','说'], ['語','语'], ['漢','汉'], ['龍','龙'], ['馬','马'], ['魚','鱼'], ['鳥','鸟'], ['愛','爱'], ['網','网'], ['臺','台'], ['廣','广'], ['陽','阳'], ['陰','阴'], ['裡','里'], ['裡','里'], ['裡','里']
  ]);
  // 反向：簡→繁（由 t2sMap 反轉）
  const s2tMap = new Map(Array.from(t2sMap.entries()).map(([t,s]) => [s,t]));

  function replaceByMap(text, map){
    if (!text) return text;
    let out = '';
    for (const ch of text) {
      out += map.get(ch) || ch;
    }
    return out;
  }

  window.opencc = {
    toSimplified(text){ return replaceByMap(String(text||''), t2sMap); },
    toTraditional(text){ return replaceByMap(String(text||''), s2tMap); }
  };

  console.warn('[OpenCC Shim] 正在使用精簡替換表，僅供測試；請安裝完整 OpenCC 以獲得高品質轉換。');
})();
