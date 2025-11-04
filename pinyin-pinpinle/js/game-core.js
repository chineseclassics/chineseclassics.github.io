// 觸控優化拖拽、聲調工具與小型組件（繁體中文註釋）
(function (global) {
  'use strict';

  // PointerEvents 拖拽管理：讓 token 可被拖到 slot 上
  class DragManager {
    constructor() {
      this.ghost = null;
      this.active = null; // { el, data, startX, startY }
      this.dropZones = new Set();
    }

    registerDropZone(el) { this.dropZones.add(el); }
    unregisterDropZone(el) { this.dropZones.delete(el); }

    makeDraggable(el, data) {
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', (ev) => this._onDown(ev, el, data));
    }

    _onDown(ev, el, data) {
      el.setPointerCapture(ev.pointerId);
      this.active = { el, data, startX: ev.clientX, startY: ev.clientY };
      this._makeGhost(el, ev.clientX, ev.clientY);
      const move = (e) => this._onMove(e);
      const up = (e) => this._onUp(e);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up, { once: true });
      el.addEventListener('pointercancel', up, { once: true });
      this._cleanup = () => {
        el.removeEventListener('pointermove', move);
      };
    }

    _onMove(e) {
      if (!this.active || !this.ghost) return;
      this.ghost.style.left = e.clientX + 'px';
      this.ghost.style.top = e.clientY + 'px';
    }

    _onUp(e) {
      if (!this.active) return;
      const { data } = this.active;
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const drop = this._findZone(hit);
      if (drop) {
        drop.dispatchEvent(new CustomEvent('pp-drop', { detail: data, bubbles: true }));
      }
      this._destroyGhost();
      this.active = null;
      if (this._cleanup) this._cleanup();
    }

    _findZone(el) {
      let cur = el;
      while (cur) {
        if (this.dropZones.has(cur)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }

    _makeGhost(el, x, y) {
      const g = document.createElement('div');
      g.className = 'drag-ghost';
      g.textContent = el.textContent.trim();
      g.style.left = x + 'px';
      g.style.top = y + 'px';
      document.body.appendChild(g);
      this.ghost = g;
    }

    _destroyGhost() {
      if (this.ghost && this.ghost.parentNode) this.ghost.parentNode.removeChild(this.ghost);
      this.ghost = null;
    }
  }

  // 聲調工具：將數字調轉帶調（簡化版，涵蓋常見規則）
  const Tone = (function () {
    const map = {
      a: ['ā','á','ǎ','à'],
      e: ['ē','é','ě','è'],
      i: ['ī','í','ǐ','ì'],
      o: ['ō','ó','ǒ','ò'],
      u: ['ū','ú','ǔ','ù'],
      v: ['ǖ','ǘ','ǚ','ǜ'], // 用 v 代表 ü
      ü: ['ǖ','ǘ','ǚ','ǜ']
    };

    function markSyllable(base, tone) {
      if (!base) return '';
      if (!tone || tone === 5) return base.replace(/v/g, 'ü');
      const lower = base.toLowerCase();
      // 優先 a > o > e，其次最後一個元音（包含 i/u/ü）。
      const pri = ['a','o','e'];
      for (const v of pri) {
        const idx = lower.indexOf(v);
        if (idx !== -1) return replaceAt(base, idx, map[v][tone-1]);
      }
      // 處理 iu / ui 規則：標在後者（iu→u，ui→i）
      if (lower.includes('iu')) {
        const idx = lower.indexOf('u');
        return replaceAt(base, idx, map['u'][tone-1]);
      }
      if (lower.includes('ui')) {
        const idx = lower.indexOf('i');
        return replaceAt(base, idx, map['i'][tone-1]);
      }
      // 一般規則：找 i/u/ü/v
      const order = ['i','u','ü','v'];
      for (const v of order) {
        const idx = lower.indexOf(v);
        if (idx !== -1) return replaceAt(base, idx, map[v][tone-1]);
      }
      return base;
    }

    function replaceAt(str, idx, ch) {
      return str.substring(0, idx) + ch + str.substring(idx+1);
    }

    function joinAndMark(shengmu, yunmu, tone) {
      const base = composeBase(shengmu, yunmu);
      return markSyllable(base, tone);
    }

    function composeBase(shengmu, yunmu) {
      // 將 v 視為 ü；處理 y/w 零聲母情形由模式層決定，此處直接拼接
      const sm = (shengmu || '').toLowerCase();
      const ym = (yunmu || '').toLowerCase();
      return (sm + ym).replace(/v/g, 'ü');
    }

    return { markSyllable, joinAndMark, composeBase };
  })();

  // 工具函式
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  global.PPCore = { DragManager, Tone, el };
})(window);
