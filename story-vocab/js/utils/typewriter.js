/**
 * 打字机效果模块
 * 提供文本逐字显示动画
 */

/**
 * 打字机效果显示文本
 * @param {HTMLElement} element - 要显示文本的 DOM 元素
 * @param {string} text - 要显示的文本内容
 * @param {number} delay - 每个字符的延迟时间（毫秒），默认 50ms
 * @returns {Promise<void>}
 */
export async function typewriterEffect(element, text, delay = 50) {
    if (!element || !text) {
        console.warn('Typewriter effect: invalid element or text');
        return;
    }
    
    element.innerHTML = '';
    const storyDisplay = document.getElementById('story-display');
    
    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        const span = document.createElement('span');
        span.className = 'typing-char';
        span.textContent = char;
        element.appendChild(span);
        
        // 每显示几个字符就滚动一次
        if (i % 5 === 0 && storyDisplay) {
            storyDisplay.scrollTop = storyDisplay.scrollHeight;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // 最后确保滚动到底部
    if (storyDisplay) {
        storyDisplay.scrollTop = storyDisplay.scrollHeight;
    }
}

