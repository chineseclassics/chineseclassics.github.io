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
  
  // 構建反饋提示詞（平衡版：保留核心要求和評價流程，精簡示例）
  const feedbackPrompt = `你是${teacherRole}，正在幫助${studentAddress}學習詞語和創作故事。

【學生造句】
選用詞語：「${selectedWord}」
句子：${userSentence}

【故事上下文】
${conversationHistory.slice(-4).join('\n')}
${stageHint}

請用繁體中文評價，嚴格遵守以下格式：

總分：X/10
評語：[50-70字內，真誠具體的評語]
優化版句子：[優化後的完整句子，必須包含「${selectedWord}」]

【核心要求】
1. **必須包含選用詞「${selectedWord}」** - 絕對不能省略
2. **基於原句改進，不是重寫** - 保留學生的想法和表達
3. **絕對不能和原句完全相同** - 即使高分（8-9分）也要至少做一點改進
4. **評語中的建議必須在優化版中體現** - 這是關鍵！
   例：評語說「加上期待地問」→ 優化版就要真的加上「期待地問」
5. **優化方向**：加動作/表情描寫、增修飾詞、豐富對話標籤、調整語氣詞

【關鍵示例】

例1：語法錯誤（1-3分）
原句：小明非常遺蹟。（選用詞：遺蹟）
❌ 錯誤：「小明很好奇。」（沒包含「遺蹟」）
✅ 正確：「小明看到了非常古老的遺蹟。」

例2：高分句子（8分）⚠️ 重點
原句：小兔子說：「那你可以給我一個魔法禮物嗎？」（選用詞：魔法）
❌ 錯誤：「小兔子說：『那你可以給我一個魔法禮物嗎？』」（完全相同！）
✅ 正確：「小兔子期待地問：『那你可以給我一個魔法禮物嗎？』」
評語示例：「『魔法』用得準確！加上『期待地問』會更生動。」
（注意：優化版真的加上了「期待地問」，符合評語建議）

【評價流程 - 三步驟】

**第一步：語法檢查**
- 詞性搭配正確嗎？（❌「非常遺蹟」 ✅「非常古老」）
- 句子結構完整嗎？
- 有語法錯誤 → 1-2分，指出錯誤
- 語法正確 → 進入第二步

**第二步：接龍連貫性**
- 承接上文情節、角色、場景了嗎？
- 符合故事主題氛圍嗎？（奇幻/寫實/校園/科幻）
- 完全偏離 → 3-4分
- 稍微跳躍 → 5-6分（肯定創意但建議更連貫）
- 承接合理 → 進入第三步

**第三步：創意評估**
- 8-10分：有修辭手法（擬人、誇飾、比喻），生動有趣
  例：奇幻故事中「吃掉詩句」、「勇敢的陽光」
- 5-7分：正確但平淡，可以更生動
- 3-4分：語法對但不符合情境

【創意 vs 錯誤】
✅ 創意：語法正確 + 特殊情境 + 符合氛圍（如奇幻故事中的誇飾）
❌ 錯誤：詞性搭配錯 + 結構不完整 + 意思不清

【重要原則】
1. 語法是基礎，錯誤必須指出
2. 創意要符合故事上下文
3. ⚠️ 優化版絕對不能和原句相同，評語建議必須在優化版中實際體現

直接輸出格式內容，無需額外解釋。`

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
      max_tokens: 600   // 增加到600，確保評語和優化版句子完整輸出
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
        max_tokens: 800  // 重試時更大的限制
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
  
  // 🔍 驗證優化版句子
  if (feedback.optimizedSentence) {
    // 1. 確保以標點符號結尾
    const punctuation = /[。！？；」』、，]$/
    if (!punctuation.test(feedback.optimizedSentence)) {
      console.warn('⚠️ 優化版句子缺少結尾標點，可能不完整')
      feedback.optimizedSentence += '。'
    }
    
    // 2. ⚠️ 檢查是否包含選用詞語（這是最關鍵的驗證）
    if (!feedback.optimizedSentence.includes(selectedWord)) {
      console.error(`❌ 優化版句子缺少選用詞語「${selectedWord}」！`)
      console.error(`   原句: ${userSentence}`)
      console.error(`   優化版: ${feedback.optimizedSentence}`)
      
      // 降級處理：如果優化版沒有包含選用詞，使用原句
      console.warn('⚠️ 降級處理：使用學生原句作為優化版')
      feedback.optimizedSentence = userSentence
      
      // 不修改評語，保留 AI 原本的評價
      // （因為評語通常是正確的，只是優化版句子出錯）
    }
    
    // 3. 檢查長度是否合理（避免過短）
    if (feedback.optimizedSentence.length < userSentence.length * 0.5) {
      console.warn('⚠️ 優化版句子過短，可能不完整')
      console.warn(`   原句長度: ${userSentence.length}，優化版長度: ${feedback.optimizedSentence.length}`)
      
      // 如果優化版明顯短於原句，可能被截斷了，使用原句
      if (!feedback.optimizedSentence.includes(selectedWord)) {
        feedback.optimizedSentence = userSentence
      }
    }
  } else {
    // 如果完全沒有優化版句子，使用原句
    console.error('❌ 沒有解析到優化版句子，使用原句')
    feedback.optimizedSentence = userSentence
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
      const content = line.split('：')[1]?.trim() || line.split(':')[1]?.trim() || ''
      feedback.comment = content
      currentField = 'comment'  // 🆕 標記當前在解析評語
    }
    // 優化版句子
    else if (line.includes('優化版句子') || line.includes('优化版句子')) {
      const content = line.split('：')[1]?.trim() || line.split(':')[1]?.trim() || ''
      feedback.optimizedSentence = content
      currentField = 'optimized'  // 🆕 標記當前在解析優化版句子
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

