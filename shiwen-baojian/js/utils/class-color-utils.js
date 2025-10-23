/**
 * 班級配色工具
 * 根據班級ID生成配色類名和樣式
 */

/**
 * 根據班級ID獲取配色類名
 * @param {string} classId - 班級ID
 * @returns {string} 配色類名
 */
export function getClassColorClass(classId) {
  if (!classId) return 'class-1';
  
  // 使用班級ID的哈希值來確定配色
  const hash = hashString(classId);
  const colorIndex = (hash % 6) + 1; // 1-6 的配色
  
  return `class-${colorIndex}`;
}

/**
 * 根據班級ID獲取配色變量
 * @param {string} classId - 班級ID
 * @returns {Object} 配色變量對象
 */
export function getClassColorVars(classId) {
  const colorClass = getClassColorClass(classId);
  
  return {
    ribbon: `var(--${colorClass}-ribbon)`,
    background: `var(--${colorClass}-bg)`,
    border: `var(--${colorClass}-border)`,
    text: `var(--${colorClass}-text)`
  };
}

/**
 * 生成班級配色樣式
 * @param {string} classId - 班級ID
 * @param {string} className - 班級名稱
 * @returns {Object} 樣式對象
 */
export function getClassColorStyle(classId, className) {
  const vars = getClassColorVars(classId);
  
  return {
    '--ribbon-color': vars.ribbon,
    '--class-bg': vars.background,
    '--class-border': vars.border,
    '--class-text': vars.text
  };
}

/**
 * 簡單字符串哈希函數
 * @param {string} str - 輸入字符串
 * @returns {number} 哈希值
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 轉換為32位整數
  }
  return Math.abs(hash);
}

/**
 * 為班級生成一致的配色
 * 確保同一個班級ID總是返回相同的配色
 * @param {string} classId - 班級ID
 * @param {string} className - 班級名稱（可選，用於調試）
 * @returns {Object} 配色信息
 */
export function generateClassColor(classId, className = '') {
  const colorClass = getClassColorClass(classId);
  const vars = getClassColorVars(classId);
  
  return {
    classId,
    className,
    colorClass,
    ribbon: vars.ribbon,
    background: vars.background,
    border: vars.border,
    text: vars.text
  };
}
