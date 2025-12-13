import { computed } from 'vue'
import { useRoomStore } from '../stores/room'

export function useRoom() {
  const roomStore = useRoomStore()

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
    return await roomStore.createRoom(data)
  }

  // 加入房間
  async function joinRoom(code: string, nickname: string) {
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

