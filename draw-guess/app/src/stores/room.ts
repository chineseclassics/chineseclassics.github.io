import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

// 遊戲模式類型
export type GameMode = 'classic' | 'storyboard'

// 分鏡編劇模式類型
export type StoryboardWritingMode = 'free' | 'wordlist'

// 房間接口
export interface GameRoom {
  id: string
  code: string
  name: string
  host_id: string
  words: Array<{ text: string; source: 'wordlist' | 'custom' }>
  word_count: number
  status: 'waiting' | 'playing' | 'finished'
  settings: {
    draw_time: number // 繪畫時間（秒）
    rounds: number // 輪數
    word_count_per_round: number // 每輪可選詞數
    hints_count: number // 提示數量
    // 分鏡編劇模式（分鏡模式專用）
    storyboard_writing_mode?: StoryboardWritingMode // 'free' = 自由編劇, 'wordlist' = 依詞句庫編劇
  }
  current_round: number
  current_drawer_id: string | null
  // 分鏡接龍模式相關字段
  game_mode: GameMode // 遊戲模式：classic（傳統）或 storyboard（分鏡接龍）
  single_round_mode: boolean // 單局模式（分鏡模式專用）
  is_final_round: boolean // 是否為最後一局
  // 分鏡編劇詞句相關（依詞句庫編劇模式專用）
  storyboard_writing_prompt_text?: string | null // 本輪指定詞句
  used_word_indexes?: number[] // 已使用的詞語索引（跨場不重複）
  created_at: string
  updated_at: string
}

// 參與者接口
export interface RoomParticipant {
  id: string
  room_id: string
  user_id: string
  nickname: string
  score: number
  joined_at: string
}

export const useRoomStore = defineStore('room', () => {
  // 狀態
  const currentRoom = ref<GameRoom | null>(null)
  const participants = ref<RoomParticipant[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isHost = computed(() => {
    const authStore = useAuthStore()
    return currentRoom.value?.host_id === authStore.user?.id
  })

  // 生成 6 位房間碼（已棄用，直接在使用處生成）
  // 保留此函數以備將來使用
  // @ts-ignore - 未使用的函數，保留以備將來使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function _generateRoomCode(): Promise<string> {
    console.log('開始生成房間碼...')
    
    // 最多嘗試 10 次
    for (let attempt = 0; attempt < 10; attempt++) {
      // 生成 6 位隨機數字
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      console.log(`嘗試 ${attempt + 1}/10: 房間碼 ${code}`)

      try {
        // 使用 Promise.race 添加超時處理（5秒超時）
        const checkPromise = supabase
          .from('game_rooms')
          .select('code')
          .eq('code', code)
          .maybeSingle()

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('查詢超時')), 5000)
        })

        const result = await Promise.race([checkPromise, timeoutPromise]) as any
        const { data, error: checkError } = result

        console.log(`查詢結果:`, { data, error: checkError, code })

        // 如果查詢出錯或沒有找到記錄，說明可以使用
        if (checkError) {
          // 如果是 PGRST116（未找到），說明房間碼可用
          if (checkError.code === 'PGRST116') {
            console.log('房間碼可用（未找到記錄）:', code)
            return code
          }
          // 其他錯誤，記錄但繼續嘗試
          console.warn('查詢出錯，繼續嘗試:', checkError)
          continue
        }

        if (!data) {
          console.log('房間碼可用（查詢返回空）:', code)
          return code
        }

        console.log('房間碼已存在，繼續嘗試...')
      } catch (err) {
        console.error('檢查房間碼時發生錯誤:', err)
        // 如果是超時錯誤，直接使用此房間碼（避免無限等待）
        if (err instanceof Error && err.message === '查詢超時') {
          console.warn('查詢超時，使用此房間碼:', code)
          return code
        }
        // 其他錯誤，繼續嘗試
        continue
      }
    }

    // 如果所有嘗試都失敗，生成一個帶時間戳的房間碼（確保唯一）
    const timestamp = Date.now().toString().slice(-6)
    console.warn('所有嘗試失敗，使用時間戳房間碼:', timestamp)
    return timestamp
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
      // 分鏡編劇模式（分鏡模式專用）
      storyboard_writing_mode?: StoryboardWritingMode
    }
    // 分鏡接龍模式相關參數
    gameMode?: GameMode
    singleRoundMode?: boolean
  }) {
    try {
      loading.value = true
      error.value = null

      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('請先登入')
      }

      // 確保用戶資料存在（如果不存在則創建）
      // 使用 auth store 的 loadUserProfile 方法，它會自動處理創建邏輯
      if (!authStore.profile && authStore.user) {
        try {
          // loadUserProfile 會自動處理：如果用戶不存在，會自動創建
          await authStore.loadUserProfile(authStore.user.id, false)
        } catch (profileError) {
          console.warn('載入用戶資料時發生錯誤（非關鍵）:', profileError)
          // 繼續嘗試創建房間，如果失敗會得到更明確的錯誤
        }
      }

      // 驗證數據
      // - 傳統模式：始終需要至少 6 個詞語
      // - 分鏡模式 + 自由編劇：不需要詞語
      // - 分鏡模式 + 依詞句庫編劇：需要至少 6 個詞語
      const gameMode = data.gameMode || 'classic'
      const storyboardWritingMode = data.settings.storyboard_writing_mode || 'free'
      const needsWords = gameMode === 'classic' || 
        (gameMode === 'storyboard' && storyboardWritingMode === 'wordlist')
      
      if (needsWords && data.words.length < 6) {
        throw new Error('至少需要 6 個詞語')
      }

      // 移除輪數驗證，輪數將在開始遊戲時自動設定為房間人數
      // 允許輪數超過詞語總數（會重複使用詞語）

      // 直接嘗試創建房間，如果房間碼重複則重試
      let newRoom: any = null
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts && !newRoom) {
        attempts++
        // 生成 6 位隨機數字
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        // 創建房間記錄
        const roomData = {
          code,
          name: data.name,
          host_id: authStore.user.id,
          words: data.words,
          word_count: data.words.length,
          status: 'waiting' as const,
          settings: data.settings,
          current_round: 0,
          current_drawer_id: null,
          // 分鏡接龍模式相關字段
          game_mode: gameMode,
          single_round_mode: data.singleRoundMode || false,
          is_final_round: false,
        }

        // 使用 Supabase 客戶端創建房間（參考句豆的實現）
        const { data: insertedRoom, error: insertError } = await supabase
          .from('game_rooms')
          .insert(roomData)
          .select()
          .single()

        if (insertError) {
          // 如果是房間碼重複錯誤（23505），重新生成
          if (insertError.code === '23505') {
            continue
          }
          
          // 其他錯誤
          throw new Error(insertError.message || '插入房間失敗')
        }

        if (!insertedRoom) {
          continue
        }

        newRoom = insertedRoom
        break
      }

      if (!newRoom) {
        throw new Error('無法生成唯一房間碼，請重試')
      }

      // 加入房間作為房主（不設置 loading，因為已經在 createRoom 中設置了）
      // 使用 Supabase 客戶端創建參與記錄
      const participantData = {
        room_id: newRoom.id,
        user_id: authStore.user.id,
        nickname: authStore.profile?.display_name || '房主',
        score: 0,
      }
      
      try {
        const { error: participantError } = await supabase
          .from('room_participants')
          .insert(participantData)
        
        if (participantError) {
          console.error('創建參與記錄錯誤:', participantError)
          // 即使參與記錄創建失敗，房間已經創建，仍然返回成功
        }
      } catch (participantError) {
        console.error('創建參與記錄時發生錯誤:', participantError)
        // 即使參與記錄創建失敗，房間已經創建，仍然返回成功
      }

      // 載入參與者列表（使用 Supabase 客戶端）
      try {
        const { data: participantsData, error: loadError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', newRoom.id)
          .order('joined_at', { ascending: true })
        
        if (loadError) {
          console.error('載入參與者列表失敗:', loadError)
        } else if (participantsData) {
          participants.value = participantsData as RoomParticipant[]
        }
      } catch (loadError) {
        console.error('載入參與者列表時發生錯誤:', loadError)
      }

      currentRoom.value = newRoom as GameRoom

      return { success: true, room: newRoom }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '創建房間失敗'
      console.error('創建房間錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 加入房間
  async function joinRoom(code: string, nickname: string) {
    try {
      loading.value = true
      error.value = null

      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('請先登入')
      }

      // 驗證房間碼格式
      if (!/^\d{6}$/.test(code)) {
        throw new Error('房間碼必須是 6 位數字')
      }

      // 驗證暱稱
      if (!nickname || nickname.trim().length === 0) {
        throw new Error('請輸入暱稱')
      }

      if (nickname.length > 20) {
        throw new Error('暱稱不能超過 20 個字符')
      }

      // 查詢房間（使用 Supabase 客戶端，與句豆一致）
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', code)
        .single()

      if (roomError || !room) {
        throw new Error('房間不存在')
      }

      // 檢查房間狀態
      if (room.status !== 'waiting') {
        throw new Error('房間已開始或已結束')
      }

      // 檢查是否已加入（使用 maybeSingle，因為可能不存在）
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', authStore.user.id)
        .maybeSingle()

      if (existingParticipant) {
        // 已加入，直接返回房間信息
        currentRoom.value = room as GameRoom
        await loadParticipants(room.id)
        return { success: true, room }
      }

      // 創建參與記錄
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: authStore.user.id,
          nickname: nickname.trim(),
          score: 0,
        })

      if (joinError) {
        // 如果是重複鍵錯誤（已加入），嘗試重新載入
        if (joinError.code === '23505' || joinError.message.includes('duplicate')) {
          currentRoom.value = room as GameRoom
          await loadParticipants(room.id)
          return { success: true, room }
        }
        throw joinError
      }

      // 更新房間狀態
      currentRoom.value = room as GameRoom
      await loadParticipants(room.id)

      return { success: true, room }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加入房間失敗'
      console.error('加入房間錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 離開房間
  async function leaveRoom() {
    try {
      if (!currentRoom.value) return { success: true }

      loading.value = true
      error.value = null

      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('請先登入')
      }

      // 刪除參與記錄（使用 Supabase 客戶端）
      const { error: deleteError } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', currentRoom.value.id)
        .eq('user_id', authStore.user.id)

      if (deleteError) {
        throw new Error(`刪除參與記錄失敗: ${deleteError.message || '未知錯誤'}`)
      }

      // 如果是房主，關閉房間
      if (isHost.value) {
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ status: 'finished' })
          .eq('id', currentRoom.value.id)

        if (updateError) {
          // 即使關閉房間失敗，也繼續清除狀態
          console.error('關閉房間失敗:', updateError)
        }
      }

      // 清除狀態
      currentRoom.value = null
      participants.value = []

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '離開房間失敗'
      console.error('離開房間錯誤:', err)
      // 即使出錯，也清除本地狀態
      currentRoom.value = null
      participants.value = []
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 載入參與者列表
  async function loadParticipants(roomId: string) {
    try {
      const { data, error: participantsError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })

      if (participantsError) throw participantsError

      participants.value = (data || []) as RoomParticipant[]
    } catch (err) {
      console.error('載入參與者錯誤:', err)
    }
  }

  // 載入房間信息
  async function loadRoom(roomId: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomError) throw roomError

      currentRoom.value = data as GameRoom
      await loadParticipants(roomId)

      return { success: true, room: data }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入房間失敗'
      console.error('載入房間錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 更新房間狀態
  async function updateRoomStatus(status: 'waiting' | 'playing' | 'finished') {
    try {
      if (!currentRoom.value) {
        throw new Error('沒有當前房間')
      }

      console.log('[RoomStore] 更新房間狀態:', { roomId: currentRoom.value.id, oldStatus: currentRoom.value.status, newStatus: status })

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ status })
        .eq('id', currentRoom.value.id)

      if (updateError) throw updateError

      // 如果房間狀態變為 finished，累積積分到用戶賬戶
      if (status === 'finished' && currentRoom.value) {
        await accumulateScoresToUsers()
      }

      if (currentRoom.value) {
        const oldStatus = currentRoom.value.status
        currentRoom.value.status = status
        console.log('[RoomStore] 房間狀態已更新:', { oldStatus, newStatus: currentRoom.value.status })
      }

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新房間狀態失敗'
      console.error('更新房間狀態錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  // 累積房間積分到用戶總積分（僅限 Google 登入用戶）
  async function accumulateScoresToUsers() {
    if (!currentRoom.value) return

    try {
      console.log('[RoomStore] 開始累積積分到用戶賬戶')

      // 獲取所有參與者及其分數
      const { data: participants, error: fetchError } = await supabase
        .from('room_participants')
        .select('user_id, score')
        .eq('room_id', currentRoom.value.id)

      if (fetchError) {
        console.error('獲取參與者錯誤:', fetchError)
        return
      }

      if (!participants || participants.length === 0) {
        console.log('[RoomStore] 沒有參與者需要累積積分')
        return
      }

      // 獲取所有參與者的用戶信息，確認是否為 Google 登入用戶
      const userIds = participants.map(p => p.user_id)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, user_type')
        .in('id', userIds)

      if (usersError) {
        console.error('獲取用戶信息錯誤:', usersError)
        return
      }

      // 只為 Google 登入用戶（user_type = 'registered'）累積積分
      const registeredUsers = new Set(
        users?.filter(u => u.user_type === 'registered').map(u => u.id) || []
      )

      // 批量更新用戶總積分
      for (const participant of participants) {
        // 只累積 Google 登入用戶的積分
        if (!registeredUsers.has(participant.user_id)) {
          console.log(`[RoomStore] 跳過匿名用戶 ${participant.user_id} 的積分累積`)
          continue
        }

        if (participant.score > 0) {
          // 使用 SQL 的原子操作累積積分
          const { error: updateError } = await supabase.rpc('accumulate_user_score', {
            user_id_param: participant.user_id,
            score_to_add: participant.score
          })

          if (updateError) {
            // 如果 RPC 函數不存在，使用傳統的查詢+更新方式
            console.warn('[RoomStore] RPC 函數不存在，使用傳統方式累積積分:', updateError)
            
            const { data: currentUser, error: fetchUserError } = await supabase
              .from('users')
              .select('total_score')
              .eq('id', participant.user_id)
              .single()

            if (fetchUserError) {
              console.error(`[RoomStore] 獲取用戶 ${participant.user_id} 總積分錯誤:`, fetchUserError)
              continue
            }

            const newTotalScore = (currentUser?.total_score || 0) + participant.score

            const { error: updateUserError } = await supabase
              .from('users')
              .update({ total_score: newTotalScore })
              .eq('id', participant.user_id)

            if (updateUserError) {
              console.error(`[RoomStore] 更新用戶 ${participant.user_id} 總積分錯誤:`, updateUserError)
            } else {
              console.log(`[RoomStore] 用戶 ${participant.user_id} 積分已累積: +${participant.score} (總積分: ${newTotalScore})`)
            }
          } else {
            console.log(`[RoomStore] 用戶 ${participant.user_id} 積分已累積: +${participant.score}`)
          }
        }
      }
    } catch (err) {
      console.error('[RoomStore] 累積積分錯誤:', err)
    }
  }

  // 更新當前畫家
  async function updateRoomDrawer(drawerId: string) {
    try {
      if (!currentRoom.value) {
        throw new Error('沒有當前房間')
      }

      console.log('[RoomStore] 更新當前畫家:', { roomId: currentRoom.value.id, drawerId })

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ current_drawer_id: drawerId })
        .eq('id', currentRoom.value.id)

      if (updateError) throw updateError

      if (currentRoom.value) {
        currentRoom.value.current_drawer_id = drawerId
        console.log('[RoomStore] 當前畫家已更新:', drawerId)
      }

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新畫家失敗'
      console.error('更新畫家錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  // 更新房間設置（用於更新輪數等）
  async function updateRoomSettings(settings: Partial<GameRoom['settings']>) {
    try {
      if (!currentRoom.value) {
        throw new Error('沒有當前房間')
      }

      console.log('[RoomStore] 更新房間設置:', { roomId: currentRoom.value.id, settings })

      // 合併現有設置
      const newSettings = {
        ...currentRoom.value.settings,
        ...settings,
      }

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ settings: newSettings })
        .eq('id', currentRoom.value.id)

      if (updateError) throw updateError

      if (currentRoom.value) {
        currentRoom.value.settings = newSettings
        console.log('[RoomStore] 房間設置已更新:', newSettings)
      }

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新房間設置失敗'
      console.error('更新房間設置錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  // 清除房間狀態
  function clearRoom() {
    currentRoom.value = null
    participants.value = []
    error.value = null
  }

  // 設置當前畫家（只更新本地狀態，用於廣播同步）
  function setCurrentDrawer(drawerId: string) {
    if (currentRoom.value) {
      currentRoom.value.current_drawer_id = drawerId
      console.log('[RoomStore] 本地更新當前畫家:', drawerId)
    }
  }

  // 踢出玩家（只有房主可以執行）
  async function kickPlayer(targetUserId: string) {
    try {
      if (!currentRoom.value) {
        return { success: false, error: '沒有當前房間' }
      }

      if (!isHost.value) {
        return { success: false, error: '只有房主可以踢人' }
      }

      const authStore = useAuthStore()
      if (targetUserId === authStore.user?.id) {
        return { success: false, error: '不能踢出自己' }
      }

      loading.value = true
      error.value = null

      // 調用資料庫函數踢人
      const { data, error: rpcError } = await supabase.rpc('kick_player', {
        p_room_id: currentRoom.value.id,
        p_target_user_id: targetUserId
      })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      if (data && !data.success) {
        throw new Error(data.error || '踢出玩家失敗')
      }

      // 重新載入參與者列表
      await loadParticipants(currentRoom.value.id)

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '踢出玩家失敗'
      console.error('踢出玩家錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 設置最後一局標記（分鏡模式專用）
  // Requirements: 7.4 - 房主設定下一局為最後一局時標記該局為 Final_Round
  async function setFinalRound(isFinal: boolean) {
    try {
      if (!currentRoom.value) {
        throw new Error('沒有當前房間')
      }

      console.log('[RoomStore] 設置最後一局標記:', { roomId: currentRoom.value.id, isFinal })

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ is_final_round: isFinal })
        .eq('id', currentRoom.value.id)

      if (updateError) throw updateError

      if (currentRoom.value) {
        currentRoom.value.is_final_round = isFinal
        console.log('[RoomStore] 最後一局標記已更新:', isFinal)
      }

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '設置最後一局標記失敗'
      console.error('設置最後一局標記錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  return {
    // 狀態
    currentRoom,
    participants,
    loading,
    error,
    isHost,
    // 方法
    createRoom,
    joinRoom,
    leaveRoom,
    kickPlayer,
    loadParticipants,
    loadRoom,
    updateRoomStatus,
    updateRoomDrawer,
    updateRoomSettings,
    setCurrentDrawer,
    setFinalRound,
    clearRoom,
  }
})

