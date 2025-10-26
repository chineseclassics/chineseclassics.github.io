/**
 * 老師端主儀表板
 * 整合班級管理、任務管理、批改功能
 */

import ClassManager from './class-manager.js';
import ClassUI from './class-ui.js';
import MultiClassUI from './multi-class-ui.js';
import AssignmentManager from './assignment-manager.js';
import AssignmentCreator from './assignment-creator.js';
import AssignmentList from './assignment-list.js';
import GradingUI from './grading-ui.js';
import GradingQueue from './grading-queue.js';
import FormatTemplatePage from './format-template-page.js';

class TeacherDashboard {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.classManager = new ClassManager(supabaseClient);
    this.classUI = new ClassUI(this.classManager);
    this.multiClassUI = new MultiClassUI(supabaseClient);
    this.assignmentManager = new AssignmentManager(supabaseClient);
    this.assignmentCreator = new AssignmentCreator(this.assignmentManager);
    this.assignmentList = new AssignmentList(this.assignmentManager);
    this.gradingUI = new GradingUI(supabaseClient);
    this.gradingQueue = new GradingQueue(supabaseClient);
    this.formatTemplatePage = new FormatTemplatePage(supabaseClient);
    
    // 设置全局引用（供模板库页面使用）
    window.formatTemplatePageInstance = this.formatTemplatePage;
    
    // 设置全局引用（供多班級管理使用）
    window.multiClassUI = this.multiClassUI;
    
    // 添加全局事件綁定檢查機制
    window.checkEventBinding = () => {
      console.log('🔍 檢查事件綁定狀態...');
      if (window.multiClassUI && window.multiClassUI.container) {
        const batchAddBtn = window.multiClassUI.container.querySelector('[data-action="batch-add-students"]');
        if (batchAddBtn) {
          console.log('✅ 找到批量添加學生按鈕，重新綁定事件');
          batchAddBtn.addEventListener('click', () => {
            console.log('🎯 批量添加學生按鈕被點擊！');
            window.multiClassUI.showBatchAddStudentsModal();
          });
        }
      }
    };
    
    this.currentPage = 'overview';
    this.container = null;
  }

  /**
   * 初始化并渲染儀表板
   */
  async initialize(container) {
    this.container = container;
    
    try {
      // 設置導航監聽
      this.setupNavigation();
      
      // 🚨 優化：徽章更新改為非阻塞異步執行
      // 不等待徽章更新完成，讓頁面立即開始渲染
      this.updatePendingGradingBadge().catch(error => {
        console.error('徽章更新失敗（非致命錯誤）:', error);
      });
      
      // 立即渲染初始頁面（作業管理）
      // 2025-10-20 更新：默認頁面從「班級管理」改為「作業管理」
      await this.navigate('assignments');
    } catch (error) {
      console.error('初始化失敗:', error);
      this.renderError(error.message);
    }
  }
  
  /**
   * 更新待批改徽章
   */
  async updatePendingGradingBadge() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      // 獲取老師的班級
      const { data: classes } = await this.supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id);
        
      if (!classes || classes.length === 0) {
        return;
      }
      
      const classIds = classes.map(c => c.id);
      
      // 獲取所有已發布任務
      const { data: assignments } = await this.supabase
        .from('assignments')
        .select('id')
        .in('class_id', classIds)
        .eq('is_published', true);
        
      if (!assignments || assignments.length === 0) {
        return;
      }
      
      const assignmentIds = assignments.map(a => a.id);
      
      // 統計待批改作業數量
      const { count } = await this.supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
        .in('assignment_id', assignmentIds)
        .eq('status', 'submitted');
      
      // 更新徽章
      const badge = document.getElementById('pending-grading-badge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
      
      console.log('✅ 待批改徽章已更新:', count);
      
    } catch (error) {
      console.error('❌ 更新待批改徽章失敗:', error);
    }
  }

  /**
   * 設置導航
   */
  setupNavigation() {
    // 監聽自定義導航事件
    window.addEventListener('navigate', (e) => {
      const { page, id, assignmentId } = e.detail;
      this.navigate(page, { id, assignmentId });
    });
    
    // 綁定導航標簽點擊事件
    this.setupNavTabs();
  }

  /**
   * 設置導航標簽
   */
  setupNavTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const page = e.currentTarget.getAttribute('data-page');
        
        // 更新標簽狀態
        navTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // 導航到頁面
        this.navigate(page);
      });
    });
  }

  /**
   * 導航到指定頁面
   */
  async navigate(page, params = {}) {
    console.log('🧭 導航到頁面:', page, params);
    
    this.currentPage = page;
    
    // 更新導航標簽激活狀態
    this.updateNavTabs(page);
    
    const mainContent = document.createElement('div');
    mainContent.id = 'mainContent';
    
    try {
      // 對于任務相關頁面，需要先确保 AssignmentManager 已初始化
      const needsAssignmentManager = ['assignments', 'assignment-create', 'assignment-edit'];
      if (needsAssignmentManager.includes(page)) {
        try {
          await this.assignmentManager.initialize();
        } catch (error) {
          // 如果没有班級，重定向到班級管理
          console.warn('需要先創建班級:', error.message);
          mainContent.innerHTML = `
            <div class="text-center py-12">
              <i class="fas fa-exclamation-triangle text-6xl text-amber-600 mb-4"></i>
              <h3 class="text-xl font-bold text-gray-900 mb-2">需要先創建班級</h3>
              <p class="text-gray-600 mb-6">在創建任務之前，請先創建班級并添加學生</p>
              <button onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'class-management' } }))" 
                      class="bg-stone-600 text-white px-6 py-2 rounded-lg hover:bg-stone-700">
                前往班級管理
              </button>
            </div>
          `;
          this.replaceContent(mainContent);
          return;
        }
      }
      
      switch (page) {
        case 'class-management':
          await this.multiClassUI.initialize(mainContent);
          break;
          
        case 'assignments':
          await this.assignmentList.render(mainContent);
          break;
          
        case 'assignment-create':
          await this.assignmentCreator.render(mainContent);
          break;
          
        case 'assignment-edit':
          console.log('🔧 進入編輯模式，任務 ID:', params.id);
          await this.assignmentCreator.render(mainContent, params.id);
          break;
          
        case 'grading-queue':
          await this.gradingQueue.render(mainContent);
          break;
          
        case 'grading':
          await this.gradingUI.render(mainContent, params.id);
          break;
          
        case 'format-templates':
          await this.formatTemplatePage.render(mainContent);
          break;
          
        default:
          mainContent.innerHTML = '<div class="error">頁面不存在</div>';
      }
      
      this.replaceContent(mainContent);
    } catch (error) {
      console.error('導航失敗:', error);
      mainContent.innerHTML = `<div class="error">加載失敗：${error.message}</div>`;
      this.replaceContent(mainContent);
    }
  }

  /**
   * 更新導航標簽激活狀態
   */
  updateNavTabs(page) {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      const tabPage = tab.getAttribute('data-page');
      if (tabPage === page) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  /**
   * 替換主內容區
   */
  replaceContent(newContent) {
    const oldContent = this.container.querySelector('#mainContent');
    if (oldContent) {
      oldContent.replaceWith(newContent);
    } else {
      this.container.appendChild(newContent);
    }
  }

  /**
   * 渲染錯誤信息
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="error-container">
        <i class="fas fa-exclamation-circle"></i>
        <h2>出错了</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

export default TeacherDashboard;

