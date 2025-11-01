/**
 * ProseMirror Sentence Issues Plugin
 * 職責：
 * - 根據 `sentence_notes` 為段落句子範圍建立 Decorations（高亮 + 小圖示）
 * - 提供 API：
 *    - setSentenceNotes(view, paragraphPos, notes)
 *    - clearSentenceNotes(view, paragraphPos)
 */

import { Plugin, PluginKey, Decoration, DecorationSet, Schema } from './pm-vendor.js';
import { sentenceMapKey } from './sentence-map-plugin.js';

export const sentenceIssuesKey = new PluginKey('pm-sentence-issues');

function severityClass(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'ai-issue--critical';
  if (s === 'major') return 'ai-issue--major';
  if (s === 'moderate') return 'ai-issue--moderate';
  return 'ai-issue--minor';
}

// 構建最小備援 Schema（避免初始化早期 state 未就緒導致空引用）
const fallbackSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' }
  }
});

function buildDecos(state, store) {
  const doc = state && state.doc ? state.doc : fallbackSchema.node('doc', null, [fallbackSchema.node('paragraph')]);
  const map = sentenceMapKey.getState(state) || new Map();
  const decos = [];
  for (const [paraPos, notes] of store.entries()) {
    if (!Array.isArray(notes) || notes.length === 0) continue;
    notes.forEach(n => {
      const idx = Number(n.sentence_number || n.idx || 0);
      if (!idx || idx < 1) return;
      const sev = n.severity || 'minor';
      const arr = map.get(paraPos) || [];
      const info = arr.find(x => x.idx === idx);
      if (!info) return;
      const cls = 'pm-sentence-issue ' + severityClass(sev);
      // Inline 背景高亮
      decos.push(Decoration.inline(info.from, info.to, { class: cls, 'data-sentence-idx': String(idx) }));
      // 句首小圖示（Widget）
      decos.push(Decoration.widget(info.from, () => {
        const el = document.createElement('span');
        el.className = 'pm-sentence-issue-icon ' + severityClass(sev);
        el.title = (n.message || '') + (n.suggestion ? `\n建議：${n.suggestion}` : '');
        el.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        el.style.marginRight = '4px';
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          try { window.__pmRevealSentence?.(paraPos, idx); } catch(_) {}
        });
        return el;
      }, { side: -1, ignoreSelection: true }));
    });
  }
  return DecorationSet.create(doc, decos);
}

export function createSentenceIssuesPlugin() {
  // 內部存儲：Map<paragraphPos, notes[]>
  const store = new Map();
  return new Plugin({
    key: sentenceIssuesKey,
    state: {
      init: (_cfg, state) => buildDecos(state, store),
      apply: (tr, set, _oldState, newState) => {
        if (tr.docChanged || tr.getMeta(sentenceIssuesKey) === 'refresh') {
          return buildDecos(newState, store);
        }
        return set.map(tr.mapping, tr.doc);
      }
    },
    props: {
      decorations(state) { return this.getState(state); }
    },
    view: (view) => {
      // 暴露 API 到全局（以當前 view 綁定）
      window.__pmSetSentenceNotes = (paraPos, notes) => {
        try {
          store.set(paraPos, Array.isArray(notes) ? notes : []);
          view.dispatch(view.state.tr.setMeta(sentenceIssuesKey, 'refresh'));
        } catch (_) {}
      };
      window.__pmClearSentenceNotes = (paraPos) => {
        try { store.delete(paraPos); view.dispatch(view.state.tr.setMeta(sentenceIssuesKey, 'refresh')); } catch (_) {}
      };
      return { destroy() {
        try {
          if (window.__pmSetSentenceNotes) delete window.__pmSetSentenceNotes;
          if (window.__pmClearSentenceNotes) delete window.__pmClearSentenceNotes;
        } catch(_) {}
      }};
    }
  });
}
