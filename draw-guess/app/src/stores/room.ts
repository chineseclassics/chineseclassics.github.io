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
      if (!authStore.profile) {
        const supabaseUrl = 'https://sylsqdkkshkeicaxhisq.supabase.co'
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bHNxZGtrc2hrZWljYXhoaXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTAyNjgsImV4cCI6MjA4MDY2NjI2OH0.ZqcDaGIr4fCxGmgQm00zUdZei50HGs3Aa_SlWEPBA6A'
        const accessToken = authStore.session?.access_token || supabaseAnonKey
        
        const userData = authStore.user
        const profileData = {
          id: userData.id,
          email: userData.email || null,
          display_name: userData.user_metadata?.full_name || userData.user_metadata?.name || `訪客${Math.floor(Math.random() * 10000)}`,
          avatar_url: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || null,
          user_type: userData.is_anonymous ? 'anonymous' : 'registered',
        }
        
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(profileData),
          })
          
          if (response.ok) {
            const createdProfile = await response.json()
            // 更新 authStore 的 profile
            authStore.profile = Array.isArray(createdProfile) ? createdProfile[0] : createdProfile
          } else if (response.status === 409 || response.status === 23505) {
            // 用戶已存在，嘗試載入
            const loadResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userData.id}&select=*`, {
              method: 'GET',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            })
            if (loadResponse.ok) {
              const loadedProfile = await loadResponse.json()
              authStore.profile = Array.isArray(loadedProfile) ? loadedProfile[0] : loadedProfile
            }
          } else {
            const errorText = await response.text()
            console.error('❌ 創建用戶資料失敗:', response.status, errorText)
            // 繼續嘗試創建房間，如果失敗會得到更明確的錯誤
          }
        } catch (profileError) {
          console.error('創建用戶資料時發生錯誤:', profileError)
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

        // 跳過 session 檢查，直接使用已知的用戶 ID（從 authStore 獲取）
        // 因為 getSession() 可能會卡住，我們直接使用 authStore 中的用戶信息
        const userId = authStore.user?.id
        if (!userId) {
          throw new Error('請先登入')
        }
        
        // 更新 roomData 使用確定的用戶 ID
        roomData.host_id = userId

        // 確保有認證 token
        const session = authStore.session
        const accessToken = session?.access_token
        
        // 直接使用 fetch 插入，避免 Supabase 客戶端超時問題
        const supabaseUrl = 'https://sylsqdkkshkeicaxhisq.supabase.co'
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bHNxZGtrc2hrZWljYXhoaXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTAyNjgsImV4cCI6MjA4MDY2NjI2OH0.ZqcDaGIr4fCxGmgQm00zUdZei50HGs3Aa_SlWEPBA6A'
        
        const insertUrl = `${supabaseUrl}/rest/v1/game_rooms`
        
        const headers: Record<string, string> = {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        }
        
        // 如果有認證 token，添加到 Authorization 頭
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }
        
        const fetchPromise = fetch(insertUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(roomData),
        })
        
        // 10 秒超時保護
        const timeoutPromise = new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('插入房間超時（10 秒）')), 10000)
        })
        let response: Response
        try {
          response = await Promise.race([fetchPromise, timeoutPromise])
        } catch (timeoutError) {
          console.error('❌ 插入超時:', timeoutError)
          throw new Error('插入房間超時，請檢查網絡連接')
        }
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ 插入失敗:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          })
          
          // 解析錯誤信息
          let errorMessage = `插入失敗: ${response.status}`
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.message || errorJson.error_description || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
          
          throw new Error(errorMessage)
        }
        
        const fetchData = await response.json()
        
        // 統一返回格式
        const insertedRoom = Array.isArray(fetchData) ? fetchData[0] : fetchData

        if (!insertedRoom) {
          console.error('❌ 插入成功但沒有返回數據')
          continue
        }

        // 檢查是否房間碼重複（雖然已經插入成功，但為了安全起見）
        if (insertedRoom.code !== code) {
          console.warn('⚠️ 返回的房間碼與請求的不一致，可能重複')
          // 刪除這個房間，繼續嘗試
          try {
            await fetch(`${supabaseUrl}/rest/v1/game_rooms?id=eq.${insertedRoom.id}`, {
              method: 'DELETE',
              headers: {
                'apikey': supabaseAnonKey,
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              },
            })
          } catch (deleteError) {
            console.error('刪除重複房間失敗:', deleteError)
          }
          continue
        }

        newRoom = insertedRoom
        break
      }

      if (!newRoom) {
        throw new Error('無法生成唯一房間碼，請重試')
      }

      // 加入房間作為房主（不設置 loading，因為已經在 createRoom 中設置了）
      // 直接創建參與記錄，使用 fetch 避免 Supabase 客戶端超時
      const supabaseUrl = 'https://sylsqdkkshkeicaxhisq.supabase.co'
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bHNxZGtrc2hrZWljYXhoaXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTAyNjgsImV4cCI6MjA4MDY2NjI2OH0.ZqcDaGIr4fCxGmgQm00zUdZei50HGs3Aa_SlWEPBA6A'
      const accessToken = authStore.session?.access_token || supabaseAnonKey
      
      const participantData = {
        room_id: newRoom.id,
        user_id: authStore.user.id,
        nickname: authStore.profile?.display_name || '房主',
        score: 0,
      }
      
      try {
        const participantResponse = await fetch(`${supabaseUrl}/rest/v1/room_participants`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(participantData),
        })
        
        if (!participantResponse.ok) {
          const errorText = await participantResponse.text()
          console.error('❌ 創建參與記錄錯誤:', participantResponse.status, errorText)
          // 即使參與記錄創建失敗，房間已經創建，仍然返回成功
        }
      } catch (participantError) {
        console.error('創建參與記錄時發生錯誤:', participantError)
        // 即使參與記錄創建失敗，房間已經創建，仍然返回成功
      }

      // 載入參與者列表（使用 fetch）
      try {
        const participantsResponse = await fetch(`${supabaseUrl}/rest/v1/room_participants?room_id=eq.${newRoom.id}&select=*&order=joined_at.asc`, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        
        if (participantsResponse.ok) {
          const participantsData = await participantsResponse.json()
          participants.value = (Array.isArray(participantsData) ? participantsData : [participantsData]) as RoomParticipant[]
        } else {
          console.error('載入參與者列表失敗:', participantsResponse.status)
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

      // 查詢房間
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

      // 檢查是否已加入
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', authStore.user.id)
        .single()

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

      if (joinError) throw joinError

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

      const supabaseUrl = 'https://sylsqdkkshkeicaxhisq.supabase.co'
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bHNxZGtrc2hrZWljYXhoaXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTAyNjgsImV4cCI6MjA4MDY2NjI2OH0.ZqcDaGIr4fCxGmgQm00zUdZei50HGs3Aa_SlWEPBA6A'
      const accessToken = authStore.session?.access_token || supabaseAnonKey

      // 刪除參與記錄（使用 fetch）
      const deleteUrl = `${supabaseUrl}/rest/v1/room_participants?room_id=eq.${currentRoom.value.id}&user_id=eq.${authStore.user.id}`
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text()
        throw new Error(`刪除參與記錄失敗: ${deleteResponse.status} ${errorText || ''}`)
      }

      // 如果是房主，關閉房間
      if (isHost.value) {
        const updateUrl = `${supabaseUrl}/rest/v1/game_rooms?id=eq.${currentRoom.value.id}`
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: 'finished' }),
        })

        if (!updateResponse.ok) {
          // 即使關閉房間失敗，也繼續清除狀態
          const errorText = await updateResponse.text()
          console.error('關閉房間失敗:', updateResponse.status, errorText || '未知錯誤')
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

