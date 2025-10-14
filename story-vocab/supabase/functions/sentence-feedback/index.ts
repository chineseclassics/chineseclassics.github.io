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
      userLevel               // [可選] 用戶級別，預留未來使用
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
  apiKey
}: {
  userSentence: string
  selectedWord: string
  conversationHistory: string[]
  storyTheme: string
  apiKey: string
}): Promise<any> {
  
  // 構建反饋提示詞（三步驟評價法：語法→接龍→創意）
  const feedbackPrompt = `你是一位理解兒童文學的溫暖老師，正在幫助10-12歲的小朋友學習詞語和創作故事。

【學生造句】
選用詞語：「${selectedWord}」
句子：${userSentence}

【故事上下文】
${conversationHistory.slice(-4).join('\n')}

請用繁體中文評價，**嚴格遵守以下格式和字數限制**：

總分：X/10
評語：[**嚴格控制在50-70字內**，真誠評語，平衡創意與規範]
優化版句子：[優化後的完整句子，保留創意但改正錯誤，必須包含原詞「${selectedWord}」]

**重要**：評語不可超過70字，優化版句子必須完整輸出，不可截斷。

【評價流程 - 三步驟判斷法】：

**第一步：基本語法檢查**

檢查詞性搭配和句子結構：
- 詞性搭配是否正確？
  * ❌ 錯誤例子：「非常遺蹟」（副詞不能修飾名詞）
  * ❌ 錯誤例子：「很書」（副詞不能修飾名詞）
  * ✅ 正確例子：「非常古老」「很開心」
  
- 句子結構是否完整？
  * ❌ 錯誤：「勇敢地房子」（形容詞+名詞搭配不當）
  * ✅ 正確：「勇敢地走進房子」

判斷：
- ❌ 如果有基本語法錯誤 → 1-2分，直接指出錯誤
- ✅ 如果語法正確 → 進入第二步

**第二步：接龍連貫性檢查**

在語法正確的前提下，檢查句子在故事上下文中是否合理：
- 是否承接了上文的情節、角色、場景？
- 是否符合故事的主題氛圍？（奇幻/寫實/校園/科幻）
- 跳躍是否適度？

判斷標準：
- ❌ 完全偏離故事主線 → 3-4分，指出不連貫
- ⚠️ 有創意但稍微跳躍 → 5-6分，肯定創意但建議更連貫
- ✅ 承接合理且自然 → 進入第三步

**第三步：創意評估**

在語法正確、接龍合理的前提下，評估創意和想象力：

A. **創意優秀（8-10分）**
   - 使用修辭手法（擬人、誇飾、比喻、通感）且符合故事情境
   - 為故事增添趣味和意境
   - 詞語使用準確且生動
   
   例子：
   * 奇幻故事中「吃掉詩句」→ 誇飾手法，符合奇幻氛圍
   * 「勇敢的陽光」→ 擬人化，生動形象
   * 「笑聲打開了門」→ 通感，富有詩意

B. **基本正確（5-7分）**
   - 詞語和語法都正確，接龍也合理
   - 但比較平淡，缺少亮點
   - 可以提供更生動的表達

C. **需改進（3-4分）**
   - 語法正確，但不太符合故事情境
   - 跳躍過大或偏離主題

【創意 vs 錯誤的判斷關鍵】：

✅ **創意修辭的特徵**：
- 詞語本身語法正確（詞性搭配對）
- 用在特殊情境創造效果
- 符合故事的氛圍和主題
- 讀者能理解其意圖

❌ **語法錯誤的特徵**：
- 詞性搭配不對（如副詞修飾名詞）
- 句子結構不完整
- 意思不清楚或無法理解

【具體判斷示例】：

| 句子 | 語法檢查 | 接龍檢查 | 創意評估 | 結果 |
|------|---------|---------|---------|------|
| 「吃掉詩句」（奇幻故事） | ✅ 動詞+賓語正確 | ✅ 符合奇幻氛圍 | ✅ 誇飾手法 | 8-10分 |
| 「非常遺蹟」 | ❌ 副詞+名詞錯誤 | - | - | 1-2分 |
| 「勇敢的陽光」 | ✅ 形容詞+名詞正確 | ✅ 合理 | ✅ 擬人手法 | 8-10分 |
| 「她看著詩句」 | ✅ 正確 | ✅ 合理 | ❌ 無創意 | 5-7分 |
| 「吃掉詩句」（寫實校園故事） | ✅ 語法對 | ⚠️ 與寫實主題不符 | - | 4-5分 |

【評語撰寫模式】：

**語法錯誤（1-2分）**：
「『遺蹟』是名詞，不能用『非常』來修飾喔！我們說『非常古老』『非常神秘』，但不說『非常遺蹟』。如果想表達光環像遺跡，可以說『這個光環像古老的遺蹟一樣神秘』。」

**不連貫但有創意（3-4分）**：
「『吃掉詩句』很有想象力！但故事現在在講寫實的校園生活，突然出現這麼奇幻的情節有點跳躍。如果想表達喜歡詩句，可以說『她想把每句詩都背下來』。」

**連貫且創意（8-10分）**：
「『吃掉』用在詩句上很有創意！在這個奇幻故事裡，你用這個詞表達了強烈的喜愛，而且符合故事的魔法氛圍。這種想象力很棒！」

**基本正確但平淡（5-7分）**：
「『看著』用得對，如果加上表情或動作會更生動喔！比如『目不轉睛地看著』或『驚訝地看著』。」

【重要原則】：

1. **創意與規範並重**：既要鼓勵想象力，也要教導正確用法
2. **語法是基礎**：語法錯誤必須指出，不能因為想鼓勵創意而忽略
3. **接龍很重要**：創意要符合故事的上下文和主題氛圍
4. **修辭需合理**：修辭手法要在合適的故事情境中使用

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
  
  // 確保優化版句子以標點符號結尾
  if (feedback.optimizedSentence) {
    const punctuation = /[。！？；」』、，]$/
    if (!punctuation.test(feedback.optimizedSentence)) {
      console.warn('⚠️ 優化版句子缺少結尾標點，可能不完整')
      feedback.optimizedSentence += '。'
    }
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
  
  for (const line of lines) {
    // 總分
    if (line.includes('總分') || line.includes('评分')) {
      const match = line.match(/(\d+)/)
      if (match) {
        feedback.score = parseInt(match[1])
      }
    }
    // 評語
    else if (line.includes('評語') || line.includes('评语')) {
      const content = line.split('：')[1]?.trim() || line.split(':')[1]?.trim() || ''
      feedback.comment = content
    }
    // 優化版句子
    else if (line.includes('優化版句子')) {
      const content = line.split('：')[1]?.trim() || line.split(':')[1]?.trim() || ''
      feedback.optimizedSentence = content
    }
    // 如果評語或優化版是多行的，繼續收集
    else if (feedback.comment && !feedback.optimizedSentence && !line.includes('：') && !line.includes(':')) {
      feedback.comment += line
    }
  }
  
  // 清理空白
  feedback.comment = feedback.comment.trim()
  feedback.optimizedSentence = feedback.optimizedSentence.trim()
  
  console.log('📝 解析反饋結果:', {
    score: feedback.score,
    commentLength: feedback.comment.length,
    optimizedSentenceLength: feedback.optimizedSentence.length
  })
  
  return feedback
}

