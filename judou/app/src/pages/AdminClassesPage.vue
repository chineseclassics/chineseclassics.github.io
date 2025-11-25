<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabaseClient'

const authStore = useAuthStore()

interface ClassInfo {
  id: string
  class_name: string
  description: string | null
  created_at: string
  is_active: boolean
  member_count?: number
}

const classes = ref<ClassInfo[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 新建班級表單
const showCreateForm = ref(false)
const newClassName = ref('')
const newClassDesc = ref('')
const creating = ref(false)

// 獲取班級列表
async function fetchClasses() {
  if (!supabase || !authStore.user) return
  
  loading.value = true
  error.value = null
  
  try {
    // 先獲取班級
    const { data: classData, error: fetchError } = await supabase
      .from('classes')
      .select('id, class_name, description, created_at, is_active')
      .eq('teacher_id', authStore.user.id)
      .order('created_at', { ascending: false })
    
    if (fetchError) throw fetchError
    
    // 獲取每個班級的成員數量
    const classesWithCount: ClassInfo[] = []
    for (const cls of classData || []) {
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id)
      
      classesWithCount.push({
        ...cls,
        member_count: count || 0
      })
    }
    
    classes.value = classesWithCount
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

// 創建班級
async function createClass() {
  if (!supabase || !authStore.user || !newClassName.value.trim()) return
  
  creating.value = true
  
  try {
    const { error: insertError } = await supabase
      .from('classes')
      .insert({
        teacher_id: authStore.user.id,
        class_name: newClassName.value.trim(),
        description: newClassDesc.value.trim() || null
      })
    
    if (insertError) throw insertError
    
    // 重新獲取列表
    await fetchClasses()
    
    // 重置表單
    newClassName.value = ''
    newClassDesc.value = ''
    showCreateForm.value = false
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    creating.value = false
  }
}

// 刪除班級
async function deleteClass(classId: string) {
  if (!supabase || !confirm('確定要刪除這個班級嗎？')) return
  
  try {
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)
    
    if (deleteError) throw deleteError
    
    await fetchClasses()
  } catch (e) {
    error.value = (e as Error).message
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchClasses()
  }
})
</script>

<template>
  <main class="admin-classes-container">
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
          <span class="member-count">{{ cls.member_count }} 名學生</span>
        </div>
        <p v-if="cls.description" class="class-desc">{{ cls.description }}</p>
        <div class="class-footer">
          <span class="class-date">
            創建於 {{ new Date(cls.created_at).toLocaleDateString('zh-TW') }}
          </span>
          <div class="class-actions">
            <button class="action-btn view-btn">查看成員</button>
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
</style>

