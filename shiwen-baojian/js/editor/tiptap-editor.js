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
  },
  // ProseMirror 原生批註標記：用於在文檔內持久化錨定（attrs.id 對應資料庫 annotation id）
  annotation: {
    attrs: { id: {} },
    inclusive: true,
    toDOM: (mark) => ['span', { 'data-annotation-id': String(mark.attrs.id || ''), class: 'pm-ann-mark' }, 0],
    parseDOM: [{ tag: 'span[data-annotation-id]', getAttrs: (el) => ({ id: el.getAttribute('data-annotation-id') }) }]
  }
};

function createSchema(extend = {}) {
  try {
    const extraNodes = extend?.nodes && typeof extend.nodes === 'object' ? extend.nodes : {};
    const extraMarks = extend?.marks && typeof extend.marks === 'object' ? extend.marks : {};
    // 合併：避免覆蓋既有節點/標記（同名則以擴展為準，允許重寫）
    const nodes = Object.assign({}, baseNodes, extraNodes);
    const marks = Object.assign({}, baseMarks, extraMarks);
    return new Schema({ nodes, marks });
  } catch (_) {
    // 回退至基礎 Schema
    return new Schema({ nodes: baseNodes, marks: baseMarks });
  }
}

export class PMEditor {
  constructor(container, { readOnly = false, initialJSON = null, onUpdate = null, extraPlugins = [], schemaExt = null } = {}) {
    this.container = container;
    this.onUpdate = typeof onUpdate === 'function' ? onUpdate : null;

    // 構建 Schema（允許擴展節點/標記）
    const schema = createSchema(schemaExt || undefined);
    this.schema = schema;

    let doc;
    try {
      if (initialJSON) {
        doc = schema.nodeFromJSON(initialJSON);
      }
    } catch (_) {}
    if (!doc) {
      doc = schema.node('doc', null, [schema.node('paragraph')]);
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

  const underlineType = schema.marks.underline;
  const strongType = schema.marks.strong;
  const emType = schema.marks.em;

    // 自訂快捷鍵：
    // - Cmd/Ctrl+U 切換底線；補強 B/I
    // - Shift+Enter（以及 Mod+Enter）插入硬換行（同段落內換行）
    const markKeymap = keymap({
      'Mod-b': strongType ? toggleMark(strongType) : undefined,
      'Mod-i': emType ? toggleMark(emType) : undefined,
      'Mod-u': underlineType ? toggleMark(underlineType) : undefined,
    });

    // 換行快捷鍵：插入 hard_break，避免產生新段落
    const brKeymap = keymap({
      'Shift-Enter': (state, dispatch) => {
        try {
          const br = state.schema.nodes.hard_break;
          if (!br) return false;
          if (dispatch) dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
          return true;
        } catch (_) { return false; }
      },
      'Mod-Enter': (state, dispatch) => {
        try {
          const br = state.schema.nodes.hard_break;
          if (!br) return false;
          if (dispatch) dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
          return true;
        } catch (_) { return false; }
      }
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
              const paraNode = schema.node('paragraph', null, cleaned ? schema.text(cleaned) : null);
              nodes.push(paraNode);
            });
            if (!nodes.length) return true; // 吃掉事件但不插入
            const tr = view.state.tr.replaceSelectionWith(schema.node('doc', null, nodes).content);
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

            // B) 以頂層索引為輔的判斷（向後相容）——僅當頂層為段落，且為最後一個頂層段落
            let inConclusionByIndex = false;
            // 準備最後一個頂層段落索引，供 Backspace 分支使用
            let lastParaIndex = -1;
            try {
              const topIndex = $from.index(1);
              const topCount = state.doc.childCount || state.doc.content.childCount || 0;
              for (let i = topCount - 1; i >= 0; i--) {
                const c = state.doc.child(i);
                if (c && c.type && c.type.name === 'paragraph') { lastParaIndex = i; break; }
              }
              const topNode = state.doc.child(Math.max(0, Math.min(topIndex, topCount - 1)));
              inConclusionByIndex = !!(topNode && topNode.type && topNode.type.name === 'paragraph' && topIndex === lastParaIndex);
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
              // 僅當存在上一個段落時阻止合併（忽略 bibliography 等非段落）
              if (atStart && lastParaIndex > 0) {
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
          const safeBuild = (doc) => {
            const posList = [];
            doc.descendants((node, pos) => {
              if (node.type.name !== 'paragraph') return true;
              // 忽略 bibliography 區塊內的段落
              try {
                const $pos = doc.resolve(pos);
                for (let d = 1; d <= $pos.depth; d++) {
                  const anc = $pos.node(d);
                  if (anc && anc.type && anc.type.name === 'bibliography') return true; // 跳過此段
                }
              } catch (_) {}
              posList.push(pos);
              return true;
            });
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
          try { if (!state || !state.doc) return DecorationSet.empty; return safeBuild(state.doc); } catch (_) { return DecorationSet.empty; }
        },
        apply: (tr, set, _old, state) => {
          if (!tr.docChanged && tr.getMeta(paraLabelKey) !== 'refresh') return set;
          // 重新生成標籤
          const doc = tr.doc;
          const posList = [];
          doc.descendants((node, pos) => {
            if (node.type.name !== 'paragraph') return true;
            // 忽略 bibliography 區塊內的段落
            try {
              const $pos = doc.resolve(pos);
              for (let d = 1; d <= $pos.depth; d++) {
                const anc = $pos.node(d);
                if (anc && anc.type && anc.type.name === 'bibliography') return true; // 跳過此段
              }
            } catch (_) {}
            posList.push(pos);
            return true;
          });
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

    // 注意：為了攔截 Enter，必須讓結論守護插件排在 keymap(baseKeymap) 之前；
    // 並且讓 brKeymap 在 baseKeymap 之前，確保 Shift+Enter 先被處理為硬換行。
    const plugins = [
      conclusionGuardPlugin,
      history(),
      markKeymap,
      brKeymap,
      keymap(baseKeymap),
      updatePlugin,
      pastePlugin,
      paraLabelPlugin,
      ...(Array.isArray(extraPlugins) ? extraPlugins : [])
    ];

    this.view = new EditorView(this.container, {
      state: EditorState.create({
        schema,
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
      const doc = this.schema.nodeFromJSON(json);
      const state = EditorState.create({ schema: this.schema, doc, plugins: this.view.state.plugins });
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


