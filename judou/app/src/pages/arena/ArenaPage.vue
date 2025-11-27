<script setup lang="ts">
/**
 * 鬥豆 - 主頁面
 * 
 * 根據用戶角色顯示不同的內容：
 * - 老師：課堂鬥豆（創建班級比賽）
 * - 學生：優先顯示班級比賽，其次是 PK 競技
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { useGameStore } from '../../stores/gameStore'
import { useUserStatsStore } from '../../stores/userStatsStore'
import { supabase } from '../../lib/supabaseClient'
import { ENTRY_FEE_OPTIONS, SAFETY_LIMITS, getRankTitle, type GameRoom } from '../../types/game'

const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()
const userStatsStore = useUserStatsStore()

// Tab 狀態
type TabType = 'create' | 'join' | 'rooms'
const activeTab = ref<TabType>('rooms')

// 加入房間
const roomCode = ref('')
const joinLoading = ref(false)
const joinError = ref('')

// 班級比賽（學生專用）
const classGames = ref<GameRoom[]>([])
const classGamesLoading = ref(false)
let classGamesSubscription: any = null
const myClassIds = ref<string[]>([])

// 用戶統計
const beans = computed(() => userStatsStore.profile?.total_beans ?? 0)
const level = computed(() => userStatsStore.level)
const rankTitle = computed(() => getRankTitle(level.value))
// 這些欄位將在數據庫遷移後可用，目前使用默認值
const winStreak = computed(() => (userStatsStore.profile as any)?.pvp_win_streak ?? 0)
const pvpStats = computed(() => ({
  wins: (userStatsStore.profile as any)?.pvp_total_wins ?? 0,
  games: (userStatsStore.profile as any)?.pvp_total_games ?? 0,
  winRate: (userStatsStore.profile as any)?.pvp_total_games 
    ? Math.round(((userStatsStore.profile as any)?.pvp_total_wins ?? 0) / (userStatsStore.profile as any).pvp_total_games * 100) 
    : 0,
}))

// 解鎖條件（僅適用於學生自己創建的 PK 競技，不影響課堂鬥豆）
const UNLOCK_LEVEL = 5
const isPvpUnlocked = computed(() => level.value >= UNLOCK_LEVEL)

// 是否有班級比賽
const hasClassGame = computed(() => classGames.value.length > 0)

// 獲取學生所屬班級 ID
async function fetchMyClassIds(): Promise<string[]> {
  if (!supabase || !authStore.user) return []
  
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', authStore.user.id)
  
  return memberships?.map(m => m.class_id) || []
}

// 獲取學生所屬班級的進行中比賽
async function fetchClassGames() {
  if (!supabase || !authStore.user || authStore.isTeacher) return
  
  classGamesLoading.value = true
  
  try {
    // 先獲取學生所屬的班級 ID（如果還沒有）
    if (myClassIds.value.length === 0) {
      myClassIds.value = await fetchMyClassIds()
    }
    
    if (myClassIds.value.length === 0) {
      classGames.value = []
      return
    }
    
    // 獲取這些班級的進行中比賽
    const { data: games } = await supabase
      .from('game_rooms')
      .select(`
        *,
        host:users!game_rooms_host_id_fkey(id, display_name, avatar_url),
        text:practice_texts!game_rooms_text_id_fkey(id, title, author),
        class:classes!game_rooms_class_id_fkey(id, class_name),
        teams:game_teams(*)
      `)
      .in('class_id', myClassIds.value)
      .eq('host_type', 'teacher')
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })
    
    classGames.value = games || []
  } catch (e) {
    console.error('獲取班級比賽失敗:', e)
    classGames.value = []
  } finally {
    classGamesLoading.value = false
  }
}

// 訂閱班級比賽的 Realtime 更新
async function subscribeToClassGames() {
  if (!supabase || !authStore.user || authStore.isTeacher) return
  
  // 先獲取班級 ID
  if (myClassIds.value.length === 0) {
    myClassIds.value = await fetchMyClassIds()
  }
  
  if (myClassIds.value.length === 0) return
  
  // 取消之前的訂閱
  if (classGamesSubscription) {
    supabase.removeChannel(classGamesSubscription)
  }
  
  // 訂閱 game_rooms 表的變更
  classGamesSubscription = supabase
    .channel('class-games')
    .on(
      'postgres_changes',
      {
        event: '*',  // 監聽所有事件：INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'game_rooms',
        // 注意：Supabase Realtime 的 filter 不支持 IN 查詢
        // 所以我們監聽所有 game_rooms 變更，然後在客戶端過濾
      },
      async (payload) => {
        console.log('[Arena] game_rooms 變更:', payload.eventType)
        
        // 檢查是否與我的班級相關
        const roomClassId = (payload.new as any)?.class_id || (payload.old as any)?.class_id
        if (!roomClassId || !myClassIds.value.includes(roomClassId)) {
          return // 不是我班級的比賽，忽略
        }
        
        // 重新獲取班級比賽列表
        await fetchClassGames()
      }
    )
    .subscribe((status) => {
      console.log('[Arena] Realtime 訂閱狀態:', status)
    })
}

// 取消訂閱
function unsubscribeFromClassGames() {
  if (classGamesSubscription && supabase) {
    supabase.removeChannel(classGamesSubscription)
    classGamesSubscription = null
  }
}

// 加入班級比賽
async function joinClassGame(game: GameRoom) {
  joinLoading.value = true
  joinError.value = ''
  
  const result = await gameStore.joinRoom(game.room_code)
  
  if (result.success) {
    // 根據遊戲狀態跳轉
    if (game.status === 'playing') {
      router.push({ name: 'arena-play', params: { roomId: game.id } })
    } else {
      // 學生加入課堂鬥豆後，使用通用等待室（顯示等待老師開始）
      router.push({ name: 'arena-lobby', params: { roomId: game.id } })
    }
  } else {
    joinError.value = result.error || '加入失敗'
  }
  
  joinLoading.value = false
}

// 加入房間（通過房間碼）
async function handleJoinRoom() {
  if (!roomCode.value.trim()) {
    joinError.value = '請輸入房間碼'
    return
  }

  joinLoading.value = true
  joinError.value = ''

  const result = await gameStore.joinRoom(roomCode.value.trim())
  
  if (result.success) {
    // 根據遊戲狀態跳轉
    if (result.room?.status === 'playing') {
      router.push({ name: 'arena-play', params: { roomId: result.room.id } })
    } else {
      router.push({ name: 'arena-lobby', params: { roomId: result.room!.id } })
    }
  } else {
    joinError.value = result.error || '加入失敗'
  }

  joinLoading.value = false
}

// 創建鬥豆場
function goToCreate() {
  if (authStore.isTeacher) {
    router.push({ name: 'arena-teacher-create' })
  } else {
    router.push({ name: 'arena-create' })
  }
}

// 加載數據
onMounted(async () => {
  if (authStore.isAuthenticated) {
    gameStore.fetchPublicRooms()
    
    // 學生：獲取班級比賽並訂閱 Realtime
    if (!authStore.isTeacher) {
      await fetchClassGames()
      subscribeToClassGames()
    }
  }
})

// 定時刷新公開房間（僅 PK 競技房間列表，班級比賽用 Realtime）
const refreshInterval = setInterval(() => {
  if (authStore.isAuthenticated && activeTab.value === 'rooms') {
    gameStore.fetchPublicRooms()
  }
}, 15000)  // 公開房間列表 15 秒刷新一次

onUnmounted(() => {
  clearInterval(refreshInterval)
  unsubscribeFromClassGames()
})
</script>

<template>
  <div class="arena-page">
    <!-- 頁面標題 -->
    <header class="arena-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">⚔️</span>
          鬥豆
        </h1>
        <p class="page-subtitle">與同學一較高下，在競技中成長</p>
      </div>

      <!-- 用戶統計卡片 -->
      <div v-if="authStore.isAuthenticated" class="stats-card">
        <div class="stat-item">
          <span class="stat-icon">🫘</span>
          <span class="stat-value">{{ beans }}</span>
          <span class="stat-label">豆子</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon" :style="{ color: rankTitle.color }">🎓</span>
          <span class="stat-value" :style="{ color: rankTitle.color }">{{ rankTitle.title }}</span>
          <span class="stat-label">Lv.{{ level }}</span>
        </div>
        <div v-if="winStreak > 0" class="stat-item streak">
          <span class="stat-icon">🔥</span>
          <span class="stat-value">{{ winStreak }}</span>
          <span class="stat-label">連勝</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📊</span>
          <span class="stat-value">{{ pvpStats.winRate }}%</span>
          <span class="stat-label">勝率 ({{ pvpStats.wins }}/{{ pvpStats.games }})</span>
        </div>
      </div>
    </header>

    <!-- 未登入提示 -->
    <div v-if="!authStore.isAuthenticated" class="login-prompt">
      <div class="prompt-icon">🔐</div>
      <h2>請先登入</h2>
      <p>登入後即可參與鬥豆對戰</p>
      <button class="btn-primary" @click="authStore.loginWithGoogle">
        使用 Google 登入
      </button>
    </div>

    <!-- 主內容區 -->
    <main v-else class="arena-main">
      <!-- 學生：班級比賽通知（優先顯示）-->
      <section v-if="!authStore.isTeacher && (hasClassGame || classGamesLoading)" class="class-game-section">
        <div v-if="classGamesLoading" class="loading-card">
          <div class="spinner"></div>
          <p>檢查班級比賽...</p>
        </div>
        
        <div v-else-if="hasClassGame" class="class-game-card">
          <div class="card-header">
            <span class="card-icon">🏫</span>
            <h2>班級進行中的比賽</h2>
          </div>
          
          <div v-for="game in classGames" :key="game.id" class="game-item">
            <div class="game-info">
              <div class="game-title-row">
                <h3>{{ game.text?.title || '未知文本' }}</h3>
                <span class="game-status" :class="game.status">
                  {{ game.status === 'playing' ? '🔴 進行中' : '🟡 等待中' }}
                </span>
              </div>
              <p class="game-meta">
                <span class="class-name">{{ game.class?.class_name }}</span>
                <span class="divider">·</span>
                <span class="host-name">{{ game.host?.display_name }} 老師發起</span>
              </p>
              <p class="game-code">
                房間碼：<strong>{{ game.room_code }}</strong>
                <span class="code-hint">（可分享給其他同學）</span>
              </p>
            </div>
            
            <button 
              class="btn-primary btn-join"
              :disabled="joinLoading"
              @click="joinClassGame(game)"
            >
              {{ joinLoading ? '加入中...' : '立即加入' }}
            </button>
          </div>
          
          <p v-if="joinError" class="error-message">{{ joinError }}</p>
        </div>
      </section>
      <!-- 老師模式：課堂鬥豆 -->
      <section v-if="authStore.isTeacher" class="teacher-section">
        <h2 class="section-title">
          <span class="section-icon">📢</span>
          課堂鬥豆
        </h2>
        <p class="section-desc">創建班級比賽，讓學生分組競技</p>
        
        <button class="btn-primary btn-large" @click="goToCreate">
          <span class="btn-icon">➕</span>
          創建課堂鬥豆
        </button>
      </section>

      <!-- 學生模式：Tab 切換 -->
      <div v-if="!authStore.isTeacher" class="student-section">
        <!-- 分隔線（如果有班級比賽）-->
        <div v-if="hasClassGame" class="section-divider">
          <span class="divider-text">其他功能</span>
        </div>

        <!-- Tab 導航 -->
        <nav class="tab-nav">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'join' }"
            @click="activeTab = 'join'"
          >
            <span class="tab-icon">🎫</span>
            輸入房間碼
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'rooms' }"
            @click="activeTab = 'rooms'"
          >
            <span class="tab-icon">🏟️</span>
            公開鬥豆場
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'create', locked: !isPvpUnlocked }"
            @click="activeTab = 'create'"
          >
            <span class="tab-icon">{{ isPvpUnlocked ? '➕' : '🔒' }}</span>
            創建鬥豆場
          </button>
        </nav>

        <!-- Tab 內容 -->
        <div class="tab-content">
          <!-- 房間列表 -->
          <div v-if="activeTab === 'rooms'" class="rooms-panel">
            <div class="panel-header">
              <h3>可加入的鬥豆場</h3>
              <button 
                class="btn-text" 
                @click="gameStore.fetchPublicRooms()"
                :disabled="gameStore.loading"
              >
                🔄 刷新
              </button>
            </div>

            <div v-if="gameStore.loading" class="loading-state">
              <div class="spinner"></div>
              <p>載入中...</p>
            </div>

            <div v-else-if="gameStore.rooms.length === 0" class="empty-state">
              <div class="empty-icon">🏜️</div>
              <p>暫無開放的鬥豆場</p>
              <p class="empty-hint">你可以創建一個鬥豆場邀請同學</p>
            </div>

            <ul v-else class="room-list">
              <li 
                v-for="room in gameStore.rooms" 
                :key="room.id" 
                class="room-card"
                @click="router.push({ name: 'arena-lobby', params: { roomId: room.id } })"
              >
                <div class="room-info">
                  <h4 class="room-title">{{ room.text?.title || '未知文本' }}</h4>
                  <p class="room-host">
                    局主：{{ room.host?.display_name || '未知' }}
                  </p>
                </div>
                <div class="room-meta">
                  <span class="room-players">
                    👥 {{ (room as any).participant_count || 0 }}/{{ room.max_players }}
                  </span>
                  <span v-if="room.entry_fee > 0" class="room-fee">
                    🫘 {{ room.entry_fee }}
                  </span>
                  <span v-else class="room-fee free">
                    免費
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <!-- 加入房間 -->
          <div v-if="activeTab === 'join'" class="join-panel">
            <div class="join-card">
              <h3>輸入房間碼</h3>
              <p class="join-hint">向好友詢問 6 位房間碼</p>
              
              <div class="code-input-group">
                <input
                  v-model="roomCode"
                  type="text"
                  maxlength="6"
                  placeholder="XXXXXX"
                  class="code-input"
                  @keyup.enter="handleJoinRoom"
                />
                <button 
                  class="btn-primary"
                  :disabled="joinLoading || !roomCode.trim()"
                  @click="handleJoinRoom"
                >
                  {{ joinLoading ? '加入中...' : '加入鬥豆場' }}
                </button>
              </div>

              <p v-if="joinError" class="error-message">{{ joinError }}</p>
            </div>
          </div>

          <!-- 創建房間 -->
          <div v-if="activeTab === 'create'" class="create-panel">
            <!-- 未解鎖提示 -->
            <div v-if="!isPvpUnlocked" class="unlock-card">
              <div class="unlock-icon">🔒</div>
              <h3>PK 競技功能未解鎖</h3>
              <p>
                達到 <strong>Lv.{{ UNLOCK_LEVEL }}</strong>（{{ getRankTitle(UNLOCK_LEVEL).title }}）
                即可創建自己的鬥豆場
              </p>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${Math.min(level / UNLOCK_LEVEL * 100, 100)}%` }"
                ></div>
              </div>
              <p class="progress-text">當前：Lv.{{ level }} / Lv.{{ UNLOCK_LEVEL }}</p>
              <p class="unlock-hint">
                💡 你仍可以通過房間碼加入同學的鬥豆場，或參與老師發起的班級比賽
              </p>
            </div>

            <!-- 已解鎖 -->
            <div v-else class="create-card">
              <h3>創建你的鬥豆場</h3>
              <p class="create-hint">
                邀請同學加入，贏取豆子！
              </p>

              <div class="fee-info">
                <div class="fee-label">入場費選項</div>
                <div class="fee-options">
                  <span 
                    v-for="fee in ENTRY_FEE_OPTIONS" 
                    :key="fee"
                    class="fee-tag"
                  >
                    {{ fee === 0 ? '免費' : `${fee} 豆` }}
                  </span>
                </div>
              </div>

              <div class="safety-info">
                <div class="safety-icon">🛡️</div>
                <div class="safety-text">
                  <p>安全機制</p>
                  <ul>
                    <li>每日入場費上限：{{ SAFETY_LIMITS.DAILY_FEE_LIMIT }} 豆</li>
                    <li>賬戶保留餘額：{{ SAFETY_LIMITS.MIN_BALANCE }} 豆</li>
                    <li>房間取消自動退款</li>
                  </ul>
                </div>
              </div>

              <button class="btn-primary btn-large" @click="goToCreate">
                <span class="btn-icon">➕</span>
                創建鬥豆場
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.arena-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

/* 頁面標題 */
.arena-header {
  margin-bottom: 2rem;
}

.header-content {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 1.8rem;
}

.page-subtitle {
  color: var(--color-neutral-500);
  margin: 0;
}

/* 統計卡片 */
.stats-card {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.stat-item.streak .stat-value {
  color: #ef4444;
}

/* 提示區域 */
.login-prompt,
.unlock-prompt {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.prompt-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.login-prompt h2,
.unlock-prompt h2 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.login-prompt p,
.unlock-prompt p {
  color: var(--color-neutral-600);
  margin: 0 0 1.5rem 0;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 4px;
  margin: 1rem auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-400), var(--color-primary-600));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* 班級比賽區域 */
.class-game-section {
  margin-bottom: 2rem;
}

.loading-card {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.class-game-card {
  background: linear-gradient(135deg, #fef3c7, #fff7ed);
  border: 2px solid #f59e0b;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.card-icon {
  font-size: 1.75rem;
}

.card-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #92400e;
}

.game-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem;
  background: white;
  border-radius: 14px;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.game-item:last-child {
  margin-bottom: 0;
}

.game-info {
  flex: 1;
}

.game-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.game-title-row h3 {
  margin: 0;
  font-size: 1.1rem;
}

.game-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.game-status.playing {
  background: #fef2f2;
  color: #dc2626;
}

.game-status.waiting {
  background: #fefce8;
  color: #ca8a04;
}

.game-meta {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.game-meta .divider {
  margin: 0 0.5rem;
  color: var(--color-neutral-400);
}

.class-name {
  font-weight: 500;
  color: var(--color-primary-600);
}

.game-code {
  margin: 0;
  font-size: 0.875rem;
}

.game-code strong {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  letter-spacing: 0.1em;
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.code-hint {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin-left: 0.5rem;
}

.btn-join {
  padding: 0.875rem 2rem;
  font-size: 1rem;
  white-space: nowrap;
}

/* 分隔線 */
.section-divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-neutral-200);
}

.divider-text {
  padding: 0 1rem;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* Tab 鎖定狀態 */
.tab-btn.locked {
  opacity: 0.7;
}

/* 解鎖卡片 */
.unlock-card {
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.unlock-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.unlock-card h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
}

.unlock-card > p {
  color: var(--color-neutral-600);
  margin: 0 0 1rem 0;
}

.unlock-hint {
  margin-top: 1.5rem !important;
  padding: 1rem;
  background: var(--color-primary-50);
  border-radius: 10px;
  font-size: 0.875rem;
  color: var(--color-primary-700);
}

/* 老師區域 */
.teacher-section {
  text-align: center;
  padding: 3rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.section-desc {
  color: var(--color-neutral-600);
  margin: 0 0 2rem 0;
}

/* Tab 導航 */
.tab-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.tab-btn.active {
  background: white;
  color: var(--color-primary-600);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-icon {
  font-size: 1.1rem;
}

/* 房間列表 */
.rooms-panel {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.room-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.room-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(var(--color-primary-50-rgb), 0.5), rgba(255, 255, 255, 0.8));
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.room-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.room-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.room-host {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.room-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.room-players,
.room-fee {
  font-size: 0.875rem;
  font-weight: 500;
}

.room-fee {
  color: var(--color-primary-600);
}

.room-fee.free {
  color: var(--color-success);
}

/* 加入面板 */
.join-panel {
  display: flex;
  justify-content: center;
}

.join-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.join-card h3 {
  margin: 0 0 0.5rem 0;
}

.join-hint {
  color: var(--color-neutral-500);
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
}

.code-input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.code-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5rem;
  text-transform: uppercase;
  border: 2px solid var(--color-neutral-200);
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.code-input:focus {
  border-color: var(--color-primary-400);
}

.code-input::placeholder {
  letter-spacing: 0.25rem;
  color: var(--color-neutral-300);
}

/* 創建面板 */
.create-panel {
  display: flex;
  justify-content: center;
}

.create-card {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.create-card h3 {
  margin: 0 0 0.5rem 0;
}

.create-hint {
  color: var(--color-neutral-500);
  margin: 0 0 1.5rem 0;
}

.fee-info {
  margin-bottom: 1.5rem;
  text-align: left;
}

.fee-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.fee-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.fee-tag {
  padding: 0.25rem 0.75rem;
  background: var(--color-neutral-100);
  border-radius: 20px;
  font-size: 0.875rem;
}

.safety-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
  border-radius: 12px;
  text-align: left;
  margin-bottom: 1.5rem;
}

.safety-icon {
  font-size: 2rem;
}

.safety-text p {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: var(--color-success);
}

.safety-text ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.safety-text li {
  margin-bottom: 0.25rem;
}

/* 空狀態和載入 */
.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-neutral-500);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-neutral-200);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.875rem;
}

/* 按鈕 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
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
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: var(--color-primary-600);
  border: 2px solid var(--color-primary-200);
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.btn-text {
  background: none;
  border: none;
  color: var(--color-primary-600);
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* 響應式 */
@media (max-width: 640px) {
  .arena-page {
    padding: 1rem;
  }

  .stats-card {
    flex-wrap: wrap;
    justify-content: center;
  }

  .tab-nav {
    flex-direction: column;
  }

  .room-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .room-meta {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

