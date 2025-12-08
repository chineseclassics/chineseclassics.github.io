<template>
  <div class="container margin-top-large">
    <div class="row flex-center">
      <div class="col-12 col-md-10 col-lg-8">
        <div class="text-center margin-bottom-large">
          <h1 class="text-hand-title" style="font-size: 2.5rem; margin-bottom: 0.5rem;">
            🎨 你畫我猜
          </h1>
          <p class="lead text-hand" style="color: var(--text-secondary);">
            通過繪畫和猜測，學習中文詞彙
          </p>
        </div>
      
        <!-- 用戶認證組件 -->
        <div class="margin-bottom-large">
          <UserAuth />
        </div>

        <!-- 等待大廳（如果已加入房間且狀態為 waiting） -->
        <div v-if="currentRoom && currentRoom.status === 'waiting'" class="margin-bottom-large">
          <WaitingLobby
            :room="currentRoom"
            :participants="participants"
            @start-game="handleStartGame"
            @leave-room="handleLeaveRoom"
          />
        </div>

        <!-- 如果房間狀態為 playing 或 finished，應該在 RoomView 中顯示，這裡自動跳轉 -->
        <div v-else-if="currentRoom && (currentRoom.status === 'playing' || currentRoom.status === 'finished')" class="margin-bottom-large">
          <div class="text-center">
            <p class="text-hand">正在跳轉到遊戲房間...</p>
          </div>
        </div>

        <!-- 主界面（未加入房間時） -->
        <div v-else>
          <!-- 創建房間 -->
          <div v-if="showCreateForm" class="margin-bottom-large">
            <RoomCreate
              @created="handleRoomCreated"
              @cancel="() => { console.log('取消創建房間'); showCreateForm = false }"
            />
          </div>

          <!-- 加入房間 -->
          <div v-else-if="showJoinForm" class="margin-bottom-large">
            <RoomJoin
              @joined="handleRoomJoined"
              @cancel="showJoinForm = false"
            />
          </div>

          <!-- 操作按鈕 -->
          <div v-else class="row flex-center">
            <div class="col-12 col-md-6">
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import UserAuth from '../components/UserAuth.vue'
import RoomCreate from '../components/RoomCreate.vue'
import RoomJoin from '../components/RoomJoin.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import { useRoom } from '../composables/useRoom'
import { useGame } from '../composables/useGame'
import { useRealtime } from '../composables/useRealtime'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const { currentRoom, participants, leaveRoom } = useRoom()
const { startGame } = useGame()
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

// 處理開始遊戲
async function handleStartGame() {
  console.log('[HomeView] 開始遊戲，當前狀態:', currentRoom.value?.status)
  const result = await startGame()
  console.log('[HomeView] 開始遊戲結果:', result, '當前狀態:', currentRoom.value?.status)
  
  if (result.success) {
    // 遊戲開始成功，跳轉由 watch 處理（避免重複跳轉）
    console.log('[HomeView] 遊戲開始成功，等待 watch 觸發跳轉')
  } else {
    console.error('開始遊戲失敗:', result.error)
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
watch(
  () => currentRoom.value?.status,
  async (status, oldStatus) => {
    console.log('[HomeView] 房間狀態變化:', { oldStatus, newStatus: status, currentRoute: router.currentRoute.value.name })
    
    // 當狀態變為 playing 或 finished 時跳轉到 RoomView
    // 檢查當前路由，避免重複跳轉
    if (currentRoom.value && (status === 'playing' || status === 'finished')) {
      const currentRoute = router.currentRoute.value
      // 如果當前不在 RoomView，則跳轉
      if (currentRoute.name !== 'room' || currentRoute.params.code !== currentRoom.value.code) {
        console.log('[HomeView] 準備跳轉到 RoomView:', currentRoom.value.code)
        const targetPath = `/room/${currentRoom.value.code}`
        console.log('[HomeView] 跳轉目標路徑:', targetPath)
        
        try {
          // 直接跳轉，不使用 setTimeout
          const navigationResult = await router.push(targetPath)
          console.log('[HomeView] 路由跳轉結果:', navigationResult)
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

