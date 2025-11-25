/**
 * 句豆 - 作業管理 Store
 * 
 * 管理班級作業的創建、查詢、完成記錄等功能
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'

// 類型定義
export interface ClassAssignment {
  id: string
  class_id: string
  text_id: string
  assigned_by: string
  title: string | null
  assigned_at: string
  text?: {
    id: string
    title: string
    author: string | null
    difficulty: number
  }
  class?: {
    id: string
    class_name: string
    teacher_id: string
  }
  teacher?: {
    id: string
    display_name: string
  }
}

export interface AssignmentCompletion {
  id: string
  assignment_id: string
  student_id: string
  practice_record_id: string | null
  completed_at: string
  score: number | null
  accuracy: number | null
  student?: {
    id: string
    display_name: string
    email: string
  }
}

export interface AssignmentStats {
  assignment_id: string
  total_students: number
  completed_count: number
  average_score: number | null
  average_accuracy: number | null
}

export const useAssignmentStore = defineStore('assignment', () => {
  const authStore = useAuthStore()

  // 狀態
  const assignments = ref<ClassAssignment[]>([])
  const completions = ref<AssignmentCompletion[]>([])
  const assignmentStats = ref<Map<string, AssignmentStats>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ================== 老師功能 ==================

  /**
   * 獲取班級的所有作業
   */
  async function fetchClassAssignments(classId: string): Promise<void> {
    if (!supabase) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('class_assignments')
        .select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          ),
          class:classes (
            id,
            class_name,
            teacher_id
          )
        `)
        .eq('class_id', classId)
        .order('assigned_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      assignments.value = (data || []) as ClassAssignment[]
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  /**
   * 創建作業
   */
  async function createAssignment(
    classId: string,
    textId: string,
    title?: string
  ): Promise<ClassAssignment | null> {
    if (!supabase || !authStore.user) {
      error.value = '請先登入'
      return null
    }

    if (!authStore.isTeacher) {
      error.value = '只有老師可以創建作業'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase
        .from('class_assignments')
        .insert({
          class_id: classId,
          text_id: textId,
          assigned_by: authStore.user.id,
          title: title || null
        })
        .select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          )
        `)
        .single()

      if (createError) {
        error.value = createError.message
        return null
      }

      // 添加到本地列表
      assignments.value.unshift(data as ClassAssignment)
      return data as ClassAssignment
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 刪除作業
   */
  async function deleteAssignment(assignmentId: string): Promise<boolean> {
    if (!supabase || !authStore.isTeacher) {
      error.value = '無權限'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('class_assignments')
        .delete()
        .eq('id', assignmentId)

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      // 從本地列表移除
      assignments.value = assignments.value.filter(a => a.id !== assignmentId)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 獲取作業的完成情況（老師查看）
   */
  async function fetchAssignmentCompletions(assignmentId: string): Promise<void> {
    if (!supabase) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('assignment_completions')
        .select(`
          *,
          student:users!assignment_completions_student_id_fkey (
            id,
            display_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('completed_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      completions.value = (data || []) as AssignmentCompletion[]
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  /**
   * 獲取班級所有作業的統計信息（完成人數、平均分）
   */
  async function fetchAssignmentStats(classId: string, totalStudents: number): Promise<void> {
    if (!supabase) return

    try {
      // 獲取該班級所有作業的完成記錄
      const { data: classAssignments } = await supabase
        .from('class_assignments')
        .select('id')
        .eq('class_id', classId)

      if (!classAssignments || classAssignments.length === 0) return

      const assignmentIds = classAssignments.map(a => a.id)

      // 獲取所有完成記錄
      const { data: allCompletions } = await supabase
        .from('assignment_completions')
        .select('assignment_id, score, accuracy')
        .in('assignment_id', assignmentIds)

      // 計算每個作業的統計信息
      const statsMap = new Map<string, AssignmentStats>()
      
      for (const assignmentId of assignmentIds) {
        const completionsForAssignment = (allCompletions || []).filter(
          c => c.assignment_id === assignmentId
        )
        
        const completedCount = completionsForAssignment.length
        const scores = completionsForAssignment
          .map(c => c.score)
          .filter((s): s is number => s !== null)
        const accuracies = completionsForAssignment
          .map(c => c.accuracy)
          .filter((a): a is number => a !== null)

        statsMap.set(assignmentId, {
          assignment_id: assignmentId,
          total_students: totalStudents,
          completed_count: completedCount,
          average_score: scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
            : null,
          average_accuracy: accuracies.length > 0 
            ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) 
            : null
        })
      }

      assignmentStats.value = statsMap
    } catch (e) {
      console.error('獲取作業統計失敗:', e)
    }
  }

  /**
   * 獲取單個作業的統計信息
   */
  function getAssignmentStats(assignmentId: string): AssignmentStats | null {
    return assignmentStats.value.get(assignmentId) || null
  }

  // ================== 學生功能 ==================

  /**
   * 獲取學生的所有作業（跨所有班級）
   */
  async function fetchStudentAssignments(): Promise<void> {
    if (!supabase || !authStore.user) return

    loading.value = true
    error.value = null

    try {
      // 先獲取學生所屬的班級
      const { data: classMemberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', authStore.user.id)

      if (!classMemberships || classMemberships.length === 0) {
        assignments.value = []
        return
      }

      const classIds = classMemberships.map(cm => cm.class_id)

      // 獲取這些班級的所有作業
      const { data, error: fetchError } = await supabase
        .from('class_assignments')
        .select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          ),
          class:classes (
            id,
            class_name,
            teacher_id
          ),
          teacher:users!class_assignments_assigned_by_fkey (
            id,
            display_name
          )
        `)
        .in('class_id', classIds)
        .order('assigned_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      assignments.value = (data || []) as ClassAssignment[]
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  /**
   * 檢查作業是否已完成
   */
  async function checkAssignmentCompletion(assignmentId: string): Promise<boolean> {
    if (!supabase || !authStore.user) return false

    const { data } = await supabase
      .from('assignment_completions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', authStore.user.id)
      .maybeSingle()

    return !!data
  }

  /**
   * 記錄作業完成
   */
  async function recordCompletion(
    assignmentId: string,
    practiceRecordId: string,
    score: number,
    accuracy: number
  ): Promise<boolean> {
    if (!supabase || !authStore.user) {
      error.value = '請先登入'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: insertError } = await supabase
        .from('assignment_completions')
        .insert({
          assignment_id: assignmentId,
          student_id: authStore.user.id,
          practice_record_id: practiceRecordId,
          score,
          accuracy,
        })

      if (insertError) {
        error.value = insertError.message
        return false
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
   * 獲取待完成作業數量（用於徽章）
   */
  async function getPendingCount(): Promise<number> {
    if (!supabase || !authStore.user || !authStore.isStudent) return 0

    try {
      // 獲取學生的所有作業
      await fetchStudentAssignments()

      if (assignments.value.length === 0) return 0

      // 批量查詢完成記錄
      const assignmentIds = assignments.value.map(a => a.id)
      const { data: completions } = await supabase
        .from('assignment_completions')
        .select('assignment_id')
        .eq('student_id', authStore.user.id)
        .in('assignment_id', assignmentIds)

      const completedIds = new Set(completions?.map(c => c.assignment_id) || [])
      return assignments.value.filter(a => !completedIds.has(a.id)).length
    } catch (e) {
      console.error('獲取待完成作業數量失敗:', e)
      return 0
    }
  }

  /**
   * 清空狀態
   */
  function reset() {
    assignments.value = []
    completions.value = []
    error.value = null
  }

  return {
    // 狀態
    assignments,
    completions,
    assignmentStats,
    loading,
    error,

    // 老師方法
    fetchClassAssignments,
    createAssignment,
    deleteAssignment,
    fetchAssignmentCompletions,
    fetchAssignmentStats,
    getAssignmentStats,

    // 學生方法
    fetchStudentAssignments,
    checkAssignmentCompletion,
    recordCompletion,
    getPendingCount,

    // 通用方法
    reset
  }
})

