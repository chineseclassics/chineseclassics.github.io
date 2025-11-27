/**
 * 句豆 - 對戰系統 Store（鬥豆場）
 * 
 * 管理遊戲房間的創建、加入、進行和結束
 * 支持老師模式（課堂鬥豆）和學生模式（PK 競技）
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'
import { useUserStatsStore } from './userStatsStore'
import type {
  GameRoom,
  GameTeam,
  GameParticipant,
  CreateRoomParams,
  JoinRoomResult,
  SubmitScoreParams,
  SubmitTextProgressParams,
  GameResult,
} from '../types/game'
import {
  getTeamColors,
  getDefaultTeamName,
  WIN_STREAK_BONUSES,
  SAFETY_LIMITS,
} from '../types/game'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const userStatsStore = useUserStatsStore()

  // =====================================================
  // 狀態
  // =====================================================
  
  const currentRoom = ref<GameRoom | null>(null)
  const rooms = ref<GameRoom[]>([])  // 公開房間列表
  const myParticipant = ref<GameParticipant | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 實時訂閱
  let roomSubscription: any = null
  let participantsSubscription: any = null

  // =====================================================
  // 計算屬性
  // =====================================================

  const isHost = computed(() => {
    if (!currentRoom.value || !authStore.user) return false
    return currentRoom.value.host_id === authStore.user.id
  })

  const isPlaying = computed(() => currentRoom.value?.status === 'playing')
  const isWaiting = computed(() => currentRoom.value?.status === 'waiting')
  const isFinished = computed(() => currentRoom.value?.status === 'finished')

  const myTeam = computed(() => {
    if (!myParticipant.value?.team_id || !currentRoom.value?.teams) return null
    return currentRoom.value.teams.find(t => t.id === myParticipant.value!.team_id)
  })

  // =====================================================
  // 房間管理
  // =====================================================

  /**
   * 創建遊戲房間
   */
  async function createRoom(params: CreateRoomParams): Promise<GameRoom | null> {
    if (!supabase || !authStore.user) {
      error.value = '請先登入'
      return null
    }

    loading.value = true
    error.value = null

    try {
      // 創建房間（使用 text_ids 支持多篇文章）
      const { data: room, error: createError } = await supabase
        .from('game_rooms')
        .insert({
          host_id: authStore.user.id,
          host_type: params.hostType,
          game_mode: params.gameMode,
          text_id: params.textIds[0],  // 向後兼容，存第一篇
          text_ids: params.textIds,     // 存全部文章ID
          time_limit: params.timeLimit,
          team_count: params.teamCount || null,
          max_players: params.maxPlayers || null,
          entry_fee: params.entryFee || 0,
          class_id: params.classId || null,
        })
        .select(`
          *,
          host:users!game_rooms_host_id_fkey(id, display_name, avatar_url)
        `)
        .single()

      if (createError) {
        error.value = createError.message
        return null
      }

      // 如果是團隊模式，創建團隊
      if (params.gameMode === 'team_battle' && params.teamCount) {
        const teamColors = getTeamColors(params.teamCount)
        const teams: Partial<GameTeam>[] = teamColors.map((color, index) => ({
          room_id: room.id,
          team_name: getDefaultTeamName(color),
          team_color: color,
          order_index: index,
        }))

        const { data: createdTeams, error: teamsError } = await supabase
          .from('game_teams')
          .insert(teams)
          .select()

        if (teamsError) {
          console.error('創建團隊失敗:', teamsError)
        } else {
          room.teams = createdTeams
        }
      }

      // 如果是學生模式（PvP），創建者自動加入
      if (params.hostType === 'student') {
        await joinRoomInternal(room.id, params.entryFee || 0)
      }

      currentRoom.value = room
      return room
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 通過房間碼加入房間
   */
  async function joinRoom(roomCode: string): Promise<JoinRoomResult> {
    if (!supabase || !authStore.user) {
      return { success: false, error: '請先登入' }
    }

    loading.value = true
    error.value = null

    try {
      // 查找房間
      const { data: room, error: findError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          host:users!game_rooms_host_id_fkey(id, display_name, avatar_url),
          text:practice_texts!game_rooms_text_id_fkey(id, title, author, content),
          teams:game_teams!game_teams_room_id_fkey(*),
          participants:game_participants(
            *,
            user:users!game_participants_user_id_fkey(id, display_name, avatar_url, email)
          )
        `)
        .eq('room_code', roomCode.toUpperCase())
        .single()

      if (findError || !room) {
        return { success: false, error: '找不到該房間' }
      }

      if (room.status !== 'waiting') {
        return { success: false, error: '該房間已開始或已結束' }
      }

      // 檢查是否已經加入
      const existingParticipant = room.participants?.find(
        (p: GameParticipant) => p.user_id === authStore.user!.id
      )
      if (existingParticipant) {
        currentRoom.value = room
        myParticipant.value = existingParticipant
        subscribeToRoom(room.id)
        return { success: true, room, participant: existingParticipant }
      }

      // 檢查人數限制
      if (room.max_players && room.participants && room.participants.length >= room.max_players) {
        return { success: false, error: '房間已滿' }
      }

      // 支付入場費（如果需要）
      if (room.entry_fee > 0) {
        const canPay = await checkAndPayEntryFee(room.id, room.entry_fee)
        if (!canPay) {
          return { success: false, error: error.value || '無法支付入場費' }
        }
      }

      // 加入房間
      const participant = await joinRoomInternal(room.id, room.entry_fee)
      if (!participant) {
        return { success: false, error: error.value || '加入房間失敗' }
      }

      // 將新參與者添加到房間的參與者列表中
      const updatedParticipants = [...(room.participants || []), participant]
      currentRoom.value = { ...room, participants: updatedParticipants }
      myParticipant.value = participant
      subscribeToRoom(room.id)

      return { success: true, room, participant }
    } catch (e) {
      error.value = (e as Error).message
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 內部加入房間邏輯
   */
  async function joinRoomInternal(roomId: string, entryFee: number): Promise<GameParticipant | null> {
    if (!supabase || !authStore.user) return null

    const { data, error: joinError } = await supabase
      .from('game_participants')
      .insert({
        room_id: roomId,
        user_id: authStore.user.id,
        fee_paid: entryFee,
      })
      .select(`
        *,
        user:users!game_participants_user_id_fkey(id, display_name, avatar_url, email)
      `)
      .single()

    if (joinError) {
      error.value = joinError.message
      return null
    }

    // 獎池（prize_pool）將在結算時根據所有參與者的 fee_paid 計算
    // 避免並發更新問題

    return data
  }

  /**
   * 檢查並支付入場費
   */
  async function checkAndPayEntryFee(roomId: string, amount: number): Promise<boolean> {
    if (!supabase || !authStore.user) return false

    // 獲取用戶當前豆子數量
    const beans = userStatsStore.profile?.total_beans ?? 0

    // 檢查最低餘額
    if (beans - amount < SAFETY_LIMITS.MIN_BALANCE) {
      error.value = `賬戶需保留至少 ${SAFETY_LIMITS.MIN_BALANCE} 豆`
      return false
    }

    // 檢查每日限額（這些欄位將在數據庫遷移後可用）
    const stats = userStatsStore.profile as any
    const today = new Date().toISOString().split('T')[0]
    const dailySpent = stats?.daily_fee_reset_at === today ? (stats?.daily_fee_spent || 0) : 0

    if (dailySpent + amount > SAFETY_LIMITS.DAILY_FEE_LIMIT) {
      error.value = `今日入場費已達上限 ${SAFETY_LIMITS.DAILY_FEE_LIMIT} 豆`
      return false
    }

    // 扣除豆子
    const { error: deductError } = await supabase
      .from('user_stats')
      .update({
        beans: beans - amount,
        daily_fee_spent: dailySpent + amount,
        daily_fee_reset_at: today,
      })
      .eq('user_id', authStore.user.id)

    if (deductError) {
      error.value = '扣除入場費失敗'
      return false
    }

    // 記錄交易
    await supabase
      .from('game_transactions')
      .insert({
        user_id: authStore.user.id,
        room_id: roomId,
        type: 'entry_fee',
        amount: -amount,
        balance_after: beans - amount,
        description: `入場費 ${amount} 豆`,
      })

    // 刷新用戶統計
    await userStatsStore.fetchProfile()

    return true
  }

  /**
   * 分配玩家到團隊（老師操作）
   */
  async function assignToTeam(participantId: string, teamId: string): Promise<boolean> {
    if (!supabase || !isHost.value) {
      error.value = '無權限'
      return false
    }

    const { error: updateError } = await supabase
      .from('game_participants')
      .update({ team_id: teamId })
      .eq('id', participantId)

    if (updateError) {
      error.value = updateError.message
      return false
    }

    return true
  }

  /**
   * 隨機分組
   */
  async function randomAssignTeams(): Promise<boolean> {
    if (!supabase || !isHost.value || !currentRoom.value?.teams) {
      error.value = '無法分組'
      return false
    }

    const participants = currentRoom.value.participants || []
    const teams = currentRoom.value.teams
    
    // 打亂參與者順序
    const shuffled = [...participants].sort(() => Math.random() - 0.5)
    
    // 平均分配到各隊
    for (let i = 0; i < shuffled.length; i++) {
      const teamIndex = i % teams.length
      const team = teams[teamIndex]
      const participant = shuffled[i]
      if (team && participant) {
        await assignToTeam(participant.id, team.id)
      }
    }

    return true
  }

  // =====================================================
  // 遊戲進行
  // =====================================================

  /**
   * 開始遊戲（老師/房主操作）
   */
  async function startGame(): Promise<boolean> {
    if (!supabase || !isHost.value || !currentRoom.value) {
      error.value = '無權限'
      return false
    }

    // 檢查是否所有人都已分組（團隊模式）
    if (currentRoom.value.game_mode === 'team_battle') {
      const unassigned = currentRoom.value.participants?.filter(p => !p.team_id)
      if (unassigned && unassigned.length > 0) {
        error.value = '還有玩家未分組'
        return false
      }
    }

    // 更新房間狀態
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .eq('id', currentRoom.value.id)

    if (updateError) {
      error.value = updateError.message
      return false
    }

    // 更新所有參與者狀態
    await supabase
      .from('game_participants')
      .update({ status: 'playing' })
      .eq('room_id', currentRoom.value.id)

    return true
  }

  /**
   * 提交分數（最終提交，遊戲結束時調用）
   */
  async function submitScore(params: SubmitScoreParams): Promise<boolean> {
    if (!supabase || !authStore.user || !currentRoom.value) {
      error.value = '無法提交分數'
      return false
    }

    const { error: updateError } = await supabase
      .from('game_participants')
      .update({
        score: params.score,
        accuracy: params.accuracy,
        time_spent: params.timeSpent,
        first_accuracy: params.firstAccuracy,
        attempt_count: params.attemptCount,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('room_id', params.roomId)
      .eq('user_id', authStore.user.id)

    if (updateError) {
      error.value = updateError.message
      return false
    }

    // 更新團隊分數（如果是團隊模式）
    if (myParticipant.value?.team_id) {
      await updateTeamScore(myParticipant.value.team_id)
    }

    // 檢查是否所有人都完成
    await checkGameCompletion()

    return true
  }

  /**
   * 提交單篇文章進度（多篇模式）
   * 做完一篇調用一次，累計正確斷句數
   */
  async function submitTextProgress(params: SubmitTextProgressParams): Promise<boolean> {
    if (!supabase || !authStore.user || !myParticipant.value) {
      error.value = '無法提交進度'
      return false
    }

    // 1. 記錄這篇文章的詳細進度
    await supabase
      .from('game_text_progress')
      .upsert({
        participant_id: myParticipant.value.id,
        text_id: params.textId,
        text_index: params.textIndex,
        correct_count: params.correctCount,
        wrong_count: params.wrongCount,
        time_spent: params.timeSpent,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'participant_id,text_id'
      })

    // 2. 更新參與者的累計數據
    const newCorrectBreaks = (myParticipant.value.correct_breaks || 0) + params.correctCount
    const newCompletedTexts = (myParticipant.value.completed_texts || 0) + 1
    const newTextIndex = params.textIndex + 1

    const { error: updateError } = await supabase
      .from('game_participants')
      .update({
        correct_breaks: newCorrectBreaks,
        completed_texts: newCompletedTexts,
        current_text_index: newTextIndex,
        score: newCorrectBreaks,  // 分數 = 正確斷句總數
      })
      .eq('id', myParticipant.value.id)

    if (updateError) {
      error.value = updateError.message
      return false
    }

    // 更新本地狀態
    myParticipant.value.correct_breaks = newCorrectBreaks
    myParticipant.value.completed_texts = newCompletedTexts
    myParticipant.value.current_text_index = newTextIndex
    myParticipant.value.score = newCorrectBreaks

    // 更新團隊分數（如果是團隊模式）
    if (myParticipant.value.team_id) {
      await updateTeamScore(myParticipant.value.team_id)
    }

    return true
  }

  /**
   * 獲取多篇文章內容
   */
  async function fetchTexts(textIds: string[]): Promise<{ id: string; title: string; author: string | null; content: string }[]> {
    if (!supabase || textIds.length === 0) return []

    const { data } = await supabase
      .from('practice_texts')
      .select('id, title, author, content')
      .in('id', textIds)

    // 按照 textIds 的順序排列
    if (data) {
      const textMap = new Map(data.map(t => [t.id, t]))
      return textIds.map(id => textMap.get(id)).filter(Boolean) as typeof data
    }

    return []
  }

  /**
   * 更新團隊分數（使用平均分制，確保人數不均時的公平性）
   */
  async function updateTeamScore(teamId: string): Promise<void> {
    if (!supabase || !currentRoom.value) return

    // 獲取該隊伍所有已完成成員的分數
    const { data: participants } = await supabase
      .from('game_participants')
      .select('score')
      .eq('team_id', teamId)
      .eq('status', 'completed')

    // 計算平均分（乘以 100 存儲以保留精度，顯示時除以 100）
    const completedCount = participants?.length || 0
    const totalScore = participants?.reduce((sum, p) => sum + (p.score || 0), 0) || 0
    
    // 團隊分數 = 平均分 × 100（整數存儲）
    // 如果沒有人完成，分數為 0
    const averageScore = completedCount > 0 
      ? Math.round((totalScore / completedCount) * 100) 
      : 0

    await supabase
      .from('game_teams')
      .update({ total_score: averageScore })
      .eq('id', teamId)
  }

  /**
   * 檢查遊戲是否完成
   */
  async function checkGameCompletion(): Promise<void> {
    if (!supabase || !currentRoom.value) return

    // 獲取最新參與者狀態
    const { data: participants } = await supabase
      .from('game_participants')
      .select('status')
      .eq('room_id', currentRoom.value.id)

    if (!participants) return

    // 檢查是否所有人都完成
    const allCompleted = participants.every(p => p.status === 'completed')
    
    // 或者檢查時間是否到了
    const startedAt = currentRoom.value.started_at ? new Date(currentRoom.value.started_at) : null
    const timeLimit = currentRoom.value.time_limit * 1000
    const isTimeUp = startedAt && (Date.now() - startedAt.getTime() >= timeLimit)

    if (allCompleted || isTimeUp) {
      await endGame()
    }
  }

  /**
   * 結束遊戲
   */
  async function endGame(): Promise<GameResult | null> {
    if (!supabase || !currentRoom.value) return null

    // 刷新房間數據
    const { data: room } = await supabase
      .from('game_rooms')
      .select(`
        *,
        teams:game_teams!game_teams_room_id_fkey(*),
        participants:game_participants(
          *,
          user:users!game_participants_user_id_fkey(id, display_name, avatar_url)
        )
      `)
      .eq('id', currentRoom.value.id)
      .single()

    if (!room) return null

    // 確定獲勝者
    let winnerTeamId: string | null = null
    let winnerUserId: string | null = null
    let winners: GameParticipant[] = []

    if (room.game_mode === 'team_battle' && room.teams) {
      // 團隊模式：分數最高的隊伍獲勝
      const sortedTeams = [...room.teams].sort((a, b) => b.total_score - a.total_score)
      const winningTeam = sortedTeams[0]
      winnerTeamId = winningTeam?.id
      winners = room.participants?.filter((p: GameParticipant) => p.team_id === winnerTeamId) || []
    } else {
      // PvP 模式：分數優先，用時次之
      // 1. 分數高者優先
      // 2. 分數相同時，用時少者優先（鼓勵手動提交）
      // 3. 分數和用時都相同時，判定為平局（所有平局者都算贏家）
      const sortedParticipants = [...(room.participants || [])].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return (a.time_spent || 999999) - (b.time_spent || 999999)
      })
      
      const topPlayer = sortedParticipants[0]
      if (topPlayer) {
        // 找出所有與第一名分數和用時相同的人（平局者）
        winners = sortedParticipants.filter(p => 
          p.score === topPlayer.score && 
          (p.time_spent || 999999) === (topPlayer.time_spent || 999999)
        )
        
        // 如果只有一個贏家，設置 winner_user_id
        // 如果多人平局，winner_user_id 保持為 null
        if (winners.length === 1) {
          winnerUserId = topPlayer.user_id
        }
        // 平局時 winnerUserId 保持為 null，獎勵會平分給所有 winners
      }
    }

    // 更新房間狀態
    await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        ended_at: new Date().toISOString(),
        winner_team_id: winnerTeamId,
        winner_user_id: winnerUserId,
      })
      .eq('id', room.id)

    // 判斷是否平局（沒有明確獲勝者）
    const isTie = !winnerTeamId && !winnerUserId && winners.length > 1
    
    // 分發獎勵或返還入場費
    let prizeDistribution: { userId: string; displayName: string; prize: number; streakBonus: number }[] = []
    
    if (room.prize_pool > 0 && winners.length > 0) {
      if (isTie) {
        // 平局：返還入場費，不加連勝獎勵
        prizeDistribution = await refundEntryFees(room, winners)
      } else {
        // 有明確獲勝者：正常分發獎勵
        prizeDistribution = await distributePrizes(room, winners)
      }
    }

    // 更新連勝/連敗統計（平局時不更新）
    if (!isTie) {
      await updatePvpStats(room, winners)
    }

    return {
      room,
      winners,
      winningTeam: room.teams?.find((t: GameTeam) => t.id === winnerTeamId),
      prizeDistribution,
    }
  }

  /**
   * 分發獎勵
   */
  async function distributePrizes(
    room: GameRoom,
    winners: GameParticipant[]
  ): Promise<{ userId: string; displayName: string; prize: number; streakBonus: number }[]> {
    if (!supabase) return []

    const prizePerWinner = Math.floor(room.prize_pool / winners.length)
    const distribution: { userId: string; displayName: string; prize: number; streakBonus: number }[] = []

    for (const winner of winners) {
      // 計算連勝獎勵
      const { data: stats } = await supabase
        .from('user_stats')
        .select('pvp_win_streak')
        .eq('user_id', winner.user_id)
        .single()

      const currentStreak = (stats?.pvp_win_streak || 0) + 1
      let streakBonus = 0

      // 檢查連勝獎勵
      for (const [requiredStreak, bonus] of Object.entries(WIN_STREAK_BONUSES)) {
        if (currentStreak === Number(requiredStreak)) {
          streakBonus = bonus
          break
        }
      }

      const totalPrize = prizePerWinner + streakBonus

      // 發放獎勵
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('beans')
        .eq('user_id', winner.user_id)
        .single()

      const newBalance = (userStats?.beans || 0) + totalPrize

      await supabase
        .from('user_stats')
        .update({ beans: newBalance })
        .eq('user_id', winner.user_id)

      // 更新參與者獎勵記錄
      await supabase
        .from('game_participants')
        .update({ prize_won: totalPrize })
        .eq('id', winner.id)

      // 記錄交易
      await supabase
        .from('game_transactions')
        .insert({
          user_id: winner.user_id,
          room_id: room.id,
          type: 'prize',
          amount: totalPrize,
          balance_after: newBalance,
          description: `收豆 ${prizePerWinner} 豆${streakBonus > 0 ? ` + 連勝獎勵 ${streakBonus} 豆` : ''}`,
        })

      distribution.push({
        userId: winner.user_id,
        displayName: winner.user?.display_name || '未知',
        prize: prizePerWinner,
        streakBonus,
      })
    }

    return distribution
  }

  /**
   * 平局時返還入場費
   */
  async function refundEntryFees(
    room: GameRoom,
    participants: GameParticipant[]
  ): Promise<{ userId: string; displayName: string; prize: number; streakBonus: number }[]> {
    if (!supabase) return []

    const entryFee = room.entry_fee || 0
    const distribution: { userId: string; displayName: string; prize: number; streakBonus: number }[] = []

    for (const participant of participants) {
      // 返還入場費
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('beans')
        .eq('user_id', participant.user_id)
        .single()

      const newBalance = (userStats?.beans || 0) + entryFee

      await supabase
        .from('user_stats')
        .update({ beans: newBalance })
        .eq('user_id', participant.user_id)

      // 更新參與者獎勵記錄（顯示為返還）
      await supabase
        .from('game_participants')
        .update({ prize_won: entryFee })
        .eq('id', participant.id)

      // 記錄交易
      await supabase
        .from('game_transactions')
        .insert({
          user_id: participant.user_id,
          room_id: room.id,
          type: 'refund',
          amount: entryFee,
          balance_after: newBalance,
          description: `平局，返還入場費 ${entryFee} 豆`,
        })

      distribution.push({
        userId: participant.user_id,
        displayName: participant.user?.display_name || '未知',
        prize: entryFee,
        streakBonus: 0,  // 平局沒有連勝獎勵
      })
    }

    return distribution
  }

  /**
   * 更新 PvP 統計
   */
  async function updatePvpStats(room: GameRoom, winners: GameParticipant[]): Promise<void> {
    if (!supabase) return

    const winnerIds = new Set(winners.map(w => w.user_id))

    for (const participant of room.participants || []) {
      const isWinner = winnerIds.has(participant.user_id)

      if (isWinner) {
        // 勝者：增加連勝
        await supabase.rpc('increment_win_streak', { p_user_id: participant.user_id })
      } else {
        // 敗者：重置連勝
        await supabase
          .from('user_stats')
          .update({ pvp_win_streak: 0 })
          .eq('user_id', participant.user_id)
      }

      // 更新總場數
      await supabase.rpc('increment_pvp_games', {
        p_user_id: participant.user_id,
        p_is_win: isWinner,
      })
    }
  }

  // =====================================================
  // 實時訂閱
  // =====================================================

  /**
   * 訂閱房間更新
   */
  // 當前訂閱的房間 ID，用於避免重複訂閱
  let currentSubscribedRoomId: string | null = null

  function subscribeToRoom(roomId: string): void {
    if (!supabase) {
      console.log('[Game] subscribeToRoom: supabase 未初始化')
      return
    }

    // 如果已經訂閱了同一個房間，不要重複訂閱
    if (currentSubscribedRoomId === roomId && roomSubscription) {
      console.log('[Game] 已經訂閱房間:', roomId, '，跳過重複訂閱')
      return
    }

    console.log('[Game] 開始訂閱房間:', roomId)

    // 取消之前的訂閱
    unsubscribe()
    currentSubscribedRoomId = roomId

    // 訂閱房間狀態變更
    // 注意：不使用 filter，因為 filter 與 RLS 可能有衝突導致 CHANNEL_ERROR
    // 改為在客戶端過濾
    roomSubscription = supabase
      .channel(`game-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          // 不使用 filter，避免與 RLS 衝突
        },
        (payload) => {
          const newRoom = payload.new as any
          const oldRoom = payload.old as any
          const changedRoomId = newRoom?.id || oldRoom?.id
          
          // 客戶端過濾：只處理當前房間的更新
          if (changedRoomId !== roomId) {
            return
          }
          
          console.log('[Game] 房間更新:', payload.eventType, newRoom)
          if (newRoom) {
            // 更新房間狀態，保留已有的關聯數據（participants, teams 等）
            currentRoom.value = { 
              ...currentRoom.value, 
              ...newRoom,
              // 保留這些關聯數據，它們不會在 payload 中
              participants: currentRoom.value?.participants,
              teams: currentRoom.value?.teams,
              host: currentRoom.value?.host,
              text: currentRoom.value?.text,
              class: currentRoom.value?.class,
            } as GameRoom
            console.log('[Game] 房間狀態已更新為:', newRoom.status)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          // 不使用 filter
        },
        async (payload) => {
          const newParticipant = payload.new as any
          const oldParticipant = payload.old as any
          const changedRoomId = newParticipant?.room_id || oldParticipant?.room_id
          
          // 客戶端過濾
          if (changedRoomId !== roomId) {
            return
          }
          
          console.log('[Game] 參與者更新:', payload.eventType)
          await refreshParticipants(roomId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_teams',
          // 不使用 filter
        },
        async (payload) => {
          const newTeam = payload.new as any
          const oldTeam = payload.old as any
          const changedRoomId = newTeam?.room_id || oldTeam?.room_id
          
          // 客戶端過濾
          if (changedRoomId !== roomId) {
            return
          }
          
          console.log('[Game] 團隊更新:', payload.eventType)
          await refreshTeams(roomId)
        }
      )
      .subscribe((status) => {
        console.log('[Game] 房間訂閱狀態:', status)
        
        // 處理訂閱錯誤
        if (status === 'CHANNEL_ERROR') {
          console.error('[Game] 訂閱錯誤')
          currentSubscribedRoomId = null
        }
      })
  }

  /**
   * 刷新參與者列表
   */
  async function refreshParticipants(roomId: string): Promise<void> {
    if (!supabase) return

    const { data } = await supabase
      .from('game_participants')
      .select(`
        *,
        user:users!game_participants_user_id_fkey(id, display_name, avatar_url, email)
      `)
      .eq('room_id', roomId)

    if (data && currentRoom.value) {
      currentRoom.value.participants = data

      // 更新自己的參與者數據
      if (authStore.user) {
        myParticipant.value = data.find(p => p.user_id === authStore.user!.id) || null
      }
    }
  }

  /**
   * 刷新團隊列表
   */
  async function refreshTeams(roomId: string): Promise<void> {
    if (!supabase) return

    const { data } = await supabase
      .from('game_teams')
      .select('*')
      .eq('room_id', roomId)
      .order('order_index')

    if (data && currentRoom.value) {
      currentRoom.value.teams = data
    }
  }

  /**
   * 取消訂閱
   */
  function unsubscribe(): void {
    if (roomSubscription) {
      supabase?.removeChannel(roomSubscription)
      roomSubscription = null
    }
    if (participantsSubscription) {
      supabase?.removeChannel(participantsSubscription)
      participantsSubscription = null
    }
    currentSubscribedRoomId = null
  }

  // =====================================================
  // 房間列表
  // =====================================================

  /**
   * 獲取公開房間列表（學生模式）
   */
  async function fetchPublicRooms(): Promise<void> {
    if (!supabase) return

    loading.value = true

    const { data, error: fetchError } = await supabase
      .from('game_rooms')
      .select(`
        *,
        host:users!game_rooms_host_id_fkey(id, display_name, avatar_url),
        text:practice_texts!game_rooms_text_id_fkey(id, title, author),
        participants:game_participants(count)
      `)
      .eq('status', 'waiting')
      .eq('host_type', 'student')
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchError) {
      error.value = fetchError.message
    } else {
      rooms.value = (data || []).map(r => ({
        ...r,
        participant_count: r.participants?.[0]?.count || 0,
      }))
    }

    loading.value = false
  }

  /**
   * 獲取班級進行中的比賽（老師模式）
   */
  async function fetchClassGames(classId: string): Promise<GameRoom[]> {
    if (!supabase) return []

    const { data } = await supabase
      .from('game_rooms')
      .select(`
        *,
        text:practice_texts!game_rooms_text_id_fkey(id, title, author)
      `)
      .eq('class_id', classId)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })

    return data || []
  }

  // =====================================================
  // 工具函數
  // =====================================================

  /**
   * 離開房間
   */
  async function leaveRoom(): Promise<void> {
    if (!supabase || !currentRoom.value || !authStore.user) return

    // 如果是房主且房間還在等待中，取消房間
    if (isHost.value && currentRoom.value.status === 'waiting') {
      await supabase
        .from('game_rooms')
        .update({ status: 'cancelled' })
        .eq('id', currentRoom.value.id)

      // 退還所有人的入場費
      if (currentRoom.value.entry_fee > 0) {
        for (const participant of currentRoom.value.participants || []) {
          await refundEntryFee(participant)
        }
      }
    } else if (!isHost.value && currentRoom.value.status === 'waiting') {
      // 非房主離開，刪除參與者記錄
      await supabase
        .from('game_participants')
        .delete()
        .eq('room_id', currentRoom.value.id)
        .eq('user_id', authStore.user.id)

      // 退還入場費
      if (myParticipant.value?.fee_paid) {
        await refundEntryFee(myParticipant.value)
      }
    }

    unsubscribe()
    currentRoom.value = null
    myParticipant.value = null
  }

  /**
   * 退還入場費
   */
  async function refundEntryFee(participant: GameParticipant): Promise<void> {
    if (!supabase || !participant.fee_paid) return

    const { data: stats } = await supabase
      .from('user_stats')
      .select('beans')
      .eq('user_id', participant.user_id)
      .single()

    const newBalance = (stats?.beans || 0) + participant.fee_paid

    await supabase
      .from('user_stats')
      .update({ beans: newBalance })
      .eq('user_id', participant.user_id)

    await supabase
      .from('game_transactions')
      .insert({
        user_id: participant.user_id,
        room_id: participant.room_id,
        type: 'refund',
        amount: participant.fee_paid,
        balance_after: newBalance,
        description: '房間取消，退還入場費',
      })
  }

  /**
   * 重置狀態
   */
  function reset(): void {
    unsubscribe()
    currentRoom.value = null
    myParticipant.value = null
    rooms.value = []
    error.value = null
  }

  return {
    // 狀態
    currentRoom,
    rooms,
    myParticipant,
    loading,
    error,

    // 計算屬性
    isHost,
    isPlaying,
    isWaiting,
    isFinished,
    myTeam,

    // 房間管理
    createRoom,
    joinRoom,
    assignToTeam,
    randomAssignTeams,
    leaveRoom,

    // 遊戲進行
    startGame,
    submitScore,
    submitTextProgress,
    fetchTexts,
    endGame,

    // 實時
    subscribeToRoom,
    unsubscribe,

    // 列表
    fetchPublicRooms,
    fetchClassGames,

    // 工具
    reset,
  }
})

