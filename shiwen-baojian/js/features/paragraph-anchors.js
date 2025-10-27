/**
 * 段落錨點工具
 * - 將後端 paragraphs 映射到當前編輯器 DOM
 * - 為段落容器設置 data-paragraph-id 與 data-order-index
 * - 若存在 studentAnnotationViewer，嘗試觸發重新渲染
 */

/**
 * 套用段落錨點
 * @param {Array<{id:string, order_index:number, paragraph_type:string}>} paragraphs
 */
export async function applyParagraphAnchors(paragraphs) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return;

  const introEl = document.getElementById('intro');
  const conclEl = document.getElementById('conclusion');
  const bodyEls = Array.from(document.querySelectorAll('#arguments-container .paragraph-block'));

  const introList = paragraphs.filter(p => p.paragraph_type === 'introduction').sort((a,b)=>a.order_index-b.order_index);
  const bodyList  = paragraphs.filter(p => p.paragraph_type === 'body').sort((a,b)=>a.order_index-b.order_index);
  const conclList = paragraphs.filter(p => p.paragraph_type === 'conclusion').sort((a,b)=>a.order_index-b.order_index);

  // 引言
  if (introEl && introList.length > 0) {
    introEl.dataset.paragraphId = introList[0].id;
    introEl.dataset.orderIndex = introList[0].order_index;
  }

  // 正文（按順序映射到現有 DOM）
  const bodyCount = Math.min(bodyEls.length, bodyList.length);
  for (let i = 0; i < bodyCount; i++) {
    const el = bodyEls[i];
    const p = bodyList[i];
    el.dataset.paragraphId = p.id;
    el.dataset.orderIndex = p.order_index;
  }

  // 結論
  if (conclEl && conclList.length > 0) {
    conclEl.dataset.paragraphId = conclList[0].id;
    conclEl.dataset.orderIndex = conclList[0].order_index;
  }

  // 若有學生端批註查看器，嘗試重新渲染以使用更精準的段落容器
  try {
    const viewer = window.studentAnnotationViewer;
    if (viewer && typeof viewer.renderAll === 'function') {
      viewer.renderAll();
    }
  } catch (e) {
    // 忽略
  }
}

export default {
  applyParagraphAnchors
};

