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
  current_avatar_id: string | null  // 當前使用的頭像 ID
  beans: number
  total_exp: number
  total_practices: number
  weekly_practices: number  // 最近一週練習次數
  unique_texts_practiced: number  // 練習過的不同文章數
  correct_count: number
  streak_days: number
  last_practice_at: string | null
  level: number
  average_accuracy: number  // 平均正確率（0-100）
  last_practice_days_ago: number | null  // 距離上次練習的天數（null 表示從未練習）
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
  
  // 測試賬號例外（允許特定測試郵箱作為學生）
  const TEST_EMAIL_EXCEPTIONS = ['gnoluy@gmail.com']

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
      // 檢查是否為測試賬號例外
      const isTestException = TEST_EMAIL_EXCEPTIONS.includes(email.toLowerCase())
      
      if (STUDENT_EMAIL_PATTERN.test(email) || isTestException) {
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
   * 從 profiles 和 practice_records 表聚合數據（不再使用空的 user_stats 表）
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

      if (!users || users.length === 0) {
        studentProgress.value = []
        return
      }

      // 從 profiles 表獲取豆子、連續天數、頭像等數據
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, total_beans, streak_days, last_practice_date, current_avatar_id')
        .in('id', studentIds)

      // 計算一週前的時間戳（先計算，用於查詢和過濾）
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 從 practice_records 表聚合練習統計數據（一次性查詢所有學生）
      const { data: allPracticeRecords, error: practiceError } = await supabase
        .from('practice_records')
        .select('user_id, correct_breaks, created_at, accuracy, text_id')
        .in('user_id', studentIds)

      if (practiceError) {
        console.error('獲取練習記錄失敗:', practiceError)
      }

      // 從 game_participants 表獲取遊戲正確率（已完成遊戲）
      const { data: allGameParticipants } = await supabase
        .from('game_participants')
        .select('user_id, accuracy')
        .in('user_id', studentIds)
        .eq('status', 'completed')
        .not('accuracy', 'is', null)

      // 構建練習統計映射
      const practiceStatsMap = new Map<string, {
        total_practices: number
        weekly_practices: number
        unique_texts_practiced: number
        correct_count: number
        last_practice_at: string | null
      }>()

      // 初始化所有學生的統計（確保沒有練習記錄的學生也有數據）
      studentIds.forEach(userId => {
        practiceStatsMap.set(userId, {
          total_practices: 0,
          weekly_practices: 0,
          unique_texts_practiced: 0,
          correct_count: 0,
          last_practice_at: null
        })
      })

      // 過濾掉沒有 user_id 的記錄
      const validPracticeRecords = (allPracticeRecords || []).filter(record => 
        record.user_id && studentIds.includes(record.user_id)
      )

      // 聚合練習記錄數據
      if (validPracticeRecords.length > 0) {
        // 按用戶分組
        const recordsByUser = new Map<string, typeof validPracticeRecords>()
        validPracticeRecords.forEach(record => {
          if (!record.user_id) return
          if (!recordsByUser.has(record.user_id)) {
            recordsByUser.set(record.user_id, [])
          }
          recordsByUser.get(record.user_id)!.push(record)
        })

        // 計算每個學生的統計
        recordsByUser.forEach((records, userId) => {
          const total_practices = records.length
          const correct_count = records.reduce((sum, record) => sum + (record.correct_breaks || 0), 0)
          
          // 計算最近一週的練習次數
          const weekAgoTimestamp = new Date(oneWeekAgo).getTime()
          const weekly_practices = records.filter(record => {
            if (!record.created_at) return false
            try {
              return new Date(record.created_at).getTime() >= weekAgoTimestamp
            } catch {
              return false
            }
          }).length
          
          // 計算練習過的不同文章數
          const uniqueTextIds = new Set<string>()
          records.forEach(record => {
            if (record.text_id) {
              const textId = String(record.text_id).trim()
              if (textId) {
                uniqueTextIds.add(textId)
              }
            }
          })
          const unique_texts_practiced = uniqueTextIds.size
          
          // 找到最新的練習時間
          const sortedRecords = [...records].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          const last_practice_at = sortedRecords[0]?.created_at || null

          practiceStatsMap.set(userId, {
            total_practices,
            weekly_practices,
            unique_texts_practiced,
            correct_count,
            last_practice_at
          })
        })
      }

      // 計算平均正確率（從 practice_records 和 game_participants）
      const accuracyMap = new Map<string, number>()
      
      // 初始化所有學生的正確率
      studentIds.forEach(userId => {
        accuracyMap.set(userId, 0)
      })

      // 從練習記錄計算正確率
      if (allPracticeRecords) {
        const practiceAccuracyByUser = new Map<string, number[]>()
        allPracticeRecords.forEach(record => {
          if (!record.user_id || record.accuracy === null) return
          if (!practiceAccuracyByUser.has(record.user_id)) {
            practiceAccuracyByUser.set(record.user_id, [])
          }
          // practice_records 的 accuracy 是 0-1 之間的小數，轉換為百分比
          practiceAccuracyByUser.get(record.user_id)!.push(Number(record.accuracy) * 100)
        })

        // 從遊戲記錄計算正確率
        const gameAccuracyByUser = new Map<string, number[]>()
        if (allGameParticipants) {
          allGameParticipants.forEach(participant => {
            if (!participant.user_id || participant.accuracy === null) return
            if (!gameAccuracyByUser.has(participant.user_id)) {
              gameAccuracyByUser.set(participant.user_id, [])
            }
            // game_participants 的 accuracy 已經是百分比
            gameAccuracyByUser.get(participant.user_id)!.push(Number(participant.accuracy))
          })
        }

        // 合併所有正確率並計算平均值
        studentIds.forEach(userId => {
          const practiceAccuracies = practiceAccuracyByUser.get(userId) || []
          const gameAccuracies = gameAccuracyByUser.get(userId) || []
          const allAccuracies = [...practiceAccuracies, ...gameAccuracies]

          if (allAccuracies.length > 0) {
            const average = allAccuracies.reduce((sum, acc) => sum + acc, 0) / allAccuracies.length
            accuracyMap.set(userId, Math.round(average))
          }
        })
      }

      // 合併數據
      const progressList: StudentProgress[] = users.map(user => {
        const profile = profiles?.find(p => p.id === user.id)
        const practiceStats = practiceStatsMap.get(user.id) || {
          total_practices: 0,
          weekly_practices: 0,
          unique_texts_practiced: 0,
          correct_count: 0,
          last_practice_at: null
        }
        const average_accuracy = accuracyMap.get(user.id) || 0

        // 豆子數作為經驗值（因為系統中經驗值實際上就是豆子數）
        const total_exp = profile?.total_beans || 0

        // 計算距離上次練習的天數
        const lastPracticeAt = practiceStats.last_practice_at || (profile?.last_practice_date ? new Date(profile.last_practice_date).toISOString() : null)
        let lastPracticeDaysAgo: number | null = null
        if (lastPracticeAt) {
          const daysDiff = Math.floor((Date.now() - new Date(lastPracticeAt).getTime()) / (1000 * 60 * 60 * 24))
          lastPracticeDaysAgo = daysDiff
        } else if (practiceStats.total_practices === 0) {
          // 從未練習過
          lastPracticeDaysAgo = null
        }

        return {
          student_id: user.id,
          display_name: user.display_name || user.email?.split('@')[0] || '未知',
          email: user.email || '',
          avatar_url: user.avatar_url,
          current_avatar_id: profile?.current_avatar_id || null,
          beans: profile?.total_beans || 0,
          total_exp: total_exp,
          total_practices: practiceStats.total_practices,
          weekly_practices: practiceStats.weekly_practices,
          unique_texts_practiced: practiceStats.unique_texts_practiced,
          correct_count: practiceStats.correct_count,
          streak_days: profile?.streak_days || 0,
          last_practice_at: lastPracticeAt,
          level: calculateLevel(total_exp),
          average_accuracy: average_accuracy,
          last_practice_days_ago: lastPracticeDaysAgo
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
            teacher_id,
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

