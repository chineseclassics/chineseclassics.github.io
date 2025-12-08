import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'

// 全局單例狀態
const globalChannels = new Map<string, ReturnType<typeof supabase.channel>>()
const globalConnectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
const globalDrawingCallbacks = new Map<string, Set<(stroke: any) => void>>()
const globalSubscribedRooms = new Set<string>()
const globalReconnectTimers = new Map<string, number>()

const DEBUG = import.meta.env.DEV

function log(...args: any[]) {
  if (DEBUG) console.log('[Realtime]', ...args)
}

function warn(...args: any[]) {
  console.warn('[Realtime]', ...args)
}

export function useRealtime() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()

  function getRoomChannel(roomCode: string) {
    const channelKey = `room:${roomCode}`
    
    if (globalChannels.has(channelKey)) {
      return globalChannels.get(channelKey)!
    }

    log('創建新 channel:', channelKey)
    const channel = supabase.channel(channelKey, {
      config: {
        presence: { key: 'user' },
        broadcast: { self: false },
      },
    })

    globalChannels.set(channelKey, channel)
    return channel
  }

  function clearReconnectTimer(roomCode: string) {
    const timerId = globalReconnectTimers.get(roomCode)
    if (timerId) {
      clearTimeout(timerId)
      globalReconnectTimers.delete(roomCode)
    }
  }

  function handleSubscriptionStatus(
    status: string,
    channel: ReturnType<typeof supabase.channel>,
    roomCode: string,
    userId: string,
    userData: any
  ) {
    log('訂閱狀態:', status)
    
    if (status === 'SUBSCRIBED') {
      globalConnectionStatus.value = 'connected'
      clearReconnectTimer(roomCode)
      channel.track({ user_id: userId, ...userData }).catch(err => {
        warn('Presence track 失敗:', err)
      })
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      globalConnectionStatus.value = 'disconnected'
      warn('訂閱失敗:', status)
      scheduleReconnect(roomCode, userId, userData)
    } else if (status === 'CLOSED') {
      globalConnectionStatus.value = 'disconnected'
    }
  }

  function scheduleReconnect(roomCode: string, userId: string, userData: any, attempt = 0) {
    if (attempt >= 3) {
      warn('重連失敗次數過多，停止重連')
      return
    }
    
    clearReconnectTimer(roomCode)
    
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
    log(`排程重連，${delay}ms 後嘗試 (第 ${attempt + 1} 次)`)
    
    const timerId = window.setTimeout(() => {
      const channel = globalChannels.get(`room:${roomCode}`)
      if (channel && (channel as any).state !== 'joined') {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            handleSubscriptionStatus(status, channel, roomCode, userId, userData)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            scheduleReconnect(roomCode, userId, userData, attempt + 1)
          }
        })
      }
    }, delay)
    
    globalReconnectTimers.set(roomCode, timerId)
  }

  function subscribeRoom(roomCode: string, roomId: string, userId: string, userData: any) {
    if (!roomCode || !roomId) {
      warn('缺少 roomCode 或 roomId')
      return
    }

    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    log('subscribeRoom - roomCode:', roomCode, 'state:', channelState)

    if (channelState === 'joined') {
      globalConnectionStatus.value = 'connected'
      return channel
    }

    if (channelState === 'joining') {
      return channel
    }

    if (globalSubscribedRooms.has(roomCode)) {
      globalConnectionStatus.value = 'connecting'
      channel.subscribe((status) => {
        handleSubscriptionStatus(status, channel, roomCode, userId, userData)
      })
      return channel
    }

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      }, async (payload) => {
        log('房間狀態變化:', payload.eventType)
        if (roomStore.currentRoom) {
          await roomStore.loadRoom(roomStore.currentRoom.id)
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        log('參與者變化:', payload.eventType)
        await roomStore.loadParticipants(roomId)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rounds',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        log('輪次變化:', payload.eventType)
        if (roomStore.currentRoom) {
          await gameStore.loadCurrentRound(roomStore.currentRoom.id)
        }
      })
      .on('broadcast', { event: 'drawing' }, (payload) => {
        const callbacks = globalDrawingCallbacks.get(roomCode)
        if (callbacks && payload.payload?.stroke) {
          callbacks.forEach(cb => cb(payload.payload.stroke))
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        log('Presence 同步，在線:', Object.keys(state).length)
      })

    globalSubscribedRooms.add(roomCode)

    globalConnectionStatus.value = 'connecting'
    channel.subscribe((status) => {
      handleSubscriptionStatus(status, channel, roomCode, userId, userData)
    })

    return channel
  }

  function subscribeDrawing(roomCode: string, onDrawing: (stroke: any) => void) {
    log('註冊繪畫回調，roomCode:', roomCode)
    
    if (!globalDrawingCallbacks.has(roomCode)) {
      globalDrawingCallbacks.set(roomCode, new Set())
    }
    globalDrawingCallbacks.get(roomCode)!.add(onDrawing)

    return () => {
      globalDrawingCallbacks.get(roomCode)?.delete(onDrawing)
    }
  }

  function subscribeGuesses(roomCode: string, roundId: string) {
    const channel = getRoomChannel(roomCode)

    const listenerKey = `guesses:${roundId}`
    if ((channel as any)[listenerKey]) {
      return channel
    }

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'guesses',
      filter: `round_id=eq.${roundId}`,
    }, async (payload) => {
      log('猜測記錄變化:', payload.eventType)
      await gameStore.loadGuesses(roundId)
    })

    ;(channel as any)[listenerKey] = true
    return channel
  }

  async function sendDrawing(roomCode: string, stroke: any) {
    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    if (channelState !== 'joined') {
      warn('Channel 未連接，狀態:', channelState)
      return { error: 'Channel 未連接' }
    }

    try {
      const result = await channel.send({
        type: 'broadcast',
        event: 'drawing',
        payload: { stroke },
      })

      if (result === 'error') {
        warn('發送失敗')
        return { error: '發送失敗' }
      }
      return result
    } catch (error) {
      warn('發送錯誤:', error)
      return { error: error instanceof Error ? error.message : '發送失敗' }
    }
  }

  function unsubscribeRoom(roomCode: string) {
    const channelKey = `room:${roomCode}`
    const channel = globalChannels.get(channelKey)

    log('unsubscribeRoom - roomCode:', roomCode)
    clearReconnectTimer(roomCode)

    if (channel) {
      supabase.removeChannel(channel as any)
      globalChannels.delete(channelKey)
    }

    globalDrawingCallbacks.delete(roomCode)
    globalSubscribedRooms.delete(roomCode)
  }

  function unsubscribeAll() {
    globalReconnectTimers.forEach((_, roomCode) => clearReconnectTimer(roomCode))
    globalChannels.forEach((channel) => supabase.removeChannel(channel as any))
    globalChannels.clear()
    globalDrawingCallbacks.clear()
    globalSubscribedRooms.clear()
  }

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
