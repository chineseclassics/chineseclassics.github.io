// =====================================================
// 校準遊戲管理器
// 用戶第一次玩的10輪是隱藏的基準測試
// =====================================================

import { getSupabase } from '../supabase-client.js'

const CALIBRATION_ROUNDS = 10

// 前5輪：探索期（固定詞表）
const EXPLORATION_ROUNDS = [
  // 第1輪：跨度最大 [L1, L2, L3, L4, L5]
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
  
  // 第2輪：動詞類 [L1, L2, L3, L4, L5]
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
  
  // 第3輪：情感/描寫 [L1, L2, L3, L4, L5]
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
  
  // 第4輪：名詞/形容詞 [L1, L2, L3, L4, L5]
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
  
  // 第5輪：綜合 [L1, L2, L3, L4, L5]
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

// 校準詞庫（用於6-10輪動態選擇）
let CALIBRATION_POOL = null

/**
 * 加載校準詞庫
 */
async function loadCalibrationVocabulary() {
  if (CALIBRATION_POOL) {
    return CALIBRATION_POOL
  }
  
  try {
    const response = await fetch('/story-vocab/data/calibration-vocabulary.json')
    const data = await response.json()
    CALIBRATION_POOL = data.calibration_words
    return CALIBRATION_POOL
  } catch (error) {
    console.error('❌ 加載校準詞庫失敗:', error)
    // 使用備用詞庫
    return createFallbackCalibrationPool()
  }
}

/**
 * 創建備用校準詞庫
 */
function createFallbackCalibrationPool() {
  return {
    L1: EXPLORATION_ROUNDS[0].words.filter(w => w.difficulty === 1),
    L2: EXPLORATION_ROUNDS[0].words.filter(w => w.difficulty === 2),
    L3: EXPLORATION_ROUNDS[0].words.filter(w => w.difficulty === 3),
    L4: EXPLORATION_ROUNDS[0].words.filter(w => w.difficulty === 4),
    L5: EXPLORATION_ROUNDS[0].words.filter(w => w.difficulty === 5),
    L6: [
      { word: "婉約", difficulty: 6, category: "形容詞" },
      { word: "恣意", difficulty: 6, category: "副詞" },
      { word: "旖旎", difficulty: 6, category: "形容詞" },
      { word: "綺麗", difficulty: 6, category: "形容詞" },
      { word: "惘然", difficulty: 6, category: "形容詞" }
    ]
  }
}

/**
 * 獲取校準詞彙（前5輪固定，後5輪動態）
 */
export async function getCalibrationWords(userId, roundNumber) {
  if (roundNumber <= 5) {
    // 前5輪：使用固定詞表
    return EXPLORATION_ROUNDS[roundNumber - 1].words
  } else {
    // 後5輪：根據前5輪表現動態選擇
    const estimatedLevel = await assessAfterRound5(userId)
    return await selectPrecisionWords(roundNumber, estimatedLevel)
  }
}

/**
 * 前5輪結束後的初步評估
 */
async function assessAfterRound5(userId) {
  const supabase = getSupabase()
  
  try {
    const { data: rounds, error } = await supabase
      .from('game_rounds')
      .select('selected_difficulty, ai_score')
      .eq('user_id', userId)
      .lte('round_number', 5)
      .order('round_number', { ascending: true })
    
    if (error) throw error
    if (!rounds || rounds.length === 0) {
      return 2 // 默認L2
    }
    
    // 計算平均選擇難度
    const avgSelectedLevel = rounds.reduce((sum, r) => 
      sum + (r.selected_difficulty || 2), 0) / rounds.length
    
    // 計算平均得分
    const avgScore = rounds.reduce((sum, r) => 
      sum + (r.ai_score || 6), 0) / rounds.length
    
    // 初步估計
    let estimatedLevel = Math.round(avgSelectedLevel)
    
    // 根據表現微調
    if (avgScore >= 8) {
      estimatedLevel = Math.min(6, estimatedLevel + 1)
    } else if (avgScore < 6) {
      estimatedLevel = Math.max(1, estimatedLevel - 1)
    }
    
    console.log(`[校準] 前5輪評估: 平均難度=${avgSelectedLevel.toFixed(1)}, 平均分=${avgScore.toFixed(1)}, 估計等級=L${estimatedLevel}`)
    
    return estimatedLevel
  } catch (error) {
    console.error('❌ 前5輪評估失敗:', error)
    return 2 // 默認L2
  }
}

/**
 * 後5輪：精準測試詞選擇
 */
async function selectPrecisionWords(roundNumber, estimatedLevel) {
  const pool = await loadCalibrationVocabulary()
  
  // 確定測試範圍
  const minLevel = Math.max(1, estimatedLevel - 1)
  const maxLevel = Math.min(6, estimatedLevel + 1)
  
  // 根據輪次分配難度
  const distributions = {
    6: [minLevel, minLevel, estimatedLevel, estimatedLevel, maxLevel],
    7: [minLevel, estimatedLevel, estimatedLevel, estimatedLevel, maxLevel],
    8: [minLevel, estimatedLevel, estimatedLevel, maxLevel, maxLevel],
    9: [estimatedLevel, estimatedLevel, estimatedLevel, maxLevel, maxLevel],
    10: [minLevel, estimatedLevel, estimatedLevel, maxLevel, Math.min(6, maxLevel + 1)]
  }
  
  const targetLevels = distributions[roundNumber]
  const words = []
  
  // 從每個難度池中選擇詞語
  for (const level of targetLevels) {
    const candidates = pool[`L${level}`] || []
    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length)
      words.push(candidates[randomIndex])
    }
  }
  
  // 打亂順序
  return shuffleArray(words)
}

/**
 * 打亂陣列
 */
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
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
 * 第一次遊戲完成後的最終評估
 */
export async function finalCalibrationAssessment(userId, sessionId) {
  const supabase = getSupabase()
  
  try {
    // 獲取所有10輪數據
    const { data: allRounds, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })
    
    if (error) throw error
    if (!allRounds || allRounds.length === 0) {
      throw new Error('未找到校準遊戲數據')
    }
    
    // 計算統計數據
    const avgSelectedLevel = calculateAverage(allRounds, 'selected_difficulty')
    const avgScore = calculateAverage(allRounds, 'ai_score')
    
    // 計算眾數（最常選擇的等級）
    const levelCounts = {}
    allRounds.forEach(r => {
      const level = r.selected_difficulty || 2
      levelCounts[level] = (levelCounts[level] || 0) + 1
    })
    
    const mostFrequentLevel = parseInt(
      Object.keys(levelCounts).reduce((a, b) => 
        levelCounts[a] > levelCounts[b] ? a : b
      )
    )
    
    // 綜合判斷
    let finalLevel = Math.round(avgSelectedLevel)
    
    // 如果眾數和平均值接近，取眾數
    if (Math.abs(mostFrequentLevel - avgSelectedLevel) <= 1) {
      finalLevel = mostFrequentLevel
    }
    
    // 根據表現微調
    if (avgScore < 6) {
      finalLevel = Math.max(1, finalLevel - 1)
    }
    
    console.log(`[校準完成] 平均難度=${avgSelectedLevel.toFixed(1)}, 平均分=${avgScore.toFixed(1)}, 眾數=L${mostFrequentLevel}, 最終評估=L${finalLevel}`)
    
    // 保存評估結果
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        baseline_level: finalLevel,
        current_level: finalLevel,
        calibrated: true,
        calibration_date: new Date().toISOString(),
        total_games: 1,
        total_rounds: 10,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (updateError) throw updateError
    
    return {
      level: finalLevel,
      avgScore: avgScore.toFixed(1),
      summary: `基於10輪測試，評估用戶水平為 L${finalLevel}`
    }
  } catch (error) {
    console.error('❌ 最終校準評估失敗:', error)
    throw error
  }
}

/**
 * 檢查用戶是否已完成校準
 */
export async function isUserCalibrated(userId) {
  const supabase = getSupabase()
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('calibrated')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = 未找到記錄
      throw error
    }
    
    return data?.calibrated || false
  } catch (error) {
    console.error('❌ 檢查校準狀態失敗:', error)
    return false
  }
}

