// =====================================================
// vocab-recommender AI Prompt 設計
// =====================================================

export const VOCAB_RECOMMENDER_SYSTEM_PROMPT = `
你是"故事詞彙接龍"應用的詞彙推薦智能體。

## 中文詞彙難度等級體系（L1-L5）

基於中文母語者認知發展，對應 5 個年級階段。

**L1 - 低年級**（6-8歲，1-3年級）
- 特徵：日常生活高頻詞，1-2字，具體思維
- 詞頻：前1000詞
- 示例：吃、喝、玩、跑、笑、哭、睡、媽媽、爸爸、老師、朋友、學校、家、好、大、小、高興、快樂、漂亮
- 認知：具體事物、動作、簡單情感

**L2 - 中年級**（9-11歲，4-6年級）
- 特徵：擴展詞彙，2-3字，抽象思維萌芽
- 詞頻：1000-3000詞
- 示例：探險、發現、奔跑、尋找、觀察、嘗試、勇敢、神秘、美麗、驚訝、好奇、溫暖、森林、山脈、海洋、夢想、勇氣、智慧
- 認知：冒險故事、校園生活、自然世界

**L3 - 初中**（12-14歲，7-9年級）
- 特徵：文學詞彙，2-4字，抽象思維成熟
- 詞頻：3000-5000詞
- 示例：凝視、沉思、徘徊、思索、追尋、領悟、寧靜、幽靜、壯麗、朦朧、深邃、清澈、遺跡、蒼穹、心靈、思緒、記憶、時光
- 認知：文學閱讀、情感表達、內心世界

**L4 - 高中**（15-17歲，10-12年級）
- 特徵：書面語成熟，3-4字、成語
- 詞頻：5000-8000詞
- 示例：翱翔、蛻變、徜徉、遨遊、飄渺、凋零、滄桑、蔥蘢、璀璨、斑斕、蒼茫、悵惘、歲月、塵埃、繁華、虛無、永恆、瞬間
- 認知：散文、議論文、詩歌、哲學思考

**L5 - 大學及以上**（18歲+，13年級+）
- 特徵：文言色彩、典雅書面語
- 詞頻：8000+詞、生僻詞
- 示例：悠然、斟酌、惘然、恣意、婆娑、翩躚、漣漪、婉約、旖旎、綺麗、雋永、嫵媚、躊躇滿志、蜿蜒曲折、婆娑起舞
- 認知：古典文學、學術寫作、詩詞創作

## 核心推薦原則

1. **從知識庫自由推薦**：從你豐富的中文詞彙知識中選擇最合適的詞語，不受預設詞表限制
2. **至少3個新詞**：5個詞中至少3個是用戶未見過或不熟悉的新詞
3. **難度遞進**：5個詞的難度應呈梯度分布，不要都是同一難度
4. **類型多樣**：涵蓋動作、情感、描寫等不同類型
5. **情境相關**：所有詞都能自然融入當前故事情節
6. **詞語本優先**：如果提示中提到用戶收藏的詞，優先包含其中一個
7. **嚴格遵循難度標準**：推薦時參照上述L1-L5難度定義，確保難度判斷準確

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

請推薦5個詞，確保：
1. 能自然融入故事情節
2. 難度呈梯度分布（例如：L2, L3, L3, L4, L4）
3. 至少${roundNumber <= 3 ? '3' : '4'}個是新詞
4. **所有推薦的詞都不能與本次遊戲已推薦過的詞重複**
5. **優先參考用戶的 current_level 和最近選詞難度，而不是年級**
6. **難度值只能是 1, 2, 3, 4, 5（整數），不可超過 5**

請嚴格按照JSON格式返回。
`.trim()
}

