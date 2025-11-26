<script setup lang="ts">
/**
 * 句豆 - 用戶管理頁面
 * 
 * 僅超級管理員可訪問
 * 功能：查看所有用戶、任命/撤銷管理員
 */
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabaseClient'

interface UserItem {
  id: string
  email: string
  display_name: string
  role: 'teacher' | 'student'
  is_admin: boolean
  is_super_admin: boolean
  created_at: string
  last_login: string
}

const authStore = useAuthStore()
const users = ref<UserItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const updating = ref<string | null>(null) // 正在更新的用戶 ID

// 過濾和排序
const searchQuery = ref('')
const roleFilter = ref<'all' | 'teacher' | 'student'>('all')

// 過濾後的用戶列表
const filteredUsers = computed(() => {
  let result = users.value
  
  // 角色過濾
  if (roleFilter.value !== 'all') {
    result = result.filter(u => u.role === roleFilter.value)
  }
  
  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u => 
      u.display_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    )
  }
  
  return result
})

// 統計數據
const stats = computed(() => ({
  total: users.value.length,
  teachers: users.value.filter(u => u.role === 'teacher').length,
  students: users.value.filter(u => u.role === 'student').length,
  admins: users.value.filter(u => u.is_admin && !u.is_super_admin).length,
  superAdmins: users.value.filter(u => u.is_super_admin).length
}))

// 加載所有用戶
async function fetchUsers() {
  if (!supabase) return
  
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await supabase
      .rpc('get_all_users_for_admin')
    
    if (fetchError) throw fetchError
    
    users.value = data || []
  } catch (e) {
    console.error('[AdminUsers] 加載用戶失敗:', e)
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

// 切換管理員狀態
async function toggleAdmin(user: UserItem) {
  if (!supabase || user.is_super_admin) return
  
  updating.value = user.id
  
  try {
    const newStatus = !user.is_admin
    const { data, error: updateError } = await supabase
      .rpc('set_user_admin', {
        target_user_id: user.id,
        admin_status: newStatus
      })
    
    if (updateError) throw updateError
    
    const result = data as { success: boolean; error?: string; message?: string }
    
    if (!result.success) {
      throw new Error(result.error || '操作失敗')
    }
    
    // 更新本地狀態
    const userIndex = users.value.findIndex(u => u.id === user.id)
    if (userIndex >= 0) {
      users.value[userIndex]!.is_admin = newStatus
    }
    
    console.log('[AdminUsers]', result.message || '操作成功')
  } catch (e) {
    console.error('[AdminUsers] 更新失敗:', e)
    error.value = (e as Error).message
  } finally {
    updating.value = null
  }
}

// 格式化日期
function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// 獲取角色標籤
function getRoleLabel(role: string) {
  return role === 'teacher' ? '老師' : '學生'
}

// 獲取狀態標籤
function getStatusLabel(user: UserItem) {
  if (user.is_super_admin) return '超級管理員'
  if (user.is_admin) return '管理員'
  return '普通用戶'
}

onMounted(() => {
  if (authStore.isSuperAdmin) {
    fetchUsers()
  }
})
</script>

<template>
  <div class="admin-users-page">
    <!-- 權限檢查 -->
    <div v-if="!authStore.isSuperAdmin" class="access-denied">
      <div class="denied-icon">🔒</div>
      <h2>權限不足</h2>
      <p>只有超級管理員可以訪問此頁面</p>
    </div>

    <!-- 用戶管理內容 -->
    <template v-else>
      <!-- 頁面標題 -->
      <header class="page-header">
        <div class="header-content">
          <h1>用戶管理</h1>
          <p class="subtitle">管理系統用戶和管理員權限</p>
        </div>
      </header>

      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">總用戶</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.teachers }}</div>
          <div class="stat-label">老師</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.students }}</div>
          <div class="stat-label">學生</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-value">{{ stats.admins }}</div>
          <div class="stat-label">管理員</div>
        </div>
      </div>

      <!-- 搜索和過濾 -->
      <div class="toolbar">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索用戶名稱或郵箱..." 
            class="search-input"
          />
        </div>
        <div class="filter-group">
          <button 
            class="filter-btn"
            :class="{ active: roleFilter === 'all' }"
            @click="roleFilter = 'all'"
          >
            全部
          </button>
          <button 
            class="filter-btn"
            :class="{ active: roleFilter === 'teacher' }"
            @click="roleFilter = 'teacher'"
          >
            老師
          </button>
          <button 
            class="filter-btn"
            :class="{ active: roleFilter === 'student' }"
            @click="roleFilter = 'student'"
          >
            學生
          </button>
        </div>
      </div>

      <!-- 錯誤提示 -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- 用戶列表 -->
      <div class="users-table-container">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>載入中...</p>
        </div>

        <table v-else class="users-table">
          <thead>
            <tr>
              <th>用戶</th>
              <th>角色</th>
              <th>狀態</th>
              <th>加入時間</th>
              <th>最後登入</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'is-admin': user.is_admin }">
              <td class="user-cell">
                <div class="user-info">
                  <div class="user-avatar">
                    {{ user.display_name.charAt(0) }}
                  </div>
                  <div class="user-details">
                    <div class="user-name">{{ user.display_name }}</div>
                    <div class="user-email">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="role-badge" :class="user.role">
                  {{ getRoleLabel(user.role) }}
                </span>
              </td>
              <td>
                <span class="status-badge" :class="{ 
                  'super-admin': user.is_super_admin,
                  'admin': user.is_admin && !user.is_super_admin
                }">
                  {{ getStatusLabel(user) }}
                </span>
              </td>
              <td class="date-cell">{{ formatDate(user.created_at) }}</td>
              <td class="date-cell">{{ formatDate(user.last_login) }}</td>
              <td class="action-cell">
                <button 
                  v-if="!user.is_super_admin"
                  class="action-btn"
                  :class="{ 
                    'revoke': user.is_admin, 
                    'grant': !user.is_admin,
                    'loading': updating === user.id
                  }"
                  :disabled="updating === user.id"
                  @click="toggleAdmin(user)"
                >
                  <span v-if="updating === user.id">處理中...</span>
                  <span v-else-if="user.is_admin">撤銷管理員</span>
                  <span v-else>任命管理員</span>
                </button>
                <span v-else class="protected-label">受保護</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && filteredUsers.length === 0" class="empty-state">
          <p>沒有找到符合條件的用戶</p>
        </div>
      </div>

      <!-- 說明 -->
      <div class="info-box">
        <h3>💡 管理員權限說明</h3>
        <ul>
          <li><strong>超級管理員</strong>：可以管理所有用戶、任命/撤銷管理員（您）</li>
          <li><strong>管理員</strong>：可以管理系統文庫（添加、編輯、刪除系統內建文章）</li>
          <li><strong>普通用戶</strong>：老師可以管理自己的班級和自訂練習，學生可以完成作業</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-users-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* 權限不足頁面 */
.access-denied {
  text-align: center;
  padding: 4rem 2rem;
}

.denied-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.access-denied h2 {
  margin: 0 0 0.5rem;
  color: var(--color-neutral-800);
}

.access-denied p {
  color: var(--color-neutral-500);
}

/* 頁面標題 */
.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  color: var(--color-neutral-800);
}

.subtitle {
  margin: 0.5rem 0 0;
  color: var(--color-neutral-500);
}

/* 統計卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card.highlight {
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100));
  border: 1px solid var(--color-primary-200);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-neutral-800);
}

.stat-card.highlight .stat-value {
  color: var(--color-primary-700);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin-top: 0.25rem;
}

/* 工具欄 */
.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-400);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--color-primary-400);
}

.filter-group {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-neutral-200);
  background: white;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: var(--color-primary-300);
}

.filter-btn.active {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: white;
}

/* 錯誤提示 */
.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

/* 表格容器 */
.users-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

/* 載入狀態 */
.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-neutral-500);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-neutral-200);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 表格樣式 */
.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-neutral-100);
}

.users-table th {
  background: var(--color-neutral-50);
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.users-table tr.is-admin {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.05), transparent);
}

/* 用戶信息單元格 */
.user-cell {
  min-width: 200px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-name {
  font-weight: 500;
  color: var(--color-neutral-800);
}

.user-email {
  font-size: 0.8rem;
  color: var(--color-neutral-500);
}

/* 角色標籤 */
.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-badge.teacher {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-badge.student {
  background: #fef3c7;
  color: #d97706;
}

/* 狀態標籤 */
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
}

.status-badge.admin {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.super-admin {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

/* 日期單元格 */
.date-cell {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  white-space: nowrap;
}

/* 操作按鈕 */
.action-cell {
  white-space: nowrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-btn.grant {
  background: var(--color-primary-500);
  color: white;
}

.action-btn.grant:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.action-btn.revoke {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn.revoke:hover:not(:disabled) {
  background: #fecaca;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.loading {
  opacity: 0.8;
}

.protected-label {
  font-size: 0.8rem;
  color: var(--color-neutral-400);
  font-style: italic;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-neutral-500);
}

/* 說明框 */
.info-box {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 1.5rem;
}

.info-box h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: var(--color-neutral-800);
}

.info-box ul {
  margin: 0;
  padding-left: 1.25rem;
}

.info-box li {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-neutral-600);
  line-height: 1.5;
}

.info-box li:last-child {
  margin-bottom: 0;
}

/* 響應式 */
@media (max-width: 768px) {
  .admin-users-page {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .toolbar {
    flex-direction: column;
  }
  
  .users-table-container {
    overflow-x: auto;
  }
  
  .users-table {
    min-width: 700px;
  }
}
</style>

