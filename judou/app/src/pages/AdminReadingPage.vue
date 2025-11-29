<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useReadingStore } from '@/stores/readingStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAuthStore } from '@/stores/authStore'
import type { ReadingText, TextAnnotation } from '@/types/text'

const readingStore = useReadingStore()
const libraryStore = usePracticeLibraryStore()
const authStore = useAuthStore()

// ============ 視圖狀態 ============
type ViewMode = 'list' | 'detail'
const viewMode = ref<ViewMode>('list')
const selectedText = ref<ReadingText | null>(null)
const selectedCategoryId = ref<string | null>(null)

// ============ 表單狀態 ============
const isFormOpen = ref(false)
const isExtractOpen = ref(false)
const isAnnotationOpen = ref(false)
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
  reading_category_ids: [] as string[],  // 多選文集
})

// 文集分類狀態
const isAddingCategory = ref(false)
const newCategoryName = ref('')
const editingCategoryId = ref<string | null>(null)
const editingCategoryName = ref('')

// 片段提取表單
const extractForm = reactive({
  selectedText: '',
  startIndex: 0,
  endIndex: 0,
  title: '',
  category_id: null as string | null,
  difficulty: 2,
})

// 註釋表單
const annotationForm = reactive({
  selectedText: '',
  startIndex: 0,
  endIndex: 0,
  annotation: '',
})

// ============ 計算屬性 ============

// 閱讀分類選項（文集）
const categoryOptions = computed(() => readingStore.readingCategories)

// 練習分類選項（用於提取練習素材）
const practiceCategoryOptions = computed(() => {
  return libraryStore.state.categories
    .filter(c => c.level === 1) // 只顯示頂級分類
    .sort((a, b) => a.order_index - b.order_index)
})

// 當前選中的文集
const selectedCategory = computed(() => {
  if (!selectedCategoryId.value) return null
  return readingStore.readingCategories.find(c => c.id === selectedCategoryId.value) || null
})

// 當前文集下的文章
const textsInCategory = computed(() => {
  if (!selectedCategoryId.value) return []
  return readingStore.readingTexts.filter(t => 
    t.reading_categories?.some(c => c.id === selectedCategoryId.value)
  )
})

// 獲取文集下的文章數量
function getTextCountForCategory(categoryId: string) {
  return readingStore.readingTexts.filter(t =>
    t.reading_categories?.some(c => c.id === categoryId)
  ).length
}

// 選擇文集
function selectCategory(categoryId: string) {
  selectedCategoryId.value = categoryId
}

// 開始內聯編輯文集
function startEditCategory(category: { id: string; name: string }) {
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

// 取消編輯
function cancelEditCategory() {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

// 提交編輯
async function submitEditCategory() {
  if (!editingCategoryId.value || !editingCategoryName.value.trim()) {
    cancelEditCategory()
    return
  }
  
  try {
    await readingStore.updateReadingCategory(editingCategoryId.value, {
      name: editingCategoryName.value.trim(),
    })
    cancelEditCategory()
  } catch (err: any) {
    alert(err?.message || '更新文集失敗')
  }
}

// 刪除文集
async function handleDeleteCategory(category: { id: string; name: string }) {
  const textCount = getTextCountForCategory(category.id)
  if (textCount > 0) {
    alert(`無法刪除「${category.name}」：此文集下還有 ${textCount} 篇文章。請先移除文章後再刪除文集。`)
    return
  }
  
  if (!confirm(`確定要刪除文集「${category.name}」嗎？`)) {
    return
  }
  
  try {
    await readingStore.deleteReadingCategory(category.id)
    if (selectedCategoryId.value === category.id) {
      selectedCategoryId.value = null
    }
  } catch (err: any) {
    alert(err?.message || '刪除文集失敗')
  }
}

// 純文字內容（移除斷句符號）
const pureContent = computed(() => {
  // 優先使用 currentText（包含完整數據），否則使用 selectedText
  const text = readingStore.currentText || selectedText.value
  if (!text) return ''
  return text.content.replace(/\|/g, '')
})

// 文章段落（按 || 分段）
const paragraphs = computed(() => {
  // 優先使用 currentText（包含完整數據），否則使用 selectedText
  const text = readingStore.currentText || selectedText.value
  if (!text) return []
  return text.content.split('||').map(p => p.replace(/\|/g, ''))
})

// 當前文章的註釋
const currentAnnotations = computed(() => {
  return readingStore.currentText?.annotations || []
})

// ============ 視圖切換 ============

// 打開文章詳情
async function openTextDetail(text: ReadingText) {
  selectedText.value = text
  viewMode.value = 'detail'
  // 獲取完整文章信息（包含註釋）
  await readingStore.fetchTextDetail(text.id)
}

// 返回列表
function backToList() {
  viewMode.value = 'list'
  selectedText.value = null
  readingStore.clearCurrentText()
}

// ============ 文章表單 ============

// 打開新增表單
function openCreateForm() {
  editingText.value = null
  textForm.title = ''
  textForm.author = ''
  textForm.source = ''
  textForm.summary = ''
  textForm.content = ''
  textForm.reading_category_ids = []
  feedback.value = null
  isFormOpen.value = true
}

// 打開編輯表單
function openEditForm() {
  // 優先使用 currentText（包含完整數據），否則使用 selectedText
  const text = readingStore.currentText || selectedText.value
  if (!text) return
  
  editingText.value = text
  textForm.title = text.title
  textForm.author = text.author || ''
  textForm.source = text.source || ''
  textForm.summary = text.summary || ''
  textForm.content = text.content
  // 獲取現有文集 IDs
  textForm.reading_category_ids = text.reading_categories?.map(c => c.id) || []
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
    
    // 轉換標點符號為斷句標記
    const processedContent = convertPunctuationToBreaks(textForm.content)
    
    if (!processedContent) {
      feedback.value = '內容處理後為空，請檢查輸入'
      return
    }
    
    if (editingText.value) {
      // 更新文章內容和文集關聯
      await readingStore.updateReadingText(editingText.value.id, {
        title: textForm.title.trim(),
        author: textForm.author.trim() || null,
        source: textForm.source.trim() || null,
        summary: textForm.summary.trim() || null,
        category_id: null,
        content: processedContent,
        reading_category_ids: textForm.reading_category_ids,
      })
      
      // 同步更新 selectedText（如果正在查看這篇文章）
      if (editingText.value && selectedText.value?.id === editingText.value.id) {
        const updatedText = readingStore.readingTexts.find(t => t.id === editingText.value!.id)
        if (updatedText) {
          selectedText.value = updatedText
        }
      }
      
      isFormOpen.value = false
    } else {
      await readingStore.createReadingText({
        title: textForm.title.trim(),
        author: textForm.author.trim() || null,
        source: textForm.source.trim() || null,
        summary: textForm.summary.trim() || null,
        content: processedContent,
        category_id: null,
        reading_category_ids: textForm.reading_category_ids,
      }, authStore.isAdmin)
      
      isFormOpen.value = false
    }
  } catch (err: any) {
    feedback.value = err?.message || '儲存失敗'
  } finally {
    isSubmitting.value = false
  }
}

// ============ 文字選取與操作 ============

// 處理文字選取
function handleTextSelection() {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return
  
  const text = selection.toString().trim()
  if (!text || text.length === 0) return
  
  // 計算選取範圍在純文字中的位置
  const content = pureContent.value
  const startIdx = content.indexOf(text)
  
  if (startIdx >= 0) {
    // 顯示操作選單
    showSelectionActions(text, startIdx, startIdx + text.length)
  }
}

// 選取操作狀態
const selectionActions = reactive({
  show: false,
  text: '',
  startIndex: 0,
  endIndex: 0,
})

function showSelectionActions(text: string, start: number, end: number) {
  selectionActions.text = text
  selectionActions.startIndex = start
  selectionActions.endIndex = end
  selectionActions.show = true
}

function hideSelectionActions() {
  selectionActions.show = false
}

// 打開提取片段對話框
function openExtractDialog() {
  if (!selectedText.value) return
  
  extractForm.selectedText = selectionActions.text
  extractForm.startIndex = selectionActions.startIndex
  extractForm.endIndex = selectionActions.endIndex
  extractForm.title = `${selectedText.value.title}（節選）`
  extractForm.category_id = selectedText.value.category_id || null
  extractForm.difficulty = 2
  feedback.value = null
  
  hideSelectionActions()
  isExtractOpen.value = true
}

// 打開添加註釋對話框
function openAnnotationDialog() {
  annotationForm.selectedText = selectionActions.text
  annotationForm.startIndex = selectionActions.startIndex
  annotationForm.endIndex = selectionActions.endIndex
  annotationForm.annotation = ''
  feedback.value = null
  
  hideSelectionActions()
  isAnnotationOpen.value = true
}

// 提取為練習素材
async function handleExtract() {
  if (!selectedText.value || !extractForm.selectedText) {
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
    const originalContent = selectedText.value.content
    
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
      selectedText.value.id,
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

// 添加註釋
async function handleAddAnnotation() {
  if (!selectedText.value || !annotationForm.selectedText) {
    feedback.value = '請選取要註釋的文字'
    return
  }
  
  if (!annotationForm.annotation.trim()) {
    feedback.value = '請輸入註釋內容'
    return
  }
  
  try {
    isSubmitting.value = true
    
    await readingStore.addAnnotation({
      text_id: selectedText.value.id,
      start_index: annotationForm.startIndex,
      end_index: annotationForm.endIndex,
      term: annotationForm.selectedText,
      annotation: annotationForm.annotation.trim(),
    })
    
    isAnnotationOpen.value = false
    alert('註釋添加成功！')
    
    // 重新獲取文章詳情以更新註釋列表
    await readingStore.fetchTextDetail(selectedText.value.id)
    
  } catch (err: any) {
    feedback.value = err?.message || '添加註釋失敗'
  } finally {
    isSubmitting.value = false
  }
}

// 刪除註釋
async function handleDeleteAnnotation(annotation: TextAnnotation) {
  if (!confirm(`確定要刪除「${annotation.term}」的註釋嗎？`)) return
  
  try {
    await readingStore.deleteAnnotation(annotation.id)
    // 重新獲取文章詳情
    if (selectedText.value) {
      await readingStore.fetchTextDetail(selectedText.value.id)
    }
  } catch (err: any) {
    alert(err?.message || '刪除失敗')
  }
}

// ============ 輔助函數 ============

// 獲取內容預覽（移除斷句符號）
function getPreview(text: ReadingText) {
  const content = text.content.replace(/\|/g, '')
  return content.length > 80 ? content.slice(0, 80) + '...' : content
}

/**
 * 將帶標點的古文轉換為內部格式
 */
function convertPunctuationToBreaks(rawContent: string): string {
  const punctuationRegex = /[。，、；：！？,.;:!?]/g
  const removeRegex = /[「」『』""''（）()【】\[\]《》<>·—…～\-]/g
  
  const lines = rawContent.split(/\n+/)
  
  const processedLines = lines
    .map(line => {
      let processed = line.trim()
      if (!processed) return ''
      processed = processed.replace(removeRegex, '')
      processed = processed.replace(punctuationRegex, '|')
      processed = processed
        .replace(/\|+/g, '|')
        .replace(/^\|/, '')
        .replace(/\|$/, '')
      return processed
    })
    .filter(line => line.length > 0)
  
  return processedLines.join('||')
}

// 格式化日期
function formatDate(dateStr?: string) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString()
}

// 計算字數
function getWordCount(text: ReadingText) {
  return text.content.replace(/\|/g, '').length
}

// ============ 分類管理 ============

// 切換文集選擇狀態
function toggleCategory(categoryId: string) {
  const index = textForm.reading_category_ids.indexOf(categoryId)
  if (index > -1) {
    textForm.reading_category_ids.splice(index, 1)
  } else {
    textForm.reading_category_ids.push(categoryId)
  }
}

// 新增閱讀分類（文集）
async function handleAddCategory() {
  if (!newCategoryName.value.trim()) {
    return
  }
  
  try {
    const newCategory = await readingStore.createReadingCategory(newCategoryName.value.trim())
    if (newCategory) {
      // 自動選中新創建的文集
      textForm.reading_category_ids.push(newCategory.id)
    }
    newCategoryName.value = ''
    isAddingCategory.value = false
  } catch (err: any) {
    alert(err?.message || '新增分類失敗')
  }
}

onMounted(async () => {
  // 同時獲取閱讀分類、文章列表和練習分類
  await Promise.all([
    readingStore.fetchReadingCategories(),
    readingStore.fetchReadingTexts(),
    libraryStore.fetchLibrary()
  ])
  
  // 預設選中第一個文集
  if (categoryOptions.value.length > 0 && !selectedCategoryId.value && categoryOptions.value[0]) {
    selectedCategoryId.value = categoryOptions.value[0].id
  }
})
</script>

<template>
  <div class="admin-reading-page">
    <!-- ========== 列表視圖 ========== -->
    <template v-if="viewMode === 'list'">
      <header class="admin-header">
        <div>
          <p class="edamame-text-level-detail">管理閱讀文章和提取練習片段</p>
          <h1 class="edamame-heading-gradient">閱讀文庫</h1>
        </div>
        <div class="header-actions">
          <button 
            class="edamame-btn edamame-btn-secondary"
            @click="readingStore.fetchReadingTexts(); readingStore.fetchReadingCategories()"
            :disabled="readingStore.isLoading"
          >
            重新整理
          </button>
          <button 
            class="edamame-btn edamame-btn-primary"
            @click="openCreateForm"
            :disabled="!selectedCategory"
          >
            新增閱讀文章
          </button>
        </div>
      </header>
      
      <div class="admin-layout">
        <!-- 左側：文集導航 -->
        <aside class="category-sidebar edamame-glass">
          <div class="sidebar-header">
            <span class="sidebar-title">文集導航</span>
            <button class="icon-btn" @click="isAddingCategory = true; newCategoryName = ''" title="新增文集">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div v-if="readingStore.isLoading" class="sidebar-loading">載入中⋯</div>
          <div v-else-if="!categoryOptions.length" class="sidebar-empty">
            尚無文集
            <button class="link-btn" @click="isAddingCategory = true; newCategoryName = ''">建立第一個文集</button>
          </div>

          <nav v-else class="category-tree">
            <div v-for="category in categoryOptions" :key="category.id" class="tree-node">
              <!-- 編輯模式 -->
              <div v-if="editingCategoryId === category.id" class="tree-item editing">
                <input
                  v-model="editingCategoryName"
                  type="text"
                  class="edit-input"
                  @keyup.enter="submitEditCategory"
                  @keyup.escape="cancelEditCategory"
                  ref="editInput"
                />
                <div class="edit-actions">
                  <button class="action-btn" @click="submitEditCategory" title="確認">✓</button>
                  <button class="action-btn" @click="cancelEditCategory" title="取消">×</button>
                </div>
              </div>
              <!-- 顯示模式 -->
              <div
                v-else
                class="tree-item"
                :class="{ selected: selectedCategoryId === category.id }"
                @click="selectCategory(category.id)"
              >
                <span class="tree-label">{{ category.name }}</span>
                <span class="tree-count">{{ getTextCountForCategory(category.id) }}</span>
                <div class="tree-actions">
                  <button class="action-btn" @click.stop="startEditCategory(category)" title="編輯">✎</button>
                  <button class="action-btn danger" @click.stop="handleDeleteCategory(category)" title="刪除">×</button>
                </div>
              </div>
            </div>
          </nav>

          <!-- 新增文集表單（內嵌） -->
          <div v-if="isAddingCategory" class="add-category-inline">
            <input
              v-model="newCategoryName"
              type="text"
              placeholder="輸入文集名稱..."
              class="category-input"
              @keyup.enter="handleAddCategory"
              @keyup.escape="isAddingCategory = false"
            />
            <div class="add-category-actions">
              <button class="action-btn" @click="handleAddCategory" title="確認">✓</button>
              <button class="action-btn" @click="isAddingCategory = false" title="取消">×</button>
            </div>
          </div>
        </aside>

        <!-- 右側：文章列表 -->
        <main class="content-panel edamame-glass">
          <div v-if="!selectedCategory" class="content-empty">
            <p>請從左側選擇一個文集</p>
          </div>

          <template v-else>
            <!-- 分類資訊 -->
            <div class="category-info">
              <h2>{{ selectedCategory.name }}</h2>
              <p class="category-meta">{{ textsInCategory.length }} 篇文章</p>
            </div>

            <!-- 文章列表 -->
            <div class="text-list-section">
              <div v-if="!textsInCategory.length" class="text-empty">
                <p>此文集尚無文章</p>
                <button class="edamame-btn edamame-btn-primary" @click="openCreateForm">新增第一篇文章</button>
              </div>

              <table v-else>
                <thead>
                  <tr>
                    <th>標題</th>
                    <th>作者</th>
                    <th>字數</th>
                    <th>建立日期</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="text in textsInCategory" 
                    :key="text.id"
                    class="text-row"
                    @click="openTextDetail(text)"
                  >
                    <td>
                      <p class="text-title">{{ text.title }}</p>
                      <p class="text-preview">{{ getPreview(text) }}</p>
                    </td>
                    <td>{{ text.author || '佚名' }}</td>
                    <td>{{ getWordCount(text) }}</td>
                    <td>{{ formatDate(text.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </main>
      </div>
    </template>
    
    <!-- ========== 詳情視圖 ========== -->
    <template v-else-if="viewMode === 'detail' && selectedText">
      <header class="detail-header">
        <button class="back-btn" @click="backToList">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          返回列表
        </button>
        <div class="detail-actions">
          <button class="edamame-btn edamame-btn-secondary" @click="openEditForm">
            編輯文章
          </button>
        </div>
      </header>
      
      <!-- 文章元信息 -->
      <div class="text-meta edamame-glass">
        <h1 class="detail-title">{{ selectedText.title }}</h1>
        <div class="meta-row">
          <span v-if="selectedText.author" class="meta-item">
            <strong>作者：</strong>{{ selectedText.author }}
          </span>
          <span v-if="selectedText.source" class="meta-item">
            <strong>來源：</strong>{{ selectedText.source }}
          </span>
          <span class="meta-item">
            <strong>字數：</strong>{{ getWordCount(selectedText) }}
          </span>
          <span v-if="selectedText.reading_categories?.length" class="meta-item">
            <strong>文集：</strong>
            <span class="category-tags inline">
              <span 
                v-for="cat in selectedText.reading_categories" 
                :key="cat.id"
                class="category-tag"
              >
                {{ cat.name }}
              </span>
            </span>
          </span>
        </div>
      </div>
      
      <!-- 操作提示 -->
      <div class="action-hint">
        💡 選取文字後可以「提取為練習」或「添加註釋」
      </div>
      
      <!-- 選取操作浮層 -->
      <div v-if="selectionActions.show" class="selection-toolbar">
        <span class="selected-text">「{{ selectionActions.text.slice(0, 20) }}{{ selectionActions.text.length > 20 ? '...' : '' }}」</span>
        <button class="toolbar-btn extract" @click="openExtractDialog">
          📤 提取為練習
        </button>
        <button class="toolbar-btn annotate" @click="openAnnotationDialog">
          📝 添加註釋
        </button>
        <button class="toolbar-btn cancel" @click="hideSelectionActions">
          ✕
        </button>
      </div>
      
      <!-- 文章內容 -->
      <div 
        class="text-content edamame-glass"
        @mouseup="handleTextSelection"
      >
        <div 
          v-for="(para, idx) in paragraphs" 
          :key="idx" 
          class="paragraph"
        >
          {{ para }}
        </div>
      </div>
      
      <!-- 註釋列表 -->
      <div v-if="currentAnnotations.length > 0" class="annotations-section edamame-glass">
        <h3 class="section-title">📝 已添加的註釋 ({{ currentAnnotations.length }})</h3>
        <div class="annotation-list">
          <div 
            v-for="ann in currentAnnotations" 
            :key="ann.id" 
            class="annotation-item"
          >
            <div class="annotation-term">{{ ann.term }}</div>
            <div class="annotation-content">{{ ann.annotation }}</div>
            <button class="delete-btn" @click="handleDeleteAnnotation(ann)" title="刪除">
              ✕
            </button>
          </div>
        </div>
      </div>
    </template>
    
    <!-- ========== 新增/編輯文章 Modal ========== -->
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
              </div>
              
              <!-- 文集選擇 -->
              <label>
                <span>文集（點擊選擇）</span>
                <div class="category-picker">
                  <!-- 所有文集標籤 -->
                  <button 
                    v-for="cat in categoryOptions" 
                    :key="cat.id"
                    type="button"
                    class="category-tag-btn"
                    :class="{ selected: textForm.reading_category_ids.includes(cat.id) }"
                    @click="toggleCategory(cat.id)"
                  >
                    <span class="tag-check" v-if="textForm.reading_category_ids.includes(cat.id)">✓</span>
                    {{ cat.name }}
                  </button>
                  
                  <!-- 新增文集按鈕 / 輸入框 -->
                  <div v-if="isAddingCategory" class="new-category-inline">
                    <input 
                      v-model="newCategoryName" 
                      type="text" 
                      class="new-category-input-inline"
                      @keyup.enter="handleAddCategory"
                      @keyup.escape="isAddingCategory = false; newCategoryName = ''"
                    />
                    <button type="button" class="inline-action confirm" @click="handleAddCategory">✓</button>
                    <button type="button" class="inline-action cancel" @click="isAddingCategory = false; newCategoryName = ''">×</button>
                  </div>
                  <button 
                    v-else
                    type="button"
                    class="category-tag-btn add-new"
                    @click="isAddingCategory = true; newCategoryName = ''"
                  >
                    + 新增文集
                  </button>
                </div>
              </label>
              
              <label>
                <span>內容（可直接粘貼帶標點的原文）</span>
                <textarea 
                  v-model="textForm.content" 
                  rows="10" 
                  placeholder="直接粘貼古文原文即可，系統會自動處理標點符號。&#10;&#10;例如：&#10;晉太原中，武陵人捕魚為業。緣溪行，忘路之遠近。&#10;&#10;段落之間用空行分隔。"
                ></textarea>
              </label>
              
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
    
    <!-- ========== 片段提取 Modal ========== -->
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
                  共 {{ extractForm.selectedText.length }} 字
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
                      v-for="cat in practiceCategoryOptions" 
                      :key="cat.id" 
                      :value="cat.id"
                    >
                      {{ cat.name }}
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
                提取後的練習素材將關聯到原文章，學生練習時可以看到「來自《{{ selectedText?.title }}》」
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
    
    <!-- ========== 添加註釋 Modal ========== -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isAnnotationOpen" class="modal-backdrop" @click.self="isAnnotationOpen = false">
          <div class="modal-card edamame-glass">
            <header>
              <h3>📝 添加註釋</h3>
              <button class="close-btn" @click="isAnnotationOpen = false">×</button>
            </header>
            
            <div class="modal-body">
              <div class="selected-preview">
                <p class="preview-label">選取的字詞：</p>
                <p class="preview-content annotation-term-preview">{{ annotationForm.selectedText }}</p>
              </div>
              
              <label>
                <span>註釋內容 *</span>
                <textarea 
                  v-model="annotationForm.annotation" 
                  rows="4" 
                  placeholder="輸入對這個字詞的解釋..."
                ></textarea>
              </label>
              
              <p v-if="feedback" class="feedback">{{ feedback }}</p>
            </div>
            
            <footer>
              <button class="edamame-btn edamame-btn-secondary" @click="isAnnotationOpen = false">
                取消
              </button>
              <button 
                class="edamame-btn edamame-btn-primary" 
                :disabled="isSubmitting"
                @click="handleAddAnnotation"
              >
                {{ isSubmitting ? '添加中...' : '確認添加' }}
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

/* ========== 列表視圖 - 頭部 ========== */
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* ========== 左右布局 ========== */
.admin-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1.5rem;
  min-height: 500px;
}

/* 左側：文集導航 */
.category-sidebar {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-600);
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
  color: var(--color-neutral-500);
  transition: all var(--duration-base) ease;
}

.icon-btn:hover {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.sidebar-loading,
.sidebar-empty {
  padding: 1rem;
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
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-base) ease;
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

/* 新增文集內嵌表單 */
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

/* 右側：內容面板 */
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

.category-info {
  margin-bottom: 1.5rem;
}

.category-info h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.category-meta {
  margin: 0.25rem 0 0;
  color: var(--color-neutral-400);
  font-size: var(--text-xs);
}

.text-list-section {
  flex: 1;
}

.text-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-neutral-500);
}

.text-empty button {
  margin-top: 1rem;
}

/* ========== 舊的列表視圖樣式（保留給詳情使用） ========== */
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

/* 文章列表表格 */
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

.text-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.text-row:hover {
  background: rgba(139, 178, 79, 0.08);
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

/* 文集標籤 */
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.category-tags.inline {
  display: inline-flex;
}

.category-tag {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.no-category {
  color: var(--color-neutral-400);
  font-size: var(--text-sm);
}

/* ========== 詳情視圖 ========== */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
}

.text-meta {
  padding: 1.5rem;
}

.detail-title {
  margin: 0 0 0.75rem;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.meta-item strong {
  color: var(--color-neutral-500);
  font-weight: var(--font-medium);
}

.action-hint {
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.08);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: #1e40af;
  text-align: center;
}

/* 選取操作工具欄 */
.selection-toolbar {
  position: sticky;
  top: 1rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.selected-text {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-btn {
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all 0.15s ease;
}

.toolbar-btn.extract {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.toolbar-btn.extract:hover {
  background: var(--color-primary-200);
}

.toolbar-btn.annotate {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
}

.toolbar-btn.annotate:hover {
  background: rgba(59, 130, 246, 0.25);
}

.toolbar-btn.cancel {
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-neutral-500);
  padding: 0.4rem 0.6rem;
}

.toolbar-btn.cancel:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* 文章內容 */
.text-content {
  padding: 2rem;
  font-family: var(--font-main, 'Noto Serif TC', serif);
  font-size: 1.25rem;
  line-height: 2;
  color: var(--color-neutral-800);
  user-select: text;
}

.paragraph {
  margin-bottom: 2rem;
  text-indent: 2em;
  padding-bottom: 1.5rem;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
}

.paragraph:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* 註釋列表 */
.annotations-section {
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 1rem;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-700);
}

.annotation-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.annotation-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.annotation-term {
  flex-shrink: 0;
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: #1e40af;
}

.annotation-content {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
  line-height: 1.5;
}

.delete-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 12px;
  color: #dc2626;
  transition: all 0.15s ease;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ========== 共用樣式 ========== */
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

.annotation-term-preview {
  font-size: var(--text-2xl);
  text-align: center;
  padding: 0.5rem 0;
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

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.flex-2 {
  grid-column: span 2;
}

/* 文集選擇器 - 標籤式設計 */
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

/* 新增文集內聯輸入 - 與標籤同高 */
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
  background: rgba(0, 0, 0, 0.08);
  color: var(--color-neutral-500);
}

.inline-action.cancel:hover {
  background: rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .flex-2 {
    grid-column: span 1;
  }
  
  .selection-toolbar {
    flex-wrap: wrap;
  }
}
</style>

<style>
/* Modal 全局樣式 - 因為 Teleport 到 body */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
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

.modal-card.large-modal {
  width: min(800px, calc(100vw - 2rem));
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

.modal-card .modal-body label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-card .modal-body label span {
  font-size: var(--text-sm, 14px);
  font-weight: var(--font-medium, 500);
  color: var(--color-neutral-600, #52525b);
}

.modal-card .modal-body input,
.modal-card .modal-body select,
.modal-card .modal-body textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-base, 16px);
  background: white;
  transition: border-color 0.15s ease;
}

.modal-card .modal-body input:focus,
.modal-card .modal-body select:focus,
.modal-card .modal-body textarea:focus {
  outline: none;
  border-color: var(--color-primary-500, #22c55e);
}

.modal-card .modal-body textarea {
  resize: vertical;
  min-height: 120px;
  font-family: var(--font-main, 'Noto Serif TC', serif);
}

.modal-card footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* 過渡動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
