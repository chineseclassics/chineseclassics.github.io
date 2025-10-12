// =====================================================
// 校準遊戲管理器
// 用戶第一次玩的10輪是隱藏的基準測試
// =====================================================

import { getSupabase } from '../supabase-client.js'
import { gameState } from '../core/game-state.js'

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
 * 加載校準詞庫（優先從 Supabase，降級到本地 JSON，最後降級到硬編碼）
 */
async function loadCalibrationVocabulary() {
  if (CALIBRATION_POOL) {
    return CALIBRATION_POOL
  }
  
  const supabase = getSupabase()
  
  try {
    // 策略 1：從 Supabase 加載黃金校準詞庫
    const { data: calibrationWords, error } = await supabase
      .from('vocabulary')
      .select('word, difficulty_level, category, frequency, calibration_order')
      .eq('is_calibration', true)
      .order('calibration_order')
    
    if (error) throw error
    
    if (!calibrationWords || calibrationWords.length === 0) {
      console.warn('⚠️ Supabase 中沒有校準詞，使用本地備份')
      return await loadLocalCalibrationVocabulary()
    }
    
    // 按難度級別分組
    CALIBRATION_POOL = {
      L1: calibrationWords.filter(w => w.difficulty_level === 1).map(w => ({
        word: w.word,
        difficulty: w.difficulty_level,
        category: w.category,
        frequency: w.frequency
      })),
      L2: calibrationWords.filter(w => w.difficulty_level === 2).map(w => ({
        word: w.word,
        difficulty: w.difficulty_level,
        category: w.category,
        frequency: w.frequency
      })),
      L3: calibrationWords.filter(w => w.difficulty_level === 3).map(w => ({
        word: w.word,
        difficulty: w.difficulty_level,
        category: w.category,
        frequency: w.frequency
      })),
      L4: calibrationWords.filter(w => w.difficulty_level === 4).map(w => ({
        word: w.word,
        difficulty: w.difficulty_level,
        category: w.category,
        frequency: w.frequency
      })),
      L5: calibrationWords.filter(w => w.difficulty_level === 5).map(w => ({
        word: w.word,
        difficulty: w.difficulty_level,
        category: w.category,
        frequency: w.frequency
      })),
      L6: calibrationWords.filter(w => w.difficulty_level === 6).map(w => ({
        word: w.word,
        difficulty: w.difficulty_level,
        category: w.category,
        frequency: w.frequency
      }))
    }
    
    const totalWords = calibrationWords.length
    console.log(`✅ 從 Supabase 加載校準詞庫: ${totalWords} 個詞`)
    console.log(`   L1: ${CALIBRATION_POOL.L1.length}, L2: ${CALIBRATION_POOL.L2.length}, L3: ${CALIBRATION_POOL.L3.length}`)
    console.log(`   L4: ${CALIBRATION_POOL.L4.length}, L5: ${CALIBRATION_POOL.L5.length}, L6: ${CALIBRATION_POOL.L6.length}`)
    
    return CALIBRATION_POOL
  } catch (error) {
    console.error('❌ 從 Supabase 加載校準詞庫失敗:', error)
    // 策略 2：降級到本地 JSON
    return await loadLocalCalibrationVocabulary()
  }
}

/**
 * 從本地 JSON 加載校準詞庫（備份方案）
 */
async function loadLocalCalibrationVocabulary() {
  try {
    // 修復路徑：使用相對路徑
    const response = await fetch('./data/calibration-vocabulary.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    CALIBRATION_POOL = data.calibration_words
    
    const totalWords = Object.values(CALIBRATION_POOL).reduce((sum, arr) => sum + arr.length, 0)
    console.log(`✅ 從本地 JSON 加載校準詞庫（備份）: ${totalWords} 個詞`)
    
    return CALIBRATION_POOL
  } catch (error) {
    console.error('❌ 加載本地校準詞庫失敗:', error)
    // 策略 3：最終降級到硬編碼
    console.warn('⚠️ 使用硬編碼備用詞庫')
    return createFallbackCalibrationPool()
  }
}

/**
 * 創建備用校準詞庫（從前 5 輪提取所有詞 + 額外補充）
 */
function createFallbackCalibrationPool() {
  // 從前 5 輪提取所有詞
  const allWords = EXPLORATION_ROUNDS.flatMap(round => round.words)
  
  // 按難度級別分組
  const pool = {
    L1: allWords.filter(w => w.difficulty === 1),
    L2: allWords.filter(w => w.difficulty === 2),
    L3: allWords.filter(w => w.difficulty === 3),
    L4: allWords.filter(w => w.difficulty === 4),
    L5: allWords.filter(w => w.difficulty === 5),
    L6: [
      { word: "婉約", difficulty: 6, category: "形容詞" },
      { word: "恣意", difficulty: 6, category: "副詞" },
      { word: "旖旎", difficulty: 6, category: "形容詞" },
      { word: "綺麗", difficulty: 6, category: "形容詞" },
      { word: "惘然", difficulty: 6, category: "形容詞" },
      { word: "翩躚", difficulty: 6, category: "形容詞" },
      { word: "氤氳", difficulty: 6, category: "形容詞" },
      { word: "縹緲", difficulty: 6, category: "形容詞" },
      { word: "曼妙", difficulty: 6, category: "形容詞" },
      { word: "裊裊", difficulty: 6, category: "形容詞" }
    ]
  }
  
  // 補充額外詞語（確保每級至少有 10 個詞）
  const supplements = {
    L1: [
      { word: "跑步", difficulty: 1, category: "動詞" },
      { word: "漂亮", difficulty: 1, category: "形容詞" },
      { word: "笑", difficulty: 1, category: "動詞" },
      { word: "花", difficulty: 1, category: "名詞" },
      { word: "太陽", difficulty: 1, category: "名詞" }
    ],
    L2: [
      { word: "發現", difficulty: 2, category: "動詞" },
      { word: "神秘", difficulty: 2, category: "形容詞" },
      { word: "彩虹", difficulty: 2, category: "名詞" },
      { word: "星星", difficulty: 2, category: "名詞" },
      { word: "月亮", difficulty: 2, category: "名詞" }
    ],
    L3: [
      { word: "壯麗", difficulty: 3, category: "形容詞" },
      { word: "迷霧", difficulty: 3, category: "名詞" },
      { word: "瞬間", difficulty: 3, category: "名詞" },
      { word: "輕盈", difficulty: 3, category: "形容詞" },
      { word: "縈繞", difficulty: 3, category: "動詞" }
    ],
    L4: [
      { word: "窺探", difficulty: 4, category: "動詞" },
      { word: "棲息", difficulty: 4, category: "動詞" },
      { word: "遐想", difficulty: 4, category: "動詞" },
      { word: "嚮往", difficulty: 4, category: "動詞" },
      { word: "追憶", difficulty: 4, category: "動詞" }
    ],
    L5: [
      { word: "漣漪", difficulty: 5, category: "名詞" },
      { word: "蔥蘢", difficulty: 5, category: "形容詞" },
      { word: "斑斕", difficulty: 5, category: "形容詞" },
      { word: "蒼勁", difficulty: 5, category: "形容詞" },
      { word: "磅礴", difficulty: 5, category: "形容詞" }
    ]
  }
  
  // 合併補充詞
  Object.keys(supplements).forEach(level => {
    pool[level] = [...pool[level], ...supplements[level]]
  })
  
  console.log(`⚠️ 使用備用詞庫（硬編碼）: L1=${pool.L1.length}, L2=${pool.L2.length}, L3=${pool.L3.length}, L4=${pool.L4.length}, L5=${pool.L5.length}, L6=${pool.L6.length}`)
  
  return pool
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
  const supabase = getSupabase()
  
  // ✅ 跨輪次去重：獲取本次會話已推薦過的所有詞
  const usedWordsInSession = new Set()
  try {
    const { data: history } = await supabase
      .from('recommendation_history')
      .select('recommended_words')
      .eq('session_id', gameState.sessionId)
    
    if (history && history.length > 0) {
      history.forEach(h => {
        if (h.recommended_words) {
          h.recommended_words.forEach(w => usedWordsInSession.add(w))
        }
      })
    }
    
    console.log(`[校準] 第 ${roundNumber} 輪，本次會話已用 ${usedWordsInSession.size} 個詞`)
  } catch (error) {
    console.error('⚠️ 獲取推薦歷史失敗:', error)
  }
  
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
  const usedWords = new Set() // 防止重複
  
  // 從每個難度池中選擇詞語
  for (const level of targetLevels) {
    const candidates = pool[`L${level}`] || []
    
    // ✅ 過濾掉已使用的詞（本輪內 + 跨輪次）
    const availableCandidates = candidates.filter(w => 
      !usedWords.has(w.word) && !usedWordsInSession.has(w.word)
    )
    
    if (availableCandidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCandidates.length)
      const selectedWord = availableCandidates[randomIndex]
      words.push(selectedWord)
      usedWords.add(selectedWord.word)
    } else {
      // 如果過濾後沒有可用詞，嘗試從相鄰難度補充
      console.warn(`⚠️ L${level} 池中詞語不足（已用/本輪重複），嘗試從相鄰難度補充`)
      const adjacentLevel = level > 3 ? level - 1 : level + 1
      const adjacentCandidates = (pool[`L${adjacentLevel}`] || []).filter(w => 
        !usedWords.has(w.word) && !usedWordsInSession.has(w.word)
      )
      
      if (adjacentCandidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * adjacentCandidates.length)
        const selectedWord = adjacentCandidates[randomIndex]
        words.push(selectedWord)
        usedWords.add(selectedWord.word)
      } else {
        // 最後手段：嘗試所有等級
        console.warn(`⚠️ L${level} 和 L${adjacentLevel} 都不足，從所有等級補充`)
        const allLevels = Object.keys(pool)
        for (const lvl of allLevels) {
          const fallbackCandidates = (pool[lvl] || []).filter(w => 
            !usedWords.has(w.word) && !usedWordsInSession.has(w.word)
          )
          if (fallbackCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * fallbackCandidates.length)
            const selectedWord = fallbackCandidates[randomIndex]
            words.push(selectedWord)
            usedWords.add(selectedWord.word)
            break
          }
        }
      }
    }
  }
  
  // 確保至少有5個詞
  if (words.length < 5) {
    console.error(`❌ 第 ${roundNumber} 輪只選出了 ${words.length} 個詞，需要補充`)
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
    
    // 計算統計數據（只基於選擇難度）
    const avgSelectedLevel = calculateAverage(allRounds, 'selected_difficulty')
    
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
    
    // 綜合判斷（純基於選擇難度）
    let finalLevel = Math.round(avgSelectedLevel)
    
    // 如果眾數和平均值接近，取眾數（更穩定）
    if (Math.abs(mostFrequentLevel - avgSelectedLevel) <= 1) {
      finalLevel = mostFrequentLevel
    }
    
    console.log(`[校準完成] 平均難度=${avgSelectedLevel.toFixed(1)}, 眾數=L${mostFrequentLevel}, 最終評估=L${finalLevel}`)
    
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
      .maybeSingle()  // ✅ 使用 maybeSingle() 代替 single()，记录不存在时返回 null 而不是错误
    
    if (error) {
      throw error
    }
    
    return data?.calibrated || false
  } catch (error) {
    console.error('❌ 檢查校準狀態失敗:', error)
    return false
  }
}

