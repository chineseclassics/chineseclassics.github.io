/**
 * 文房之寶 - 小工具集合
 * 首發：哈佛引用格式工具（模態彈窗）
 * 
 * 設計原則：
 * - 純前端、即插即用
 * - 事件委派：支援模板動態插入後的按鈕
 * - 無框架依賴；樣式使用 Tailwind + 現有設計系統
 * - 註釋使用繁體中文
 */

// ================================
// 工具：哈佛引用格式生成
// ================================

/**
 * 生成哈佛引用格式字串（簡化版）
 * - 支援 article | book | web 三種類型
 * - 字體斜體：可選（對容器名稱應用）
 *
 * @param {Object} data
 * @returns {string}
 */
function generateHarvardCitation(data) {
  // 取值並去除首尾空白
  const type = (data.type || 'article').trim();
  const author = (data.author || '').trim();
  const year = (data.year || '').trim();
  const title = (data.title || '').trim();
  const container = (data.container || '').trim(); // 期刊 / 書名 / 網站
  const volume = (data.volume || '').trim();
  const issue = (data.issue || '').trim();
  const pages = (data.pages || '').trim();
  const publisher = (data.publisher || '').trim();
  const pubplace = (data.pubplace || '').trim();
  const doi = (data.doi || '').trim();
  const italics = !!data.italics;

  const ital = (s) => italics && s ? `<i>${escapeHtml(s)}</i>` : escapeHtml(s);

  // 基本欄位：作者與年份
  const authorYear = [author ? escapeHtml(author) : '作者不詳', year ? `(${escapeHtml(year)}).` : '(n.d.).'].join(' ');

  // 標題（句點結尾）
  const titlePart = title ? `${escapeHtml(title)}.` : '';

  // 連 DOI/URL（可選，前面自動加空格）
  const tail = doi ? ` ${escapeHtml(doi)}` : '';

  if (type === 'article') {
    // Chen, L. (2024). Title. Journal, 12(3), 123-145. https://doi.org/...
    const volIssue = volume ? `${escapeHtml(volume)}${issue ? `(${escapeHtml(issue)})` : ''}` : '';
    const pagesPart = pages ? `, ${escapeHtml(pages)}` : '';
    const containerPart = container ? `${ital(container)}, ${volIssue}${pagesPart}.` : '';
    return `${authorYear} ${titlePart} ${containerPart}${tail}`.replace(/\s+/g, ' ').trim();
  }

  if (type === 'book') {
    // Chen, L. (2024). Title. Oxford: OUP. https://...
    const pubPart = publisher ? (pubplace ? `${escapeHtml(pubplace)}: ${escapeHtml(publisher)}.` : `${escapeHtml(publisher)}.`) : '';
    const containerPart = container ? `${ital(container)}.` : '';
    // 若填了書名，優先當作 container（書名）；否則用 publisher
    const mid = container ? containerPart : pubPart;
    return `${authorYear} ${titlePart} ${mid}${tail}`.replace(/\s+/g, ' ').trim();
  }

  // web（簡化）：Author (Year). Title. Website. URL
  const websitePart = container ? `${ital(container)}.` : '';
  return `${authorYear} ${titlePart} ${websitePart}${tail}`.replace(/\s+/g, ' ').trim();
}

/**
 * 簡單轉義 HTML（避免 XSS）
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 將輸入欄位讀取為資料物件
 */
function readFormData() {
  return {
    type: document.getElementById('harv-type')?.value || 'article',
    author: document.getElementById('harv-author')?.value || '',
    year: document.getElementById('harv-year')?.value || '',
    title: document.getElementById('harv-title')?.value || '',
    container: document.getElementById('harv-container')?.value || '',
    volume: document.getElementById('harv-volume')?.value || '',
    issue: document.getElementById('harv-issue')?.value || '',
    pages: document.getElementById('harv-pages')?.value || '',
    publisher: document.getElementById('harv-publisher')?.value || '',
    pubplace: document.getElementById('harv-pubplace')?.value || '',
    doi: document.getElementById('harv-doi')?.value || '',
    italics: document.getElementById('harv-italics')?.checked ?? true,
  };
}

/**
 * 根據來源類型切換可見欄位與標籤
 */
function applyTypeVisibility() {
  const typeSel = document.getElementById('harv-type');
  const isArticle = typeSel?.value === 'article';
  const isBook = typeSel?.value === 'book';

  const articleFields = document.getElementById('harv-article-fields');
  const bookFields = document.getElementById('harv-book-fields');
  const containerLabel = document.getElementById('harv-container-label');

  if (articleFields) articleFields.classList.toggle('hidden', !isArticle);
  if (bookFields) bookFields.classList.toggle('hidden', !isBook);
  if (containerLabel) containerLabel.textContent = isArticle ? '期刊' : (isBook ? '書名' : '網站');
}

/**
 * 更新預覽區域
 */
function updatePreview() {
  const preview = document.getElementById('harv-preview');
  if (!preview) return;
  const html = generateHarvardCitation(readFormData());
  preview.innerHTML = html;
}

/**
 * 開啟/關閉模態框
 */
function openModal() {
  const modal = document.getElementById('harvard-citation-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  // 首次更新預覽
  applyTypeVisibility();
  updatePreview();

  // 綁定作者說明 Tooltip（避免重複創建問題，採用 try/catch）
  try {
    const help = document.getElementById('harv-author-help');
    if (help && window.tooltip && !help.__helpBound) {
      window.tooltip.bind(
        help,
        '格式：姓, 名首字母.；多位以分號分隔。\n示例：Chen, L.; Wang, H.',
        { type: 'info', position: 'top', trigger: 'both' }
      );
      help.__helpBound = true;
    }
  } catch (_) {}
}

function closeModal() {
  const modal = document.getElementById('harvard-citation-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

/**
 * 綁定整體事件（事件委派）
 */
function bindEventsOnce() {
  if (window.__wenfangToolsBound) return;
  window.__wenfangToolsBound = true;

  // 開啟按鈕（來源於模板克隆；使用委派）
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#open-harvard-tool-btn');
    if (btn) {
      e.preventDefault();
      openModal();
    }
    // 關閉：遮罩或帶 data-modal-close 的任何元素
    const closer = e.target.closest('[data-modal-close="true"]');
    if (closer) {
      e.preventDefault();
      closeModal();
    }
  });

  // 表單輸入更新預覽
  document.addEventListener('input', (e) => {
    if (e.target && (
      e.target.id.startsWith('harv-')
    )) {
      if (e.target.id === 'harv-type') {
        applyTypeVisibility();
      }
      updatePreview();
    }
  });

  // ESC 關閉模態
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('harvard-citation-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    }
  });

  // 點擊複製
  document.addEventListener('click', async (e) => {
    if (e.target && (e.target.id === 'harv-copy' || e.target.closest('#harv-copy'))) {
      e.preventDefault();
      const tmp = document.createElement('div');
      tmp.innerHTML = generateHarvardCitation(readFormData());
      const text = tmp.textContent || tmp.innerText || '';
      try {
        await navigator.clipboard.writeText(text);
        if (window.toast && typeof window.toast.success === 'function') {
          window.toast.success('已複製到剪貼簿');
        }
      } catch (err) {
        console.error('複製失敗', err);
        if (window.toast && typeof window.toast.error === 'function') {
          window.toast.error('複製失敗，請手動選取');
        }
      }
    }
  });

  // 點擊重置
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'harv-reset' || e.target.closest('#harv-reset'))) {
      e.preventDefault();
      const ids = ['harv-author','harv-year','harv-title','harv-container','harv-volume','harv-issue','harv-pages','harv-publisher','harv-pubplace','harv-doi'];
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const ital = document.getElementById('harv-italics');
      if (ital) ital.checked = true;
      updatePreview();
    }
  });
}

// 初始化
(function init() {
  try {
    bindEventsOnce();
    // 若頁面載入在編輯器之外也不報錯
    console.log('🧰 文房之寶工具已就緒（哈佛引用）');
  } catch (err) {
    console.error('文房之寶初始化錯誤', err);
  }
})();

export { generateHarvardCitation };
