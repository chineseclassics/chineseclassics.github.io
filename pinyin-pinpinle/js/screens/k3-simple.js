// K3 友善簡化畫面：上方左右同時顯示聲母/韻母，底部為組合區，拖拽即出結果（繁體中文註釋）
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
    const db = ctx.db;
    const drag = new PPCore.DragManager();
    const scope = ctx.params?.scope || null; // { shengmu:[], yunmu:[], zhengti:[] }（如有）

    const layout = PPCore.el(`
      <div class="k3-simple">
        <div class="belts-two">
          <section class="card panel-sm" aria-label="聲母">
            <h2>聲母</h2>
            <div class="belt belt-sm"></div>
          </section>
          <section class="card panel-ym" aria-label="韻母">
            <h2>韻母</h2>
            <div class="belt belt-ym"></div>
          </section>
        </div>
        <section class="card compose-simple" aria-label="組合區">
          <div class="pinyin-capsule">
            <div class="mini-slot" data-type="shengmu" aria-label="生母卡槽"></div>
            <div class="mini-slot" data-type="yunmu" aria-label="韻母卡槽"></div>
          </div>
          <div class="pinyin-preview" aria-live="polite"></div>
          <div class="results char-grid"></div>
        </section>
      </div>
    `);

    const beltSm = layout.querySelector('.belt-sm');
    const beltYm = layout.querySelector('.belt-ym');
  const slotSm = layout.querySelector('.mini-slot[data-type="shengmu"]');
  const slotYm = layout.querySelector('.mini-slot[data-type="yunmu"]');
  const results = layout.querySelector('.results');
  const preview = layout.querySelector('.pinyin-preview');

    drag.registerDropZone(slotSm);
    drag.registerDropZone(slotYm);

    // 生成聲母 token
    SHENGMU.forEach((s) => {
      if (scope && Array.isArray(scope.shengmu) && scope.shengmu.length > 0) {
        if (!scope.shengmu.includes(s)) return;
      }
      const tk = PPCore.el(`<div class="token" data-kind="sm">${s}</div>`);
      drag.makeDraggable(tk, { kind: 'sm', value: s });
      tk.addEventListener('click', () => setSlot(slotSm, s));
      beltSm.appendChild(tk);
    });

    // 生成韻母 token
    YUNMU.forEach((y) => {
      if (scope && Array.isArray(scope.yunmu) && scope.yunmu.length > 0) {
        if (!scope.yunmu.includes(y)) return;
      }
      const tk = PPCore.el(`<div class="token" data-kind="ym">${y}</div>`);
      drag.makeDraggable(tk, { kind: 'ym', value: y });
      tk.addEventListener('click', () => setSlot(slotYm, y));
      beltYm.appendChild(tk);
    });

    // 拖拽落下處理
    layout.addEventListener('pp-drop', (e) => {
      const d = e.detail;
      if (d.kind === 'sm') setSlot(slotSm, d.value);
      if (d.kind === 'ym') setSlot(slotYm, d.value);
    });

    // 點擊卡槽清除（簡潔互動，適合 K3）
  slotSm.addEventListener('click', () => { clearSlot(slotSm); autoSearch(); });
  slotYm.addEventListener('click', () => { clearSlot(slotYm); autoSearch(); });

    function clearSlot(slot) {
      slot.textContent = '';
      slot.classList.remove('filled');
    }

    function setSlot(slot, val) {
      slot.textContent = val;
      slot.classList.add('filled');
      slot.classList.add('pop');
      slot.addEventListener('animationend', () => slot.classList.remove('pop'), { once: true });
      if (slot === slotSm) {
        applyLegalYunmuFilter(val);
        // 若已填韻母但新生母使之非法，清空韻母
        if (slotYm.classList.contains('filled')) {
          const ym = slotYm.textContent.trim();
          const allow = getAllowedYunmu(val);
          if (!allow.has(ym)) clearSlot(slotYm);
        }
      }
      autoSearch();
    }

    function getSlots() {
      const sm = slotSm.classList.contains('filled') ? (slotSm.textContent.trim()) : '';
      const ym = slotYm.classList.contains('filled') ? (slotYm.textContent.trim()) : '';
      return { sm, ym };
    }

    function autoSearch() {
      results.innerHTML = '';
      preview.textContent = '';
      const { sm, ym } = getSlots();
      if (!(sm && ym)) return; // 必須同時有生母與韻母
      // 合法性保險
      const allow = getAllowedYunmu(sm);
      if (!allow.has(ym)) return;

      // 不選聲調：以去調鍵查詢（顯示「全部聲調」）
      const base = PPCore.Tone.composeBase(sm === '∅' ? '' : sm, ym);
      const key = K3DbLoader.normalizeToKey(base);
      const chars = db.searchCharsByPinyin(key) || [];
      renderResults(base, chars);
    }

    function renderResults(basePinyin, chars) {
      preview.textContent = basePinyin + '（全部聲調）';
      if (chars.length === 0) {
        results.appendChild(PPCore.el('<div class="tag">（暫無）</div>'));
        return;
      }
      chars.forEach(c => {
        const tile = PPCore.el(`
          <div class="char-tile">
            <div class="char">${c.char}</div>
            <div class="py">${(c.pinyinMarked||[]).join(' / ')}</div>
          </div>
        `);
        results.appendChild(tile);
      });
    }

    // --- 合法韻母過濾 ---（與原模式一致，內嵌以去耦）
    const I_SET = new Set(['i','ia','ie','iao','iu','ian','in','iang','ing','iong']);
    const U_SET = new Set(['u','ua','uo','uai','ui','uan','un','uang','ueng']);
    const UML_SET = new Set(['v','üe','üan','ün']); // 以 v 表示 ü
    const I_COMPOUND = new Set(['ia','ie','iao','iu','ian','in','iang','ing','iong']);

    function getAllowedYunmu(sm) {
      const base = new Set(YUNMU);
      if (!sm || sm === '∅') return base; // 零聲母允許所有韻母
      base.delete('er'); // 'er' 只配零聲母

      if (sm === 'y') {
        return new Set([...I_SET, 'i', ...UML_SET]);
      }
      if (sm === 'w') {
        return new Set(U_SET);
      }
      if (sm === 'j' || sm === 'q' || sm === 'x') {
        return new Set([...I_SET, 'i', ...UML_SET]);
      }
      if (sm === 'zh' || sm === 'ch' || sm === 'sh' || sm === 'r' || sm === 'z' || sm === 'c' || sm === 's') {
        for (const y of UML_SET) base.delete(y);
        for (const y of I_COMPOUND) base.delete(y);
        base.add('i');
        return base;
      }
      for (const y of UML_SET) base.delete(y);
      return base;
    }

    function applyLegalYunmuFilter(sm) {
      let allow = getAllowedYunmu(sm);
      if (scope && Array.isArray(scope.yunmu) && scope.yunmu.length > 0) {
        allow = new Set(Array.from(allow).filter(x => scope.yunmu.includes(x)));
      }
      beltYm.querySelectorAll('.token[data-kind="ym"]').forEach((tk) => {
        const val = tk.textContent.trim();
        const ok = allow.has(val);
        tk.classList.toggle('disabled', !ok);
      });
    }

    // 初始：零聲母下不禁用韻母
    applyLegalYunmuFilter('∅');

    root.appendChild(layout);

    return {
      mount() {},
      unmount() { root.innerHTML = ''; }
    };
  }

  // 對外註冊為畫面
  global.PPScreenK3Simple = function (ctx) { return view(ctx); };
})(window);
