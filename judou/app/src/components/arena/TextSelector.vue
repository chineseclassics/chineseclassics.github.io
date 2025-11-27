<script setup lang="ts">
/**
 * 文本選擇器組件
 * 
 * 支持年級分類篩選、搜索、多選
 * 適用於學生端和教師端創建遊戲
 */

import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps<{
  // 是否顯示自訂文本選項（僅教師端）
  showCustomTexts?: boolean
  // 最大可選數量（0 表示無限制）
  maxSelection?: number
}>()

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: string[]): void
}>()

const authStore = useAuthStore()

// 數據
const categories = ref<any[]>([])
const texts = ref<any[]>([])
const customTexts = ref<any[]>([])
const loading = ref(false)

// 選擇狀態
const selectedCategoryId = ref<string | null>(null)
const selectedTextIds = ref<string[]>([])
const searchQuery = ref('')

// 文本來源（系統/自訂）
type TextSource = 'system' | 'custom'
const textSource = ref<TextSource>('system')

// 篩選後的文本列表
const filteredTexts = computed(() => {
  let list = textSource.value === 'system' ? texts.value : customTexts.value
  
  // 按年級篩選
  if (selectedCategoryId.value) {
    list = list.filter(t => t.category_id === selectedCategoryId.value)
  }
  
  // 搜索篩選
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter(t => 
      t.title?.toLowerCase().includes(query) ||
      t.author?.toLowerCase().includes(query)
    )
  }
  
  return list
})

// 已選中的文本詳情
const selectedTexts = computed(() => {
  const allTexts = [...texts.value, ...customTexts.value]
  return selectedTextIds.value
    .map(id => allTexts.find(t => t.id === id))
    .filter(Boolean)
})


// 加載分類
async function loadCategories() {
  if (!supabase) return
  
  const { data } = await supabase
    .from('practice_categories')
    .select('id, name, order_index')
    .eq('level', 1)
    .eq('is_system', true)
    .order('order_index', { ascending: true })
  
  categories.value = data || []
}

// 加載系統文本
async function loadSystemTexts() {
  if (!supabase) return
  
  const { data } = await supabase
    .from('practice_texts')
    .select('id, title, author, content, difficulty, category_id')
    .eq('is_system', true)
    .eq('text_type', 'practice')
    .order('created_at', { ascending: false })
  
  texts.value = data || []
}

// 加載自訂文本（教師端）
async function loadCustomTexts() {
  if (!supabase || !authStore.user?.id || !props.showCustomTexts) return
  
  const { data } = await supabase
    .from('practice_texts')
    .select('id, title, author, content, difficulty, category_id')
    .eq('created_by', authStore.user.id)
    .eq('is_system', false)
    .order('created_at', { ascending: false })
  
  customTexts.value = data || []
}

// 切換選中文本
function toggleText(textId: string) {
  const index = selectedTextIds.value.indexOf(textId)
  if (index === -1) {
    // 檢查最大選擇數量
    if (props.maxSelection && props.maxSelection > 0 && selectedTextIds.value.length >= props.maxSelection) {
      return
    }
    selectedTextIds.value.push(textId)
  } else {
    selectedTextIds.value.splice(index, 1)
  }
  emit('update:selectedIds', selectedTextIds.value)
}

// 檢查是否選中
function isSelected(textId: string): boolean {
  return selectedTextIds.value.includes(textId)
}

// 獲取選中順序
function getOrder(textId: string): number {
  return selectedTextIds.value.indexOf(textId) + 1
}

// 移除選中
function removeSelection(textId: string) {
  const index = selectedTextIds.value.indexOf(textId)
  if (index !== -1) {
    selectedTextIds.value.splice(index, 1)
    emit('update:selectedIds', selectedTextIds.value)
  }
}

// 清空選擇
function clearSelection() {
  selectedTextIds.value = []
  emit('update:selectedIds', selectedTextIds.value)
}

// 切換文本來源
function switchSource(source: TextSource) {
  textSource.value = source
  selectedCategoryId.value = null
  searchQuery.value = ''
}

// 難度標籤
function getDifficultyLabel(difficulty: number): string {
  switch (difficulty) {
    case 1: return '初級'
    case 2: return '中級'
    case 3: return '高級'
    default: return '未知'
  }
}

// 獲取分類名稱
function getCategoryName(categoryId: string): string {
  const cat = categories.value.find(c => c.id === categoryId)
  return cat?.name || '未分類'
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    loadCategories(),
    loadSystemTexts(),
    loadCustomTexts(),
  ])
  loading.value = false
})

// 暴露方法給父組件
defineExpose({
  selectedTextIds,
  selectedTexts,
  clearSelection,
})
</script>

<template>
  <div class="text-selector">
    <!-- 已選文本提示條 -->
    <div v-if="selectedTextIds.length > 0" class="selection-bar">
      <div class="selection-info">
        <span class="selection-icon">📋</span>
        <span class="selection-count">已選 {{ selectedTextIds.length }} 篇文章</span>
      </div>
      <button class="clear-btn" @click="clearSelection">清空</button>
    </div>

    <!-- 文本來源切換（僅教師端顯示） -->
    <div v-if="showCustomTexts" class="source-tabs">
      <button
        class="source-tab"
        :class="{ active: textSource === 'system' }"
        @click="switchSource('system')"
      >
        <span class="tab-icon">📚</span>
        <span>系統文庫</span>
        <span class="tab-badge">{{ texts.length }}</span>
      </button>
      <button
        class="source-tab"
        :class="{ active: textSource === 'custom' }"
        @click="switchSource('custom')"
      >
        <span class="tab-icon">✏️</span>
        <span>自訂練習</span>
        <span class="tab-badge">{{ customTexts.length }}</span>
      </button>
    </div>

    <!-- 主要選擇區域 -->
    <div class="selector-main">
      <!-- 左側：年級分類 + 搜索 -->
      <div class="selector-sidebar">
        <!-- 搜索框 -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索標題或作者..."
            class="search-input"
          />
          <button 
            v-if="searchQuery" 
            class="search-clear"
            @click="searchQuery = ''"
          >✕</button>
        </div>

        <!-- 年級分類列表 -->
        <div class="category-list" v-if="textSource === 'system'">
          <button
            class="category-item"
            :class="{ active: selectedCategoryId === null }"
            @click="selectedCategoryId = null"
          >
            <span class="category-name">全部年級</span>
            <span class="category-count">{{ texts.length }}</span>
          </button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="selectedCategoryId = cat.id"
          >
            <span class="category-name">{{ cat.name }}</span>
            <span class="category-count">
              {{ texts.filter(t => t.category_id === cat.id).length }}
            </span>
          </button>
        </div>
      </div>

      <!-- 右側：文本列表 -->
      <div class="selector-content">
        <!-- 加載狀態 -->
        <div v-if="loading" class="loading-state">
          <span class="spinner">⏳</span>
          <span>載入中...</span>
        </div>

        <!-- 空狀態 -->
        <div v-else-if="filteredTexts.length === 0" class="empty-state">
          <template v-if="searchQuery">
            <p>找不到「{{ searchQuery }}」相關的文章</p>
            <button class="btn-link" @click="searchQuery = ''">清除搜索</button>
          </template>
          <template v-else-if="textSource === 'custom'">
            <p>您還沒有自訂練習文本</p>
          </template>
          <template v-else>
            <p>此分類下暫無文章</p>
          </template>
        </div>

        <!-- 文本網格 -->
        <div v-else class="text-grid">
          <button
            v-for="text in filteredTexts"
            :key="text.id"
            class="text-card"
            :class="{ selected: isSelected(text.id) }"
            @click="toggleText(text.id)"
          >
            <!-- 選中標記 -->
            <div v-if="isSelected(text.id)" class="selected-badge">
              {{ getOrder(text.id) }}
            </div>
            
            <!-- 文本信息 -->
            <div class="text-main">
              <h4 class="text-title">{{ text.title }}</h4>
              <p v-if="text.author" class="text-author">{{ text.author }}</p>
            </div>
            
            <!-- 標籤 -->
            <div class="text-tags">
              <span class="tag difficulty" :class="`diff-${text.difficulty}`">
                {{ getDifficultyLabel(text.difficulty) }}
              </span>
              <span v-if="text.category_id && textSource === 'system'" class="tag category">
                {{ getCategoryName(text.category_id) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 已選文本預覽 -->
    <div v-if="selectedTexts.length > 0" class="selected-preview">
      <h4 class="preview-title">已選文章順序</h4>
      <div class="preview-list">
        <div 
          v-for="(text, index) in selectedTexts" 
          :key="text.id"
          class="preview-item"
        >
          <span class="preview-order">{{ index + 1 }}</span>
          <span class="preview-name">{{ text.title }}</span>
          <button class="preview-remove" @click="removeSelection(text.id)">✕</button>
        </div>
      </div>
      <p class="preview-hint">學生將按此順序完成比賽</p>
    </div>
  </div>
</template>

<style scoped>
.text-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 已選提示條 */
.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100));
  border: 1px solid var(--color-primary-200);
  border-radius: 10px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-primary-700);
}

.selection-icon {
  font-size: 1.125rem;
}

.clear-btn {
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid var(--color-neutral-300);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--color-neutral-100);
}

/* 來源切換標籤 */
.source-tabs {
  display: flex;
  gap: 0.75rem;
}

.source-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-neutral-50);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.source-tab:hover {
  background: var(--color-neutral-100);
}

.source-tab.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.tab-icon {
  font-size: 1.125rem;
}

.tab-badge {
  padding: 0.125rem 0.5rem;
  background: var(--color-neutral-200);
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.source-tab.active .tab-badge {
  background: var(--color-primary-500);
  color: white;
}

/* 主選擇區域 */
.selector-main {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1rem;
  min-height: 320px;
}

/* 側邊欄 */
.selector-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: var(--color-primary-400);
  background: white;
}

.search-icon {
  font-size: 0.875rem;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  outline: none;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-neutral-400);
}

.search-clear {
  padding: 0.125rem 0.375rem;
  background: var(--color-neutral-200);
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--color-neutral-600);
}

.search-clear:hover {
  background: var(--color-neutral-300);
}

/* 分類列表 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  max-height: 280px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.category-item:hover {
  background: var(--color-neutral-100);
}

.category-item.active {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.category-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.category-count {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  background: var(--color-neutral-100);
  padding: 0.125rem 0.5rem;
  border-radius: 8px;
}

.category-item.active .category-count {
  background: var(--color-primary-200);
  color: var(--color-primary-700);
}

/* 文本內容區 */
.selector-content {
  background: var(--color-neutral-50);
  border-radius: 12px;
  padding: 1rem;
  overflow-y: auto;
  max-height: 360px;
}

/* 文本網格 */
.text-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

/* 文本卡片 */
.text-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem;
  background: white;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  min-height: 90px;
}

.text-card:hover {
  border-color: var(--color-primary-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.text-card.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

/* 選中標記 */
.selected-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: var(--color-primary-500);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.text-main {
  flex: 1;
}

.text-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-author {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* 標籤 */
.text-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.tag {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.tag.difficulty {
  background: var(--color-neutral-100);
}

.tag.diff-1 {
  background: #d1fae5;
  color: #047857;
}

.tag.diff-2 {
  background: #fef3c7;
  color: #d97706;
}

.tag.diff-3 {
  background: #fee2e2;
  color: #dc2626;
}

.tag.category {
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
}

/* 已選預覽 */
.selected-preview {
  background: var(--color-neutral-50);
  border-radius: 10px;
  padding: 1rem;
}

.preview-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--color-neutral-200);
}

.preview-order {
  width: 22px;
  height: 22px;
  background: var(--color-primary-500);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.preview-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.preview-remove {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  color: var(--color-neutral-400);
  cursor: pointer;
  font-size: 0.875rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.preview-remove:hover {
  background: var(--color-error-100);
  color: var(--color-error-600);
}

.preview-hint {
  margin: 0.75rem 0 0 0;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  text-align: center;
}

/* 狀態 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-neutral-500);
  text-align: center;
}

.spinner {
  font-size: 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary-600);
  cursor: pointer;
  font-weight: 500;
}

.btn-link:hover {
  text-decoration: underline;
}

/* 響應式 */
@media (max-width: 600px) {
  .selector-main {
    grid-template-columns: 1fr;
  }
  
  .selector-sidebar {
    order: 2;
  }
  
  .selector-content {
    order: 1;
  }
  
  .category-list {
    flex-direction: row;
    flex-wrap: wrap;
    max-height: none;
  }
  
  .category-item {
    flex: 0 0 auto;
    padding: 0.5rem 0.75rem;
  }
  
  .text-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>

