// =====================================
// 碧城・煉夢錄 - 詩歌與意象數據庫
// =====================================

// 基礎意象池（拾遺囊中的碎片）
const BASE_IMAGERY = [
    { id: 'bashan', name: '巴山', emoji: '⛰️', description: '重慶一帶的山，象徵遙遠的距離與思念' },
    { id: 'yeyu', name: '夜雨', emoji: '🌧️', description: '夜晚的雨，象徵孤獨與思念的綿延' },
    { id: 'xichuang', name: '西窗', emoji: '🪟', description: '西邊的窗戶，象徵重逢與共話的期待' },
    { id: 'laju', name: '蠟炬', emoji: '🕯️', description: '蠟燭，象徵奉獻與燃燒至盡的執著' },
    { id: 'chuncan', name: '春蠶', emoji: '🐛', description: '春天的蠶，象徵至死不渝的深情' },
    { id: 'zhuangsheng', name: '莊生', emoji: '🧘', description: '莊周，象徵夢境與現實的模糊' },
    { id: 'hudie', name: '蝴蝶', emoji: '🦋', description: '蝴蝶，象徵夢境與幻象' },
    { id: 'canghai', name: '滄海', emoji: '🌊', description: '大海，象徵廣闊與永恆' },
    { id: 'mingzhu', name: '明珠', emoji: '💎', description: '明亮的珍珠，象徵珍貴與淚水' },
    { id: 'lantian', name: '藍田', emoji: '🏔️', description: '藍田山，產玉之地，象徵美好與遙遠' },
    { id: 'riwen', name: '日暖', emoji: '☀️', description: '溫暖的陽光，象徵美好與希望' },
    { id: 'pengshan', name: '蓬山', emoji: '🏛️', description: '蓬萊仙山，象徵遙不可及的仙境' },
    { id: 'qingniao', name: '青鳥', emoji: '🐦', description: '青鳥，傳說中的信使，象徵希望與傳訊' },
    { id: 'lingxi', name: '靈犀', emoji: '🦏', description: '犀牛角，象徵心靈相通' },
    { id: 'xin', name: '心', emoji: '❤️', description: '心，象徵情感與思念' },
    { id: 'jinse', name: '錦瑟', emoji: '🎹', description: '裝飾華美的瑟，象徵回憶與華年' },
    { id: 'dujuan', name: '杜鵑', emoji: '🐦', description: '杜鵑鳥，象徵哀怨與春心' },
    { id: 'xiaojing', name: '曉鏡', emoji: '🪞', description: '早晨的鏡子，象徵時光流逝與容顏改變' },
    { id: 'yueguang', name: '月光', emoji: '🌙', description: '月光，象徵清冷與孤獨' },
    { id: 'xingchen', name: '星辰', emoji: '⭐', description: '星星，象徵美好時光與回憶' },
    { id: 'huafeng', name: '畫鳳', emoji: '🦅', description: '彩色的鳳凰，象徵美好與渴望' },
    { id: 'shennv', name: '神女', emoji: '👸', description: '巫山神女，象徵夢境與虛幻' },
    { id: 'changhe', name: '嫦娥', emoji: '🌙', description: '嫦娥，象徵孤獨與後悔' },
    { id: 'biyun', name: '碧雲', emoji: '☁️', description: '青綠色的雲，象徵仙境與朦朧' }
];

// 配方系統（兩個意象組合可合成一首詩）
const RECIPES = [
    {
        id: 'yeyujibei',
        title: '夜雨寄北',
        ingredients: ['bashan', 'yeyu'],
        poem: [
            '君問歸期未有期，',
            '巴山夜雨漲秋池。',
            '何當共剪西窗燭，',
            '卻話巴山夜雨時。'
        ],
        narrative: '那是一個秋夜，巴山的雨漲滿了池塘。我多麼希望此刻能與你共剪西窗燭火，訴說這巴山夜雨時的思念。',
        imagery: '思念、重逢的渴望',
        unlockItems: ['xichuang']
    },
    {
        id: 'wuti_chuncan',
        title: '無題（春蠶）',
        ingredients: ['chuncan', 'laju'],
        poem: [
            '相見時難別亦難，',
            '東風無力百花殘。',
            '春蠶到死絲方盡，',
            '蠟炬成灰淚始乾。',
            '曉鏡但愁雲鬢改，',
            '夜吟應覺月光寒。',
            '蓬山此去無多路，',
            '青鳥殷勤為探看。'
        ],
        narrative: '春蠶吐絲至死方休，蠟燭燃燒成灰才停止流淚。這份深情，如同春蠶的絲，如同蠟燭的淚，至死不渝。',
        imagery: '至死不渝的深情、奉獻',
        unlockItems: ['xiaojing', 'yueguang', 'pengshan', 'qingniao']
    },
    {
        id: 'jinse_zhuangsheng',
        title: '錦瑟（莊生）',
        ingredients: ['zhuangsheng', 'hudie'],
        poem: [
            '錦瑟無端五十弦，',
            '一弦一柱思華年。',
            '莊生曉夢迷蝴蝶，',
            '望帝春心托杜鵑。',
            '滄海月明珠有淚，',
            '藍田日暖玉生煙。',
            '此情可待成追憶，',
            '只是當時已惘然。'
        ],
        narrative: '莊周夢見自己變成了蝴蝶，醒來後不知是莊周夢見了蝴蝶，還是蝴蝶夢見了莊周。人生如夢，夢如人生。',
        imagery: '夢境與現實的模糊、人生如夢',
        unlockItems: ['jinse', 'dujuan']
    },
    {
        id: 'jinse_canghai',
        title: '錦瑟（滄海）',
        ingredients: ['canghai', 'mingzhu'],
        poem: [
            '錦瑟無端五十弦，',
            '一弦一柱思華年。',
            '莊生曉夢迷蝴蝶，',
            '望帝春心托杜鵑。',
            '滄海月明珠有淚，',
            '藍田日暖玉生煙。',
            '此情可待成追憶，',
            '只是當時已惘然。'
        ],
        narrative: '滄海中的明珠，在月光下閃爍著淚光。那些珍貴的回憶，如同明珠般閃亮，卻也帶著淚水的苦澀。',
        imagery: '珍貴的回憶、淚水與美好',
        unlockItems: ['jinse']
    },
    {
        id: 'jinse_lantian',
        title: '錦瑟（藍田）',
        ingredients: ['lantian', 'riwen'],
        poem: [
            '錦瑟無端五十弦，',
            '一弦一柱思華年。',
            '莊生曉夢迷蝴蝶，',
            '望帝春心托杜鵑。',
            '滄海月明珠有淚，',
            '藍田日暖玉生煙。',
            '此情可待成追憶，',
            '只是當時已惘然。'
        ],
        narrative: '藍田山在溫暖的陽光下，玉石升騰起輕煙。美好的事物總是遙不可及，如同這藍田的玉煙，可望而不可即。',
        imagery: '美好與遙遠、可望不可即',
        unlockItems: ['jinse']
    },
    {
        id: 'wuti_pengshan',
        title: '無題（蓬山）',
        ingredients: ['pengshan', 'qingniao'],
        poem: [
            '相見時難別亦難，',
            '東風無力百花殘。',
            '春蠶到死絲方盡，',
            '蠟炬成灰淚始乾。',
            '曉鏡但愁雲鬢改，',
            '夜吟應覺月光寒。',
            '蓬山此去無多路，',
            '青鳥殷勤為探看。'
        ],
        narrative: '蓬山雖遠，但青鳥會為我殷勤探看。即使距離遙遠，我仍希望有信使能傳達我的思念。',
        imagery: '遙遠的距離、希望與傳訊',
        unlockItems: []
    },
    {
        id: 'wuti_lingxi',
        title: '無題（靈犀）',
        ingredients: ['lingxi', 'xin'],
        poem: [
            '昨夜星辰昨夜風，',
            '畫樓西畔桂堂東。',
            '身無彩鳳雙飛翼，',
            '心有靈犀一點通。',
            '隔座送鉤春酒暖，',
            '分曹射覆蠟燈紅。',
            '嗟余聽鼓應官去，',
            '走馬蘭臺類轉蓬。'
        ],
        narrative: '雖然沒有彩鳳的雙翼，但我們的心靈卻像犀牛角一樣相通。即使身體無法靠近，心靈卻能跨越一切距離。',
        imagery: '心靈相通、跨越距離的默契',
        unlockItems: ['xingchen', 'huafeng']
    },
    {
        id: 'wuti_shennv',
        title: '無題（神女）',
        ingredients: ['shennv', 'xin'],
        poem: [
            '重幃深下莫愁堂，',
            '臥後清宵細細長。',
            '神女生涯原是夢，',
            '小姑居處本無郎。',
            '風波不信菱枝弱，',
            '月露誰教桂葉香。',
            '直道相思了無益，',
            '未妨惆悵是清狂。'
        ],
        narrative: '神女的生涯原本就是一場夢，小姑的居處本來就沒有郎君。這份相思雖然無益，但這份惆悵卻是清狂的。',
        imagery: '夢境與現實、相思的惆悵',
        unlockItems: []
    },
    {
        id: 'change',
        title: '嫦娥',
        ingredients: ['changhe', 'yueguang'],
        poem: [
            '雲母屏風燭影深，',
            '長河漸落曉星沉。',
            '嫦娥應悔偷靈藥，',
            '碧海青天夜夜心。'
        ],
        narrative: '嫦娥偷了靈藥飛到月宮，卻發現那裡只有碧海青天，夜夜孤獨。她是否後悔當初的選擇？',
        imagery: '孤獨、後悔、選擇的代價',
        unlockItems: []
    },
    {
        id: 'dengleyouyuan',
        title: '登樂遊原',
        ingredients: ['riwen', 'xin'],
        poem: [
            '向晚意不適，',
            '驅車登古原。',
            '夕陽無限好，',
            '只是近黃昏。'
        ],
        narrative: '傍晚時分，心情不適，驅車登上古老的樂遊原。夕陽無限美好，只是已經接近黃昏。美好的事物總是短暫的。',
        imagery: '美好與短暫、時光的流逝',
        unlockItems: []
    }
];

// 遊戲進度階段
const GAME_STAGES = [
    {
        id: 'beginning',
        name: '初入碧城',
        description: '你來到了碧城，這裡是記憶的圖書館。',
        requiredPoems: 0
    },
    {
        id: 'progress',
        name: '漸入佳境',
        description: '你開始理解這些記憶碎片之間的聯繫。',
        requiredPoems: 3
    },
    {
        id: 'deep',
        name: '夢醒時分',
        description: '你逐漸接近了無題詩人的核心記憶。',
        requiredPoems: 6
    },
    {
        id: 'ending',
        name: '錦瑟無端',
        description: '所有的記憶都已重構，你見證了詩人完整的情感世界。',
        requiredPoems: 10
    }
];

// 導出數據
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BASE_IMAGERY, RECIPES, GAME_STAGES };
}

