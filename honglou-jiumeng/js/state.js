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
    collectTears: 1,
    searchMemories: 2,
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
                    relatedTear: "first-tear",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 1,
                    relatedCharacter: "林黛玉",
                    relatedScene: "榮國府"
                },
                {
                    id: "daiyu-baoyu-meet",
                    name: "與寶玉相知",
                    icon: "💕",
                    description: "黛玉與寶玉初次相見的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "寶玉笑道：'這個妹妹我曾見過的。'黛玉聽了，不覺一驚，心中暗想：'好生奇怪，倒像在那裡見過一般，何等眼熟到如此！'",
                    relatedTear: "first-tear",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 2,
                    relatedCharacter: "林黛玉",
                    relatedScene: "榮國府"
                },
                {
                    id: "daiyu-burial",
                    name: "葬花記憶",
                    icon: "💮",
                    description: "黛玉葬花的記憶碎片",
                    collected: false,
                    requiredJieqi: "清明",
                    content: "花謝花飛飛滿天，紅消香斷有誰憐？游絲軟系飄春榭，落絮輕沾撲繡簾。閨中女兒惜春暮，愁緒滿懷無釋處。手把花鋤出繡閨，忍踏落花來復去。",
                    relatedTear: "burial-tear",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 3,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園"
                },
                {
                    id: "daiyu-burn-manuscripts",
                    name: "焚稿",
                    icon: "🔥",
                    description: "黛玉焚毀詩稿的記憶",
                    collected: false,
                    requiredJieqi: "大寒",
                    content: "黛玉心中自思道：'我死了，這些墨寶還在，豈不大為世人恥笑。'於是便命丫環將前所作之詩稿盡行燒毀。",
                    relatedTear: "destruction-tear",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 4,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館"
                },
                {
                    id: "daiyu-illness",
                    name: "病重",
                    icon: "🌙",
                    description: "黛玉病重時的記憶",
                    collected: false,
                    requiredJieqi: "大寒",
                    content: "黛玉病重，氣息奄奄，心中卻還記掛著寶玉，只是說不出話來。",
                    relatedTear: "last-tear",
                    type: "tear",
                    storyLineId: "daiyu_main",
                    orderIndex: 5,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館"
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
                    relatedTear: "jealousy-tear",
                    type: "tear",
                    storyLineId: "daiyu_jealousy",
                    orderIndex: 1,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園"
                },
                {
                    id: "daiyu-baochai-conflict",
                    name: "與寶釵言語交鋒",
                    icon: "⚔️",
                    description: "黛玉與寶釵言語交鋒的記憶",
                    collected: false,
                    requiredJieqi: null,
                    content: "黛玉冷笑道：'我當是誰，原來是寶姐姐。'寶釵笑道：'妹妹這話從何說起？'",
                    relatedTear: "jealousy-tear",
                    type: "tear",
                    storyLineId: "daiyu_jealousy",
                    orderIndex: 2,
                    relatedCharacter: "林黛玉",
                    relatedScene: "大觀園"
                },
                {
                    id: "daiyu-after-search",
                    name: "抄檢大觀園後的冷清",
                    icon: "❄️",
                    description: "抄檢大觀園後黛玉的孤寂",
                    collected: false,
                    requiredJieqi: "霜降",
                    content: "抄檢大觀園後，園中冷清許多，黛玉獨自坐在瀟湘館中，心中淒涼。",
                    relatedTear: "parting-tear",
                    type: "tear",
                    storyLineId: "daiyu_jealousy",
                    orderIndex: 3,
                    relatedCharacter: "林黛玉",
                    relatedScene: "瀟湘館"
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
                nextAction: null       // 建議下一步執行的操作 (collect-tears, search-memories, advance-jieqi)
            },
            tutorialCompleted: false,
            tutorialStep: 0,
            idleTime: 0,              // 用戶閒置時間
            lastActionTime: Date.now() // 上次操作時間
        };
