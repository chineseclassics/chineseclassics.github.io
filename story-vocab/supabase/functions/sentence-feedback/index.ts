// =====================================================
// 句子反饋評價 Agent - Supabase Edge Function
// 專注於故事創作中的句子評價，識別創意與語法
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// 主函數
serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 獲取請求數據
    const { 
      userSentence,           // 用戶輸入的句子
      selectedWord,           // 用戶選擇的詞彙
      conversationHistory,    // 對話歷史（故事上下文）
      storyTheme,             // 故事主題
      userLevel,              // [可選] 用戶級別，預留未來使用
      userGrade,              // 🎓 用戶年級
      currentRound            // 🎬 當前輪次（用於階段感知）
    } = await req.json()

    // 驗證必需參數
    if (!userSentence || !selectedWord) {
      throw new Error('缺少必需參數：userSentence 或 selectedWord')
    }

    // 獲取 DeepSeek API Key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      throw new Error('未配置 DEEPSEEK_API_KEY')
    }

    console.log('📝 評價句子:', userSentence)
    console.log('📚 選用詞彙:', selectedWord)

    // 生成反饋
    const feedback = await evaluateSentence({
      userSentence,
      selectedWord,
      conversationHistory: conversationHistory || [],
      storyTheme: storyTheme || 'general',
      userGrade: userGrade || 6,      // 🎓 傳入年級，默認6年級
      currentRound: currentRound || 1, // 🎬 傳入輪次，默認第1輪
      apiKey: deepseekApiKey
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: feedback
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// =====================================================
// 評價句子函數
// =====================================================
async function evaluateSentence({
  userSentence,
  selectedWord,
  conversationHistory,
  storyTheme,
  userGrade,      // 🎓 新增參數
  currentRound,   // 🎬 新增參數
  apiKey
}: {
  userSentence: string
  selectedWord: string
  conversationHistory: string[]
  storyTheme: string
  userGrade: number      // 🎓 新增類型
  currentRound: number   // 🎬 新增類型
  apiKey: string
}): Promise<any> {
  
  // 🎓 根據年級調整語氣和稱呼
  const teacherRole = getTeacherRole(userGrade)
  const studentAddress = getStudentAddress(userGrade)
  
  // 🎬 獲取故事階段信息
  const stageHint = getStageHintForFeedback(currentRound)
  
  // 構建反饋提示詞（優化版：結構調整，減少 Token 壓力）
  const feedbackPrompt = `你是${teacherRole}，正在幫助${studentAddress}學習詞語和創作故事。

【學生造句】
選用詞語：「${selectedWord}」
句子：${userSentence}

【故事上下文】（最近2輪）
${conversationHistory.slice(-2).join('\n')}
${stageHint}

【評價流程】
1. 語法檢查：詞性搭配正確嗎？→ 錯誤=1-2分 / 正確→下一步
2. 接龍連貫：承接上文嗎？→ 偏離=3-4分 / 跳躍=5-6分 / 合理→下一步
3. 創意評估：有修辭手法嗎？→ 優秀=8-10分 / 平淡=5-7分

【核心示例】
❌ 錯誤：評語說「加上小兔子的動作」，但優化版完全沒加（和原句相同）
✅ 正確：評語說「加上動作」，優化版真的加上「小兔子慌張地背起書包」

---
⚠️ **輸出前自我檢查清單**（在輸出前必須確認）：
□ 優化版是否包含「${selectedWord}」？（必須包含！）
□ 優化版是否和原句「${userSentence}」不同？（必須不同！）
□ 優化版是否體現了評語中的建議？（必須體現！）
□ 優化版是否完整？（有完整的標點符號結尾，不被截斷）

請用繁體中文輸出：

總分：X/10
評語：[50-70字，具體建議]
優化版句子：[完整句子，必須包含「${selectedWord}」]

直接輸出，無需解釋。`

  // 調用 DeepSeek API
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你必須只使用繁體中文（Traditional Chinese）回答。嚴格遵守字數限制。鼓勵創意表達。' },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.3,  // 較低溫度，確保格式準確
      max_tokens: 800   // 增加到800，確保優化版句子不被截斷
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 錯誤: ${error}`)
  }

  const data = await response.json()
  let feedbackText = data.choices[0].message.content.trim()
  
  // 檢查是否被截斷
  const finishReason = data.choices[0].finish_reason
  const usage = data.usage
  
  console.log('📊 Token 使用:', {
    prompt_tokens: usage?.prompt_tokens,
    completion_tokens: usage?.completion_tokens,
    total_tokens: usage?.total_tokens,
    finish_reason: finishReason
  })
  
  if (finishReason === 'length') {
    console.warn('⚠️ 反饋被截斷（達到 max_tokens 限制），重試中...')
    
    // 重試一次，增加 max_tokens
    const retryResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你必須只使用繁體中文（Traditional Chinese）回答。嚴格遵守字數限制。鼓勵創意表達。' },
          { role: 'user', content: feedbackPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000  // 重試時更大的限制
      })
    })
    
    if (retryResponse.ok) {
      const retryData = await retryResponse.json()
      feedbackText = retryData.choices[0].message.content.trim()
      console.log('✅ 重試成功')
    }
  }
  
  console.log('✅ 反饋生成完成')
  
  // 解析反饋文本
  const feedback = parseFeedbackText(feedbackText)
  
  // 🔍 驗證優化版句子（只記錄問題，不降級處理）
  if (feedback.optimizedSentence) {
    // 1. 確保以標點符號結尾
    const punctuation = /[。！？；」』、，]$/
    if (!punctuation.test(feedback.optimizedSentence)) {
      console.warn('⚠️ 優化版句子缺少結尾標點，添加句號')
      feedback.optimizedSentence += '。'
    }
    
    // 2. 檢查是否包含選用詞語（記錄但不修改）
    if (!feedback.optimizedSentence.includes(selectedWord)) {
      console.error(`❌ AI 錯誤：優化版句子缺少選用詞語「${selectedWord}」！`)
      console.error(`   原句: ${userSentence}`)
      console.error(`   優化版: ${feedback.optimizedSentence}`)
      console.error(`   評語: ${feedback.comment}`)
      // 不再降級處理，保留 AI 原始輸出，讓問題暴露
    }
    
    // 3. 檢查是否和原句相同（記錄但不修改）
    if (feedback.optimizedSentence === userSentence) {
      console.error(`❌ AI 錯誤：優化版句子和原句完全相同！`)
      console.error(`   原句: ${userSentence}`)
      console.error(`   評語: ${feedback.comment}`)
      // 不再降級處理，保留 AI 原始輸出，讓問題暴露
    }
    
    // 4. 檢查長度是否合理（記錄但不修改）
    if (feedback.optimizedSentence.length < userSentence.length * 0.5) {
      console.warn('⚠️ 優化版句子過短，可能不完整')
      console.warn(`   原句長度: ${userSentence.length}，優化版長度: ${feedback.optimizedSentence.length}`)
    }
  } else {
    // 如果完全沒有優化版句子，記錄錯誤
    console.error('❌ 沒有解析到優化版句子！')
    console.error(`   AI 原始輸出: ${feedbackText}`)
    // 不設置默認值，保持為空字符串
  }
  
  return feedback
}

// =====================================================
// 解析反饋文本
// =====================================================
function parseFeedbackText(text: string): any {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  
  const feedback = {
    score: 0,
    comment: '',
    optimizedSentence: ''
  }
  
  // 🆕 跟踪當前正在解析的字段
  let currentField: 'none' | 'comment' | 'optimized' = 'none'
  
  for (const line of lines) {
    // 總分
    if (line.includes('總分') || line.includes('评分')) {
      const match = line.match(/(\d+)/)
      if (match) {
        feedback.score = parseInt(match[1])
      }
      currentField = 'none'
    }
    // 評語
    else if (line.includes('評語') || line.includes('评语')) {
      // 找到第一个冒号后的所有内容（避免截断包含冒号的内容）
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':')
      const content = colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : ''
      feedback.comment = content
      currentField = 'comment'
    }
    // 優化版句子
    else if (line.includes('優化版句子') || line.includes('优化版句子')) {
      // 找到第一个冒号后的所有内容（避免截断对话中的冒号）
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':')
      const content = colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : ''
      feedback.optimizedSentence = content
      currentField = 'optimized'
    }
    // 🆕 繼續收集當前字段的多行內容
    else if (currentField !== 'none' && !line.includes('：') && !line.includes(':')) {
      if (currentField === 'comment') {
        feedback.comment += line  // 追加評語的多行內容
      } else if (currentField === 'optimized') {
        feedback.optimizedSentence += line  // 🆕 追加優化版句子的多行內容
      }
    }
  }
  
  // 清理空白
  feedback.comment = feedback.comment.trim()
  feedback.optimizedSentence = feedback.optimizedSentence.trim()
  
  console.log('📝 解析反饋結果:', {
    score: feedback.score,
    commentLength: feedback.comment.length,
    optimizedSentenceLength: feedback.optimizedSentence.length,
    optimizedPreview: feedback.optimizedSentence.substring(0, 50) + '...'  // 🆕 顯示前50字預覽
  })
  
  return feedback
}

// =====================================================
// 年級相關輔助函數
// =====================================================

/**
 * 根據年級獲取教師角色定位
 */
function getTeacherRole(grade: number): string {
  if (grade <= 3) return '一位親切溫暖的故事老師';
  if (grade <= 6) return '一位理解兒童文學的溫暖老師';
  if (grade <= 9) return '一位專業的語文老師';
  if (grade <= 12) return '一位文學導師';
  return '一位專業的文學批評者';
}

/**
 * 根據年級獲取學生稱呼
 */
function getStudentAddress(grade: number): string {
  if (grade <= 3) return '6-8歲的小朋友';
  if (grade <= 6) return '9-11歲的小朋友';
  if (grade <= 9) return '12-14歲的青少年';
  if (grade <= 12) return '15-17歲的高中生';
  return '成年創作者';
}

/**
 * 根據輪次獲取故事階段提示（用於反饋）
 */
function getStageHintForFeedback(currentRound: number): string {
  if (currentRound === 8) {
    return `
【特別提示】這是故事的結局句！
- 評價時要從「結局角度」思考
- 是否完整收尾？是否有情感餘韻？
- 是否呼應前文？是否讓人滿意？`;
  }
  
  if (currentRound >= 7) {
    return `
【故事階段】故事接近尾聲
- 評價時注意情節是否開始收束
- 鼓勵為結局做準備的描寫`;
  }
  
  if (currentRound >= 5) {
    return `
【故事階段】故事進入轉折期
- 評價時留意是否有轉折或高潮
- 鼓勵有張力的情節發展`;
  }
  
  if (currentRound >= 3) {
    return `
【故事階段】故事發展期
- 評價時注意情節是否推進
- 鼓勵引入問題或挑戰`;
  }
  
  return `
【故事階段】故事開端
- 評價時注意場景和角色是否清晰
- 鼓勵建立故事基礎`;
}

