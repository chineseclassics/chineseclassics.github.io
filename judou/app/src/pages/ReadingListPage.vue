<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useReadingStore } from '@/stores/readingStore'
import { useAuthStore } from '@/stores/authStore'
import type { ReadingText, ReadingCategory } from '@/types/text'

const router = useRouter()
const readingStore = useReadingStore()
const authStore = useAuthStore()

// 視圖模式：shelf=文集書架, collection=某文集文章, all=全部文章, bookmarked=收藏
type ViewMode = 'shelf' | 'collection' | 'all' | 'bookmarked'
const viewMode = ref<ViewMode>('shelf')

// 當前選中的文集
const selectedCollection = ref<ReadingCategory | null>(null)

// 搜索
const searchQuery = ref('')

// 文集列表
const collections = computed(() => readingStore.readingCategories)

// 計算每個文集的文章數量
function getCollectionTextCount(categoryId: string) {
  return readingStore.readingTexts.filter(t => 
    t.reading_categories?.some(c => c.id === categoryId)
  ).length
}

// 當前視圖的文章列表
const currentTexts = computed(() => {
  let result = [...readingStore.readingTexts]
  
  // 按視圖模式篩選
  if (viewMode.value === 'bookmarked') {
    result = result.filter(t => t.progress?.bookmarked)
  } else if (viewMode.value === 'collection' && selectedCollection.value) {
    result = result.filter(t => 
      t.reading_categories?.some(c => c.id === selectedCollection.value!.id)
    )
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

// 打開文集
function openCollection(collection: ReadingCategory) {
  selectedCollection.value = collection
  viewMode.value = 'collection'
  searchQuery.value = ''
}

// 查看全部文章
function showAllTexts() {
  selectedCollection.value = null
  viewMode.value = 'all'
  searchQuery.value = ''
}

// 查看收藏
function showBookmarked() {
  selectedCollection.value = null
  viewMode.value = 'bookmarked'
  searchQuery.value = ''
}

// 返回書架
function backToShelf() {
  selectedCollection.value = null
  viewMode.value = 'shelf'
  searchQuery.value = ''
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

// 計算字數（從內容計算，移除斷句標記）
function getWordCount(text: ReadingText) {
  return text.content?.replace(/\|/g, '').length || 0
}

// 生成文集封面顏色（基於名稱生成一致的顏色）
function getCollectionColor(name: string) {
  const colors = [
    { bg: 'linear-gradient(145deg, #8B7355 0%, #6B5344 100%)', spine: '#5D4637' },  // 褐色
    { bg: 'linear-gradient(145deg, #4A6741 0%, #3A5231 100%)', spine: '#2D4126' },  // 墨綠
    { bg: 'linear-gradient(145deg, #5B6B8A 0%, #4A5A79 100%)', spine: '#3D4D6B' },  // 靛藍
    { bg: 'linear-gradient(145deg, #8B6B55 0%, #7A5A44 100%)', spine: '#6B4B35' },  // 赭石
    { bg: 'linear-gradient(145deg, #6B5B7A 0%, #5A4A69 100%)', spine: '#4B3B5A' },  // 紫檀
    { bg: 'linear-gradient(145deg, #7A8B6B 0%, #697A5A 100%)', spine: '#5A6B4B' },  // 青銅
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

onMounted(async () => {
  await Promise.all([
    readingStore.fetchReadingCategories(),
    readingStore.fetchReadingTexts()
  ])
})
</script>

<template>
  <div class="reading-list-page">
    <!-- ========== 文集書架視圖 ========== -->
    <template v-if="viewMode === 'shelf'">
      <!-- 工具列 -->
      <section class="toolbar edamame-glass">
        <button 
          class="toolbar-btn"
          @click="showBookmarked"
          :disabled="!authStore.isAuthenticated"
        >
          ⭐ 收藏
        </button>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="搜索標題、作者..."
          class="search-input"
          @keyup.enter="showAllTexts"
        />
      </section>
      
      <!-- 搜索結果（如果有搜索詞） -->
      <section v-if="searchQuery.trim()" class="search-results">
        <div class="results-header">
          <span>搜索「{{ searchQuery }}」的結果</span>
          <button class="clear-search" @click="searchQuery = ''">清除</button>
        </div>
        <div v-if="currentTexts.length === 0" class="empty-state">
          <p>沒有找到相關文章</p>
        </div>
        <div v-else class="text-list">
          <div 
            v-for="text in currentTexts"
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
              >
                {{ text.progress?.bookmarked ? '⭐' : '☆' }}
              </button>
            </div>
            <div class="card-meta">
              <span class="author">{{ text.author || '佚名' }}</span>
              <span v-if="text.source" class="source">· {{ text.source }}</span>
            </div>
            <p class="card-preview">{{ getPreview(text) }}</p>
          </div>
        </div>
      </section>
      
      <!-- 文集書架 -->
      <section v-else class="bookshelf">
        <div v-if="readingStore.isLoading" class="loading-state">
          <span class="loading-spinner"></span>
          載入中...
        </div>
        
        <template v-else>
          <!-- 文集卡片 -->
          <div class="shelf-grid">
            <div 
              v-for="collection in collections"
              :key="collection.id"
              class="book-card"
              @click="openCollection(collection)"
            >
              <div 
                class="book-spine"
                :style="{ background: getCollectionColor(collection.name)?.spine }"
              ></div>
              <div 
                class="book-cover"
                :style="{ background: getCollectionColor(collection.name)?.bg }"
              >
                <div class="book-title">{{ collection.name }}</div>
                <div class="book-count">{{ getCollectionTextCount(collection.id) }} 篇</div>
                <div class="book-decoration">
                  <span class="deco-line"></span>
                  <span class="deco-dot">◆</span>
                  <span class="deco-line"></span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 查看全部入口 -->
          <div class="view-all-section">
            <button class="view-all-btn" @click="showAllTexts">
              📋 查看全部文章（{{ readingStore.readingTexts.length }} 篇）
            </button>
          </div>
          
          <!-- 空狀態 -->
          <div v-if="collections.length === 0" class="empty-shelf">
            <p>尚未建立任何文集</p>
            <button class="view-all-btn" @click="showAllTexts">
              查看全部文章
            </button>
          </div>
        </template>
      </section>
    </template>
    
    <!-- ========== 文章列表視圖 ========== -->
    <template v-else>
      <!-- 導航列 -->
      <section class="nav-bar edamame-glass">
        <button class="back-btn" @click="backToShelf">
          ← 返回書架
        </button>
        <div class="nav-title">
          <template v-if="viewMode === 'collection' && selectedCollection">
            {{ selectedCollection.name }}
          </template>
          <template v-else-if="viewMode === 'bookmarked'">
            ⭐ 我的收藏
          </template>
          <template v-else>
            全部文章
          </template>
        </div>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="搜索..."
          class="search-input compact"
        />
      </section>
      
      <!-- 文章列表 -->
      <section class="text-list">
        <div v-if="readingStore.isLoading" class="loading-state">
          <span class="loading-spinner"></span>
          載入中...
        </div>
        
        <div v-else-if="currentTexts.length === 0" class="empty-state">
          <p v-if="viewMode === 'bookmarked'">尚未收藏任何文章</p>
          <p v-else-if="searchQuery">沒有找到相關文章</p>
          <p v-else>此文集暫無文章</p>
        </div>
        
        <div 
          v-else
          v-for="text in currentTexts"
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
            <span v-if="viewMode === 'all' && text.reading_categories?.length" class="category">
              · {{ text.reading_categories.map(c => c.name).join('、') }}
            </span>
          </div>
          
          <p class="card-preview">{{ getPreview(text) }}</p>
          
          <div class="card-footer">
            <span class="word-count">{{ getWordCount(text) }} 字</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.reading-list-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ========== 工具列 ========== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.toolbar-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.toolbar-btn.active {
  background: var(--color-primary-500);
  color: white;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: rgba(255, 255, 255, 0.8);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
}

.search-input.compact {
  max-width: 180px;
}

/* ========== 搜索結果 ========== */
.search-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.clear-search {
  border: none;
  background: none;
  color: var(--color-primary-600);
  cursor: pointer;
  font-size: var(--text-sm);
}

.clear-search:hover {
  text-decoration: underline;
}

/* ========== 文集書架 ========== */
.bookshelf {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1.5rem;
  justify-items: center;
}

/* 書本卡片 */
.book-card {
  display: flex;
  width: 140px;
  height: 190px;
  cursor: pointer;
  perspective: 1000px;
  transition: transform 0.3s ease;
}

.book-card:hover {
  transform: translateY(-8px);
}

.book-card:hover .book-cover {
  box-shadow: 
    8px 8px 20px rgba(0, 0, 0, 0.25),
    inset 0 0 30px rgba(255, 255, 255, 0.1);
}

.book-spine {
  width: 20px;
  height: 100%;
  border-radius: 3px 0 0 3px;
  box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.2);
}

.book-cover {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem 0.75rem;
  border-radius: 0 4px 4px 0;
  box-shadow: 
    4px 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 0 20px rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

/* 書本封面紋理 */
.book-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
  pointer-events: none;
}

/* 書本邊緣光澤 */
.book-cover::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.15),
    transparent
  );
  pointer-events: none;
}

.book-title {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  line-height: 1.4;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  /* 豎排顯示 */
  writing-mode: vertical-rl;
  max-height: 120px;
  overflow: hidden;
}

.book-count {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.book-decoration {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  position: relative;
  z-index: 1;
}

.deco-line {
  width: 16px;
  height: 1px;
  background: rgba(255, 255, 255, 0.4);
}

.deco-dot {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.5);
}

/* 查看全部 */
.view-all-section {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.view-all-btn {
  padding: 0.75rem 1.5rem;
  border: 1px dashed var(--color-primary-300);
  background: rgba(139, 178, 79, 0.05);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: var(--color-primary-700);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background: rgba(139, 178, 79, 0.1);
  border-color: var(--color-primary-400);
}

.empty-shelf {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-neutral-500);
}

.empty-shelf p {
  margin-bottom: 1rem;
}

/* ========== 導航列 ========== */
.nav-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
}

.back-btn {
  border: none;
  background: rgba(0, 0, 0, 0.04);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.nav-title {
  flex: 1;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-800);
}

/* ========== 文章列表 ========== */
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
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
}

.card-footer {
  display: flex;
  align-items: center;
}

.word-count {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* ========== 響應式 ========== */
@media (max-width: 768px) {
  .shelf-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }
  
  .book-card {
    width: 120px;
    height: 165px;
  }
  
  .book-spine {
    width: 16px;
  }
  
  .book-title {
    font-size: var(--text-sm);
  }
  
  .nav-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .back-btn {
    align-self: flex-start;
  }
  
  .nav-title {
    order: 2;
    width: 100%;
    text-align: center;
    margin: 0;
  }
  
  .search-input.compact {
    order: 3;
    max-width: none;
    width: 100%;
  }
}
</style>
