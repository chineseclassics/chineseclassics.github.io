/**
 * 時文寶鑑 - 學生論文編輯器
 * 
 * 功能：
 * - 單一 ProseMirror 編輯器（TipTap/PM）
 * - 自動保存 + 字數統計（不含標點）
 * - PM decorations 顯示批註
 */

import { PMEditor } from '../editor/tiptap-editor.js';
import { toggleMark, Plugin, PluginKey, Decoration, DecorationSet } from '../editor/pm-vendor.js';
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
    // 解析字數區間目標（若有）
    try {
      const layout = data?.editor_layout_json || null;
      const json = typeof layout === 'string' ? JSON.parse(layout) : layout;
      const targets = json?.targets || null;
      const primaryMetric = json?.primaryMetric || null;
      if (targets && (targets.zh_chars || targets.en_words)) {
        window.__wordTargets = { targets, primaryMetric };
      } else {
        window.__wordTargets = null;
      }
    } catch (_) { window.__wordTargets = null; }
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
    // 更新字數統計與提示
    try { renderCountersAndTargets(); } catch (_) {}
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

    // 先取得錨點（按正文順序）
    const anchors = (pmRes.data || []).map(a => ({
      id: a.id,
      text_start: a.text_start ?? null,
      text_end: a.text_end ?? null,
      text_quote: a.text_quote || null,
      text_prefix: a.text_prefix || null,
      text_suffix: a.text_suffix || null
    }));
    const ids = anchors.map(a => a.id).filter(Boolean);

    let contents = [];
    let comments = [];
    let userMap = new Map();
    if (ids.length > 0) {
      // 讀取內容與作者 ID
      const { data: annRows } = await AppState.supabase
        .from('annotations')
        .select('id, content, created_at, teacher_id, student_id')
        .in('id', ids);
      contents = annRows || [];

      // 批量讀取回覆
      const { data: commentRows } = await AppState.supabase
        .from('annotation_comments')
        .select('id, annotation_id, user_id, content, created_at')
        .in('annotation_id', ids);
      comments = commentRows || [];

      // 準備用戶資訊映射（作者 + 回覆者）
      const userIds = new Set();
      annRows?.forEach(r => { if (r.teacher_id) userIds.add(r.teacher_id); if (r.student_id) userIds.add(r.student_id); });
      commentRows?.forEach(r => { if (r.user_id) userIds.add(r.user_id); });
      if (userIds.size > 0) {
        const { data: users } = await AppState.supabase
          .from('users')
          .select('id, display_name, email, role')
          .in('id', Array.from(userIds));
        userMap = new Map((users || []).map(u => [u.id, u]));
      }
    }

    const contentMap = new Map(contents.map(r => [r.id, r]));
    const list = anchors.map(a => {
      const base = Object.assign({}, a, contentMap.get(a.id) || {});
      const authorId = base.teacher_id || base.student_id || null;
      const authorInfo = authorId ? userMap.get(authorId) : null;
      const replies = (comments || []).filter(c => c.annotation_id === base.id).map(c => {
        const u = c.user_id ? userMap.get(c.user_id) : null;
        return Object.assign({}, c, {
          userDisplayName: u?.display_name || null,
          userRole: u?.role || null
        });
      });
      return Object.assign(base, {
        authorId,
        authorDisplayName: authorInfo?.display_name || null,
        authorRole: authorInfo?.role || null,
        // 學生或老師本人可以刪除自己的批註（由 RLS 再次保護）
        canDelete: !!(authorId && String(authorId) === String(AppState?.currentUser?.id)),
        replies
      });
    });

    // 去重
    const map = new Map();
    for (const x of list) if (x?.id) map.set(x.id, x);
    window.__pmAnnStore = Array.from(map.values()); // 供 PM decorations 使用
    window.__pmAnnStoreWithContent = window.__pmAnnStore; // 供疊加層取用

    const view = EditorState.introEditor?.view;
    if (view) view.dispatch(view.state.tr.setMeta('annotations:update', true));
    // 更新右側疊加層
    try { window.__pmOverlay?.update?.(); } catch (_) {}

    // Realtime：建立一次性監聽（annotations + annotation_comments）
    try {
      if (!window.__pmAnnChannel) {
        window.__pmAnnChannel = AppState.supabase
          .channel('pm-ann-student')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, () => {
            refreshPMAnnotationsStudent();
          })
          .subscribe();
      }
      if (!window.__pmAnnCommentChannel) {
        window.__pmAnnCommentChannel = AppState.supabase
          .channel('pm-ann-comments-student')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'annotation_comments' }, () => {
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

  // 顯示簡易格式工具列（B/I/U）
  try { ensureFormatToolbar(EditorState.introEditor); } catch (_) {}

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

    // 左側「賈雨村說」欄：移除舊的「雨村評點（當前段）」按鈕，改為提示資訊
    try {
      const btn = document.getElementById('sidebar-yucun-btn');
      if (btn) {
        const tip = document.createElement('div');
        tip.className = 'yucun-tip';
        tip.innerHTML = '<i class="fas fa-lightbulb"></i> 提示：點擊段落左側的毛筆圓形按鈕，請「賈雨村說」為該段落提供反饋。';
        btn.replaceWith(tip);
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
        onClick: (id) => focusStudentAnnDecoration(id)
      });
      EditorState.introEditor.addPlugins([plugin]);
      // 右側批註疊加層（學生端只讀卡片）
      try {
        const root = document.getElementById('ann-sidebar') || document.getElementById('essay-editor')?.parentElement || document.querySelector('#student-dashboard .main-content-area') || document.body;
        const view = EditorState.introEditor?.view;
        if (root && view) {
          const { data: userData } = await getAppState().supabase.auth.getUser();
          window.__pmOverlay = new PMAnnotationOverlay({
            root,
            view,
            getAnnotations: () => Array.isArray(window.__pmAnnStoreWithContent) ? window.__pmAnnStoreWithContent : (Array.isArray(window.__pmAnnStore) ? window.__pmAnnStore : []),
            onClick: (id) => focusStudentAnnDecoration(id),
            supabase: getAppState().supabase,
            currentUserId: userData?.user?.id || getAppState()?.currentUser?.id || null,
            onDataChanged: async () => { await refreshPMAnnotationsStudent(); }
          });
          window.__pmOverlay.mount();
        }
      } catch (_) {}
      await refreshPMAnnotationsStudent();
      window.__pmAnnTimer = setInterval(refreshPMAnnotationsStudent, 5000);
    } catch (e) { console.warn('學生端批註插件掛載失敗:', e); }

    // 學生端開放新增批註：就地輸入（與老師端一致）
    try { setupStudentSelectionComposer(); } catch (_) {}
    try { setupStudentSelectionFab(); } catch (_) {}

    // 段落左側「雨村」毛筆圖示（以 ProseMirror widget decorations 常駐在段落內，CSS 垂直置中）
    try {
      const brushPlugin = createYucunBrushPlugin({
        onClick: async (pos) => {
          try {
            const view = EditorState.introEditor?.view;
            if (!view || typeof pos !== 'number') return;
            const html = getCurrentParagraphHTML(view, pos) || '';
            const plain = html.replace(/<[^>]*>/g, '').trim();
            if (!plain) { toast.warning('當前段落為空'); return; }
            const type = 'body'; // 保守策略：不自動標記結論，避免誤判
            const { requestAIFeedback } = await import('../ai/feedback-requester.js');
            await requestAIFeedback('pm-current', html, type, getAppState().currentFormatSpec);
          } catch (e) { console.warn('雨村評點啟動失敗:', e); toast.error('雨村評點失敗'); }
        }
      });
      EditorState.introEditor.addPlugins([brushPlugin]);
    } catch (_) {}

    // 完成初始化
    EditorState.initialized = true;
    EditorState.isInitializing = false;
  // 初次渲染字數與建議區間（避免等待首次自動保存）
  try { renderCountersAndTargets(); } catch (_) {}
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

  // 全局工具列（新增分論點）
  // 已撤回：段落懸停內聯工具列（上/下方插入、雨村評點）
  ensureGlobalToolbar();

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
      try { view.dispatch(view.state.tr.setMeta('annotations:active', id)); } catch (_) {}
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulse(target);
    }
    try { window.__pmOverlay?.setActive?.(id); } catch (_) {}
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

  const root = document.getElementById('ann-sidebar') || document.getElementById('essay-editor')?.parentElement || document.querySelector('#student-dashboard .main-content-area') || document.body;
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

  const onScroll = () => { if (composer.style.display !== 'none') update(); };
  window.addEventListener('scroll', onScroll, { passive: true });

  // 點擊非批註/非卡片區域時，清除 active 狀態
  window.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.closest?.('.pm-annotation') && !t.closest?.('.pm-ann-card')) {
      try { view.dispatch(view.state.tr.setMeta('annotations:active', null)); } catch (_) {}
      try { window.__pmOverlay?.setActive?.('__none__'); } catch (_) {}
    }
  }, true);

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
  window.__pmShowComposerForSelection = () => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect) return;
      showAt(rect);
    } catch (_) {}
  };
}

// 浮動「添加批註」按鈕（學生端）
function setupStudentSelectionFab() {
  const view = EditorState.introEditor?.view;
  if (!view) return;
  if (window.__pmAnnFab) return;

  const fab = document.createElement('button');
  fab.id = 'pm-add-ann-fab';
  fab.className = 'btn-annotation-add';
  fab.style.position = 'absolute';
  fab.style.zIndex = '1100';
  fab.style.display = 'none';
  fab.style.padding = '6px 10px';
  fab.style.borderRadius = '8px';
  fab.innerHTML = '<i class="fas fa-comment-medical"></i><span style="margin-left:6px">添加批註</span>';
  document.body.appendChild(fab);

  const hide = () => { fab.style.display = 'none'; };
  const showAt = (rect) => {
    const top = window.scrollY + rect.top - 40;
    const left = window.scrollX + rect.right + 8;
    fab.style.top = `${Math.max(8, top)}px`;
    fab.style.left = `${Math.max(8, left)}px`;
    fab.style.display = 'inline-flex';
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
  const onScroll = () => { if (fab.style.display !== 'none') update(); };

  view.dom.addEventListener('mouseup', onMouseUp);
  view.dom.addEventListener('keyup', onKeyUp);
  window.addEventListener('scroll', onScroll, { passive: true });

  fab.addEventListener('click', () => {
    hide();
    window.__pmShowComposerForSelection?.();
  });

  window.__pmAnnFab = fab;
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

// ================================
// 簡易格式工具列（B/I/U）
// ================================

function ensureFormatToolbar(pm) {
  // 單行頂部工具列：左（B/I/U）｜中（字數統計）｜右（保存狀態 · 寫作中）
  let bar = document.getElementById('pm-topbar');
  const host = document.getElementById('essay-editor') || document.getElementById('intro-editor');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'pm-topbar';
    bar.className = 'pm-topbar';
    bar.innerHTML = `
      <div class="pm-topbar-left pm-format-toolbar" role="toolbar" aria-label="文字格式">
        <button type="button" class="fmt-btn" title="加粗" data-mark="bold" aria-label="加粗"><i class="fas fa-bold"></i></button>
        <button type="button" class="fmt-btn" title="斜體" data-mark="italic" aria-label="斜體"><i class="fas fa-italic"></i></button>
        <button type="button" class="fmt-btn" title="底線" data-mark="underline" aria-label="底線"><i class="fas fa-underline"></i></button>
      </div>
      <div class="pm-topbar-center" id="topbar-word-count-display" aria-live="polite"></div>
      <div class="pm-topbar-right">
        <span id="topbar-save-status" class="save-status">
          <i class="fas fa-check-circle text-emerald-600"></i>
          <span class="text-gray-600">已保存</span>
        </span>
        <span class="pm-topbar-dot" aria-hidden="true">·</span>
        <span id="topbar-essay-status-text" class="text-gray-600">寫作中</span>
      </div>`;
    if (host && host.parentElement) host.parentElement.insertBefore(bar, host);
  }

  if (bar.dataset.bound === '1') return; // 避免重複綁定

  const btnBold = bar.querySelector('[data-mark="bold"]');
  const btnItalic = bar.querySelector('[data-mark="italic"]');
  const btnUnderline = bar.querySelector('[data-mark="underline"]');

  const getType = (mark) => {
    const schema = pm?.view?.state?.schema;
    if (!schema) return null;
    if (mark === 'bold') return schema.marks.strong;
    if (mark === 'italic') return schema.marks.em;
    if (mark === 'underline') return schema.marks.underline;
    return null;
  };

  const apply = (mark) => {
    try {
      const type = getType(mark);
      if (!type) return;
      const { state, dispatch } = pm.view;
      toggleMark(type)(state, dispatch);
      pm.view.focus();
      updateActive();
    } catch (_) {}
  };

  const isActive = (type) => {
    try {
      const { state } = pm.view;
      const { from, to, empty } = state.selection;
      if (empty) {
        const stored = state.storedMarks || state.selection.$from.marks();
        return !!type.isInSet(stored);
      }
      return state.doc.rangeHasMark(from, to, type);
    } catch (_) { return false; }
  };

  const updateActive = () => {
    try {
      const marks = pm.view.state.schema.marks;
      btnBold?.classList.toggle('active', isActive(marks.strong));
      btnItalic?.classList.toggle('active', isActive(marks.em));
      btnUnderline?.classList.toggle('active', isActive(marks.underline));
    } catch (_) {}
  };

  btnBold?.addEventListener('click', () => apply('bold'));
  btnItalic?.addEventListener('click', () => apply('italic'));
  btnUnderline?.addEventListener('click', () => apply('underline'));

  // 依編輯行為更新按鈕 active 狀態
  try {
    pm.view.dom.addEventListener('keyup', updateActive);
    pm.view.dom.addEventListener('mouseup', updateActive);
  } catch (_) {}
  updateActive();

  bar.dataset.bound = '1';
}

// 已撤回：段落懸停內聯工具列（上/下方插入段落、雨村評點）

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

// 依指定文檔位置推斷段落類型（首段=引言，末段=結論，其餘=正文）
function getParagraphTypeByPos(view, pos) {
  try {
    const { state } = view;
    const total = state.doc.content.childCount;
    const $pos = state.doc.resolve(pos);
    const index = $pos.index($pos.depth);
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
// PM 插件：段落內「賈雨村說」毛筆裝飾（widget）
// 以 Decoration.widget 固定在 paragraph 開頭（pos+1），交由 CSS 絕對定位垂直置中
// ================================

function createYucunBrushPlugin(opts = {}) {
  const { onClick } = opts;
  const key = new PluginKey('yucun-brush');

  const createBrushEl = (pos) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pm-yucun-btn';
    btn.setAttribute('aria-label', '賈雨村說：針對此段評點');
    btn.innerHTML = '<i class="fas fa-brush"></i>';
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); try { onClick?.(pos); } catch (_) {} });
    return btn;
  };

  const buildDecos = (doc) => {
    const decos = [];
    doc.descendants((node, pos) => {
      if (node.type && node.type.name === 'paragraph') {
        // 將 widget 放在段落內容起始（pos+1）
        decos.push(Decoration.widget(pos + 1, () => createBrushEl(pos + 1), { side: -1, ignoreSelection: true }));
      }
    });
    return decos;
  };

  return new Plugin({
    key,
    state: {
      init: (_cfg, state) => DecorationSet.create(state.doc, buildDecos(state.doc)),
      apply: (tr, set) => {
        if (tr.docChanged || tr.getMeta(key) === 'refresh') {
          return DecorationSet.create(tr.doc, buildDecos(tr.doc));
        }
        return set.map(tr.mapping, tr.doc);
      }
    },
    props: {
      decorations(state) { return this.getState(state); }
    }
  });
}

// ================================
// 左側段落「雨村」毛筆圖示（學生端）
// ================================

function setupParagraphYucunBrush(pm) {
  const view = pm?.view;
  if (!view) return;
  if (window.__pmYucunBtns) return; // 避免重複掛載

  const btnMap = new WeakMap(); // Element<p> -> Button
  window.__pmYucunBtns = btnMap;

  // 觀察每個段落與 viewport 的交叉變化，以即時微調各自位置（避免整體位移）
  let io = null;
  try {
    io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const btn = btnMap.get(el);
        if (btn) positionBtnAtElement(btn, el);
      }
    }, { root: null, rootMargin: '0px', threshold: [0, 0.5, 1] });
    window.__pmYucunIO = io;
  } catch (_) {}

  const createBtn = () => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pm-yucun-btn';
    b.setAttribute('aria-label', '賈雨村說：針對此段評點');
    // 使用 Font Awesome 的毛筆圖示（更貼近中國毛筆語義）
    b.innerHTML = '<i class="fas fa-brush"></i>';
    Object.assign(b.style, {
      position: 'absolute',
      width: '26px', height: '26px',
      borderRadius: '9999px',
      background: 'linear-gradient(135deg, #111827, #1f2937)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
      zIndex: '60',
      transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
      opacity: '0.92',
      border: '1px solid rgba(255,255,255,0.08)'
    });
    b.addEventListener('mouseenter', () => {
      b.style.transform = 'scale(1.06)';
      b.style.boxShadow = '0 10px 24px rgba(0,0,0,0.18)';
    });
    b.addEventListener('mouseleave', () => {
      b.style.transform = 'scale(1)';
      b.style.boxShadow = '0 6px 18px rgba(0,0,0,0.14)';
    });
    document.body.appendChild(b);
    return b;
  };

  const getParagraphs = () => Array.from(view.dom.querySelectorAll('p'));

  const getIndexInfo = (elList, el) => {
    const nonEmpty = elList.filter(e => (e.textContent || '').trim().length > 0);
    const idx = elList.indexOf(el);
    const firstNonEmpty = nonEmpty.length ? elList.indexOf(nonEmpty[0]) : -1;
    return { idx, firstNonEmpty };
  };

  const getTypeForElement = (el) => {
    try {
      const list = getParagraphs();
      const { idx, firstNonEmpty } = getIndexInfo(list, el);
      if (idx === firstNonEmpty) return 'introduction';
      return 'body'; // 不再將末段自動視為結論，避免誤判
    } catch (_) { return 'body'; }
  };

  const getPosForElement = (el) => {
    try {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + 2; // 避免位於邊界
      const cy = rect.top + rect.height / 2;
      const info = view.posAtCoords({ left: cx, top: cy });
      return info?.pos ?? null;
    } catch (_) { return null; }
  };

  const positionBtnAtElement = (btn, el) => {
    try {
      const rect = el.getBoundingClientRect();
      const top = window.scrollY + rect.top + rect.height / 2 - 13; // 26/2
      const left = Math.max(8, window.scrollX + rect.left - 34);
      btn.style.top = `${Math.round(top)}px`;
      btn.style.left = `${Math.round(left)}px`;
    } catch (_) {}
  };

  const updateAllPositions = () => {
    const list = getParagraphs();
    for (const el of list) {
      const btn = btnMap.get(el);
      if (btn) positionBtnAtElement(btn, el);
    }
  };

  // 在短時間內以 rAF 平滑持續重算，避免行高變動造成的延遲
  let __rafTickerId = null;
  let __rafUntil = 0;
  const __tickReposition = (now) => {
    if (now < __rafUntil) {
      updateAllPositions();
      __rafTickerId = requestAnimationFrame(__tickReposition);
    } else {
      __rafTickerId = null;
    }
  };
  const scheduleSmoothReposition = (ms = 600) => {
    try {
      __rafUntil = performance.now() + ms;
      if (!__rafTickerId) __rafTickerId = requestAnimationFrame(__tickReposition);
    } catch (_) {}
  };

  const syncButtons = () => {
    const list = getParagraphs();
    const seen = new Set();
    for (const el of list) {
      let btn = btnMap.get(el);
      if (!btn) {
        btn = createBtn();
        btn.addEventListener('click', async () => {
          try {
            const pos = getPosForElement(el);
            const viewNow = pm?.view;
            if (!viewNow || pos == null) return;
            const html = getCurrentParagraphHTML(viewNow, pos) || '';
            const plain = html.replace(/<[^>]*>/g, '').trim();
            if (!plain) { toast.warning('當前段落為空'); return; }
            const type = getTypeForElement(el);
            const { requestAIFeedback } = await import('../ai/feedback-requester.js');
            await requestAIFeedback('pm-current', html, type, getAppState().currentFormatSpec);
            btn.animate([
              { transform: 'scale(1.0)' },
              { transform: 'scale(0.92)' },
              { transform: 'scale(1.0)' }
            ], { duration: 160, easing: 'ease-out' });
          } catch (e) {
            console.warn('雨村評點啟動失敗:', e);
            try { toast.error('雨村評點失敗'); } catch (_) {}
          }
        });
        btnMap.set(el, btn);
      }
      positionBtnAtElement(btn, el);
      try { io?.observe?.(el); } catch (_) {}
      seen.add(btn);
    }

    // 清理已移除段落的按鈕
    for (const [el, btn] of btnMap) {
      if (!list.includes(el)) {
        try { btn.remove(); } catch (_) {}
        btnMap.delete(el);
        try { io?.unobserve?.(el); } catch (_) {}
      }
    }
  };

  // 首次同步
  syncButtons();
  updateAllPositions();

  // 監聽 DOM 變化以重新同步
  try {
    const mo = new MutationObserver(() => {
      // 批次緩衝，避免過於頻繁
      if (window.__pmYucunSyncRaf) cancelAnimationFrame(window.__pmYucunSyncRaf);
      window.__pmYucunSyncRaf = requestAnimationFrame(() => {
        syncButtons();
        updateAllPositions();
        scheduleSmoothReposition(800);
      });
    });
    mo.observe(view.dom, { childList: true, subtree: true, characterData: true });
    window.__pmYucunMO = mo;
  } catch (_) {}

  // 滾動/尺寸變更時重新定位
  const onScrollOrResize = () => {
    if (window.__pmYucunPosRaf) cancelAnimationFrame(window.__pmYucunPosRaf);
    window.__pmYucunPosRaf = requestAnimationFrame(updateAllPositions);
    scheduleSmoothReposition(300);
  };
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);

  // 觀察編輯器容器尺寸改變（內容撰寫會引發高度變動）
  try {
    const roEl = view.dom.querySelector('.ProseMirror') || view.dom;
    const ro = new ResizeObserver(() => {
      if (window.__pmYucunPosRaf) cancelAnimationFrame(window.__pmYucunPosRaf);
      window.__pmYucunPosRaf = requestAnimationFrame(updateAllPositions);
      scheduleSmoothReposition(800);
    });
    ro.observe(roEl);
    window.__pmYucunRO = ro;
  } catch (_) {}

  // 輸入/鍵盤事件後更新（兼容某些瀏覽器下 Mutation/Resize 未即時觸發的情況）
  const onEdit = () => {
    if (window.__pmYucunPosRaf) cancelAnimationFrame(window.__pmYucunPosRaf);
    window.__pmYucunPosRaf = requestAnimationFrame(updateAllPositions);
    scheduleSmoothReposition(800);
  };
  view.dom.addEventListener('input', onEdit);
  view.dom.addEventListener('keyup', onEdit);

  // 最後兜底：在焦點期間以低頻率輪詢位置（性能安全）
  try {
    let pollId = null;
    const startPoll = () => { if (!pollId) pollId = setInterval(updateAllPositions, 500); };
    const stopPoll = () => { if (pollId) { clearInterval(pollId); pollId = null; } };
    view.dom.addEventListener('focusin', startPoll);
    view.dom.addEventListener('focusout', stopPoll);
    // 若當前已聚焦則立即啟動
    if (document.activeElement && view.dom.contains(document.activeElement)) startPoll();
    window.__pmYucunPollStop = stopPoll;
  } catch (_) {}
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
    try { renderCountersAndTargets(); } catch (_) {}
}

// ================================
// 統計與建議區間渲染
// ================================

function computeCounters() {
  const editor = EditorState.introEditor;
  const text = editor?.getText?.() || '';
  const zhChars = (text.match(/[\u4E00-\u9FFF]/g) || []).length; // 只計漢字
  const enWords = (text.match(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g) || []).length; // 單詞（含'與-連字）
  let paragraphs = 0;
  try { paragraphs = editor?.getParagraphCount?.() || 0; } catch (_) {}
  return { zh_chars: zhChars, en_words: enWords, paragraphs };
}

function renderCountersAndTargets() {
  const counters = computeCounters();
  EditorState.totalWordCount = counters.zh_chars; // 保持舊語義：中文字數
  const el = document.getElementById('word-count-display');
  const topbarEl = document.getElementById('topbar-word-count-display');
  // 組裝徽章 HTML（桌面 + 行動端共用）
  const chip = (label, value) => `<span class="wc-chip"><span class="wc-chip-label">${label}</span><span class="wc-chip-val">${value}</span></span>`;
  const parts = [
    chip('中', counters.zh_chars),
    chip('英', counters.en_words),
    chip('段', counters.paragraphs)
  ];

  // 建議區間與狀態徽章
  let targetHtml = '';
  let mobileSummary = '';
  const cfg = window.__wordTargets;
  if (cfg && cfg.primaryMetric && cfg.targets && cfg.targets[cfg.primaryMetric]) {
    const t = cfg.targets[cfg.primaryMetric] || {};
    const cur = counters[cfg.primaryMetric] || 0;
    const hasMin = typeof t.min === 'number';
    const hasMax = typeof t.max === 'number';
    let rangeText = '';
    if (hasMin && hasMax) rangeText = `${t.min}–${t.max}`;
    else if (hasMin) rangeText = `≥ ${t.min}`;
    else if (hasMax) rangeText = `≤ ${t.max}`;

    let status = null;
    let cls = 'wc-badge-ok';
    if (hasMin && cur < t.min) { status = '未達'; cls = 'wc-badge-warn'; }
    else if (hasMax && cur > t.max) { status = '超出'; cls = 'wc-badge-danger'; }
    else if (hasMin || hasMax) { status = '達標'; cls = 'wc-badge-ok'; }

    const metricLabel = cfg.primaryMetric === 'en_words' ? '英' : '中';
    const badge = status ? `<span class="wc-badge ${cls}">${status}</span>` : '';
    targetHtml = rangeText ? `｜<span class="wc-target">建議 ${metricLabel} ${rangeText}</span> ${badge}` : '';
    mobileSummary = status ? `<span class="wc-badge ${cls}">${status}</span>` : '';
  }

  const html = `${parts.join('｜')}${targetHtml}`;
  if (el) el.innerHTML = html;
  if (topbarEl) topbarEl.innerHTML = html;

  // 行動端收合面板內容與摘要徽章
  ensureMobileWordWidget();
  const mPanel = document.getElementById('mobile-word-count-display');
  if (mPanel) mPanel.innerHTML = html;
  const mSummary = document.getElementById('mobile-wc-summary');
  if (mSummary) mSummary.innerHTML = mobileSummary || `<span class="wc-badge wc-badge-muted">統計</span>`;
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
  const topbarEl = document.getElementById('topbar-save-status');
    
  const icon = statusEl ? statusEl.querySelector('i') : null;
  const text = statusEl ? statusEl.querySelector('span') : null;
  const setTopbar = (cls, txt, textCls) => {
    if (!topbarEl) return;
    const ti = topbarEl.querySelector('i');
    const tt = topbarEl.querySelector('span');
    if (ti) ti.className = cls;
    if (tt) { tt.textContent = txt; tt.className = textCls; }
  };
    
    switch (status) {
        case 'saving':
      if (icon) icon.className = 'fas fa-spinner fa-spin text-stone-500';
      if (text) { text.textContent = '保存中...'; text.className = 'text-gray-600'; }
      setTopbar('fas fa-spinner fa-spin text-stone-500', '保存中...', 'text-gray-600');
            break;
            
        case 'saved':
      if (icon) icon.className = 'fas fa-check-circle text-emerald-600';
      if (text) { text.textContent = '已保存'; text.className = 'text-gray-600'; }
      setTopbar('fas fa-check-circle text-emerald-600', '已保存', 'text-gray-600');
            break;
            
        case 'error':
      if (icon) icon.className = 'fas fa-exclamation-circle text-rose-600';
      if (text) { text.textContent = '保存失敗'; text.className = 'text-rose-700'; }
      setTopbar('fas fa-exclamation-circle text-rose-600', '保存失敗', 'text-rose-700');
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

// ================================
// 行動裝置：字數統計收合元件
// ================================

function ensureMobileWordWidget() {
  if (document.getElementById('mobile-word-widget')) return;
  try {
    const host = document.getElementById('essay-editor')?.closest('.bg-white');
    if (!host) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'mobile-word-widget';
    wrapper.className = 'block lg:hidden px-4 pt-3';
    wrapper.innerHTML = `
      <div class="mobile-wc-box">
        <button id="mobile-wc-toggle" class="mobile-wc-toggle">
          <i class="fas fa-font"></i>
          <span class="ml-2">字數</span>
          <span id="mobile-wc-summary" class="ml-2"></span>
          <i class="fas fa-chevron-down ml-auto"></i>
        </button>
        <div id="mobile-wc-panel" class="mobile-wc-panel hidden">
          <div id="mobile-word-count-display" class="mobile-wc-content"></div>
        </div>
      </div>`;
    host.parentElement?.insertBefore(wrapper, host.nextSibling);
    const btn = wrapper.querySelector('#mobile-wc-toggle');
    const panel = wrapper.querySelector('#mobile-wc-panel');
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('.fa-chevron-down');
      panel.classList.toggle('hidden');
      icon?.classList.toggle('rotate-180');
    });
  } catch (_) {}
}
