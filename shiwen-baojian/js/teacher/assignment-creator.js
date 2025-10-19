/**
 * 任务创建器 UI（精简版）
 * MVP 阶段实现核心功能
 */

import AssignmentManager from './assignment-manager.js';

class AssignmentCreator {
  constructor(assignmentManager) {
    this.assignmentManager = assignmentManager;
    this.container = null;
    this.selectedTemplate = null;
    this.selectedRubric = 'ib-myp';
  }

  /**
   * 渲染任务创建表单
   */
  async render(container, assignmentId = null) {
    this.container = container;

    // 如果是编辑模式，加载现有任务数据
    let existingAssignment = null;
    if (assignmentId) {
      existingAssignment = await this.assignmentManager.getAssignment(assignmentId);
    }

    const isEdit = !!existingAssignment;

    this.container.innerHTML = `
      <div class="assignment-creator">
        <div class="creator-header">
          <h2>${isEdit ? '编辑任务' : '创建新任务'}</h2>
          <button id="backBtn" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i> 返回
          </button>
        </div>

        <form id="assignmentForm" class="assignment-form">
          <!-- 基本信息 -->
          <section class="form-section">
            <h3>基本信息</h3>
            
            <div class="form-group">
              <label>任务标题 <span class="required">*</span></label>
              <input
                type="text"
                name="title"
                value="${existingAssignment?.title || ''}"
                placeholder="例如：《红楼梦》研习论文"
                required
              />
            </div>

            <div class="form-group">
              <label>任务描述</label>
              <textarea
                name="description"
                rows="4"
                placeholder="说明写作任务的目标、重点和要求..."
              >${existingAssignment?.description || ''}</textarea>
            </div>

            <div class="form-group">
              <label>截止日期 <span class="required">*</span></label>
              <input
                type="datetime-local"
                name="dueDate"
                value="${existingAssignment?.due_date ? new Date(existingAssignment.due_date).toISOString().slice(0, 16) : ''}"
                required
              />
            </div>
          </section>

          <!-- 格式要求 -->
          <section class="form-section">
            <h3>格式要求</h3>
            
            <div class="form-group">
              <label>选择模板</label>
              <select id="templateSelector" name="template">
                <option value="">-- 选择模板 --</option>
                <option value="honglou-essay">📚 红楼梦论文模板</option>
                <option value="custom">✏️ 自定义（空白模板）</option>
              </select>
            </div>

            <div id="templatePreview" class="template-preview" style="display: none;">
              <p class="text-muted">模板预览区域</p>
            </div>
          </section>

          <!-- 评分标准 -->
          <section class="form-section">
            <h3>评分标准</h3>
            
            <div class="form-group">
              <label>选择评分标准</label>
              <select name="rubric">
                <option value="ib-myp" selected>IB MYP 中国古典文学评分标准</option>
              </select>
            </div>

            <div class="rubric-info">
              <p><i class="fas fa-info-circle"></i> 使用 A/B/C/D 四个标准，每个标准 0-8 分</p>
            </div>
          </section>

          <!-- 表单操作 -->
          <div class="form-actions">
            <button type="button" id="saveDraftBtn" class="btn btn-secondary">
              <i class="fas fa-save"></i> 保存草稿
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-paper-plane"></i> ${isEdit ? '更新任务' : '发布任务'}
            </button>
          </div>
        </form>
      </div>
    `;

    this.bindEvents(assignmentId);
  }

  /**
   * 绑定事件
   */
  bindEvents(assignmentId) {
    const form = document.getElementById('assignmentForm');
    const templateSelector = document.getElementById('templateSelector');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const backBtn = document.getElementById('backBtn');

    // 模板选择
    templateSelector.addEventListener('change', async (e) => {
      await this.handleTemplateChange(e.target.value);
    });

    // 保存草稿
    saveDraftBtn.addEventListener('click', async () => {
      await this.handleSubmit(form, true, assignmentId);
    });

    // 发布任务
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(form, false, assignmentId);
    });

    // 返回
    backBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'assignments' } }));
    });
  }

  /**
   * 处理模板变更
   */
  async handleTemplateChange(templateId) {
    if (!templateId) {
      this.selectedTemplate = null;
      return;
    }

    try {
      if (templateId === 'custom') {
        this.selectedTemplate = this.getEmptyTemplate();
      } else {
        this.selectedTemplate = await this.assignmentManager.loadBuiltInTemplate(templateId);
      }

      // 显示预览
      const preview = document.getElementById('templatePreview');
      preview.style.display = 'block';
      preview.innerHTML = `
        <h4>${this.selectedTemplate.name}</h4>
        <p>${this.selectedTemplate.description}</p>
      `;
    } catch (error) {
      console.error('加载模板失败:', error);
      alert('加载模板失败：' + error.message);
    }
  }

  /**
   * 处理表单提交
   */
  async handleSubmit(form, isDraft, assignmentId) {
    try {
      const formData = new FormData(form);

      if (!this.selectedTemplate) {
        alert('请选择格式模板');
        return;
      }

      const rubric = this.assignmentManager.loadBuiltInRubric(formData.get('rubric'));

      const assignmentData = {
        title: formData.get('title'),
        description: formData.get('description'),
        dueDate: formData.get('dueDate'),
        formatSpecJson: this.selectedTemplate,
        gradingRubricJson: rubric,
        isDraft
      };

      // 禁用提交按钮
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

      let result;
      if (assignmentId) {
        // 更新现有任务
        result = await this.assignmentManager.updateAssignment(assignmentId, {
          ...assignmentData,
          is_published: !isDraft
        });
      } else {
        // 创建新任务
        result = await this.assignmentManager.createAssignment(assignmentData);
      }

      // 显示成功消息
      this.showToast('success', isDraft ? '草稿已保存' : '任务已发布');

      // 返回任务列表
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'assignments' } }));
      }, 1000);

    } catch (error) {
      console.error('保存任务失败:', error);
      alert('保存任务失败：' + error.message);

      // 恢复按钮
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = assignmentId ? '更新任务' : '发布任务';
    }
  }

  /**
   * 获取空白模板
   */
  getEmptyTemplate() {
    return {
      id: 'custom',
      name: '自定义格式',
      description: '自定义论文格式要求',
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
          name: '结论',
          required_elements: []
        }
      }
    };
  }

  /**
   * 显示提示消息
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

