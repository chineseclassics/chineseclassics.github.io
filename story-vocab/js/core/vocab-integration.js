/**
 * 詞彙推薦集成模塊
 * 負責調用 vocab-recommender Edge Function
 */

import { gameState } from './game-state.js'
import { getSupabase } from '../supabase-client.js'
import { SUPABASE_CONFIG } from '../config.js'
import { summarizeGameSession } from '../features/profile-updater.js'
import sessionManager from './session-manager.js'

/**
 * 清除 session 緩存（在登出時調用）
 * @deprecated 使用 sessionManager.clear() 代替
 */
export function clearSessionCache() {
  console.log('🧹 清除 session 緩存（轉發到 SessionManager）')
  sessionManager.clear()
}

/**
 * 獲取本輪推薦詞彙
 * @param {number} roundNumber - 輪次
 * @param {Object} wordlistOptions - 词表选项（可选）
 * @returns {Promise<Array>} 推薦的5個詞
 */
export async function getRecommendedWords(roundNumber, wordlistOptions = null) {
  try {
    console.log(`🎯 getRecommendedWords 被調用，輪次: ${roundNumber}，模式: ${wordlistOptions?.mode}`)
    
    // 檢查是否為探索期（前 3 次遊戲）
    const totalGames = gameState.user?.total_games || 0;
    const isExplorationMode = totalGames < 3;
    
    if (isExplorationMode) {
      console.log(`🔍 探索模式（第 ${totalGames + 1} 次遊戲），推薦範圍更寬`);
    }
    
    // 調用 AI 推薦（所有模式統一使用 AI）
    return await getAIRecommendedWords(roundNumber, wordlistOptions, isExplorationMode);
    
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
 * @param {boolean} isExplorationMode - 是否為探索模式
 */
async function getAIRecommendedWords(roundNumber, wordlistOptions = null, isExplorationMode = false) {
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
    
    // 🚀 優化：傳遞緩存的用戶數據（減少 Edge Function 查詢）
    if (gameState.user) {
      requestBody.cachedUserProfile = {
        calibrated: true,  // 不再需要校準檢查
        baseline_level: gameState.user.baseline_level || 2,
        current_level: gameState.user.current_level || 2,
        total_games: gameState.user.total_games || 0,
        confidence: gameState.user.confidence || 'medium'
      }
      console.log('📦 傳遞緩存的用戶數據，減少數據庫查詢')
    }
    
    // 🔍 傳遞探索模式標記
    if (isExplorationMode) {
      requestBody.explorationMode = true
      console.log('🔍 標記為探索模式')
    }
    
    // 🔧 優化：使用 SessionManager 統一管理 session
    const accessToken = await sessionManager.getAccessToken()
    
    if (!accessToken) {
      throw new Error('用戶未登入或 session 已過期')
    }
    
    console.log(`✅ 使用 SessionManager 獲取 token，輪次: ${roundNumber}`);
    
    // 調用 Edge Function（使用用戶的 auth token）
    console.log(`🌐 開始調用 vocab-recommender，輪次: ${roundNumber}`)
    console.log(`📋 請求參數:`, requestBody)
    
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/functions/v1/vocab-recommender`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
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
  try {
    // 生成會話彙總
    console.log('[遊戲完成] 生成會話彙總')
    const summary = await summarizeGameSession(
      gameState.userId,
      gameState.sessionId
    )
    
    // 檢查是否是前 3 次遊戲（探索期）
    const totalGames = gameState.user?.total_games || 0;
    const isExplorationPhase = totalGames < 3;
    
    return {
      isFirstGame: totalGames === 0,
      isExplorationPhase: isExplorationPhase,
      summary: summary,
      message: totalGames === 0 
        ? '恭喜完成你的第一個故事！🎉' 
        : (isExplorationPhase 
          ? `第 ${totalGames + 1} 個故事完成！系統正在了解你的水平...` 
          : '故事創作完成！')
    }
  } catch (error) {
    console.error('❌ 遊戲完成處理失敗:', error)
    return {
      isFirstGame: false,
      isExplorationPhase: false,
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

