// =====================================================
// 应用配置文件
// =====================================================

// Supabase 配置
// 注意：这些是公开的 anon key，可以安全地放在前端
// 真正的安全性由 Row Level Security (RLS) 保证
export const SUPABASE_CONFIG = {
  url: 'https://bjykaipbeokbbykvseyr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqeWthaXBiZW9rYmJ5a3ZzZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODE2MDcsImV4cCI6MjA3NTM1NzYwN30.VxP43mDaXAldw4fJgd22-L8UnTFkbHJANLXHe38In_I'
};

// API 端点
export const API_ENDPOINTS = {
  storyAgent: '/functions/v1/story-agent',
  storyAgentMultiplayer: '/functions/v1/story-agent-multiplayer' // 预留
};

// 应用配置
export const APP_CONFIG = {
  name: '智慧故事坊',
  version: '1.0.0-mvp',
  
  // 故事设置
  story: {
    minRounds: 12,
    maxRounds: 18,
    defaultRounds: 15,
    segments: 3, // 三段式结构
    
    // 每轮超时时间（秒）
    timeout: 120,
    
    // AI 回应长度
    aiResponseMinLength: 60,
    aiResponseMaxLength: 120
  },
  
  // 词汇设置
  vocabulary: {
    optionsPerRound: 4, // 每轮推荐4个词
    
    // 多样性配置
    diversity: {
      action: 1,      // 动作类 1个
      emotion: 1,     // 情感类 1个
      description: 1, // 描写类 1个
      flexible: 1     // 灵活类 1个（根据剧情）
    },
    
    // 难度分布
    difficultyMix: {
      review: 0.20,   // 20% 复习词（低一级）
      current: 0.70,  // 70% 当前水平
      challenge: 0.10 // 10% 挑战词（高一级）
    }
  },
  
  // 创意度评分权重
  creativity: {
    weights: {
      vocabularyDiversity: 0.20,  // 词汇多样性
      plotUniqueness: 0.35,       // 情节独特性
      userInitiative: 0.20,       // 用户主动创新
      aiDiversity: 0.15,          // AI 多样性
      unexpectedTwists: 0.10      // 意外转折
    },
    
    // 评分等级
    grades: {
      excellent: 85,
      good: 70,
      average: 60,
      needsImprovement: 50
    }
  },
  
  // MVP 支持的情境
  scenarios: {
    natural_exploration: {
      id: 'natural_exploration',
      name: '自然探险',
      emoji: '🐕',
      choices: [
        {
          id: 'animal_talk',
          text: '能听懂动物说话',
          description: '发现动物们的秘密世界...',
          variants: 3 // 3种不同开场
        }
      ],
      themes: ['natural', 'animal', 'emotion']
    },
    
    adventure_quest: {
      id: 'adventure_quest',
      name: '冒险探索',
      emoji: '🗺️',
      choices: [
        {
          id: 'mysterious_map',
          text: '发现一张神秘地图',
          description: '地图上标记着未知的宝藏...',
          variants: 3
        }
      ],
      themes: ['adventure', 'exploration', 'courage']
    },
    
    fantasy_dream: {
      id: 'fantasy_dream',
      name: '奇幻梦境',
      emoji: '💫',
      choices: [
        {
          id: 'strange_dream',
          text: '做了一个奇怪的梦',
          description: '梦里的世界竟然是真的...',
          variants: 3
        }
      ],
      themes: ['fantasy', 'imagination', 'magic']
    }
  },
  
  // MVP 支持的等级
  levels: {
    L2: {
      level: 2,
      name: '基础',
      ageRange: '9-10岁',
      grade: '4-5年级',
      storyLength: 15,
      sentenceLength: { min: 5, max: 15 }
    },
    L3: {
      level: 3,
      name: '进阶',
      ageRange: '11-12岁',
      grade: '6年级',
      storyLength: 18,
      sentenceLength: { min: 10, max: 30 }
    }
  },
  
  // 本地存储键名
  storage: {
    userId: 'story_vocab_user_id',
    username: 'story_vocab_username',
    currentSession: 'story_vocab_current_session',
    settings: 'story_vocab_settings'
  }
};

// 萌典 API 配置
export const MOEDICT_API = {
  baseUrl: 'https://www.moedict.tw',
  endpoints: {
    lookup: '/uni/{word}',
    radical: '/radical/{radical}'
  }
};

// 开发模式配置
export const DEV_CONFIG = {
  enableDebugLogs: true,
  mockApiResponses: false, // 设为 true 可以用假数据测试
  showPerformanceMetrics: true
};

// 辅助函数：检查配置是否完整
export function validateConfig() {
  const errors = [];
  
  if (!SUPABASE_CONFIG.url) {
    errors.push('❌ Supabase URL 未配置');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    errors.push('❌ Supabase Anon Key 未配置');
  }
  
  if (errors.length > 0) {
    console.error('配置验证失败：');
    errors.forEach(err => console.error(err));
    return false;
  }
  
  console.log('✅ 配置验证通过');
  return true;
}

// =====================================================
// 年級分級主題配置
// =====================================================

/**
 * 5個階段的主題配置
 * 每個階段對應不同年級，有專屬的故事主題
 */
export const GRADE_THEMES = {
  // 低年級（1-3年級，6-8歲）
  elementary_lower: {
    name: '低年級',
    grades: [1, 2, 3],
    ageRange: '6-8歲',
    themes: [
      {
        id: 'cute_animals',
        name: '可愛動物',
        icon: '🐱',
        description: '與可愛的小動物一起玩耍',
        gradient: 'from-pink-400 to-rose-500',
        keywords: ['動物', '玩耍', '可愛', '朋友']
      },
      {
        id: 'school_life',
        name: '校園生活',
        icon: '🏫',
        description: '學校裡發生的有趣故事',
        gradient: 'from-blue-400 to-cyan-500',
        keywords: ['學校', '同學', '老師', '學習']
      },
      {
        id: 'family_daily',
        name: '家庭日常',
        icon: '🏠',
        description: '溫馨的家庭時光',
        gradient: 'from-amber-400 to-orange-500',
        keywords: ['家人', '溫暖', '日常', '快樂']
      },
      {
        id: 'toy_world',
        name: '玩具世界',
        icon: '🧸',
        description: '玩具們的奇妙冒險',
        gradient: 'from-purple-400 to-pink-500',
        keywords: ['玩具', '想象', '冒險', '神奇']
      },
      {
        id: 'no_theme',
        name: '無主題模式',
        icon: '✨',
        description: '自由創作，讓想象飛翔',
        gradient: 'from-slate-400 to-slate-600',
        keywords: []
      }
    ]
  },
  
  // 中年級（4-6年級，9-11歲）
  elementary_upper: {
    name: '中年級',
    grades: [4, 5, 6],
    ageRange: '9-11歲',
    themes: [
      {
        id: 'natural_exploration',
        name: '自然探索',
        icon: '🌲',
        description: '探索大自然的奧秘',
        gradient: 'from-green-400 to-emerald-600',
        keywords: ['森林', '探險', '發現', '大自然']
      },
      {
        id: 'school_adventure',
        name: '校園冒險',
        icon: '📚',
        description: '學校裡的奇妙發現',
        gradient: 'from-indigo-400 to-purple-600',
        keywords: ['學校', '冒險', '謎團', '友誼']
      },
      {
        id: 'science_discovery',
        name: '科學發現',
        icon: '🔬',
        description: '科學實驗的奇妙世界',
        gradient: 'from-cyan-400 to-blue-600',
        keywords: ['科學', '實驗', '發現', '探索']
      },
      {
        id: 'friendship',
        name: '友誼故事',
        icon: '🤝',
        description: '關於友情的溫暖故事',
        gradient: 'from-rose-400 to-pink-600',
        keywords: ['朋友', '友誼', '幫助', '成長']
      },
      {
        id: 'no_theme',
        name: '無主題模式',
        icon: '✨',
        description: '自由創作，讓想象飛翔',
        gradient: 'from-slate-400 to-slate-600',
        keywords: []
      }
    ]
  },
  
  // 初中（7-9年級，12-14歲）
  middle_school: {
    name: '初中',
    grades: [7, 8, 9],
    ageRange: '12-14歲',
    themes: [
      {
        id: 'fantasy_adventure',
        name: '奇幻冒險',
        icon: '🗺️',
        description: '充滿魔法與奇蹟的世界',
        gradient: 'from-purple-500 to-indigo-700',
        keywords: ['奇幻', '魔法', '冒險', '勇氣']
      },
      {
        id: 'growth_story',
        name: '成長故事',
        icon: '🌱',
        description: '探索內心的成長之旅',
        gradient: 'from-green-500 to-teal-700',
        keywords: ['成長', '思考', '夢想', '選擇']
      },
      {
        id: 'future_tech',
        name: '未來科技',
        icon: '🚀',
        description: '科技改變世界的故事',
        gradient: 'from-blue-500 to-cyan-700',
        keywords: ['科技', '未來', '創新', '探索']
      },
      {
        id: 'mystery',
        name: '推理懸疑',
        icon: '🔍',
        description: '解開謎團的推理之旅',
        gradient: 'from-slate-500 to-gray-700',
        keywords: ['謎團', '推理', '線索', '真相']
      },
      {
        id: 'no_theme',
        name: '無主題模式',
        icon: '✨',
        description: '自由創作，讓想象飛翔',
        gradient: 'from-slate-400 to-slate-600',
        keywords: []
      }
    ]
  },
  
  // 高中（10-12年級，15-17歲）
  high_school: {
    name: '高中',
    grades: [10, 11, 12],
    ageRange: '15-17歲',
    themes: [
      {
        id: 'youth_literature',
        name: '青春文學',
        icon: '📖',
        description: '細膩描繪青春的心路歷程',
        gradient: 'from-rose-500 to-pink-700',
        keywords: ['青春', '情感', '思考', '選擇']
      },
      {
        id: 'social_observation',
        name: '社會觀察',
        icon: '🏙️',
        description: '觀察社會與人性',
        gradient: 'from-gray-500 to-slate-700',
        keywords: ['社會', '人性', '觀察', '思考']
      },
      {
        id: 'philosophical',
        name: '哲學思考',
        icon: '💭',
        description: '探討人生與存在的意義',
        gradient: 'from-indigo-500 to-purple-700',
        keywords: ['哲學', '存在', '意義', '思考']
      },
      {
        id: 'historical',
        name: '歷史穿越',
        icon: '⏳',
        description: '穿越時空的歷史故事',
        gradient: 'from-amber-500 to-orange-700',
        keywords: ['歷史', '穿越', '文化', '傳承']
      },
      {
        id: 'no_theme',
        name: '無主題模式',
        icon: '✨',
        description: '自由創作，讓想象飛翔',
        gradient: 'from-slate-400 to-slate-600',
        keywords: []
      }
    ]
  },
  
  // 成人（12+年級，18歲+）
  adult: {
    name: '成人',
    grades: [13],
    ageRange: '18歲+',
    themes: [
      {
        id: 'human_nature',
        name: '人性探索',
        icon: '🎭',
        description: '深入探討人性的複雜面向',
        gradient: 'from-purple-600 to-indigo-800',
        keywords: ['人性', '複雜', '深度', '矛盾']
      },
      {
        id: 'urban_reality',
        name: '都市現實',
        icon: '🌆',
        description: '當代都市生活的真實寫照',
        gradient: 'from-slate-600 to-gray-800',
        keywords: ['都市', '現實', '生活', '百態']
      },
      {
        id: 'poetic',
        name: '詩意表達',
        icon: '🌙',
        description: '用詩意的語言描繪世界',
        gradient: 'from-blue-600 to-indigo-800',
        keywords: ['詩意', '意境', '情感', '美學']
      },
      {
        id: 'experimental',
        name: '實驗創作',
        icon: '🎨',
        description: '打破常規的實驗性創作',
        gradient: 'from-pink-600 to-rose-800',
        keywords: ['實驗', '創新', '前衛', '自由']
      },
      {
        id: 'no_theme',
        name: '無主題模式',
        icon: '✨',
        description: '自由創作，讓想象飛翔',
        gradient: 'from-slate-400 to-slate-600',
        keywords: []
      }
    ]
  }
};

/**
 * 根據年級獲取對應的主題配置
 * @param {number} grade - 年級（1-13）
 * @returns {Object} - 主題配置對象
 */
export function getThemesForGrade(grade) {
  if (!grade || grade < 1 || grade > 13) {
    return GRADE_THEMES.elementary_upper; // 默認中年級
  }
  
  if (grade <= 3) return GRADE_THEMES.elementary_lower;
  if (grade <= 6) return GRADE_THEMES.elementary_upper;
  if (grade <= 9) return GRADE_THEMES.middle_school;
  if (grade <= 12) return GRADE_THEMES.high_school;
  return GRADE_THEMES.adult;
}

/**
 * 獲取主題的顯示名稱
 * @param {string} themeId - 主題 ID
 * @returns {string} - 主題名稱
 */
export function getThemeName(themeId) {
  for (const stage of Object.values(GRADE_THEMES)) {
    const theme = stage.themes.find(t => t.id === themeId);
    if (theme) return theme.name;
  }
  return '未知主題';
}

// 导出默认配置对象
export default {
  SUPABASE_CONFIG,
  API_ENDPOINTS,
  APP_CONFIG,
  MOEDICT_API,
  DEV_CONFIG,
  GRADE_THEMES,
  validateConfig,
  getThemesForGrade,
  getThemeName
};

