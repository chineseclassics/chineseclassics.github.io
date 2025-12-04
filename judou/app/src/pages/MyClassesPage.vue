<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useClassStore, type ClassInfo } from '../stores/classStore'
import { useAssignmentStore } from '../stores/assignmentStore'
import { useTextsStore } from '../stores/textsStore'
import { usePracticeLibraryStore } from '../stores/practiceLibraryStore'
import { useAvatarStore } from '../stores/avatarStore'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import BeanIcon from '../components/common/BeanIcon.vue'
import UserAvatar from '../components/avatar/UserAvatar.vue'
import { supabase } from '../lib/supabaseClient'

const authStore = useAuthStore()
const classStore = useClassStore()
const assignmentStore = useAssignmentStore()
const textsStore = useTextsStore()
const libraryStore = usePracticeLibraryStore()
const avatarStore = useAvatarStore()
const router = useRouter()

// 頭像 URL 映射（用於顯示學生頭像）
const avatarUrlMap = ref<Map<string, string>>(new Map())

const { classes, classMembers, pendingStudents, studentProgress, loading } = storeToRefs(classStore)
const { assignments, completions, loading: assignmentsLoading } = storeToRefs(assignmentStore)

// 視圖狀態
const currentView = ref<'list' | 'detail'>('list')
const selectedClass = ref<ClassInfo | null>(null)
const activeTab = ref<'members' | 'assignments' | 'progress'>('members')

// 新建班級表單
const showCreateForm = ref(false)
const newClassName = ref('')
const newClassDesc = ref('')
const creating = ref(false)

// 批量添加學生
const showAddStudentsModal = ref(false)
const emailListText = ref('')
const addingStudents = ref(false)
const addStudentsError = ref<string | null>(null)
const addStudentsSuccess = ref<string | null>(null)

// 布置作業
const showAssignModal = ref(false)
const selectedTextIds = ref<Set<string>>(new Set())
const assignmentTitle = ref('')
const assigning = ref(false)
const assignSource = ref<'system' | 'custom'>('system') // 文章來源：系統文庫或自訂練習
const assignSelectedCategoryId = ref<string | null>(null) // 選中的分類

// 計算屬性：分類和文章
const systemCategories = computed(() => {
  return libraryStore.state.categories.filter(c => c.level === 1)
})

const systemTexts = computed(() => {
  // 獲取系統文庫的文章（is_system = true）
  return textsStore.texts.filter(t => t.is_system === true)
})

const customTexts = computed(() => {
  // 獲取老師自訂的文章（is_system = false 且 created_by = 當前用戶）
  return textsStore.texts.filter(t => t.is_system === false && t.created_by === authStore.user?.id)
})

const filteredTexts = computed(() => {
  if (assignSource.value === 'custom') {
    return customTexts.value
  }
  // 系統文庫，根據選中的分類篩選
  if (!assignSelectedCategoryId.value) {
    return systemTexts.value
  }
  // 獲取選中分類及其子分類的所有 ID
  const categoryIds = new Set<string>([assignSelectedCategoryId.value])
  const addChildCategories = (parentId: string) => {
    libraryStore.state.categories
      .filter(c => c.parent_id === parentId)
      .forEach(c => {
        categoryIds.add(c.id)
        addChildCategories(c.id)
      })
  }
  addChildCategories(assignSelectedCategoryId.value)
  
  return systemTexts.value.filter(t => t.category_id && categoryIds.has(t.category_id))
})

// 切換文章選中狀態
function toggleTextSelection(textId: string) {
  const newSet = new Set(selectedTextIds.value)
  if (newSet.has(textId)) {
    newSet.delete(textId)
  } else {
    newSet.add(textId)
  }
  selectedTextIds.value = newSet
}

// 全選/取消全選當前列表
function toggleSelectAll() {
  if (selectedTextIds.value.size === filteredTexts.value.length) {
    selectedTextIds.value = new Set()
  } else {
    selectedTextIds.value = new Set(filteredTexts.value.map(t => t.id))
  }
}

// 清空選擇
function clearSelection() {
  selectedTextIds.value = new Set()
}

// 重置布置作業彈窗
function resetAssignModal() {
  selectedTextIds.value = new Set()
  assignmentTitle.value = ''
  assignSource.value = 'system'
  assignSelectedCategoryId.value = null
}

// 作業詳情彈窗
const showAssignmentDetailModal = ref(false)
const selectedAssignment = ref<any>(null)
const loadingCompletions = ref(false)

// 合併成員列表（已激活 + 待激活）
const allMembers = computed(() => {
  const active = classMembers.value.map(m => ({
    id: m.id,
    email: m.student?.email || '未知',
    displayName: m.student?.display_name || m.student?.email?.split('@')[0] || '未知',
    status: 'active' as const,
    addedAt: m.added_at,
    student_id: m.student_id,
    current_avatar_id: (m.student as any)?.profiles?.current_avatar_id || null
  }))
  
  const pending = pendingStudents.value.map(p => ({
    id: p.id,
    email: p.email,
    displayName: p.email.split('@')[0] || '未知',
    status: 'pending' as const,
    addedAt: p.added_at,
    student_id: undefined as string | undefined,
    current_avatar_id: null as string | null
  }))
  
  return [...active, ...pending].sort((a, b) => 
    new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  )
})

// 創建班級（老師）
async function createClass() {
  if (!newClassName.value.trim()) return
  
  creating.value = true
  try {
    await classStore.createClass(newClassName.value.trim(), newClassDesc.value.trim())
    newClassName.value = ''
    newClassDesc.value = ''
    showCreateForm.value = false
  } catch (e) {
    console.error('創建班級失敗:', e)
  } finally {
    creating.value = false
  }
}

// 刪除班級功能保留在 classStore 中，這裡不需要

// 作業完成狀態（學生）
const assignmentStatuses = ref<Map<string, boolean>>(new Map())

// 查看班級詳情
async function viewClass(cls: ClassInfo) {
  selectedClass.value = cls
  currentView.value = 'detail'
  activeTab.value = authStore.isTeacher ? 'members' : 'assignments'
  
  if (authStore.isTeacher) {
    await Promise.all([
      classStore.fetchClassMembers(cls.id),
      classStore.fetchPendingStudents(cls.id),
      assignmentStore.fetchClassAssignments(cls.id)
    ])
    // 獲取作業統計（需要知道學生總數）
    const totalStudents = classMembers.value.length
    await assignmentStore.fetchAssignmentStats(cls.id, totalStudents)
    // 獲取成員頭像信息
    await fetchMemberAvatars()
  } else {
    await assignmentStore.fetchClassAssignments(cls.id)
    // 檢查每個作業的完成狀態
    if (authStore.isStudent) {
      for (const assignment of assignments.value) {
        const isCompleted = await assignmentStore.checkAssignmentCompletion(assignment.id)
        assignmentStatuses.value.set(assignment.id, isCompleted)
      }
    }
  }
}

// 查看作業詳情（老師）
async function viewAssignmentDetail(assignment: any) {
  selectedAssignment.value = assignment
  showAssignmentDetailModal.value = true
  loadingCompletions.value = true
  
  try {
    await assignmentStore.fetchAssignmentCompletions(assignment.id)
  } finally {
    loadingCompletions.value = false
  }
}

// 關閉作業詳情彈窗
function closeAssignmentDetailModal() {
  showAssignmentDetailModal.value = false
  selectedAssignment.value = null
}

// 獲取作業統計
function getAssignmentStats(assignmentId: string) {
  return assignmentStore.getAssignmentStats(assignmentId)
}

// 獲取未完成的學生列表
const incompleteStudents = computed(() => {
  if (!selectedAssignment.value) return []
  
  const completedStudentIds = new Set(completions.value.map(c => c.student_id))
  return classMembers.value
    .filter(m => !completedStudentIds.has(m.student_id))
    .map(m => ({
      id: m.student_id,
      display_name: m.student?.display_name || m.student?.email?.split('@')[0] || '未知',
      email: m.student?.email || ''
    }))
})

// 返回列表
function backToList() {
  currentView.value = 'list'
  selectedClass.value = null
}

// 切換到進度標籤頁
async function switchToProgressTab() {
  activeTab.value = 'progress'
  if (selectedClass.value) {
    await classStore.fetchStudentProgress(selectedClass.value.id)
    // 獲取學生頭像信息
    await fetchStudentAvatars()
  }
}

// 切換到成員標籤頁
async function switchToMembersTab() {
  activeTab.value = 'members'
  if (selectedClass.value) {
    // 確保成員數據已載入
    if (classMembers.value.length === 0) {
      await classStore.fetchClassMembers(selectedClass.value.id)
    }
    // 獲取成員頭像信息
    await fetchMemberAvatars()
  }
}

// 獲取學生頭像 URL
async function fetchStudentAvatars() {
  if (!supabase || !classStore.studentProgress.length) return

  const avatarIds = classStore.studentProgress
    .map(s => s.current_avatar_id)
    .filter((id): id is string => id !== null)

  if (avatarIds.length === 0) return

  try {
    const { data: avatars } = await supabase
      .from('avatars')
      .select('id, filename')
      .in('id', avatarIds)

    if (avatars) {
      avatars.forEach(avatar => {
        // 頭像路徑：/images/avatars/{filename}
        const avatarUrl = `${import.meta.env.BASE_URL}images/avatars/${avatar.filename}`
        avatarUrlMap.value.set(avatar.id, avatarUrl)
      })
    }
  } catch (e) {
    console.error('獲取學生頭像失敗:', e)
  }
}

// 獲取成員頭像 URL
async function fetchMemberAvatars() {
  if (!supabase || !allMembers.value.length) return

  const avatarIds = allMembers.value
    .map(m => m.current_avatar_id)
    .filter((id): id is string => id !== null && id !== undefined)

  if (avatarIds.length === 0) return

  try {
    const { data: avatars } = await supabase
      .from('avatars')
      .select('id, filename')
      .in('id', avatarIds)

    if (avatars) {
      avatars.forEach(avatar => {
        // 頭像路徑：/images/avatars/{filename}
        const avatarUrl = `${import.meta.env.BASE_URL}images/avatars/${avatar.filename}`
        avatarUrlMap.value.set(avatar.id, avatarUrl)
      })
    }
  } catch (e) {
    console.error('獲取成員頭像失敗:', e)
  }
}

// 獲取學生頭像 URL
function getStudentAvatarUrl(student: any): string | null {
  if (!student.current_avatar_id) return null
  return avatarUrlMap.value.get(student.current_avatar_id) || null
}

// 獲取成員頭像 URL
function getMemberAvatarUrl(member: any): string | null {
  if (!member.current_avatar_id || member.status === 'pending') return null
  return avatarUrlMap.value.get(member.current_avatar_id) || null
}

// 批量添加學生
async function handleBatchAdd() {
  if (!selectedClass.value || !emailListText.value.trim()) return
  
  addingStudents.value = true
  addStudentsError.value = null
  addStudentsSuccess.value = null
  
  try {
    const result = await classStore.batchAddStudents(selectedClass.value.id, emailListText.value)
    
    // 構建成功信息
    let successMsg = `成功添加 ${result.added} 名學生`
    if (result.duplicates > 0) {
      successMsg += `，${result.duplicates} 個郵箱已在班級中`
    }
    if (result.invalidEmails > 0) {
      successMsg += `，${result.invalidEmails} 個無效郵箱（需使用 @student.isf.edu.hk 格式）`
    }
    addStudentsSuccess.value = successMsg
    
    // 刷新成員列表
    await classStore.fetchPendingStudents(selectedClass.value.id)
    await classStore.fetchClassMembers(selectedClass.value.id)
    
    // 如果全部成功，清空輸入
    if (result.invalidEmails === 0) {
    emailListText.value = ''
    }
  } catch (e) {
    console.error('批量添加失敗:', e)
    addStudentsError.value = (e as Error).message
  } finally {
    addingStudents.value = false
  }
}

// 關閉添加學生模態框
function closeAddStudentsModal() {
  showAddStudentsModal.value = false
  addStudentsError.value = null
  addStudentsSuccess.value = null
}

// 移除成員
async function removeMember(member: { id: string, student_id?: string, status: 'active' | 'pending' }) {
  if (!selectedClass.value) return
  
  const confirmMsg = member.status === 'pending' 
    ? '確定要移除這個待激活的學生嗎？' 
    : '確定要將此學生從班級中移除嗎？'
  
  if (!confirm(confirmMsg)) return
  
  if (member.status === 'pending') {
    await classStore.removePendingStudent(member.id)
  } else if (member.student_id) {
    await classStore.removeStudent(selectedClass.value.id, member.student_id)
  }
}

// 布置作業（老師）- 支持多選
async function handleAssign() {
  if (!selectedClass.value || selectedTextIds.value.size === 0) return
  
  assigning.value = true
  try {
    // 批量創建作業
    const textIds = Array.from(selectedTextIds.value)
    for (const textId of textIds) {
      await assignmentStore.createAssignment(
        selectedClass.value.id,
        textId,
        textIds.length === 1 ? (assignmentTitle.value || undefined) : undefined
      )
    }
    resetAssignModal()
    showAssignModal.value = false
    await assignmentStore.fetchClassAssignments(selectedClass.value.id)
    // 重新獲取統計
    const totalStudents = classMembers.value.length
    await assignmentStore.fetchAssignmentStats(selectedClass.value.id, totalStudents)
  } catch (e) {
    console.error('布置作業失敗:', e)
  } finally {
    assigning.value = false
  }
}

// 刪除作業（老師）
async function deleteAssignment(assignmentId: string) {
  if (!confirm('確定要刪除這個作業嗎？')) return
  await assignmentStore.deleteAssignment(assignmentId)
  if (selectedClass.value) {
    await assignmentStore.fetchClassAssignments(selectedClass.value.id)
  }
}

// 開始作業（學生）
function startAssignment(assignment: any) {
  router.push({
    name: 'practice',
    query: {
      textId: assignment.text_id,
      assignmentId: assignment.id
    }
  })
}

onMounted(async () => {
  if (authStore.isAuthenticated) {
    // 初始化頭像系統（用於顯示學生頭像）
    await avatarStore.fetchAvatars()
    
    // 老師需要載入文章列表和分類（用於布置作業）
    if (authStore.isTeacher) {
      await Promise.all([
        classStore.fetchMyClasses(),
        textsStore.fetchTexts(),
        libraryStore.fetchLibrary()
      ])
    } else {
      await Promise.all([
        classStore.fetchStudentClasses(),
        assignmentStore.fetchStudentAssignments()
      ])
    }
  }
})
</script>

<template>
  <main class="my-classes-container">
    <!-- 班級列表視圖 -->
    <template v-if="currentView === 'list'">
      <header class="page-header">
        <div>
          <h1 class="page-title">我的班級</h1>
          <p class="page-subtitle">
            {{ authStore.isTeacher ? '創建和管理你的班級' : '查看班級和作業' }}
          </p>
        </div>
        <button 
          v-if="authStore.isTeacher" 
          class="create-btn" 
          @click="showCreateForm = true"
        >
          + 新建班級
        </button>
      </header>

      <!-- 新建班級表單（老師） -->
      <section v-if="showCreateForm && authStore.isTeacher" class="create-form edamame-glass">
        <h2>新建班級</h2>
        <div class="form-group">
          <label>班級名稱 *</label>
          <input 
            v-model="newClassName" 
            type="text" 
            placeholder="例如：七年級A班"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>班級描述</label>
          <textarea 
            v-model="newClassDesc" 
            placeholder="選填，簡單描述這個班級"
            class="form-textarea"
            rows="2"
          ></textarea>
        </div>
        <div class="form-actions">
          <button class="cancel-btn" @click="showCreateForm = false">取消</button>
          <button 
            class="submit-btn" 
            @click="createClass"
            :disabled="!newClassName.trim() || creating"
          >
            {{ creating ? '創建中...' : '創建班級' }}
          </button>
        </div>
      </section>

      <!-- 加載中 -->
      <div v-if="loading" class="loading">載入中...</div>

      <!-- 班級列表 -->
      <section v-else-if="classes.length > 0" class="classes-grid">
        <article 
          v-for="cls in classes" 
          :key="cls.id" 
          class="class-card edamame-glass"
          @click="viewClass(cls)"
        >
          <div class="class-header">
            <h3 class="class-name">{{ cls.class_name }}</h3>
            <span class="member-count">
              {{ authStore.isTeacher ? `${cls.member_count || 0} 名學生` : '查看作業' }}
            </span>
          </div>
          <p v-if="cls.description" class="class-desc">{{ cls.description }}</p>
          <div class="class-footer">
            <span class="class-date">
              {{ authStore.isTeacher ? '創建於' : '加入於' }} 
              {{ new Date(cls.created_at).toLocaleDateString('zh-TW') }}
            </span>
          </div>
        </article>
      </section>

      <!-- 空狀態 -->
      <section v-else class="empty-state edamame-glass">
        <div class="empty-icon">📚</div>
        <h2>{{ authStore.isTeacher ? '還沒有班級' : '還沒有加入任何班級' }}</h2>
        <p v-if="authStore.isTeacher">
          點擊「新建班級」開始創建你的第一個班級
        </p>
        <p v-else>
          等待老師將你添加到班級中
        </p>
        <button 
          v-if="authStore.isTeacher" 
          class="create-btn" 
          @click="showCreateForm = true"
        >
          + 新建班級
        </button>
      </section>
    </template>

    <!-- 班級詳情視圖 -->
    <template v-else-if="currentView === 'detail' && selectedClass">
      <header class="page-header">
        <div class="header-with-back">
          <button class="back-btn" @click="backToList">← 返回</button>
          <div>
            <h1 class="page-title">{{ selectedClass.class_name }}</h1>
            <p class="page-subtitle">{{ selectedClass.description || '' }}</p>
          </div>
        </div>
        <div v-if="authStore.isTeacher" class="header-actions">
          <button 
            v-if="activeTab === 'assignments'"
            class="create-btn" 
            @click="showAssignModal = true"
          >
            + 布置作業
          </button>
          <button 
            v-if="activeTab === 'members'"
            class="create-btn" 
            @click="showAddStudentsModal = true"
          >
            + 添加學生
          </button>
          <button 
            class="game-btn"
            @click="$router.push({ name: 'arena-teacher-create', query: { classId: selectedClass?.id } })"
          >
            ⚔️ 發起比賽
          </button>
        </div>
      </header>

      <!-- 標籤頁（老師） -->
      <div v-if="authStore.isTeacher" class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'members' }"
          @click="switchToMembersTab()"
        >
          成員
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'assignments' }"
          @click="activeTab = 'assignments'"
        >
          作業
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'progress' }"
          @click="switchToProgressTab"
        >
          進度
        </button>
      </div>

      <!-- 成員標籤（老師） -->
      <section v-if="authStore.isTeacher && activeTab === 'members'" class="tab-content">
        <div class="section-header">
          <h2>班級成員 ({{ allMembers.length }})</h2>
        </div>

        <div v-if="allMembers.length === 0" class="empty-members edamame-glass">
          <p>班級中還沒有學生</p>
          <button class="create-btn" @click="showAddStudentsModal = true">
            + 添加學生
          </button>
        </div>

        <div v-else class="members-list">
          <div 
            v-for="member in allMembers" 
            :key="member.id" 
            class="member-card edamame-glass"
          >
            <div class="member-info">
              <UserAvatar 
                :size="40" 
                :src="getMemberAvatarUrl(member)"
                :alt="member.displayName"
                :class="{ pending: member.status === 'pending' }"
              />
              <div class="member-details">
                <p class="member-name">{{ member.displayName || '未知' }}</p>
                <p class="member-email">{{ member.email }}</p>
              </div>
            </div>
            <div class="member-actions">
              <span 
                class="status-badge" 
                :class="member.status === 'pending' ? 'pending' : 'active'"
              >
                {{ member.status === 'pending' ? '待激活' : '已激活' }}
              </span>
            <button 
              class="remove-btn"
              @click="removeMember(member)"
              title="移除"
            >
              ✕
            </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 作業標籤（老師/學生） -->
      <section v-if="activeTab === 'assignments'" class="tab-content">
        <div v-if="assignmentsLoading" class="loading">載入中...</div>
        <div v-else-if="assignments.length === 0" class="empty-assignments edamame-glass">
          <p>{{ authStore.isTeacher ? '還沒有布置作業' : '還沒有作業' }}</p>
          <button 
            v-if="authStore.isTeacher" 
            class="create-btn" 
            @click="showAssignModal = true"
          >
            + 布置作業
          </button>
        </div>
        <div v-else class="assignments-list">
          <div 
            v-for="assignment in assignments" 
            :key="assignment.id" 
            class="assignment-card edamame-glass"
            :class="{ clickable: authStore.isTeacher }"
            @click="authStore.isTeacher ? viewAssignmentDetail(assignment) : undefined"
          >
            <div class="assignment-info">
              <h3 class="assignment-title">
                {{ assignment.title || assignment.text?.title || '未命名作業' }}
              </h3>
              <p class="assignment-meta">
                {{ assignment.text?.author || '佚名' }} · 
                難度：{{ assignment.text?.difficulty === 1 ? '初級' : assignment.text?.difficulty === 2 ? '中級' : '高級' }}
              </p>
              <p class="assignment-date">
                布置於 {{ new Date(assignment.assigned_at).toLocaleDateString('zh-TW') }}
              </p>
              <!-- 作業統計（老師視圖） -->
              <div v-if="authStore.isTeacher" class="assignment-stats">
                <template v-if="getAssignmentStats(assignment.id)">
                  <span class="stat-item">
                    <span class="stat-value">{{ getAssignmentStats(assignment.id)?.completed_count || 0 }}</span>
                    <span class="stat-label">/{{ getAssignmentStats(assignment.id)?.total_students || 0 }} 完成</span>
                  </span>
                  <span v-if="getAssignmentStats(assignment.id)?.average_accuracy !== null" class="stat-item">
                    <span class="stat-label">平均正確率</span>
                    <span class="stat-value">{{ getAssignmentStats(assignment.id)?.average_accuracy }}%</span>
                  </span>
                </template>
                <span v-else class="stat-empty">暫無數據</span>
              </div>
            </div>
            <div class="assignment-actions">
              <span 
                v-if="authStore.isStudent && assignmentStatuses.get(assignment.id)"
                class="completed-badge"
              >
                已完成
              </span>
              <button 
                v-if="authStore.isStudent && !assignmentStatuses.get(assignment.id)"
                class="start-btn"
                @click="startAssignment(assignment)"
              >
                開始作業
              </button>
              <button 
                v-if="authStore.isTeacher"
                class="delete-btn"
                @click.stop="deleteAssignment(assignment.id)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 進度標籤（老師） -->
      <section v-if="authStore.isTeacher && activeTab === 'progress'" class="tab-content">
        <div v-if="loading" class="loading">載入中...</div>
        <div v-else-if="studentProgress.length === 0" class="empty-progress edamame-glass">
          <p>班級中還沒有學生數據</p>
        </div>
        <div v-else class="progress-list">
          <div class="progress-header">
            <span class="col-rank">#</span>
            <span class="col-student">學生</span>
            <span class="col-beans"><BeanIcon :size="14" /> 句豆</span>
            <span class="col-practice">總練習</span>
            <span class="col-weekly-practice">本週練習</span>
            <span class="col-unique-texts">不同文章</span>
            <span class="col-accuracy">平均正確率</span>
            <span class="col-last-practice">最近練習</span>
            <span class="col-streak">連續天數</span>
          </div>
          <div 
            v-for="(student, index) in studentProgress" 
            :key="student.student_id" 
            class="progress-row edamame-glass"
          >
            <span class="col-rank">
              <span v-if="index === 0" class="rank-badge gold">🥇</span>
              <span v-else-if="index === 1" class="rank-badge silver">🥈</span>
              <span v-else-if="index === 2" class="rank-badge bronze">🥉</span>
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </span>
            <span class="col-student">
              <UserAvatar 
                :size="40" 
                :src="getStudentAvatarUrl(student)"
                :alt="student.display_name"
              />
              <div class="student-info">
                <div class="student-name-row">
                  <span class="student-name">{{ student.display_name }}</span>
                  <span class="level-badge-inline">Lv.{{ student.level }}</span>
                </div>
                <span class="student-email">{{ student.email }}</span>
              </div>
            </span>
            <span class="col-beans">{{ student.beans }}</span>
            <span class="col-practice">{{ student.total_practices }}</span>
            <span class="col-weekly-practice">
              <span v-if="student.weekly_practices > 0" class="weekly-badge active">
                {{ student.weekly_practices }}
              </span>
              <span v-else class="weekly-badge inactive">0</span>
            </span>
            <span class="col-unique-texts">{{ student.unique_texts_practiced }}</span>
            <span class="col-accuracy">
              {{ student.average_accuracy }}%
            </span>
            <span class="col-last-practice">
              <span v-if="student.last_practice_days_ago === null" class="never-practiced">從未練習</span>
              <span v-else-if="student.last_practice_days_ago === 0" class="today-practiced">今天</span>
              <span v-else-if="student.last_practice_days_ago === 1" class="recent-practiced">昨天</span>
              <span v-else-if="student.last_practice_days_ago <= 7" class="recent-practiced">{{ student.last_practice_days_ago }}天前</span>
              <span v-else-if="student.last_practice_days_ago <= 30" class="old-practiced">{{ student.last_practice_days_ago }}天前</span>
              <span v-else class="very-old-practiced">{{ student.last_practice_days_ago }}天前</span>
            </span>
            <span class="col-streak">
              <span v-if="student.streak_days > 0" class="streak-badge">
                🔥 {{ student.streak_days }}天
              </span>
              <span v-else class="streak-empty">-</span>
            </span>
          </div>
        </div>
      </section>
    </template>

    <!-- 批量添加學生模態框 -->
    <div v-if="showAddStudentsModal" class="modal-overlay" @click.self="closeAddStudentsModal">
      <div class="modal-content edamame-glass">
        <h2>批量添加學生</h2>
        <p class="modal-hint">
          請輸入學生郵箱地址，每行一個或用逗號/分號分隔。僅支持 <code>xxxx@student.isf.edu.hk</code> 格式。
        </p>
        
        <!-- 錯誤提示 -->
        <div v-if="addStudentsError" class="add-students-error">
          ❌ {{ addStudentsError }}
        </div>
        
        <!-- 成功提示 -->
        <div v-if="addStudentsSuccess" class="add-students-success">
          ✅ {{ addStudentsSuccess }}
        </div>
        
        <textarea
          v-model="emailListText"
          placeholder="例如：&#10;student1@student.isf.edu.hk&#10;student2@student.isf.edu.hk"
          class="form-textarea"
          rows="10"
        ></textarea>
        <div class="modal-actions">
          <button class="cancel-btn" @click="closeAddStudentsModal">取消</button>
          <button 
            class="submit-btn" 
            @click="handleBatchAdd"
            :disabled="!emailListText.trim() || addingStudents"
          >
            {{ addingStudents ? '添加中...' : '添加學生' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 布置作業模態框 -->
    <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false; resetAssignModal()">
      <div class="modal-content modal-large edamame-glass">
        <div class="modal-header">
          <h2>布置作業</h2>
          <button class="close-btn" @click="showAssignModal = false; resetAssignModal()">✕</button>
        </div>
        
        <!-- 來源選擇標籤 -->
        <div class="source-tabs">
          <button 
            class="source-tab" 
            :class="{ active: assignSource === 'system' }"
            @click="assignSource = 'system'; assignSelectedCategoryId = null"
          >
            📚 系統文庫
          </button>
          <button 
            class="source-tab" 
            :class="{ active: assignSource === 'custom' }"
            @click="assignSource = 'custom'; assignSelectedCategoryId = null"
          >
            ✏️ 自訂練習
          </button>
        </div>

        <!-- 分類篩選（僅系統文庫） -->
        <div v-if="assignSource === 'system'" class="category-filter">
          <button 
            class="category-chip"
            :class="{ active: !assignSelectedCategoryId }"
            @click="assignSelectedCategoryId = null"
          >
            全部
          </button>
          <button 
            v-for="cat in systemCategories" 
            :key="cat.id"
            class="category-chip"
            :class="{ active: assignSelectedCategoryId === cat.id }"
            @click="assignSelectedCategoryId = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- 文章列表 -->
        <div class="text-list-container">
          <div class="text-list-header">
            <span class="text-count">
              {{ filteredTexts.length }} 篇文章
              <template v-if="selectedTextIds.size > 0">
                · 已選 {{ selectedTextIds.size }} 篇
              </template>
            </span>
            <div class="text-list-actions">
              <button 
                v-if="filteredTexts.length > 0"
                class="text-action-btn"
                @click="toggleSelectAll"
              >
                {{ selectedTextIds.size === filteredTexts.length ? '取消全選' : '全選' }}
              </button>
              <button 
                v-if="selectedTextIds.size > 0"
                class="text-action-btn"
                @click="clearSelection"
              >
                清空
              </button>
            </div>
          </div>
          
          <div v-if="filteredTexts.length === 0" class="empty-text-list">
            <p v-if="assignSource === 'custom'">還沒有自訂練習文章</p>
            <p v-else>此分類下沒有文章</p>
          </div>
          
          <div v-else class="text-list">
            <div 
              v-for="text in filteredTexts" 
              :key="text.id"
              class="text-item"
              :class="{ selected: selectedTextIds.has(text.id) }"
              @click="toggleTextSelection(text.id)"
            >
              <div class="text-checkbox">
                <span v-if="selectedTextIds.has(text.id)" class="check-icon">✓</span>
              </div>
              <div class="text-info">
                <span class="text-title">{{ text.title }}</span>
                <span class="text-author">{{ text.author || '佚名' }}</span>
              </div>
              <div class="text-meta">
                <span class="difficulty-badge" :class="'diff-' + text.difficulty">
                  {{ text.difficulty === 1 ? '初級' : text.difficulty === 2 ? '中級' : '高級' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 作業標題（僅當選擇單篇時顯示） -->
        <div v-if="selectedTextIds.size === 1" class="form-group">
          <label>作業標題（可選）</label>
          <input 
            v-model="assignmentTitle" 
            type="text" 
            placeholder="例如：週末練習"
            class="form-input"
          />
        </div>

        <!-- 選中摘要 -->
        <div v-if="selectedTextIds.size > 0" class="selection-summary">
          將布置 <strong>{{ selectedTextIds.size }}</strong> 個練習作業給班級學生
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" @click="showAssignModal = false; resetAssignModal()">取消</button>
          <button 
            class="submit-btn" 
            @click="handleAssign"
            :disabled="selectedTextIds.size === 0 || assigning"
          >
            {{ assigning ? '布置中...' : `布置 ${selectedTextIds.size} 個作業` }}
          </button>
        </div>
      </div>
    </div>

    <!-- 作業詳情彈窗 -->
    <div v-if="showAssignmentDetailModal" class="modal-overlay" @click.self="closeAssignmentDetailModal">
      <div class="modal-content modal-large edamame-glass">
        <div class="modal-header">
          <h2>{{ selectedAssignment?.title || selectedAssignment?.text?.title || '作業詳情' }}</h2>
          <button class="close-btn" @click="closeAssignmentDetailModal">✕</button>
        </div>
        
        <div v-if="loadingCompletions" class="loading">載入中...</div>
        
        <template v-else>
          <!-- 統計概覽 -->
          <div class="detail-stats">
            <div class="stat-card">
              <span class="stat-number">{{ completions.length }}</span>
              <span class="stat-desc">已完成</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">{{ incompleteStudents.length }}</span>
              <span class="stat-desc">未完成</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">
                {{ completions.length > 0 
                  ? Math.round(completions.reduce((acc, c) => acc + (c.accuracy || 0), 0) / completions.length) 
                  : 0 }}%
              </span>
              <span class="stat-desc">平均正確率</span>
            </div>
          </div>

          <!-- 已完成學生列表 -->
          <div class="detail-section">
            <h3>已完成 ({{ completions.length }})</h3>
            <div v-if="completions.length === 0" class="empty-section">
              還沒有學生完成此作業
            </div>
            <div v-else class="completion-list">
              <div 
                v-for="completion in completions" 
                :key="completion.id"
                class="completion-item"
              >
                <div class="completion-student">
                  <div class="mini-avatar">
                    {{ (completion.student?.display_name || '?').charAt(0).toUpperCase() }}
                  </div>
                  <span class="completion-name">{{ completion.student?.display_name || completion.student?.email?.split('@')[0] || '未知' }}</span>
                </div>
                <div class="completion-stats">
                  <span v-if="completion.accuracy !== null" class="completion-accuracy">
                    正確率: {{ completion.accuracy }}%
                  </span>
                  <span class="completion-time">
                    {{ new Date(completion.completed_at).toLocaleString('zh-TW') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 未完成學生列表 -->
          <div class="detail-section">
            <h3>未完成 ({{ incompleteStudents.length }})</h3>
            <div v-if="incompleteStudents.length === 0" class="empty-section complete-msg">
              🎉 所有學生都已完成！
            </div>
            <div v-else class="incomplete-list">
              <div 
                v-for="student in incompleteStudents" 
                :key="student.id"
                class="incomplete-item"
              >
                <div class="mini-avatar pending">
                  {{ (student.display_name || '?').charAt(0).toUpperCase() }}
                </div>
                <span class="incomplete-name">{{ student.display_name }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped>
.my-classes-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-with-back {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
}

.page-subtitle {
  color: var(--color-neutral-500);
  margin: 0.5rem 0 0;
}

.create-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.create-btn:hover {
  background: var(--color-primary-600);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.game-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.game-btn:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
}

.back-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--color-neutral-50);
}

.create-form {
  padding: 2rem;
  margin-bottom: 2rem;
  border-radius: var(--radius-xl);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-md);
  font-size: 1rem;
}

.form-actions,
.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn,
.submit-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn {
  background: var(--color-neutral-200);
  color: var(--color-neutral-700);
}

.submit-btn {
  background: var(--color-primary-500);
  color: white;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.class-card {
  padding: 1.5rem;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.class-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.class-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.member-count {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.class-desc {
  color: var(--color-neutral-600);
  margin: 0.5rem 0;
}

.class-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-neutral-200);
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--color-neutral-200);
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-neutral-600);
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--color-primary-600);
}

.tab-btn.active {
  color: var(--color-primary-600);
  border-bottom-color: var(--color-primary-600);
}

.tab-content {
  min-height: 400px;
}

.members-list,
.assignments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.member-card,
.assignment-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-primary-200);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-primary-700);
}

.member-name {
  font-weight: 500;
  margin: 0;
}

.member-email {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0.25rem 0 0;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.status-badge.pending {
  background: rgba(234, 179, 8, 0.15);
  color: #a16207;
}

.user-avatar.pending {
  background: var(--color-neutral-200);
  opacity: 0.6;
}

.remove-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 1.25rem;
}

.assignment-info {
  flex: 1;
}

.assignment-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.assignment-meta {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0.25rem 0;
}

.assignment-date {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin: 0.5rem 0 0;
}

.assignment-actions {
  display: flex;
  gap: 0.5rem;
}

.start-btn {
  padding: 0.5rem 1rem;
  background: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.delete-btn {
  padding: 0.5rem 1rem;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.completed-badge {
  padding: 0.5rem 1rem;
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(58, 80, 32, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-xl);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-large {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-hint {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin-bottom: 1rem;
}

.modal-hint code {
  background: var(--color-neutral-100);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-family: monospace;
}

.add-students-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.add-students-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #15803d;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.empty-members,
.empty-assignments,
.empty-progress {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-lg);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-neutral-500);
}

/* 作業統計樣式 */
.assignment-card.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.assignment-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.assignment-stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-neutral-200);
}

.stat-item {
  font-size: 0.875rem;
}

.stat-value {
  font-weight: 600;
  color: var(--color-primary-600);
}

.stat-label {
  color: var(--color-neutral-500);
  margin-left: 0.25rem;
}

.stat-empty {
  font-size: 0.875rem;
  color: var(--color-neutral-400);
}

/* 進度列表樣式 */
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-header {
  display: grid;
  grid-template-columns: 50px 2fr 100px 80px 80px 80px 100px 120px 100px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  font-size: 0.875rem;
  border-bottom: 2px solid var(--color-neutral-200);
}

.progress-row {
  display: grid;
  grid-template-columns: 50px 2fr 100px 80px 80px 80px 100px 120px 100px;
  gap: 0.5rem;
  padding: 1rem;
  align-items: center;
  border-radius: var(--radius-lg);
}

.col-rank {
  text-align: center;
}

.rank-badge {
  font-size: 1.25rem;
}

.rank-number {
  font-weight: 500;
  color: var(--color-neutral-500);
}

.col-student {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.student-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.25rem;
}

.student-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.student-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-badge-inline {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.student-email {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-badge {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
}

.col-beans,
.col-practice,
.col-weekly-practice,
.col-unique-texts,
.col-accuracy,
.col-last-practice {
  text-align: center;
  font-weight: 500;
  font-size: 0.875rem;
}

.weekly-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
}

.weekly-badge.active {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.weekly-badge.inactive {
  background: var(--color-neutral-100);
  color: var(--color-neutral-400);
}

.col-streak {
  text-align: center;
}

.never-practiced {
  color: var(--color-neutral-400);
  font-style: italic;
}

.today-practiced {
  color: #22c55e;
  font-weight: 600;
}

.recent-practiced {
  color: #3b82f6;
}

.old-practiced {
  color: #f59e0b;
}

.very-old-practiced {
  color: #ef4444;
  font-weight: 600;
}

.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
}

.streak-empty {
  color: var(--color-neutral-400);
}

/* 作業詳情彈窗樣式 */
.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-neutral-200);
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-neutral-500);
  padding: 0.5rem;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-neutral-700);
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-neutral-50);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary-600);
}

.stat-desc {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--color-neutral-700);
}

.empty-section {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-neutral-500);
  background: var(--color-neutral-50);
  border-radius: var(--radius-md);
}

.empty-section.complete-msg {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}

.completion-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
}

.completion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-neutral-50);
  border-radius: var(--radius-md);
}

.completion-student {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mini-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary-200);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-primary-700);
}

.mini-avatar.pending {
  background: var(--color-neutral-200);
  color: var(--color-neutral-500);
}

.completion-name,
.incomplete-name {
  font-weight: 500;
}

.completion-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.completion-accuracy {
  color: var(--color-primary-600);
  font-weight: 500;
}

.incomplete-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.incomplete-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-neutral-50);
  border-radius: var(--radius-md);
}

/* 布置作業模態框樣式 */
.source-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-neutral-200);
}

.source-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--color-neutral-100);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-weight: 500;
  color: var(--color-neutral-600);
  transition: all 0.2s;
}

.source-tab:hover {
  background: var(--color-neutral-200);
}

.source-tab.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-500);
  color: var(--color-primary-700);
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.category-chip {
  padding: 0.5rem 1rem;
  background: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-neutral-700);
  transition: all 0.2s;
}

.category-chip:hover {
  background: var(--color-neutral-200);
}

.category-chip.active {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: white;
}

.text-list-container {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 1rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.text-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-200);
  flex-shrink: 0;
}

.text-count {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.text-list-actions {
  display: flex;
  gap: 0.5rem;
}

.text-action-btn {
  padding: 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  transition: all 0.2s;
}

.text-action-btn:hover {
  background: var(--color-neutral-100);
}

.text-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.empty-text-list {
  padding: 2rem;
  text-align: center;
  color: var(--color-neutral-500);
}

.text-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--color-neutral-100);
}

.text-item:last-child {
  border-bottom: none;
}

.text-item:hover {
  background: var(--color-neutral-50);
}

.text-item.selected {
  background: var(--color-primary-50);
}

.text-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-neutral-300);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.text-item.selected .text-checkbox {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.check-icon {
  color: white;
  font-weight: bold;
  font-size: 0.875rem;
}

.text-info {
  flex: 1;
  min-width: 0;
}

.text-title {
  display: block;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-author {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.text-meta {
  flex-shrink: 0;
}

.difficulty-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.diff-1 {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}

.diff-2 {
  background: rgba(234, 179, 8, 0.1);
  color: #a16207;
}

.diff-3 {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.selection-summary {
  padding: 0.75rem 1rem;
  background: var(--color-primary-50);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--color-primary-700);
  margin-bottom: 1rem;
}

/* 響應式調整 */
@media (max-width: 1024px) {
  .progress-header,
  .progress-row {
    grid-template-columns: 40px 1.5fr 80px 70px 70px 70px 80px 100px 80px;
    font-size: 0.75rem;
  }
}

@media (max-width: 768px) {
  .progress-header {
    display: none;
  }
  
  .progress-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .col-rank {
    order: 1;
  }
  
  .col-student {
    order: 2;
    flex: 1;
  }
  
  .col-beans,
  .col-practice,
  .col-weekly-practice,
  .col-unique-texts,
  .col-accuracy,
  .col-last-practice,
  .col-streak {
    width: auto;
    text-align: left;
  }
  
  .detail-stats {
    grid-template-columns: 1fr;
  }
}
</style>

