<script setup lang="ts">
/**
 * 老師模式 - 課堂鬥豆等待室
 * 
 * 顯示房間碼、學生加入情況、分組操作
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'
import { TEAM_COLORS, type TeamColor } from '../../../types/game'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId as string)

// 分組狀態
const showAssignModal = ref(false)
const selectedParticipant = ref<any>(null)
const randomAssigning = ref(false)

// 房間數據
const room = computed(() => gameStore.currentRoom)
const teams = computed(() => room.value?.teams || [])
const participants = computed(() => room.value?.participants || [])
const unassigned = computed(() => participants.value.filter(p => !p.team_id))

// 房間碼顯示
const roomCodeDisplay = computed(() => {
  const code = room.value?.room_code || ''
  return code.split('').join(' ')
})

// 按團隊分組的參與者
const participantsByTeam = computed(() => {
  const result: Record<string, any[]> = {}
  for (const team of teams.value) {
    result[team.id] = participants.value.filter(p => p.team_id === team.id)
  }
  return result
})

// 是否可以開始遊戲
const canStart = computed(() => {
  if (!room.value || participants.value.length < 2) return false
  // 所有人都已分組
  return unassigned.value.length === 0
})

// 加載房間
async function loadRoom() {
  // 如果已經有房間數據且是同一個房間，直接訂閱
  if (room.value?.id === roomId.value) {
    gameStore.subscribeToRoom(roomId.value)
    return
  }

  // 否則通過房間碼加入（實際上是查詢房間）
  // 這裡假設老師已經創建了房間，直接訂閱即可
  gameStore.subscribeToRoom(roomId.value)
}

// 打開分組模態框
function openAssignModal(participant: any) {
  selectedParticipant.value = participant
  showAssignModal.value = true
}

// 分配到團隊
async function assignToTeam(teamId: string) {
  if (!selectedParticipant.value) return
  
  await gameStore.assignToTeam(selectedParticipant.value.id, teamId)
  showAssignModal.value = false
  selectedParticipant.value = null
}

// 隨機分組
async function randomAssign() {
  randomAssigning.value = true
  await gameStore.randomAssignTeams()
  randomAssigning.value = false
}

// 標記是否正常導航到大屏幕（開始比賽）
const isStartingGame = ref(false)

// 開始遊戲
async function startGame() {
  isStartingGame.value = true  // 標記正在開始比賽，防止自動取消
  const success = await gameStore.startGame()
  if (success) {
    router.push({ name: 'arena-teacher-board', params: { roomId: roomId.value } })
  } else {
    isStartingGame.value = false  // 失敗時重置標記
  }
}

// 取消遊戲
async function cancelGame() {
  if (confirm('確定要取消比賽嗎？所有學生將被移出房間。')) {
    await gameStore.leaveRoom()
    router.push({ name: 'arena' })
  }
}

// 複製房間碼
function copyRoomCode() {
  if (room.value?.room_code) {
    navigator.clipboard.writeText(room.value.room_code)
    alert('已複製房間碼！')
  }
}

// 離開頁面前的清理
async function cleanupOnLeave() {
  // 如果是正常開始比賽，不要取消
  if (isStartingGame.value) return
  
  // 如果房間還在等待中，自動取消
  if (room.value?.status === 'waiting') {
    console.log('[GameLobby] 老師離開等待室，自動取消比賽')
    await gameStore.leaveRoom()
  }
}

// 瀏覽器關閉/刷新時的警告和清理
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (room.value?.status === 'waiting' && !isStartingGame.value) {
    e.preventDefault()
    e.returnValue = '比賽尚未開始，離開將取消比賽。確定離開嗎？'
    return e.returnValue
  }
}

onMounted(() => {
  loadRoom()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(async () => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  await cleanupOnLeave()
})
</script>

<template>
  <div class="game-lobby">
    <!-- 頂部導航 -->
    <header class="lobby-header">
      <button class="back-btn" @click="cancelGame">
        ← 取消比賽
      </button>
      <div class="header-title">
        <h1>課堂鬥豆 · 等待室</h1>
        <p class="text-title">{{ room?.text?.title }}</p>
      </div>
    </header>

    <!-- 房間碼 -->
    <section class="room-code-section">
      <div class="room-code-card">
        <p class="code-label">房間碼</p>
        <div class="room-code" @click="copyRoomCode">
          {{ roomCodeDisplay }}
        </div>
        <p class="code-hint">點擊複製 · 請學生輸入此碼加入</p>
      </div>
    </section>

    <!-- 分組區域 -->
    <section class="teams-section">
      <div class="section-header">
        <h2>隊伍分組</h2>
        <div class="section-actions">
          <button 
            class="btn-secondary"
            :disabled="unassigned.length === 0 || randomAssigning"
            @click="randomAssign"
          >
            {{ randomAssigning ? '分配中...' : '🎲 隨機分組' }}
          </button>
        </div>
      </div>

      <!-- 未分組學生 -->
      <div v-if="unassigned.length > 0" class="unassigned-section">
        <h3>
          <span class="section-icon">👤</span>
          未分組 ({{ unassigned.length }})
        </h3>
        <div class="participant-list">
          <button
            v-for="p in unassigned"
            :key="p.id"
            class="participant-card unassigned"
            @click="openAssignModal(p)"
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
          </button>
        </div>
      </div>

      <!-- 各隊伍 -->
      <div class="teams-grid">
        <div 
          v-for="team in teams" 
          :key="team.id"
          class="team-card"
          :style="{ 
            '--team-primary': TEAM_COLORS[team.team_color as TeamColor].primary,
            '--team-secondary': TEAM_COLORS[team.team_color as TeamColor].secondary,
            '--team-text': TEAM_COLORS[team.team_color as TeamColor].text,
          }"
        >
          <div class="team-header">
            <h3>{{ team.team_name }}</h3>
            <span class="team-count">{{ participantsByTeam[team.id]?.length || 0 }} 人</span>
          </div>
          
          <div class="team-members">
            <div
              v-for="p in participantsByTeam[team.id]"
              :key="p.id"
              class="member-item"
            >
              <img 
                v-if="p.user?.avatar_url" 
                :src="p.user.avatar_url" 
                :alt="p.user.display_name"
                class="avatar small"
              />
              <span v-else class="avatar-placeholder small">
                {{ p.user?.display_name?.charAt(0) || '?' }}
              </span>
              <span class="name">{{ p.user?.display_name || '未知' }}</span>
            </div>
            
            <div v-if="!participantsByTeam[team.id]?.length" class="empty-team">
              暫無成員
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部操作 -->
    <footer class="lobby-footer">
      <div class="footer-info">
        <span class="player-count">
          👥 {{ participants.length }} 位學生已加入
        </span>
        <span v-if="unassigned.length > 0" class="warning-text">
          還有 {{ unassigned.length }} 人未分組
        </span>
      </div>
      
      <button 
        class="btn-primary btn-large"
        :disabled="!canStart"
        @click="startGame"
      >
        🚀 開始比賽
      </button>
    </footer>

    <!-- 分組模態框 -->
    <Teleport to="body">
      <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
        <div class="modal-content">
          <h3>將 {{ selectedParticipant?.user?.display_name }} 分配到</h3>
          
          <div class="team-buttons">
            <button
              v-for="team in teams"
              :key="team.id"
              class="team-select-btn"
              :style="{ 
                background: TEAM_COLORS[team.team_color as TeamColor].secondary,
                borderColor: TEAM_COLORS[team.team_color as TeamColor].primary,
                color: TEAM_COLORS[team.team_color as TeamColor].text,
              }"
              @click="assignToTeam(team.id)"
            >
              {{ team.team_name }}
            </button>
          </div>
          
          <button class="btn-text" @click="showAssignModal = false">
            取消
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.game-lobby {
  min-height: 100vh;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
}

/* 頂部導航 */
.lobby-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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

.header-title h1 {
  margin: 0;
  font-size: 1.5rem;
}

.text-title {
  margin: 0.25rem 0 0 0;
  color: var(--color-neutral-500);
  font-size: 0.95rem;
}

/* 房間碼 */
.room-code-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.room-code-card {
  background: white;
  padding: 2rem 3rem;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.code-label {
  margin: 0 0 0.5rem 0;
  color: var(--color-neutral-500);
  font-size: 0.875rem;
}

.room-code {
  font-size: 3rem;
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

/* 分組區域 */
.teams-section {
  max-width: 1200px;
  margin: 0 auto 6rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
}

/* 未分組學生 */
.unassigned-section {
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  border: 2px dashed var(--color-neutral-300);
}

.unassigned-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.participant-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-neutral-100);
  border: 2px solid transparent;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.participant-card:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.small {
  width: 24px;
  height: 24px;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.avatar-placeholder.small {
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
}

.name {
  font-weight: 500;
  font-size: 0.9rem;
}

/* 隊伍網格 */
.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.team-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-top: 4px solid var(--team-primary);
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--team-secondary);
}

.team-header h3 {
  margin: 0;
  color: var(--team-text);
}

.team-count {
  font-size: 0.875rem;
  color: var(--team-text);
  opacity: 0.8;
}

.team-members {
  padding: 1rem 1.25rem;
  min-height: 100px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-neutral-100);
}

.member-item:last-child {
  border-bottom: none;
}

.empty-team {
  color: var(--color-neutral-400);
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

/* 底部操作 */
.lobby-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-count {
  font-weight: 600;
}

.warning-text {
  color: var(--color-warning);
  font-size: 0.875rem;
}

/* 模態框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 20px;
  text-align: center;
  min-width: 300px;
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
}

.team-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.team-select-btn {
  padding: 1rem;
  border: 2px solid;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.team-select-btn:hover {
  transform: scale(1.02);
}

/* 按鈕 */
.btn-primary {
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
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
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: white;
  color: var(--color-neutral-700);
  border: 2px solid var(--color-neutral-200);
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-neutral-400);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-text {
  background: none;
  border: none;
  color: var(--color-neutral-500);
  cursor: pointer;
  padding: 0.5rem;
}

.btn-text:hover {
  color: var(--color-neutral-700);
}
</style>

