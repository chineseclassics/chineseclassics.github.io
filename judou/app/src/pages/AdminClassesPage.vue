<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useClassStore, type ClassInfo } from '../stores/classStore'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const classStore = useClassStore()
const { classes, classMembers, pendingStudents, loading, error } = storeToRefs(classStore)

// 視圖狀態
const currentView = ref<'list' | 'detail'>('list')
const selectedClass = ref<ClassInfo | null>(null)

// 新建班級表單
const showCreateForm = ref(false)
const newClassName = ref('')
const newClassDesc = ref('')
const creating = ref(false)

// 批量添加學生
const showAddStudentsModal = ref(false)
const emailListText = ref('')
const addingStudents = ref(false)
const addResult = ref<{
  validEmails: number
  invalidEmails: number
  duplicates: number
  added: number
  invalidList: string[]
} | null>(null)

// 合併成員列表（已激活 + 待激活）
const allMembers = computed(() => {
  const active = classMembers.value.map(m => ({
    id: m.id,
    email: m.student?.email || '未知',
    displayName: m.student?.display_name || '未知',
    status: 'active' as const,
    addedAt: m.added_at
  }))
  
  const pending = pendingStudents.value.map(p => ({
    id: p.id,
    email: p.email,
    displayName: p.email.split('@')[0],
    status: 'pending' as const,
    addedAt: p.added_at
  }))
  
  return [...active, ...pending].sort((a, b) => 
    new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  )
})

// 創建班級
async function createClass() {
  if (!newClassName.value.trim()) return
  
  creating.value = true
  
  try {
    await classStore.createClass(newClassName.value.trim(), newClassDesc.value.trim())
    
    // 重置表單
    newClassName.value = ''
    newClassDesc.value = ''
    showCreateForm.value = false
  } catch (e) {
    console.error('創建班級失敗:', e)
  } finally {
    creating.value = false
  }
}

// 刪除班級
async function deleteClass(classId: string) {
  if (!confirm('確定要刪除這個班級嗎？此操作無法撤銷。')) return
  
  await classStore.deleteClass(classId)
}

// 查看班級詳情
async function viewClass(cls: ClassInfo) {
  selectedClass.value = cls
  currentView.value = 'detail'
  
  // 獲取成員列表
  await Promise.all([
    classStore.fetchClassMembers(cls.id),
    classStore.fetchPendingStudents(cls.id)
  ])
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
  addResult.value = null
  
  try {
    const result = await classStore.batchAddStudents(selectedClass.value.id, emailListText.value)
    addResult.value = result
    
    // 刷新列表
    await classStore.fetchPendingStudents(selectedClass.value.id)
    
    // 如果全部成功，清空輸入
    if (result.invalidEmails === 0) {
      emailListText.value = ''
    }
  } catch (e) {
    console.error('批量添加失敗:', e)
  } finally {
    addingStudents.value = false
  }
}

// 移除成員
async function removeMember(member: { id: string, status: 'active' | 'pending' }) {
  if (!selectedClass.value) return
  
  const confirmMsg = member.status === 'pending' 
    ? '確定要移除這個待激活的學生嗎？' 
    : '確定要將此學生從班級中移除嗎？'
  
  if (!confirm(confirmMsg)) return
  
  if (member.status === 'pending') {
    await classStore.removePendingStudent(member.id)
  } else {
    // 找到對應的 student_id
    const classMember = classMembers.value.find(m => m.id === member.id)
    if (classMember) {
      await classStore.removeStudent(selectedClass.value.id, classMember.student_id)
    }
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    classStore.fetchMyClasses()
  }
})
</script>

<template>
  <main class="admin-classes-container">
    <!-- 班級列表視圖 -->
    <template v-if="currentView === 'list'">
      <header class="page-header">
        <div>
          <h1 class="page-title">班級管理</h1>
          <p class="page-subtitle">創建和管理你的班級</p>
        </div>
        <button class="create-btn" @click="showCreateForm = true">
          + 新建班級
        </button>
      </header>

      <!-- 錯誤提示 -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- 新建班級表單 -->
      <section v-if="showCreateForm" class="create-form edamame-glass">
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
      <div v-if="loading" class="loading">
        載入中...
      </div>

      <!-- 班級列表 -->
      <section v-else-if="classes.length > 0" class="classes-grid">
        <article v-for="cls in classes" :key="cls.id" class="class-card edamame-glass">
          <div class="class-header">
            <h3 class="class-name">{{ cls.class_name }}</h3>
            <span class="member-count">{{ cls.member_count || 0 }} 名學生</span>
          </div>
          <p v-if="cls.description" class="class-desc">{{ cls.description }}</p>
          <div class="class-footer">
            <span class="class-date">
              創建於 {{ new Date(cls.created_at).toLocaleDateString('zh-TW') }}
            </span>
            <div class="class-actions">
              <button class="action-btn view-btn" @click="viewClass(cls)">管理成員</button>
              <button class="action-btn delete-btn" @click="deleteClass(cls.id)">刪除</button>
            </div>
          </div>
        </article>
      </section>

      <!-- 空狀態 -->
      <section v-else class="empty-state edamame-glass">
        <div class="empty-icon">📚</div>
        <h2>還沒有班級</h2>
        <p>點擊「新建班級」開始創建你的第一個班級</p>
        <button class="create-btn" @click="showCreateForm = true">
          + 新建班級
        </button>
      </section>
    </template>

    <!-- 班級詳情視圖 -->
    <template v-else-if="currentView === 'detail' && selectedClass">
      <header class="page-header">
        <div class="header-with-back">
          <button class="back-btn" @click="backToList">
            ← 返回
          </button>
          <div>
            <h1 class="page-title">{{ selectedClass.class_name }}</h1>
            <p class="page-subtitle">{{ selectedClass.description || '管理班級成員' }}</p>
          </div>
        </div>
        <button class="create-btn" @click="showAddStudentsModal = true">
          + 添加學生
        </button>
      </header>

      <!-- 成員列表 -->
      <section class="members-section">
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
                {{ (member.displayName || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="member-details">
                <p class="member-name">{{ member.displayName }}</p>
                <p class="member-email">{{ member.email }}</p>
              </div>
            </div>
            <div class="member-status-actions">
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

      <!-- 添加學生模態框 -->
      <div v-if="showAddStudentsModal" class="modal-overlay" @click.self="showAddStudentsModal = false">
        <div class="modal-content edamame-glass">
          <h2>批量添加學生</h2>
          <p class="modal-hint">
            輸入學生的學校郵箱地址（每行一個，或用逗號分隔）<br>
            格式：<code>xxxx@student.isf.edu.hk</code>
          </p>
          
          <textarea 
            v-model="emailListText"
            class="email-input"
            rows="8"
            placeholder="例如：
student001@student.isf.edu.hk
student002@student.isf.edu.hk
student003@student.isf.edu.hk"
          ></textarea>

          <!-- 添加結果 -->
          <div v-if="addResult" class="add-result">
            <p class="result-success">✓ 成功添加 {{ addResult.added }} 名學生</p>
            <p v-if="addResult.duplicates > 0" class="result-warning">
              ⚠ {{ addResult.duplicates }} 個郵箱已在班級中
            </p>
            <p v-if="addResult.invalidEmails > 0" class="result-error">
              ✕ {{ addResult.invalidEmails }} 個無效郵箱：
              <span class="invalid-list">{{ addResult.invalidList.join(', ') }}</span>
            </p>
          </div>

          <div class="modal-actions">
            <button class="cancel-btn" @click="showAddStudentsModal = false; addResult = null">
              關閉
            </button>
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
    </template>
  </main>
</template>

<style scoped>
.admin-classes-container {
  padding: clamp(1.5rem, 3vw, 3rem);
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-with-back {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--color-neutral-300);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

.back-btn:hover {
  background: var(--color-neutral-100);
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: bold;
}

.page-subtitle {
  margin: 0.25rem 0 0;
  color: var(--color-neutral-500);
}

.create-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.error-message {
  padding: 1rem;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  margin-bottom: 1rem;
}

/* 創建表單 */
.create-form {
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.create-form h2 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-neutral-700);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary-500);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: 1px solid var(--color-neutral-300);
  border-radius: 8px;
  cursor: pointer;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 班級列表 */
.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.class-card {
  padding: 1.5rem;
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.class-name {
  margin: 0;
  font-size: 1.25rem;
}

.member-count {
  font-size: 0.875rem;
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}

.class-desc {
  margin: 0 0 1rem;
  color: var(--color-neutral-600);
  font-size: 0.875rem;
}

.class-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.class-date {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.class-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.view-btn:hover {
  background: var(--color-primary-100);
}

.delete-btn {
  background: #ffebee;
  color: #c62828;
}

.delete-btn:hover {
  background: #ffcdd2;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  margin: 0 0 0.5rem;
}

.empty-state p {
  margin: 0 0 1.5rem;
  color: var(--color-neutral-500);
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-neutral-500);
}

/* 成員列表 */
.members-section {
  margin-top: 1rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.empty-members {
  text-align: center;
  padding: 2rem;
}

.empty-members p {
  margin: 0 0 1rem;
  color: var(--color-neutral-500);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.member-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.member-details {
  display: flex;
  flex-direction: column;
}

.member-name {
  margin: 0;
  font-weight: 500;
}

.member-email {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.member-status-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.pending {
  background: #fff3e0;
  color: #ef6c00;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #ffebee;
  color: #c62828;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #ffcdd2;
}

/* 模態框 */
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
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
  background: white;
}

.modal-content h2 {
  margin: 0 0 0.5rem;
}

.modal-hint {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.modal-hint code {
  background: var(--color-neutral-100);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.email-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.email-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
}

.add-result {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-neutral-50);
  border-radius: 8px;
}

.result-success {
  margin: 0;
  color: #2e7d32;
}

.result-warning {
  margin: 0.5rem 0 0;
  color: #ef6c00;
}

.result-error {
  margin: 0.5rem 0 0;
  color: #c62828;
}

.invalid-list {
  font-size: 0.75rem;
  word-break: break-all;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
