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
            
            <div class="form-group">
              <label>選擇寫作要求 <span class="required">*</span></label>
              <select id="templateSelector" name="template" required>
                <option value="">-- 請選擇寫作要求 --</option>
                <!-- 選項將動態加載 -->
              </select>
              <p class="help-text">寫作要求定義了論文的結构、內容要求和评价维度</p>
            </div>

            <div class="form-group" style="margin-top: 0.5rem;">
              <button 
                type="button"
                id="createNewFormatBtn"
                class="text-blue-600 hover:text-blue-700 text-sm bg-transparent border-none cursor-pointer p-0"
              >
                <i class="fas fa-plus-circle"></i> 創建新寫作要求
              </button>
            </div>

            <div id="templatePreview" class="template-preview" style="display: none;">
              <!-- 預覽將動態填充 -->
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
              
              <!-- 起点选择（可选） -->
              <div id="startPointSelector" class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">選擇起點（可選）</label>
                <select id="baseFormatSelector" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">從零開始</option>
                  <!-- 系统格式选项将动态加载 -->
                </select>
              </div>
              
              <!-- Quill 编辑器 -->
              <div id="inline-quill-editor" class="bg-white border border-gray-300 rounded-lg p-4 mb-4" style="min-height: 300px;">
                <!-- Quill 将在这里初始化 -->
              </div>
              
              <!-- 操作按钮 -->
              <div class="flex justify-end gap-3">
                <button 
                  type="button"
                  id="inlineOptimizeBtn"
                  class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  <i class="fas fa-magic mr-2"></i>AI 優化
                </button>
                <button 
                  type="button"
                  id="inlineSaveBtn"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
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
    const templateSelector = this.container.querySelector('#templateSelector');
    const saveDraftBtn = this.container.querySelector('#saveDraftBtn');
    const backBtn = this.container.querySelector('#backBtn');

    console.log('🔍 查找表單元素:', {
      form: !!form,
      templateSelector: !!templateSelector,
      saveDraftBtn: !!saveDraftBtn,
      backBtn: !!backBtn,
      container: this.container
    });

    if (!form) {
      console.error('❌ 找不到表單元素 #assignmentForm');
      return;
    }
    if (!templateSelector) {
      console.error('❌ 找不到模板選擇器 #templateSelector');
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

    // 模板選擇
    templateSelector.addEventListener('change', async (e) => {
      await this.handleTemplateChange(e.target.value);
    });

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
   * 绑定展开式编辑器事件
   */
  bindInlineEditorEvents() {
    const createNewBtn = this.container.querySelector('#createNewFormatBtn');
    const closeEditorBtn = this.container.querySelector('#closeInlineEditorBtn');
    const optimizeBtn = this.container.querySelector('#inlineOptimizeBtn');
    const saveBtn = this.container.querySelector('#inlineSaveBtn');
    const cancelSaveBtn = this.container.querySelector('#cancelSaveFormatBtn');
    const confirmSaveBtn = this.container.querySelector('#confirmSaveFormatBtn');
    
    if (createNewBtn) {
      createNewBtn.addEventListener('click', () => this.expandInlineEditor());
    }
    
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
        
        console.log('[AssignmentCreator] 内联编辑器已初始化');
      } catch (error) {
        console.error('[AssignmentCreator] 编辑器初始化失败:', error);
        alert('编辑器初始化失败：' + error.message);
      }
    }
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
    templateSelector.disabled = false;
    
    // 清空编辑器内容（草稿已通过 localStorage 保护）
    if (this.inlineQuill) {
      this.inlineQuill.setText('');
    }
    
    // 清空缓存
    this.cachedFormatData = null;
    
    console.log('[AssignmentCreator] 编辑器已折叠');
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
      
      alert('✅ AI 優化完成！');
      console.log('[AssignmentCreator] AI 优化完成');
    } catch (error) {
      console.error('[AssignmentCreator] AI 优化失败:', error);
      alert('AI 優化失敗：' + error.message);
    } finally {
      processingDiv.classList.add('hidden');
      optimizeBtn.disabled = false;
    }
  }
  
  /**
   * 处理内联保存（打开对话框）
   */
  handleInlineSave() {
    if (!this.cachedFormatData || !this.cachedFormatData.spec_json) {
      alert('請先使用 AI 優化');
      return;
    }
    
    // 打开保存对话框
    this.container.querySelector('#saveFormatDialog').classList.remove('hidden');
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
        spec_json: this.cachedFormatData.spec_json,
        human_input: this.inlineQuill.getText().trim(),
        is_template: formatType === 'template',  // 是否为通用模板
        parent_spec_id: null
      };
      
      const result = await FormatEditorCore.saveFormat(
        formatData,
        this.assignmentManager.supabase
      );
      
      console.log('[AssignmentCreator] 格式已保存:', result.id);
      
      // 清除草稿
      FormatEditorCore.clearDraft('format-editor-draft-inline');
      
      // 关闭对话框
      this.container.querySelector('#saveFormatDialog').classList.add('hidden');
      
      // 折叠编辑器
      this.collapseInlineEditor();
      
      // 重新加载写作要求列表
      await this.loadFormatSpecifications();
      
      // 自动选中新创建的格式
      const templateSelector = this.container.querySelector('#templateSelector');
      templateSelector.value = result.id;
      this.selectedTemplateId = result.id;
      
      // 显示预览
      await this.handleTemplateChange(result.id);
      
      alert(formatType === 'template' 
        ? '✅ 通用模板已保存並自動選中！您可以在模板庫中查看和編輯。' 
        : '✅ 寫作要求已保存並自動選中！');
    } catch (error) {
      console.error('[AssignmentCreator] 保存失败:', error);
      alert('保存失敗：' + error.message);
    }
  }

  /**
   * 加載寫作要求列表（從 Supabase）
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
      const selector = this.container.querySelector('#templateSelector');
      if (!selector) return;

      // 保留默認選項
      selector.innerHTML = '<option value="">-- 請選擇寫作要求 --</option>';

      // 添加系統寫作要求
      const systemFormats = formats.filter(f => f.is_system);
      if (systemFormats.length > 0) {
        const systemOptgroup = document.createElement('optgroup');
        systemOptgroup.label = '📚 系統寫作要求';
        systemFormats.forEach(format => {
          const option = document.createElement('option');
          option.value = format.id;
          option.textContent = format.name;
          systemOptgroup.appendChild(option);
        });
        selector.appendChild(systemOptgroup);
      }

      // 添加自定義寫作要求
      const customFormats = formats.filter(f => !f.is_system);
      if (customFormats.length > 0) {
        const customOptgroup = document.createElement('optgroup');
        customOptgroup.label = '✏️ 我的寫作要求';
        customFormats.forEach(format => {
          const option = document.createElement('option');
          option.value = format.id;
          option.textContent = format.name;
          customOptgroup.appendChild(option);
        });
        selector.appendChild(customOptgroup);
      }

      console.log('✅ 寫作要求列表已加載:', formats.length, '個');
    } catch (error) {
      console.error('加載寫作要求失敗:', error);
    }
  }

  /**
   * 處理模板變更（從 Supabase 查詢）
   */
  async handleTemplateChange(templateId) {
    if (!templateId) {
      this.selectedTemplate = null;
      this.selectedTemplateId = null;
      return;
    }

    try {
      // 保存格式ID（引用模式）
      this.selectedTemplateId = templateId;
      
      // 從 Supabase 查詢寫作要求詳情
      const { data: formatSpec, error } = await this.assignmentManager.supabase
        .from('format_specifications')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      
      this.selectedTemplate = formatSpec;

      // 顯示預覽（使用 human_input）
      const preview = this.container.querySelector('#templatePreview');
      if (preview && formatSpec) {
        preview.style.display = 'block';
        preview.innerHTML = `
          <div style="padding: 1rem; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #3498db;">
            <h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">
              <i class="fas fa-check-circle" style="color: #3498db;"></i> ${formatSpec.name}
            </h4>
            <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem; white-space: pre-wrap;">
              ${formatSpec.human_input ? formatSpec.human_input.substring(0, 200) + '...' : formatSpec.description}
            </p>
            <a href="format-editor.html?view=${formatSpec.id}" target="_blank" class="text-blue-600 hover:text-blue-700 text-sm" style="margin-top: 0.5rem; display: inline-block;">
              <i class="fas fa-eye"></i> 查看完整要求
            </a>
          </div>
        `;
      }
      
      console.log('✅ 寫作要求已選擇:', formatSpec.name);
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

