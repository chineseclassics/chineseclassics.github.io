/**
 * 任務創建器 UI（精简版）
 * MVP 阶段實現核心功能
 */

import AssignmentManager from './assignment-manager.js';
import FormatEditorCore from './format-editor-core.js';

class AssignmentCreator {
  constructor(assignmentManager) {
    this.assignmentManager = assignmentManager;
    this.container = null;
    this.selectedTemplate = null;
    this.selectedTemplateId = null;  // 保存格式ID（引用模式）
    this.selectedRubric = 'ib-myp';
    
    // 展开式编辑器状态
    this.isInlineEditorExpanded = false;
    this.inlineQuill = null;
    this.draftCleanup = null;
    this.cachedFormatData = null;  // 缓存 AI 优化结果
    this.currentEditingFormatId = null;  // 当前编辑的格式ID（用于判断是新建还是修改）
    this.isEditingSystemTemplate = false;  // 是否正在编辑系统模板
    
    // 🚨 階段 3.5.1：完整狀態管理系統
    this.currentMode = 'custom';  // 'direct' | 'incremental' | 'custom'
    this.hasBeenOptimized = false;  // 是否已經過 AI 優化
    this.originalContent = '';  // 原始內容基線（用於檢測修改）
    this.cachedFormatJSON = null;  // 緩存的格式 JSON
  }

  /**
   * 渲染任務創建表單
   */
  async render(container, assignmentId = null) {
    this.container = container;

    // 如果是編輯模式，加載現有任務數據
    let existingAssignment = null;
    if (assignmentId) {
      existingAssignment = await this.assignmentManager.getAssignment(assignmentId);
    }

    const isEdit = !!existingAssignment;

    this.container.innerHTML = `
      <div class="assignment-creator">
        <div class="creator-header">
          <div>
            <h2>${isEdit ? '編輯任務' : '創建新任務'}</h2>
            <p class="text-muted" style="margin: 0.5rem 0 0 0; color: #7f8c8d; font-size: 0.95rem;">
              設置任務的基本信息、寫作要求和評分標準
            </p>
          </div>
          <button id="backBtn" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i> 返回
          </button>
        </div>

        <form id="assignmentForm" class="assignment-form">
          <!-- 基本信息 -->
          <section class="form-section">
            <h3><i class="fas fa-info-circle" style="color: #3498db; margin-right: 0.5rem;"></i>基本信息</h3>
            
            <div class="form-group">
              <label>任務標題 <span class="required">*</span></label>
              <input
                type="text"
                name="title"
                value="${existingAssignment?.title || ''}"
                placeholder="例如：《紅樓夢》研習論文"
                required
              />
            </div>

            <!-- 任務描述已移除：統一使用寫作要求，避免混淆 -->

            <div class="form-group">
              <label>截止日期 <span class="required">*</span></label>
              <input
                type="datetime-local"
                name="dueDate"
                value="${existingAssignment?.due_date ? new Date(existingAssignment.due_date).toISOString().slice(0, 16) : ''}"
                required
              />
              <p class="help-text">學生必須在此日期前提交作業</p>
            </div>
          </section>

          <!-- 寫作要求 -->
          <section class="form-section">
            <h3><i class="fas fa-file-alt" style="color: #3498db; margin-right: 0.5rem;"></i>寫作要求</h3>
            
            <!-- 🚨 階段 3.5.2.1：卡片式選擇起點 UI -->
            <div class="form-group">
              <label>選擇起點 <span class="required">*</span></label>
              
              <!-- 從零開始卡片 -->
              <div 
                id="startFromScratchCard" 
                class="format-selection-card mb-3 p-4 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer transition hover:shadow-md"
                style="position: relative;"
              >
                <div class="flex items-center gap-3">
                  <div style="font-size: 2rem;">✏️</div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-blue-900" style="margin: 0; font-size: 1rem;">從零開始</h4>
                    <p class="text-sm text-blue-700" style="margin: 0.25rem 0 0 0;">完全自定義寫作要求</p>
                  </div>
                  <div id="scratchCheckmark" class="text-blue-600 font-bold" style="font-size: 1.5rem;">✓</div>
                </div>
              </div>

              <!-- 系統寫作要求列表 -->
              <h4 class="text-sm font-medium text-gray-700" style="margin: 1rem 0 0.5rem 0;">或基於系統寫作要求：</h4>
              <div id="systemFormatsCardList" class="space-y-3" style="max-height: 300px; overflow-y: auto;">
                <!-- 系統格式卡片將動態生成 -->
              </div>

              <!-- 加載預覽按鈕 -->
              <button 
                type="button"
                id="loadPreviewBtn"
                class="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                📄 加載預覽
              </button>
              
              <p class="help-text" style="margin-top: 0.5rem;">選擇起點後，可以在下方編輯器中查看和修改</p>
            </div>

            <!-- 展开式编辑器区域 -->
            <div id="inlineEditorContainer" class="hidden" style="margin-top: 1.5rem; border: 2px solid #3498db; border-radius: 8px; padding: 1.5rem; background: #f8f9fa;">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-lg font-bold text-gray-900">
                  <i class="fas fa-magic text-purple-600 mr-2"></i>創建新寫作要求
                </h4>
                <button 
                  type="button"
                  id="closeInlineEditorBtn"
                  class="text-gray-400 hover:text-gray-600 text-xl"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
              
              <!-- Quill 编辑器 -->
              <div id="inline-quill-editor" class="bg-white border border-gray-300 rounded-lg p-4 mb-4" style="min-height: 300px;">
                <!-- Quill 将在这里初始化 -->
              </div>
              
              <!-- 🚨 階段 3.5.1.5：實時狀態面板 -->
              <div id="inlineStatusPanel" class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">
                  <i class="fas fa-info-circle text-blue-600 mr-2"></i>📊 當前狀態
                </h4>
                <div id="inlineStatusContent" class="text-sm text-gray-600 space-y-1">
                  <p>✏️ 模式：<span id="statusMode" class="font-medium">從零開始</span></p>
                  <p>📝 已優化：<span id="statusOptimized" class="font-medium">否</span></p>
                  <p>💾 可保存：<span id="statusCanSave" class="font-medium">否</span></p>
                </div>
              </div>
              
              <!-- 操作按钮 -->
              <div class="flex justify-end gap-3">
                <button 
                  type="button"
                  id="inlineClearBtn"
                  class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  <i class="fas fa-eraser mr-2"></i>清空
                </button>
                <button 
                  type="button"
                  id="inlineOptimizeBtn"
                  class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-magic mr-2"></i>AI 優化
                </button>
                <button 
                  type="button"
                  id="inlineSaveBtn"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-save mr-2"></i>保存並使用
                </button>
              </div>
              
              <!-- AI 处理中 -->
              <div id="inlineAiProcessing" class="hidden mt-3 text-center text-purple-600">
                <i class="fas fa-spinner fa-spin mr-2"></i>AI 正在優化...
              </div>
            </div>
          </section>
          
          <!-- 保存写作要求对话框 -->
          <div id="saveFormatDialog" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
              <h3 class="text-xl font-bold mb-4">保存寫作要求</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">模板類型</label>
                  <div class="space-y-2">
                    <label class="flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="formatType" 
                        value="task-only" 
                        checked
                        class="mr-2"
                      />
                      <span>僅用於本次任務（默認）</span>
                    </label>
                    <label class="flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="formatType" 
                        value="template"
                        class="mr-2"
                      />
                      <span>通用模板（可複用，顯示在模板庫）</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                  <input 
                    id="saveFormatName"
                    type="text" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="例如：紅樓夢人物分析格式"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <textarea 
                    id="saveFormatDesc"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows="3"
                    placeholder="簡要描述這個寫作要求..."
                  ></textarea>
                </div>
              </div>
              <div class="flex gap-3 mt-6">
                <button 
                  type="button"
                  id="cancelSaveFormatBtn"
                  class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button 
                  type="button"
                  id="confirmSaveFormatBtn"
                  class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  確認保存
                </button>
              </div>
            </div>
          </div>

          <!-- 評分標準 -->
          <section class="form-section">
            <h3><i class="fas fa-clipboard-check" style="color: #3498db; margin-right: 0.5rem;"></i>評分標準</h3>
            
            <div class="form-group">
              <label>選擇評分標準集</label>
              <select name="rubric">
                <option value="ib-myp" selected>📋 IB MYP 中國古典文學評分標準</option>
              </select>
              <p class="help-text">選擇評分標準集，然後選擇本次使用的具體標準</p>
            </div>

            <div class="form-group">
              <label>使用哪些標準 <span class="required">*</span></label>
              <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="checkbox" name="rubric-criteria" value="A" checked style="margin-right: 0.5rem;">
                  <strong>標準 A：分析</strong>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="checkbox" name="rubric-criteria" value="B" checked style="margin-right: 0.5rem;">
                  <strong>標準 B：組織</strong>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="checkbox" name="rubric-criteria" value="C" checked style="margin-right: 0.5rem;">
                  <strong>標準 C：創作</strong>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="checkbox" name="rubric-criteria" value="D" checked style="margin-right: 0.5rem;">
                  <strong>標準 D：語言</strong>
                </label>
              </div>
              <p class="help-text">至少選擇 1 個標準，每個標準 0-8 分</p>
            </div>

            <div class="rubric-info">
              <i class="fas fa-lightbulb"></i>
              <p>
                老師可以根據任務特點選擇使用部分標準（例如只評分析和語言）
              </p>
            </div>
          </section>

          <!-- 表單操作 -->
          <div class="form-actions">
            <button type="button" id="saveDraftBtn" class="btn btn-secondary">
              <i class="fas fa-save"></i> 保存草稿
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-paper-plane"></i> ${isEdit ? '更新任務' : '發佈任務'}
            </button>
          </div>
        </form>
      </div>
    `;

    this.bindEvents(assignmentId);
    
    // 加載寫作要求列表
    await this.loadFormatSpecifications();
  }

  /**
   * 綁定事件
   */
  bindEvents(assignmentId) {
    const form = this.container.querySelector('#assignmentForm');
    const saveDraftBtn = this.container.querySelector('#saveDraftBtn');
    const backBtn = this.container.querySelector('#backBtn');

    console.log('🔍 查找表單元素:', {
      form: !!form,
      saveDraftBtn: !!saveDraftBtn,
      backBtn: !!backBtn,
      container: this.container
    });

    if (!form) {
      console.error('❌ 找不到表單元素 #assignmentForm');
      return;
    }
    if (!saveDraftBtn) {
      console.error('❌ 找不到保存草稿按鈕 #saveDraftBtn');
      return;
    }
    if (!backBtn) {
      console.error('❌ 找不到返回按鈕 #backBtn');
      return;
    }

    // 🚨 階段 3.5.2.2：綁定卡片選擇事件
    this.bindFormatSelectionEvents();

    // 保存草稿
    saveDraftBtn.addEventListener('click', async () => {
      await this.handleSubmit(form, true, assignmentId);
    });

    // 發佈任務
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(form, false, assignmentId);
    });

    // 返回
    backBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'assignments' } }));
    });
    
    // 展开式编辑器事件
    this.bindInlineEditorEvents();
    
    console.log('✅ 表單事件綁定完成');
  }
  
  /**
   * 🚨 階段 3.5.2.2：綁定格式選擇卡片事件
   */
  bindFormatSelectionEvents() {
    // 從零開始卡片
    const scratchCard = this.container.querySelector('#startFromScratchCard');
    if (scratchCard) {
      scratchCard.addEventListener('click', () => this.selectStartPoint('scratch'));
    }
    
    // 系統格式卡片（使用事件代理）
    const cardList = this.container.querySelector('#systemFormatsCardList');
    if (cardList) {
      cardList.addEventListener('click', (e) => {
        const card = e.target.closest('.format-selection-card');
        if (card) {
          const formatId = card.getAttribute('data-format-id');
          if (formatId) {
            this.selectStartPoint(formatId);
          }
        }
      });
    }
    
    // 加載預覽按鈕
    const loadPreviewBtn = this.container.querySelector('#loadPreviewBtn');
    if (loadPreviewBtn) {
      loadPreviewBtn.addEventListener('click', () => this.loadFormatPreview());
    }
  }
  
  /**
   * 🚨 階段 3.5.2.2：選擇起點（卡片點擊處理）
   */
  selectStartPoint(formatId) {
    console.log('[AssignmentCreator] 選擇起點:', formatId);
    
    // 更新所有卡片的選中狀態
    const allCards = this.container.querySelectorAll('.format-selection-card');
    const scratchCard = this.container.querySelector('#startFromScratchCard');
    const loadPreviewBtn = this.container.querySelector('#loadPreviewBtn');
    
    // 重置所有卡片樣式
    allCards.forEach(card => {
      card.classList.remove('border-blue-500', 'bg-blue-50');
      card.classList.add('border-gray-200');
      const checkmark = card.querySelector('.format-checkmark');
      if (checkmark) checkmark.classList.add('hidden');
    });
    
    if (scratchCard) {
      scratchCard.classList.remove('border-blue-500', 'bg-blue-50');
      scratchCard.classList.add('border-gray-200');
      const scratchCheck = scratchCard.querySelector('#scratchCheckmark');
      if (scratchCheck) scratchCheck.classList.add('hidden');
    }
    
    if (formatId === 'scratch') {
      // 選擇從零開始
      this.selectedTemplateId = null;
      this.currentMode = 'custom';
      this.hasBeenOptimized = false;
      this.originalContent = '';
      this.cachedFormatJSON = null;
      
      // 更新從零開始卡片樣式
      if (scratchCard) {
        scratchCard.classList.remove('border-gray-200');
        scratchCard.classList.add('border-blue-500', 'bg-blue-50');
        const scratchCheck = scratchCard.querySelector('#scratchCheckmark');
        if (scratchCheck) scratchCheck.classList.remove('hidden');
      }
      
      // 禁用加載預覽按鈕
      if (loadPreviewBtn) loadPreviewBtn.disabled = true;
      
      // 展開編輯器
      this.expandInlineEditor();
      
      // 清空編輯器
      if (this.inlineQuill) {
        this.inlineQuill.setText('');
      }
      
    } else {
      // 選擇系統格式
      this.selectedTemplateId = formatId;
      this.currentMode = 'direct';  // 暫時設為 direct，加載預覽後確認
      
      // 更新選中的卡片樣式
      const selectedCard = this.container.querySelector(`.format-selection-card[data-format-id="${formatId}"]`);
      if (selectedCard) {
        selectedCard.classList.remove('border-gray-200');
        selectedCard.classList.add('border-blue-500', 'bg-blue-50');
        const checkmark = selectedCard.querySelector('.format-checkmark');
        if (checkmark) checkmark.classList.remove('hidden');
      }
      
      // 啟用加載預覽按鈕
      if (loadPreviewBtn) loadPreviewBtn.disabled = false;
    }
    
    // 更新狀態
    this.updateButtonStates();
    this.updateStatus();
    
    console.log('[AssignmentCreator] 起點已選擇，模式:', this.currentMode);
  }
  
  /**
   * 🚨 階段 3.5.2.3：加載格式預覽
   */
  async loadFormatPreview() {
    if (!this.selectedTemplateId) {
      alert('請先選擇一個系統格式');
      return;
    }
    
    const loadPreviewBtn = this.container.querySelector('#loadPreviewBtn');
    const originalText = loadPreviewBtn?.textContent;
    
    try {
      if (loadPreviewBtn) {
        loadPreviewBtn.disabled = true;
        loadPreviewBtn.textContent = '⏳ 加載中...';
      }
      
      console.log('[AssignmentCreator] 加載格式預覽:', this.selectedTemplateId);
      
      // 從數據庫加載格式
      const format = await FormatEditorCore.loadSystemFormat(
        this.selectedTemplateId,
        this.assignmentManager.supabase
      );
      
      if (!format) {
        throw new Error('格式不存在');
      }
      
      console.log('[AssignmentCreator] 格式已加載:', format.name);
      
      // 展開編輯器（如果還沒展開）
      if (!this.isInlineEditorExpanded) {
        this.expandInlineEditor();
      }
      
      // 轉換 JSON 為人類可讀格式
      let humanReadable = '';
      if (format.human_input) {
        // 優先使用保存的 human_input
        humanReadable = format.human_input;
      } else if (format.spec_json) {
        // 否則從 JSON 轉換
        humanReadable = FormatEditorCore.formatJSONToHumanReadable(format.spec_json);
      }
      
      // 顯示在編輯器中
      if (this.inlineQuill && humanReadable) {
        this.inlineQuill.setText(humanReadable);
        this.originalContent = humanReadable;  // 設置基線內容
      }
      
      // 設置狀態
      this.currentMode = 'direct';  // 直接使用系統格式
      this.hasBeenOptimized = true;  // 系統格式已優化
      this.cachedFormatJSON = format.spec_json;
      this.cachedFormatData = {
        human_input: humanReadable,
        spec_json: format.spec_json
      };
      
      // 更新按鈕狀態和狀態面板
      this.updateButtonStates();
      this.updateStatus();
      
      console.log('[AssignmentCreator] 預覽已加載，模式:', this.currentMode);
      
    } catch (error) {
      console.error('[AssignmentCreator] 加載預覽失敗:', error);
      alert('加載預覽失敗：' + error.message);
    } finally {
      if (loadPreviewBtn) {
        loadPreviewBtn.disabled = false;
        loadPreviewBtn.textContent = originalText || '📄 加載預覽';
      }
    }
  }

  /**
   * 绑定展开式编辑器事件
   */
  bindInlineEditorEvents() {
    const closeEditorBtn = this.container.querySelector('#closeInlineEditorBtn');
    const clearBtn = this.container.querySelector('#inlineClearBtn');
    const optimizeBtn = this.container.querySelector('#inlineOptimizeBtn');
    const saveBtn = this.container.querySelector('#inlineSaveBtn');
    const cancelSaveBtn = this.container.querySelector('#cancelSaveFormatBtn');
    const confirmSaveBtn = this.container.querySelector('#confirmSaveFormatBtn');
    
    if (closeEditorBtn) {
      closeEditorBtn.addEventListener('click', () => this.collapseInlineEditor());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleInlineClear());
    }
    
    if (optimizeBtn) {
      optimizeBtn.addEventListener('click', () => this.handleInlineOptimize());
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleInlineSave());
    }
    
    if (cancelSaveBtn) {
      cancelSaveBtn.addEventListener('click', () => {
        this.container.querySelector('#saveFormatDialog').classList.add('hidden');
      });
    }
    
    if (confirmSaveBtn) {
      confirmSaveBtn.addEventListener('click', () => this.handleConfirmSaveFormat());
    }
  }
  
  /**
   * 展开内联编辑器
   */
  expandInlineEditor() {
    const editorContainer = this.container.querySelector('#inlineEditorContainer');
    const templateSelector = this.container.querySelector('#templateSelector');
    
    if (!editorContainer) return;
    
    // 清空并禁用下拉菜单
    templateSelector.value = '';
    templateSelector.disabled = true;
    this.selectedTemplateId = null;
    
    // 显示编辑器
    editorContainer.classList.remove('hidden');
    this.isInlineEditorExpanded = true;
    
    // 初始化 Quill（如果还未初始化）
    if (!this.inlineQuill) {
      try {
        this.inlineQuill = FormatEditorCore.initQuill('#inline-quill-editor', {
          placeholder: '請輸入寫作要求...\n\n例如：\n論文總字數 1500-2000 字\n必須 3 個分論點\n詳細分析紅樓夢中林黛玉和薛寶釵的外貌描寫'
        });
        
        // 设置草稿自动保存
        this.draftCleanup = FormatEditorCore.setupDraftAutoSave(
          this.inlineQuill,
          'format-editor-draft-inline'  // 任务创建专用 key
        );
        
        // 询问恢复草稿
        FormatEditorCore.askRestoreDraft('format-editor-draft-inline', this.inlineQuill);
        
        // 🚨 階段 3.5.1.7：綁定內容變化監聽
        this.inlineQuill.on('text-change', () => {
          this.handleContentChange();
        });
        
        console.log('[AssignmentCreator] 内联编辑器已初始化');
      } catch (error) {
        console.error('[AssignmentCreator] 编辑器初始化失败:', error);
        alert('编辑器初始化失败：' + error.message);
      }
    }
    
    // 初始化後更新狀態
    this.updateButtonStates();
    this.updateStatus();
  }
  
  /**
   * 🚨 階段 3.5.1.7：處理內容變化
   */
  handleContentChange() {
    if (!this.inlineQuill) return;
    
    const content = this.inlineQuill.getText().trim();
    
    // 檢測模式變化：如果用戶修改了從系統格式加載的內容
    if (this.selectedTemplateId && content !== this.originalContent) {
      if (this.currentMode === 'direct') {
        this.currentMode = 'incremental';
        console.log('[AssignmentCreator] 模式切換：direct → incremental（用戶修改了系統格式）');
      }
      // 內容被修改，重置優化狀態
      this.hasBeenOptimized = false;
      this.cachedFormatJSON = null;
    }
    
    // 更新按鈕狀態和狀態面板
    this.updateButtonStates();
    this.updateStatus();
  }
  
  /**
   * 🚨 階段 3.5.1.4：智能按鈕狀態管理
   */
  updateButtonStates() {
    const optimizeBtn = this.container?.querySelector('#inlineOptimizeBtn');
    const saveBtn = this.container?.querySelector('#inlineSaveBtn');
    
    if (!optimizeBtn || !saveBtn) return;
    
    const content = this.inlineQuill?.getText().trim() || '';
    
    // AI 優化按鈕邏輯
    if (this.currentMode === 'direct') {
      // direct 模式：系統格式已經優化過，禁用 AI 優化按鈕
      optimizeBtn.disabled = true;
      optimizeBtn.title = '系統格式已優化，無需再次優化';
    } else {
      // incremental 或 custom 模式：有內容且未優化時啟用
      optimizeBtn.disabled = !content || this.hasBeenOptimized;
      optimizeBtn.title = this.hasBeenOptimized 
        ? '已經優化過了'
        : content 
          ? '點擊進行 AI 優化'
          : '請先輸入內容';
    }
    
    // 保存按鈕邏輯
    if (this.currentMode === 'direct') {
      // direct 模式：只要有 JSON 就可以保存
      saveBtn.disabled = !this.cachedFormatJSON;
      saveBtn.title = this.cachedFormatJSON 
        ? '直接使用系統格式'
        : '請先加載預覽';
    } else {
      // incremental 或 custom 模式：必須優化後才能保存
      saveBtn.disabled = !this.hasBeenOptimized || !this.cachedFormatJSON;
      saveBtn.title = !this.hasBeenOptimized
        ? '⚠️ 必須先經過 AI 優化才能保存'
        : this.cachedFormatJSON
          ? '保存並使用此格式'
          : '請先進行 AI 優化';
    }
    
    console.log('[AssignmentCreator] 按鈕狀態已更新:', {
      mode: this.currentMode,
      optimized: this.hasBeenOptimized,
      hasJSON: !!this.cachedFormatJSON,
      optimizeBtnDisabled: optimizeBtn.disabled,
      saveBtnDisabled: saveBtn.disabled
    });
  }
  
  /**
   * 🚨 階段 3.5.1.6：更新狀態面板
   */
  updateStatus() {
    const statusMode = this.container?.querySelector('#statusMode');
    const statusOptimized = this.container?.querySelector('#statusOptimized');
    const statusCanSave = this.container?.querySelector('#statusCanSave');
    
    if (!statusMode || !statusOptimized || !statusCanSave) return;
    
    // 模式文本映射
    const modeText = {
      'direct': '直接使用系統格式',
      'incremental': '基於系統格式修改',
      'custom': '從零開始自定義'
    };
    
    // 更新模式顯示
    statusMode.textContent = modeText[this.currentMode];
    statusMode.className = this.currentMode === 'direct' 
      ? 'font-medium text-green-600'
      : this.currentMode === 'incremental'
        ? 'font-medium text-orange-600'
        : 'font-medium text-blue-600';
    
    // 更新優化狀態
    statusOptimized.textContent = this.hasBeenOptimized ? '是 ✓' : '否';
    statusOptimized.className = this.hasBeenOptimized 
      ? 'font-medium text-green-600'
      : 'font-medium text-gray-600';
    
    // 更新保存狀態
    const canSave = (this.currentMode === 'direct' && this.cachedFormatJSON) ||
                    (this.hasBeenOptimized && this.cachedFormatJSON);
    statusCanSave.textContent = canSave ? '是 ✓' : '否';
    statusCanSave.className = canSave 
      ? 'font-medium text-green-600'
      : 'font-medium text-gray-600';
    
    console.log('[AssignmentCreator] 狀態面板已更新:', {
      mode: this.currentMode,
      optimized: this.hasBeenOptimized,
      canSave: canSave
    });
  }
  
  /**
   * 🚨 階段 3.5.3.5：清空內聯編輯器
   */
  handleInlineClear() {
    if (!this.inlineQuill) return;
    
    const text = this.inlineQuill.getText().trim();
    if (!text) {
      alert('編輯器已經是空的');
      return;
    }
    
    if (!confirm('確定要清空編輯器內容嗎？此操作無法撤銷。')) {
      return;
    }
    
    // 清空編輯器
    this.inlineQuill.setText('');
    
    // 重置所有狀態
    this.currentMode = 'custom';
    this.hasBeenOptimized = false;
    this.originalContent = '';
    this.cachedFormatJSON = null;
    this.cachedFormatData = null;
    
    // 更新按鈕狀態和狀態面板
    this.updateButtonStates();
    this.updateStatus();
    
    console.log('[AssignmentCreator] 編輯器已清空，狀態已重置');
  }
  
  /**
   * 折叠内联编辑器
   */
  collapseInlineEditor() {
    const editorContainer = this.container.querySelector('#inlineEditorContainer');
    const templateSelector = this.container.querySelector('#templateSelector');
    
    if (!editorContainer) return;
    
    // 隐藏编辑器
    editorContainer.classList.add('hidden');
    this.isInlineEditorExpanded = false;
    
    // 启用下拉菜单
    if (templateSelector) templateSelector.disabled = false;
    
    // 清空编辑器内容（草稿已通过 localStorage 保护）
    if (this.inlineQuill) {
      this.inlineQuill.setText('');
    }
    
    // 清空缓存和状态
    this.cachedFormatData = null;
    this.currentEditingFormatId = null;
    this.isEditingSystemTemplate = false;
    
    // 🚨 階段 3.5.1：重置狀態管理變量
    this.currentMode = 'custom';
    this.hasBeenOptimized = false;
    this.originalContent = '';
    this.cachedFormatJSON = null;
    
    console.log('[AssignmentCreator] 编辑器已折叠，所有狀態已重置');
  }
  
  /**
   * 处理内联 AI 优化
   */
  async handleInlineOptimize() {
    if (!this.inlineQuill) return;
    
    const text = this.inlineQuill.getText().trim();
    if (!text) {
      alert('請先輸入寫作要求');
      return;
    }
    
    const processingDiv = this.container.querySelector('#inlineAiProcessing');
    const optimizeBtn = this.container.querySelector('#inlineOptimizeBtn');
    
    try {
      processingDiv.classList.remove('hidden');
      optimizeBtn.disabled = true;
      
      const baseFormatId = this.container.querySelector('#baseFormatSelector')?.value || null;
      
      const result = await FormatEditorCore.optimizeWithAI(
        text,
        'custom',
        baseFormatId,
        this.assignmentManager.supabase
      );
      
      // 更新编辑器内容
      this.inlineQuill.setText(result.human_readable);
      
      // 缓存结果
      this.cachedFormatData = {
        human_input: result.human_readable,
        spec_json: result.format_json
      };
      
      // 🚨 階段 3.5.1：更新狀態管理變量
      this.hasBeenOptimized = true;
      this.cachedFormatJSON = result.format_json;
      this.originalContent = result.human_readable;  // 更新基線內容
      
      // 更新按鈕狀態和狀態面板
      this.updateButtonStates();
      this.updateStatus();
      
      alert('✅ AI 優化完成！');
      console.log('[AssignmentCreator] AI 优化完成，狀態已更新');
    } catch (error) {
      console.error('[AssignmentCreator] AI 优化失败:', error);
      alert('AI 優化失敗：' + error.message);
    } finally {
      processingDiv.classList.add('hidden');
      // 不要在這裡禁用按鈕，讓 updateButtonStates 控制
      this.updateButtonStates();
    }
  }
  
  /**
   * 处理内联保存（打开对话框）
   */
  handleInlineSave() {
    const text = this.inlineQuill?.getText().trim();
    if (!text) {
      alert('請先輸入寫作要求');
      return;
    }
    
    // 🚨 階段 3.5.1.3：強制 AI 優化檢查邏輯
    if (!this.hasBeenOptimized && this.currentMode !== 'direct') {
      alert('⚠️ 必須先經過 AI 優化才能保存！\n\n當前模式：' + 
            (this.currentMode === 'incremental' ? '基於系統格式修改' : '從零開始自定義') +
            '\n請點擊「AI 優化」按鈕進行優化。');
      return;
    }
    
    // 🚨 統一使用 cachedFormatJSON 檢查
    if (!this.cachedFormatJSON) {
      alert('請先使用 AI 優化生成格式 JSON');
      return;
    }
    
    const dialog = this.container.querySelector('#saveFormatDialog');
    const nameInput = this.container.querySelector('#saveFormatName');
    const typeRadios = this.container.querySelectorAll('input[name="formatType"]');
    
    // 根据当前状态设置默认值和提示
    if (this.isEditingSystemTemplate) {
      // 基于系统模板修改 -> 必须另存为新模板
      if (nameInput) nameInput.value = this.selectedTemplate.name + '（副本）';
      // 禁用"通用模板"选项
      typeRadios.forEach(radio => radio.disabled = false);
    } else if (this.currentEditingFormatId) {
      // 修改自己的模板 -> 可以直接更新
      if (nameInput) nameInput.value = this.selectedTemplate.name;
      typeRadios.forEach(radio => radio.disabled = false);
    } else {
      // 新建模板
      if (nameInput) nameInput.value = '';
      typeRadios.forEach(radio => radio.disabled = false);
    }
    
    // 打开保存对话框
    if (dialog) dialog.classList.remove('hidden');
  }
  
  /**
   * 确认保存格式
   */
  async handleConfirmSaveFormat() {
    const name = this.container.querySelector('#saveFormatName').value.trim();
    const description = this.container.querySelector('#saveFormatDesc').value.trim();
    const formatType = this.container.querySelector('input[name="formatType"]:checked')?.value;
    
    if (!name) {
      alert('請輸入名稱');
      return;
    }
    
    try {
      const formatData = {
        name: name,
        description: description,
        spec_json: this.cachedFormatJSON,  // 🚨 修復：使用統一的變量
        human_input: this.inlineQuill.getText().trim(),
        is_template: formatType === 'template',  // 是否为通用模板
        parent_spec_id: this.isEditingSystemTemplate ? this.selectedTemplateId : null
      };
      
      // 判断是更新还是创建
      let result;
      if (this.currentEditingFormatId && !this.isEditingSystemTemplate) {
        // 更新自己的模板
        formatData.id = this.currentEditingFormatId;
        result = await FormatEditorCore.saveFormat(formatData, this.assignmentManager.supabase);
        console.log('[AssignmentCreator] 模板已更新:', result.id);
      } else {
        // 创建新模板（包括基于系统模板的副本）
        result = await FormatEditorCore.saveFormat(formatData, this.assignmentManager.supabase);
        console.log('[AssignmentCreator] 新模板已創建:', result.id);
      }
      
      // 🚨 階段 3.5.4.3：保存成功後清除草稿
      FormatEditorCore.clearDraft('format-editor-draft-inline');
      
      // 🚨 停止草稿自動保存監聽
      if (this.draftCleanup) {
        this.draftCleanup();
        this.draftCleanup = null;
      }
      
      // 关闭对话框
      this.container.querySelector('#saveFormatDialog').classList.add('hidden');
      
      // 折叠编辑器
      this.collapseInlineEditor();
      
      // 重新加载写作要求列表
      await this.loadFormatSpecifications();
      
      // 自动选中保存的格式
      const templateSelector = this.container.querySelector('#templateSelector');
      templateSelector.value = result.id;
      this.selectedTemplateId = result.id;
      
      // 重新展开并显示（现在是已保存的版本）
      await this.handleTemplateChange(result.id);
      
      const message = this.currentEditingFormatId && !this.isEditingSystemTemplate
        ? '✅ 寫作要求已更新！'
        : formatType === 'template'
          ? '✅ 通用模板已保存！您可以在模板庫中查看和編輯。'
          : '✅ 寫作要求已保存！';
      
      alert(message);
    } catch (error) {
      console.error('[AssignmentCreator] 保存失败:', error);
      alert('保存失敗：' + error.message);
    }
  }

  /**
   * 🚨 階段 3.5.2.1：加載寫作要求列表並生成卡片（從 Supabase）
   */
  async loadFormatSpecifications() {
    try {
      const { data: { session } } = await this.assignmentManager.supabase.auth.getSession();
      if (!session) {
        console.warn('未登錄，無法加載寫作要求');
        return;
      }

      // 查詢所有可用的寫作要求（系統 + 自己的）
      const { data: formats, error } = await this.assignmentManager.supabase
        .from('format_specifications')
        .select('id, name, description, is_system, essay_type')
        .or(`is_system.eq.true,created_by.eq.${session.user.id}`)
        .order('is_system', { ascending: false })  // 系統格式優先
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加載寫作要求失敗:', error);
        return;
      }

      // 保存格式列表供後續使用
      this.allFormats = formats;

      // 🚨 生成系統格式卡片
      const cardList = this.container.querySelector('#systemFormatsCardList');
      if (!cardList) return;

      const systemFormats = formats.filter(f => f.is_system);
      
      if (systemFormats.length === 0) {
        cardList.innerHTML = '<p class="text-sm text-gray-500">暫無系統寫作要求</p>';
      } else {
        cardList.innerHTML = systemFormats.map(format => `
          <div 
            class="format-selection-card p-4 border-2 border-gray-200 rounded-lg cursor-pointer transition hover:border-blue-400 hover:shadow-md"
            data-format-id="${format.id}"
          >
            <div class="flex items-center gap-3">
              <div style="font-size: 1.5rem;">📖</div>
              <div class="flex-1">
                <h4 class="font-semibold text-gray-800" style="margin: 0; font-size: 0.95rem;">${this.escapeHtml(format.name)}</h4>
                ${format.description ? `<p class="text-xs text-gray-600" style="margin: 0.25rem 0 0 0;">${this.escapeHtml(format.description)}</p>` : ''}
              </div>
              <div class="format-checkmark text-blue-600 font-bold hidden" style="font-size: 1.5rem;">✓</div>
            </div>
          </div>
        `).join('');
      }

      console.log('✅ 寫作要求卡片已生成:', formats.length, '個（系統:', systemFormats.length, '個）');
    } catch (error) {
      console.error('加載寫作要求失敗:', error);
    }
  }
  
  /**
   * 🚨 輔助方法：HTML 轉義
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 處理模板變更（從 Supabase 查詢）
   */
  async handleTemplateChange(templateId) {
    if (!templateId) {
      this.selectedTemplate = null;
      this.selectedTemplateId = null;
      this.collapseInlineEditor();
      return;
    }

    // 如果选择"从零开始创建"
    if (templateId === '__create_new__') {
      this.selectedTemplate = null;
      this.selectedTemplateId = null;
      this.currentEditingFormatId = null;
      this.isEditingSystemTemplate = false;
      
      // 🚨 階段 3.5.1：設置正確的模式和狀態
      this.currentMode = 'custom';
      this.hasBeenOptimized = false;
      this.originalContent = '';
      this.cachedFormatJSON = null;
      
      this.expandInlineEditor();
      return;
    }

    try {
      // 從 Supabase 查詢寫作要求詳情
      const { data: formatSpec, error } = await this.assignmentManager.supabase
        .from('format_specifications')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      
      this.selectedTemplate = formatSpec;
      this.selectedTemplateId = templateId;
      this.currentEditingFormatId = formatSpec.is_system ? null : templateId;
      this.isEditingSystemTemplate = formatSpec.is_system;

      // 🚨 階段 3.5.1：設置正確的模式和狀態
      // 如果是系統格式，模式為 direct；如果是自定義格式，模式為 custom（可編輯）
      if (formatSpec.is_system) {
        this.currentMode = 'direct';
        this.hasBeenOptimized = true;  // 系統格式已經優化過
        this.cachedFormatJSON = formatSpec.spec_json;
      } else {
        this.currentMode = 'custom';
        this.hasBeenOptimized = true;  // 已保存的格式視為已優化
        this.cachedFormatJSON = formatSpec.spec_json;
      }

      // 展开编辑器并显示内容
      this.expandInlineEditor();
      
      // 在编辑器中显示 human_input
      if (this.inlineQuill && formatSpec.human_input) {
        this.inlineQuill.setText(formatSpec.human_input);
        this.originalContent = formatSpec.human_input;  // 設置基線內容
      }
      
      // 更新按鈕狀態和狀態面板
      this.updateButtonStates();
      this.updateStatus();

      console.log('✅ 已選擇寫作要求:', formatSpec.name, 
                  formatSpec.is_system ? '（系統模板）' : '（自定義模板）',
                  '模式:', this.currentMode);
    } catch (error) {
      console.error('加載寫作要求失敗:', error);
      alert('加載寫作要求失敗：' + error.message);
    }
  }

  /**
   * 處理表單提交
   */
  async handleSubmit(form, isDraft, assignmentId) {
    try {
      const formData = new FormData(form);

      if (!this.selectedTemplateId) {
        alert('請選擇寫作要求');
        return;
      }

      // 獲取選中的評分標準
      const selectedCriteria = Array.from(form.querySelectorAll('input[name="rubric-criteria"]:checked'))
        .map(checkbox => checkbox.value);
      
      if (selectedCriteria.length === 0) {
        alert('請至少選擇一個評分標準');
        return;
      }

      // 加載完整的評分標準
      const fullRubric = this.assignmentManager.loadBuiltInRubric(formData.get('rubric'));
      
      // 過濾選中的標準
      const filteredRubric = {
        ...fullRubric,
        criteria: fullRubric.criteria.filter(criterion => 
          selectedCriteria.includes(criterion.id)
        )
      };

      const assignmentData = {
        title: formData.get('title'),
        dueDate: formData.get('dueDate'),
        formatSpecId: this.selectedTemplateId,  // 引用模式：保存格式ID
        gradingRubricJson: filteredRubric,  // 只包含選中的標準
        isDraft
      };

      // 禁用提交按鈕
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';

      let result;
      if (assignmentId) {
        // 更新現有任務
        result = await this.assignmentManager.updateAssignment(assignmentId, {
          ...assignmentData,
          is_published: !isDraft
        });
      } else {
        // 創建新任務
        result = await this.assignmentManager.createAssignment(assignmentData);
      }

      // 顯示成功消息
      this.showToast('success', isDraft ? '草稿已保存' : '任務已發佈');

      // 返回任務列表
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'assignments' } }));
      }, 1000);

    } catch (error) {
      console.error('保存任務失敗:', error);
      alert('保存任務失敗：' + error.message);

      // 恢复按鈕
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = assignmentId ? '更新任務' : '發佈任務';
    }
  }

  /**
   * 獲取空白模板
   */
  getEmptyTemplate() {
    return {
      id: 'custom',
      name: '自定義格式',
      description: '自定義論文格式要求',
      paragraph_types: {
        introduction: {
          name: '引言',
          required_elements: []
        },
        body_paragraph: {
          name: '正文段落',
          required_elements: []
        },
        conclusion: {
          name: '結论',
          required_elements: []
        }
      }
    };
  }

  /**
   * 顯示提示消息
   */
  showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

export default AssignmentCreator;

