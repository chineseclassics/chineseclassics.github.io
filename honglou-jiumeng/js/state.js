export const featureFlags = {
    actionPoints: true,
    layoutBuffs: false,
    flowerRoutes: false,
    memoryClarity: false,
    aiFlavor: false,
    newUI: false
};

export const config = {
    actionPointsPerJieqi: 4,
    actionPointWarningThreshold: 1
};

export const actionCosts = {
    // 移除 collectTears 和 searchMemories（答題解鎖記憶不消耗行動力）
    waterFlower: 1,
    plantFlower: 2,
    repairBuildingMin: 2,
    repairBuildingMax: 3
};

export const gameData = {
            cycle: 1,
            jieqiIndex: 0,
            actionPointsPerJieqi: config.actionPointsPerJieqi,
            currentActionPoints: config.actionPointsPerJieqi,
            resources: {
                stone: 5,      // 靈石 - 用於建造大觀園的建築，通過尋找寶玉的領悟而獲得
                tear: 1,       // 絳珠 - 林黛玉的淚水，用於澆灌花魂
                memory: 0
            },
            jieqi: [
                {name: "立春", icon: "🌱", season: "春"},
                {name: "雨水", icon: "🌧️", season: "春"},
                {name: "驚蟄", icon: "⚡", season: "春"},
                {name: "春分", icon: "☯️", season: "春"},
                {name: "清明", icon: "🌿", season: "春"},
                {name: "穀雨", icon: "💧", season: "春"},
                {name: "立夏", icon: "☀️", season: "夏"},
                {name: "小滿", icon: "🌾", season: "夏"},
                {name: "芒種", icon: "👨‍🌾", season: "夏"},
                {name: "夏至", icon: "🔆", season: "夏"},
                {name: "小暑", icon: "🔥", season: "夏"},
                {name: "大暑", icon: "🌡️", season: "夏"},
                {name: "立秋", icon: "🍂", season: "秋"},
                {name: "處暑", icon: "⛅", season: "秋"},
                {name: "白露", icon: "💦", season: "秋"},
                {name: "秋分", icon: "☯️", season: "秋"},
                {name: "寒露", icon: "❄️", season: "秋"},
                {name: "霜降", icon: "⚪", season: "秋"},
                {name: "立冬", icon: "🧣", season: "冬"},
                {name: "小雪", icon: "🌨️", season: "冬"},
                {name: "大雪", icon: "❄️", season: "冬"},
                {name: "冬至", icon: "⚫", season: "冬"},
                {name: "小寒", icon: "🥶", season: "冬"},
                {name: "大寒", icon: "⛄", season: "冬"}
            ],
            tears: [
                {
                    id: "last-tear",
                    name: "最後一滴淚",
                    icon: "💧",
                    description: "黛玉臨終前的最後一滴淚水",
                    potency: 5,
                    collected: true,
                    scene: "黛玉在半夢半醒之間，眼角流下最後一滴清淚。"
                },
                {
                    id: "burial-tear",
                    name: "葬花淚",
                    icon: "💧",
                    description: "黛玉葬花時的淚水",
                    potency: 3,
                    collected: false,
                    scene: "花謝花飛飛滿天，紅消香斷有誰憐？",
                    relatedMemory: "daiyu-burial"
                },
                {
                    id: "parting-tear",
                    name: "離別淚",
                    icon: "💧",
                    description: "黛玉離開姑蘇，與寶玉初別時的淚水",
                    potency: 2,
                    collected: false,
                    scene: "黛玉道：\"寶玉，你好生在家裡念書，不要想著我。\"說著，眼淚不覺流下。",
                    relatedMemory: "first-meeting"
                },
                {
                    id: "poem-tear",
                    name: "詩詞淚",
                    icon: "💧",
                    description: "黛玉吟詩落淚時的淚水",
                    potency: 3,
                    collected: false,
                    scene: "一年三百六十日，風刀霜劍嚴相逼。明媚鮮妍能幾時，一朝漂泊難尋覓。",
                    relatedMemory: "daiyu-poem"
                },
                {
                    id: "jealousy-tear",
                    name: "醋意淚",
                    icon: "💧",
                    description: "黛玉因醋意而落下的淚水",
                    potency: 2,
                    collected: false,
                    scene: "莫叫金玉堆成案，展放芙蓉軟十三。\"說到此處，不覺滴下淚來。",
                    relatedMemory: "daiyu-jealousy"
                },
                {
                    id: "misunderstanding-tear",
                    name: "誤會淚",
                    icon: "💧",
                    description: "黛玉與寶玉因誤會而流下的淚水",
                    potency: 3,
                    collected: false,
                    scene: "我何曾說過一句，半句輕薄的話？你就拿著我的話去取笑。",
                    relatedMemory: "misunderstanding"
                },
                {
                    id: "promise-tear",
                    name: "盟誓淚",
                    icon: "💧",
                    description: "黛玉與寶玉盟誓時的淚水",
                    potency: 4,
                    collected: false,
                    scene: "天盡頭，海盡頭，在那裡握別久長候。",
                    relatedMemory: "promise-memory"
                },
                {
                    id: "destruction-tear",
                    name: "焚稿淚",
                    icon: "💧",
                    description: "黛玉焚毀詩稿時的淚水",
                    potency: 5,
                    collected: false,
                    scene: "黛玉心中自思道:\"我死了，這些墨寶還在，豈不大為世人恥笑。\"於是便命丫環將前所作之詩稿盡行燒毀。",
                    relatedMemory: "burn-manuscripts"
                },
                {
                    id: "first-tear",
                    name: "初遇淚",
                    icon: "💧",
                    description: "黛玉初到榮國府落下的第一滴淚",
                    potency: 2,
                    collected: false,
                    scene: "黛玉道:\"我來了幾日，也覺這裡的景致好，物件新奇，人也接風。但我少什麼不好，又沒人不疼，怎麼捨得回去呢。\"說著就有淚眼了。",
                    relatedMemory: "first-tear"
                }
            ],
            buildings: [
                {
                    id: "base-camp",
                    name: "警幻仙閣",
                    icon: "🏯",
                    description: "輪迴起點，神瑛侍者的居所",
                    cost: {stone: 0, tear: 0},
                    unlocked: true,
                    built: true,
                    position: 12,
                    decayRate: 0,
                    status: "完好"
                },
                {
                    id: "xiao-xiang",
                    name: "瀟湘館",
                    icon: "🏠",
                    description: "黛玉的居所，四面環竹，幽雅別致",
                    cost: {stone: 10, tear: 1},
                    unlocked: true,
                    built: false,
                    position: 6,
                    decayRate: 0.2,
                    relatedFlower: "daiyu-flower",
                    status: "未建造"
                },
                {
                    id: "yi-hong",
                    name: "怡紅院",
                    icon: "🏡",
                    description: "寶玉的居所，桂、薔、棣棠等花環繞",
                    cost: {stone: 10, tear: 1},
                    unlocked: true,
                    built: false,
                    position: 8,
                    decayRate: 0.15,
                    relatedFlower: "baoyu-flower",
                    status: "未建造"
                },
                {
                    id: "heng-wu",
                    name: "蘅蕪苑",
                    icon: "🏣",
                    description: "寶釵的居所，香草遍植，清雅別致",
                    cost: {stone: 10, tear: 1},
                    unlocked: true,
                    built: false,
                    position: 16,
                    decayRate: 0.1,
                    relatedFlower: "baochai-flower",
                    status: "未建造"
                },
                {
                    id: "hai-tang",
                    name: "海棠社",
                    icon: "🏛️",
                    description: "湘雲居所，梨花開遍",
                    cost: {stone: 15, tear: 1},
                    unlocked: false,
                    built: false,
                    position: 18,
                    decayRate: 0.25,
                    relatedFlower: "xiangyun-flower",
                    status: "未解鎖"
                },
                {
                    id: "tan-chun",
                    name: "秋爽齋",
                    icon: "🏘️",
                    description: "探春的居所，整潔素雅",
                    cost: {stone: 15, tear: 1},
                    unlocked: false,
                    built: false,
                    position: 2,
                    decayRate: 0.2,
                    relatedFlower: "tanchun-flower",
                    status: "未解鎖"
                }
            ],
            flowers: [
                {
                    id: "daiyu-flower",
                    name: "芙蓉",
                    character: "林黛玉",
                    icon: "🌺",
                    description: "嬌艷如黛玉，花開易飄零",
                    level: 0,
                    maxLevel: 5,
                    growth: 0,
                    unlocked: false,
                    position: -1,
                    needsBuilding: "xiao-xiang",
                    specialCare: "需用葬花淚澆灌",
                    seasonalGrowth: {春: 1.5, 夏: 1, 秋: 0.5, 冬: 0.2},
                    tearPreference: ["burial-tear", "destruction-tear"],
                    judgmentPoem: "可嘆停機德，堪憐詠絮才。玉帶林中掛，金簪雪裡埋。",
                    memories: [],
                    status: "未解鎖"
                },
                {
                    id: "baochai-flower",
                    name: "牡丹",
                    character: "薛寶釵",
                    icon: "🌹",
                    description: "雍容華貴如寶釵，四季常青",
                    level: 0,
                    maxLevel: 5,
                    growth: 0,
                    unlocked: false,
                    position: -1,
                    needsBuilding: "heng-wu",
                    specialCare: "需用醋意淚澆灌",
                    seasonalGrowth: {春: 1, 夏: 1, 秋: 1, 冬: 0.8},
                    tearPreference: ["jealousy-tear", "misunderstanding-tear"],
                    judgmentPoem: "可嘆停機德，堪憐詠絮才。玉帶林中掛，金簪雪裡埋。",
                    memories: [],
                    status: "未解鎖"
                },
                {
                    id: "xiangyun-flower",
                    name: "海棠",
                    character: "史湘雲",
                    icon: "🌸",
                    description: "如醉如痴如湘雲，需以酒水澆灌",
                    level: 0,
                    maxLevel: 5,
                    growth: 0,
                    unlocked: false,
                    position: -1,
                    needsBuilding: "hai-tang",
                    specialCare: "雨季生長加速",
                    seasonalGrowth: {春: 1.2, 夏: 0.8, 秋: 1, 冬: 0.5},
                    tearPreference: ["poem-tear", "parting-tear"],
                    judgmentPoem: "富貴又何為？襁褓之間父母違。展眼弔斜暉，湘江水逝楚雲飛。",
                    memories: [],
                    status: "未解鎖"
                },
                {
                    id: "tanchun-flower",
                    name: "薔薇",
                    character: "探春",
                    icon: "🌷",
                    description: "風姿俊逸如探春，自有一番風骨",
                    level: 0,
                    maxLevel: 5,
                    growth: 0,
                    unlocked: false,
                    position: -1,
                    needsBuilding: "tan-chun",
                    specialCare: "秋季需額外照料",
                    seasonalGrowth: {春: 1, 夏: 1.2, 秋: 0.7, 冬: 0.3},
                    tearPreference: ["first-tear", "promise-tear"],
                    judgmentPoem: "才自精明志自高，生於末世運偏消。清明涕送江邊望，千里東風一夢遙。",
                    memories: [],
                    status: "未解鎖"
                }
            ],
            birds: [
                {
                    id: "xiren-bird",
                    name: "喜鵲",
                    character: "襲人",
                    icon: "🐦",
                    description: "勤勞似襲人，每日自動收集淚水",
                    level: 0,
                    unlocked: false,
                    relatedFlower: "baoyu-flower",
                    abilities: ["每日自動收集淚水", "驅散部分衰敗"],
                    status: "未解鎖"
                },
                {
                    id: "qingwen-bird",
                    name: "金翅雀",
                    character: "晴雯",
                    icon: "🐤",
                    description: "靈巧如晴雯，能修復破損之物",
                    level: 0,
                    unlocked: false,
                    relatedFlower: "baoyu-flower",
                    abilities: ["修復破損建築", "提高淚水保存"],
                    status: "未解鎖"
                },
                {
                    id: "pinger-bird",
                    name: "畫眉",
                    character: "平兒",
                    icon: "🐧",
                    description: "圓融如平兒，調解花魂衝突",
                    level: 0,
                    unlocked: false,
                    relatedFlower: "baochai-flower",
                    abilities: ["收集額外淚水", "調解花魂衝突"],
                    status: "未解鎖"
                }
            ],
            // 劇情線定義
            storyLines: {
                "daiyu_main": {
                    id: "daiyu_main",
                    name: "黛玉一生悲歡輪廓",
                    character: "林黛玉",
                    description: "從初入榮府到病重，黛玉一生的關鍵記憶",
                    milestones: [
                        { segments: 2, reward: { tear: 5, stone: 2 }, message: "你回憶起黛玉初入榮府的時光..." },
                        { segments: 3, reward: { tear: 10, stone: 5 }, message: "葬花時節，記憶變得更加清晰..." },
                        { segments: 5, reward: { tear: 20, stone: 10, flowerBoost: "daiyu-flower" }, message: "完整的記憶線浮現，黛玉花魂獲得成長加成！" }
                    ]
                },
                "daiyu_jealousy": {
                    id: "daiyu_jealousy",
                    name: "黛玉的酸楚與妒意",
                    character: "林黛玉",
                    description: "金玉良緣帶來的酸楚與試探",
                    milestones: [
                        { segments: 2, reward: { tear: 8, stone: 3 }, message: "你感受到黛玉內心的酸楚..." },
                        { segments: 3, reward: { tear: 15, stone: 8 }, message: "完整的酸楚記憶被喚醒..." }
                    ]
                },
                "baoyu_main": {
                    id: "baoyu_main",
                    name: "寶玉的成長與領悟",
                    character: "賈寶玉",
                    description: "從神游太虛到訴說心事，寶玉的成長軌跡",
                    milestones: [
                        { segments: 2, reward: { tear: 3, stone: 10 }, message: "你回憶起寶玉的幻境之旅..." },
                        { segments: 4, reward: { tear: 5, stone: 20 }, message: "寶玉的成長記憶更加完整..." },
                        { segments: 5, reward: { tear: 10, stone: 30, flowerBoost: "baoyu-flower" }, message: "完整的記憶線浮現，寶玉花魂獲得成長加成！" }
                    ]
                }
            },
            memories: [
                // 黛玉主線劇情
                {
                    id: "daiyu-first-entry",
                    name: "初入榮府",
                    icon: "🏛️",
                    description: "黛玉初到榮國府的記憶",
                    collected: false,
                    requiredJieqi: null, // 自動解鎖
                    content: "黛玉道：'我來了幾日，也覺這裡的景致好，物件新奇，人也接風。但我少什麼不好，又沒人不疼，怎麼捨得回去呢。'",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_main",
                    orderIndex: 1,
                    relatedCharacter: "林黛玉",
                    relatedScene: "榮國府",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 3, // 第3回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 10,
                    tearReward: 10 // 根據記憶類型給予絳珠
                },
                {
                    id: "daiyu-baoyu-meet",
                    name: "與寶玉相知",
                    icon: "💕",
                    description: "黛玉與寶玉初次相見的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉笑道：'這個妹妹我曾見過的。'黛玉聽了，不覺一驚，心中暗想：'好生奇怪，倒像在那裡見過一般，何等眼熟到如此！'",
                    type: "stone", // 寶玉視角，獲得靈石
                    storyLineId: "daiyu_main",
                    orderIndex: 2,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "榮國府",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 3, // 第3回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 10,
                    stoneReward: 10 // 根據記憶類型給予靈石
                },
                {
                    id: "daiyu-burial",
                    name: "葬花記憶",
                    icon: "💮",
                    description: "黛玉葬花的記憶碎片",
                    collected: false,
                    requiredJieqi: "清明",
                    content: "花謝花飛飛滿天，紅消香斷有誰憐？游絲軟系飄春榭，落絮輕沾撲繡簾。閨中女兒惜春暮，愁緒滿懷無釋處。手把花鋤出繡閨，忍踏落花來復去。",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_main",
                    orderIndex: 3,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 23, // 第23回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 15,
                    tearReward: 15
                },
                {
                    id: "daiyu-burn-manuscripts",
                    name: "焚稿",
                    icon: "🔥",
                    description: "黛玉焚毀詩稿的記憶",
                    collected: false,
                    requiredJieqi: "大寒",
                    content: "黛玉心中自思道：'我死了，這些墨寶還在，豈不大為世人恥笑。'於是便命丫環將前所作之詩稿盡行燒毀。",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_main",
                    orderIndex: 4,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 97, // 第97回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 20,
                    tearReward: 20
                },
                {
                    id: "daiyu-illness",
                    name: "病重",
                    icon: "🌙",
                    description: "黛玉病重時的記憶",
                    collected: false,
                    requiredJieqi: "大寒",
                    content: "黛玉病重，氣息奄奄，心中卻還記掛著寶玉，只是說不出話來。",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_main",
                    orderIndex: 5,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 98, // 第98回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 25,
                    tearReward: 25
                },
                // 黛玉酸楚線
                {
                    id: "daiyu-golden-jade",
                    name: "聽聞金玉良緣",
                    icon: "💎",
                    description: "黛玉聽聞金玉良緣時的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉聽聞'金玉良緣'之說，心中不覺一酸，暗想：'既有金玉之說，又何必有我？'",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_jealousy",
                    orderIndex: 1,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 28, // 第28回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 12,
                    tearReward: 12
                },
                {
                    id: "daiyu-baochai-conflict",
                    name: "與寶釵言語交鋒",
                    icon: "⚔️",
                    description: "黛玉與寶釵言語交鋒的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉冷笑道：'我當是誰，原來是寶姐姐。'寶釵笑道：'妹妹這話從何說起？'",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_jealousy",
                    orderIndex: 2,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 30, // 第30回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 12,
                    tearReward: 12
                },
                {
                    id: "daiyu-after-search",
                    name: "抄檢大觀園後的冷清",
                    icon: "❄️",
                    description: "抄檢大觀園後黛玉的孤寂",
                    collected: false,
                    requiredJieqi: "霜降",
                    content: "抄檢大觀園後，園中冷清許多，黛玉獨自坐在瀟湘館中，心中淒涼。",
                    type: "tear", // 黛玉相關，獲得絳珠
                    storyLineId: "daiyu_jealousy",
                    orderIndex: 3,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    // 新增屬性：對齊設計文檔
                    relatedChapter: 74, // 第74回
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [], // 將從 reading-questions.json 載入
                    baseReward: 15,
                    tearReward: 15
                },
                // 新增記憶：第5回 - 寶玉神游太虛幻境
                {
                    id: "baoyu-dream-taihuan",
                    name: "神游太虛幻境",
                    icon: "🌙",
                    description: "寶玉神游太虛幻境的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "警幻仙子道：'此離恨天之上，灌愁海之中，乃放春山遣香洞太虛幻境也。'",
                    type: "stone", // 寶玉視角，獲得靈石
                    storyLineId: "baoyu_main",
                    orderIndex: 1,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "太虛幻境",
                    relatedChapter: 5,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    stoneReward: 15
                },
                // 第19回 - 寶玉與襲人
                {
                    id: "baoyu-xiren-conversation",
                    name: "與襲人論情",
                    icon: "💬",
                    description: "寶玉與襲人談論情理的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉道：'只求你們同看著我，守著我，等我有一日化成了飛灰，飛灰還不好，灰還有形有跡，還有知識。等我化成一股輕煙，風一吹便散了的時候，你們也管不得我，我也顧不得你們了。'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 2,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "怡紅院",
                    relatedChapter: 19,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 12,
                    stoneReward: 12
                },
                // 第27回 - 黛玉葬花詞
                {
                    id: "daiyu-burial-poem",
                    name: "葬花詞",
                    icon: "🌸",
                    description: "黛玉吟誦葬花詞的記憶",
                    collected: false,
                    requiredJieqi: "穀雨",
                    content: "爾今死去儂收葬，未卜儂身何日喪？儂今葬花人笑癡，他年葬儂知是誰？",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 4,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園",
                    relatedChapter: 27,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    tearReward: 18
                },
                // 第32回 - 寶玉訴肺腑
                {
                    id: "baoyu-confess-heart",
                    name: "訴肺腑",
                    icon: "💝",
                    description: "寶玉向黛玉訴說心事的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉道：'好妹妹，我的這心事，從來也不敢說，今兒我大膽說出來，死也甘心！我為你也弄了一身的病在這裡，又不敢告訴人，只好掩著。只等你的病好了，只怕我的病才得好呢。'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 3,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "大觀園",
                    relatedChapter: 32,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    stoneReward: 15
                },
                // 第33回 - 寶玉挨打
                {
                    id: "baoyu-beaten",
                    name: "寶玉挨打",
                    icon: "⚡",
                    description: "寶玉被父親責打的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "賈政一見，眼都紅紫了，也不暇問他在外流蕩優伶，表贈私物，在家荒疏學業，淫辱母婢等語，只喝令：'堵起嘴來，著實打死！'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 4,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "榮國府",
                    relatedChapter: 33,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    stoneReward: 15
                },
                // 第45回 - 黛玉秋雨夜
                {
                    id: "daiyu-autumn-rain",
                    name: "秋雨夜",
                    icon: "🌧️",
                    description: "黛玉秋雨夜獨坐的記憶",
                    collected: false,
                    requiredJieqi: "寒露",
                    content: "黛玉不覺心有所感，亦不禁發於章句，遂成《代別離》一首，擬《春江花月夜》之格，乃名其詞曰《秋窗風雨夕》。",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 5,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    relatedChapter: 45,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    tearReward: 18
                },
                // 第48回 - 香菱學詩
                {
                    id: "xiangling-learn-poetry",
                    name: "香菱學詩",
                    icon: "📚",
                    description: "香菱向黛玉學詩的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉笑道：'既要作詩，你就拜我作師。我雖不通，大略也還教得起你。'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 6,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    relatedChapter: 48,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    tearReward: 15
                },
                // 第8回 - 比通靈
                {
                    id: "baoyu-baochai-compare-jade",
                    name: "比通靈",
                    icon: "💎",
                    description: "寶玉與寶釵比通靈的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶釵看畢，又從新翻過正面來細看，口內念道：'莫失莫忘，仙壽恆昌。'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 5,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "梨香院",
                    relatedChapter: 8,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 12,
                    stoneReward: 12
                },
                // 第17-18回 - 大觀園試才題對額
                {
                    id: "baoyu-garden-inscriptions",
                    name: "試才題對額",
                    icon: "🏛️",
                    description: "寶玉在大觀園題對額的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "賈政道：'此處若懸匾待題，則田舍家風一洗盡矣。立此一碣，又覺生色許多，非范石湖田家之詠不足以盡其妙。'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 6,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "大觀園",
                    relatedChapter: 17,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    stoneReward: 18
                },
                // 第20回 - 王熙鳳正言彈妒意
                {
                    id: "baoyu-daiyu-quarrel",
                    name: "寶黛爭吵",
                    icon: "💔",
                    description: "寶玉與黛玉爭吵的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉道：'我作踐壞了身子，我死，與你何干！'寶玉道：'何苦來，大正月裡，死了活了的。'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 7,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "大觀園",
                    relatedChapter: 20,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 12,
                    stoneReward: 12
                },
                // 第26回 - 蜂腰橋設言傳心事
                {
                    id: "daiyu-heartfelt-words",
                    name: "訴說心事",
                    icon: "💌",
                    description: "黛玉向寶玉訴說心事的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉道：'你只怨人行動嗔怪了你，你再不知道你自己慪人難受。就拿今日天氣比，分明今兒冷的這樣，你怎麼倒反把個青肷披風脫了呢？'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 7,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園",
                    relatedChapter: 26,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    tearReward: 15
                },
                // 第29回 - 享福人福深還禱福
                {
                    id: "baoyu-daiyu-temple",
                    name: "清虛觀",
                    icon: "🏯",
                    description: "寶玉與黛玉在清虛觀的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉道：'你這個明白人，難道連「親不間疏，先不僭後」也不知道？'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 8,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "清虛觀",
                    relatedChapter: 29,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    stoneReward: 15
                },
                // 第34回 - 情中情因情感妹妹
                {
                    id: "daiyu-visit-baoyu",
                    name: "探望寶玉",
                    icon: "💊",
                    description: "黛玉探望挨打後的寶玉的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉聽了，心中雖有萬句言詞，只是不能說得，半日，方抽抽噎噎的說道：'你從此可都改了罷！'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 8,
                    relatedCharacter: "林黛玉",
                    relatedScene: "怡紅院",
                    relatedChapter: 34,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    tearReward: 18
                },
                // 第36回 - 繡鴛鴦夢兆絳芸軒
                {
                    id: "baoyu-dream-murmur",
                    name: "夢中囈語",
                    icon: "💭",
                    description: "寶玉夢中說出心事的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉在夢中喊罵說：'和尚道士的話如何信得？什麼是金玉姻緣，我偏說是木石姻緣！'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 9,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "怡紅院",
                    relatedChapter: 36,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    stoneReward: 15
                },
                // 第37回 - 秋爽齋偶結海棠社
                {
                    id: "daiyu-begonia-poetry",
                    name: "海棠詩社",
                    icon: "🌺",
                    description: "黛玉在海棠詩社作詩的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉道：'你們都有了？'說著提筆一揮而就，擲與眾人。",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 9,
                    relatedCharacter: "林黛玉",
                    relatedScene: "秋爽齋",
                    relatedChapter: 37,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    tearReward: 15
                },
                // 第38回 - 林瀟湘魁奪菊花詩
                {
                    id: "daiyu-chrysanthemum-poetry",
                    name: "菊花詩魁",
                    icon: "🌼",
                    description: "黛玉奪得菊花詩魁的記憶",
                    collected: false,
                    requiredJieqi: "秋分",
                    content: "眾人看一首，贊一首，彼此稱揚不已。李紈笑道：'等我從公評來。通篇看來，各有各人的警句。今日公評：《詠菊》第一，《問菊》第二，《菊夢》第三。'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 10,
                    relatedCharacter: "林黛玉",
                    relatedScene: "藕香榭",
                    relatedChapter: 38,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    tearReward: 18
                },
                // 第57回 - 慧紫鵑情辭試忙玉
                {
                    id: "daiyu-ziyuan-test",
                    name: "紫鵑試玉",
                    icon: "🧪",
                    description: "紫鵑試探寶玉心意的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "紫鵑道：'姑娘常常吩咐我們，說和別處不同。前日林姑娘還認得我，問我：「你為什麼到這裡來？」'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 11,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    relatedChapter: 57,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    tearReward: 18
                },
                // 第62回 - 憨湘雲醉眠芍藥裀
                {
                    id: "baoyu-birthday",
                    name: "寶玉生日",
                    icon: "🎂",
                    description: "寶玉生日的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉笑道：'今日原是我起的意，原是我邀你們的，可就不能由我作主了。'",
                    type: "stone",
                    storyLineId: "baoyu_main",
                    orderIndex: 10,
                    relatedCharacter: "賈寶玉",
                    relatedScene: "大觀園",
                    relatedChapter: 62,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    stoneReward: 15
                },
                // 第64回 - 幽淑女悲題五美吟
                {
                    id: "daiyu-five-beauties",
                    name: "五美吟",
                    icon: "📝",
                    description: "黛玉作五美吟的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉道：'我曾見古史中有才色的女子，終身遭際令人可欣可羨可悲可嘆者甚多。今日飯後無事，因欲擇出數人，胡亂湊幾首詩以寄感慨。'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 12,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    relatedChapter: 64,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 18,
                    tearReward: 18
                },
                // 第70回 - 林黛玉重建桃花社
                {
                    id: "daiyu-peach-poetry-society",
                    name: "重建桃花社",
                    icon: "🌸",
                    description: "黛玉重建桃花社的記憶",
                    collected: false,
                    requiredJieqi: "春分",
                    content: "黛玉道：'這一社起得巧，四月初一日乃是我生日，就起個桃花社罷。'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 13,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    relatedChapter: 70,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 15,
                    tearReward: 15
                },
                // 第76回 - 凸碧堂品笛感淒清
                {
                    id: "daiyu-mid-autumn-poetry",
                    name: "中秋聯詩",
                    icon: "🌕",
                    description: "黛玉與湘雲中秋夜聯詩的記憶",
                    collected: false,
                    requiredJieqi: "秋分",
                    content: "黛玉笑道：'倒要試試咱們誰強誰弱，只是沒有紙筆記。'湘雲道：'不妨，明兒再寫。只怕這一點聰明還有。'",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 14,
                    relatedCharacter: "林黛玉",
                    relatedScene: "凸碧堂",
                    relatedChapter: 76,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 20,
                    tearReward: 20
                },
                // 第87回 - 感深秋撫琴悲往事
                {
                    id: "daiyu-play-qin",
                    name: "撫琴悲往事",
                    icon: "🎵",
                    description: "黛玉深秋撫琴的記憶",
                    collected: false,
                    requiredJieqi: "寒露",
                    content: "黛玉道：'我小時也曾撫過，只是不記得了。'說著，便將琴放在桌上，調了調弦，彈了一曲。",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 15,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館",
                    relatedChapter: 87,
                    readingRequired: true,
                    readingVerified: false,
                    unlocked: false,
                    questions: [],
                    baseReward: 20,
                    tearReward: 20
                }
            ],
            cells: Array(25).fill().map((_, i) => ({
                id: i,
                type: "empty",
                buildingId: null,
                flowerId: null,
                memoryId: null,
                decayValue: 0,
                unlocked: i === 12 || [6, 7, 8, 11, 13, 16, 17, 18].includes(i)
            })),
            events: [
                {
                    id: "warning-dream",
                    title: "警幻入夢",
                    description: "警幻仙子託夢，講述大觀園的前世",
                    triggered: false,
                    requiredCycle: 1,
                    requiredJieqi: "冬至",
                    content: "警幻道：'神瑛，今你已回來，攜著絳珠的最後一滴淚水。她幾世輪迴，為還你當年的一盆水，流盡萬千淚水。如今你可願用她的淚，反哺眾花魂？'"
                },
                {
                    id: "white-ground",
                    title: "白茫茫結局",
                    description: "終極結局，一切歸於虛無",
                    triggered: false,
                    requiredCycle: 3,
                    requiredJieqi: "大寒",
                    content: "白茫茫大地一片真乾淨！"
                }
            ],
            suggestedActions: {
                nextBuildingId: null,  // 建議下一步建造的建築
                nextFlowerId: null,    // 建議下一步種植的花魂
                nextAction: null       // 建議下一步執行的操作 (unlock-memory, advance-jieqi)
            },
            tutorialCompleted: false,
            tutorialStep: 0,
            idleTime: 0,              // 用戶閒置時間
            lastActionTime: Date.now() // 上次操作時間
        };
