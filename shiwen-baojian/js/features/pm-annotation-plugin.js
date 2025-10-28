/**
 * ProseMirror 批註插件骨架
 * - 後續將接入：
 *   - decorations：渲染批註範圍
 *   - mapping：隨交易自動映射位置
 *   - 事件：點擊/hover 聯動側欄
 *   - re-anchor：text_start→quote→context
 */

import { Plugin, PluginKey, Decoration, DecorationSet } from '../editor/pm-vendor.js';

export const annotationPluginKey = new PluginKey('pm-annotations');

export function createAnnotationPlugin({ getAnnotations, onClick }) {
  return new Plugin({
    key: annotationPluginKey,
    state: {
      init: (_, view) => {
        const ann = safeGet(getAnnotations);
        return buildDecorationSet(view, ann);
      },
      apply: (tr, old, oldState, newState) => {
        let deco = old.map(tr.mapping, tr.doc);
        if (tr.docChanged || tr.getMeta('annotations:update')) {
          const ann = safeGet(getAnnotations);
          deco = buildDecorationSet({ state: newState }, ann);
        }
        return deco;
      }
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handleClick(view, pos, event) {
        const target = event.target.closest?.('.pm-annotation');
        if (target && onClick) {
          const id = target.getAttribute('data-id');
          if (id) onClick(id);
          return true;
        }
        return false;
      }
    }
  });
}

function buildDecorationSet(viewLike, annotations) {
  const { state } = viewLike;
  const { ranges } = resolveRanges(state.doc, annotations || []);
  const decos = ranges.map(r => Decoration.inline(r.from, r.to, { class: 'pm-annotation', 'data-id': r.id }));
  return DecorationSet.create(state.doc, decos);
}

function safeGet(fn) {
  try { return typeof fn === 'function' ? fn() : []; } catch (_) { return []; }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

/**
 * 根據 doc 解析批註位置：優先使用 text_start/text_end，否則用 quote+context 匹配
 */
function resolveRanges(doc, annotations) {
  const segments = [];
  let acc = 0;
  doc.descendants((node, pos) => {
    if (node.isText) {
      segments.push({ text: node.text || '', start: acc, end: acc + (node.text || '').length, pos });
      acc += (node.text || '').length;
    }
  });
  const total = acc;
  const docText = segments.map(s => s.text).join('');

  const posFromIndex = (index) => {
    if (index <= 0) return 0;
    if (index >= total) return doc.content.size;
    // 線性掃描足夠（文本量不大）；可改二分
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (index <= s.end) {
        const offset = index - s.start;
        return s.pos + offset + 1; // pos 是 text node 起點的前一位置
      }
    }
    return doc.content.size;
  };

  const ranges = [];
  for (const a of annotations) {
    let from = null, to = null;
    if (Number.isInteger(a.text_start) && Number.isInteger(a.text_end) && a.text_end > a.text_start) {
      from = clamp(a.text_start, 0, total);
      to = clamp(a.text_end, 0, total);
    } else if (a.text_quote) {
      const quote = String(a.text_quote);
      let idx = docText.indexOf(quote);
      if (idx >= 0) {
        // 若提供上下文，嘗試校驗上下文
        if (a.text_prefix) {
          const pre = String(a.text_prefix);
          const preStart = Math.max(0, idx - pre.length);
          if (docText.slice(preStart, idx) !== pre) {
            // 若上下文不匹配，嘗試尋找下一個匹配
            idx = findWithContext(docText, quote, pre, String(a.text_suffix || ''));
          }
        }
        if (idx >= 0) {
          from = idx;
          to = idx + quote.length;
        }
      }
    }

    if (from != null && to != null && to > from) {
      const pmFrom = posFromIndex(from);
      const pmTo = posFromIndex(to);
      if (pmTo > pmFrom) {
        ranges.push({ id: a.id, from: pmFrom, to: pmTo });
      }
    }
  }
  return { ranges, total };
}

function findWithContext(text, quote, prefix, suffix) {
  let start = 0;
  while (true) {
    const idx = text.indexOf(quote, start);
    if (idx < 0) return -1;
    const preStart = Math.max(0, idx - prefix.length);
    const okPre = !prefix || text.slice(preStart, idx) === prefix;
    const okSuf = !suffix || text.slice(idx + quote.length, idx + quote.length + suffix.length) === suffix;
    if (okPre && okSuf) return idx;
    start = idx + 1;
  }
}



