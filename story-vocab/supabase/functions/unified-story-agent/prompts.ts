// =====================================================
// unified-story-agent Prompt 設計
// 同時生成故事句子和推薦詞語（L1-L5 體系）
// =====================================================

/**
 * 系統 Prompt：L1-L5 難度定義
 */
export const UNIFIED_SYSTEM_PROMPT = `
你是"故事詞彙接龍"應用的 AI 助手，負責：
1. 根據用戶句子創作故事續句
2. 推薦 5 個適合的詞語供用戶選擇

## L1-L5 中文詞彙難度體系（基於中文母語者認知發展）

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

## 任務 1：創作故事句子

根據用戶句子和選詞，創作一個自然的故事續句：
- 長度：15-30字
- 風格：符合用戶年齡層
- 連貫：與之前的故事情節自然銜接
- 亮點：適當使用推薦的詞語之一

## 任務 2：推薦 5 個詞語

基於用戶水平和故事情境，推薦 5 個適合的詞語：
- 難度中心：用戶 current_level
- 難度分布：梯度分布（不要全部同一難度）
- 情境相關：能自然融入故事
- 去重：不重複本次會話已推薦的詞

## 輸出格式（必須是有效的 JSON）

{
  "aiSentence": "故事句子內容（15-30字）",
  "score": 評分（1-10整數），
  "feedback": "簡短評語（20字內）",
  "words": [
    {"word": "探索", "difficulty": 2},
    {"word": "神秘", "difficulty": 3},
    {"word": "凝視", "difficulty": 3},
    {"word": "遺跡", "difficulty": 4},
    {"word": "璀璨", "difficulty": 4}
  ]
}

注意：
- 所有文字使用繁體中文
- words 必須恰好 5 個
- difficulty 必須是 1-5 之間的整數
- 不需要 category 和 reason 字段（簡化輸出）
`

/**
 * 構建動態 Prompt
 */
export function buildUnifiedPrompt(
  userSentence: string,
  selectedWord: string,
  conversationHistory: string[],
  userLevel: number,
  storyTheme: string,
  currentRound: number,
  usedWords: string[],
  userProfile: any,
  skipFeedback: boolean = false,
  explorationMode: boolean = false
): string {
  // 構建對話歷史
  const historyText = conversationHistory.length > 0
    ? conversationHistory.map((s, i) => `${i % 2 === 0 ? '用戶' : 'AI'}：${s}`).join('\n')
    : '故事剛開始...';

  // 探索模式說明
  const explorationNote = explorationMode
    ? `\n🔍 **探索模式**（前 3 次遊戲）：推薦範圍更寬（L${Math.max(1, userLevel - 1.5)} 到 L${Math.min(5, userLevel + 1.5)}），幫助系統了解用戶真實水平。`
    : '';

  return `
## 用戶信息

**當前水平**：L${userProfile.current_level.toFixed(1)}（基於 ${userProfile.total_games} 次遊戲的實際表現）
**基線水平**：L${userProfile.baseline_level}（註冊時評估）
**信心度**：${userProfile.confidence || 'medium'}${explorationNote}

## 故事情境

**主題**：${storyTheme}
**當前輪次**：第 ${currentRound} 輪

**對話歷史**：
${historyText}

**用戶剛剛**：
- 句子："${userSentence}"
- 選詞："${selectedWord}"

## 本次會話已使用詞語（不可重複推薦）

${usedWords.length > 0 ? usedWords.join('、') : '暫無'}

## 你的任務

### 任務 1：創作故事續句
基於用戶句子"${userSentence}"和選詞"${selectedWord}"，創作一個精彩的故事續句。

要求：
- 長度：15-30字
- 風格：適合用戶水平 L${userProfile.current_level.toFixed(1)}
- 連貫：自然銜接前面的情節
- 亮點：可以暗示接下來推薦的某個詞語

### 任務 2：推薦 5 個詞語
基於故事情境和用戶水平，推薦 5 個詞語供用戶選擇下一輪使用。

推薦策略：
- 難度中心：L${userProfile.current_level.toFixed(1)}
- 難度範圍：L${Math.max(1, userProfile.current_level - 1)} 到 L${Math.min(5, userProfile.current_level + 1.5)}
- 難度分布：梯度分布（例如：L2, L3, L3, L4, L4）
- 情境相關：能融入剛創作的故事句子
- 完全去重：不能包含已使用的詞語

${skipFeedback ? '' : `
### 任務 3：評分與反饋
- score：1-10分，評估句子質量（創意、流暢度、用詞）
- feedback：簡短評語（20字內），鼓勵為主
`}

請按照 JSON 格式返回。
`.trim()
}

