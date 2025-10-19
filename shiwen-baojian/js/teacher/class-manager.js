/**
 * 班级管理模块
 * 负责老师端的班级创建、学生管理、班级统计等功能
 */

class ClassManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentClass = null;
  }

  /**
   * 初始化班级管理器
   * 加载老师的班级信息
   */
  async initialize() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      // 加载老师的班级（MVP 版本只支持单个班级）
      const { data: classes, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      this.currentClass = classes && classes.length > 0 ? classes[0] : null;
      return this.currentClass;
    } catch (error) {
      console.error('初始化班级管理器失败:', error);
      throw error;
    }
  }

  /**
   * 创建新班级
   * @param {string} className - 班级名称
   * @param {string} description - 班级描述（可选）
   */
  async createClass(className, description = '') {
    try {
      // MVP 版本：检查是否已有班级
      if (this.currentClass) {
        throw new Error('MVP 版本仅支持单个班级，多班级功能即将推出');
      }

      if (!className || className.trim() === '') {
        throw new Error('请输入班级名称');
      }

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      const { data, error } = await this.supabase
        .from('classes')
        .insert([
          {
            class_name: className.trim(),
            description: description.trim(),
            teacher_id: user.id,
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      this.currentClass = data;
      return data;
    } catch (error) {
      console.error('创建班级失败:', error);
      throw error;
    }
  }

  /**
   * 批量添加学生
   * @param {string} emailListText - 邮箱列表文本（换行或逗号分隔）
   * @returns {Object} { validEmails, invalidEmails, duplicates, added }
   */
  async batchAddStudents(emailListText) {
    try {
      if (!this.currentClass) {
        throw new Error('请先创建班级');
      }

      // 解析邮箱列表
      const emails = this.parseEmailList(emailListText);
      const validationResult = this.validateEmails(emails);

      const { validEmails, invalidEmails } = validationResult;

      if (validEmails.length === 0) {
        throw new Error('没有有效的邮箱地址');
      }

      // 检查已存在的学生（包括 active 和 pending）
      const { data: activeMembers } = await this.supabase
        .from('class_members')
        .select('student:users!student_id(email)')
        .eq('class_id', this.currentClass.id);

      const { data: pendingMembers } = await this.supabase
        .from('pending_students')
        .select('email')
        .eq('class_id', this.currentClass.id);

      const existingEmails = new Set([
        ...(activeMembers?.map(m => m.student.email) || []),
        ...(pendingMembers?.map(p => p.email) || [])
      ]);

      const duplicates = validEmails.filter(email => existingEmails.has(email));
      const newEmails = validEmails.filter(email => !existingEmails.has(email));

      // 为新邮箱创建或查找用户记录
      const addedCount = await this.addStudentsToClass(newEmails);

      return {
        validEmails: validEmails.length,
        invalidEmails: invalidEmails.length,
        duplicates: duplicates.length,
        added: addedCount,
        invalidList: invalidEmails
      };
    } catch (error) {
      console.error('批量添加学生失败:', error);
      throw error;
    }
  }

  /**
   * 解析邮箱列表文本
   * @param {string} text - 邮箱列表文本
   * @returns {Array} 邮箱数组
   */
  parseEmailList(text) {
    if (!text) return [];

    // 按换行或逗号分隔，去除空白，过滤空字符串
    return text
      .split(/[\n,]/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email !== '');
  }

  /**
   * 验证邮箱列表
   * @param {Array} emails - 邮箱数组
   * @returns {Object} { validEmails, invalidEmails }
   */
  validateEmails(emails) {
    const emailPattern = /^[a-zA-Z0-9._-]+@student\.isf\.edu\.hk$/;
    const validEmails = [];
    const invalidEmails = [];

    emails.forEach(email => {
      if (emailPattern.test(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    });

    return { validEmails, invalidEmails };
  }

  /**
   * 添加学生到班级（方案 A：使用 pending_students 表）
   * @param {Array} emails - 学生邮箱数组
   * @returns {number} 成功添加的学生数
   */
  async addStudentsToClass(emails) {
    if (emails.length === 0) return 0;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      let addedCount = 0;

      // 批量添加到 pending_students 表
      for (const email of emails) {
        try {
          const { error: addError } = await this.supabase
            .from('pending_students')
            .insert([
              {
                class_id: this.currentClass.id,
                email: email,
                added_by: user.id
              }
            ]);

          if (addError) {
            // 如果是唯一约束冲突（邮箱已存在），跳过
            if (addError.code === '23505') {
              console.log(`邮箱 ${email} 已在待加入列表中`);
            } else {
              console.warn(`添加邮箱 ${email} 失败:`, addError);
            }
            continue;
          }

          addedCount++;
        } catch (emailError) {
          console.warn(`处理邮箱 ${email} 时出错:`, emailError);
        }
      }

      return addedCount;
    } catch (error) {
      console.error('添加学生到班级失败:', error);
      throw error;
    }
  }

  /**
   * 获取班级成员列表（包括 active 和 pending 学生）
   * @returns {Array} 学生列表
   */
  async getClassMembers() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班级');
      }

      // 获取已激活的学生（已登录）
      const { data: activeMembers, error: activeError } = await this.supabase
        .from('class_members')
        .select(`
          id,
          student_id,
          added_at,
          student:users!student_id(
            id,
            email,
            display_name,
            status,
            last_login_at
          )
        `)
        .eq('class_id', this.currentClass.id)
        .order('added_at', { ascending: false });

      if (activeError) throw activeError;

      // 获取待激活的学生（老师添加但未登录）
      const { data: pendingStudents, error: pendingError } = await this.supabase
        .from('pending_students')
        .select('id, email, added_at, added_by')
        .eq('class_id', this.currentClass.id)
        .order('added_at', { ascending: false });

      if (pendingError) throw pendingError;

      // 合并并丰富数据
      const activeEnriched = await Promise.all(
        (activeMembers || []).map(async member => {
          const activityStatus = this.calculateActivityStatus(member.student.last_login_at);
          const assignmentProgress = await this.getStudentAssignmentProgress(member.student_id);

          return {
            id: member.id,
            userId: member.student_id,
            email: member.student.email,
            displayName: member.student.display_name,
            status: 'active', // 已激活
            isPending: false,
            lastLoginAt: member.student.last_login_at,
            activityStatus: activityStatus,
            assignmentProgress: assignmentProgress,
            addedAt: member.added_at
          };
        })
      );

      const pendingEnriched = (pendingStudents || []).map(pending => ({
        id: pending.id,
        userId: null,
        email: pending.email,
        displayName: `待激活-${pending.email.split('@')[0]}`,
        status: 'pending', // 待激活
        isPending: true,
        lastLoginAt: null,
        activityStatus: 'pending',
        assignmentProgress: { completed: 0, total: 0 },
        addedAt: pending.added_at
      }));

      // 合并两个列表
      const allMembers = [...activeEnriched, ...pendingEnriched];

      // 按添加时间排序
      allMembers.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

      return allMembers;
    } catch (error) {
      console.error('获取班级成员失败:', error);
      throw error;
    }
  }

  /**
   * 计算学生活跃状态
   * @param {string} lastLoginAt - 最后登录时间
   * @returns {string} 'active' | 'inactive' | 'dormant' | 'pending'
   */
  calculateActivityStatus(lastLoginAt) {
    if (!lastLoginAt) return 'dormant';

    const now = new Date();
    const lastLogin = new Date(lastLoginAt);
    const daysSinceLogin = (now - lastLogin) / (1000 * 60 * 60 * 24);

    if (daysSinceLogin <= 3) return 'active';
    if (daysSinceLogin <= 7) return 'inactive';
    return 'dormant';
  }

  /**
   * 获取学生的作业进度
   * @param {string} userId - 学生 ID
   * @returns {Object} { completed, total }
   */
  async getStudentAssignmentProgress(userId) {
    try {
      // 获取班级的所有任务
      const { data: assignments, error: assignmentsError } = await this.supabase
        .from('assignments')
        .select('id')
        .eq('class_id', this.currentClass.id);

      if (assignmentsError) throw assignmentsError;

      const totalAssignments = assignments.length;

      if (totalAssignments === 0) {
        return { completed: 0, total: 0 };
      }

      // 获取学生已完成的作业
      const { data: essays, error: essaysError } = await this.supabase
        .from('essays')
        .select('id')
        .eq('student_id', userId)
        .in('assignment_id', assignments.map(a => a.id))
        .eq('status', 'submitted');

      if (essaysError) throw essaysError;

      const completedAssignments = essays.length;

      return {
        completed: completedAssignments,
        total: totalAssignments
      };
    } catch (error) {
      console.error('获取学生作业进度失败:', error);
      return { completed: 0, total: 0 };
    }
  }

  /**
   * 从班级移除学生
   * @param {string} memberId - 成员记录 ID
   * @param {boolean} isPending - 是否为待激活学生
   */
  async removeStudent(memberId, isPending = false) {
    try {
      if (isPending) {
        // 删除 pending_students 记录
        const { error } = await this.supabase
          .from('pending_students')
          .delete()
          .eq('id', memberId)
          .eq('class_id', this.currentClass.id);

        if (error) throw error;
      } else {
        // 删除 class_members 记录
        const { error } = await this.supabase
          .from('class_members')
          .delete()
          .eq('id', memberId)
          .eq('class_id', this.currentClass.id);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('移除学生失败:', error);
      throw error;
    }
  }

  /**
   * 停用班级
   */
  async deactivateClass() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班级');
      }

      const { error } = await this.supabase
        .from('classes')
        .update({ is_active: false })
        .eq('id', this.currentClass.id);

      if (error) throw error;

      this.currentClass.is_active = false;
      return true;
    } catch (error) {
      console.error('停用班级失败:', error);
      throw error;
    }
  }

  /**
   * 激活班级
   */
  async activateClass() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班级');
      }

      const { error } = await this.supabase
        .from('classes')
        .update({ is_active: true })
        .eq('id', this.currentClass.id);

      if (error) throw error;

      this.currentClass.is_active = true;
      return true;
    } catch (error) {
      console.error('激活班级失败:', error);
      throw error;
    }
  }

  /**
   * 获取班级统计数据
   * @returns {Object} 班级统计信息
   */
  async getClassStatistics() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班级');
      }

      // 获取学生总数（active + pending）
      const { count: activeStudentsCount } = await this.supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      const { count: pendingStudentsCount } = await this.supabase
        .from('pending_students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      const totalStudents = (activeStudentsCount || 0) + (pendingStudentsCount || 0);

      // 获取活跃学生数（最近 7 天登录）
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: activeStudents, error: activeError } = await this.supabase
        .from('class_members')
        .select('student:users!student_id(*)', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id)
        .gte('student.last_login_at', sevenDaysAgo.toISOString());

      if (activeError) throw activeError;

      // 获取任务总数
      const { count: totalAssignments, error: assignmentsError } = await this.supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      if (assignmentsError) throw assignmentsError;

      // 获取待批改作业数
      // 先获取该班级的所有任务ID
      const assignmentIds = totalAssignments > 0
        ? (await this.supabase
            .from('assignments')
            .select('id')
            .eq('class_id', this.currentClass.id)
          ).data?.map(a => a.id) || []
        : [];

      let pendingGrading = 0;
      if (assignmentIds.length > 0) {
        const { count, error: pendingError } = await this.supabase
          .from('essays')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignmentIds)
          .eq('status', 'submitted')
          .is('graded_at', null);

        if (pendingError) {
          console.warn('获取待批改作业数失败:', pendingError);
        } else {
          pendingGrading = count || 0;
        }
      }

      // 计算平均完成率（只计算已激活的学生）
      let averageCompletion = 0;
      if (activeStudentsCount > 0 && totalAssignments > 0 && assignmentIds.length > 0) {
        const { count: completedEssays, error: completedError } = await this.supabase
          .from('essays')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignmentIds)
          .eq('status', 'submitted');

        if (completedError) throw completedError;

        averageCompletion = Math.round((completedEssays / (activeStudentsCount * totalAssignments)) * 100);
      }

      return {
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        totalAssignments: totalAssignments || 0,
        pendingGrading: pendingGrading,
        averageCompletion: averageCompletion
      };
    } catch (error) {
      console.error('获取班级统计失败:', error);
      return {
        totalStudents: 0,
        activeStudents: 0,
        totalAssignments: 0,
        pendingGrading: 0,
        averageCompletion: 0
      };
    }
  }
}

export default ClassManager;

