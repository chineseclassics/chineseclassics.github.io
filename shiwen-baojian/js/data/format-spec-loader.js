/**
 * 時文寶鑑 - 格式規範加載器
 * 
 * 功能：
 * - 加載論文格式規範 JSON
 * - 緩存已加載的規範
 * - 提供給 AI 反饋系統使用
 */

// ================================
// 格式規範緩存
// ================================

let cachedFormatSpec = null;

/**
 * 加載紅樓夢論文格式規範
 * @returns {Promise<object>} 格式規範對象
 */
export async function loadHonglouFormatSpec() {
    // 如果已緩存，直接返回
    if (cachedFormatSpec) {
        console.log('✅ 使用緩存的格式規範');
        return cachedFormatSpec;
    }
    
    console.log('📥 加載論文格式規範...');
    
    try {
        // 加載 JSON 文件
        const response = await fetch('/shiwen-baojian/assets/data/honglou-essay-format.json');
        
        if (!response.ok) {
            throw new Error(`加載格式規範失敗: ${response.status}`);
        }
        
        const formatSpec = await response.json();
        
        // 緩存結果
        cachedFormatSpec = formatSpec;
        
        console.log('✅ 格式規範加載成功:', formatSpec.metadata?.name);
        
        return formatSpec;
        
    } catch (error) {
        console.error('❌ 加載格式規範失敗:', error);
        
        // 返回 null，讓 Edge Function 使用默認規範
        return null;
    }
}

/**
 * 清除緩存（用於重新加載）
 */
export function clearFormatSpecCache() {
    cachedFormatSpec = null;
    console.log('🔄 格式規範緩存已清除');
}

// ================================
// 導出
// ================================

export { cachedFormatSpec };

