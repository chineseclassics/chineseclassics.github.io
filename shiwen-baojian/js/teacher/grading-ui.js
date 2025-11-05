/**
 * 批改功能 UI（精簡版）
 */

import toast from '../ui/toast.js';
import { PMEditor } from '../editor/tiptap-editor.js';
import { createAnnotationPlugin, createAnnotationFromSelection, computeSelectionAnchor, addAnnotationMarkForSelection, replaceAnnotationMarkId, removeAnnotationMarksById } from '../features/pm-annotation-plugin.js';
import { PMAnnotationOverlay } from '../features/pm-annotation-overlay.js';

class GradingUI {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentEssay = null;
    this._annChannel = null;
    this._annPoll = null;
  }

  /**
   * 渲染批改界面
   */
  async render(container, essayId) {
    this.container = container;
    
    try {
      // 加載作業詳情（包含已有的評分）
      const { data: essay, error } = await this.supabase
        .from('essays')
        .select(`
          *,
          student:users!student_id(display_name, email),
          assignment:assignments!assignment_id(title, grading_rubric_json, writing_mode, editor_layout_json),
          paragraphs(*),
          grade:grades(*)
        `)
        .eq('id', essayId)
        .single();

      if (error) {
        console.error('❌ 查詢作業失敗:', error);
        throw error;
      }
      
      console.log('✅ 作業數據加載成功:', essay.title);
      console.log('📊 完整數據結構:', {
        essayTitle: essay.title,
        assignmentTitle: essay.assignment?.title,
        hasRubric: !!essay.assignment?.grading_rubric_json,
        rubricType: typeof essay.assignment?.grading_rubric_json,
        rubric: essay.assignment?.grading_rubric_json,
        hasExistingGrade: !!essay.grade,
        existingGrade: essay.grade
      });

      this.currentEssay = essay;
      this.renderGradingForm();
    } catch (error) {
      console.error('加載作業失敗:', error);
      container.innerHTML = `<div class="error">加載失敗：${this.escapeHtml(error.message || '未知錯誤')}</div>`;
    }
  }

  /**
   * 渲染批改表單
   */
  renderGradingForm() {
    const essay = this.currentEssay;
    const rubric = essay.assignment.grading_rubric_json;
    
    console.log('🎯 開始渲染批改表單');
    console.log('  - 作業:', essay.title);
    console.log('  - 評分標準:', rubric ? '已加載' : '❌ 缺失');
    console.log('  - rubric 對象:', rubric);
    console.log('  - criteria 數量:', rubric?.criteria?.length || 0);
    
    if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
      this.container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle text-rose-600 text-4xl mb-4"></i>
          <p class="text-gray-700 text-lg">此任務缺少評分標準</p>
          <p class="text-gray-500 text-sm mt-2">請返回編輯任務並設置評分標準</p>
          <button id="backBtn" class="btn btn-secondary mt-4">
            <i class="fas fa-arrow-left"></i> 返回
          </button>
        </div>
      `;
      
      // 綁定返回按鈕
      setTimeout(() => {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', {
              detail: { page: 'grading-queue' }
            }));
          });
        }
      }, 100);
      
      return;
    }

    this.container.innerHTML = `
      <div class="grading-container-wrapper">
        <!-- 頂部標題欄 -->
        <div class="grading-top-bar">
          <button id="backBtn" class="btn-back">
            <i class="fas fa-arrow-left"></i>
            <span>返回批改列表</span>
          </button>
          <div class="grading-title-info">
            <h2 class="text-xl font-bold text-gray-800">
              <i class="fas fa-file-alt mr-2"></i>${this.escapeHtml(essay.title || '未命名論文')}
            </h2>
            <div class="text-sm text-gray-600 mt-1">
              <span class="mr-4">
                <i class="fas fa-tasks mr-1"></i>任務：${this.escapeHtml(essay.assignment.title || '—')}
              </span>
              <span class="mr-4" id="grading-word-count">
                <i class="fas fa-font mr-1"></i>字數：${this.computeDisplayWordCount(essay)} 字
              </span>
              <span class="mr-4">
                <i class="fas fa-user mr-1"></i>學生：${this.escapeHtml(essay.student.display_name || '—')}
              </span>
              <span>
                <i class="fas fa-envelope mr-1"></i>${this.escapeHtml(essay.student.email || '—')}
              </span>
            </div>
          </div>
        </div>

        <!-- 三欄佈局（與學生端一致） -->
        <div class="flex flex-col lg:flex-row gap-6 px-4 py-8 layout-3col">
          <!-- 左側：評分邊欄（對齊學生端賈雨村說） -->
          <aside class="hidden lg:block w-72 flex-shrink-0 sticky top-20 self-start">
            <div>
              <!-- AI 評分建議區域 -->
              <div class="grading-sidebar-section ai-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <i class="fas fa-robot mr-2"></i>AI 評分建議
                  </h3>
                </div>
                
                <!-- 將獲取按鈕移至標題下方（內容區頂部） -->
                <div id="aiSectionContent" class="section-content">
                  <div id="aiGetSuggestionRow" class="ai-get-row" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:8px 0;">
                    <button id="getAISuggestionBtn" class="btn-ai-suggest">
                      <i class="fas fa-magic"></i>
                      獲取建議
                    </button>
                  </div>

                  <div id="aiLoadingState" class="hidden ai-loading">
                    <div class="spinner"></div>
                    <p class="loading-text">AI 正在分析論文...</p>
                    <p class="loading-hint">預計需要 5-15 秒</p>
                  </div>

                  <div id="aiSuggestionResults" class="hidden ai-results">
                    <!-- 結果將動態生成 -->
                  </div>
                </div>
              </div>

              <!-- 老師評分區域 -->
              <div class="grading-sidebar-section teacher-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <i class="fas fa-clipboard-check mr-2"></i>老師最終評分
                  </h3>
                </div>
                
                <div class="section-content">
                  <form id="gradingForm">
                    ${(() => {
                      // 提取已有的評分（如果存在）
                      const existingGrade = Array.isArray(essay.grade) ? essay.grade[0] : essay.grade;
                      
                      console.log('📝 開始渲染評分標準，共', rubric.criteria.length, '個');
                      if (existingGrade) {
                        console.log('📊 找到已有評分:', existingGrade);
                      }
                      
                      const criteriaHTML = rubric.criteria.map((criterion, idx) => {
                        console.log(`  - 標準 ${idx + 1}:`, criterion.code, criterion.name);
                        
                        // 獲取該標準的已有分數
                        const existingScore = existingGrade 
                          ? existingGrade[`criterion_${criterion.code.toLowerCase()}_score`]
                          : null;
                        
                        return this.renderCriterionForm(criterion, existingScore);
                      }).join('');
                      console.log('✅ 評分標準 HTML 生成完成');
                      return criteriaHTML;
                    })()}

                    <div class="form-group">
                      <label class="form-label">總體評語</label>
                      <textarea
                        class="input textarea"  
                        name="comments"
                        rows="4"
                        placeholder="請填寫對學生作業的總體評價和改進建議..."
                        required
                      >${(() => {
                        const existingGrade = Array.isArray(essay.grade) ? essay.grade[0] : essay.grade;
                        return existingGrade?.overall_comment || '';
                      })()}</textarea>
                    </div>

                    <div class="form-actions">
                      <button type="submit" class="btn-submit-grading">
                        <i class="fas fa-check"></i>
                        ${(() => {
                          const existingGrade = Array.isArray(essay.grade) ? essay.grade[0] : essay.grade;
                          return existingGrade ? '更新批改' : '提交批改';
                        })()}
                      </button>
                    </div>
                    ${(() => {
                      const existingGrade = Array.isArray(essay.grade) ? essay.grade[0] : essay.grade;
                      if (existingGrade) {
                        return `
                          <div class="grading-info">
                            <p class="text-sm text-gray-500 mt-2">
                              <i class="fas fa-info-circle"></i>
                              此作業已批改，您可以修改評分並重新提交
                            </p>
                          </div>
                        `;
                      }
                      return '';
                    })()}
                  </form>
                </div>
              </div>
            </div>
          </aside>
          
          <!-- 右側：論文顯示區（與學生端一致） -->
          <div class="flex-1 min-w-0">
            <div class="grading-content-wrapper">
              <div class="main-content-area">
                <!-- 論文內容區域 -->
                <div class="essay-content-section">
                  <div class="section-header">
                    <h3 class="section-title">
                      <i class="fas fa-book-open mr-2"></i>作業內容
                    </h3>
                  </div>
                <div class="essay-viewer" id="essayViewer">
                  <div id="pm-viewer" class="pm-viewer"></div>
                </div>
                </div>
              </div>
              <!-- 批註直接浮動在右側，無容器 -->
            </div>
          </div>
          <!-- 右側：批註側欄（固定寬度，用於承載疊加層與編寫器） -->
          <aside id="ann-sidebar" class="hidden lg:block w-72 relative"></aside>
        </div>
      </div>
    `;
    
    console.log('✅ 批改表單 HTML 已渲染');

    // 等待 DOM 更新後再綁定事件
    setTimeout(async () => {
      console.log('🔗 開始綁定事件...');
      this.bindEvents();
      
      // 渲染只讀 PM viewer
      try {
        const viewer = document.getElementById('pm-viewer');
        if (viewer) {
          try {
            viewer.classList.add('pm-essay');
            const mode = this.currentEssay?.assignment?.writing_mode || 'essay-structured';
            if (mode === 'essay-structured') viewer.classList.add('pm-essay-structured');
            else viewer.classList.remove('pm-essay-structured');
          } catch (_) {}
          const AppState = window.AppState;
          const { data } = await AppState.supabase
            .from('essays')
            .select('content_json')
            .eq('id', this.currentEssay.id)
            .single();
          const raw = data?.content_json;
          let json = null;
          try { json = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { json = null; }
          if (json && json.type) {
            // 內容已載入後，更新頂部字數顯示（以 PM 內容為準）
            try {
              const text = this.extractTextFromPM(json) || '';
              const wc = this.countWithoutPunct(text);
              const wcEl = document.getElementById('grading-word-count');
              if (wcEl) wcEl.innerHTML = `<i class="fas fa-font mr-1"></i>字數：${wc} 字`;
            } catch (_) {}
            this._annStore = [];
            const plugin = createAnnotationPlugin({
              getAnnotations: () => this._annStore,
              onClick: (id) => this.highlightAnnotation?.(id)
            });
            // 引用插件（教師端只讀查看）
            const { getCitationSchemaExtensions, createCitationPlugin } = await import('../features/pm-citations.js');
            const citePlugin = createCitationPlugin();
            this._pmViewer = new PMEditor(viewer, { readOnly: true, initialJSON: json, extraPlugins: [plugin, citePlugin], schemaExt: getCitationSchemaExtensions() });
            // 右側疊加層（與 Google Docs 類似）
            const essaySection = document.getElementById('ann-sidebar') || viewer.closest('.essay-viewer') || viewer.parentElement;
            if (essaySection) {
              const { data: userData } = await this.supabase.auth.getUser();
              this._overlay = new PMAnnotationOverlay({
                root: essaySection,
                view: this._pmViewer.view,
                getAnnotations: () => this._annStoreWithContent || this._annStore || [],
                onClick: (id) => this.highlightAnnotation?.(id),
                onContextMenu: (a, card, ev) => this._handleOverlayContextMenu?.(a, card, ev),
                supabase: this.supabase,
                currentUserId: userData?.user?.id || null,
                onDataChanged: async () => { await this.refreshPMAnnotations(); }
              });
              this._overlay.mount();
              // 與學生端對齊：設置全域引用，供其他模組（例如 composer）調用 setActive
              try { window.__pmOverlay = this._overlay; } catch (_) {}
              this._bindGlobalActiveReset();
            }
            // 啟用「右側就地輸入」編寫器（僅初始化，不自動彈出）+ 浮動添加按鈕
            this.setupSelectionComposer();
            this.setupSelectionFab();
            await this.refreshPMAnnotations();
            this._annPoll = setInterval(() => this.refreshPMAnnotations(), 5000);
            // Realtime：收到變更則刷新一次
            try {
              if (!this._annChannel) {
                this._annChannel = this.supabase
                  .channel('pm-ann-teacher')
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, () => {
                    this.refreshPMAnnotations();
                  })
                  .subscribe();
              }
              if (!this._commentChannel) {
                this._commentChannel = this.supabase
                  .channel('pm-ann-comments-teacher')
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'annotation_comments' }, () => {
                    this.refreshPMAnnotations();
                  })
                  .subscribe();
              }
            } catch (e) { console.warn('教師端 Realtime 初始化失敗:', e); }
          } else {
            // 嚴格模式：不再使用舊渲染後備
            viewer.innerHTML = `<div class="error-state">
              <i class="fas fa-exclamation-triangle text-rose-600 text-3xl"></i>
              <p class="mt-2 text-gray-700">此作業缺少 TipTap 內容（content_json）。請確認學生端已使用新編輯器保存內容。</p>
            </div>`;
          }
        }
      } catch (e) { console.warn('PM viewer 載入失敗:', e); }
      
      // 已切換到 PM 插件統一處理，移除舊 DOM 高亮系統
      
      // 自動加載已保存的 AI 評分建議（如果存在）
      this.loadSavedAISuggestion();
    }, 100);
  }

  async refreshPMAnnotations() {
    try {
      const pmRes = await this.supabase.rpc('get_essay_annotations_pm', { p_essay_id: this.currentEssay.id });
      if (pmRes.error) throw pmRes.error;
      const anchors = (pmRes.data || []).map(a => ({
        id: a.id,
        text_start: a.text_start ?? null,
        text_end: a.text_end ?? null,
        text_quote: a.text_quote || null,
        text_prefix: a.text_prefix || null,
        text_suffix: a.text_suffix || null
      }));
      // 讀取內容以渲染卡片
      const ids = anchors.map(a => a.id).filter(Boolean);
      let contents = [];
      let authors = [];
      let comments = [];
      let userMap = new Map();
      if (ids.length > 0) {
        const { data: annRows } = await this.supabase
          .from('annotations')
          .select('id, content, created_at, teacher_id, student_id')
          .in('id', ids);
        contents = annRows || [];

        // 批量查詢回覆
        const { data: commentRows } = await this.supabase
          .from('annotation_comments')
          .select('id, annotation_id, user_id, content, created_at')
          .in('annotation_id', ids);
        comments = commentRows || [];

        // 準備用戶資訊映射（作者 + 回覆者）
        const userIds = new Set();
        annRows?.forEach(r => { if (r.teacher_id) userIds.add(r.teacher_id); if (r.student_id) userIds.add(r.student_id); });
        commentRows?.forEach(r => { if (r.user_id) userIds.add(r.user_id); });
        if (userIds.size > 0) {
          const { data: users } = await this.supabase
            .from('users')
            .select('id, display_name, email, role')
            .in('id', Array.from(userIds));
          userMap = new Map((users || []).map(u => [u.id, u]));
        }
        authors = annRows || [];
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
          canDelete: !!(authorId && this.supabase?.auth && this._isCurrentUser(authorId)),
          replies
        });
      });

      // 去重：以 id 為鍵，最後一次為準
      const map = new Map();
      for (const x of list) if (x?.id) map.set(x.id, x);
      this._annStore = Array.from(map.values());
      this._annStoreWithContent = this._annStore; // 供疊加層使用
      const view = this._pmViewer?.view;
      if (view) {
        const tr = view.state.tr.setMeta('annotations:update', true);
        view.dispatch(tr);
      }
      // 更新疊加層位置
      try { this._overlay?.update(); } catch (_) {}
    } catch (e) {
      console.warn('刷新批註失敗:', e);
    }
  }

  _isCurrentUser(uid) {
    try { return String(uid) === String(window?.AppState?.currentUser?.id); } catch (_) { return false; }
  }

  /**
   * 建立與管理右側就地輸入的「批註編寫器」
   */
  setupSelectionComposer() {
    const view = this._pmViewer?.view;
    if (!view) return;
    if (this._composer) return; // 只建立一次

    const essaySection = document.getElementById('ann-sidebar') || document.getElementById('pm-viewer')?.closest('.essay-viewer') || document.getElementById('pm-viewer')?.parentElement || document.body;
    const style = window.getComputedStyle(essaySection);
    if (style.position === 'static' || !style.position) essaySection.style.position = 'relative';

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
    essaySection.appendChild(composer);

    const textarea = composer.querySelector('textarea');
    const btnCancel = composer.querySelector('.btn-ghost');
    const btnAdd = composer.querySelector('.btn-primary');

    let composeId = null; // 當前編寫中的臨時標記 id（compose-xxxx）
    const addComposeMarkIfNeeded = () => {
      try {
        if (!view) return;
        const hasSel = (view.state && view.state.selection && !view.state.selection.empty) || !!window.__pmLastSelection;
        if (!hasSel) return;
        if (composeId) return;
        composeId = `compose-${Math.random().toString(36).slice(2,10)}`;
        addAnnotationMarkForSelection(view, composeId);
      } catch (_) {}
    };
    const clearComposeMark = () => {
      try { if (composeId) removeAnnotationMarksById(view, composeId); } catch (_) {}
      composeId = null;
    };
    const hide = () => { composer.style.display = 'none'; textarea.value = ''; clearComposeMark(); };
    const showAt = (rect) => {
      const containerRect = essaySection.getBoundingClientRect();
      const mid = (rect.top + rect.bottom) / 2 - containerRect.top;
      const top = Math.max(8, mid - composer.offsetHeight / 2);
      composer.style.top = `${Math.round(top)}px`;
      composer.style.right = `0px`;
      composer.style.display = 'block';
      addComposeMarkIfNeeded();
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
        // 記錄最近一次有效 PM 選區
        try {
          const pmSel = view.state.selection;
          if (pmSel && !pmSel.empty) {
            window.__pmLastSelection = { from: pmSel.from, to: pmSel.to };
          }
        } catch (_) {}
        showAt(rect);
      } catch (_) { hide(); }
    };

  // 僅在可見時跟隨滾動更新位置
  const onScroll = () => { if (composer.style.display !== 'none') update(); };
  window.addEventListener('scroll', onScroll, { passive: true });

    btnCancel.addEventListener('click', hide);
    btnAdd.addEventListener('click', async () => {
      try {
        if (!view || view.state.selection.empty) { hide(); return; }
        const content = (textarea.value || '').trim();
        if (!content) { textarea.focus(); return; }
        // 1) 樂觀：若已有 compose 標記，先替換為 tmp 標記；否則直接加 tmp 標記
        const tmpId = `tmp-${Math.random().toString(36).slice(2, 10)}`;
        const anchor = computeSelectionAnchor(view, 30);
        if (composeId) {
          replaceAnnotationMarkId(view, composeId, tmpId);
          composeId = null;
        } else {
          addAnnotationMarkForSelection(view, tmpId);
        }
        try {
          const { data: userData } = await this.supabase.auth.getUser();
          const currentUserId = userData?.user?.id || null;
          const optimistic = {
            id: tmpId,
            text_start: anchor?.text_start ?? null,
            text_end: anchor?.text_end ?? null,
            text_quote: anchor?.text_quote || null,
            text_prefix: anchor?.text_prefix || null,
            text_suffix: anchor?.text_suffix || null,
            content,
            authorId: currentUserId,
            authorDisplayName: window?.AppState?.currentUser?.display_name || '我',
            authorRole: 'teacher',
            canDelete: true,
            replies: []
          };
          // 推入本地 store
          const pushStore = (arr, item) => {
            const map = new Map((arr || []).map(x => [x.id, x]));
            map.set(item.id, item);
            return Array.from(map.values());
          };
          this._annStore = pushStore(this._annStore || [], optimistic);
          this._annStoreWithContent = this._annStore;
          // 通知裝飾與疊加層
          try { view.dispatch(view.state.tr.setMeta('annotations:update', true)); } catch (_) {}
          try { requestAnimationFrame(() => this._overlay?.update?.()); } catch (_) {}
          // 設定目前激活卡片為臨時 ID，便於右側卡片對齊高亮位置
          try { window.__pmOverlay?.setActive?.(tmpId); } catch (_) {}
        } catch (_) {}

        // 2) 寫入後端，成功後將臨時 id 替換為真正 id；若失敗則回滾
        let finalId = null;
        try {
          finalId = await createAnnotationFromSelection({ view, supabase: this.supabase, essayId: this.currentEssay.id, content });
          if (finalId) {
            replaceAnnotationMarkId(view, tmpId, String(finalId));
            const swapId = (arr) => (arr || []).map(x => x.id === tmpId ? Object.assign({}, x, { id: String(finalId) }) : x);
            this._annStore = swapId(this._annStore);
            this._annStoreWithContent = this._annStore;
            try { requestAnimationFrame(() => this._overlay?.update?.()); } catch (_) {}
            // 轉正後將激活卡片切換到最終 ID，確保對齊仍指向同一段高亮
            try { window.__pmOverlay?.setActive?.(String(finalId)); } catch (_) {}
          }
        } catch (e) {
          removeAnnotationMarksById(view, tmpId);
          try {
            const rm = (arr) => (arr || []).filter(x => x.id !== tmpId);
            this._annStore = rm(this._annStore);
            this._annStoreWithContent = this._annStore;
          } catch (_) {}
          try { requestAnimationFrame(() => this._overlay?.update?.()); } catch (_) {}
          // 回滾時取消激活，避免殘留錯位
          try { window.__pmOverlay?.setActive?.('__none__'); } catch (_) {}
          throw e;
        }

        // 3) 完成：關閉編寫器，刷新一次（帶回完整資料）
        if (finalId) {
          hide();
          await this.refreshPMAnnotations();
          toast.success('批註已新增');
        }
      } catch (e) {
        console.error('新增批註失敗:', e);
        toast.error('新增批註失敗：' + (e.message || '未知錯誤'));
      }
    });

    this._composer = composer;
    // 對外暴露：以當前選區顯示編寫器
    this._showComposerForSelection = () => {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          if (rect) { showAt(rect); return; }
        }
        // 退回最後一次有效的 PM 選區
        const last = window.__pmLastSelection;
        if (last && Number.isInteger(last.from) && Number.isInteger(last.to) && last.to > last.from) {
          const a = view.coordsAtPos(last.from);
          const b = view.coordsAtPos(last.to);
          if (a && b) {
            const rect = {
              top: Math.min(a.top, b.top),
              bottom: Math.max(a.bottom ?? a.top, b.bottom ?? b.top),
              left: Math.min(a.left, b.left),
              right: Math.max(a.right ?? a.left, b.right ?? b.left)
            };
            showAt(rect);
          }
        }
      } catch (_) {}
    };
  }

  /**
   * 建立與管理選區浮動「添加批註」按鈕（點擊後才打開編寫器）
   */
  setupSelectionFab() {
    const view = this._pmViewer?.view;
    if (!view) return;
    if (this._annFab) return; // 只建立一次

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
      const top = window.scrollY + rect.top - 40; // 上方
      const left = window.scrollX + rect.right + 8; // 右側
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
        // 同步記錄 PM 選區（供點擊按鈕後使用）
        try {
          const pmSel = view.state.selection;
          if (pmSel && !pmSel.empty) {
            window.__pmLastSelection = { from: pmSel.from, to: pmSel.to };
          }
        } catch (_) {}
      } catch (_) { hide(); }
    };

    const onMouseUp = () => setTimeout(update, 0);
    const onKeyUp = () => setTimeout(update, 0);
    const onScroll = () => { if (fab.style.display !== 'none') update(); };
    // 兼容部分瀏覽器/輸入法：監聽全域 selectionchange 以更穩定地偵測選區變化
    const onSelectionChange = () => {
      // 僅在目前選區屬於本編輯器時更新
      try {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const anchorNode = sel.anchorNode;
        const focusNode = sel.focusNode;
        const container = view.dom;
        if (container && container.contains(anchorNode) && container.contains(focusNode)) {
          // 使用微延遲等待 DOM 佈局穩定
          setTimeout(update, 0);
        }
      } catch (_) {}
    };

    view.dom.addEventListener('mouseup', onMouseUp);
    view.dom.addEventListener('keyup', onKeyUp);
    window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('selectionchange', onSelectionChange);

    fab.addEventListener('click', () => {
      hide();
      this._showComposerForSelection?.();
    });

    this._annFab = fab;
  }

  /**
   * 由 PM 裝飾點擊觸發或外部調用：視圖內高亮並滾動對齊
   */
  highlightAnnotation(annotationId) {
    try {
      const view = this._pmViewer?.view;
      if (!view) return;
      this._currentAnnId = annotationId;
      try { view.dispatch(view.state.tr.setMeta('annotations:active', annotationId)); } catch (_) {}
      const target = view.dom.querySelector(`.pm-annotation[data-id="${CSS.escape(annotationId)}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Web Animations 脈衝
        try {
          target.animate([
            { boxShadow: '0 0 0 0 rgba(59,130,246,0.45)' },
            { boxShadow: '0 0 0 10px rgba(59,130,246,0.0)' }
          ], { duration: 650, easing: 'ease-out' });
        } catch (_) {
          target.classList.add('pm-annotation-pulse');
          setTimeout(() => target.classList.remove('pm-annotation-pulse'), 900);
        }
      }
      try { this._overlay?.setActive?.(annotationId); } catch (_) {}
    } catch (e) {
      console.warn('highlightAnnotation 失敗:', e);
    }
  }

  _bindGlobalActiveReset() {
    try {
      if (this._activeResetBound) return;
      this._activeResetBound = true;
      window.addEventListener('click', (e) => {
        const t = e.target;
        if (!t.closest?.('.pm-annotation') && !t.closest?.('.pm-ann-card')) {
          const view = this._pmViewer?.view;
          if (view) {
            try { view.dispatch(view.state.tr.setMeta('annotations:active', null)); } catch (_) {}
          }
          try { this._overlay?.setActive?.('__none__'); } catch (_) {}
        }
      }, true);
    } catch (_) {}
  }

  /**
   * 老師端：右鍵卡片 → 編輯/刪除（簡版）
   */
  async _handleOverlayContextMenu(a, card, ev) {
    try {
      const action = window.prompt('輸入操作：edit 或 delete', 'edit');
      if (!action) return;
      if (action.toLowerCase() === 'delete') {
        if (!window.confirm('確定刪除此批註？')) return;
        const res = await this.supabase.rpc('delete_annotation_pm', { p_annotation_id: a.id });
        if (res.error) throw res.error;
        await this.refreshPMAnnotations();
        toast.success('批註已刪除');
      } else if (action.toLowerCase() === 'edit') {
        // 讀取現有內容
        const { data, error } = await this.supabase
          .from('annotations')
          .select('content')
          .eq('id', a.id)
          .single();
        if (error) throw error;
        const next = window.prompt('修改批註內容：', data?.content || '');
        if (next === null) return;
        const res = await this.supabase.rpc('update_annotation_pm', { p_annotation_id: a.id, p_content: String(next) });
        if (res.error) throw res.error;
        await this.refreshPMAnnotations();
        toast.success('批註已更新');
      }
    } catch (e) {
      console.error('右鍵操作失敗:', e);
      toast.error('操作失敗：' + (e.message || '未知錯誤'));
    }
  }

  // 舊系統渲染已移除：僅支持 TipTap/PM viewer

  /**
   * 渲染評分標準表單
   */
  renderCriterionForm(criterion, existingScore = null) {
    return `
      <div class="criterion-group">
        <label>標準 ${criterion.code}：${criterion.name} (0-${criterion.maxScore})</label>
        <select name="criterion_${criterion.code.toLowerCase()}" class="select" required>
          <option value="">請選擇分数</option>
          ${Array.from({ length: criterion.maxScore + 1 }, (_, i) => `
            <option value="${i}" ${existingScore === i ? 'selected' : ''}>${i} 分</option>
          `).join('')}
        </select>
        <details class="criterion-details">
          <summary>查看評分標準</summary>
          <div class="descriptors">
            ${criterion.descriptors.map(d => `
              <div class="descriptor">
                <strong>${d.range} 分：</strong>
                <p>${d.description}</p>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `;
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    const form = document.getElementById('gradingForm');
    if (!form) {
      console.error('❌ 找不到批改表單元素');
      return;
    }
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmitGrading(form);
    });

    const backBtn = document.getElementById('backBtn');
    if (!backBtn) {
      console.error('❌ 找不到返回按鈕');
      return;
    }
    
    backBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'grading-queue' }  // ✅ 返回批改隊列而非作業管理
      }));
    });

    // AI 評分建議按鈕
    const aiSuggestionBtn = document.getElementById('getAISuggestionBtn');
    if (aiSuggestionBtn) {
      aiSuggestionBtn.addEventListener('click', async () => {
        await this.handleGetAISuggestion();
      });
    }

    // 批注系統事件
    this.bindAnnotationEvents();
  }

  /**
   * 綁定批注系統事件
   */
  bindAnnotationEvents() {
    // 頂部按鈕已移除，批註新增改為選區浮動按鈕
  }

  /**
   * 處理提交批改
   */
  async handleSubmitGrading(form) {
    try {
      const formData = new FormData(form);
      
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('未登入');
      
      // 準備評分數據（只收集實際存在的標準）
      const gradingData = {
        essay_id: this.currentEssay.id,
        teacher_id: user.id,
        overall_comment: formData.get('comments'),
        status: 'final' // 設置為最終評分
      };

      // 動態收集各標準的評分（只收集實際存在的）
      const criteriaFields = ['a', 'b', 'c', 'd'];
      criteriaFields.forEach(criterion => {
        const value = formData.get(`criterion_${criterion}`);
        if (value !== null && value !== '') {
          const score = parseInt(value);
          if (!isNaN(score)) {
            gradingData[`criterion_${criterion}_score`] = score;
          }
        }
      });

      console.log('📊 提交評分數據:', gradingData);

      // 插入或更新 grades 表（使用 upsert）
      const { error } = await this.supabase
        .from('grades')
        .upsert(gradingData, {
          onConflict: 'essay_id'
        });

      if (error) {
        console.error('❌ 插入 grades 表失敗:', error);
        throw error;
      }

      console.log('✅ 評分已保存到 grades 表');

      // 將論文狀態設為 graded（簡化流程，無提交門檻）
      const { error: statusErr } = await this.supabase
        .from('essays')
        .update({ status: 'graded' })
        .eq('id', this.currentEssay.id);
      if (statusErr) throw statusErr;

      toast.success('批改已提交！正在返回批改列表...');
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'grading-queue' }
        }));
      }, 1500);
    } catch (error) {
      console.error('提交批改失敗:', error);
      toast.error('提交失敗：' + error.message);
    }
  }

  /**
   * 加載已保存的 AI 評分建議（如果存在）
   */
  async loadSavedAISuggestion() {
    try {
      console.log('🔍 檢查是否有已保存的 AI 評分建議...');
      
      // 動態導入 AI 評分請求模塊
      const { loadSavedAISuggestion } = await import('./ai-grading-requester.js');
      
      // 從 Supabase 加載已保存的建議
      const savedSuggestion = await loadSavedAISuggestion(
        this.currentEssay.id,
        this.supabase
      );

      if (savedSuggestion && savedSuggestion.criteria_scores) {
        console.log('✅ 找到已保存的 AI 評分建議');
        
        // 顯示內容區域（確保可見）
        const aiSectionContent = document.getElementById('aiSectionContent');
        if (aiSectionContent) {
          aiSectionContent.classList.remove('hidden');
        }
        
        // 判斷是否過期：若建議產生時間早於論文最近更新時間，視為過期
        let isOutdated = false;
        try {
          const essayUpdatedAt = this.currentEssay?.updated_at ? new Date(this.currentEssay.updated_at) : null;
          const suggestionCreatedAt = savedSuggestion?.created_at ? new Date(savedSuggestion.created_at) : null;
          if (essayUpdatedAt && suggestionCreatedAt && suggestionCreatedAt < essayUpdatedAt) {
            isOutdated = true;
            console.warn('⚠️ 已保存的 AI 建議可能已過期：建議時間 < 論文更新時間');
          }
        } catch (_) {}

        // 顯示已保存的建議
        this.renderAISuggestion(
          savedSuggestion.criteria_scores, 
          savedSuggestion.overall_comment
        );
        
        const btn = document.getElementById('getAISuggestionBtn');
        const row = document.getElementById('aiGetSuggestionRow');
        if (btn && row) {
          if (isOutdated) {
            // 顯示按鈕允許重新獲取，並調整文案
            row.classList.remove('hidden');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> 重新獲取建議';
            // 附加過期提示
            const hintId = 'aiOutdatedHint';
            if (!document.getElementById(hintId)) {
              const hint = document.createElement('div');
              hint.id = hintId;
              hint.style.marginTop = '0.5rem';
              hint.style.fontSize = '.85rem';
              hint.style.color = 'var(--warning-700, #92400e)';
              hint.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 學生在提交後對作業有更新，建議重新獲取 AI 建議';
              row.appendChild(hint);
            }
          } else {
            // 未過期則隱藏按鈕列
            row.classList.add('hidden');
          }
        }
      } else {
        console.log('ℹ️ 沒有已保存的 AI 評分建議');
      }
    } catch (error) {
      console.error('⚠️ 加載已保存的 AI 建議失敗:', error);
      // 失敗不影響正常使用，老師可以手動點擊獲取
    }
  }

  /**
   * 獲取 AI 評分建議
   */
  async handleGetAISuggestion() {
    try {
      const aiSectionContent = document.getElementById('aiSectionContent');
      const loadingState = document.getElementById('aiLoadingState');
      const resultsDiv = document.getElementById('aiSuggestionResults');
      const btn = document.getElementById('getAISuggestionBtn');

      // 顯示內容區域（如果之前是隱藏的）
      aiSectionContent.classList.remove('hidden');
      
      // 隱藏按鈕並顯示加載狀態
      if (btn) {
        // 隱藏整個按鈕行，達到「按鈕消失變為等待動畫」效果
        const row = document.getElementById('aiGetSuggestionRow');
        if (row) row.classList.add('hidden');
        else btn.style.display = 'none';
      }
      loadingState.classList.remove('hidden');
      resultsDiv.classList.add('hidden');

      // 動態導入 AI 評分請求模塊
      const { requestAIGradingSuggestion } = await import('./ai-grading-requester.js');

      // 調用 AI 評分
      const result = await requestAIGradingSuggestion(
        this.currentEssay.id,
        this.currentEssay.assignment.grading_rubric_json,
        this.supabase
      );

      // 隱藏加載狀態
      loadingState.classList.add('hidden');

      // 顯示結果（包含总评）
      this.renderAISuggestion(result.criteria_scores, result.overall_comment);
      // 保持按鈕隱藏，不再顯示
    } catch (error) {
      console.error('獲取 AI 評分建議失敗:', error);
      
      // 隱藏加載狀態
      document.getElementById('aiLoadingState').classList.add('hidden');
      // 顯示按鈕讓用戶可重試
      const btn = document.getElementById('getAISuggestionBtn');
      if (btn) {
        const row = document.getElementById('aiGetSuggestionRow');
        if (row) row.classList.remove('hidden');
        else btn.style.display = '';
        btn.disabled = false;
      }

      toast.error('獲取 AI 評分建議失敗：' + error.message);
    }
  }

  /**
   * 渲染 AI 評分建議
   */
  renderAISuggestion(criteriaScores, overallComment = null) {
    const resultsDiv = document.getElementById('aiSuggestionResults');
    // 此區域不再顯示總分，僅保留各標準分與總評

    // 生成評分卡片
    const cardsHTML = Object.entries(criteriaScores).map(([criterionId, data]) => {
      if (!data || data.score === null) return '';

      const criterionInfo = this.getCriterionInfo(criterionId);
      
      return `
        <div class="ai-criterion-card card" style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <div>
              <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">
                <i class="fas fa-check-circle" style="color: var(--primary-600);"></i> 
                標準 ${criterionId}：${criterionInfo.name}
              </h4>
            </div>
            <div style="text-align: center; min-width: 60px;">
              <div style="font-size: 2rem; font-weight: 700; color: var(--primary-600);">${data.score}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">/ 8 分</div>
            </div>
          </div>
          <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 6px; border-left: 3px solid var(--primary-600);">
            <p style="margin: 0; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">${this.escapeHtml(data.reason || '')}</p>
          </div>
        </div>
      `;
    }).filter(html => html).join('');

    // 生成總評卡片（基於樣式類，移除內聯邊距與過度裝飾）
    const overallCommentHTML = overallComment ? `
      <div class="ai-overall card" style="margin-bottom: 1rem;">
        <h4 class="ai-overall-title" style="margin: 0 0 .75rem 0; font-size: 1.05rem; color: var(--text-primary);">
          <i class="fas fa-comment-dots" style="color: var(--warning-600);"></i> AI 總評
        </h4>
        <div class="block good" style="margin-bottom: .75rem;">
          <div style="display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; color: var(--success-600);">
            <i class="fas fa-thumbs-up"></i>
            <strong>做得好的方面</strong>
          </div>
          <p style="margin: 0; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">${this.escapeHtml(overallComment.strengths || '暂无')}</p>
        </div>
        <div class="block improve">
          <div style="display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; color: var(--warning-700);">
            <i class="fas fa-arrow-up"></i>
            <strong>需要改進的方面</strong>
          </div>
          <p style="margin: 0; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">${this.escapeHtml(overallComment.improvements || '暂无')}</p>
        </div>
        <div style="margin-top: .75rem; padding-top: .75rem; border-top: 1px solid var(--border-divider); color: var(--text-tertiary); font-size: .85rem;">
          <i class="fas fa-lightbulb"></i> 老師可參考此總評撰寫評語，也可以自由修改或補充
        </div>
      </div>
    ` : '';

    // 渲染結果（無外層 padding，避免多餘縮進）
    resultsDiv.innerHTML = `
      ${overallCommentHTML}
      ${cardsHTML}
      <div class="ai-actions">
        <button id="applyAISuggestionBtn" class="btn btn-primary">
          <i class="fas fa-check-double"></i> 採用 AI 建議
        </button>
        <p class="ai-actions-hint" style="margin-top: .75rem; color: var(--text-tertiary); font-size: .85rem;">
          <i class="fas fa-info-circle"></i> 採用後分數會自動填入，總評可複製到評語欄參考
        </p>
      </div>
    `;

    resultsDiv.classList.remove('hidden');

    // 保存总评到实例变量，供「採用建議」使用
    this.currentAIOverallComment = overallComment;

    // 綁定「採用建議」按鈕
    const applyBtn = document.getElementById('applyAISuggestionBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyAISuggestion(criteriaScores, overallComment);
      });
    }
  }

  /**
   * 獲取標準信息
   */
  getCriterionInfo(criterionId) {
    const criterionMap = {
      'A': { name: '分析', icon: 'fa-search' },
      'B': { name: '組織', icon: 'fa-sitemap' },
      'C': { name: '創作', icon: 'fa-pen-fancy' },
      'D': { name: '語言', icon: 'fa-language' }
    };
    return criterionMap[criterionId] || { name: '未知', icon: 'fa-question' };
  }

  /**
   * 採用 AI 建議（一鍵填充評分表單）
   */
  applyAISuggestion(criteriaScores, overallComment = null) {
    const form = document.getElementById('gradingForm');
    
    // 填充各标准分数（使用 select 下拉菜单）
    Object.entries(criteriaScores).forEach(([criterionId, data]) => {
      if (data && data.score !== null && data.score !== undefined) {
        const selectName = `criterion_${criterionId.toLowerCase()}`;
        const select = form.querySelector(`select[name="${selectName}"]`);
        if (select) {
          select.value = data.score;
          console.log(`✅ 填充 ${criterionId}：${data.score} 分`);
        } else {
          console.warn(`⚠️ 找不到 select[name="${selectName}"]`);
        }
      }
    });

    // 填充总评到评语栏（作为参考起点）
    if (overallComment) {
      const commentsTextarea = form.querySelector('textarea[name="comments"]');
      if (commentsTextarea) {
        const aiComment = `【AI 參考評語】

✅ 做得好的方面：
${overallComment.strengths || ''}

📈 需要改進的方面：
${overallComment.improvements || ''}

---
（老師可以在此基礎上修改、補充或完全重寫）`;
        
        commentsTextarea.value = aiComment;
        console.log('✅ 已將 AI 總評填入評語欄');
      }
    }

    toast.success('AI 建議已填充！<br>分數和參考評語已填入，請檢查調整後提交。', 3000);
    
    // 滾動到評分表單
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  // 與批改隊列一致：從 PM JSON 提取文本並統計中文字數
  computeDisplayWordCount(essay) {
    try {
      const text = this.extractTextFromPM(essay?.content_json) || '';
      return this.countWithoutPunct(text);
    } catch (_) { return 0; }
  }

  extractTextFromPM(raw) {
    try {
      const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!json || typeof json !== 'object') return '';
      const parts = [];
      const walk = (node) => {
        if (!node) return;
        const type = node.type;
        if (type === 'text') { if (node.text) parts.push(node.text); return; }
        if (Array.isArray(node.content)) node.content.forEach(child => walk(child));
        if (type === 'paragraph') parts.push('\n');
      };
      walk(json);
      const text = parts.join('').replace(/\n{3,}/g, '\n').trim();
      return text;
    } catch (_) { return ''; }
  }

  countWithoutPunct(text) {
    if (!text) return 0;
    const matches = text.match(/[\u4E00-\u9FFF]/g);
    return matches ? matches.length : 0;
  }

  /**
   * 轉義 HTML 特殊字符
   */
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export default GradingUI;

