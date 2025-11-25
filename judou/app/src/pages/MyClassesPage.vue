<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useClassStore, type ClassInfo } from '../stores/classStore'
import { useAssignmentStore } from '../stores/assignmentStore'
import { useTextsStore } from '../stores/textsStore'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const classStore = useClassStore()
const assignmentStore = useAssignmentStore()
const textsStore = useTextsStore()
const router = useRouter()

const { classes, classMembers, loading } = storeToRefs(classStore)
const { assignments, loading: assignmentsLoading } = storeToRefs(assignmentStore)

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

// 布置作業
const showAssignModal = ref(false)
const selectedTextId = ref<string | null>(null)
const assignmentTitle = ref('')
const assigning = ref(false)

// 合併成員列表
const allMembers = computed(() => {
  const active = classMembers.value.map(m => ({
    id: m.id,
    email: m.student?.email || '未知',
    displayName: m.student?.display_name || '未知',
    status: 'active' as const,
    addedAt: m.added_at
  }))
  
  return active.sort((a, b) => 
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
      assignmentStore.fetchClassAssignments(cls.id)
    ])
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

// 返回列表
function backToList() {
  currentView.value = 'list'
  selectedClass.value = null
}

// 批量添加學生
async function handleBatchAdd() {
  if (!selectedClass.value || !emailListText.value.trim()) return
  
  addingStudents.value = true
  try {
    await classStore.batchAddStudents(selectedClass.value.id, emailListText.value)
    emailListText.value = ''
    showAddStudentsModal.value = false
  } catch (e) {
    console.error('批量添加失敗:', e)
  } finally {
    addingStudents.value = false
  }
}

// 移除成員
async function removeMember(member: { id: string, student_id?: string }) {
  if (!selectedClass.value) return
  if (!confirm('確定要將此學生從班級中移除嗎？')) return
  
  if (member.student_id) {
    await classStore.removeStudent(selectedClass.value.id, member.student_id)
  }
}

// 布置作業（老師）
async function handleAssign() {
  if (!selectedClass.value || !selectedTextId.value) return
  
  assigning.value = true
  try {
    await assignmentStore.createAssignment(
      selectedClass.value.id,
      selectedTextId.value,
      assignmentTitle.value || undefined
    )
    selectedTextId.value = null
    assignmentTitle.value = ''
    showAssignModal.value = false
    await assignmentStore.fetchClassAssignments(selectedClass.value.id)
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
    // 老師需要載入文章列表（用於布置作業）
    if (authStore.isTeacher) {
      await Promise.all([
        classStore.fetchMyClasses(),
        textsStore.fetchTexts()
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
        <button 
          v-if="authStore.isTeacher && activeTab === 'assignments'"
          class="create-btn" 
          @click="showAssignModal = true"
        >
          + 布置作業
        </button>
        <button 
          v-if="authStore.isTeacher && activeTab === 'members'"
          class="create-btn" 
          @click="showAddStudentsModal = true"
        >
          + 添加學生
        </button>
      </header>

      <!-- 標籤頁（老師） -->
      <div v-if="authStore.isTeacher" class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'members' }"
          @click="activeTab = 'members'"
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
          @click="activeTab = 'progress'"
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
              <div class="member-avatar">
                {{ member.displayName.charAt(0).toUpperCase() }}
              </div>
              <div class="member-details">
                <p class="member-name">{{ member.displayName }}</p>
                <p class="member-email">{{ member.email }}</p>
              </div>
            </div>
            <button 
              class="remove-btn"
              @click="removeMember(member)"
              title="移除"
            >
              ✕
            </button>
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
                @click="deleteAssignment(assignment.id)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 進度標籤（老師） -->
      <section v-if="authStore.isTeacher && activeTab === 'progress'" class="tab-content">
        <div class="progress-placeholder edamame-glass">
          <p>進度統計功能開發中...</p>
        </div>
      </section>
    </template>

    <!-- 批量添加學生模態框 -->
    <div v-if="showAddStudentsModal" class="modal-overlay" @click.self="showAddStudentsModal = false">
      <div class="modal-content edamame-glass">
        <h2>批量添加學生</h2>
        <p class="modal-hint">
          請輸入學生郵箱地址，每行一個或用逗號/分號分隔。僅支持 `xxxx@student.isf.edu.hk` 格式。
        </p>
        <textarea
          v-model="emailListText"
          placeholder="例如：&#10;student1@student.isf.edu.hk&#10;student2@student.isf.edu.hk"
          class="form-textarea"
          rows="10"
        ></textarea>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showAddStudentsModal = false">取消</button>
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
    <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
      <div class="modal-content edamame-glass">
        <h2>布置作業</h2>
        <div class="form-group">
          <label>選擇文章</label>
          <select v-model="selectedTextId" class="form-input">
            <option value="">請選擇文章</option>
            <option 
              v-for="text in textsStore.texts" 
              :key="text.id" 
              :value="text.id"
            >
              {{ text.title }} ({{ text.author || '佚名' }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>作業標題（可選）</label>
          <input 
            v-model="assignmentTitle" 
            type="text" 
            placeholder="例如：週末練習"
            class="form-input"
          />
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showAssignModal = false">取消</button>
          <button 
            class="submit-btn" 
            @click="handleAssign"
            :disabled="!selectedTextId || assigning"
          >
            {{ assigning ? '布置中...' : '布置作業' }}
          </button>
        </div>
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
  background: rgba(0, 0, 0, 0.5);
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

.modal-hint {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin-bottom: 1rem;
}

.empty-members,
.empty-assignments,
.progress-placeholder {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-lg);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-neutral-500);
}
</style>

