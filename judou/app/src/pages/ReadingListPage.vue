<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useReadingStore } from '@/stores/readingStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAuthStore } from '@/stores/authStore'
import type { ReadingText } from '@/types/text'

const router = useRouter()
const readingStore = useReadingStore()
const libraryStore = usePracticeLibraryStore()
const authStore = useAuthStore()

// 篩選狀態
const filterMode = ref<'all' | 'bookmarked' | 'in-progress'>('all')
const selectedCategoryId = ref<string | null>(null)
const searchQuery = ref('')

// 分類選項
const categoryOptions = computed(() =>
  libraryStore.state.categories
    .filter(c => c.level === 1)
    .sort((a, b) => a.order_index - b.order_index)
)

// 篩選後的文章列表
const filteredTexts = computed(() => {
  let result = [...readingStore.readingTexts]
  
  // 按模式篩選
  if (filterMode.value === 'bookmarked') {
    result = result.filter(t => t.progress?.bookmarked)
  } else if (filterMode.value === 'in-progress') {
    result = result.filter(t => t.progress && t.progress.progress_percent > 0 && t.progress.progress_percent < 100)
  }
  
  // 按分類篩選
  if (selectedCategoryId.value) {
    result = result.filter(t => {
      if (!t.category) return false
      // 檢查是否屬於選中的年級或其子分類
      return t.category.id === selectedCategoryId.value || 
             t.category.parent_id === selectedCategoryId.value
    })
  }
  
  // 搜索篩選
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.author && t.author.toLowerCase().includes(query)) ||
      (t.source && t.source.toLowerCase().includes(query))
    )
  }
  
  return result
})

// 獲取文章預覽（移除斷句符）
function getPreview(text: ReadingText) {
  const content = text.content.replace(/\|/g, '')
  return content.length > 60 ? content.slice(0, 60) + '...' : content
}

// 獲取進度百分比
function getProgressPercent(text: ReadingText) {
  return text.progress?.progress_percent ?? 0
}

// 跳轉到閱讀頁面
function goToReading(textId: string) {
  router.push({ name: 'reading-detail', params: { id: textId } })
}

// 切換書籤
async function handleToggleBookmark(textId: string, event: Event) {
  event.stopPropagation()
  if (!authStore.isAuthenticated) {
    alert('請先登入以使用書籤功能')
    return
  }
  await readingStore.toggleBookmark(textId)
}

onMounted(async () => {
  if (!libraryStore.state.categories.length) {
    await libraryStore.fetchLibrary()
  }
  await readingStore.fetchReadingTexts()
})
</script>

<template>
  <div class="reading-list-page">
    <!-- 頁面標題 -->
    <header class="page-header">
      <h1 class="page-title">📖 閱讀文庫</h1>
      <p class="page-subtitle">沉浸式古文閱讀，可選自主斷句練習</p>
    </header>
    
    <!-- 篩選工具列 -->
    <section class="filter-bar edamame-glass">
      <div class="filter-tabs">
        <button 
          class="filter-tab" 
          :class="{ active: filterMode === 'all' }"
          @click="filterMode = 'all'"
        >
          全部
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: filterMode === 'in-progress' }"
          @click="filterMode = 'in-progress'"
          :disabled="!authStore.isAuthenticated"
        >
          閱讀中
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: filterMode === 'bookmarked' }"
          @click="filterMode = 'bookmarked'"
          :disabled="!authStore.isAuthenticated"
        >
          ⭐ 收藏
        </button>
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedCategoryId" class="category-select">
          <option :value="null">全部分類</option>
          <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="搜索標題、作者..."
          class="search-input"
        />
      </div>
    </section>
    
    <!-- 文章列表 -->
    <section class="text-list">
      <div v-if="readingStore.isLoading" class="loading-state">
        <span class="loading-spinner"></span>
        載入中...
      </div>
      
      <div v-else-if="filteredTexts.length === 0" class="empty-state">
        <p v-if="filterMode === 'bookmarked'">尚未收藏任何文章</p>
        <p v-else-if="filterMode === 'in-progress'">沒有正在閱讀的文章</p>
        <p v-else>暫無閱讀文章</p>
      </div>
      
      <div 
        v-else
        v-for="text in filteredTexts"
        :key="text.id"
        class="text-card edamame-glass"
        @click="goToReading(text.id)"
      >
        <div class="card-header">
          <h3 class="card-title">{{ text.title }}</h3>
          <button 
            class="bookmark-btn"
            :class="{ active: text.progress?.bookmarked }"
            @click="handleToggleBookmark(text.id, $event)"
            :title="text.progress?.bookmarked ? '取消收藏' : '收藏'"
          >
            {{ text.progress?.bookmarked ? '⭐' : '☆' }}
          </button>
        </div>
        
        <div class="card-meta">
          <span class="author">{{ text.author || '佚名' }}</span>
          <span v-if="text.source" class="source">· {{ text.source }}</span>
          <span v-if="text.category" class="category">· {{ text.category.name }}</span>
        </div>
        
        <p class="card-preview">{{ getPreview(text) }}</p>
        
        <!-- 閱讀進度條 -->
        <div v-if="text.progress && text.progress.progress_percent > 0" class="progress-bar">
          <div class="progress-fill" :style="{ width: getProgressPercent(text) + '%' }"></div>
          <span class="progress-text">{{ Math.round(getProgressPercent(text)) }}%</span>
        </div>
        
        <div class="card-footer">
          <span class="word-count">{{ text.word_count || '?' }} 字</span>
          <span class="read-action">開始閱讀 →</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.reading-list-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  text-align: center;
  padding: 1rem 0;
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-neutral-800);
  margin: 0;
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  margin: 0.5rem 0 0;
}

/* 篩選工具列 */
.filter-bar {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
}

.filter-tab {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.filter-tab.active {
  background: var(--color-primary-500);
  color: white;
}

.filter-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
}

.category-select,
.search-input {
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: rgba(255, 255, 255, 0.8);
}

.category-select {
  min-width: 120px;
}

.search-input {
  flex: 1;
}

.category-select:focus,
.search-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
}

/* 文章列表 */
.text-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-neutral-500);
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primary-200);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 文章卡片 */
.text-card {
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.text-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-800);
  margin: 0;
}

.bookmark-btn {
  border: none;
  background: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.5;
  transition: all 0.2s ease;
}

.bookmark-btn:hover,
.bookmark-btn.active {
  opacity: 1;
}

.card-meta {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  margin-bottom: 0.75rem;
}

.card-preview {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  line-height: 1.6;
  margin: 0 0 1rem;
  font-family: var(--font-main, 'Noto Serif TC', serif);
}

/* 進度條 */
.progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-full);
  margin-bottom: 0.75rem;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-400), var(--color-primary-500));
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: var(--text-xs);
  color: var(--color-primary-600);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-count {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

.read-action {
  font-size: var(--text-sm);
  color: var(--color-primary-600);
  font-weight: var(--font-medium);
}

/* 響應式 */
@media (max-width: 768px) {
  .filter-bar {
    gap: 0.75rem;
  }
  
  .filter-controls {
    flex-direction: column;
  }
  
  .category-select {
    width: 100%;
  }
}
</style>

