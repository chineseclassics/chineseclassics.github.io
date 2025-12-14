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
const globalReconnectAttempts = new Map<string, number>()
// 追蹤是否正在重連中，避免重複觸發
const globalReconnecting = new Map<string, boolean>()
// 追蹤訂閱用戶數據，用於重連時恢復
const globalSubscriptionData = new Map<string, { roomId: string; userId: string; userData: any }>()

// 重連配置
const MAX_RECONNECT_ATTEMPTS = 10  // 最多重連 10 次
const RECONNECT_BASE_DELAY = 1000  // 基礎延遲 1 秒
const RECONNECT_MAX_DELAY = 30000  // 最大延遲 30 秒

const DEBUG = import.meta.env.DEV

function log(...args: any[]) {
  if (DEBUG) console.log('[Realtime]', ...args)
}

function warn(...args: any[]) {
  console.warn('[Realtime]', ...args)
}

// 檢測瀏覽器類型（用於針對性處理 Safari 問題）
function isSafari(): boolean {
  const ua = navigator.userAgent
  return /^((?!chrome|android).)*safari/i.test(ua)
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
    log('訂閱狀態:', status, '(Safari:', isSafari(), ')')
    
    // 保存訂閱數據，用於後續重連
    globalSubscriptionData.set(roomCode, { roomId: '', userId, userData })
    
    if (status === 'SUBSCRIBED') {
      globalConnectionStatus.value = 'connected'
      clearReconnectTimer(roomCode)
      globalReconnectAttempts.set(roomCode, 0)  // 重置重連計數
      globalReconnecting.set(roomCode, false)  // 標記不在重連中
      
      // Safari 有時候 track 會失敗，添加重試機制
      const trackWithRetry = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            await channel.track({ user_id: userId, ...userData })
            log('Presence track 成功')
            return
          } catch (err) {
            warn(`Presence track 失敗 (嘗試 ${i + 1}/${retries}):`, err)
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
            }
          }
        }
      }
      trackWithRetry()
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      globalConnectionStatus.value = 'disconnected'
      
      // 檢查是否已經在重連中，避免重複觸發
      if (globalReconnecting.get(roomCode)) {
        log('已在重連中，跳過重複觸發')
        return
      }
      
      const attempts = globalReconnectAttempts.get(roomCode) || 0
      warn('訂閱失敗:', status, '(嘗試次數:', attempts, ', 瀏覽器:', navigator.userAgent.slice(0, 50), ')')
      
      // 標記正在重連
      globalReconnecting.set(roomCode, true)
      scheduleReconnect(roomCode, userId, userData)
    } else if (status === 'CLOSED') {
      globalConnectionStatus.value = 'disconnected'
      globalReconnecting.set(roomCode, false)
      log('Channel 已關閉')
    }
  }

  function scheduleReconnect(roomCode: string, userId: string, userData: any) {
    const currentAttempts = globalReconnectAttempts.get(roomCode) || 0
    
    if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
      warn(`重連失敗次數過多 (${currentAttempts} 次)，停止重連。請刷新頁面重試。`)
      globalConnectionStatus.value = 'disconnected'
      globalReconnecting.set(roomCode, false)
      return
    }
    
    clearReconnectTimer(roomCode)
    globalReconnectAttempts.set(roomCode, currentAttempts + 1)
    
    // 指數退避延遲，Safari 瀏覽器給予更長的延遲
    const safari = isSafari()
    const baseDelay = safari ? RECONNECT_BASE_DELAY * 2 : RECONNECT_BASE_DELAY
    const delay = Math.min(baseDelay * Math.pow(1.5, currentAttempts), RECONNECT_MAX_DELAY)
    
    log(`排程重連，${Math.round(delay)}ms 後嘗試 (第 ${currentAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} 次, Safari: ${safari})`)
    
    const timerId = window.setTimeout(async () => {
      const channelKey = `room:${roomCode}`
      let channel = globalChannels.get(channelKey)
      let needsRebuild = false
      
      // 如果 channel 處於錯誤狀態，嘗試移除並重建
      if (channel) {
        const channelState = (channel as any).state
        if (channelState === 'errored' || channelState === 'closed') {
          log('Channel 狀態異常，重建 Channel:', channelState)
          try {
            supabase.removeChannel(channel as any)
          } catch (e) {
            warn('移除舊 Channel 失敗:', e)
          }
          globalChannels.delete(channelKey)
          globalSubscribedRooms.delete(roomCode)
          channel = undefined
          needsRebuild = true
          
          // Safari 額外等待，確保舊連接完全清理
          if (safari) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      // 如果 channel 不存在或已被移除，重新創建
      if (!channel || needsRebuild) {
        log('重建 Channel')
        // 需要重新完整訂閱，包含所有監聯器
        try {
          // 直接創建新 channel 並重新設置監聽器
          channel = supabase.channel(channelKey, {
            config: {
              presence: { key: 'user' },
              broadcast: { self: true },
            },
          })
          globalChannels.set(channelKey, channel)
          
          // 重置重連標記，允許訂閱回調正常處理
          globalReconnecting.set(roomCode, false)
          
          // 重新訂閱
          globalConnectionStatus.value = 'connecting'
          channel.subscribe((status) => {
            handleSubscriptionStatus(status, channel!, roomCode, userId, userData)
          })
        } catch (e) {
          warn('重建 Channel 失敗:', e)
          // 延遲後再次嘗試重連
          globalReconnecting.set(roomCode, true)
          scheduleReconnect(roomCode, userId, userData)
        }
        return
      }
      
      // Channel 存在但未連接，嘗試重新訂閱
      if ((channel as any).state !== 'joined') {
        // 重置重連標記
        globalReconnecting.set(roomCode, false)
        globalConnectionStatus.value = 'connecting'
        channel.subscribe((status) => {
          handleSubscriptionStatus(status, channel!, roomCode, userId, userData)
        })
      } else {
        // 已經連接，重置狀態
        globalConnectionStatus.value = 'connected'
        globalReconnecting.set(roomCode, false)
        globalReconnectAttempts.set(roomCode, 0)
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

      // 保存訂閱數據
      globalSubscriptionData.set(roomCode, { roomId, userId, userData })

      const channel = getRoomChannel(roomCode)
      const channelState = (channel as any).state

      log('subscribeRoom - roomCode:', roomCode, 'state:', channelState, 'Safari:', isSafari())

      // 已經連接，直接返回
      if (channelState === 'joined') {
        globalConnectionStatus.value = 'connected'
        globalReconnecting.set(roomCode, false)
        resolve(channel)
        return
      }

      // 正在連接中，等待結果
      if (channelState === 'joining') {
        log('subscribeRoom - 正在連接中，等待結果')
        const checkInterval = setInterval(() => {
          const state = (channel as any).state
          if (state === 'joined') {
            clearInterval(checkInterval)
            globalReconnecting.set(roomCode, false)
            resolve(channel)
          } else if (state === 'closed' || state === 'errored') {
            clearInterval(checkInterval)
            // 不立即 reject，而是嘗試重連
            log('subscribeRoom - 連接失敗，狀態:', state)
            // 繼續執行重連邏輯
          }
        }, 100)
        
        // Safari 給予更長的超時時間
        const timeout = isSafari() ? 10000 : 5000
        setTimeout(() => {
          clearInterval(checkInterval)
          if ((channel as any).state !== 'joined') {
            warn('subscribeRoom - 連接超時')
            reject(new Error('連接超時'))
          }
        }, timeout)
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
            // 不立即 reject，讓 handleSubscriptionStatus 處理重連
            // 只有在超過重試次數後才 reject
            const attempts = globalReconnectAttempts.get(roomCode) || 0
            if (attempts >= MAX_RECONNECT_ATTEMPTS) {
              reject(new Error(`訂閱失敗: ${status}`))
            }
            // 否則繼續等待重連結果
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
          console.log('[Realtime] 收到 drawing 廣播:', JSON.stringify(payload))
          const callbacks = globalDrawingCallbacks.get(roomCode)
          if (callbacks && payload.payload?.stroke) {
            console.log('[Realtime] 分發給', callbacks.size, '個回調')
            callbacks.forEach(cb => cb(payload.payload.stroke))
          } else {
            console.log('[Realtime] 沒有回調或 stroke 為空, callbacks:', callbacks?.size, 'stroke:', payload.payload?.stroke)
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
          // 不立即 reject，讓 handleSubscriptionStatus 處理重連
          // 只有在超過重試次數後才 reject
          const attempts = globalReconnectAttempts.get(roomCode) || 0
          if (attempts >= MAX_RECONNECT_ATTEMPTS) {
            reject(new Error(`訂閱失敗: ${status}`))
          }
          // 否則繼續等待重連結果
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
    startedAt?: string  // ISO 時間戳，用於同步倒計時
    // 提示相關
    hintGiven?: boolean
    revealedIndices?: number[]
    // 分鏡模式相關
    storyboardPhase?: string  // 分鏡模式階段：setup, drawing, writing, voting, summary, ending
    // 分鏡模式結算結果（用於同步給非房主玩家）
    storyboardRoundResult?: {
      winningSentence: string
      winnerName: string
      winnerId: string
      winnerVoteCount: number
      drawerScore: number
      screenwriterScore: number
    }
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
    globalReconnectAttempts.delete(roomCode)
    globalReconnecting.delete(roomCode)
    globalSubscriptionData.delete(roomCode)

    if (channel) {
      supabase.removeChannel(channel as any)
      globalChannels.delete(channelKey)
    }

    globalDrawingCallbacks.delete(roomCode)
    globalSubscribedRooms.delete(roomCode)
  }
  
  /**
   * 檢查並恢復連接狀態
   * 用於頁面可見性變化或網絡恢復時
   */
  async function checkAndRestoreConnection(roomCode: string, roomId: string, userId: string, userData: any) {
    const channelKey = `room:${roomCode}`
    const channel = globalChannels.get(channelKey)
    
    // 保存訂閱數據
    globalSubscriptionData.set(roomCode, { roomId, userId, userData })
    
    // 如果已經在重連中，不要重複觸發
    if (globalReconnecting.get(roomCode)) {
      log('連接恢復：已在重連中，跳過')
      return
    }
    
    if (!channel) {
      log('連接恢復：Channel 不存在，重新訂閱')
      try {
        await subscribeRoom(roomCode, roomId, userId, userData)
      } catch (err) {
        warn('連接恢復：重新訂閱失敗:', err)
      }
      return
    }
    
    const state = (channel as any).state
    log('連接恢復檢查：Channel 狀態:', state)
    
    if (state === 'joined') {
      log('連接恢復：Channel 已連接，狀態正常')
      globalConnectionStatus.value = 'connected'
      return
    }
    
    if (state === 'joining') {
      log('連接恢復：Channel 正在連接中，等待結果')
      return
    }
    
    // Safari 特殊處理：如果狀態是 errored，需要完全重建 channel
    if (isSafari() && (state === 'errored' || state === 'closed')) {
      log('連接恢復 (Safari)：Channel 狀態異常，強制重建')
      try {
        supabase.removeChannel(channel as any)
      } catch (e) {
        warn('移除異常 Channel 失敗:', e)
      }
      globalChannels.delete(channelKey)
      globalSubscribedRooms.delete(roomCode)
      
      // 延遲一點再重新訂閱，讓舊連接完全清理
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        await subscribeRoom(roomCode, roomId, userId, userData)
      } catch (err) {
        warn('連接恢復 (Safari)：重新訂閱失敗:', err)
      }
      return
    }
    
    // 一般情況：Channel 未連接，嘗試重連
    log('連接恢復：Channel 未連接，嘗試重連')
    globalReconnectAttempts.set(roomCode, 0)  // 重置重連計數
    globalReconnecting.set(roomCode, true)
    scheduleReconnect(roomCode, userId, userData)
  }

  function unsubscribeAll() {
    globalReconnectTimers.forEach((_, roomCode) => clearReconnectTimer(roomCode))
    globalChannels.forEach((channel) => supabase.removeChannel(channel as any))
    globalChannels.clear()
    globalDrawingCallbacks.clear()
    globalSubscribedRooms.clear()
    globalReconnecting.clear()
    globalSubscriptionData.clear()
    globalReconnectAttempts.clear()
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
    checkAndRestoreConnection,
  }
}
