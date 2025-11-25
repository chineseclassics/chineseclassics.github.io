<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNotificationStore } from '../stores/notifications'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'signOut'])

const { userId, userMetadata } = useAuth()
const notificationStore = useNotificationStore()

const activeTab = ref('ranking')
const visitorCount = ref(0)

// 切換標籤
const switchTab = (tab) => {
  activeTab.value = tab
  
  // 載入對應內容
  if (tab === 'messages') {
    loadMessages()
  } else if (tab === 'ranking') {
    loadRanking()
  }
}

// 載入排行榜
const loadRanking = async () => {
  // TODO: 從 Supabase 加載旅人排行榜
}

// 載入通知
const loadMessages = async () => {
  if (userId.value) {
    await notificationStore.loadNotifications(userId.value)
  }
}

// 關閉面板
const handleClose = () => {
  emit('close')
}

// 登出
const handleSignOut = () => {
  emit('signOut')
  handleClose()
}

onMounted(() => {
  if (activeTab.value === 'ranking') {
    loadRanking()
  }
})
</script>

<template>
  <div v-if="visible" class="user-panel-modal" aria-live="polite" role="dialog" aria-labelledby="user-panel-title">
    <div class="user-panel-modal-overlay" @click="handleClose"></div>
    <div class="user-panel-modal-content">
      <!-- 頭部 -->
      <div class="user-panel-modal-header">
        <div class="user-panel-user-info">
          <h2 id="user-panel-title" class="user-panel-title">
            {{ userMetadata?.fullName || userMetadata?.email || '旅人' }}
          </h2>
          <p class="user-panel-subtitle">
            {{ visitorCount > 0 ? `第 ${visitorCount} 位到訪旅人` : '歡迎來到空山' }}
          </p>
        </div>
        <button 
          class="user-panel-close-btn" 
          type="button" 
          aria-label="關閉"
          @click="handleClose"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>

      <!-- 標籤切換 -->
      <div class="user-panel-tabs">
        <button 
          :class="['user-panel-tab', { active: activeTab === 'ranking' }]"
          data-tab="ranking" 
          type="button"
          @click="switchTab('ranking')"
        >
          <i class="fas fa-mountain" aria-hidden="true"></i>
          <span>山外</span>
        </button>
        <button 
          :class="['user-panel-tab', { active: activeTab === 'friends' }]"
          data-tab="friends" 
          type="button"
          @click="switchTab('friends')"
        >
          <i class="fas fa-users" aria-hidden="true"></i>
          <span>友鄰</span>
        </button>
        <button 
          :class="['user-panel-tab', { active: activeTab === 'messages' }]"
          data-tab="messages" 
          type="button"
          @click="switchTab('messages')"
        >
          <i class="fas fa-envelope" aria-hidden="true"></i>
          <span>信箋</span>
          <span 
            v-if="notificationStore.hasUnread"
            class="user-panel-tab-badge"
          >
            {{ notificationStore.unreadCount }}
          </span>
        </button>
      </div>

      <!-- 標籤內容 -->
      <div class="user-panel-tab-content">
        <!-- 山外 - 排行榜 -->
        <div v-show="activeTab === 'ranking'" class="user-panel-tab-pane active" data-pane="ranking">
          <div class="user-panel-content-area">
            <div class="user-panel-empty-state">
              <i class="fas fa-mountain" aria-hidden="true"></i>
              <p>排行榜功能開發中</p>
            </div>
          </div>
        </div>

        <!-- 友鄰 - 好友列表 -->
        <div v-show="activeTab === 'friends'" class="user-panel-tab-pane" data-pane="friends">
          <div class="user-panel-content-area">
            <div class="user-panel-empty-state">
              <i class="fas fa-users" aria-hidden="true"></i>
              <p>好友功能開發中</p>
            </div>
          </div>
        </div>

        <!-- 信箋 - 通知 -->
        <div v-show="activeTab === 'messages'" class="user-panel-tab-pane" data-pane="messages">
          <div class="user-panel-content-area">
            <div v-if="notificationStore.loading" class="user-panel-loading">
              <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
              <p>載入中...</p>
            </div>
            <div v-else-if="notificationStore.notifications.length === 0" class="user-panel-empty-state">
              <i class="fas fa-envelope-open" aria-hidden="true"></i>
              <p>暫無信箋</p>
            </div>
            <div v-else class="notifications-list">
              <div 
                v-for="notification in notificationStore.notifications" 
                :key="notification.id"
                :class="['notification-item', { unread: !notification.is_read }]"
                @click="notificationStore.markAsRead(notification.id, userId)"
              >
                <div class="notification-content">
                  <h4 class="notification-title">{{ notification.title }}</h4>
                  <p class="notification-message">{{ notification.message }}</p>
                  <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="user-panel-modal-footer">
        <button 
          class="user-panel-btn user-panel-btn-secondary"
          @click="handleSignOut"
        >
          <i class="fas fa-sign-out-alt"></i>
          登出
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// 輔助函數
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '剛剛'
  if (minutes < 60) return `${minutes} 分鐘前`
  if (hours < 24) return `${hours} 小時前`
  if (days < 7) return `${days} 天前`
  
  return date.toLocaleDateString('zh-TW')
}
</script>

<style scoped>
/* 使用全局 CSS */
</style>

