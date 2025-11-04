// 模式：生母+韻母組合 → 匹配字/詞（繁體中文註釋）
(function (global) {
  'use strict';

  const SHENGMU = ['∅','b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s','y','w'];
  const YUNMU = [
    'a','o','e','i','u','v','ai','ei','ao','ou','an','en','ang','eng','ong','er',
    'ia','ie','iao','iu','ian','in','iang','ing','iong',
    'ua','uo','uai','ui','uan','un','uang','ueng',
    'üe','üan','ün'
  ];

  function view(ctx) {
    const root = ctx.root;
    const drag = new PPCore.DragManager();
    const scope = ctx.params?.scope || null; // { shengmu:[], yunmu:[], zhengti:[] }

    // 佈局
    const layout = PPCore.el(`
      <div class="row row-2">
        <section class="card workbench" aria-label="工作台">
          <h2>工作台</h2>
          <div class="slots">
            <div class="slot" data-type="shengmu" aria-label="生母卡槽"></div>
            <div class="slot" data-type="yunmu" aria-label="韻母卡槽"></div>
          </div>
          <div class="tone-bar" hidden>
            <button class="tone-btn" data-tone="1">一聲</button>
            <button class="tone-btn" data-tone="2">二聲</button>
            <button class="tone-btn" data-tone="3">三聲</button>
            <button class="tone-btn" data-tone="4">四聲</button>
            <button class="tone-btn" data-tone="5">輕聲</button>
            <div class="actions">
              <button class="btn" id="btnConfirm">確認</button>
              <button class="btn" id="btnClear">清除</button>
            </div>
          </div>
          <div class="result card" style="background: transparent; border: none; padding: 0;">
            <div class="results"></div>
          </div>
        </section>
        <section class="card selector" aria-label="拼音選擇區">
          <h2>選擇區</h2>
          <div class="tabbar">
            <button class="tab active" data-tab="sm">生母</button>
            <button class="tab" data-tab="ym">韻母</button>
          </div>
          <div class="belt" data-belt="sm"></div>
          <div class="belt" data-belt="ym" hidden></div>
        </section>
      </div>
    `);

    const slotSm = layout.querySelector('.slot[data-type="shengmu"]');
    const slotYm = layout.querySelector('.slot[data-type="yunmu"]');
    const toneBar = layout.querySelector('.tone-bar');
    const results = layout.querySelector('.results');
    const beltSm = layout.querySelector('[data-belt="sm"]');
    const beltYm = layout.querySelector('[data-belt="ym"]');

    drag.registerDropZone(slotSm);
    drag.registerDropZone(slotYm);

    // 生成 token
    SHENGMU.forEach((s) => {
      if (scope && Array.isArray(scope.shengmu) && scope.shengmu.length > 0) {
        // 允許零聲母（∅）若 scope 未明確列出則視為禁用
        if (!scope.shengmu.includes(s)) return;
      }
      const tk = PPCore.el(`<div class="token" data-kind="sm">${s}</div>`);
      drag.makeDraggable(tk, { kind: 'sm', value: s });
      tk.addEventListener('click', () => setSlot(slotSm, s));
      beltSm.appendChild(tk);
    });
    YUNMU.forEach((y) => {
      if (scope && Array.isArray(scope.yunmu) && scope.yunmu.length > 0) {
        if (!scope.yunmu.includes(y)) return;
      }
      const tk = PPCore.el(`<div class="token" data-kind="ym">${y}</div>`);
      drag.makeDraggable(tk, { kind: 'ym', value: y });
      tk.addEventListener('click', () => setSlot(slotYm, y));
      beltYm.appendChild(tk);
    });

    // 切換頁籤
    layout.querySelector('.tabbar').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      layout.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isSm = btn.dataset.tab === 'sm';
      beltSm.hidden = !isSm; beltYm.hidden = isSm;
    });

    // 接收拖拽
    layout.addEventListener('pp-drop', (e) => {
      const d = e.detail;
      if (d.kind === 'sm') setSlot(slotSm, d.value);
      if (d.kind === 'ym') setSlot(slotYm, d.value);
    });

    // 清除/確認
    layout.querySelector('#btnClear')?.addEventListener('click', () => clearAll());
    layout.querySelector('#btnConfirm')?.addEventListener('click', () => confirmQuery());

    // 聲調選擇
    let selectedTone = 1;
    toneBar.addEventListener('click', (e) => {
      const b = e.target.closest('.tone-btn');
      if (!b) return;
      selectedTone = Number(b.dataset.tone || 1);
      toneBar.querySelectorAll('.tone-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });

    // 設置卡槽
    function setSlot(slot, val) {
      slot.textContent = val;
      slot.classList.add('filled');
      if (slot === slotSm) {
        applyLegalYunmuFilter(val);
        // 引導：自動切到韻母頁籤
        const tabs = layout.querySelectorAll('.tab');
        tabs.forEach(b => b.classList.remove('active'));
        tabs[1].classList.add('active');
        beltSm.hidden = true; beltYm.hidden = false;
      }
      // 若當前韻母變為非法，清除之
      if (slot === slotSm && slotYm.classList.contains('filled')) {
        const ym = slotYm.textContent.trim();
        const allow = getAllowedYunmu(val);
        if (!allow.has(ym)) {
          slotYm.textContent = '';
          slotYm.classList.remove('filled');
        }
      }
      maybeTone();
    }

    function getSlots() {
      const sm = slotSm.textContent && slotSm.classList.contains('filled') ? slotSm.textContent.trim() : '';
      const ym = slotYm.textContent && slotYm.classList.contains('filled') ? slotYm.textContent.trim() : '';
      return { sm, ym };
    }

    function maybeTone() {
      const { sm, ym } = getSlots();
      toneBar.hidden = !(sm && ym);
      if (!toneBar.hidden) {
        // 預設選中一聲
        selectedTone = 1;
        toneBar.querySelectorAll('.tone-btn').forEach((b,i)=> b.classList.toggle('active', i===0));
      }
    }

    function clearAll() {
      slotSm.textContent = '';
      slotSm.classList.remove('filled');
      slotYm.textContent = '';
      slotYm.classList.remove('filled');
      toneBar.hidden = true; selectedTone = 1;
      results.innerHTML = '';
    }

    function confirmQuery() {
      const { sm, ym } = getSlots();
      if (!(sm && ym)) return;
      // 最終再檢一遍合法性（保險）
      const allow = getAllowedYunmu(sm);
      if (!allow.has(ym)) return;
      const marked = PPCore.Tone.joinAndMark(sm === '∅' ? '' : sm, ym, selectedTone);
      const normalized = K3DbLoader.normalizeToKey(marked);
      // 查詞/查字（忽略聲調）
      const words = ctx.db.searchWordsByPinyin(normalized) || [];
      const chars = ctx.db.searchCharsByPinyin(normalized) || [];
      renderResults(marked, words, chars);
    }

    function renderResults(pinyinMarked, words, chars) {
      results.innerHTML = '';
      const head = PPCore.el(`<div class="tag">拼音：${pinyinMarked}</div>`);
      results.appendChild(head);

      const g1 = PPCore.el(`<div class="result-group"><h3>字</h3><div class="result-list"></div></div>`);
      const g2 = PPCore.el(`<div class="result-group"><h3>詞</h3><div class="result-list"></div></div>`);
      results.appendChild(g1); results.appendChild(g2);

      const l1 = g1.querySelector('.result-list');
      const l2 = g2.querySelector('.result-list');

      if (chars.length === 0) l1.appendChild(PPCore.el('<div class="tag">（暫無）</div>'));
      if (words.length === 0) l2.appendChild(PPCore.el('<div class="tag">（暫無）</div>'));

      chars.forEach(c => {
        const t = PPCore.el(`<div class="tag">${c.char}（${(c.pinyinMarked||[]).join(' / ')}）</div>`);
        l1.appendChild(t);
      });
      words.forEach(w => {
        const t = PPCore.el(`<div class="tag">${w.word}（${w.pinyinMarked}）</div>`);
        l2.appendChild(t);
      });
    }

    root.appendChild(layout);

    // --- 合法韻母過濾 ---
    const I_SET = new Set(['i','ia','ie','iao','iu','ian','in','iang','ing','iong']);
    const U_SET = new Set(['u','ua','uo','uai','ui','uan','un','uang','ueng']);
    const UML_SET = new Set(['v','üe','üan','ün']); // 以 v 表示 ü
    const I_COMPOUND = new Set(['ia','ie','iao','iu','ian','in','iang','ing','iong']);

    function getAllowedYunmu(sm) {
      // 預設：全允許
      const base = new Set(YUNMU);
      if (!sm || sm === '∅') {
        return base; // 零聲母允許所有韻母（拼寫時由 y/w 規則處理）
      }
      // 限制 'er' 僅允許零聲母
      base.delete('er');

      if (sm === 'y') {
        // y 只與 i 起首/ü 組合（ya=ia 等價；不直用裸 a/e/o）
        const s = new Set([...I_SET, 'i', ...UML_SET]);
        return s;
      }
      if (sm === 'w') {
        // w 只與 u 系列
        return new Set(U_SET);
      }
      if (sm === 'j' || sm === 'q' || sm === 'x') {
        // j/q/x 與 i 系列 + ü 系列，不與普通 u/a/o/e 直接組合
        const s = new Set([...I_SET, 'i', ...UML_SET]);
        return s;
      }
      if (sm === 'n' || sm === 'l') {
        // n/l 允許 ü 系列
        return base;
      }
      if (sm === 'zh' || sm === 'ch' || sm === 'sh' || sm === 'r' || sm === 'z' || sm === 'c' || sm === 's') {
        // 捲舌/齒齦塞擦：允許單獨 i（zhi/chi/shi/ri/zi/ci/si），但不允許 i 複合與 ü 系列
        for (const y of UML_SET) base.delete(y);
        for (const y of I_COMPOUND) base.delete(y);
        base.add('i');
        return base;
      }
      // 其餘一般聲母：不允許 ü 系列
      for (const y of UML_SET) base.delete(y);
      return base;
    }

    function applyLegalYunmuFilter(sm) {
      let allow = getAllowedYunmu(sm);
      // 若有 scope 限制，取交集
      if (scope && Array.isArray(scope.yunmu) && scope.yunmu.length > 0) {
        allow = new Set(Array.from(allow).filter(x => scope.yunmu.includes(x)));
      }
      beltYm.querySelectorAll('.token[data-kind="ym"]').forEach((tk) => {
        const val = tk.textContent.trim();
        const ok = allow.has(val);
        tk.classList.toggle('disabled', !ok);
      });
    }

    // 初始狀態：零聲母允許全部
  applyLegalYunmuFilter('∅');

    return {
      mount() {},
      unmount() { root.innerHTML = ''; }
    };
  }

  global.PPModeComposeSyllable = function (ctx) { return view(ctx); };
})(window);
