/**
 * 任务管理模块
 * 负责老师端的任务创建、编辑、删除、发布等功能
 */

class AssignmentManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUser = null;
    this.currentClass = null;
  }

  /**
   * 初始化任务管理器
   */
  async initialize() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      this.currentUser = user;

      // 加载老师的班级
      const { data: classes, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      if (!classes || classes.length === 0) {
        throw new Error('请先创建班级');
      }

      this.currentClass = classes[0];
      return true;
    } catch (error) {
      console.error('初始化任务管理器失败:', error);
      throw error;
    }
  }

  /**
   * 创建新任务
   * @param {Object} assignmentData - 任务数据
   * @returns {Object} 创建的任务
   */
  async createAssignment(assignmentData) {
    try {
      const {
        title,
        description,
        dueDate,
        formatSpecJson,
        gradingRubricJson,
        isDraft = true
      } = assignmentData;

      // 验证必需字段
      if (!title || !title.trim()) {
        throw new Error('请输入任务标题');
      }

      if (!dueDate) {
        throw new Error('请设置截止日期');
      }

      if (!formatSpecJson) {
        throw new Error('请选择或设置格式要求');
      }

      if (!gradingRubricJson) {
        throw new Error('请选择或设置评分标准');
      }

      const { data, error } = await this.supabase
        .from('assignments')
        .insert([
          {
            title: title.trim(),
            description: description?.trim() || '',
            class_id: this.currentClass.id,
            teacher_id: this.currentUser.id,
            due_date: dueDate,
            format_spec_json: formatSpecJson,
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
      console.error('创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务列表
   * @param {Object} filters - 筛选条件
   * @returns {Array} 任务列表
   */
  async getAssignments(filters = {}) {
    try {
      let query = this.supabase
        .from('assignments')
        .select(`
          *,
          class:classes(id, name),
          essay_stats:essays(count)
        `)
        .eq('teacher_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      // 应用筛选
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

      // 为每个任务计算额外统计信息
      const enrichedAssignments = await Promise.all(
        data.map(async assignment => {
          const stats = await this.getAssignmentStats(assignment.id);
          return {
            ...assignment,
            stats
          };
        })
      );

      return enrichedAssignments;
    } catch (error) {
      console.error('获取任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个任务详情
   * @param {string} assignmentId - 任务 ID
   * @returns {Object} 任务详情
   */
  async getAssignment(assignmentId) {
    try {
      const { data, error } = await this.supabase
        .from('assignments')
        .select(`
          *,
          class:classes(id, name)
        `)
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser.id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('获取任务详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务
   * @param {string} assignmentId - 任务 ID
   * @param {Object} updates - 更新数据
   * @returns {Object} 更新后的任务
   */
  async updateAssignment(assignmentId, updates) {
    try {
      // 检查任务是否存在
      const existing = await this.getAssignment(assignmentId);

      if (!existing) {
        throw new Error('任务不存在');
      }

      // 如果任务已发布且有学生提交，警告但允许更新
      if (existing.is_published && !updates.confirmUpdate) {
        const { count } = await this.supabase
          .from('essays')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignmentId);

        if (count > 0) {
          throw new Error('REQUIRES_CONFIRMATION');
        }
      }

      const { data, error } = await this.supabase
        .from('assignments')
        .update(updates)
        .eq('id', assignmentId)
        .eq('teacher_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('更新任务失败:', error);
      throw error;
    }
  }

  /**
   * 发布任务（从草稿转为发布状态）
   * @param {string} assignmentId - 任务 ID
   * @returns {Object} 更新后的任务
   */
  async publishAssignment(assignmentId) {
    try {
      const assignment = await this.getAssignment(assignmentId);

      if (assignment.is_published) {
        throw new Error('任务已经发布');
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
      console.error('发布任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除任务
   * @param {string} assignmentId - 任务 ID
   * @param {boolean} confirmed - 是否已确认删除
   * @returns {boolean} 删除成功
   */
  async deleteAssignment(assignmentId, confirmed = false) {
    try {
      // 检查是否有学生提交
      const { count: essayCount } = await this.supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
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
      console.error('删除任务失败:', error);
      throw error;
    }
  }

  /**
   * 复制任务
   * @param {string} assignmentId - 要复制的任务 ID
   * @returns {Object} 新任务
   */
  async duplicateAssignment(assignmentId) {
    try {
      const original = await this.getAssignment(assignmentId);

      if (!original) {
        throw new Error('任务不存在');
      }

      const duplicatedData = {
        title: `${original.title} (副本)`,
        description: original.description,
        formatSpecJson: original.format_spec_json,
        gradingRubricJson: original.grading_rubric_json,
        isDraft: true,
        dueDate: null // 需要老师重新设置
      };

      const newAssignment = await this.createAssignment(duplicatedData);

      return newAssignment;
    } catch (error) {
      console.error('复制任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务统计数据
   * @param {string} assignmentId - 任务 ID
   * @returns {Object} 统计数据
   */
  async getAssignmentStats(assignmentId) {
    try {
      // 获取班级学生总数
      const { count: totalStudents } = await this.supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      // 获取已提交的作业数
      const { count: submitted } = await this.supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId)
        .eq('is_submitted', true);

      // 获取已批改的作业数
      const { count: graded } = await this.supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId)
        .not('graded_at', 'is', null);

      // 获取平均字数（从已提交的作业中计算）
      const { data: essays } = await this.supabase
        .from('essays')
        .select('word_count')
        .eq('assignment_id', assignmentId)
        .eq('is_submitted', true);

      const avgWordCount = essays && essays.length > 0
        ? Math.round(essays.reduce((sum, e) => sum + (e.word_count || 0), 0) / essays.length)
        : 0;

      // 获取平均 AI 反馈次数
      const { data: feedbackCounts } = await this.supabase
        .from('essays')
        .select(`
          id,
          ai_feedback:ai_feedback(count)
        `)
        .eq('assignment_id', assignmentId)
        .eq('is_submitted', true);

      const avgFeedbackCount = feedbackCounts && feedbackCounts.length > 0
        ? (feedbackCounts.reduce((sum, e) => sum + (e.ai_feedback?.length || 0), 0) / feedbackCounts.length).toFixed(1)
        : 0;

      return {
        totalStudents: totalStudents || 0,
        submitted: submitted || 0,
        graded: graded || 0,
        avgWordCount,
        avgFeedbackCount
      };
    } catch (error) {
      console.error('获取任务统计失败:', error);
      return {
        totalStudents: 0,
        submitted: 0,
        graded: 0,
        avgWordCount: 0,
        avgFeedbackCount: 0
      };
    }
  }

  /**
   * 加载内置格式模板
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
        throw new Error('加载模板失败');
      }

      const templateJson = await response.json();
      return templateJson;
    } catch (error) {
      console.error('加载内置模板失败:', error);
      throw error;
    }
  }

  /**
   * 加载内置评分标准
   * @param {string} rubricId - 评分标准 ID ('ib-myp', 'ib-dp', etc.)
   * @returns {Object} 评分标准 JSON
   */
  loadBuiltInRubric(rubricId) {
    // 这里先返回硬编码的 IB MYP 标准
    // 未来可以从文件加载
    if (rubricId === 'ib-myp') {
      return {
        id: 'ib-myp',
        name: 'IB MYP 中国古典文学评分标准',
        criteria: [
          {
            code: 'A',
            name: '分析',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '学生没有达到以下任何细则所描述的标准。' },
              { range: '1-2', description: 'i. 对文本/材料的内容、背景、语言、结构、技巧和风格以及各种文本/材料之间的关系稍有分析...' },
              { range: '3-4', description: 'i. 尚充分地分析了文本/材料的内容、背景、语言、结构、技巧和风格...' },
              { range: '5-6', description: 'i. 熟练地分析了文本/材料的内容、背景、语言、结构、技巧和风格...' },
              { range: '7-8', description: 'i. 敏锐地分析了文本/材料的内容、背景、语言、结构、技巧和风格...' }
            ]
          },
          {
            code: 'B',
            name: '组织',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '学生没有达到以下任何细则所描述的标准。' },
              { range: '1-2', description: 'i. 对组织结构稍有采用，尽管不总是适合情境和意图...' },
              { range: '3-4', description: 'i. 尚令人满意地采用了适合情境和意图的组织结构...' },
              { range: '5-6', description: 'i. 适当地采用了适合情境和意图的组织结构...' },
              { range: '7-8', description: 'i. 巧妙地运用了组织结构，有效地服务于情境和意图...' }
            ]
          },
          {
            code: 'C',
            name: '创作文本/材料',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '学生没有达到以下任何细则所描述的标准。' },
              { range: '1-2', description: 'i. 创作的文本/材料展示出个人对创作过程的投入有限...' },
              { range: '3-4', description: 'i. 创作的文本/材料展示出个人对创作过程的投入尚令人满意...' },
              { range: '5-6', description: 'i. 创作的文本/材料展示出对创作过程相当好的个人投入...' },
              { range: '7-8', description: 'i. 创作的文本/材料展示出对创作过程高度的个人投入...' }
            ]
          },
          {
            code: 'D',
            name: '运用知识及语言',
            maxScore: 8,
            descriptors: [
              { range: '0', description: '学生没有达到以下任何细则所描述的标准。' },
              { range: '1-2', description: 'i. 运用了有限范围的适当词汇和表达形式...' },
              { range: '3-4', description: 'i. 运用了一定范围的适当词汇、句子结构和表达形式...' },
              { range: '5-6', description: 'i. 熟练地运用了广泛而恰当的词汇、句子结构和表达形式...' },
              { range: '7-8', description: 'i. 有效地运用了一系列恰当的词汇、句子结构和表达形式...' }
            ]
          }
        ]
      };
    }

    throw new Error('未知的评分标准 ID');
  }
}

export default AssignmentManager;

