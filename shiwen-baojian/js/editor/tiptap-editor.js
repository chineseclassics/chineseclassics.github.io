/**
 * ProseMirror 基礎封裝（TipTap 方向的最小實作）
 * 說明：
 * - 無打包工具，採用 esm.sh CDN 載入 ProseMirror ESM 模組
 * - 提供最小 API：init、getJSON、setJSON、getText、destroy、onUpdate
 * - 後續可替換為 TipTap，但此封裝可先落地文檔級存取與裝飾
 */

import { EditorState, Plugin, PluginKey, EditorView, Schema, PMDOMParser, keymap, baseKeymap, history } from './pm-vendor.js';

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

    const plugins = [history(), keymap(baseKeymap), updatePlugin, ...(Array.isArray(extraPlugins) ? extraPlugins : [])];

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
}

export default PMEditor;


