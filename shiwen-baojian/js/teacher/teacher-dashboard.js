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
      // 初始化管理器
      await this.assignmentManager.initialize();
      
      // 设置导航监听
      this.setupNavigation();
      
      // 渲染初始页面
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
    window.addEventListener('navigate', (e) => {
      const { page, id, assignmentId } = e.detail;
      this.navigate(page, { id, assignmentId });
    });
  }

  /**
   * 导航到指定页面
   */
  async navigate(page, params = {}) {
    this.currentPage = page;
    
    const mainContent = document.createElement('div');
    mainContent.id = 'mainContent';
    
    try {
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
      
      // 替换内容
      const oldContent = this.container.querySelector('#mainContent');
      if (oldContent) {
        oldContent.replaceWith(mainContent);
      } else {
        this.container.appendChild(mainContent);
      }
    } catch (error) {
      console.error('导航失败:', error);
      mainContent.innerHTML = `<div class="error">加载失败：${error.message}</div>`;
      this.container.appendChild(mainContent);
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

