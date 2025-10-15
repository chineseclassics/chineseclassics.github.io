/**
 * 詞彙推薦集成模塊
 * 負責調用 vocab-recommender Edge Function 和校準遊戲邏輯
 */

import { gameState } from './game-state.js'
import { getSupabase } from '../supabase-client.js'
import { SUPABASE_CONFIG } from '../config.js'
import { isUserCalibrated, getCalibrationWords, finalCalibrationAssessment } from '../features/calibration-game.js'
import { summarizeGameSession, buildCumulativeUserProfile } from '../features/profile-updater.js'

/**
 * 獲取本輪推薦詞彙
 * @param {number} roundNumber - 輪次
 * @param {Object} wordlistOptions - 词表选项（可选）
 * @returns {Promise<Array>} 推薦的5個詞
 */
export async function getRecommendedWords(roundNumber, wordlistOptions = null) {
  try {
    console.log(`🎯 getRecommendedWords 被調用，輪次: ${roundNumber}，模式: ${wordlistOptions?.mode}`)
    
    // 1. 優先檢查詞表模式（詞表模式無需校準，直接使用詞表）
    if (wordlistOptions?.mode === 'wordlist' && wordlistOptions?.wordlistId) {
      console.log(`[詞表模式] 直接從詞表推薦，跳過校準檢查`)
      console.log(`  詞表ID: ${wordlistOptions.wordlistId}, L2: ${wordlistOptions.level2Tag}, L3: ${wordlistOptions.level3Tag}`)
      const result = await getAIRecommendedWords(roundNumber, wordlistOptions)
      console.log(`✅ getRecommendedWords 返回 ${result.length} 個詞`)
      return result
    }
    
    // 2. AI智能模式：✅ 從緩存讀取校準狀態（不查數據庫）
    const calibrated = gameState.user?.calibrated || false
    console.log(`📊 校準狀態（從緩存）: ${calibrated ? '已校準' : '未校準'}`)
    
    if (!calibrated) {
      // AI模式且未校準：使用校準詞庫
      console.log(`[校準模式] 獲取第 ${roundNumber} 輪詞彙`)
      const words = await getCalibrationWords(gameState.userId, roundNumber)
      return words.map(w => ({
        word: w.word,
        difficulty_level: w.difficulty,
        category: w.category,
        source: 'calibration'
      }))
    } else {
      // AI模式且已校準：AI智能推薦
      console.log(`[AI智能模式] 模式: ${wordlistOptions?.mode || 'ai'}, 輪次: ${roundNumber}`)
      return await getAIRecommendedWords(roundNumber, wordlistOptions)
    }
  } catch (error) {
    console.error('❌ 獲取推薦詞彙失敗:', error)
    console.error('❌ 錯誤堆棧:', error.stack)
    console.error('❌ 輪次:', roundNumber, '模式:', wordlistOptions?.mode)
    // 降級：返回默認詞彙
    const defaults = getDefaultWords()
    console.log(`⚠️  使用默認詞彙降級，返回 ${defaults.length} 個詞`)
    return defaults
  }
}

/**
 * 調用 vocab-recommender AI 獲取推薦詞彙
 * @param {number} roundNumber - 轮次
 * @param {Object} wordlistOptions - 词表选项
 */
async function getAIRecommendedWords(roundNumber, wordlistOptions = null) {
  try {
    // 構建故事上下文（最近3句）
    const recentStory = gameState.storyHistory
      .slice(-3)
      .map(entry => entry.sentence)
      .join(' ')
    
    // 构建请求参数
    const requestBody = {
      userId: gameState.userId,
      sessionId: gameState.sessionId,
      roundNumber: roundNumber,
      storyContext: recentStory
    }

    // 如果有词表选项，添加到请求中
    if (wordlistOptions) {
      requestBody.wordlistMode = wordlistOptions.mode || 'ai'
      requestBody.wordlistId = wordlistOptions.wordlistId || null
      requestBody.level2Tag = wordlistOptions.level2Tag || null
      requestBody.level3Tag = wordlistOptions.level3Tag || null
    }
    
    // 🎓 添加用戶年級（僅 AI 模式使用，作為輔助參考）
    if (gameState.user?.grade) {
      requestBody.userGrade = gameState.user.grade
    }
    
    // 獲取用戶的 session token
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('用戶未登入')
    }
    
    // 調用 Edge Function（使用用戶的 auth token）
    console.log(`🌐 開始調用 vocab-recommender，輪次: ${roundNumber}`)
    console.log(`📋 請求參數:`, requestBody)
    
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/functions/v1/vocab-recommender`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      }
    )
    
    console.log(`📡 收到響應，狀態: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API 錯誤響應:`, errorText)
      throw new Error(`API 錯誤: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    console.log(`📦 解析結果:`, result)
    
    if (!result.success) {
      throw new Error(result.error || '推薦失敗')
    }
    
    console.log(`✅ 推薦成功 (${result.source}):`, result.words)
    
    // 轉換格式
    return result.words.map(w => ({
      word: w.word,
      difficulty_level: w.difficulty,
      category: w.category,
      source: result.source
    }))
  } catch (error) {
    console.error('❌ 推薦失敗:', error)
    // 降級：使用校準詞庫
    const words = await getCalibrationWords(gameState.userId, roundNumber)
    return words.map(w => ({
      word: w.word,
      difficulty_level: w.difficulty,
      category: w.category,
      source: 'fallback'
    }))
  }
}

/**
 * 記錄本輪數據
 */
export async function recordRoundData(roundData) {
  const supabase = getSupabase()
  
  try {
    const { error } = await supabase
      .from('game_rounds')
      .insert({
        user_id: gameState.userId,
        session_id: gameState.sessionId,
        round_number: roundData.roundNumber,
        recommended_words: roundData.recommendedWords,
        selected_word: roundData.selectedWord,
        selected_difficulty: roundData.selectedDifficulty,
        user_sentence: roundData.userSentence,
        response_time: roundData.responseTime || 0,
        ai_score: roundData.aiScore || null,
        ai_feedback: roundData.aiFeedback || null
      })
    
    if (error) throw error
    
    console.log(`✅ 第 ${roundData.roundNumber} 輪數據已記錄`)
  } catch (error) {
    console.error('❌ 記錄回合數據失敗:', error)
  }
}

/**
 * 完成遊戲後的處理
 */
export async function handleGameCompletion() {
  const supabase = getSupabase()
  
  try {
    // 檢查是否是第一次遊戲（校準）
    const calibrated = await isUserCalibrated(gameState.userId)
    
    if (!calibrated) {
      // 第一次遊戲：執行最終校準評估
      console.log('[校準完成] 開始最終評估')
      const assessment = await finalCalibrationAssessment(
        gameState.userId,
        gameState.sessionId
      )
      
      console.log('✅ 校準評估完成:', assessment)
      
      return {
        isFirstGame: true,
        assessment: assessment,
        message: '恭喜完成你的第一個故事！🎉'
      }
    } else {
      // 正常遊戲：生成會話彙總
      console.log('[正常遊戲] 生成會話彙總')
      const summary = await summarizeGameSession(
        gameState.userId,
        gameState.sessionId
      )
      
      return {
        isFirstGame: false,
        summary: summary,
        message: '故事創作完成！'
      }
    }
  } catch (error) {
    console.error('❌ 遊戲完成處理失敗:', error)
    return {
      isFirstGame: false,
      message: '遊戲完成'
    }
  }
}

/**
 * 默認備用詞彙
 */
function getDefaultWords() {
  return [
    { word: '高興', difficulty_level: 1, category: '形容詞', source: 'default' },
    { word: '探險', difficulty_level: 2, category: '動詞', source: 'default' },
    { word: '寧靜', difficulty_level: 3, category: '形容詞', source: 'default' },
    { word: '翱翔', difficulty_level: 4, category: '動詞', source: 'default' },
    { word: '悠然', difficulty_level: 5, category: '形容詞', source: 'default' }
  ]
}

