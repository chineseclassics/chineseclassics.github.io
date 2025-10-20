/**
 * FormatTemplatePage - 模板库页面组件
 * 
 * 功能：
 * - 两种模式：列表模式（查看所有通用模板） + 编辑模式（整页编辑器）
 * - 使用 FormatEditorCore 作为共享组件
 * - 支持创建、编辑、删除、查看模板
 * - 只显示通用模板（is_template = true）和系统模板
 * 
 * @created 2025-10-20
 * @related teacher-custom-format-ai 阶段 3.4
 */

import FormatEditorCore from './format-editor-core.js';

class FormatTemplatePage {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentMode = 'list';  // 'list' | 'edit'
    this.editingFormatId = null;  // 正在编辑的格式 ID
    this.currentQuill = null;  // Quill 实例
    this.draftCleanup = null;  // 草稿清理函数
    this.cachedFormat = null;  // 缓存的格式数据
  }
  
  /**
   * 渲染页面（入口方法）
   */
  async render(container) {
    try {
      if (this.currentMode === 'list') {
        await this.renderListMode(container);
      } else if (this.currentMode === 'edit') {
        await this.renderEditMode(container);
      }
    } catch (error) {
      console.error('[FormatTemplatePage] 渲染失败:', error);
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
          <h3 class="text-xl font-bold text-gray-900 mb-2">加载失败</h3>
          <p class="text-gray-600">${error.message}</p>
        </div>
      `;
    }
  }
  
  // ============================================================
  // 列表模式
  // ============================================================
  
  /**
   * 渲染列表模式
   */
  async renderListMode(container) {
    this.container = container;  // 保存 container 引用
    container.innerHTML = `
      <div class="max-w-7xl mx-auto">
        <!-- 页面标题 -->
        <div class="mb-6 flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">📚 寫作模板庫</h2>
            <p class="text-gray-600 mt-1">查看和管理可複用的寫作要求模板</p>
          </div>
          <button 
            id="createNewBtn"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            style="box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);"
          >
            ➕ 創建新模板
          </button>
        </div>
        
        <!-- 加载状态 -->
        <div id="loadingState" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600">加載中...</p>
        </div>
        
        <!-- 模板列表 -->
        <div id="templateGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 hidden">
          <!-- 动态填充 -->
        </div>
        
        <!-- 空状态 -->
        <div id="emptyState" class="text-center py-12 hidden">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">還沒有自定義模板</h3>
          <p class="text-gray-600 mb-6">點擊「創建新模板」按鈕開始</p>
          <button 
            id="emptyCreateBtn"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            style="box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);"
          >
            ➕ 創建第一個模板
          </button>
        </div>
      </div>
      
      <!-- 查看详情模态框 -->
      <div id="detailModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-2xl font-bold text-gray-900" id="detailTitle">模板詳情</h3>
              <button id="closeDetailModalBtn" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            <div id="detailContent" class="prose max-w-none">
              <!-- 动态填充 -->
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 绑定事件
    this.bindListModeEvents();
    
    // 加载模板
    await this.loadTemplates();
  }
  
  /**
   * 绑定列表模式事件
   */
  bindListModeEvents() {
    // 创建按钮
    const createBtn = this.container.querySelector('#createNewBtn');
    const emptyCreateBtn = this.container.querySelector('#emptyCreateBtn');
    
    if (createBtn) {
      createBtn.onclick = () => this.switchToEditMode(null);
    }
    if (emptyCreateBtn) {
      emptyCreateBtn.onclick = () => this.switchToEditMode(null);
    }
    
    // 关闭模态框
    const closeModalBtn = this.container.querySelector('#closeDetailModalBtn');
    if (closeModalBtn) {
      closeModalBtn.onclick = () => {
        const modal = this.container.querySelector('#detailModal');
        if (modal) modal.classList.add('hidden');
      };
    }
  }
  
  /**
   * 加载模板列表
   */
  async loadTemplates() {
    const loadingState = this.container.querySelector('#loadingState');
    const templateGrid = this.container.querySelector('#templateGrid');
    const emptyState = this.container.querySelector('#emptyState');
    
    try {
      // 查询通用模板和系统模板
      const { data, error } = await this.supabase
        .from('format_specifications')
        .select('*')
        .or('is_template.eq.true,is_system.eq.true')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      this.allTemplates = data || [];
      
      // 隐藏加载状态
      if (loadingState) loadingState.classList.add('hidden');
      
      // 渲染模板
      if (this.allTemplates.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (templateGrid) templateGrid.classList.add('hidden');
      } else {
        if (emptyState) emptyState.classList.add('hidden');
        if (templateGrid) templateGrid.classList.remove('hidden');
        this.renderTemplateCards();
      }
      
      console.log('[FormatTemplatePage] 模板已加载:', this.allTemplates.length);
    } catch (error) {
      console.error('[FormatTemplatePage] 加载模板失败:', error);
      if (loadingState) loadingState.classList.add('hidden');
      if (templateGrid) {
        templateGrid.innerHTML = `
          <div class="col-span-full text-center py-8 text-red-600">
            <i class="fas fa-exclamation-circle text-4xl mb-2"></i>
            <p>加载失败：${error.message}</p>
          </div>
        `;
        templateGrid.classList.remove('hidden');
      }
    }
  }
  
  /**
   * 渲染模板卡片
   */
  renderTemplateCards() {
    const grid = this.container.querySelector('#templateGrid');
    if (!grid) return;
    
    // 分组：系统模板和自定义模板
    const systemTemplates = this.allTemplates.filter(t => t.is_system);
    const customTemplates = this.allTemplates.filter(t => !t.is_system);
    
    let html = '';
    
    // 系统模板区域
    if (systemTemplates.length > 0) {
      html += `
        <div class="col-span-full">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <i class="fas fa-star text-yellow-500 mr-2"></i>
            系統內置模板
            <span class="ml-2 text-sm text-gray-500 font-normal">(${systemTemplates.length})</span>
          </h3>
        </div>
      `;
      html += systemTemplates.map(template => this.createTemplateCard(template)).join('');
    }
    
    // 自定义模板区域
    if (customTemplates.length > 0) {
      html += `
        <div class="col-span-full mt-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <i class="fas fa-user-edit text-blue-500 mr-2"></i>
            我的自定義模板
            <span class="ml-2 text-sm text-gray-500 font-normal">(${customTemplates.length})</span>
          </h3>
        </div>
      `;
      html += customTemplates.map(template => this.createTemplateCard(template)).join('');
    }
    
    grid.innerHTML = html;
  }
  
  /**
   * 创建模板卡片 HTML
   */
  createTemplateCard(template) {
    const isSystem = template.is_system;
    const icon = isSystem ? '🏛️' : '📝';
    const badge = isSystem 
      ? '<span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">系統</span>'
      : '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">自定義</span>';
    
    return `
      <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition p-6 border border-gray-200 cursor-pointer"
           onclick="window.formatTemplatePageInstance.showDetail('${template.id}')">
        <div class="flex justify-between items-start mb-3">
          <div class="text-3xl">${icon}</div>
          ${badge}
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">${this.escapeHtml(template.name)}</h3>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">
          ${this.escapeHtml(template.description || '暫無描述')}
        </p>
        <div class="flex gap-2 mt-4">
          <button 
            onclick="event.stopPropagation(); window.formatTemplatePageInstance.switchToEditMode('${template.id}')"
            class="flex-1 bg-blue-50 text-blue-700 px-4 py-2 rounded hover:bg-blue-100 transition text-sm"
          >
            <i class="fas fa-edit mr-1"></i>編輯
          </button>
          ${!isSystem ? `
            <button 
              onclick="event.stopPropagation(); window.formatTemplatePageInstance.deleteTemplate('${template.id}')"
              class="bg-red-50 text-red-700 px-4 py-2 rounded hover:bg-red-100 transition text-sm"
            >
              <i class="fas fa-trash mr-1"></i>刪除
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * 显示模板详情（模态框）
   */
  async showDetail(templateId) {
    try {
      const template = this.allTemplates.find(t => t.id === templateId);
      if (!template) throw new Error('模板不存在');
      
      const modal = this.container.querySelector('#detailModal');
      const title = this.container.querySelector('#detailTitle');
      const content = this.container.querySelector('#detailContent');
      
      title.textContent = template.name;
      content.innerHTML = `
        <div class="space-y-4">
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">描述</h4>
            <p class="text-gray-600">${this.escapeHtml(template.description || '暫無描述')}</p>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">寫作要求</h4>
            <div class="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
${this.escapeHtml(template.human_input || '暫無內容')}
            </div>
          </div>
        </div>
      `;
      
      modal.classList.remove('hidden');
    } catch (error) {
      console.error('[FormatTemplatePage] 显示详情失败:', error);
      alert('显示详情失败：' + error.message);
    }
  }
  
  /**
   * 筛选模板
   */
  filterTemplates() {
    this.renderTemplateCards();
  }
  
  /**
   * 删除模板
   */
  async deleteTemplate(templateId) {
    if (!confirm('確定要刪除這個模板嗎？此操作無法撤銷。')) {
      return;
    }
    
    try {
      const { error } = await this.supabase
        .from('format_specifications')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
      
      console.log('[FormatTemplatePage] 模板已删除:', templateId);
      alert('✅ 模板已刪除');
      
      // 重新加载
      await this.loadTemplates();
    } catch (error) {
      console.error('[FormatTemplatePage] 删除失败:', error);
      alert('刪除失敗：' + error.message);
    }
  }
  
  // ============================================================
  // 编辑模式
  // ============================================================
  
  /**
   * 切换到编辑模式
   */
  async switchToEditMode(formatId) {
    this.currentMode = 'edit';
    this.editingFormatId = formatId;
    
    // 重新渲染（切换到编辑模式）
    const container = document.querySelector('#teacher-dashboard-content #mainContent');
    if (container) {
      await this.renderEditMode(container);
    }
  }
  
  /**
   * 渲染编辑模式（整页编辑器）
   */
  async renderEditMode(container) {
    this.container = container;  // 保存 container 引用
    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <!-- 返回按钮 -->
        <button 
          id="backToListBtn"
          class="mb-4 text-gray-600 hover:text-gray-900 transition"
        >
          <i class="fas fa-arrow-left mr-2"></i>返回模板庫
        </button>
        
        <!-- 编辑器标题 -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            ${this.editingFormatId ? '編輯模板' : '創建新模板'}
          </h2>
          <p class="text-gray-600">使用 AI 輔助生成結構化的寫作要求</p>
        </div>
        
        <!-- Quill 编辑器 -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div id="template-editor" class="min-h-[400px] border border-gray-300 rounded-lg p-4"></div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="bg-white rounded-lg shadow-sm p-6 flex justify-between items-center">
          <div id="statusText" class="text-gray-600">準備就緒</div>
          <div class="flex gap-3">
            <button 
              id="optimizeBtn"
              class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              <i class="fas fa-magic mr-2"></i>AI 優化
            </button>
            <button 
              id="saveBtn"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <i class="fas fa-save mr-2"></i>保存模板
            </button>
          </div>
        </div>
        
        <!-- AI 处理中状态 -->
        <div id="aiProcessing" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div class="bg-white rounded-lg p-8 text-center">
            <i class="fas fa-spinner fa-spin text-4xl text-purple-600 mb-4"></i>
            <p class="text-lg font-semibold">AI 正在優化...</p>
          </div>
        </div>
        
        <!-- 保存对话框 -->
        <div id="saveDialog" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg max-w-md w-full p-6">
            <h3 class="text-xl font-bold mb-4">保存模板</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">模板名稱 *</label>
                <input 
                  id="saveTemplateName"
                  type="text" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="例如：紅樓夢人物分析格式"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea 
                  id="saveTemplateDesc"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="簡要描述這個模板的用途..."
                ></textarea>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button 
                id="cancelSaveBtn"
                class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button 
                id="confirmSaveBtn"
                class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                確認保存
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 初始化编辑器
    await this.initializeEditor();
  }
  
  /**
   * 初始化编辑器
   */
  async initializeEditor() {
    try {
      // 初始化 Quill
      this.currentQuill = FormatEditorCore.initQuill('#template-editor', {
        placeholder: '請輸入寫作要求...\n\n例如：\n論文總字數 1500-2000 字\n必須 3 個分論點\n詳細分析紅樓夢中林黛玉和薛寶釵的外貌描寫'
      });
      
      // 设置草稿自动保存
      this.draftCleanup = FormatEditorCore.setupDraftAutoSave(
        this.currentQuill, 
        'format-editor-draft-template'  // 模板库专用 key
      );
      
      // 如果是编辑模式，加载现有格式
      if (this.editingFormatId) {
        await this.loadFormatForEdit();
      } else {
        // 新建模式：询问是否恢复草稿
        FormatEditorCore.askRestoreDraft('format-editor-draft-template', this.currentQuill);
      }
      
      // 绑定事件
      this.bindEditModeEvents();
      
      console.log('[FormatTemplatePage] 编辑器初始化完成');
    } catch (error) {
      console.error('[FormatTemplatePage] 编辑器初始化失败:', error);
      alert('编辑器初始化失败：' + error.message);
    }
  }
  
  /**
   * 加载格式用于编辑
   */
  async loadFormatForEdit() {
    try {
      const format = await FormatEditorCore.loadSystemFormat(this.editingFormatId, this.supabase);
      this.cachedFormat = format;
      
      // 显示 human_input 在编辑器中
      if (format.human_input) {
        this.currentQuill.setText(format.human_input);
      }
      
      // 预填保存对话框
      const nameInput = this.container.querySelector('#saveTemplateName');
      const descInput = this.container.querySelector('#saveTemplateDesc');
      if (nameInput) nameInput.value = format.name || '';
      if (descInput) descInput.value = format.description || '';
      
      console.log('[FormatTemplatePage] 格式已加载用于编辑');
    } catch (error) {
      console.error('[FormatTemplatePage] 加载格式失败:', error);
      alert('加载格式失败：' + error.message);
    }
  }
  
  /**
   * 绑定编辑模式事件
   */
  bindEditModeEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#backToListBtn');
    if (backBtn) backBtn.onclick = () => this.switchToListMode();
    
    // AI 优化按钮
    const optimizeBtn = this.container.querySelector('#optimizeBtn');
    if (optimizeBtn) optimizeBtn.onclick = () => this.handleOptimize();
    
    // 保存按钮
    const saveBtn = this.container.querySelector('#saveBtn');
    if (saveBtn) saveBtn.onclick = () => this.handleSave();
    
    // 保存对话框
    const cancelBtn = this.container.querySelector('#cancelSaveBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        const dialog = this.container.querySelector('#saveDialog');
        if (dialog) dialog.classList.add('hidden');
      };
    }
    
    const confirmBtn = this.container.querySelector('#confirmSaveBtn');
    if (confirmBtn) confirmBtn.onclick = () => this.handleConfirmSave();
  }
  
  /**
   * 处理 AI 优化
   */
  async handleOptimize() {
    const text = this.currentQuill.getText().trim();
    if (!text) {
      alert('請先輸入寫作要求');
      return;
    }
    
    const aiProcessing = this.container.querySelector('#aiProcessing');
    const optimizeBtn = this.container.querySelector('#optimizeBtn');
    const statusText = this.container.querySelector('#statusText');
    
    try {
      if (aiProcessing) aiProcessing.classList.remove('hidden');
      if (optimizeBtn) optimizeBtn.disabled = true;
      if (statusText) statusText.textContent = 'AI 優化中...';
      
      const result = await FormatEditorCore.optimizeWithAI(
        text,
        'custom',
        null,
        this.supabase
      );
      
      // 更新编辑器内容
      this.currentQuill.setText(result.human_readable);
      
      // 缓存结果
      this.cachedFormat = {
        human_input: result.human_readable,
        spec_json: result.format_json
      };
      
      if (statusText) statusText.textContent = 'AI 優化完成！';
      console.log('[FormatTemplatePage] AI 优化完成');
    } catch (error) {
      console.error('[FormatTemplatePage] AI 优化失败:', error);
      alert('AI 優化失敗：' + error.message);
      if (statusText) statusText.textContent = '優化失敗';
    } finally {
      if (aiProcessing) aiProcessing.classList.add('hidden');
      if (optimizeBtn) optimizeBtn.disabled = false;
    }
  }
  
  /**
   * 处理保存
   */
  handleSave() {
    if (!this.cachedFormat || !this.cachedFormat.spec_json) {
      alert('請先使用 AI 優化格式');
      return;
    }
    
    // 打开保存对话框
    const dialog = this.container.querySelector('#saveDialog');
    if (dialog) dialog.classList.remove('hidden');
  }
  
  /**
   * 确认保存
   */
  async handleConfirmSave() {
    const name = this.container.querySelector('#saveTemplateName')?.value.trim();
    const description = this.container.querySelector('#saveTemplateDesc')?.value.trim();
    
    if (!name) {
      alert('請輸入模板名稱');
      return;
    }
    
    try {
      const formatData = {
        id: this.editingFormatId,  // 如果是编辑模式
        name: name,
        description: description,
        spec_json: this.cachedFormat.spec_json,
        human_input: this.currentQuill.getText().trim(),
        is_template: true,  // 通用模板
        parent_spec_id: null
      };
      
      const result = await FormatEditorCore.saveFormat(formatData, this.supabase);
      
      console.log('[FormatTemplatePage] 模板已保存:', result.id);
      
      // 清除草稿
      FormatEditorCore.clearDraft('format-editor-draft-template');
      
      // 关闭对话框
      const dialog = this.container.querySelector('#saveDialog');
      if (dialog) dialog.classList.add('hidden');
      
      alert(this.editingFormatId ? '✅ 模板已更新！' : '✅ 模板已保存！');
      
      // 返回列表
      this.switchToListMode();
    } catch (error) {
      console.error('[FormatTemplatePage] 保存失败:', error);
      alert('保存失敗：' + error.message);
    }
  }
  
  // ============================================================
  // 模式切换
  // ============================================================
  
  /**
   * 切换回列表模式
   */
  async switchToListMode() {
    // 清理编辑器
    if (this.draftCleanup) {
      this.draftCleanup();
      this.draftCleanup = null;
    }
    
    this.currentQuill = null;
    this.currentMode = 'list';
    this.editingFormatId = null;
    this.cachedFormat = null;
    
    // 重新渲染
    const container = document.querySelector('#teacher-dashboard-content #mainContent');
    if (container) {
      await this.render(container);
    }
  }
  
  // ============================================================
  // 辅助方法
  // ============================================================
  
  /**
   * HTML 转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 导出
export default FormatTemplatePage;

