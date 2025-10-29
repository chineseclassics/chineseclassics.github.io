/**
 * 時文寶鑑 - 學生論文編輯器
 * 
 * 功能：
 * - 單一 ProseMirror 編輯器（TipTap/PM）
 * - 自動保存 + 字數統計（不含標點）
 * - PM decorations 顯示批註
 */

import { PMEditor } from '../editor/tiptap-editor.js';
import { createAnnotationPlugin, createAnnotationFromSelection } from '../features/pm-annotation-plugin.js';
import { PMAnnotationOverlay } from '../features/pm-annotation-overlay.js';
import { initializeStorage, StorageState } from './essay-storage.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

// 動態獲取全局 AppState（避免 ES 模組載入時機問題）
function getAppState() {
    return window.AppState;
}

// ================================
// 編輯器狀態管理
// ================================

const EditorState = {
    introEditor: null,
    conclusionEditor: null,
    arguments: [], // { id, titleEditor, paragraphs: [{ id, editor }] }
    totalWordCount: 0,
    saveTimer: null,
    initialized: false,
    isInitializing: false  // 防止重复初始化
};

// 生成穩定段落 UUID（客戶端）
function generateClientUid() {
    // 簡單 UUID v4 生成器（瀏覽器環境）
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const s = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s()}${s()}-${s()}-${s()}-${s()}-${s()}${s()}${s()}`;
}

// =============== PM JSON 讀寫輔助（TipTap 路徑） ===============
async function loadInitialPMJSON() {
  try {
    const AppState = getAppState();
    const essayId = StorageState.currentEssayId;
    if (!AppState?.supabase || !essayId) return null;
    const { data } = await AppState.supabase
      .from('essays')
      .select('content_json')
      .eq('id', essayId)
      .single();
    if (!data?.content_json) return null;
    const json = typeof data.content_json === 'string' ? JSON.parse(data.content_json) : data.content_json;
    return json && json.type ? json : null;
  } catch (_) { return null; }
}

async function loadEssayMeta() {
  try {
    const AppState = getAppState();
    const essayId = StorageState.currentEssayId;
    if (!AppState?.supabase || !essayId) return;
    const { data } = await AppState.supabase
      .from('essays')
      .select('title, subtitle')
      .eq('id', essayId)
      .single();
    if (data) {
      const titleEl = document.getElementById('essay-title');
      const subEl = document.getElementById('essay-subtitle');
      if (titleEl && (titleEl.value || '') !== (data.title || '')) titleEl.value = data.title || '';
      if (subEl && (subEl.value || '') !== (data.subtitle || '')) subEl.value = data.subtitle || '';
    }
  } catch (_) {}
}

// 讀取作業的寫作模式（essay-structured | creative），預設 essay-structured
async function loadAssignmentMode() {
  try {
    const AppState = getAppState();
    const assignmentId = AppState?.currentAssignmentId;
    if (!AppState?.supabase || !assignmentId) return 'essay-structured';
    const { data } = await AppState.supabase
      .from('assignments')
      .select('writing_mode, editor_layout_json')
      .eq('id', assignmentId)
      .single();
    const mode = data?.writing_mode || 'essay-structured';
    try { AppState.currentWritingMode = mode; } catch (_) {}
    return mode;
  } catch (_) { return 'essay-structured'; }
}

const debounce = (fn, wait = 1000) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

async function autoSavePMJSON() {
  try {
    const AppState = getAppState();
    if (!AppState?.supabase) return;
    if (!StorageState.currentEssayId) {
      await ensureEssayRecord();
    }
    const essayId = StorageState.currentEssayId;
    if (!essayId) return;
    const json = EditorState.introEditor?.getJSON?.();
    if (!json) return;
    const titleEl = document.getElementById('essay-title');
    const subEl = document.getElementById('essay-subtitle');
    const updatePayload = { content_json: json, updated_at: new Date().toISOString() };
    if (titleEl) {
      const t = (titleEl.value || '').trim();
      if (t) updatePayload.title = t; // 只有有值時才覆寫，避免誤設為預設
    }
    if (subEl) {
      updatePayload.subtitle = (subEl.value || '').trim(); // 允許清空
    }
    // 保存中狀態
    try { updateSaveStatus('saving'); } catch (_) {}
    await AppState.supabase
      .from('essays')
      .update(updatePayload)
      .eq('id', essayId);
    // 更新字數（不含標點）
    try {
      const text = EditorState.introEditor?.getText?.() || '';
      const count = countWithoutPunct(text);
      const wordCountDisplay = document.getElementById('word-count-display');
      if (wordCountDisplay) wordCountDisplay.textContent = `${count} 字`;
    } catch (_) {}
    try { updateSaveStatus('saved'); } catch (_) {}
  } catch (e) { console.warn('autosave PM JSON 失敗:', e); }
}

async function ensureEssayRecord() {
  const AppState = getAppState();
  if (!AppState?.supabase || StorageState.currentEssayId) return;
  try {
    const userId = AppState?.currentUser?.id;
    const assignmentId = AppState?.currentAssignmentId || null;
    const titleInput = document.getElementById('essay-title');
    const title = (titleInput?.value || '論文草稿').trim();
    const json = EditorState.introEditor?.getJSON?.() || { type: 'doc', content: [{ type: 'paragraph' }] };
    const wordCount = (EditorState.introEditor?.getText?.() || '').length;
    const payload = {
      student_id: userId,
      assignment_id: assignmentId,
      title,
      content_json: json,
    status: 'writing',
      total_word_count: wordCount
    };
    const { data, error } = await AppState.supabase
      .from('essays')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    StorageState.currentEssayId = data.id;
    try { localStorage.setItem('current-essay-id', data.id); } catch (_) {}
    console.log('🆕 已建立新 essay 記錄:', data.id);
  } catch (e) {
    console.warn('ensureEssayRecord 失敗:', e);
  }
}

async function refreshPMAnnotationsStudent() {
  try {
    const AppState = getAppState();
    if (!AppState?.supabase || !StorageState.currentEssayId) return;
    const pmRes = await AppState.supabase.rpc('get_essay_annotations_pm', { p_essay_id: StorageState.currentEssayId });
    if (pmRes.error) throw pmRes.error;
    const list = (pmRes.data || []).map(a => ({
      id: a.id,
      text_start: a.text_start ?? null,
      text_end: a.text_end ?? null,
      text_quote: a.text_quote || null,
      text_prefix: a.text_prefix || null,
      text_suffix: a.text_suffix || null
    }));
    const map = new Map();
    for (const x of list) if (x?.id) map.set(x.id, x);
    window.__pmAnnStore = Array.from(map.values());
    const view = EditorState.introEditor?.view;
    if (view) view.dispatch(view.state.tr.setMeta('annotations:update', true));
    // 更新學生端側欄
    try { renderStudentAnnSidebar(); } catch (_) {}
    // 更新右側疊加層
    try { window.__pmOverlay?.update?.(); } catch (_) {}
    // Realtime：建立一次性監聽
    try {
      if (!window.__pmAnnChannel) {
        window.__pmAnnChannel = AppState.supabase
          .channel('pm-ann-student')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, () => {
            refreshPMAnnotationsStudent();
          })
          .subscribe();
      }
    } catch (_) {}
  } catch (e) {
    console.warn('學生端刷新批註失敗:', e);
  }
}

/**
 * 獲取編輯器實例（供外部模組使用）
 */
export function getEditorByParagraphId(paragraphId) {
    if (paragraphId === 'intro') {
        return EditorState.introEditor;
    } else if (paragraphId === 'conclusion') {
        return EditorState.conclusionEditor;
    } else {
        // 從分論點中查找
        for (const arg of EditorState.arguments) {
            const para = arg.paragraphs.find(p => p.id === paragraphId);
            if (para) {
                return para.editor;
            }
        }
    }
    return null;
}

// ================================
// 初始化編輯器
// ================================

export async function initializeEssayEditor(forceReinit = false) {
    // 如果強制重新初始化，先重置狀態
    if (forceReinit) {
        console.log('🔄 強制重新初始化編輯器...');
        try { EditorState.introEditor?.destroy?.(); } catch (_) {}
        try { EditorState.conclusionEditor?.destroy?.(); } catch (_) {}
        EditorState.initialized = false;
        EditorState.isInitializing = false;
        EditorState.introEditor = null;
        EditorState.conclusionEditor = null;
        EditorState.arguments = [];
        EditorState.totalWordCount = 0;
        if (EditorState.saveTimer) {
            clearTimeout(EditorState.saveTimer);
            EditorState.saveTimer = null;
        }
    }
    
    // 防止重複初始化
    if (EditorState.initialized || EditorState.isInitializing) {
        console.log('⏸️ 編輯器已初始化或正在初始化中，跳過');
        return;
    }
    
    EditorState.isInitializing = true;
    console.log('📝 初始化論文編輯器...');
    
    try {
    // 0. 初始化存儲模組
        initializeStorage();
        
    // TIPTAP 路徑：單一文檔編輯器（ProseMirror JSON）
    const container = document.getElementById('intro-editor') || document.getElementById('essay-editor');
    if (!container) {
        console.error('❌ 找不到編輯器容器（essay-editor）');
        return;
    }

    // 清空舊結構（多輸入框模式）
    try {
        const legacy = document.getElementById('arguments-container');
        if (legacy) legacy.innerHTML = '';
        const concl = document.getElementById('conclusion-editor');
        if (concl) concl.innerHTML = '';
    } catch (_) {}

    // 建立單一 PM 編輯器
    EditorState.introEditor = new PMEditor(container, {
        readOnly: false,
        initialJSON: await loadInitialPMJSON(),
        onUpdate: debounce(async () => {
            await autoSavePMJSON();
        }, 1500)
    });
    const host = document.getElementById('essay-editor')||container;
    try { host.classList.add('pm-essay'); } catch (_) {}

    // 套用模式樣式
    const writingMode = await loadAssignmentMode();
    if (writingMode === 'essay-structured') {
      try { host.classList.add('pm-essay-structured'); } catch (_) {}
    } else {
      try { host.classList.remove('pm-essay-structured'); } catch (_) {}
    }

    // 永久移除舊的浮動工具（已不再使用）
    try { document.getElementById('essay-structured-toolbar')?.remove(); } catch (_) {}
    try { document.getElementById('pm-inline-toolbar')?.remove(); } catch (_) {}

    // 綁定左側「雨村評點（當前段）」
    try {
      const btn = document.getElementById('sidebar-yucun-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          await runYucunForCurrentParagraph();
        });
      }
    } catch (_) {}

    // 綁定標題/副標題輸入 → 即時保存
    try {
      const titleInput = document.getElementById('essay-title');
      const subtitleInput = document.getElementById('essay-subtitle');
      titleInput?.addEventListener('input', saveTitleDebounced);
      subtitleInput?.addEventListener('input', saveTitleDebounced);
    } catch (_) {}

    // 確保有 essay 記錄（新作業會沒有 ID）並立即保存一次
    await ensureEssayRecord();
    await loadEssayMeta();
    await autoSavePMJSON();

    // 掛載批註裝飾（顯示老師批註）
    try {
      window.__pmAnnStore = [];
      const plugin = createAnnotationPlugin({
        getAnnotations: () => window.__pmAnnStore,
        onClick: (id) => focusStudentAnnCard(id)
      });
      EditorState.introEditor.addPlugins([plugin]);
      // 右側批註疊加層（學生端只讀卡片）
      try {
        const root = document.querySelector('#student-dashboard .main-content-area') || document.getElementById('essay-editor')?.parentElement || document.body;
        const view = EditorState.introEditor?.view;
        if (root && view) {
          window.__pmOverlay = new PMAnnotationOverlay({
            root,
            view,
            getAnnotations: () => Array.isArray(window.__pmAnnStore) ? window.__pmAnnStore : [],
            onClick: (id) => focusStudentAnnDecoration(id)
          });
          window.__pmOverlay.mount();
        }
      } catch (_) {}
      await refreshPMAnnotationsStudent();
      window.__pmAnnTimer = setInterval(refreshPMAnnotationsStudent, 5000);
    } catch (e) { console.warn('學生端批註插件掛載失敗:', e); }

    // 學生端開放新增批註：就地輸入（與老師端一致）
    try { setupStudentSelectionComposer(); } catch (_) {}

    // 完成初始化
    EditorState.initialized = true;
    EditorState.isInitializing = false;
    console.log('✅ PM 編輯器初始化完成（TipTap/PM 路徑）');
    return;

    // 1. 初始化引言編輯器（舊 Quill 路徑）
        const introContainer = document.getElementById('intro-editor');
        if (!introContainer) {
            console.error('❌ 找不到引言編輯器容器');
            return;
        }
        
        EditorState.introEditor = new RichTextEditor(introContainer, {
            placeholder: '在此撰寫引言...\n\n提示：引言應包含 Hook、定義、研究缺口、論文主張、結構預告',
            toolbarType: 'simple',
            onChange: handleEditorChange
        });
        
        console.log('✅ 引言編輯器初始化完成');

        // 為引言段落容器補充穩定 client uid
        const introBlock = document.getElementById('intro');
        if (introBlock && !introBlock.dataset.clientUid) {
            introBlock.dataset.clientUid = generateClientUid();
        }
        
        // 2. 初始化結論編輯器
        const conclusionContainer = document.getElementById('conclusion-editor');
        if (!conclusionContainer) {
            console.error('❌ 找不到結論編輯器容器');
            return;
        }
        
        EditorState.conclusionEditor = new RichTextEditor(conclusionContainer, {
            placeholder: '在此撰寫結論...\n\n提示：結論應重申主張、總結論點、引申思考',
            toolbarType: 'simple',
            onChange: handleEditorChange
        });
        
        console.log('✅ 結論編輯器初始化完成');

        // 為結論段落容器補充穩定 client uid
        const conclusionBlock = document.getElementById('conclusion');
        if (conclusionBlock && !conclusionBlock.dataset.clientUid) {
            conclusionBlock.dataset.clientUid = generateClientUid();
        }
        
        // 3. 綁定添加分論點按鈕
        const addArgumentBtn = document.getElementById('add-argument-btn');
        if (addArgumentBtn) {
            addArgumentBtn.addEventListener('click', addArgument);
        }
        
        // 4. 綁定標題輸入框變化事件
        const titleInput = document.getElementById('essay-title');
        const subtitleInput = document.getElementById('essay-subtitle');
        
        if (titleInput) {
            titleInput.addEventListener('input', handleEditorChange);
        }
        if (subtitleInput) {
            subtitleInput.addEventListener('input', handleEditorChange);
        }
        
        // 5. 綁定引言和結論的 AI 反饋按鈕
        const introFeedbackBtn = document.getElementById('intro-feedback-btn');
        if (introFeedbackBtn) {
            introFeedbackBtn.addEventListener('click', () => requestParagraphFeedback('intro', 'introduction'));
        }
        
        const conclusionFeedbackBtn = document.getElementById('conclusion-feedback-btn');
        if (conclusionFeedbackBtn) {
            conclusionFeedbackBtn.addEventListener('click', () => requestParagraphFeedback('conclusion', 'conclusion'));
        }
        
        // 6. 初始化字數統計
        updateWordCount();
        
        EditorState.initialized = true;
        EditorState.isInitializing = false;
        console.log('✅ 論文編輯器初始化完成');
        
    } catch (error) {
        console.error('❌ 編輯器初始化失敗:', error);
        EditorState.isInitializing = false;  // 發生錯誤時也要重置狀態
    }
}

// ================================
// Essay-Structured 模式：段落工具與操作
// ================================

function setupEssayStructuredUI(pm) {
  const view = pm?.view;
  if (!view) return;

  // 全局工具列（新增分論點 = 插入一個空段落並加粗提示）
  ensureGlobalToolbar();

  // 內聯工具列（當前段落：上方插入/下方插入/雨村評點）
  const inline = ensureInlineToolbar();
  let hoverPos = null;
  let rafId = null;
  const reposition = (pos) => {
    try {
      const { state } = view;
      const $pos = state.doc.resolve(pos);
      const blockStart = $pos.start($pos.depth);
      const blockEnd = $pos.end($pos.depth);
      // 僅在當前段落有實質內容時顯示
      const paraText = state.doc.textBetween(blockStart, blockEnd, '\n');
      if (!paraText || !paraText.trim()) { inline.style.display = 'none'; return; }
      const coords = view.coordsAtPos(Math.min(blockEnd, Math.max(blockStart, pos)));
      // 先顯示以便取得尺寸
      inline.style.display = 'flex';
      inline.style.position = 'absolute';
      const ih = inline.offsetHeight || 28;
      const iw = inline.offsetWidth || 220;
      let top = window.scrollY + coords.top - ih - 6; // 優先顯示在段落上方
      if (top < window.scrollY + 12) top = window.scrollY + coords.bottom + 6; // 貼頂時轉到下方
      let left = window.scrollX + Math.max(12, coords.left - (iw + 8)); // 左側邊距，不遮擋正文
      // 邊界保護
      if (left + iw > window.scrollX + window.innerWidth - 12) {
        left = window.scrollX + window.innerWidth - iw - 12;
      }
      inline.style.top = `${top}px`;
      inline.style.left = `${left}px`;
    } catch (_) { inline.style.display = 'none'; }
  };

  const onMouseMove = (e) => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const posInfo = view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!posInfo || typeof posInfo.pos !== 'number') return;
      hoverPos = posInfo.pos;
      reposition(hoverPos);
    });
  };

  view.dom.addEventListener('mousemove', onMouseMove);
  view.dom.addEventListener('mouseleave', () => { inline.style.display = 'none'; });
  view.dom.addEventListener('click', () => { if (hoverPos) reposition(hoverPos); });
  window.addEventListener('scroll', () => {
    if (inline.style.display === 'flex' && hoverPos) reposition(hoverPos);
  }, { passive: true });

  // 綁定按鈕
  inline.querySelector('[data-act="insert-above"]').addEventListener('click', () => insertParagraphRelative(view, 'above', hoverPos));
  inline.querySelector('[data-act="insert-below"]').addEventListener('click', () => insertParagraphRelative(view, 'below', hoverPos));
  inline.querySelector('[data-act="yucun"]').addEventListener('click', async () => {
    try {
      const html = getCurrentParagraphHTML(view, hoverPos) || '';
      if (!html || !html.replace(/<[^>]*>/g,'').trim()) { toast.warning('當前段落為空'); return; }
      const { requestAIFeedback } = await import('../ai/feedback-requester.js');
      await requestAIFeedback('pm-current', html, 'body', getAppState().currentFormatSpec);
    } catch (e) { toast.error('雨村評點失敗'); }
  });

  // 全局工具列事件
  const globalBar = document.getElementById('essay-structured-toolbar');
  if (globalBar) {
    const addArgBtn = globalBar.querySelector('[data-act="add-argument"]');
    addArgBtn?.addEventListener('click', () => {
      // 用一個提示段落作為分論點標題（可後續升級為 heading node）
      const { state, dispatch } = view;
      const p = state.schema.node('paragraph', null, state.schema.text('【分論點標題】'));
      dispatch(state.tr.insert(state.selection.$from.before(1), p));
      view.focus();
    });
  }
}

// ================================
// 學生端批註側欄（簡版）
// ================================

function ensureStudentAnnSidebar() {
  let panel = document.getElementById('student-ann-sidebar');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'student-ann-sidebar';
  panel.innerHTML = `
    <div class="student-ann-header"><i class="fas fa-comment-dots"></i> 批註</div>
    <div class="student-ann-list" id="student-ann-list"></div>
  `;
  panel.style.cssText = `
    position: fixed; right: 16px; top: 140px; width: 280px; max-height: 60vh; overflow: auto;
    background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.06);
    z-index: 50; display: none;
  `;
  document.body.appendChild(panel);
  return panel;
}

function renderStudentAnnSidebar() {
  const panel = ensureStudentAnnSidebar();
  const listEl = panel.querySelector('#student-ann-list');
  const anns = Array.isArray(window.__pmAnnStore) ? window.__pmAnnStore : [];
  if (!anns.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  listEl.innerHTML = anns.map(a => `
    <div class="student-ann-card" data-id="${a.id}">
      <div class="student-ann-text">${escapeHtml(a.text_quote || '(未提供節選)')}</div>
    </div>
  `).join('');
  // 綁定點擊：點卡片 → 正文裝飾聯動
  listEl.querySelectorAll('.student-ann-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      focusStudentAnnDecoration(id);
      focusStudentAnnCard(id);
    });
  });
}

function focusStudentAnnCard(id) {
  try {
    const listEl = document.getElementById('student-ann-list');
    if (!listEl) return;
    listEl.querySelectorAll('.student-ann-card').forEach(el => el.classList.remove('active'));
    const card = listEl.querySelector(`.student-ann-card[data-id="${CSS.escape(id)}"]`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulse(card);
    }
  } catch (_) {}
}

function focusStudentAnnDecoration(id) {
  try {
    const view = EditorState.introEditor?.view;
    if (!view) return;
    const target = view.dom.querySelector(`.pm-annotation[data-id="${CSS.escape(id)}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulse(target);
    }
  } catch (_) {}
}

function pulse(el) {
  el.animate([
    { boxShadow: '0 0 0 0 rgba(59,130,246,0.5)' },
    { boxShadow: '0 0 0 8px rgba(59,130,246,0.0)' }
  ], { duration: 600, easing: 'ease-out' });
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

// 計算字數（不含標點與空白）：採用中日韓統一表意文字統計
function countWithoutPunct(text) {
  if (!text) return 0;
  const matches = text.match(/[\u4E00-\u9FFF]/g); // 只計算中日韓漢字
  return matches ? matches.length : 0;
}

// 學生端：右側就地「添加批註」編寫器
function setupStudentSelectionComposer() {
  const view = EditorState.introEditor?.view;
  if (!view) return;
  if (window.__pmComposer) return;

  const root = document.querySelector('#student-dashboard .main-content-area') || document.getElementById('essay-editor')?.parentElement || document.body;
  const style = window.getComputedStyle(root);
  if (style.position === 'static' || !style.position) root.style.position = 'relative';

  const composer = document.createElement('div');
  composer.className = 'pm-ann-composer';
  composer.style.display = 'none';
  composer.innerHTML = `
    <div>
      <textarea placeholder="請輸入批註..."></textarea>
      <div class="actions">
        <button type="button" class="btn btn-ghost">取消</button>
        <button type="button" class="btn btn-primary">添加</button>
      </div>
    </div>
  `;
  root.appendChild(composer);

  const textarea = composer.querySelector('textarea');
  const btnCancel = composer.querySelector('.btn-ghost');
  const btnAdd = composer.querySelector('.btn-primary');

  const hide = () => { composer.style.display = 'none'; textarea.value = ''; };
  const showAt = (rect) => {
    const containerRect = root.getBoundingClientRect();
    const mid = (rect.top + rect.bottom) / 2 - containerRect.top;
    const top = Math.max(8, mid - composer.offsetHeight / 2);
    composer.style.top = `${Math.round(top)}px`;
    composer.style.right = `0px`;
    composer.style.display = 'block';
    textarea.focus();
  };

  const update = () => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { hide(); return; }
      const range = sel.getRangeAt(0);
      const container = view.dom;
      const anchorNode = sel.anchorNode;
      const focusNode = sel.focusNode;
      if (!container.contains(anchorNode) || !container.contains(focusNode)) { hide(); return; }
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { hide(); return; }
      showAt(rect);
    } catch (_) { hide(); }
  };

  const onMouseUp = () => setTimeout(update, 0);
  const onKeyUp = () => setTimeout(update, 0);
  const onScroll = () => { if (composer.style.display !== 'none') update(); };

  view.dom.addEventListener('mouseup', onMouseUp);
  view.dom.addEventListener('keyup', onKeyUp);
  window.addEventListener('scroll', onScroll, { passive: true });

  btnCancel.addEventListener('click', hide);
  btnAdd.addEventListener('click', async () => {
    try {
      const AppState = getAppState();
      const essayId = (await import('./essay-storage.js')).StorageState.currentEssayId;
      if (!AppState?.supabase || !essayId || !view || view.state.selection.empty) { hide(); return; }
      const content = (textarea.value || '').trim();
      if (!content) { textarea.focus(); return; }
      const id = await createAnnotationFromSelection({ view, supabase: AppState.supabase, essayId, content });
      if (id) {
        hide();
        await refreshPMAnnotationsStudent();
        try { toast.success('批註已新增'); } catch (_) {}
      }
    } catch (e) {
      console.warn('學生新增批註失敗:', e);
      try { toast.error('新增批註失敗'); } catch (_) {}
    }
  });

  window.__pmComposer = composer;
}

// 標題/副標題即時保存（即使正文未變化）
const saveTitleDebounced = debounce(async () => {
  try {
    const AppState = getAppState();
    const essayId = (await import('./essay-storage.js')).StorageState.currentEssayId;
    if (!AppState?.supabase || !essayId) return;
    const title = (document.getElementById('essay-title')?.value || '').trim();
    const subtitle = (document.getElementById('essay-subtitle')?.value || '').trim();
    if (!title && !subtitle) return; // 無變更
    try { updateSaveStatus('saving'); } catch (_) {}
    await AppState.supabase
      .from('essays')
      .update({ title: title || undefined, subtitle, updated_at: new Date().toISOString() })
      .eq('id', essayId);
    try { updateSaveStatus('saved'); } catch (_) {}
  } catch (_) {}
}, 800);

function ensureGlobalToolbar() {
  let bar = document.getElementById('essay-structured-toolbar');
  if (bar) return bar;
  bar = document.createElement('div');
  bar.id = 'essay-structured-toolbar';
  bar.style.display = 'flex';
  bar.style.gap = '8px';
  bar.style.margin = '8px 0';
  bar.innerHTML = `
    <button class="px-3 py-1 rounded border text-sm" data-act="add-argument">
      <i class="fas fa-plus mr-1"></i>新增分論點
    </button>
  `;
  const host = document.getElementById('essay-editor') || document.getElementById('intro-editor');
  if (host && host.parentElement) host.parentElement.insertBefore(bar, host);
  return bar;
}

function ensureInlineToolbar() {
  let panel = document.getElementById('pm-inline-toolbar');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'pm-inline-toolbar';
  panel.style.background = 'rgba(255,255,255,0.95)';
  panel.style.border = '1px solid #e5e7eb';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
  panel.style.padding = '4px 6px';
  panel.style.gap = '6px';
  panel.style.display = 'none';
  panel.style.zIndex = '40';
  panel.style.alignItems = 'center';
  panel.innerHTML = `
    <button class="text-xs px-2 py-1 hover:bg-stone-100 rounded" data-act="insert-above"><i class="fas fa-arrow-up mr-1"></i>上方插入段落</button>
    <button class="text-xs px-2 py-1 hover:bg-stone-100 rounded" data-act="insert-below"><i class="fas fa-arrow-down mr-1"></i>下方插入段落</button>
    <span class="text-stone-300">|</span>
    <button class="text-xs px-2 py-1 hover:bg-stone-100 rounded" data-act="yucun"><i class="fas fa-pen-fancy mr-1"></i>雨村評點</button>
  `;
  document.body.appendChild(panel);
  return panel;
}

function getCurrentParagraphHTML(view, posOverride = null) {
  const { state } = view;
  const $from = posOverride ? state.doc.resolve(posOverride) : state.selection.$from;
  const blockStart = $from.start($from.depth);
  const blockEnd = $from.end($from.depth);
  const sliceText = state.doc.textBetween(blockStart, blockEnd, '\n');
  const escaped = sliceText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${escaped}</p>`;
}

function getParagraphTypeByCaret(view) {
  try {
    const { state } = view;
    const total = state.doc.content.childCount;
    const $from = state.selection.$from;
    const index = $from.index($from.depth); // 當前 block 序號
    if (index <= 0) return 'introduction';
    if (index >= total - 1) return 'conclusion';
    return 'body';
  } catch (_) { return 'body'; }
}

async function runYucunForCurrentParagraph() {
  try {
    const view = EditorState.introEditor?.view;
    if (!view) return;
    const html = getCurrentParagraphHTML(view) || '';
    const plain = html.replace(/<[^>]*>/g,'').trim();
    if (!plain) { toast.warning('當前段落為空'); return; }
    const type = getParagraphTypeByCaret(view);
    const { requestAIFeedback } = await import('../ai/feedback-requester.js');
    const AppState = getAppState();
    await requestAIFeedback('pm-current', html, type, AppState.currentFormatSpec);
  } catch (e) { console.warn('雨村評點失敗:', e); toast.error('雨村評點失敗'); }
}

function insertParagraphRelative(view, where = 'below', basePos = null) {
  try {
    const { state, dispatch } = view;
    const schema = state.schema;
    const $from = basePos ? state.doc.resolve(basePos) : state.selection.$from;
    const depth = $from.depth;
    const before = $from.before(depth);
    const after = $from.after(depth);
    const pos = where === 'above' ? before : after;
    const node = schema.node('paragraph');
    const tr = state.tr.insert(pos, node);
    dispatch(tr);
    view.focus();
  } catch (e) { console.warn('插入段落失敗:', e); }
}

// ================================
// 分論點管理
// ================================

/**
 * 添加新分論點
 */
export function addArgument() {
    const argumentId = `arg-${Date.now()}`;
    const argumentIndex = EditorState.arguments.length + 1;
    
    // 創建分論點 HTML 結構
    const argumentHTML = `
        <div id="${argumentId}" class="border-b border-gray-200 p-6 bg-gradient-to-r from-stone-50 to-transparent">
            <!-- 分論點標題 -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3 flex-1">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full bg-stone-600 text-white text-sm font-bold">
                        ${argumentIndex}
                    </div>
                    <input type="text" class="input"
                           id="${argumentId}-title"
                           placeholder="輸入分論點標題..."
                           class="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-stone-400 focus:border-stone-600 focus:outline-none px-2 py-1 transition-colors">
                </div>
                <button class="delete-argument-btn text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-100 transition-all"
                        data-argument-id="${argumentId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <!-- 段落容器 -->
            <div id="${argumentId}-paragraphs" class="space-y-4 ml-11">
                <!-- 段落將動態添加到這裡 -->
            </div>
            
            <!-- 添加段落按鈕 -->
            <div class="ml-11 mt-4">
                <button class="add-paragraph-btn w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-stone-400 rounded-lg text-stone-600 hover:border-stone-600 hover:bg-stone-50 text-sm transition-all"
                        data-argument-id="${argumentId}">
                    <i class="fas fa-plus"></i>
                    <span>添加段落</span>
                </button>
            </div>
        </div>
    `;
    
    // 插入到容器中
    const container = document.getElementById('arguments-container');
    container.insertAdjacentHTML('beforeend', argumentHTML);
    
    // 創建分論點對象
    const argument = {
        id: argumentId,
        index: argumentIndex,
        paragraphs: []
    };
    
    EditorState.arguments.push(argument);
    
    // 綁定刪除按鈕
    const deleteBtn = document.querySelector(`[data-argument-id="${argumentId}"].delete-argument-btn`);
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteArgument(argumentId));
    }
    
    // 綁定添加段落按鈕
    const addParagraphBtn = document.querySelector(`[data-argument-id="${argumentId}"].add-paragraph-btn`);
    if (addParagraphBtn) {
        addParagraphBtn.addEventListener('click', () => addParagraph(argumentId));
    }
    
    // 自動添加第一個段落
    addParagraph(argumentId);
    
    console.log(`✅ 已添加分論點 ${argumentIndex}`);
}

/**
 * 刪除分論點
 */
function deleteArgument(argumentId) {
    dialog.confirmDelete({
        message: '確定要刪除此分論點及其所有段落嗎？<br><br>此操作無法撤銷。',
        onConfirm: () => {
            // 從 DOM 中移除
            const element = document.getElementById(argumentId);
            if (element) {
                element.remove();
            }
            
            // 從狀態中移除
            const index = EditorState.arguments.findIndex(arg => arg.id === argumentId);
            if (index !== -1) {
                // 銷毀所有段落編輯器
                const argument = EditorState.arguments[index];
                argument.paragraphs.forEach(para => {
                    if (para.editor) {
                        para.editor.destroy();
                    }
                });
                
                EditorState.arguments.splice(index, 1);
            }
            
            // 重新編號
            renumberArguments();
            
            // 更新字數
            updateWordCount();
            
            // 提示
            toast.success('分論點已刪除！');
            
            console.log(`✅ 已刪除分論點: ${argumentId}`);
        }
    });
}

/**
 * 重新編號分論點
 */
function renumberArguments() {
    EditorState.arguments.forEach((argument, index) => {
        argument.index = index + 1;
        
        const badge = document.querySelector(`#${argument.id} .rounded-full`);
        if (badge) {
            badge.textContent = argument.index;
        }
    });
}

// ================================
// 段落管理
// ================================

/**
 * 添加段落到分論點
 */
export function addParagraph(argumentId) {
    const argument = EditorState.arguments.find(arg => arg.id === argumentId);
    if (!argument) {
        console.error('❌ 找不到分論點:', argumentId);
        return;
    }
    
    const paragraphId = `${argumentId}-para-${Date.now()}`;
    const clientUid = generateClientUid();
    const paragraphIndex = argument.paragraphs.length + 1;
    
    // 創建段落 HTML
    const paragraphHTML = `
        <div id="${paragraphId}" class="paragraph-block bg-white rounded-lg border border-gray-200 p-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">段落 ${paragraphIndex}</span>
                <div class="flex items-center space-x-2">
                    <!-- 雨村評點按鈕 -->
                    <button id="${paragraphId}-feedback-btn" 
                            class="premium-blue-text hover:premium-blue-text-dark hover:premium-blue-hover px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow"
                            data-paragraph-id="${paragraphId}"
                            title="請雨村評點">
                        <i class="fas fa-pen-fancy mr-2 text-base"></i>
                        雨村評點
                    </button>
                    <!-- 刪除按鈕 -->
                    <button class="delete-paragraph-btn text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-100 transition-all"
                            data-paragraph-id="${paragraphId}"
                            data-argument-id="${argumentId}">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            </div>
            <div id="${paragraphId}-editor" class="min-h-[150px]"></div>
            <div class="mt-2 flex items-center justify-between">
                <span id="${paragraphId}-word-count" class="text-xs text-gray-500">0 字</span>
            </div>
            <!-- 移動端 AI 反饋容器（內聯展開） -->
        </div>
    `;
    
    // 插入到段落容器
    const container = document.getElementById(`${argumentId}-paragraphs`);
    container.insertAdjacentHTML('beforeend', paragraphHTML);
    // 設置穩定 client uid 到 DOM
    const blockEl = document.getElementById(paragraphId);
    if (blockEl) blockEl.dataset.clientUid = clientUid;
    
    // 創建編輯器
    const editorContainer = document.getElementById(`${paragraphId}-editor`);
    const editor = new RichTextEditor(editorContainer, {
        placeholder: '在此撰寫段落內容...\n\n提示：主題句、文本證據、細讀分析、總結',
        toolbarType: 'simple',
        onChange: (data) => {
            // 更新段落字數
            const wordCountEl = document.getElementById(`${paragraphId}-word-count`);
            if (wordCountEl) {
                wordCountEl.textContent = `${data.wordCount.total} 字`;
            }
            
            // 觸發全局變化
            handleEditorChange(data);
        }
    });
    
    // 保存段落對象
    const paragraph = {
        id: paragraphId,
        index: paragraphIndex,
        editor: editor,
        type: 'body', // 正文段落
        clientUid: clientUid
    };
    
    argument.paragraphs.push(paragraph);
    
    // 綁定刪除按鈕
    const deleteBtn = document.querySelector(`[data-paragraph-id="${paragraphId}"].delete-paragraph-btn`);
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteParagraph(argumentId, paragraphId));
    }
    
    // 綁定 AI 反饋按鈕
    const feedbackBtn = document.getElementById(`${paragraphId}-feedback-btn`);
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => requestParagraphFeedback(paragraphId, 'body'));
    }
    
    console.log(`✅ 已添加段落到分論點 ${argument.index}`);
}

/**
 * 刪除段落
 */
async function deleteParagraph(argumentId, paragraphId) {
    const argument = EditorState.arguments.find(arg => arg.id === argumentId);
    if (!argument) {
        console.error('❌ 找不到分論點:', argumentId);
        return;
    }

    const blockEl = document.getElementById(paragraphId);
    const sourcePid = blockEl?.dataset?.paragraphId || null; // DB paragraph id（可能尚未存在）

    // 若該段已有 DB id，檢查是否存在老師批註
    let hasAnnotations = false;
    if (sourcePid) {
        try {
            const AppState = getAppState();
            const { data: ann } = await AppState.supabase
                .from('annotations')
                .select('id')
                .eq('paragraph_id', sourcePid)
                .limit(1);
            hasAnnotations = Array.isArray(ann) && ann.length > 0;
        } catch (_) {}
    }

    if (hasAnnotations) {
        // 提示：阻止刪除 / 遷移到相鄰段 / 保留為孤立（將在保存時自動處理）
        const neighborPrev = blockEl?.previousElementSibling?.classList?.contains('paragraph-block') ? blockEl.previousElementSibling : null;
        const neighborNext = blockEl?.nextElementSibling?.classList?.contains('paragraph-block') ? blockEl.nextElementSibling : null;
        const prevPid = neighborPrev?.dataset?.paragraphId || null;
        const nextPid = neighborNext?.dataset?.paragraphId || null;

        const options = [];
        if (prevPid) options.push({ key: 'toPrev', label: '遷移批註到上一段' });
        if (nextPid) options.push({ key: 'toNext', label: '遷移批註到下一段' });
        options.push({ key: 'keepOrphan', label: '保留批註（段落移至文末）' });
        options.push({ key: 'cancel', label: '取消' });

        const choice = await new Promise(resolve => {
            dialog.select({
                title: '此段落含有老師批註',
                message: '請選擇處理方式：',
                options: options.map(o => ({ value: o.key, label: o.label })),
                onSelect: (v) => resolve(v)
            });
        });

        if (choice === 'cancel') return;

        if ((choice === 'toPrev' && prevPid) || (choice === 'toNext' && nextPid)) {
            // 遷移批註到相鄰段
            try {
                const target = choice === 'toPrev' ? prevPid : nextPid;
                const AppState = getAppState();
                const { error: merr } = await AppState.supabase
                    .from('annotations')
                    .update({ paragraph_id: target, is_orphaned: false })
                    .eq('paragraph_id', sourcePid);
                if (merr) throw merr;
                toast.success('批註已遷移');
            } catch (e) {
                toast.error('批註遷移失敗：' + (e?.message || '未知錯誤'));
                return;
            }
            // 後續按普通刪除處理
        }
        // keepOrphan：不需額外操作，保存時會自動將未使用段落標記為孤立
    }

    // 從 DOM 中移除
    if (blockEl) blockEl.remove();

    // 從狀態中移除
    const index = argument.paragraphs.findIndex(para => para.id === paragraphId);
    if (index !== -1) {
        const paragraph = argument.paragraphs[index];
        if (paragraph.editor) paragraph.editor.destroy();
        argument.paragraphs.splice(index, 1);
    }

    // 重新編號段落並更新字數
    renumberParagraphs(argumentId);
    updateWordCount();
    console.log(`✅ 已刪除段落: ${paragraphId}`);
}

/**
 * 重新編號段落
 */
function renumberParagraphs(argumentId) {
    const argument = EditorState.arguments.find(arg => arg.id === argumentId);
    if (!argument) return;
    
    argument.paragraphs.forEach((paragraph, index) => {
        paragraph.index = index + 1;
        
        const label = document.querySelector(`#${paragraph.id} .text-sm.font-medium`);
        if (label) {
            label.textContent = `段落 ${paragraph.index}`;
        }
    });
}

// ================================
// 內容變化處理
// ================================

/**
 * 處理編輯器內容變化
 */
function handleEditorChange(data) {
    // 在內容恢復期間暫停變更處理，避免觸發自動保存與狀態降級
    if (window.__RESTORING_ESSAY_CONTENT) {
        return;
    }
    // 更新字數統計
    updateWordCount();
    
    // 已移除提交流程：不再自動降級狀態
    
    // 觸發自動保存（3秒防抖）
    if (EditorState.saveTimer) {
        clearTimeout(EditorState.saveTimer);
    }
    
    EditorState.saveTimer = setTimeout(() => {
        autoSave();
    }, 3000);
}

// 已移除：自動降級與重新提交提示相關邏輯

/**
 * 更新總字數統計
 */
function updateWordCount() {
    const text = EditorState.introEditor?.getText?.() || '';
    const count = countWithoutPunct(text);
    EditorState.totalWordCount = count;
    const wordCountDisplay = document.getElementById('word-count-display');
    if (wordCountDisplay) wordCountDisplay.textContent = `${count} 字`;
}

// ================================
// 自動保存
// ================================

/**
 * 自動保存論文內容
 */
async function autoSave() {
    // 防禦性檢查 - 在使用時檢查
    const AppState = getAppState();
    if (!AppState) {
        console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
        return;
    }
    
    if (!AppState.supabase || !AppState.currentUser) {
        console.log('⏸️ 跳過自動保存（未登錄）');
        return;
    }
    
    console.log('💾 開始自動保存...');
    
    try {
        // 顯示保存中狀態
        updateSaveStatus('saving');
        
        // 收集所有內容
        const essayData = {
            title: document.getElementById('essay-title')?.value || '',
            subtitle: document.getElementById('essay-subtitle')?.value || '',
            introduction: EditorState.introEditor ? EditorState.introEditor.getHTML() : '',
            arguments: EditorState.arguments.map(arg => ({
                title: document.getElementById(`${arg.id}-title`)?.value || '',
                paragraphs: arg.paragraphs.map(para => {
                    const el = document.getElementById(para.id);
                    const uid = el?.dataset?.clientUid || para.clientUid || generateClientUid();
                    if (el && !el.dataset.clientUid) el.dataset.clientUid = uid;
                    return {
                        uid,
                        content: para.editor ? para.editor.getHTML() : ''
                    };
                })
            })),
            conclusion: EditorState.conclusionEditor ? EditorState.conclusionEditor.getHTML() : '',
            // 為引言/結論補上 client uid，便於還原
            intro_uid: document.getElementById('intro')?.dataset?.clientUid || null,
            conclusion_uid: document.getElementById('conclusion')?.dataset?.clientUid || null,
            word_count: EditorState.totalWordCount,
            last_saved_at: new Date().toISOString()
        };
        
        // 1. 保存到 localStorage（離線備份）
        localStorage.setItem('essay-draft', JSON.stringify(essayData));
        
        // 2. 保存到 Supabase 數據庫
        try {
            await saveEssayToSupabase(essayData);
            console.log('✅ 自動保存完成（Supabase + localStorage）');
            updateSaveStatus('saved');
        } catch (dbError) {
            console.warn('⚠️ Supabase 保存失敗，已保存到 localStorage:', dbError.message);
            updateSaveStatus('saved'); // 至少 localStorage 保存成功了
        }
        
    } catch (error) {
        console.error('❌ 自動保存失敗:', error);
        updateSaveStatus('error');
    }
}

/**
 * 更新保存狀態指示器
 */
function updateSaveStatus(status) {
    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;
    
    const icon = statusEl.querySelector('i');
    const text = statusEl.querySelector('span');
    
    switch (status) {
        case 'saving':
            icon.className = 'fas fa-spinner fa-spin text-stone-500';
            text.textContent = '保存中...';
            text.className = 'text-gray-600';
            break;
            
        case 'saved':
            icon.className = 'fas fa-check-circle text-emerald-600';
            text.textContent = '已保存';
            text.className = 'text-gray-600';
            break;
            
        case 'error':
            icon.className = 'fas fa-exclamation-circle text-rose-600';
            text.textContent = '保存失敗';
            text.className = 'text-rose-700';
            break;
    }
}

// ================================
// AI 反饋請求
// ================================

/**
 * 請求段落 AI 反饋
 */
async function requestParagraphFeedback(paragraphId, paragraphType) {
    console.log('🤖 請求段落 AI 反饋:', paragraphId);
    
    // 動態導入 AI 反饋模組
    try {
        const { requestAIFeedback } = await import('../ai/feedback-requester.js');
        
        // 獲取段落內容
        let content = '';
        let type = paragraphType;
        
        // 根據段落 ID 判斷類型和獲取內容
        if (paragraphId === 'intro') {
            content = EditorState.introEditor?.getHTML() || '';
            type = 'introduction';
        } else if (paragraphId === 'conclusion') {
            content = EditorState.conclusionEditor?.getHTML() || '';
            type = 'conclusion';
        } else {
            // 從分論點中查找段落
            for (const arg of EditorState.arguments) {
                const para = arg.paragraphs.find(p => p.id === paragraphId);
                if (para) {
                    content = para.editor?.getHTML() || '';
                    type = 'body';
                    break;
                }
            }
        }
        
        if (!content || content.trim() === '') {
            toast.warning('段落內容為空，請先撰寫內容再請求反饋');
            return;
        }
        
        // 防禦性檢查 - 在使用時檢查
        const AppState = getAppState();
        if (!AppState) {
            console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
            return;
        }
        
        // 調用 AI 反饋 API（傳遞格式規範）
        await requestAIFeedback(paragraphId, content, type, AppState.currentFormatSpec);
        
    } catch (error) {
        console.error('❌ 請求 AI 反饋失敗:', error);
        toast.error(`獲取 AI 反饋失敗：${error.message}`);
    }
}

// ================================
// 導出
// ================================

export { EditorState, requestParagraphFeedback };
