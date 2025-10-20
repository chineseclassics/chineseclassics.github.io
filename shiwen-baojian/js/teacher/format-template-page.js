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
import toast from './toast.js';

class FormatTemplatePage {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentMode = 'list';  // 'list' | 'edit'
    this.editingFormatId = null;  // 正在编辑的格式 ID
    this.currentQuill = null;  // Quill 实例
    this.draftCleanup = null;  // 草稿清理函数
    this.cachedFormat = null;  // 缓存的格式数据
    
    // 🚨 階段 3.5.1.2：完整狀態管理系統
    this.editorMode = 'custom';  // 'direct' | 'incremental' | 'custom'
    this.hasBeenOptimized = false;  // 是否已經過 AI 優化
    this.originalContent = '';  // 原始內容基線（用於檢測修改）
    this.cachedFormatJSON = null;  // 緩存的格式 JSON
    
    // 🚨 階段 3.5.3.1-3.5.3.2：搜索、篩選和排序狀態
    this.allTemplates = [];  // 所有模板
    this.searchQuery = '';  // 搜索關鍵字
    this.currentFilter = 'all';  // 'all' | 'system' | 'custom'
    this.currentSort = 'created_desc';  // 排序方式
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
            <h2 class="text-2xl font-bold text-gray-900">📚 寫作指引模板庫</h2>
            <p class="text-gray-600 mt-1">查看和管理可複用的寫作指引模板</p>
          </div>
          <button 
            id="createNewBtn"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            style="box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);"
          >
            ➕ 創建新寫作指引模板
          </button>
        </div>
        
        <!-- 🚨 階段 3.5.3.1-3.5.3.2：搜索、篩選和排序 -->
        <div class="mb-6 bg-white rounded-lg shadow p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- 搜索框 -->
            <div class="md:col-span-2">
              <div class="relative">
                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  id="searchInput"
                  class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="搜索模板名稱或描述..."
                />
              </div>
            </div>
            
            <!-- 篩選和排序 -->
            <div class="flex gap-2">
              <select 
                id="filterType"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部類型</option>
                <option value="system">系統格式</option>
                <option value="custom">自定義格式</option>
              </select>
              
              <select 
                id="sortBy"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_desc">最新創建</option>
                <option value="created_asc">最早創建</option>
                <option value="name_asc">名稱 A-Z</option>
                <option value="name_desc">名稱 Z-A</option>
              </select>
            </div>
          </div>
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
        <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h3 class="text-xl font-semibold text-gray-900" id="detailTitle">模板詳情</h3>
            <button id="closeDetailModalBtn" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div id="detailContent" class="px-6 py-4 overflow-y-auto flex-1">
            <!-- 动态填充 -->
          </div>
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
            <button id="closeDetailModalBtn2" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
              關閉
            </button>
            <button id="copyDetailBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <i class="fas fa-copy mr-1"></i>複製
            </button>
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
    // 🚨 修復：使用 addEventListener 而非 onclick，避免重複綁定
    const closeModalBtn = this.container.querySelector('#closeDetailModalBtn');
    const closeModalBtn2 = this.container.querySelector('#closeDetailModalBtn2');
    const copyDetailBtn = this.container.querySelector('#copyDetailBtn');
    
    if (closeModalBtn && !closeModalBtn.dataset.bound) {
      closeModalBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#detailModal');
        if (modal) modal.classList.add('hidden');
      });
      closeModalBtn.dataset.bound = 'true';
    }
    if (closeModalBtn2 && !closeModalBtn2.dataset.bound) {
      closeModalBtn2.addEventListener('click', () => {
        const modal = this.container.querySelector('#detailModal');
        if (modal) modal.classList.add('hidden');
      });
      closeModalBtn2.dataset.bound = 'true';
    }
    if (copyDetailBtn && !copyDetailBtn.dataset.bound) {
      copyDetailBtn.addEventListener('click', () => this.copyFormatDescription());
      copyDetailBtn.dataset.bound = 'true';
    }
    
    // 🚨 階段 3.5.3.1-3.5.3.2：搜索、篩選和排序事件
    const searchInput = this.container.querySelector('#searchInput');
    const filterType = this.container.querySelector('#filterType');
    const sortBy = this.container.querySelector('#sortBy');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.filterAndRenderTemplates();
      });
    }
    
    if (filterType) {
      filterType.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.filterAndRenderTemplates();
      });
    }
    
    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.filterAndRenderTemplates();
      });
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
   * 🚨 階段 3.5.3.1-3.5.3.2：篩選和渲染模板
   */
  filterAndRenderTemplates() {
    let filtered = [...this.allTemplates];
    
    // 搜索過濾
    if (this.searchQuery) {
      filtered = filtered.filter(template => {
        const nameMatch = template.name.toLowerCase().includes(this.searchQuery);
        const descMatch = template.description?.toLowerCase().includes(this.searchQuery) || false;
        return nameMatch || descMatch;
      });
    }
    
    // 類型篩選
    if (this.currentFilter === 'system') {
      filtered = filtered.filter(t => t.is_system);
    } else if (this.currentFilter === 'custom') {
      filtered = filtered.filter(t => !t.is_system);
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (this.currentSort) {
        case 'created_desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'created_asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name_asc':
          return a.name.localeCompare(b.name, 'zh-Hant');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'zh-Hant');
        default:
          return 0;
      }
    });
    
    // 保存過濾後的列表
    this.filteredTemplates = filtered;
    
    // 渲染
    const templateGrid = this.container.querySelector('#templateGrid');
    const emptyState = this.container.querySelector('#emptyState');
    
    if (filtered.length === 0) {
      if (templateGrid) templateGrid.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        // 更新空狀態消息
        if (this.searchQuery || this.currentFilter !== 'all') {
          emptyState.querySelector('h3').textContent = '沒有符合條件的模板';
          emptyState.querySelector('p').textContent = '請嘗試調整搜索或篩選條件';
        }
      }
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      if (templateGrid) templateGrid.classList.remove('hidden');
      this.renderTemplateCards();
    }
    
    console.log('[FormatTemplatePage] 篩選完成:', filtered.length, '個模板');
  }
  
  /**
   * 🚨 階段 3.5.3.1-3.5.3.2：渲染模板卡片（使用過濾後的列表）
   */
  renderTemplateCards() {
    const grid = this.container.querySelector('#templateGrid');
    if (!grid) return;
    
    // 使用過濾後的列表
    const templates = this.filteredTemplates || this.allTemplates;
    
    // 分组：系统模板和自定义模板
    const systemTemplates = templates.filter(t => t.is_system);
    const customTemplates = templates.filter(t => !t.is_system);
    
    let html = '';
    
    // 系统模板区域
    if (systemTemplates.length > 0) {
      html += `
        <div class="col-span-full">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <i class="fas fa-star text-yellow-500 mr-2"></i>
            系統寫作指引模板
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
            我的寫作指引模板
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
    const icon = isSystem ? '📚' : '📝';
    const badge = isSystem 
      ? '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-medium">系統內置</span>'
      : '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">自定義</span>';
    
    return `
      <div class="bg-white rounded-lg shadow hover:shadow-lg transition-all border border-gray-200 overflow-hidden"
           style="transition: all 0.2s ease;">
        <div class="p-6">
          <div class="flex justify-between items-start mb-3">
            <div class="text-4xl">${icon}</div>
            ${badge}
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2 leading-tight">${this.escapeHtml(template.name)}</h3>
          <p class="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
            ${this.escapeHtml(template.description || '點擊查看按鈕查看詳細寫作要求')}
          </p>
        </div>
        <div class="px-6 pb-4 flex gap-2 border-t border-gray-100 pt-4">
          <button 
            onclick="window.formatTemplatePageInstance.showDetail('${template.id}')"
            class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition text-sm font-medium"
          >
            <i class="fas fa-eye mr-1"></i>查看
          </button>
          <button 
            onclick="window.formatTemplatePageInstance.switchToEditMode('${template.id}')"
            class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-sm font-medium"
          >
            <i class="fas fa-edit mr-1"></i>${isSystem ? '基於此創建' : '編輯'}
          </button>
          ${!isSystem ? `
            <button 
              onclick="window.formatTemplatePageInstance.deleteTemplate('${template.id}')"
              class="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm font-medium"
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
      
      // 保存當前顯示的模板，供複製功能使用
      this.currentDetailTemplate = template;
      
      const modal = this.container.querySelector('#detailModal');
      const title = this.container.querySelector('#detailTitle');
      const content = this.container.querySelector('#detailContent');
      
      const isSystem = template.is_system;
      const badge = isSystem 
        ? '<span class="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">系統內置</span>'
        : '<span class="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">自定義</span>';
      
      title.innerHTML = `
        <div class="flex items-center gap-3">
          <span>${this.escapeHtml(template.name)}</span>
          ${badge}
        </div>
      `;
      
      content.innerHTML = `
        <div class="space-y-6">
          ${template.description ? `
            <div>
              <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">描述</h4>
              <p class="text-gray-700 leading-relaxed">${this.escapeHtml(template.description)}</p>
            </div>
          ` : ''}
          <div>
            <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">寫作指引詳情</h4>
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
              <div class="text-gray-800 whitespace-pre-wrap leading-relaxed" style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;">
${this.escapeHtml(template.human_input || '暫無內容')}
              </div>
            </div>
          </div>
          <div class="pt-4 text-sm text-gray-500">
            <i class="fas fa-clock mr-1"></i>
            創建於 ${new Date(template.created_at).toLocaleDateString('zh-TW')}
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
   * 🚨 階段 3.5.3.3：複製格式說明到剪貼板
   */
  async copyFormatDescription(templateId) {
    try {
      // 如果沒有傳入 templateId，從當前顯示的模態窗口中獲取
      if (!templateId && this.currentDetailTemplate) {
        templateId = this.currentDetailTemplate.id;
      }
      
      const template = this.allTemplates.find(t => t.id === templateId);
      if (!template) throw new Error('模板不存在');
      
      const textToCopy = template.human_input || '（暫無內容）';
      
      await navigator.clipboard.writeText(textToCopy);
      toast.success('已複製到剪貼板！');
      
      console.log('[FormatTemplatePage] 已複製格式說明:', template.name);
    } catch (error) {
      console.error('[FormatTemplatePage] 複製失敗:', error);
      toast.error('複製失敗：' + error.message);
    }
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
    
    const isEdit = !!this.editingFormatId;
    const title = isEdit ? '編輯寫作指引模板' : '創建新寫作指引模板';
    const subtitle = isEdit ? '修改現有模板的寫作指引' : '使用 AI 輔助生成結構化的寫作指引模板';
    
    container.innerHTML = `
      <div class="max-w-5xl mx-auto">
        <!-- 返回按钮 -->
        <button 
          id="backToListBtn"
          class="mb-6 inline-flex items-center text-gray-600 hover:text-blue-600 transition font-medium"
        >
          <i class="fas fa-arrow-left mr-2"></i>返回模板庫
        </button>
        
        <!-- 编辑器卡片 -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden" style="border: 1px solid #e5e7eb;">
          <!-- 标题区 -->
          <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6 text-white">
            <h2 class="text-2xl font-bold mb-2">${title}</h2>
            <p class="text-blue-100">${subtitle}</p>
          </div>
          
          <!-- 编辑器区域 -->
          <div class="p-8">
            <!-- 🚨 階段 3.5.2.4：選擇起點（僅在新建模式顯示） -->
            ${!isEdit ? `
            <div class="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">
                <i class="fas fa-compass text-blue-500 mr-2"></i>選擇起點（可選）
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- 從零開始 -->
                <div 
                  id="templateStartScratch" 
                  class="template-start-card p-4 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer transition hover:shadow-md"
                >
                  <div class="flex items-center gap-3">
                    <div style="font-size: 1.5rem;">✏️</div>
                    <div class="flex-1">
                      <h5 class="font-semibold text-blue-900 text-sm">從零開始</h5>
                      <p class="text-xs text-blue-700">完全自定義</p>
                    </div>
                    <div class="template-start-check text-blue-600 font-bold" style="font-size: 1.2rem;">✓</div>
                  </div>
                </div>
                
                <!-- 基於系統格式 -->
                <div 
                  id="templateStartSystem" 
                  class="template-start-card p-4 border-2 border-gray-200 rounded-lg cursor-pointer transition hover:shadow-md hover:border-blue-400"
                >
                  <div class="flex items-center gap-3">
                    <div style="font-size: 1.5rem;">📖</div>
                    <div class="flex-1">
                      <h5 class="font-semibold text-gray-800 text-sm">基於系統格式</h5>
                      <p class="text-xs text-gray-600">選擇系統格式開始</p>
                    </div>
                    <div class="template-start-check text-blue-600 font-bold hidden" style="font-size: 1.2rem;">✓</div>
                  </div>
                </div>
              </div>
              
              <!-- 系統格式選擇器（基於系統格式時顯示） -->
              <div id="templateSystemSelector" class="mt-3 hidden">
                <select 
                  id="templateBaseFormatSelect"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- 選擇系統格式 --</option>
                  <!-- 動態加載 -->
                </select>
                <button 
                  id="templateLoadPreviewBtn"
                  class="w-full mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                  disabled
                >
                  📄 加載預覽
                </button>
              </div>
            </div>
            ` : ''}
            
            <div class="mb-6">
              <label class="block text-sm font-semibold text-gray-700 mb-3">
                <i class="fas fa-edit text-blue-500 mr-2"></i>寫作指引內容
              </label>
              <div id="template-editor" class="border-2 border-gray-200 rounded-lg p-4 bg-white" style="min-height: 400px;">
                <!-- Quill 将在这里初始化 -->
              </div>
              <p class="text-sm text-gray-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>
                輸入您的寫作指引，然後使用 AI 優化以生成結構化版本
              </p>
            </div>
            
            <!-- 🚨 階段 3.5.1.5：實時狀態面板 -->
            <div id="templateStatusPanel" class="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-info-circle text-blue-600 mr-2"></i>📊 當前狀態
              </h4>
              <div id="templateStatusContent" class="text-sm text-gray-600 space-y-1">
                <p>✏️ 模式：<span id="templateStatusMode" class="font-medium">從零開始</span></p>
                <p>📝 已優化：<span id="templateStatusOptimized" class="font-medium">否</span></p>
                <p>💾 可保存：<span id="templateStatusCanSave" class="font-medium">否</span></p>
              </div>
            </div>
            
            <!-- 状态和操作区 -->
            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center gap-2">
                <i class="fas fa-check-circle text-green-500"></i>
                <span id="statusText" class="text-gray-700 font-medium">準備就緒</span>
              </div>
              <div class="flex gap-3">
                <button 
                  id="optimizeBtn"
                  class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2.5 rounded-lg hover:from-purple-600 hover:to-purple-700 transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-magic mr-2"></i>AI 優化
                </button>
                <button 
                  id="saveBtn"
                  class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-save mr-2"></i>保存為模板
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- AI 处理中状态 -->
        <div id="aiProcessing" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div class="bg-white rounded-lg shadow-xl p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
            <p class="text-xl font-semibold text-gray-800">AI 正在優化...</p>
            <p class="text-sm text-gray-500 mt-2">這可能需要幾秒鐘</p>
          </div>
        </div>
        
        <!-- 保存对话框 -->
        <div id="saveDialog" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 text-white">
              <h3 class="text-xl font-bold">💾 保存寫作指引模板</h3>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  模板名稱 <span class="text-red-500">*</span>
                </label>
                <input 
                  id="saveTemplateName"
                  type="text" 
                  class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="例如：紅樓夢人物分析寫作指引模板"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">描述</label>
                <textarea 
                  id="saveTemplateDesc"
                  class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  rows="3"
                  placeholder="簡要描述這個模板的用途..."
                ></textarea>
              </div>
            </div>
            <div class="px-6 pb-6 flex gap-3">
              <button 
                id="cancelSaveBtn"
                class="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                取消
              </button>
              <button 
                id="confirmSaveBtn"
                class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-sm"
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
        
        // 🚨 階段 3.5.1：新建模式的初始狀態
        this.editorMode = 'custom';
        this.hasBeenOptimized = false;
        this.originalContent = '';
        this.cachedFormatJSON = null;
        
        // 🚨 階段 3.5.2.4：加載系統格式列表到選擇器
        await this.loadSystemFormatsForSelector();
      }
      
      // 绑定事件
      this.bindEditModeEvents();
      
      // 🚨 階段 3.5.1：初始化後更新狀態
      this.updateButtonStates();
      this.updateStatus();
      
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
        this.originalContent = format.human_input;  // 設置基線內容
      }
      
      // 🚨 修復：正確設置狀態
      if (format.is_system) {
        // 系統格式：基於此創建（不是更新）
        this.editorMode = 'incremental';  // 🚨 修復：應該是 incremental，因為用戶會修改
        this.hasBeenOptimized = false;  // 🚨 修復：用戶需要先 AI 優化
        this.cachedFormatJSON = null;  // 🚨 修復：還沒有優化後的 JSON
        this.cachedFormat = format;  // 保留原始格式供參考
        this.editingFormatId = null;  // 清空 editingFormatId，避免誤更新系統格式
      } else {
        // 自定義格式：真正的編輯模式
        this.editorMode = 'custom';
        this.hasBeenOptimized = true;  // 已保存的格式視為已優化
        this.cachedFormatJSON = format.spec_json;
        // 保留 this.editingFormatId 用於更新
      }
      
      // 🚨 修復：預填保存對話框（系統格式加「副本」標記）
      const nameInput = this.container.querySelector('#saveTemplateName');
      const descInput = this.container.querySelector('#saveTemplateDesc');
      if (format.is_system) {
        // 系統格式：基於此創建，名稱加「副本」
        if (nameInput) nameInput.value = format.name + '（副本）';
        if (descInput) descInput.value = '基於系統格式「' + format.name + '」創建';
      } else {
        // 自定義格式：真正編輯，保留原名稱
        if (nameInput) nameInput.value = format.name || '';
        if (descInput) descInput.value = format.description || '';
      }
      
      // 更新按鈕狀態和狀態面板
      this.updateButtonStates();
      this.updateStatus();
      
      console.log('[FormatTemplatePage] 格式已加载用于编辑，模式:', this.editorMode);
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
    
    // 🚨 階段 3.5.1.7：綁定內容變化監聽
    if (this.currentQuill) {
      this.currentQuill.on('text-change', () => {
        this.handleContentChange();
      });
    }
    
    // 🚨 階段 3.5.2.4：綁定選擇起點事件（僅新建模式）
    if (!this.editingFormatId) {
      const scratchCard = this.container.querySelector('#templateStartScratch');
      const systemCard = this.container.querySelector('#templateStartSystem');
      const baseFormatSelect = this.container.querySelector('#templateBaseFormatSelect');
      const loadPreviewBtn = this.container.querySelector('#templateLoadPreviewBtn');
      
      if (scratchCard) {
        scratchCard.onclick = () => this.selectTemplateStartPoint('scratch');
      }
      if (systemCard) {
        systemCard.onclick = () => this.selectTemplateStartPoint('system');
      }
      if (baseFormatSelect) {
        baseFormatSelect.onchange = (e) => {
          const loadBtn = this.container.querySelector('#templateLoadPreviewBtn');
          if (loadBtn) loadBtn.disabled = !e.target.value;
        };
      }
      if (loadPreviewBtn) {
        loadPreviewBtn.onclick = () => this.loadTemplatePreview();
      }
    }
  }
  
  /**
   * 🚨 階段 3.5.2.4：加載系統格式列表到選擇器
   */
  async loadSystemFormatsForSelector() {
    const selector = this.container.querySelector('#templateBaseFormatSelect');
    if (!selector) return;
    
    try {
      const { data: systemFormats, error } = await this.supabase
        .from('format_specifications')
        .select('id, name, description')
        .eq('is_system', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      selector.innerHTML = '<option value="">-- 選擇系統格式 --</option>';
      systemFormats.forEach(format => {
        const option = document.createElement('option');
        option.value = format.id;
        option.textContent = format.name;
        selector.appendChild(option);
      });
      
      console.log('[FormatTemplatePage] 系統格式已加載到選擇器:', systemFormats.length);
    } catch (error) {
      console.error('[FormatTemplatePage] 加載系統格式失敗:', error);
    }
  }
  
  /**
   * 🚨 階段 3.5.2.4：選擇模板起點
   */
  selectTemplateStartPoint(type) {
    const scratchCard = this.container.querySelector('#templateStartScratch');
    const systemCard = this.container.querySelector('#templateStartSystem');
    const systemSelector = this.container.querySelector('#templateSystemSelector');
    
    // 重置卡片樣式
    [scratchCard, systemCard].forEach(card => {
      if (card) {
        card.classList.remove('border-blue-500', 'bg-blue-50');
        card.classList.add('border-gray-200');
        const check = card.querySelector('.template-start-check');
        if (check) check.classList.add('hidden');
      }
    });
    
    if (type === 'scratch') {
      // 從零開始
      if (scratchCard) {
        scratchCard.classList.remove('border-gray-200');
        scratchCard.classList.add('border-blue-500', 'bg-blue-50');
        const check = scratchCard.querySelector('.template-start-check');
        if (check) check.classList.remove('hidden');
      }
      if (systemSelector) systemSelector.classList.add('hidden');
      
      this.editorMode = 'custom';
      
    } else if (type === 'system') {
      // 基於系統格式
      if (systemCard) {
        systemCard.classList.remove('border-gray-200');
        systemCard.classList.add('border-blue-500', 'bg-blue-50');
        const check = systemCard.querySelector('.template-start-check');
        if (check) check.classList.remove('hidden');
      }
      if (systemSelector) systemSelector.classList.remove('hidden');
    }
    
    console.log('[FormatTemplatePage] 起點已選擇:', type);
  }
  
  /**
   * 🚨 階段 3.5.2.4：加載模板預覽
   */
  async loadTemplatePreview() {
    const selector = this.container.querySelector('#templateBaseFormatSelect');
    const formatId = selector?.value;
    
    if (!formatId) {
      alert('請先選擇系統格式');
      return;
    }
    
    try {
      const format = await FormatEditorCore.loadSystemFormat(formatId, this.supabase);
      
      // 顯示在編輯器中
      let humanReadable = format.human_input;
      if (!humanReadable && format.spec_json) {
        humanReadable = FormatEditorCore.formatJSONToHumanReadable(format.spec_json);
      }
      
      if (this.currentQuill && humanReadable) {
        this.currentQuill.setText(humanReadable);
        this.originalContent = humanReadable;
      }
      
      // 設置狀態
      this.editorMode = 'direct';
      this.hasBeenOptimized = true;
      this.cachedFormatJSON = format.spec_json;
      this.cachedFormat = {
        human_input: humanReadable,
        spec_json: format.spec_json
      };
      
      this.updateButtonStates();
      this.updateStatus();
      
      console.log('[FormatTemplatePage] 模板預覽已加載');
    } catch (error) {
      console.error('[FormatTemplatePage] 加載預覽失敗:', error);
      alert('加載預覽失敗：' + error.message);
    }
  }
  
  /**
   * 🚨 階段 3.5.1.7：處理內容變化
   */
  handleContentChange() {
    if (!this.currentQuill) return;
    
    const content = this.currentQuill.getText().trim();
    
    // 檢測模式變化：如果用戶修改了從系統格式加載的內容
    if (this.editingFormatId && content !== this.originalContent) {
      if (this.editorMode === 'direct') {
        this.editorMode = 'incremental';
        console.log('[FormatTemplatePage] 模式切換：direct → incremental（用戶修改了系統格式）');
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
    const optimizeBtn = this.container?.querySelector('#optimizeBtn');
    const saveBtn = this.container?.querySelector('#saveBtn');
    
    if (!optimizeBtn || !saveBtn) return;
    
    const content = this.currentQuill?.getText().trim() || '';
    
    // AI 優化按鈕邏輯
    if (this.editorMode === 'direct') {
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
    if (this.editorMode === 'direct') {
      // direct 模式：只要有 JSON 就可以保存
      saveBtn.disabled = !this.cachedFormatJSON;
      saveBtn.title = this.cachedFormatJSON 
        ? '直接使用系統格式'
        : '請先加載格式';
    } else {
      // incremental 或 custom 模式：必須優化後才能保存
      saveBtn.disabled = !this.hasBeenOptimized || !this.cachedFormatJSON;
      saveBtn.title = !this.hasBeenOptimized
        ? '⚠️ 必須先經過 AI 優化才能保存'
        : this.cachedFormatJSON
          ? '保存模板'
          : '請先進行 AI 優化';
    }
    
    console.log('[FormatTemplatePage] 按鈕狀態已更新:', {
      mode: this.editorMode,
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
    const statusMode = this.container?.querySelector('#templateStatusMode');
    const statusOptimized = this.container?.querySelector('#templateStatusOptimized');
    const statusCanSave = this.container?.querySelector('#templateStatusCanSave');
    
    if (!statusMode || !statusOptimized || !statusCanSave) return;
    
    // 模式文本映射
    const modeText = {
      'direct': '直接使用系統格式',
      'incremental': '基於系統格式修改',
      'custom': '從零開始自定義'
    };
    
    // 更新模式顯示
    statusMode.textContent = modeText[this.editorMode];
    statusMode.className = this.editorMode === 'direct' 
      ? 'font-medium text-green-600'
      : this.editorMode === 'incremental'
        ? 'font-medium text-orange-600'
        : 'font-medium text-blue-600';
    
    // 更新優化狀態
    statusOptimized.textContent = this.hasBeenOptimized ? '是 ✓' : '否';
    statusOptimized.className = this.hasBeenOptimized 
      ? 'font-medium text-green-600'
      : 'font-medium text-gray-600';
    
    // 更新保存狀態
    const canSave = (this.editorMode === 'direct' && this.cachedFormatJSON) ||
                    (this.hasBeenOptimized && this.cachedFormatJSON);
    statusCanSave.textContent = canSave ? '是 ✓' : '否';
    statusCanSave.className = canSave 
      ? 'font-medium text-green-600'
      : 'font-medium text-gray-600';
    
    console.log('[FormatTemplatePage] 狀態面板已更新:', {
      mode: this.editorMode,
      optimized: this.hasBeenOptimized,
      canSave: canSave
    });
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
      
      // 🚨 階段 3.5.1：更新狀態管理變量
      this.hasBeenOptimized = true;
      this.cachedFormatJSON = result.format_json;
      this.originalContent = result.human_readable;  // 更新基線內容
      
      // 更新按鈕狀態和狀態面板
      this.updateButtonStates();
      this.updateStatus();
      
      if (statusText) statusText.textContent = 'AI 優化完成！';
      console.log('[FormatTemplatePage] AI 优化完成，狀態已更新');
    } catch (error) {
      console.error('[FormatTemplatePage] AI 优化失败:', error);
      alert('AI 優化失敗：' + error.message);
      if (statusText) statusText.textContent = '優化失敗';
    } finally {
      if (aiProcessing) aiProcessing.classList.add('hidden');
      // 不要在這裡重新啟用按鈕，讓 updateButtonStates 控制
      this.updateButtonStates();
    }
  }
  
  /**
   * 处理保存
   */
  handleSave() {
    const text = this.currentQuill?.getText().trim();
    if (!text) {
      alert('請先輸入寫作要求');
      return;
    }
    
    // 🚨 階段 3.5.1.3：強制 AI 優化檢查邏輯
    if (!this.hasBeenOptimized && this.editorMode !== 'direct') {
      alert('⚠️ 必須先經過 AI 優化才能保存！\n\n當前模式：' + 
            (this.editorMode === 'incremental' ? '基於系統格式修改' : '從零開始自定義') +
            '\n請點擊「AI 優化」按鈕進行優化。');
      return;
    }
    
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
    
    // 🚨 修復：檢查是否有 spec_json（必須先 AI 優化）
    if (!this.cachedFormatJSON) {
      alert('⚠️ 格式 JSON 不存在，請先使用 AI 優化！');
      return;
    }
    
    try {
      const formatData = {
        id: this.editingFormatId,  // 如果是编辑模式
        name: name,
        description: description,
        spec_json: this.cachedFormatJSON,  // 🚨 修復：使用正確的變量
        human_input: this.currentQuill.getText().trim(),
        is_template: true,  // 通用模板
        parent_spec_id: null
      };
      
      const result = await FormatEditorCore.saveFormat(formatData, this.supabase);
      
      console.log('[FormatTemplatePage] 模板已保存:', result.id);
      
      // 🚨 階段 3.5.4.3：保存成功後清除草稿
      FormatEditorCore.clearDraft('format-editor-draft-template');
      
      // 🚨 停止草稿自動保存監聽
      if (this.draftCleanup) {
        this.draftCleanup();
        this.draftCleanup = null;
      }
      
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
   * 🚨 階段 3.5.4.3：切換回列表模式（完善草稿清理）
   */
  async switchToListMode() {
    // 🚨 清理草稿監聽器
    if (this.draftCleanup) {
      this.draftCleanup();
      this.draftCleanup = null;
    }
    
    // 🚨 詢問是否清除草稿（如果有未保存的內容）
    const text = this.currentQuill?.getText().trim();
    if (text && !this.hasBeenOptimized) {
      const shouldClearDraft = confirm('您有未保存的草稿，離開後草稿將保留。\n\n下次進入時可以選擇恢復。');
      // 無論用戶選擇什麼，草稿都會保留（由 localStorage 管理）
    }
    
    // 重置所有狀態
    this.currentQuill = null;
    this.currentMode = 'list';
    this.editingFormatId = null;
    this.cachedFormat = null;
    this.editorMode = 'custom';
    this.hasBeenOptimized = false;
    this.originalContent = '';
    this.cachedFormatJSON = null;
    
    // 重新渲染
    const container = document.querySelector('#teacher-dashboard-content #mainContent');
    if (container) {
      await this.render(container);
    }
    
    console.log('[FormatTemplatePage] 已切換回列表模式');
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

