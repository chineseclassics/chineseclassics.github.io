/**
 * CitationManager - 引用庫管理器（前端單例）
 * - 儲存並管理參考文獻（簡化 CSL 結構）
 * - 產生 citeKey、格式化文內引註（Harvard 簡化）
 * - 生成徵引書目（排序：作者→年份→標題）
 * - 持久化於 localStorage（鍵：pm-citations-store）
 *
 * 註：
 * - 為求落地，本文以簡化 Harvard 規則實作；未涵蓋所有邊界情況。
 * - 後續可對接 citation-js / CSL JSON 以提升準確度。
 */

const LS_KEY = 'pm-citations-store';

/**
 * @typedef {Object} ReferenceItem
 * @property {string} type       article|book|web
 * @property {string} author     例："Chen, L.; Wang, H."
 * @property {string} year       例："2024"
 * @property {string} title
 * @property {string} container  期刊名 / 書名 / 網站
 * @property {string} volume
 * @property {string} issue
 * @property {string} pages
 * @property {string} publisher
 * @property {string} pubplace
 * @property {string} doi        可放 URL
 * @property {string} key        唯一 citeKey（自動生成，如 chen-2024-title）
 */

class CitationManager {
  constructor() {
    /** @type {Map<string, ReferenceItem>} */
    this.store = new Map();
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(it => { if (it?.key) this.store.set(it.key, it); });
    } catch (_) {}
  }

  _save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(Array.from(this.store.values())));
    } catch (_) {}
  }

  /** 將輸入資料正規化，並生成 citeKey */
  normalize(input) {
    const it = Object.assign({
      type: 'article', author: '', year: '', title: '', container: '', volume: '', issue: '', pages: '', publisher: '', pubplace: '', doi: ''
    }, input || {});
    const key = this._genKey(it);
    it.key = key;
    return it;
  }

  _genKey(it) {
    const lastName = (it.author || '').split(';')[0] || '';
    const ln = lastName.split(',')[0]?.trim().toLowerCase() || 'anon';
    const year = (it.year || 'n.d.').toLowerCase().replace(/[^0-9a-z\.]+/g, '');
    const slug = (it.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'untitled';
    return `${ln}-${year}-${slug}`;
  }

  upsert(refInput) {
    const it = this.normalize(refInput);
    this.store.set(it.key, it);
    this._save();
    return it;
  }

  get(key) { return key ? this.store.get(key) || null : null; }
  list() { return Array.from(this.store.values()); }

  /**
   * 文內引註（Harvard 簡化）：
   * - 單作者：Surname Year（例：Chen 2024）
   * - 多作者：第一作者 Surname 等 Year（例：Chen 等 2024）
   * - 同年重名歧義：由外部傳入 suffix（a/b/c）→ Chen 2024a
   * - loc：頁碼/段落 如：p. 12 或 12-14（字串原樣拼接）
   */
  formatInText(key, { suffix = '', loc = '' } = {}) {
    const it = this.get(key);
    if (!it) return `(@${key})`;
    const first = (it.author || '').split(';')[0] || '';
    const surname = (first.split(',')[0] || '').trim() || 'Anon';
    const others = (it.author || '').split(';').length > 1 ? ' 等' : '';
    const y = (it.year || 'n.d.') + (suffix || '');
    const locPart = loc ? `, p. ${loc}` : '';
    return `${surname}${others} ${y}${locPart}`;
  }

  /** 生成徵引書目（Harvard 簡化） */
  formatBibliography(keys, { italics = true } = {}) {
    const entries = keys.map(k => this.get(k)).filter(Boolean);
    const bySortKey = (it) => {
      const author = (it.author || '').split(';')[0] || '';
      const surname = (author.split(',')[0] || '').trim().toLowerCase();
      const year = (it.year || 'n.d.').toLowerCase();
      const title = (it.title || '').toLowerCase();
      return `${surname}#${year}#${title}`;
    };
    const html = entries.sort((a, b) => bySortKey(a).localeCompare(bySortKey(b)))
      .map(it => this._formatHarvardFull(it, italics)).join('\n');
    return html;
  }

  _ital(s, italics) { return italics && s ? `<i>${this._esc(s)}</i>` : this._esc(s); }
  _esc(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

  _formatHarvardFull(it, italics = true) {
    const authorYear = `${this._esc(it.author || '作者不詳')} ${it.year ? `(${this._esc(it.year)}).` : '(n.d.).'}`;
    const title = it.title ? `${this._esc(it.title)}.` : '';
    const tail = it.doi ? ` ${this._esc(it.doi)}` : '';
    if (it.type === 'article') {
      const volIssue = it.volume ? `${this._esc(it.volume)}${it.issue ? `(${this._esc(it.issue)})` : ''}` : '';
      const pages = it.pages ? `, ${this._esc(it.pages)}` : '';
      const cont = it.container ? `${this._ital(it.container, italics)}, ${volIssue}${pages}.` : '';
      return `${authorYear} ${title} ${cont}${tail}`.replace(/\s+/g, ' ').trim();
    }
    if (it.type === 'book') {
      const cont = it.container ? `${this._ital(it.container, italics)}.` : '';
      const pub = it.publisher ? (it.pubplace ? `${this._esc(it.pubplace)}: ${this._esc(it.publisher)}.` : `${this._esc(it.publisher)}.`) : '';
      const mid = it.container ? cont : pub;
      return `${authorYear} ${title} ${mid}${tail}`.replace(/\s+/g, ' ').trim();
    }
    const website = it.container ? `${this._ital(it.container, italics)}.` : '';
    return `${authorYear} ${title} ${website}${tail}`.replace(/\s+/g, ' ').trim();
  }
}

// 單例導出
export const citationManager = new CitationManager();
export default citationManager;
