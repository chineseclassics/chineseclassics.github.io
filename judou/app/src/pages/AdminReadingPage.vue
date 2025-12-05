<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useReadingStore } from '@/stores/readingStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAuthStore } from '@/stores/authStore'
import { useSupabase } from '@/composables/useSupabase'
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
  pinyin: '',
})

// 編輯註釋相關狀態
const editingAnnotationId = ref<string | null>(null)
const isFetchingMoedict = ref(false)  // moedict 查詢加載狀態

// AI 生成註釋相關狀態
const isGeneratingAnnotations = ref(false)
const generatedAnnotations = ref<Array<{
  term: string
  start_index: number
  end_index: number
  annotation: string
  pinyin?: string | null
}>>([])
const isPreviewOpen = ref(false)

// AI 返回的原始註釋（不含位置）
interface AIAnnotation {
  term: string
  annotation: string
  pinyin?: string | null
}

// 利用上下文匹配註釋位置（按順序匹配，利用前一個註釋的位置）
// 修復：正確處理代理對字符（如"𦬼"），確保位置計算與 PostgreSQL 一致
// 問題：JavaScript 的 indexOf 對於代理對字符，返回的是字符索引（代理對佔 2 個索引位置）
// 但 PostgreSQL 的 position 函數返回的是實際字符位置（代理對只佔 1 個位置）
// 解決方案：使用 Array.from 將字符串轉換為字符數組，正確處理代理對
function matchAnnotationsWithContext(
  aiAnnotations: AIAnnotation[],
  pureContent: string
): Array<{
  term: string
  start_index: number
  end_index: number
  annotation: string
  pinyin?: string | null
}> {
  const matched: Array<{
    term: string
    start_index: number
    end_index: number
    annotation: string
    pinyin?: string | null
  }> = []
  
  // 構建一個映射：從 JavaScript 字符串索引到實際字符位置的映射
  // 對於代理對字符，高代理和低代理在 JavaScript 中佔 2 個索引位置
  // 但在實際字符位置中，代理對只佔 1 個位置
  let actualCharPos = 0
  const jsIndexToCharPos = new Map<number, number>()
  
  for (let jsIndex = 0; jsIndex < pureContent.length; jsIndex++) {
    const code = pureContent.charCodeAt(jsIndex)
    // 檢查是否是代理對的低代理（0xDC00-0xDFFF）
    // 如果是低代理，說明前一個位置是代理對的高代理，已經計數過了
    if (code >= 0xDC00 && code <= 0xDFFF) {
      // 這是代理對的低代理，使用前一個字符的位置
      jsIndexToCharPos.set(jsIndex, actualCharPos - 1)
    } else {
      // 普通字符或代理對的高代理，計數
      jsIndexToCharPos.set(jsIndex, actualCharPos)
      actualCharPos++
    }
  }
  
  // 輔助函數：將 JavaScript 字符串索引轉換為實際字符位置
  function getCharPosition(jsIndex: number): number {
    return jsIndexToCharPos.get(jsIndex) ?? jsIndex
  }
  
  // 輔助函數：計算字符串的實際字符長度（代理對只佔 1 個位置）
  function getActualLength(str: string): number {
    return Array.from(str).length
  }
  
  let searchStart = 0  // JavaScript 字符串索引（用於 indexOf）
  
  for (const ann of aiAnnotations) {
    // 使用 JavaScript 的 indexOf 搜索（返回 JavaScript 索引）
    const jsIndex = pureContent.indexOf(ann.term, searchStart)
    
    if (jsIndex === -1) {
      // 找不到匹配，跳過
      console.warn(`⚠️ 無法找到註釋 "${ann.term}" 在原文中的位置，跳過`)
      continue
    }
    
    // 將 JavaScript 索引轉換為實際字符位置（與 PostgreSQL 一致）
    const startIndex = getCharPosition(jsIndex)
    
    // 計算 term 的實際字符長度（代理對只佔 1 個位置）
    const termLength = getActualLength(ann.term)
    const endIndex = startIndex + termLength
    
    // 驗證是否與前一個註釋重疊
    if (matched.length > 0) {
      const lastMatch = matched[matched.length - 1]
      if (lastMatch && startIndex < lastMatch.end_index) {
        console.warn(`⚠️ 註釋 "${ann.term}" 與前一個註釋 "${lastMatch.term}" 重疊，跳過`)
        continue
      }
    }
    
    // 更新 searchStart：使用 JavaScript 索引（需要跳過整個 term，包括代理對的 2 個索引位置）
    searchStart = jsIndex + ann.term.length  // ann.term.length 對於包含代理對的字符串返回正確的 JavaScript 索引長度
    
    matched.push({
      term: ann.term,
      start_index: startIndex,
      end_index: endIndex,
      annotation: ann.annotation,
      pinyin: ann.pinyin || null
    })
  }
  
  return matched
}

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

// 解析文章內容（與 ReadingDetailPage 一致，用於顯示註釋）
const parsedContent = computed(() => {
  const text = readingStore.currentText || selectedText.value
  if (!text) return { paragraphs: [], allChars: [] }
  
  const content = text.content
  const separator = content.includes('||') ? '||' : /\n\n+/
  const rawParagraphs = content.split(separator)
  
  const paragraphs: { chars: string[]; startIdx: number; endIdx: number }[] = []
  const allChars: string[] = []
  let globalPointer = 0
  
  for (const rawPara of rawParagraphs) {
    const paraChars: string[] = []
    const paraStartIdx = globalPointer
    const trimmedPara = rawPara.replace(/[\|\s]+$/, '')
    
    for (const char of trimmedPara) {
      if (char === '|') {
        // 跳過斷句符
      } else if (char !== '\n' && char !== '\r') {
        allChars.push(char)
        paraChars.push(char)
        globalPointer++
      }
    }
    
    if (paraChars.length > 0) {
      paragraphs.push({
        chars: paraChars,
        startIdx: paraStartIdx,
        endIdx: globalPointer - 1
      })
    }
  }
  
  return { paragraphs, allChars }
})

// 純文字內容（移除斷句符號，與 ReadingDetailPage 的計算方式一致）
const pureContent = computed(() => {
  return parsedContent.value.allChars.join('')
})

// 文章段落（用於顯示，返回解析後的段落）
const displayParagraphs = computed(() => {
  return parsedContent.value.paragraphs
})

// 當前文章的註釋
const currentAnnotations = computed(() => {
  return readingStore.currentText?.annotations || []
})

// 當前顯示的 tooltip
const activeTooltip = ref<{
  annotation: TextAnnotation
  x: number
  y: number
} | null>(null)

// 當前懸停的註釋 ID
const hoveredAnnotationId = ref<string | null>(null)

// 檢測是否為移動設備
const isMobile = ref(false)

// 獲取字符的註釋（如果有）
function getAnnotationForChar(globalIdx: number): TextAnnotation | null {
  if (!readingStore.currentText?.annotations) return null
  return readingStore.currentText.annotations.find(
    a => globalIdx >= a.start_index && globalIdx < a.end_index
  ) || null
}

// 檢查字符是否是註釋的第一個字
function isAnnotationStart(globalIdx: number): boolean {
  const ann = getAnnotationForChar(globalIdx)
  return ann?.start_index === globalIdx
}

// 檢查字符是否是註釋的最後一個字
function isAnnotationEnd(globalIdx: number): boolean {
  const ann = getAnnotationForChar(globalIdx)
  return ann ? (ann.end_index - 1 === globalIdx) : false
}

// 檢查字符是否屬於當前懸停的註釋
function isCharInHoveredAnnotation(globalIdx: number): boolean {
  if (!hoveredAnnotationId.value) return false
  const ann = getAnnotationForChar(globalIdx)
  return ann?.id === hoveredAnnotationId.value
}

// 處理滑鼠進入字符（桌面版）
function handleCharMouseEnter(globalIdx: number, event: MouseEvent) {
  // 移動設備不使用滑鼠懸停
  if (isMobile.value) return
  
  const ann = getAnnotationForChar(globalIdx)
  if (ann) {
    hoveredAnnotationId.value = ann.id
    showTooltip(ann, event)
  }
}

// 處理滑鼠離開字符（桌面版）
function handleCharMouseLeave() {
  // 移動設備不使用滑鼠懸停
  if (isMobile.value) return
  
  hoveredAnnotationId.value = null
  hideTooltip()
}

// 處理字符點擊（移動版）
function handleCharClick(globalIdx: number, event: MouseEvent | TouchEvent) {
  const ann = getAnnotationForChar(globalIdx)
  if (!ann) return
  
  // 防止事件冒泡
  event.stopPropagation()
  
  // 如果點擊的是當前已顯示的註釋，則關閉
  if (activeTooltip.value && activeTooltip.value.annotation.id === ann.id) {
    hideTooltip()
    return
  }
  
  // 顯示 tooltip
  hoveredAnnotationId.value = ann.id
  
  // 等待 DOM 更新後計算位置（確保高亮狀態已更新）
  nextTick(() => {
    // 找到該註釋的第一個字符元素（使用 data-global-index 屬性）
    const firstCharElement = document.querySelector(
      `.char[data-global-index="${ann.start_index}"]`
    ) as HTMLElement
    
    // 找到該註釋的最後一個字符元素
    const lastCharElement = document.querySelector(
      `.char[data-global-index="${ann.end_index - 1}"]`
    ) as HTMLElement
    
    let clientX = 0
    let clientY = 0
    
    if (firstCharElement && lastCharElement) {
      // 計算整個註釋詞組的 bounding box
      const firstRect = firstCharElement.getBoundingClientRect()
      const lastRect = lastCharElement.getBoundingClientRect()
      
      // 使用詞組的水平中心位置
      clientX = (firstRect.left + lastRect.right) / 2
      clientY = firstRect.top
    } else if (firstCharElement) {
      // 如果只有第一個元素（單字符註釋）
      const rect = firstCharElement.getBoundingClientRect()
      clientX = rect.left + rect.width / 2
      clientY = rect.top
    } else {
      // 後備方案：使用被點擊元素的位置
      const target = event.target as HTMLElement
      if (target) {
        const rect = target.getBoundingClientRect()
        clientX = rect.left + rect.width / 2
        clientY = rect.top
      }
    }
    
    showTooltip(ann, { clientX, clientY } as MouseEvent)
  })
}

// 顯示註釋 tooltip
function showTooltip(annotation: TextAnnotation, event: MouseEvent) {
  activeTooltip.value = {
    annotation,
    x: event.clientX,
    y: event.clientY
  }
}

// 隱藏 tooltip
function hideTooltip() {
  hoveredAnnotationId.value = null
  activeTooltip.value = null
}

// 處理點擊外部區域關閉 tooltip（僅移動設備）
function handleClickOutside(event: MouseEvent | TouchEvent) {
  if (!isMobile.value || !activeTooltip.value) return
  
  const target = event.target as HTMLElement
  
  // 如果點擊的不是帶註釋的文字或 tooltip 本身，則關閉
  if (!target.closest('.char.has-annotation') && !target.closest('.annotation-tooltip')) {
    hideTooltip()
  }
}

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

// 打開編輯表單（從詳情頁）
function openEditForm() {
  // 優先使用 currentText（包含完整數據），否則使用 selectedText
  const text = readingStore.currentText || selectedText.value
  if (!text) return
  openEditFormForText(text)
}

// 打開編輯表單（從列表）
function openEditFormForText(text: ReadingText) {
  editingText.value = text
  textForm.title = text.title
  textForm.author = text.author || ''
  textForm.source = text.source || ''
  textForm.summary = text.summary || ''
  
  // 處理內容：確保 \n\n 被正確顯示為分段
  // 如果內容包含 ||（舊格式），先轉換為 \n\n
  let content = text.content
  if (content.includes('||')) {
    content = content.replace(/\|\|/g, '\n\n')
  }
  // 確保 \n\n 是實際的換行符（不是字面量字符串）
  // textarea 會自動將 \n\n 顯示為兩個換行（分段）
  textForm.content = content
  
  // 獲取現有文集 IDs
  textForm.reading_category_ids = text.reading_categories?.map(c => c.id) || []
  feedback.value = null
  isFormOpen.value = true
}

// 刪除文章
async function handleDeleteText(text: ReadingText) {
  if (!confirm(`確定要刪除「${text.title}」嗎？此操作無法復原。`)) {
    return
  }
  
  try {
    await readingStore.deleteReadingText(text.id)
    // 如果刪除的是當前選中的文章，返回列表
    if (selectedText.value?.id === text.id) {
      backToList()
    }
  } catch (err: any) {
    alert(err?.message || '刪除失敗')
  }
}

// 提交文章表單
async function handleFormSubmit() {
  if (!textForm.title.trim() || !textForm.content.trim()) {
    feedback.value = '標題和內容為必填'
    return
  }
  
  // 檢查是否選擇了文集（必填）
  if (!textForm.reading_category_ids || textForm.reading_category_ids.length === 0) {
    feedback.value = '請至少選擇一個文集'
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
function handleTextSelection(event: MouseEvent) {
  // 延遲執行，確保選取已完成
  setTimeout(() => {
  const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      hideSelectionActions()
      return
    }
  
  const text = selection.toString().trim()
    if (!text || text.length === 0) {
      hideSelectionActions()
      return
    }
    
    // 檢查選取是否在文章內容區域內
    const target = event.target as HTMLElement
    const textContentEl = target.closest('.text-content')
    if (!textContentEl) {
      hideSelectionActions()
      return
    }
    
    // 獲取選取範圍
    const range = selection.getRangeAt(0)
  
  // 計算選取範圍在純文字中的位置
    // 通過遍歷所有字符元素來計算位置
    const allCharElements = textContentEl.querySelectorAll('.char')
    let startIdx = -1
    let endIdx = -1
    let currentIdx = 0
    
    for (let i = 0; i < allCharElements.length; i++) {
      const charEl = allCharElements[i] as HTMLElement
      const charText = charEl.textContent || ''
      
      if (!charText) continue
      
      // 檢查這個字符元素是否與選取範圍相交
      try {
        const charRange = document.createRange()
        charRange.selectNodeContents(charEl)
        
        // 檢查選取範圍是否與字符元素相交
        const intersects = range.intersectsNode(charEl) || 
                          range.compareBoundaryPoints(Range.START_TO_START, charRange) <= 0 && 
                          range.compareBoundaryPoints(Range.END_TO_END, charRange) >= 0
        
        if (intersects) {
          if (startIdx === -1) {
            startIdx = currentIdx
          }
          endIdx = currentIdx + charText.length
        }
      } catch (e) {
        // 如果範圍操作失敗，使用簡單的 contains 檢查
        if (range.commonAncestorContainer.contains(charEl) || charEl.contains(range.commonAncestorContainer)) {
          if (startIdx === -1) {
            startIdx = currentIdx
          }
          endIdx = currentIdx + charText.length
        }
      }
      
      currentIdx += charText.length
    }
    
    // 如果無法從 DOM 計算，使用 fallback 方法
    if (startIdx === -1 || endIdx <= startIdx) {
  const content = pureContent.value
      const firstMatch = content.indexOf(text)
      if (firstMatch >= 0) {
        startIdx = firstMatch
        endIdx = firstMatch + text.length
      }
    }
  
    if (startIdx >= 0 && endIdx > startIdx) {
    // 顯示操作選單
      showSelectionActions(text, startIdx, endIdx)
    } else {
      hideSelectionActions()
  }
  }, 10)
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

// ============ Moedict API 查詢工具 ============

interface MoedictResult {
  pinyin: string | null
  definition: string | null
}

// 清理 moedict 文本（移除標記符號）
function cleanMoedictText(text: string): string {
  return text
    .replace(/[\[\]{}（）]/g, '')
    .replace(/[｜]/g, '')
    .trim()
}

// 緩存管理（使用 localStorage）
const moedictCache = {
  get(key: string): MoedictResult | null {
    try {
      const cached = localStorage.getItem(`moedict:${key}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        // 檢查是否過期（7天）
        if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return parsed.data
        }
      }
    } catch (e) {
      console.error('讀取 moedict 緩存失敗:', e)
    }
    return null
  },
  
  set(key: string, data: MoedictResult) {
    try {
      localStorage.setItem(`moedict:${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error('保存 moedict 緩存失敗:', e)
    }
  }
}

// 查詢 moedict（單字或詞語）
async function fetchMoedictWord(word: string): Promise<MoedictResult | null> {
  // 檢查緩存
  const cached = moedictCache.get(word)
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(`https://www.moedict.tw/uni/${encodeURIComponent(word)}`)
    if (!response.ok) {
      // 緩存失敗結果（避免重複請求）
      moedictCache.set(word, { pinyin: null, definition: null })
      return null
    }
    
    const data = await response.json()
    
    // 判斷是單字還是詞語
    const isWord = word.length > 1
    
    let pinyin: string | null = null
    let definition: string | null = null
    
    if (isWord) {
      // 詞語：使用 h[0].p 和 h[0].d[0].f
      if (data.h && data.h[0]) {
        pinyin = data.h[0].p || null
        if (data.h[0].d && data.h[0].d[0]) {
          definition = cleanMoedictText(data.h[0].d[0].f || '')
        }
      }
    } else {
      // 單字：使用 heteronyms[0].pinyin 和 heteronyms[0].definitions[0].def
      if (data.heteronyms && data.heteronyms[0]) {
        pinyin = data.heteronyms[0].pinyin || 
                 data.heteronyms[0].bopomofo2 || 
                 data.heteronyms[0].bopomofo || 
                 null
        if (data.heteronyms[0].definitions && data.heteronyms[0].definitions[0]) {
          definition = cleanMoedictText(data.heteronyms[0].definitions[0].def || '')
        }
      }
    }
    
    const result: MoedictResult = { pinyin, definition }
    
    // 保存到緩存
    moedictCache.set(word, result)
    
    return result
  } catch (error) {
    console.error('查詢 moedict 失敗:', error)
    // 緩存失敗結果
    moedictCache.set(word, { pinyin: null, definition: null })
    return null
  }
}

// 降級策略：詞語查詢 → 逐字查詢
async function fetchMoedictWithFallback(term: string): Promise<MoedictResult> {
  // 1. 先查詢詞語（如果是多字）
  if (term.length > 1) {
    const wordResult = await fetchMoedictWord(term)
    if (wordResult && (wordResult.pinyin || wordResult.definition)) {
      return wordResult
    }
  }
  
  // 2. 逐字查詢
  const charResults = await Promise.all(
    term.split('').map(char => fetchMoedictWord(char))
  )
  
  // 組合拼音（過濾 null，用空格分隔）
  const pinyins = charResults
    .map(r => r?.pinyin)
    .filter((p): p is string => p !== null && p !== undefined)
  
  // 合併多個釋義（用分號分隔，讓用戶自己組合編輯）
  const definitions = charResults
    .map(r => r?.definition)
    .filter((d): d is string => d !== null && d !== undefined)
  
  return {
    pinyin: pinyins.length > 0 ? pinyins.join(' ') : null,
    definition: definitions.length > 0 ? definitions.join('；') : null  // 用中文分號分隔
  }
}

// 打開添加註釋對話框
async function openAnnotationDialog() {
  editingAnnotationId.value = null
  annotationForm.selectedText = selectionActions.text
  annotationForm.startIndex = selectionActions.startIndex
  annotationForm.endIndex = selectionActions.endIndex
  annotationForm.annotation = ''
  annotationForm.pinyin = ''
  feedback.value = null
  
  hideSelectionActions()
  isAnnotationOpen.value = true
  
  // 自動查詢 moedict
  const term = selectionActions.text.trim()
  if (term) {
    isFetchingMoedict.value = true
    feedback.value = '正在查詢拼音和釋義...'
    
    try {
      const result = await fetchMoedictWithFallback(term)
      
      if (result.pinyin) {
        annotationForm.pinyin = result.pinyin
      }
      if (result.definition) {
        annotationForm.annotation = result.definition
      }
      
      if (result.pinyin || result.definition) {
        feedback.value = '已自動填充拼音和釋義，您可以編輯修改'
      } else {
        feedback.value = '未找到拼音和釋義，請手動輸入'
      }
    } catch (error) {
      console.error('自動填充拼音和釋義失敗:', error)
      feedback.value = '查詢拼音和釋義失敗，請手動輸入'
    } finally {
      isFetchingMoedict.value = false
    }
  }
}

// 打開編輯註釋對話框
function openEditAnnotationDialog(annotation: TextAnnotation) {
  editingAnnotationId.value = annotation.id
  annotationForm.selectedText = annotation.term
  annotationForm.startIndex = annotation.start_index
  annotationForm.endIndex = annotation.end_index
  annotationForm.annotation = annotation.annotation
  annotationForm.pinyin = annotation.pinyin || ''
  feedback.value = null
  
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

// 添加或更新註釋
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
    
    if (editingAnnotationId.value) {
      // 更新現有註釋
      await readingStore.updateAnnotation(
        editingAnnotationId.value,
        annotationForm.annotation.trim(),
        annotationForm.pinyin.trim() || null
      )
      isAnnotationOpen.value = false
      alert('註釋更新成功！')
    } else {
      // 添加新註釋
    await readingStore.addAnnotation({
      text_id: selectedText.value.id,
      start_index: annotationForm.startIndex,
      end_index: annotationForm.endIndex,
      term: annotationForm.selectedText,
      annotation: annotationForm.annotation.trim(),
        pinyin: annotationForm.pinyin.trim() || null,
    })
    
    isAnnotationOpen.value = false
    alert('註釋添加成功！')
    }
    
    // 重新獲取文章詳情以更新註釋列表
    await readingStore.fetchTextDetail(selectedText.value.id)
    
  } catch (err: any) {
    feedback.value = err?.message || (editingAnnotationId.value ? '更新註釋失敗' : '添加註釋失敗')
  } finally {
    isSubmitting.value = false
    editingAnnotationId.value = null
  }
}

// AI 生成註釋（整篇文章）
async function handleGenerateAnnotations() {
  if (!selectedText.value) {
    feedback.value = '請先選擇一篇文章'
    return
  }
  
  try {
    isGeneratingAnnotations.value = true
    feedback.value = null
    
    // 準備兩份內容：
    // 1. contentForAI：保留斷句符號，幫助 AI 理解句子結構
    // 2. pureContent：純文字（不含 |、\n、\r），用於位置索引計算
    
    const content = selectedText.value.content
    const separator = content.includes('||') ? '||' : /\n\n+/
    const rawParagraphs = content.split(separator)
    
    // 給 AI 的內容：保留斷句符號，移除換行符
    let contentForAI = ''
    // 位置計算用的純文字：移除所有 |、\n、\r
    let pureContent = ''
    
    for (const rawPara of rawParagraphs) {
      const trimmedPara = rawPara.replace(/[\|\s]+$/, '')  // 移除段落末尾的 | 和空白
      
      // 構建給 AI 的內容（保留 |）
      const aiPara = trimmedPara.replace(/[\n\r]/g, '')  // 只移除換行
      if (aiPara) {
        contentForAI += (contentForAI ? '\n\n' : '') + aiPara
      }
      
      // 構建純文字（用於位置計算）
      for (const char of trimmedPara) {
        if (char !== '|' && char !== '\n' && char !== '\r') {
          pureContent += char
        }
      }
    }
    
    // 調用 Edge Function（傳入帶斷句符的內容）
    const supabase = useSupabase()
    const { data, error } = await supabase.functions.invoke('generate-annotations', {
      body: {
        content: contentForAI,  // 傳入帶斷句符的內容，幫助 AI 理解
        title: selectedText.value.title,
        author: selectedText.value.author
      }
    })
    
    if (error) throw error
    
    if (data.success && data.data) {
      // AI 返回的註釋不含位置，需要前端匹配
      const aiAnnotations: AIAnnotation[] = data.data
      const matched = matchAnnotationsWithContext(aiAnnotations, pureContent)
      
      // 直接保存，不預覽
      if (matched.length > 0) {
        // 1. 先刪除舊的 AI 生成的未編輯註釋
        await readingStore.deleteAIGeneratedAnnotations(selectedText.value.id)
        
        // 2. 逐個保存新註釋（跳過與用戶註釋重疊的）
        let successCount = 0
        let skippedCount = 0
        let errorCount = 0
        
        for (const ann of matched) {
          try {
            // 檢查是否與用戶註釋重疊
            const hasOverlap = await readingStore.checkAnnotationOverlap(
              selectedText.value.id,
              ann.start_index,
              ann.end_index
            )
            
            if (hasOverlap) {
              // 跳過與用戶註釋重疊的新註釋
              skippedCount++
              continue
            }
            
            // 保存新註釋（標記為 AI 生成）
            await readingStore.addAnnotation({
              text_id: selectedText.value.id,
              start_index: ann.start_index,
              end_index: ann.end_index,
              term: ann.term,
              annotation: ann.annotation,
              pinyin: ann.pinyin || null,
              source: 'ai',  // 標記為 AI 生成
            })
            successCount++
          } catch (err) {
            console.error('保存註釋失敗:', ann.term, err)
            errorCount++
          }
        }
        
        // 重新獲取文章詳情
        await readingStore.fetchTextDetail(selectedText.value.id)
        
        // 顯示結果
        let message = `成功生成並保存 ${successCount} 個註釋`
        if (aiAnnotations.length - matched.length > 0) {
          message += `（${aiAnnotations.length - matched.length} 個無法匹配已跳過）`
        }
        if (skippedCount > 0) {
          message += `，跳過 ${skippedCount} 個（與用戶註釋重疊）`
        }
        if (errorCount > 0) {
          message += `，${errorCount} 個失敗`
        }
        feedback.value = message
      } else {
        feedback.value = `未生成有效註釋（${aiAnnotations.length} 個無法匹配）`
      }
    } else {
      throw new Error(data.error || '生成註釋失敗')
    }
    
  } catch (err: any) {
    console.error('生成註釋失敗:', err)
    // 嘗試從錯誤中提取更詳細的信息
    let errorMessage = '生成註釋時發生錯誤'
    if (err?.message) {
      errorMessage = err.message
    } else if (err?.error) {
      errorMessage = err.error
    } else if (typeof err === 'string') {
      errorMessage = err
    }
    feedback.value = errorMessage
    alert(`生成註釋失敗：${errorMessage}`)
  } finally {
    isGeneratingAnnotations.value = false
  }
}

// AI 生成註釋（選中片段）
async function handleGenerateAnnotationsForSelection() {
  if (!selectedText.value || !selectionActions.text) {
    feedback.value = '請先選取要生成註釋的文字'
    return
  }
  
  try {
    isGeneratingAnnotations.value = true
    feedback.value = null
    hideSelectionActions()  // 關閉選中工具欄
    
    const originalContent = selectedText.value.content
    const selectionStart = selectionActions.startIndex
    const selectionEnd = selectionActions.endIndex
    
    // 1. 從原文中提取選中片段（保留斷句符號）
    // 參考 handleExtract 的邏輯，確保斷句符號正確保留
    let fragmentContent = ''  // 帶斷句符的片段內容（給 AI）
    let fragmentPureContent = ''  // 純文字片段（用於位置匹配）
    let pureIdx = 0
    
    for (let i = 0; i < originalContent.length; i++) {
      const char = originalContent[i]
      if (char === '|') {
        // 斷句符號：如果下一個字符在選中範圍內，保留這個斷句符
        // 使用 > startIndex 和 <= endIndex 的邏輯，與 handleExtract 保持一致
        if (pureIdx > selectionStart && pureIdx <= selectionEnd) {
          fragmentContent += char
        }
      } else if (char !== '\n' && char !== '\r') {
        // 普通字符：如果在選中範圍內，加入兩個版本
        if (pureIdx >= selectionStart && pureIdx < selectionEnd) {
          fragmentContent += char
          fragmentPureContent += char
        }
        pureIdx++
      } else {
        // 換行符：如果在選中範圍內，只加入給 AI 的版本（保留上下文）
        if (pureIdx >= selectionStart && pureIdx < selectionEnd) {
          fragmentContent += char
        }
      }
    }
    
    // 2. 調用 Edge Function（傳入選中片段，包含標題和作者作為上下文）
    const supabase = useSupabase()
    const { data, error } = await supabase.functions.invoke('generate-annotations', {
      body: {
        content: fragmentContent,  // 傳入帶斷句符的片段內容
        title: selectedText.value.title,  // 傳入標題作為上下文
        author: selectedText.value.author  // 傳入作者作為上下文
      }
    })
    
    if (error) throw error
    
    if (data.success && data.data) {
      // 3. AI 返回的註釋位置是相對於片段的，需要轉換為整篇文章的絕對位置
      const aiAnnotations: AIAnnotation[] = data.data
      
      // 在片段純文字中匹配位置
      const matched = matchAnnotationsWithContext(aiAnnotations, fragmentPureContent)
      
      // 4. 將片段內的位置轉換為整篇文章的絕對位置
      // 關鍵：加上 selectionStart 偏移量
      const absoluteMatched = matched.map(ann => ({
        ...ann,
        start_index: ann.start_index + selectionStart,
        end_index: ann.end_index + selectionStart
      }))
      
      // 5. 保存註釋（跳過與用戶註釋重疊的）
      if (absoluteMatched.length > 0) {
        let successCount = 0
        let skippedCount = 0
        let errorCount = 0
        
        for (const ann of absoluteMatched) {
          try {
            // 檢查是否與用戶註釋重疊
            const hasOverlap = await readingStore.checkAnnotationOverlap(
              selectedText.value.id,
              ann.start_index,
              ann.end_index
            )
            
            if (hasOverlap) {
              // 跳過與用戶註釋重疊的新註釋
              skippedCount++
              continue
            }
            
            // 保存新註釋（標記為 AI 生成）
            await readingStore.addAnnotation({
              text_id: selectedText.value.id,
              start_index: ann.start_index,
              end_index: ann.end_index,
              term: ann.term,
              annotation: ann.annotation,
              pinyin: ann.pinyin || null,
              source: 'ai',  // 標記為 AI 生成
            })
            successCount++
          } catch (err) {
            console.error('保存註釋失敗:', ann.term, err)
            errorCount++
          }
        }
        
        // 重新獲取文章詳情
        await readingStore.fetchTextDetail(selectedText.value.id)
        
        // 顯示結果
        let message = `成功為選中片段生成並保存 ${successCount} 個註釋`
        if (aiAnnotations.length - matched.length > 0) {
          message += `（${aiAnnotations.length - matched.length} 個無法匹配已跳過）`
        }
        if (skippedCount > 0) {
          message += `，跳過 ${skippedCount} 個（與用戶註釋重疊）`
        }
        if (errorCount > 0) {
          message += `，${errorCount} 個失敗`
        }
        feedback.value = message
      } else {
        feedback.value = `未生成有效註釋（${aiAnnotations.length} 個無法匹配）`
      }
    } else {
      throw new Error(data.error || '生成註釋失敗')
    }
    
  } catch (err: any) {
    console.error('生成註釋失敗:', err)
    let errorMessage = '生成註釋時發生錯誤'
    if (err?.message) {
      errorMessage = err.message
    } else if (err?.error) {
      errorMessage = err.error
    } else if (typeof err === 'string') {
      errorMessage = err
    }
    feedback.value = errorMessage
    alert(`生成註釋失敗：${errorMessage}`)
  } finally {
    isGeneratingAnnotations.value = false
  }
}

// 批量保存生成的註釋
async function handleSaveGeneratedAnnotations() {
  if (!selectedText.value || generatedAnnotations.value.length === 0) {
    return
  }
  
  try {
    isSubmitting.value = true
    feedback.value = null
    
    // 1. 先刪除舊的 AI 生成的未編輯註釋
    await readingStore.deleteAIGeneratedAnnotations(selectedText.value.id)
    
    // 2. 逐個保存新註釋（跳過與用戶註釋重疊的）
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const ann of generatedAnnotations.value) {
      try {
        // 檢查是否與用戶註釋重疊
        const hasOverlap = await readingStore.checkAnnotationOverlap(
          selectedText.value.id,
          ann.start_index,
          ann.end_index
        )
        
        if (hasOverlap) {
          // 跳過與用戶註釋重疊的新註釋
          skippedCount++
          continue
        }
        
        // 保存新註釋（標記為 AI 生成）
        await readingStore.addAnnotation({
          text_id: selectedText.value.id,
          start_index: ann.start_index,
          end_index: ann.end_index,
          term: ann.term,
          annotation: ann.annotation,
          pinyin: ann.pinyin || null,
          source: 'ai',  // 標記為 AI 生成
        })
        successCount++
      } catch (err) {
        console.error('保存註釋失敗:', ann.term, err)
        errorCount++
      }
    }
    
    // 重新獲取文章詳情
    await readingStore.fetchTextDetail(selectedText.value.id)
    
    // 關閉預覽
    isPreviewOpen.value = false
    generatedAnnotations.value = []
    
    // 顯示結果
    let message = `成功保存 ${successCount} 個註釋`
    if (skippedCount > 0) {
      message += `，跳過 ${skippedCount} 個（與用戶註釋重疊）`
    }
    if (errorCount > 0) {
      message += `，${errorCount} 個失敗`
    }
    alert(message)
    
  } catch (err: any) {
    feedback.value = err?.message || '保存註釋失敗'
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
  return content.slice(0, 40) + '...'
}

/**
 * 將帶標點的古文轉換為內部格式
 */
function convertPunctuationToBreaks(rawContent: string): string {
  const punctuationRegex = /[。，、；：！？,.;:!?]/g
  const removeRegex = /[「」『』""''（）()【】\[\]《》<>·—…～\-]/g
  
  // 按換行符分割段落（支持 \n\n 或單個 \n）
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
  
  // 使用 \n\n 作為段落分隔符
  return processedLines.join('\n\n')
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

// 檢測移動設備
function detectMobile() {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768 ||
                   ('ontouchstart' in window || navigator.maxTouchPoints > 0)
}

onMounted(async () => {
  // 檢測移動設備
  detectMobile()
  
  // 監聽窗口大小變化
  window.addEventListener('resize', detectMobile)
  
  // 移動設備：添加點擊外部關閉功能
  if (isMobile.value) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('touchend', handleClickOutside)
  }
  
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

// 清理
onUnmounted(() => {
  // 移除事件監聽器
  window.removeEventListener('resize', detectMobile)
  if (isMobile.value) {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('touchend', handleClickOutside)
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
                    <th style="width: auto; min-width: 200px">標題</th>
                    <th style="width: 80px">作者</th>
                    <th style="width: 70px">字數</th>
                    <th style="width: 100px">建立日期</th>
                    <th style="width: 120px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="text in textsInCategory" 
                    :key="text.id"
                    class="text-row"
                  >
                    <td @click="openTextDetail(text)">
                      <p class="text-title">{{ text.title }}</p>
                      <p class="text-preview">{{ getPreview(text) }}</p>
                    </td>
                    <td @click="openTextDetail(text)">{{ text.author || '佚名' }}</td>
                    <td @click="openTextDetail(text)">{{ getWordCount(text) }}</td>
                    <td @click="openTextDetail(text)">{{ formatDate(text.created_at) }}</td>
                    <td class="actions" @click.stop>
                      <button class="ghost-btn" @click="openEditFormForText(text)">編輯</button>
                      <button class="ghost-btn danger" @click="handleDeleteText(text)">刪除</button>
                    </td>
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
          <button 
            class="edamame-btn edamame-btn-primary"
            @click="handleGenerateAnnotations"
            :disabled="isGeneratingAnnotations || !selectedText"
            title="使用 AI 自動生成註釋（含拼音）"
          >
            {{ isGeneratingAnnotations ? '🤖 AI 生成中...' : '🤖 AI 生成註釋' }}
          </button>
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
        <!-- 選取 >= 10 個字：顯示提取為練習和 AI 生成註釋 -->
        <template v-if="selectionActions.text.length >= 10">
          <button 
            class="toolbar-btn extract" 
            @click="openExtractDialog"
          >
            📤 提取為斷句練習
          </button>
          <button 
            class="toolbar-btn ai-annotate" 
            @click="handleGenerateAnnotationsForSelection"
            :disabled="isGeneratingAnnotations"
          >
            {{ isGeneratingAnnotations ? '🤖 生成中...' : '🤖 AI生成註釋' }}
          </button>
        </template>
        <!-- 選取 < 10 個字：顯示添加註釋 -->
        <button 
          v-else 
          class="toolbar-btn annotate" 
          @click="openAnnotationDialog"
        >
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
          v-for="(paragraph, paraIdx) in displayParagraphs" 
          :key="paraIdx" 
          class="paragraph-block"
        >
          <div class="reading-line">
            <span
              v-for="(char, localIdx) in paragraph.chars"
              :key="localIdx"
              class="char-unit"
            >
              <!-- 字符 -->
              <span 
                class="char"
                :class="{ 
                  'has-annotation': getAnnotationForChar(paragraph.startIdx + localIdx),
                  'annotation-hovered': isCharInHoveredAnnotation(paragraph.startIdx + localIdx),
                  'annotation-start': isAnnotationStart(paragraph.startIdx + localIdx),
                  'annotation-end': isAnnotationEnd(paragraph.startIdx + localIdx)
                }"
                :data-global-index="paragraph.startIdx + localIdx"
                @mouseenter="(e) => handleCharMouseEnter(paragraph.startIdx + localIdx, e)"
                @mouseleave="handleCharMouseLeave"
                @click="(e) => handleCharClick(paragraph.startIdx + localIdx, e)"
                @touchend="(e) => handleCharClick(paragraph.startIdx + localIdx, e)"
              >{{ char }}</span>
            </span>
          </div>
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
            <div class="annotation-term">
              {{ ann.term }}
              <span v-if="ann.pinyin" class="annotation-pinyin">（{{ ann.pinyin }}）</span>
            </div>
            <div class="annotation-content">{{ ann.annotation }}</div>
            <div class="annotation-actions">
              <button class="edit-btn" @click="openEditAnnotationDialog(ann)" title="編輯">
                ✏️
              </button>
            <button class="delete-btn" @click="handleDeleteAnnotation(ann)" title="刪除">
              ✕
            </button>
            </div>
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
                <span>文集（點擊選擇）*</span>
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
    
    <!-- ========== AI 生成註釋預覽 Modal ========== -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isPreviewOpen" class="modal-backdrop" @click.self="isPreviewOpen = false">
          <div class="modal-card edamame-glass" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <header>
              <h3>🤖 AI 生成的註釋預覽 ({{ generatedAnnotations.length }} 個)</h3>
              <button class="close-btn" @click="isPreviewOpen = false">×</button>
            </header>
            
            <div class="modal-body">
              <p class="preview-hint">請檢查以下註釋，確認無誤後點擊「全部保存」</p>
              
              <div class="generated-annotations-list">
                <div 
                  v-for="(ann, idx) in generatedAnnotations" 
                  :key="idx" 
                  class="generated-annotation-item"
                >
                  <div class="annotation-header">
                    <span class="annotation-term">
                      {{ ann.term }}
                      <span v-if="ann.pinyin" class="annotation-pinyin">（{{ ann.pinyin }}）</span>
                    </span>
                    <span class="annotation-position">位置：{{ ann.start_index }}-{{ ann.end_index }}</span>
                  </div>
                  <div class="annotation-content">{{ ann.annotation }}</div>
                </div>
              </div>
              
              <p v-if="feedback" class="feedback">{{ feedback }}</p>
            </div>
            
            <footer>
              <button class="edamame-btn edamame-btn-secondary" @click="isPreviewOpen = false">
                取消
              </button>
              <button 
                class="edamame-btn edamame-btn-primary" 
                :disabled="isSubmitting || generatedAnnotations.length === 0"
                @click="handleSaveGeneratedAnnotations"
              >
                {{ isSubmitting ? '保存中...' : `全部保存 (${generatedAnnotations.length})` }}
              </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
    
    <!-- ========== 添加註釋 Modal ========== -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="isAnnotationOpen" class="modal-backdrop" @click.self="isAnnotationOpen = false; editingAnnotationId = null">
          <div class="modal-card edamame-glass">
            <header>
              <h3>{{ editingAnnotationId ? '✏️ 編輯註釋' : '📝 添加註釋' }}</h3>
              <button class="close-btn" @click="isAnnotationOpen = false; editingAnnotationId = null">×</button>
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
              
              <label>
                <span>拼音（可選，用於難讀字）</span>
                <input 
                  v-model="annotationForm.pinyin" 
                  type="text" 
                  placeholder="例如：zhì"
                  :disabled="isFetchingMoedict"
                />
              </label>
              
              <div v-if="isFetchingMoedict" class="loading-hint">
                <span class="loading-spinner">⏳</span>
                正在查詢拼音和釋義...
              </div>
              
              <p v-if="feedback && !isFetchingMoedict" class="feedback">{{ feedback }}</p>
            </div>
            
            <footer>
              <button class="edamame-btn edamame-btn-secondary" @click="isAnnotationOpen = false; editingAnnotationId = null">
                取消
              </button>
              <button 
                class="edamame-btn edamame-btn-primary" 
                :disabled="isSubmitting"
                @click="handleAddAnnotation"
              >
                {{ isSubmitting ? (editingAnnotationId ? '更新中...' : '添加中...') : (editingAnnotationId ? '確認更新' : '確認添加') }}
              </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
    
    <!-- 註釋 Tooltip -->
    <Teleport to="body">
      <div 
        v-if="activeTooltip"
        class="annotation-tooltip"
        :class="{ 'mobile-tooltip': isMobile }"
        :style="{ 
          left: activeTooltip.x + 'px', 
          top: (activeTooltip.y + 16) + 'px' 
        }"
        @click.stop
      >
        <button 
          v-if="isMobile" 
          class="tooltip-close-btn"
          @click="hideTooltip"
          aria-label="關閉註釋"
        >
          ✕
        </button>
        <div class="tooltip-term">
          {{ activeTooltip.annotation.term }}
          <span v-if="activeTooltip.annotation.pinyin" class="tooltip-pinyin">（{{ activeTooltip.annotation.pinyin }}）</span>
        </div>
        <div class="tooltip-content">{{ activeTooltip.annotation.annotation }}</div>
      </div>
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

/* 作者欄固定寬度，防止換行 */
td:nth-child(2) {
  width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.text-row:hover {
  background: rgba(139, 178, 79, 0.08);
}

.text-row .actions {
  cursor: default;
}

.text-row .actions:hover {
  background: transparent;
}

.ghost-btn {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-full);
  padding: 0.25rem 0.6rem;
  background: transparent;
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--duration-base) ease;
  margin-right: 0.5rem;
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

.toolbar-btn.ai-annotate {
  background: rgba(139, 92, 246, 0.15);
  color: #6b21a8;
}

.toolbar-btn.ai-annotate:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.25);
}

.toolbar-btn.ai-annotate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
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

/* 段落區塊（用於顯示註釋） */
.paragraph-block {
  margin-bottom: 1.5rem;
}

.reading-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.12em;
  line-height: 2;
}

.char-unit {
  display: inline-block;
  position: relative;
}

.char {
  font-size: var(--text-xl);
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
  color: var(--color-neutral-800);
  transition: all 0.2s ease;
  letter-spacing: 0.12em;
}

/* 帶註釋的字符 */
.char.has-annotation {
  color: var(--color-primary-700);
  cursor: help;
  transition: all 0.15s ease;
  position: relative;
  user-select: none; /* 防止移動設備上選中文字 */
  -webkit-tap-highlight-color: transparent; /* 移除移動設備點擊高亮 */
}

/* 移動設備上的註釋字符 */
@media (max-width: 768px) {
  .char.has-annotation {
    cursor: pointer;
    touch-action: manipulation; /* 優化觸摸響應 */
  }
}

/* 使用偽元素創建連續底線 */
.char.has-annotation::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: -0.12em; /* 延伸到字間距區域 */
  height: 1.5px;
  background: repeating-linear-gradient(
    to right,
    var(--color-primary-400) 0,
    var(--color-primary-400) 3px,
    transparent 3px,
    transparent 5px
  );
}

/* 最後一個字的底線不延伸 */
.char.has-annotation.annotation-end::after {
  right: 0;
}

/* 整個詞組懸停時高亮 */
.char.has-annotation.annotation-hovered {
  color: var(--color-primary-800);
  background: rgba(139, 178, 79, 0.15);
}

/* 詞組首尾字的圓角 */
.char.has-annotation.annotation-hovered.annotation-start {
  border-radius: 3px 0 0 3px;
}

.char.has-annotation.annotation-hovered.annotation-end {
  border-radius: 0 3px 3px 0;
}

/* 單字註釋的圓角 */
.char.has-annotation.annotation-hovered.annotation-start.annotation-end {
  border-radius: 3px;
}

/* 註釋 Tooltip */
.annotation-tooltip {
  position: fixed;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(139, 178, 79, 0.25);
  border-radius: 4px;
  box-shadow: 0 3px 12px rgba(85, 139, 47, 0.15), 0 1px 4px rgba(0, 0, 0, 0.05);
  padding: 0.5rem 0.75rem;
  max-width: 280px;
  animation: tooltip-in 0.12s ease-out;
  font-size: var(--text-sm);
  pointer-events: auto; /* 移動設備上允許交互 */
}

/* 移動設備上的 Tooltip */
.annotation-tooltip.mobile-tooltip {
  position: fixed;
  max-width: calc(100vw - 2rem);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 178, 79, 0.4);
}

/* Tooltip 關閉按鈕 */
.tooltip-close-btn {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-600);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tooltip-close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

.tooltip-close-btn:active {
  transform: scale(0.95);
}

/* 移動設備上 tooltip 內容需要右側留出關閉按鈕空間 */
.annotation-tooltip.mobile-tooltip .tooltip-term,
.annotation-tooltip.mobile-tooltip .tooltip-content {
  padding-right: 1.5rem;
}

.tooltip-term {
  font-weight: var(--font-medium);
  margin-bottom: 0.25rem;
  color: var(--color-primary-600);
}

.tooltip-pinyin {
  font-size: 0.9em;
  color: var(--color-primary-500);
  margin-left: 0.25rem;
  font-weight: var(--font-normal);
}

.tooltip-content {
  color: var(--color-neutral-700);
}

@keyframes tooltip-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.annotation-pinyin {
  font-size: 0.9em;
  color: var(--color-primary-500);
  font-weight: var(--font-normal);
  margin-left: 0.25rem;
}

.annotation-content {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
  line-height: 1.5;
}

.annotation-actions {
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.edit-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 12px;
  color: #1e40af;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.2);
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
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
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

.loading-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-md);
  color: var(--color-primary-600);
  font-size: var(--text-sm);
  margin-top: 0.5rem;
}

.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
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
