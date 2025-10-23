/**
 * 多班級管理組件
 * 負責處理多班級切換、統計和管理功能
 */

import ClassManager from './class-manager.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

class MultiClassManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.classManager = new ClassManager(supabaseClient);
    this.currentClassId = null;
    this.classes = [];
    this.container = null;
  }

  /**
   * 初始化多班級管理器
   */
  async initialize() {
    try {
      // 獲取所有班級
      await this.loadAllClasses();
      
      // 設置當前班級（如果只有一個班級，自動選擇）
      if (this.classes.length === 1) {
        this.currentClassId = this.classes[0].id;
        await this.classManager.switchClass(this.currentClassId);
      } else if (this.classes.length > 1) {
        // 多個班級時，嘗試從本地存儲恢復上次選擇
        const savedClassId = localStorage.getItem('selectedClassId');
        if (savedClassId && this.classes.find(c => c.id === savedClassId)) {
          this.currentClassId = savedClassId;
          await this.classManager.switchClass(this.currentClassId);
        }
      }
      
      console.log('✅ 多班級管理器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 多班級管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 加載所有班級
   */
  async loadAllClasses() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      // 獲取老師的所有班級
      const { data: classes, error } = await this.supabase
        .from('classes')
        .select(`
          id,
          class_name,
          description,
          is_active,
          created_at,
          class_members!inner(count),
          assignments!inner(count)
        `)
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 處理統計數據
      this.classes = classes.map(cls => ({
        ...cls,
        student_count: cls.class_members?.[0]?.count || 0,
        assignment_count: cls.assignments?.[0]?.count || 0
      }));

      console.log('📚 已加載班級:', this.classes.length);
      return this.classes;
    } catch (error) {
      console.error('❌ 加載班級失敗:', error);
      throw error;
    }
  }

  /**
   * 切換到指定班級
   */
  async switchClass(classId) {
    try {
      const targetClass = this.classes.find(c => c.id === classId);
      if (!targetClass) {
        throw new Error('班級不存在');
      }

      // 切換班級
      await this.classManager.switchClass(classId);
      this.currentClassId = classId;
      
      // 保存到本地存儲
      localStorage.setItem('selectedClassId', classId);
      
      // 觸發班級切換事件
      window.dispatchEvent(new CustomEvent('classSwitched', {
        detail: { classId, classInfo: targetClass }
      }));

      console.log('🔄 已切換到班級:', targetClass.class_name);
      return targetClass;
    } catch (error) {
      console.error('❌ 切換班級失敗:', error);
      throw error;
    }
  }

  /**
   * 創建新班級
   */
  async createClass(className, description = '') {
    try {
      // 檢查班級名稱是否重複
      const existingClass = this.classes.find(c => 
        c.class_name.toLowerCase() === className.toLowerCase()
      );
      
      if (existingClass) {
        throw new Error('班級名稱已存在，請使用其他名稱');
      }

      // 創建班級
      const newClass = await this.classManager.createClass(className, description);
      
      // 重新加載班級列表
      await this.loadAllClasses();
      
      // 自動切換到新班級
      await this.switchClass(newClass.id);
      
      toast.success(`班級「${className}」創建成功！`);
      return newClass;
    } catch (error) {
      console.error('❌ 創建班級失敗:', error);
      toast.error(error.message || '創建班級失敗');
      throw error;
    }
  }

  /**
   * 編輯班級信息
   */
  async editClass(classId, className, description) {
    try {
      // 檢查班級名稱是否重複（排除自己）
      const existingClass = this.classes.find(c => 
        c.id !== classId && 
        c.class_name.toLowerCase() === className.toLowerCase()
      );
      
      if (existingClass) {
        throw new Error('班級名稱已存在，請使用其他名稱');
      }

      // 更新班級
      await this.classManager.editClass(classId, className, description);
      
      // 重新加載班級列表
      await this.loadAllClasses();
      
      // 如果編輯的是當前班級，更新當前班級信息
      if (this.currentClassId === classId) {
        await this.classManager.switchClass(classId);
      }
      
      toast.success('班級信息已更新');
      return true;
    } catch (error) {
      console.error('❌ 編輯班級失敗:', error);
      toast.error(error.message || '編輯班級失敗');
      throw error;
    }
  }

  /**
   * 刪除班級（軟刪除）
   */
  async deleteClass(classId) {
    try {
      const targetClass = this.classes.find(c => c.id === classId);
      if (!targetClass) {
        throw new Error('班級不存在');
      }

      // 確認刪除
      const confirmed = await new Promise((resolve) => {
        dialog.confirmDelete({
          title: '確認刪除班級',
          message: `確定要刪除班級「${targetClass.class_name}」嗎？<br><br>此操作將：<br>• 停用班級，學生無法提交新作業<br>• 保留所有歷史數據<br>• 無法撤銷`,
          confirmText: '確認刪除',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (!confirmed) return false;

      // 執行軟刪除
      await this.classManager.deleteClass(classId);
      
      // 重新加載班級列表
      await this.loadAllClasses();
      
      // 如果刪除的是當前班級，切換到其他班級
      if (this.currentClassId === classId) {
        if (this.classes.length > 0) {
          await this.switchClass(this.classes[0].id);
        } else {
          this.currentClassId = null;
          localStorage.removeItem('selectedClassId');
        }
      }
      
      toast.success('班級已刪除');
      return true;
    } catch (error) {
      console.error('❌ 刪除班級失敗:', error);
      toast.error(error.message || '刪除班級失敗');
      throw error;
    }
  }

  /**
   * 獲取當前班級信息
   */
  getCurrentClass() {
    return this.classes.find(c => c.id === this.currentClassId);
  }

  /**
   * 獲取所有班級
   */
  getAllClasses() {
    return this.classes;
  }

  /**
   * 檢查是否有班級
   */
  hasClasses() {
    return this.classes.length > 0;
  }

  /**
   * 檢查是否有多個班級
   */
  hasMultipleClasses() {
    return this.classes.length > 1;
  }

  /**
   * 獲取班級統計信息
   */
  async getClassStatistics(classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return null;

    try {
      return await this.classManager.getClassStatistics(targetClassId);
    } catch (error) {
      console.error('❌ 獲取班級統計失敗:', error);
      return null;
    }
  }

  /**
   * 批量添加學生
   */
  async batchAddStudents(classId, emailListText) {
    try {
      return await this.classManager.batchAddStudents(classId, emailListText);
    } catch (error) {
      console.error('❌ 批量添加學生失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取指定班級的學生列表
   * @param {string} classId - 班級ID
   * @returns {Array} 學生列表
   */
  async getClassStudents(classId) {
    try {
      return await this.classManager.getClassMembers(classId);
    } catch (error) {
      console.error('❌ 獲取學生列表失敗:', error);
      throw error;
    }
  }
}

export default MultiClassManager;
