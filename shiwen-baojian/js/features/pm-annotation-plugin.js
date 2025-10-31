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
      init: (_, editorState) => {
        const ann = safeGet(getAnnotations);
        const activeId = null;
        const deco = buildDecorationSet({ state: editorState }, ann, activeId);
        return { deco, activeId };
      },
      apply: (tr, old, oldState, newState) => {
        const metaActive = tr.getMeta('annotations:active');
        // 使用 mark 作為主錨定：docChanged 時重建可即時反映 mark 的增刪
        const needRebuild = tr.docChanged || tr.getMeta('annotations:update') || metaActive !== undefined;
        const activeId = metaActive !== undefined ? metaActive : old.activeId;
        let deco = old.deco.map(tr.mapping, tr.doc);
        if (needRebuild) {
          const ann = safeGet(getAnnotations);
          deco = buildDecorationSet({ state: newState }, ann, activeId);
        }
        return { deco, activeId };
      }
    },
    props: {
      decorations(state) {
        return this.getState(state).deco;
      },
      handleClick(view, pos, event) {
        const target = event.target.closest?.('.pm-annotation');
        if (target && onClick) {
          const id = target.getAttribute('data-id');
          if (id) {
            try { view.dispatch(view.state.tr.setMeta('annotations:active', id)); } catch (_) {}
            onClick(id);
          }
          return true;
        }
        return false;
      }
    }
  });
}

export function setActiveAnnotation(view, idOrNull) {
  try { view.dispatch(view.state.tr.setMeta('annotations:active', idOrNull ?? null)); } catch (_) {}
}

/**
 * 工具：在當前選區加上 annotation mark（用於樂觀更新）
 * 傳回實際 from/to，並觸發裝飾刷新
 */
export function addAnnotationMarkForSelection(view, id) {
  try {
    const { state } = view;
    const markType = state.schema?.marks?.annotation;
    if (!markType) return null;
    const sel = state.selection;
    // 若當前選區因點擊彈窗而清空，退回最近一次有效選區
    let from = sel.from, to = sel.to;
    if (sel.empty) {
      const last = (typeof window !== 'undefined' && window.__pmLastSelection) ? window.__pmLastSelection : null;
      if (!last || !Number.isInteger(last.from) || !Number.isInteger(last.to) || last.to <= last.from) return null;
      from = clamp(last.from, 1, state.doc.content.size - 1);
      to = clamp(last.to, from + 1, state.doc.content.size);
      if (to <= from) return null;
    }
    const tr = state.tr.addMark(from, to, markType.create({ id: String(id) }));
    tr.setMeta('annotations:update', true);
    view.dispatch(tr);
    return { from, to };
  } catch (_) { return null; }
}

/**
 * 工具：將文檔中所有 id=oldId 的 annotation mark 替換為 newId
 */
export function replaceAnnotationMarkId(view, oldId, newId) {
  try {
    const { state } = view;
    const markType = state.schema?.marks?.annotation;
    if (!markType) return false;
    let tr = state.tr;
    const oldStr = String(oldId);
    state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      const size = node.text ? node.text.length : 0;
      if (size === 0) return true;
      for (const m of node.marks || []) {
        if (m.type === markType && String(m.attrs?.id || '') === oldStr) {
          const from = pos + 1;
          const to = pos + 1 + size;
          tr = tr.removeMark(from, to, m);
          tr = tr.addMark(from, to, markType.create({ id: String(newId) }));
          break;
        }
      }
      return true;
    });
    if (tr.steps && tr.steps.length > 0) {
      tr.setMeta('annotations:update', true);
      view.dispatch(tr);
      return true;
    }
    return false;
  } catch (_) { return false; }
}

/**
 * 工具：移除文檔中所有 id=targetId 的 annotation mark（失敗回滾或刪除用）
 */
export function removeAnnotationMarksById(view, targetId) {
  try {
    const { state } = view;
    const markType = state.schema?.marks?.annotation;
    if (!markType) return false;
    let tr = state.tr;
    const sId = String(targetId);
    state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      const size = node.text ? node.text.length : 0;
      if (size === 0) return true;
      for (const m of node.marks || []) {
        if (m.type === markType && String(m.attrs?.id || '') === sId) {
          const from = pos + 1;
          const to = pos + 1 + size;
          tr = tr.removeMark(from, to, m);
          break;
        }
      }
      return true;
    });
    if (tr.steps && tr.steps.length > 0) {
      tr.setMeta('annotations:update', true);
      view.dispatch(tr);
      return true;
    }
    return false;
  } catch (_) { return false; }
}

function buildDecorationSet(viewLike, annotations, activeId) {
  const { state } = viewLike;
  const annList = Array.isArray(annotations) ? annotations : [];
  const idsFromList = new Set(annList.map(a => String(a?.id ?? '')));

  // 1) 從 doc 掃描 annotation mark，建立 id→連續範圍集合
  const annoMarkType = state.schema.marks && state.schema.marks.annotation;
  const markRanges = new Map(); // id -> [{from,to}]
  if (annoMarkType) {
    state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      const size = node.text ? node.text.length : 0;
      if (size === 0) return true;
      for (const m of node.marks || []) {
        if (m.type === annoMarkType) {
          const id = String(m.attrs?.id || '');
          if (!id) continue;
          const from = pos + 1;
          const to = pos + 1 + size;
          if (!markRanges.has(id)) markRanges.set(id, []);
          markRanges.get(id).push({ from, to });
        }
      }
      return true;
    });
    // 合併相鄰或重疊的範圍
    for (const [id, arr] of markRanges) {
      arr.sort((a, b) => a.from - b.from);
      const merged = [];
      for (const r of arr) {
        const last = merged[merged.length - 1];
        if (!last || r.from > last.to) merged.push({ from: r.from, to: r.to });
        else last.to = Math.max(last.to, r.to);
      }
      markRanges.set(id, merged);
    }
  }

  // 2) 針對每個 annotation：若存在 mark 範圍 → 用之；否則用 orphan（依據舊偏移）
  const { posFromIndexTools } = getTextIndexConverters(state);
  const decos = [];
  for (const a of annList) {
    const id = a?.id != null ? String(a.id) : null;
    if (!id) continue;
    const ranges = markRanges.get(id);
    if (ranges && ranges.length) {
      for (const r of ranges) {
        const cls = ['pm-annotation'];
        if (activeId && String(activeId) === id) cls.push('pm-annotation-active');
        const attrs = { class: cls.join(' '), 'data-id': id };
        const from = Math.max(1, Math.min(r.from, state.doc.content.size - 1));
        const to = Math.max(from + 1, Math.min(r.to, state.doc.content.size));
        decos.push(Decoration.inline(from, to, attrs));
      }
    } else {
      // orphan：依據 text_start 回到近似原位置
      const s0 = Number.isInteger(a.text_start) ? a.text_start : 0;
      const pmPos = posFromIndexTools(s0);
      const from = Math.max(1, Math.min(pmPos, state.doc.content.size - 1));
      const to = Math.min(from + 1, state.doc.content.size);
      const cls = ['pm-annotation', 'pm-annotation-orphan'];
      if (activeId && String(activeId) === id) cls.push('pm-annotation-active');
      const attrs = { class: cls.join(' '), 'data-id': id };
      decos.push(Decoration.inline(from, to, attrs));
    }
  }
  // 2.5) 額外：對未在 annList 中、但存在於文檔中的暫存標記（compose-/tmp-）也建立裝飾，
  // 讓「編寫中/樂觀中」的選區能立刻高亮，且能成為疊加層的對齊依據。
  for (const [id, ranges] of markRanges) {
    if (idsFromList.has(id)) continue;
    if (!/^compose-|^tmp-/.test(id)) continue;
    for (const r of ranges) {
      const cls = ['pm-annotation', 'pm-annotation-pending'];
      if (activeId && String(activeId) === id) cls.push('pm-annotation-active');
      const attrs = { class: cls.join(' '), 'data-id': id };
      const from = Math.max(1, Math.min(r.from, state.doc.content.size - 1));
      const to = Math.max(from + 1, Math.min(r.to, state.doc.content.size));
      decos.push(Decoration.inline(from, to, attrs));
    }
  }
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
  // 建立全文字串與位置映射（線性足矣；將來可升級為二分）
  const segments = [];
  let acc = 0;
  doc.descendants((node, pos) => {
    if (node.isText) {
      const t = node.text || '';
      segments.push({ text: t, start: acc, end: acc + t.length, pos });
      acc += t.length;
    }
  });
  const total = acc;
  const docText = segments.map(s => s.text).join('');

  const posFromIndex = (index) => {
    if (index <= 0) return 0;
    if (index >= total) return doc.content.size;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (index <= s.end) {
        const offset = index - s.start;
        return s.pos + offset + 1; // pos 是 text node 起點的前一位置
      }
    }
    return doc.content.size;
  };

  // 視窗內字串搜尋（避免全域掃描）：返回全域索引
  const findInWindow = (needle, centerStart, centerEnd, padding = 200) => {
    if (!needle) return -1;
    const wStart = clamp(centerStart - padding, 0, total);
    const wEnd = clamp(centerEnd + padding, 0, total);
    if (wEnd <= wStart) return -1;
    const slice = docText.slice(wStart, wEnd);
    const localIdx = slice.indexOf(needle);
    return localIdx >= 0 ? (wStart + localIdx) : -1;
  };

  // 視窗內用 prefix/suffix 近似定位
  const findContextInWindow = (prefix, suffix, centerStart, centerEnd, padding = 200) => {
    const wStart = clamp(centerStart - padding, 0, total);
    const wEnd = clamp(centerEnd + padding, 0, total);
    if (wEnd <= wStart) return -1;
    const slice = docText.slice(wStart, wEnd);
    if (prefix) {
      const pIdx = slice.lastIndexOf(prefix);
      if (pIdx >= 0) return wStart + pIdx + prefix.length; // 放在 prefix 後
    }
    if (suffix) {
      const sIdx = slice.indexOf(suffix);
      if (sIdx >= 0) return Math.max(wStart + sIdx - 1, wStart); // 放在 suffix 前一位
    }
    return -1;
  };

  const ranges = [];
  for (const a of annotations) {
    let from = null, to = null, approx = false, orphan = false;

    const hasOffsets = Number.isInteger(a.text_start) && Number.isInteger(a.text_end) && a.text_end > a.text_start;
    const quote = a.text_quote ? String(a.text_quote) : '';
    const prefix = a.text_prefix ? String(a.text_prefix) : '';
    const suffix = a.text_suffix ? String(a.text_suffix) : '';

    if (hasOffsets) {
      const s0 = clamp(a.text_start, 0, total);
      const e0 = clamp(a.text_end, 0, total);
      if (quote) {
        const slice = docText.slice(s0, e0);
        if (slice === quote) {
          // 快速相等：直接使用舊偏移（exact）
          from = s0; to = e0;
        } else {
          // 視窗內找 quote；找不到再用 prefix/suffix 近似；仍找不到 → orphan 但放在原偏移附近
          let idx = findInWindow(quote, s0, e0, 220);
          if (idx >= 0) {
            from = idx; to = idx + quote.length; // 完整命中視為 exact
          } else {
            const ctxIdx = findContextInWindow(prefix, suffix, s0, e0, 220);
            if (ctxIdx >= 0) {
              from = clamp(ctxIdx, 0, total);
              to = clamp(from + Math.max(1, Math.min(quote ? quote.length : 1, 6)), 0, total);
              approx = true;
            } else {
              // 視為孤兒：保留在原偏移附近
              const near = clamp(s0, 0, total);
              from = near; to = clamp(near + 1, 0, total);
              orphan = true;
            }
          }
        }
      } else {
        // 沒有 quote 可校驗：保守使用舊偏移
        from = s0; to = Math.max(s0 + 1, e0);
      }
    } else if (quote) {
      // 沒有偏移：退回全文精確匹配，再退上下文/片段
      let idx = docText.indexOf(quote);
      if (idx >= 0) {
        if (prefix || suffix) {
          const checked = findWithContext(docText, quote, prefix, suffix);
          if (checked >= 0) idx = checked;
        }
        from = idx; to = idx + quote.length;
      } else {
        // 上下文 → 片段（最小 6 字）
        let ctxIdx = -1;
        if (prefix) ctxIdx = docText.lastIndexOf(prefix);
        if (ctxIdx < 0 && suffix) ctxIdx = docText.indexOf(suffix);
        if (ctxIdx >= 0) {
          from = clamp(ctxIdx, 0, total);
          to = clamp(from + Math.max(1, Math.min(quote.length || 1, 6)), 0, total);
          approx = true;
        } else {
          const q = quote.trim();
          const minLen = 6;
          const half = Math.max(minLen, Math.floor(q.length / 2));
          if (q && q.length >= minLen) {
            const fragment = q.slice(0, half);
            const fIdx = docText.indexOf(fragment);
            if (fIdx >= 0) {
              from = clamp(fIdx, 0, total);
              to = clamp(fIdx + fragment.length, 0, total);
              approx = true;
            }
          }
        }
      }
    }

    if (from != null && to != null && to > from) {
      const pmFrom = posFromIndex(from);
      const pmTo = posFromIndex(to);
      if (pmTo > pmFrom) {
        ranges.push({ id: a.id, from: pmFrom, to: pmTo, approx, orphan: false });
        continue;
      }
    }

    // 完全找不到或位置映射無效：標記為 orphan，採用文首最小範圍作為兜底
    const pmFrom = 1;
    const pmTo = Math.min(3, doc.content.size);
    ranges.push({ id: a.id, from: pmFrom, to: pmTo, approx: false, orphan: true });
  }
  return { ranges, total };
}

// 取得從「全局文字索引」轉到 PM 位置的函式
function getTextIndexConverters(state) {
  const segments = [];
  let acc = 0;
  state.doc.descendants((node, pos) => {
    if (node.isText) {
      const t = node.text || '';
      segments.push({ start: acc, end: acc + t.length, pos });
      acc += t.length;
    }
  });
  const total = acc;
  const posFromIndexTools = (index) => {
    const i = clamp(index, 0, total);
    if (i <= 0) return 1;
    for (let k = 0; k < segments.length; k++) {
      const s = segments[k];
      if (i <= s.end) {
        const offset = i - s.start;
        return s.pos + offset + 1;
      }
    }
    return state.doc.content.size - 1;
  };
  return { total, posFromIndexTools };
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


/**
 * 取得整份文檔的純文字與位置映射工具
 */
function getDocTextIndexTools(state) {
  const segments = [];
  let acc = 0;
  state.doc.descendants((node, pos) => {
    if (node.isText) {
      const t = node.text || '';
      segments.push({ text: t, start: acc, end: acc + t.length, pos });
      acc += t.length;
    }
  });
  const total = acc;
  const docText = segments.map(s => s.text).join('');

  const indexFromPos = (pmPos) => {
    // 將 PM 位置對應到全局字符索引（近似）
    // 掃描第一個 pos >= pmPos 的段
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const textStartPos = s.pos + 1; // 文本實際開始位置
      const textEndPos = s.pos + (s.end - s.start) + 1;
      if (pmPos <= textEndPos) {
        const offset = Math.max(0, pmPos - textStartPos);
        return s.start + offset;
      }
    }
    return total;
  };

  return { docText, total, indexFromPos };
}

/**
 * 自選區產生文字錨點（offset + quote + prefix/suffix）
 */
export function computeSelectionAnchor(view, ctxLen = 30) {
  const { state } = view;
  let sel = state.selection;
  if (sel.empty && typeof window !== 'undefined' && window.__pmLastSelection) {
    const last = window.__pmLastSelection;
    if (Number.isInteger(last.from) && Number.isInteger(last.to) && last.to > last.from) {
      sel = { from: last.from, to: last.to };
    }
  }
  if (!sel || sel.to <= sel.from) return null;

  const { docText, indexFromPos, total } = getDocTextIndexTools(state);
  const fromIndex = Math.max(0, Math.min(total, indexFromPos(sel.from)));
  const toIndex = Math.max(0, Math.min(total, indexFromPos(sel.to)));
  if (toIndex <= fromIndex) return null;

  const text_quote = docText.slice(fromIndex, toIndex);
  const preStart = Math.max(0, fromIndex - ctxLen);
  const sufEnd = Math.min(total, toIndex + ctxLen);
  const text_prefix = docText.slice(preStart, fromIndex);
  const text_suffix = docText.slice(toIndex, sufEnd);

  return {
    text_start: fromIndex,
    text_end: toIndex,
    text_quote,
    text_prefix,
    text_suffix
  };
}

/**
 * 直接以當前選區創建批註（寫入 Supabase，返回新 ID）
 * 注意：此函式不再對正文 mark 做任何變更（不查找/替換/新增）。
 * 樂觀路徑請在呼叫方先行加入 tmp-/compose- mark，成功後自行以 newId 取代。
 */
export async function createAnnotationFromSelection({ view, supabase, essayId, content, ctxLen = 30 }) {
  const anchor = computeSelectionAnchor(view, ctxLen);
  if (!anchor) throw new Error('請先選擇要批註的文字');

  const payload = {
    p_essay_id: essayId,
    p_content: String(content || '').trim(),
    p_text_start: anchor.text_start,
    p_text_end: anchor.text_end,
    p_text_quote: anchor.text_quote,
    p_text_prefix: anchor.text_prefix,
    p_text_suffix: anchor.text_suffix
  };

  const { data, error } = await supabase.rpc('create_annotation_pm', payload);
  if (error) throw error;
  const newId = data; // 新 annotation id
  return newId;
}



