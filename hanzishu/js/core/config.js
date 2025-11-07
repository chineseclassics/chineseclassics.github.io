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
