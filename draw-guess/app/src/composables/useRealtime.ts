import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'

export function useRealtime() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()

  const channels = ref<Map<string, ReturnType<typeof supabase.channel>>>(new Map())
  const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const channelListenersReady = ref<Set<string>>(new Set()) // 確保監聽器只註冊一次
  const presenceTrackedRooms = ref<Set<string>>(new Set()) // 確保 presence 只追蹤一次
  
  // 重試配置
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000 // 1 秒
  
  // 重試狀態
  const retryCounts = ref<Map<string, number>>(new Map())
  const retryTimers = ref<Map<string, number>>(new Map())

  // 創建或獲取房間 Channel
  function getRoomChannel(roomCode: string) {
    const channelKey = `room:${roomCode}`
    
    if (channels.value.has(channelKey)) {
      return channels.value.get(channelKey)!
    }

    const channel = supabase.channel(channelKey, {
      config: {
        presence: {
          key: 'user',
        },
      },
    })

    channels.value.set(channelKey, channel)
    return channel
  }

  // 訂閱房間狀態變化（不調用 subscribe，由 subscribeRoom 統一調用）
  function subscribeRoomChanges(roomCode: string, roomId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 game_rooms 表變化
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      async (payload) => {
        console.log('房間狀態變化:', payload)
        
        // 重新載入房間信息
        if (roomStore.currentRoom) {
          await roomStore.loadRoom(roomStore.currentRoom.id)
        }
      }
    )

    return channel
  }

  // 訂閱參與者變化（不調用 subscribe，由 subscribeRoom 統一調用）
  function subscribeParticipants(roomCode: string, roomId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 room_participants 表變化（包括分數更新）
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        console.log('參與者變化:', payload)
        
        // 重新載入參與者列表（包括分數更新）
        await roomStore.loadParticipants(roomId)
      }
    )

    return channel
  }

  // 訂閱輪次變化（不調用 subscribe，由 subscribeRoom 統一調用）
  function subscribeRounds(roomCode: string, roomId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 game_rounds 表變化
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rounds',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        console.log('輪次變化:', payload)
        
        // 重新載入當前輪次
        if (roomStore.currentRoom) {
          await gameStore.loadCurrentRound(roomStore.currentRoom.id)
        }
      }
    )

    return channel
  }

  // 訂閱猜測記錄變化（獨立訂閱，因為可能在不同時機調用）
  function subscribeGuesses(roomCode: string, roundId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 guesses 表變化
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'guesses',
        filter: `round_id=eq.${roundId}`,
      },
      async (payload) => {
        console.log('猜測記錄變化:', payload)
        
        // 重新載入猜測記錄
        await gameStore.loadGuesses(roundId)
      }
    )
    .subscribe()

    return channel
  }

  // 訂閱繪畫數據（broadcast，不重複訂閱 channel）
  function subscribeDrawing(roomCode: string, onDrawing: (stroke: any) => void) {
    const channel = getRoomChannel(roomCode)

    // 只添加監聽器，不調用 subscribe（channel 已在 subscribeRoom 中訂閱）
    channel.on('broadcast', { event: 'drawing' }, (payload) => {
      console.log('收到繪畫數據:', payload)
      onDrawing(payload.payload.stroke)
    })

    return channel
  }

  // 發送繪畫數據（broadcast）
  async function sendDrawing(roomCode: string, stroke: any) {
    try {
      const channel = getRoomChannel(roomCode)

      // 直接嘗試發送，讓 Supabase 處理連接狀態
      // 如果 channel 未連接，Supabase 會自動處理或返回錯誤
      const result = await channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: { stroke },
      })

      if (result === 'error') {
        console.warn('發送繪畫數據失敗，channel 可能未連接')
        // 不返回錯誤，讓繪畫繼續（用戶體驗優先）
        // 如果連接恢復，下次發送會成功
        return { error: '發送失敗，請檢查網絡連接' }
      }

      return result
    } catch (error) {
      console.warn('發送繪畫數據錯誤:', error)
      // 不拋出錯誤，讓繪畫繼續
      // 如果連接恢復，下次發送會成功
      return { error: error instanceof Error ? error.message : '發送失敗' }
    }
  }

  // 訂閱 Presence（玩家在線狀態，不調用 subscribe，由 subscribeRoom 統一調用）
  // userId 和 userData 會在 subscribeRoom 的 subscribe 回調中使用
  function subscribePresence(_roomCode: string, _userId: string, _userData: any) {
    const channel = getRoomChannel(_roomCode)

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('Presence 狀態:', state)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('玩家加入:', key, newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('玩家離開:', key, leftPresences)
    })

    // 在 channel 訂閱成功後追蹤 presence
    // 這個邏輯會在 subscribeRoom 的 subscribe 回調中處理

    return channel
  }

  // 訂閱房間的所有實時更新（參考句豆的實現）
  function subscribeRoom(roomCode: string, roomId: string, userId: string, userData: any) {
    if (!roomCode || !roomId) return

    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    // 在同一個 channel 上添加所有監聽器（僅一次）
    if (!channelListenersReady.value.has(roomCode)) {
    subscribeRoomChanges(roomCode, roomId)
    subscribeParticipants(roomCode, roomId)
    subscribeRounds(roomCode, roomId)
    subscribePresence(roomCode, userId, userData)

    // 監聽連接狀態
    channel.on('system', {}, (payload) => {
      console.log('Realtime 系統狀態:', payload)
      if (payload.status === 'ok') {
        connectionStatus.value = 'connected'
        retryCounts.value.set(roomCode, 0)
        clearRetryTimer(roomCode)
      } else if (payload.status === 'error') {
        connectionStatus.value = 'disconnected'
        console.warn('Realtime 連接錯誤，嘗試重試')
        scheduleRetry(roomCode, roomId, userId, userData)
      }
    })

      channelListenersReady.value.add(roomCode)
    }

    // 如果已加入（例如 HomeView 已經訂閱過），避免重複 subscribe
    if (channelState === 'joined') {
      connectionStatus.value = 'connected'
      retryCounts.value.set(roomCode, 0)
      clearRetryTimer(roomCode)
      if (!presenceTrackedRooms.value.has(roomCode)) {
        channel.track({
          user_id: userId,
          ...userData,
        })
        presenceTrackedRooms.value.add(roomCode)
      }
      return channel
    }

    // 最後統一訂閱 channel（只調用一次）
    channel.subscribe(async (status) => {
      console.log('Realtime 訂閱狀態:', status)
      if (status === 'SUBSCRIBED') {
        connectionStatus.value = 'connected'
        retryCounts.value.set(roomCode, 0)
        clearRetryTimer(roomCode)
        
        // 訂閱成功後追蹤 presence
        if (!presenceTrackedRooms.value.has(roomCode)) {
        await channel.track({
          user_id: userId,
          ...userData,
        })
          presenceTrackedRooms.value.add(roomCode)
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        connectionStatus.value = 'disconnected'
        console.warn('Realtime 訂閱失敗，嘗試重試，狀態:', status)
        scheduleRetry(roomCode, roomId, userId, userData)
      } else if (status === 'CLOSED') {
        // CLOSED 狀態可能是正常關閉（用戶離開）或異常斷開
        // 檢查用戶是否還在房間中
        if (roomStore.currentRoom && roomStore.currentRoom.code === roomCode) {
          connectionStatus.value = 'disconnected'
          console.warn('Realtime 連接關閉，但用戶仍在房間中，嘗試重試')
          scheduleRetry(roomCode, roomId, userId, userData)
        } else {
          // 用戶已離開房間，正常關閉
          connectionStatus.value = 'disconnected'
          console.log('Realtime 連接正常關閉（用戶已離開房間）')
        }
      } else if (status === 'JOINED') {
        // JOINED 狀態表示 channel 已加入，但可能還沒完全訂閱
        connectionStatus.value = 'connecting'
      }
    })

    return channel
  }

  // 清除重試計時器
  function clearRetryTimer(roomCode: string) {
    const timer = retryTimers.value.get(roomCode)
    if (timer) {
      clearTimeout(timer)
      retryTimers.value.delete(roomCode)
    }
  }

  // 安排重試
  function scheduleRetry(roomCode: string, roomId: string, userId: string, userData: any) {
    const currentRetryCount = retryCounts.value.get(roomCode) || 0
    
    if (currentRetryCount >= MAX_RETRIES) {
      console.error(`Realtime 連接失敗，已達到最大重試次數 (${MAX_RETRIES})`)
      connectionStatus.value = 'disconnected'
      // 可以觸發降級方案（例如：輪詢更新）
      return
    }

    // 清除之前的計時器
    clearRetryTimer(roomCode)

    // 設置新的重試計時器
    const timer = window.setTimeout(() => {
      console.log(`嘗試重新連接 Realtime (${currentRetryCount + 1}/${MAX_RETRIES})`)
      retryCounts.value.set(roomCode, currentRetryCount + 1)
      
      // 取消之前的訂閱
      unsubscribeRoom(roomCode)
      
      // 重新訂閱
      subscribeRoom(roomCode, roomId, userId, userData)
    }, RETRY_DELAY * (currentRetryCount + 1)) // 指數退避

    retryTimers.value.set(roomCode, timer)
  }

  // 取消訂閱房間
  function unsubscribeRoom(roomCode: string) {
    const channelKey = `room:${roomCode}`
    const channel = channels.value.get(channelKey)

    if (channel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.removeChannel(channel as any)
      channels.value.delete(channelKey)
    }

    // 清除重試計時器
    clearRetryTimer(roomCode)
    retryCounts.value.delete(roomCode)
    channelListenersReady.value.delete(roomCode)
    presenceTrackedRooms.value.delete(roomCode)
  }

  // 取消所有訂閱
  function unsubscribeAll() {
    channels.value.forEach((channel, roomCode) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.removeChannel(channel as any)
      clearRetryTimer(roomCode)
    })
    channels.value.clear()
    retryCounts.value.clear()
    retryTimers.value.clear()
  }

  // 清理資源
  onUnmounted(() => {
    unsubscribeAll()
  })

  return {
    connectionStatus,
    subscribeRoom,
    subscribeDrawing,
    subscribeGuesses,
    sendDrawing,
    unsubscribeRoom,
    unsubscribeAll,
  }
}

