/**
 * L1-L5 難度分級體系
 * 基於中文母語者認知發展，不參考 HSK
 * 對應 5 個年級階段
 */

export const DIFFICULTY_LEVELS = {
  L1: {
    level: 1,
    name: '低年級',
    age: '6-8歲',
    grades: [1, 2, 3],
    characteristics: {
      wordFrequency: '前1000詞',
      wordLength: '1-2字',
      wordTypes: '動詞、名詞為主',
      cognitiveLevel: '具體思維',
      contexts: ['日常生活', '家庭', '學校']
    },
    examples: [
      // 動詞
      '吃', '喝', '玩', '跑', '跳', '笑', '哭', '睡',
      // 名詞
      '媽媽', '爸爸', '老師', '朋友', '學校', '家',
      // 形容詞
      '好', '大', '小', '高興', '快樂', '漂亮'
    ],
    boundaryWords: [
      // L1/L2 邊界詞（稍難）
      '勇敢', '努力', '聰明', '美麗'
    ]
  },
  
  L2: {
    level: 2,
    name: '中年級',
    age: '9-11歲',
    grades: [4, 5, 6],
    characteristics: {
      wordFrequency: '1000-3000詞',
      wordLength: '2-3字',
      wordTypes: '增加形容詞、狀態動詞',
      cognitiveLevel: '抽象思維萌芽',
      contexts: ['冒險故事', '校園', '自然']
    },
    examples: [
      // 動詞
      '探險', '發現', '奔跑', '尋找', '觀察', '嘗試',
      // 形容詞
      '勇敢', '神秘', '美麗', '驚訝', '好奇', '溫暖',
      // 名詞
      '森林', '山脈', '海洋', '夢想', '勇氣', '智慧'
    ],
    boundaryWords: [
      // L2/L3 邊界詞
      '寧靜', '探索', '欣賞', '感受'
    ]
  },
  
  L3: {
    level: 3,
    name: '初中',
    age: '12-14歲',
    grades: [7, 8, 9],
    characteristics: {
      wordFrequency: '3000-5000詞',
      wordLength: '2-4字',
      wordTypes: '描寫形容詞、心理動詞',
      cognitiveLevel: '抽象思維成熟',
      contexts: ['文學閱讀', '作文', '情感表達']
    },
    examples: [
      // 動詞
      '凝視', '沉思', '徘徊', '思索', '追尋', '領悟',
      // 形容詞
      '寧靜', '幽靜', '壯麗', '朦朧', '深邃', '清澈',
      // 名詞
      '遺跡', '蒼穹', '心靈', '思緒', '記憶', '時光'
    ],
    boundaryWords: [
      // L3/L4 邊界詞
      '眷戀', '滄桑', '璀璨', '蛻變'
    ]
  },
  
  L4: {
    level: 4,
    name: '高中',
    age: '15-17歲',
    grades: [10, 11, 12],
    characteristics: {
      wordFrequency: '5000-8000詞',
      wordLength: '3-4字、成語',
      wordTypes: '文學形容詞、抽象動詞',
      cognitiveLevel: '書面語成熟',
      contexts: ['散文', '議論文', '詩歌']
    },
    examples: [
      // 動詞
      '翱翔', '蛻變', '徜徉', '遨遊', '飄渺', '凋零',
      // 形容詞
      '滄桑', '蔥蘢', '璀璨', '斑斕', '蒼茫', '悵惘',
      // 名詞
      '歲月', '塵埃', '繁華', '虛無', '永恆', '瞬間'
    ],
    boundaryWords: [
      // L4/L5 邊界詞
      '悠然', '斟酌', '婉約', '旖旎'
    ]
  },
  
  L5: {
    level: 5,
    name: '大學及以上',
    age: '18歲+',
    grades: [13], // 大學
    characteristics: {
      wordFrequency: '8000+詞、生僻詞',
      wordLength: '文言雙音、四字成語',
      wordTypes: '典雅書面語、文言色彩',
      cognitiveLevel: '文學鑑賞、學術寫作',
      contexts: ['古典文學', '學術論文', '詩詞創作']
    },
    examples: [
      // 文言色彩
      '悠然', '斟酌', '惘然', '恣意', '婆娑', '翩躚',
      // 典雅詞彙
      '漣漪', '婉約', '旖旎', '綺麗', '雋永', '嫵媚',
      // 四字成語
      '躊躇滿志', '蜿蜒曲折', '婆娑起舞', '煙波浩渺'
    ],
    boundaryWords: []
  }
};

/**
 * 獲取難度級別信息
 * @param {number} level - 難度等級 (1-5)
 * @returns {Object} 難度信息
 */
export function getDifficultyInfo(level) {
  const key = `L${Math.round(level)}`;
  return DIFFICULTY_LEVELS[key] || DIFFICULTY_LEVELS.L2;
}

/**
 * 根據年級獲取建議難度
 * @param {number} grade - 年級 (1-13)
 * @returns {number} 建議難度 (1-5)
 */
export function getDifficultyByGrade(grade) {
  if (grade <= 3) return 1;
  if (grade <= 6) return 2;
  if (grade <= 9) return 3;
  if (grade <= 12) return 4;
  return 5;
}

/**
 * 獲取難度範圍（用於推薦詞語）
 * @param {number} baseLevel - 基準難度
 * @param {boolean} explorationMode - 是否為探索模式
 * @returns {Object} {min, max, center}
 */
export function getDifficultyRange(baseLevel, explorationMode = false) {
  const adjustment = explorationMode ? 1.5 : 1.0;
  
  return {
    min: Math.max(1, baseLevel - adjustment),
    max: Math.min(5, baseLevel + adjustment),
    center: baseLevel
  };
}

/**
 * 判斷詞語是否在難度範圍內
 * @param {number} wordDifficulty - 詞語難度
 * @param {number} baseLevel - 基準難度
 * @param {boolean} explorationMode - 是否為探索模式
 * @returns {boolean}
 */
export function isInDifficultyRange(wordDifficulty, baseLevel, explorationMode = false) {
  const range = getDifficultyRange(baseLevel, explorationMode);
  return wordDifficulty >= range.min && wordDifficulty <= range.max;
}

