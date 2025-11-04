/*
 * 太虛幻境：在線 TTS 封裝（Azure 代理 + 瀏覽器語音回退）
 * 使用方式：
 *   1) 在 HTML 中以絕對路徑引入：
 *      <script src="/assets/js/taixu-config.js"></script>
 *      <script src="/assets/js/taixu-tts.js"></script>
 *   2) 呼叫：
 *      window.taixuSpeak('請找到 bo')
 *
 * 說明：
 *   - 優先呼叫 Supabase Edge Function（需在 taixu-config.js 設定 TAIXU_TTS_ENDPOINT 與 SUPABASE_ANON_KEY）
 *   - 失敗時回退到瀏覽器內建 SpeechSynthesis（盡量選普通話，排除粵語）
 *   - 以最小依賴支援多個應用重用
 */
(function () {
  // 在線音訊快取：以 text+voice 為鍵，快取 Blob 以減少重複請求
  const ttsCache = new Map(); // key: `${voice}::${text}` -> Blob

  // 挑選普通話語音（優先 zh-CN，再 zh-TW，排除 zh-HK）
  function selectMandarinVoice(voices) {
    const isZhCN = (v) => /^(zh|cmn)[-_]?(CN|Hans)/i.test(v.lang || '') || /Mandarin|普通话|PRC|Hans|Mainland/i.test(v.name || '');
    const isZhTW = (v) => /^zh[-_]?TW/i.test(v.lang || '') || /Taiwan|台灣|臺灣/i.test(v.name || '');
    const isZhHK = (v) => /^zh[-_]?HK/i.test(v.lang || '') || /Cantonese|粵|粤|Hong\s*Kong/i.test(v.name || '');
    const zhCN = voices.find(isZhCN);
    if (zhCN) return zhCN;
    const zhTW = voices.find(isZhTW);
    if (zhTW) return zhTW;
    const zhNotHK = voices.find((v) => /^zh/i.test(v.lang || '') && !isZhHK(v));
    if (zhNotHK) return zhNotHK;
    return null;
  }

  // 建立並播放一段音訊 Blob，播放完成後釋放 URL
  async function playBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const audio = new Audio(url);
      await audio.play();
      // 播放結束釋放 URL
      audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
      return true;
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }

  // 對外主函式：優先在線 TTS，失敗回退瀏覽器語音
  async function taixuSpeak(text, opts = {}) {
    const endpoint = (window.TAIXU_TTS_ENDPOINT || '').trim();
    const anon = (window.SUPABASE_ANON_KEY || '').trim();
    const voice = (opts.voice || 'zh-CN-XiaoxiaoNeural').trim();

    // 1) 在線 TTS（若有設定端點）
    if (endpoint) {
      try {
        const cacheKey = `${voice}::${text}`;
        let blob = ttsCache.get(cacheKey);
        if (!blob) {
          const headers = {};
          if (anon) {
            headers['apikey'] = anon;
            headers['Authorization'] = `Bearer ${anon}`;
          }
          const url = `${endpoint}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
          const resp = await fetch(url, { method: 'GET', headers });
          if (!resp.ok) throw new Error(`TTS ${resp.status}`);
          blob = await resp.blob();
          // 簡單快取（可選：依需求加上大小上限與淘汰策略）
          ttsCache.set(cacheKey, blob);
        }
        await playBlob(blob);
        return true;
      } catch (e) {
        // 失敗則回退到瀏覽器語音
      }
    }

    // 2) 回退：瀏覽器內建語音
    try {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices() || [];
      const selected = selectMandarinVoice(voices);
      if (selected) {
        utter.voice = selected;
      } else {
        utter.lang = 'zh-CN';
      }
      utter.pitch = opts.pitch != null ? opts.pitch : 1.3;
      utter.rate = opts.rate != null ? opts.rate : 0.8;
      synth.speak(utter);
      return true;
    } catch (e) {
      console.warn('taixuSpeak fallback failed:', e);
      return false;
    }
  }

  // 對外暴露到全域（不覆蓋既有定義）
  if (!window.taixuSpeak) {
    window.taixuSpeak = taixuSpeak;
  }
})();
