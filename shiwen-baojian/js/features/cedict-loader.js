/**
 * CEDICT 分片載入器（EN→ZH）
 * 目標：在不影響性能的前提下提供「完整版」英→中查詢能力
 * 設計：
 * - 以英文字首分片（a…z，other）儲存倒排索引：en_{letter}.json
 * - 每片結構：{ [english_word: string]: Array<{ hanzi: string, pinyin?: string, senses?: string[] }> }
 * - 僅在查詢時動態抓取對應分片，並以記憶體快取避免重複請求
 * - 若分片不存在或未上傳，會回傳空陣列；前端可再作其他兜底
 *
 * 注意：
 * - 分片資料需先透過 tools/build-cedict-shards.js 生成並上傳到
 *   /shiwen-baojian/js/data/cedict-en/en_{letter}.json
 * - 本載入器只負責載入與查詢，不包含生成流程
 */

const CEDICT_EN_BASE = '/shiwen-baojian/js/data/cedict-en';

// 內存快取：分片與查詢結果
const shardCache = new Map(); // key: letter|other => object
const resultCache = new Map(); // key: en_word(lower) => array

function letterBucket(word) {
  const ch = (word || '').trim().toLowerCase().charAt(0);
  return ch >= 'a' && ch <= 'z' ? ch : 'other';
}

async function loadShard(letter) {
  if (shardCache.has(letter)) return shardCache.get(letter);
  const url = `${CEDICT_EN_BASE}/en_${letter}.json`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    shardCache.set(letter, json || {});
    return json || {};
  } catch (_) {
    // 分片缺失：記空以避免重複請求
    const empty = {};
    shardCache.set(letter, empty);
    return empty;
  }
}

function normalizeEn(q) {
  return String(q || '').toLowerCase().trim();
}

/**
 * 以 CEDICT 倒排索引查詢英→中
 * @param {string} word 英文單詞（小寫或混合大小寫皆可）
 * @returns {Promise<Array<{ hanzi: string, pinyin?: string, senses?: string[] }>>}
 */
export async function cedictLookupEnToZh(word) {
  const key = normalizeEn(word);
  if (!key) return [];
  if (resultCache.has(key)) return resultCache.get(key);

  const bucket = letterBucket(key);
  const shard = await loadShard(bucket);
  let items = shard[key] || [];

  // 簡單詞形回退：去除尾部的標點、複數、動詞 -ing/-ed（只在主鍵缺失時嘗試）
  if (!items.length) {
    const variants = new Set();
    const base = key.replace(/[^a-z]+$/g, '');
    if (base && base !== key) variants.add(base);
    if (key.endsWith('ing') && key.length > 4) variants.add(key.slice(0, -3));
    if (key.endsWith('ed') && key.length > 3) variants.add(key.slice(0, -2));
    if (key.endsWith('es') && key.length > 3) variants.add(key.slice(0, -2));
    if (key.endsWith('s') && key.length > 2) variants.add(key.slice(0, -1));

    for (const v of variants) {
      const vBucket = letterBucket(v);
      const vShard = vBucket === bucket ? shard : await loadShard(vBucket);
      if (vShard[v] && vShard[v].length) { items = vShard[v]; break; }
    }
  }

  // 保證為陣列
  const result = Array.isArray(items) ? items : [];
  resultCache.set(key, result);
  return result;
}

/**
 * 批量預載一組英文字首分片（可用於課前預熱）
 * @param {string[]} letters 例如 ['a','b','c']
 */
export async function prefetchCedictEnShards(letters = []) {
  await Promise.all(
    letters.map((l) => loadShard((String(l||'').toLowerCase().match(/^[a-z]$/) ? l : 'other')))
  );
}

export function _clearCedictCaches() {
  shardCache.clear();
  resultCache.clear();
}

console.log('📚 CEDICT 分片載入器已就緒（EN→ZH）');
