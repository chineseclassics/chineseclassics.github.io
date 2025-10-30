/**
 * ProseMirror 基礎封裝（TipTap 方向的最小實作）
 * 說明：
 * - 無打包工具，採用 esm.sh CDN 載入 ProseMirror ESM 模組
 * - 提供最小 API：init、getJSON、setJSON、getText、destroy、onUpdate
 * - 後續可替換為 TipTap，但此封裝可先落地文檔級存取與裝飾
 */

import { EditorState, Plugin, PluginKey, EditorView, Schema, PMDOMParser, keymap, baseKeymap, history, toggleMark, Decoration, DecorationSet } from './pm-vendor.js';

const baseNodes = {
  doc: { content: 'block+' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    toDOM: () => ['p', 0],
    parseDOM: [{ tag: 'p' }]
  },
  text: { group: 'inline' },
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    toDOM: () => ['br'],
    parseDOM: [{ tag: 'br' }]
  }
};

const baseMarks = {
  strong: {
    toDOM: () => ['strong', 0],
    parseDOM: [{ tag: 'strong' }, { tag: 'b', getAttrs: () => null }, { style: 'font-weight=bold' }]
  },
  em: {
    toDOM: () => ['em', 0],
    parseDOM: [{ tag: 'em' }, { tag: 'i', getAttrs: () => null }, { style: 'font-style=italic' }]
  },
  underline: {
    toDOM: () => ['u', 0],
    parseDOM: [{ tag: 'u' }]
  }
};

const baseSchema = new Schema({ nodes: baseNodes, marks: baseMarks });

export class PMEditor {
  constructor(container, { readOnly = false, initialJSON = null, onUpdate = null, extraPlugins = [] } = {}) {
    this.container = container;
    this.onUpdate = typeof onUpdate === 'function' ? onUpdate : null;

    let doc;
    try {
      if (initialJSON) {
        doc = baseSchema.nodeFromJSON(initialJSON);
      }
    } catch (_) {}
    if (!doc) {
      doc = baseSchema.node('doc', null, [baseSchema.node('paragraph')]);
    }

    const updatePlugin = new Plugin({
      key: new PluginKey('pm-update'),
      view: () => ({
        update: (view, prevState) => {
          if (this.onUpdate && prevState.doc !== view.state.doc) {
            this.onUpdate(this);
          }
        }
      })
    });

    const underlineType = baseSchema.marks.underline;
    const strongType = baseSchema.marks.strong;
    const emType = baseSchema.marks.em;

    // 自訂快捷鍵：加入 Cmd/Ctrl+U 切換底線；補強 B/I
    const markKeymap = keymap({
      'Mod-b': strongType ? toggleMark(strongType) : undefined,
      'Mod-i': emType ? toggleMark(emType) : undefined,
      'Mod-u': underlineType ? toggleMark(underlineType) : undefined,
    });

    // 貼上處理：偏好純文本，保留換行 → 轉為段落
    const pastePlugin = new Plugin({
      key: new PluginKey('pm-plain-paste'),
      props: {
        handlePaste: (view, event, slice) => {
          try {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false; // 沒有純文本時走默認
            const paragraphs = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
            const nodes = [];
            paragraphs.forEach((p, idx) => {
              const cleaned = p.replace(/\u00A0/g, ' '); // nbsp → space
              const paraNode = baseSchema.node('paragraph', null, cleaned ? baseSchema.text(cleaned) : null);
              nodes.push(paraNode);
            });
            if (!nodes.length) return true; // 吃掉事件但不插入
            const tr = view.state.tr.replaceSelectionWith(baseSchema.node('doc', null, nodes).content);
            view.dispatch(tr.scrollIntoView());
            return true;
          } catch (e) {
            // 若出錯，回退默認行為
            return false;
          }
        }
      }
    });

    // 結論守護插件：
    // 1) 保證文檔至少有兩個段落（首=引言，末=結論）
    // 2) 在結論段內禁止 Enter 產生新段（允許 Shift+Enter = 換行）
    // 3) 可選：在結論段開頭禁止 Backspace 與前段合併（避免破壞尾段作為結論的結構）
    const conclusionGuardKey = new PluginKey('pm-conclusion-guard');
    const conclusionGuardPlugin = new Plugin({
      key: conclusionGuardKey,
      view: (view) => {
        // 初始化與每次文檔更新後檢查：確保至少兩段
        const ensureTwoParagraphs = () => {
          try {
            const { state } = view;
            const count = state.doc.content.childCount || 0;
            if (count < 2) {
              const p = state.schema.node('paragraph');
              const tr = state.tr.insert(state.doc.content.size, p);
              view.dispatch(tr);
            }
          } catch (_) {}
        };
        // 初始化即檢查
        setTimeout(ensureTwoParagraphs, 0);
        return {
          update: () => { ensureTwoParagraphs(); }
        };
      },
      props: {
        handleKeyDown: (view, event) => {
          try {
            const { state } = view;
            const sel = state.selection;
            if (!sel || !sel.$from) return false;
            const $from = sel.$from;
            // A) 以 DOM 徽章為主的判斷：若當前段落含有 `.pm-par-label.conclusion`，視為結論
            let inConclusionByBadge = false;
            try {
              const domInfo = view.domAtPos($from.pos);
              const startNode = domInfo && domInfo.node ? domInfo.node : null;
              const el = startNode && startNode.nodeType === 3 /* TEXT_NODE */ ? startNode.parentNode : startNode;
              // 找到最近的段落元素
              const p = el && typeof el.closest === 'function' ? el.closest('p') : null;
              if (p && p.querySelector) {
                const badge = p.querySelector('.pm-par-label.conclusion');
                if (badge) inConclusionByBadge = true;
              }
            } catch (_) { /* 忽略 DOM 對映異常，改走索引邏輯 */ }

            // B) 以頂層索引為輔的判斷（向後相容）
            let inConclusionByIndex = false;
            try {
              const index = $from.index(1);
              const total = state.doc.childCount || state.doc.content.childCount || 0;
              inConclusionByIndex = index === total - 1;
            } catch (_) { inConclusionByIndex = false; }

            const inConclusion = inConclusionByBadge || inConclusionByIndex;

            // 在結論段：禁止 Enter 產生新段（仍允許 Shift+Enter = 換行）
            if (inConclusion && event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              return true; // 攔截
            }
            // 在結論段段首，阻止 Backspace 與上一段合併
            if (inConclusion && event.key === 'Backspace') {
              const atStart = $from.parentOffset === 0 && sel.empty;
              if (atStart && total > 1) {
                event.preventDefault();
                return true;
              }
            }
          } catch (_) {}
          return false;
        }
      }
    });

    // 段落標籤插件：首段顯示「引言」，末段顯示「結論」（使用醒目顏色），中間依序「分論點一、二、三…」
    const paraLabelKey = new PluginKey('pm-paragraph-labels');
    const createParaLabelEl = (label, kind) => {
      const span = document.createElement('span');
      span.className = 'pm-par-label' + (kind ? ` ${kind}` : '');
      // 樣式全部交由 CSS 控制（定位、配色、字體等）；此處僅賦值文字
      span.textContent = label;
      return span;
    };
    const paraLabelPlugin = new Plugin({
      key: paraLabelKey,
      state: {
        init: (_cfg, state) => {
          const build = (doc) => {
            const posList = [];
            doc.descendants((node, pos) => { if (node.type.name === 'paragraph') posList.push(pos); });
            const total = posList.length;
            const decos = [];
            posList.forEach((pos, idx) => {
              let label = '';
              let kind = '';
              if (idx === 0) { label = '引言'; kind = 'intro'; }
              else if (idx === total - 1) { label = '結論'; kind = 'conclusion'; }
              else { label = `分論點${numToCN(idx)}`; kind = 'body'; }
              decos.push(Decoration.widget(pos + 1, () => createParaLabelEl(label, kind), { side: -1, ignoreSelection: true }));
            });
            return DecorationSet.create(doc, decos);
          };
          return build(state.doc);
        },
        apply: (tr, set, _old, state) => {
          if (!tr.docChanged && tr.getMeta(paraLabelKey) !== 'refresh') return set;
          // 重新生成標籤
          const doc = tr.doc;
          const posList = [];
          doc.descendants((node, pos) => { if (node.type.name === 'paragraph') posList.push(pos); });
          const total = posList.length;
          const decos = [];
          posList.forEach((pos, idx) => {
            let label = '';
            let kind = '';
            if (idx === 0) { label = '引言'; kind = 'intro'; }
            else if (idx === total - 1) { label = '結論'; kind = 'conclusion'; }
            else { label = `分論點${numToCN(idx)}`; kind = 'body'; }
            decos.push(Decoration.widget(pos + 1, () => createParaLabelEl(label, kind), { side: -1, ignoreSelection: true }));
          });
          return DecorationSet.create(doc, decos);
        }
      },
      props: {
        decorations(state) { return this.getState(state); }
      }
    });

    // 注意：為了攔截 Enter，必須讓結論守護插件排在 keymap(baseKeymap) 之前
    const plugins = [
      conclusionGuardPlugin,
      history(),
      markKeymap,
      keymap(baseKeymap),
      updatePlugin,
      pastePlugin,
      paraLabelPlugin,
      ...(Array.isArray(extraPlugins) ? extraPlugins : [])
    ];

    this.view = new EditorView(this.container, {
      state: EditorState.create({
        schema: baseSchema,
        doc,
        plugins
      }),
      editable: () => !readOnly
    });
  }

  getJSON() {
    return this.view.state.doc.toJSON();
  }

  setJSON(json) {
    try {
      const doc = baseSchema.nodeFromJSON(json);
      const state = EditorState.create({ schema: baseSchema, doc, plugins: this.view.state.plugins });
      this.view.updateState(state);
    } catch (e) {
      console.warn('setJSON 失敗:', e);
    }
  }

  getText() {
    return this.view.state.doc.textContent || '';
  }

  getHTML() {
    try {
      const { doc } = this.view.state;
      const parts = [];
      doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          const text = node.textContent || '';
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          parts.push(`<p>${escaped}</p>`);
          return false;
        }
        return true;
      });
      return parts.join('');
    } catch (_) { return ''; }
  }

  getWordCount() {
    const text = this.getText();
    return { total: (text || '').length };
  }

  addPlugins(pluginsToAdd = []) {
    try {
      const state = this.view.state;
      const next = EditorState.create({
        schema: state.schema,
        doc: state.doc,
        plugins: [...state.plugins, ...(Array.isArray(pluginsToAdd) ? pluginsToAdd : [])]
      });
      this.view.updateState(next);
    } catch (e) {
      console.warn('addPlugins 失敗:', e);
    }
  }

  destroy() {
    try { this.view.destroy(); } catch (_) {}
  }

  getParagraphCount() {
    try {
      let count = 0;
      this.view.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') count += 1;
        return true;
      });
      return count;
    } catch (_) { return 0; }
  }

  // 取得所有段落文字陣列（按順序）
  getParagraphTexts() {
    try {
      const texts = [];
      this.view.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          texts.push((node.textContent || '').trim());
          return false;
        }
        return true;
      });
      return texts;
    } catch (_) { return []; }
  }

  // 完整度計算：首段=引言；末段=結論；中段=分論點們
  getCompleteness() {
    const texts = this.getParagraphTexts();
    const total = texts.length;
    const introText = total > 0 ? texts[0] : '';
    const conclusionText = total > 1 ? texts[total - 1] : '';
    const bodyTexts = total > 2 ? texts.slice(1, total - 1) : [];
    return {
      total,
      intro: { label: '引言', complete: !!(introText && introText.length > 0) },
      bodies: bodyTexts.map((t, i) => ({ label: `分論點${numToCN(i + 1)}`, complete: !!(t && t.length > 0) })),
      conclusion: { label: '結論', complete: !!(conclusionText && conclusionText.length > 0) }
    };
  }
}

export default PMEditor;

// 阿拉伯數字轉中文小寫（1→一，2→二...）簡版
function numToCN(n) {
  const map = ['零','一','二','三','四','五','六','七','八','九'];
  if (n >= 1 && n <= 9) return map[n];
  // 10 以上簡化處理：顯示阿拉伯數字
  return String(n);
}


