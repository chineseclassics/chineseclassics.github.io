/**
 * 导航控制模块
 * 处理页面切换和侧边栏管理
 */

import { showToast } from '../utils/toast.js';
import { openWordbook } from '../features/wordbook.js';

/**
 * 页面切换
 * @param {string} screenId - 要显示的页面 ID
 */
export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

/**
 * 切换移动端侧边栏
 */
export function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (!sidebar || !overlay) return;
    
    if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('mobile-open');
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // 禁止背景滚动
        document.body.classList.add('sidebar-open');
    }
}

/**
 * 关闭移动端侧边栏
 */
export function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (!sidebar || !overlay) return;
    
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
    
    // 恢复背景滚动
    document.body.classList.remove('sidebar-open');
}

/**
 * 初始化侧边栏触摸滑动关闭功能
 */
export function initSidebarSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSidebarTouch = false;
    
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    sidebar.addEventListener('touchstart', function(e) {
        if (window.innerWidth <= 768 && this.classList.contains('mobile-open')) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSidebarTouch = true;
        }
    }, { passive: true });
    
    sidebar.addEventListener('touchmove', function(e) {
        if (!isSidebarTouch) return;
        
        const touchCurrentX = e.touches[0].clientX;
        const touchCurrentY = e.touches[0].clientY;
        const diffX = touchCurrentX - touchStartX;
        const diffY = touchCurrentY - touchStartY;
        
        // 判断是否为水平滑动（向左）
        if (Math.abs(diffX) > Math.abs(diffY) && diffX < -50) {
            closeMobileSidebar();
            isSidebarTouch = false;
        }
    }, { passive: true });
    
    sidebar.addEventListener('touchend', function() {
        isSidebarTouch = false;
    }, { passive: true });
}

/**
 * 导航到指定目标
 * @param {string} destination - 目标页面或功能
 */
export function navigateTo(destination) {
    console.log('導航到:', destination);
    
    // 移动端：关闭侧边栏
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
    
    // 移除所有菜单项的 active 状态
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 添加当前项的 active 状态（通过 data-destination 属性查找）
    const targetMenuItem = document.querySelector(`.menu-item[data-destination="${destination}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }
    
    // 根据目标执行不同操作
    switch(destination) {
        case 'new-story':
            // 返回开始页面
            showScreen('start-screen');
            break;
        
        case 'my-stories':
            showScreen('my-stories-screen');
            // 加载故事列表
            if (typeof window.loadMyStoriesScreen === 'function') {
                window.loadMyStoriesScreen();
            }
            break;
        
        case 'wordbook':
            openWordbook();
            break;
        
        case 'learning-report':
            showToast('學習報告功能即將推出！');
            break;
        
        case 'achievements':
            showToast('成就與徽章功能正在開發中，敬請期待！');
            break;
        
        case 'leaderboard':
            showToast('排行榜功能正在開發中，敬請期待！');
            break;
        
        case 'create-room':
            showToast('多人創建房間功能正在開發中，敬請期待！');
            break;
        
        case 'join-room':
            showToast('多人加入房間功能正在開發中，敬請期待！');
            break;
        
        case 'friends':
            showToast('好友列表功能正在開發中，敬請期待！');
            break;
        
        case 'settings':
            showScreen('settings-screen');
            // 加载设置（在 screens.js 中实现）
            break;
        
        default:
            console.log('未知的導航目標:', destination);
    }
}

/**
 * 登出功能
 */
export function handleLogout() {
    if (confirm('確定要退出登錄嗎？')) {
        // 清除本地数据
        localStorage.removeItem('story_wordbook');
        // 重置用户显示
        const userDisplayName = document.getElementById('user-display-name');
        const userLevelDisplay = document.getElementById('user-level-display');
        const statStories = document.getElementById('stat-stories');
        const statWords = document.getElementById('stat-words');
        const statPoints = document.getElementById('stat-points');
        
        if (userDisplayName) userDisplayName.textContent = '訪客';
        if (userLevelDisplay) userLevelDisplay.textContent = '等級 L2 · 初級';
        if (statStories) statStories.textContent = '0';
        if (statWords) statWords.textContent = '0';
        if (statPoints) statPoints.textContent = '0';
        
        // 返回开始页面
        showScreen('start-screen');
        showToast('已退出登錄');
    }
}

