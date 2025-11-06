// iframe 環境優化工具
export function optimizeForIframe() {
    // 檢測是否在iframe中
    const inIframe = window.parent !== window;

    if (inIframe) {
        console.log('檢測到iframe環境，開始優化...');

        // 添加iframe優化class
        document.body.classList.add('iframe-optimized');

        // 確保body可以自然滾動
        const updateBodySize = () => {
            const body = document.body;
            const width = window.innerWidth;

            // 設置寬度但允許高度自然延展
            body.style.width = width + 'px';
            body.style.maxWidth = width + 'px';
            body.style.overflow = 'auto !important'; // 強制允許滾動
            body.style.overflowX = 'hidden !important'; // 防止水平滾動

            // 確保沒有多餘的邊距問題
            body.style.boxSizing = 'border-box';

            // 移除任何高度限制，允許自然延展
            body.style.height = 'auto !important';
            body.style.maxHeight = 'none !important';
            body.style.minHeight = '100vh'; // 至少填滿視口

            // 添加底部間距，防止內容被遮擋
            body.style.paddingBottom = '20px';

            // 移動端滾動優化
            body.style.webkitOverflowScrolling = 'touch';
            body.style.scrollBehavior = 'smooth';

            // 找到主容器並強制修復
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                appContainer.style.height = 'auto !important';
                appContainer.style.maxHeight = 'none !important';
                appContainer.style.minHeight = 'auto !important';
                console.log('已修復app-container高度限制');
            }

            console.log('iframe優化完成');
        };

        // 初始設置
        updateBodySize();

        // 監聽窗口大小變化
        window.addEventListener('resize', updateBodySize);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateBodySize, 100);
        });

        // DOM載入後再次執行以確保所有元素都被正確設置
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateBodySize);
        } else {
            // 延遲執行確保所有CSS都已載入
            setTimeout(updateBodySize, 500);
        }
    }
}

