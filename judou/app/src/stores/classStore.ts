/**
 * 句豆 - 班級管理 Store
 * 
 * 管理班級的創建、查詢、成員管理等功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'

// 類型定義
export interface ClassInfo {
  id: string
  teacher_id: string
  class_name: string
  description: string | null
  created_at: string
  is_active: boolean
  member_count?: number
}

export interface ClassMember {
  id: string
  class_id: string
  student_id: string
  added_at: string
  student?: {
    id: string
    email: string
    display_name: string
    avatar_url: string | null
  }
}

export const useClassStore = defineStore('class', () => {
  const authStore = useAuthStore()

  // 狀態
  const classes = ref<ClassInfo[]>([])
  const currentClass = ref<ClassInfo | null>(null)
  const classMembers = ref<ClassMember[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性
  const myClasses = computed(() => classes.value)
  const activeClasses = computed(() => classes.value.filter(c => c.is_active))

  // ================== 老師功能 ==================

  /**
   * 創建班級
   */
  async function createClass(className: string, description?: string): Promise<ClassInfo | null> {
    if (!supabase || !authStore.user) {
      error.value = '請先登入'
      return null
    }

    if (!authStore.isTeacher) {
      error.value = '只有老師可以創建班級'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase
        .from('classes')
        .insert({
          teacher_id: authStore.user.id,
          class_name: className,
          description: description || null
        })
        .select()
        .single()

      if (createError) {
        error.value = createError.message
        return null
      }

      // 添加到本地列表
      classes.value.push(data)
      return data
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 獲取老師的所有班級
   */
  async function fetchMyClasses(): Promise<void> {
    if (!supabase || !authStore.user) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(`
          *,
          member_count:class_members(count)
        `)
        .eq('teacher_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      // 處理成員計數
      classes.value = (data || []).map(c => ({
        ...c,
        member_count: c.member_count?.[0]?.count || 0
      }))
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  /**
   * 獲取班級成員
   */
  async function fetchClassMembers(classId: string): Promise<void> {
    if (!supabase) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('class_members')
        .select(`
          *,
          student:users!class_members_student_id_fkey (
            id,
            email,
            display_name,
            avatar_url
          )
        `)
        .eq('class_id', classId)
        .order('added_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      classMembers.value = data || []
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加學生到班級（通過郵箱）
   */
  async function addStudentByEmail(classId: string, email: string): Promise<boolean> {
    if (!supabase || !authStore.isTeacher) {
      error.value = '無權限'
      return false
    }

    loading.value = true
    error.value = null

    try {
      // 查找學生
      const { data: student, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (findError || !student) {
        error.value = '找不到該學生，請確認郵箱正確且學生已登入過'
        return false
      }

      // 添加到班級
      const { error: addError } = await supabase
        .from('class_members')
        .insert({
          class_id: classId,
          student_id: student.id,
          added_by: authStore.user?.id
        })

      if (addError) {
        if (addError.code === '23505') {
          error.value = '該學生已在班級中'
        } else {
          error.value = addError.message
        }
        return false
      }

      // 刷新成員列表
      await fetchClassMembers(classId)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 從班級移除學生
   */
  async function removeStudent(classId: string, studentId: string): Promise<boolean> {
    if (!supabase || !authStore.isTeacher) {
      error.value = '無權限'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: removeError } = await supabase
        .from('class_members')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId)

      if (removeError) {
        error.value = removeError.message
        return false
      }

      // 更新本地列表
      classMembers.value = classMembers.value.filter(
        m => !(m.class_id === classId && m.student_id === studentId)
      )
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新班級信息
   */
  async function updateClass(classId: string, updates: Partial<ClassInfo>): Promise<boolean> {
    if (!supabase || !authStore.isTeacher) {
      error.value = '無權限'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', classId)
        .eq('teacher_id', authStore.user?.id)

      if (updateError) {
        error.value = updateError.message
        return false
      }

      // 更新本地列表
      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        classes.value[index] = { ...classes.value[index], ...updates } as ClassInfo
      }
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 刪除班級
   */
  async function deleteClass(classId: string): Promise<boolean> {
    if (!supabase || !authStore.isTeacher) {
      error.value = '無權限'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('teacher_id', authStore.user?.id)

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      // 從本地列表移除
      classes.value = classes.value.filter(c => c.id !== classId)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  // ================== 學生功能 ==================

  /**
   * 獲取學生所屬的班級
   */
  async function fetchStudentClasses(): Promise<void> {
    if (!supabase || !authStore.user) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('class_members')
        .select(`
          class:classes (
            id,
            class_name,
            description,
            created_at,
            is_active,
            teacher:users!classes_teacher_id_fkey (
              display_name
            )
          )
        `)
        .eq('student_id', authStore.user.id)

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      // 提取班級信息
      classes.value = (data || [])
        .map(d => d.class as unknown as ClassInfo)
        .filter((c): c is ClassInfo => c !== null)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ================== 通用功能 ==================

  /**
   * 根據角色獲取班級
   */
  async function fetchClasses(): Promise<void> {
    if (authStore.isTeacher) {
      await fetchMyClasses()
    } else {
      await fetchStudentClasses()
    }
  }

  /**
   * 清空狀態
   */
  function reset() {
    classes.value = []
    currentClass.value = null
    classMembers.value = []
    error.value = null
  }

  return {
    // 狀態
    classes,
    currentClass,
    classMembers,
    loading,
    error,

    // 計算屬性
    myClasses,
    activeClasses,

    // 老師方法
    createClass,
    fetchMyClasses,
    fetchClassMembers,
    addStudentByEmail,
    removeStudent,
    updateClass,
    deleteClass,

    // 學生方法
    fetchStudentClasses,

    // 通用方法
    fetchClasses,
    reset
  }
})

