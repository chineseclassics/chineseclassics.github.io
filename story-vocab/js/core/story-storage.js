/**
 * 故事存储管理模块
 * 基于 localStorage 实现故事的本地保存和管理
 */

const STORAGE_KEY = 'story_vocab_stories';

/**
 * 获取所有故事
 * @returns {Array} 故事列表（按更新时间倒序）
 */
export function getStories() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        
        const stories = JSON.parse(data);
        // 按更新时间倒序排列
        return stories.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
        console.error('❌ 读取故事数据失败:', error);
        return [];
    }
}

/**
 * 生成默认故事标题
 * @returns {string} 故事标题（如"故事一"、"故事二"）
 */
export function generateDefaultTitle() {
    const stories = getStories();
    const count = stories.length + 1;
    
    const numberMap = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                       '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
    
    if (count <= 20) {
        return `故事${numberMap[count]}`;
    } else {
        return `故事${count}`;
    }
}

/**
 * 生成唯一故事ID
 * @returns {string} 故事ID
 */
function generateStoryId() {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存故事
 * @param {Object} storyData - 故事数据
 * @returns {Object} 保存后的完整故事对象
 */
export function saveStory(storyData) {
    try {
        const stories = getStories();
        
        // 如果是新故事，生成ID和时间戳
        if (!storyData.id) {
            storyData.id = generateStoryId();
            storyData.createdAt = new Date().toISOString();
        }
        
        // 更新时间戳
        storyData.updatedAt = new Date().toISOString();
        
        // 如果已完成，设置完成时间
        if (storyData.status === 'completed' && !storyData.completedAt) {
            storyData.completedAt = new Date().toISOString();
        }
        
        // 查找是否已存在
        const existingIndex = stories.findIndex(s => s.id === storyData.id);
        
        if (existingIndex >= 0) {
            // 更新现有故事
            stories[existingIndex] = { ...stories[existingIndex], ...storyData };
        } else {
            // 添加新故事
            stories.push(storyData);
        }
        
        // 保存到 localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
        
        console.log('✅ 故事已保存:', storyData.id);
        return storyData;
    } catch (error) {
        console.error('❌ 保存故事失败:', error);
        throw error;
    }
}

/**
 * 获取单个故事
 * @param {string} storyId - 故事ID
 * @returns {Object|null} 故事对象或null
 */
export function getStory(storyId) {
    const stories = getStories();
    return stories.find(s => s.id === storyId) || null;
}

/**
 * 更新故事
 * @param {string} storyId - 故事ID
 * @param {Object} updates - 要更新的字段
 * @returns {Object|null} 更新后的故事对象
 */
export function updateStory(storyId, updates) {
    try {
        const stories = getStories();
        const index = stories.findIndex(s => s.id === storyId);
        
        if (index === -1) {
            console.warn('⚠️ 故事不存在:', storyId);
            return null;
        }
        
        // 合并更新
        stories[index] = {
            ...stories[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // 如果状态改为完成，添加完成时间
        if (updates.status === 'completed' && !stories[index].completedAt) {
            stories[index].completedAt = new Date().toISOString();
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
        
        console.log('✅ 故事已更新:', storyId);
        return stories[index];
    } catch (error) {
        console.error('❌ 更新故事失败:', error);
        throw error;
    }
}

/**
 * 删除故事
 * @param {string} storyId - 故事ID
 * @returns {boolean} 是否成功删除
 */
export function deleteStory(storyId) {
    try {
        const stories = getStories();
        const filtered = stories.filter(s => s.id !== storyId);
        
        if (filtered.length === stories.length) {
            console.warn('⚠️ 故事不存在:', storyId);
            return false;
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        
        console.log('✅ 故事已删除:', storyId);
        return true;
    } catch (error) {
        console.error('❌ 删除故事失败:', error);
        throw error;
    }
}

/**
 * 获取故事统计信息
 * @returns {Object} 统计数据
 */
export function getStoriesStats() {
    const stories = getStories();
    
    return {
        total: stories.length,
        completed: stories.filter(s => s.status === 'completed').length,
        inProgress: stories.filter(s => s.status === 'in_progress').length,
        totalWords: stories.reduce((sum, s) => sum + (s.usedWords?.length || 0), 0)
    };
}

/**
 * 格式化相对时间
 * @param {string} timestamp - ISO时间戳
 * @returns {string} 友好的时间显示
 */
export function formatRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return '刚刚';
    } else if (diffMin < 60) {
        return `${diffMin}分钟前`;
    } else if (diffHour < 24) {
        return `${diffHour}小时前`;
    } else if (diffDay === 1) {
        return '昨天';
    } else if (diffDay === 2) {
        return '前天';
    } else if (diffDay < 7) {
        return `${diffDay}天前`;
    } else {
        // 超过7天显示日期
        return time.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

/**
 * 清空所有故事（谨慎使用）
 */
export function clearAllStories() {
    if (confirm('確定要刪除所有故事嗎？此操作無法撤銷！')) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ 所有故事已清空');
        return true;
    }
    return false;
}

