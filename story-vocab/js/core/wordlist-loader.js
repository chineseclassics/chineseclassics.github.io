/**
 * 詞表加載器
 * 負責加載和管理系統詞表的 JSON 數據
 */

// 詞表緩存
const wordlistCache = new Map();

/**
 * 加載詞表 JSON 文件
 * @param {string} wordlistCode - 詞表代碼（如 'primary_chinese_2025'）
 * @returns {Promise<Object>} 詞表數據
 */
export async function loadWordlist(wordlistCode) {
  // 檢查緩存
  if (wordlistCache.has(wordlistCode)) {
    console.log(`✅ 從緩存加載詞表: ${wordlistCode}`);
    return wordlistCache.get(wordlistCode);
  }
  
  try {
    console.log(`📥 加載詞表 JSON: ${wordlistCode}`);
    
    // 自動檢測路徑前綴
    // 本地開發：服務器在 story-vocab/ 目錄，使用 /assets/...
    // GitHub Pages：使用 /story-vocab/assets/...
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const pathPrefix = isLocalDev ? '' : '/story-vocab';
    
    const response = await fetch(`${pathPrefix}/assets/data/wordlists/${wordlistCode}.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 存入緩存
    wordlistCache.set(wordlistCode, data);
    
    console.log(`✅ 詞表加載成功:`, {
      name: data.name,
      totalWords: data.total_words,
      level2Count: Object.keys(data.hierarchy).length
    });
    
    return data;
    
  } catch (error) {
    console.error(`❌ 加載詞表失敗: ${wordlistCode}`, error);
    throw error;
  }
}

/**
 * 獲取第二層級標籤列表
 * @param {string} wordlistCode - 詞表代碼
 * @returns {Promise<Array<string>>} 第二層級標籤數組
 */
export async function getLevel2Tags(wordlistCode) {
  const wordlist = await loadWordlist(wordlistCode);
  return Object.keys(wordlist.hierarchy);
}

/**
 * 獲取第三層級標籤列表
 * @param {string} wordlistCode - 詞表代碼
 * @param {string} level2Tag - 第二層級標籤
 * @returns {Promise<Array<string>>} 第三層級標籤數組
 */
export async function getLevel3Tags(wordlistCode, level2Tag) {
  const wordlist = await loadWordlist(wordlistCode);
  
  if (!wordlist.hierarchy[level2Tag]) {
    console.warn(`⚠️ 未找到第二層級: ${level2Tag}`);
    return [];
  }
  
  const level3Data = wordlist.hierarchy[level2Tag];
  
  // 過濾掉特殊鍵 "_all"（用於兩層結構）
  const level3Tags = Object.keys(level3Data).filter(key => key !== '_all');
  
  console.log(`📖 ${level2Tag} 的第三層級:`, level3Tags.length, '個');
  
  return level3Tags;
}

/**
 * 獲取詞語列表
 * @param {string} wordlistCode - 詞表代碼
 * @param {string} level2Tag - 第二層級標籤
 * @param {string|null} level3Tag - 第三層級標籤（可選）
 * @returns {Promise<Array<string>>} 詞語數組
 */
export async function getWords(wordlistCode, level2Tag, level3Tag = null) {
  const wordlist = await loadWordlist(wordlistCode);
  
  if (!wordlist.hierarchy[level2Tag]) {
    console.warn(`⚠️ 未找到第二層級: ${level2Tag}`);
    return [];
  }
  
  const level3Data = wordlist.hierarchy[level2Tag];
  
  if (level3Tag) {
    // 獲取特定第三層級的詞語
    const words = level3Data[level3Tag] || [];
    console.log(`📖 ${level2Tag} > ${level3Tag}: ${words.length} 個詞語`);
    return words;
  } else {
    // 獲取整個第二層級的所有詞語
    let allWords = [];
    for (const key of Object.keys(level3Data)) {
      allWords = allWords.concat(level3Data[key]);
    }
    console.log(`📖 ${level2Tag} (全部): ${allWords.length} 個詞語`);
    return allWords;
  }
}

/**
 * 獲取詞表元數據
 * @param {string} wordlistCode - 詞表代碼
 * @returns {Promise<Object>} 詞表元數據（不包含 hierarchy）
 */
export async function getWordlistMetadata(wordlistCode) {
  const wordlist = await loadWordlist(wordlistCode);
  return {
    id: wordlist.id,
    name: wordlist.name,
    code: wordlist.code,
    total_words: wordlist.total_words
  };
}

/**
 * 檢查詞表是否已加載
 * @param {string} wordlistCode - 詞表代碼
 * @returns {boolean} 是否已加載
 */
export function isWordlistLoaded(wordlistCode) {
  return wordlistCache.has(wordlistCode);
}

/**
 * 預加載詞表（可選，用於提升性能）
 * @param {Array<string>} wordlistCodes - 詞表代碼數組
 * @returns {Promise<void>}
 */
export async function preloadWordlists(wordlistCodes) {
  console.log(`🚀 預加載 ${wordlistCodes.length} 個詞表...`);
  const promises = wordlistCodes.map(code => loadWordlist(code));
  await Promise.all(promises);
  console.log(`✅ 預加載完成`);
}

/**
 * 清除緩存（用於調試）
 */
export function clearCache() {
  wordlistCache.clear();
  console.log('🗑️ 詞表緩存已清空');
}

/**
 * 從 JSON 生成標籤數組（兼容原有的 wordlist_tags 格式）
 * @param {string} wordlistCode - 詞表代碼
 * @returns {Promise<Array>} 標籤對象數組
 */
export async function generateTagsFromJSON(wordlistCode) {
  const wordlist = await loadWordlist(wordlistCode);
  const tags = [];
  let tagIdCounter = 1;
  
  // 遍歷第二層級
  for (const [level2Name, level3Data] of Object.entries(wordlist.hierarchy)) {
    // 創建第二層級標籤
    const level2Tag = {
      id: `tag_${tagIdCounter++}`,
      wordlist_id: wordlist.id,
      tag_level: 2,
      tag_code: level2Name,
      tag_display_name: level2Name,
      parent_tag_id: null,
      sort_order: tags.length
    };
    tags.push(level2Tag);
    
    // 遍歷第三層級
    for (const level3Name of Object.keys(level3Data)) {
      // 跳過特殊鍵 "_all"（用於沒有第三層級的詞表）
      if (level3Name === '_all') continue;
      
      const level3Tag = {
        id: `tag_${tagIdCounter++}`,
        wordlist_id: wordlist.id,
        tag_level: 3,
        tag_code: level3Name,
        tag_display_name: level3Name,
        parent_tag_id: level2Tag.id,
        sort_order: tags.length
      };
      tags.push(level3Tag);
    }
  }
  
  console.log(`📋 從 JSON 生成 ${tags.length} 個標籤`);
  return tags;
}

/**
 * 獲取完整的詞表信息（包含標籤）
 * @param {string} wordlistCode - 詞表代碼
 * @returns {Promise<Object>} 詞表信息 { id, code, name, tags }
 */
export async function getWordlistWithTags(wordlistCode) {
  const metadata = await getWordlistMetadata(wordlistCode);
  const tags = await generateTagsFromJSON(wordlistCode);
  
  return {
    ...metadata,
    tags
  };
}

