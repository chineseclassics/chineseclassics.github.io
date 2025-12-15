import { computed } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useStoryStore } from '../stores/story'
import { useRealtime } from './useRealtime'

export function useRoom() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const storyStore = useStoryStore()
  const { unsubscribeRoom } = useRealtime()

  // 計算屬性
  const currentRoom = computed(() => roomStore.currentRoom)
  const participants = computed(() => roomStore.participants)
  const isHost = computed(() => roomStore.isHost)
  // 根據遊戲模式計算最少人數要求
  const minPlayersRequired = computed(() => {
    if (!currentRoom.value) return 2
    // 分鏡接龍模式需要至少 3 人
    return currentRoom.value.game_mode === 'storyboard' ? 3 : 2
  })

  const canStartGame = computed(() => {
    if (!currentRoom.value) return false
    if (currentRoom.value.status !== 'waiting') return false
    if (!isHost.value) return false
    return participants.value.length >= minPlayersRequired.value
  })

  /**
   * 清理舊遊戲狀態
   * 在創建或加入新房間前調用，避免舊狀態殘留導致的問題
   */
  function cleanupOldGameState() {
    // 如果有舊房間，先取消 Realtime 訂閱
    const oldRoom = roomStore.currentRoom
    if (oldRoom) {
      console.log('[useRoom] 清理舊房間狀態:', oldRoom.code)
      unsubscribeRoom(oldRoom.code)
    }
    
    // 清理 GameStore 狀態（輪次、猜測、評分等）
    gameStore.clearGame()
    
    // 清理 StoryStore 狀態（故事鏈、提交、投票等）
    storyStore.clearAll()
    
    // 清理 RoomStore 狀態（房間、參與者）
    roomStore.clearRoom()
  }

  // 創建房間
  async function createRoom(data: {
    name: string
    words: Array<{ text: string; source: 'wordlist' | 'custom' }>
    settings: {
      draw_time: number
      rounds: number
      word_count_per_round: number
      hints_count: number
    }
    // 分鏡接龍模式相關參數
    gameMode?: 'classic' | 'storyboard'
    singleRoundMode?: boolean
  }) {
    // ⭐ 修復：在創建新房間前清理舊狀態，避免狀態殘留
    cleanupOldGameState()
    
    return await roomStore.createRoom(data)
  }

  // 加入房間
  async function joinRoom(code: string, nickname: string) {
    // ⭐ 修復：在加入新房間前清理舊狀態，避免狀態殘留
    cleanupOldGameState()
    
    return await roomStore.joinRoom(code, nickname)
  }

  // 離開房間
  async function leaveRoom() {
    return await roomStore.leaveRoom()
  }

  // 注意：遊戲流程邏輯已移至 useGame composable
  // 這裡保留基本的房間操作

  return {
    // 狀態
    currentRoom,
    participants,
    isHost,
    canStartGame,
    minPlayersRequired,
    loading: computed(() => roomStore.loading),
    error: computed(() => roomStore.error),
    // 方法
    createRoom,
    joinRoom,
    leaveRoom,
  }
}

