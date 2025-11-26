<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useReadingStore } from '@/stores/readingStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAuthStore } from '@/stores/authStore'
import type { ReadingText, TextType } from '@/types/text'

const readingStore = useReadingStore()
const libraryStore = usePracticeLibraryStore()
const authStore = useAuthStore()

// 表單狀態
const isFormOpen = ref(false)
const isExtractOpen = ref(false)
const isSubmitting = ref(false)
const feedback = ref<string | null>(null)

// 當前編輯的文章
const editingText = ref<ReadingText | null>(null)

// 文章表單
const textForm = reactive({
  title: '',
  author: '',
  source: '',
  summary: '',
  content: '',
  text_type: 'reading' as TextType,
  category_id: null as string | null,
})

// 片段提取表單
const extractForm = reactive({
  selectedText: '',
  startIndex: 0,
  endIndex: 0,
  title: '',
  category_id: null as string | null,
  difficulty: 2,
})

// 分類選項（模組級別）
const categoryOptions = computed(() => {
  const modules: { id: string; name: string; gradeName: string }[] = []
  
  libraryStore.state.categories
    .filter(c => c.level === 1)
    .forEach(grade => {
      libraryStore.state.categories
        .filter(c => c.level === 2 && c.parent_id === grade.id)
        .forEach(module => {
          modules.push({
            id: module.id,
            name: module.name,
            gradeName: grade.name
          })
        })
    })
  
  return modules
})

// 打開新增表單
function openCreateForm() {
  editingText.value = null
  textForm.title = ''
  textForm.author = ''
  textForm.source = ''
  textForm.summary = ''
  textForm.content = ''
  textForm.text_type = 'reading'
  textForm.category_id = null
  feedback.value = null
  isFormOpen.value = true
}

// 打開編輯表單
function openEditForm(text: ReadingText) {
  editingText.value = text
  textForm.title = text.title
  textForm.author = text.author || ''
  textForm.source = text.source || ''
  textForm.summary = text.summary || ''
  textForm.content = text.content
  textForm.text_type = text.text_type || 'reading'
  textForm.category_id = text.category_id || null
  feedback.value = null
  isFormOpen.value = true
}

// 提交文章表單
async function handleFormSubmit() {
  if (!textForm.title.trim() || !textForm.content.trim()) {
    feedback.value = '標題和內容為必填'
    return
  }
  
  try {
    isSubmitting.value = true
    
    if (editingText.value) {
      // 更新（這裡需要擴展 readingStore）
      // 暫時跳過更新功能
      feedback.value = '更新功能開發中'
    } else {
      await readingStore.createReadingText({
        title: textForm.title.trim(),
        author: textForm.author.trim() || null,
        source: textForm.source.trim() || null,
        summary: textForm.summary.trim() || null,
        content: textForm.content,
        text_type: textForm.text_type,
        category_id: textForm.category_id,
      }, authStore.isAdmin)
      
      isFormOpen.value = false
    }
  } catch (err: any) {
    feedback.value = err?.message || '儲存失敗'
  } finally {
    isSubmitting.value = false
  }
}

// 處理文章內容中的文字選取
function handleTextSelection() {
  if (!editingText.value) return
  
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return
  
  const selectedText = selection.toString().trim()
  if (!selectedText) return
  
  // 計算選取範圍在純文字中的位置
  const content = editingText.value.content.replace(/\|/g, '')
  const startIdx = content.indexOf(selectedText)
  
  if (startIdx >= 0) {
    extractForm.selectedText = selectedText
    extractForm.startIndex = startIdx
    extractForm.endIndex = startIdx + selectedText.length
    extractForm.title = `${editingText.value.title}（節選）`
    extractForm.category_id = editingText.value.category_id || null
    extractForm.difficulty = 2
    isExtractOpen.value = true
  }
}

// 提取為練習素材
async function handleExtract() {
  if (!editingText.value || !extractForm.selectedText) {
    feedback.value = '請選取要提取的文字'
    return
  }
  
  if (!extractForm.title.trim()) {
    feedback.value = '請輸入標題'
    return
  }
  
  try {
    isSubmitting.value = true
    
    // 將選取的文字轉換為帶斷句的格式
    // 這裡簡單處理：保留原文中的斷句符號
    const originalContent = editingText.value.content
    const pureContent = originalContent.replace(/\|/g, '')
    
    // 找到選取範圍對應的原始內容（包含斷句符號）
    let fragmentContent = ''
    let pureIdx = 0
    
    for (let i = 0; i < originalContent.length; i++) {
      const char = originalContent[i]
      if (char === '|') {
        if (pureIdx > extractForm.startIndex && pureIdx <= extractForm.endIndex) {
          fragmentContent += char
        }
      } else {
        if (pureIdx >= extractForm.startIndex && pureIdx < extractForm.endIndex) {
          fragmentContent += char
        }
        pureIdx++
      }
    }
    
    await readingStore.extractPracticeFragment(
      editingText.value.id,
      extractForm.startIndex,
      extractForm.endIndex,
      fragmentContent,
      {
        title: extractForm.title.trim(),
        category_id: extractForm.category_id,
        difficulty: extractForm.difficulty,
      }
    )
    
    isExtractOpen.value = false
    alert('練習素材提取成功！')
    
  } catch (err: any) {
    feedback.value = err?.message || '提取失敗'
  } finally {
    isSubmitting.value = false
  }
}

// 獲取內容預覽（移除斷句符號）
function getPreview(text: ReadingText) {
  const content = text.content.replace(/\|/g, '')
  return content.length > 80 ? content.slice(0, 80) + '...' : content
}

// 格式化日期
function formatDate(dateStr?: string) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString()
}

onMounted(async () => {
  if (!libraryStore.state.categories.length) {
    await libraryStore.fetchLibrary()
  }
  await readingStore.fetchReadingTexts()
})
</script>

<template>
  <div class="admin-reading-page">
    <header class="page-header">
      <div>
        <p class="page-subtitle">管理閱讀文章和提取練習片段</p>
        <h1 class="page-title">📚 閱讀文庫管理</h1>
      </div>
      <div class="header-actions">
        <button 
          class="edamame-btn edamame-btn-secondary"
          @click="readingStore.fetchReadingTexts()"
          :disabled="readingStore.isLoading"
        >
          重新整理
        </button>
        <button 
          class="edamame-btn edamame-btn-primary"
          @click="openCreateForm"
        >
          新增閱讀文章
        </button>
      </div>
    </header>
    
    <!-- 文章列表 -->
    <section class="text-list edamame-glass">
      <div v-if="readingStore.isLoading" class="loading-state">
        載入中...
      </div>
      
      <div v-else-if="readingStore.readingTexts.length === 0" class="empty-state">
        <p>尚無閱讀文章</p>
        <button class="edamame-btn edamame-btn-primary" @click="openCreateForm">
          新增第一篇文章
        </button>
      </div>
      
      <table v-else>
        <thead>
          <tr>
            <th>標題</th>
            <th>作者</th>
            <th>類型</th>
            <th>字數</th>
            <th>建立日期</th>
            <th style="width: 180px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="text in readingStore.readingTexts" :key="text.id">
            <td>
              <p class="text-title">{{ text.title }}</p>
              <p class="text-preview">{{ getPreview(text) }}</p>
            </td>
            <td>{{ text.author || '佚名' }}</td>
            <td>
              <span class="type-badge" :class="text.text_type">
                {{ text.text_type === 'reading' ? '閱讀' : text.text_type === 'both' ? '通用' : '練習' }}
              </span>
            </td>
            <td>{{ text.word_count || '?' }}</td>
            <td>{{ formatDate(text.created_at) }}</td>
            <td class="actions">
              <button class="ghost-btn" @click="openEditForm(text)">
                編輯
              </button>
              <button 
                class="ghost-btn extract"
                @click="openEditForm(text)"
                title="在編輯頁面選取文字後可提取為練習素材"
              >
                提取片段
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    
    <!-- 文章表單 Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isFormOpen" class="modal-backdrop" @click.self="isFormOpen = false">
          <div class="modal-card edamame-glass large-modal">
            <header>
              <h3>{{ editingText ? '編輯閱讀文章' : '新增閱讀文章' }}</h3>
              <button class="close-btn" @click="isFormOpen = false">×</button>
            </header>
            
            <div class="modal-body">
              <div class="form-row">
                <label class="flex-2">
                  <span>標題 *</span>
                  <input v-model="textForm.title" type="text" placeholder="文章標題" />
                </label>
                <label>
                  <span>類型</span>
                  <select v-model="textForm.text_type">
                    <option value="reading">僅閱讀</option>
                    <option value="both">閱讀+練習</option>
                  </select>
                </label>
              </div>
              
              <div class="form-row">
                <label>
                  <span>作者</span>
                  <input v-model="textForm.author" type="text" placeholder="例如：陶淵明" />
                </label>
                <label>
                  <span>來源</span>
                  <input v-model="textForm.source" type="text" placeholder="例如：古文觀止" />
                </label>
                <label>
                  <span>分類</span>
                  <select v-model="textForm.category_id">
                    <option :value="null">不分類</option>
                    <option 
                      v-for="cat in categoryOptions" 
                      :key="cat.id" 
                      :value="cat.id"
                    >
                      {{ cat.gradeName }} - {{ cat.name }}
                    </option>
                  </select>
                </label>
              </div>
              
              <label>
                <span>內容（用 | 標記斷句位置）</span>
                <textarea 
                  v-model="textForm.content" 
                  rows="10" 
                  placeholder="貼上帶斷句標記的原文，例如：晉太原中|武陵人捕魚為業|緣溪行|忘路之遠近|..."
                  @mouseup="editingText && handleTextSelection()"
                ></textarea>
              </label>
              
              <div v-if="editingText" class="extract-hint">
                💡 提示：選取上方內容中的一段文字，即可提取為練習素材
              </div>
              
              <p v-if="feedback" class="feedback">{{ feedback }}</p>
            </div>
            
            <footer>
              <button class="edamame-btn edamame-btn-secondary" @click="isFormOpen = false">
                取消
              </button>
              <button 
                class="edamame-btn edamame-btn-primary" 
                :disabled="isSubmitting"
                @click="handleFormSubmit"
              >
                {{ isSubmitting ? '儲存中...' : '儲存' }}
              </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
    
    <!-- 片段提取 Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isExtractOpen" class="modal-backdrop" @click.self="isExtractOpen = false">
          <div class="modal-card edamame-glass">
            <header>
              <h3>📤 提取為練習素材</h3>
              <button class="close-btn" @click="isExtractOpen = false">×</button>
            </header>
            
            <div class="modal-body">
              <div class="selected-preview">
                <p class="preview-label">選取的片段：</p>
                <p class="preview-content">{{ extractForm.selectedText }}</p>
                <p class="preview-info">
                  位置：第 {{ extractForm.startIndex + 1 }} - {{ extractForm.endIndex }} 字
                </p>
              </div>
              
              <label>
                <span>練習標題 *</span>
                <input v-model="extractForm.title" type="text" placeholder="例如：桃花源記（節選一）" />
              </label>
              
              <div class="form-row">
                <label>
                  <span>分類</span>
                  <select v-model="extractForm.category_id">
                    <option :value="null">不分類</option>
                    <option 
                      v-for="cat in categoryOptions" 
                      :key="cat.id" 
                      :value="cat.id"
                    >
                      {{ cat.gradeName }} - {{ cat.name }}
                    </option>
                  </select>
                </label>
                <label>
                  <span>難度</span>
                  <select v-model="extractForm.difficulty">
                    <option :value="1">初級</option>
                    <option :value="2">中級</option>
                    <option :value="3">高級</option>
                  </select>
                </label>
              </div>
              
              <p class="extract-note">
                提取後的練習素材將關聯到原文章，學生練習時可以看到「來自《{{ editingText?.title }}》」
              </p>
              
              <p v-if="feedback" class="feedback">{{ feedback }}</p>
            </div>
            
            <footer>
              <button class="edamame-btn edamame-btn-secondary" @click="isExtractOpen = false">
                取消
              </button>
              <button 
                class="edamame-btn edamame-btn-primary" 
                :disabled="isSubmitting"
                @click="handleExtract"
              >
                {{ isSubmitting ? '提取中...' : '確認提取' }}
              </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-reading-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.page-title {
  margin: 0.25rem 0 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* 文章列表 */
.text-list {
  padding: 1.5rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-neutral-500);
}

.empty-state button {
  margin-top: 1rem;
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

.text-title {
  margin: 0;
  font-weight: var(--font-medium);
}

.text-preview {
  margin: 0.25rem 0 0;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

.type-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.type-badge.reading {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
}

.type-badge.both {
  background: rgba(139, 178, 79, 0.15);
  color: #3d7c47;
}

.type-badge.practice {
  background: rgba(168, 85, 247, 0.15);
  color: #6b21a8;
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
  transition: all 0.2s ease;
}

.ghost-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.ghost-btn.extract {
  color: var(--color-primary-600);
}

.ghost-btn.extract:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

/* Modal */
.large-modal {
  width: min(800px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.flex-2 {
  grid-column: span 2;
}

.extract-hint {
  padding: 0.75rem;
  background: rgba(139, 178, 79, 0.1);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-primary-700);
}

.selected-preview {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.preview-label {
  margin: 0 0 0.5rem;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  text-transform: uppercase;
}

.preview-content {
  margin: 0;
  font-family: var(--font-main, 'Noto Serif TC', serif);
  font-size: var(--text-lg);
  color: var(--color-neutral-800);
  line-height: 1.8;
}

.preview-info {
  margin: 0.5rem 0 0;
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

.extract-note {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.08);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: #1e40af;
}

.feedback {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: var(--text-sm);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .flex-2 {
    grid-column: span 1;
  }
}
</style>

