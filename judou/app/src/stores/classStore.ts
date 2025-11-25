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

export interface PendingStudent {
  id: string
  class_id: string
  email: string
  added_by: string
  added_at: string
}

export interface BatchAddResult {
  validEmails: number
  invalidEmails: number
  duplicates: number
  added: number
  invalidList: string[]
}

export interface StudentProgress {
  student_id: string
  display_name: string
  email: string
  avatar_url: string | null
  beans: number
  total_exp: number
  total_practices: number
  correct_count: number
  streak_days: number
  last_practice_at: string | null
  level: number
}

export const useClassStore = defineStore('class', () => {
  const authStore = useAuthStore()

  // 狀態
  const classes = ref<ClassInfo[]>([])
  const currentClass = ref<ClassInfo | null>(null)
  const classMembers = ref<ClassMember[]>([])
  const pendingStudents = ref<PendingStudent[]>([])
  const studentProgress = ref<StudentProgress[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 學生郵箱驗證模式（ISF 學生郵箱）
  const STUDENT_EMAIL_PATTERN = /^[a-zA-Z0-9._-]+@student\.isf\.edu\.hk$/i

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
   * 解析郵箱列表文本
   */
  function parseEmailList(text: string): string[] {
    if (!text) return []
    return text
      .split(/[\n,;]/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email !== '')
  }

  /**
   * 驗證郵箱列表
   */
  function validateEmails(emails: string[]): { validEmails: string[], invalidEmails: string[] } {
    const validEmails: string[] = []
    const invalidEmails: string[] = []

    emails.forEach(email => {
      if (STUDENT_EMAIL_PATTERN.test(email)) {
        validEmails.push(email)
      } else {
        invalidEmails.push(email)
      }
    })

    return { validEmails, invalidEmails }
  }

  /**
   * 批量添加學生到班級
   * @param classId 班級 ID
   * @param emailListText 郵箱列表文本（換行、逗號或分號分隔）
   */
  async function batchAddStudents(classId: string, emailListText: string): Promise<BatchAddResult> {
    if (!supabase || !authStore.isTeacher || !authStore.user) {
      throw new Error('無權限')
    }

    // 解析和驗證郵箱
    const emails = parseEmailList(emailListText)
    const { validEmails, invalidEmails } = validateEmails(emails)

    if (validEmails.length === 0) {
      throw new Error('沒有有效的學生郵箱地址。請使用 @student.isf.edu.hk 格式')
    }

    // 檢查已存在的成員（已激活 + 待激活）
    const { data: activeMembers } = await supabase
      .from('class_members')
      .select('student:users!class_members_student_id_fkey(email)')
      .eq('class_id', classId)

    const { data: existingPending } = await supabase
      .from('pending_students')
      .select('email')
      .eq('class_id', classId)

    const existingEmails = new Set([
      ...(activeMembers?.map(m => (m.student as unknown as { email: string } | null)?.email).filter(Boolean) || []),
      ...(existingPending?.map(p => p.email) || [])
    ])

    const duplicates = validEmails.filter(email => existingEmails.has(email))
    const newEmails = validEmails.filter(email => !existingEmails.has(email))

    // 添加新郵箱到 pending_students
    let addedCount = 0
    for (const email of newEmails) {
      try {
        const { error: addError } = await supabase
          .from('pending_students')
          .insert({
            class_id: classId,
            email: email,
            added_by: authStore.user.id
          })

        if (addError) {
          if (addError.code === '23505') {
            // 唯一約束衝突，郵箱已存在
            console.log(`郵箱 ${email} 已在待加入列表中`)
          } else {
            console.warn(`添加郵箱 ${email} 失敗:`, addError)
          }
          continue
        }
        addedCount++
      } catch (e) {
        console.warn(`處理郵箱 ${email} 時出錯:`, e)
      }
    }

    return {
      validEmails: validEmails.length,
      invalidEmails: invalidEmails.length,
      duplicates: duplicates.length,
      added: addedCount,
      invalidList: invalidEmails
    }
  }

  /**
   * 獲取班級的待激活學生列表
   */
  async function fetchPendingStudents(classId: string): Promise<void> {
    if (!supabase) return

    try {
      const { data, error: fetchError } = await supabase
        .from('pending_students')
        .select('*')
        .eq('class_id', classId)
        .order('added_at', { ascending: false })

      if (fetchError) {
        console.error('獲取待激活學生失敗:', fetchError)
        return
      }

      pendingStudents.value = data || []
    } catch (e) {
      console.error('獲取待激活學生失敗:', e)
    }
  }

  /**
   * 移除待激活學生
   */
  async function removePendingStudent(pendingId: string): Promise<boolean> {
    if (!supabase || !authStore.isTeacher) {
      error.value = '無權限'
      return false
    }

    try {
      const { error: removeError } = await supabase
        .from('pending_students')
        .delete()
        .eq('id', pendingId)

      if (removeError) {
        error.value = removeError.message
        return false
      }

      pendingStudents.value = pendingStudents.value.filter(p => p.id !== pendingId)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  /**
   * 計算等級（根據經驗值）
   */
  function calculateLevel(totalExp: number): number {
    // 每100經驗升一級，最低1級
    return Math.max(1, Math.floor(totalExp / 100) + 1)
  }

  /**
   * 獲取班級學生的學習進度數據
   */
  async function fetchStudentProgress(classId: string): Promise<void> {
    if (!supabase || !authStore.isTeacher) return

    loading.value = true
    error.value = null

    try {
      // 獲取班級成員的學生 ID
      const { data: members } = await supabase
        .from('class_members')
        .select('student_id')
        .eq('class_id', classId)

      if (!members || members.length === 0) {
        studentProgress.value = []
        return
      }

      const studentIds = members.map(m => m.student_id)

      // 獲取學生基本信息
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, email, avatar_url')
        .in('id', studentIds)

      // 獲取學生統計數據
      const { data: stats } = await supabase
        .from('user_stats')
        .select('user_id, beans, total_exp, total_practices, correct_count, streak_days, last_practice_at')
        .in('user_id', studentIds)

      // 合併數據
      const progressList: StudentProgress[] = (users || []).map(user => {
        const userStats = stats?.find(s => s.user_id === user.id)
        return {
          student_id: user.id,
          display_name: user.display_name || user.email?.split('@')[0] || '未知',
          email: user.email || '',
          avatar_url: user.avatar_url,
          beans: userStats?.beans || 0,
          total_exp: userStats?.total_exp || 0,
          total_practices: userStats?.total_practices || 0,
          correct_count: userStats?.correct_count || 0,
          streak_days: userStats?.streak_days || 0,
          last_practice_at: userStats?.last_practice_at || null,
          level: calculateLevel(userStats?.total_exp || 0)
        }
      })

      // 按豆子數量排序
      studentProgress.value = progressList.sort((a, b) => b.beans - a.beans)
    } catch (e) {
      console.error('獲取學生進度失敗:', e)
      error.value = (e as Error).message
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
    pendingStudents,
    studentProgress,
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
    batchAddStudents,
    fetchPendingStudents,
    removePendingStudent,
    fetchStudentProgress,

    // 學生方法
    fetchStudentClasses,

    // 通用方法
    fetchClasses,
    reset
  }
})

