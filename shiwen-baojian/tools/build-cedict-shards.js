#!/usr/bin/env node
/**
 * CEDICT 分片生成腳本（離線執行）
 *
 * 輸入（優先序）：
 *   1) CLI 參數：node build-cedict-shards.js <input_path> [out_dir]
 *   2) 預設尋址：
 *      - ./data/cedict_ts.u8（相對於 tools/）
 *      - ../js/data/cedict_ts.u8（相對於 tools/）
 * 輸出：
 *   - ../js/data/cedict-en/en_{letter}.json （英→中倒排索引分片）或指定 out_dir
 *
 * 說明：
 * - 解析每行格式：漢字[空格]漢字[空格][pinyin] /def1/def2/.../
 * - 將英文義項斷詞為 key（小寫），映射到 { hanzi, pinyin, senses }
 * - 以英文字首分片（a~z，其他統一到 other）
 * - 基本去重與輕量化：同一 key 下相同 hanzi+pinyin 合併 senses
 * - 可調整 STOPWORDS 以控制索引大小
 *
 * 注意：
 * - CEDICT 授權 CC BY-SA；請保留來源與授權聲明於專案文檔
 *
 * 實作細節：
 * - 採用 CommonJS（require）以避免在根 package.json 未設置 type:module 時的 ESM 相容問題
 */

const fs = require('node:fs');
const path = require('node:path');

const SELF_DIR = __dirname;
const ROOT = path.resolve(SELF_DIR, '..');
const DEFAULT_OUT_DIR = path.join(ROOT, 'js/data/cedict-en');

// 解析 CLI 參數
const argvInput = process.argv[2];
const argvOut = process.argv[3];

// 嘗試多個預設輸入路徑
const candidateInputs = [
  argvInput,
  path.resolve(SELF_DIR, './data/cedict_ts.u8'),
  path.resolve(SELF_DIR, '../js/data/cedict_ts.u8'),
].filter(Boolean);

let INPUT = null;
for (const p of candidateInputs) {
  if (fs.existsSync(p)) { INPUT = p; break; }
}

const OUT_DIR = argvOut ? path.resolve(SELF_DIR, argvOut) : DEFAULT_OUT_DIR;

const STOPWORDS = new Set([
  'a','an','the','of','and','to','in','on','for','with','by','at','as','from','or','that','this','these','those',
  'is','are','be','being','been','was','were','do','does','did','done','have','has','had','having','not','no','nor',
  'into','over','under','up','down','out','off','about','around','across','through','than','then','there','here'
]);

function bucketOf(word){
  const c = (word||'').charAt(0);
  return c >= 'a' && c <= 'z' ? c : 'other';
}

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

console.log('🔧 生成 CEDICT 倒排分片 ...');

if (!INPUT) {
  console.error('❌ 找不到輸入檔，請提供 cedict_ts.u8 路徑。可用法：');
  console.error('   node build-cedict-shards.js <input_path> [out_dir]');
  console.error('   或將檔案放在 tools/data/cedict_ts.u8 或 js/data/cedict_ts.u8');
  process.exit(1);
}

ensureDir(OUT_DIR);

/** @type {Record<string, Record<string, { hanzi: string, pinyin?: string, senses?: string[] }[]>>} */
const buckets = {}; // letter => { word => entries[] }

/**
 * 行解析：返回 { trad, simp, pinyin, senses[] }
 */
function parseLine(line){
  // 跳過註釋
  if (!line || line.startsWith('#')) return null;
  // 例：漢字 漢字 [pin1 yin1] /def1/def2/
  const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/);
  if (!m) return null;
  const trad = m[1];
  const pinyin = m[3];
  const senses = m[4].split('/').map(s=>s.trim()).filter(Boolean);
  return { hanzi: trad, pinyin, senses };
}

/**
 * 自義項產生英文 key（極簡 tokenizer）
 */
function englishKeys(sense){
  const words = sense
    .toLowerCase()
    .replace(/\([^\)]*\)/g,' ')  // 去括號內容
    .replace(/[^a-z\s-]/g,' ')     // 僅保留字母與連字號
    .split(/[\s]+/)
    .filter(w => w && w.length>1 && !STOPWORDS.has(w));
  return new Set(words);
}

const text = fs.readFileSync(INPUT, 'utf8');
const lines = text.split(/\r?\n/);

let count = 0;
for (const line of lines) {
  const rec = parseLine(line);
  if (!rec) continue;
  const baseEntry = { hanzi: rec.hanzi, pinyin: rec.pinyin, senses: rec.senses.slice(0, 6) };

  // 聚合英文鍵
  const keys = new Set();
  for (const s of rec.senses) {
    for (const k of englishKeys(s)) keys.add(k);
  }
  for (const k of keys) {
    const b = bucketOf(k);
    if (!buckets[b]) buckets[b] = {};
    const bag = buckets[b];
    if (!bag[k]) bag[k] = [];
    // 去重：同 hanzi+pinyin 合併定義
    const existed = bag[k].find(e => e.hanzi === baseEntry.hanzi && e.pinyin === baseEntry.pinyin);
    if (existed) {
      const merged = new Set([...(existed.senses||[]), ...(baseEntry.senses||[])]);
      existed.senses = Array.from(merged).slice(0,8);
    } else {
      bag[k].push(baseEntry);
    }
  }
  count++;
}

console.log('📦 條目數：', count);

for (const [letter, bag] of Object.entries(buckets)) {
  const outPath = path.join(OUT_DIR, `en_${letter}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bag));
  const sizeKB = (fs.statSync(outPath).size/1024).toFixed(1);
  console.log(`✅ 輸出 ${path.basename(outPath)} (${sizeKB} KB)`);
}

console.log('🎉 完成：請將輸出檔推送至靜態站點供前端動態載入');
