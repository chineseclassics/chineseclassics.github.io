/**
 * 故事卡片UI组件模块
 * 处理故事列表的显示和交互
 */

import { getStories, getStoriesStats, formatRelativeTime, updateStory, deleteStory } from '../core/story-storage.js';
import { showToast } from '../utils/toast.js';
import { gameState } from '../core/game-state.js';
import { getSupabase } from '../supabase-client.js';

/**
 * 获取主题显示名称
 */
function getThemeDisplayName(theme) {
    const themeMap = {
        'nature': '🌳 自然探索',
        'campus': '🏫 校園生活',
        'fantasy': '✨ 奇幻冒險',
        'scifi': '🚀 科幻未來'
    };
    return themeMap[theme] || theme;
}

/**
 * 获取级别显示名称
 */
function getLevelDisplayName(level) {
    const levelMap = {
        'L1': '低年級',
        'L2': '中年級',
        'L3': '初中',
        'L4': '高中',
        'L5': '大學+'
    };
    return levelMap[level] || level;
}

/**
 * 创建故事卡片HTML
 * @param {Object} story - 故事对象
 * @returns {string} HTML字符串
 */
export function createStoryCard(story) {
    const isCompleted = story.status === 'completed';
    const statusClass = isCompleted ? 'completed' : 'in-progress';
    const statusText = isCompleted 
        ? `✓ 已完成` 
        : `進度 ${story.currentTurn || 0}/${story.maxTurns || 8}`;
    
    // 获取适当的时间戳
    const timeToShow = isCompleted ? story.completedAt : story.updatedAt;
    const timeLabel = isCompleted ? '完成於' : '更新於';
    const relativeTime = formatRelativeTime(timeToShow);
    
    // 故事预览（前100字）
    const fullText = story.storyHistory?.map(h => h.sentence).join('') || '';
    const preview = fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText;
    
    const wordsCount = story.usedWords?.length || 0;
    
    return `
        <div class="story-card ${statusClass}" data-story-id="${story.id}">
            <div class="story-card-header">
                <div class="story-title-container">
                    <h3 class="story-card-title" onclick="event.stopPropagation(); startRenameStory('${story.id}')">${story.title}</h3>
                    <button class="btn-rename-inline" onclick="event.stopPropagation(); startRenameStory('${story.id}')" title="重命名">
                        ✏️
                    </button>
                </div>
                <div class="story-status-badge ${statusClass}">
                    ${statusText}
                </div>
            </div>
            
            <div class="story-card-meta">
                <span class="meta-item">${getThemeDisplayName(story.theme)}</span>
                <span class="meta-item">等級 ${getLevelDisplayName(story.level)}</span>
                <span class="meta-item">📝 ${wordsCount} 個詞</span>
            </div>
            
            <div class="story-card-preview">
                ${preview || '暫無內容'}
            </div>
            
            <div class="story-card-footer">
                <span class="story-time">${timeLabel} ${relativeTime}</span>
                <div class="story-actions">
                    <button class="btn-action btn-view" onclick="event.stopPropagation(); showStoryDetail('${story.id}')" title="查看完整故事">
                        👁️ 查看
                    </button>
                    ${!isCompleted ? `
                        <button class="btn-action btn-continue" onclick="event.stopPropagation(); continueStory('${story.id}')" title="繼續創作">
                            ✍️ 繼續
                        </button>
                    ` : ''}
                    <button class="btn-action btn-delete" onclick="event.stopPropagation(); confirmDeleteStory('${story.id}')" title="刪除故事">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染故事列表
 * @param {Array} stories - 故事数组
 * @param {string} containerId - 容器ID
 */
export function renderStoryList(stories, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (stories.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = stories.map(story => createStoryCard(story)).join('');
}

/**
 * 加载并显示所有故事
 */
export async function loadMyStoriesScreen() {
    // 🔥 從 Supabase 加載雲端故事數據
    let stories = [];
    
    if (gameState && gameState.userId) {
        try {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase 未初始化');
            
            const { data, error } = await supabase
                .from('story_sessions')
                .select('*')
                .eq('user_id', gameState.userId)
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            
            // 轉換為本地格式
            stories = (data || []).map(session => ({
                id: session.id,
                title: `故事 - ${session.story_theme}`, // 可以後續改進
                status: session.status,
                level: session.user_level || 'L2',
                theme: session.story_theme,
                maxTurns: session.max_rounds || 8,
                currentTurn: session.current_round || 0,
                storyHistory: session.conversation_history || [],
                usedWords: [], // 從 conversation_history 提取
                sessionId: session.id,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
                completedAt: session.completed_at
            }));
            
            console.log(`✅ 從雲端加載 ${stories.length} 個故事`);
        } catch (error) {
            console.error('⚠️ 從雲端加載故事失敗，使用本地數據:', error);
            // 降級到本地數據
            stories = getStories();
        }
    } else {
        // 未登入，使用本地數據
        stories = getStories();
    }
    
    // 計算統計數據
    const stats = {
        total: stories.length,
        completed: stories.filter(s => s.status === 'completed').length,
        inProgress: stories.filter(s => s.status === 'in_progress').length,
        totalWords: stories.reduce((sum, s) => sum + (s.usedWords?.length || 0), 0)
    };
    
    // 更新统计数据
    document.getElementById('total-stories-count').textContent = stats.total;
    document.getElementById('completed-stories-count').textContent = stats.completed;
    document.getElementById('in-progress-stories-count').textContent = stats.inProgress;
    document.getElementById('total-words-count').textContent = stats.totalWords;
    
    // 分类故事
    const completedStories = stories.filter(s => s.status === 'completed');
    const inProgressStories = stories.filter(s => s.status === 'in_progress');
    
    // 更新计数标签
    document.getElementById('completed-count-label').textContent = `${completedStories.length} 個故事`;
    document.getElementById('in-progress-count-label').textContent = `${inProgressStories.length} 個故事`;
    
    // 渲染列表
    renderStoryList(completedStories, 'completed-stories-list');
    renderStoryList(inProgressStories, 'in-progress-stories-list');
    
    // 显示/隐藏空状态
    const completedEmpty = document.getElementById('completed-empty');
    const inProgressEmpty = document.getElementById('in-progress-empty');
    const completedList = document.getElementById('completed-stories-list');
    const inProgressList = document.getElementById('in-progress-stories-list');
    
    if (completedEmpty && completedList) {
        completedEmpty.style.display = completedStories.length === 0 ? 'block' : 'none';
        completedList.style.display = completedStories.length === 0 ? 'none' : 'grid';
    }
    
    if (inProgressEmpty && inProgressList) {
        inProgressEmpty.style.display = inProgressStories.length === 0 ? 'block' : 'none';
        inProgressList.style.display = inProgressStories.length === 0 ? 'none' : 'grid';
    }
    
    // 🔥 更新侧边栏的故事数量统计
    const storiesCountBadge = document.getElementById('stories-count');
    const statStories = document.getElementById('stat-stories');
    if (storiesCountBadge) storiesCountBadge.textContent = stats.completed;
    if (statStories) statStories.textContent = stats.completed;
}

/**
 * 开始重命名故事
 * @param {string} storyId - 故事ID
 */
window.startRenameStory = function(storyId) {
    const stories = getStories();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    
    const newTitle = prompt('請輸入新的故事標題：', story.title);
    
    if (newTitle && newTitle.trim() !== '' && newTitle !== story.title) {
        updateStory(storyId, { title: newTitle.trim() });
        loadMyStoriesScreen();
        showToast('✓ 故事標題已更新');
    }
};

/**
 * 显示故事详情
 * @param {string} storyId - 故事ID
 */
window.showStoryDetail = function(storyId) {
    const stories = getStories();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    
    // 填充模态框内容
    document.getElementById('detail-story-title').textContent = story.title;
    document.getElementById('detail-story-theme').textContent = getThemeDisplayName(story.theme);
    document.getElementById('detail-story-level').textContent = `等級 ${getLevelDisplayName(story.level)}`;
    
    // 时间信息
    const timeToShow = story.status === 'completed' ? story.completedAt : story.updatedAt;
    const timeLabel = story.status === 'completed' ? '完成於' : '更新於';
    document.getElementById('detail-story-time').textContent = 
        `${timeLabel} ${formatRelativeTime(timeToShow)} · 創建於 ${formatRelativeTime(story.createdAt)}`;
    
    // 完整故事文本
    const fullText = story.storyHistory?.map(h => h.sentence).join('') || '暫無內容';
    document.getElementById('detail-story-text').textContent = fullText;
    
    // 使用的词汇
    const wordsCount = story.usedWords?.length || 0;
    document.getElementById('detail-words-count').textContent = wordsCount;
    
    const wordsList = document.getElementById('detail-words-list');
    if (story.usedWords && story.usedWords.length > 0) {
        wordsList.innerHTML = story.usedWords
            .map(word => `<span class="word-tag">${word.word || word}</span>`)
            .join('');
    } else {
        wordsList.innerHTML = '<p class="no-words">暫無詞彙記錄</p>';
    }
    
    // 显示模态框
    const modal = document.getElementById('story-detail-modal');
    if (modal) {
        modal.classList.add('active');
    }
};

/**
 * 关闭故事详情模态框
 */
window.closeStoryDetailModal = function() {
    const modal = document.getElementById('story-detail-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

/**
 * 确认删除故事
 * @param {string} storyId - 故事ID
 */
window.confirmDeleteStory = function(storyId) {
    const stories = getStories();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    
    if (confirm(`確定要刪除故事「${story.title}」嗎？此操作無法撤銷！`)) {
        deleteStory(storyId);
        loadMyStoriesScreen();
        showToast('🗑️ 故事已刪除');
    }
};

/**
 * 继续创作故事（已在 app.js 中实现）
 * 这里是别名，指向实际的实现函数
 */
window.continueStory = function(storyId) {
    if (typeof window.continueStoryFromId === 'function') {
        window.continueStoryFromId(storyId);
    } else {
        console.error('continueStoryFromId 函数未定义');
        showToast('❌ 功能載入失敗，請刷新頁面');
    }
};

