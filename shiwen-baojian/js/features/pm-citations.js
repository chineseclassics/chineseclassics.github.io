/**
 * ProseMirror 引用插件與 Schema 擴展
 * - inline atom: citation（attrs: key, loc, label）
 * - block: bibliography（內容由命令刷新，包含多個 paragraph 條目）
 * - 插入命令：insertCitationAtCaret(key, loc)
 * - 刷新命令：refreshBibliography()
 * - 對外 API：透過 window 掛載便於 UI（文房之寶）呼叫
 */

import { Plugin, PluginKey } from '../editor/pm-vendor.js';
import citationStore from './citation-manager.js';

// Schema 擴展：citation & bibliography
export function getCitationSchemaExtensions() {
  return {
    nodes: {
      citation: {
        inline: true,
        group: 'inline',
        atom: true,
        selectable: true,
        attrs: {
          key: {},
          loc: { default: '' },
          label: { default: '' }
        },
        toDOM: (node) => [
          'span',
          { class: 'pm-citation', 'data-cite-key': String(node.attrs.key || ''), 'data-cite-loc': String(node.attrs.loc || '') },
          `(${node.attrs.label || '@' + (node.attrs.key || '?')})`
        ],
        parseDOM: [{
          tag: 'span.pm-citation[data-cite-key]',
          getAttrs: (el) => ({
            key: el.getAttribute('data-cite-key') || '',
            loc: el.getAttribute('data-cite-loc') || '',
            label: el.textContent || ''
          })
        }]
      },
      bibliography: {
        group: 'block',
        content: 'paragraph*',
        defining: true,
        toDOM: () => ['div', { class: 'pm-bibliography' }, 0],
        parseDOM: [{ tag: 'div.pm-bibliography' }]
      }
    },
    marks: {}
  };
}

const citeKey = new PluginKey('pm-citations');

export function createCitationPlugin() {
  // 依據文檔中的 citation 節點，計算 label 並修正 attrs.label
  return new Plugin({
    key: citeKey,
    appendTransaction: (trs, oldState, state) => {
      try {
        let changed = false;
        const { doc } = state;
        const type = state.schema.nodes.citation;
        if (!type) return null;
        const tr = state.tr;
        doc.descendants((node, pos) => {
          if (node.type === type) {
            const key = node.attrs.key;
            const loc = node.attrs.loc || '';
            // TODO: 支援同年歧義 a/b/c（簡版暫不區分，交由後續改進）
            const label = citationStore.formatInText(key, { suffix: '', loc });
            if (label && label !== node.attrs.label) {
              tr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, { label }));
              changed = true;
            }
          }
          return true;
        });
        return changed ? tr : null;
      } catch (_) { return null; }
    },
    view: (view) => {
      // 對外暴露 API
      setupCitationAPI(view);
      return { destroy() { teardownCitationAPI(); } };
    }
  });
}

function setupCitationAPI(view) {
  // 插入 citation 節點（光標處）
  window.__insertCitationAtCaret = (key, loc = '') => {
    try {
      const { state, dispatch } = view;
      const type = state.schema.nodes.citation;
      if (!type) return false;
      const label = citationStore.formatInText(key, { suffix: '', loc });
      const node = type.create({ key, loc, label });
      dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
      // 插入後刷新一次徵引書目
      try { window.__refreshBibliography?.(); } catch (_) {}
      return true;
    } catch (_) { return false; }
  };

  // 查找或插入 bibliography 區塊，並由引用庫生成條目
  window.__refreshBibliography = (opts = {}) => {
    try {
      const { state, dispatch } = view;
      const biblioType = state.schema.nodes.bibliography;
      const paraType = state.schema.nodes.paragraph;
      if (!biblioType || !paraType) return false;

      // 收集文檔中的 cite keys（保持唯一）
      const used = new Set();
      state.doc.descendants((node) => {
        if (node.type === state.schema.nodes.citation) {
          const k = String(node.attrs.key || '').trim();
          if (k) used.add(k);
        }
        return true;
      });
      const keys = Array.from(used.values());
      // 生成 HTML（行）並轉文本節點
      const html = citationStore.formatBibliography(keys, { italics: true });
      const lines = html ? html.split(/\n+/) : [];

      // 建立新的 bibliography 內容（每條為 paragraph）
      const paras = [];
      // 標題行
      paras.push(paraType.create(null, state.schema.text('徵引書目')));
      lines.forEach(line => {
        const text = line.replace(/<[^>]+>/g, '');
        paras.push(paraType.create(null, state.schema.text(text)));
      });

      // 尋找現有 bibliography 節點位置
      let foundPos = null;
      state.doc.descendants((node, pos) => {
        if (node.type === biblioType) { foundPos = pos; return false; }
        return true;
      });

      let tr = state.tr;
      // 先刪除舊的 bibliography（若存在），避免位置錯亂
      if (foundPos != null) {
        const old = state.doc.nodeAt(foundPos);
        if (old) tr = tr.delete(foundPos, foundPos + old.nodeSize);
      }
      // 永遠附加到文末，確保位於結論之後
      const node = biblioType.create(null, paras);
      tr = tr.insert(tr.doc.content.size, node);
      dispatch(tr.scrollIntoView());
      return true;
    } catch (_) { return false; }
  };
}

function teardownCitationAPI() {
  try { delete window.__insertCitationAtCaret; } catch (_) {}
  try { delete window.__refreshBibliography; } catch (_) {}
}

export function getCitationAPI() {
  return {
    insert: (key, loc = '') => window.__insertCitationAtCaret?.(key, loc),
    refresh: () => window.__refreshBibliography?.(),
  };
}
