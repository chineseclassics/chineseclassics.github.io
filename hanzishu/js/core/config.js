// 核心配置與資料

export const levelSystem = [
    { level: 1, name: '墨韻初心', minPoints: 0, maxPoints: 99, color: '#FF6B9D' },
    { level: 2, name: '筆墨新手', minPoints: 100, maxPoints: 299, color: '#4DABF7' },
    { level: 3, name: '字海探索', minPoints: 300, maxPoints: 599, color: '#51CF66' },
    { level: 4, name: '詞韻小成', minPoints: 600, maxPoints: 999, color: '#FFD43B' },
    { level: 5, name: '墨香書生', minPoints: 1000, maxPoints: 1999, color: '#FF8787' },
    { level: 6, name: '文字達人', minPoints: 2000, maxPoints: 3499, color: '#9775FA' },
    { level: 7, name: '筆韻大師', minPoints: 3500, maxPoints: 5499, color: '#20C997' },
    { level: 8, name: '墨寶學者', minPoints: 5500, maxPoints: 7999, color: '#FD7E14' },
    { level: 9, name: '字聖傳人', minPoints: 8000, maxPoints: 9999, color: '#E03131' },
    { level: 10, name: '墨寶宗師', minPoints: 10000, maxPoints: 999999, color: '#FFD700' }
];

export const achievementCategories = {
    basic: {
        name: '基礎探索',
        achievements: [
            { id: 'first_character', name: '初識漢字', desc: '查詢第一個漢字', points: 20, icon: '🔤' },
            { id: 'first_word', name: '詞海初航', desc: '查詢第一個詞語', points: 20, icon: '📖' },
            { id: 'first_collection', name: '珍藏墨寶', desc: '收藏第一個字詞', points: 20, icon: '💎' },
            { id: 'first_login', name: '每日墨香', desc: '完成每日登入', points: 20, icon: '🌅' }
        ]
    },
    stroke: {
        name: '筆順修煉',
        achievements: [
            { id: 'stroke_beginner', name: '筆順啟蒙', desc: '完成5次筆順練習', points: 50, icon: '✏️', requirement: 5 },
            { id: 'stroke_intermediate', name: '筆法小成', desc: '完成20次筆順練習', points: 100, icon: '🖌️', requirement: 20 },
            { id: 'stroke_advanced', name: '筆順大師', desc: '完成50次筆順練習', points: 200, icon: '🎨', requirement: 50 },
            { id: 'stroke_master', name: '筆韻宗師', desc: '完成100次筆順練習', points: 300, icon: '🏆', requirement: 100 }
        ]
    },
    memory: {
        name: '記憶挑戰',
        achievements: [
            { id: 'memory_first', name: '記憶初試', desc: '完成第一場記憶遊戲', points: 30, icon: '🧠' },
            { id: 'memory_good', name: '過目不忘', desc: '完成10場記憶遊戲', points: 80, icon: '💭', requirement: 10 },
            { id: 'memory_expert', name: '記憶達人', desc: '完成25場記憶遊戲', points: 150, icon: '🎯', requirement: 25 },
            { id: 'memory_legend', name: '記憶傳說', desc: '完成50場記憶遊戲', points: 250, icon: '⭐', requirement: 50 }
        ]
    },
    radical: {
        name: '部首遊戲',
        achievements: [
            { id: 'radical_first', name: '部首初探', desc: '完成第一場部首遊戲', points: 30, icon: '🔍' },
            { id: 'radical_builder', name: '造字工匠', desc: '完成15場部首遊戲', points: 100, icon: '🔨', requirement: 15 },
            { id: 'radical_master', name: '字構大師', desc: '完成30場部首遊戲', points: 180, icon: '🏗️', requirement: 30 }
        ]
    },
    learning: {
        name: '學習里程',
        achievements: [
            { id: 'char_collector', name: '字海拾貝', desc: '學習50個漢字', points: 100, icon: '🐚', requirement: 50 },
            { id: 'char_scholar', name: '字庫豐富', desc: '學習150個漢字', points: 200, icon: '📚', requirement: 150 },
            { id: 'char_master', name: '字海博學', desc: '學習300個漢字', points: 350, icon: '🎓', requirement: 300 },
            { id: 'word_starter', name: '詞彙初豐', desc: '學習30個詞語', points: 80, icon: '🌱', requirement: 30 },
            { id: 'word_expert', name: '詞海暢遊', desc: '學習100個詞語', points: 180, icon: '🌊', requirement: 100 }
        ]
    },
    collection: {
        name: '收藏成就',
        achievements: [
            { id: 'collector', name: '墨寶收藏家', desc: '收藏20個字詞', points: 120, icon: '📦', requirement: 20 },
            { id: 'treasure_hunter', name: '珍藏大師', desc: '收藏50個字詞', points: 250, icon: '💰', requirement: 50 },
            { id: 'archive_keeper', name: '墨寶典藏', desc: '收藏100個字詞', points: 400, icon: '🏛️', requirement: 100 }
        ]
    },
    daily: {
        name: '每日堅持',
        achievements: [
            { id: 'streak_3', name: '三日墨香', desc: '連續登入3天', points: 60, icon: '🔥', requirement: 3 },
            { id: 'streak_7', name: '一週堅持', desc: '連續登入7天', points: 140, icon: '📅', requirement: 7 },
            { id: 'streak_30', name: '月圓墨滿', desc: '連續登入30天', points: 500, icon: '🌕', requirement: 30 }
        ]
    },
    exploration: {
        name: '功能探索',
        achievements: [
            { id: 'explorer', name: '功能探索者', desc: '使用所有主要功能', points: 150, icon: '🗺️' },
            { id: 'game_master', name: '遊戲全能', desc: '玩過所有遊戲模式', points: 120, icon: '🎮' }
        ]
    },
    special: {
        name: '特殊成就',
        achievements: [
            { id: 'lightning_memory', name: '閃電記憶', desc: '記憶遊戲5秒內完成', points: 100, icon: '⚡' },
            { id: 'perfectionist', name: '完美主義', desc: '連續10次完美遊戲', points: 200, icon: '💯' },
            { id: 'night_owl', name: '夜讀墨香', desc: '晚上10點後學習', points: 80, icon: '🌙' },
            { id: 'early_bird', name: '晨讀書香', desc: '早上6點前學習', points: 80, icon: '🌅' }
        ]
    }
};

export const pointRewards = {
    characterLookup: 2,
    wordLookup: 3,
    strokePractice: 5,
    memoryGame: 10,
    memoryGamePerfect: 20,
    radicalGame: 15,
    radicalGamePerfect: 25,
    collection: 8,
    dailyLogin: 10,
    streakBonus: 5,
    firstTime: 20
};

export const calligraphyData = [
    { char: '道', style: 'kaishu', author: '顏真卿', work: '《多寶塔碑》', dynasty: '唐' },
    { char: '德', style: 'kaishu', author: '柳公權', work: '《玄秘塔碑》', dynasty: '唐' },
    { char: '天', style: 'xingshu', author: '王羲之', work: '《蘭亭序》', dynasty: '東晉' },
    { char: '地', style: 'caoshu', author: '張旭', work: '《古詩四帖》', dynasty: '唐' },
    { char: '人', style: 'kaishu', author: '褚遂良', work: '《雁塔聖教序》', dynasty: '唐' },
    { char: '心', style: 'lishu', author: '蔡邕', work: '《熹平石經》', dynasty: '漢' },
    { char: '山', style: 'kaishu', author: '褚遂良', work: '《雁塔聖教序》', dynasty: '唐' },
    { char: '水', style: 'xingshu', author: '米芾', work: '《蜀素帖》', dynasty: '宋' },
    { char: '大', style: 'zhuanshu', author: '李斯', work: '《泰山刻石》', dynasty: '秦' },
    { char: '小', style: 'kaishu', author: '趙孟頫', work: '《洛神賦》', dynasty: '元' },
    { char: '美', style: 'xingshu', author: '懷素', work: '《自敘帖》', dynasty: '唐' },
    { char: '善', style: 'kaishu', author: '顏真卿', work: '《顏氏家廟碑》', dynasty: '唐' }
];

export const meaningfulCharacters = [
    // 基礎積極品格特質 (適合中小學生的重要品德)
    '好', '善', '真', '美', '勇', '誠', '勤', '孝', '友', '禮',
    '信', '愛', '恩', '仁', '和', '忍', '謙', '志', '樂', '智',

    // 學校生活
    '學', '校', '讀', '寫', '算', '課', '班', '同', '書', '筆',
    '本', '紙', '桌', '椅', '考', '問', '答', '習', '思', '教',

    // 家庭生活
    '家', '爸', '媽', '父', '母', '兄', '姊', '弟', '妹', '親',
    '愛', '笑', '飯', '房', '床', '玩', '聊', '休', '看', '聽',

    // 常見物品與事物
    '書', '筆', '球', '車', '話', '門', '窗', '鞋', '帽', '杯',
    '碗', '盤', '電', '機', '包', '傘', '燈', '鐘', '布', '被',

    // 身體健康
    '身', '體', '頭', '手', '腳', '眼', '耳', '口', '鼻', '心',
    '肺', '病', '痛', '康', '動', '靜', '跑', '跳', '走', '睡',

    // 食物飲食
    '飯', '菜', '肉', '湯', '麵', '果', '糖', '水', '茶', '餅',
    '魚', '蛋', '奶', '麪', '飲', '吃', '喝', '甜', '酸', '辣',

    // 情緒與感受 (簡化為中小學生常用)
    '笑', '哭', '怒', '喜', '樂', '悲', '好', '壞', '煩', '怕',
    '想', '念', '急', '慢', '忙', '閒', '累', '困', '驚', '疑',

    // 自然與環境
    '天', '地', '日', '月', '星', '風', '雨', '雪', '雲', '山',
    '水', '海', '河', '花', '草', '樹', '木', '林', '蟲', '鳥',

    // 時間與季節
    '年', '月', '日', '時', '分', '秒', '早', '晚', '春', '夏',
    '秋', '冬', '冷', '熱', '暖', '涼', '快', '慢', '前', '後',

    // 顏色與形狀
    '紅', '黃', '藍', '綠', '白', '黑', '紫', '橙', '圓', '方',
    '長', '短', '高', '低', '大', '小', '多', '少', '深', '淺',

    // 數位科技 (中小學生常接觸)
    '網', '遊', '視', '聽', '電', '話', '機', '影', '片', '拍',
    '照', '傳', '信', '息', '訊', '玩', '打', '按', '查', '搜',

    // 學習動作
    '讀', '寫', '看', '聽', '說', '想', '記', '背', '畫', '做',
    '問', '答', '想', '創', '學', '教', '練', '習', '思', '考',

    // 社交互動
    '朋', '友', '同', '學', '師', '幫', '助', '謝', '請', '好',
    '會', '見', '聚', '分', '享', '送', '拿', '給', '問', '答',

    // 休閒活動
    '玩', '跳', '跑', '跨', '爬', '畫', '唱', '聽', '看', '玩',
    '騎', '踢', '遊', '玩', '笑', '舞', '跳', '打', '游', '戲'
];
