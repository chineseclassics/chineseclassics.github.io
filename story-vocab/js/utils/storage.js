/**
 * LocalStorage 封装模块
 * 提供数据持久化功能
 */

/**
 * 获取生词本数据
 * @returns {Array} 生词本数组
 */
export function getWordbook() {
    try {
        return JSON.parse(localStorage.getItem('story_wordbook') || '[]');
    } catch (error) {
        console.error('获取生词本失败:', error);
        return [];
    }
}

/**
 * 保存生词本数据
 * @param {Array} wordbook - 生词本数组
 */
export function saveWordbook(wordbook) {
    try {
        localStorage.setItem('story_wordbook', JSON.stringify(wordbook));
    } catch (error) {
        console.error('保存生词本失败:', error);
    }
}

/**
 * 获取完成的故事列表
 * @returns {Array} 故事数组
 */
export function getCompletedStories() {
    try {
        return JSON.parse(localStorage.getItem('completed_stories') || '[]');
    } catch (error) {
        console.error('获取故事列表失败:', error);
        return [];
    }
}

/**
 * 保存完成的故事
 * @param {Object} story - 故事数据
 */
export function saveCompletedStory(story) {
    try {
        const stories = getCompletedStories();
        stories.push(story);
        localStorage.setItem('completed_stories', JSON.stringify(stories));
    } catch (error) {
        console.error('保存故事失败:', error);
    }
}

/**
 * 获取设置项
 * @param {string} key - 设置键名
 * @param {*} defaultValue - 默认值
 * @returns {*} 设置值
 */
export function getSetting(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
    } catch (error) {
        console.error(`获取设置 ${key} 失败:`, error);
        return defaultValue;
    }
}

/**
 * 保存设置项
 * @param {string} key - 设置键名
 * @param {*} value - 设置值
 */
export function saveSetting(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error(`保存设置 ${key} 失败:`, error);
    }
}

/**
 * 更新侧边栏统计信息
 */
export function updateSidebarStats() {
    // 更新生词本数量
    const wordbook = getWordbook();
    const wordbookCount = wordbook.length;
    
    const wordbookCountSidebar = document.getElementById('wordbook-count-sidebar');
    const statWords = document.getElementById('stat-words');
    if (wordbookCountSidebar) wordbookCountSidebar.textContent = wordbookCount;
    if (statWords) statWords.textContent = wordbookCount;
    
    // 更新故事数量
    const completedStories = getCompletedStories();
    const statStories = document.getElementById('stat-stories');
    const storiesCount = document.getElementById('stories-count');
    if (statStories) statStories.textContent = completedStories.length;
    if (storiesCount) storiesCount.textContent = completedStories.length;
    
    // 更新积分
    const userPoints = getSetting('user_points', 0);
    const statPoints = document.getElementById('stat-points');
    if (statPoints) statPoints.textContent = userPoints;
}

