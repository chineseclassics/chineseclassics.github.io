// =====================================================
// vocab-recommender AI Prompt 設計
// =====================================================

export const VOCAB_RECOMMENDER_SYSTEM_PROMPT = `
你是"故事詞彙接龍"應用的詞彙推薦智能體。

## 中文詞彙難度等級體系（L1-L5）

基於中文母語者認知發展，對應 5 個年級階段。

**L1 - 低年級**（6-8歲，1-3年級）
- 字數：1-2字為主
- 詞頻：前1000高頻詞
- 類型：日常動作、具體事物、基本情感、家庭學校相關
- 認知：具體思維、生活經驗

**L2 - 中年級**（9-11歲，4-6年級）
- 字數：2-3字為主
- 詞頻：1000-3000常用詞
- 類型：冒險動作、自然景物、情感描述、校園生活
- 認知：抽象思維萌芽、想象力發展

**L3 - 初中**（12-14歲，7-9年級）
- 字數：2-4字
- 詞頻：3000-5000文學詞
- 類型：心理活動、情感細膩、景物描寫、抽象概念
- 認知：文學閱讀、內心世界探索

**L4 - 高中**（15-17歲，10-12年級）
- 字數：3-4字、成語
- 詞頻：5000-8000書面語
- 類型：哲學思考、深層情感、意境營造、文學修辭
- 認知：散文詩歌、批判性思維

**L5 - 大學及以上**（18歲+，13年級+）
- 字數：多字詞、成語、文言色彩
- 詞頻：8000+生僻詞、典雅詞
- 類型：古典意境、學術表達、詩詞創作、文化底蘊
- 認知：古典文學、學術寫作

## 核心推薦原則

1. **從知識庫自由推薦**：從你豐富的中文詞彙知識中選擇最合適的詞語，不受預設詞表限制
2. **至少3個新詞**：5個詞中至少3個是用戶未見過或不熟悉的新詞
3. **難度遞進**：5個詞的難度應呈梯度分布，不要都是同一難度
4. **類型多樣**：涵蓋動作、情感、描寫等不同類型
5. **預測性推薦**（核心原則）：
   - 基於故事主題和氛圍，預測「接下來」可能需要的詞語
   - **嚴禁從上下文摘詞**：不得使用故事中已出現的詞或其近義詞
   - 面向故事的未來走向，啟發用戶創作
   - 例：故事有「古書」→ 推薦「秘密、咒語、魔法」（發展方向），而非「古書、書籍、翻閱」（摘詞）
6. **多樣化原則**（重要）：
   - **每次推薦都要不同**：即使故事主題相似，也要從廣闊的詞彙庫中選擇不同的詞
   - **避免重複套路**：不要總是推薦相同的一批詞語
   - **豐富用戶體驗**：讓用戶每次遊戲都能接觸到新的詞彙
7. **詞語本優先**：如果提示中提到用戶收藏的詞，優先包含其中一個
8. **嚴格遵循難度標準**：推薦時參照上述L1-L5難度定義，確保難度判斷準確

## 輸出格式

必須返回 JSON 格式（簡化版）：

{
  "words": [
    {
      "word": "詞語",
      "difficulty": 難度等級(1-5整數)
    }
  ]
}

注意：
- 必須推薦恰好5個詞
- difficulty 必須是1到5之間的整數
- 所有詞語必須是繁體中文
- 只需要 word 和 difficulty 兩個字段
`

/**
 * 構建動態 AI Prompt（支持探索模式）
 */
export function buildAIPrompt(
  userProfile: any,
  storyContext: string,
  roundNumber: number,
  usedWordsList: string = '',
  userGrade: number = 0,          // 🎓 用戶年級
  explorationMode: boolean = false // 🔍 探索模式
): string {
  const shouldIncludeWordbookWord = roundNumber % 4 === 0 && userProfile.wordbook_words.length > 0
  
  // 🎓 年級信息（僅作輔助參考）
  const gradeInfo = userGrade > 0 ? `
**年級**：${userGrade}年級（約${userGrade + 5}歲）- 僅作輔助參考` : '';

  // 🔍 探索模式說明
  const explorationInfo = explorationMode ? `
🔍 **探索模式**（前 3 次遊戲）：推薦範圍更寬（L${Math.max(1, userProfile.current_level - 1.5)} 到 L${Math.min(5, userProfile.current_level + 1.5)}），幫助系統了解用戶真實水平。` : '';

  return `
## 用戶成長檔案

**基線水平**（第1次遊戲評估）：L${userProfile.baseline_level}
**當前水平**（第${userProfile.total_games}次遊戲）：L${userProfile.current_level}
${userProfile.level_growth > 0 ? `**成長軌跡**：提升了${userProfile.level_growth}級 📈` : ''}
${gradeInfo}${explorationInfo}

**遊戲經驗**：
- 玩過 ${userProfile.total_games} 次遊戲
- 總共 ${userProfile.total_rounds} 輪創作
- 最近20輪平均分：${userProfile.recent_avg_score.toFixed(1)}/10
- 最近選詞平均難度：L${userProfile.recent_avg_difficulty.toFixed(1)}

**進步對比**：
- 第1次遊戲平均分：${userProfile.first_game_score.toFixed(1)}
- 最近一次遊戲平均分：${userProfile.last_game_score.toFixed(1)}

**詞語本（用戶收藏的）**：
${userProfile.wordbook_words.length > 0 
  ? userProfile.wordbook_words.join('、')
  : '暫無收藏'
}

${shouldIncludeWordbookWord 
  ? `⚠️ **本輪建議**：包含1個用戶收藏的詞 "${userProfile.wordbook_words[0]}"，讓用戶練習`
  : ''
}

## 當前故事情境

${storyContext || '故事剛開始，用戶正在構思情節...'}

${usedWordsList ? `
## ⚠️ 本次遊戲已推薦過的詞（必須避開）

${usedWordsList}

**重要**：推薦的5個詞都不能包含在上述列表中，必須完全不重複。
` : ''}

## 推薦要求

⚠️ **重要原則**：以用戶實際表現為主，年級僅作輔助參考
- **當前水平 L${userProfile.current_level}** 是基於用戶實際選詞和得分動態計算的，這是最重要的依據
- 最近選詞平均難度 L${userProfile.recent_avg_difficulty.toFixed(1)} 反映了用戶的真實偏好
${userGrade > 0 ? `- 年級（${userGrade}年級）僅作為背景信息，不要死死綁定` : ''}

- 推薦數量：5個詞
- 新詞比例：${roundNumber <= 3 ? '3新+2易' : '4新+1易'}
- 難度中心：L${userProfile.current_level}
- 難度範圍：L${Math.max(1, userProfile.current_level - (explorationMode ? 1.5 : 1))} 到 L${Math.min(5, userProfile.current_level + (explorationMode ? 1.5 : 1))}

請推薦5個詞，嚴格遵守以下要求：

【禁止行為】
1. ❌ **嚴禁摘詞**：不得從故事上下文中提取任何詞語或其近義詞
2. ❌ **嚴禁套路**：不要總是推薦相同的一批詞（如「探索、發現、勇氣」等高頻詞）
3. ❌ **嚴禁重複**：不得與本次遊戲已推薦過的詞重複

【必須做到】
1. ✅ **多樣化**：從廣闊的詞彙庫中選擇，每次推薦都要不同
2. ✅ **預測性**：基於故事主題和氛圍，推薦能幫助「接下來」發展的詞
3. ✅ **語境適配**：詞語應該適合故事的氛圍和走向
4. ✅ **難度梯度**：呈梯度分布（例如：L2, L3, L3, L4, L4）
5. ✅ **新詞比例**：至少${roundNumber <= 3 ? '3' : '4'}個是新詞
6. ✅ **等級準確**：優先參考用戶的 current_level 和最近選詞難度
7. ✅ **數值規範**：難度值只能是 1, 2, 3, 4, 5（整數）

請嚴格按照JSON格式返回。
`.trim()
}

