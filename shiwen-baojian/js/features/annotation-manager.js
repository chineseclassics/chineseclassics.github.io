import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

const CONSTANTS = {
  CARD_WIDTH: 288,
  CARD_GAP: 18,
  CARD_MIN_HEIGHT: 120,
  CARD_RIGHT_OFFSET: 20,
  HIGHLIGHT_CLASS: 'annotation-highlight',
  HIGHLIGHT_ACTIVE_CLASS: 'active',
  HIGHLIGHT_PLACEHOLDER_CLASS: 'annotation-highlight annotation-highlight-orphan',
  BUTTON_OFFSET_X: 12,
  BUTTON_OFFSET_Y: -44,
  TEMP_ID_PREFIX: 'temp-annotation-'
};

const createTempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${CONSTANTS.TEMP_ID_PREFIX}${crypto.randomUUID()}`;
  }
  return `${CONSTANTS.TEMP_ID_PREFIX}${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const toInternalAnnotation = (record) => {
  if (!record) return null;
  let anchorContext = record.anchor_context || null;
  if (typeof anchorContext === 'string') {
    try {
      anchorContext = JSON.parse(anchorContext);
    } catch (error) {
      anchorContext = null;
    }
  }
  return {
    id: record.id,
    paragraphId: record.paragraph_id,
    teacherId: record.teacher_id,
    teacher: record.teacher || null,
    content: record.content,
    highlightStart: record.highlight_start,
    highlightEnd: record.highlight_end,
    anchorText: record.anchor_text || null,
    anchorContext,
    annotationType: record.annotation_type || 'comment',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    isResolved: record.is_resolved || false,
    isOrphaned: record.is_orphaned || false,
    priority: record.priority || 'normal',
    isPrivate: record.is_private || false,
    resolvedAt: record.resolved_at || null,
    resolvedBy: record.resolved_by || null
  };
};

const toDatabasePayload = (annotation) => ({
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
});

class AnnotationStore {
  constructor() {
    this.annotations = new Map();
    this.paragraphIndex = new Map();
    this.paragraphIds = [];
    this.essayId = null;
  }

  configureEssay(essayId, paragraphInfo = []) {
    this.essayId = essayId;
    this.paragraphIndex.clear();
    this.paragraphIds = [];
    paragraphInfo
      .map(item => (typeof item === 'string' ? { id: item } : item))
      .filter(Boolean)
      .forEach((item, idx) => {
        if (item?.id) {
          this.paragraphIndex.set(item.id, idx);
          this.paragraphIds.push(item.id);
        }
      });
  }

  reset(records = []) {
    this.annotations.clear();
    records.forEach(record => {
      const annotation = toInternalAnnotation(record);
      if (annotation?.id) {
        this.annotations.set(annotation.id, annotation);
      }
    });
  }

  upsert(annotation) {
    if (!annotation?.id) return;
    this.annotations.set(annotation.id, annotation);
  }

  remove(annotationId) {
    this.annotations.delete(annotationId);
  }

  get(annotationId) {
    return this.annotations.get(annotationId) || null;
  }

  getParagraphIndex(paragraphId) {
    if (!paragraphId) return Number.POSITIVE_INFINITY;
    if (this.paragraphIndex.has(paragraphId)) {
      return this.paragraphIndex.get(paragraphId);
    }
    return Number.POSITIVE_INFINITY;
  }

  getSortedAnnotations() {
    return Array.from(this.annotations.values()).sort((a, b) => {
      const paragraphA = this.getParagraphIndex(a.paragraphId);
      const paragraphB = this.getParagraphIndex(b.paragraphId);
      if (paragraphA !== paragraphB) return paragraphA - paragraphB;
      const startA = Number.isFinite(a.highlightStart) ? a.highlightStart : Number.POSITIVE_INFINITY;
      const startB = Number.isFinite(b.highlightStart) ? b.highlightStart : Number.POSITIVE_INFINITY;
      if (startA !== startB) return startA - startB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }
}

class HighlightEngine {
  constructor(essayViewer) {
    this.essayViewer = essayViewer;
    this.highlightMap = new Map();
  }

  getParagraphElement(paragraphId) {
    if (!paragraphId) return null;
    return this.essayViewer.querySelector(`[data-paragraph-id="${paragraphId}"]`);
  }

  removeHighlight(annotationId) {
    const highlight = this.highlightMap.get(annotationId);
    if (highlight) {
      this.unwrapHighlight(highlight);
      this.highlightMap.delete(annotationId);
    }
  }

  applyHighlight(annotation, options = {}) {
    const { paragraphId } = annotation;
    const paragraphElement = this.getParagraphElement(paragraphId);
    if (!paragraphElement) {
      return this.renderPlaceholder(annotation);
    }

    this.removeHighlight(annotation.id);

    let range = null;

    if (Number.isFinite(annotation.highlightStart) && Number.isFinite(annotation.highlightEnd)) {
      range = this.buildRangeFromOffsets(paragraphElement, annotation.highlightStart, annotation.highlightEnd);
    }

    if (!range && annotation.anchorText) {
      range = this.buildRangeFromAnchorText(paragraphElement, annotation.anchorText);
    }

    if (!range && options.selectionRange) {
      try {
        range = options.selectionRange.cloneRange();
      } catch (error) {
        range = null;
      }
    }

    if (range && range.toString && range.toString().length === 0 && annotation.anchorText) {
      range = this.buildRangeFromAnchorText(paragraphElement, annotation.anchorText);
    }

    if (!range) {
      return this.renderPlaceholder(annotation);
    }

    const highlightSpan = document.createElement('span');
    highlightSpan.className = CONSTANTS.HIGHLIGHT_CLASS;
    highlightSpan.dataset.annotationId = annotation.id;
    highlightSpan.dataset.paragraphId = paragraphId || '';

    this.wrapRange(range, highlightSpan);

    highlightSpan.addEventListener('click', (event) => {
      event.stopPropagation();
      if (options.onFocus) {
        options.onFocus(annotation.id);
      }
    });

    this.highlightMap.set(annotation.id, highlightSpan);
    return highlightSpan;
  }

  renderPlaceholder(annotation) {
    const paragraphElement = this.getParagraphElement(annotation.paragraphId) || this.essayViewer;
    const placeholder = document.createElement('span');
    placeholder.className = CONSTANTS.HIGHLIGHT_PLACEHOLDER_CLASS;
    placeholder.dataset.annotationId = annotation.id;
    placeholder.dataset.paragraphId = annotation.paragraphId || '';
    placeholder.dataset.orphan = 'true';
    placeholder.textContent = '原文已修改';
    paragraphElement.appendChild(placeholder);
    this.highlightMap.set(annotation.id, placeholder);
    return placeholder;
  }

  wrapRange(range, span) {
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

  findNodeForOffset(root, targetOffset) {
    if (typeof targetOffset !== 'number' || targetOffset < 0) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let currentOffset = 0;
    let node = walker.nextNode();
    while (node) {
      const length = node.textContent.length;
      const nextOffset = currentOffset + length;
      if (targetOffset <= nextOffset) {
        return {
          node,
          offset: targetOffset - currentOffset
        };
      }
      currentOffset = nextOffset;
      node = walker.nextNode();
    }
    if (root.lastChild && root.lastChild.nodeType === Node.TEXT_NODE) {
      return {
        node: root.lastChild,
        offset: root.lastChild.textContent.length
      };
    }
    return null;
  }
}

class LayoutEngine {
  constructor(wrapper) {
    this.wrapper = wrapper;
  }

  layout(items, anchorId = null) {
    if (!items.length) return;
    const wrapperRect = this.wrapper.getBoundingClientRect();
    const gap = CONSTANTS.CARD_GAP;

    items.sort((a, b) => {
      if (a.paragraphIndex !== b.paragraphIndex) {
        return a.paragraphIndex - b.paragraphIndex;
      }
      if (a.startOffset !== b.startOffset) {
        return a.startOffset - b.startOffset;
      }
      if (a.type === 'input' && b.type !== 'input') return -1;
      if (a.type !== 'input' && b.type === 'input') return 1;
      return 0;
    });

    const idealTop = (item) => {
      if (item.type === 'input') {
        if (item.linkedHighlight) {
          const rect = item.linkedHighlight.getBoundingClientRect();
          if (rect && rect.height > 0) {
            return rect.top - wrapperRect.top + this.wrapper.scrollTop - item.height / 2;
          }
        }
        if (item.previewRect) {
          return item.previewRect.top - wrapperRect.top + this.wrapper.scrollTop - item.height / 2;
        }
      }
      if (item.highlight) {
        const rect = item.highlight.getBoundingClientRect();
        if (rect && rect.height > 0) {
          const center = rect.top + rect.height / 2;
          return center - wrapperRect.top + this.wrapper.scrollTop - item.height / 2;
        }
        if (rect) {
          return rect.top - wrapperRect.top + this.wrapper.scrollTop;
        }
      }
      if (item.paragraphElement) {
        const rect = item.paragraphElement.getBoundingClientRect();
        return rect.top - wrapperRect.top + this.wrapper.scrollTop;
      }
      return null;
    };

    let runningBottom = null;
    items.forEach(item => {
      const ideal = idealTop(item);
      const fallback = runningBottom === null ? this.wrapper.scrollTop : runningBottom + gap;
      const minTop = runningBottom === null ? fallback : runningBottom + gap;
      item.top = Math.max(ideal !== null ? ideal : fallback, minTop);
      if (item.top < 0) item.top = 0;
      runningBottom = item.top + item.height;
    });

    if (anchorId) {
      const anchorItem = items.find(item => item.id === anchorId);
      if (anchorItem) {
        const anchorIdeal = idealTop(anchorItem);
        if (anchorIdeal !== null) {
          anchorItem.top = Math.max(0, anchorIdeal);
        }
        let prevBottom = anchorItem.top + anchorItem.height;
        items.filter(item => item !== anchorItem).forEach(item => {
          if (item.top < prevBottom + gap) {
            item.top = prevBottom + gap;
          }
          prevBottom = item.top + item.height;
        });
      }
    }

    // final pass to guarantee spacing
    let currentBottom = null;
    items.forEach(item => {
      if (currentBottom !== null && item.top < currentBottom + gap) {
        item.top = currentBottom + gap;
      }
      currentBottom = item.top + item.height;
    });

    items.forEach(item => {
      item.element.style.top = `${item.top}px`;
      item.element.style.right = `${CONSTANTS.CARD_RIGHT_OFFSET}px`;
      item.element.style.width = `${CONSTANTS.CARD_WIDTH}px`;
    });
  }
}

class AnnotationRenderer {
  constructor(options) {
    this.wrapper = options.wrapper;
    this.essayViewer = options.essayViewer;
    this.store = options.store;
    this.handlers = options.handlers || {};
    this.highlighter = new HighlightEngine(this.essayViewer);
    this.layoutEngine = new LayoutEngine(this.wrapper);
    this.cards = new Map();
    this.inputElement = null;
    this.inputMeta = null;
    this.selectionPreview = null;
    this.annotationButton = null;
    this.activeAnnotationId = null;
    this.boundAutoLayout = () => this.layoutAnnotations(this.activeAnnotationId);

    this.wrapper.addEventListener('scroll', this.boundAutoLayout);
    window.addEventListener('resize', this.boundAutoLayout);
  }

  dispose() {
    this.wrapper.removeEventListener('scroll', this.boundAutoLayout);
    window.removeEventListener('resize', this.boundAutoLayout);
    this.hideAnnotationButton();
    this.hideSelectionPreview();
    this.clearAll();
  }

  clearAll() {
    this.highlighter.highlightMap.forEach((_, id) => this.highlighter.removeHighlight(id));
    this.cards.forEach(card => card.remove());
    this.cards.clear();
    if (this.inputElement) {
      this.inputElement.remove();
    }
    this.inputElement = null;
    this.inputMeta = null;
  }

  renderAnnotations(annotations, options = {}) {
    const { activeId = null, selectionRange = null } = options;
    const usedIds = new Set();

    annotations.forEach(annotation => {
      usedIds.add(annotation.id);
      this.highlighter.applyHighlight(annotation, {
        selectionRange: selectionRange && selectionRange.annotationId === annotation.id ? selectionRange.range : null,
        onFocus: id => this.handlers.onAnnotationFocus?.(id)
      });
      const card = this.ensureCard(annotation);
      if (card && annotation.id === activeId) {
        card.classList.add('active');
      }
    });

    Array.from(this.cards.keys()).forEach(id => {
      if (!usedIds.has(id)) {
        const card = this.cards.get(id);
        if (card) card.remove();
        this.cards.delete(id);
        this.highlighter.removeHighlight(id);
      }
    });

    this.layoutAnnotations(activeId);
  }

  ensureCard(annotation) {
    let card = this.cards.get(annotation.id);
    if (!card) {
      card = document.createElement('div');
      card.className = 'floating-annotation';
      card.dataset.annotationId = annotation.id;
      card.style.position = 'absolute';
      card.style.width = `${CONSTANTS.CARD_WIDTH}px`;
      card.style.zIndex = 1001;
      card.addEventListener('click', (event) => {
        if (event.target.closest('.annotation-action-btn')) return;
        this.handlers.onAnnotationFocus?.(annotation.id);
      });

      this.wrapper.appendChild(card);
      this.cards.set(annotation.id, card);
    }

    const author = annotation.teacher?.display_name || annotation.teacher?.email || 'Unknown User';
    const initials = author.trim().charAt(0).toUpperCase() || 'U';
    const createdText = this.formatRelativeTime(annotation.createdAt);

    card.innerHTML = `
      <div class="annotation-header">
        <div class="annotation-avatar">${escapeHtml(initials)}</div>
        <div class="annotation-author">${escapeHtml(author)}</div>
        <div class="annotation-time">${escapeHtml(createdText)}</div>
      </div>
      <div class="annotation-content">${escapeHtml(annotation.content).replace(/\n/g, '<br>')}</div>
      <div class="annotation-actions">
        <button class="annotation-action-btn edit">編輯</button>
        <button class="annotation-action-btn delete">刪除</button>
      </div>
    `;

    card.querySelector('.edit').onclick = (event) => {
      event.stopPropagation();
      this.handlers.onAnnotationEdit?.(annotation.id);
    };
    card.querySelector('.delete').onclick = (event) => {
      event.stopPropagation();
      this.handlers.onAnnotationDelete?.(annotation.id);
    };

    return card;
  }

  formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60 * 1000) return '剛剛';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分鐘前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小時前`;
    return date.toLocaleDateString('zh-TW');
  }

  showSelectionPreview(selection) {
    this.hideSelectionPreview();
    if (!selection?.range) return;
    try {
      const previewSpan = document.createElement('span');
      previewSpan.className = `${CONSTANTS.HIGHLIGHT_CLASS} annotation-highlight-preview`;
      previewSpan.dataset.preview = 'true';
      const clonedRange = selection.range.cloneRange();
      this.highlighter.wrapRange(clonedRange, previewSpan);
      this.selectionPreview = previewSpan;
    } catch (error) {
      this.selectionPreview = null;
    }
  }

  hideSelectionPreview() {
    if (this.selectionPreview) {
      this.highlighter.unwrapHighlight(this.selectionPreview);
      this.selectionPreview = null;
    }
  }

  showAnnotationButton(selection, onCreate) {
    this.hideAnnotationButton();
    if (!selection?.rect) return;

    const button = document.createElement('button');
    button.className = 'annotation-button';
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
      onCreate?.();
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

  openEditor(options) {
    const { mode, defaultContent = '', anchorRect, selection, currentUser } = options;
    return new Promise((resolve) => {
      const container = document.createElement('div');
      container.className = 'floating-annotation-input';
      container.style.position = 'absolute';
      container.style.right = `${CONSTANTS.CARD_RIGHT_OFFSET}px`;
      container.style.width = `${CONSTANTS.CARD_WIDTH}px`;
      container.style.zIndex = 1100;

      const topOffset = anchorRect
        ? anchorRect.top - this.wrapper.getBoundingClientRect().top + this.wrapper.scrollTop - 10
        : this.wrapper.scrollTop + 20;
      container.style.top = `${Math.max(0, topOffset)}px`;

      const author = currentUser?.user_metadata?.full_name || currentUser?.email || 'Teacher';
      const initials = author.trim().charAt(0).toUpperCase() || 'T';

      container.innerHTML = `
        <div class="annotation-input-header">
          <div class="annotation-input-avatar">${escapeHtml(initials)}</div>
          <div class="annotation-input-author">${escapeHtml(author)}</div>
        </div>
        <textarea class="annotation-input-content" rows="3" placeholder="添加批註...">${escapeHtml(defaultContent)}</textarea>
        <div class="annotation-input-actions">
          <button class="annotation-input-btn cancel">取消</button>
          <button class="annotation-input-btn submit">${mode === 'edit' ? '更新' : '留言'}</button>
        </div>
      `;

      this.inputElement = container;
      this.inputMeta = {
        paragraphId: selection?.paragraphId || null,
        paragraphIndex: this.store.getParagraphIndex(selection?.paragraphId),
        startOffset: selection?.startOffset ?? Number.POSITIVE_INFINITY,
        previewRect: selection?.rect || null,
        linkedAnnotationId: null
      };

      this.wrapper.appendChild(container);
      this.layoutAnnotations(this.activeAnnotationId);

      const textarea = container.querySelector('.annotation-input-content');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      const cleanup = () => {
        if (this.inputElement === container) {
          this.inputElement = null;
          this.inputMeta = null;
        }
        container.remove();
        this.layoutAnnotations(this.activeAnnotationId);
      };

      container.querySelector('.cancel').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      container.querySelector('.submit').addEventListener('click', () => {
        const value = textarea.value.trim();
        if (!value) {
          toast.error('請輸入批註內容');
          return;
        }
        cleanup();
        resolve(value);
      });
    });
  }

  linkInputToAnnotation(annotationId) {
    if (this.inputMeta) {
      this.inputMeta.linkedAnnotationId = annotationId;
      this.inputMeta.previewRect = null;
    }
    this.layoutAnnotations(annotationId);
  }

  layoutAnnotations(anchorId = null) {
    const items = [];
    const annotations = this.store.getSortedAnnotations();

    annotations.forEach(annotation => {
      const card = this.cards.get(annotation.id);
      if (!card) return;
      items.push({
        type: 'card',
        id: annotation.id,
        element: card,
        highlight: this.highlighter.highlightMap.get(annotation.id) || null,
        paragraphIndex: this.store.getParagraphIndex(annotation.paragraphId),
        startOffset: Number.isFinite(annotation.highlightStart) ? annotation.highlightStart : Number.POSITIVE_INFINITY,
        paragraphElement: this.highlighter.getParagraphElement(annotation.paragraphId),
        height: Math.max(card.offsetHeight, CONSTANTS.CARD_MIN_HEIGHT)
      });
    });

    if (this.inputElement && this.inputMeta) {
      items.push({
        type: 'input',
        id: 'input',
        element: this.inputElement,
        linkedHighlight: this.inputMeta.linkedAnnotationId ? this.highlighter.highlightMap.get(this.inputMeta.linkedAnnotationId) : null,
        previewRect: this.inputMeta.previewRect || null,
        paragraphElement: this.inputMeta.paragraphId ? this.highlighter.getParagraphElement(this.inputMeta.paragraphId) : null,
        paragraphIndex: this.inputMeta.paragraphIndex,
        startOffset: this.inputMeta.startOffset,
        height: Math.max(this.inputElement.offsetHeight, CONSTANTS.CARD_MIN_HEIGHT)
      });
    }

    this.layoutEngine.layout(items, anchorId);
  }

  setActive(annotationId) {
    this.activeAnnotationId = annotationId;
    this.cards.forEach(card => card.classList.remove('active'));
    this.highlighter.highlightMap.forEach(span => span.classList.remove(CONSTANTS.HIGHLIGHT_ACTIVE_CLASS));
    if (!annotationId) return;
    const card = this.cards.get(annotationId);
    if (card) card.classList.add('active');
    const highlight = this.highlighter.highlightMap.get(annotationId);
    if (highlight) {
      highlight.classList.add(CONSTANTS.HIGHLIGHT_ACTIVE_CLASS);
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    this.layoutAnnotations(annotationId);
  }

  flashAnnotation(annotationId, duration = 1000) {
    this.setActive(annotationId);
    setTimeout(() => {
      this.clearActive(annotationId);
    }, duration);
  }

  clearActive(annotationId = null) {
    const targetId = annotationId || this.activeAnnotationId;
    if (!targetId) return;
    const card = this.cards.get(targetId);
    if (card) card.classList.remove('active');
    const highlight = this.highlighter.highlightMap.get(targetId);
    if (highlight) highlight.classList.remove(CONSTANTS.HIGHLIGHT_ACTIVE_CLASS);
    if (this.activeAnnotationId === targetId) {
      this.activeAnnotationId = null;
    }
  }
}

class SelectionController {
  constructor(essayViewer, onSelectionChange) {
    this.essayViewer = essayViewer;
    this.onSelectionChange = onSelectionChange;
    this.enabled = false;
    this.handleSelection = this.handleSelection.bind(this);
    document.addEventListener('mouseup', this.handleSelection);
    document.addEventListener('keyup', this.handleSelection);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.onSelectionChange?.(null);
  }

  destroy() {
    document.removeEventListener('mouseup', this.handleSelection);
    document.removeEventListener('keyup', this.handleSelection);
  }

  handleSelection(event) {
    if (!this.enabled) return;
    const target = event?.target;
    if (target?.closest?.('.annotation-button') || target?.closest?.('.floating-annotation-input')) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      this.onSelectionChange?.(null);
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const endNode = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement;
    const startParagraph = startNode?.closest?.('[data-paragraph-id]');
    const endParagraph = endNode?.closest?.('[data-paragraph-id]');
    if (!startParagraph || !endParagraph || startParagraph !== endParagraph) {
      this.onSelectionChange?.(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      this.onSelectionChange?.(null);
      return;
    }

    const paragraphText = startParagraph.textContent || '';
    const offsets = this.calculateOffsets(range, startParagraph);
    if (!offsets || offsets.end <= offsets.start) {
      this.onSelectionChange?.(null);
      return;
    }

    this.onSelectionChange?.({
      paragraphId: startParagraph.dataset.paragraphId,
      paragraphElement: startParagraph,
      startOffset: offsets.start,
      endOffset: offsets.end,
      text: range.toString(),
      range,
      rect
    });
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
      return null;
    }
  }
}

class AnnotationManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.store = new AnnotationStore();
    this.renderer = null;
    this.selectionController = null;
    this.currentUser = null;
    this.pendingSelection = null;
    this.initialized = false;
  }

  async init(essayId, paragraphInfo) {
    if (this.initialized) return;
    const essayViewer = document.getElementById('essayViewer');
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!essayViewer || !wrapper) {
      console.error('❌ 無法初始化批注系統：缺少必要容器');
      return;
    }

    this.store.configureEssay(essayId, paragraphInfo);
    this.renderer = new AnnotationRenderer({
      wrapper,
      essayViewer,
      store: this.store,
      handlers: {
        onAnnotationFocus: (id) => this.focusAnnotation(id),
        onAnnotationEdit: (id) => this.editAnnotation(id),
        onAnnotationDelete: (id) => this.deleteAnnotation(id)
      }
    });

    this.selectionController = new SelectionController(essayViewer, (selection) => this.handleSelection(selection));
    this.enableSelectionMode();

    this.currentUser = await this.getCurrentUser();
    await this.loadAnnotations();
    this.initialized = true;
  }

  async getCurrentUser() {
    if (window.AppState?.currentUser) {
      return window.AppState.currentUser;
    }
    if (this.supabase?.auth?.getUser) {
      try {
        const { data } = await this.supabase.auth.getUser();
        return data?.user || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  async loadAnnotations() {
    const paragraphIds = this.store.paragraphIds;
    if (!paragraphIds.length) {
      this.store.reset([]);
      this.renderer.clearAll();
      return;
    }
    try {
      const { data, error } = await this.supabase
        .from('annotations')
        .select('*, teacher:users!annotations_teacher_id_fkey(display_name, email)')
        .in('paragraph_id', paragraphIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      this.store.reset(data || []);
      this.renderer.renderAnnotations(this.store.getSortedAnnotations());
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      toast.error('載入批註失敗，請稍後再試');
    }
  }

  enableSelectionMode() {
    this.selectionController?.enable();
    document.body.classList.add('annotation-selection-mode');
  }

  disableSelectionMode() {
    this.selectionController?.disable();
    this.renderer?.hideAnnotationButton();
    this.renderer?.hideSelectionPreview();
    document.body.classList.remove('annotation-selection-mode');
  }

  handleSelection(selection) {
    this.pendingSelection = selection;
    if (!selection) {
      this.renderer.hideAnnotationButton();
      this.renderer.hideSelectionPreview();
      return;
    }
    this.renderer.showSelectionPreview(selection);
    this.renderer.showAnnotationButton(selection, () => this.createAnnotation());
  }

  async ensureCurrentUser() {
    if (this.currentUser?.id) return this.currentUser;
    this.currentUser = await this.getCurrentUser();
    if (!this.currentUser?.id) {
      toast.error('未能識別當前教師，請重新登入後重試');
      return null;
    }
    return this.currentUser;
  }

  async createAnnotation() {
    if (!this.pendingSelection) return;

    const selection = this.pendingSelection;
    this.renderer.hideAnnotationButton();

    const editorResult = await this.renderer.openEditor({
      mode: 'create',
      defaultContent: '',
      anchorRect: selection.rect,
      selection,
      currentUser: this.currentUser || {}
    });

    if (!editorResult) {
      this.renderer.hideSelectionPreview();
      return;
    }

    const user = await this.ensureCurrentUser();
    if (!user) {
      this.renderer.hideSelectionPreview();
      return;
    }

    const anchorContext = {
      before: selection.paragraphElement.textContent.slice(Math.max(0, selection.startOffset - 50), selection.startOffset),
      after: selection.paragraphElement.textContent.slice(selection.endOffset, selection.endOffset + 50),
      paragraph_id: selection.paragraphId,
      start_offset: selection.startOffset,
      end_offset: selection.endOffset
    };

    const pendingAnnotation = {
      id: createTempId(),
      paragraphId: selection.paragraphId,
      teacherId: user.id,
      teacher: {
        display_name: user.user_metadata?.full_name || null,
        email: user.email || null
      },
      content: editorResult,
      highlightStart: selection.startOffset,
      highlightEnd: selection.endOffset,
      anchorText: selection.text,
      anchorContext,
      annotationType: 'comment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isResolved: false,
      isOrphaned: false,
      priority: 'normal',
      isPrivate: false
    };

    this.store.upsert(pendingAnnotation);
    this.renderer.hideSelectionPreview();
    this.renderer.renderAnnotations(this.store.getSortedAnnotations(), {
      activeId: pendingAnnotation.id,
      selectionRange: { annotationId: pendingAnnotation.id, range: highlightRange }
    });
    this.renderer.linkInputToAnnotation(pendingAnnotation.id);

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
      this.store.remove(pendingAnnotation.id);
      this.store.upsert(savedAnnotation);
      this.renderer.highlighter.removeHighlight(pendingAnnotation.id);
      this.renderer.renderAnnotations(this.store.getSortedAnnotations(), { activeId: savedAnnotation.id });
      this.renderer.flashAnnotation(savedAnnotation.id);
      toast.success('批註已添加');
    } catch (error) {
      console.error('❌ 創建批註失敗:', error);
      this.store.remove(pendingAnnotation.id);
      this.renderer.renderAnnotations(this.store.getSortedAnnotations());
      toast.error('批註新增失敗，請稍後再試');
    }
  }

  async editAnnotation(annotationId) {
    const annotation = this.store.get(annotationId);
    if (!annotation) return;

    const highlight = this.renderer.highlighter.highlightMap.get(annotationId);
    const rect = highlight?.getBoundingClientRect();

    const result = await this.renderer.openEditor({
      mode: 'edit',
      defaultContent: annotation.content,
      anchorRect: rect || null,
      selection: null,
      currentUser: this.currentUser || {}
    });

    if (!result || result === annotation.content) {
      return;
    }

    const previous = annotation.content;
    this.store.upsert({ ...annotation, content: result, updatedAt: new Date().toISOString() });
    this.renderer.renderAnnotations(this.store.getSortedAnnotations(), { activeId: annotationId });

    try {
      const { error } = await this.supabase
        .from('annotations')
        .update({ content: result })
        .eq('id', annotationId);
      if (error) throw error;
      toast.success('批註已更新');
    } catch (error) {
      this.store.upsert({ ...annotation, content: previous });
      this.renderer.renderAnnotations(this.store.getSortedAnnotations(), { activeId: annotationId });
      console.error('❌ 更新批註失敗:', error);
      toast.error('批註更新失敗，已還原原內容');
    }
  }

  deleteAnnotation(annotationId) {
    const annotation = this.store.get(annotationId);
    if (!annotation) return;
    dialog.confirmDelete({
      title: '刪除批註',
      message: '確定要刪除這條批註嗎？此操作無法撤銷。',
      onConfirm: async () => {
        this.store.remove(annotationId);
        this.renderer.highlighter.removeHighlight(annotationId);
        const card = this.renderer.cards.get(annotationId);
        if (card) card.remove();
        this.renderer.cards.delete(annotationId);
        this.renderer.layoutAnnotations();
        try {
          const { error } = await this.supabase
            .from('annotations')
            .delete()
            .eq('id', annotationId);
          if (error) throw error;
          toast.success('批註已刪除');
        } catch (error) {
          console.error('❌ 刪除批註失敗:', error);
          toast.error('批註刪除失敗，將重新載入資料');
          await this.loadAnnotations();
        }
      }
    });
  }

  focusAnnotation(annotationId) {
    this.renderer.setActive(annotationId);
  }

  destroy() {
    this.disableSelectionMode();
    this.selectionController?.destroy();
    this.renderer?.dispose();
    this.store = new AnnotationStore();
    this.renderer = null;
    this.selectionController = null;
    this.initialized = false;
  }
}

export default AnnotationManager;
