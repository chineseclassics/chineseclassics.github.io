/**
 * 词汇缓存管理模块
 * 用于缓存萌典 API 查询结果，实现预加载和即时显示
 */

// 缓存存储
const wordCache = new Map();

/**
 * 缓存数据结构
 * {
 *   word: {
 *     brief: { english: string, definition: string, pinyin: string },
 *     full: { mainData: object, crossStraitData: object }
 *   }
 * }
 */

/**
 * 存储简要信息（用于已选词汇显示区域）
 * @param {string} word - 词语
 * @param {Object} briefInfo - 简要信息 { english, definition, pinyin }
 */
export function cacheBriefInfo(word, briefInfo) {
    if (!word) return;
    
    const existing = wordCache.get(word) || {};
    wordCache.set(word, {
        ...existing,
        brief: briefInfo
    });
    
    console.log(`✅ 缓存简要信息: ${word}`, briefInfo);
}

/**
 * 存储完整信息（用于模态窗口详情）
 * @param {string} word - 词语
 * @param {Object} fullData - 完整数据 { mainData, crossStraitData }
 */
export function cacheFullInfo(word, fullData) {
    if (!word) return;
    
    const existing = wordCache.get(word) || {};
    wordCache.set(word, {
        ...existing,
        full: fullData
    });
    
    console.log(`✅ 缓存完整信息: ${word}`);
}

/**
 * 获取简要信息
 * @param {string} word - 词语
 * @returns {Object|null} 简要信息或 null
 */
export function getBriefInfo(word) {
    if (!word) return null;
    
    const cached = wordCache.get(word);
    return cached?.brief || null;
}

/**
 * 获取完整信息
 * @param {string} word - 词语
 * @returns {Object|null} 完整信息或 null
 */
export function getFullInfo(word) {
    if (!word) return null;
    
    const cached = wordCache.get(word);
    return cached?.full || null;
}

/**
 * 检查词语是否已缓存
 * @param {string} word - 词语
 * @returns {boolean}
 */
export function isCached(word) {
    return wordCache.has(word);
}

/**
 * 清空所有缓存
 */
export function clearCache() {
    wordCache.clear();
    console.log('🗑️ 已清空词汇缓存');
}

/**
 * 获取缓存统计信息
 * @returns {Object} { total, withBrief, withFull }
 */
export function getCacheStats() {
    let withBrief = 0;
    let withFull = 0;
    
    wordCache.forEach(data => {
        if (data.brief) withBrief++;
        if (data.full) withFull++;
    });
    
    return {
        total: wordCache.size,
        withBrief,
        withFull
    };
}

/**
 * 批量预加载词汇信息
 * @param {Array<string>} wordList - 词语列表
 * @param {Function} fetchBriefFn - 获取简要信息的函数
 * @param {Function} fetchFullFn - 获取完整信息的函数（可选）
 * @returns {Promise<Object>} { success: number, failed: number }
 */
export async function preloadWords(wordList, fetchBriefFn, fetchFullFn = null) {
    if (!wordList || wordList.length === 0) {
        return { success: 0, failed: 0 };
    }
    
    console.log(`🔄 开始预加载 ${wordList.length} 个词汇...`);
    
    // 过滤掉已经缓存的词语
    const wordsToLoad = wordList.filter(word => !isCached(word));
    
    if (wordsToLoad.length === 0) {
        console.log('✅ 所有词汇已在缓存中');
        return { success: wordList.length, failed: 0 };
    }
    
    console.log(`需要加载 ${wordsToLoad.length} 个新词汇:`, wordsToLoad);
    
    // 并发加载所有词汇（使用 allSettled 避免单个失败影响整体）
    const promises = wordsToLoad.map(async (word) => {
        try {
            // 加载简要信息
            const briefInfo = await fetchBriefFn(word);
            if (briefInfo) {
                cacheBriefInfo(word, briefInfo);
            }
            
            // 如果提供了完整信息加载函数，也加载完整信息
            if (fetchFullFn) {
                const fullInfo = await fetchFullFn(word);
                if (fullInfo) {
                    cacheFullInfo(word, fullInfo);
                }
            }
            
            return { word, success: true };
        } catch (error) {
            console.log(`⚠️ 预加载失败: ${word}`, error.message);
            return { word, success: false };
        }
    });
    
    const results = await Promise.allSettled(promises);
    
    // 统计结果
    let success = 0;
    let failed = 0;
    
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
            success++;
        } else {
            failed++;
        }
    });
    
    console.log(`✅ 预加载完成: 成功 ${success}, 失败 ${failed}`);
    console.log('📊 缓存统计:', getCacheStats());
    
    return { success, failed };
}

