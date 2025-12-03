<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTextsStore } from '@/stores/textsStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAuthStore } from '@/stores/authStore'
import type { PracticeText } from '@/types/text'
import type { PracticeCategory } from '@/types/practiceLibrary'

const route = useRoute()
const textsStore = useTextsStore()
const libraryStore = usePracticeLibraryStore()
const authStore = useAuthStore()

// 判斷當前模式：admin（系統文庫）或 teacher（自訂練習）
const isAdminMode = computed(() => route.meta.mode === 'admin')
const pageTitle = computed(() => isAdminMode.value ? '系統文庫' : '自訂練習')
const pageSubtitle = computed(() => isAdminMode.value ? '管理系統內建的練習文章' : '管理我的自訂練習文章')

// 當前選中的分類
const selectedCategoryId = ref<string | null>(null)

// Modal 狀態
const isTextFormOpen = ref(false)
const isConfirmOpen = ref(false)
const isSubmitting = ref(false)

// 編輯目標
const editingTextId = ref<string | null>(null)

// 內聯編輯分類狀態
const editingCategoryId = ref<string | null>(null)
const editingCategoryName = ref('')
const isAddingCategory = ref(false)
const newCategoryName = ref('')
const confirmTarget = ref<{ type: 'text' | 'category'; item: PracticeText | PracticeCategory } | null>(null)

// 反饋訊息
const feedback = ref<string | null>(null)

// 文章表單
const textForm = reactive({
  title: '',
  author: '',
  source: '',
  summary: '',
  content: '',
  practice_category_ids: [] as string[],  // 多選分類
})

// 計算屬性 - 根據頁面模式過濾分類
const gradeOptions = computed(() => {
  return libraryStore.state.categories
    .filter((c) => {
      // 必須是頂級分類（level 1）
      if (c.level !== 1) return false
      
      if (isAdminMode.value) {
        // 系統文庫模式：只顯示系統分類
        return c.is_system === true
      } else {
        // 自訂練習模式：只顯示自己創建的私有分類
        return c.is_system === false && c.created_by === authStore.user?.id
      }
    })
    .sort((a, b) => a.order_index - b.order_index)
})

const selectedCategory = computed(() =>
  libraryStore.state.categories.find((c) => c.id === selectedCategoryId.value) ?? null
)

const breadcrumb = computed(() => {
  if (!selectedCategory.value) return []
  const parts: PracticeCategory[] = []
  let current: PracticeCategory | undefined = selectedCategory.value
  while (current) {
    parts.unshift(current)
    current = libraryStore.state.categories.find((c) => c.id === current?.parent_id)
  }
  return parts
})

const textsInCategory = computed(() => {
  if (!selectedCategoryId.value) return []
  
  // 過濾屬於當前分類的文章（支持多選分類）
  let filtered = textsStore.texts.filter((t) => {
    // 檢查是否屬於當前分類（支持多選分類）
    const hasCategory = t.practice_categories?.some(c => c.id === selectedCategoryId.value) ||
      t.category_id === selectedCategoryId.value  // 向後兼容：單一分類
    return hasCategory
  })
  
  // 根據頁面模式過濾：
  if (isAdminMode.value) {
    // 系統文庫模式：只顯示系統文章
    filtered = filtered.filter(t => t.is_system === true)
  } else {
    // 自訂練習模式：只顯示自己創建的私有文章
    filtered = filtered.filter(t => 
      t.is_system === false && t.created_by === authStore.user?.id
    )
  }
  
  return filtered.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
})

// 模擬儲存時的內容處理：標點轉斷句符號
const previewContent = computed(() => {
  if (!textForm.content) return ''
  
  // 移除引號
  let processed = textForm.content.replace(/[「」『』"""'']/g, '')
  
  // 將標點轉為斷句符號
  processed = processed.replace(/[。！？；，：、]/g, '|')
  
  // 合併連續的斷句符號
  processed = processed.replace(/\|{2,}/g, '|')
  
  // 移除開頭和結尾的斷句符號
  processed = processed.replace(/^\|+|\|+$/g, '')
  
  // 高亮顯示斷句符號
  return processed
    .replace(/\|/g, '<span class="preview-break">｜</span>')
    .replace(/\n/g, '<br />')
})

function getTextCountForCategory(categoryId: string) {
  // 根據頁面模式過濾統計（支持多選分類）
  const filterByMode = (t: PracticeText) => {
    if (isAdminMode.value) {
      return t.is_system === true
    } else {
      return t.is_system === false && t.created_by === authStore.user?.id
    }
  }
  
  return textsStore.texts.filter((t) => {
    // 檢查是否屬於當前分類（支持多選分類）
    const hasCategory = t.practice_categories?.some(c => c.id === categoryId) ||
      t.category_id === categoryId  // 向後兼容：單一分類
    return hasCategory && filterByMode(t)
  }).length
}

function selectCategory(categoryId: string) {
  selectedCategoryId.value = categoryId
}

// 文章操作
function openCreateText() {
  editingTextId.value = null
  textForm.title = ''
  textForm.author = ''
  textForm.source = ''
  textForm.summary = ''
  textForm.content = ''
  textForm.practice_category_ids = []
  // 如果當前選中了分類，自動添加到表單
  if (selectedCategoryId.value) {
    textForm.practice_category_ids = [selectedCategoryId.value]
  }
  feedback.value = null
  isTextFormOpen.value = true
}

function openEditText(text: PracticeText) {
  editingTextId.value = text.id
  textForm.title = text.title
  textForm.author = text.author ?? ''
  textForm.source = text.source ?? ''
  textForm.summary = text.summary ?? ''
  textForm.content = text.content
  // 獲取現有分類 IDs（多選分類優先，否則使用單一分類）
  textForm.practice_category_ids = text.practice_categories?.map(c => c.id) || 
    (text.category_id ? [text.category_id] : [])
  feedback.value = null
  isTextFormOpen.value = true
}

async function handleTextSubmit() {
  if (!textForm.title || !textForm.content) {
    feedback.value = '標題與內容為必填'
    return
  }
  // 檢查是否選擇了分類（必填）
  if (!textForm.practice_category_ids || textForm.practice_category_ids.length === 0) {
    feedback.value = '請至少選擇一個分類'
    return
  }

  try {
    isSubmitting.value = true
    const payload = {
      title: textForm.title,
      author: textForm.author || null,
      source: textForm.source || null,
      summary: textForm.summary || null,
      category_id: textForm.practice_category_ids[0] || null,  // 向後兼容：使用第一個分類作為主分類
      practice_category_ids: textForm.practice_category_ids,  // 多選分類
      content: textForm.content,
    }

    if (editingTextId.value) {
      await textsStore.updateText(editingTextId.value, payload)
    } else {
      // 根據頁面模式決定創建系統文章還是私有文章
      await textsStore.addText(payload, isAdminMode.value)
    }
    await textsStore.fetchTexts() // 重新獲取文章列表
    isTextFormOpen.value = false
  } catch (error: any) {
    feedback.value = error?.message ?? '儲存失敗'
  } finally {
    isSubmitting.value = false
  }
}

// 分類操作 - 內聯編輯
function startEditCategory(category: PracticeCategory) {
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

function cancelEditCategory() {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

async function submitEditCategory() {
  if (!editingCategoryId.value || !editingCategoryName.value.trim()) {
    cancelEditCategory()
    return
  }
  
  try {
    await libraryStore.updateCategory(editingCategoryId.value, {
      name: editingCategoryName.value.trim(),
    })
    cancelEditCategory()
  } catch (error: any) {
    alert(error?.message ?? '更新失敗')
  }
}

// 新增分類
function startAddCategory() {
  isAddingCategory.value = true
  newCategoryName.value = ''
}

function cancelAddCategory() {
  isAddingCategory.value = false
  newCategoryName.value = ''
}

// 切換分類選擇狀態（用於表單中的多選分類）
function togglePracticeCategory(categoryId: string) {
  const index = textForm.practice_category_ids.indexOf(categoryId)
  if (index > -1) {
    textForm.practice_category_ids.splice(index, 1)
  } else {
    textForm.practice_category_ids.push(categoryId)
  }
}

// 新增分類並自動選中（用於表單中）
async function handleAddCategoryInForm() {
  if (!newCategoryName.value.trim()) {
    return
  }
  
  try {
    const newCategory = await libraryStore.addCategory({
      name: newCategoryName.value.trim(),
      parent_id: null,
      type: 'grade',
      is_system: isAdminMode.value,
    }, authStore.user?.id)
    
    if (newCategory) {
      // 自動選中新創建的分類
      textForm.practice_category_ids.push(newCategory.id)
    }
    newCategoryName.value = ''
    isAddingCategory.value = false
  } catch (error: any) {
    alert(error?.message ?? '新增分類失敗')
  }
}

async function submitAddCategory() {
  if (!newCategoryName.value.trim()) {
    cancelAddCategory()
    return
  }
  
  try {
    await libraryStore.addCategory({
      name: newCategoryName.value.trim(),
      parent_id: null,
      type: 'grade',
      is_system: isAdminMode.value,
    }, authStore.user?.id)
    cancelAddCategory()
  } catch (error: any) {
    alert(error?.message ?? '新增失敗')
  }
}

// 刪除操作
function openDeleteConfirm(type: 'text' | 'category', item: PracticeText | PracticeCategory) {
  confirmTarget.value = { type, item }
  feedback.value = null
  isConfirmOpen.value = true
}

async function handleDelete() {
  if (!confirmTarget.value) return
  try {
    isSubmitting.value = true
    if (confirmTarget.value.type === 'text') {
      await textsStore.deleteText(confirmTarget.value.item.id)
      await textsStore.fetchTexts() // 重新獲取文章列表
    } else {
      await libraryStore.deleteCategory(confirmTarget.value.item.id)
      if (selectedCategoryId.value === confirmTarget.value.item.id) {
        selectedCategoryId.value = null
      }
    }
    isConfirmOpen.value = false
    confirmTarget.value = null
  } catch (error: any) {
    feedback.value = error?.message ?? '刪除失敗'
  } finally {
    isSubmitting.value = false
  }
}

function formatDifficulty(value: number | null) {
  if (!value) return '未標註'
  if (value === 1) return '初級'
  if (value === 2) return '中級'
  return '高級'
}

function formatTimestamp(value?: string) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString()
}

// 初始化
onMounted(async () => {
  if (!libraryStore.state.categories.length) {
    await libraryStore.fetchLibrary()
  }
  if (!textsStore.texts.length) {
    await textsStore.fetchTexts()
  }
  // 預設選中第一個年級
  if (gradeOptions.value.length > 0 && !selectedCategoryId.value) {
    const firstGrade = gradeOptions.value[0]
    if (firstGrade) {
      selectedCategoryId.value = firstGrade.id
    }
  }
})
</script>

<template>
  <div class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="edamame-text-level-detail">
          {{ pageSubtitle }}
        </p>
        <h1 class="edamame-heading-gradient">
          {{ pageTitle }}
        </h1>
      </div>
      <div class="header-actions">
        <button
          class="edamame-btn edamame-btn-secondary"
          @click="libraryStore.fetchLibrary(); textsStore.fetchTexts()"
          :disabled="libraryStore.isLoading || textsStore.isLoading"
        >
          重新整理
        </button>
        <button
          class="edamame-btn edamame-btn-primary"
          @click="openCreateText"
          :disabled="!selectedCategory"
        >
          新增練習
        </button>
      </div>
    </header>

    <div class="admin-layout">
      <!-- 左側：分類樹 -->
      <aside class="category-sidebar edamame-glass">
        <div class="sidebar-header">
          <span class="sidebar-title">分類導航</span>
          <button class="icon-btn" @click="startAddCategory" title="新增年級">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div v-if="libraryStore.isLoading" class="sidebar-loading">載入中⋯</div>
        <div v-else-if="!gradeOptions.length && !isAddingCategory" class="sidebar-empty">
          尚無分類
          <button class="link-btn" @click="startAddCategory">建立第一個年級</button>
        </div>

        <nav v-else class="category-tree">
          <div v-for="grade in gradeOptions" :key="grade.id" class="tree-node">
            <!-- 編輯模式 -->
            <div v-if="editingCategoryId === grade.id" class="tree-item editing">
              <input
                v-model="editingCategoryName"
                type="text"
                class="edit-input"
                @keyup.enter="submitEditCategory"
                @keyup.escape="cancelEditCategory"
              />
              <div class="edit-actions">
                <button class="action-btn" @click="submitEditCategory" title="確認">✓</button>
                <button class="action-btn" @click="cancelEditCategory" title="取消">×</button>
              </div>
            </div>
            <!-- 顯示模式 -->
            <div
              v-else
              class="tree-item grade-item"
              :class="{ selected: selectedCategoryId === grade.id }"
              @click="selectCategory(grade.id)"
            >
              <span class="tree-label">{{ grade.name }}</span>
              <span class="tree-count">{{ getTextCountForCategory(grade.id) }}</span>
              <div class="tree-actions">
                <button class="action-btn" @click.stop="startEditCategory(grade)" title="編輯">✎</button>
                <button class="action-btn danger" @click.stop="openDeleteConfirm('category', grade)" title="刪除">×</button>
              </div>
            </div>
          </div>

          <!-- 新增分類內嵌表單 -->
          <div v-if="isAddingCategory" class="add-category-inline">
            <input
              v-model="newCategoryName"
              type="text"
              placeholder="輸入年級名稱..."
              class="category-input"
              @keyup.enter="submitAddCategory"
              @keyup.escape="cancelAddCategory"
            />
            <div class="add-category-actions">
              <button class="action-btn" @click="submitAddCategory" title="確認">✓</button>
              <button class="action-btn" @click="cancelAddCategory" title="取消">×</button>
            </div>
          </div>
        </nav>
      </aside>

      <!-- 右側：文章列表 -->
      <main class="content-panel edamame-glass">
        <div v-if="!selectedCategory" class="content-empty">
          <p>請從左側選擇一個分類</p>
        </div>

        <template v-else>
          <!-- 麵包屑 -->
          <div class="content-breadcrumb">
            <span
              v-for="(crumb, index) in breadcrumb"
              :key="crumb.id"
              class="breadcrumb-item"
              :class="{ active: index === breadcrumb.length - 1 }"
              @click="selectCategory(crumb.id)"
            >
              {{ crumb.name }}
              <span v-if="index < breadcrumb.length - 1" class="breadcrumb-sep">›</span>
            </span>
          </div>

          <!-- 分類資訊 -->
          <div class="category-info">
            <h2>{{ selectedCategory.name }}</h2>
            <p v-if="selectedCategory.description" class="category-desc">{{ selectedCategory.description }}</p>
            <p class="category-meta">
              {{ textsInCategory.length }} 篇文章
            </p>
          </div>

          <!-- 文章列表 -->
          <div class="text-list">
            <div v-if="!textsInCategory.length" class="text-empty">
              <p>此年級尚無文章</p>
              <button class="edamame-btn edamame-btn-primary" @click="openCreateText">新增第一篇文章</button>
            </div>

            <table v-else>
              <thead>
                <tr>
                  <th style="width: auto; min-width: 200px">標題</th>
                  <th style="width: 80px">作者</th>
                  <th style="width: 60px">難度</th>
                  <th style="width: 100px">建立日期</th>
                  <th style="width: 120px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="text in textsInCategory" :key="text.id">
                  <td>
                    <p class="text-title">
                      {{ text.title }}
                      <span v-if="text.is_system" class="text-type-badge system">系統</span>
                      <span v-else class="text-type-badge private">私有</span>
                    </p>
                    <p class="text-summary">{{ text.summary || text.content.replace(/\|/g, '').slice(0, 40) + '...' }}</p>
                  </td>
                  <td>{{ text.author || '佚名' }}</td>
                  <td>
                    <span class="difficulty-badge" :class="`diff-${text.difficulty}`">
                      {{ formatDifficulty(text.difficulty) }}
                    </span>
                  </td>
                  <td>{{ formatTimestamp(text.created_at) }}</td>
                  <td class="actions">
                    <button class="ghost-btn" @click="openEditText(text)">編輯</button>
                    <button class="ghost-btn danger" @click="openDeleteConfirm('text', text)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>

            <button class="add-text-btn" @click="openCreateText">
              + 在「{{ selectedCategory.name }}」新增文章
            </button>
          </div>
        </template>
      </main>
    </div>

    <!-- 文章表單 Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isTextFormOpen" class="modal-backdrop" @click.self="isTextFormOpen = false">
          <div class="modal-card edamame-glass">
          <header>
            <h3>{{ editingTextId ? '編輯文章' : '新增文章' }}</h3>
            <button class="close-btn" @click="isTextFormOpen = false">×</button>
          </header>
          <div class="modal-body">
            <label>
              <span>標題</span>
              <input v-model="textForm.title" type="text" placeholder="請輸入標題" />
            </label>
            <div class="form-row">
              <label>
                <span>作者</span>
                <input v-model="textForm.author" type="text" placeholder="例如：孔子" />
              </label>
              <label>
                <span>來源</span>
                <input v-model="textForm.source" type="text" placeholder="例如：論語" />
              </label>
            </div>
            
            <!-- 分類選擇 -->
            <label>
              <span>分類（點擊選擇）*</span>
              <div class="category-picker">
                <!-- 所有分類標籤 -->
                <button 
                  v-for="cat in gradeOptions" 
                  :key="cat.id"
                  type="button"
                  class="category-tag-btn"
                  :class="{ selected: textForm.practice_category_ids.includes(cat.id) }"
                  @click="togglePracticeCategory(cat.id)"
                >
                  <span class="tag-check" v-if="textForm.practice_category_ids.includes(cat.id)">✓</span>
                  {{ cat.name }}
                </button>
                
                <!-- 新增分類按鈕 / 輸入框 -->
                <div v-if="isAddingCategory" class="new-category-inline">
                  <input 
                    v-model="newCategoryName" 
                    type="text" 
                    class="new-category-input-inline"
                    @keyup.enter="handleAddCategoryInForm"
                    @keyup.escape="isAddingCategory = false; newCategoryName = ''"
                  />
                  <button type="button" class="inline-action confirm" @click="handleAddCategoryInForm">✓</button>
                  <button type="button" class="inline-action cancel" @click="isAddingCategory = false; newCategoryName = ''">×</button>
                </div>
                <button 
                  v-else
                  type="button"
                  class="category-tag-btn add-new"
                  @click="isAddingCategory = true; newCategoryName = ''"
                >
                  + 新增分類
                </button>
              </div>
            </label>
            
            <label>
              <span>內容（標點將自動轉為斷句符號）</span>
              <textarea v-model="textForm.content" rows="6" placeholder="貼上原文或手動輸入"></textarea>
            </label>
            <div class="preview-panel">
              <p>預覽</p>
              <div class="preview-content" v-html="previewContent || '尚無內容'"></div>
            </div>
            <p v-if="feedback" class="feedback">{{ feedback }}</p>
          </div>
          <footer>
            <button class="edamame-btn edamame-btn-secondary" @click="isTextFormOpen = false">取消</button>
            <button class="edamame-btn edamame-btn-primary" :disabled="isSubmitting" @click="handleTextSubmit">
              {{ isSubmitting ? '儲存中...' : '儲存' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>

    <!-- 分類表單 Modal -->
    <!-- 刪除確認 Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isConfirmOpen" class="modal-backdrop" @click.self="isConfirmOpen = false">
          <div class="modal-card edamame-glass small-modal">
            <h3>確定刪除？</h3>
            <p>「{{ confirmTarget?.item ? ('title' in confirmTarget.item ? confirmTarget.item.title : (confirmTarget.item as PracticeCategory).name) : '' }}」刪除後將無法復原。</p>
            <p v-if="feedback" class="feedback">{{ feedback }}</p>
            <div class="confirm-actions">
              <button class="edamame-btn edamame-btn-secondary" @click="isConfirmOpen = false">取消</button>
              <button class="edamame-btn edamame-btn-danger" :disabled="isSubmitting" @click="handleDelete">
                {{ isSubmitting ? '刪除中...' : '刪除' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Modal 樣式需要放在全局，因為使用了 Teleport */
</style>

<style>
/* Modal 全局樣式 - 因為 Teleport 到 body */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(58, 80, 32, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  width: min(680px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-xl, 16px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.modal-card.small-modal {
  width: min(420px, calc(100vw - 2rem));
}

.modal-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-card header h3 {
  margin: 0;
  font-size: var(--text-lg, 18px);
  font-weight: var(--font-semibold, 600);
}

.modal-card .close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  color: var(--color-neutral-500, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.modal-card .close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.modal-card .modal-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-card .form-context {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: var(--color-primary-50, #f0fdf4);
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-sm, 14px);
  color: var(--color-primary-700, #15803d);
}

.modal-card .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.modal-card label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.modal-card label span {
  font-size: var(--text-sm, 14px);
  font-weight: var(--font-medium, 500);
  color: var(--color-neutral-700, #374151);
}

.modal-card input,
.modal-card textarea {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: var(--radius-md, 8px);
  padding: 0.6rem 0.75rem;
  font-size: var(--text-sm, 14px);
  font-family: inherit;
  background: rgba(255, 255, 255, 0.8);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.modal-card input:focus,
.modal-card textarea:focus {
  outline: none;
  border-color: var(--color-primary-400, #4ade80);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
}

.modal-card .preview-panel {
  border: 1px dashed rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md, 8px);
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.5);
}

.modal-card .preview-panel > p {
  margin: 0 0 0.5rem;
  font-size: var(--text-xs, 12px);
  color: var(--color-neutral-500, #6b7280);
  text-transform: uppercase;
}

.modal-card .preview-content {
  font-size: var(--text-sm, 14px);
  line-height: 1.8;
  color: var(--color-neutral-700, #374151);
}

.modal-card .preview-break {
  color: var(--color-primary-600, #16a34a);
  font-weight: var(--font-semibold, 600);
}

.modal-card .feedback {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-md, 8px);
  color: var(--color-error, #dc2626);
  font-size: var(--text-sm, 14px);
}

.modal-card footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-card .confirm-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* Modal 動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-card .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.admin-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: calc(100vh - 4rem);
}

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* 主佈局 */
.admin-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

/* 左側分類樹 */
.category-sidebar {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar-title {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-600);
  transition: all var(--duration-base) ease;
}

.icon-btn:hover {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.sidebar-loading,
.sidebar-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-neutral-500);
  font-size: var(--text-sm);
}

.link-btn {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-primary-600);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
}

.link-btn:hover {
  text-decoration: underline;
}

.category-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.tree-node {
  margin-bottom: 0.25rem;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-base) ease;
  position: relative;
}

.tree-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.tree-item.selected {
  background: var(--color-primary-100);
  color: var(--color-primary-800);
}

.tree-label {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-count {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  background: rgba(0, 0, 0, 0.04);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
}

.tree-actions {
  display: none;
  gap: 0.25rem;
}

.tree-item:hover .tree-actions {
  display: flex;
}

.tree-item:hover .tree-count {
  display: none;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  color: var(--color-neutral-600);
  transition: all var(--duration-base) ease;
}

.action-btn:hover {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
}

/* 內聯編輯模式 */
.tree-item.editing {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-md);
}

.edit-input {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-primary-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: white;
}

.edit-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px rgba(139, 178, 79, 0.2);
}

.edit-actions {
  display: flex;
  gap: 0.25rem;
}

/* 新增分類內嵌表單 */
.add-category-inline {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-md);
}

.category-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.category-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
}

.add-category-actions {
  display: flex;
  gap: 0.25rem;
}

/* 右側內容面板 */
.content-panel {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow-y: auto;
}

.content-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
}

.content-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
  font-size: var(--text-sm);
}

.breadcrumb-item {
  color: var(--color-neutral-500);
  cursor: pointer;
  transition: color var(--duration-base) ease;
}

.breadcrumb-item:hover {
  color: var(--color-primary-600);
}

.breadcrumb-item.active {
  color: var(--color-neutral-800);
  font-weight: var(--font-medium);
}

.breadcrumb-sep {
  color: var(--color-neutral-300);
  margin: 0 0.25rem;
}

.category-info {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.category-info h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.category-desc {
  margin: 0.5rem 0 0;
  color: var(--color-neutral-600);
  font-size: var(--text-sm);
}

.category-meta {
  margin: 0.25rem 0 0;
  color: var(--color-neutral-400);
  font-size: var(--text-xs);
}

.add-icon {
  font-size: 24px;
  line-height: 1;
}

/* 文章列表 */
.text-list {
  flex: 1;
}

.text-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-neutral-500);
}

.text-empty p {
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-spacing: 0;
}

thead {
  text-align: left;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

th, td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

/* 作者欄和難度欄固定寬度，防止換行 */
td:nth-child(2) {
  width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

td:nth-child(3) {
  width: 60px;
  white-space: nowrap;
}

.text-title {
  margin: 0;
  font-weight: var(--font-medium);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.text-type-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.text-type-badge.system {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
}

.text-type-badge.private {
  background: rgba(168, 85, 247, 0.15);
  color: #6b21a8;
}

.text-summary {
  margin: 0.2rem 0 0;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

/* 分類選擇器樣式（參考閱讀文庫） */
.category-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(248, 250, 252, 0.6);
  border-radius: var(--radius-md);
  border: 1px solid rgba(0, 0, 0, 0.06);
  min-height: 2.5rem;
}

.category-tag-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.75rem;
  padding: 0 0.65rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 1rem;
  background: white;
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.category-tag-btn:hover {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.category-tag-btn.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-500);
  color: white;
}

.category-tag-btn.selected:hover {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

.tag-check {
  font-size: 0.65rem;
}

.category-tag-btn.add-new {
  border-style: dashed;
  border-color: var(--color-primary-300);
  background: transparent;
  color: var(--color-primary-500);
}

.category-tag-btn.add-new:hover {
  border-style: solid;
  background: var(--color-primary-50);
}

/* 新增分類內聯輸入 - 與標籤同高 */
.new-category-inline {
  display: inline-flex;
  align-items: center;
  height: 1.75rem;
  background: white;
  border: 1px solid var(--color-primary-400);
  border-radius: 1rem;
  padding: 0 0.25rem 0 0.5rem;
  gap: 0.15rem;
}

.new-category-input-inline {
  border: none;
  outline: none;
  font-size: var(--text-xs);
  width: 5rem;
  background: transparent;
  height: 100%;
}

.inline-action {
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.inline-action.confirm {
  background: var(--color-primary-500);
  color: white;
}

.inline-action.confirm:hover {
  background: var(--color-primary-600);
}

.inline-action.cancel {
  background: var(--color-neutral-300);
  color: var(--color-neutral-700);
}

.inline-action.cancel:hover {
  background: var(--color-neutral-400);
}

.difficulty-badge {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  /* 移除背景色和圓角 */
}

.diff-1 {
  color: #15803d;
}

.diff-2 {
  color: #a16207;
}

.diff-3 {
  color: #b91c1c;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.ghost-btn {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-full);
  padding: 0.25rem 0.6rem;
  background: transparent;
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--duration-base) ease;
}

.ghost-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.ghost-btn.danger {
  color: var(--color-error);
}

.ghost-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.add-text-btn {
  display: block;
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px dashed var(--color-neutral-300);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-neutral-500);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--duration-base) ease;
}

.add-text-btn:hover {
  border-color: var(--color-primary-400);
  color: var(--color-primary-600);
  background: var(--color-primary-50);
}

/* 響應式 */
@media (max-width: 768px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .category-sidebar {
    max-height: 300px;
  }
}
</style>
