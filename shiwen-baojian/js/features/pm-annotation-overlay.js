/**
 * PMAnnotationOverlay
 * 在 PM viewer 右側建立絕對定位的批註卡片，根據正文高亮位置對齊並避免重疊
 */

export class PMAnnotationOverlay {
  constructor({ root, view, getAnnotations, onClick, onContextMenu }) {
    this.root = root;           // 應是包含 PM viewer 的容器，需 position: relative
    this.view = view;           // ProseMirror view
    this.getAnnotations = getAnnotations || (() => []);
    this.onClick = onClick || (() => {});
    this.onContextMenu = onContextMenu || (() => {});
    this._mounted = false;
    this._overlay = null;
    this._cards = new Map();
    this._spacing = 16; // px
    this._throttleId = null;
  }

  mount() {
    if (this._mounted) return;
    const host = this._ensureHost();
    this._overlay = document.createElement('div');
    this._overlay.className = 'pm-ann-overlay';
    host.appendChild(this._overlay);
    this._mounted = true;
    this._bind();
    this.update();
  }

  destroy() {
    window.removeEventListener('scroll', this._onScroll, true);
    window.removeEventListener('resize', this._onResize);
    if (this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
    this._cards.clear();
    this._mounted = false;
  }

  update() {
    if (!this._mounted) return;
    const anns = this.getAnnotations() || [];
    // 依正文順序（已由來源排序），逐一定位
    const containerRect = this._containerRect();
    const occupied = []; // 已佔用 top 範圍
    const ensureNonOverlap = (idealTop, height) => {
      let top = Math.max(0, idealTop);
      for (let i = 0; i < occupied.length; i++) {
        const { from, to } = occupied[i];
        if (top < to && top + height > from) {
          top = to + this._spacing;
        }
      }
      occupied.push({ from: top, to: top + height });
      return top;
    };

    const seen = new Set();
    for (const a of anns) {
      seen.add(a.id);
      const el = this._ensureCard(a);
      const annEl = this._findDecorationEl(a.id);
      let idealTop = 0;
      if (annEl) {
        const r = annEl.getBoundingClientRect();
        idealTop = (r.top + r.bottom) / 2 - containerRect.top - el.offsetHeight / 2;
      }
      const top = ensureNonOverlap(idealTop, el.offsetHeight || 60);
      el.style.top = `${Math.max(0, Math.round(top))}px`;
    }
    // 移除消失的
    for (const [id, node] of Array.from(this._cards.entries())) {
      if (!seen.has(id)) {
        node.remove();
        this._cards.delete(id);
      }
    }
  }

  setActive(id) {
    try { this._cards.forEach(n => n.classList.remove('active')); } catch (_) {}
    const node = this._cards.get(String(id));
    if (node) node.classList.add('active');
  }

  // 內部：建立/更新卡片 DOM
  _ensureCard(a) {
    if (this._cards.has(a.id)) {
      const node = this._cards.get(a.id);
      const textEl = node.querySelector('.pm-ann-text');
      if (textEl) textEl.textContent = a.content || a.text_quote || '(無內容)';
      return node;
    }
    const card = document.createElement('div');
    card.className = 'pm-ann-card';
    card.dataset.id = a.id;
    card.innerHTML = `
      <div class="pm-ann-meta"><i class="fas fa-comment-dots"></i><span>${this._formatTime(a.created_at) || ''}</span></div>
      <div class="pm-ann-text"></div>
    `;
    const textEl = card.querySelector('.pm-ann-text');
    if (textEl) textEl.textContent = a.content || a.text_quote || '(無內容)';
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      try { this._cards.forEach(n => n.classList.remove('active')); } catch (_) {}
      card.classList.add('active');
      this.onClick?.(a.id);
    });
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onContextMenu?.(a, card, e);
    });
    this._overlay.appendChild(card);
    this._cards.set(a.id, card);
    return card;
  }

  _findDecorationEl(id) {
    try {
      return this.view?.dom?.querySelector?.(`.pm-annotation[data-id="${CSS.escape(id)}"]`);
    } catch (_) { return null; }
  }

  _ensureHost() {
    // 確保 root 是定位容器
    const host = this.root;
    const style = window.getComputedStyle(host);
    if (style.position === 'static' || !style.position) {
      host.style.position = 'relative';
    }
    return host;
  }

  _bind() {
    this._onScroll = () => this._schedule();
    this._onResize = () => this._schedule();
    window.addEventListener('scroll', this._onScroll, true);
    window.addEventListener('resize', this._onResize);
  }

  _schedule() {
    if (this._throttleId) cancelAnimationFrame(this._throttleId);
    this._throttleId = requestAnimationFrame(() => this.update());
  }

  _containerRect() {
    const host = this._ensureHost();
    return host.getBoundingClientRect();
  }

  _formatTime(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('zh-Hant-TW', { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' }); } catch (_) { return ''; }
  }
}

export default PMAnnotationOverlay;


