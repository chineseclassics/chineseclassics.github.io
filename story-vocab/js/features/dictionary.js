/**
 * 词典查询模块
 * 调用萌典 API 查询词汇详情
 */

import { gameState } from '../core/game-state.js';

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
 * 显示词汇详情（从词库查询或调用萌典 API）
 * @param {string} word - 要查询的词汇
 */
export async function showWordDetailFromVocab(word) {
    const modal = document.getElementById('word-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // 设置初始状态
    document.getElementById('modal-word').textContent = word;
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
        
        // 处理拼音（单字和词语的数据结构不同）
        if (mainData && !vocabWord) {
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
            
            if (word.length === 1) {
                // 单字：使用 heteronyms[0].definitions
                if (mainData.heteronyms && mainData.heteronyms[0] && mainData.heteronyms[0].definitions) {
                    definitions = mainData.heteronyms[0].definitions;
                }
            } else {
                // 词语：使用 h[0].d
                if (mainData.h && mainData.h[0] && mainData.h[0].d) {
                    definitions = mainData.h[0].d;
                }
            }
            
            // 处理释义
            if (definitions.length > 0) {
                let definitionText = '';
                
                definitions.forEach((def, index) => {
                    // 单字用 def.def，词语用 def.d
                    const defText = def.def || def.d || '';
                    if (defText) {
                        const cleanDef = cleanMoedictText(defText);
                        if (definitions.length > 1) {
                            definitionText += `${index + 1}. ${cleanDef}\n\n`;
                        } else {
                            definitionText += cleanDef;
                        }
                    }
                });
                
                if (definitionText) {
                    document.getElementById('modal-definition').textContent = definitionText;
                } else {
                    document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
                }
                
                // 显示例句（取前3个）
                let exampleText = '';
                let exampleCount = 0;
                definitions.forEach(def => {
                    // 单字用 def.example，词语用 def.e
                    const examples = def.example || def.e || [];
                    if (examples.length > 0 && exampleCount < 3) {
                        examples.forEach(ex => {
                            if (exampleCount < 3) {
                                const cleanExample = cleanMoedictText(ex);
                                if (cleanExample) {
                                    exampleText += `• ${cleanExample}\n\n`;
                                    exampleCount++;
                                }
                            }
                        });
                    }
                });
                
                if (exampleText) {
                    document.getElementById('modal-example').textContent = exampleText;
                } else {
                    document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
                }
            } else {
                // 如果没有 definitions 数据
                document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
                document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
            }
        } else {
            // 如果没有 mainData
            document.getElementById('modal-definition').innerHTML = '<span style="color: var(--text-light);">暫無釋義</span>';
            document.getElementById('modal-example').innerHTML = '<span style="color: var(--text-light);">暫無例句</span>';
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
 * 关闭词汇详情弹窗
 */
export function closeWordModal() {
    const modal = document.getElementById('word-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

