/**
 * 時文寶鑑 - 論文存儲模組
 * 
 * 功能：
 * - 保存論文到 Supabase 數據庫
 * - 版本快照管理
 * - 離線/在線同步
 */

// 使用全局 AppState，避免循環導入
const AppState = window.AppState;

// ================================
// 存儲狀態
// ================================

export const StorageState = {
    currentEssayId: null,  // 當前論文 ID
    pendingSaves: [],      // 待同步的保存操作
    isOnline: navigator.onLine,
    lastSyncTime: null
};

// ================================
// 初始化
// ================================

/**
 * 初始化存儲模組
 */
export function initializeStorage() {
    console.log('💾 初始化存儲模組...');
    
    // 防禦性檢查 - 在使用時檢查
    if (!AppState) {
        console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
        return;
    }
    
    // 監聽網絡狀態
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // ✅ 只在任務模式下恢復 localStorage 中的 essay ID
    // 練筆模式下，應該創建新的 essay 或使用傳入的 essayId
    if (AppState.currentAssignmentId) {
        const savedEssayId = localStorage.getItem('current-essay-id');
        if (savedEssayId) {
            StorageState.currentEssayId = savedEssayId;
            console.log(`✅ 任務模式：恢復論文 ID ${savedEssayId}`);
        }
    } else {
        console.log('✨ 練筆模式：不從 localStorage 恢復 ID');
        // 練筆模式下，清除舊的 essay ID
        StorageState.currentEssayId = null;
    }
    
    console.log(`📡 網絡狀態: ${StorageState.isOnline ? '在線' : '離線'}`);
}

// ================================
// 保存論文到 Supabase
// ================================

/**
 * 保存論文數據到 Supabase
 * @param {Object} essayData - 論文數據
 * @returns {Promise<Object>} - 保存結果
 */
export async function saveEssayToSupabase(essayData) {
    if (!AppState.supabase || !AppState.currentUser) {
        throw new Error('未登錄或 Supabase 未初始化');
    }
    
    console.log('💾 開始保存論文到 Supabase...');
    
    try {
        // 1. 保存或更新論文記錄
        const essay = await upsertEssay(essayData);
        
        // 2. 保存分論點
        await saveSubArguments(essay.id, essayData.arguments);
        
        // 3. 保存段落（引言、正文、結論）
        await saveParagraphs(essay.id, essayData);
        
        // 4. 更新論文字數
        await updateEssayWordCount(essay.id, essayData.word_count);
        
        // 5. 保存到 localStorage
        localStorage.setItem('current-essay-id', essay.id);
        StorageState.currentEssayId = essay.id;
        StorageState.lastSyncTime = new Date();
        
        console.log(`✅ 論文保存成功: ${essay.id}`);
        
        return {
            success: true,
            essayId: essay.id
        };
        
    } catch (error) {
        console.error('❌ 保存論文失敗:', error);
        
        // 保存到待同步隊列
        addToPendingSaves(essayData);
        
        throw error;
    }
}

/**
 * 創建或更新論文記錄
 */
async function upsertEssay(essayData) {
    // 組合完整標題：主標題 + 副標題
    let fullTitle = essayData.title || '';
    
    // 如果沒有標題且是練筆模式，生成默認標題
    if (!fullTitle && AppState.currentFormatSpec) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-Hant-TW', { 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        fullTitle = `練筆 - ${dateStr}`;
    } else if (!fullTitle) {
        fullTitle = '論文草稿';
    }
    
    if (essayData.subtitle) {
        fullTitle += ` - ${essayData.subtitle}`;
    }
    
    // 優先使用 currentPracticeEssayId（繼續編輯練筆）
    const targetEssayId = AppState.currentPracticeEssayId || StorageState.currentEssayId;
    
    // 如果是更新現有作業，先獲取當前狀態
    let currentStatus = 'draft'; // 默認狀態
    if (targetEssayId) {
        try {
            const { data: existingEssay } = await AppState.supabase
                .from('essays')
                .select('status')
                .eq('id', targetEssayId)
                .single();
            
            if (existingEssay) {
                currentStatus = existingEssay.status;
                console.log('📋 保持現有狀態:', currentStatus);
            }
        } catch (error) {
            console.log('⚠️ 無法獲取現有狀態，使用默認狀態');
        }
    }
    
    const essayRecord = {
        student_id: AppState.currentUser.id,
        assignment_id: AppState.currentAssignmentId || null,  // ✅ 如果有任務 ID，保存到 assignment_id
        title: fullTitle,
        content_json: JSON.stringify(essayData),  // ✅ 保存完整內容
        status: currentStatus,  // ✅ 保持現有狀態
        total_word_count: essayData.word_count || 0
    };
    
    // 調試信息
    console.log('💾 準備保存作業:', {
        assignmentId: AppState.currentAssignmentId,
        practiceEssayId: AppState.currentPracticeEssayId,
        storageEssayId: StorageState.currentEssayId,
        title: fullTitle,
        wordCount: essayData.word_count,
        currentStatus: currentStatus
    });
    
    // 如果已有論文 ID，執行更新
    if (targetEssayId) {
        console.log(`📝 更新現有作業: ${targetEssayId}`);
        const { data, error } = await AppState.supabase
            .from('essays')
            .update(essayRecord)
            .eq('id', targetEssayId)
            .select()
            .single();
            
        if (error) {
            // 可能是論文被刪除了或 ID 無效，創建新的
            console.warn('⚠️ 更新作業失敗（可能已被刪除），創建新作業:', error.code);
            const newEssay = await createNewEssay(essayRecord);
            // 更新所有相關的 ID
            StorageState.currentEssayId = newEssay.id;
            localStorage.setItem('current-essay-id', newEssay.id);
            if (!AppState.currentAssignmentId) {
                // 只有練筆才設置 currentPracticeEssayId
                AppState.currentPracticeEssayId = newEssay.id;
            }
            console.log(`✅ 已創建新作業替代: ${newEssay.id}`);
            return newEssay;
        }
        
        console.log(`✅ 作業更新成功，assignment_id = ${data.assignment_id || 'NULL（練筆）'}`);
        return data;
    } else {
        // 創建新論文
        console.log('📝 創建新作業');
        const newEssay = await createNewEssay(essayRecord);
        StorageState.currentEssayId = newEssay.id;
        if (!AppState.currentAssignmentId) {
            // 只有練筆才設置 currentPracticeEssayId
            AppState.currentPracticeEssayId = newEssay.id;
        }
        console.log(`✅ 作業創建成功: ${newEssay.id}, assignment_id = ${newEssay.assignment_id || 'NULL（練筆）'}`);
        return newEssay;
    }
}

/**
 * 創建新論文記錄
 */
async function createNewEssay(essayRecord) {
    const { data, error } = await AppState.supabase
        .from('essays')
        .insert(essayRecord)
        .select()
        .single();
        
    if (error) {
        throw new Error(`創建論文失敗: ${error.message}`);
    }
    
    console.log(`✅ 創建新論文: ${data.id}`);
    return data;
}

/**
 * 保存分論點
 */
async function saveSubArguments(essayId, argumentsData) {
    if (!argumentsData || argumentsData.length === 0) {
        console.log('ℹ️ 沒有分論點需要保存');
        return;
    }
    
    // 先刪除舊的分論點（簡化處理，實際可以優化為增量更新）
    await AppState.supabase
        .from('sub_arguments')
        .delete()
        .eq('essay_id', essayId);
    
    // 插入新的分論點
    const subArgumentsRecords = argumentsData.map((arg, index) => ({
        essay_id: essayId,
        title: arg.title || `分論點 ${index + 1}`,
        order_index: index
    }));
    
    const { error } = await AppState.supabase
        .from('sub_arguments')
        .insert(subArgumentsRecords);
        
    if (error) {
        throw new Error(`保存分論點失敗: ${error.message}`);
    }
    
    console.log(`✅ 保存了 ${argumentsData.length} 個分論點`);
}

/**
 * 保存段落
 */
async function saveParagraphs(essayId, essayData) {
    // 先刪除舊的段落
    await AppState.supabase
        .from('paragraphs')
        .delete()
        .eq('essay_id', essayId);
    
    const paragraphsToInsert = [];
    let orderIndex = 0;
    
    // 1. 引言段落
    if (essayData.introduction) {
        paragraphsToInsert.push({
            essay_id: essayId,
            sub_argument_id: null,
            paragraph_type: 'introduction',
            content: { html: essayData.introduction },
            order_index: orderIndex++,
            word_count: countWords(essayData.introduction)
        });
    }
    
    // 2. 正文段落（分論點下的段落）
    if (essayData.arguments && essayData.arguments.length > 0) {
        // 先獲取剛保存的分論點 ID
        const { data: subArguments } = await AppState.supabase
            .from('sub_arguments')
            .select('id, order_index')
            .eq('essay_id', essayId)
            .order('order_index');
        
        essayData.arguments.forEach((arg, argIndex) => {
            const subArgument = subArguments?.find(sa => sa.order_index === argIndex);
            
            if (arg.paragraphs && arg.paragraphs.length > 0) {
                arg.paragraphs.forEach((para) => {
                    paragraphsToInsert.push({
                        essay_id: essayId,
                        sub_argument_id: subArgument?.id || null,
                        paragraph_type: 'body',
                        content: { html: para.content },
                        order_index: orderIndex++,
                        word_count: countWords(para.content)
                    });
                });
            }
        });
    }
    
    // 3. 結論段落
    if (essayData.conclusion) {
        paragraphsToInsert.push({
            essay_id: essayId,
            sub_argument_id: null,
            paragraph_type: 'conclusion',
            content: { html: essayData.conclusion },
            order_index: orderIndex++,
            word_count: countWords(essayData.conclusion)
        });
    }
    
    if (paragraphsToInsert.length > 0) {
        const { error } = await AppState.supabase
            .from('paragraphs')
            .insert(paragraphsToInsert);
            
        if (error) {
            throw new Error(`保存段落失敗: ${error.message}`);
        }
        
        console.log(`✅ 保存了 ${paragraphsToInsert.length} 個段落`);
    }
}

/**
 * 更新論文總字數
 */
async function updateEssayWordCount(essayId, wordCount) {
    const { error } = await AppState.supabase
        .from('essays')
        .update({ total_word_count: wordCount })
        .eq('id', essayId);
        
    if (error) {
        console.error('❌ 更新字數失敗:', error);
    }
}

// ================================
// 版本快照
// ================================

/**
 * 創建段落版本快照
 * @param {string} paragraphId - 段落 ID
 * @param {Object} content - 段落內容
 * @param {string} triggerType - 觸發類型
 * @param {string} note - 備註
 */
export async function createParagraphSnapshot(paragraphId, content, triggerType = 'auto_save', note = null) {
    if (!AppState.supabase) {
        console.warn('⚠️ Supabase 未初始化，跳過快照');
        return;
    }
    
    try {
        const { error } = await AppState.supabase
            .from('paragraph_versions')
            .insert({
                paragraph_id: paragraphId,
                content: { html: content },
                trigger_type: triggerType,
                note: note
            });
            
        if (error) {
            console.error('❌ 創建快照失敗:', error);
            return;
        }
        
        console.log(`📸 創建段落快照: ${paragraphId} (${triggerType})`);
        
    } catch (error) {
        console.error('❌ 創建快照異常:', error);
    }
}

// ================================
// 離線同步
// ================================

/**
 * 添加到待同步隊列
 */
function addToPendingSaves(essayData) {
    const pendingItem = {
        timestamp: Date.now(),
        data: essayData
    };
    
    StorageState.pendingSaves.push(pendingItem);
    
    // 保存到 localStorage
    localStorage.setItem('pending-saves', JSON.stringify(StorageState.pendingSaves));
    
    console.log(`📦 添加到待同步隊列 (${StorageState.pendingSaves.length} 項)`);
}

/**
 * 處理網絡恢復
 */
async function handleOnline() {
    console.log('🌐 網絡已恢復');
    StorageState.isOnline = true;
    
    // 嘗試同步待處理的保存
    await syncPendingSaves();
}

/**
 * 處理網絡斷開
 */
function handleOffline() {
    console.log('📴 網絡已斷開');
    StorageState.isOnline = false;
}

/**
 * 同步待處理的保存
 */
async function syncPendingSaves() {
    if (StorageState.pendingSaves.length === 0) {
        console.log('ℹ️ 沒有待同步的內容');
        return;
    }
    
    console.log(`🔄 開始同步 ${StorageState.pendingSaves.length} 項待保存內容...`);
    
    const failed = [];
    
    for (const item of StorageState.pendingSaves) {
        try {
            await saveEssayToSupabase(item.data);
        } catch (error) {
            console.error('❌ 同步失敗:', error);
            failed.push(item);
        }
    }
    
    StorageState.pendingSaves = failed;
    localStorage.setItem('pending-saves', JSON.stringify(failed));
    
    if (failed.length === 0) {
        console.log('✅ 所有內容同步成功');
    } else {
        console.log(`⚠️ ${failed.length} 項同步失敗，將在下次重試`);
    }
}

// ================================
// 輔助函數
// ================================

/**
 * 統計字數（簡化版）
 */
function countWords(html) {
    if (!html) return 0;
    
    // 移除 HTML 標籤
    const text = html.replace(/<[^>]*>/g, '');
    
    // 統計中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    
    // 統計英文單詞
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    
    return chineseChars + englishWords;
}

// ================================
// 提交作業
// ================================

/**
 * 提交作業
 * @param {string} essayId - 論文 ID
 * @returns {Promise<Object>} - 提交結果
 */
export async function submitEssay(essayId) {
    if (!AppState.supabase || !AppState.currentUser) {
        throw new Error('未登錄或 Supabase 未初始化');
    }
    
    console.log('📤 開始提交作業:', essayId);
    
    try {
        const { data, error } = await AppState.supabase
            .from('essays')
            .update({
                status: 'submitted',
                submitted_at: new Date().toISOString()
            })
            .eq('id', essayId)
            .select()
            .single();
            
        if (error) {
            throw new Error(`提交失敗: ${error.message}`);
        }
        
        console.log('✅ 作業提交成功');
        
        return {
            success: true,
            essay: data
        };
        
    } catch (error) {
        console.error('❌ 提交作業失敗:', error);
        throw error;
    }
}

// ================================
// 導出
// ================================

// StorageState 已在文件開頭導出（第 16 行），無需重複導出

