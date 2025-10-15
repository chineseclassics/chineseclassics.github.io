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
  
  // 構建反饋提示詞（三步驟評價法：語法→接龍→創意）
  const feedbackPrompt = `你是${teacherRole}，正在幫助${studentAddress}學習詞語和創作故事。

【學生造句】
選用詞語：「${selectedWord}」
句子：${userSentence}

【故事上下文】
${conversationHistory.slice(-4).join('\n')}
${stageHint}

請用繁體中文評價，**嚴格遵守以下格式和字數限制**：

總分：X/10
評語：[**嚴格控制在50-70字內**，真誠評語，平衡創意與規範]
優化版句子：[優化後的完整句子，保留創意但改正錯誤，必須包含原詞「${selectedWord}」]

⚠️ **優化版句子的重要要求**：
1. **必須包含選用詞語「${selectedWord}」** - 這是學生要練習的詞，絕對不能省略！
2. **基於學生原句改進，不是重寫** - 保留學生的想法和表達，只改正錯誤或提升表達
3. **必須是完整的句子** - 有主語、謂語，以標點符號結尾
4. **如果學生句子本身就很好** - 可以只做微調或保持原樣

【優化示例】：

例1：
學生原句：地圖上怎麼有一個島？
選用詞：島
❌ 錯誤優化：「她指著地圖驚呼。」（沒有包含「島」，完全重寫）
✅ 正確優化：「她指著地圖驚呼：『地圖上怎麼會有一個神秘的島？』」（包含「島」，基於原句改進）

例2：
學生原句：小明非常遺蹟。
選用詞：遺蹟
❌ 錯誤優化：「小明很好奇。」（沒有包含「遺蹟」）
✅ 正確優化：「小明看到了非常古老的遺蹟。」（包含「遺蹟」，改正語法錯誤）

例3：
學生原句：她勇敢地走進森林。
選用詞：勇敢
✅ 正確優化：「她勇敢地走進森林。」（原句已經很好，保持不變）

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
      
      // 調整評語，說明原句已經很好
      if (feedback.score >= 7) {
        feedback.comment = `你的句子已經很好了！詞語「${selectedWord}」用得恰當，繼續加油！`
      }
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

