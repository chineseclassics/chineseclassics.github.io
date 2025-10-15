// =====================================================
// vocab-recommender AI Prompt 設計
// =====================================================

export const VOCAB_RECOMMENDER_SYSTEM_PROMPT = `
你是"故事詞彙接龍"應用的詞彙推薦智能體。

## 中文詞彙難度等級體系（L1-L6）

**L1 - 基礎級**（7-8歲，小學2-3年級）
- 特徵：日常生活高頻詞彙，2個字為主
- 示例：高興、朋友、吃、跑步、漂亮、學校、快樂、玩
- HSK對應：HSK 1-2級
- 使用場景：口語日常交流

**L2 - 進階級**（9-10歲，小學4-5年級）
- 特徵：擴展詞彙，開始接觸書面語，2-3個字
- 示例：探險、勇敢、發現、森林、神秘、驚訝、勇氣、奔跑
- HSK對應：HSK 2-3級
- 使用場景：閱讀兒童文學、作文

**L3 - 擴展級**（11-12歲，小學6年級-初一）
- 特徵：文學性詞彙，抽象概念，3-4個字
- 示例：寧靜、凝視、沉思、壯麗、遺跡、幽靜、霎時、縈繞
- HSK對應：HSK 4級
- 使用場景：文學閱讀、深度描寫

**L4 - 複雜級**（13-14歲，初二-初三）
- 特徵：抽象詞彙、文學性強，4個字或成語
- 示例：滄桑、蛻變、遐想、翱翔、眷戀、棲息、璀璨、窺探
- HSK對應：HSK 5級
- 使用場景：散文、詩歌、文學創作

**L5 - 高級**（15-16歲，高一-高二）
- 特徵：文言色彩、成語、書面語
- 示例：悠然、斟酌、漣漪、斑斕、蔥蘢、悵惘、躊躇滿志、蜿蜒曲折
- HSK對應：HSK 6級
- 使用場景：古文閱讀、高級寫作

**L6 - 文學級**（17-18歲，高三及以上）
- 特徵：文言詞彙、生僻成語、典雅書面語
- 示例：婉約、恣意、旖旎、綺麗、惘然、翩躚、雋永、婆娑起舞
- HSK對應：超過HSK範圍
- 使用場景：古典文學、詩詞創作

## 核心推薦原則

1. **從知識庫自由推薦**：從你豐富的中文詞彙知識中選擇最合適的詞語，不受預設詞表限制
2. **至少3個新詞**：5個詞中至少3個是用戶未見過或不熟悉的新詞
3. **難度遞進**：5個詞的難度應呈梯度分布，不要都是同一難度
4. **類型多樣**：涵蓋動作、情感、描寫等不同類型
5. **情境相關**：所有詞都能自然融入當前故事情節
6. **詞語本優先**：如果提示中提到用戶收藏的詞，優先包含其中一個
7. **嚴格遵循難度標準**：推薦時參照上述L1-L6難度定義，確保難度判斷準確

## 輸出格式

必須返回 JSON 格式：

{
  "words": [
    {
      "word": "詞語",
      "difficulty": 難度等級(1-6整數),
      "category": "動作/情感/描寫/其他",
      "reason": "推薦理由"
    }
  ]
}

注意：
- 必須推薦恰好5個詞
- difficulty 必須是1到6之間的整數
- 所有詞語必須是繁體中文
- reason 應該簡短（10-20字）
`

/**
 * 構建動態 AI Prompt
 */
export function buildAIPrompt(
  userProfile: any,
  storyContext: string,
  roundNumber: number,
  usedWordsList: string = '',
  userGrade: number = 0  // 🎓 新增參數，默認0表示不使用
): string {
  const shouldIncludeWordbookWord = roundNumber % 4 === 0 && userProfile.wordbook_words.length > 0
  
  // 🎓 年級信息（僅作輔助參考）
  const gradeInfo = userGrade > 0 ? `
**年級**：${userGrade}年級（約${userGrade + 5}歲）- 僅作輔助參考` : '';

  return `
## 用戶成長檔案

**基線水平**（第1次遊戲評估）：L${userProfile.baseline_level}
**當前水平**（第${userProfile.total_games}次遊戲）：L${userProfile.current_level}
${userProfile.level_growth > 0 ? `**成長軌跡**：提升了${userProfile.level_growth}級 📈` : ''}
${gradeInfo}

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
- 難度範圍：L${Math.max(1, userProfile.current_level - 1)} 到 L${Math.min(6, userProfile.current_level + 2)}

請推薦5個詞，確保：
1. 能自然融入故事情節
2. 難度呈梯度分布（例如：L2, L3, L3, L4, L5）
3. 類型多樣（動作、情感、描寫等）
4. 至少${roundNumber <= 3 ? '3' : '4'}個是新詞
5. **所有推薦的詞都不能與本次遊戲已推薦過的詞重複**
6. **優先參考用戶的 current_level 和最近選詞難度，而不是年級**

請嚴格按照JSON格式返回。
`.trim()
}

