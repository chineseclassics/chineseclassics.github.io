/**
 * PMAnnotationOverlay
 * 在 PM viewer 右側建立絕對定位的批註卡片，根據正文高亮位置對齊並避免重疊
 */

export class PMAnnotationOverlay {
  constructor({ root, view, getAnnotations, onClick, onContextMenu, supabase, currentUserId, onDataChanged, reflowOnHover = false }) {
    this.root = root;           // 應是包含 PM viewer 的容器，需 position: relative
    this.view = view;           // ProseMirror view
    this.getAnnotations = getAnnotations || (() => []);
    this.onClick = onClick || (() => {});
    this.onContextMenu = onContextMenu || (() => {});
    this.supabase = supabase || null;
    this.currentUserId = currentUserId || null;
    this.onDataChanged = onDataChanged || null; // 由外部觸發刷新資料（annotations+comments）
    this.reflowOnHover = !!reflowOnHover; // 是否在 hover 展開/收起時重新排版（預設關閉）
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
      this._renderReplies(node, a);
      this._applyAuthor(node, a);
      this._applyActions(node, a);
      return node;
    }
    const card = document.createElement('div');
    card.className = 'pm-ann-card';
    card.dataset.id = a.id;
    card.innerHTML = `
      <div class="pm-ann-meta">
        <i class="fas fa-comment-dots"></i>
        <span class="pm-ann-author">${this._authorLabel(a) || ''}</span>
         <span class="pm-ann-time">${this._formatTime(a.created_at) || ''}</span>
      <span class="pm-ann-reply-count" style="display:none"></span>
      </div>
      <div class="pm-ann-text"></div>
      <div class="pm-ann-replies"></div>
      <div class="pm-ann-actions">
        <button type="button" class="pm-ann-btn-reply"><i class="fas fa-reply"></i> 回覆</button>
        <button type="button" class="pm-ann-btn-delete" style="display:none"><i class="fas fa-trash"></i> 刪除</button>
      </div>
      <div class="pm-ann-reply-composer" style="display:none">
        <textarea class="input textarea" placeholder="輸入回覆..." rows="3"></textarea>
        <div class="actions">
          <button type="button" class="btn btn-secondary btn-sm btn-cancel">取消</button>
          <button type="button" class="btn btn-primary btn-sm btn-submit">送出</button>
        </div>
      </div>
    `;
    const textEl = card.querySelector('.pm-ann-text');
    if (textEl) textEl.textContent = a.content || a.text_quote || '(無內容)';
    this._renderReplies(card, a);
    this._applyAuthor(card, a);
    this._applyActions(card, a);
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
    // 移除懸停重排功能：不再基於 hover 綁定任何 reflow 行為
    return card;
  }

  _applyAuthor(card, a) {
    const authorEl = card.querySelector('.pm-ann-author');
    if (!authorEl) return;
    authorEl.textContent = this._authorLabel(a) || '';
  }

  _authorLabel(a) {
    // 優先顯示 display_name，其次顯示角色或匿名
    if (a.authorDisplayName) return a.authorDisplayName;
    if (a.authorRole) return a.authorRole === 'teacher' ? '老師' : a.authorRole === 'student' ? '學生' : '';
    return '';
  }

  _applyActions(card, a) {
    const btnReply = card.querySelector('.pm-ann-btn-reply');
    const btnDelete = card.querySelector('.pm-ann-btn-delete');
    const composer = card.querySelector('.pm-ann-reply-composer');
    const textarea = composer?.querySelector('textarea');
    const btnCancel = composer?.querySelector('.btn-cancel');
    const btnSubmit = composer?.querySelector('.btn-submit');

    // 每次都根據權限切換刪除按鈕顯示
    if (btnDelete) btnDelete.style.display = a.canDelete ? 'inline-flex' : 'none';

    // 僅綁定一次事件，避免重複綁定導致多次觸發
    if (card.dataset.actionsBound === '1') {
      return;
    }

    btnReply?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!composer) return;
      const willOpen = composer.style.display === 'none';
      composer.style.display = willOpen ? 'block' : 'none';
      // 開啟輸入框時，隱藏懸停動作列
      if (willOpen) {
        card.classList.add('composing');
        textarea?.focus();
      } else {
        card.classList.remove('composing');
      }
      // 高度變化後重新定位
      this._schedule();
    });

    btnCancel?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (composer) { composer.style.display = 'none'; if (textarea) textarea.value = ''; }
      // 關閉輸入框後恢復動作列顯示
      card.classList.remove('composing');
      // 高度變化後重新定位
      this._schedule();
    });

    btnSubmit?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const content = (textarea?.value || '').trim();
      if (!content) { textarea?.focus(); return; }
      if (!this.supabase || !this.currentUserId) return;
      try {
        // 樂觀更新：先插入一條暫存回覆
        const listEl = card.querySelector('.pm-ann-replies');
        let optimisticEl = null;
        if (listEl) {
          optimisticEl = document.createElement('div');
          optimisticEl.className = 'pm-ann-reply is-pending';
          optimisticEl.innerHTML = `
            <div class="pm-ann-reply-meta">
              <span class="author">我</span>
              <span class="time">送出中…</span>
            </div>
            <div class="pm-ann-reply-text"></div>
          `;
          const textNode = optimisticEl.querySelector('.pm-ann-reply-text');
          if (textNode) textNode.textContent = content;
          listEl.appendChild(optimisticEl);
          this._schedule();
        }
        const payload = { annotation_id: a.id, user_id: this.currentUserId, content };
        const { error } = await this.supabase.from('annotation_comments').insert(payload);
        if (error) throw error;
  if (composer) { composer.style.display = 'none'; if (textarea) textarea.value = ''; }
  card.classList.remove('composing');
        // 移除暫存回覆（真正的回覆會由刷新帶回）
        try { optimisticEl?.remove?.(); } catch (_) {}
        // 通知外部刷新
        try { this.onDataChanged?.('comment:created', a.id); } catch (_) {}
      } catch (err) {
        console.warn('新增回覆失敗:', err);
      }
    });

    btnDelete?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!a.canDelete) return;
      if (!this.supabase) return;
      const yes = window.confirm('確定刪除此批註？');
      if (!yes) return;
      try {
        // 樂觀處理：先降低不透明度並禁用互動
        const prevOpacity = card.style.opacity;
        const prevPE = card.style.pointerEvents;
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        // 優先使用後端 RPC（具備權限與重錨處理）
        const res = await this.supabase.rpc('delete_annotation_pm', { p_annotation_id: a.id });
        if (res.error) throw res.error;
        try { this.onDataChanged?.('annotation:deleted', a.id); } catch (_) {}
      } catch (err) {
        console.warn('刪除批註失敗:', err);
        // 恢復樣式
        card.style.opacity = '';
        card.style.pointerEvents = '';
      }
    });

    card.dataset.actionsBound = '1';
  }

  _renderReplies(card, a) {
    const listEl = card.querySelector('.pm-ann-replies');
    if (!listEl) return;
    const replies = Array.isArray(a.replies) ? a.replies.slice().sort((x,y)=> new Date(x.created_at) - new Date(y.created_at)) : [];
    // 更新回覆數徽章（0 則不顯示）
    try {
      const countEl = card.querySelector('.pm-ann-reply-count');
      if (countEl) {
        const n = replies.length || 0;
        if (n > 0) {
          countEl.textContent = String(n);
          countEl.style.display = 'inline-flex';
        } else {
          countEl.textContent = '';
          countEl.style.display = 'none';
        }
      }
    } catch (_) {}
    const MAX_VISIBLE = 3;
    const collapsed = replies.length > MAX_VISIBLE;
    const visible = collapsed ? replies.slice(-MAX_VISIBLE) : replies;

    listEl.innerHTML = visible.map(r => `
      <div class="pm-ann-reply" data-id="${r.id}">
        <div class="pm-ann-reply-meta">
          <span class="author">${r.userDisplayName || (r.userRole==='teacher'?'老師': r.userRole==='student'?'學生':'')}</span>
          <span class="time">${this._formatTime(r.created_at) || ''}</span>
          ${r.user_id && this.currentUserId && String(r.user_id) === String(this.currentUserId) ? '<button type="button" class="pm-ann-reply-del" title="刪除回覆"><i class="fas fa-times"></i></button>' : ''}
        </div>
        <div class="pm-ann-reply-text"></div>
      </div>
    `).join('') + (collapsed ? `
      <div class="pm-ann-replies-toggle"><button type="button" class="pm-ann-show-all">展開全部 ${replies.length} 條回覆</button></div>
    ` : '');

    // 填入文字
    visible.forEach(r => {
      const item = listEl.querySelector(`.pm-ann-reply[data-id="${CSS.escape(r.id)}"] .pm-ann-reply-text`);
      if (item) item.textContent = r.content || '';
    });

    // 綁定回覆刪除（僅本人）
    listEl.querySelectorAll('.pm-ann-reply-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const wrap = e.currentTarget.closest('.pm-ann-reply');
        const rid = wrap?.getAttribute('data-id');
        if (!rid || !this.supabase) return;
        const yes = window.confirm('確定刪除此回覆？');
        if (!yes) return;
        try {
          const { error } = await this.supabase.from('annotation_comments').delete().eq('id', rid);
          if (error) throw error;
          try { this.onDataChanged?.('comment:deleted', a.id); } catch (_) {}
        } catch (err) {
          console.warn('刪除回覆失敗:', err);
        }
      });
    });

    // 綁定展開全部
    const showAll = listEl.querySelector('.pm-ann-show-all');
    if (showAll) {
      showAll.addEventListener('click', (e) => {
        e.stopPropagation();
        listEl.innerHTML = replies.map(r => `
          <div class="pm-ann-reply" data-id="${r.id}">
            <div class="pm-ann-reply-meta">
              <span class="author">${r.userDisplayName || (r.userRole==='teacher'?'老師': r.userRole==='student'?'學生':'')}</span>
              <span class="time">${this._formatTime(r.created_at) || ''}</span>
              ${r.user_id && this.currentUserId && String(r.user_id) === String(this.currentUserId) ? '<button type="button" class="pm-ann-reply-del" title="刪除回覆"><i class="fas fa-times"></i></button>' : ''}
            </div>
            <div class="pm-ann-reply-text"></div>
          </div>
        `).join('') + `<div class="pm-ann-replies-toggle"><button type="button" class="pm-ann-collapse">收起</button></div>`;

        replies.forEach(r => {
          const item = listEl.querySelector(`.pm-ann-reply[data-id="${CSS.escape(r.id)}"] .pm-ann-reply-text`);
          if (item) item.textContent = r.content || '';
        });

        // 刪除綁定
        listEl.querySelectorAll('.pm-ann-reply-del').forEach(btn => {
          btn.addEventListener('click', async (e2) => {
            e2.stopPropagation();
            const wrap = e2.currentTarget.closest('.pm-ann-reply');
            const rid = wrap?.getAttribute('data-id');
            if (!rid || !this.supabase) return;
            const yes = window.confirm('確定刪除此回覆？');
            if (!yes) return;
            try {
              const { error } = await this.supabase.from('annotation_comments').delete().eq('id', rid);
              if (error) throw error;
              try { this.onDataChanged?.('comment:deleted', a.id); } catch (_) {}
            } catch (err) {
              console.warn('刪除回覆失敗:', err);
            }
          });
        });

        // 收起
        const collapseBtn = listEl.querySelector('.pm-ann-collapse');
        collapseBtn?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this._renderReplies(card, a);
          // 高度改變後刷新定位
          this._schedule();
        });

        // 高度改變後刷新定位
        this._schedule();
      });
    }
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


