/**
 * ProseMirror Sentence Map Plugin
 * 職責：
 * - 為每個段落計算分句，並提供 idx → { from, to, text } 的映射
 * - 暴露輔助 API：
 *    - getSentencesForPos(view, paraPos)
 *    - getSentenceRange(view, paraPos, idx)
 * 註：
 * - 為簡化與穩定，當前採用「整份文件重算」策略（O(n) 遍歷段落），
 *   對一般篇幅足夠流暢；如需更高性能可後續改為增量重算。
 */

import { Plugin, PluginKey, Schema } from './pm-vendor.js';

export const sentenceMapKey = new PluginKey('pm-sentence-map');

// 最小備援 Schema：避免初始化早期 state 未就緒
const fallbackSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' }
  }
});

function splitChineseSentences(text) {
  // 以終止符進行切分，保留結尾符號於前一子句
  // 支援：。．！!？?；;…（連續省略號視為一次終止）
  const parts = [];
  const re = /(.*?)([。．！!？\?；;…]+|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const seg = (m[1] + (m[2] || '')).trim();
    if (seg) parts.push(seg);
    if (!m[2]) break;
  }
  return parts;
}

function buildParagraphIndex(doc) {
  const paras = [];
  doc.descendants((node, pos) => {
    if (node.type && node.type.name === 'paragraph') {
      paras.push({ node, pos });
    }
  });
  return paras;
}

function mapOffsetToPos(paragraphNode, paragraphPos, textOffset) {
  // 將段內文字偏移（0-based）映射為 doc 絕對座標
  // 段落內容起點為 paragraphPos+1
  let acc = 0;
  let target = paragraphPos + 1; // 內容起點
  for (let i = 0; i < paragraphNode.childCount; i++) {
    const child = paragraphNode.child(i);
    const len = child.isText ? child.text.length : child.nodeSize; // 非文字節點也占位
    if (child.isText) {
      if (acc + child.text.length >= textOffset) {
        return target + (textOffset - acc);
      }
      acc += child.text.length;
      target += child.text.length;
    } else {
      // 非文字節點：將其視為 1 單位（如 hard_break），並前進
      if (acc + 1 >= textOffset) {
        return target; // 落在該節點前
      }
      acc += 1;
      target += child.nodeSize;
    }
  }
  // 越界時返回段末
  return paragraphPos + paragraphNode.nodeSize - 1;
}

function computeSentencesForParagraph(node, pos) {
  // 將段落文本抽出（僅文字內容），並切分為句
  const text = node.textContent || '';
  const sentences = splitChineseSentences(text);
  // 為每個句子計算 from/to（閉區間右開區間）
  const ranges = [];
  let cursor = 0;
  sentences.forEach((s, i) => {
    const startOffset = cursor;
    const endOffset = cursor + s.length; // 不含 endOffset
    const from = mapOffsetToPos(node, pos, startOffset);
    const to = mapOffsetToPos(node, pos, endOffset);
    ranges.push({ idx: i + 1, from, to, text: s });
    cursor = endOffset;
  });
  return ranges;
}

export function createSentenceMapPlugin() {
  return new Plugin({
    key: sentenceMapKey,
    state: {
      init: (_, state) => {
        const data = new Map();
        const doc = state && state.doc ? state.doc : fallbackSchema.node('doc', null, [fallbackSchema.node('paragraph')]);
        const paras = buildParagraphIndex(doc);
        paras.forEach(({ node, pos }) => {
          data.set(pos, computeSentencesForParagraph(node, pos));
        });
        return data; // Map<paragraphPos, ranges[]>
      },
      apply: (tr, oldMap, _oldState, newState) => {
        if (!tr.docChanged) return oldMap;
        const data = new Map();
        const paras = buildParagraphIndex(newState.doc);
        paras.forEach(({ node, pos }) => {
          data.set(pos, computeSentencesForParagraph(node, pos));
        });
        return data;
      }
    }
  });
}

export function getSentencesForPos(view, paragraphPos) {
  try {
    const map = sentenceMapKey.getState(view.state);
    const arr = map?.get(paragraphPos) || [];
    return arr.map(x => x.text);
  } catch (_) { return []; }
}

export function getSentenceRange(view, paragraphPos, idx) {
  try {
    const map = sentenceMapKey.getState(view.state);
    const arr = map?.get(paragraphPos) || [];
    const info = arr.find(x => x.idx === idx);
    return info ? { from: info.from, to: info.to } : null;
  } catch (_) { return null; }
}

export function getAllSentenceInfo(view, paragraphPos) {
  try {
    const map = sentenceMapKey.getState(view.state);
    const arr = map?.get(paragraphPos) || [];
    return arr.slice();
  } catch (_) { return []; }
}
