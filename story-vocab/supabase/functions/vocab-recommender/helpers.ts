// =====================================================
// vocab-recommender 輔助函數
// =====================================================

// 前5輪：探索期（固定詞表）
const EXPLORATION_ROUNDS = [
  {
    round: 1,
    words: [
      { word: "高興", difficulty: 1, category: "形容詞" },
      { word: "勇敢", difficulty: 2, category: "形容詞" },
      { word: "寧靜", difficulty: 3, category: "形容詞" },
      { word: "滄桑", difficulty: 4, category: "形容詞" },
      { word: "悠然", difficulty: 5, category: "形容詞" }
    ]
  },
  {
    round: 2,
    words: [
      { word: "吃", difficulty: 1, category: "動詞" },
      { word: "探險", difficulty: 2, category: "動詞" },
      { word: "凝視", difficulty: 3, category: "動詞" },
      { word: "翱翔", difficulty: 4, category: "動詞" },
      { word: "斟酌", difficulty: 5, category: "動詞" }
    ]
  },
  {
    round: 3,
    words: [
      { word: "快樂", difficulty: 1, category: "形容詞" },
      { word: "驚訝", difficulty: 2, category: "形容詞" },
      { word: "幽靜", difficulty: 3, category: "形容詞" },
      { word: "眷戀", difficulty: 4, category: "動詞" },
      { word: "悵惘", difficulty: 5, category: "形容詞" }
    ]
  },
  {
    round: 4,
    words: [
      { word: "朋友", difficulty: 1, category: "名詞" },
      { word: "森林", difficulty: 2, category: "名詞" },
      { word: "遺跡", difficulty: 3, category: "名詞" },
      { word: "璀璨", difficulty: 4, category: "形容詞" },
      { word: "漣漪", difficulty: 5, category: "名詞" }
    ]
  },
  {
    round: 5,
    words: [
      { word: "玩", difficulty: 1, category: "動詞" },
      { word: "奔跑", difficulty: 2, category: "動詞" },
      { word: "沉思", difficulty: 3, category: "動詞" },
      { word: "蛻變", difficulty: 4, category: "動詞" },
      { word: "蔥蘢", difficulty: 5, category: "形容詞" }
    ]
  }
]

// 校準詞庫（用於後5輪）
const CALIBRATION_POOL = {
  L1: [
    { word: "高興", difficulty: 1, category: "形容詞" },
    { word: "朋友", difficulty: 1, category: "名詞" },
    { word: "吃", difficulty: 1, category: "動詞" },
    { word: "跑步", difficulty: 1, category: "動詞" },
    { word: "漂亮", difficulty: 1, category: "形容詞" },
    { word: "學校", difficulty: 1, category: "名詞" },
    { word: "快樂", difficulty: 1, category: "形容詞" },
    { word: "玩", difficulty: 1, category: "動詞" }
  ],
  L2: [
    { word: "探險", difficulty: 2, category: "動詞" },
    { word: "勇敢", difficulty: 2, category: "形容詞" },
    { word: "發現", difficulty: 2, category: "動詞" },
    { word: "森林", difficulty: 2, category: "名詞" },
    { word: "神秘", difficulty: 2, category: "形容詞" },
    { word: "驚訝", difficulty: 2, category: "形容詞" },
    { word: "勇氣", difficulty: 2, category: "名詞" },
    { word: "奔跑", difficulty: 2, category: "動詞" },
    { word: "彩虹", difficulty: 2, category: "名詞" }
  ],
  L3: [
    { word: "寧靜", difficulty: 3, category: "形容詞" },
    { word: "凝視", difficulty: 3, category: "動詞" },
    { word: "沉思", difficulty: 3, category: "動詞" },
    { word: "壯麗", difficulty: 3, category: "形容詞" },
    { word: "遺跡", difficulty: 3, category: "名詞" },
    { word: "幽靜", difficulty: 3, category: "形容詞" },
    { word: "霎時", difficulty: 3, category: "副詞" },
    { word: "縈繞", difficulty: 3, category: "動詞" },
    { word: "迷霧", difficulty: 3, category: "名詞" }
  ],
  L4: [
    { word: "滄桑", difficulty: 4, category: "形容詞" },
    { word: "蛻變", difficulty: 4, category: "動詞" },
    { word: "遐想", difficulty: 4, category: "動詞" },
    { word: "翱翔", difficulty: 4, category: "動詞" },
    { word: "眷戀", difficulty: 4, category: "動詞" },
    { word: "棲息", difficulty: 4, category: "動詞" },
    { word: "璀璨", difficulty: 4, category: "形容詞" },
    { word: "窺探", difficulty: 4, category: "動詞" }
  ],
  L5: [
    { word: "悠然", difficulty: 5, category: "形容詞" },
    { word: "斟酌", difficulty: 5, category: "動詞" },
    { word: "漣漪", difficulty: 5, category: "名詞" },
    { word: "斑斕", difficulty: 5, category: "形容詞" },
    { word: "蔥蘢", difficulty: 5, category: "形容詞" },
    { word: "悵惘", difficulty: 5, category: "形容詞" },
    { word: "躊躇滿志", difficulty: 5, category: "成語" },
    { word: "蜿蜒曲折", difficulty: 5, category: "成語" }
  ],
  L6: [
    { word: "婉約", difficulty: 6, category: "形容詞" },
    { word: "恣意", difficulty: 6, category: "副詞" },
    { word: "旖旎", difficulty: 6, category: "形容詞" },
    { word: "綺麗", difficulty: 6, category: "形容詞" },
    { word: "惘然", difficulty: 6, category: "形容詞" },
    { word: "翩躚", difficulty: 6, category: "形容詞" },
    { word: "雋永", difficulty: 6, category: "形容詞" },
    { word: "婆娑起舞", difficulty: 6, category: "成語" }
  ]
}

/**
 * 獲取校準詞彙
 */
export async function getCalibrationWords(
  supabase: any,
  userId: string,
  roundNumber: number
): Promise<any[]> {
  if (roundNumber <= 5) {
    // 前5輪：使用固定詞表
    return EXPLORATION_ROUNDS[roundNumber - 1].words
  } else {
    // 後5輪：根據前5輪表現動態選擇
    const estimatedLevel = await assessAfterRound5(supabase, userId)
    return selectPrecisionWords(roundNumber, estimatedLevel)
  }
}

/**
 * 前5輪結束後的初步評估
 */
async function assessAfterRound5(supabase: any, userId: string): Promise<number> {
  try {
    const { data: rounds } = await supabase
      .from('game_rounds')
      .select('selected_difficulty, ai_score')
      .eq('user_id', userId)
      .lte('round_number', 5)
      .order('round_number', { ascending: true })

    if (!rounds || rounds.length === 0) {
      return 2
    }

    const avgSelectedLevel = calculateAverage(rounds, 'selected_difficulty')
    const avgScore = calculateAverage(rounds, 'ai_score')

    let estimatedLevel = Math.round(avgSelectedLevel)

    if (avgScore >= 8) {
      estimatedLevel = Math.min(6, estimatedLevel + 1)
    } else if (avgScore < 6) {
      estimatedLevel = Math.max(1, estimatedLevel - 1)
    }

    return estimatedLevel
  } catch (error) {
    console.error('評估失敗:', error)
    return 2
  }
}

/**
 * 選擇精準測試詞
 */
function selectPrecisionWords(roundNumber: number, estimatedLevel: number): any[] {
  const minLevel = Math.max(1, estimatedLevel - 1)
  const maxLevel = Math.min(6, estimatedLevel + 1)

  const distributions: Record<number, number[]> = {
    6: [minLevel, minLevel, estimatedLevel, estimatedLevel, maxLevel],
    7: [minLevel, estimatedLevel, estimatedLevel, estimatedLevel, maxLevel],
    8: [minLevel, estimatedLevel, estimatedLevel, maxLevel, maxLevel],
    9: [estimatedLevel, estimatedLevel, estimatedLevel, maxLevel, maxLevel],
    10: [minLevel, estimatedLevel, estimatedLevel, maxLevel, Math.min(6, maxLevel + 1)]
  }

  const targetLevels = distributions[roundNumber] || distributions[10]
  const words: any[] = []

  for (const level of targetLevels) {
    const pool = (CALIBRATION_POOL as any)[`L${level}`] || []
    if (pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length)
      words.push(pool[randomIndex])
    }
  }

  return shuffleArray(words)
}

/**
 * 構建累積用戶畫像
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

/**
 * 打亂陣列
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

