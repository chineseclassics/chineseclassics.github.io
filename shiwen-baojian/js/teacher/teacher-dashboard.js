/**
 * 老师端主仪表板
 * 整合班级管理、任务管理、批改功能
 */

import ClassManager from './class-manager.js';
import ClassUI from './class-ui.js';
import AssignmentManager from './assignment-manager.js';
import AssignmentCreator from './assignment-creator.js';
import AssignmentList from './assignment-list.js';
import GradingUI from './grading-ui.js';

class TeacherDashboard {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.classManager = new ClassManager(supabaseClient);
    this.classUI = new ClassUI(this.classManager);
    this.assignmentManager = new AssignmentManager(supabaseClient);
    this.assignmentCreator = new AssignmentCreator(this.assignmentManager);
    this.assignmentList = new AssignmentList(this.assignmentManager);
    this.gradingUI = new GradingUI(supabaseClient);
    
    this.currentPage = 'overview';
    this.container = null;
  }

  /**
   * 初始化并渲染仪表板
   */
  async initialize(container) {
    this.container = container;
    
    try {
      // 设置导航监听
      this.setupNavigation();
      
      // 渲染初始页面（班级管理）
      // 注意：不在这里初始化 AssignmentManager，因为可能还没有班级
      // AssignmentManager 会在有班级后按需初始化
      await this.navigate('class-management');
    } catch (error) {
      console.error('初始化失败:', error);
      this.renderError(error.message);
    }
  }

  /**
   * 设置导航
   */
  setupNavigation() {
    // 监听自定义导航事件
    window.addEventListener('navigate', (e) => {
      const { page, id, assignmentId } = e.detail;
      this.navigate(page, { id, assignmentId });
    });
    
    // 绑定导航标签点击事件
    this.setupNavTabs();
  }

  /**
   * 设置导航标签
   */
  setupNavTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const page = e.currentTarget.getAttribute('data-page');
        
        // 更新标签状态
        navTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // 导航到页面
        this.navigate(page);
      });
    });
  }

  /**
   * 导航到指定页面
   */
  async navigate(page, params = {}) {
    this.currentPage = page;
    
    // 更新导航标签激活状态
    this.updateNavTabs(page);
    
    const mainContent = document.createElement('div');
    mainContent.id = 'mainContent';
    
    try {
      // 对于任务相关页面，需要先确保 AssignmentManager 已初始化
      const needsAssignmentManager = ['assignments', 'assignment-create', 'assignment-edit'];
      if (needsAssignmentManager.includes(page)) {
        try {
          await this.assignmentManager.initialize();
        } catch (error) {
          // 如果没有班级，重定向到班级管理
          console.warn('需要先创建班级:', error.message);
          mainContent.innerHTML = `
            <div class="text-center py-12">
              <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
              <h3 class="text-xl font-bold text-gray-900 mb-2">需要先创建班级</h3>
              <p class="text-gray-600 mb-6">在创建任务之前，请先创建班级并添加学生</p>
              <button onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'class-management' } }))" 
                      class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                前往班级管理
              </button>
            </div>
          `;
          this.replaceContent(mainContent);
          return;
        }
      }
      
      switch (page) {
        case 'class-management':
          await this.classUI.initialize(mainContent);
          break;
          
        case 'assignments':
          await this.assignmentList.render(mainContent);
          break;
          
        case 'assignment-create':
          await this.assignmentCreator.render(mainContent);
          break;
          
        case 'assignment-edit':
          await this.assignmentCreator.render(mainContent, params.id);
          break;
          
        case 'grading':
          await this.gradingUI.render(mainContent, params.id);
          break;
          
        default:
          mainContent.innerHTML = '<div class="error">页面不存在</div>';
      }
      
      this.replaceContent(mainContent);
    } catch (error) {
      console.error('导航失败:', error);
      mainContent.innerHTML = `<div class="error">加载失败：${error.message}</div>`;
      this.replaceContent(mainContent);
    }
  }

  /**
   * 更新导航标签激活状态
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
   * 替换主内容区
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
   * 渲染错误信息
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

