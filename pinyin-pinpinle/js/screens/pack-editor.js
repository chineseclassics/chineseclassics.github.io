// 內容包編輯器：字/詞編輯、拼音輸入、scope 推導（繁體中文註釋）
(function (global) {
  'use strict';

  function PackEditor(ctx) {
    const { root, params } = ctx;
    let pack = null;

    function mount() {
      const packs = PPStorage.loadPacks();
      pack = packs.find(p => p.pack_id === (params?.packId));
      if (!pack) {
        root.appendChild(PPCore.el('<div class="card">找不到內容包</div>'));
        return;
      }

      const layout = PPCore.el(`
        <div class="row" style="gap:16px;">
          <section class="card">
            <h2>編輯：${pack.pack_name}</h2>
            <div class="actions" style="margin-bottom:8px;">
              <button class="btn" id="btnBack">返回</button>
              <button class="btn" id="btnSave">保存</button>
            </div>
            <div class="row" style="gap:12px;">
              <div class="card">
                <h3>漢字</h3>
                <div id="charList" class="results"></div>
                <div class="actions">
                  <button class="btn" id="btnAddChar">+ 添加漢字</button>
                </div>
              </div>
              <div class="card">
                <h3>詞語</h3>
                <div id="wordList" class="results"></div>
                <div class="actions">
                  <button class="btn" id="btnAddWord">+ 添加詞語</button>
                </div>
              </div>
            </div>
          </section>
          <section class="card">
            <h2>範圍（自動推導）</h2>
            <div id="scopeView" class="results"></div>
          </section>
        </div>
      `);

      root.appendChild(layout);

      layout.querySelector('#btnBack').addEventListener('click', () => PPApp.go('start'));
      layout.querySelector('#btnSave').addEventListener('click', () => savePack());

      renderCharList(layout.querySelector('#charList'));
      renderWordList(layout.querySelector('#wordList'));
      renderScope(layout.querySelector('#scopeView'));

      layout.querySelector('#btnAddChar').addEventListener('click', () => {
        pack.characters.push({ id: crypto.randomUUID(), char: '', pinyinMarked: '', pinyinNumber: '' , source: 'manual' });
        renderCharList(layout.querySelector('#charList')); renderScope(layout.querySelector('#scopeView'));
      });
      layout.querySelector('#btnAddWord').addEventListener('click', () => {
        pack.words.push({ id: crypto.randomUUID(), word: '', pinyinMarked: '', pinyinNumber: '', baseChars: [], source: 'manual' });
        renderWordList(layout.querySelector('#wordList')); renderScope(layout.querySelector('#scopeView'));
      });
    }

    function renderCharList(container) {
      container.innerHTML = '';
      (pack.characters||[]).forEach((c) => {
        const row = PPCore.el(`
          <div class="row" style="grid-template-columns: 100px 1fr 1fr auto; align-items:center; gap:8px;">
            <input class="btn" data-field="char" value="${c.char||''}" placeholder="字" />
            <input class="btn" data-field="pinyinMarked" value="${c.pinyinMarked||''}" placeholder="拼音（帶調）" />
            <input class="btn" data-field="pinyinNumber" value="${c.pinyinNumber||''}" placeholder="拼音（數字調，可留空）" />
            <button class="btn" data-act="del">刪除</button>
          </div>
        `);
        container.appendChild(row);
        row.addEventListener('input', (e) => {
          const f = e.target.getAttribute('data-field');
          if (!f) return;
          c[f] = e.target.value.trim();
          // 數字調缺失時可由帶調轉去調 + 判斷音調再生（留待後續加強）。
          renderScope(root.querySelector('#scopeView'));
        });
        row.querySelector('[data-act="del"]').addEventListener('click', () => {
          pack.characters = pack.characters.filter(x => x !== c);
          renderCharList(container); renderScope(root.querySelector('#scopeView'));
        });
      });
    }

    function renderWordList(container) {
      container.innerHTML = '';
      (pack.words||[]).forEach((w) => {
        const row = PPCore.el(`
          <div class="row" style="grid-template-columns: 160px 1fr 1fr auto; align-items:center; gap:8px;">
            <input class="btn" data-field="word" value="${w.word||''}" placeholder="詞語" />
            <input class="btn" data-field="pinyinMarked" value="${w.pinyinMarked||''}" placeholder="拼音（帶調）" />
            <input class="btn" data-field="pinyinNumber" value="${w.pinyinNumber||''}" placeholder="拼音（數字調，可留空）" />
            <button class="btn" data-act="del">刪除</button>
          </div>
        `);
        container.appendChild(row);
        row.addEventListener('input', (e) => {
          const f = e.target.getAttribute('data-field');
          if (!f) return;
          w[f] = e.target.value.trim();
          renderScope(root.querySelector('#scopeView'));
        });
        row.querySelector('[data-act="del"]').addEventListener('click', () => {
          pack.words = pack.words.filter(x => x !== w);
          renderWordList(container); renderScope(root.querySelector('#scopeView'));
        });
      });
    }

    function renderScope(container) {
      // 即時計算，以格式化顯示
      const scope = PPStorage.inferScope(pack);
      pack.scope = scope; // 寫回
      container.innerHTML = '';
      const s1 = PPCore.el('<div class="result-group"><h3>聲母</h3><div class="result-list"></div></div>');
      const s2 = PPCore.el('<div class="result-group"><h3>韻母</h3><div class="result-list"></div></div>');
      const s3 = PPCore.el('<div class="result-group"><h3>整體</h3><div class="result-list"></div></div>');
      container.appendChild(s1); container.appendChild(s2); container.appendChild(s3);
      scope.shengmu.forEach(x => s1.querySelector('.result-list').appendChild(PPCore.el(`<div class="tag">${x}</div>`)));
      scope.yunmu.forEach(x => s2.querySelector('.result-list').appendChild(PPCore.el(`<div class="tag">${x}</div>`)));
      scope.zhengti.forEach(x => s3.querySelector('.result-list').appendChild(PPCore.el(`<div class="tag">${x}</div>`)));
    }

    function savePack() {
      const packs = PPStorage.loadPacks();
      const idx = packs.findIndex(p => p.pack_id === pack.pack_id);
      if (idx >= 0) packs[idx] = pack;
      PPStorage.savePacks(packs);
      alert('已保存');
    }

    return {
      mount,
      unmount() { root.innerHTML = ''; }
    };
  }

  global.PPScreenPackEditor = function (ctx) { return PackEditor(ctx); };
})(window);
