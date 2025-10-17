// 在瀏覽器控制台運行此腳本來診斷問題

console.log('=== 詞表診斷開始 ===\n');

// 1. 檢查 gameState
console.log('1️⃣ gameState 狀態:');
console.log('   wordlistMode:', gameState.wordlistMode);
console.log('   wordlistId:', gameState.wordlistId);
console.log('   level2Tag:', gameState.level2Tag);
console.log('   level3Tag:', gameState.level3Tag);
console.log('');

// 2. 檢查用戶詞表偏好
console.log('2️⃣ 用戶詞表偏好:');
const prefs = gameState.user?.wordlist_preference;
if (prefs) {
    console.log('   default_mode:', prefs.default_mode);
    console.log('   default_wordlist_id:', prefs.default_wordlist_id);
    console.log('   wordlist_info:', prefs.wordlist_info);
    if (prefs.wordlist_info) {
        console.log('   - 詞表名稱:', prefs.wordlist_info.name);
        console.log('   - 標籤數量:', prefs.wordlist_info.tags?.length);
    }
} else {
    console.log('   ⚠️ 未找到詞表偏好');
}
console.log('');

// 3. 檢查 UI 元素
console.log('3️⃣ UI 元素狀態:');
const aiSection = document.getElementById('ai-mode-section');
const hierarchySection = document.getElementById('wordlist-hierarchy-section');
const level2Cards = document.getElementById('level-2-cards');
const level3Cards = document.getElementById('level-3-cards');

console.log('   ai-mode-section display:', aiSection?.style.display);
console.log('   wordlist-hierarchy-section display:', hierarchySection?.style.display);
console.log('   level-2-cards 存在:', !!level2Cards);
console.log('   level-2-cards innerHTML 長度:', level2Cards?.innerHTML.length);
console.log('');

// 4. 查詢數據庫中的詞表和標籤
console.log('4️⃣ 查詢數據庫...');
const supabase = (await import('./js/supabase-client.js')).getSupabase();

if (prefs?.default_wordlist_id) {
    // 查詢詞表
    const { data: wordlist, error: wlError } = await supabase
        .from('wordlists')
        .select('*')
        .eq('id', prefs.default_wordlist_id)
        .maybeSingle();
    
    if (wlError) {
        console.log('   ❌ 查詢詞表失敗:', wlError.message);
    } else if (wordlist) {
        console.log('   ✅ 詞表:', wordlist.name);
        console.log('   - ID:', wordlist.id);
        console.log('   - 類型:', wordlist.type);
        console.log('   - 總詞數:', wordlist.total_words);
        
        // 查詢標籤
        const { data: tags, error: tagError } = await supabase
            .from('wordlist_tags')
            .select('*')
            .eq('wordlist_id', wordlist.id)
            .order('tag_level')
            .order('sort_order');
        
        if (tagError) {
            console.log('   ❌ 查詢標籤失敗:', tagError.message);
        } else {
            console.log('   ✅ 標籤總數:', tags?.length || 0);
            const level2 = tags?.filter(t => t.tag_level === 2) || [];
            const level3 = tags?.filter(t => t.tag_level === 3) || [];
            console.log('   - 第二層級:', level2.length, '個');
            console.log('   - 第三層級:', level3.length, '個');
            
            if (level2.length > 0) {
                console.log('   - 第二層級標籤示例:', level2.slice(0, 3).map(t => t.tag_display_name).join(', '));
            }
        }
    } else {
        console.log('   ⚠️ 未找到詞表');
    }
} else {
    console.log('   ⚠️ 沒有選擇詞表');
}

console.log('\n=== 診斷完成 ===');
console.log('\n💡 建議操作:');
console.log('1. 如果標籤數量為 0，說明詞表沒有標籤，需要重新導入');
console.log('2. 如果 wordlist-hierarchy-section 的 display 不是 "block"，說明沒有正確顯示');
console.log('3. 如果 level-2-cards innerHTML 長度為 0，說明卡片沒有渲染');
