<template>
  <div class="container margin-top-large word-admin">
    <div class="row flex-center">
      <div class="col-12 col-lg-10">
        <div class="card">
          <div class="card-body">
            <div class="header-row">
              <div>
                <h2 class="card-title text-hand-title">詞句庫管理</h2>
                <p class="text-secondary">
                  僅限指定管理員：gnoluy@gmail.com、ylzhang@isf.edu.hk
                </p>
              </div>
              <router-link to="/" class="paper-btn btn-secondary btn-small">返回首頁</router-link>
            </div>

            <div v-if="!authStore.user" class="alert alert-warning margin-top-small">
              請先登入 Google 帳號後再管理詞句庫。
            </div>
            <div v-else-if="!isAdmin" class="alert alert-danger margin-top-small">
              您沒有詞句庫管理權限，請使用指定管理員郵箱登入。
            </div>

            <div v-if="authStore.user && isAdmin" class="admin-body">
              <!-- 主題切換 -->
              <div class="panel">
                <div class="panel-header">
                  <div>
                    <h4 class="text-hand-title">主題列表</h4>
                    <p class="text-small text-secondary">可切換主題、啟用 / 停用</p>
                  </div>
                  <div class="inline-actions">
                    <button class="paper-btn btn-secondary btn-small" @click="refreshCollections">
                      重新載入
                    </button>
                  </div>
                </div>

                <div v-if="loadingCollections" class="text-small text-secondary">載入主題中...</div>
                <div v-else class="collection-row">
                  <select v-model="selectedCollectionId" @change="handleCollectionChange">
                    <option v-for="c in collections" :key="c.id" :value="c.id">
                      {{ c.title }}（{{ c.entry_count }} 條）
                    </option>
                  </select>
                  <label class="toggle">
                    <input
                      type="checkbox"
                      :checked="selectedCollection?.is_active"
                      @change="toggleActive"
                    />
                    <span>啟用主題</span>
                  </label>
                </div>
              </div>

              <!-- 新增主題 -->
              <div class="panel">
                <div class="panel-header">
                  <h4 class="text-hand-title">新增主題</h4>
                </div>
                <div class="row">
                  <div class="col-12 col-md-8">
                    <input v-model="newCollectionTitle" type="text" placeholder="主題名稱" />
                  </div>
                  <div class="col-12 col-md-4">
                    <button class="paper-btn btn-primary btn-block" @click="handleCreateCollection">
                      新增主題
                    </button>
                  </div>
                </div>
              </div>

              <!-- 條目管理 -->
              <div class="panel">
                <div class="panel-header">
                  <div>
                    <h4 class="text-hand-title">條目管理</h4>
                    <p class="text-small text-secondary">新增詞條後可立即被房間使用</p>
                  </div>
                </div>

                <!-- 手動新增 -->
                <div class="row align-center">
                  <div class="col-12 col-md-8">
                    <input v-model="newEntryText" type="text" placeholder="詞條（必填）" />
                  </div>
                  <div class="col-12 col-md-4">
                    <button class="paper-btn btn-primary btn-block" @click="handleAddEntry">
                      新增條目
                    </button>
                  </div>
                </div>

                <!-- AI 生成 -->
                <div class="ai-generate-section">
                  <div class="row align-center">
                    <div class="col-12 col-md-6">
                      <button 
                        class="paper-btn btn-ai btn-block" 
                        @click="handleAIGenerate"
                        :disabled="aiGenerating || !selectedCollection"
                      >
                        <span v-if="aiGenerating">⏳ 生成中...</span>
                        <span v-else>✨ AI 生成「{{ selectedCollection?.title || '' }}」詞條</span>
                      </button>
                    </div>
                    <div class="col-12 col-md-6">
                      <button 
                        v-if="aiGeneratedWords.length > 0"
                        class="paper-btn btn-success btn-block" 
                        @click="handleBatchAddAIWords"
                        :disabled="batchAdding"
                      >
                        {{ batchAdding ? '添加中...' : `批量添加 ${aiGeneratedWords.length} 條` }}
                      </button>
                    </div>
                  </div>
                  <div v-if="aiError" class="ai-error-message">{{ aiError }}</div>
                  
                  <!-- AI 生成結果預覽 -->
                  <div v-if="aiGeneratedWords.length > 0" class="ai-preview">
                    <div class="ai-preview-header">
                      <span>AI 生成預覽（可刪除不需要的詞條）</span>
                      <button class="paper-btn btn-link btn-small" @click="clearAIWords">清空</button>
                    </div>
                    <div class="ai-words-grid">
                      <div 
                        v-for="(word, idx) in aiGeneratedWords" 
                        :key="idx" 
                        class="ai-word-tag"
                      >
                        <span>{{ word }}</span>
                        <button class="tag-remove" @click="removeAIWord(idx)">×</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="entry-list" v-if="selectedCollectionId">
                  <div class="entry-row header">
                    <span>詞條</span>
                    <span>來源</span>
                    <span>操作</span>
                  </div>
                  <div
                    v-if="loadingEntries[selectedCollectionId]"
                    class="text-small text-secondary margin-top-small"
                  >
                    條目載入中...
                  </div>
                  <div v-else-if="currentEntries.length === 0" class="text-small text-secondary margin-top-small">
                    尚無詞條，請新增。
                  </div>
                  <div
                    v-else
                    v-for="entry in currentEntries"
                    :key="entry.id"
                    class="entry-row"
                  >
                    <span class="entry-text-cell">
                      <!-- 編輯模式 -->
                      <template v-if="editingEntryId === entry.id">
                        <input 
                          v-model="editingText" 
                          type="text" 
                          class="edit-input"
                          @keyup.enter="saveEdit(entry.id)"
                          @keyup.escape="cancelEdit"
                        />
                        <button class="icon-btn save-btn" @click="saveEdit(entry.id)" title="保存">✓</button>
                        <button class="icon-btn cancel-btn" @click="cancelEdit" title="取消">✕</button>
                      </template>
                      <!-- 顯示模式 -->
                      <template v-else>
                        <span class="entry-text">{{ entry.text }}</span>
                        <button class="icon-btn edit-btn" @click="startEdit(entry)" title="編輯">✎</button>
                      </template>
                    </span>
                    <span>
                      <span v-if="entry.category === 'ai'" class="source-tag source-ai">AI</span>
                      <span v-else class="source-tag source-manual">手動</span>
                    </span>
                    <span>
                      <button
                        class="paper-btn btn-danger btn-small"
                        @click="handleDeleteEntry(entry.id)"
                      >
                        刪除
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="message" class="alert alert-success margin-top-small">
                {{ message }}
              </div>
              <div v-if="errorMsg" class="alert alert-danger margin-top-small">
                {{ errorMsg }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useWordLibrary } from '../composables/useWordLibrary'
import { useAuthStore } from '../stores/auth'
import { useAIWordGenerator } from '../composables/useAIWordGenerator'

const authStore = useAuthStore()
const {
  collections,
  entriesMap,
  loadingCollections,
  loadingEntries,
  isAdmin,
  refreshAdminStatus,
  loadCollections,
  loadEntries,
  addEntry,
  updateEntry,
  deleteEntry,
  toggleCollectionActive,
  addCollection,
} = useWordLibrary()

// AI 生成相關
const {
  isGenerating: aiGenerating,
  error: aiError,
  generateWords,
} = useAIWordGenerator()

const selectedCollectionId = ref<string>('')
const newEntryText = ref('')
const newCollectionTitle = ref('')
const message = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

// AI 生成相關狀態
const aiGeneratedWords = ref<string[]>([])
const batchAdding = ref(false)

// 就地編輯狀態
const editingEntryId = ref<string | null>(null)
const editingText = ref('')

const selectedCollection = computed(() =>
  collections.value.find(c => c.id === selectedCollectionId.value) || null
)

const currentEntries = computed(() => {
  if (!selectedCollectionId.value) return []
  return entriesMap.value[selectedCollectionId.value] || []
})

watch(selectedCollectionId, async (id) => {
  if (id) {
    await loadEntries(id, true)
  }
})

function clearMessages() {
  message.value = null
  errorMsg.value = null
}

async function initAdmin() {
  clearMessages()
  await refreshAdminStatus(true)
  await loadCollections({ includeInactive: true })
  if (collections.value.length > 0 && collections.value[0]) {
    selectedCollectionId.value = collections.value[0].id
    await loadEntries(selectedCollectionId.value)
  }
}

async function refreshCollections() {
  clearMessages()
  await loadCollections({ includeInactive: true })
}

async function handleCollectionChange() {
  clearMessages()
  if (selectedCollectionId.value) {
    await loadEntries(selectedCollectionId.value, true)
  }
}

async function handleAddEntry() {
  clearMessages()
  if (!selectedCollectionId.value) {
    errorMsg.value = '請先選擇主題'
    return
  }

  const result = await addEntry(
    selectedCollectionId.value,
    newEntryText.value,
    'manual' // 手動添加
  )

  if (result.success) {
    message.value = '已新增詞條'
    newEntryText.value = ''
    await loadEntries(selectedCollectionId.value, true)
  } else {
    errorMsg.value = result.error || '新增失敗'
  }
}

// AI 生成詞條（使用當前選中的主題）
async function handleAIGenerate() {
  clearMessages()
  if (!selectedCollection.value) {
    errorMsg.value = '請先選擇主題'
    return
  }

  const result = await generateWords(selectedCollection.value.title)
  if (result) {
    // 過濾掉已存在的詞條
    const existingTexts = new Set(currentEntries.value.map(e => e.text))
    const newWords = result.words.filter(w => !existingTexts.has(w))
    const skipped = result.words.length - newWords.length
    
    aiGeneratedWords.value = newWords
    
    if (skipped > 0) {
      message.value = `AI 已生成 ${result.words.length} 個詞條，過濾掉 ${skipped} 個重複，剩餘 ${newWords.length} 個待添加`
    } else {
      message.value = `AI 已生成 ${newWords.length} 個詞條，請預覽後批量添加`
    }
  }
}

// 移除單個 AI 生成的詞條
function removeAIWord(idx: number) {
  aiGeneratedWords.value.splice(idx, 1)
}

// 清空 AI 生成的詞條
function clearAIWords() {
  aiGeneratedWords.value = []
}

// 批量添加 AI 生成的詞條
async function handleBatchAddAIWords() {
  clearMessages()
  if (!selectedCollectionId.value) {
    errorMsg.value = '請先選擇主題'
    return
  }

  if (aiGeneratedWords.value.length === 0) {
    errorMsg.value = '沒有可添加的詞條'
    return
  }

  batchAdding.value = true
  let successCount = 0
  let skipCount = 0

  // 獲取現有詞條用於去重
  const existingTexts = new Set(currentEntries.value.map(e => e.text))

  for (const word of aiGeneratedWords.value) {
    if (existingTexts.has(word)) {
      skipCount++
      continue
    }

    const result = await addEntry(selectedCollectionId.value, word, 'ai')
    if (result.success) {
      successCount++
      existingTexts.add(word)
    }
  }

  batchAdding.value = false
  aiGeneratedWords.value = []

  if (skipCount > 0) {
    message.value = `已添加 ${successCount} 個詞條，跳過 ${skipCount} 個重複詞條`
  } else {
    message.value = `已添加 ${successCount} 個詞條`
  }

  await loadEntries(selectedCollectionId.value, true)
}

// 開始編輯詞條
function startEdit(entry: { id: string; text: string }) {
  editingEntryId.value = entry.id
  editingText.value = entry.text
}

// 取消編輯
function cancelEdit() {
  editingEntryId.value = null
  editingText.value = ''
}

// 保存編輯
async function saveEdit(entryId: string) {
  clearMessages()
  if (!selectedCollectionId.value) return
  
  const result = await updateEntry(entryId, selectedCollectionId.value, editingText.value)
  if (result.success) {
    message.value = '已更新詞條'
    editingEntryId.value = null
    editingText.value = ''
  } else {
    errorMsg.value = result.error || '更新失敗'
  }
}

async function handleDeleteEntry(entryId: string) {
  clearMessages()
  if (!selectedCollectionId.value) return
  const result = await deleteEntry(entryId, selectedCollectionId.value)
  if (result.success) {
    message.value = '已刪除詞條'
    await loadEntries(selectedCollectionId.value, true)
  } else {
    errorMsg.value = result.error || '刪除失敗'
  }
}

async function toggleActive() {
  clearMessages()
  if (!selectedCollectionId.value || !selectedCollection.value) return
  const nextState = !selectedCollection.value.is_active
  const result = await toggleCollectionActive(selectedCollectionId.value, nextState)
  if (!result.success) {
    errorMsg.value = result.error || '更新狀態失敗'
  } else {
    message.value = nextState ? '主題已啟用' : '主題已停用'
    await loadCollections({ includeInactive: true })
  }
}

async function handleCreateCollection() {
  clearMessages()
  if (!newCollectionTitle.value.trim()) {
    errorMsg.value = '請填寫主題名稱'
    return
  }
  const result = await addCollection({
    title: newCollectionTitle.value,
    description: '',
  })
  if (result.success && result.collection) {
    message.value = '已新增主題'
    newCollectionTitle.value = ''
    await loadCollections({ includeInactive: true })
    selectedCollectionId.value = result.collection.id
    await loadEntries(selectedCollectionId.value, true)
  } else {
    errorMsg.value = result.error || '新增主題失敗'
  }
}

onMounted(() => {
  initAdmin()
})
</script>

<style scoped>
.word-admin {
  min-height: 80vh;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.admin-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  border: 1px dashed var(--border-light);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-secondary);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.inline-actions {
  display: flex;
  gap: 8px;
}

.collection-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.entry-list {
  margin-top: 12px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.entry-row {
  display: grid;
  grid-template-columns: 1fr 60px 80px;
  padding: 10px;
  border-bottom: 1px dashed var(--border-light);
  align-items: center;
}

.entry-row.header {
  background: var(--bg-highlight);
  font-weight: 700;
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-text-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.entry-text {
  font-weight: 600;
}

.edit-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  min-width: 0;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
  opacity: 0.6;
}

.icon-btn:hover {
  opacity: 1;
}

.edit-btn {
  color: #6b7280;
}

.edit-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.save-btn {
  color: #10b981;
}

.save-btn:hover {
  background: #ecfdf5;
}

.cancel-btn {
  color: #ef4444;
}

.cancel-btn:hover {
  background: #fef2f2;
}

/* AI 生成區域 */
.ai-generate-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-light);
}

.btn-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: 2px solid #5a67d8;
}

.btn-ai:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 rgba(90, 103, 216, 0.4);
}

.btn-ai:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-success {
  background: #10b981;
  color: white;
  border: 2px solid #059669;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.ai-error-message {
  font-size: 0.85rem;
  color: #e8590c;
  margin-top: 8px;
  padding: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
}

.ai-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
}

.ai-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.ai-words-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-word-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.tag-remove {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 2px;
}

.tag-remove:hover {
  color: #ef4444;
}

/* 來源標籤 */
.source-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.source-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.source-manual {
  background: #e5e7eb;
  color: #374151;
}

@media (max-width: 768px) {
  .entry-row {
    grid-template-columns: 1fr 50px 70px;
  }
}
</style>


