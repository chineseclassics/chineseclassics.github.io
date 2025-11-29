<script setup lang="ts">
/**
 * 學生模式 - 鬥豆場等待室
 * 
 * 顯示房間碼、參與者、準備開始
 */

import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../../stores/authStore'
import { useGameStore } from '../../../stores/gameStore'
import { TIME_MODE_OPTIONS } from '../../../types/game'
import BeanIcon from '../../../components/common/BeanIcon.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId as string)

// 標記是否正常導航到做題頁面（開始比賽）
const isStartingGame = ref(false)

// 房間數據
const room = computed(() => gameStore.currentRoom)
const participants = computed(() => room.value?.participants || [])
const isHost = computed(() => gameStore.isHost)
const isRealtimeConnected = computed(() => gameStore.isRealtimeConnected)

// 房間碼顯示
const roomCodeDisplay = computed(() => {
  const code = room.value?.room_code || ''
  return code.split('').join(' ')
})

// 時間模式文字
const timeModeText = computed(() => {
  const option = TIME_MODE_OPTIONS.find(t => t.value === room.value?.time_limit)
  return option ? `${option.label}（${option.description}）` : ''
})

// 空位數量（確保為正整數）
const emptySlots = computed(() => {
  const maxPlayers = room.value?.max_players || 0
  const currentPlayers = participants.value.length
  return Math.max(0, maxPlayers - currentPlayers)
})

// 監聽房間狀態
watch(() => room.value?.status, (status) => {
  if (status === 'playing') {
    // 比賽開始，跳轉到做題頁面
    isStartingGame.value = true  // 標記正在開始比賽，防止清理時取消
    router.push({ name: 'arena-play', params: { roomId: roomId.value } })
  } else if (status === 'cancelled') {
    alert('房間已被取消')
    router.push({ name: 'arena' })
  }
})

// 複製房間碼
function copyRoomCode() {
  if (room.value?.room_code) {
    navigator.clipboard.writeText(room.value.room_code)
    alert('已複製房間碼！分享給朋友吧！')
  }
}

// 開始遊戲（房主操作）
async function startGame() {
  if (!isHost.value || participants.value.length < 2) return
  
  isStartingGame.value = true  // 標記正在開始比賽，防止自動取消
  const success = await gameStore.startGame()
  if (success) {
    router.push({ name: 'arena-play', params: { roomId: roomId.value } })
  } else {
    isStartingGame.value = false  // 失敗時重置標記
  }
}

// 離開房間
async function leaveRoom() {
  if (isHost.value) {
    if (!confirm('你是局主，離開將取消房間，確定嗎？')) return
  }
  
  await gameStore.leaveRoom()
  router.push({ name: 'arena' })
}

// 離開頁面前的清理（退還入場費）
async function cleanupOnLeave() {
  // 如果是正常開始比賽，不要取消
  if (isStartingGame.value) {
    console.log('[RoomLobby] 正在開始比賽，不執行清理')
    return
  }
  
  // 如果房間還在等待中，自動離開（會觸發退款）
  if (room.value?.status === 'waiting') {
    console.log('[RoomLobby] 用戶離開等待室，自動取消/離開房間')
    await gameStore.leaveRoom()
  }
}

// 瀏覽器關閉/刷新時的警告
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (room.value?.status === 'waiting' && !isStartingGame.value) {
    e.preventDefault()
    // 嘗試同步退款（beforeunload 中異步操作可能不可靠）
    // 這裡主要是給用戶一個警告
    if (isHost.value) {
      e.returnValue = '比賽尚未開始，離開將取消房間。確定離開嗎？'
    } else {
      e.returnValue = '比賽尚未開始，離開將退出房間。確定離開嗎？'
    }
    return e.returnValue
  }
}

onMounted(() => {
  console.log('[RoomLobby] 組件掛載，訂閱房間:', roomId.value)
  gameStore.subscribeToRoom(roomId.value)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(async () => {
  console.log('[RoomLobby] 組件卸載')
  window.removeEventListener('beforeunload', handleBeforeUnload)
  await cleanupOnLeave()
})
</script>

<template>
  <div class="room-lobby">
    <!-- 頂部導航 -->
    <header class="lobby-header">
      <button class="back-btn" @click="leaveRoom">
        ← {{ isHost ? '取消房間' : '離開' }}
      </button>
    </header>

    <!-- 連接狀態提示 -->
    <div v-if="!isRealtimeConnected" class="connection-warning">
      <span class="warning-icon">⚠️</span>
      <span>實時連接異常，已啟用備用方案</span>
    </div>

    <!-- 房間信息 -->
    <section class="room-info-card">
      <div class="text-title">
        <h2>{{ room?.text?.title }}</h2>
        <p v-if="room?.text?.author">{{ room?.text?.author }}</p>
      </div>
      
      <div class="room-meta">
        <span class="meta-item">
          👥 {{ room?.max_players ? `${room.max_players} 人對戰` : '多人對戰' }}
        </span>
        <span class="meta-item">
          ⏱️ {{ timeModeText }}
        </span>
        <span v-if="room?.entry_fee" class="meta-item fee">
          <BeanIcon :size="14" /> {{ room.entry_fee }} 豆入場
        </span>
        <span v-else class="meta-item free">
          🆓 免費房間
        </span>
      </div>
    </section>

    <!-- 房間碼 -->
    <section class="room-code-section">
      <div class="room-code-card">
        <p class="code-label">房間碼</p>
        <div class="room-code" @click="copyRoomCode">
          {{ roomCodeDisplay }}
        </div>
        <p class="code-hint">點擊複製 · 分享給朋友</p>
      </div>
    </section>

    <!-- 獎池信息 -->
    <div v-if="room?.prize_pool" class="prize-pool">
      <span class="prize-icon">🏆</span>
      <span class="prize-label">獎池</span>
      <span class="prize-value">{{ room.prize_pool }} 豆</span>
    </div>

    <!-- 參與者列表 -->
    <section class="participants-section">
      <h3>參與者 ({{ participants.length }}{{ room?.max_players ? `/${room.max_players}` : '' }})</h3>
      
      <div class="participants-grid">
        <div
          v-for="p in participants"
          :key="p.id"
          class="participant-card"
          :class="{ 
            host: p.user_id === room?.host_id,
            me: p.user_id === authStore.user?.id
          }"
        >
          <img 
            v-if="p.user?.avatar_url" 
            :src="p.user.avatar_url" 
            :alt="p.user.display_name"
            class="avatar"
          />
          <span v-else class="avatar-placeholder">
            {{ p.user?.display_name?.charAt(0) || '?' }}
          </span>
          <span class="name">{{ p.user?.display_name || '未知' }}</span>
          <span v-if="p.user_id === room?.host_id" class="host-badge">局主</span>
        </div>

        <!-- 空位 -->
        <div 
          v-for="i in emptySlots" 
          :key="'empty-' + i"
          class="participant-card empty"
        >
          <div class="empty-avatar">?</div>
          <span class="empty-text">等待加入...</span>
        </div>
      </div>
    </section>

    <!-- 底部操作 -->
    <footer class="lobby-footer">
      <template v-if="isHost">
        <p class="footer-hint">
          {{ participants.length < 2 ? '至少需要 2 人才能開始' : '人員已到齊，可以開始！' }}
        </p>
        <button 
          class="btn-primary btn-large"
          :disabled="participants.length < 2"
          @click="startGame"
        >
          🚀 開始比賽
        </button>
      </template>
      <template v-else>
        <p class="footer-hint">
          等待局主開始比賽...
        </p>
        <div class="waiting-animation">
          <span></span><span></span><span></span>
        </div>
      </template>
    </footer>
  </div>
</template>

<style scoped>
.room-lobby {
  min-height: 100vh;
  padding: 1.5rem;
  background: linear-gradient(135deg, #fef3c7, #fef9c3);
}

/* 頂部導航 */
.lobby-header {
  margin-bottom: 1.5rem;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-neutral-600);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.5rem;
}

.back-btn:hover {
  color: var(--color-error);
}

/* 連接狀態警告 */
.connection-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #92400e;
}

.warning-icon {
  font-size: 1rem;
}

/* 房間信息卡片 */
.room-info-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.text-title h2 {
  margin: 0;
  font-size: 1.25rem;
}

.text-title p {
  margin: 0.25rem 0 0 0;
  color: var(--color-neutral-500);
}

.room-meta {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.meta-item {
  padding: 0.25rem 0.75rem;
  background: var(--color-neutral-100);
  border-radius: 20px;
  font-size: 0.875rem;
}

.meta-item.fee {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.meta-item.free {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #166534;
}

/* 房間碼 */
.room-code-section {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.room-code-card {
  background: white;
  padding: 1.5rem 2.5rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.code-label {
  margin: 0 0 0.5rem 0;
  color: var(--color-neutral-500);
  font-size: 0.875rem;
}

.room-code {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.5rem;
  color: var(--color-primary-600);
  cursor: pointer;
  transition: transform 0.2s;
}

.room-code:hover {
  transform: scale(1.05);
}

.code-hint {
  margin: 0.5rem 0 0 0;
  color: var(--color-neutral-400);
  font-size: 0.75rem;
}

/* 獎池 */
.prize-pool {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.prize-icon {
  font-size: 1.5rem;
}

.prize-label {
  color: #92400e;
}

.prize-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #92400e;
}

/* 參與者 */
.participants-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 6rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.participants-section h3 {
  margin: 0 0 1rem 0;
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.participant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
  background: var(--color-neutral-50);
  border-radius: 12px;
  border: 2px solid transparent;
  position: relative;
}

.participant-card.me {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.participant-card.host {
  border-color: #eab308;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.name {
  font-weight: 600;
  text-align: center;
}

.host-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 0.125rem 0.5rem;
  background: #eab308;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 10px;
}

.participant-card.empty {
  border: 2px dashed var(--color-neutral-300);
  background: transparent;
}

.empty-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-neutral-200);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--color-neutral-400);
}

.empty-text {
  color: var(--color-neutral-400);
  font-size: 0.875rem;
}

/* 底部操作 */
.lobby-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 2rem;
  background: white;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.footer-hint {
  margin: 0 0 1rem 0;
  color: var(--color-neutral-600);
}

/* 等待動畫 */
.waiting-animation {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.waiting-animation span {
  width: 12px;
  height: 12px;
  background: var(--color-primary-400);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.waiting-animation span:nth-child(1) { animation-delay: -0.32s; }
.waiting-animation span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 按鈕 */
.btn-primary {
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-500-rgb), 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.btn-large {
  padding: 1rem 3rem;
  font-size: 1.2rem;
}
</style>

