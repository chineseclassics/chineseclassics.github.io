// K3 詞庫載入器（瀏覽器純前端）
// 功能：
// - 拉取靜態 JSON 詞庫並建構記憶體索引（Map）
// - 提供以拼音（數字調/去調）或字詞查詢的 API
// - 符合 MVP：無需 IndexedDB；若未來擴容可替換實作保持同介面

(function (global) {
  'use strict';

  // 簡易去調映射（用於 tone-insensitive 查詢）
  const DIACRITIC_MAP = {
    'ā':'a','á':'a','ǎ':'a','à':'a',
    'ē':'e','é':'e','ě':'e','è':'e',
    'ī':'i','í':'i','ǐ':'i','ì':'i',
    'ō':'o','ó':'o','ǒ':'o','ò':'o',
    'ū':'u','ú':'u','ǔ':'u','ù':'u',
    'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v'
  };

  function stripTone(marked) {
    return marked
      .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, (m) => DIACRITIC_MAP[m] || m)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeToKey(pinyinMarkedOrNumber) {
    // 接受帶調（"gē ge"）或數字調（"ge1 ge5"），輸出去調空格版鍵（"ge ge"）
    const s = String(pinyinMarkedOrNumber || '')
      .toLowerCase()
      .replace(/\d/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return stripTone(s);
  }

  class K3Db {
    constructor(json) {
      this.meta = json.meta || {};
      this.characters = json.characters || [];
      this.words = json.words || [];

      // 主索引
      this.wordByKey = new Map(); // key: normalized pinyin -> Set(word)
      this.charByKey = new Map(); // key: normalized pinyin -> Set(char)
      this.wordByText = new Map(); // text -> payload
      this.charByText = new Map(); // char -> payload

      this._buildIndexes();
    }

    _buildIndexes() {
      for (const c of this.characters) {
        this.charByText.set(c.char, c);
        // 支援多讀音
        const cand = new Set();
        for (const m of (c.pinyinMarked || [])) cand.add(normalizeToKey(m));
        for (const n of (c.pinyinNumber || [])) cand.add(normalizeToKey(n));
        for (const key of cand) {
          if (!this.charByKey.has(key)) this.charByKey.set(key, new Set());
          this.charByKey.get(key).add(c.char);
        }
      }

      for (const w of this.words) {
        this.wordByText.set(w.word, w);
        const cand = new Set([
          normalizeToKey(w.pinyinMarked),
          normalizeToKey(w.pinyinNumber)
        ]);
        for (const key of cand) {
          if (!this.wordByKey.has(key)) this.wordByKey.set(key, new Set());
          this.wordByKey.get(key).add(w.word);
        }
      }
    }

    // API：按拼音查詞（忽略聲調）
    searchWordsByPinyin(pinyin) {
      const key = normalizeToKey(pinyin);
      const set = this.wordByKey.get(key);
      if (!set) return [];
      return Array.from(set).map((t) => this.wordByText.get(t));
    }

    // API：按拼音查字（忽略聲調）
    searchCharsByPinyin(pinyin) {
      const key = normalizeToKey(pinyin);
      const set = this.charByKey.get(key);
      if (!set) return [];
      return Array.from(set).map((t) => this.charByText.get(t));
    }

    // API：直查文本
    getWord(text) { return this.wordByText.get(text) || null; }
    getChar(ch) { return this.charByText.get(ch) || null; }
  }

  async function loadK3Db(url = '/pinyin-pinpinle/data/k3-pinyin-db.json') {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('載入 K3 詞庫失敗: ' + res.status);
    const json = await res.json();
    return new K3Db(json);
  }

  // 導出到全域（簡化整合）
  global.K3DbLoader = { loadK3Db, normalizeToKey };

})(window);
