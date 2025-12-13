<template>
  <div class="room-create">
    <div class="card">
      <div class="card-body">
        <h2 class="card-title text-hand-title">創建房間</h2>

        <form @submit.prevent="handleSubmit">
          <!-- 房間主題 -->
          <div class="form-group room-theme-group">
            <label>房間主題</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="輸入房間主題（例如：古代作家、紅樓夢等）"
              maxlength="50"
              required
              class="room-theme-input"
            />
          </div>

        <!-- 主題詞句庫 -->
        <div class="form-group">
          <label class="library-label">主題詞句庫</label>
          <div v-if="loadingCollections" class="text-small text-secondary">詞句庫載入中...</div>
          <div v-else class="word-library-dropdown">
            <!-- 下拉選擇器 -->
            <div class="dropdown-wrapper">
              <div 
                class="dropdown-trigger"
                :class="{ 'dropdown-open': isDropdownOpen }"
                @click="toggleDropdown"
              >
                <span class="dropdown-text">
                  {{ selectedCollection ? selectedCollection.title : '選擇主題或一鍵加入...' }}
                </span>
                <span class="dropdown-arrow">{{ isDropdownOpen ? '▲' : '▼' }}</span>
              </div>

              <!-- 下拉菜單 -->
              <div v-if="isDropdownOpen" class="dropdown-menu">
                <div
                  v-for="collection in collections"
                  :key="collection.id"
                  class="dropdown-item"
                  @click.stop="selectCollection(collection.id)"
                >
                  <div class="dropdown-item-content">
                    <div class="dropdown-item-main">
                      <div class="dropdown-item-title">{{ collection.title }}</div>
                      <div class="dropdown-item-desc">{{ collection.description }}</div>
                      <div class="dropdown-item-count">{{ collection.entry_count }} 條</div>
                    </div>
                    <button
                      type="button"
                      class="paper-btn btn-primary btn-small dropdown-quick-add"
                      @click.stop="handleQuickAdd(collection.id)"
                      :disabled="collection.entry_count === 0"
                    >
                      一鍵加入
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 詳情頁面（選中主題後顯示） -->
            <div v-if="selectedCollection && !isDropdownOpen" class="collection-detail-panel">
              <div class="detail-header">
                <div class="detail-title-section">
                  <h4 class="detail-title">📚 {{ selectedCollection.title }}</h4>
                  <p class="detail-desc">{{ selectedCollection.description }}</p>
                  <span class="detail-count">共 {{ selectedCollection.entry_count }} 條</span>
                </div>
                <button
                  type="button"
                  class="paper-btn btn-small"
                  @click="closeDetailPanel"
                >
                  關閉
                </button>
              </div>

              <!-- 詞條列表 -->
              <div class="detail-entries">
                <div v-if="loadingEntries[selectedCollection.id]" class="text-small text-secondary text-center">
                  詞條載入中...
                </div>
                <div v-else-if="(entriesMap[selectedCollection.id] || []).length === 0" class="text-small text-secondary text-center">
                  該主題暫無詞條
                </div>
                <div v-else class="entries-list">
                  <div
                    v-for="entry in entriesMap[selectedCollection.id] || []"
                    :key="entry.id"
                    class="entry-item"
                  >
                    <label class="entry-checkbox">
                      <input
                        type="checkbox"
                        :checked="isEntrySelected(selectedCollection.id, entry.id)"
                        @change="toggleEntrySelection(selectedCollection.id, entry.id)"
                      />
                      <span class="entry-text">{{ entry.text }}</span>
                      <span v-if="entry.category" class="entry-category">({{ entry.category }})</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- 操作按鈕 -->
              <div class="detail-actions">
                <button
                  type="button"
                  class="paper-btn btn-primary btn-small"
                  :disabled="!hasSelection(selectedCollection.id)"
                  @click="addSelectedEntries(selectedCollection.id)"
                >
                  加入已勾選
                </button>
                <button
                  type="button"
                  class="paper-btn btn-secondary btn-small"
                  @click="addWholeCollection(selectedCollection.id)"
                  :disabled="selectedCollection.entry_count === 0"
                >
                  全部加入
                </button>
                <button
                  v-if="hasSelection(selectedCollection.id)"
                  type="button"
                  class="paper-btn btn-link btn-small"
                  @click="clearSelection(selectedCollection.id)"
                >
                  清除
                </button>
              </div>
            </div>

            <div v-if="infoMessage" class="text-small info-hint margin-top-small">{{ infoMessage }}</div>
          </div>
        </div>

          <!-- 自定義詞語 -->
          <div class="form-group words-input-group">
            <label>自定義詞語（至少 6 個，每個 1-32 字符，最多 600 字符）</label>
            <textarea
              v-model="form.wordsText"
              rows="6"
              placeholder="輸入詞語，用逗號（，或,）或換行分隔&#10;例如：春天，友誼，勇氣"
              @input="handleWordsInput"
              class="words-textarea"
            ></textarea>
            <div class="words-stats">
              <div class="text-small">
                已輸入 {{ wordCount }} 個詞語，{{ totalChars }} / 600 字符
              </div>
              <div v-if="wordCount < 6" class="text-small" style="color: #e8590c;">
                還需要 {{ 6 - wordCount }} 個詞語
              </div>
            </div>
          </div>

          <!-- 遊戲設置 -->
          <div class="margin-top-medium game-settings-section">
            <h4 class="text-hand-title">遊戲設置</h4>

            <!-- 繪畫時間設置 -->
            <div class="form-group">
              <label>繪畫時間（秒）</label>
              <input
                v-model.number="form.settings.draw_time"
                type="number"
                min="60"
                max="180"
                required
              />
            </div>
          </div>

          <!-- 錯誤提示 -->
          <div v-if="error" class="alert alert-danger margin-top-small">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <div class="row flex-spaces submit-buttons-section">
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              class="paper-btn btn-primary"
            >
              {{ loading ? '創建中...' : '創建房間' }}
            </button>
            <button
              type="button"
              @click="$emit('cancel')"
              class="paper-btn btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoom } from '../composables/useRoom'
import { useWordLibrary } from '../composables/useWordLibrary'

const emit = defineEmits<{
  cancel: []
  created: [roomCode: string]
}>()

const { createRoom, loading } = useRoom()
const {
  collections,
  entriesMap,
  loadingCollections,
  loadingEntries,
  loadCollections,
  loadEntries,
} = useWordLibrary()

const form = ref({
  name: '',
  wordsText: '',
  settings: {
    draw_time: 60,
    rounds: 0, // 輪數將在開始遊戲時自動設定為房間人數
    word_count_per_round: 1, // 保留此字段以兼容數據庫，但不再顯示
    hints_count: 2,
  },
})

const error = ref<string | null>(null)
const infoMessage = ref<string | null>(null)
const isDropdownOpen = ref(false)
const selectedCollection = ref<{ id: string; title: string; description: string | null; entry_count: number } | null>(null)
const selectedEntries = ref<Record<string, Set<string>>>({})
const libraryWords = ref<Set<string>>(new Set())

// 解析詞語文本（支持中文逗號「，」和英文逗號「,」以及換行）
function parseWords(text: string): string[] {
  return text
    .split(/[，,\n]/) // 支持中文逗號、英文逗號和換行
    .map(word => word.trim())
    .filter(word => word.length > 0)
}

// 處理詞語輸入
function handleWordsInput() {
  error.value = null
}

// 計算屬性
const parsedWords = computed(() => parseWords(form.value.wordsText))
const uniqueWords = computed(() => {
  const seen = new Set<string>()
  const list: string[] = []
  for (const word of parsedWords.value) {
    if (!seen.has(word)) {
      seen.add(word)
      list.push(word)
    }
  }
  return list
})
const wordCount = computed(() => uniqueWords.value.length)
const totalChars = computed(() => form.value.wordsText.length)

const isFormValid = computed(() => {
  return (
    form.value.name.trim().length > 0 &&
    form.value.name.length <= 50 &&
    wordCount.value >= 6 &&
    totalChars.value <= 600 &&
    uniqueWords.value.every(word => word.length >= 1 && word.length <= 32)
    // 移除輪數驗證，輪數將在開始遊戲時自動設定
  )
})

// 裁剪已記錄的詞庫詞條，避免和當前文本不一致
function pruneLibraryWords() {
  const current = new Set(uniqueWords.value)
  libraryWords.value = new Set([...libraryWords.value].filter(word => current.has(word)))
}

// 管理選擇狀態
function isEntrySelected(collectionId: string, entryId: string) {
  return selectedEntries.value[collectionId]?.has(entryId) ?? false
}

function toggleEntrySelection(collectionId: string, entryId: string) {
  const set = selectedEntries.value[collectionId] || new Set<string>()
  if (set.has(entryId)) {
    set.delete(entryId)
  } else {
    set.add(entryId)
  }
  selectedEntries.value = { ...selectedEntries.value, [collectionId]: set }
}

function hasSelection(collectionId: string) {
  return (selectedEntries.value[collectionId]?.size || 0) > 0
}

function clearSelection(collectionId: string) {
  if (selectedEntries.value[collectionId]) {
    const updated = { ...selectedEntries.value }
    delete updated[collectionId]
    selectedEntries.value = updated
  }
}

// 將詞條加入輸入框並記錄來源
function addWordsToTextarea(newWords: string[]) {
  const trimmed = newWords.map(w => w.trim()).filter(Boolean)
  const existing = uniqueWords.value
  const seen = new Set(existing)
  const merged = [...existing]

  let addedCount = 0
  let skippedCount = 0

  trimmed.forEach(word => {
    if (!seen.has(word)) {
      seen.add(word)
      merged.push(word)
      addedCount++
    } else {
      skippedCount++
    }
  })

  form.value.wordsText = merged.join('\n')
  libraryWords.value = new Set([...libraryWords.value, ...trimmed])
  pruneLibraryWords()
  
  // 顯示加入結果，包含跳過重複的提示
  if (skippedCount > 0) {
    infoMessage.value = `已加入 ${addedCount} 個詞條，跳過 ${skippedCount} 個重複詞條`
  } else {
    infoMessage.value = `已加入 ${addedCount} 個詞條`
  }
}

// 切換下拉菜單
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
  if (!isDropdownOpen.value) {
    // 關閉下拉菜單時不清除選中的主題，保持詳情頁顯示
  }
}

// 選擇主題（打開詳情頁）
async function selectCollection(collectionId: string) {
  const collection = collections.value.find(c => c.id === collectionId)
  if (!collection) return

  selectedCollection.value = {
    id: collection.id,
    title: collection.title,
    description: collection.description,
    entry_count: collection.entry_count,
  }
  isDropdownOpen.value = false
  
  // 載入詞條
  await loadEntries(collectionId)
}

// 快速加入全部（點擊一鍵加入按鈕）
async function handleQuickAdd(collectionId: string) {
  isDropdownOpen.value = false
  await addWholeCollection(collectionId)
}

// 關閉詳情面板
function closeDetailPanel() {
  const collectionId = selectedCollection.value?.id
  if (collectionId) {
    clearSelection(collectionId)
  }
  selectedCollection.value = null
}

// 加入已勾選詞條
async function addSelectedEntries(collectionId: string) {
  const entries = entriesMap.value[collectionId] || await loadEntries(collectionId)
  const selection = selectedEntries.value[collectionId]
  if (!selection || selection.size === 0) return

  const selectedWords = entries?.filter(e => selection.has(e.id)).map(e => e.text) || []
  addWordsToTextarea(selectedWords)
  clearSelection(collectionId)
  // 加入後自動關閉詳情面板
  selectedCollection.value = null
}

// 一鍵加入整個詞庫
async function addWholeCollection(collectionId: string) {
  const entries = entriesMap.value[collectionId] || await loadEntries(collectionId)
  const texts = (entries || []).map(e => e.text)
  addWordsToTextarea(texts)
  clearSelection(collectionId)
  // 加入後自動關閉詳情面板
  selectedCollection.value = null
}

// 點擊外部關閉下拉菜單
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  const dropdown = target.closest('.word-library-dropdown')
  if (!dropdown && isDropdownOpen.value) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  loadCollections()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 提交表單
async function handleSubmit() {
  if (!isFormValid.value) {
    error.value = '請檢查表單輸入'
    return
  }

  error.value = null
  pruneLibraryWords()

  try {
    // 構建詞語列表
    const wordsList = uniqueWords.value.map(text => ({
      text,
      source: libraryWords.value.has(text) ? ('wordlist' as const) : ('custom' as const),
    }))

    const result = await createRoom({
      name: form.value.name.trim(),
      words: wordsList,
      settings: form.value.settings,
    })

    if (result.success && result.room) {
      emit('created', result.room.code)
    } else {
      error.value = result.error || '創建房間失敗'
      console.error('創建房間失敗:', result.error)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '創建房間時發生錯誤'
    console.error('創建房間異常:', err)
  }
}
</script>

<style scoped>
.room-create {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.library-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.5rem;
}

/* 房間主題輸入框 - 與下拉菜單寬度一致 */
.room-theme-group {
  width: 100%;
}

.room-theme-input {
  width: 100%;
  font-family: var(--font-body);
}

/* 下拉菜單容器 */
.word-library-dropdown {
  position: relative;
  width: 100%;
}

/* 自定義詞語輸入組 */
.words-input-group {
  margin-top: 1.5rem;
}

.words-textarea {
  width: 100%;
  font-family: var(--font-body);
  resize: vertical;
}

.words-stats {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* 遊戲設置區域 - 增加底部間距 */
.game-settings-section {
  margin-bottom: 2rem;
}

/* 提交按鈕區域 - 增加頂部間距 */
.submit-buttons-section {
  margin-top: 2rem;
}

.dropdown-wrapper {
  position: relative;
  width: 100%;
}

/* 下拉觸發器 */
.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.dropdown-trigger:hover {
  background: var(--bg-hover);
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.dropdown-trigger.dropdown-open {
  border-bottom: none;
  box-shadow: 3px 0 0 var(--shadow-color);
}

.dropdown-text {
  flex: 1;
  font-family: var(--font-body);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.dropdown-arrow {
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

/* 下拉菜單 */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-top: none;
  border-radius: 0;
  box-shadow: 3px 3px 0 var(--shadow-color);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 下拉菜單項 */
.dropdown-item {
  border-bottom: 2px dashed var(--border-light);
  transition: background 0.2s ease;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  gap: 1rem;
}

.dropdown-item-main {
  flex: 1;
  min-width: 0;
}

.dropdown-item-title {
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.dropdown-item-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.dropdown-item-count {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.dropdown-quick-add {
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  white-space: nowrap;
}

.dropdown-quick-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 詳情面板 */
.collection-detail-panel {
  margin-top: 1rem;
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  box-shadow: 4px 4px 0 var(--shadow-color);
  animation: slideDown 0.3s ease-out;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 2px dashed var(--border-light);
  gap: 1rem;
}

.detail-title-section {
  flex: 1;
}

.detail-title {
  font-size: 1.25rem;
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.detail-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
}

.detail-count {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

/* 詞條列表區域 */
.detail-entries {
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.entry-item {
  padding: 0.5rem;
  border-bottom: 1px dashed var(--border-light);
  transition: background 0.2s ease;
}

.entry-item:last-child {
  border-bottom: none;
}

.entry-item:hover {
  background: var(--bg-secondary);
}

.entry-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  width: 100%;
}

.entry-checkbox input[type="checkbox"] {
  cursor: pointer;
  flex-shrink: 0;
}

.entry-text {
  font-weight: 500;
  color: var(--text-primary);
  font-family: var(--font-body);
}

.entry-category {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-left: 0.25rem;
}

/* 詳情面板操作按鈕 */
.detail-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 2px dashed var(--border-light);
  flex-wrap: wrap;
}

.detail-actions .paper-btn {
  flex: 1;
  min-width: 100px;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.9rem;
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  text-decoration: underline;
  cursor: pointer;
}

.btn-link:hover {
  color: var(--text-primary);
}

.info-hint {
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 滾動條樣式 */
.dropdown-menu::-webkit-scrollbar,
.detail-entries::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track,
.detail-entries::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.dropdown-menu::-webkit-scrollbar-thumb,
.detail-entries::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover,
.detail-entries::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}
</style>

