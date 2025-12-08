import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

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
  }
  current_round: number
  current_drawer_id: string | null
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
    }
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
      if (data.words.length < 6) {
        throw new Error('至少需要 6 個詞語')
      }

      if (data.settings.rounds > data.words.length) {
        throw new Error('輪數不能超過詞語總數')
      }

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

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ status })
        .eq('id', currentRoom.value.id)

      if (updateError) throw updateError

      if (currentRoom.value) {
        currentRoom.value.status = status
      }

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新房間狀態失敗'
      console.error('更新房間狀態錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  // 清除房間狀態
  function clearRoom() {
    currentRoom.value = null
    participants.value = []
    error.value = null
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
    loadParticipants,
    loadRoom,
    updateRoomStatus,
    clearRoom,
  }
})

