/**
 * 词典查询模块
 * 调用萌典 API 查询词汇详情
 */

import { gameState } from '../core/game-state.js';
import { getBriefInfo, cacheBriefInfo, getFullInfo, cacheFullInfo } from '../utils/word-cache.js';

/**
 * 清理萌典特殊标记符号
 * @param {string} text - 原始文本
 * @returns {string} 清理后的文本
 */
function cleanMoedictText(text) {
    if (!text) return '';
    // 移除萌典的特殊标记：`` ` `` 重音标记、`~` 连接符、`￹` `￻` 分隔符等
    return text.replace(/[`~￹￻]/g, '').trim();
}

/**
 * 顯示同義詞和反義詞
 * @param {Array} definitions - 釋義數組
 * @param {boolean} isWordQuery - 是否為詞語查詢
 */
function displaySynonymsAndAntonyms(definitions, isWordQuery) {
    let synonyms = [];
    let antonyms = [];
    
    // 收集所有釋義中的同義詞和反義詞
    definitions.forEach(def => {
        // 同義詞：def.s（單字和詞語都用相同欄位）
        if (def.s) {
            const synList = Array.isArray(def.s) ? def.s : [def.s];
            synonyms.push(...synList);
        }
        
        // 反義詞：def.a（單字和詞語都用相同欄位）
        if (def.a) {
            const antList = Array.isArray(def.a) ? def.a : [def.a];
            antonyms.push(...antList);
        }
    });
    
    // 清理並去重
    synonyms = [...new Set(synonyms.map(w => cleanMoedictText(w)).filter(w => w))];
    antonyms = [...new Set(antonyms.map(w => cleanMoedictText(w)).filter(w => w))];
    
    console.log('同義詞:', synonyms, '反義詞:', antonyms);
    
    // 顯示同義詞
    const synonymsSection = document.getElementById('synonyms-section');
    const synonymsContainer = document.getElementById('modal-synonyms');
    if (synonyms.length > 0 && synonymsSection && synonymsContainer) {
        let html = '';
        synonyms.forEach(word => {
            // 轉義單引號防止 onclick 錯誤
            const escapedWord = word.replace(/'/g, "\\'");
            html += `<span class="related-word-tag" onclick="showWordDetailFromVocab('${escapedWord}')">${word}</span>`;
        });
        synonymsContainer.innerHTML = html;
        synonymsSection.style.display = 'block';
    } else if (synonymsSection) {
        synonymsSection.style.display = 'none';
    }
    
    // 顯示反義詞
    const antonymsSection = document.getElementById('antonyms-section');
    const antonymsContainer = document.getElementById('modal-antonyms');
    if (antonyms.length > 0 && antonymsSection && antonymsContainer) {
        let html = '';
        antonyms.forEach(word => {
            // 轉義單引號防止 onclick 錯誤
            const escapedWord = word.replace(/'/g, "\\'");
            html += `<span class="related-word-tag antonym" onclick="showWordDetailFromVocab('${escapedWord}')">${word}</span>`;
        });
        antonymsContainer.innerHTML = html;
        antonymsSection.style.display = 'block';
    } else if (antonymsSection) {
        antonymsSection.style.display = 'none';
    }
}

/**
 * 显示词汇详情（从词库查询或调用萌典 API）
 * @param {string} word - 要查询的词汇
 */
export async function showWordDetailFromVocab(word) {
    const modal = document.getElementById('word-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // 设置初始状态
    document.getElementById('modal-word').textContent = word;
    
    // 检查缓存中是否有完整信息
    const cachedFull = getFullInfo(word);
    const cachedBrief = getBriefInfo(word);
    
    if (cachedFull && cachedFull.mainData && cachedFull.crossStraitData) {
        // 💾 使用缓存的完整数据，立即显示，无加载延迟
        console.log(`💾 从缓存读取完整信息: ${word}`);
        displayCachedWordDetail(word, cachedFull.mainData, cachedFull.crossStraitData, cachedBrief);
        return;
    }
    
    // 显示加载状态
    document.getElementById('modal-pinyin').innerHTML = '<span style="color: var(--text-light);">🔄 查詢中...</span>';
    document.getElementById('modal-translation').innerHTML = '<span style="color: var(--text-light);">正在獲取英文翻譯...</span>';
    document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">正在獲取釋義...</span>';
    document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">正在獲取例句...</span>';
    
    try {
        // 首先检查是否在当前推荐词汇中
        const vocabWord = gameState.currentWords.find(w => w.word === word);
        
        if (vocabWord && vocabWord.pinyin) {
            document.getElementById('modal-pinyin').textContent = vocabWord.pinyin;
        }
        
        // 同时调用两个 API：国语辞典和两岸词典
        const promises = [];
        
        // 1. 调用国语辞典 API 获取详细信息（释义、例句）
        let mainApiUrl;
        if (word.length === 1) {
            // 单字使用 uni API
            mainApiUrl = `https://www.moedict.tw/uni/${encodeURIComponent(word)}`;
        } else {
            // 词语使用 a API
            mainApiUrl = `https://www.moedict.tw/a/${encodeURIComponent(word)}.json`;
        }
        promises.push(fetch(mainApiUrl).then(r => r.ok ? r.json() : null).catch(() => null));
        
        // 2. 调用两岸词典 API 获取英文翻译
        const crossStraitApiUrl = `https://www.moedict.tw/c/${encodeURIComponent(word)}.json`;
        promises.push(fetch(crossStraitApiUrl).then(r => r.ok ? r.json() : null).catch(() => null));
        
        const [mainData, crossStraitData] = await Promise.all(promises);
        
        console.log('萌典國語辭典API返回:', mainData);
        console.log('萌典兩岸詞典API返回:', crossStraitData);
        
        // 缓存完整数据
        cacheFullInfo(word, { mainData, crossStraitData });
        
        // 处理拼音（单字和词语的数据结构不同）
        if (mainData) {
            let pinyin = '';
            
            if (word.length === 1) {
                // 单字：使用 heteronyms[0].pinyin
                if (mainData.heteronyms && mainData.heteronyms[0]) {
                    pinyin = mainData.heteronyms[0].bopomofo2 || 
                            mainData.heteronyms[0].pinyin || 
                            mainData.heteronyms[0].bopomofo || '';
                }
            } else {
                // 词语：使用 h[0].p
                if (mainData.h && mainData.h[0]) {
                    pinyin = mainData.h[0].p || '';
                }
            }
            
            document.getElementById('modal-pinyin').textContent = pinyin || '無拼音';
        }
        
        // 显示英文翻译
        if (crossStraitData && crossStraitData.translation && crossStraitData.translation.English) {
            const englishTranslations = crossStraitData.translation.English;
            if (Array.isArray(englishTranslations) && englishTranslations.length > 0) {
                // 取前5个翻译
                const translationText = englishTranslations.slice(0, 5).join('; ');
                document.getElementById('modal-translation').textContent = translationText;
            } else {
                document.getElementById('modal-translation').innerHTML = '<span style="color: var(--text-light);">暫無英文翻譯</span>';
            }
        } else {
            document.getElementById('modal-translation').innerHTML = '<span style="color: var(--text-light);">暫無英文翻譯</span>';
        }
        
        // 显示释义和例句（单字和词语的数据结构不同）
        if (mainData) {
            let definitions = [];
            let isWordQuery = false; // 標記是否為詞語查詢
            
            if (word.length === 1) {
                // 单字：使用 heteronyms[0].definitions
                if (mainData.heteronyms && mainData.heteronyms[0] && mainData.heteronyms[0].definitions) {
                    definitions = mainData.heteronyms[0].definitions;
                }
            } else {
                // 词语：使用 h[0].d
                isWordQuery = true;
                if (mainData.h && mainData.h[0] && mainData.h[0].d) {
                    definitions = mainData.h[0].d;
                }
            }
            
            console.log('解析到的definitions:', definitions, '是否為詞語:', isWordQuery);
            
            // 处理释义 - 改為HTML結構，顯示詞性標籤
            if (definitions && definitions.length > 0) {
                let definitionHTML = '';
                
                definitions.forEach((def, index) => {
                    // 單字用 def.def，詞語用 def.f（根據萌典API文檔）
                    const defText = isWordQuery ? (def.f || '') : (def.def || '');
                    const partOfSpeech = def.type || '';
                    
                    if (defText) {
                        const cleanDef = cleanMoedictText(defText);
                        definitionHTML += '<div class="definition-item">';
                        
                        // 添加詞性標籤
                        if (partOfSpeech) {
                            const cleanPos = cleanMoedictText(partOfSpeech);
                            definitionHTML += `<span class="part-of-speech">${cleanPos}</span>`;
                        }
                        
                        // 添加釋義文字
                        definitionHTML += `<span class="definition-text-content">${cleanDef}</span>`;
                        definitionHTML += '</div>';
                    }
                });
                
                if (definitionHTML) {
                    document.getElementById('modal-definition').innerHTML = definitionHTML;
                } else {
                    document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
                }
                
                // 處理同義詞和反義詞
                displaySynonymsAndAntonyms(definitions, isWordQuery);
                
                // 显示例句（取前3个）- 改為HTML結構
                let exampleHTML = '';
                let exampleCount = 0;
                definitions.forEach(def => {
                    // 單字用 def.example，詞語用 def.e
                    let examples = isWordQuery ? (def.e || []) : (def.example || []);
                    
                    // 處理可能的字符串格式
                    if (typeof examples === 'string') {
                        examples = [examples];
                    }
                    
                    // 確保是數組
                    if (!Array.isArray(examples)) {
                        examples = [];
                    }
                    
                    if (examples.length > 0 && exampleCount < 3) {
                        examples.forEach(ex => {
                            if (exampleCount < 3 && ex) {
                                // 清理HTML標籤和特殊符號
                                let cleanExample = cleanMoedictText(String(ex));
                                // 移除HTML標籤
                                cleanExample = cleanExample.replace(/<[^>]*>/g, '').trim();
                                if (cleanExample && cleanExample.length > 0) {
                                    exampleHTML += `<div class="example-item">• ${cleanExample}</div>`;
                                    exampleCount++;
                                }
                            }
                        });
                    }
                });
                
                console.log('處理後的例句數量:', exampleCount);
                
                if (exampleHTML) {
                    document.getElementById('modal-example').innerHTML = exampleHTML;
                } else {
                    document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
                }
            } else {
                // 如果没有 definitions 数据
                document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
                document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
                // 隱藏同義詞和反義詞區塊
                document.getElementById('synonyms-section').style.display = 'none';
                document.getElementById('antonyms-section').style.display = 'none';
            }
        } else {
            // 如果没有 mainData
            document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
            document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
            // 隱藏同義詞和反義詞區塊
            const synonymsSection = document.getElementById('synonyms-section');
            const antonymsSection = document.getElementById('antonyms-section');
            if (synonymsSection) synonymsSection.style.display = 'none';
            if (antonymsSection) antonymsSection.style.display = 'none';
        }
        
    } catch (error) {
        console.error('查詢詞彙失敗:', error);
        document.getElementById('modal-pinyin').innerHTML = '<span style="color: #E74C3C;">❌ 查詢失敗</span>';
        document.getElementById('modal-translation').innerHTML = '<span style="color: var(--text-light);">無法獲取翻譯</span>';
        document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">抱歉，暫時無法獲取該詞的詳細釋義。<br>請稍後重試或嘗試其他詞語。</span>';
        document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">無法獲取例句</span>';
    }
    
    // 保存当前查看的词汇
    modal.dataset.currentWord = word;
}

/**
 * 获取词汇的简要信息（用于已选词汇显示区域）
 * @param {string} word - 要查询的词汇
 * @param {boolean} useCache - 是否使用缓存（默认 true）
 * @returns {Promise<Object>} { english, definition, pinyin }
 */
export async function getWordBriefInfo(word, useCache = true) {
    // 先检查缓存
    if (useCache) {
        const cached = getBriefInfo(word);
        if (cached) {
            console.log(`💾 从缓存读取简要信息: ${word}`);
            return cached;
        }
    }
    
    try {
        // 创建超时 Promise（3秒）
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API timeout')), 3000);
        });
        
        // 同时调用两个 API
        const promises = [];
        
        // 1. 调用国语辞典 API 获取释义和拼音
        let mainApiUrl;
        if (word.length === 1) {
            mainApiUrl = `https://www.moedict.tw/uni/${encodeURIComponent(word)}`;
        } else {
            mainApiUrl = `https://www.moedict.tw/a/${encodeURIComponent(word)}.json`;
        }
        promises.push(
            fetch(mainApiUrl).then(r => r.ok ? r.json() : null).catch(() => null)
        );
        
        // 2. 调用两岸词典 API 获取英文翻译
        const crossStraitApiUrl = `https://www.moedict.tw/c/${encodeURIComponent(word)}.json`;
        promises.push(
            fetch(crossStraitApiUrl).then(r => r.ok ? r.json() : null).catch(() => null)
        );
        
        // 使用 Promise.race 实现超时控制
        const [mainData, crossStraitData] = await Promise.race([
            Promise.all(promises),
            timeoutPromise
        ]);
        
        const result = {
            english: '',
            definition: '',
            pinyin: ''
        };
        
        // 处理拼音和释义
        if (mainData) {
            const isWord = word.length > 1;
            
            // 提取拼音
            if (isWord) {
                // 词语：使用 h[0].p
                if (mainData.h && mainData.h[0]) {
                    result.pinyin = mainData.h[0].p || '';
                }
            } else {
                // 单字：使用 heteronyms[0].pinyin
                if (mainData.heteronyms && mainData.heteronyms[0]) {
                    result.pinyin = mainData.heteronyms[0].bopomofo2 || 
                                   mainData.heteronyms[0].pinyin || 
                                   mainData.heteronyms[0].bopomofo || '';
                }
            }
            
            // 提取第一个释义
            let definitions = [];
            if (isWord) {
                // 词语：使用 h[0].d
                if (mainData.h && mainData.h[0] && mainData.h[0].d) {
                    definitions = mainData.h[0].d;
                }
            } else {
                // 单字：使用 heteronyms[0].definitions
                if (mainData.heteronyms && mainData.heteronyms[0] && mainData.heteronyms[0].definitions) {
                    definitions = mainData.heteronyms[0].definitions;
                }
            }
            
            if (definitions && definitions.length > 0) {
                const firstDef = definitions[0];
                const defText = isWord ? (firstDef.f || '') : (firstDef.def || '');
                result.definition = cleanMoedictText(defText);
            }
        }
        
        // 处理英文翻译（取前2个）
        if (crossStraitData && crossStraitData.translation && crossStraitData.translation.English) {
            const englishTranslations = crossStraitData.translation.English;
            if (Array.isArray(englishTranslations) && englishTranslations.length > 0) {
                result.english = englishTranslations.slice(0, 2).join('; ');
            }
        }
        
        // 存入缓存（同时也缓存完整数据供模态窗口使用）
        if (useCache) {
            cacheBriefInfo(word, result);
            cacheFullInfo(word, { mainData, crossStraitData });
        }
        
        return result;
        
    } catch (error) {
        console.log('萌典 API 查詢失敗（簡要版）:', error.message);
        return { english: '', definition: '', pinyin: '' };
    }
}

/**
 * 显示缓存的词汇详情（即时显示，无加载延迟）
 * @param {string} word - 词语
 * @param {Object} mainData - 国语辞典数据
 * @param {Object} crossStraitData - 两岸词典数据
 * @param {Object} cachedBrief - 缓存的简要信息（可选）
 */
function displayCachedWordDetail(word, mainData, crossStraitData, cachedBrief = null) {
    // 首先检查是否在当前推荐词汇中
    const vocabWord = gameState.currentWords.find(w => w.word === word);
    
    // 处理拼音
    let pinyin = '';
    if (cachedBrief && cachedBrief.pinyin) {
        pinyin = cachedBrief.pinyin;
    } else if (vocabWord && vocabWord.pinyin) {
        pinyin = vocabWord.pinyin;
    } else if (mainData) {
        if (word.length === 1) {
            if (mainData.heteronyms && mainData.heteronyms[0]) {
                pinyin = mainData.heteronyms[0].bopomofo2 || 
                        mainData.heteronyms[0].pinyin || 
                        mainData.heteronyms[0].bopomofo || '';
            }
        } else {
            if (mainData.h && mainData.h[0]) {
                pinyin = mainData.h[0].p || '';
            }
        }
    }
    document.getElementById('modal-pinyin').textContent = pinyin || '無拼音';
    
    // 显示英文翻译
    if (crossStraitData && crossStraitData.translation && crossStraitData.translation.English) {
        const englishTranslations = crossStraitData.translation.English;
        if (Array.isArray(englishTranslations) && englishTranslations.length > 0) {
            const translationText = englishTranslations.slice(0, 5).join('; ');
            document.getElementById('modal-translation').textContent = translationText;
        } else {
            document.getElementById('modal-translation').innerHTML = '<span style="color: var(--text-light);">暫無英文翻譯</span>';
        }
    } else {
        document.getElementById('modal-translation').innerHTML = '<span style="color: var(--text-light);">暫無英文翻譯</span>';
    }
    
    // 显示释义和例句
    if (mainData) {
        let definitions = [];
        let isWordQuery = false;
        
        if (word.length === 1) {
            if (mainData.heteronyms && mainData.heteronyms[0] && mainData.heteronyms[0].definitions) {
                definitions = mainData.heteronyms[0].definitions;
            }
        } else {
            isWordQuery = true;
            if (mainData.h && mainData.h[0] && mainData.h[0].d) {
                definitions = mainData.h[0].d;
            }
        }
        
        // 处理释义
        if (definitions && definitions.length > 0) {
            let definitionHTML = '';
            
            definitions.forEach((def, index) => {
                const defText = isWordQuery ? (def.f || '') : (def.def || '');
                const partOfSpeech = def.type || '';
                
                if (defText) {
                    const cleanDef = cleanMoedictText(defText);
                    definitionHTML += '<div class="definition-item">';
                    
                    if (partOfSpeech) {
                        const cleanPos = cleanMoedictText(partOfSpeech);
                        definitionHTML += `<span class="part-of-speech">${cleanPos}</span>`;
                    }
                    
                    definitionHTML += `<span class="definition-text-content">${cleanDef}</span>`;
                    definitionHTML += '</div>';
                }
            });
            
            if (definitionHTML) {
                document.getElementById('modal-definition').innerHTML = definitionHTML;
            } else {
                document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
            }
            
            // 处理同义词和反义词
            displaySynonymsAndAntonyms(definitions, isWordQuery);
            
            // 显示例句
            let exampleHTML = '';
            let exampleCount = 0;
            definitions.forEach(def => {
                let examples = isWordQuery ? (def.e || []) : (def.example || []);
                
                if (typeof examples === 'string') {
                    examples = [examples];
                }
                
                if (!Array.isArray(examples)) {
                    examples = [];
                }
                
                if (examples.length > 0 && exampleCount < 3) {
                    examples.forEach(ex => {
                        if (exampleCount < 3 && ex) {
                            let cleanExample = cleanMoedictText(String(ex));
                            cleanExample = cleanExample.replace(/<[^>]*>/g, '').trim();
                            if (cleanExample && cleanExample.length > 0) {
                                exampleHTML += `<div class="example-item">• ${cleanExample}</div>`;
                                exampleCount++;
                            }
                        }
                    });
                }
            });
            
            if (exampleHTML) {
                document.getElementById('modal-example').innerHTML = exampleHTML;
            } else {
                document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
            }
        } else {
            document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
            document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
            document.getElementById('synonyms-section').style.display = 'none';
            document.getElementById('antonyms-section').style.display = 'none';
        }
    } else {
        document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
        document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
        const synonymsSection = document.getElementById('synonyms-section');
        const antonymsSection = document.getElementById('antonyms-section');
        if (synonymsSection) synonymsSection.style.display = 'none';
        if (antonymsSection) antonymsSection.style.display = 'none';
    }
}

/**
 * 关闭词汇详情弹窗
 */
export function closeWordModal() {
    const modal = document.getElementById('word-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}


