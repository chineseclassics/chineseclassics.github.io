/**
 * 批註通用工具（師生端共用）
 *
 * 說明：
 * - 提供文本節點遍歷、錨定文本查找、Range 高亮、浮動卡片定位與避讓等能力。
 * - 盡量保持與老師端 annotation-manager.js 的行為一致，避免雙邊邏輯飄移。
 */

// 顏色與尺寸令牌（與老師端一致）
const TOKENS = {
  HIGHLIGHT_BG: 'var(--warning-100)',
  HIGHLIGHT_BORDER: 'var(--warning-600)'
};

/**
 * 取得容器內所有文本節點
 * @param {Node|HTMLElement} container - 容器節點
 * @returns {Text[]} 文本節點陣列
 */
export function getTextNodes(container) {
  const root = container?.nodeType === Node.ELEMENT_NODE ? container : container?.parentElement;
  if (!root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    // 過濾純空白節點
    if (n.textContent && n.textContent.trim().length > 0) {
      nodes.push(n);
    }
  }
  return nodes;
}

/**
 * 以錨定文本在容器中查找 Range（從左至右第一個匹配）
 * @param {HTMLElement} container - 搜索容器
 * @param {string} anchorText - 錨定文本
 * @returns {Range|null} 找到則回傳 Range
 */
export function findTextByAnchor(container, anchorText) {
  if (!container || !anchorText) return null;
  const textNodes = getTextNodes(container);
  if (!textNodes.length) return null;

  const fullText = textNodes.map(n => n.textContent).join('');
  const searchIndex = fullText.indexOf(anchorText);
  if (searchIndex === -1) return null;

  const startPos = searchIndex;
  const endPos = searchIndex + anchorText.length;

  const locate = (charIndex) => {
    let acc = 0;
    for (let i = 0; i < textNodes.length; i++) {
      const len = textNodes[i].textContent.length;
      if (acc + len >= charIndex) {
        return { node: textNodes[i], offset: charIndex - acc };
      }
      acc += len;
    }
    const last = textNodes[textNodes.length - 1];
    return { node: last, offset: last.textContent.length };
  };

  try {
    const startNode = locate(startPos);
    const endNode = locate(endPos);
    const range = document.createRange();
    range.setStart(startNode.node, startNode.offset);
    range.setEnd(endNode.node, endNode.offset);
    return range;
  } catch (err) {
    console.warn('findTextByAnchor 失敗:', err);
    return null;
  }
}

/**
 * 以段落全域偏移重建 Range（容器需對應該段落）
 * @param {HTMLElement} container - 段落容器
 * @param {number} start - highlight_start
 * @param {number} end - highlight_end
 * @returns {Range|null}
 */
export function rangeFromOffsets(container, start, end) {
  const textNodes = getTextNodes(container);
  if (!textNodes.length) return null;
  const totalLength = textNodes.reduce((s, n) => s + n.textContent.length, 0);
  const s = Math.max(0, Math.min(start || 0, totalLength));
  const e = Math.max(0, Math.min(end || s, totalLength));

  const locate = (charIndex) => {
    let acc = 0;
    for (let i = 0; i < textNodes.length; i++) {
      const len = textNodes[i].textContent.length;
      if (acc + len >= charIndex) {
        return { node: textNodes[i], offset: charIndex - acc };
      }
      acc += len;
    }
    const last = textNodes[textNodes.length - 1];
    return { node: last, offset: last.textContent.length };
  };

  try {
    const startPos = locate(s);
    const endPos = locate(e);
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    return range;
  } catch (err) {
    console.warn('rangeFromOffsets 失敗:', err);
    return null;
  }
}

/**
 * 使用 Range 建立原文高亮元素
 * @param {string} annotationId - 批註 ID
 * @param {Range} range - 文字範圍
 * @returns {HTMLElement|null} 建立成功的高亮元素
 */
export function highlightWithRange(annotationId, range) {
  if (!range) return null;
  const highlight = document.createElement('span');
  highlight.className = 'annotation-highlight';
  highlight.dataset.annotationId = annotationId;
  highlight.style.cssText = `
    background-color: ${TOKENS.HIGHLIGHT_BG};
    border-bottom: 2px solid ${TOKENS.HIGHLIGHT_BORDER};
    cursor: pointer;
    position: relative;
    padding: 1px 2px;
    border-radius: 2px;
  `;

  try {
    range.surroundContents(highlight);
    return highlight;
  } catch (err) {
    // 跨節點回退：extract → wrap → insert
    try {
      const cloned = range.cloneRange();
      const frag = cloned.extractContents();
      highlight.appendChild(frag);
      range.insertNode(highlight);
      return highlight;
    } catch (e2) {
      console.warn('highlightWithRange 回退失敗:', e2);
      return null;
    }
  }
}

/**
 * 計算浮動批註的理想 top（對齊對應原文高亮）
 * @param {HTMLElement} floating - 浮動批註元素或輸入框
 * @param {HTMLElement} container - 滾動容器（如 .grading-content-wrapper）
 * @returns {number}
 */
export function getIdealTop(floating, container) {
  if (!container) return 0;
  // 以 container 為坐標參照，透過 DOMRect + scrollTop 計算更穩定
  const annotationId = floating.dataset?.annotationId;
  if (annotationId) {
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    // 編輯模式可能只有 overlay 區塊
    const overlay = document.querySelector(`.annotation-overlay-block[data-annotation-id="${annotationId}"]`);
    const target = highlight || overlay;
    if (target) {
      const wrapperRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const top = (targetRect.top - wrapperRect.top) + container.scrollTop;
      return Math.max(0, top);
    }
  }
  return parseInt(floating.style.top) || 0;
}

/**
 * 按原文順序與段內 offset 對所有批註進行避讓（不重疊）
 * @param {NodeList|HTMLElement[]} elements - 浮動批註元素集合
 * @param {Function} getPosition - 回傳 { paragraphOrderIndex, highlightStart }
 * @param {HTMLElement} container - 滾動容器
 */
export function adjustAllAnnotations(elements, getPosition, container) {
  const list = Array.from(elements || []);
  if (list.length === 0) return;
  const sorted = list.sort((a, b) => {
    const pa = getPosition(a) || { paragraphOrderIndex: 0, highlightStart: 0 };
    const pb = getPosition(b) || { paragraphOrderIndex: 0, highlightStart: 0 };
    if (pa.paragraphOrderIndex !== pb.paragraphOrderIndex) {
      return pa.paragraphOrderIndex - pb.paragraphOrderIndex;
    }
    return pa.highlightStart - pb.highlightStart;
  });

  let lastBottom = 0;
  sorted.forEach(el => {
    const idealTop = getIdealTop(el, container);
    const actualTop = Math.max(idealTop, lastBottom + 16); // 增加間距到16px
    el.style.top = actualTop + 'px';
    lastBottom = actualTop + (el.offsetHeight || 100);
  });
}

/**
 * 根據高亮元素生成最簡浮動卡片（標題＋時間＋內容）
 * 注意：樣式使用既有 .floating-annotation 規則
 * @param {object} data - 批註數據（需含 id, content, created_at, paragraph_order_index, highlight_start）
 * @returns {HTMLElement}
 */
export function createFloatingAnnotationElement(data) {
  const el = document.createElement('div');
  el.className = 'floating-annotation';
  el.dataset.annotationId = data.id;
  el.innerHTML = `
    <div class="annotation-header">
      <div class="annotation-avatar">✎</div>
      <div class="annotation-author">老師</div>
      <div class="annotation-time">${formatTime(data.created_at)}</div>
    </div>
    <div class="annotation-content">${escapeHtml(data.content)}</div>
  `;
  // 初始 top 延後由 adjustAllAnnotations 設定
  return el;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小時前`;
  return date.toLocaleDateString('zh-TW');
}

export default {
  getTextNodes,
  findTextByAnchor,
  rangeFromOffsets,
  highlightWithRange,
  getIdealTop,
  adjustAllAnnotations,
  createFloatingAnnotationElement
};

/**
 * 尋找段落容器（若頁面已加上 data-paragraph-id）
 * @param {string} paragraphId - 段落 ID（通常為資料庫 UUID）
 * @returns {HTMLElement|null}
 */
export function getParagraphElement(paragraphId) {
  if (!paragraphId) return null;
  return document.querySelector(`[data-paragraph-id="${paragraphId}"]`);
}

