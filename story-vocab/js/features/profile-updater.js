// =====================================================
// 用戶畫像更新器
// 負責每輪遊戲後更新用戶畫像和重新評估水平
// =====================================================

import { getSupabase } from '../supabase-client.js'

/**
 * 每輪遊戲後更新用戶畫像
 */
export async function updateUserProfileAfterRound(userId, roundData) {
  const supabase = getSupabase()
  
  try {
    // 更新總輪次
    const { error: updateError } = await supabase.rpc('increment_user_rounds', {
      p_user_id: userId
    })
    
    // 如果 RPC 不存在，使用直接更新
    if (updateError && updateError.code === '42883') {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('total_rounds')
        .eq('user_id', userId)
        .maybeSingle()
      
      await supabase
        .from('user_profiles')
        .update({
          total_rounds: (profile?.total_rounds || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }
    
    // 獲取當前畫像
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    // 每5輪重新評估水平
    if (profile && profile.total_rounds % 5 === 0) {
      const newLevel = await reassessUserLevel(userId)
      
      await supabase
        .from('user_profiles')
        .update({
          current_level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      console.log(`[畫像更新] 用戶 ${userId} 水平重新評估為 L${newLevel}`)
    }
  } catch (error) {
    console.error('❌ 更新用戶畫像失敗:', error)
  }
}

/**
 * 重新評估用戶水平
 */
export async function reassessUserLevel(userId) {
  const supabase = getSupabase()
  
  try {
    // 獲取用戶檔案（判斷是否為探索期）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_games, current_level')
      .eq('user_id', userId)
      .maybeSingle()
    
    const totalGames = (profile?.total_games || 0) + 1
    const isExplorationPhase = totalGames <= 3
    
    // 獲取最近20輪數據（只需要選擇難度）
    const { data: recent20, error } = await supabase
      .from('game_rounds')
      .select('selected_difficulty')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    if (!recent20 || recent20.length === 0) {
      return 2 // 默認L2
    }
    
    // 計算平均選擇難度
    const avgDifficulty = calculateAverage(recent20, 'selected_difficulty')
    
    // 分析趨勢（最近10輪 vs 之前10輪）
    const recent10 = recent20.slice(0, 10)
    const older10 = recent20.slice(10, 20)
    
    const recent10Avg = calculateAverage(recent10, 'selected_difficulty')
    const older10Avg = older10.length > 0 ? calculateAverage(older10, 'selected_difficulty') : avgDifficulty
    
    // 🆕 探索期：更激進的調整（快速找到真實水平）
    const adjustmentFactor = isExplorationPhase ? 0.6 : 0.3
    const currentLevel = profile?.current_level || 2
    
    // 基準水平（加權平均）
    let newLevel = currentLevel * (1 - adjustmentFactor) + avgDifficulty * adjustmentFactor
    
    // 根據趨勢微調
    if (recent10Avg > older10Avg + 0.5) {
      // 最近在挑戰更難的詞 → 提升
      newLevel = Math.min(5, newLevel + 0.2)
    } else if (recent10Avg < older10Avg - 0.5) {
      // 最近在選擇更簡單的詞 → 降低
      newLevel = Math.max(1, newLevel - 0.2)
    }
    
    // 限制在 L1-L5 範圍
    newLevel = Math.max(1, Math.min(5, newLevel))
    
    const phaseLabel = isExplorationPhase ? '探索期' : '穩定期'
    console.log(`[重新評估/${phaseLabel}] 最近20輪平均=${avgDifficulty.toFixed(1)}, 調整因子=${adjustmentFactor}, 新等級=L${newLevel.toFixed(1)}`)
    
    return newLevel
  } catch (error) {
    console.error('❌ 重新評估用戶水平失敗:', error)
    return 2 // 默認L2
  }
}

/**
 * 遊戲結束後生成會話彙總
 */
export async function summarizeGameSession(userId, sessionId) {
  const supabase = getSupabase()
  
  try {
    // 獲取本次遊戲的所有回合
    const { data: rounds, error: roundsError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('session_id', sessionId)
    
    if (roundsError) throw roundsError
    if (!rounds || rounds.length === 0) {
      console.warn('⚠️ 未找到遊戲回合數據')
      return
    }
    
    // 獲取用戶畫像
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (profileError) throw profileError
    
    // 計算統計數據
    const avgScore = calculateAverage(rounds, 'ai_score')
    const avgSelectedDifficulty = calculateAverage(rounds, 'selected_difficulty')
    
    // 重新評估水平
    const estimatedLevelAfter = await reassessUserLevel(userId)
    
    // 計算信心度（基於遊戲次數）
    const totalGames = (profile?.total_games || 0) + 1
    let confidence = 'medium'
    if (totalGames < 3) {
      confidence = 'low'  // 探索期
    } else if (totalGames < 10) {
      confidence = 'medium'
    } else {
      confidence = 'high'
    }
    
    // 創建會話彙總
    const summary = {
      user_id: userId,
      session_id: sessionId,
      session_number: totalGames,
      session_type: totalGames <= 3 ? 'exploration' : 'normal',
      total_rounds: rounds.length,
      avg_score: avgScore,
      avg_selected_difficulty: avgSelectedDifficulty,
      estimated_level_before: profile?.current_level || 2,
      estimated_level_after: estimatedLevelAfter,
      completed_at: new Date().toISOString()
    }
    
    const { error: summaryError } = await supabase
      .from('game_session_summary')
      .insert(summary)
    
    if (summaryError) throw summaryError
    
    // 更新用戶檔案（遊戲數 + 信心度）
    await supabase
      .from('user_profiles')
      .update({
        total_games: totalGames,
        confidence: confidence,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    console.log(`[會話彙總] 遊戲 #${summary.session_number} 已記錄`)
    
    return summary
  } catch (error) {
    console.error('❌ 生成會話彙總失敗:', error)
  }
}

/**
 * 計算平均值
 */
function calculateAverage(data, field) {
  if (!data || data.length === 0) return 0
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0)
  return sum / data.length
}

/**
 * 構建累積用戶畫像（供AI推薦使用）
 */
export async function buildCumulativeUserProfile(userId) {
  const supabase = getSupabase()
  
  try {
    // 1. 基礎信息
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (profileError) throw profileError
    if (!profile) {
      throw new Error('用戶畫像不存在，無法構建累積畫像')
    }
    
    // 2. 所有遊戲會話彙總
    const { data: allSessions } = await supabase
      .from('game_session_summary')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true })
    
    // 3. 最近20輪詳細數據
    const { data: recentRounds } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    // 4. 詞語本（未推薦過的）
    const { data: wordbook } = await supabase
      .from('user_wordbook')
      .select('word, word_difficulty')
      .eq('user_id', userId)
      .is('last_recommended_at', null)
      .order('created_at', { ascending: true })
      .limit(10)
    
    // 5. 計算成長指標
    const firstGame = allSessions?.[0]
    const lastGame = allSessions?.[allSessions.length - 1]
    
    const userProfile = {
      baseline_level: profile.baseline_level || 2,
      current_level: profile.current_level || 2,
      total_games: profile.total_games || 0,
      total_rounds: profile.total_rounds || 0,
      
      // 成長軌跡
      level_growth: (profile.current_level || 2) - (profile.baseline_level || 2),
      first_game_score: firstGame?.avg_score || 0,
      last_game_score: lastGame?.avg_score || 0,
      
      // 最近表現
      recent_avg_score: calculateAverage(recentRounds || [], 'ai_score'),
      recent_avg_difficulty: calculateAverage(recentRounds || [], 'selected_difficulty'),
      
      // 詞語本
      wordbook_words: wordbook?.map(w => w.word) || []
    }
    
    return userProfile
  } catch (error) {
    console.error('❌ 構建用戶畫像失敗:', error)
    // 返回默認畫像
    return {
      baseline_level: 2,
      current_level: 2,
      total_games: 0,
      total_rounds: 0,
      level_growth: 0,
      first_game_score: 0,
      last_game_score: 0,
      recent_avg_score: 0,
      recent_avg_difficulty: 2,
      wordbook_words: []
    }
  }
}

