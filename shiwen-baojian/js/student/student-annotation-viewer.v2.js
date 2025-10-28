/**
 * 學生端批註查看器（重構版）
 * - 與老師端一致：浮動批註 + 原文高亮 + 避讓
 * - 整篇載入（RPC）與 Realtime 更新
 * - 模式：view | edit | readonly（目前不開放學生新建/回覆）
 */

import toast from '../ui/toast.js';
import {
  findTextByAnchor,
  rangeFromOffsets,
  highlightWithRange,
  adjustAllAnnotations,
  createFloatingAnnotationElement,
  getParagraphElement
} from '../features/annotation-utils.js';

class StudentAnnotationViewerV2 {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.annotations = new Map();
    this.currentEssayId = null;
    this.paragraphs = [];
    this.mode = 'view';
    this.realtimeChannel = null;
    this._overlayRoot = null;
    this._overlayScrollHandler = null;
    this._overlayResizeHandler = null;
    this._overlayVisible = true;
    this._overlayToggleBtn = null;
  }

  /**
   * 初始化（整篇）
   * @param {string} essayId
   * @param {Array} paragraphs - [{ id, order_index }]
   * @param {'view'|'edit'|'readonly'} mode
   */
  async init(essayId, paragraphs, mode = 'view') {
    console.log('🚀 初始化學生端批注（V2）:', { essayId, paragraphsCount: paragraphs?.length || 0, mode });
    this.currentEssayId = essayId;
    this.paragraphs = Array.isArray(paragraphs) ? paragraphs : [];
    this.mode = mode;

    await this.loadAllAnnotations();
    this.renderAll();
    this.setupRealtimeListener();

    if (this.mode === 'edit') {
      this.setupOverlayUpdateListeners();
    }

    console.log('✅ 學生端批注（V2）初始化完成');
  }

  /** 載入整篇批註（RPC） */
  async loadAllAnnotations() {
    try {
      const { data, error } = await this.supabase.rpc('get_essay_annotations', { p_essay_id: this.currentEssayId });
      if (error) throw error;
      this.annotations.clear();
      (data || []).forEach(a => this.annotations.set(a.id, a));
      console.log('📥 載入批註數量:', this.annotations.size);
    } catch (err) {
      console.error('❌ 載入批註失敗:', err);
      if (toast?.error) toast.error('載入批註失敗：' + (err?.message || '未知錯誤'));
    }
  }

  /** 渲染全部（高亮 + 浮動卡片 + 避讓） */
  renderAll() {
    // 清理舊標記
    document.querySelectorAll('.annotation-highlight, .floating-annotation').forEach(el => el.remove());
    this.clearOverlays();

    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!wrapper) {
      console.warn('⚠️ 找不到 .grading-content-wrapper');
      return;
    }

    const list = Array.from(this.annotations.values())
      .sort((a, b) => (a.paragraph_order_index - b.paragraph_order_index) || ((a.highlight_start || 0) - (b.highlight_start || 0)));

    for (const ann of list) {
      const paraEl = getParagraphElement(ann.paragraph_id) || wrapper;
      let range = null;
      if (ann.anchor_text) range = findTextByAnchor(paraEl, ann.anchor_text);
      if (!range && (ann.highlight_start != null)) range = rangeFromOffsets(paraEl, ann.highlight_start, ann.highlight_end);

      // 編輯模式：以 overlay 呈現高亮；非編輯模式：注入高亮元素
      if (range) {
        if (this.mode === 'edit') {
          this.addOverlayForRange(ann.id, range, wrapper);
        } else {
          const el = highlightWithRange(ann.id, range);
          if (el) {
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              this.handleHighlightClick(ann.id);
            });
          }
        }
      }

      // 浮動卡片
      const card = createFloatingAnnotationElement(ann);
      // 反向同步：卡片 hover → 高亮 overlay；點擊 → 高亮自身
      card.addEventListener('mouseenter', () => this.highlightOverlayBlocks(ann.id, true));
      card.addEventListener('mouseleave', () => this.highlightOverlayBlocks(ann.id, false));
      card.addEventListener('click', () => this.handleCardClick(ann.id));
      wrapper.appendChild(card);
    }

    const getPos = (el) => {
      const a = this.annotations.get(el.dataset.annotationId);
      return { paragraphOrderIndex: a?.paragraph_order_index || 0, highlightStart: a?.highlight_start || 0 };
    };
    adjustAllAnnotations(document.querySelectorAll('.floating-annotation'), getPos, wrapper);

    this.updateAnnotationCount();

    // 編輯模式下顯示 overlay 開關
    if (this.mode === 'edit') {
      this.ensureOverlayToggle(wrapper);
      this.applyOverlayVisibility();
    }
  }

  /** 清除雙方 active 狀態 */
  clearActiveStates() {
    document.querySelectorAll('.floating-annotation.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.annotation-highlight.active').forEach(el => el.classList.remove('active'));
    // 清除 overlay 樣式
    this.highlightOverlayBlocks('__clear__', false);
  }

  /** 點擊原文高亮 → 聚焦對應卡片並滾動到視口，同時脈衝對應高亮 */
  handleHighlightClick(annotationId) {
    this.clearActiveStates();
    this.focusFloatingAnnotation(annotationId);
    this.focusHighlight(annotationId);
  }

  /** 點擊卡片 → 脈衝對應原文、滾動原文到視口 */
  handleCardClick(annotationId) {
    this.clearActiveStates();
    this.focusFloatingAnnotation(annotationId);
    this.focusHighlight(annotationId);
    this.scrollOriginalToAnnotation(annotationId);
  }

  /** 使原文（overlay 或文字高亮）進入 active 狀態 */
  focusHighlight(annotationId) {
    if (this._overlayRoot) {
      this.highlightOverlayBlocks(annotationId, true);
    }
    const hl = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (hl) hl.classList.add('active');
  }

  /** 滾動原文（overlay 或文字高亮）到視口中央 */
  scrollOriginalToAnnotation(annotationId) {
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const target = this._overlayRoot?.querySelector(`.annotation-overlay-block[data-annotation-id="${annotationId}"]`) 
      || document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const top = (rect.top - wrapperRect.top) + wrapper.scrollTop - (wrapper.clientHeight/2) + (rect.height/2);
    wrapper.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /**
   * 建立 overlay 根節點
   */
  ensureOverlayRoot(wrapper) {
    if (this._overlayRoot && this._overlayRoot.parentElement) return this._overlayRoot;
    const root = document.createElement('div');
    root.className = 'annotation-overlay-root';
    root.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 100%;
      pointer-events: none;
      z-index: 900;
    `;
    // wrapper 應為定位容器
    wrapper.style.position = wrapper.style.position || 'relative';
    wrapper.appendChild(root);
    this._overlayRoot = root;
    return root;
  }

  /**
   * 為一個 Range 添加 overlay 高亮（可跨行）
   */
  addOverlayForRange(annotationId, range, wrapper) {
    const root = this.ensureOverlayRoot(wrapper);
    const rects = Array.from(range.getClientRects());
    const wrapperRect = wrapper.getBoundingClientRect();
    rects.forEach(r => {
      // 避免零寬/零高
      if (r.width <= 0 || r.height <= 0) return;
      const block = document.createElement('div');
      block.className = 'annotation-overlay-block';
      block.dataset.annotationId = annotationId;
      const top = (r.top - wrapperRect.top) + wrapper.scrollTop;
      const left = (r.left - wrapperRect.left) + wrapper.scrollLeft;
      block.style.cssText = `
        position: absolute;
        top: ${top}px;
        left: ${left}px;
        width: ${r.width}px;
        height: ${r.height}px;
        background: rgba(254, 243, 199, 0.6); /* var(--warning-100) 半透明 */
        border-bottom: 2px solid var(--warning-600);
        border-radius: 2px;
        pointer-events: auto;
        cursor: pointer;
      `;
      root.appendChild(block);

      // 綁定 hover 提示（使用全局 tooltip 單例）
      try {
        const tip = window.tooltip;
        const ann = this.annotations.get(annotationId);
        if (tip && ann) {
          const html = () => this.buildTooltipHTML(ann);
          tip.bind(block, html, { type: 'info', position: 'bottom', trigger: 'hover' });
        } else if (ann) {
          // 後備方案：原生 title
          block.title = (ann.content || '').slice(0, 80);
        }
      } catch (e) {
        // 忽略 tooltip 綁定錯誤
      }

      // 點擊同步右側卡片高亮與定位
      block.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleHighlightClick(annotationId);
      });
    });
  }

  /**
   * 聚焦右側浮動批註卡片（高亮並滾動到視口）
   */
  focusFloatingAnnotation(annotationId) {
    // 移除其他 active
    document.querySelectorAll('.floating-annotation.active').forEach(el => el.classList.remove('active'));
    const card = document.querySelector(`.floating-annotation[data-annotation-id="${annotationId}"]`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 構建 tooltip 內容 HTML
   */
  buildTooltipHTML(ann) {
    const time = this.formatTime(ann.created_at);
    const content = (ann.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div>
        <div style="font-weight:600; margin-bottom:4px;">批注</div>
        <div style="font-size:12px; opacity:0.9; margin-bottom:6px;">${time}</div>
        <div style="font-size:13px; line-height:1.4;">${content}</div>
      </div>
    `;
  }

  /**
   * 簡易時間格式化
   */
  formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff/60000)}分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}小時前`;
    return d.toLocaleDateString('zh-TW');
  }

  /**
   * 清除 overlay 高亮
   */
  clearOverlays() {
    if (!this._overlayRoot) return;
    while (this._overlayRoot.firstChild) this._overlayRoot.removeChild(this._overlayRoot.firstChild);
  }

  /**
   * 反向高亮 overlay 區塊
   */
  highlightOverlayBlocks(annotationId, on = true) {
    if (!this._overlayRoot) return;
    const blocks = this._overlayRoot.querySelectorAll(`.annotation-overlay-block[data-annotation-id="${annotationId}"]`);
    blocks.forEach(b => {
      if (on) {
        b.style.outline = '2px solid var(--primary-500)';
        b.style.boxShadow = '0 0 0 2px var(--primary-200)';
      } else {
        b.style.outline = 'none';
        b.style.boxShadow = 'none';
      }
    });
  }

  /**
   * 設置 overlay 更新監聽（滾動與縮放）
   */
  setupOverlayUpdateListeners() {
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!wrapper) return;
    const debounce = (fn, wait = 100) => {
      let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
    };
    const rerender = debounce(() => this.renderAll(), 60);
    this._overlayScrollHandler = rerender;
    this._overlayResizeHandler = rerender;
    wrapper.addEventListener('scroll', this._overlayScrollHandler);
    window.addEventListener('resize', this._overlayResizeHandler);
  }

  /**
   * 建立 overlay 顯示開關
   */
  ensureOverlayToggle(wrapper) {
    if (this._overlayToggleBtn && this._overlayToggleBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'annotation-overlay-toggle';
    btn.type = 'button';
    btn.style.cssText = `
      position: absolute;
      top: 8px; right: 8px;
      z-index: 950;
      background: var(--primary-600);
      color: var(--text-inverse);
      border: none;
      border-radius: 6px;
      font-size: 12px;
      padding: 6px 10px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    btn.textContent = this._overlayVisible ? '隱藏對齊高亮' : '顯示對齊高亮';
    btn.addEventListener('click', () => {
      this._overlayVisible = !this._overlayVisible;
      this.applyOverlayVisibility();
      btn.textContent = this._overlayVisible ? '隱藏對齊高亮' : '顯示對齊高亮';
    });
    wrapper.appendChild(btn);
    this._overlayToggleBtn = btn;
  }

  /**
   * 根據 _overlayVisible 顯示/隱藏 overlays
   */
  applyOverlayVisibility() {
    if (!this._overlayRoot) return;
    this._overlayRoot.style.display = this._overlayVisible ? 'block' : 'none';
  }

  /** Realtime（整篇） */
  setupRealtimeListener() {
    this.cleanupRealtimeListener();
    const paragraphIds = this.paragraphs?.map(p => p.id) || [];
    if (!paragraphIds.length) return;

    const filter = paragraphIds.length > 50 ? `essay_id=eq.${this.currentEssayId}` : `paragraph_id=in.(${paragraphIds.join(',')})`;
    this.realtimeChannel = this.supabase
      .channel('student-annotations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annotations', filter }, (payload) => {
        const a = payload.new;
        if (!a) return;
        if (paragraphIds.length > 50 && !paragraphIds.includes(a.paragraph_id)) return;
        const p = this.paragraphs.find(pp => pp.id === a.paragraph_id);
        this.annotations.set(a.id, { ...a, paragraph_order_index: p?.order_index ?? 0 });
        this.renderAll();
        if (toast?.info) toast.info('收到新批註');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'annotations', filter }, (payload) => {
        const a = payload.new;
        if (!a) return;
        const old = this.annotations.get(a.id) || {};
        this.annotations.set(a.id, { ...old, ...a });
        this.renderAll();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'annotations', filter }, (payload) => {
        const a = payload.old;
        if (!a) return;
        this.annotations.delete(a.id);
        this.renderAll();
      })
      .subscribe();
  }

  cleanupRealtimeListener() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  updateAnnotationCount() {
    const countElement = document.querySelector('.annotation-count');
    if (countElement) countElement.textContent = `${this.annotations.size} 個批注`;
  }

  destroy() {
    console.log('🗑️ 銷毀學生端批注（V2）');
    this.cleanupRealtimeListener();
    this.clearOverlays();
    // 清理 overlay 監聽
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (wrapper && this._overlayScrollHandler) wrapper.removeEventListener('scroll', this._overlayScrollHandler);
    if (this._overlayResizeHandler) window.removeEventListener('resize', this._overlayResizeHandler);
    this.annotations.clear();
  }
}

export default StudentAnnotationViewerV2;
