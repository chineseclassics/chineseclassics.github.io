import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'

export function useRealtime() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()

  const channels = ref<Map<string, ReturnType<typeof supabase.channel>>>(new Map())
  const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
  
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

  // 訂閱房間狀態變化
  function subscribeRoomChanges(roomCode: string, roomId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 game_rooms 表變化
    channel
      .on(
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
      .subscribe()

    return channel
  }

  // 訂閱參與者變化
  function subscribeParticipants(roomCode: string, roomId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 room_participants 表變化（包括分數更新）
    channel
      .on(
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
      .subscribe()

    return channel
  }

  // 訂閱輪次變化
  function subscribeRounds(roomCode: string, roomId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 game_rounds 表變化
    channel
      .on(
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
      .subscribe()

    return channel
  }

  // 訂閱猜測記錄變化
  function subscribeGuesses(roomCode: string, roundId: string) {
    const channel = getRoomChannel(roomCode)

    // 監聽 guesses 表變化
    channel
      .on(
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

  // 訂閱繪畫數據（broadcast）
  function subscribeDrawing(roomCode: string, onDrawing: (stroke: any) => void) {
    const channel = getRoomChannel(roomCode)

    channel
      .on('broadcast', { event: 'drawing' }, (payload) => {
        console.log('收到繪畫數據:', payload)
        onDrawing(payload.payload.stroke)
      })
      .subscribe()

    return channel
  }

  // 發送繪畫數據（broadcast）
  async function sendDrawing(roomCode: string, stroke: any) {
    try {
      const channel = getRoomChannel(roomCode)

      // 檢查連接狀態
      if (connectionStatus.value === 'disconnected') {
        console.warn('Realtime 未連接，無法發送繪畫數據')
        // 降級方案：可以將數據暫存，連接恢復後再發送
        return { error: '連接未建立' }
      }

      const result = await channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: { stroke },
      })

      if (result === 'error') {
        console.error('發送繪畫數據失敗')
        return { error: '發送失敗' }
      }

      return result
    } catch (error) {
      console.error('發送繪畫數據錯誤:', error)
      // 降級方案：可以將數據暫存到本地，稍後重試
      return { error: error instanceof Error ? error.message : '發送失敗' }
    }
  }

  // 訂閱 Presence（玩家在線狀態）
  function subscribePresence(roomCode: string, userId: string, userData: any) {
    const channel = getRoomChannel(roomCode)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('Presence 狀態:', state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('玩家加入:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('玩家離開:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            ...userData,
          })
        }
      })

    return channel
  }

  // 訂閱房間的所有實時更新
  function subscribeRoom(roomCode: string, roomId: string, userId: string, userData: any) {
    if (!roomCode || !roomId) return

    const channel = getRoomChannel(roomCode)

    // 訂閱所有變化
    subscribeRoomChanges(roomCode, roomId)
    subscribeParticipants(roomCode, roomId)
    subscribeRounds(roomCode, roomId)
    subscribePresence(roomCode, userId, userData)

    // 監聽連接狀態
    channel.on('system', {}, (payload) => {
      console.log('Realtime 系統狀態:', payload)
      if (payload.status === 'ok') {
        connectionStatus.value = 'connected'
        // 連接成功，重置重試計數
        retryCounts.value.set(roomCode, 0)
        clearRetryTimer(roomCode)
      } else if (payload.status === 'error') {
        connectionStatus.value = 'disconnected'
        console.warn('Realtime 連接錯誤，嘗試重試')
        scheduleRetry(roomCode, roomId, userId, userData)
      }
    })

    // 監聽訂閱狀態
    channel.subscribe((status) => {
      console.log('Realtime 訂閱狀態:', status)
      if (status === 'SUBSCRIBED') {
        connectionStatus.value = 'connected'
        // 訂閱成功，重置重試計數
        retryCounts.value.set(roomCode, 0)
        clearRetryTimer(roomCode)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        connectionStatus.value = 'disconnected'
        console.warn('Realtime 訂閱失敗，嘗試重試')
        scheduleRetry(roomCode, roomId, userId, userData)
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

