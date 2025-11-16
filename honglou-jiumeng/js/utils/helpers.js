/**
 * 工具函數
 * 提供各種輔助函數
 */

/**
 * 獲取建築狀態文本
 * @param {number} condition - 建築狀態值（0-1）
 * @returns {string} 狀態文本
 */
export function getConditionText(condition) {
  if (condition > 0.8) return '完好';
  if (condition > 0.5) return '略有破損';
  if (condition > 0.2) return '明顯破損';
  return '幾近坍塌';
}

/**
 * 檢測暗黑模式
 */
export function detectDarkMode() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      if (event.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  } catch (e) {
    console.log("無法設置暗黑模式:", e);
  }
}

