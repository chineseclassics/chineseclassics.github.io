import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

const CONSTANTS = {
  HIGHLIGHT_CLASS: 'annotation-highlight',
  HIGHLIGHT_ACTIVE_CLASS: 'active',
  HIGHLIGHT_ORPHAN_CLASS: 'annotation-highlight annotation-highlight-orphan',
  HIGHLIGHT_PREVIEW_CLASS: 'annotation-highlight annotation-highlight-preview',
  BUTTON_Z_INDEX: 1000,
  CARD_Z_INDEX: 1001,
  BUTTON_OFFSET_X: 12,
  BUTTON_OFFSET_Y: -40,
  CARD_GAP: 16,
  TEMP_ID_PREFIX: 'temp-annotation-'
};

const createTempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${CONSTANTS.TEMP_ID_PREFIX}${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(16).slice(2);
  return `${CONSTANTS.TEMP_ID_PREFIX}${Date.now().toString(16)}-${random}`;
};

const toInternalAnnotation = (record) => {
  if (!record) return null;
  return {
    id: record.id,
    paragraphId: record.paragraph_id,
    teacherId: record.teacher_id,
    teacher: record.teacher || null,
    content: record.content,
    highlightStart: record.highlight_start,
    highlightEnd: record.highlight_end,
    anchorText: record.anchor_text || null,
    anchorContext: record.anchor_context || null,
    annotationType: record.annotation_type || 'comment',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    isResolved: record.is_resolved || false,
    isOrphaned: record.is_orphaned || false,
    priority: record.priority || 'normal',
    isPrivate: record.is_private || false,
    resolvedAt: record.resolved_at || null,
    resolvedBy: record.resolved_by || null,
    status: 'saved'
  };
};

const toDatabasePayload = (annotation) => {
  const payload = {
    paragraph_id: annotation.paragraphId,
    teacher_id: annotation.teacherId,
    content: annotation.content,
    annotation_type: annotation.annotationType || 'comment',
    highlight_start: annotation.highlightStart,
    highlight_end: annotation.highlightEnd,
    anchor_text: annotation.anchorText || null,
    anchor_context: annotation.anchorContext || null,
    is_resolved: annotation.isResolved || false,
    is_orphaned: annotation.isOrphaned || false,
    priority: annotation.priority || 'normal',
    is_private: annotation.isPrivate || false,
    resolved_at: annotation.resolvedAt || null,
    resolved_by: annotation.resolvedBy || null
  };
  return payload;
};

class AnnotationStore {
  constructor() {
    this.annotations = new Map();
    this.annotationsByParagraph = new Map();
    this.paragraphIndex = new Map();
    this.paragraphIds = [];
    this.essayId = null;
  }

  setEssay(essayId, paragraphInfo = []) {
    this.essayId = essayId;
    this.paragraphIndex.clear();
    this.paragraphIds = [];
    paragraphInfo.forEach((item, idx) => {
      const paragraphId = typeof item === 'string' ? item : item?.id;
      if (paragraphId) {
        this.paragraphIndex.set(paragraphId, idx);
        this.paragraphIds.push(paragraphId);
      }
    });
  }

  reset(records = []) {
    this.annotations.clear();
    this.annotationsByParagraph.clear();
    records.forEach(record => {
      const annotation = toInternalAnnotation(record);
      if (annotation) {
        this.add(annotation);
      }
    });
  }

  getParagraphIds() {
    return [...this.paragraphIds];
  }

  add(annotation) {
    if (!annotation?.id) return;
    this.annotations.set(annotation.id, annotation);
    const paragraphId = annotation.paragraphId;
    if (!this.annotationsByParagraph.has(paragraphId)) {
      this.annotationsByParagraph.set(paragraphId, new Map());
    }
    this.annotationsByParagraph.get(paragraphId).set(annotation.id, annotation);
  }

  replace(tempId, savedAnnotation) {
    if (!tempId || !savedAnnotation?.id) return;
    const existing = this.annotations.get(tempId);
    if (existing) {
      this.remove(tempId);
    }
    this.add(savedAnnotation);
  }

  update(annotationId, updater) {
    const existing = this.annotations.get(annotationId);
    if (!existing) return null;
    const updated = { ...existing, ...updater, updatedAt: new Date().toISOString() };
    this.annotations.set(annotationId, updated);
    const paragraphMap = this.annotationsByParagraph.get(existing.paragraphId);
    if (paragraphMap) {
      paragraphMap.set(annotationId, updated);
    }
    return updated;
  }

  remove(annotationId) {
    const existing = this.annotations.get(annotationId);
    if (!existing) return;
    this.annotations.delete(annotationId);
    const paragraphMap = this.annotationsByParagraph.get(existing.paragraphId);
    if (paragraphMap) {
      paragraphMap.delete(annotationId);
      if (paragraphMap.size === 0) {
        this.annotationsByParagraph.delete(existing.paragraphId);
      }
    }
  }

  get(annotationId) {
    return this.annotations.get(annotationId) || null;
  }

  getAllSorted() {
    const list = Array.from(this.annotations.values());
    return list.sort((a, b) => this.compareAnnotations(a, b));
  }

  getParagraphSorted(paragraphId) {
    if (!this.annotationsByParagraph.has(paragraphId)) return [];
    return Array.from(this.annotationsByParagraph.get(paragraphId).values())
      .sort((a, b) => this.compareAnnotations(a, b));
  }

  compareAnnotations(a, b) {
    const indexA = this.paragraphIndex.has(a.paragraphId)
      ? this.paragraphIndex.get(a.paragraphId)
      : Number.MAX_SAFE_INTEGER;
    const indexB = this.paragraphIndex.has(b.paragraphId)
      ? this.paragraphIndex.get(b.paragraphId)
      : Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    const startA = Number.isFinite(a.highlightStart) ? a.highlightStart : Number.MAX_SAFE_INTEGER;
    const startB = Number.isFinite(b.highlightStart) ? b.highlightStart : Number.MAX_SAFE_INTEGER;
    if (startA !== startB) {
      return startA - startB;
    }
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    return timeA.localeCompare(timeB);
  }

  createPendingAnnotation(selection, content, teacher) {
    const tempId = createTempId();
    const now = new Date().toISOString();
    return {
      id: tempId,
      tempId,
      status: 'pending',
      essayId: this.essayId,
      paragraphId: selection.paragraphId,
      teacherId: teacher?.id || null,
      content,
      annotationType: 'comment',
      highlightStart: selection.startOffset,
      highlightEnd: selection.endOffset,
      anchorText: selection.text,
      anchorContext: selection.anchorContext || null,
      createdAt: now,
      updatedAt: now,
      isResolved: false,
      isOrphaned: false,
      priority: 'normal',
      isPrivate: false,
      teacher: teacher
        ? {
            display_name: teacher.user_metadata?.full_name || null,
            email: teacher.email || null
          }
        : null
    };
  }
}

class AnnotationRenderer {
  constructor(options) {
    this.wrapper = options.wrapper;
    this.essayViewer = options.essayViewer;
    this.store = options.store;
    this.handlers = options.handlers || {};
    this.highlights = new Map();
    this.cards = new Map();
    this.selectionPreview = null;
    this.annotationButton = null;
    this.activeAnnotationId = null;
  }

  renderInitial(annotations) {
    this.clearAll();
    annotations.forEach(annotation => {
      this.renderAnnotation(annotation);
    });
    this.layoutAnnotations();
  }

  renderAnnotation(annotation, context = {}) {
    const annotationId = annotation.id;

    if (!annotationId) return;

    let highlight = this.highlights.get(annotationId);
    if (!highlight) {
      highlight = this.ensureHighlight(annotation, context);
    } else {
      highlight.dataset.annotationId = annotationId;
    }

    const card = this.ensureCard(annotation);

    if (context.isPending) {
      card.classList.add('pending');
    } else {
      card.classList.remove('pending');
    }

    this.layoutAnnotations(annotationId);
  }

  updateAnnotation(annotation) {
    const card = this.cards.get(annotation.id);
    if (!card) {
      this.renderAnnotation(annotation);
      return;
    }
    card.querySelector('.annotation-content').innerHTML = this.escapeHtml(annotation.content).replace(/\n/g, '<br>');
    const timeEl = card.querySelector('.annotation-time');
    if (timeEl) {
      timeEl.textContent = this.formatTime(annotation.createdAt);
    }
    this.renderAnnotation(annotation);
  }

  removeAnnotation(annotationId) {
    const highlight = this.highlights.get(annotationId);
    if (highlight) {
      this.removeHighlightNode(highlight);
      this.highlights.delete(annotationId);
    }

    const card = this.cards.get(annotationId);
    if (card && card.parentNode) {
      card.parentNode.removeChild(card);
    }
    this.cards.delete(annotationId);

    if (this.activeAnnotationId === annotationId) {
      this.activeAnnotationId = null;
    }

    this.layoutAnnotations();
  }

  showSelectionPreview(selection) {
    this.hideSelectionPreview();
    if (!selection?.range) return;
    try {
      const preview = document.createElement('span');
      preview.className = CONSTANTS.HIGHLIGHT_PREVIEW_CLASS;
      preview.dataset.preview = 'true';
      const clonedRange = selection.range.cloneRange();
      this.wrapRangeWithSpan(clonedRange, preview);
      this.selectionPreview = preview;
    } catch (error) {
      console.warn('⚠️ 無法建立選取預覽:', error);
      this.selectionPreview = null;
    }
  }

  hideSelectionPreview() {
    if (!this.selectionPreview) return;
    this.unwrapHighlight(this.selectionPreview);
    this.selectionPreview = null;
  }

  showAnnotationButton(selection, onClick) {
    this.hideAnnotationButton();
    if (!selection?.rect) return;

    const button = document.createElement('button');
    button.className = 'annotation-button';
    button.style.position = 'absolute';
    button.style.zIndex = String(CONSTANTS.BUTTON_Z_INDEX);
    button.style.background = 'var(--primary-600)';
    button.style.color = 'var(--text-inverse)';
    button.style.border = 'none';
    button.style.padding = '8px 12px';
    button.style.borderRadius = '6px';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    button.textContent = '📝 添加批註';

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const left = selection.rect.right + scrollX + CONSTANTS.BUTTON_OFFSET_X;
    const top = selection.rect.top + scrollY + CONSTANTS.BUTTON_OFFSET_Y;
    button.style.left = `${Math.max(0, left)}px`;
    button.style.top = `${Math.max(0, top)}px`;

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof onClick === 'function') {
        onClick();
      }
    });

    document.body.appendChild(button);
    this.annotationButton = button;
  }

  hideAnnotationButton() {
    if (this.annotationButton) {
      this.annotationButton.remove();
      this.annotationButton = null;
    }
  }

  async openAnnotationEditor(options) {
    const { mode, defaultContent = '', anchorRect } = options;
    return new Promise((resolve) => {
      const container = document.createElement('div');
      container.className = 'floating-annotation-input';
      container.innerHTML = `
        <div class="annotation-input-header">
          <div class="annotation-input-avatar">${this.getUserInitials(options.currentUser)}</div>
          <div class="annotation-input-author">${this.getUserName(options.currentUser)}</div>
        </div>
        <textarea class="annotation-input-content" placeholder="添加批注..." rows="3"></textarea>
        <div class="annotation-input-actions">
          <button class="annotation-input-btn cancel">取消</button>
          <button class="annotation-input-btn submit">${mode === 'edit' ? '更新' : '留言'}</button>
        </div>
      `;

      const textarea = container.querySelector('.annotation-input-content');
      textarea.value = defaultContent;

      const wrapperRect = this.wrapper.getBoundingClientRect();
      const offsetTop = anchorRect
        ? anchorRect.top - wrapperRect.top + this.wrapper.scrollTop
        : this.wrapper.scrollTop + 20;
      container.style.position = 'absolute';
      container.style.top = `${Math.max(0, offsetTop)}px`;
      container.style.right = '0';
      container.style.zIndex = String(CONSTANTS.CARD_Z_INDEX + 1);

      this.wrapper.appendChild(container);

      const cleanup = () => {
        container.remove();
      };

      container.querySelector('.cancel').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      container.querySelector('.submit').addEventListener('click', () => {
        const value = textarea.value.trim();
        cleanup();
        resolve(value);
      });

      textarea.focus();
    });
  }

  setActive(annotationId) {
    this.activeAnnotationId = annotationId;
    this.cards.forEach(card => card.classList.remove('active'));
    if (this.highlights.size) {
      this.highlights.forEach(span => span.classList.remove(CONSTANTS.HIGHLIGHT_ACTIVE_CLASS));
    }

    if (!annotationId) return;

    const card = this.cards.get(annotationId);
    if (card) {
      card.classList.add('active');
    }
    const highlight = this.highlights.get(annotationId);
    if (highlight) {
      highlight.classList.add(CONSTANTS.HIGHLIGHT_ACTIVE_CLASS);
      this.scrollHighlightIntoView(highlight);
    }

    this.layoutAnnotations(annotationId);
  }

  layoutAnnotations(anchorId = null) {
    const sorted = this.store.getAllSorted();
    const wrapperRect = this.wrapper.getBoundingClientRect();
    let lastBottom = 0;

    sorted.forEach(annotation => {
      const card = this.cards.get(annotation.id);
      if (!card) return;

      const highlight = this.highlights.get(annotation.id);
      let idealTop = this.computeHighlightTop(highlight, wrapperRect);

      if (annotation.id === anchorId && idealTop !== null) {
        card.style.top = `${idealTop}px`;
        lastBottom = idealTop + card.offsetHeight;
        return;
      }

      if (idealTop === null) {
        idealTop = lastBottom === 0 ? this.wrapper.scrollTop : lastBottom + CONSTANTS.CARD_GAP;
      }

      let actualTop = idealTop;
      const minTop = lastBottom === 0 ? 0 : lastBottom + CONSTANTS.CARD_GAP;
      if (actualTop < minTop) {
        actualTop = minTop;
      }
      card.style.top = `${actualTop}px`;
      lastBottom = actualTop + card.offsetHeight;
    });
  }

  ensureHighlight(annotation, context = {}) {
    const paragraphEl = this.getParagraphElement(annotation.paragraphId);
    if (!paragraphEl) return this.renderOrphanPlaceholder(annotation);

    this.removeHighlightNode(this.highlights.get(annotation.id));

    let range = null;
    if (context.range) {
      range = context.range.cloneRange();
    } else if (Number.isFinite(annotation.highlightStart) && Number.isFinite(annotation.highlightEnd)) {
      range = this.buildRangeFromOffsets(paragraphEl, annotation.highlightStart, annotation.highlightEnd);
    }

    if (!range && annotation.anchorText) {
      range = this.buildRangeFromAnchorText(paragraphEl, annotation.anchorText);
    }

    if (!range) {
      return this.renderOrphanPlaceholder(annotation);
    }

    const highlight = document.createElement('span');
    highlight.className = CONSTANTS.HIGHLIGHT_CLASS;
    highlight.dataset.annotationId = annotation.id;
    highlight.dataset.paragraphId = annotation.paragraphId || '';

    this.wrapRangeWithSpan(range, highlight);

    highlight.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.handlers.onAnnotationFocus) {
        this.handlers.onAnnotationFocus(annotation.id);
      }
    });

    this.highlights.set(annotation.id, highlight);
    return highlight;
  }

  renderOrphanPlaceholder(annotation) {
    const paragraphEl = this.getParagraphElement(annotation.paragraphId) || this.essayViewer;
    const placeholder = document.createElement('span');
    placeholder.className = CONSTANTS.HIGHLIGHT_ORPHAN_CLASS;
    placeholder.dataset.annotationId = annotation.id;
    placeholder.dataset.paragraphId = annotation.paragraphId || '';
    placeholder.dataset.orphan = 'true';
    placeholder.textContent = '原文已修改';
    paragraphEl.appendChild(placeholder);
    this.highlights.set(annotation.id, placeholder);
    return placeholder;
  }

  ensureCard(annotation) {
    let card = this.cards.get(annotation.id);
    if (!card) {
      card = document.createElement('div');
      card.className = 'floating-annotation';
      card.dataset.annotationId = annotation.id;
      card.style.position = 'absolute';
      card.style.zIndex = String(CONSTANTS.CARD_Z_INDEX);
      this.wrapper.appendChild(card);
      this.cards.set(annotation.id, card);
    }

    const orphanBadge = annotation.isOrphaned
      ? '<div class="annotation-status orphan"><i class="fas fa-circle-notch mr-1"></i>原文已修改</div>'
      : '';

    if (annotation.isOrphaned) {
      card.classList.add('orphan');
    } else {
      card.classList.remove('orphan');
    }

    card.innerHTML = `
      <div class="annotation-header">
        <div class="annotation-avatar">${this.getUserInitials(annotation)}</div>
        <div class="annotation-author">${this.escapeHtml(this.getAnnotationAuthor(annotation))}</div>
        <div class="annotation-time">${this.formatTime(annotation.createdAt)}</div>
      </div>
      <div class="annotation-content">${this.escapeHtml(annotation.content).replace(/\n/g, '<br>')}</div>
      ${orphanBadge}
      <div class="annotation-actions">
        <button class="annotation-action-btn edit" data-action="edit">編輯</button>
        <button class="annotation-action-btn delete" data-action="delete">刪除</button>
      </div>
    `;

    card.querySelector('.annotation-content').addEventListener('click', () => {
      if (this.handlers.onAnnotationFocus) {
        this.handlers.onAnnotationFocus(annotation.id);
      }
    });

    card.querySelector('.edit').addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.handlers.onAnnotationEdit) {
        this.handlers.onAnnotationEdit(annotation.id);
      }
    });

    card.querySelector('.delete').addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.handlers.onAnnotationDelete) {
        this.handlers.onAnnotationDelete(annotation.id);
      }
    });

    return card;
  }

  computeHighlightTop(highlight, wrapperRect) {
    if (!highlight) return null;
    const rect = highlight.getBoundingClientRect();
    if (!rect) return null;
    return rect.top - wrapperRect.top + this.wrapper.scrollTop;
  }

  getParagraphElement(paragraphId) {
    if (!paragraphId) return null;
    return this.essayViewer.querySelector(`[data-paragraph-id="${paragraphId}"]`);
  }

  buildRangeFromOffsets(root, start, end) {
    const startInfo = this.findNodeForOffset(root, start);
    const endInfo = this.findNodeForOffset(root, end);
    if (!startInfo || !endInfo) return null;
    const range = document.createRange();
    range.setStart(startInfo.node, startInfo.offset);
    range.setEnd(endInfo.node, endInfo.offset);
    return range;
  }

  buildRangeFromAnchorText(root, anchorText) {
    if (!anchorText) return null;
    const textContent = root.textContent || '';
    const index = textContent.indexOf(anchorText);
    if (index < 0) return null;
    return this.buildRangeFromOffsets(root, index, index + anchorText.length);
  }

  wrapRangeWithSpan(range, span) {
    try {
      range.surroundContents(span);
    } catch (error) {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
  }

  unwrapHighlight(node) {
    if (!node || !node.parentNode) return;
    const parent = node.parentNode;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  }

  findNodeForOffset(element, offset) {
    if (offset < 0) return null;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let currentNode = walker.nextNode();
    while (currentNode) {
      const nextOffset = currentOffset + currentNode.textContent.length;
      if (offset <= nextOffset) {
        return {
          node: currentNode,
          offset: offset - currentOffset
        };
      }
      currentOffset = nextOffset;
      currentNode = walker.nextNode();
    }
    return null;
  }

  getAnnotationAuthor(annotation) {
    if (annotation?.teacher?.display_name) {
      return annotation.teacher.display_name;
    }
    if (annotation?.teacher?.email) {
      return annotation.teacher.email;
    }
    return 'Unknown User';
  }

  getUserInitials(userOrAnnotation) {
    const fullName = userOrAnnotation?.user_metadata?.full_name
      || userOrAnnotation?.teacher?.display_name
      || userOrAnnotation?.email
      || userOrAnnotation?.teacher?.email
      || '';
    if (!fullName) return 'U';
    return fullName.trim().charAt(0).toUpperCase();
  }

  getUserName(user) {
    if (!user) return 'Unknown User';
    return user.user_metadata?.full_name || user.email || 'Unknown User';
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const time = new Date(timestamp);
    const now = new Date();
    const diff = now - time;
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小時前`;
    return time.toLocaleDateString('zh-TW');
  }

  scrollHighlightIntoView(highlight) {
    if (!highlight) return;
    highlight.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  clearAll() {
    this.highlights.forEach(node => this.removeHighlightNode(node));
    this.highlights.clear();
    this.cards.forEach(card => {
      if (card && card.parentNode) {
        card.parentNode.removeChild(card);
      }
    });
    this.cards.clear();
  }
}

class AnnotationSelectionManager {
  constructor(options) {
    this.enabled = false;
    this.essayViewer = options.essayViewer;
    this.onSelectionChange = options.onSelectionChange;
    this.currentSelection = null;

    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.clearSelection();
  }

  destroy() {
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.clearSelection();
  }

  handleMouseUp() {
    this.processSelection();
  }

  handleKeyUp(event) {
    const selectionKeys = ['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (selectionKeys.includes(event.key)) {
      this.processSelection();
    }
  }

  processSelection() {
    if (!this.enabled) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      this.clearSelection();
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const startElement = this.getRangeBoundaryElement(range.startContainer);
    const endElement = this.getRangeBoundaryElement(range.endContainer);

    const startParagraph = startElement?.closest?.('[data-paragraph-id]');
    const endParagraph = endElement?.closest?.('[data-paragraph-id]');
    if (!startParagraph || !endParagraph || startParagraph !== endParagraph) {
      this.clearSelection();
      return;
    }

    const paragraphId = startParagraph.dataset.paragraphId;
    const offsets = this.calculateOffsets(range, startParagraph);
    if (!offsets || offsets.end <= offsets.start) {
      this.clearSelection();
      return;
    }

    const rect = range.getBoundingClientRect();
    const selectionData = {
      range,
      paragraphId,
      paragraphElement: startParagraph,
      startOffset: offsets.start,
      endOffset: offsets.end,
      text: range.toString(),
      rect,
      anchorContext: this.buildAnchorContext(startParagraph, offsets)
    };

    this.currentSelection = selectionData;
    if (typeof this.onSelectionChange === 'function') {
      this.onSelectionChange(selectionData);
    }
  }

  clearSelection() {
    this.currentSelection = null;
    if (typeof this.onSelectionChange === 'function') {
      this.onSelectionChange(null);
    }
  }

  getRangeBoundaryElement(container) {
    return container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
  }

  calculateOffsets(range, root) {
    try {
      const preRange = range.cloneRange();
      preRange.selectNodeContents(root);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const length = range.toString().length;
      return {
        start,
        end: start + length
      };
    } catch (error) {
      console.warn('⚠️ 無法計算文字偏移:', error);
      return null;
    }
  }

  buildAnchorContext(root, offsets) {
    try {
      const text = root.textContent || '';
      return {
        before: text.slice(Math.max(0, offsets.start - 50), offsets.start),
        after: text.slice(offsets.end, Math.min(text.length, offsets.end + 50)),
        paragraph_id: root.dataset?.paragraphId || null,
        start_offset: offsets.start,
        end_offset: offsets.end
      };
    } catch (error) {
      console.warn('⚠️ 無法建立錨定上下文:', error);
      return null;
    }
  }
}

class AnnotationManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.essayId = null;
    this.store = new AnnotationStore();
    this.renderer = null;
    this.selectionManager = null;
    this.currentUser = null;
    this.isSelectionMode = false;
    this.initialized = false;
  }

  async init(essayId, paragraphInfo) {
    if (this.initialized) {
      return;
    }

    this.essayId = essayId;
    const paragraphIds = Array.isArray(paragraphInfo)
      ? paragraphInfo.map(item => (typeof item === 'string' ? item : item?.id)).filter(Boolean)
      : [];
    this.store.setEssay(essayId, paragraphInfo || []);

    const essayViewer = document.getElementById('essayViewer');
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!essayViewer || !wrapper) {
      console.error('❌ 無法初始化批注系統：缺少必要容器');
      return;
    }

    this.renderer = new AnnotationRenderer({
      essayViewer,
      wrapper,
      store: this.store,
      handlers: {
        onAnnotationFocus: (annotationId) => this.focusAnnotation(annotationId),
        onAnnotationEdit: (annotationId) => this.handleEditAnnotation(annotationId),
        onAnnotationDelete: (annotationId) => this.handleDeleteAnnotation(annotationId)
      }
    });

    this.selectionManager = new AnnotationSelectionManager({
      essayViewer,
      onSelectionChange: (selection) => this.handleSelectionChange(selection)
    });

    this.currentUser = this.getCurrentUser();

    await this.loadAnnotations(paragraphIds);
    this.initialized = true;
  }

  enableSelectionMode() {
    this.isSelectionMode = true;
    if (this.selectionManager) {
      this.selectionManager.enable();
    }
    document.body.classList.add('annotation-selection-mode');
  }

  disableSelectionMode() {
    this.isSelectionMode = false;
    if (this.selectionManager) {
      this.selectionManager.disable();
    }
    if (this.renderer) {
      this.renderer.hideAnnotationButton();
      this.renderer.hideSelectionPreview();
    }
    document.body.classList.remove('annotation-selection-mode');
  }

  async loadAnnotations(paragraphIds) {
    const targetIds = paragraphIds && paragraphIds.length ? paragraphIds : this.store.getParagraphIds();
    if (!targetIds || targetIds.length === 0) {
      this.store.reset([]);
      if (this.renderer) {
        this.renderer.clearAll();
      }
      return;
    }
    try {
      if (this.renderer) {
        this.renderer.clearAll();
      }
      const { data, error } = await this.supabase
        .from('annotations')
        .select('*, teacher:users!annotations_teacher_id_fkey(display_name, email)')
        .in('paragraph_id', targetIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      this.store.reset(data || []);
      const annotations = this.store.getAllSorted();
      this.renderer.renderInitial(annotations);
      this.updateAnnotationCount();
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      toast.error('載入批注失敗，請稍後再試');
    }
  }

  handleSelectionChange(selection) {
    if (!selection || !this.isSelectionMode) {
      this.renderer.hideSelectionPreview();
      this.renderer.hideAnnotationButton();
      return;
    }
    this.renderer.showSelectionPreview(selection);
    this.renderer.showAnnotationButton(selection, () => this.handleCreateAnnotation(selection));
  }

  async handleCreateAnnotation(selection) {
    if (!this.currentUser?.id) {
      toast.error('未能識別當前教師，請重新登入後重試');
      this.renderer.hideSelectionPreview();
      return;
    }
    if (!selection) {
      return;
    }
    this.renderer.hideAnnotationButton();
    const content = await this.renderer.openAnnotationEditor({
      mode: 'create',
      defaultContent: '',
      anchorRect: selection.rect,
      currentUser: this.currentUser
    });

    if (!content) {
      this.renderer.hideSelectionPreview();
      return;
    }

    const pendingAnnotation = this.store.createPendingAnnotation(selection, content, this.currentUser);
    this.store.add(pendingAnnotation);
    this.renderer.renderAnnotation(pendingAnnotation, {
      range: selection.range,
      isPending: true
    });

    this.renderer.hideSelectionPreview();
    window.getSelection()?.removeAllRanges?.();

    try {
      const payload = toDatabasePayload(pendingAnnotation);
      const { data, error } = await this.supabase
        .from('annotations')
        .insert(payload)
        .select('*, teacher:users!annotations_teacher_id_fkey(display_name, email)')
        .single();
      if (error) throw error;
      const savedAnnotation = toInternalAnnotation(data);
      const tempHighlight = this.renderer.highlights.get(pendingAnnotation.id);
      if (tempHighlight) {
        tempHighlight.dataset.annotationId = savedAnnotation.id;
        this.renderer.highlights.delete(pendingAnnotation.id);
        this.renderer.highlights.set(savedAnnotation.id, tempHighlight);
      }
      const tempCard = this.renderer.cards.get(pendingAnnotation.id);
      if (tempCard) {
        tempCard.dataset.annotationId = savedAnnotation.id;
        this.renderer.cards.delete(pendingAnnotation.id);
        this.renderer.cards.set(savedAnnotation.id, tempCard);
      }
      this.store.replace(pendingAnnotation.id, savedAnnotation);
      this.renderer.renderAnnotation(savedAnnotation);
      this.focusAnnotation(savedAnnotation.id);
      toast.success('批注已添加');
      this.updateAnnotationCount();
    } catch (error) {
      console.error('❌ 創建批注失敗:', error);
      toast.error('批注新增失敗，請稍後再試');
      this.store.remove(pendingAnnotation.id);
      this.renderer.removeAnnotation(pendingAnnotation.id);
    }
  }

  async handleEditAnnotation(annotationId) {
    const annotation = this.store.get(annotationId);
    if (!annotation) return;
    const highlight = this.renderer.highlights.get(annotationId);
    const rect = highlight?.getBoundingClientRect();
    const wrapperRect = this.renderer.wrapper.getBoundingClientRect();
    const anchorRect = rect
      ? {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height
        }
      : {
          top: wrapperRect.top + this.renderer.wrapper.scrollTop,
          bottom: wrapperRect.top + this.renderer.wrapper.scrollTop,
          left: wrapperRect.left,
          right: wrapperRect.right,
          width: wrapperRect.width,
          height: wrapperRect.height
        };

    const newContent = await this.renderer.openAnnotationEditor({
      mode: 'edit',
      defaultContent: annotation.content,
      anchorRect,
      currentUser: this.currentUser
    });

    if (!newContent || newContent === annotation.content) {
      return;
    }

    const previousContent = annotation.content;
    this.store.update(annotationId, { content: newContent });
    this.renderer.updateAnnotation(this.store.get(annotationId));

    try {
      const { error } = await this.supabase
        .from('annotations')
        .update({ content: newContent })
        .eq('id', annotationId);
      if (error) throw error;
      toast.success('批注已更新');
    } catch (error) {
      console.error('❌ 更新批注失敗:', error);
      toast.error('批注更新失敗，已還原原始內容');
      this.store.update(annotationId, { content: previousContent });
      this.renderer.updateAnnotation(this.store.get(annotationId));
    }
  }

  handleDeleteAnnotation(annotationId) {
    const annotation = this.store.get(annotationId);
    if (!annotation) return;
    dialog.confirmDelete({
      title: '刪除批注',
      message: '確定要刪除這個批注嗎？<br><br>此操作無法撤銷。',
      onConfirm: async () => {
        this.store.remove(annotationId);
        this.renderer.removeAnnotation(annotationId);
        this.updateAnnotationCount();
        try {
          const { error } = await this.supabase
            .from('annotations')
            .delete()
            .eq('id', annotationId);
          if (error) throw error;
          toast.success('批注已刪除');
        } catch (error) {
          console.error('❌ 刪除批注失敗:', error);
          toast.error('批注刪除失敗，將重新載入資料');
          await this.loadAnnotations(this.store.getParagraphIds());
        }
      }
    });
  }

  focusAnnotation(annotationId) {
    this.renderer.setActive(annotationId);
  }

  getCurrentUser() {
    if (window.AppState?.currentUser) {
      return window.AppState.currentUser;
    }
    const session = this.supabase?.auth?.session;
    if (typeof session === 'function') {
      try {
        return session()?.user || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  destroy() {
    this.disableSelectionMode();
    if (this.renderer) {
      this.renderer.clearAll();
      this.renderer.hideAnnotationButton();
      this.renderer.hideSelectionPreview();
    }
    if (this.selectionManager) {
      this.selectionManager.destroy();
    }
    this.store = new AnnotationStore();
    this.renderer = null;
    this.selectionManager = null;
    this.initialized = false;
  }

  updateAnnotationCount() {
    const counter = document.querySelector('.annotation-count');
    if (!counter) return;
    const total = this.store.annotations.size;
    counter.textContent = `${total} 個批注`;
  }
}

export default AnnotationManager;
