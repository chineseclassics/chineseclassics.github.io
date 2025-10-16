// =====================================================
// vocab-recommender 輔助函數
// =====================================================

/**
 * 構建簡化用戶畫像（探索模式專用）
 * 只查詢 user_profiles，其他使用默認值
 * 🚀 減少 3 次數據庫查詢，節省 600-1000ms
 */
export async function buildSimplifiedUserProfile(supabase: any, userId: string) {
  try {
    // 只查詢基礎信息（1 次查詢）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('🚀 探索模式：使用簡化用戶畫像（跳過 3 次查詢）')

    return {
      baseline_level: profile?.baseline_level || 2,
      current_level: profile?.current_level || 2,
      total_games: profile?.total_games || 0,
      total_rounds: profile?.total_rounds || 0,
      level_growth: 0,  // 探索期無成長數據
      first_game_score: 0,
      last_game_score: 0,
      recent_avg_score: 0,
      recent_avg_difficulty: profile?.current_level || 2,
      wordbook_words: []  // 探索期通常無收藏詞
    }
  } catch (error) {
    console.error('構建簡化畫像失敗:', error)
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

/**
 * 構建累積用戶畫像（正常模式）
 */
export async function buildCumulativeUserProfile(supabase: any, userId: string) {
  try {
    // 基礎信息
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // 所有遊戲會話
    const { data: allSessions } = await supabase
      .from('game_session_summary')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true })

    // 最近20輪
    const { data: recentRounds } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // 詞語本
    const { data: wordbook } = await supabase
      .from('user_wordbook')
      .select('word, word_difficulty')
      .eq('user_id', userId)
      .is('last_recommended_at', null)
      .order('created_at', { ascending: true })
      .limit(10)

    const firstGame = allSessions?.[0]
    const lastGame = allSessions?.[allSessions?.length - 1]

    return {
      baseline_level: profile?.baseline_level || 2,
      current_level: profile?.current_level || 2,
      total_games: profile?.total_games || 0,
      total_rounds: profile?.total_rounds || 0,
      level_growth: (profile?.current_level || 2) - (profile?.baseline_level || 2),
      first_game_score: firstGame?.avg_score || 0,
      last_game_score: lastGame?.avg_score || 0,
      recent_avg_score: calculateAverage(recentRounds || [], 'ai_score'),
      recent_avg_difficulty: calculateAverage(recentRounds || [], 'selected_difficulty'),
      wordbook_words: wordbook?.map((w: any) => w.word) || []
    }
  } catch (error) {
    console.error('構建畫像失敗:', error)
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

/**
 * 計算平均值
 */
function calculateAverage(data: any[], field: string): number {
  if (!data || data.length === 0) return 0
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0)
  return sum / data.length
}


