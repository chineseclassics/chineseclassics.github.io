// 啟動頁：自由模式 / 內容包列表 + 教師模式工具（繁體中文註釋）
(function (global) {
  'use strict';

  function card(html) { return PPCore.el(`<div class="card">${html}</div>`); }

  function StartScreen(ctx) {
    const { root, db } = ctx;

    function mount() {
      const layout = PPCore.el(`
        <div class="row" style="gap:16px;">
          <section class="card" aria-label="模式選擇">
            <h2>開始</h2>
            <div class="result-list">
              <button class="btn" id="btnGlobal">自由模式</button>
            </div>
          </section>
          <section class="card" aria-label="內容包">
            <h2>內容包</h2>
            <div class="actions" id="teacherTools" style="display:none;">
              <input type="file" id="packImport" accept="application/json" style="display:none;" />
              <button class="btn" id="btnNewPack">+ 新建單元</button>
              <button class="btn" id="btnImport">導入 JSON</button>
              <button class="btn" id="btnExportAll">導出全部</button>
              <button class="btn" id="btnExitTeacher">退出教師模式</button>
            </div>
            <div id="packList" class="results"></div>
          </section>
        </div>
      `);

      root.appendChild(layout);

      // 自由模式
      layout.querySelector('#btnGlobal').addEventListener('click', () => {
        PPApp.start('compose-syllable');
      });

      const teacher = PPStorage.isTeacherMode();
      const tools = layout.querySelector('#teacherTools');
      if (teacher) tools.style.display = 'flex';

      // 列出包
      const packs = PPStorage.ensureSamplePacks();
      renderPacks(layout.querySelector('#packList'), packs, teacher);

      if (teacher) bindTeacherTools(layout, packs);
    }

    function renderPacks(container, packs, teacher) {
      container.innerHTML = '';
      packs.forEach((p, idx) => {
        const el = card(`
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div>
              <div style="font-weight:700;">${p.pack_name}</div>
              <div style="font-size:12px;color:#94a3b8;">${p.type || 'unit'} · 字${(p.characters||[]).length} / 詞${(p.words||[]).length}</div>
            </div>
            <div class="actions">
              <button class="btn" data-act="enter" data-id="${p.pack_id}">進入</button>
              ${teacher ? `<button class="btn" data-act="edit" data-id="${p.pack_id}">編輯</button>
              <button class="btn" data-act="export" data-id="${p.pack_id}">導出</button>
              <button class="btn" data-act="delete" data-id="${p.pack_id}">刪除</button>` : ''}
            </div>
          </div>
        `);
        container.appendChild(el);
      });

      container.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.dataset.id;
        const packs = PPStorage.loadPacks();
        const pack = packs.find(x => x.pack_id === id);
        if (!pack) return;
        const act = btn.dataset.act;
        if (act === 'enter') {
          // Focus Mode：將 scope 傳給模式層
          PPApp.start('compose-syllable', { scope: pack.scope, packId: pack.pack_id });
        } else if (act === 'edit') {
          PPApp.go('pack-editor', { packId: id });
        } else if (act === 'export') {
          PPStorage.exportPacks([pack]);
        } else if (act === 'delete') {
          if (confirm('確定刪除此內容包？此操作不可恢復')) {
            const next = packs.filter(x => x.pack_id !== id);
            PPStorage.savePacks(next);
            renderPacks(container, next, PPStorage.isTeacherMode());
          }
        }
      });
    }

    function bindTeacherTools(layout) {
      layout.querySelector('#btnNewPack').addEventListener('click', () => {
        const packs = PPStorage.loadPacks();
        const np = {
          pack_id: crypto.randomUUID(),
          pack_name: prompt('請輸入單元名稱', '新單元') || '新單元',
          type: 'unit',
          scope: { shengmu: [], yunmu: [], zhengti: [] },
          characters: [], words: []
        };
        packs.push(np); PPStorage.savePacks(packs);
        PPApp.go('pack-editor', { packId: np.pack_id });
      });

      layout.querySelector('#btnImport').addEventListener('click', () => {
        layout.querySelector('#packImport').click();
      });
      layout.querySelector('#packImport').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        await PPStorage.importPacksFromFile(file);
        PPApp.go('start');
      });
      layout.querySelector('#btnExportAll').addEventListener('click', () => {
        PPStorage.exportPacks(PPStorage.loadPacks());
      });
      layout.querySelector('#btnExitTeacher').addEventListener('click', () => {
        PPStorage.setTeacherMode(false); PPApp.go('start');
      });
    }

    return {
      mount,
      unmount() { root.innerHTML = ''; }
    };
  }

  global.PPScreenStart = function (ctx) { return StartScreen(ctx); };
})(window);
