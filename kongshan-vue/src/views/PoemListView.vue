<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { usePoems } from '../composables/usePoems'
import { useNotificationStore } from '../stores/notifications'
import { useAdminStore } from '../stores/admin'
import UserPanel from '../components/UserPanel.vue'

const router = useRouter()
const { userId, userMetadata, signOut } = useAuth()
const {
  filteredPoems,
  loading,
  error,
  searchQuery,
  loadPoems,
  setSearchQuery,
  setCurrentPoem,
} = usePoems()

const notificationStore = useNotificationStore()
const adminStore = useAdminStore()

// 用戶面板狀態
const showUserPanel = ref(false)

// 搜索相關
const searchContainer = ref(null)
const searchInput = ref(null)
const searchValue = ref('')
const isSearchFocused = ref(false)
const scrollTimeout = ref(null)

// 加載詩歌
onMounted(async () => {
  await loadPoems()
  setupSearchAndScroll()
  
  // 檢查管理員權限
  if (userId.value) {
    await adminStore.checkAdmin(userId.value)
    
    // 檢查通知
    await notificationStore.checkNotifications(userId.value)
  }
})

// 設置搜索和滾動檢測
const setupSearchAndScroll = () => {
  const container = searchContainer.value
  const input = searchInput.value
  const poemList = document.querySelector('.poem-list')
  
  if (!container || !input || !poemList) return
  
  let isScrolling = false
  
  // 滾動檢測
  poemList.addEventListener('scroll', () => {
    if (searchValue.value.trim() || isSearchFocused.value) {
      if (!container.classList.contains('visible')) {
        container.classList.remove('hidden')
        container.classList.add('visible')
      }
      return
    }
    
    if (!isScrolling) {
      isScrolling = true
      container.classList.remove('hidden')
      container.classList.add('visible')
    }
    
    if (scrollTimeout.value) {
      clearTimeout(scrollTimeout.value)
    }
    
    scrollTimeout.value = setTimeout(() => {
      isScrolling = false
      if (!searchValue.value.trim() && !isSearchFocused.value) {
        container.classList.remove('visible')
        container.classList.add('hidden')
      }
    }, 1500)
  })
}

// 處理搜索
const handleSearchInput = (e) => {
  searchValue.value = e.target.value
  setSearchQuery(e.target.value)
}

// 打開詩歌
const openPoem = async (poem) => {
  // 在用戶交互時初始化 AudioContext（移動端特別重要）
  // 這確保了音頻可以正常播放
  console.log('✅ 用戶點擊詩歌卡片，準備初始化音頻環境')
  
  setCurrentPoem(poem)
  router.push(`/poems/${poem.id}`)
}

// 登出
const handleSignOut = async () => {
  await signOut()
  router.push('/')
}

// 用戶面板
const handleUserPanelClick = () => {
  showUserPanel.value = true
}

// 關閉用戶面板
const handleCloseUserPanel = () => {
  showUserPanel.value = false
}

// 管理後台
const handleAdminPanelClick = () => {
  alert('管理後台功能開發中...\n\n即將包含：\n- 音效審核\n- 詩句管理\n- 用戶管理\n- 數據統計')
}
</script>

<template>
  <div class="screen" id="poem-list-screen">
    <!-- 管理後台按鈕 -->
    <button 
      v-if="adminStore.isAdmin"
      id="admin-panel-btn" 
      class="admin-panel-btn" 
      type="button" 
      aria-label="管理後台"
      @click="handleAdminPanelClick"
    >
      <i class="fas fa-cog" aria-hidden="true"></i>
      <span class="sr-only">管理後台</span>
    </button>

    <div class="poem-list-container">
      <!-- 頁面頭部 -->
      <div class="poem-list-header">
        <h1 class="app-title">空山</h1>
        
        <!-- 用戶面板按鈕 -->
        <div class="user-panel-btn-container">
          <button 
            id="user-panel-btn" 
            class="user-panel-btn" 
            type="button" 
            aria-label="用戶面板"
            @click="handleUserPanelClick"
          >
            <i class="fas fa-mountain-sun" aria-hidden="true"></i>
            <span 
              v-if="notificationStore.hasUnread" 
              id="notification-badge" 
              class="notification-badge"
            >
              {{ notificationStore.unreadCount }}
            </span>
            <span class="sr-only">用戶面板</span>
          </button>
        </div>

        <!-- 搜索框 -->
        <div 
          ref="searchContainer"
          id="poem-search-container" 
          class="poem-search-container"
        >
          <input 
            ref="searchInput"
            v-model="searchValue"
            @input="handleSearchInput"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
            type="text" 
            id="poem-search-input" 
            class="poem-search-input" 
            placeholder="尋覓詩句"
            aria-label="搜索詩句"
          />
        </div>
      </div>

      <!-- 詩歌列表 -->
      <div id="poem-list" class="poem-list">
        <!-- 加載狀態 -->
        <p v-if="loading" class="placeholder-text">詩歌列表加載中...</p>

        <!-- 錯誤狀態 -->
        <p v-else-if="error" class="placeholder-text">{{ error }}</p>

        <!-- 空狀態 -->
        <p v-else-if="filteredPoems.length === 0" class="placeholder-text">
          {{ searchValue ? '未找到匹配的詩句' : '暫無詩歌' }}
        </p>

        <!-- 詩歌卡片 -->
        <div 
          v-else
          v-for="poem in filteredPoems" 
          :key="poem.id"
          class="poem-card"
          @click="openPoem(poem)"
        >
          <!-- 詩句內容 -->
          <div class="poem-card-verse">{{ poem.content }}</div>

          <!-- 聲色意境標記 -->
          <div 
            v-if="poem.hasAtmosphere" 
            class="poem-card-badge"
            aria-label="此詩句有聲色意境"
            title="此詩句有聲色意境"
          >
            <span class="poem-card-badge-dot"></span>
            <i class="fas fa-mountain-sun poem-card-badge-icon" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 用戶面板 -->
    <UserPanel
      :visible="showUserPanel"
      @close="handleCloseUserPanel"
      @sign-out="handleSignOut"
    />
  </div>
</template>

<style scoped>
/* 組件級別的樣式補充（如有需要） */
</style>
