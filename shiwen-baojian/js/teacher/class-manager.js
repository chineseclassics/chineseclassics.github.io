/**
 * 班級管理模块
 * 負責老師端的班級創建、學生管理、班級統計等功能
 */

class ClassManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentClass = null;
  }

  /**
   * 初始化班級管理器
   * 加載老師的班級信息
   */
  async initialize() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      // 加載老師的所有班級
      const { data: classes, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.currentClass = classes && classes.length > 0 ? classes[0] : null;
      return this.currentClass;
    } catch (error) {
      console.error('初始化班級管理器失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取老師的所有班級
   * @returns {Array} 班級列表
   */
  async getAllClasses() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      const { data: classes, error } = await this.supabase
        .from('classes')
        .select(`
          *,
          class_members(count),
          assignments(count)
        `)
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 格式化班級數據，包含統計信息
      return classes.map(classData => ({
        ...classData,
        student_count: classData.class_members?.[0]?.count || 0,
        assignment_count: classData.assignments?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('獲取班級列表失敗:', error);
      throw error;
    }
  }

  /**
   * 切換當前班級
   * @param {string} classId - 班級 ID
   */
  async switchClass(classId) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      const { data: classData, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      this.currentClass = classData;
      return this.currentClass;
    } catch (error) {
      console.error('切換班級失敗:', error);
      throw error;
    }
  }

  /**
   * 創建新班級
   * @param {string} className - 班級名稱
   * @param {string} description - 班級描述（可選）
   */
  async createClass(className, description = '') {
    try {
      // 先獲取用戶信息
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      if (!className || className.trim() === '') {
        throw new Error('請輸入班級名稱');
      }

      // 檢查班級名稱是否重複
      const { data: existingClasses } = await this.supabase
        .from('classes')
        .select('class_name')
        .eq('teacher_id', user.id)
        .eq('is_active', true);
      
      if (existingClasses && existingClasses.some(c => c.class_name === className.trim())) {
        throw new Error('班級名稱已存在，請使用不同的名稱');
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
      console.error('創建班級失敗:', error);
      throw error;
    }
  }

  /**
   * 編輯班級信息
   * @param {string} classId - 班級 ID
   * @param {string} className - 新班級名稱
   * @param {string} description - 新班級描述
   */
  async editClass(classId, className, description = '') {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      if (!className || className.trim() === '') {
        throw new Error('請輸入班級名稱');
      }

      // 檢查班級名稱是否重複（排除當前班級）
      const { data: existingClasses } = await this.supabase
        .from('classes')
        .select('class_name')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .neq('id', classId);
      
      if (existingClasses && existingClasses.some(c => c.class_name === className.trim())) {
        throw new Error('班級名稱已存在，請使用不同的名稱');
      }

      const { data, error } = await this.supabase
        .from('classes')
        .update({
          class_name: className.trim(),
          description: description.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', classId)
        .eq('teacher_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // 如果編輯的是當前班級，更新 currentClass
      if (this.currentClass && this.currentClass.id === classId) {
        this.currentClass = data;
      }

      return data;
    } catch (error) {
      console.error('編輯班級失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除班級（軟刪除）
   * @param {string} classId - 班級 ID
   */
  async deleteClass(classId) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登入');
      }

      // 軟刪除：設置 is_active 為 false
      const { data, error } = await this.supabase
        .from('classes')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', classId)
        .eq('teacher_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // 如果刪除的是當前班級，清空 currentClass
      if (this.currentClass && this.currentClass.id === classId) {
        this.currentClass = null;
      }

      return data;
    } catch (error) {
      console.error('刪除班級失敗:', error);
      throw error;
    }
  }

  /**
   * 批量添加學生
   * @param {string} classId - 班級ID
   * @param {string} emailListText - 郵箱列表文本（換行或逗號分隔）
   * @returns {Object} { validEmails, invalidEmails, duplicates, added }
   */
  async batchAddStudents(classId, emailListText) {
    try {
      if (!classId) {
        throw new Error('請提供班級ID');
      }

      // 解析郵箱列表
      const emails = this.parseEmailList(emailListText);
      const validationResult = this.validateEmails(emails);

      const { validEmails, invalidEmails } = validationResult;

      if (validEmails.length === 0) {
        throw new Error('没有有效的郵箱地址');
      }

      // 檢查已存在的學生（包括 active 和 pending）
      const { data: activeMembers } = await this.supabase
        .from('class_members')
        .select('student:users!student_id(email)')
        .eq('class_id', classId);

      const { data: pendingMembers } = await this.supabase
        .from('pending_students')
        .select('email')
        .eq('class_id', classId);

      const existingEmails = new Set([
        ...(activeMembers?.map(m => m.student.email) || []),
        ...(pendingMembers?.map(p => p.email) || [])
      ]);

      const duplicates = validEmails.filter(email => existingEmails.has(email));
      const newEmails = validEmails.filter(email => !existingEmails.has(email));

      // 為新郵箱創建或查找用户記錄
      const addedCount = await this.addStudentsToClass(newEmails, classId);

      return {
        validEmails: validEmails.length,
        invalidEmails: invalidEmails.length,
        duplicates: duplicates.length,
        added: addedCount,
        invalidList: invalidEmails
      };
    } catch (error) {
      console.error('批量添加學生失敗:', error);
      throw error;
    }
  }

  /**
   * 解析郵箱列表文本
   * @param {string} text - 郵箱列表文本
   * @returns {Array} 郵箱数組
   */
  parseEmailList(text) {
    if (!text) return [];

    // 按換行或逗號分隔，去除空白，過滤空字符串
    return text
      .split(/[\n,]/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email !== '');
  }

  /**
   * 驗證郵箱列表
   * @param {Array} emails - 郵箱数組
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
   * 添加學生到班級（方案 A：使用 pending_students 表）
   * @param {Array} emails - 學生郵箱数組
   * @param {string} classId - 班級ID
   * @returns {number} 成功添加的學生数
   */
  async addStudentsToClass(emails, classId) {
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
                class_id: classId,
                email: email,
                added_by: user.id
              }
            ]);

          if (addError) {
            // 如果是唯一約束冲突（郵箱已存在），跳過
            if (addError.code === '23505') {
              console.log(`郵箱 ${email} 已在待加入列表中`);
            } else {
              console.warn(`添加郵箱 ${email} 失敗:`, addError);
            }
            continue;
          }

          addedCount++;
        } catch (emailError) {
          console.warn(`處理郵箱 ${email} 時出错:`, emailError);
        }
      }

      return addedCount;
    } catch (error) {
      console.error('添加學生到班級失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取班級成员列表（包括 active 和 pending 學生）
   * @returns {Array} 學生列表
   */
  async getClassMembers() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班級');
      }

      // 獲取已激活的學生（已登入）
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

      // 獲取待激活的學生（老師添加但未登入）
      const { data: pendingStudents, error: pendingError } = await this.supabase
        .from('pending_students')
        .select('id, email, added_at, added_by')
        .eq('class_id', this.currentClass.id)
        .order('added_at', { ascending: false });

      if (pendingError) throw pendingError;

      // 合并并丰富數據（過濾掉 student 為 null 的記錄）
      const activeEnriched = await Promise.all(
        (activeMembers || [])
          .filter(member => member.student !== null) // 過濾掉已刪除的學生
          .map(async member => {
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

      // 合并兩個列表
      const allMembers = [...activeEnriched, ...pendingEnriched];

      // 按添加時間排序
      allMembers.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

      return allMembers;
    } catch (error) {
      console.error('獲取班級成员失敗:', error);
      throw error;
    }
  }

  /**
   * 計算學生活躍狀態
   * @param {string} lastLoginAt - 最後登入時間
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
   * 獲取學生的作業進度
   * @param {string} userId - 學生 ID
   * @returns {Object} { completed, total }
   */
  async getStudentAssignmentProgress(userId) {
    try {
      // 獲取班級的所有任務
      const { data: assignments, error: assignmentsError } = await this.supabase
        .from('assignments')
        .select('id')
        .eq('class_id', this.currentClass.id);

      if (assignmentsError) throw assignmentsError;

      const totalAssignments = assignments.length;

      if (totalAssignments === 0) {
        return { completed: 0, total: 0 };
      }

      // 獲取學生已完成的作業
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
      console.error('獲取學生作業進度失敗:', error);
      return { completed: 0, total: 0 };
    }
  }

  /**
   * 從班級移除學生
   * @param {string} memberId - 成员記錄 ID
   * @param {boolean} isPending - 是否為待激活學生
   */
  async removeStudent(memberId, isPending = false) {
    try {
      if (isPending) {
        // 刪除 pending_students 記錄
        const { error } = await this.supabase
          .from('pending_students')
          .delete()
          .eq('id', memberId)
          .eq('class_id', this.currentClass.id);

        if (error) throw error;
      } else {
        // 刪除 class_members 記錄
        const { error } = await this.supabase
          .from('class_members')
          .delete()
          .eq('id', memberId)
          .eq('class_id', this.currentClass.id);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('移除學生失敗:', error);
      throw error;
    }
  }

  /**
   * 停用班級
   */
  async deactivateClass() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班級');
      }

      const { error } = await this.supabase
        .from('classes')
        .update({ is_active: false })
        .eq('id', this.currentClass.id);

      if (error) throw error;

      this.currentClass.is_active = false;
      return true;
    } catch (error) {
      console.error('停用班級失敗:', error);
      throw error;
    }
  }

  /**
   * 激活班級
   */
  async activateClass() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班級');
      }

      const { error } = await this.supabase
        .from('classes')
        .update({ is_active: true })
        .eq('id', this.currentClass.id);

      if (error) throw error;

      this.currentClass.is_active = true;
      return true;
    } catch (error) {
      console.error('激活班級失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取班級統計數據
   * @returns {Object} 班級統計信息
   */
  async getClassStatistics() {
    try {
      if (!this.currentClass) {
        throw new Error('未找到班級');
      }

      // 獲取學生總數（active + pending）
      const { count: activeStudentsCount } = await this.supabase
        .from('class_members')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      const { count: pendingStudentsCount } = await this.supabase
        .from('pending_students')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      const totalStudents = (activeStudentsCount || 0) + (pendingStudentsCount || 0);

      // 獲取活躍學生数（最近 7 天登入）
      // 注意：無法在 head: true 查詢中使用關聯表字段過濾，需要獲取完整數據
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: classMembersData, error: classMembersError } = await this.supabase
        .from('class_members')
        .select('student:users!student_id(last_login_at)')
        .eq('class_id', this.currentClass.id);

      if (classMembersError) throw classMembersError;

      const activeStudents = (classMembersData || [])
        .filter(member => 
          member.student && 
          member.student.last_login_at && 
          new Date(member.student.last_login_at) >= sevenDaysAgo
        ).length;

      // 獲取任務總數
      const { count: totalAssignments, error: assignmentsError } = await this.supabase
        .from('assignments')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', this.currentClass.id);

      if (assignmentsError) throw assignmentsError;

      // 獲取待批改作業数
      // 先獲取該班級的所有任務ID
      const assignmentIds = totalAssignments > 0
        ? (await this.supabase
            .from('assignments')
            .select('id')
            .eq('class_id', this.currentClass.id)
          ).data?.map(a => a.id) || []
        : [];

      let pendingGrading = 0;
      if (assignmentIds.length > 0) {
        // 待批改作業 = 狀態為 submitted 的作業（status = 'submitted'）
        const { count, error: pendingError } = await this.supabase
          .from('essays')
          .select('id', { count: 'exact', head: true })
          .in('assignment_id', assignmentIds)
          .eq('status', 'submitted');

        if (pendingError) {
          console.warn('獲取待批改作業数失敗:', pendingError);
        } else {
          pendingGrading = count || 0;
        }
      }

      // 計算平均完成率（只計算已激活的學生）
      let averageCompletion = 0;
      if (activeStudentsCount > 0 && totalAssignments > 0 && assignmentIds.length > 0) {
        const { count: completedEssays, error: completedError } = await this.supabase
          .from('essays')
          .select('id', { count: 'exact', head: true })
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
      console.error('獲取班級統計失敗:', error);
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

