// =====================================================
// 故事整體總結與點評 - Supabase Edge Function
// 分析完成的故事，生成整體評價和成長建議
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 獲取請求數據
    const { 
      storyHistory,      // 完整的故事對話歷史（16句）
      usedWords,         // 使用的詞彙列表
      storyTheme,        // 故事主題
      userGrade,         // 🎓 用戶年級
      userLevel          // 用戶詞彙水平
    } = await req.json()

    // 驗證必需參數
    if (!storyHistory || storyHistory.length === 0) {
      throw new Error('缺少故事歷史數據')
    }

    // 獲取 DeepSeek API Key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      throw new Error('未配置 DEEPSEEK_API_KEY')
    }

    console.log('📚 生成故事整體點評...')
    console.log('   句子數量:', storyHistory.length)
    console.log('   使用詞彙:', usedWords?.length || 0)

    // 生成整體點評
    const summary = await generateStorySummary({
      storyHistory,
      usedWords: usedWords || [],
      storyTheme: storyTheme || 'no_theme',
      userGrade: userGrade || 6,
      userLevel: userLevel || 2.0,
      apiKey: deepseekApiKey
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: summary
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
// 生成故事整體點評
// =====================================================
async function generateStorySummary({
  storyHistory,
  usedWords,
  storyTheme,
  userGrade,
  userLevel,
  apiKey
}: {
  storyHistory: any[]
  usedWords: string[]
  storyTheme: string
  userGrade: number
  userLevel: number
  apiKey: string
}): Promise<any> {
  
  // 構建完整故事文本
  const fullStory = storyHistory
    .map((entry, index) => {
      const role = entry.role === 'user' ? '用戶' : 'AI';
      return `[${role}] ${entry.sentence}`;
    })
    .join('\n');
  
  // 🎓 根據年級調整點評風格
  const evaluatorRole = getEvaluatorRole(userGrade);
  const evaluationDepth = getEvaluationDepth(userGrade);
  
  // 主題描述
  const themeDescriptions: Record<string, string> = {
    'natural_exploration': '自然探索',
    'school_life': '校園生活',
    'fantasy_adventure': '奇幻冒險',
    'sci_fi': '科幻未來',
    'cute_animals': '可愛動物',
    'family_daily': '家庭日常',
    'toy_world': '玩具世界',
    'school_adventure': '校園冒險',
    'science_discovery': '科學發現',
    'friendship': '友誼故事',
    'growth_story': '成長故事',
    'future_tech': '未來科技',
    'mystery': '推理懸疑',
    'youth_literature': '青春文學',
    'social_observation': '社會觀察',
    'philosophical': '哲學思考',
    'historical': '歷史穿越',
    'human_nature': '人性探索',
    'urban_reality': '都市現實',
    'poetic': '詩意表達',
    'experimental': '實驗創作',
    'no_theme': '無主題自由創作'
  };
  
  const themeDesc = themeDescriptions[storyTheme] || '自由創作';
  
  // 構建整體點評提示詞
  const summaryPrompt = `你是${evaluatorRole}，現在要對一個完整的故事進行整體點評。

【故事信息】
主題：${themeDesc}
總句數：${storyHistory.length}句（用戶${Math.ceil(storyHistory.length / 2)}句 + AI${Math.floor(storyHistory.length / 2)}句）
使用詞彙：${usedWords.join('、')}
用戶詞彙水平：L${userLevel}
用戶年級：${userGrade}年級

【完整故事】
${fullStory}

${evaluationDepth}

請用繁體中文撰寫點評，**嚴格遵守以下格式**：

## 故事評價

[2-3句話概括故事的完整性和特點]

## 創作亮點 ✨

1. [亮點1：具體指出某個情節、描寫或轉折的精彩之處]
2. [亮點2：另一個值得稱讚的地方]
3. [亮點3：第三個亮點]

## 成長建議 💡

[1-2句話，溫和地提出改進方向，不要批評，而是啟發性建議]

---

**重要要求**：
1. 語氣要溫暖、鼓勵，但不浮誇
2. 亮點要具體，引用實際的句子或情節
3. 建議要實用，學生下次創作時能運用
4. 總字數控制在 200-300 字
5. 根據年級調整語言複雜度和文學性

直接輸出格式化的點評內容，無需 JSON 包裝。`;

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
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,  // 足夠生成完整點評
      top_p: 0.9
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 錯誤: ${error}`)
  }

  const data = await response.json()
  const summaryText = data.choices[0].message.content.trim()
  
  console.log('✅ 整體點評生成成功')
  console.log('📊 Token 使用:', {
    prompt_tokens: data.usage?.prompt_tokens,
    completion_tokens: data.usage?.completion_tokens,
    total_tokens: data.usage?.total_tokens
  })
  
  // 解析點評內容（提取各個部分）
  const parsed = parseSummary(summaryText)
  
  return {
    fullText: summaryText,
    ...parsed
  }
}

// =====================================================
// 根據年級獲取評價者角色
// =====================================================
function getEvaluatorRole(grade: number): string {
  if (grade <= 3) return '一位充滿愛心的故事老師';
  if (grade <= 6) return '一位經驗豐富的兒童文學老師';
  if (grade <= 9) return '一位專業的語文教師';
  if (grade <= 12) return '一位文學導師';
  return '一位資深的文學評論家';
}

// =====================================================
// 根據年級獲取評價深度指導
// =====================================================
function getEvaluationDepth(grade: number): string {
  if (grade <= 3) {
    return `【評價重點（低年級）】
- 重點關注：故事是否有趣、情節是否清楚
- 亮點：找出可愛、有趣、富有童心的地方
- 建議：簡單、具體、易於理解（如"可以加入更多動作描寫"）
- 語言：親切、鼓勵、充滿童趣`;
  }
  
  if (grade <= 6) {
    return `【評價重點（中年級）】
- 重點關注：故事結構、情節發展、場景描寫
- 亮點：找出有想象力、描寫生動的地方
- 建議：具體且啟發性（如"下次可以試試用比喻句"）
- 語言：溫暖、專業、易懂`;
  }
  
  if (grade <= 9) {
    return `【評價重點（初中）】
- 重點關注：情節邏輯、人物塑造、情感表達
- 亮點：找出深刻、細膩、有轉折的地方
- 建議：專業且有深度（如"內心描寫可以更細膩"）
- 語言：專業、深入、引導性強`;
  }
  
  if (grade <= 12) {
    return `【評價重點（高中）】
- 重點關注：文學手法、主題深度、語言風格
- 亮點：找出有文學性、有意境、有思想的地方
- 建議：文學性強（如"可以嘗試更多象徵和隱喻"）
- 語言：典雅、深刻、啟發性強`;
  }
  
  return `【評價重點（成人）】
- 重點關注：敘事技巧、主題探討、文學實驗
- 亮點：找出創新、深刻、獨特的表達
- 建議：專業批評（如"敘事視角的轉換可以更大膽"）
- 語言：專業、客觀、批判性思維`;
}

// =====================================================
// 解析點評內容
// =====================================================
function parseSummary(text: string): any {
  const summary = {
    evaluation: '',
    highlights: [] as string[],
    suggestions: ''
  };
  
  // 分段處理
  const sections = text.split('##').filter(s => s.trim());
  
  for (const section of sections) {
    const content = section.trim();
    
    if (content.startsWith('故事評價')) {
      summary.evaluation = content.replace('故事評價', '').trim();
    } 
    else if (content.includes('創作亮點') || content.includes('亮點')) {
      // 提取列表項
      const lines = content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.match(/^\d+\./)) {
          summary.highlights.push(line.replace(/^\d+\./, '').trim());
        }
      }
    }
    else if (content.includes('成長建議') || content.includes('建議')) {
      summary.suggestions = content.replace(/成長建議|建議/, '').replace('💡', '').trim();
    }
  }
  
  return summary;
}

