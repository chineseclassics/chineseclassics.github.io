<template>
  <div class="min-h-screen bg-bg-primary p-8">
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-light text-text-primary mb-2">
          你畫我猜
        </h1>
        <p class="text-sm text-text-secondary">
          通過繪畫和猜測，學習中文詞彙
        </p>
      </div>
      
      <!-- 用戶認證組件 -->
      <div class="mb-8">
        <UserAuth />
      </div>

      <!-- 等待大廳（如果已加入房間） -->
      <div v-if="currentRoom && currentRoom.status === 'waiting'" class="mb-8">
        <WaitingLobby
          :room="currentRoom"
          :participants="participants"
          @start-game="handleStartGame"
          @leave-room="handleLeaveRoom"
        />
      </div>

      <!-- 主界面（未加入房間時） -->
      <div v-else class="space-y-4">
        <!-- 創建房間 -->
        <div v-if="showCreateForm" class="mb-8">
          <RoomCreate
            @created="handleRoomCreated"
            @cancel="() => { console.log('取消創建房間'); showCreateForm = false }"
          />
        </div>

        <!-- 加入房間 -->
        <div v-else-if="showJoinForm" class="mb-8">
          <RoomJoin
            @joined="handleRoomJoined"
            @cancel="showJoinForm = false"
          />
        </div>

        <!-- 操作按鈕 -->
        <div v-else class="space-y-4">
          <button
            @click="showCreateForm = true"
            class="btn-minimal w-full"
          >
            創建房間
          </button>
          <button
            @click="showJoinForm = true"
            class="btn-minimal w-full"
          >
            加入房間
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UserAuth from '../components/UserAuth.vue'
import RoomCreate from '../components/RoomCreate.vue'
import RoomJoin from '../components/RoomJoin.vue'
import WaitingLobby from '../components/WaitingLobby.vue'
import { useRoom } from '../composables/useRoom'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { currentRoom, participants, leaveRoom } = useRoom()
const { startGame } = useGame()

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
  const result = await startGame()
  if (result.success && currentRoom.value) {
    // 跳轉到遊戲房間頁面
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

// 檢查是否有當前房間（從路由參數）
onMounted(() => {
  // 如果從其他地方返回，檢查是否有房間狀態
  // 這裡可以添加邏輯來恢復房間狀態
  // roomCode 變量未使用，但保留以備將來使用
  // const roomCode = route.params.code as string
})
</script>

