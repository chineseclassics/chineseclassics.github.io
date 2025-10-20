/**
 * 任務創建器 UI（精简版）
 * MVP 阶段實現核心功能
 */

import AssignmentManager from './assignment-manager.js';

class AssignmentCreator {
  constructor(assignmentManager) {
    this.assignmentManager = assignmentManager;
    this.container = null;
    this.selectedTemplate = null;
    this.selectedTemplateId = null;  // 保存格式ID（引用模式）
    this.selectedRubric = 'ib-myp';
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
              設置任務的基本信息、格式要求和評分標準
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

          <!-- 格式要求 -->
          <section class="form-section">
            <h3><i class="fas fa-file-alt" style="color: #3498db; margin-right: 0.5rem;"></i>格式要求</h3>
            
            <div class="form-group">
              <label>選擇格式模板 <span class="required">*</span></label>
              <select id="templateSelector" name="template" required>
                <option value="">-- 請選擇格式模板 --</option>
                <option value="honglou-essay">📚 紅樓夢論文格式（推荐）</option>
                <option value="custom">✏️ 自定義空白模板</option>
              </select>
              <p class="help-text">格式模板定義了論文的結构要求和评价维度</p>
            </div>

            <div id="templatePreview" class="template-preview" style="display: none;">
              <p class="text-muted">模板預覽區域</p>
            </div>
          </section>

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
    
    console.log('✅ 表單事件綁定完成');
  }

  /**
   * 處理模板變更
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
      
      if (templateId === 'custom') {
        this.selectedTemplate = this.getEmptyTemplate();
      } else {
        this.selectedTemplate = await this.assignmentManager.loadBuiltInTemplate(templateId);
      }

      // 顯示預覽
      const preview = this.container.querySelector('#templatePreview');
      if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = `
          <h4>${this.selectedTemplate.name}</h4>
          <p>${this.selectedTemplate.description}</p>
        `;
      }
    } catch (error) {
      console.error('加載模板失敗:', error);
      alert('加載模板失敗：' + error.message);
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

