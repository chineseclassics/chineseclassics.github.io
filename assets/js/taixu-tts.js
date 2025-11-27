/*
 * 太虛幻境：在線 TTS 封裝（Azure 代理 + 瀏覽器語音回退）
 * 使用方式：
 *   1) 在 HTML 中以絕對路徑引入：
 *      <script src="/assets/js/taixu-config.js"></script>
 *      <script src="/assets/js/taixu-tts.js"></script>
 *   2) 呼叫：
 *      await window.taixuSpeak('請找到 bo')  // 等待播放完成
 *      window.taixuStopSpeak()  // 停止播放
 *
 * 說明：
 *   - 優先呼叫 Supabase Edge Function（需在 taixu-config.js 設定 TAIXU_TTS_ENDPOINT 與 SUPABASE_ANON_KEY）
 *   - 失敗時回退到瀏覽器內建 SpeechSynthesis（盡量選普通話，排除粵語）
 *   - 以最小依賴支援多個應用重用
 */
(function () {
  // 在線音訊快取：以 text+voice 為鍵，快取 Blob 以減少重複請求
  const ttsCache = new Map(); // key: `${voice}::${text}` -> Blob
  
  // 當前正在播放的音頻元素（用於停止播放）
  let currentAudio = null;

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

  // 建立並播放一段音訊 Blob，等待播放完成後返回
  function playBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        resolve(true);
      }, { once: true });
      
      audio.addEventListener('error', (e) => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        reject(e);
      }, { once: true });
      
      audio.play().catch((e) => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        reject(e);
      });
    });
  }
  
  // 停止當前播放
  function taixuStopSpeak() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    // 同時停止瀏覽器語音（如果有）
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // 生成緩存鍵
  function getCacheKey(text, voice, rateParam) {
    return `${voice}::${rateParam}::${text}`;
  }
  
  // 獲取 rate 參數
  function getRateParam(rate) {
    if (rate != null && rate !== 1) {
      const percent = Math.round((rate - 1) * 100);
      return percent >= 0 ? `+${percent}%` : `${percent}%`;
    }
    return '';
  }
  
  // 帶超時的 fetch（防止 Edge Function 冷啟動導致無限等待）
  async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('TTS 請求超時（Edge Function 可能正在冷啟動，請重試）');
      }
      throw e;
    }
  }
  
  // 預加載音頻（只請求並緩存，不播放）
  async function taixuPreload(text, opts = {}) {
    const endpoint = (window.TAIXU_TTS_ENDPOINT || '').trim();
    const anon = (window.SUPABASE_ANON_KEY || '').trim();
    const voice = (opts.voice || 'zh-CN-XiaoxiaoNeural').trim();
    const rateParam = getRateParam(opts.rate);
    
    if (!endpoint) return false;
    
    const cacheKey = getCacheKey(text, voice, rateParam);
    
    // 已緩存則跳過
    if (ttsCache.has(cacheKey)) return true;
    
    try {
      const headers = {};
      if (anon) {
        headers['apikey'] = anon;
        headers['Authorization'] = `Bearer ${anon}`;
      }
      let url = `${endpoint}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
      if (rateParam) {
        url += `&rate=${encodeURIComponent(rateParam)}`;
      }
      // 使用帶超時的 fetch（預加載可以更長時間，20秒）
      const resp = await fetchWithTimeout(url, { method: 'GET', headers }, 20000);
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      ttsCache.set(cacheKey, blob);
      return true;
    } catch (e) {
      console.warn('TTS 預加載失敗:', e);
      return false;
    }
  }

  // 對外主函式：優先在線 TTS，失敗回退瀏覽器語音
  async function taixuSpeak(text, opts = {}) {
    // 先停止之前的播放
    taixuStopSpeak();
    
    const endpoint = (window.TAIXU_TTS_ENDPOINT || '').trim();
    const anon = (window.SUPABASE_ANON_KEY || '').trim();
    const voice = (opts.voice || 'zh-CN-XiaoxiaoNeural').trim();
    const rateParam = getRateParam(opts.rate);

    // 1) 在線 TTS（若有設定端點）
    if (endpoint) {
      try {
        const cacheKey = getCacheKey(text, voice, rateParam);
        let blob = ttsCache.get(cacheKey);
        if (!blob) {
          const headers = {};
          if (anon) {
            headers['apikey'] = anon;
            headers['Authorization'] = `Bearer ${anon}`;
          }
          let url = `${endpoint}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
          if (rateParam) {
            url += `&rate=${encodeURIComponent(rateParam)}`;
          }
          // 使用帶超時的 fetch（15秒，超時後回退到瀏覽器語音）
          const resp = await fetchWithTimeout(url, { method: 'GET', headers }, 15000);
          if (!resp.ok) throw new Error(`TTS ${resp.status}`);
          blob = await resp.blob();
          ttsCache.set(cacheKey, blob);
        }
        await playBlob(blob);
        return true;
      } catch (e) {
        console.warn('Azure TTS 失敗，回退到瀏覽器語音:', e.message);
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
      
      // 等待播放完成
      return new Promise((resolve) => {
        utter.onend = () => resolve(true);
        utter.onerror = () => resolve(false);
        synth.speak(utter);
      });
    } catch (e) {
      console.warn('taixuSpeak fallback failed:', e);
      return false;
    }
  }

  // 清除 TTS 緩存（用於更新發音修正後清除舊緩存）
  function taixuClearCache() {
    ttsCache.clear();
    console.log('TTS 緩存已清除');
  }

  // ========== Edge Function 預熱機制 ==========
  // 在頁面加載時發送輕量請求喚醒 Edge Function，避免冷啟動延遲
  let isWarmedUp = false;
  
  async function warmUpEdgeFunction() {
    const endpoint = (window.TAIXU_TTS_ENDPOINT || '').trim();
    if (!endpoint || isWarmedUp) return;
    
    const anon = (window.SUPABASE_ANON_KEY || '').trim();
    
    try {
      const headers = {};
      if (anon) {
        headers['apikey'] = anon;
        headers['Authorization'] = `Bearer ${anon}`;
      }
      // 發送最小請求（單個字）來喚醒函數
      const url = `${endpoint}?text=${encodeURIComponent('。')}&voice=zh-CN-XiaoxiaoNeural`;
      const resp = await fetch(url, { method: 'GET', headers });
      if (resp.ok) {
        isWarmedUp = true;
        console.log('TTS Edge Function 已預熱');
      }
    } catch (e) {
      console.warn('TTS 預熱失敗（將在首次使用時重試）:', e.message);
    }
  }
  
  // 頁面加載後自動預熱（延遲 1 秒，不影響頁面渲染）
  if (typeof window !== 'undefined') {
    if (document.readyState === 'complete') {
      setTimeout(warmUpEdgeFunction, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(warmUpEdgeFunction, 1000);
      });
    }
  }

  // 對外暴露到全域（不覆蓋既有定義）
  if (!window.taixuSpeak) {
    window.taixuSpeak = taixuSpeak;
  }
  if (!window.taixuStopSpeak) {
    window.taixuStopSpeak = taixuStopSpeak;
  }
  if (!window.taixuClearCache) {
    window.taixuClearCache = taixuClearCache;
  }
  if (!window.taixuPreload) {
    window.taixuPreload = taixuPreload;
  }
  if (!window.taixuWarmUp) {
    window.taixuWarmUp = warmUpEdgeFunction;
  }
})();
