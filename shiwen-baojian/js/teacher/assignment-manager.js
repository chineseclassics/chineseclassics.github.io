/**
 * 任務管理模块
 * 負責老師端的任務創建、編輯、刪除、發佈等功能
 */

class AssignmentManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUser = null;
    this.currentClass = null;
  }

  /**
   * 初始化任務管理器
   */
  async initialize() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      this.currentUser = user;

      // 加載老師的班級
      const { data: classes, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      if (!classes || classes.length === 0) {
        throw new Error('請先創建班級');
      }

      this.currentClass = classes[0];
      return true;
    } catch (error) {
      console.error('初始化任務管理器失敗:', error);
      throw error;
    }
  }

  /**
   * 創建新任務
   * @param {Object} assignmentData - 任務數據
   * @returns {Object} 創建的任務
   */
  async createAssignment(assignmentData) {
    try {
      const {
        title,
        dueDate,
        formatSpecId,  // 引用模式：格式ID
        gradingRubricJson,
        classId,  // 新增：班級ID
        isDraft = true
      } = assignmentData;

      // 驗證必需字段
      if (!title || !title.trim()) {
        throw new Error('請輸入任務標題');
      }

      if (!dueDate) {
        throw new Error('請設置截止日期');
      }

      if (!formatSpecId) {
        throw new Error('請選擇寫作指引');
      }

      if (!gradingRubricJson) {
        throw new Error('請選擇或設置評分標準');
      }

      if (!classId) {
        throw new Error('請選擇佈置班級');
      }

      const { data, error } = await this.supabase
        .from('assignments')
        .insert([
          {
            title: title.trim(),
            class_id: classId,  // 使用表單中選擇的班級ID
            teacher_id: this.currentUser.id,
            due_date: dueDate,
            format_spec_id: formatSpecId,  // 引用模式：保存格式ID
            grading_rubric_json: gradingRubricJson,
            is_published: !isDraft,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('創建任務失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取任務列表
   * @param {Object} filters - 筛选條件
   * @returns {Array} 任務列表
   */
  async getAssignments(filters = {}) {
    try {
      let query = this.supabase
        .from('assignments')
        .select(`
          *,
          class:classes(id, class_name)
        `)
        .eq('teacher_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      // 應用筛选
      if (filters.status === 'draft') {
        query = query.eq('is_published', false);
      } else if (filters.status === 'published') {
        query = query.eq('is_published', true);
      }

      if (filters.classId) {
        query = query.eq('class_id', filters.classId);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.time('⏱️ 載入作業列表');

      // 如果沒有作業，直接返回
      if (!data || data.length === 0) {
        return [];
      }

      // 一次性獲取所有作業的提交統計
      const assignmentIds = data.map(a => a.id);
      const classIds = [...new Set(data.map(a => a.class_id))];

      // 批量查詢：班級學生數
      const { data: classMemberData } = await this.supabase
        .from('class_members')
        .select('class_id')
        .in('class_id', classIds);

      // 批量查詢：提交和批改數
      const { data: essayStats } = await this.supabase
        .from('essays')
        .select('assignment_id, status')
        .in('assignment_id', assignmentIds)
        .in('status', ['submitted', 'graded']);

      // 在內存中聚合統計數據
      const enrichedAssignments = data.map(assignment => {
        const classStudents = classMemberData?.filter(m => m.class_id === assignment.class_id).length || 0;
        const essays = essayStats?.filter(e => e.assignment_id === assignment.id) || [];
        const submitted = essays.filter(e => e.status === 'submitted').length;
        const graded = essays.filter(e => e.status === 'graded').length;
        
        return {
          ...assignment,
          stats: {
            totalStudents: classStudents,
            submitted,
            graded
          }
        };
      });

      console.timeEnd('⏱️ 載入作業列表');
      return enrichedAssignments;
    } catch (error) {
      console.error('獲取任務列表失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取單個任務詳情
   * @param {string} assignmentId - 任務 ID
   * @returns {Object} 任務詳情
   */
  async getAssignment(assignmentId) {
    try {
      const { data, error } = await this.supabase
        .from('assignments')
        .select(`
          *,
          class:classes(id, class_name)
        `)
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser.id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('獲取任務詳情失敗:', error);
      throw error;
    }
  }

  /**
   * 更新任務
   * @param {string} assignmentId - 任務 ID
   * @param {Object} updates - 更新數據
   * @returns {Object} 更新後的任務
   */
  async updateAssignment(assignmentId, updates) {
    try {
      // 檢查任務是否存在
      const existing = await this.getAssignment(assignmentId);

      if (!existing) {
        throw new Error('任務不存在');
      }

      // 如果任務已發佈且有學生提交，警告但允許更新
      if (existing.is_published && !updates.confirmUpdate) {
        const { count } = await this.supabase
          .from('essays')
          .select('id', { count: 'exact', head: true })
          .eq('assignment_id', assignmentId);

        if (count > 0) {
          throw new Error('REQUIRES_CONFIRMATION');
        }
      }

      // 從 updates 中提取字段並轉換為數據庫列名（蛇形命名）
      const {
        confirmUpdate,  // 控制標志，不寫入數據庫
        title,
        dueDate,
        formatSpecId,
        gradingRubricJson,
        isDraft,
        ...otherUpdates
      } = updates;

      // 構建數據庫更新對象
      const dataToUpdate = {
        ...otherUpdates
      };

      if (title !== undefined) dataToUpdate.title = title.trim();
      if (dueDate !== undefined) dataToUpdate.due_date = dueDate;
      if (formatSpecId !== undefined) dataToUpdate.format_spec_id = formatSpecId;
      if (gradingRubricJson !== undefined) dataToUpdate.grading_rubric_json = gradingRubricJson;
      if (isDraft !== undefined) dataToUpdate.is_published = !isDraft;

      const { data, error } = await this.supabase
        .from('assignments')
        .update(dataToUpdate)
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('更新任務失敗:', error);
      throw error;
    }
  }

  /**
   * 發佈任務（從草稿轉為發佈狀態）
   * @param {string} assignmentId - 任務 ID
   * @returns {Object} 更新後的任務
   */
  async publishAssignment(assignmentId) {
    try {
      const assignment = await this.getAssignment(assignmentId);

      if (assignment.is_published) {
        throw new Error('任務已經發佈');
      }

      const { data, error } = await this.supabase
        .from('assignments')
        .update({ is_published: true })
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('發佈任務失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除任務
   * @param {string} assignmentId - 任務 ID
   * @param {boolean} confirmed - 是否已确認刪除
   * @returns {boolean} 刪除成功
   */
  async deleteAssignment(assignmentId, confirmed = false) {
    try {
      // 檢查是否有學生提交
      const { count: essayCount } = await this.supabase
        .from('essays')
        .select('id', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId);

      if (essayCount > 0 && !confirmed) {
        throw new Error('REQUIRES_CONFIRMATION_WITH_ESSAYS');
      }

      const { error } = await this.supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('刪除任務失敗:', error);
      throw error;
    }
  }

  /**
   * 複製任務
   * @param {string} assignmentId - 要複製的任務 ID
   * @returns {Object} 新任務
   */
  async duplicateAssignment(assignmentId) {
    try {
      const original = await this.getAssignment(assignmentId);

      if (!original) {
        throw new Error('任務不存在');
      }

      const duplicatedData = {
        title: `${original.title} (副本)`,
        formatSpecId: original.format_spec_id,  // 引用模式：复制格式ID
        gradingRubricJson: original.grading_rubric_json,
        isDraft: true,
        dueDate: null // 需要老師重新設置
      };

      const newAssignment = await this.createAssignment(duplicatedData);

      return newAssignment;
    } catch (error) {
      console.error('複製任務失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取任務統計數據（簡化版，只用於單個作業詳情頁）
   * @param {string} assignmentId - 任務 ID
   * @returns {Object} 統計數據
   */
  async getAssignmentStats(assignmentId) {
    try {
      // 獲取作業信息（包含 class_id）
      const { data: assignment } = await this.supabase
        .from('assignments')
        .select('class_id')
        .eq('id', assignmentId)
        .single();

      if (!assignment) {
        throw new Error('作業不存在');
      }

      // 獲取班級學生總數
      const { count: totalStudents } = await this.supabase
        .from('class_members')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', assignment.class_id);

      // 獲取已提交的作業數
      const { count: submitted } = await this.supabase
        .from('essays')
        .select('id', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId)
        .eq('status', 'submitted');

      // 獲取已批改的作業數
      const { count: graded } = await this.supabase
        .from('essays')
        .select('id', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId)
        .eq('status', 'graded');

      return {
        totalStudents: totalStudents || 0,
        submitted: submitted || 0,
        graded: graded || 0
      };
    } catch (error) {
      console.error('獲取任務統計失敗:', error);
      return {
        totalStudents: 0,
        submitted: 0,
        graded: 0
      };
    }
  }

  /**
   * 加載内置格式模板
   * @param {string} templateId - 模板 ID ('honglou-essay', 'argumentative-essay', etc.)
   * @returns {Object} 格式规范 JSON
   */
  async loadBuiltInTemplate(templateId) {
    try {
      let templateFile;

      switch (templateId) {
        case 'honglou-essay':
          templateFile = '/shiwen-baojian/assets/data/honglou-essay-format.json';
          break;
        // 可以添加更多模板
        default:
          throw new Error('未知的模板 ID');
      }

      const response = await fetch(templateFile);
      if (!response.ok) {
        throw new Error('加載模板失敗');
      }

      const templateJson = await response.json();
      return templateJson;
    } catch (error) {
      console.error('加載内置模板失敗:', error);
      throw error;
    }
  }

  /**
   * 加載内置評分標準
   * @param {string} rubricId - 評分標準 ID ('ib-myp', 'ib-dp', etc.)
   * @returns {Object} 評分標準 JSON
   */
  loadBuiltInRubric(rubricId) {
    // 這里先返回硬编碼的 IB MYP 標準
    // 未来可以從文件加載
    if (rubricId === 'ib-myp') {
      return {
        id: 'ib-myp',
        name: 'IB MYP 中國古典文學評分標準',
        criteria: [
          {
            code: 'A',
            name: '分析',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '學生没有达到以下任何細则所描述的標準。' },
              { range: '1-2', description: 'i. 對文本/材料的內容、背景、語言、結构、技巧和風格以及各种文本/材料之间的關系稍有分析...' },
              { range: '3-4', description: 'i. 尚充分地分析了文本/材料的內容、背景、語言、結构、技巧和風格...' },
              { range: '5-6', description: 'i. 熟練地分析了文本/材料的內容、背景、語言、結构、技巧和風格...' },
              { range: '7-8', description: 'i. 敏锐地分析了文本/材料的內容、背景、語言、結构、技巧和風格...' }
            ]
          },
          {
            code: 'B',
            name: '組織',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '學生没有达到以下任何細则所描述的標準。' },
              { range: '1-2', description: 'i. 對組織結构稍有采用，尽管不總是适合情境和意圖...' },
              { range: '3-4', description: 'i. 尚令人滿意地采用了适合情境和意圖的組織結构...' },
              { range: '5-6', description: 'i. 适当地采用了适合情境和意圖的組織結构...' },
              { range: '7-8', description: 'i. 巧妙地運用了組織結构，有效地服務于情境和意圖...' }
            ]
          },
          {
            code: 'C',
            name: '创作文本/材料',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '學生没有达到以下任何細则所描述的標準。' },
              { range: '1-2', description: 'i. 创作的文本/材料展示出個人對创作過程的投入有限...' },
              { range: '3-4', description: 'i. 创作的文本/材料展示出個人對创作過程的投入尚令人滿意...' },
              { range: '5-6', description: 'i. 创作的文本/材料展示出對创作過程相当好的個人投入...' },
              { range: '7-8', description: 'i. 创作的文本/材料展示出對创作過程高度的個人投入...' }
            ]
          },
          {
            code: 'D',
            name: '運用知识及語言',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '學生没有达到以下任何細则所描述的標準。' },
              { range: '1-2', description: 'i. 運用了有限范围的适当词汇和表达形式...' },
              { range: '3-4', description: 'i. 運用了一定范围的适当词汇、句子結构和表达形式...' },
              { range: '5-6', description: 'i. 熟練地運用了广泛而恰当的词汇、句子結构和表达形式...' },
              { range: '7-8', description: 'i. 有效地運用了一系列恰当的词汇、句子結构和表达形式...' }
            ]
          }
        ]
      };
    }

    throw new Error('未知的評分標準 ID');
  }
}

export default AssignmentManager;

