<template>
  <div class="container margin-top-large">
    <div class="row flex-center">
      <div class="col-12 col-lg-10">
        <!-- 標題 -->
        <div class="text-center margin-bottom-large">
          <h1 class="text-hand-title" style="font-size: 2.25rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <PhPaintBrush :size="32" weight="duotone" style="color: var(--color-primary);" /> 你畫我猜
          </h1>
        </div>

        <!-- 未登入狀態：顯示登入區域 -->
        <div v-if="!authStore.isAuthenticated" class="home-welcome-section">
          <div class="welcome-card">
            <div class="welcome-icon">
              <PhPaintBrush :size="48" weight="duotone" />
            </div>
            <p class="welcome-text">與朋友一起畫畫猜詞，考驗默契！</p>
            <div class="welcome-auth">
              <UserAuth />
            </div>
            <p class="welcome-hint">使用 Google 帳號登入即可開始遊戲</p>
          </div>
        </div>

        <!-- 等待大廳（如果已加入房間且狀態為 waiting） -->
        <div v-if="currentRoom && currentRoom.status === 'waiting'" class="margin-bottom-medium">
          <WaitingLobby
            :room="currentRoom"
            :participants="participants"
            @start-game="handleStartGame"
            @leave-room="handleLeaveRoom"
          />
        </div>

        <!-- 如果房間狀態為 playing 或 finished，應該在 RoomView 中顯示，這裡自動跳轉 -->
        <div v-else-if="currentRoom && (currentRoom.status === 'playing' || currentRoom.status === 'finished')" class="margin-bottom-medium">
          <div class="text-center">
            <p class="text-hand">正在跳轉到遊戲房間...</p>
          </div>
        </div>

        <!-- 主界面（未加入房間時） -->
        <div v-else>
          <!-- 創建房間 -->
          <div v-if="showCreateForm" class="margin-bottom-medium">
            <RoomCreate
              @created="handleRoomCreated"
              @cancel="() => { console.log('取消創建房間'); showCreateForm = false }"
            />
          </div>

          <!-- 加入房間 -->
          <div v-else-if="showJoinForm" class="margin-bottom-medium">
            <RoomJoin
              @joined="handleRoomJoined"
              @cancel="showJoinForm = false"
            />
          </div>

          <!-- 分區式佈局：左側用戶信息，右側快速操作 -->
          <div v-else-if="authStore.isRegistered" class="home-main-layout">
            <!-- 左側：用戶信息 -->
            <div class="home-user-section">
              <div class="user-info-card">
                <div class="user-header">
                  <img
                    v-if="authStore.profile?.avatar_url"
                    :src="authStore.profile.avatar_url"
                    :alt="authStore.profile.display_name"
                    class="user-avatar"
                  />
                  <div
                    v-else
                    class="user-avatar user-avatar-placeholder"
                  >
                    {{ authStore.profile?.display_name?.charAt(0) || '?' }}
                  </div>
                  <div class="user-details">
                    <div class="user-name">{{ authStore.profile?.display_name || '用戶' }}</div>
                    <div class="user-status">{{ authStore.isAnonymous ? '匿名遊玩' : '已登入' }}</div>
                  </div>
                </div>
                <div v-if="authStore.isRegistered && authStore.profile" class="user-stats">
                  <div class="stat-item">
                    <span class="stat-label">總積分</span>
                    <span class="stat-value">{{ formatNumber(authStore.profile.total_score || 0) }}</span>
                  </div>
                </div>
                <div class="user-actions">
                  <button
                    @click="handleSignOut"
                    :disabled="authStore.loading"
                    class="paper-btn btn-small btn-block"
                  >
                    {{ authStore.loading ? '處理中...' : '登出' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 右側：快速操作 -->
            <div class="home-actions-section">
              <div class="actions-card">
                <div class="actions-buttons">
                  <button
                    @click="showCreateForm = true"
                    class="paper-btn btn-primary btn-block margin-bottom-small"
                  >
                    創建房間
                  </button>
                  <button
                    @click="showJoinForm = true"
                    class="paper-btn btn-secondary btn-block margin-bottom-small"
                  >
                    加入房間
                  </button>
                  <button
                    v-if="isAdmin"
                    class="paper-btn btn-warning btn-block"
                    @click="goWordLibrary"
                  >
                    詞句庫管理
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 已登入但非註冊用戶（匿名用戶）提示 -->
          <div v-else-if="authStore.isAuthenticated && !authStore.isRegistered" class="home-main-layout">
            <div class="home-auth-section">
              <div class="anonymous-upgrade-card">
                <p class="text-hand">您目前是匿名用戶</p>
                <p class="text-small text-secondary">使用 Google 登入以保存遊戲記錄</p>
                <UserAuth />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PhPaintBrush } from '@phosphor-icons/vue'
import UserAuth from '../components/UserAuth.vue'
import RoomCreate from '../components/RoomCreate.vue'
import RoomJoin from '../components/RoomJoin.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import { useRoom } from '../composables/useRoom'
import { useRealtime } from '../composables/useRealtime'
import { useAuthStore } from '../stores/auth'
import { useWordLibrary } from '../composables/useWordLibrary'

const router = useRouter()
const { currentRoom, participants, leaveRoom, isHost } = useRoom()
const { subscribeRoom } = useRealtime()
const authStore = useAuthStore()
const { isAdmin, refreshAdminStatus } = useWordLibrary()

const showCreateForm = ref(false)
const showJoinForm = ref(false)

// 處理房間創建成功
function handleRoomCreated(_roomCode: string) {
  showCreateForm.value = false
  // 房間創建後會自動加入，等待大廳會顯示
  // 如果已有房間，跳轉到房間頁面
  if (currentRoom.value) {
    router.push(`/room/${currentRoom.value.code}`)
  }
}

// 處理房間加入成功
function handleRoomJoined() {
  showJoinForm.value = false
  // 加入成功後，等待大廳會顯示
  // 如果已有房間，跳轉到房間頁面
  if (currentRoom.value) {
    router.push(`/room/${currentRoom.value.code}`)
  }
}

// 處理開始遊戲事件
// 注意：由於狀態變化會導致 WaitingLobby 被卸載，這個事件可能不會被觸發
// 實際跳轉由上方的 watch 處理
function handleStartGame() {
  console.log('[HomeView] 收到遊戲開始事件')
  // 跳轉已由 watch 處理，這裡作為備用
  if (currentRoom.value) {
    router.push(`/room/${currentRoom.value.code}`)
  }
}

// 處理離開房間
async function handleLeaveRoom() {
  const result = await leaveRoom()
  if (result.success) {
    showCreateForm.value = false
    showJoinForm.value = false
  }
}

// 當有房間時，訂閱 Realtime（參考句豆的實現）
watch(
  () => currentRoom.value,
  (room) => {
    if (room && authStore.user) {
      // 訂閱房間的所有實時更新
      subscribeRoom(
        room.code,
        room.id,
        authStore.user.id,
        {
          nickname: authStore.profile?.display_name || '玩家',
        }
      )
    }
    // 注意：不在這裡取消訂閱，因為跳轉到 RoomView 時 currentRoom 仍然存在
    // 只有在真正離開房間（調用 leaveRoom）時才取消訂閱
  },
  { immediate: true }
)

// 監聯房間狀態變化，當狀態變為 playing 或 finished 時自動跳轉到 RoomView
// 所有玩家（包括房主）都通過這個 watch 來處理跳轉
// 注意：房主原本依賴 WaitingLobby 的 emit 事件，但因為狀態變化會導致 WaitingLobby 被卸載，emit 無法被接收
watch(
  () => currentRoom.value?.status,
  async (status, oldStatus) => {
    console.log('[HomeView] 房間狀態變化:', { oldStatus, newStatus: status, currentRoute: router.currentRoute.value.name, isHost: isHost.value })
    
    // 當狀態變為 playing 或 finished 時跳轉到 RoomView
    // 檢查當前路由，避免重複跳轉
    if (currentRoom.value && (status === 'playing' || status === 'finished')) {
      const currentRoute = router.currentRoute.value
      // 如果當前不在 RoomView，則跳轉
      if (currentRoute.name !== 'room' || currentRoute.params.code !== currentRoom.value.code) {
        console.log('[HomeView] 準備跳轉到 RoomView:', currentRoom.value.code, '(isHost:', isHost.value, ')')
        const targetPath = `/room/${currentRoom.value.code}`
        
        try {
          await router.push(targetPath)
          console.log('[HomeView] 路由跳轉成功')
        } catch (err) {
          console.error('[HomeView] 路由跳轉錯誤:', err)
        }
      } else {
        console.log('[HomeView] 已在 RoomView，無需跳轉')
      }
    }
  }
)

// 檢查是否有當前房間（從路由參數）
onMounted(() => {
  // 如果從其他地方返回，檢查是否有房間狀態
  // 這裡可以添加邏輯來恢復房間狀態
  // roomCode 變量未使用，但保留以備將來使用
  // const roomCode = route.params.code as string
  if (authStore.profile?.email) {
    refreshAdminStatus(true)
  }
})

// 監聽登入狀態以刷新管理員權限
watch(
  () => authStore.profile?.email,
  (email) => {
    if (email) {
      refreshAdminStatus(true)
    }
  }
)

function goWordLibrary() {
  router.push('/word-library')
}

// 登出處理
async function handleSignOut() {
  const result = await authStore.signOut()
  if (!result.success) {
    console.error('登出失敗:', result.error)
  }
}

// 格式化數字（添加千分位分隔符）
function formatNumber(num: number): string {
  return num.toLocaleString('zh-TW')
}
</script>

<style scoped>
/* 主佈局容器 */
.home-main-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .home-main-layout {
    grid-template-columns: 280px 1fr;
    gap: 2rem;
  }
}

/* 左側：用戶信息區 */
.home-user-section {
  width: 100%;
}

.user-info-card {
  background-color: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 0;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.user-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-light);
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 0;
  object-fit: cover;
  border: 2px solid var(--border-color);
  display: block;
  flex-shrink: 0;
}

.user-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  font-family: var(--font-head);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-family: var(--font-head);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.user-stats {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
  font-family: var(--font-head);
  letter-spacing: 1px;
}

.user-actions {
  width: 100%;
}

/* 右側：快速操作區 */
.home-actions-section {
  width: 100%;
}

.actions-card {
  background-color: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 0;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  min-height: 200px;
}

.actions-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 登入區域（未登入時） */
.home-auth-section {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

/* 歡迎區域（未登入時的主界面） */
.home-welcome-section {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.welcome-card {
  background-color: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 0;
  padding: 2rem 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.welcome-icon {
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.welcome-text {
  font-size: 1.1rem;
  color: var(--text-primary);
  font-family: var(--font-head);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.welcome-auth {
  margin-bottom: 1rem;
}

.welcome-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

/* 匿名用戶升級提示卡片 */
.anonymous-upgrade-card {
  background-color: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 0;
  padding: 1.5rem;
  text-align: center;
}

.anonymous-upgrade-card .text-hand {
  margin-bottom: 0.5rem;
}

.anonymous-upgrade-card .text-small {
  margin-bottom: 1rem;
}

/* 響應式調整 */
@media (max-width: 767px) {
  .home-main-layout {
    gap: 1rem;
  }

  .user-info-card {
    padding: 1rem;
  }

  .actions-card {
    padding: 1.25rem;
  }

  .user-header {
    flex-direction: column;
    text-align: center;
  }

  .user-details {
    text-align: center;
  }
}
</style>

