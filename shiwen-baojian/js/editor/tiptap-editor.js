/**
 * ProseMirror 基礎封裝（TipTap 方向的最小實作）
 * 說明：
 * - 無打包工具，採用 esm.sh CDN 載入 ProseMirror ESM 模組
 * - 提供最小 API：init、getJSON、setJSON、getText、destroy、onUpdate
 * - 後續可替換為 TipTap，但此封裝可先落地文檔級存取與裝飾
 */

import { EditorState, Plugin, PluginKey, EditorView, Schema, PMDOMParser, keymap, baseKeymap, history, toggleMark } from './pm-vendor.js';

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

    const plugins = [history(), markKeymap, keymap(baseKeymap), updatePlugin, pastePlugin, ...(Array.isArray(extraPlugins) ? extraPlugins : [])];

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
}

export default PMEditor;


