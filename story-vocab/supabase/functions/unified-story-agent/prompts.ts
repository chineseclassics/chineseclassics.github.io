// =====================================================
// unified-story-agent Prompt 設計
// 同時生成故事句子和推薦詞語（L1-L5 體系）
// =====================================================

/**
 * 系統 Prompt：L1-L5 難度定義
 */
export const UNIFIED_SYSTEM_PROMPT = `
你是故事創作 AI，完成三個任務：創作故事續句、推薦詞語、標記學習詞。

## L1-L5 難度體系

**L1**（1-3年級）：日常詞，1-2字。例：吃、玩、跑、朋友、學校、高興
**L2**（4-6年級）：常用詞，2-3字。例：探險、發現、勇敢、神秘、驚訝、好奇
**L3**（7-9年級）：文學詞，2-4字。例：凝視、沉思、寧靜、幽靜、遺跡、蒼穹
**L4**（10-12年級）：書面語，3-4字。例：翱翔、蛻變、滄桑、璀璨、悵惘、歲月
**L5**（13年級+）：文言詞。例：悠然、斟酌、婉約、旖旎、雋永、躊躇滿志

## 三個任務

**任務 1：創作故事續句**（15-30字，自然流暢）
**任務 2：推薦 5 個詞**（難度梯度，情境相關，不重複）
**任務 3：標記學習詞**（0-2個，略高於用戶水平，不在詞卡中）

## 輸出格式

{
  "aiSentence": "...",
  "words": [{"word": "探索", "difficulty": 2}, ...],
  "highlight": ["泛黃"]
}

要求：
- 繁體中文
- words 恰好 5 個，difficulty 為 1-5 整數
- highlight 為 0-2 個詞的數組
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
  explorationMode: boolean = false
): string {
  // 構建對話歷史（最多顯示最近3句）
  const recentHistory = conversationHistory.slice(-3);
  const historyText = recentHistory.length > 0
    ? recentHistory.map((s, i) => `${i % 2 === 0 ? '用戶' : 'AI'}：${s}`).join('\n')
    : '故事剛開始';

  // 計算推薦範圍
  const rangeAdjust = explorationMode ? 1.5 : 1;
  const minDiff = Math.max(1, userProfile.current_level - rangeAdjust);
  const maxDiff = Math.min(5, userProfile.current_level + rangeAdjust);

  return `
用戶：L${userProfile.current_level.toFixed(1)}，第 ${currentRound} 輪${explorationMode ? '（探索期）' : ''}

故事：${storyTheme}
${historyText}

用戶剛說："${userSentence}"（用詞：${selectedWord}）
已用詞：${usedWords.length > 0 ? usedWords.join('、') : '無'}

任務：
1. 創作續句（15-30字）
2. 推薦 5 詞（難度 L${minDiff}-${maxDiff}，梯度分布，不重複）
3. 標記學習詞（0-2個，略難，不在詞卡中）

示例輸出：
{"aiSentence":"他翻開日記本，發現裡面畫著一張神秘的地圖。","words":[{"word":"探索","difficulty":2}...],"highlight":["日記本"]}
`.trim()
}

