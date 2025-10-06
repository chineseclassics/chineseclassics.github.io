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

// 导出默认配置对象
export default {
  SUPABASE_CONFIG,
  API_ENDPOINTS,
  APP_CONFIG,
  MOEDICT_API,
  DEV_CONFIG,
  validateConfig
};

