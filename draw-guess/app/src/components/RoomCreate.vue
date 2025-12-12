<template>
  <div class="room-create">
    <div class="card">
      <div class="card-body">
        <h2 class="card-title text-hand-title">創建房間</h2>

        <form @submit.prevent="handleSubmit">
          <!-- 房間名稱 -->
          <div class="form-group">
            <label>房間名稱</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="輸入房間名稱"
              maxlength="50"
              required
            />
          </div>

        <!-- 主題詞句庫 -->
        <div class="form-group">
          <label class="library-label">主題詞句庫</label>
          <div v-if="loadingCollections" class="text-small text-secondary">詞句庫載入中...</div>
          <div v-else class="word-library-grid">
            <div v-for="collection in collections" :key="collection.id" class="word-card">
              <div class="word-card-header">
                <div>
                  <div class="word-title">{{ collection.title }}</div>
                  <div class="word-desc">{{ collection.description }}</div>
                </div>
                <span class="badge badge-warning">{{ collection.entry_count }} 條</span>
              </div>
              <div class="word-card-actions">
                <button
                  type="button"
                  class="paper-btn btn-secondary btn-small"
                  @click="addWholeCollection(collection.id)"
                >
                  一鍵加入全部
                </button>
                <button
                  type="button"
                  class="paper-btn btn-primary btn-small"
                  @click="toggleCollection(collection.id)"
                >
                  {{ expandedCollectionId === collection.id ? '收起預覽' : '展開預覽' }}
                </button>
              </div>

              <div v-if="expandedCollectionId === collection.id" class="word-entry-list">
                <div v-if="loadingEntries[collection.id]" class="text-small text-secondary">詞條載入中...</div>
                <div v-else>
                  <div
                    v-for="entry in entriesMap[collection.id] || []"
                    :key="entry.id"
                    class="entry-chip"
                  >
                    <label class="checkbox">
                      <input
                        type="checkbox"
                        :checked="isEntrySelected(collection.id, entry.id)"
                        @change="toggleEntrySelection(collection.id, entry.id)"
                      />
                      <span class="entry-text">{{ entry.text }}</span>
                      <span v-if="entry.category" class="entry-tag">{{ entry.category }}</span>
                    </label>
                  </div>

                  <div class="entry-actions">
                    <button
                      type="button"
                      class="paper-btn btn-primary btn-small"
                      :disabled="!hasSelection(collection.id)"
                      @click="addSelectedEntries(collection.id)"
                    >
                      加入已勾選
                    </button>
                    <button
                      type="button"
                      class="paper-btn btn-secondary btn-small"
                      @click="addWholeCollection(collection.id)"
                    >
                      全部加入
                    </button>
                    <button
                      v-if="hasSelection(collection.id)"
                      type="button"
                      class="paper-btn btn-link btn-small"
                      @click="clearSelection(collection.id)"
                    >
                      清除勾選
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="infoMessage" class="text-small info-hint">{{ infoMessage }}</div>
          <div class="text-small text-secondary margin-top-small">
            勾選或一鍵加入後，詞條會自動寫入下方自定義詞語框，可自行刪改。
          </div>
        </div>

          <!-- 自定義詞語 -->
          <div class="form-group">
            <label>自定義詞語（至少 6 個，每個 1-32 字符，最多 600 字符）</label>
            <textarea
              v-model="form.wordsText"
              rows="6"
              placeholder="輸入詞語，用逗號（，或,）或換行分隔&#10;例如：春天，友誼，勇氣"
              @input="handleWordsInput"
            ></textarea>
            <div class="text-small">
              已輸入 {{ wordCount }} 個詞語，{{ totalChars }} / 600 字符
            </div>
            <div v-if="wordCount < 6" class="text-small" style="color: #e8590c;">
              還需要 {{ 6 - wordCount }} 個詞語
            </div>
          </div>

          <!-- 遊戲設置 -->
          <div class="margin-top-medium">
            <h4 class="text-hand-title">遊戲設置</h4>

            <!-- 繪畫時間 -->
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

            <!-- 提示數量 -->
            <div class="form-group">
              <label>提示數量</label>
              <input
                v-model.number="form.settings.hints_count"
                type="number"
                min="0"
                max="5"
                required
              />
            </div>

            <!-- 輪數說明 -->
            <div class="alert alert-secondary margin-top-small">
              <strong>輪數說明：</strong>遊戲開始時，輪數會自動設定為房間人數，確保每個人都有一次機會畫畫。
            </div>
          </div>

          <!-- 錯誤提示 -->
          <div v-if="error" class="alert alert-danger margin-top-small">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <div class="row flex-spaces margin-top-medium">
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
import { ref, computed, onMounted } from 'vue'
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
const expandedCollectionId = ref<string | null>(null)
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

  trimmed.forEach(word => {
    if (!seen.has(word)) {
      seen.add(word)
      merged.push(word)
    }
  })

  form.value.wordsText = merged.join('\n')
  libraryWords.value = new Set([...libraryWords.value, ...trimmed])
  pruneLibraryWords()
  infoMessage.value = `已加入 ${trimmed.length} 個詞條`
}

// 展開 / 收起主題
async function toggleCollection(collectionId: string) {
  if (expandedCollectionId.value === collectionId) {
    expandedCollectionId.value = null
    return
  }
  expandedCollectionId.value = collectionId
  await loadEntries(collectionId)
}

// 加入已勾選詞條
async function addSelectedEntries(collectionId: string) {
  const entries = entriesMap.value[collectionId] || await loadEntries(collectionId)
  const selection = selectedEntries.value[collectionId]
  if (!selection || selection.size === 0) return

  const selectedWords = entries?.filter(e => selection.has(e.id)).map(e => e.text) || []
  addWordsToTextarea(selectedWords)
  clearSelection(collectionId)
}

// 一鍵加入整個詞庫
async function addWholeCollection(collectionId: string) {
  const entries = entriesMap.value[collectionId] || await loadEntries(collectionId)
  const texts = (entries || []).map(e => e.text)
  addWordsToTextarea(texts)
  clearSelection(collectionId)
}

onMounted(() => {
  loadCollections()
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
}

.word-library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.word-card {
  border: 2px dashed var(--border-light);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.word-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.word-title {
  font-weight: 700;
  font-family: var(--font-head);
}

.word-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.word-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
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
}

.word-entry-list {
  margin-top: 10px;
  padding: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  max-height: 260px;
  overflow-y: auto;
}

.entry-chip {
  padding: 6px 4px;
  border-bottom: 1px dashed var(--border-light);
}

.entry-chip:last-child {
  border-bottom: none;
}

.entry-text {
  font-weight: 600;
}

.entry-tag {
  margin-left: 6px;
  padding: 2px 6px;
  background: var(--color-warning-light);
  border-radius: 6px;
  font-size: 0.75rem;
}

.entry-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.info-hint {
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>

