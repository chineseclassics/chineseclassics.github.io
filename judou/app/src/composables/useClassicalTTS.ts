/**
 * 句豆：文言文 TTS 發音修正
 * 
 * 說明：
 * - 文言文中有些字的讀音與現代漢語不同
 * - 此模組在調用 TTS 前將多音字替換為同音字，確保正確發音
 * - 僅用於句豆應用，不影響其他太虛幻境應用
 * 
 * 使用方式：
 *   import { applyClassicalFixes, classicalSpeak, classicalPreload } from '@/composables/useClassicalTTS'
 *   
 *   // 方式一：直接使用封裝的函數
 *   await classicalSpeak('武陵人捕魚為業', { rate: 0.8 })
 *   
 *   // 方式二：手動處理文本
 *   const fixedText = applyClassicalFixes('武陵人捕魚為業')
 *   await taixuSpeak(fixedText, { rate: 0.8 })
 */

// 文言文發音修正映射表
// key: 要匹配的詞語, value: 替換用的同音詞
const CLASSICAL_PRONUNCIATION_FIXES: Record<string, string> = {
  // 「為」讀 wéi（第二聲）的情況 → 用「維」替換
  '為業': '維業',
  '為人': '維人',
  '以為': '以維',
  '成為': '成維',
  '作為': '作維',
  '為官': '維官',
  '為師': '維師',
  '為學': '維學',
  
  // 「得」在文言文中讀 dé（第二聲）→ 用「德」替換
  // 現代漢語中「得」常讀輕聲（如「跑得快」），但文言文中多讀 dé
  '得': '德',
  
  // 「地」在文言文中讀 dì（第四聲）→ 用「帝」替換
  // 現代漢語中「地」作助詞時讀輕聲（如「慢慢地走」），但文言文中讀 dì
  '地': '帝',
  
  // 可繼續添加更多規則...
}

/**
 * 應用文言文發音修正
 * @param text 原始文本
 * @returns 修正後的文本（供 TTS 使用）
 */
export function applyClassicalFixes(text: string): string {
  let result = text
  for (const [word, replacement] of Object.entries(CLASSICAL_PRONUNCIATION_FIXES)) {
    if (result.includes(word)) {
      result = result.split(word).join(replacement)
    }
  }
  return result
}

/**
 * 文言文專用 TTS 朗讀
 * 自動應用發音修正後調用 taixuSpeak
 */
export async function classicalSpeak(text: string, opts: Record<string, unknown> = {}): Promise<boolean> {
  const fixedText = applyClassicalFixes(text)
  
  if (typeof window !== 'undefined' && (window as any).taixuSpeak) {
    return await (window as any).taixuSpeak(fixedText, opts)
  }
  
  console.warn('taixuSpeak 不可用')
  return false
}

/**
 * 文言文專用 TTS 預加載
 * 自動應用發音修正後調用 taixuPreload
 */
export async function classicalPreload(text: string, opts: Record<string, unknown> = {}): Promise<boolean> {
  const fixedText = applyClassicalFixes(text)
  
  if (typeof window !== 'undefined' && (window as any).taixuPreload) {
    return await (window as any).taixuPreload(fixedText, opts)
  }
  
  return false
}

/**
 * 停止 TTS 播放
 */
export function classicalStopSpeak(): void {
  if (typeof window !== 'undefined' && (window as any).taixuStopSpeak) {
    (window as any).taixuStopSpeak()
  }
}

