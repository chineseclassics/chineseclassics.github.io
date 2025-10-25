/**
 * 論文內容渲染工具
 * 
 * 將存儲於資料庫中的結構化內容轉換為 HTML，供老師與學生端共用。
 */

/**
 * 將論文內容轉為 HTML 字串
 * @param {Object} essay - 作業或練筆資料
 * @param {string|Object} [essay.content_json] - 結構化內容（可能為 JSON 字串）
 * @param {Array} [essay.paragraphs] - 老資料格式的段落陣列
 * @returns {string} HTML 字串
 */
export function renderEssayHtml(essay) {
  if (!essay) {
    return placeholderHtml();
  }

  const contentBlock = normalizeEssayContent(essay);
  if (contentBlock) {
    return buildHtmlFromStructuredContent(contentBlock);
  }

  if (Array.isArray(essay.paragraphs) && essay.paragraphs.length > 0) {
    return buildHtmlFromLegacyParagraphs(essay.paragraphs);
  }

  return placeholderHtml();
}

/**
 * 嘗試解析 `content_json`
 */
function normalizeEssayContent(essay) {
  if (!essay.content_json) {
    return null;
  }

  try {
    return typeof essay.content_json === 'string'
      ? JSON.parse(essay.content_json)
      : essay.content_json;
  } catch (error) {
    console.error('❌ 解析 content_json 失敗:', error);
    return null;
  }
}

/**
 * 依據結構化內容組裝 HTML
 */
function buildHtmlFromStructuredContent(content) {
  let html = '';

  if (content.introduction) {
    html += `
      <section class="paragraph-block">
        <h4 class="text-lg font-semibold text-gray-800 mb-2">
          <i class="fas fa-quote-left mr-2" style="color: var(--primary-500);"></i>引言
        </h4>
        <div class="paragraph-content">${content.introduction}</div>
      </section>
    `;
  }

  if (Array.isArray(content.arguments) && content.arguments.length > 0) {
    content.arguments.forEach((arg, index) => {
      const titleSuffix = arg.title ? `：${arg.title}` : '';
      html += `
        <section class="paragraph-block argument-section">
          <h4 class="text-lg font-semibold text-gray-800 mb-2">
            <i class="fas fa-lightbulb mr-2" style="color: var(--warning-500);"></i>
            分論點 ${index + 1}${titleSuffix}
          </h4>
          ${renderArgumentParagraphs(arg.paragraphs)}
        </section>
      `;
    });
  }

  if (content.conclusion) {
    html += `
      <section class="paragraph-block">
        <h4 class="text-lg font-semibold text-gray-800 mb-2">
          <i class="fas fa-flag-checkered mr-2" style="color: var(--success-500);"></i>結論
        </h4>
        <div class="paragraph-content">${content.conclusion}</div>
      </section>
    `;
  }

  return html || placeholderHtml();
}

/**
 * 轉換舊格式段落資料
 */
function buildHtmlFromLegacyParagraphs(paragraphs) {
  const sorted = [...paragraphs].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const html = sorted.map((paragraph, index) => {
    const typeLabel = resolveParagraphLabel(paragraph, index);
    const contentHtml = extractParagraphContent(paragraph);

    return `
      <section class="paragraph-block">
        <h4 class="text-lg font-semibold text-gray-800 mb-2">${typeLabel}</h4>
        <div class="paragraph-content">${contentHtml}</div>
      </section>
    `;
  }).join('');

  return html || placeholderHtml();
}

/**
 * 渲染 argument 內的子段落
 */
function renderArgumentParagraphs(paragraphs = []) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return `
      <div class="paragraph-content sub-paragraph empty">
        <div class="paragraph-label">尚未撰寫段落</div>
      </div>
    `;
  }

  return paragraphs.map((para, idx) => `
    <div class="paragraph-content sub-paragraph">
      <div class="paragraph-label">段落 ${idx + 1}</div>
      ${para.content || ''}
    </div>
  `).join('');
}

/**
 * 解析舊資料結構中的段落內容
 */
function extractParagraphContent(paragraph) {
  if (!paragraph) return '';

  if (paragraph.content && typeof paragraph.content === 'object') {
    if (paragraph.content.html) {
      return paragraph.content.html;
    }
    return JSON.stringify(paragraph.content);
  }

  return paragraph.content || '';
}

/**
 * 決定段落標題（舊資料格式）
 */
function resolveParagraphLabel(paragraph, index) {
  const type = paragraph.paragraph_type;
  if (type === 'introduction') return '引言';
  if (type === 'conclusion') return '結論';
  if (type === 'body') return `正文段落 ${index + 1}`;
  return paragraph.title || `段落 ${index + 1}`;
}

/**
 * 預設空狀態
 */
function placeholderHtml() {
  return `
    <p class="text-gray-500 italic">
      尚未撰寫任何內容。
    </p>
  `;
}
