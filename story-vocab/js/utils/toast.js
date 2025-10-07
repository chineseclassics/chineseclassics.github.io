/**
 * Toast 提示消息模块
 * 提供全局提示消息功能
 */

/**
 * 显示提示消息
 * @param {string} message - 要显示的消息内容
 * @param {number} duration - 显示时长（毫秒），默认 3000ms
 */
export function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Toast element not found');
        return;
    }
    
    toast.textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, duration);
}

