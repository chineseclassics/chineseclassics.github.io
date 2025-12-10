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
        broadcast: { self: true },  // 房主也收到自己的廣播，統一處理邏輯
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

  // 返回 Promise，等待連接完成
  function subscribeRoom(roomCode: string, roomId: string, userId: string, userData: any): Promise<ReturnType<typeof supabase.channel>> {
    return new Promise((resolve, reject) => {
      if (!roomCode || !roomId) {
        warn('缺少 roomCode 或 roomId')
        reject(new Error('缺少 roomCode 或 roomId'))
        return
      }

      const channel = getRoomChannel(roomCode)
      const channelState = (channel as any).state

      log('subscribeRoom - roomCode:', roomCode, 'state:', channelState)

      // 已經連接，直接返回
      if (channelState === 'joined') {
        globalConnectionStatus.value = 'connected'
        resolve(channel)
        return
      }

      // 正在連接中，等待結果
      if (channelState === 'joining') {
        const checkInterval = setInterval(() => {
          const state = (channel as any).state
          if (state === 'joined') {
            clearInterval(checkInterval)
            resolve(channel)
          } else if (state === 'closed' || state === 'errored') {
            clearInterval(checkInterval)
            reject(new Error('連接失敗'))
          }
        }, 100)
        
        // 5秒超時
        setTimeout(() => {
          clearInterval(checkInterval)
          if ((channel as any).state !== 'joined') {
            reject(new Error('連接超時'))
          }
        }, 5000)
        return
      }

      // 如果已經設置過監聽器，只需要訂閱
      if (globalSubscribedRooms.has(roomCode)) {
        globalConnectionStatus.value = 'connecting'
        channel.subscribe((status) => {
          handleSubscriptionStatus(status, channel, roomCode, userId, userData)
          if (status === 'SUBSCRIBED') {
            resolve(channel)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`訂閱失敗: ${status}`))
          }
        })
        return
      }

      // 首次設置監聽器
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
          log('輪次變化:', payload.eventType, payload.new)
          if (roomStore.currentRoom) {
            await gameStore.loadCurrentRound(roomStore.currentRoom.id)
          }
        })
        // 訂閱整個房間的猜測記錄（通過 game_rounds 關聯）
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'guesses',
        }, async (payload) => {
          // 檢查這個猜測是否屬於當前房間
          const newGuess = payload.new as any
          if (newGuess && gameStore.currentRound) {
            log('收到新猜測:', newGuess)
            // 載入該輪次的猜測（會追加到現有記錄）
            await gameStore.loadGuesses(newGuess.round_id)
            
            // 房主檢查：如果是正確猜測，檢查是否所有非畫家都猜對了
            if (newGuess.is_correct && roomStore.isHost && gameStore.roundStatus === 'drawing') {
              const drawerId = gameStore.currentRound.drawer_id
              const guessers = roomStore.participants.filter(p => p.user_id !== drawerId)
              const correctUserIds = new Set(
                gameStore.currentRoundCorrectGuesses.map(g => g.user_id)
              )
              const allCorrect = guessers.length > 0 && guessers.every(g => correctUserIds.has(g.user_id))
              
              if (allCorrect) {
                log('所有人都猜對了，房主提前結束輪次')
                // 動態導入 useGame 來避免循環依賴
                const { useGame } = await import('./useGame')
                const { endRound } = useGame()
                await endRound()
              }
            }
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
        if (status === 'SUBSCRIBED') {
          resolve(channel)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`訂閱失敗: ${status}`))
        }
      })
    })
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
      log('猜測訂閱已存在，跳過:', roundId)
      return channel
    }

    log('訂閱猜測記錄:', roundId)
    
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'guesses',
      filter: `round_id=eq.${roundId}`,
    }, async (payload) => {
      log('收到新猜測記錄:', payload.eventType, payload.new)
      // 立即更新本地狀態
      await gameStore.loadGuesses(roundId)
    })

    ;(channel as any)[listenerKey] = true
    return channel
  }

  // 訂閱遊戲狀態廣播
  function subscribeGameState(roomCode: string, onGameState: (state: any) => void) {
    const channel = getRoomChannel(roomCode)
    
    const listenerKey = `gameState:${roomCode}`
    if ((channel as any)[listenerKey]) {
      return channel
    }

    channel.on('broadcast', { event: 'game_state' }, (payload) => {
      log('收到遊戲狀態廣播:', payload.payload)
      onGameState(payload.payload)
    })

    ;(channel as any)[listenerKey] = true
    return channel
  }

  // 廣播遊戲狀態
  async function broadcastGameState(roomCode: string, state: {
    roundStatus: string
    drawerId?: string
    drawerName?: string
    wordOptions?: any[]
    roundNumber?: number
    isLastRound?: boolean
  }) {
    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    if (channelState !== 'joined') {
      warn('Channel 未連接，狀態:', channelState, '- 狀態將通過數據庫同步')
      // 不阻塞，狀態會通過 postgres_changes 同步
      return { warning: 'Channel 未連接' }
    }

    try {
      log('廣播遊戲狀態:', state)
      const result = await channel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: state,
      })

      if (result === 'error') {
        warn('發送遊戲狀態失敗')
        return { error: '發送失敗' }
      }
      return result
    } catch (error) {
      warn('發送遊戲狀態錯誤:', error)
      return { error: error instanceof Error ? error.message : '發送失敗' }
    }
  }

  async function sendDrawing(roomCode: string, stroke: any) {
    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    if (channelState !== 'joined') {
      // 繪畫數據丟失比較嚴重，記錄警告
      warn('Channel 未連接，無法發送繪畫數據，狀態:', channelState)
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
    subscribeGameState,
    sendDrawing,
    broadcastGameState,
    unsubscribeRoom,
    unsubscribeAll,
    getConnectionStatus,
  }
}
