<template>
  <div class="container margin-top-large">
    <div class="row flex-center">
      <div class="col-12 col-md-8 col-lg-6">
        <!-- 標題 -->
        <div class="text-center margin-bottom-medium">
          <h1 class="text-hand-title" style="font-size: 2.25rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <PhPaintBrush :size="32" weight="duotone" style="color: var(--color-primary);" /> 你畫我猜
          </h1>
        </div>
      
        <!-- 用戶認證組件 -->
        <div class="margin-bottom-medium">
          <UserAuth />
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

          <!-- 操作按鈕（僅限 Google 登入用戶） -->
          <div v-else-if="authStore.isRegistered" class="home-actions">
            <button
              @click="showCreateForm = true"
              class="paper-btn btn-primary btn-block margin-bottom-small"
            >
              創建房間
            </button>
            <button
              @click="showJoinForm = true"
              class="paper-btn btn-secondary btn-block"
            >
              加入房間
            </button>
          </div>
          
          <!-- 未登入或匿名用戶提示 -->
          <div v-else class="home-actions">
            <div class="alert alert-info text-center">
              <p class="text-hand">請使用 Google 登入以創建或加入房間</p>
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

const router = useRouter()
const { currentRoom, participants, leaveRoom, isHost } = useRoom()
const { subscribeRoom } = useRealtime()
const authStore = useAuthStore()

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
})
</script>

<style scoped>
.home-actions {
  max-width: 100%;
}

@media (min-width: 768px) {
  .home-actions {
    max-width: 400px;
    margin: 0 auto;
  }
}
</style>

