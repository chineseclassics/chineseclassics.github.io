<template>
  <div class="room-create">
    <div class="card">
      <div class="card-body">
        <h2 class="card-title text-hand-title">創建房間</h2>

        <form @submit.prevent="handleSubmit">
          <!-- 遊戲模式選擇（放在最上面） -->
          <div class="form-group game-mode-group">
            <label>遊戲模式</label>
            <div class="game-mode-options">
              <label class="game-mode-option" :class="{ active: form.gameMode === 'classic' }">
                <input
                  type="radio"
                  v-model="form.gameMode"
                  value="classic"
                  name="gameMode"
                />
                <div class="mode-content">
                  <span class="mode-icon">🎨</span>
                  <div class="mode-text">
                    <span class="mode-name">傳統模式</span>
                    <span class="mode-desc">猜詞競技，猜對得分</span>
                  </div>
                </div>
              </label>
              <label class="game-mode-option" :class="{ active: form.gameMode === 'storyboard' }">
                <input
                  type="radio"
                  v-model="form.gameMode"
                  value="storyboard"
                  name="gameMode"
                />
                <div class="mode-content">
                  <span class="mode-icon">📖</span>
                  <div class="mode-text">
                    <span class="mode-name">分鏡接龍</span>
                    <span class="mode-desc">合作創作故事漫畫</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- 房間主題/故事標題（根據模式動態變化） -->
          <div v-if="form.gameMode === 'storyboard'" class="form-group room-theme-group">
            <label>故事標題</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="決定集體創作故事的走向，如「林黛玉的港漂日記」"
              maxlength="50"
              required
              class="room-theme-input"
            />
          </div>

          <!-- 單場模式選項（分鏡模式專用） -->
          <div v-if="form.gameMode === 'storyboard'" class="form-group single-round-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="form.singleRoundMode"
              />
              <span class="checkbox-text">單場模式</span>
              <span class="checkbox-hint">（勾選後遊戲只進行一場即結束）</span>
            </label>
          </div>

          <!-- 編劇模式選項（分鏡模式專用） -->
          <div v-if="form.gameMode === 'storyboard'" class="form-group writing-mode-group">
            <label>編劇模式</label>
            <div class="writing-mode-options">
              <label class="writing-mode-option" :class="{ active: form.storyboardWritingMode === 'free' }">
                <input
                  type="radio"
                  v-model="form.storyboardWritingMode"
                  value="free"
                  name="storyboardWritingMode"
                />
                <div class="writing-mode-content">
                  <span class="writing-mode-icon">✍️</span>
                  <div class="writing-mode-text">
                    <span class="writing-mode-name">自由編劇</span>
                    <span class="writing-mode-desc">自由發揮，不限詞句</span>
                  </div>
                </div>
              </label>
              <label class="writing-mode-option" :class="{ active: form.storyboardWritingMode === 'wordlist' }">
                <input
                  type="radio"
                  v-model="form.storyboardWritingMode"
                  value="wordlist"
                  name="storyboardWritingMode"
                />
                <div class="writing-mode-content">
                  <span class="writing-mode-icon">📝</span>
                  <div class="writing-mode-text">
                    <span class="writing-mode-name">依詞句庫編劇</span>
                    <span class="writing-mode-desc">每輪須使用指定詞句</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- 故事類型（分鏡模式+依詞句庫編劇，選填） -->
          <div v-if="form.gameMode === 'storyboard' && form.storyboardWritingMode === 'wordlist'" class="form-group story-genre-group">
            <label>故事類型 <span class="optional-hint">（選填，用於 AI 生成詞句庫）</span></label>
            <input
              v-model="form.storyGenre"
              type="text"
              placeholder="如：懸疑、探案、愛情、穿越、校園、奇幻..."
              maxlength="20"
              class="story-genre-input"
            />
            <div class="story-genre-hint">
              不填則以故事標題為主生成詞語
            </div>
          </div>

        <!-- 預設主題詞句庫（需要詞句庫時顯示） -->
        <div v-if="isWordLibraryEnabled" class="form-group">
          <label class="library-label">預設主題詞句庫</label>
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

          <!-- 自定義詞句主題和詞語輸入（需要詞句庫時顯示） -->
          <div v-if="isWordLibraryEnabled" class="form-group words-input-group">
            <div class="words-label-row">
              <!-- 傳統模式：顯示可編輯的主題輸入框 -->
              <div v-if="form.gameMode === 'classic'" class="form-group room-theme-group-inline">
                <label>自定義詞句主題</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="為玩家提示猜詞範圍，如「香港小吃」"
                  maxlength="50"
                  required
                  class="room-theme-input"
                />
              </div>
              <!-- 分鏡模式：顯示當前生成依據 -->
              <div v-else class="form-group room-theme-group-inline">
                <label>詞語生成依據</label>
                <div class="theme-readonly-hint">
                  <span class="theme-readonly-text">
                    {{ form.storyGenre ? `故事類型：${form.storyGenre}` : `故事標題：${form.name || '（請先輸入）'}` }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="paper-btn ai-generate-btn"
                :disabled="aiGenerating || aiRateLimited || !form.name.trim()"
                @click="handleAIGenerate"
              >
                <span v-if="aiGenerating" class="ai-btn-loading">⏳ 生成中...</span>
                <span v-else-if="aiRateLimited" class="ai-btn-limited">🚫 請稍後再試</span>
                <span v-else>✨ 生成詞句庫</span>
              </button>
            </div>
            <!-- AI 生成提示信息 -->
            <div v-if="aiError" class="ai-error-message">{{ aiError }}</div>
            <div v-if="aiInfoMessage" class="ai-info-message">{{ aiInfoMessage }}</div>
            <textarea
              v-model="form.wordsText"
              rows="6"
              placeholder="自定義詞語（至少 6 個，支持中英文詞語）&#10;輸入詞語，用逗號（，或,）或換行分隔&#10;例如：春天，友誼，勇氣"
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

          <!-- 分鏡模式說明 -->
          <div v-if="form.gameMode === 'storyboard'" class="storyboard-info">
            <div class="info-card">
              <h4>📖 分鏡接龍模式說明</h4>
              <ul>
                <li>🎨 分鏡師根據上一鏡勝出句子繪畫</li>
                <li>✍️ 編劇根據畫作創作下一句故事</li>
                <li>🗳️ 所有玩家投票選出最佳句子</li>
                <li>📚 最終產出一個圖文交替的故事板</li>
              </ul>
              <p class="info-note">⚠️ 分鏡模式需要至少 3 位玩家</p>
            </div>
          </div>

          <!-- 遊戲設置 -->
          <div class="margin-top-medium game-settings-section">
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
import { useAIWordGenerator, formatWordsForInput } from '../composables/useAIWordGenerator'

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

// AI 智能詞語生成
const {
  isGenerating: aiGenerating,
  isRateLimited: aiRateLimited,
  error: aiError,
  generateWords: aiGenerateWords,
} = useAIWordGenerator()

const aiInfoMessage = ref<string | null>(null)

const form = ref({
  name: '',
  wordsText: '',
  settings: {
    draw_time: 60,
    rounds: 0, // 輪數將在開始遊戲時自動設定為房間人數
    word_count_per_round: 1, // 保留此字段以兼容數據庫，但不再顯示
    hints_count: 2,
  },
  // 分鏡接龍模式相關
  gameMode: 'classic' as 'classic' | 'storyboard',
  singleRoundMode: false,
  storyboardWritingMode: 'free' as 'free' | 'wordlist', // 編劇模式：自由編劇 / 依詞句庫編劇
  storyGenre: '', // 故事類型（分鏡模式+依詞句庫編劇，選填）
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

// 是否需要詞句庫：傳統模式一律需要；分鏡模式僅在「依詞句庫編劇」時需要
const isWordLibraryEnabled = computed(() => {
  if (form.value.gameMode === 'classic') {
    return true
  }
  return form.value.storyboardWritingMode === 'wordlist'
})

const isFormValid = computed(() => {
  // 基本驗證：房間名稱
  const nameValid = form.value.name.trim().length > 0 && form.value.name.length <= 50
  
  // 分鏡模式 + 自由編劇：只需驗證故事標題
  if (form.value.gameMode === 'storyboard' && form.value.storyboardWritingMode === 'free') {
    return nameValid
  }
  
  // 傳統模式 或 分鏡模式 + 依詞句庫編劇：需要詞語驗證
  return (
    nameValid &&
    wordCount.value >= 6 &&
    totalChars.value <= 600 &&
    uniqueWords.value.every(word => word.length >= 1 && word.length <= 32)
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

// AI 智能生成詞語
async function handleAIGenerate() {
  // 檢查主題是否已填寫
  if (!form.value.name.trim()) {
    aiInfoMessage.value = form.value.gameMode === 'storyboard' ? '請先輸入故事標題' : '請先輸入詞句主題'
    return
  }

  aiInfoMessage.value = null
  
  // 根據遊戲模式設定 AI 生成參數
  const isStoryboardMode = form.value.gameMode === 'storyboard'
  const result = await aiGenerateWords(form.value.name.trim(), {
    mode: isStoryboardMode ? 'storyboard' : 'classic',
    storyGenre: isStoryboardMode ? form.value.storyGenre : undefined,
  })
  
  if (result) {
    // 將生成的詞語填入輸入框（清空現有內容）
    form.value.wordsText = formatWordsForInput(result.words)
    
    // 顯示提示信息
    if (result.isThemeAdjusted && result.adjustedTheme) {
      aiInfoMessage.value = `已根據「${result.adjustedTheme}」主題生成 ${result.words.length} 個詞語`
    } else {
      const modeHint = isStoryboardMode ? '（適合故事編劇）' : ''
      aiInfoMessage.value = `已生成 ${result.words.length} 個詞語${modeHint}`
    }
    
    // 清空詞庫來源記錄（AI 生成的詞語不算詞庫來源）
    libraryWords.value = new Set()
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
    // - 傳統模式：始終需要詞語
    // - 分鏡模式 + 自由編劇：不需要詞語
    // - 分鏡模式 + 依詞句庫編劇：需要詞語
    const needsWords = form.value.gameMode === 'classic' || 
      (form.value.gameMode === 'storyboard' && form.value.storyboardWritingMode === 'wordlist')
    
    const wordsList = needsWords
      ? uniqueWords.value.map(text => ({
          text,
          source: libraryWords.value.has(text) ? ('wordlist' as const) : ('custom' as const),
        }))
      : []

    // 構建設置，包含分鏡編劇模式
    const settings = {
      ...form.value.settings,
      // 分鏡模式時保存編劇模式設定
      ...(form.value.gameMode === 'storyboard' && {
        storyboard_writing_mode: form.value.storyboardWritingMode,
      }),
    }

    const result = await createRoom({
      name: form.value.name.trim(),
      words: wordsList,
      settings,
      // 分鏡接龍模式相關參數
      gameMode: form.value.gameMode,
      singleRoundMode: form.value.singleRoundMode,
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

.room-theme-group-inline {
  flex: 1;
  margin-bottom: 0;
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

/* 詞語標籤行（包含標籤和 AI 生成按鈕） */
.words-label-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.words-label-row .room-theme-group-inline {
  flex: 1;
  min-width: 0;
}

.words-label-row .room-theme-group-inline label {
  margin-bottom: 0.5rem !important;
  display: block;
}

.words-label-row .ai-generate-btn {
  flex-shrink: 0;
  align-self: flex-end;
}

/* AI 生成按鈕 - 使用 PaperCSS 手繪風格 */
.paper-btn.ai-generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #5a67d8;
  white-space: nowrap;
  padding: 0.4rem 0.75rem;
  font-size: 1rem;
  line-height: 1.4;
  /* 減少高度以匹配輸入框 */
}

.ai-generate-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 rgba(90, 103, 216, 0.4);
}

.ai-generate-btn:active:not(:disabled) {
  transform: translate(0, 0);
  box-shadow: 1px 1px 0 rgba(90, 103, 216, 0.3);
}

.ai-generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #9ca3af;
  border-color: #9ca3af;
}

.ai-btn-loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.ai-btn-limited {
  color: #fbbf24;
}

/* AI 生成提示信息 */
.ai-error-message {
  font-size: 0.85rem;
  color: #e8590c;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
}

.ai-info-message {
  font-size: 0.85rem;
  color: #059669;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 4px;
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

/* 遊戲設置區域 */
.game-settings-section {
  margin-top: 1.5rem;
}

/* 提交按鈕區域 */
.submit-buttons-section {
  margin-top: 1.5rem;
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

/* 遊戲模式選擇 */
.game-mode-group {
  margin-top: 1rem;
}

.game-mode-options {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.game-mode-option {
  flex: 1;
  min-width: 200px;
  cursor: pointer;
}

.game-mode-option input[type="radio"] {
  display: none;
}

.game-mode-option .mode-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.game-mode-option:hover .mode-content {
  background: var(--bg-hover);
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.game-mode-option.active .mode-content {
  border-color: var(--primary-color, #4a90d9);
  background: var(--bg-secondary);
  box-shadow: 3px 3px 0 var(--primary-color, #4a90d9);
}

.mode-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.mode-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.mode-name {
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--text-primary);
  font-size: 1rem;
}

.mode-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 單局模式選項 */
.single-round-group {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-light);
  border-radius: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.checkbox-text {
  font-weight: 500;
  color: var(--text-primary);
}

.checkbox-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 編劇模式選項（分鏡模式專用） */
.writing-mode-group {
  margin-top: 0.75rem;
}

.writing-mode-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.writing-mode-option {
  flex: 1;
  min-width: 160px;
  cursor: pointer;
}

.writing-mode-option input[type="radio"] {
  display: none;
}

.writing-mode-option .writing-mode-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 0;
  transition: all 0.2s ease;
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.writing-mode-option:hover .writing-mode-content {
  background: var(--bg-hover);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.writing-mode-option.active .writing-mode-content {
  border-color: var(--primary-color, #4a90d9);
  background: var(--bg-secondary);
  box-shadow: 2px 2px 0 var(--primary-color, #4a90d9);
}

.writing-mode-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.writing-mode-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.writing-mode-name {
  font-weight: 600;
  font-family: var(--font-head);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.writing-mode-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* 只讀主題提示（分鏡模式詞句庫用） */
.theme-readonly-hint {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-light);
  border-radius: 4px;
}

.theme-readonly-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-family: var(--font-body);
}

/* 故事類型輸入（分鏡模式專用） */
.story-genre-group {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-light);
  border-radius: 4px;
}

.story-genre-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.optional-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: normal;
}

.story-genre-input {
  width: 100%;
  font-family: var(--font-body);
}

.story-genre-hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

/* 分鏡模式說明 */
.storyboard-info {
  margin-top: 1rem;
}

.info-card {
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #f8f4e8 0%, #fff9e6 100%);
  border: 3px solid var(--border-color);
  border-radius: 0;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.info-card h4 {
  margin: 0 0 0.75rem 0;
  font-family: var(--font-head);
  color: var(--text-primary);
  font-size: 1.1rem;
}

.info-card ul {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.info-card li {
  padding: 0.35rem 0;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.info-note {
  margin: 0.75rem 0 0 0;
  padding-top: 0.75rem;
  border-top: 2px dashed var(--border-light);
  font-size: 0.9rem;
  color: #e8590c;
  font-weight: 500;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .words-label-row {
    flex-direction: column;
    align-items: stretch;
  }

  .words-label-row .room-theme-group-inline {
    width: 100%;
  }

  .words-label-row .ai-generate-btn {
    width: 100%;
    align-self: stretch;
  }
}
</style>

