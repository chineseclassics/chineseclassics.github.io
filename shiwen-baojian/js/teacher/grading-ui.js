/**
 * 批改功能 UI（精簡版）
 */

import toast from '../ui/toast.js';
import { PMEditor } from '../editor/tiptap-editor.js';
import { createAnnotationPlugin, createAnnotationFromSelection, computeSelectionAnchor } from '../features/pm-annotation-plugin.js';
import { PMAnnotationOverlay } from '../features/pm-annotation-overlay.js';

class GradingUI {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentEssay = null;
    this.annotationManager = null; // 將被移除：改用 PM 插件統一 CRUD
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
      container.innerHTML = `<div class="error">加載失敗：${error.message}</div>`;
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
                <i class="fas fa-tasks mr-1"></i>任務：${essay.assignment.title}
              </span>
              <span class="mr-4">
                <i class="fas fa-user mr-1"></i>學生：${essay.student.display_name}
              </span>
              <span>
                <i class="fas fa-envelope mr-1"></i>${essay.student.email}
              </span>
            </div>
          </div>
        </div>

        <!-- 三欄佈局（與學生端一致） -->
        <div class="flex flex-col lg:flex-row gap-6 px-4 py-8 layout-3col">
          <!-- 左側：評分邊欄（對齊學生端賈雨村說） -->
          <aside class="hidden lg:block w-72 flex-shrink-0">
            <div class="sticky top-20">
              <!-- AI 評分建議區域 -->
              <div class="grading-sidebar-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <i class="fas fa-robot mr-2"></i>AI 評分建議
                  </h3>
                  <button id="getAISuggestionBtn" class="btn-ai-suggest">
                    <i class="fas fa-magic"></i>
                    獲取建議
                  </button>
                </div>
                
                <div class="section-content">
                  <div class="panel-actions">
                    <p class="ai-hint">
                      <i class="fas fa-info-circle"></i>
                      AI 建議僅供參考，老師可自由調整
                    </p>
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
              <div class="grading-sidebar-section">
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
                      <label>總體評語</label>
                      <textarea
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
            this._annStore = [];
            const plugin = createAnnotationPlugin({
              getAnnotations: () => this._annStore,
              onClick: (id) => this.highlightAnnotation?.(id)
            });
            this._pmViewer = new PMEditor(viewer, { readOnly: true, initialJSON: json, extraPlugins: [plugin] });
            // 右側疊加層（與 Google Docs 類似）
            const essaySection = document.getElementById('ann-sidebar') || viewer.closest('.essay-viewer') || viewer.parentElement;
            if (essaySection) {
              this._overlay = new PMAnnotationOverlay({
                root: essaySection,
                view: this._pmViewer.view,
                getAnnotations: () => this._annStoreWithContent || this._annStore || [],
                onClick: (id) => this.highlightAnnotation?.(id),
                onContextMenu: (a, card, ev) => this._handleOverlayContextMenu?.(a, card, ev)
              });
              this._overlay.mount();
            }
            // 啟用「右側就地輸入」編寫器（僅初始化，不自動彈出）+ 浮動添加按鈕
            this.setupSelectionComposer();
            this.setupSelectionFab();
            await this.refreshPMAnnotations();
            this._annPoll = setInterval(() => this.refreshPMAnnotations(), 5000);
            // Realtime：收到變更則刷新一次
            try {
              this._annChannel = this.supabase
                .channel('pm-ann-teacher')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, () => {
                  this.refreshPMAnnotations();
                })
                .subscribe();
            } catch (e) { console.warn('教師端 Realtime 初始化失敗:', e); }
          } else {
            // 後備：使用舊渲染（HTML）避免空白
            viewer.innerHTML = this.renderEssayContent(this.currentEssay);
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
      if (ids.length > 0) {
        const { data: annRows } = await this.supabase
          .from('annotations')
          .select('id, content, created_at')
          .in('id', ids);
        contents = annRows || [];
      }
      const contentMap = new Map(contents.map(r => [r.id, r]));
      const list = anchors.map(a => Object.assign({}, a, contentMap.get(a.id) || {}));

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

    const hide = () => { composer.style.display = 'none'; textarea.value = ''; };
    const showAt = (rect) => {
      const containerRect = essaySection.getBoundingClientRect();
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

  // 僅在可見時跟隨滾動更新位置
  const onScroll = () => { if (composer.style.display !== 'none') update(); };
  window.addEventListener('scroll', onScroll, { passive: true });

    btnCancel.addEventListener('click', hide);
    btnAdd.addEventListener('click', async () => {
      try {
        if (!view || view.state.selection.empty) { hide(); return; }
        const content = (textarea.value || '').trim();
        if (!content) { textarea.focus(); return; }
        const id = await createAnnotationFromSelection({ view, supabase: this.supabase, essayId: this.currentEssay.id, content });
        if (id) {
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
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (!rect) return;
        showAt(rect);
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
    } catch (e) {
      console.warn('highlightAnnotation 失敗:', e);
    }
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

  /**
   * 渲染作業內容
   */
  renderEssayContent(essay) {
    console.log('📄 渲染作業內容...');
    console.log('  - content_json 存在?', !!essay.content_json);
    console.log('  - paragraphs 數量:', essay.paragraphs?.length || 0);
    
    // 優先從 content_json 獲取完整結構化內容
    if (essay.content_json) {
      try {
        const content = typeof essay.content_json === 'string' 
          ? JSON.parse(essay.content_json) 
          : essay.content_json;
        
        console.log('✅ 從 content_json 渲染');
        console.log('  - 引言:', !!content.introduction);
        console.log('  - 分論點:', content.arguments?.length || 0);
        console.log('  - 結論:', !!content.conclusion);
        
        let html = '';
        
        // 引言
        if (content.introduction) {
          // 找到引言段落 ID
          const introParagraph = essay.paragraphs?.find(p => p.paragraph_type === 'introduction');
          const introParaId = introParagraph?.id || '';
          const introOrderIndex = introParagraph?.order_index ?? 0;
          
          html += `
            <div class="paragraph-block" data-paragraph-id="${introParaId}" data-order-index="${introOrderIndex}">
              <h4 class="text-lg font-semibold text-gray-800 mb-2">
                <i class="fas fa-quote-left mr-2" style="color: var(--primary-500);"></i>引言
              </h4>
              <div class="paragraph-content">${content.introduction}</div>
            </div>
          `;
        }
        
        // 分論點
        if (content.arguments && content.arguments.length > 0) {
          content.arguments.forEach((arg, index) => {
            html += `
              <div class="paragraph-block argument-section">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">
                  <i class="fas fa-lightbulb mr-2" style="color: var(--warning-500);"></i>
                  分論點 ${index + 1}${arg.title ? `：${arg.title}` : ''}
                </h4>
            `;
            
            if (arg.paragraphs && arg.paragraphs.length > 0) {
              arg.paragraphs.forEach((para, pIndex) => {
                // 找到對應的段落 ID
                const bodyParagraphs = essay.paragraphs?.filter(p => p.paragraph_type === 'body');
                const matchedParagraph = bodyParagraphs && bodyParagraphs[index + pIndex];
                const paraId = matchedParagraph?.id || '';
                const globalIndex = matchedParagraph?.order_index ?? 0;
                
                html += `
                  <div class="paragraph-content sub-paragraph" data-paragraph-id="${paraId}" data-order-index="${globalIndex}">
                    <div class="paragraph-label">段落 ${globalIndex}</div>
                    ${para.content || ''}
                  </div>
                `;
              });
            }
            
            html += `</div>`;
          });
        }
        
        // 結論
        if (content.conclusion) {
          // 找到結論段落 ID
          const conclParagraph = essay.paragraphs?.find(p => p.paragraph_type === 'conclusion');
          const conclParaId = conclParagraph?.id || '';
          const conclOrderIndex = conclParagraph?.order_index ?? 0;
          
          html += `
            <div class="paragraph-block" data-paragraph-id="${conclParaId}" data-order-index="${conclOrderIndex}">
              <h4 class="text-lg font-semibold text-gray-800 mb-2">
                <i class="fas fa-flag-checkered mr-2" style="color: var(--success-500);"></i>結論
              </h4>
              <div class="paragraph-content">${content.conclusion}</div>
            </div>
          `;
        }
        
        return html || '<p class="text-gray-500">作業內容為空</p>';
        
      } catch (e) {
        console.error('❌ 解析作業內容失敗:', e);
      }
    }
    
    // 備用：從 paragraphs 表渲染（舊格式）
    if (essay.paragraphs && essay.paragraphs.length > 0) {
      console.log('⚠️ 從 paragraphs 表渲染（備用方案）');
      console.log('  - 第一個段落的 content 類型:', typeof essay.paragraphs[0].content);
      console.log('  - 第一個段落的 content:', essay.paragraphs[0].content);
      
      return essay.paragraphs
        .sort((a, b) => a.order_index - b.order_index)
        .map(p => {
          // 提取 HTML 內容
          let htmlContent = '';
          if (p.content && typeof p.content === 'object') {
            htmlContent = p.content.html || JSON.stringify(p.content);
          } else {
            htmlContent = p.content || '';
          }
          
          return `
            <div class="paragraph-block" data-paragraph-id="${p.id}" data-order-index="${p.order_index || 0}">
              <h4>${p.paragraph_type === 'introduction' ? '引言' : p.paragraph_type === 'conclusion' ? '結論' : '正文段落'}</h4>
              <div class="paragraph-content">${htmlContent}</div>
            </div>
          `;
        }).join('');
    }
    
    return '<p class="text-gray-500">作業內容為空</p>';
  }

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
   * 初始化批注系統（自動開啟）
   */
  async initializeAnnotationSystem() {
    console.log('🚀 開始初始化批注系統');
    
    if (!this.annotationManager) {
      console.log('📝 創建批注管理器');
      this.annotationManager = new AnnotationManager(this.supabase);
      
      const paragraphs = this.currentEssay.paragraphs || [];
      console.log('📄 段落數量:', paragraphs.length);
      
      if (paragraphs.length > 0) {
        // 傳遞所有段落
        console.log('🎯 初始化所有段落的批注系統');
        await this.annotationManager.init(this.currentEssay.id, paragraphs);
      } else {
        console.log('❌ 沒有找到段落');
      }
      
      // 自動啟用批注模式
      this.annotationManager.enableSelectionMode();
      this.updateAnnotationModeButton(true);
      
      console.log('✅ 批注系統初始化完成');
    } else {
      console.log('ℹ️ 批注管理器已存在');
    }
  }

  /**
   * 切換批注模式（保留用於手動控制）
   */
  toggleAnnotationMode() {
    if (!this.annotationManager) {
      this.initializeAnnotationSystem();
      return;
    }

    const isActive = this.annotationManager.isSelectionMode;
    if (isActive) {
      this.annotationManager.disableSelectionMode();
      this.updateAnnotationModeButton(false);
    } else {
      this.annotationManager.enableSelectionMode();
      this.updateAnnotationModeButton(true);
    }
  }

  /**
   * 更新批注模式按鈕狀態
   */
  updateAnnotationModeButton(isActive) {
    const btn = document.getElementById('toggleAnnotationMode');
    if (btn) {
      if (isActive) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-comment-dots"></i><span>關閉批注</span>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-comment-dots"></i><span>開啟批注</span>';
      }
    }
  }

  /**
   * 顯示批注統計
   */
  async showAnnotationStats() {
    if (!this.annotationManager) {
      toast.error('請先啟用批注模式');
      return;
    }

    try {
      // 調用統計函數
      const { data, error } = await this.supabase.rpc('get_essay_annotation_stats', {
        p_essay_id: this.currentEssay.id
      });

      if (error) throw error;

      const stats = data[0];
      this.showStatsDialog(stats);
    } catch (error) {
      console.error('❌ 獲取批注統計失敗:', error);
      toast.error('獲取批注統計失敗: ' + error.message);
    }
  }

  /**
   * 顯示統計對話框
   */
  showStatsDialog(stats) {
    const dialog = document.createElement('div');
    dialog.className = 'annotation-stats-dialog';
    dialog.innerHTML = `
      <div class="annotation-stats-dialog-content">
        <div class="annotation-stats-dialog-header">
          <h3>批注統計</h3>
          <button class="annotation-stats-close">×</button>
        </div>
        <div class="annotation-stats-dialog-body">
          <div class="annotation-stats-grid">
            <div class="annotation-stat-item">
              <div class="annotation-stat-value">${stats.total_annotations}</div>
              <div class="annotation-stat-label">總批注數</div>
            </div>
            <div class="annotation-stat-item">
              <div class="annotation-stat-value">${stats.pending_annotations}</div>
              <div class="annotation-stat-label">待處理</div>
            </div>
            <div class="annotation-stat-item">
              <div class="annotation-stat-value">${stats.resolved_annotations}</div>
              <div class="annotation-stat-label">已解決</div>
            </div>
            <div class="annotation-stat-item">
              <div class="annotation-stat-value">${stats.high_priority_annotations}</div>
              <div class="annotation-stat-label">高優先級</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加樣式
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    document.body.appendChild(dialog);

    // 綁定關閉事件
    dialog.querySelector('.annotation-stats-close').addEventListener('click', () => {
      dialog.remove();
    });

    // 點擊外部關閉
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });
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
        
        // 顯示已保存的建議
        this.renderAISuggestion(
          savedSuggestion.criteria_scores, 
          savedSuggestion.overall_comment
        );
        
        // 禁用「獲取 AI 建議」按鈕
        const btn = document.getElementById('getAISuggestionBtn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-check-circle"></i> 已獲取 AI 建議';
          btn.style.opacity = '0.6';
          btn.style.cursor = 'not-allowed';
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
      const loadingState = document.getElementById('aiLoadingState');
      const resultsDiv = document.getElementById('aiSuggestionResults');
      const btn = document.getElementById('getAISuggestionBtn');

      // 顯示加載狀態
      loadingState.classList.remove('hidden');
      resultsDiv.classList.add('hidden');
      btn.disabled = true;

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

      // 禁用按鈕並更改文字（已生成，不需要再次點擊）
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> 已獲取 AI 建議';
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    } catch (error) {
      console.error('獲取 AI 評分建議失敗:', error);
      
      // 隱藏加載狀態
      document.getElementById('aiLoadingState').classList.add('hidden');
      document.getElementById('getAISuggestionBtn').disabled = false;

      toast.error('獲取 AI 評分建議失敗：' + error.message);
    }
  }

  /**
   * 渲染 AI 評分建議
   */
  renderAISuggestion(criteriaScores, overallComment = null) {
    const resultsDiv = document.getElementById('aiSuggestionResults');
    
    // 計算總分
    let totalScore = 0;
    let criteriaCount = 0;
    Object.values(criteriaScores).forEach(c => {
      if (c && c.score !== null && c.score !== undefined) {
        totalScore += c.score;
        criteriaCount++;
      }
    });

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
            <p style="margin: 0; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">${data.reason}</p>
          </div>
        </div>
      `;
    }).filter(html => html).join('');

    // 生成总评卡片
    const overallCommentHTML = overallComment ? `
      <div class="card" style="margin-bottom: 1.5rem; border: 2px solid var(--warning-500);">
        <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem;">
          <i class="fas fa-comment-dots" style="color: var(--warning-500);"></i> AI 總評
        </h4>
        
        <!-- 優點 -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-thumbs-up" style="color: var(--success-500);"></i>
            <strong style="color: var(--success-500);">做得好的方面</strong>
          </div>
          <div style="background: var(--success-100); padding: 0.875rem; border-radius: 6px; border-left: 3px solid var(--success-500);">
            <p style="margin: 0; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">${overallComment.strengths || '暂无'}</p>
          </div>
        </div>
        
        <!-- 改進建議 -->
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-arrow-up" style="color: var(--warning-600);"></i>
            <strong style="color: var(--warning-600);">需要改進的方面</strong>
          </div>
          <div style="background: var(--warning-100); padding: 0.875rem; border-radius: 6px; border-left: 3px solid var(--warning-600);">
            <p style="margin: 0; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">${overallComment.improvements || '暂无'}</p>
          </div>
        </div>
        
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-divider);">
          <p style="margin: 0; color: var(--text-tertiary); font-size: 0.85rem;">
            <i class="fas fa-lightbulb"></i> 老師可參考此總評撰寫評語，也可以自由修改或補充
          </p>
        </div>
      </div>
    ` : '';

    resultsDiv.innerHTML = `
      <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 1.5rem;">
        <!-- 總分顯示 -->
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%); border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="color: white; font-size: 0.9rem; margin-bottom: 0.25rem;">AI 建議總分</div>
          <div style="color: white; font-size: 3rem; font-weight: 700;">${totalScore}</div>
          <div style="color: rgba(255,255,255,0.9); font-size: 0.85rem;">/ ${criteriaCount * 8} 分（${criteriaCount} 個標準）</div>
        </div>

        <!-- AI 總評 -->
        ${overallCommentHTML}

        <!-- 各標準評分卡片 -->
        ${cardsHTML}

        <!-- 採用建議按鈕 -->
        <div style="text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--border-divider);">
          <button id="applyAISuggestionBtn" class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1.05rem;">
            <i class="fas fa-check-double"></i> 採用 AI 建議
          </button>
          <p style="margin-top: 0.75rem; color: var(--text-tertiary); font-size: 0.85rem;">
            <i class="fas fa-info-circle"></i> 採用後分數會自動填入，總評可複製到評語欄參考
          </p>
        </div>
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

