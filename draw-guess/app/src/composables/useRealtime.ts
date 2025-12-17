import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useStoryStore } from '../stores/story'
import { toVote } from '../types/storyboard'

/**
 * Realtime 訂閱管理 - 簡化版
 * 
 * 設計原則：
 * 1. 信任 Supabase SDK 的內建重連機制
 * 2. 移除不必要的 Safari 特殊處理
 * 3. 簡化全局狀態管理
 * 4. 避免 Postgres Changes 和 Broadcast 的競態條件
 */

// 全局單例狀態（最小化）
const globalChannels = new Map<string, ReturnType<typeof supabase.channel>>()
const globalConnectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
const globalDrawingCallbacks = new Map<string, Set<(stroke: any) => void>>()
const globalGameStateCallbacks = new Map<string, Set<(state: any) => void>>()
const globalSubscribedRooms = new Set<string>()

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
  const storyStore = useStoryStore()

  /**
   * 獲取或創建房間 Channel
   * 
   * 使用 private channel + Broadcast Replay 功能：
   * 1. private: true 確保安全性，與數據庫端 realtime.send(..., true) 匹配
   * 2. replay 功能確保即使錯過初始廣播，連接後也能收到歷史消息
   * 
   * 參考：https://supabase.com/docs/guides/realtime/broadcast#broadcast-replay
   */
  function getRoomChannel(roomCode: string) {
    const channelKey = `room:${roomCode}`
    
    if (globalChannels.has(channelKey)) {
      return globalChannels.get(channelKey)!
    }

    log('創建新 channel:', channelKey)
    const channel = supabase.channel(channelKey, {
      config: {
        private: true,  // ⭐ 使用 private channel，與數據庫端匹配
        presence: { key: 'user' },
        broadcast: { 
          self: true,  // 房主也收到自己的廣播，統一處理邏輯
          // ⭐ Broadcast Replay：確保即使錯過初始廣播也能收到歷史消息
          // 注意：只有 Database Broadcast 的消息才能被重播
          replay: {
            since: Date.now() - 10 * 60 * 1000,  // 重播最近 10 分鐘的消息
            limit: 20  // 最多 20 條
          }
        },
      },
    })

    globalChannels.set(channelKey, channel)
    return channel
  }

  /**
   * 處理訂閱狀態變化
   * 簡化版：只處理基本狀態，不做複雜的重連邏輯
   */
  function handleSubscriptionStatus(
    status: string,
    channel: ReturnType<typeof supabase.channel>,
    roomCode: string,
    userId: string,
    userData: any
  ) {
    log('訂閱狀態:', status, 'roomCode:', roomCode)
    
    if (status === 'SUBSCRIBED') {
      globalConnectionStatus.value = 'connected'
      
      // 追蹤 Presence
      channel.track({ user_id: userId, ...userData }).catch(err => {
        warn('Presence track 失敗:', err)
      })
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      globalConnectionStatus.value = 'disconnected'
      warn('訂閱失敗:', status)
      // Supabase SDK 會自動嘗試重連，我們不需要手動處理
    } else if (status === 'CLOSED') {
      globalConnectionStatus.value = 'disconnected'
      log('Channel 已關閉')
    }
  }

  /**
   * 訂閱房間
   * 
   * 改進：
   * 1. 使用 private channel + setAuth() 確保 Realtime Authorization
   * 2. 支持 Broadcast Replay 功能
   */
  async function subscribeRoom(
    roomCode: string, 
    roomId: string, 
    userId: string, 
    userData: any
  ): Promise<ReturnType<typeof supabase.channel>> {
    if (!roomCode || !roomId) {
      warn('缺少 roomCode 或 roomId')
      throw new Error('缺少 roomCode 或 roomId')
    }

    // ⭐ 設置 Realtime Auth - 這對 private channel 是必須的
    // 參考：https://supabase.com/docs/guides/realtime/broadcast#broadcast-record-changes
    try {
      await supabase.realtime.setAuth()
      log('Realtime Auth 設置成功')
    } catch (authError) {
      warn('Realtime Auth 設置失敗:', authError)
      // 繼續嘗試連接，可能在某些情況下仍然可以工作
    }

    return new Promise((resolve, reject) => {
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
        log('subscribeRoom - 正在連接中，等待結果')
        const checkInterval = setInterval(() => {
          const state = (channel as any).state
          if (state === 'joined') {
            clearInterval(checkInterval)
            resolve(channel)
          } else if (state === 'closed' || state === 'errored') {
            clearInterval(checkInterval)
            reject(new Error(`連接失敗: ${state}`))
          }
        }, 100)
        
        // 超時處理
        setTimeout(() => {
          clearInterval(checkInterval)
          if ((channel as any).state !== 'joined') {
            warn('subscribeRoom - 連接超時')
            reject(new Error('連接超時'))
          }
        }, 10000)
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
      setupChannelListeners(channel, roomCode, roomId)

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

  /**
   * 設置 Channel 監聽器
   * 分離出來便於維護
   */
  function setupChannelListeners(
    channel: ReturnType<typeof supabase.channel>,
    roomCode: string,
    roomId: string
  ) {
    channel
      // 房間狀態變化
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
      
      // 參與者變化
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        log('參與者變化:', payload.eventType)
        await roomStore.loadParticipants(roomId)
      })
      
      // 輪次變化 - 智能處理避免競態條件
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rounds',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        log('輪次變化:', payload.eventType, payload.new)
        
        // 智能處理：避免與 Broadcast 競爭
        // 規則：
        // - 沒有當前輪次時：載入（初始化）
        // - INSERT 且 ID 不同：載入（新輪次）
        // - UPDATE：跳過（狀態由 game_state 廣播同步）
        if (roomStore.currentRoom) {
          const newRound = payload.new as any
          const currentRoundId = gameStore.currentRound?.id
          
          if (!currentRoundId) {
            log('輪次變化：初始化載入')
            await gameStore.loadCurrentRound(roomStore.currentRoom.id)
          } else if (payload.eventType === 'INSERT' && newRound?.id !== currentRoundId) {
            log('輪次變化：新輪次 INSERT', { newId: newRound?.id, currentId: currentRoundId })
            await gameStore.loadCurrentRound(roomStore.currentRoom.id)
          } else if (payload.eventType === 'UPDATE') {
            // 跳過 UPDATE，避免與 game_state 廣播競爭
            log('輪次變化：UPDATE 事件，跳過以避免競爭')
          }
        }
      })
      
      // 猜測記錄
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guesses',
      }, async (payload) => {
        const newGuess = payload.new as any
        if (newGuess && gameStore.currentRound) {
          log('收到新猜測:', newGuess)
          await gameStore.loadGuesses(newGuess.round_id)
          
          // 房主檢查：所有人都猜對了則提前結束
          if (newGuess.is_correct && roomStore.isHost && gameStore.roundStatus === 'drawing') {
            const drawerId = gameStore.currentRound.drawer_id
            const guessers = roomStore.participants.filter(p => p.user_id !== drawerId)
            const correctUserIds = new Set(
              gameStore.currentRoundCorrectGuesses.map(g => g.user_id)
            )
            const allCorrect = guessers.length > 0 && guessers.every(g => correctUserIds.has(g.user_id))
            
            if (allCorrect) {
              log('所有人都猜對了，房主提前結束輪次')
              const { useGame } = await import('./useGame')
              const { endRound } = useGame()
              await endRound()
            }
          }
        }
      })
      
      // 分鏡模式投票記錄 - 實時同步以支持提前結束投票階段
      // 注意：必須監聽 * 事件（INSERT 和 UPDATE），因為 castVote 使用 upsert
      // 首次投票觸發 INSERT，更改投票觸發 UPDATE
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_votes',
      }, (payload) => {
        const newVote = payload.new as any
        if (newVote && gameStore.currentRound && newVote.round_id === gameStore.currentRound.id) {
          log('收到投票變更:', payload.eventType, newVote)
          // 使用 toVote 轉換並更新本地狀態
          // addVoteLocal 會正確處理新增和更新
          const vote = toVote(newVote)
          storyStore.addVoteLocal(vote)
        }
      })
      
      // 分鏡模式句子提交 - 實時同步
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'story_submissions',
      }, async (payload) => {
        const newSubmission = payload.new as any
        if (newSubmission && gameStore.currentRound && newSubmission.round_id === gameStore.currentRound.id) {
          log('收到新句子提交:', newSubmission)
          // 重新載入提交列表以獲取完整數據
          await storyStore.loadSubmissions(gameStore.currentRound.id)
        }
      })
      
      // 繪畫廣播
      .on('broadcast', { event: 'drawing' }, (payload) => {
        log('收到 drawing 廣播')
        const callbacks = globalDrawingCallbacks.get(roomCode)
        if (callbacks && payload.payload?.stroke) {
          log('分發給', callbacks.size, '個回調')
          callbacks.forEach(cb => cb(payload.payload.stroke))
        }
      })
      
      // 遊戲狀態廣播
      // 支持兩種來源：
      // 1. 客戶端 broadcastGameState() 發送的（傳統方式）
      // 2. 數據庫觸發器 broadcast_game_round_changes() 發送的（新方式，更可靠）
      .on('broadcast', { event: 'game_state' }, (payload) => {
        const isReplayed = payload?.meta?.replayed === true
        const state = payload.payload
        
        if (isReplayed) {
          log('📜 收到重播的 game_state 廣播:', state)
        } else {
          log('🆕 收到新的 game_state 廣播:', state)
        }
        
        // ⭐ 直接處理來自數據庫的廣播（type === 'round_update'）
        // 這確保即使玩家錯過了原始廣播，也能通過 Replay 恢復狀態
        if (state?.type === 'round_update') {
          log('處理數據庫廣播的輪次更新:', {
            wordLength: state.wordLength,
            drawerId: state.drawerId,
            hintGiven: state.hintGiven
          })
          
          // 更新 gameStore 狀態
          if (state.wordLength > 0) {
            gameStore.setWordLength(state.wordLength)
          }
          if (state.hintGiven !== undefined) {
            gameStore.setHintState(
              state.hintGiven,
              state.revealedIndices || [],
              state.revealedChars || []
            )
          }
        }
        
        // 分發給註冊的回調（兼容現有邏輯）
        const callbacks = globalGameStateCallbacks.get(roomCode)
        if (callbacks && state) {
          log('分發給', callbacks.size, '個遊戲狀態回調')
          callbacks.forEach(cb => cb(state))
        }
      })
      
      // Presence 同步
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        log('Presence 同步，在線:', Object.keys(state).length)
      })
  }

  /**
   * 訂閱繪畫回調
   */
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

  /**
   * 訂閱猜測記錄
   */
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
      await gameStore.loadGuesses(roundId)
    })

    ;(channel as any)[listenerKey] = true
    return channel
  }

  /**
   * 訂閱遊戲狀態廣播
   * 使用回調機制，確保在 channel subscribe 之前或之後都能正確接收
   */
  function subscribeGameState(roomCode: string, onGameState: (state: any) => void) {
    log('註冊遊戲狀態回調，roomCode:', roomCode)
    
    if (!globalGameStateCallbacks.has(roomCode)) {
      globalGameStateCallbacks.set(roomCode, new Set())
    }
    globalGameStateCallbacks.get(roomCode)!.add(onGameState)

    // 返回取消訂閱的函數
    return () => {
      globalGameStateCallbacks.get(roomCode)?.delete(onGameState)
    }
  }

  /**
   * 廣播遊戲狀態
   */
  async function broadcastGameState(roomCode: string, state: {
    roundStatus: string
    drawerId?: string
    drawerName?: string
    wordLength?: number  // 詞語長度（非畫家用於顯示下劃線）
    roundNumber?: number
    isLastRound?: boolean
    startedAt?: string
    hintGiven?: boolean
    revealedIndices?: number[]
    revealedChars?: string[]
    storyboardPhase?: string
    clearCanvas?: boolean  // 顯式清空畫布指令（新輪次開始時發送）
    // 分鏡編劇詞句（依詞句庫編劇模式專用）
    storyboardWritingPromptText?: string  // 本輪指定詞句
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

  /**
   * 發送繪畫數據
   */
  async function sendDrawing(roomCode: string, stroke: any) {
    const channel = getRoomChannel(roomCode)
    const channelState = (channel as any).state

    if (channelState !== 'joined') {
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

  /**
   * 取消訂閱房間
   * 清理所有相關的全局狀態，避免舊房間的回調影響新房間
   */
  function unsubscribeRoom(roomCode: string) {
    const channelKey = `room:${roomCode}`
    const channel = globalChannels.get(channelKey)

    log('unsubscribeRoom - roomCode:', roomCode)

    if (channel) {
      supabase.removeChannel(channel as any)
      globalChannels.delete(channelKey)
    }

    // 清理所有相關的回調 Map
    globalDrawingCallbacks.delete(roomCode)
    globalGameStateCallbacks.delete(roomCode)  // ⭐ 修復：之前遺漏了這行
    globalSubscribedRooms.delete(roomCode)
  }
  
  /**
   * 檢查並恢復連接狀態
   * 簡化版：直接重新訂閱
   */
  async function checkAndRestoreConnection(
    roomCode: string, 
    roomId: string, 
    userId: string, 
    userData: any
  ) {
    const channelKey = `room:${roomCode}`
    const channel = globalChannels.get(channelKey)
    
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
    
    // Channel 狀態異常，重建
    if (state === 'errored' || state === 'closed') {
      log('連接恢復：Channel 狀態異常，重建')
      try {
        supabase.removeChannel(channel as any)
      } catch (e) {
        warn('移除異常 Channel 失敗:', e)
      }
      globalChannels.delete(channelKey)
      globalSubscribedRooms.delete(roomCode)
      
      try {
        await subscribeRoom(roomCode, roomId, userId, userData)
      } catch (err) {
        warn('連接恢復：重新訂閱失敗:', err)
      }
    }
  }

  /**
   * 取消所有訂閱
   */
  function unsubscribeAll() {
    globalChannels.forEach((channel) => supabase.removeChannel(channel as any))
    globalChannels.clear()
    globalDrawingCallbacks.clear()
    globalSubscribedRooms.clear()
  }

  /**
   * 獲取連接狀態
   */
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
