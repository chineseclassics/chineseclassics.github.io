/**
 * 任務創建器 UI（精简版）
 * MVP 阶段實現核心功能
 */

import AssignmentManager from './assignment-manager.js';
import FormatEditorCore from './format-editor-core.js';
import toast from './toast.js';

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
    
    // 🚨 任務專用格式（當前會話臨時保存）
    this.currentTaskFormatId = null;  // 本次任務的專用格式ID
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

          <!-- 寫作指引 -->
          <section class="form-section">
            <h3><i class="fas fa-file-alt" style="color: #3498db; margin-right: 0.5rem;"></i>寫作指引</h3>
            
            <!-- 下拉菜單選擇寫作指引 -->
            <div class="form-group">
              <label>選擇寫作指引 <span class="required">*</span></label>
              <select id="formatSelector" name="formatSpec" required>
                <option value="">-- 請選擇寫作指引 --</option>
                <option value="__create_new__">✨ 新建寫作指引</option>
                <!-- 選項將動態加載 -->
              </select>
              <p class="help-text">選擇系統寫作指引模板、我的通用模板或新建寫作指引</p>
            </div>

            <!-- 展开式编辑器区域（選擇後顯示） -->
            <div id="inlineEditorContainer" class="hidden" style="margin-top: 1.5rem; border: 2px solid #3498db; border-radius: 8px; padding: 1.5rem; background: #f8f9fa;">
              <div class="flex justify-between items-center mb-4">
                <h4 id="inlineEditorTitle" class="text-lg font-bold text-gray-900">
                  <i class="fas fa-magic text-purple-600 mr-2"></i>編輯寫作指引
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
              <h3 class="text-xl font-bold mb-4">保存寫作指引</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">保存類型</label>
                  <div class="space-y-2">
                    <label class="flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="formatType" 
                        value="task-only" 
                        checked
                        class="mr-2"
                      />
                      <span>本次任務專用（寫作指引）</span>
                    </label>
                    <label class="flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="formatType" 
                        value="template"
                        class="mr-2"
                      />
                      <span>通用模板（寫作指引模板，可複用）</span>
                    </label>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">
                    💡 提示：模板類請在名稱中加「模板」二字，如「紅樓夢人物分析寫作指引模板」
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                  <input 
                    id="saveFormatName"
                    type="text" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="例如：紅樓夢人物分析寫作指引"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <textarea 
                    id="saveFormatDesc"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows="3"
                    placeholder="簡要描述這個寫作指引..."
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

    // 綁定寫作要求選擇器
    const formatSelector = this.container.querySelector('#formatSelector');
    if (formatSelector) {
      formatSelector.addEventListener('change', (e) => this.handleFormatSelection(e.target.value));
    }

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
   * 處理寫作要求選擇（下拉菜單）
   */
  async handleFormatSelection(formatId) {
    console.log('[AssignmentCreator] 選擇寫作要求:', formatId);
    
    if (!formatId) {
      // 未選擇，折疊編輯器
      this.collapseInlineEditor();
      return;
    }
    
    if (formatId === '__create_new__') {
      // 新建寫作要求
      this.selectedTemplateId = null;
      this.currentMode = 'custom';
      this.hasBeenOptimized = false;
      this.originalContent = '';
      this.cachedFormatJSON = null;
      
      this.expandInlineEditor();
      
      if (this.inlineQuill) {
        this.inlineQuill.setText('');
      }
      
      this.updateButtonStates();
      this.updateStatus();
      return;
    }
    
    // 選擇已有格式（系統或自定義）
    try {
      const format = await FormatEditorCore.loadSystemFormat(
        formatId,
        this.assignmentManager.supabase
      );
      
      if (!format) {
        throw new Error('格式不存在');
      }
      
      this.selectedTemplateId = formatId;
      
      // 展開編輯器
      this.expandInlineEditor();
      
      // 顯示內容
      let humanReadable = format.human_input || '';
      if (!humanReadable && format.spec_json) {
        humanReadable = FormatEditorCore.formatJSONToHumanReadable(format.spec_json);
      }
      
      if (this.inlineQuill && humanReadable) {
        this.inlineQuill.setText(humanReadable);
        this.originalContent = humanReadable;
      }
      
      // 設置狀態
      if (format.is_system) {
        // 系統格式：可以直接使用
        this.currentMode = 'direct';
        this.hasBeenOptimized = true;
        this.cachedFormatJSON = format.spec_json;
      } else {
        // 自定義格式：視為已優化
        this.currentMode = 'custom';
        this.hasBeenOptimized = true;
        this.cachedFormatJSON = format.spec_json;
      }
      
      this.updateButtonStates();
      this.updateStatus();
      
      console.log('[AssignmentCreator] 格式已加載:', format.name, '模式:', this.currentMode);
    } catch (error) {
      console.error('[AssignmentCreator] 加載格式失敗:', error);
      toast.error('加載格式失敗：' + error.message);
    }
  }

  /**
   * 绑定展开式编辑器事件
   */
  bindInlineEditorEvents() {
    const closeEditorBtn = this.container.querySelector('#closeInlineEditorBtn');
    const optimizeBtn = this.container.querySelector('#inlineOptimizeBtn');
    const saveBtn = this.container.querySelector('#inlineSaveBtn');
    const cancelSaveBtn = this.container.querySelector('#cancelSaveFormatBtn');
    const confirmSaveBtn = this.container.querySelector('#confirmSaveFormatBtn');
    
    if (closeEditorBtn) {
      closeEditorBtn.addEventListener('click', () => this.collapseInlineEditor());
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
    
    if (!editorContainer) return;
    
    // 🚨 修復：下拉菜單保持可用，讓用戶可以隨時切換
    // 不禁用 formatSelector
    
    // 显示编辑器
    editorContainer.classList.remove('hidden');
    this.isInlineEditorExpanded = true;
    
    // 初始化 Quill（如果还未初始化）
    if (!this.inlineQuill) {
      try {
        this.inlineQuill = FormatEditorCore.initQuill('#inline-quill-editor', {
          placeholder: '請輸入寫作指引...\n\n例如：\n論文總字數 1500-2000 字\n必須 3 個分論點\n詳細分析紅樓夢中林黛玉和薛寶釵的外貌描寫'
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
        toast.error('編輯器初始化失敗：' + error.message);
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
    const editorTitle = this.container?.querySelector('#inlineEditorTitle');
    
    if (!optimizeBtn || !saveBtn) return;
    
    const content = this.inlineQuill?.getText().trim() || '';
    
    // 🚨 動態更新標題
    if (editorTitle) {
      if (this.currentMode === 'direct' || this.currentMode === 'incremental') {
        editorTitle.innerHTML = '<i class="fas fa-magic text-purple-600 mr-2"></i>使用或自定義寫作指引模板';
      } else {
        editorTitle.innerHTML = '<i class="fas fa-magic text-purple-600 mr-2"></i>編輯寫作指引';
      }
    }
    
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
    
    // 🚨 動態更新保存按鈕文字和狀態
    if (this.currentMode === 'direct') {
      // direct 模式：直接使用系統格式
      saveBtn.innerHTML = '<i class="fas fa-check mr-2"></i>直接使用';
      saveBtn.disabled = !this.cachedFormatJSON;
      saveBtn.title = this.cachedFormatJSON 
        ? '直接使用此寫作指引模板'
        : '請先選擇寫作指引';
    } else {
      // incremental 或 custom 模式：保存並使用
      saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>保存並使用';
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
   * 折叠内联编辑器
   */
  collapseInlineEditor() {
    const editorContainer = this.container.querySelector('#inlineEditorContainer');
    
    if (!editorContainer) return;
    
    // 隐藏编辑器
    editorContainer.classList.add('hidden');
    this.isInlineEditorExpanded = false;
    
    // 🚨 不清空下拉菜單的選擇，保持當前選中狀態
    
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
      toast.warning('請先輸入寫作指引');
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
      
      toast.success('AI 優化完成！可以點擊「保存並使用」了');
      console.log('[AssignmentCreator] AI 优化完成，狀態已更新');
    } catch (error) {
      console.error('[AssignmentCreator] AI 优化失败:', error);
      toast.error('AI 優化失敗：' + error.message);
    } finally {
      processingDiv.classList.add('hidden');
      // 不要在這裡禁用按鈕，讓 updateButtonStates 控制
      this.updateButtonStates();
    }
  }
  
  /**
   * 🚨 處理直接使用系統格式（不保存）
   */
  handleDirectUse() {
    // 直接使用系統格式，不需要保存到數據庫
    this.selectedTemplateId = this.selectedTemplateId;  // 保持選中的系統格式ID
    
    // 折疊編輯器
    this.collapseInlineEditor();
    
    // 提示用戶
    toast.success('已選用此寫作指引模板！<br>請繼續完成任務設置。', 3000);
    
    console.log('[AssignmentCreator] 直接使用系統格式:', this.selectedTemplateId);
  }
  
  /**
   * 🚨 處理保存/直接使用
   */
  handleInlineSave() {
    const text = this.inlineQuill?.getText().trim();
    if (!text) {
      toast.warning('請先輸入寫作指引');
      return;
    }
    
    // 🚨 階段 3.5.1.3：強制 AI 優化檢查邏輯
    if (!this.hasBeenOptimized && this.currentMode !== 'direct') {
      const modeText = this.currentMode === 'incremental' ? '基於系統格式修改' : '從零開始自定義';
      toast.warning(`必須先經過 AI 優化才能保存！<br><br>當前模式：${modeText}<br>請點擊「AI 優化」按鈕進行優化。`, 4000);
      return;
    }
    
    // 🚨 統一使用 cachedFormatJSON 檢查
    if (!this.cachedFormatJSON) {
      toast.warning('請先使用 AI 優化生成格式 JSON');
      return;
    }
    
    // 🚨 direct 模式：直接使用，不打開保存對話框
    if (this.currentMode === 'direct') {
      this.handleDirectUse();
      return;
    }
    
    // incremental/custom 模式：打開保存對話框
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
      toast.warning('請輸入名稱');
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
      
      // 關閉對話框
      const saveDialog = this.container.querySelector('#saveFormatDialog');
      if (saveDialog) saveDialog.classList.add('hidden');
      
      // 🚨 保存後的處理
      if (formatType === 'template') {
        // 通用模板：記錄ID
        this.selectedTemplateId = result.id;
        
        // 重新加載列表
        await this.loadFormatSpecifications();
        
        // 折疊編輯器
        this.collapseInlineEditor();
        
        // 自動選中
        const formatSelector = this.container.querySelector('#formatSelector');
        if (formatSelector) {
          formatSelector.value = result.id;
        }
        
        toast.success('寫作指引模板已保存！<br>已自動選中此模板，您可以直接使用或繼續修改。', 4000);
      } else {
        // 任務專用格式：記錄為當前任務專用
        this.currentTaskFormatId = result.id;
        this.selectedTemplateId = result.id;
        
        // 重新加載列表（會顯示「本次任務專用」分組）
        await this.loadFormatSpecifications();
        
        // 折疊編輯器
        this.collapseInlineEditor();
        
        // 自動選中
        const formatSelector = this.container.querySelector('#formatSelector');
        if (formatSelector) {
          formatSelector.value = result.id;
        }
        
        toast.success('寫作指引已保存！<br>已自動選中，您可以繼續完成任務設置。', 4000);
      }
    } catch (error) {
      console.error('[AssignmentCreator] 保存失败:', error);
      toast.error('保存失敗：' + error.message);
    }
  }

  /**
   * 加載寫作要求列表到下拉菜單（從 Supabase）
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

      // 填充下拉菜單
      const selector = this.container.querySelector('#formatSelector');
      if (!selector) return;

      selector.innerHTML = `
        <option value="">-- 請選擇寫作要求 --</option>
        <option value="__create_new__">✨ 新建寫作要求</option>
      `;

      // 🚨 如果有本次任務專用格式，優先顯示
      if (this.currentTaskFormatId) {
        const taskFormat = formats.find(f => f.id === this.currentTaskFormatId);
        if (taskFormat) {
          const taskOptgroup = document.createElement('optgroup');
          taskOptgroup.label = '📝 本次任務';
          const option = document.createElement('option');
          option.value = taskFormat.id;
          option.textContent = taskFormat.name;  // 使用原名稱（應為「XXX 寫作指引」）
          taskOptgroup.appendChild(option);
          selector.appendChild(taskOptgroup);
        }
      }

      // 添加系統寫作指引模板
      const systemFormats = formats.filter(f => f.is_system);
      if (systemFormats.length > 0) {
        const systemOptgroup = document.createElement('optgroup');
        systemOptgroup.label = '📚 系統寫作指引模板';
        systemFormats.forEach(format => {
          const option = document.createElement('option');
          option.value = format.id;
          option.textContent = format.name;  // 應為「XXX 寫作指引模板」
          systemOptgroup.appendChild(option);
        });
        selector.appendChild(systemOptgroup);
      }

      // 添加我的通用模板（is_template = true）
      const templateFormats = formats.filter(f => !f.is_system && f.is_template);
      if (templateFormats.length > 0) {
        const templateOptgroup = document.createElement('optgroup');
        templateOptgroup.label = '✏️ 我的寫作指引模板';
        templateFormats.forEach(format => {
          const option = document.createElement('option');
          option.value = format.id;
          option.textContent = format.name;  // 應為「XXX 寫作指引模板」
          templateOptgroup.appendChild(option);
        });
        selector.appendChild(templateOptgroup);
      }

      console.log('✅ 寫作指引已加載到下拉菜單:', formats.length, '個');
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
   * 處理表單提交
   */
  async handleSubmit(form, isDraft, assignmentId) {
    try {
      const formData = new FormData(form);

      if (!this.selectedTemplateId) {
        toast.warning('請選擇寫作指引');
        return;
      }

      // 獲取選中的評分標準
      const selectedCriteria = Array.from(form.querySelectorAll('input[name="rubric-criteria"]:checked'))
        .map(checkbox => checkbox.value);
      
      if (selectedCriteria.length === 0) {
        toast.warning('請至少選擇一個評分標準');
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
      toast.error('保存任務失敗：' + error.message);

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

