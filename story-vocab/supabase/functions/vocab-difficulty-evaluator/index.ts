// =====================================================
// vocab-difficulty-evaluator Edge Function
// AI 词汇难度自动评估服务
// 基于150个黄金标准校准词，自动评估其他词汇的难度等级
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // 处理 CORS preflight 请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { words, mode = 'batch' } = await req.json()
    // mode: 'single' | 'batch' | 'recalibrate_all'

    if (!words || words.length === 0) {
      throw new Error('参数错误：words 不能为空')
    }

    console.log(`[AI评级] 模式: ${mode}, 词汇数: ${words.length}`)

    // 初始化 Supabase 客户端（使用 service role key 以绕过 RLS）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 获取黄金标准词库
    const { data: goldenStandard, error: gsError } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('is_calibration', true)
      .order('calibration_order')

    if (gsError) {
      throw new Error('获取黄金标准词库失败: ' + gsError.message)
    }

    if (!goldenStandard || goldenStandard.length === 0) {
      throw new Error('黄金标准词库为空，请先导入校准词汇')
    }

    console.log(`[黄金标准] 加载了 ${goldenStandard.length} 个校准词`)

    // 2. 构建 AI 评估 System Prompt
    const systemPrompt = buildEvaluationSystemPrompt(goldenStandard)

    // 3. 批量评估
    const results = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      
      try {
        // 评估词汇难度
        const evaluation = await evaluateWordDifficulty(word, systemPrompt)
        results.push(evaluation)
        
        // 如果是批量或重新校准模式，更新数据库
        if (mode === 'batch' || mode === 'recalibrate_all') {
          const { error: updateError } = await supabase
            .from('vocabulary')
            .update({
              difficulty_level: evaluation.difficulty,
              difficulty_confidence: evaluation.confidence,
              difficulty_reasoning: evaluation.reasoning,
              difficulty_evaluated_at: new Date().toISOString()
            })
            .eq('word', word.word)

          if (updateError) {
            console.error(`更新失败: ${word.word}`, updateError)
            errorCount++
          } else {
            successCount++
          }
        } else {
          successCount++
        }

        console.log(`[${i + 1}/${words.length}] ${word.word} → L${evaluation.difficulty} (${evaluation.confidence})`)

      } catch (error) {
        console.error(`评估失败: ${word.word}`, error)
        errorCount++
        results.push({
          word: word.word,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        evaluated_count: words.length,
        success_count: successCount,
        error_count: errorCount,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )

  } catch (error) {
    console.error('❌ vocab-difficulty-evaluator 错误:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})

/**
 * 构建 AI 评估的 System Prompt
 */
function buildEvaluationSystemPrompt(goldenStandard: any[]): string {
  // 按等级分组
  const byLevel: { [key: number]: any[] } = goldenStandard.reduce((acc, word) => {
    const level = word.difficulty_level
    if (!acc[level]) acc[level] = []
    acc[level].push(word)
    return acc
  }, {})

  // 生成各等级的示例和特征分析
  const levelAnalysis = Object.keys(byLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(level => {
      const words = byLevel[parseInt(level)]
      return `
### L${level} 級詞彙特徵
年齡對應：${getLevelDescription(parseInt(level))}
詞彙數量：${words.length} 個
示例詞彙：${words.slice(0, 8).map(w => `"${w.word}"`).join('、')}

特徵分析：
- 字數分布：${analyzeCharCount(words)}
- 詞性分布：${analyzeCategory(words)}
- 平均頻率：${analyzeFrequency(words)}
- 使用場景：${getUsageContext(parseInt(level))}
`
    }).join('\n')

  return `
你是中文詞彙難度評估專家。你的任務是評估詞彙的難度等級（1-6級）。

## 📊 黃金標準詞庫（開發者精心標註的參考基準）

共 ${goldenStandard.length} 個校準詞彙，分布在 L1-L6 六個等級。

${levelAnalysis}

## 🎯 評估原則

### 1. 字數與結構
- L1-L2：1-2字為主，日常高頻詞
- L3-L4：2-3字，開始出現4字詞和成語
- L5-L6：成語增多，文言色彩強

### 2. 使用頻率與場景
- L1-L2：日常口語對話、基礎閱讀
- L3-L4：兒童文學、學校作文
- L5-L6：文學作品、古典詩詞

### 3. 語言層次
- L1-L2：口語為主，具體可見的事物
- L3-L4：書面語增多，抽象概念開始出現
- L5-L6：文言/古雅詞彙，意境哲理

### 4. 年齡適用性
- L1 (7-8歲)：小學2-3年級
- L2 (9-10歲)：小學4-5年級
- L3 (11-12歲)：小學6年級-初一
- L4 (13-14歲)：初二-初三
- L5 (15-16歲)：高一-高二
- L6 (17-18歲)：高三及以上

### 5. HSK 等級參考（僅供參考，不絕對）
- L1 ≈ HSK 1-2
- L2 ≈ HSK 2-3
- L3 ≈ HSK 4
- L4 ≈ HSK 5
- L5 ≈ HSK 6
- L6 ≈ 超出 HSK 範圍

## 📋 評估策略

1. 首先對比黃金標準中是否有類似詞彙
2. 分析詞彙的字數、結構、詞性
3. 考慮詞彙的使用場景和頻率
4. 評估抽象程度和語言層次
5. 給出置信度（high/medium/low）

## 輸出格式

必須返回JSON格式（使用繁體中文）：

{
  "word": "詞語",
  "difficulty": 1-6,
  "confidence": "high" | "medium" | "low",
  "reasoning": "簡短說明（50字內）",
  "category": "動詞" | "形容詞" | "名詞" | "成語" | "副詞" | "其他"
}

## ⚠️ 重要提醒

- 參考黃金標準，但不要死板套用
- 考慮詞語的實際使用難度
- 置信度要真實反映你的確定程度
- 如果難以判斷，可以給出中間值並標記 confidence: "medium"
- 所有文字必須使用繁體中文
`
}

/**
 * 调用 DeepSeek 评估单个词汇
 */
async function evaluateWordDifficulty(word: any, systemPrompt: string) {
  const userPrompt = `
請評估以下中文詞彙的難度等級（1-6）：

詞語：${word.word}
${word.category ? `類型：${word.category}` : ''}
${word.hsk_level ? `HSK等級：${word.hsk_level}` : ''}
${word.frequency ? `頻率：${word.frequency}` : ''}

請根據黃金標準詞庫，給出這個詞彙的難度等級。
`

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // 较低温度，保证评估一致性
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API 錯誤: ${response.status}`)
  }

  const data = await response.json()
  const result = JSON.parse(data.choices[0].message.content)
  
  return {
    word: word.word,
    difficulty: result.difficulty,
    confidence: result.confidence,
    reasoning: result.reasoning,
    category: result.category
  }
}

/**
 * 辅助函数：等级描述
 */
function getLevelDescription(level: number): string {
  const descriptions: { [key: number]: string } = {
    1: '7-8歲，小學2-3年級',
    2: '9-10歲，小學4-5年級',
    3: '11-12歲，小學6年級-初一',
    4: '13-14歲，初二-初三',
    5: '15-16歲，高一-高二',
    6: '17-18歲，高三及以上'
  }
  return descriptions[level] || '未知'
}

/**
 * 分析字数分布
 */
function analyzeCharCount(words: any[]): string {
  const counts = words.map(w => w.word.length)
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  return `平均 ${avg.toFixed(1)} 字，範圍 ${min}-${max} 字`
}

/**
 * 分析词性分布
 */
function analyzeCategory(words: any[]): string {
  const categoryCount: { [key: string]: number } = words.reduce((acc, w) => {
    acc[w.category] = (acc[w.category] || 0) + 1
    return acc
  }, {})
  
  return Object.entries(categoryCount)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([cat, count]) => `${cat}(${count})`)
    .join('、')
}

/**
 * 分析频率
 */
function analyzeFrequency(words: any[]): string {
  const freqs = words.map(w => w.frequency || 50)
  const avg = freqs.reduce((a, b) => a + b, 0) / freqs.length
  return avg.toFixed(0)
}

/**
 * 使用场景描述
 */
function getUsageContext(level: number): string {
  const contexts: { [key: number]: string } = {
    1: '日常對話、基礎閱讀',
    2: '兒童讀物、校園生活',
    3: '文學作品、深度閱讀',
    4: '專業文章、文學創作',
    5: '古典文學、詩詞歌賦',
    6: '典籍經典、高雅文學'
  }
  return contexts[level] || '未知'
}

