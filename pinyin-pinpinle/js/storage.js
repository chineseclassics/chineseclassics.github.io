// 本地儲存層：custom packs 讀寫、示例包灌入、教師模式狀態（繁體中文註釋）
(function (global) {
  'use strict';

  const LS_KEY = 'pp_custom_packs_v1';
  const LS_TEACHER = 'pp_teacher_mode_v1';

  function loadPacks() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
      return data.custom_packs || [];
    } catch (e) {
      console.warn('讀取本地包失敗', e);
      return [];
    }
  }

  function savePacks(packs) {
    const obj = { custom_packs: packs || [] };
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  }

  function ensureSamplePacks() {
    const packs = loadPacks();
    if (packs.length > 0) return packs;
    const sample = {
      pack_id: crypto.randomUUID(),
      pack_name: '交通工具',
      type: 'unit',
      scope: { shengmu: [], yunmu: [], zhengti: [] },
      characters: [
        { id: crypto.randomUUID(), char: '汽', pinyinMarked: 'qì', pinyinNumber: 'qi4', source: 'builtin' },
        { id: crypto.randomUUID(), char: '車', pinyinMarked: 'chē', pinyinNumber: 'che1', source: 'builtin' },
        { id: crypto.randomUUID(), char: '巴', pinyinMarked: 'bā', pinyinNumber: 'ba1', source: 'builtin' },
        { id: crypto.randomUUID(), char: '士', pinyinMarked: 'shì', pinyinNumber: 'shi4', source: 'builtin' }
      ],
      words: [
        { id: crypto.randomUUID(), word: '汽車', pinyinMarked: 'qì chē', pinyinNumber: 'qi4 che1', baseChars: ['汽','車'], source: 'builtin' },
        { id: crypto.randomUUID(), word: '火車', pinyinMarked: 'huǒ chē', pinyinNumber: 'huo3 che1', baseChars: ['火','車'], source: 'builtin' },
        { id: crypto.randomUUID(), word: '巴士', pinyinMarked: 'bā shì', pinyinNumber: 'ba1 shi4', baseChars: ['巴','士'], source: 'builtin' }
      ]
    };
    // 推導 scope
    sample.scope = inferScope(sample);
    const all = [sample];
    savePacks(all);
    return all;
  }

  function setTeacherMode(enabled) {
    localStorage.setItem(LS_TEACHER, enabled ? '1' : '0');
  }
  function isTeacherMode() {
    return localStorage.getItem(LS_TEACHER) === '1';
  }

  // 簡易拼音解析與 scope 推導
  const SHENGMU_LIST = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];

  function normalizeMarkedToPlain(marked) {
    // 將帶調轉為去調小寫並以空格分隔
    return K3DbLoader.normalizeToKey(marked);
  }

  function splitSyllable(syl) {
    // 以最長匹配取得聲母；其餘為韻母；若無則視為零聲母
    for (const sm of SHENGMU_LIST) {
      if (syl.startsWith(sm)) return { sm, ym: syl.slice(sm.length) || '' };
    }
    return { sm: '∅', ym: syl };
  }

  function inferScope(pack) {
    const sh = new Set();
    const ym = new Set();
    const zt = new Set();
    const items = [];
    (pack.characters||[]).forEach(c => items.push(c.pinyinMarked));
    (pack.words||[]).forEach(w => (w.pinyinMarked||'').split(/\s+/).forEach(x => items.push(x)));
    for (const it of items) {
      const norm = normalizeMarkedToPlain(it);
      norm.split(/\s+/).forEach((sy) => {
        const { sm, ym: y } = splitSyllable(sy);
        if (sm) sh.add(sm);
        if (y) ym.add(y);
      });
    }
    return { shengmu: Array.from(sh), yunmu: Array.from(ym), zhengti: Array.from(zt) };
  }

  function exportPacks(packs) {
    const data = { schemaVersion: 1, exportedAt: new Date().toISOString(), custom_packs: packs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pinyin-pinpinle-packs.json';
    a.click(); URL.revokeObjectURL(url);
  }

  async function importPacksFromFile(file) {
    const text = await file.text();
    const obj = JSON.parse(text);
    const packs = Array.isArray(obj) ? obj : (obj.custom_packs || []);
    // 重新推導缺失的 scope
    packs.forEach(p => { p.scope = inferScope(p); });
    savePacks(packs);
    return packs;
  }

  global.PPStorage = {
    loadPacks, savePacks, ensureSamplePacks,
    isTeacherMode, setTeacherMode,
    inferScope, exportPacks, importPacksFromFile
  };
})(window);
