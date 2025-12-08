import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'

// 全局單例狀態（避免多個組件實例之間的衝突）
const globalChannels = new Map<string, ReturnType<typeof supabase.channel>>()
const globalConnectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
const globalDrawingCallbacks = new Map<string, ((stroke: any) => void)[]>()
const globalSubscribedRooms = new Set<string>() // 追蹤已設置監聽器的房間

export function useRealtime() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()

  // 創建或獲取房間 Channel
  function getRoomChannel(roomCode: string) {
    const channelKey = `room:${roomCode}`
    
    if (globalChannels.has(channelKey)) {
      return globalChannels.get(channelKey)!
    }

    console.log('[useRealtime] 創建新 channel:', channelKey)
    const channel = supabase.channel(channelKey, {
      config: {
        presence: {
          key: 'user',
        },
        broadcast: {
          self: false, // 不接收自己發送的消息
        },
      },
    })

    globalChannels.set(channelKey, channel)
    return channel
  }

  // 訂閱房間的所有實時更新（統一入口）
  function subscribeRoom(roomCode: string, roomId: string, userId: string, userData: any) {
    if (!roomCode || !roomId) {
      console.warn('[subscribeRoom] 缺少 roomCode 或 roomId')
      return
    }

    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    console.log('[subscribeRoom] roomCode:', roomCode, 'channelState:', channelState)

    // 如果已經訂閱成功，不重複訂閱
    if (channelState === 'joined') {
      console.log('[subscribeRoom] Channel 已連接，跳過訂閱')
      globalConnectionStatus.value = 'connected'
      return channel
    }

    // 如果正在連接中，等待
    if (channelState === 'joining') {
      console.log('[subscribeRoom] Channel 正在連接中，跳過')
      return channel
    }

    // 如果已設置過監聽器，不重複設置
    if (globalSubscribedRooms.has(roomCode)) {
      console.log('[subscribeRoom] 監聽器已設置，只需重新訂閱')
      globalConnectionStatus.value = 'connecting'
      channel.subscribe(async (status) => {
        handleSubscriptionStatus(status, channel, userId, userData)
      })
      return channel
    }

    // 設置所有監聽器（只設置一次）
    channel
      // 監聽 game_rooms 表變化
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('[Realtime] 房間狀態變化:', payload)
          if (roomStore.currentRoom) {
            await roomStore.loadRoom(roomStore.currentRoom.id)
          }
        }
      )
      // 監聽 room_participants 表變化
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('[Realtime] 參與者變化:', payload)
          await roomStore.loadParticipants(roomId)
        }
      )
      // 監聽 game_rounds 表變化
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('[Realtime] 輪次變化:', payload)
          if (roomStore.currentRoom) {
            await gameStore.loadCurrentRound(roomStore.currentRoom.id)
          }
        }
      )
      // 監聽繪畫廣播
      .on('broadcast', { event: 'drawing' }, (payload) => {
        console.log('[Realtime] 收到繪畫數據:', payload)
        const callbacks = globalDrawingCallbacks.get(roomCode) || []
        callbacks.forEach(cb => {
          if (payload.payload?.stroke) {
            cb(payload.payload.stroke)
          }
        })
      })
      // 監聽 Presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('[Realtime] Presence 狀態:', state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Realtime] 玩家加入:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Realtime] 玩家離開:', key, leftPresences)
      })

    // 標記已設置監聽器
    globalSubscribedRooms.add(roomCode)

    // 訂閱 channel
    globalConnectionStatus.value = 'connecting'
    channel.subscribe(async (status) => {
      handleSubscriptionStatus(status, channel, userId, userData)
    })

    return channel
  }

  // 處理訂閱狀態
  async function handleSubscriptionStatus(
    status: string,
    channel: ReturnType<typeof supabase.channel>,
    userId: string,
    userData: any
  ) {
    console.log('[Realtime] 訂閱狀態:', status)
    
    if (status === 'SUBSCRIBED') {
      globalConnectionStatus.value = 'connected'
      
      // 訂閱成功後追蹤 presence
      try {
        await channel.track({
          user_id: userId,
          ...userData,
        })
      } catch (err) {
        console.warn('[Realtime] Presence track 失敗:', err)
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      globalConnectionStatus.value = 'disconnected'
      console.warn('[Realtime] 訂閱失敗:', status)
    } else if (status === 'CLOSED') {
      globalConnectionStatus.value = 'disconnected'
      console.log('[Realtime] 連接關閉')
    }
  }

  // 訂閱繪畫數據（只註冊回調，不重複訂閱 channel）
  function subscribeDrawing(roomCode: string, onDrawing: (stroke: any) => void) {
    console.log('[subscribeDrawing] 註冊繪畫回調，roomCode:', roomCode)
    
    // 註冊回調
    if (!globalDrawingCallbacks.has(roomCode)) {
      globalDrawingCallbacks.set(roomCode, [])
    }
    const callbacks = globalDrawingCallbacks.get(roomCode)!
    
    // 避免重複註冊同一個回調
    if (!callbacks.includes(onDrawing)) {
      callbacks.push(onDrawing)
    }

    // 返回取消訂閱函數
    return () => {
      const idx = callbacks.indexOf(onDrawing)
      if (idx >= 0) {
        callbacks.splice(idx, 1)
      }
    }
  }

  // 訂閱猜測記錄變化
  function subscribeGuesses(roomCode: string, roundId: string) {
    const channel = getRoomChannel(roomCode)

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'guesses',
        filter: `round_id=eq.${roundId}`,
      },
      async (payload) => {
        console.log('[Realtime] 猜測記錄變化:', payload)
        await gameStore.loadGuesses(roundId)
      }
    )

    return channel
  }

  // 發送繪畫數據（broadcast）
  async function sendDrawing(roomCode: string, stroke: any) {
    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    console.log('[sendDrawing] roomCode:', roomCode, 'channelState:', channelState)

    if (channelState !== 'joined') {
      console.warn('[sendDrawing] Channel 未連接，狀態:', channelState)
      return { error: 'Channel 未連接' }
    }

    try {
      const result = await channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: { stroke },
      })

      if (result === 'error') {
        console.warn('[sendDrawing] 發送失敗')
        return { error: '發送失敗' }
      }

      console.log('[sendDrawing] 發送成功')
      return result
    } catch (error) {
      console.warn('[sendDrawing] 發送錯誤:', error)
      return { error: error instanceof Error ? error.message : '發送失敗' }
    }
  }

  // 取消訂閱房間（只在真正離開房間時調用）
  function unsubscribeRoom(roomCode: string) {
    const channelKey = `room:${roomCode}`
    const channel = globalChannels.get(channelKey)

    console.log('[unsubscribeRoom] roomCode:', roomCode, 'channel exists:', !!channel)

    if (channel) {
      supabase.removeChannel(channel as any)
      globalChannels.delete(channelKey)
    }

    // 清除繪畫回調
    globalDrawingCallbacks.delete(roomCode)
    // 清除訂閱標記
    globalSubscribedRooms.delete(roomCode)
  }

  // 取消所有訂閱
  function unsubscribeAll() {
    globalChannels.forEach((channel) => {
      supabase.removeChannel(channel as any)
    })
    globalChannels.clear()
    globalDrawingCallbacks.clear()
    globalSubscribedRooms.clear()
  }

  // 獲取連接狀態
  function getConnectionStatus() {
    return globalConnectionStatus.value
  }

  return {
    connectionStatus: globalConnectionStatus,
    subscribeRoom,
    subscribeDrawing,
    subscribeGuesses,
    sendDrawing,
    unsubscribeRoom,
    unsubscribeAll,
    getConnectionStatus,
  }
}

