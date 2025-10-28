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
  const decos = [];
  (annotations || []).forEach(a => {
    if (Number.isInteger(a.text_start) && Number.isInteger(a.text_end) && a.text_end > a.text_start) {
      const from = clamp(a.text_start, 0, state.doc.content.size);
      const to = clamp(a.text_end, 0, state.doc.content.size);
      if (to > from) {
        decos.push(Decoration.inline(from, to, { class: 'pm-annotation', 'data-id': a.id }));
      }
    }
  });
  return DecorationSet.create(state.doc, decos);
}

function safeGet(fn) {
  try { return typeof fn === 'function' ? fn() : []; } catch (_) { return []; }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}


