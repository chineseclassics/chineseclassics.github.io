// 遊戲數據
        const gameData = {
            cycle: 1,
            jieqiIndex: 0,
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
            memories: [
                // 黛玉流淚的記憶 - 用於獲取絳珠
                {
                    id: "daiyu-burial",
                    name: "葬花記憶",
                    icon: "💮",
                    description: "黛玉葬花的記憶碎片",
                    collected: false,
                    requiredJieqi: "清明",
                    content: "花謝花飛飛滿天，紅消香斷有誰憐？游絲軟系飄春榭，落絮輕沾撲繡簾。閨中女兒惜春暮，愁緒滿懷無釋處。手把花鋤出繡閨，忍踏落花來復去。",
                    relatedTear: "burial-tear",
                    type: "tear"
                },
                // 其他記憶保持不變...
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
        
        // 等待頁面加載完成
        document.addEventListener('DOMContentLoaded', function() {
            initializeGame();
        });
        
        function initializeGame() {
            // 安全地初始化DOM元素引用
            const elements = {
                // 基本狀態顯示
                gardenGrid: document.getElementById('garden-grid'),
                cycleCount: document.getElementById('cycle-count'),
                jieqiValue: document.getElementById('jieqi-value'),
                tearCount: document.getElementById('tear-count'),
                stoneCount: document.getElementById('stone-count'),
                memoryCount: document.getElementById('memory-count'),
                cycleProgressBar: document.getElementById('cycle-progress-bar'),
                
                // 計數器
                flowerCount: document.getElementById('flower-count'),
                birdCount: document.getElementById('bird-count'),
                collectedMemoryCount: document.getElementById('collected-memory-count'),
                collectedTearCount: document.getElementById('collected-tear-count'),
                
                // 列表容器
                flowersList: document.getElementById('flowers-list'),
                birdsList: document.getElementById('birds-list'),
                memoriesList: document.getElementById('memories-list'),
                tearsList: document.getElementById('tears-list'),
                
                // 指示器和按鈕
                jieqiIndicator: document.getElementById('jieqi-indicator'),
                jieqiLabel: document.getElementById('jieqi-label'),
                advanceJieqiBtn: document.getElementById('advance-jieqi'),
                collectTearsBtn: document.getElementById('collect-tears'),
                searchMemoriesBtn: document.getElementById('search-memories'),
                
                // 面板幫助按鈕
                actionsHelp: document.getElementById('actions-help'),
                flowersHelp: document.getElementById('flowers-help'),
                tearsHelp: document.getElementById('tears-help'),
                birdsHelp: document.getElementById('birds-help'),
                memoriesHelp: document.getElementById('memories-help'),
                
                // 對話框元素
                dialogOverlay: document.getElementById('dialog-overlay'),
                dialog: document.getElementById('dialog'),
                dialogTitle: document.getElementById('dialog-title'),
                dialogContent: document.getElementById('dialog-content'),
                dialogClose: document.getElementById('dialog-close'),
                dialogCancel: document.getElementById('dialog-cancel'),
                dialogConfirm: document.getElementById('dialog-confirm'),
                
                // 記憶閃回對話框
                memoryDialogOverlay: document.getElementById('memory-dialog-overlay'),
                memoryDialog: document.getElementById('memory-dialog'),
                memoryDialogTitle: document.getElementById('memory-dialog-title'),
                memoryDialogContent: document.getElementById('memory-dialog-content'),
                memoryDialogClose: document.getElementById('memory-dialog-close'),
                
                // 白茫茫效果
                whiteFade: document.getElementById('white-fade'),
                
                // 教學系統
                tutorialOverlay: document.getElementById('tutorial-overlay'),
                tutorialHighlight: document.getElementById('tutorial-highlight'),
                tutorialTooltip: document.getElementById('tutorial-tooltip'),
                tutorialTitle: document.getElementById('tutorial-title-text'),
                tutorialContent: document.getElementById('tutorial-tooltip-content'),
                tutorialProgress: document.getElementById('tutorial-progress'),
                tutorialNext: document.getElementById('tutorial-next'),
                tutorialSkip: document.getElementById('tutorial-skip'),
                
                // 提示系統
                hintContainer: document.getElementById('hint-container'),
                
                // 主選單
                mainMenu: document.getElementById('main-menu'),
                menuToggle: document.getElementById('menu-toggle'),
                menuTutorial: document.getElementById('menu-tutorial'),
                menuTargets: document.getElementById('menu-targets'),
                menuRestart: document.getElementById('menu-restart'),
                
                // 推薦行動氣泡
                actionSuggestion: document.getElementById('action-suggestion'),
                bubbleClose: document.getElementById('bubble-close')
            };
            
            try {
                // 設置初始建築
                setupInitialBuilding();
                
                // 渲染園林格子
                initGarden();
                
                // 更新資源顯示
                updateResourceDisplay();
                
                // 更新列表
                updateLists();
                
                // 添加事件監聽
                addEventListeners();
                
                // 設置輪迴進度條
                updateCycleProgress();
                
                // 顯示開場對話，確保一定會執行到
                setTimeout(() => {
                    // 直接顯示開場對話
                    showIntroDialog();
                    console.log("顯示開場對話");
                    
                    // 使用全局標記來追蹤開場對話是否已經結束
                    gameData.introShown = false;
                    
                    // 在記憶對話框關閉按鈕上增加新的監聽器
                    const setupIntroListener = function() {
                        if (elements.memoryDialogClose) {
                            console.log("註冊開場對話關閉監聽器");
                            elements.memoryDialogClose.addEventListener('click', function startTutorialAfterIntro() {
                                console.log("開場對話關閉，準備開始教學");
                                gameData.introShown = true;
                                
                                // 稍後開始教學
                                setTimeout(() => {
                                    startTutorial();
                                }, 800);
                            }, { once: true });
                        } else {
                            console.log("記憶對話框關閉按鈕不存在，100毫秒後重試");
                            setTimeout(setupIntroListener, 100);
                        }
                    };
                    
                    // 確保對話框和按鈕已經存在
                    setupIntroListener();
                }, 1000);
                
                // 檢測暗黑模式
                detectDarkMode();
                
                // 開始閒置提示檢查
                setInterval(checkIdleTime, 5000);
                
                // 每隔一段時間更新推薦操作
                setInterval(updateSuggestedActions, 10000);
            } catch (error) {
                console.error("遊戲初始化錯誤:", error);
                showHint('錯誤', '遊戲初始化失敗，請刷新頁面重試', '❌');
            }
            
            // 初始化園林格子
            function initGarden() {
                if (!elements.gardenGrid) {
                    console.error("找不到園林格子元素");
                    return;
                }
                
                elements.gardenGrid.innerHTML = '';
                
                // 判斷是否有建議的下一步操作
                const suggestedBuildingId = gameData.suggestedActions.nextBuildingId;
                const suggestedFlowerId = gameData.suggestedActions.nextFlowerId;
                
                gameData.cells.forEach(cell => {
                    const cellElement = document.createElement('div');
                    // 基礎類名
                    let cellClass = `garden-cell ${!cell.unlocked ? 'unlock-required' : ''}`;
                    
                    // 是否為推薦操作的格子
                    const isSuggestedBuildingCell = suggestedBuildingId && 
                        gameData.buildings.find(b => b.id === suggestedBuildingId)?.position === cell.id;
                    
                    if (isSuggestedBuildingCell && !cell.buildingId) {
                        cellClass += ' suggested-action';
                    }
                    
                    // 設置格子類型類名
                    if (cell.buildingId) {
                        cellClass += ' has-building';
                    } else if (cell.flowerId) {
                        cellClass += ' has-flower';
                    } else if (cell.memoryId) {
                        cellClass += ' has-memory interactive';
                    } else if (cell.unlocked && (gameData.resources.stone >= 10 || gameData.flowers.some(f => f.unlocked && f.position === -1))) {
                        // 如果有足夠資源建造或有花魂可種植，標記為可交互
                        cellClass += ' interactive';
                    }
                    
                    cellElement.className = cellClass;
                    cellElement.dataset.id = cell.id;
                    
                    // 根據格子內容設置HTML
                    let cellHTML = '';
                    let statusText = '';
                    
                    if (cell.buildingId) {
                        const building = gameData.buildings.find(b => b.id === cell.buildingId);
                        if (building) {
                            const condition = 1 - cell.decayValue;
                            let conditionText = getConditionText(condition);
                            let statusIcon = '✅';
                            
                            if (condition < 0.5) {
                                statusIcon = '⚠️';
                            }
                            
                            // 只有非警幻仙閣建築才顯示狀態文本
                            statusText = building.id !== 'base-camp' ? 
                                `<div class="cell-status"><span>${statusIcon}</span> ${conditionText}</div>` : '';
                            
                            cellHTML = `
                                <div class="building">
                                    <div class="building-icon">${building.icon}</div>
                                    <div class="building-name">${building.name}</div>
                                </div>
                                <div class="decay-overlay" style="opacity: ${cell.decayValue}">
                                    <div class="decay-icon">🕸️</div>
                                </div>
                                <div class="watering-effect"></div>
                                ${statusText}
                            `;
                        }
                    } else if (cell.flowerId) {
                        const flower = gameData.flowers.find(f => f.id === cell.flowerId);
                        if (flower) {
                            const growthPercent = Math.floor(flower.growth);
                            statusText = `<div class="cell-status"><span>${flower.level > 0 ? '✨' : '🌱'}</span> Lv${flower.level} (${growthPercent}%)</div>`;
                            
                            cellHTML = `
                                <div class="flower">
                                    <div class="flower-icon">${flower.icon}</div>
                                    <div class="flower-name">${flower.name}</div>
                                </div>
                                <div class="watering-effect"></div>
                                ${statusText}
                            `;
                        }
                    } else if (cell.memoryId) {
                        const memory = gameData.memories.find(m => m.id === cell.memoryId);
                        if (memory) {
                            statusText = `<div class="cell-status"><span>💫</span> 點擊收集</div>`;
                            
                            cellHTML = `
                                <div class="memory">
                                    <div class="memory-icon">${memory.icon}</div>
                                    <div class="memory-name">${memory.name}</div>
                                </div>
                                ${statusText}
                            `;
                        }
                    }
                    
                    cellElement.innerHTML = cellHTML || '';
                    
                    // 添加點擊事件
                    cellElement.addEventListener('click', () => {
                        if (cell.unlocked) {
                            gameData.lastActionTime = Date.now(); // 更新最後操作時間
                            handleCellClick(cell);
                        } else {
                            showHint('格子未解鎖', '完成目前任務以解鎖更多園區', '🔒');
                        }
                    });
                    
                    elements.gardenGrid.appendChild(cellElement);
                });
            }
            
            // 處理格子點擊
            function handleCellClick(cell) {
                if (cell.buildingId) {
                    // 點擊已有建築
                    const building = gameData.buildings.find(b => b.id === cell.buildingId);
                    
                    // 計算維修成本
                    const decayValue = cell.decayValue;
                    const repairCost = Math.ceil(decayValue * 5);
                    const needsRepair = decayValue > 0.2;
                    
                    // 判斷是否有足夠資源維修
                    const canRepair = gameData.resources.tear >= repairCost;
                    
                    showDialog({
                        title: building.name,
                        content: `
                            <p>${building.description}</p>
                            <div class="progress-container">
                                <div class="progress-label">建築狀態</div>
                                <div class="progress-bar" style="width: ${(1 - cell.decayValue) * 100}%"></div>
                            </div>
                            <p style="margin-top: 15px;">狀態: ${getConditionText(1 - cell.decayValue)}</p>
                            ${needsRepair ? `<p style="margin-top: 10px; color: ${canRepair ? '#4CAF50' : '#F44336'};">維修需要: ${repairCost} 絳珠</p>` : ''}
                            ${building.relatedFlower ? 
                                `<p style="margin-top: 10px;">相關花魂: <strong>${gameData.flowers.find(f => f.id === building.relatedFlower)?.name || '未知'}</strong> (${gameData.flowers.find(f => f.id === building.relatedFlower)?.character || ''})</p>` : 
                                ''}
                        `,
                        confirmText: needsRepair ? '維修' : '關閉',
                        cancelText: '關閉',
                        showCancel: needsRepair,
                        onConfirm: () => {
                            if (needsRepair) {
                                repairBuilding(cell.id);
                            } else {
                                hideDialog();
                            }
                        }
                    });
                } else if (cell.flowerId) {
                    // 點擊已有花魂
                    const flower = gameData.flowers.find(f => f.id === cell.flowerId);
                    
                    // 檢查是否有淚水可用
                    const availableTears = gameData.tears.filter(t => t.collected);
                    const canWater = availableTears.length > 0;
                    
                    // 顯示適合的淚水類型
                    let tearsHtml = '';
                    if (flower.tearPreference && flower.tearPreference.length > 0) {
                        tearsHtml = '<p style="margin-top: 10px;"><strong>偏好淚水:</strong> ';
                        flower.tearPreference.forEach((tearId, index) => {
                            const tear = gameData.tears.find(t => t.id === tearId);
                            if (tear) {
                                const isTearCollected = tear.collected;
                                tearsHtml += `<span style="color: ${isTearCollected ? '#4CAF50' : '#999'};">${tear.name}</span>${index < flower.tearPreference.length - 1 ? '、' : ''}`;
                            }
                        });
                        tearsHtml += '</p>';
                    }
                    
                    showDialog({
                        title: `${flower.name} (${flower.character})`,
                        content: `
                            <p>${flower.description}</p>
                            <div style="margin: 15px 0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                    <span>等級: ${flower.level}/${flower.maxLevel}</span>
                                    <span>${Math.floor(flower.growth)}%</span>
                                </div>
                                <div class="progress-container">
                                    <div class="progress-bar" style="width: ${(flower.growth / 100) * 100}%"></div>
                                </div>
                            </div>
                            <p><strong>特殊照料:</strong> ${flower.specialCare}</p>
                            <p style="margin-top: 10px;"><strong>季節生長速度:</strong> 
                                春 ${flower.seasonalGrowth.春}x · 
                                夏 ${flower.seasonalGrowth.夏}x · 
                                秋 ${flower.seasonalGrowth.秋}x · 
                                冬 ${flower.seasonalGrowth.冬}x
                            </p>
                            ${tearsHtml}
                            <p style="margin-top: 15px;"><strong>判詞:</strong> <em>${flower.judgmentPoem}</em></p>
                        `,
                        confirmText: canWater ? '澆灌' : '無可用淚水',
                        cancelText: '關閉',
                        onConfirm: () => {
                            if (canWater) {
                                showWateringDialog(cell.id, flower);
                            } else {
                                hideDialog();
                                showHint('提示', '請先收集淚水，再澆灌花魂', '💧');
                            }
                        }
                    });
                } else if (cell.memoryId) {
                    // 點擊記憶碎片
                    const memory = gameData.memories.find(m => m.id === cell.memoryId);
                    showMemoryDialog(memory);
                    collectMemory(memory.id);
                    
                    // 更新最後操作
                    gameData.lastActionTime = Date.now();
                    
                    // 顯示一個提示，具體內容根據記憶類型
                    if (memory.type === "tear") {
                        showHint('收集淚水', `你獲得了一滴絳珠: ${gameData.tears.find(t => t.id === memory.relatedTear)?.name || '未知淚水'}`, '💧');
                    } else if (memory.type === "stone") {
                        showHint('獲得靈石', `從寶玉的領悟中獲得了${memory.stoneValue}塊靈石`, '🪨');
                    }
                } else {
                    // 點擊空格
                    showBuildDialog(cell.id);
                }
            }
            
            // 顯示澆灌對話框 - 改進版
            function showWateringDialog(cellId, flower) {
                // 獲取可用淚水
                const availableTears = gameData.tears.filter(t => t.collected);
                
                if (availableTears.length === 0) {
                    showMemoryDialog({
                        title: '無可用淚水',
                        content: '你需要先收集淚水才能澆灌花魂。'
                    });
                    return;
                }
                
                let dialogContent = '<h4 style="margin-bottom: 15px;">選擇淚水澆灌</h4>';
                dialogContent += '<div class="build-menu">';
                
                availableTears.forEach(tear => {
                    // 檢查是否是偏好淚水
                    const isPreferred = flower.tearPreference && flower.tearPreference.includes(tear.id);
                    const efficiencyText = isPreferred ? '<span style="color: #4CAF50;">(效果加倍)</span>' : '';
                    
                    // 計算成長預測
                    let growthPredict = tear.potency * 10;
                    if (isPreferred) growthPredict *= 2;
                    
                    // 考慮季節修正
                    const currentSeason = gameData.jieqi[gameData.jieqiIndex].season;
                    const seasonMultiplier = flower.seasonalGrowth[currentSeason] || 1;
                    growthPredict *= seasonMultiplier;
                    
                    // 顯示是否會升級
                    let levelUpText = '';
                    if (flower.growth + growthPredict >= 100 && flower.level < flower.maxLevel) {
                        levelUpText = '<span style="color: #4CAF50; font-weight: bold;">將升級!</span>';
                    }
                    
                    // 根據是否為推薦淚水，添加推薦標記
                    const isRecommended = isPreferred && tear.potency >= 3;
                    const recommendedClass = isRecommended ? 'recommended' : '';
                    
                    dialogContent += `
                        <div class="build-item ${recommendedClass}" data-tear-id="${tear.id}" data-cell-id="${cellId}">
                            <div class="build-icon">${tear.icon}</div>
                            <div class="build-name">${tear.name} ${efficiencyText}</div>
                            <div style="font-size: 11px; margin: 5px 0; color: #666;">
                                預計成長: +${Math.floor(growthPredict)}% ${levelUpText}
                            </div>
                            <div class="build-cost">
                                <span class="build-cost-icon">💧</span>效力: ${tear.potency}
                            </div>
                        </div>
                    `;
                });
                
                dialogContent += '</div>';
                
                showDialog({
                    title: '選擇淚水澆灌',
                    content: dialogContent,
                    hideButtons: true
                });
                
                // 添加淚水點擊事件
                document.querySelectorAll('.build-item[data-tear-id]').forEach(item => {
                    item.addEventListener('click', () => {
                        const tearId = item.dataset.tearId;
                        const cellId = parseInt(item.dataset.cellId);
                        waterFlowerWithTear(cellId, tearId);
                        hideDialog();
                    });
                });
            }
            
            // 用淚水澆灌花魂 - 改進版
            function waterFlowerWithTear(cellId, tearId) {
                const cell = gameData.cells[cellId];
                if (!cell.flowerId) return;
                
                const flower = gameData.flowers.find(f => f.id === cell.flowerId);
                const tear = gameData.tears.find(t => t.id === tearId);
                
                if (!flower || !tear) return;
                
                // 更新最後操作時間
                gameData.lastActionTime = Date.now();
                
                // 顯示澆灌動畫
                const cellElement = document.querySelector(`.garden-cell[data-id="${cellId}"]`);
                if (cellElement) {
                    cellElement.classList.add('watering-active');
                    
                    // 創建多個淚滴動畫，提升視覺效果
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            const tearDrop = document.createElement('div');
                            tearDrop.className = 'tear-drop';
                            tearDrop.textContent = '💧';
                            tearDrop.style.left = `${Math.random() * 70 + 15}%`;
                            tearDrop.style.top = `${Math.random() * 40}%`;
                            cellElement.appendChild(tearDrop);
                            
                            // 移除單個淚滴
                            setTimeout(() => {
                                if (tearDrop && tearDrop.parentNode) {
                                    tearDrop.remove();
                                }
                            }, 1500);
                        }, i * 300);
                    }
                    
                    // 移除澆灌特效
                    setTimeout(() => {
                        if (cellElement) {
                            cellElement.classList.remove('watering-active');
                        }
                    }, 2000);
                }
                
                // 計算成長值
                let growthIncrease = tear.potency * 10;
                
                // 檢查是否為偏好淚水，如果是則效果加倍
                const isPreferred = flower.tearPreference && flower.tearPreference.includes(tear.id);
                if (isPreferred) {
                    growthIncrease *= 2;
                }
                
                // 考慮季節影響
                const currentSeason = gameData.jieqi[gameData.jieqiIndex].season;
                const seasonMultiplier = flower.seasonalGrowth[currentSeason] || 1;
                growthIncrease *= seasonMultiplier;
                
                // 更新花魂成長
                const oldGrowth = flower.growth;
                flower.growth += growthIncrease;
                
                // 檢查是否升級
                let leveledUp = false;
                if (flower.growth >= 100 && flower.level < flower.maxLevel) {
                    flower.level += 1;
                    flower.growth = 0;
                    leveledUp = true;
                    
                    // 解鎖相關鳥靈
                    if (flower.level >= 3) {
                        const relatedBirds = gameData.birds.filter(b => b.relatedFlower === flower.id && !b.unlocked);
                        if (relatedBirds.length > 0) {
                            relatedBirds[0].unlocked = true;
                            showMemoryDialog({
                                title: `${relatedBirds[0].name}鳥靈覺醒`,
                                content: `${flower.character}的花魂喚醒了${relatedBirds[0].character}的鳥靈！`
                            });
                            
                            // 提示鳥靈解鎖
                            setTimeout(() => {
                                showHint('鳥靈覺醒', `${relatedBirds[0].character}的鳥靈已被喚醒，將提供特殊能力！`, '🐦');
                            }, 2000);
                        }
                    }
                    
                    // 解鎖記憶
                    if (flower.level === flower.maxLevel) {
                        showMemoryDialog({
                            title: `${flower.character}記憶覺醒`,
                            content: `<div class="poem">${flower.judgmentPoem}</div><p style="margin-top: 20px;">${flower.character}的花魂已完全覺醒，她的判詞揭示了命運的謎團。</p>`
                        });
                    }
                }
                
                // 特殊節氣互動
                checkSpecialInteractions(flower);
                
                // 消耗淚水（除非是永久保存的最後一滴淚）
                if (tear.id !== 'last-tear') {
                    // 不實際刪除，而是標記為未收集
                    const tearIndex = gameData.tears.findIndex(t => t.id === tear.id);
                    if (tearIndex >= 0) {
                        gameData.tears[tearIndex].collected = false;
                    }
                    
                    // 也減少可用淚水數量
                    gameData.resources.tear -= 1;
                    
                    // 顯示資源變化動畫
                    const tearCountEl = elements.tearCount;
                    if (tearCountEl) {
                        tearCountEl.classList.add('resource-change');
                        setTimeout(() => tearCountEl.classList.remove('resource-change'), 500);
                    }
                }
                
                // 刷新UI
                updateResourceDisplay();
                initGarden();
                updateLists();
                
                // 顯示結果
                let resultMessage = '';
                if (leveledUp) {
                    resultMessage = `<span style="color: #4CAF50; font-weight: bold;">${flower.name}升級了！</span><br>當前等級: ${flower.level}/${flower.maxLevel}`;
                    
                    // 展示等級提示
                    showHint('花魂升級', `${flower.character}的花魂升至 ${flower.level} 級！`, '✨');
                } else {
                    const growthBefore = Math.floor(oldGrowth);
                    const growthAfter = Math.floor(flower.growth);
                    resultMessage = `${flower.name}成長了！<br>生長進度: ${growthBefore}% → <span style="color: #4CAF50; font-weight: bold;">${growthAfter}%</span>`;
                    
                    // 展示成長提示
                    showHint('花魂成長', `${flower.character}的花魂成長了 ${Math.floor(growthIncrease)}%！`, '🌱');
                }
                
                // 使用記憶對話框展示結果，更具沉浸感
                showMemoryDialog({
                    title: '淚水澆灌',
                    content: `<div style="text-align: center;">
                        <p>你用<strong>${tear.name}</strong>澆灌了${flower.character}的花魂。</p>
                        <p style="margin-top: 15px;">${resultMessage}</p>
                        ${isPreferred ? '<p style="color: #4CAF50; margin-top: 15px;">這是她偏好的淚水，效果加倍！</p>' : ''}
                        ${seasonMultiplier > 1 ? `<p style="color: #4CAF50; margin-top: 10px;">當前季節 (${currentSeason}) 對此花魂成長有利！</p>` : ''}
                    </div>`
                });
            }
            
            // 顯示建造對話框 - 改進版
            function showBuildDialog(cellId) {
                // 更新最後操作時間
                gameData.lastActionTime = Date.now();
                
                const availableBuildings = gameData.buildings.filter(b => !b.built && b.unlocked);
                const availableFlowers = gameData.flowers.filter(f => f.unlocked && f.position === -1);
                
                let dialogContent = '<h4 style="margin-bottom: 15px;">建造建築</h4>';
                
                if (availableBuildings.length > 0) {
                    dialogContent += '<div class="build-menu">';
                    availableBuildings.forEach(building => {
                        const canAfford = gameData.resources.tear >= building.cost.tear && 
                                        gameData.resources.stone >= building.cost.stone;
                        
                        // 判斷是否為推薦建築
                        const isRecommended = building.id === gameData.suggestedActions.nextBuildingId;
                        
                        dialogContent += `
                            <div class="build-item ${!canAfford ? 'disabled' : ''} ${isRecommended ? 'recommended' : ''}" 
                                 data-building-id="${building.id}" 
                                 data-cell-id="${cellId}">
                                <div class="build-icon">${building.icon}</div>
                                <div class="build-name">${building.name}</div>
                                <div style="font-size: 11px; margin: 5px 0; color: #666; text-align: center;">
                                    ${building.description}
                                </div>
                                <div class="build-cost">
                                    <span class="build-cost-icon">💧</span>${building.cost.tear} 絳珠, 
                                    <span class="build-cost-icon">🪨</span>${building.cost.stone} 靈石
                                </div>
                            </div>
                        `;
                    });
                    dialogContent += '</div>';
                } else {
                    dialogContent += '<p style="text-align: center; color: #666; margin-bottom: 20px;">暫無可建造的建築</p>';
                }
                
                dialogContent += '<h4 style="margin: 20px 0 15px 0;">種植花魂</h4>';
                
                if (availableFlowers.length > 0) {
                    dialogContent += '<div class="build-menu">';
                    availableFlowers.forEach(flower => {
                        const requiredBuilding = gameData.buildings.find(b => b.id === flower.needsBuilding);
                        const buildingBuilt = requiredBuilding && requiredBuilding.built;
                        
                        // 判斷是否為推薦花魂
                        const isRecommended = flower.id === gameData.suggestedActions.nextFlowerId;
                        
                        dialogContent += `
                            <div class="build-item ${!buildingBuilt ? 'disabled' : ''} ${isRecommended ? 'recommended' : ''}" 
                                 data-flower-id="${flower.id}" 
                                 data-cell-id="${cellId}">
                                <div class="build-icon">${flower.icon}</div>
                                <div class="build-name">${flower.name} (${flower.character})</div>
                                <div style="font-size: 11px; margin: 5px 0; color: #666; text-align: center;">
                                    ${flower.description}
                                </div>
                                <div class="build-cost">
                                    需要: ${requiredBuilding ? requiredBuilding.name : '未知'} 已建造
                                </div>
                            </div>
                        `;
                    });
                    dialogContent += '</div>';
                } else {
                    dialogContent += '<p style="text-align: center; color: #666;">暫無可種植的花魂</p>';
                }
                
                showDialog({
                    title: '建造選項',
                    content: dialogContent,
                    hideButtons: true
                });
                
                // 添加建築點擊事件
                document.querySelectorAll('.build-item[data-building-id]').forEach(item => {
                    if (!item.classList.contains('disabled')) {
                        item.addEventListener('click', () => {
                            const buildingId = item.dataset.buildingId;
                            const cellId = parseInt(item.dataset.cellId);
                            buildStructure(buildingId, cellId);
                            hideDialog();
                        });
                    } else {
                        // 為禁用項目添加提示點擊
                        item.addEventListener('click', () => {
                            const buildingId = item.dataset.buildingId;
                            const building = gameData.buildings.find(b => b.id === buildingId);
                            
                            if (building) {
                                const needsTear = gameData.resources.tear < building.cost.tear;
                                const needsStone = gameData.resources.stone < building.cost.stone;
                                
                                let resourceNeeded = '';
                                if (needsTear && needsStone) {
                                    resourceNeeded = '絳珠與靈石';
                                } else if (needsTear) {
                                    resourceNeeded = '絳珠';
                                } else if (needsStone) {
                                    resourceNeeded = '靈石';
                                }
                                
                                showHint('資源不足', `建造 ${building.name} 需要更多${resourceNeeded}`, '⚠️');
                            }
                        });
                    }
                });
                
                // 添加花魂點擊事件
                document.querySelectorAll('.build-item[data-flower-id]').forEach(item => {
                    if (!item.classList.contains('disabled')) {
                        item.addEventListener('click', () => {
                            const flowerId = item.dataset.flowerId;
                            const cellId = parseInt(item.dataset.cellId);
                            plantFlower(flowerId, cellId);
                            hideDialog();
                        });
                    } else {
                        // 為禁用項目添加提示點擊
                        item.addEventListener('click', () => {
                            const flowerId = item.dataset.flowerId;
                            const flower = gameData.flowers.find(f => f.id === flowerId);
                            
                            if (flower) {
                                const requiredBuilding = gameData.buildings.find(b => b.id === flower.needsBuilding);
                                
                                showHint('無法種植', `需要先建造 ${requiredBuilding?.name || '相關建築'}`, '⚠️');
                            }
                        });
                    }
                });
            }
            
            // 建造建築 - 改進版
            function buildStructure(buildingId, cellId) {
                const building = gameData.buildings.find(b => b.id === buildingId);
                if (!building || building.built) return;
                
                // 檢查資源
                if (gameData.resources.tear < building.cost.tear || gameData.resources.stone < building.cost.stone) {
                    showMemoryDialog({
                        title: '資源不足',
                        content: '淚水或靈石不足，無法建造'
                    });
                    return;
                }
                
                // 扣除資源
                gameData.resources.tear -= building.cost.tear;
                gameData.resources.stone -= building.cost.stone;
                
                // 顯示資源變化動畫
                if (building.cost.tear > 0 && elements.tearCount) {
                    elements.tearCount.classList.add('resource-change');
                    setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                }
                
                if (building.cost.stone > 0 && elements.stoneCount) {
                    elements.stoneCount.classList.add('resource-change');
                    setTimeout(() => elements.stoneCount.classList.remove('resource-change'), 500);
                }
                
                // 更新建築和單元格狀態
                building.built = true;
                building.position = cellId;
                building.status = "完好";
                gameData.cells[cellId].buildingId = buildingId;
                gameData.cells[cellId].type = 'building';
                
                // 檢查是否解鎖相關花魂
                const relatedFlowers = [];
                gameData.flowers.forEach(flower => {
                    if (flower.needsBuilding === buildingId && !flower.unlocked) {
                        flower.unlocked = true;
                        flower.status = "待種植";
                        relatedFlowers.push(flower);
                        
                        // 更新建議
                        if (!gameData.suggestedActions.nextFlowerId) {
                            gameData.suggestedActions.nextFlowerId = flower.id;
                        }
                    }
                });
                
                // 刷新UI
                updateResourceDisplay();
                initGarden();
                updateLists();
                
                // 顯示建造成功消息
                showMemoryDialog({
                    title: `${building.name}建造完成`,
                    content: `
                        <div style="text-align: center;">
                            <p>${building.icon} ${building.name} 已成功建造！</p>
                            <p style="margin-top: 15px;">${building.description}</p>
                            ${relatedFlowers.length > 0 ? 
                                `<p style="margin-top: 20px; color: #4CAF50;">
                                    <strong>解鎖花魂：</strong> ${relatedFlowers.map(f => `${f.name} (${f.character})`).join('、')}
                                </p>` : 
                                ''}
                        </div>
                    `
                });
                
                // 如果解鎖了花魂，顯示提示
                if (relatedFlowers.length > 0) {
                    setTimeout(() => {
                        showHint('花魂解鎖', `${relatedFlowers.map(f => f.character).join('、')}的花魂已解鎖！`, '🌺');
                    }, 2000);
                }
                
                // 更新建議的下一步操作
                updateSuggestedActions();
            }
            
            // 種植花魂 - 改進版
            function plantFlower(flowerId, cellId) {
                const flower = gameData.flowers.find(f => f.id === flowerId);
                if (!flower || flower.position !== -1) return;
                
                // 檢查對應建築是否已建造
                const requiredBuilding = gameData.buildings.find(b => b.id === flower.needsBuilding);
                if (requiredBuilding && !requiredBuilding.built) {
                    showMemoryDialog({
                        title: '無法種植',
                        content: `需要先建造${requiredBuilding.name}`
                    });
                    return;
                }
                
                // 更新花魂和單元格狀態
                flower.position = cellId;
                flower.status = "生長中";
                gameData.cells[cellId].flowerId = flowerId;
                gameData.cells[cellId].type = 'flower';
                
                // 刷新UI
                initGarden();
                updateLists();
                
                // 顯示種植成功動畫
                const cellElement = document.querySelector(`.garden-cell[data-id="${cellId}"]`);
                if (cellElement) {
                    cellElement.classList.add('flashback');
                    setTimeout(() => {
                        cellElement.classList.remove('flashback');
                    }, 3000);
                }
                
                // 顯示種植成功對話框
                showMemoryDialog({
                    title: `${flower.name}已種植`,
                    content: `
                        <div style="text-align: center;">
                            <p>${flower.icon} ${flower.character}的花魂已種下！</p>
                            <p style="margin-top: 15px;">現在需要用淚水澆灌來喚醒她的記憶。</p>
                            <p style="margin-top: 20px; color: #5D5CDE;">
                                <strong>提示：</strong> ${flower.specialCare}
                            </p>
                            <p style="margin-top: 15px; font-style: italic; color: #666;">
                                偏好淚水可使成長速度加倍！
                            </p>
                        </div>
                    `
                });
                
                // 提示下一步澆灌
                setTimeout(() => {
                    showHint('提示', `嘗試用絳珠澆灌${flower.character}的花魂`, '💧');
                }, 2000);
                
                // 更新推薦的下一步行動
                gameData.suggestedActions.nextFlowerId = null;
                
                // 如果還沒有建議的操作，建議收集淚水
                if (!gameData.suggestedActions.nextAction) {
                    gameData.suggestedActions.nextAction = 'collect-tears';
                }
            }
            
            // 修復建築 - 改進版
            function repairBuilding(cellId) {
                const cell = gameData.cells[cellId];
                if (!cell.buildingId) return;
                
                // 計算修復成本
                const decayValue = cell.decayValue;
                const repairCost = Math.ceil(decayValue * 5);
                
                // 檢查資源
                if (gameData.resources.tear < repairCost) {
                    showMemoryDialog({
                        title: '淚水不足',
                        content: `<div style="text-align: center;">
                            <p>修復需要 ${repairCost} 絳珠，但你只有 ${gameData.resources.tear} 絳珠</p>
                            <p style="margin-top: 15px; color: #5D5CDE;">
                                提示: 使用「尋找絳珠」按鈕收集更多淚水
                            </p>
                        </div>`
                    });
                    return;
                }
                
                // 扣除資源
                gameData.resources.tear -= repairCost;
                
                // 顯示資源變化動畫
                if (elements.tearCount) {
                    elements.tearCount.classList.add('resource-change');
                    setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                }
                
                // 修復建築
                cell.decayValue = 0;
                
                // 更新建築狀態
                const building = gameData.buildings.find(b => b.id === cell.buildingId);
                if (building) {
                    building.status = "完好";
                }
                
                // 刷新UI
                updateResourceDisplay();
                initGarden();
                
                // 顯示成功動畫
                const cellElement = document.querySelector(`.garden-cell[data-id="${cellId}"]`);
                if (cellElement) {
                    cellElement.classList.add('flashback');
                    setTimeout(() => {
                        cellElement.classList.remove('flashback');
                    }, 2000);
                }
                
                showMemoryDialog({
                    title: '修復完成',
                    content: `<div style="text-align: center;">
                        <p>建築已恢復往日光彩！</p>
                        <p style="margin-top: 15px; color: #4CAF50;">
                            消耗: ${repairCost} 絳珠
                        </p>
                    </div>`
                });
                
                // 提示修復成功
                showHint('建築修復', `${building?.name || '建築'}已恢復完好狀態`, '🔨');
            }
            
            // 檢查特殊節氣互動
            function checkSpecialInteractions(flower) {
                const currentJieqi = gameData.jieqi[gameData.jieqiIndex].name;
                
                // 黛玉花魂在清明互動
                if (flower.id === 'daiyu-flower' && currentJieqi === '清明' && flower.level >= 2) {
                    const memory = gameData.memories.find(m => m.id === 'daiyu-burial');
                    if (memory && !memory.collected) {
                        memory.collected = true;
                        gameData.resources.memory += 1;
                        
                        // 也獲得特殊淚水 - 葬花淚
                        const tear = gameData.tears.find(t => t.id === 'burial-tear');
                        if (tear && !tear.collected) {
                            tear.collected = true;
                            gameData.resources.tear += 1;
                            
                            // 顯示資源變化動畫
                            if (elements.tearCount) {
                                elements.tearCount.classList.add('resource-change');
                                setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                            }
                            
                            showMemoryDialog({
                                title: '葬花記憶與淚水',
                                content: `<div class="poem">${memory.content}</div>
                                <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
                                    你收集到了【葬花淚】，這是黛玉在葬花時流下的淚水。
                                </p>`
                            });
                            
                            // 提示獲得特殊淚水
                            setTimeout(() => {
                                showHint('特殊淚水', '獲得「葬花淚」，這是黛玉葬花時的淚水', '💧');
                            }, 2000);
                        }
                    }
                }
                
                // 其他花魂與記憶、淚水的互動
                gameData.memories.forEach(memory => {
                    if (memory.requiredJieqi === currentJieqi && !memory.collected && flower.level >= 2) {
                        // 檢查是否有關聯的淚水
                        if (memory.relatedTear) {
                            const tear = gameData.tears.find(t => t.id === memory.relatedTear);
                            if (tear && !tear.collected) {
                                tear.collected = true;
                                gameData.resources.tear += 1;
                                memory.collected = true;
                                gameData.resources.memory += 1;
                                
                                // 顯示資源變化動畫
                                if (elements.tearCount) {
                                    elements.tearCount.classList.add('resource-change');
                                    setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                                }
                                
                                showMemoryDialog({
                                    title: `${memory.name}與淚水`,
                                    content: `<div class="poem">${memory.content}</div>
                                    <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
                                        你收集到了【${tear.name}】，這是黛玉在此場景中流下的淚水。
                                    </p>`
                                });
                                
                                // 提示獲得特殊淚水
                                setTimeout(() => {
                                    showHint('特殊淚水', `獲得「${tear.name}」，一種珍貴的淚水`, '💧');
                                }, 2000);
                            }
                        }
                    }
                });
            }
            
            // 收集記憶碎片 - 改進版
            function collectMemory(memoryId) {
                const memory = gameData.memories.find(m => m.id === memoryId);
                if (!memory || memory.collected) return;
                
                memory.collected = true;
                gameData.resources.memory += 1;
                
                // 顯示資源變化動畫
                if (elements.memoryCount) {
                    elements.memoryCount.classList.add('resource-change');
                    setTimeout(() => elements.memoryCount.classList.remove('resource-change'), 500);
                }
                
                // 根據記憶類型提供不同的資源
                if (memory.type === "tear" && memory.relatedTear) {
                    // 如果是淚水類記憶，提供絳珠
                    const tear = gameData.tears.find(t => t.id === memory.relatedTear);
                    if (tear && !tear.collected) {
                        tear.collected = true;
                        gameData.resources.tear += 1;
                        
                        // 顯示資源變化動畫
                        if (elements.tearCount) {
                            elements.tearCount.classList.add('resource-change');
                            setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                        }
                        
                        // 提示獲得了絳珠
                        showMemoryDialog({
                            title: `${memory.name}與絳珠`,
                            content: `<div class="poem">${memory.content}</div>
                            <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
                                你收集到了【${tear.name}】，這是黛玉在此場景中流下的絳珠。
                            </p>`
                        });
                    }
                } else if (memory.type === "stone" && memory.stoneValue) {
                    // 如果是靈石類記憶，提供靈石
                    gameData.resources.stone += memory.stoneValue;
                    
                    // 顯示資源變化動畫
                    if (elements.stoneCount) {
                        elements.stoneCount.classList.add('resource-change');
                        setTimeout(() => elements.stoneCount.classList.remove('resource-change'), 500);
                    }
                    
                    // 提示獲得了靈石
                    showMemoryDialog({
                        title: `${memory.name}`,
                        content: `<div class="poem">${memory.content}</div>
                        <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
                            你從寶玉的領悟中獲得了 ${memory.stoneValue} 塊靈石，可用於重建大觀園。
                        </p>`
                    });
                    
                    // 如果還沒有建議的下一步建築，且有未建造的建築
                    if (!gameData.suggestedActions.nextBuildingId) {
                        const buildableBuildings = gameData.buildings.filter(b => !b.built && b.unlocked);
                        if (buildableBuildings.length > 0) {
                            gameData.suggestedActions.nextBuildingId = buildableBuildings[0].id;
                        }
                    }
                } else {
                    // 普通記憶，沒有特殊獎勵
                    showMemoryDialog({
                        title: memory.name,
                        content: `<div class="poem">${memory.content}</div>`
                    });
                }
                
                // 移除記憶碎片
                const memoryCell = gameData.cells.find(c => c.memoryId === memoryId);
                if (memoryCell) {
                    memoryCell.memoryId = null;
                    memoryCell.type = 'empty';
                }
                
                // 刷新UI
                updateResourceDisplay();
                initGarden();
                updateLists();
            }
            
            // 推進節氣 - 改進版
            function advanceJieqi() {
                // 更新最後操作時間
                gameData.lastActionTime = Date.now();
                
                // 增加節氣指數
                const oldJieqi = gameData.jieqi[gameData.jieqiIndex];
                gameData.jieqiIndex = (gameData.jieqiIndex + 1) % 24;
                const newJieqi = gameData.jieqi[gameData.jieqiIndex];
                
                // 播放節氣變化動畫
                const jieqiIcon = document.querySelector('.jieqi-icon');
                const jieqiIndicator = elements.jieqiIndicator || document.querySelector('#jieqi-indicator');
                const jieqiLabel = elements.jieqiLabel || document.getElementById('jieqi-label');
                
                if (jieqiIcon) {
                    jieqiIcon.textContent = newJieqi.icon;
                    jieqiIcon.classList.add('jieqi-change');
                    setTimeout(() => jieqiIcon.classList.remove('jieqi-change'), 1000);
                }
                
                if (jieqiLabel) {
                    jieqiLabel.textContent = newJieqi.name;
                    jieqiLabel.classList.add('jieqi-change');
                    setTimeout(() => jieqiLabel.classList.remove('jieqi-change'), 1000);
                } else if (jieqiIndicator) {
                    jieqiIndicator.textContent = newJieqi.name;
                }
                
                if (jieqiIndicator) {
                    jieqiIndicator.classList.add('jieqi-change');
                    setTimeout(() => jieqiIndicator.classList.remove('jieqi-change'), 1000);
                }
                
                // 檢查是否進入新輪迴
                if (gameData.jieqiIndex === 0) {
                    gameData.cycle += 1;
                    if (elements.cycleCount) {
                        elements.cycleCount.textContent = gameData.cycle;
                        elements.cycleCount.classList.add('resource-change');
                        setTimeout(() => elements.cycleCount.classList.remove('resource-change'), 500);
                    }
                    
                    // 輪迴開始提示
                    showMemoryDialog({
                        title: `第${gameData.cycle}輪輪迴開始`,
                        content: `<div style="text-align: center;">
                            <p>時光流轉，萬物歸零又復始。</p>
                            <p style="margin-top: 15px;">新的輪迴已經開始，你仍在用淚水與無常賽跑...</p>
                            ${gameData.cycle > 1 ? `<p style="margin-top: 20px; color: #5D5CDE;">
                                你已完成 ${gameData.cycle - 1} 輪輪迴，繼續收集記憶與淚水，喚醒更多花魂。
                            </p>` : ''}
                        </div>`
                    });
                    
                    // 第三輪後結束遊戲
                    if (gameData.cycle >= 3 && gameData.jieqiIndex === 23) {
                        setTimeout(() => {
                            triggerWhiteFade();
                        }, 5000);
                    }
                } else {
                    // 一般節氣變化提示
                    showHint('節氣變化', `${oldJieqi.name} ➝ ${newJieqi.name} (${newJieqi.season}季)`, newJieqi.icon);
                }
                
                // 更新節氣顯示
                const currentJieqi = gameData.jieqi[gameData.jieqiIndex];
                if (elements.jieqiValue) {
                    elements.jieqiValue.textContent = currentJieqi.name;
                }
                
                // 更新輪迴進度
                updateCycleProgress();
                
                // 建築衰敗
                gameData.cells.forEach(cell => {
                    if (cell.buildingId) {
                        const building = gameData.buildings.find(b => b.id === cell.buildingId);
                        if (building && building.id !== 'base-camp') {
                            const oldDecayValue = cell.decayValue;
                            cell.decayValue = Math.min(1, cell.decayValue + building.decayRate / 24);
                            
                            // 如果衰敗程度顯著增加，提示玩家
                            if (cell.decayValue > 0.5 && oldDecayValue <= 0.5) {
                                showHint('建築衰敗', `${building.name}開始明顯損壞，請考慮維修`, '🏚️');
                            }
                            
                            // 更新建築狀態
                            building.status = getConditionText(1 - cell.decayValue);
                        }
                    }
                });
                
                // 花魂生長（少量被動生長）
                gameData.flowers.forEach(flower => {
                    if (flower.position !== -1) {
                        const oldGrowth = flower.growth;
                        const season = currentJieqi.season;
                        const growthRate = flower.seasonalGrowth[season] || 0.5;
                        const growthIncrease = growthRate * 2;
                        flower.growth = Math.min(100, flower.growth + growthIncrease);
                        
                        // 季節特別適合時提示
                        if (growthRate > 1 && flower.growth > oldGrowth + 1) {
                            showHint('花魂成長', `${currentJieqi.season}季有利於${flower.character}的花魂生長`, '🌱');
                        }
                        
                        // 檢查是否升級
                        if (flower.growth >= 100 && flower.level < flower.maxLevel) {
                            flower.level += 1;
                            flower.growth = 0;
                            
                            showHint('花魂升級', `${flower.character}的花魂自然升級到 Lv${flower.level}！`, '✨');
                            
                            // 解鎖相關鳥靈
                            if (flower.level >= 3) {
                                const relatedBirds = gameData.birds.filter(b => b.relatedFlower === flower.id && !b.unlocked);
                                if (relatedBirds.length > 0) {
                                    relatedBirds[0].unlocked = true;
                                    showMemoryDialog({
                                        title: `${relatedBirds[0].name}鳥靈覺醒`,
                                        content: `${flower.character}的花魂喚醒了${relatedBirds[0].character}的鳥靈！`
                                    });
                                }
                            }
                        }
                    }
                });
                
                // 鳥靈效果 - 自動收集淚水
                const activeCollectorBirds = gameData.birds.filter(b => b.unlocked && 
                    (b.id === 'xiren-bird' || b.id === 'pinger-bird'));
                
                if (activeCollectorBirds.length > 0) {
                    const tearGain = activeCollectorBirds.length;
                    gameData.resources.tear += tearGain;
                    
                    // 顯示資源變化動畫
                    if (elements.tearCount) {
                        elements.tearCount.classList.add('resource-change');
                        setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                    }
                    
                    showHint('鳥靈效果', `鳥靈自動收集了 ${tearGain} 滴絳珠`, '🐦');
                }
                
                // 隨機生成記憶碎片
                if (Math.random() < 0.3) {
                    spawnMemory();
                }
                
                // 檢查是否觸發事件
                checkEvents();
                
                // 刷新UI
                initGarden();
                updateLists();
                updateResourceDisplay();
                
                // 更新建議操作
                updateSuggestedActions();
            }
            
            // 收集絳珠 - 改進版
            function collectTears() {
                // 更新最後操作時間
                gameData.lastActionTime = Date.now();
                
                // 記錄按鈕點擊類型，用於引導生成相應類型的記憶碎片
                try {
                    localStorage.setItem('lastButtonClicked', 'collect-tears');
                } catch (e) {
                    console.log("無法存儲按鈕點擊信息:", e);
                }
                
                // 計算基礎獲取量
                let tearGain = 1;
                
                // 根據當前節氣判斷額外效果
                const currentJieqi = gameData.jieqi[gameData.jieqiIndex];
                let seasonalBonus = false;
                
                // 在雨水、穀雨、梅雨等節氣有額外絳珠
                if (['雨水', '穀雨', '白露', '小雪', '大雪'].includes(currentJieqi.name)) {
                    tearGain += 1;
                    seasonalBonus = true;
                }
                
                // 鳥靈加成
                const activeBirds = gameData.birds.filter(bird => bird.unlocked);
                let birdBonus = false;
                if (activeBirds.length > 0) {
                    tearGain += activeBirds.length;
                    birdBonus = true;
                }
                
                // 增加資源
                gameData.resources.tear += tearGain;
                
                // 顯示資源變化動畫
                if (elements.tearCount) {
                    elements.tearCount.classList.add('resource-change');
                    setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                }
                
                // 查找未收集的淚水
                const uncollectedTears = gameData.tears.filter(t => !t.collected);
                let foundSpecialTear = false;
                
                if (uncollectedTears.length > 0 && Math.random() < 0.3) {
                    // 隨機選擇一種淚水收集
                    const randomTear = uncollectedTears[Math.floor(Math.random() * uncollectedTears.length)];
                    randomTear.collected = true;
                    foundSpecialTear = true;
                    
                    // 顯示特殊提示
                    showMemoryDialog({
                        title: '特殊絳珠收集',
                        content: `<div style="text-align: center;">
                            <p>你在大觀園中尋找到了一種特殊的淚水：</p>
                            <p style="margin: 15px 0; font-size: 20px; color: #5D5CDE;">
                                <strong>${randomTear.icon} ${randomTear.name}</strong>
                            </p>
                            <div class="poem">
                                ${randomTear.scene}
                            </div>
                            <p style="margin-top: 15px; font-style: italic; color: #666;">
                                這種淚水對特定花魂有加倍效果
                            </p>
                        </div>`
                    });
                    
                    // 提示特殊淚水收集
                    setTimeout(() => {
                        showHint('特殊淚水', `收集到「${randomTear.name}」，查看淚水列表了解詳情`, '✨');
                    }, 2000);
                } else {
                    // 顯示普通收集提示
                    showMemoryDialog({
                        title: '絳珠收集',
                        content: `<div style="text-align: center;">
                            <p>你在大觀園中收集了 ${tearGain} 滴絳珠</p>
                            ${seasonalBonus ? `<p style="margin-top: 10px; color: #4CAF50;">當前節氣 (${currentJieqi.name}) 使淚水更容易收集</p>` : ''}
                            ${birdBonus ? `<p style="margin-top: 10px; color: #4CAF50;">鳥靈幫助收集了額外的淚水</p>` : ''}
                        </div>`
                    });
                    
                    // 提示一般淚水收集
                    showHint('絳珠收集', `獲得了 ${tearGain} 滴絳珠，可用於澆灌花魂或建造建築`, '💧');
                }
                
                // 刷新UI
                updateResourceDisplay();
                updateLists();
                
                // 更新建議行動
                gameData.suggestedActions.nextAction = null;
                
                // 如果有花魂可以澆灌且有足夠淚水，建議澆灌花魂
                const plantedFlowers = gameData.flowers.filter(f => f.position !== -1);
                if (plantedFlowers.length > 0 && gameData.resources.tear > 0) {
                    // 標記建議澆灌的花魂
                    const flowerCells = gameData.cells.filter(c => c.flowerId);
                    if (flowerCells.length > 0) {
                        const targetCell = flowerCells[0];
                        const cellElement = document.querySelector(`.garden-cell[data-id="${targetCell.id}"]`);
                        if (cellElement) {
                            setTimeout(() => {
                                cellElement.classList.add('suggested-action');
                            }, 1000);
                        }
                    }
                }
                
                // 如果沒有種植花魂但有解鎖的花魂，建議種植花魂
                else if (gameData.flowers.filter(f => f.unlocked && f.position === -1).length > 0) {
                    if (!gameData.suggestedActions.nextFlowerId) {
                        const nextFlower = gameData.flowers.find(f => f.unlocked && f.position === -1);
                        if (nextFlower) {
                            gameData.suggestedActions.nextFlowerId = nextFlower.id;
                        }
                    }
                }
                
                // 如果剛開始遊戲，建議建造建築
                else if (!gameData.suggestedActions.nextBuildingId && gameData.resources.stone >= 10) {
                    const nextBuilding = gameData.buildings.find(b => !b.built && b.unlocked);
                    if (nextBuilding) {
                        gameData.suggestedActions.nextBuildingId = nextBuilding.id;
                    }
                }
            }
            
            // 尋找寶玉領悟 - 改進版
            function searchMemories() {
                // 更新最後操作時間
                gameData.lastActionTime = Date.now();
                
                // 記錄按鈕點擊類型，用於引導生成寶玉領悟類型的記憶
                try {
                    localStorage.setItem('lastButtonClicked', 'search-memories');
                } catch (e) {
                    console.log("無法存儲按鈕點擊信息:", e);
                }
                
                if (gameData.resources.tear < 2) {
                    showMemoryDialog({
                        title: '絳珠不足',
                        content: `<div style="text-align: center;">
                            <p>需要2滴絳珠才能尋找寶玉的領悟記憶</p>
                            <p style="margin-top: 15px; color: #5D5CDE;">
                                先使用「尋找絳珠」按鈕收集更多淚水
                            </p>
                        </div>`
                    });
                    return;
                }
                
                // 扣除資源
                gameData.resources.tear -= 2;
                
                // 顯示資源變化動畫
                if (elements.tearCount) {
                    elements.tearCount.classList.add('resource-change');
                    setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
                }
                
                // 增加成功率 - 基於當前輪迴和已收集的花魂
                const baseProbability = 0.7;
                const cycleBonus = (gameData.cycle - 1) * 0.1;
                const flowerBonus = gameData.flowers.filter(f => f.level > 0).length * 0.05;
                const successRate = Math.min(0.9, baseProbability + cycleBonus + flowerBonus);
                
                // 嘗試生成記憶碎片
                if (Math.random() < successRate) {
                    const memorySpawned = spawnMemory("stone");
                    
                    if (memorySpawned) {
                        showMemoryDialog({
                            title: '發現寶玉領悟',
                            content: `<div style="text-align: center;">
                                <p>你感受到一絲寶玉的心境，園中某處浮現了他對人世的思考。</p>
                                <p style="margin-top: 15px; color: #5D5CDE;">
                                    尋找記憶碎片 🧠 並點擊它以獲得靈石。
                                </p>
                                <p style="margin-top: 15px; font-style: italic; color: #666;">
                                    靈石可用於重建大觀園建築，恢復昔日繁華。
                                </p>
                            </div>`
                        });
                        
                        // 提示找到記憶
                        showHint('尋找記憶', '園林中出現了寶玉的領悟，點擊記憶碎片獲取靈石', '🧠');
                    } else {
                        // 雖然想要生成記憶，但沒有合適的位置
                        showMemoryDialog({
                            title: '尋找受阻',
                            content: `<div style="text-align: center;">
                                <p>你感受到寶玉的領悟就在附近，但似乎找不到合適的地方顯現。</p>
                                <p style="margin-top: 15px; color: #5D5CDE;">
                                    嘗試清理一些園林格子，為記憶碎片騰出空間。
                                </p>
                            </div>`
                        });
                    }
                } else {
                    showMemoryDialog({
                        title: '一無所獲',
                        content: `<div style="text-align: center;">
                            <p>紅塵茫茫，寶玉的領悟也已四散飄零...</p>
                            <p style="margin-top: 15px; font-style: italic; color: #666;">
                                ${getRandomSearchFailMessage()}
                            </p>
                        </div>`
                    });
                    
                    // 提示未找到記憶
                    showHint('未發現領悟', '嘗試在不同節氣搜尋，或在推進節氣後再試', '⏳');
                }
                
                // 刷新UI
                updateResourceDisplay();
                
                // 更新建議操作 - 如果尋找失敗，建議推進節氣
                if (Math.random() < 0.5) {
                    gameData.suggestedActions.nextAction = 'advance-jieqi';
                }
            }
            
            // 隨機生成未找到記憶的提示信息
            function getRandomSearchFailMessage() {
                const messages = [
                    "寶玉今日的念頭紛亂，難以捕捉。",
                    "試著在不同的節氣尋找，或許會有不同收穫。",
                    "有時不尋覓，反倒能有意外發現。",
                    "夙世因緣，需待機緣成熟時顯現。",
                    "寶玉的領悟與當前的節氣可能不相契合。"
                ];
                return messages[Math.floor(Math.random() * messages.length)];
            }
            
            // 生成記憶碎片 - 改進版
            function spawnMemory(preferredType) {
                // 找出未收集的記憶
                const uncollectedMemories = gameData.memories.filter(m => !m.collected);
                if (uncollectedMemories.length === 0) return false;
                
                // 區分兩種類型的記憶 - 絳珠(淚水)和靈石
                const tearsMemories = uncollectedMemories.filter(m => m.type === "tear");
                const stoneMemories = uncollectedMemories.filter(m => m.type === "stone");
                
                // 根據當前行動選擇記憶類型
                let chosenMemory;
                let lastButtonClicked;
                try {
                    lastButtonClicked = localStorage.getItem('lastButtonClicked');
                } catch (e) {
                    console.log("無法獲取按鈕點擊信息:", e);
                }
                
                // 根據優先類型和剩餘記憶選擇
                if (preferredType === "stone" && stoneMemories.length > 0) {
                    chosenMemory = stoneMemories[Math.floor(Math.random() * stoneMemories.length)];
                } else if (preferredType === "tear" && tearsMemories.length > 0) {
                    chosenMemory = tearsMemories[Math.floor(Math.random() * tearsMemories.length)];
                } else if (lastButtonClicked === 'collect-tears' && tearsMemories.length > 0) {
                    // 如果是尋找絳珠，優先生成淚水類記憶
                    chosenMemory = tearsMemories[Math.floor(Math.random() * tearsMemories.length)];
                } else if (lastButtonClicked === 'search-memories' && stoneMemories.length > 0) {
                    // 如果是尋找寶玉領悟，優先生成靈石類記憶
                    chosenMemory = stoneMemories[Math.floor(Math.random() * stoneMemories.length)];
                } else {
                    // 隨機選擇任意類型的記憶
                    chosenMemory = uncollectedMemories[Math.floor(Math.random() * uncollectedMemories.length)];
                }
                
                // 找出空閒且已解鎖的格子
                const availableCells = gameData.cells.filter(c => c.unlocked && !c.buildingId && !c.flowerId && !c.memoryId);
                if (availableCells.length === 0) return false;
                
                // 隨機選擇一個格子
                const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
                
                // 放置記憶碎片
                randomCell.memoryId = chosenMemory.id;
                randomCell.type = 'memory';
                
                // 刷新UI
                initGarden();
                
                // 標記成功生成記憶
                return true;
            }
            
            // 檢查事件觸發
            function checkEvents() {
                gameData.events.forEach(event => {
                    if (!event.triggered && gameData.cycle === event.requiredCycle && gameData.jieqi[gameData.jieqiIndex].name === event.requiredJieqi) {
                        event.triggered = true;
                        
                        // 警幻入夢事件
                        if (event.id === 'warning-dream') {
                            showMemoryDialog({
                                title: event.title,
                                content: `<div class="warning-dream">${event.content}</div>`
                            });
                        }
                        
                        // 白茫茫結局
                        if (event.id === 'white-ground') {
                            triggerWhiteFade();
                        }
                    }
                });
            }
            
            // 顯示對話框 - 改進版
            function showDialog(options) {
                try {
                    if (!elements.dialogTitle || !elements.dialogContent || 
                        !elements.dialogCancel || !elements.dialogConfirm || 
                        !elements.dialogClose || !elements.dialogOverlay) {
                        console.error("對話框元素未找到");
                        return;
                    }
                    
                    elements.dialogTitle.textContent = options.title || '對話';
                    elements.dialogContent.innerHTML = options.content || '';
                    
                    if (options.hideButtons) {
                        elements.dialogCancel.style.display = 'none';
                        elements.dialogConfirm.style.display = 'none';
                    } else {
                        elements.dialogCancel.style.display = options.showCancel === false ? 'none' : 'block';
                        elements.dialogConfirm.style.display = 'block';
                        elements.dialogCancel.textContent = options.cancelText || '取消';
                        elements.dialogConfirm.textContent = options.confirmText || '確認';
                    }
                    
                    // 設置回調
                    elements.dialogConfirm.onclick = options.onConfirm || hideDialog;
                    elements.dialogCancel.onclick = options.onCancel || hideDialog;
                    elements.dialogClose.onclick = hideDialog;
                    
                    // 打開對話框時的動畫效果
                    elements.dialogOverlay.classList.add('active');
                } catch (error) {
                    console.error("顯示對話框時出錯:", error);
                    showHint('錯誤', '無法顯示對話框，請刷新頁面重試', '❌');
                }
            }
            
            // 隱藏對話框
            function hideDialog() {
                try {
                    if (elements.dialogOverlay) {
                        elements.dialogOverlay.classList.remove('active');
                    }
                } catch (error) {
                    console.error("隱藏對話框時出錯:", error);
                }
            }
            
            // 顯示記憶閃回對話框 - 改進版
            function showMemoryDialog(memory) {
                if (!memory) return;
                
                try {
                    // 安全檢查所有元素
                    if (!elements.memoryDialogTitle || !elements.memoryDialogContent || 
                        !elements.memoryDialogClose || !elements.memoryDialogOverlay) {
                        console.error("記憶對話框元素未找到");
                        return;
                    }
                    
                    elements.memoryDialogTitle.textContent = memory.title || memory.name || '記憶閃回';
                    elements.memoryDialogContent.innerHTML = memory.content || '';
                    elements.memoryDialogClose.onclick = hideMemoryDialog;
                    
                    // 顯示對話框
                    elements.memoryDialogOverlay.classList.add('active');
                    
                    // 安全地添加閃回動畫
                    const gardenArea = document.querySelector('.garden-area');
                    if (gardenArea) {
                        gardenArea.classList.add('flashback');
                        
                        // 3秒後移除閃回動畫
                        setTimeout(() => {
                            if (gardenArea) {
                                gardenArea.classList.remove('flashback');
                            }
                        }, 3000);
                    }
                } catch (error) {
                    console.error("顯示記憶對話框時出錯:", error);
                    showHint('錯誤', '無法顯示記憶對話框', '❌');
                }
            }
            
            // 隱藏記憶閃回對話框
            function hideMemoryDialog() {
                try {
                    if (elements.memoryDialogOverlay) {
                        elements.memoryDialogOverlay.classList.remove('active');
                    }
                } catch (error) {
                    console.error("隱藏記憶對話框時出錯:", error);
                }
            }
            
            // 觸發白茫茫結局 - 改進版
            function triggerWhiteFade() {
                if (!elements.whiteFade) return;
                
                elements.whiteFade.classList.add('active');
                
                // 5秒後顯示結束文字
                setTimeout(() => {
                    // 計算最終成績
                    const flowerCount = gameData.flowers.filter(f => f.level > 0).length;
                    const maxFlowerLevel = Math.max(...gameData.flowers.map(f => f.level), 0);
                    const memoryCount = gameData.memories.filter(m => m.collected).length;
                    const tearCount = gameData.tears.filter(t => t.collected).length;
                    const buildingCount = gameData.buildings.filter(b => b.built).length;
                    
                    // 根據成績決定結局
                    let conclusionText = '';
                    let titleText = '遊戲結束';
                    
                    if (flowerCount >= 3 && maxFlowerLevel >= 4 && memoryCount >= 15) {
                        // 完美結局
                        titleText = '圓滿結局';
                        conclusionText = '你成功恢復了大觀園的風華，花魂們完全覺醒。神瑛與絳珠的前緣終得償還，世間情緣，緣來緣去，如是而已。';
                    } else if (flowerCount >= 2 && maxFlowerLevel >= 3 && memoryCount >= 10) {
                        // 良好結局
                        titleText = '沉睡結局';
                        conclusionText = '你喚醒了部分花魂，收集了許多記憶。雖未能完全恢復大觀園昔日榮光，但前世情債，已然清償大半。';
                    } else {
                        // 普通結局
                        titleText = '散落結局';
                        conclusionText = '時光流轉，終究難敵無常。花魂渺渺，記憶散落。紅塵一夢，終將醒來。';
                    }
                    
                    showMemoryDialog({
                        title: titleText,
                        content: `<div style="text-align: center;">
                            <p>${conclusionText}</p>
                            <div class="poem" style="margin: 20px 0;">
                                白茫茫大地一片真乾淨！
                            </div>
                            <p>你已經歷了 ${gameData.cycle} 輪輪迴，成就如下：</p>
                            <div style="margin: 15px 0; text-align: left; display: inline-block;">
                                <p>★ 喚醒花魂: ${flowerCount} 位 (最高等級: ${maxFlowerLevel})</p>
                                <p>★ 收集記憶: ${memoryCount} 段</p>
                                <p>★ 收集淚水: ${tearCount} 種</p>
                                <p>★ 重建建築: ${buildingCount} 座</p>
                            </div>
                            <p style="margin-top: 20px; font-style: italic; color: #5D5CDE;">
                                滿紙荒唐言，一把辛酸淚。都雲作者痴，誰解其中味？
                            </p>
                        </div>`
                    });
                    
                    // 允許再次開始
                    if (elements.memoryDialogClose) {
                        elements.memoryDialogClose.textContent = '再次開始';
                        elements.memoryDialogClose.onclick = () => {
                            hideMemoryDialog();
                            resetGame();
                            if (elements.whiteFade) {
                                elements.whiteFade.classList.remove('active');
                            }
                        };
                    }
                }, 5000);
            }
            
            // 重置遊戲 - 改進版
            function resetGame() {
                // 重置數據
                gameData.cycle = 1;
                gameData.jieqiIndex = 0;
                gameData.resources = {
                    stone: 5,
                    tear: 1,
                    memory: 0
                };
                
                // 重置建築
                gameData.buildings.forEach(building => {
                    if (building.id !== 'base-camp') {
                        building.built = false;
                        building.position = -1;
                        building.status = "未建造";
                    } else {
                        building.status = "完好";
                    }
                });
                
                // 重置花魂
                gameData.flowers.forEach(flower => {
                    flower.unlocked = false;
                    flower.level = 0;
                    flower.growth = 0;
                    flower.position = -1;
                    flower.memories = [];
                    flower.status = "未解鎖";
                });
                
                // 重置鳥靈
                gameData.birds.forEach(bird => {
                    bird.unlocked = false;
                    bird.level = 0;
                    bird.status = "未解鎖";
                });
                
                // 重置記憶
                gameData.memories.forEach(memory => {
                    memory.collected = false;
                });
                
                // 重置淚水
                gameData.tears.forEach(tear => {
                    tear.collected = (tear.id === 'last-tear'); // 只保留最後一滴淚
                });
                
                // 重置單元格
                gameData.cells = Array(25).fill().map((_, i) => ({
                    id: i,
                    type: "empty",
                    buildingId: null,
                    flowerId: null,
                    memoryId: null,
                    decayValue: 0,
                    unlocked: i === 12 || [6, 7, 8, 11, 13, 16, 17, 18].includes(i)
                }));
                
                // 設置初始建築
                setupInitialBuilding();
                
                // 重置事件
                gameData.events.forEach(event => {
                    event.triggered = false;
                });
                
                // 重置建議行動
                gameData.suggestedActions = {
                    nextBuildingId: null,
                    nextFlowerId: null,
                    nextAction: 'collect-tears'
                };
                
                // 重置教學
                gameData.tutorialCompleted = false;
                gameData.tutorialStep = 0;
                
                // 刷新UI
                updateResourceDisplay();
                initGarden();
                updateLists();
                updateCycleProgress();
                
                // 顯示歡迎消息
                showMemoryDialog({
                    title: '遊戲重置',
                    content: `<div style="text-align: center;">
                        <p>時光如逆水，又回到最初。</p>
                        <p style="margin-top: 15px;">這一世，你將重新踏上還淚之旅。</p>
                        <p style="margin-top: 20px; color: #5D5CDE;">願你能找到更好的道路...</p>
                    </div>`
                });
                
                // 延遲顯示教學
                setTimeout(() => {
                    startTutorial();
                }, 2000);
            }
            
            // 更新資源顯示 - 改進版
            function updateResourceDisplay() {
                try {
                    // 更新基本資源
                    if (elements.cycleCount) elements.cycleCount.textContent = gameData.cycle;
                    if (elements.jieqiValue) elements.jieqiValue.textContent = gameData.jieqi[gameData.jieqiIndex].name;
                    
                    // 更新絳珠和靈石，根據足夠與否添加不同樣式
                    if (elements.tearCount) {
                        elements.tearCount.textContent = gameData.resources.tear;
                        
                        // 對搜尋記憶來說，需要2滴絳珠
                        if (gameData.resources.tear >= 2) {
                            elements.tearCount.classList.add('sufficient');
                            elements.tearCount.classList.remove('insufficient');
                        } else {
                            elements.tearCount.classList.remove('sufficient');
                            
                            // 只在絳珠完全不足時才顯示不足
                            if (gameData.resources.tear < 1) {
                                elements.tearCount.classList.add('insufficient');
                            } else {
                                elements.tearCount.classList.remove('insufficient');
                            }
                        }
                    }
                    
                    if (elements.stoneCount) {
                        elements.stoneCount.textContent = gameData.resources.stone;
                        
                        // 對建築來說，通常需要10塊靈石
                        if (gameData.resources.stone >= 10) {
                            elements.stoneCount.classList.add('sufficient');
                            elements.stoneCount.classList.remove('insufficient');
                        } else {
                            elements.stoneCount.classList.remove('sufficient');
                            elements.stoneCount.classList.remove('insufficient');
                        }
                    }
                    
                    if (elements.memoryCount) elements.memoryCount.textContent = gameData.resources.memory;
                    
                    // 更新計數器
                    if (elements.flowerCount) 
                        elements.flowerCount.textContent = `${gameData.flowers.filter(f => f.level > 0).length}/12`;
                    if (elements.birdCount) 
                        elements.birdCount.textContent = `${gameData.birds.filter(b => b.unlocked).length}/12`;
                    if (elements.collectedMemoryCount) 
                        elements.collectedMemoryCount.textContent = `${gameData.memories.filter(m => m.collected).length}/24`;
                    if (elements.collectedTearCount) 
                        elements.collectedTearCount.textContent = `${gameData.tears.filter(t => t.collected).length}/12`;
                } catch (error) {
                    console.error("更新資源顯示時出錯:", error);
                }
            }
            
            // 更新輪迴進度條
            function updateCycleProgress() {
                // 計算進度百分比：(當前節氣 / 總節氣數量) * 100
                const progressPercent = (gameData.jieqiIndex / 24) * 100;
                
                // 更新進度條寬度
                if (elements.cycleProgressBar) {
                    elements.cycleProgressBar.style.width = `${progressPercent}%`;
                }
            }
            
            // 更新列表 - 改進版
            function updateLists() {
                try {
                    // 更新花魂列表
                    if (elements.flowersList) {
                        elements.flowersList.innerHTML = '';
                        
                        // 過濾並排序花魂：已解鎖的，再按等級排序
                        const sortedFlowers = gameData.flowers
                            .filter(f => f.unlocked)
                            .sort((a, b) => b.level - a.level);
                        
                        if (sortedFlowers.length === 0) {
                            elements.flowersList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">未發現花魂，建造建築解鎖</div>';
                        } else {
                            sortedFlowers.forEach(flower => {
                                const isNewlyUnlocked = flower.status === "待種植";
                                
                                // 計算成長條寬度
                                const growthWidth = flower.growth / 100 * 100;
                                
                                // 決定花魂狀態顯示
                                let statusHTML = '';
                                
                                if (flower.position === -1) {
                                    statusHTML = '<span style="color: #FFC107;">待種植</span>';
                                } else if (flower.level === 0) {
                                    statusHTML = '<span style="color: #4CAF50;">幼苗期</span>';
                                } else if (flower.level === flower.maxLevel) {
                                    statusHTML = '<span style="color: #9C27B0;">完全覺醒</span>';
                                } else {
                                    statusHTML = `<span style="color: #5D5CDE;">等級 ${flower.level}</span>`;
                                }
                                
                                const flowerItem = document.createElement('div');
                                flowerItem.className = `flower-item ${isNewlyUnlocked ? 'new-item' : ''}`;
                                flowerItem.innerHTML = `
                                    <div class="flower-item-icon">${flower.icon}</div>
                                    <div class="flower-item-details">
                                        <div class="item-name">${flower.name} (${flower.character})</div>
                                        <div class="item-level">
                                            ${statusHTML}
                                            ${flower.position !== -1 ? `
                                                <div class="progress-container" style="height: 6px; margin-top: 5px;">
                                                    <div class="progress-bar" style="width: ${growthWidth}%"></div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                                
                                // 添加點擊事件顯示詳情
                                flowerItem.addEventListener('click', () => {
                                    // 如果花魂已種植，顯示其位置
                                    if (flower.position !== -1) {
                                        // 閃爍對應格子
                                        const cellElement = document.querySelector(`.garden-cell[data-id="${flower.position}"]`);
                                        if (cellElement) {
                                            cellElement.classList.add('flashback');
                                            setTimeout(() => {
                                                cellElement.classList.remove('flashback');
                                            }, 2000);
                                        }
                                    }
                                    
                                    // 顯示詳細信息
                                    showDialog({
                                        title: `${flower.name} (${flower.character})`,
                                        content: `
                                            <p>${flower.description}</p>
                                            <div style="margin: 15px 0;">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                                    <span>等級: ${flower.level}/${flower.maxLevel}</span>
                                                    <span>${Math.floor(flower.growth)}%</span>
                                                </div>
                                                <div class="progress-container">
                                                    <div class="progress-bar" style="width: ${(flower.growth / 100) * 100}%"></div>
                                                </div>
                                            </div>
                                            <p><strong>當前狀態:</strong> ${flower.position === -1 ? '待種植' : '已種植'}</p>
                                            <p style="margin-top: 10px;"><strong>特殊照料:</strong> ${flower.specialCare}</p>
                                            <p style="margin-top: 10px;"><strong>季節生長速度:</strong> 
                                                春 ${flower.seasonalGrowth.春}x · 
                                                夏 ${flower.seasonalGrowth.夏}x · 
                                                秋 ${flower.seasonalGrowth.秋}x · 
                                                冬 ${flower.seasonalGrowth.冬}x
                                            </p>
                                            <p style="margin-top: 15px;"><strong>判詞:</strong> <em>${flower.judgmentPoem}</em></p>
                                        `,
                                        confirmText: '關閉',
                                        showCancel: false
                                    });
                                });
                                
                                elements.flowersList.appendChild(flowerItem);
                            });
                        }
                    }
                    
                    // 更新淚水列表
                    if (elements.tearsList) {
                        elements.tearsList.innerHTML = '';
                        
                        const collectedTears = gameData.tears.filter(t => t.collected);
                        
                        if (collectedTears.length === 0) {
                            elements.tearsList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">尚未收集特殊淚水</div>';
                        } else {
                            collectedTears.forEach(tear => {
                                const tearItem = document.createElement('div');
                                tearItem.className = 'tear-item';
                                
                                // 添加淚水偏好信息
                                const preferredFlowers = gameData.flowers.filter(f => 
                                    f.tearPreference && f.tearPreference.includes(tear.id));
                                
                                let preferredText = '';
                                if (preferredFlowers.length > 0) {
                                    preferredText = `<div style="font-size: 11px; margin-top: 3px; color: #4CAF50;">
                                        對 ${preferredFlowers.map(f => f.character).join('、')} 特效
                                    </div>`;
                                }
                                
                                tearItem.innerHTML = `
                                    <div class="tear-item-icon">${tear.icon}</div>
                                    <div class="tear-item-details">
                                        <div class="item-name">${tear.name}</div>
                                        <div class="item-description">${tear.description}</div>
                                        ${preferredText}
                                    </div>
                                `;
                                
                                tearItem.addEventListener('click', () => {
                                    showMemoryDialog({
                                        title: tear.name,
                                        content: `<div style="text-align: center;">
                                            <p>${tear.description}</p>
                                            <div class="poem" style="margin: 15px 0;">
                                                ${tear.scene}
                                            </div>
                                            <p><strong>效力:</strong> ${tear.potency}</p>
                                            ${preferredFlowers.length > 0 ? 
                                                `<p style="margin-top: 15px; color: #4CAF50;">
                                                    <strong>對以下花魂有加倍效果:</strong><br>
                                                    ${preferredFlowers.map(f => `${f.name} (${f.character})`).join('<br>')}
                                                </p>` : 
                                                ''}
                                        </div>`
                                    });
                                });
                                
                                elements.tearsList.appendChild(tearItem);
                            });
                        }
                    }
                    
                    // 更新鳥靈列表
                    if (elements.birdsList) {
                        elements.birdsList.innerHTML = '';
                        
                        const activeBirds = gameData.birds.filter(b => b.unlocked);
                        
                        if (activeBirds.length === 0) {
                            elements.birdsList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">尚未喚醒鳥靈，提升花魂等級解鎖</div>';
                        } else {
                            activeBirds.forEach(bird => {
                                const birdItem = document.createElement('div');
                                birdItem.className = 'bird-item';
                                birdItem.innerHTML = `
                                    <div class="bird-item-icon">${bird.icon}</div>
                                    <div class="bird-item-details">
                                        <div class="item-name">${bird.name} (${bird.character})</div>
                                        <div class="item-description">${bird.description}</div>
                                    </div>
                                `;
                                
                                birdItem.addEventListener('click', () => {
                                    // 查找關聯花魂
                                    const relatedFlower = gameData.flowers.find(f => f.id === bird.relatedFlower);
                                    
                                    showDialog({
                                        title: `${bird.name} (${bird.character})`,
                                        content: `
                                            <p>${bird.description}</p>
                                            <p style="margin-top: 15px;"><strong>特殊能力:</strong></p>
                                            <ul style="margin-top: 10px; padding-left: 20px;">
                                                ${bird.abilities.map(ability => `<li style="margin-bottom: 5px;">${ability}</li>`).join('')}
                                            </ul>
                                            ${relatedFlower ? 
                                                `<p style="margin-top: 15px;"><strong>關聯花魂:</strong> ${relatedFlower.name} (${relatedFlower.character})</p>` : 
                                                ''}
                                        `,
                                        confirmText: '關閉',
                                        showCancel: false
                                    });
                                });
                                
                                elements.birdsList.appendChild(birdItem);
                            });
                        }
                    }
                    
                    // 更新記憶列表
                    if (elements.memoriesList) {
                        elements.memoriesList.innerHTML = '';
                        
                        const collectedMemories = gameData.memories.filter(m => m.collected);
                        
                        if (collectedMemories.length === 0) {
                            elements.memoriesList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">尚未收集記憶碎片</div>';
                        } else {
                            // 按類型分組排序
                            const stoneMemories = collectedMemories.filter(m => m.type === "stone");
                            const tearMemories = collectedMemories.filter(m => m.type === "tear");
                            
                            // 先顯示靈石類記憶
                            if (stoneMemories.length > 0) {
                                const typeHeader = document.createElement('div');
                                typeHeader.className = 'memory-type-header';
                                typeHeader.innerHTML = `<div style="padding: 5px 10px; margin: 5px 0; background: rgba(93, 92, 222, 0.1); border-radius: 5px;">
                                    <span style="font-weight: bold; color: #5D5CDE;">寶玉領悟 (${stoneMemories.length})</span>
                                </div>`;
                                elements.memoriesList.appendChild(typeHeader);
                                
                                stoneMemories.forEach(memory => {
                                    createMemoryItem(memory);
                                });
                            }
                            
                            // 再顯示淚水類記憶
                            if (tearMemories.length > 0) {
                                const typeHeader = document.createElement('div');
                                typeHeader.className = 'memory-type-header';
                                typeHeader.innerHTML = `<div style="padding: 5px 10px; margin: 5px 0; background: rgba(139, 69, 19, 0.1); border-radius: 5px;">
                                    <span style="font-weight: bold; color: #8B4513;">黛玉記憶 (${tearMemories.length})</span>
                                </div>`;
                                elements.memoriesList.appendChild(typeHeader);
                                
                                tearMemories.forEach(memory => {
                                    createMemoryItem(memory);
                                });
                            }
                        }
                        
                        // 創建記憶項目的函數
                        function createMemoryItem(memory) {
                            const memoryItem = document.createElement('div');
                            memoryItem.className = 'memory-item';
                            
                            // 根據記憶類型顯示不同內容
                            let typeInfo = '';
                            if (memory.type === 'stone') {
                                typeInfo = `<span style="color: #5D5CDE;">獲得 ${memory.stoneValue} 靈石</span>`;
                            } else if (memory.type === 'tear') {
                                const relatedTear = gameData.tears.find(t => t.id === memory.relatedTear);
                                typeInfo = `<span style="color: #8B4513;">獲得 ${relatedTear?.name || '絳珠'}</span>`;
                            }
                            
                            memoryItem.innerHTML = `
                                <div class="memory-item-icon">${memory.icon}</div>
                                <div class="memory-item-details">
                                    <div class="item-name">${memory.name}</div>
                                    <div class="item-description">${memory.description}</div>
                                    ${typeInfo ? `<div style="font-size: 11px; margin-top: 3px;">${typeInfo}</div>` : ''}
                                </div>
                            `;
                            
                            memoryItem.addEventListener('click', () => {
                                showMemoryDialog({
                                    title: memory.name,
                                    content: `<div class="poem">${memory.content}</div>`
                                });
                            });
                            
                            elements.memoriesList.appendChild(memoryItem);
                        }
                    }
                } catch (error) {
                    console.error("更新列表時出錯:", error);
                }
            }
            
            // 獲取建築狀態文本
            function getConditionText(condition) {
                if (condition > 0.8) return '完好';
                if (condition > 0.5) return '略有破損';
                if (condition > 0.2) return '明顯破損';
                return '幾近坍塌';
            }
            
            // 添加事件監聽
            function addEventListeners() {
                // 行動按鈕
                if (elements.advanceJieqiBtn) {
                    elements.advanceJieqiBtn.addEventListener('click', advanceJieqi);
                }
                if (elements.collectTearsBtn) {
                    elements.collectTearsBtn.addEventListener('click', collectTears);
                }
                if (elements.searchMemoriesBtn) {
                    elements.searchMemoriesBtn.addEventListener('click', searchMemories);
                }
                
                // 對話框按鈕
                if (elements.memoryDialogClose) {
                    elements.memoryDialogClose.addEventListener('click', hideMemoryDialog);
                }
                if (elements.dialogClose) {
                    elements.dialogClose.addEventListener('click', hideDialog);
                }
                
                // 幫助按鈕
                if (elements.actionsHelp) {
                    elements.actionsHelp.addEventListener('click', () => showPanelHelp('actions'));
                }
                if (elements.flowersHelp) {
                    elements.flowersHelp.addEventListener('click', () => showPanelHelp('flowers'));
                }
                if (elements.tearsHelp) {
                    elements.tearsHelp.addEventListener('click', () => showPanelHelp('tears'));
                }
                if (elements.birdsHelp) {
                    elements.birdsHelp.addEventListener('click', () => showPanelHelp('birds'));
                }
                if (elements.memoriesHelp) {
                    elements.memoriesHelp.addEventListener('click', () => showPanelHelp('memories'));
                }
                
                // 教學按鈕
                if (elements.tutorialNext) {
                    elements.tutorialNext.addEventListener('click', nextTutorialStep);
                }
                if (elements.tutorialSkip) {
                    elements.tutorialSkip.addEventListener('click', skipTutorial);
                }
                
                // 推薦操作氣泡
                if (elements.bubbleClose) {
                    elements.bubbleClose.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (elements.actionSuggestion) {
                            elements.actionSuggestion.style.display = 'none';
                        }
                    });
                }
                
                if (elements.actionSuggestion) {
                    elements.actionSuggestion.addEventListener('click', (e) => {
                        if (e.target !== elements.bubbleClose) {
                            executeRecommendedAction();
                        }
                    });
                }
                
                // 主選單
                if (elements.menuToggle) {
                    elements.menuToggle.addEventListener('click', toggleMenu);
                }
                
                if (elements.menuTutorial) {
                    elements.menuTutorial.addEventListener('click', () => {
                        startTutorial();
                        closeMenu();
                    });
                }
                
                if (elements.menuTargets) {
                    elements.menuTargets.addEventListener('click', () => {
                        showCurrentGoals();
                        closeMenu();
                    });
                }
                
                if (elements.menuRestart) {
                    elements.menuRestart.addEventListener('click', () => {
                        showDialog({
                            title: '確認重置',
                            content: `<div style="text-align: center;">
                                <p>確定要重置遊戲嗎？</p>
                                <p style="margin-top: 15px; color: #F44336;">所有進度將會丟失！</p>
                            </div>`,
                            confirmText: '重置',
                            cancelText: '取消',
                            onConfirm: () => {
                                resetGame();
                                closeMenu();
                            }
                        });
                    });
                }
                
                // 點擊外部關閉選單
                document.addEventListener('click', (e) => {
                    if (elements.mainMenu && 
                        elements.mainMenu.classList.contains('menu-open') && 
                        !elements.mainMenu.contains(e.target)) {
                        closeMenu();
                    }
                });
            }
            
            // 切換選單
            function toggleMenu() {
                if (elements.mainMenu) {
                    elements.mainMenu.classList.toggle('menu-open');
                }
            }
            
            // 關閉選單
            function closeMenu() {
                if (elements.mainMenu) {
                    elements.mainMenu.classList.remove('menu-open');
                }
            }
            
            // 顯示當前目標
            function showCurrentGoals() {
                // 獲取當前進度
                const builtBuildings = gameData.buildings.filter(b => b.built).length;
                const totalBuildings = gameData.buildings.filter(b => b.unlocked).length;
                
                const plantedFlowers = gameData.flowers.filter(f => f.position !== -1).length;
                const unlockedFlowers = gameData.flowers.filter(f => f.unlocked).length;
                
                const awakenedBirds = gameData.birds.filter(b => b.unlocked).length;
                
                // 生成下一步目標列表
                let goalsHTML = '';
                
                // 建築目標
                if (builtBuildings < totalBuildings) {
                    const nextBuilding = gameData.buildings.find(b => !b.built && b.unlocked);
                    if (nextBuilding) {
                        goalsHTML += `<li style="margin-bottom: 8px;">建造 ${nextBuilding.name} (需要 ${nextBuilding.cost.stone} 靈石)</li>`;
                    }
                }
                
                // 花魂目標
                if (plantedFlowers < unlockedFlowers) {
                    const unplantedFlower = gameData.flowers.find(f => f.unlocked && f.position === -1);
                    if (unplantedFlower) {
                        goalsHTML += `<li style="margin-bottom: 8px;">種植 ${unplantedFlower.character} 的花魂</li>`;
                    }
                }
                
                // 澆灌目標
                const lowLevelFlowers = gameData.flowers.filter(f => f.position !== -1 && f.level < 3);
                if (lowLevelFlowers.length > 0) {
                    goalsHTML += `<li style="margin-bottom: 8px;">澆灌花魂至少到 Lv3 以解鎖鳥靈</li>`;
                }
                
                // 收集記憶目標
                const memoryCount = gameData.memories.filter(m => m.collected).length;
                if (memoryCount < 10) {
                    goalsHTML += `<li style="margin-bottom: 8px;">繼續收集記憶碎片 (${memoryCount}/24)</li>`;
                }
                
                // 輪迴目標
                if (gameData.cycle < 3) {
                    goalsHTML += `<li style="margin-bottom: 8px;">完成 ${3 - gameData.cycle} 輪輪迴以達成結局</li>`;
                }
                
                // 特殊節氣目標
                const currentJieqi = gameData.jieqi[gameData.jieqiIndex].name;
                const upcomingMemories = gameData.memories.filter(m => 
                    !m.collected && ['清明', '立夏', '夏至', '白露', '冬至'].includes(m.requiredJieqi));
                
                if (upcomingMemories.length > 0) {
                    const nextMemoryJieqi = upcomingMemories[0].requiredJieqi;
                    goalsHTML += `<li style="margin-bottom: 8px;">推進節氣至 ${nextMemoryJieqi} 可觸發特殊記憶</li>`;
                }
                
                // 顯示目標對話框
                showDialog({
                    title: '當前目標',
                    content: `<div style="text-align: left;">
                        <p>大觀園重建進度：</p>
                        <div style="margin: 15px 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span>建築</span>
                                <span>${builtBuildings}/${totalBuildings}</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${(builtBuildings / Math.max(1, totalBuildings)) * 100}%"></div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0 5px 0;">
                                <span>花魂</span>
                                <span>${gameData.flowers.filter(f => f.level > 0).length}/12</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${(gameData.flowers.filter(f => f.level > 0).length / 12) * 100}%"></div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0 5px 0;">
                                <span>鳥靈</span>
                                <span>${awakenedBirds}/12</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${(awakenedBirds / 12) * 100}%"></div>
                            </div>
                        </div>
                        
                        <p style="margin-top: 20px;">推薦接下來：</p>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            ${goalsHTML || '<li>恭喜！你已完成所有主要目標</li>'}
                        </ul>
                        
                        <p style="margin-top: 20px; color: #5D5CDE; font-style: italic;">
                            當前輪迴: ${gameData.cycle}/3
                            · 當前節氣: ${currentJieqi}
                        </p>
                    </div>`,
                    confirmText: '關閉',
                    showCancel: false
                });
            }
            
            // 顯示面板幫助
            function showPanelHelp(panelType) {
                let title = '';
                let content = '';
                
                switch (panelType) {
                    case 'actions':
                        title = '行動面板幫助';
                        content = `<div style="text-align: left;">
                            <p><strong>推進節氣</strong>：時間前進一個節氣。每24個節氣組成一個完整輪迴。</p>
                            <p style="margin-top: 10px;"><strong>尋找絳珠</strong>：收集黛玉的淚水，用於澆灌花魂和建造建築。</p>
                            <p style="margin-top: 10px;"><strong>尋找寶玉領悟</strong>：尋找寶玉的思考記憶，獲得靈石用於建造。</p>
                            <p style="margin-top: 15px; color: #5D5CDE;">提示：不同節氣會影響花魂生長速度和特殊事件觸發。</p>
                        </div>`;
                        break;
                        
                    case 'flowers':
                        title = '花魂系統幫助';
                        content = `<div style="text-align: left;">
                            <p>花魂是大觀園中少女們的前世化身，需要用絳珠澆灌才能成長。</p>
                            <p style="margin-top: 10px;"><strong>解鎖方式</strong>：建造對應的建築。</p>
                            <p style="margin-top: 10px;"><strong>成長需知</strong>：</p>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li>不同花魂對特定淚水有偏好，使用偏好淚水效果加倍</li>
                                <li>季節會影響花魂成長速度</li>
                                <li>花魂達到3級會解鎖關聯鳥靈</li>
                                <li>花魂達到滿級會完全覺醒，揭示判詞</li>
                            </ul>
                        </div>`;
                        break;
                        
                    case 'tears':
                        title = '絳珠系統幫助';
                        content = `<div style="text-align: left;">
                            <p>絳珠是黛玉的淚水，是遊戲中的重要資源。</p>
                            <p style="margin-top: 10px;"><strong>獲取方式</strong>：</p>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li>使用「尋找絳珠」行動</li>
                                <li>推進節氣時，鳥靈可自動收集</li>
                                <li>收集記憶碎片有機會獲得特殊絳珠</li>
                            </ul>
                            <p style="margin-top: 10px;"><strong>特殊絳珠</strong>：每種特殊絳珠對應黛玉生命中的特定場景，對特定花魂有加倍效果。</p>
                        </div>`;
                        break;
                        
                    case 'birds':
                        title = '鳥靈系統幫助';
                        content = `<div style="text-align: left;">
                            <p>鳥靈是丫鬟們的化身，能提供特殊能力幫助你重建大觀園。</p>
                            <p style="margin-top: 10px;"><strong>解鎖方式</strong>：將關聯花魂培養至3級。</p>
                            <p style="margin-top: 10px;"><strong>鳥靈能力</strong>：</p>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li>自動收集絳珠</li>
                                <li>減緩建築衰敗</li>
                                <li>提供其他特殊能力</li>
                            </ul>
                        </div>`;
                        break;
                        
                    case 'memories':
                        title = '記憶系統幫助';
                        content = `<div style="text-align: left;">
                            <p>記憶碎片是紅樓夢中的場景和情節，收集後可獲得資源。</p>
                            <p style="margin-top: 10px;"><strong>記憶類型</strong>：</p>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li><span style="color: #8B4513;">黛玉記憶</span>：收集後獲得特殊絳珠</li>
                                <li><span style="color: #5D5CDE;">寶玉領悟</span>：收集後獲得靈石</li>
                            </ul>
                            <p style="margin-top: 10px;"><strong>觸發方式</strong>：</p>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li>使用「尋找寶玉領悟」行動</li>
                                <li>推進節氣有機會隨機生成</li>
                                <li>特定節氣與花魂互動會觸發特殊記憶</li>
                            </ul>
                        </div>`;
                        break;
                }
                
                showDialog({
                    title: title,
                    content: content,
                    confirmText: '了解',
                    showCancel: false
                });
            }
            
            // 設置初始建築
            function setupInitialBuilding() {
                const baseCampIndex = gameData.cells.findIndex(c => c.id === 12);
                if (baseCampIndex !== -1) {
                    gameData.cells[baseCampIndex].buildingId = 'base-camp';
                    gameData.cells[baseCampIndex].type = 'building';
                }
            }
            
            // 檢測暗黑模式
            function detectDarkMode() {
                try {
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.documentElement.classList.add('dark');
                    }
                    
                    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                        if (event.matches) {
                            document.documentElement.classList.add('dark');
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    });
                } catch (e) {
                    console.log("無法設置暗黑模式:", e);
                }
            }
            
            // 顯示RPG風格對話框
            function showRpgDialog(messages, portrait = "👸", speaker = "警幻仙子", onComplete = null) {
                // 獲取對話框元素
                const overlay = document.getElementById('rpg-dialog-overlay');
                const textElement = document.getElementById('rpg-text');
                const portraitElement = document.getElementById('rpg-portrait');
                const speakerElement = document.getElementById('rpg-speaker');
                
                if (!overlay || !textElement || !portraitElement || !speakerElement) {
                    console.error("找不到RPG對話框必要元素");
                    return;
                }
                
                // 設置角色頭像和名稱
                portraitElement.textContent = portrait;
                speakerElement.textContent = speaker;
                
                // 開始時清空文本
                textElement.textContent = '';
                
                // 顯示對話框
                overlay.classList.add('active');
                
                let currentMessageIndex = 0;
                let charIndex = 0;
                let currentMessage = messages[currentMessageIndex];
                let typing = true;
                
                // 打字機效果
                function typeWriter() {
                    if (charIndex < currentMessage.length) {
                        // 每次添加一個字符
                        textElement.textContent += currentMessage.charAt(charIndex);
                        charIndex++;
                        setTimeout(typeWriter, 30); // 打字速度
                    } else {
                        typing = false; // 當前消息已打完
                    }
                }
                
                // 開始第一條消息的打字效果
                typeWriter();
                
                // 處理點擊事件
                function handleClick() {
                    if (typing) {
                        // 如果正在打字，則立即顯示完整消息
                        textElement.textContent = currentMessage;
                        typing = false;
                        charIndex = currentMessage.length;
                    } else {
                        // 已顯示完當前消息，進入下一條
                        currentMessageIndex++;
                        
                        if (currentMessageIndex < messages.length) {
                            // 還有下一條消息
                            charIndex = 0;
                            currentMessage = messages[currentMessageIndex];
                            textElement.textContent = '';
                            typing = true;
                            typeWriter();
                        } else {
                            // 所有消息顯示完畢
                            overlay.classList.remove('active');
                            overlay.removeEventListener('click', handleClick);
                            
                            // 如果有回調函數，執行它
                            if (typeof onComplete === 'function') {
                                setTimeout(() => {
                                    onComplete();
                                }, 300);
                            }
                        }
                    }
                }
                
                // 添加點擊事件監聽器
                overlay.addEventListener('click', handleClick);
            }
            
            // 顯示開場對話
            function showIntroDialog() {
                // 定義對話內容
                const dialogMessages = [
                    "幾世幾劫之後，神瑛侍者終於覺醒...",
                    "神瑛，你手持著黛玉最後的一滴淚水，回到大觀園試圖重建這片記憶中的樂土。",
                    "黛玉曾為還你當年澆灌之恩，流盡萬千眼淚。如今，你將以她的淚水反哺眾花魂。",
                    "你的使命是重建大觀園的建築，收集黛玉的淚水，用淚水澆灌花魂，並喚醒化為鳥靈的丫鬟們。",
                    "但請記住，無論多少淚水，終難敵過時間的力量...",
                    "願你此行，一償黛玉還淚之願。"
                ];
                
                // 使用RPG風格對話框顯示開場對話
                showRpgDialog(dialogMessages, "👸", "警幻仙子", () => {
                    console.log("開場對話播放完畢");
                    gameData.introShown = true;
                    
                    // 開場對話結束後開始教學
                    setTimeout(() => {
                        startTutorial();
                    }, 800);
                });
            }
            
            // 教學系統
            function startTutorial() {
                // 如果已完成教學且沒有明確要求重新開始，直接返回
                if (gameData.tutorialCompleted && !gameData.tutorialRestart) {
                    return;
                }
                
                // 重置教學步驟
                gameData.tutorialStep = 0;
                showTutorialStep(0);
            }
            
            function nextTutorialStep() {
                gameData.tutorialStep++;
                showTutorialStep(gameData.tutorialStep);
            }
            
            function skipTutorial() {
                gameData.tutorialCompleted = true;
                if (elements.tutorialOverlay) {
                    elements.tutorialOverlay.classList.remove('active');
                }
                showHint('教學已跳過', '您可以通過左下角選單重新開始教學', '📚');
            }
            
            function showTutorialStep(step) {
                const tutorialSteps = [
                    // 步驟1: 歡迎
                    {
                        title: "歡迎來到紅樓舊夢",
                        content: "你是神瑛侍者，回到大觀園尋找黛玉的淚水與記憶。讓我為你介紹遊戲的基本操作。",
                        highlight: ".header",
                        position: { top: "100px", left: "50%", transform: "translateX(-50%)" }
                    },
                    // 步驟2: 資源
                    {
                        title: "遊戲資源",
                        content: "遊戲中有三種主要資源：<strong>絳珠</strong>(淚水)、<strong>靈石</strong>和<strong>記憶碎片</strong>。它們用於建造建築和培養花魂。",
                        highlight: ".game-status",
                        position: { top: "150px", left: "50%", transform: "translateX(-50%)" }
                    },
                    // 步驟3: 園林格子
                    {
                        title: "大觀園",
                        content: "這是大觀園的主要區域。點擊空白格子可以建造建築或種植花魂。帶有🔒符號的格子需要解鎖。",
                        highlight: ".garden-area",
                        position: { top: "250px", right: "350px" }
                    },
                    // 步驟4: 行動面板
                    {
                        title: "行動面板",
                        content: "<strong>推進節氣</strong>: 時間前進一步。<br><strong>尋找絳珠</strong>: 收集淚水資源。<br><strong>尋找寶玉領悟</strong>: 獲取靈石用於建造。",
                        highlight: "#actions-panel",
                        position: { top: "450px", left: "60%", width: "280px" }
                    },
                    // 步驟5: 建築和花魂
                    {
                        title: "建築與花魂",
                        content: "首先需要建造建築，然後才能種植對應的花魂。花魂需要用淚水澆灌才能成長。",
                        highlight: "#flowers-panel",
                        position: { top: "350px", left: "75%" }
                    },
                    // 步驟6: 絳珠收集
                    {
                        title: "淚水收集",
                        content: "點擊「尋找絳珠」按鈕，收集黛玉的淚水。不同淚水對不同花魂有特殊效果。",
                        highlight: "#collect-tears",
                        position: { top: "280px", left: "75%" }
                    },
                    // 步驟7: 節氣系統
                    {
                        title: "節氣與輪迴",
                        content: "每24個節氣完成一個輪迴。不同季節對花魂生長有不同影響。特定節氣會觸發特殊事件。",
                        highlight: ".jieqi-indicator",
                        position: { top: "120px", right: "150px" }
                    },
                    // 步驟8: 開始遊戲
                    {
                        title: "開始您的還淚之旅",
                        content: "現在，請先點擊「尋找絳珠」按鈕收集淚水，然後建造一座建築，開始您的紅樓還淚之旅！",
                        highlight: "#collect-tears",
                        position: { top: "280px", left: "75%" }
                    }
                ];
                
                // 檢查是否已完成教學
                if (step >= tutorialSteps.length) {
                    gameData.tutorialCompleted = true;
                    if (elements.tutorialOverlay) {
                        elements.tutorialOverlay.classList.remove('active');
                    }
                    
                    // 顯示第一個提示
                    showHint('準備開始', '點擊「尋找絳珠」按鈕收集淚水', '💧');
                    
                    // 高亮推薦按鈕
                    if (elements.collectTearsBtn) {
                        elements.collectTearsBtn.classList.add('recommended');
                    }
                    
                    return;
                }
                
                const currentStep = tutorialSteps[step];
                
                // 激活教學覆蓋層
                if (elements.tutorialOverlay) {
                    elements.tutorialOverlay.classList.add('active');
                }
                
                // 高亮目標元素
                if (elements.tutorialHighlight) {
                    const targetElement = document.querySelector(currentStep.highlight);
                    if (targetElement) {
                        const rect = targetElement.getBoundingClientRect();
                        
                        elements.tutorialHighlight.style.width = `${rect.width + 10}px`;
                        elements.tutorialHighlight.style.height = `${rect.height + 10}px`;
                        elements.tutorialHighlight.style.top = `${rect.top - 5}px`;
                        elements.tutorialHighlight.style.left = `${rect.left - 5}px`;
                    }
                }
                
                // 設置提示框位置和內容
                if (elements.tutorialTooltip) {
                    for (const [key, value] of Object.entries(currentStep.position)) {
                        elements.tutorialTooltip.style[key] = value;
                    }
                    
                    if (elements.tutorialTitle) {
                        elements.tutorialTitle.textContent = currentStep.title;
                    }
                    
                    if (elements.tutorialContent) {
                        elements.tutorialContent.innerHTML = currentStep.content;
                    }
                    
                    if (elements.tutorialProgress) {
                        elements.tutorialProgress.textContent = `${step + 1}/${tutorialSteps.length}`;
                    }
                    
                    if (elements.tutorialNext) {
                        elements.tutorialNext.textContent = step === tutorialSteps.length - 1 ? '完成' : '下一步';
                    }
                }
            }
            
            // 顯示提示
            function showHint(title, message, icon = '💡') {
                if (!elements.hintContainer) return;
                
                const hintId = Date.now();
                const hintElement = document.createElement('div');
                hintElement.className = 'hint';
                hintElement.id = `hint-${hintId}`;
                hintElement.innerHTML = `
                    <span class="hint-close">&times;</span>
                    <div class="hint-title">
                        <span class="hint-icon">${icon}</span>
                        ${title}
                    </div>
                    <div class="hint-content">${message}</div>
                    <div class="hint-progress"></div>
                `;
                
                elements.hintContainer.appendChild(hintElement);
                
                // 為提示添加關閉事件
                const closeBtn = hintElement.querySelector('.hint-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        removeHint(hintId);
                    });
                }
                
                // 延遲顯示，添加動畫效果
                setTimeout(() => {
                    hintElement.classList.add('show');
                }, 100);
                
                // 6秒後自動消失
                setTimeout(() => {
                    removeHint(hintId);
                }, 6000);
            }
            
            // 移除提示
            function removeHint(hintId) {
                const hintElement = document.getElementById(`hint-${hintId}`);
                if (hintElement) {
                    hintElement.classList.remove('show');
                    setTimeout(() => {
                        if (hintElement.parentNode) {
                            hintElement.parentNode.removeChild(hintElement);
                        }
                    }, 500);
                }
            }
            
            // 檢查用戶閒置時間
            function checkIdleTime() {
                const currentTime = Date.now();
                const idleTime = currentTime - gameData.lastActionTime;
                
                // 如果閒置時間超過30秒，且沒有活躍對話框
                if (idleTime > 30000 && 
                    !elements.dialogOverlay.classList.contains('active') && 
                    !elements.memoryDialogOverlay.classList.contains('active') &&
                    !elements.tutorialOverlay.classList.contains('active')) {
                    
                    // 更新建議的下一步操作
                    updateSuggestedActions();
                    
                    // 顯示推薦行動
                    showSuggestion();
                }
            }
            
            // 更新建議的下一步操作
            function updateSuggestedActions() {
                // 根據當前進度分析下一步最佳操作
                const nextAction = {
                    nextBuildingId: null,
                    nextFlowerId: null,
                    nextAction: null
                };
                
                // 如果沒有淚水，建議收集淚水
                if (gameData.resources.tear === 0) {
                    nextAction.nextAction = 'collect-tears';
                }
                // 如果有未建造的建築且有足夠資源，建議建造
                else if (gameData.buildings.some(b => !b.built && b.unlocked && 
                    gameData.resources.tear >= b.cost.tear && 
                    gameData.resources.stone >= b.cost.stone)) {
                    
                    const nextBuilding = gameData.buildings.find(b => !b.built && b.unlocked && 
                        gameData.resources.tear >= b.cost.tear && 
                        gameData.resources.stone >= b.cost.stone);
                    
                    if (nextBuilding) {
                        nextAction.nextBuildingId = nextBuilding.id;
                    }
                }
                // 如果有未種植的花魂，建議種植
                else if (gameData.flowers.some(f => f.unlocked && f.position === -1)) {
                    const nextFlower = gameData.flowers.find(f => f.unlocked && f.position === -1);
                    if (nextFlower) {
                        nextAction.nextFlowerId = nextFlower.id;
                    }
                }
                // 如果有已種植但未滿級的花魂且有淚水，建議澆灌
                else if (gameData.flowers.some(f => f.position !== -1 && f.level < f.maxLevel) && 
                    gameData.resources.tear > 0) {
                    
                    // 不直接指定操作，而是依賴UI突出顯示花魂格子
                }
                // 如果靈石不足但淚水足夠，建議尋找寶玉領悟
                else if (gameData.resources.stone < 10 && gameData.resources.tear >= 2) {
                    nextAction.nextAction = 'search-memories';
                }
                // 其他情況，推進節氣
                else {
                    nextAction.nextAction = 'advance-jieqi';
                }
                
                // 更新全局推薦操作
                gameData.suggestedActions = nextAction;
                
                return nextAction;
            }
            
            // 顯示建議操作
            function showSuggestion() {
                if (!elements.actionSuggestion) return;
                
                // 準備建議文本和位置
                let suggestionText = '';
                let targetElement = null;
                let bubbleIcon = '💡';
                
                if (gameData.suggestedActions.nextBuildingId) {
                    // 建議建造建築
                    const building = gameData.buildings.find(b => b.id === gameData.suggestedActions.nextBuildingId);
                    suggestionText = `建議建造 ${building?.name || '建築'}，點擊空白格子開始建造`;
                    targetElement = document.querySelector(`.garden-cell:not(.has-building):not(.has-flower):not(.has-memory):not(.unlock-required)`);
                    bubbleIcon = '🏠';
                } else if (gameData.suggestedActions.nextFlowerId) {
                    // 建議種植花魂
                    const flower = gameData.flowers.find(f => f.id === gameData.suggestedActions.nextFlowerId);
                    suggestionText = `建議種植 ${flower?.character || '花魂'}，點擊空白格子放置花魂`;
                    targetElement = document.querySelector(`.garden-cell:not(.has-building):not(.has-flower):not(.has-memory):not(.unlock-required)`);
                    bubbleIcon = '🌺';
                } else if (gameData.suggestedActions.nextAction) {
                    // 建議執行行動
                    switch (gameData.suggestedActions.nextAction) {
                        case 'collect-tears':
                            suggestionText = `建議收集絳珠，為花魂澆灌或建築提供資源`;
                            targetElement = elements.collectTearsBtn;
                            bubbleIcon = '💧';
                            break;
                        case 'search-memories':
                            suggestionText = `建議尋找寶玉領悟，獲取靈石用於建造`;
                            targetElement = elements.searchMemoriesBtn;
                            bubbleIcon = '🧠';
                            break;
                        case 'advance-jieqi':
                            suggestionText = `建議推進節氣，前進到下一個時間點`;
                            targetElement = elements.advanceJieqiBtn;
                            bubbleIcon = '🌱';
                            break;
                    }
                }
                
                // 如果找到目標元素，定位和顯示建議
                if (targetElement && suggestionText) {
                    const rect = targetElement.getBoundingClientRect();
                    
                    // 設置氣泡位置，盡量不遮擋元素
                    const bubbleElement = elements.actionSuggestion;
                    bubbleElement.style.top = `${rect.top - 70}px`;
                    bubbleElement.style.left = `${rect.left + rect.width / 2 - 125}px`;
                    
                    // 更新氣泡內容
                    const bubbleTextElement = bubbleElement.querySelector('.bubble-text');
                    const bubbleIconElement = bubbleElement.querySelector('.bubble-icon');
                    
                    if (bubbleTextElement) bubbleTextElement.textContent = suggestionText;
                    if (bubbleIconElement) bubbleIconElement.textContent = bubbleIcon;
                    
                    // 顯示氣泡
                    bubbleElement.style.display = 'flex';
                    
                    // 高亮目標元素
                    if (gameData.suggestedActions.nextAction) {
                        const actionBtn = document.getElementById(`${gameData.suggestedActions.nextAction}`);
                        if (actionBtn) {
                            actionBtn.classList.add('recommended');
                            
                            // 5秒後移除高亮
                            setTimeout(() => {
                                actionBtn.classList.remove('recommended');
                            }, 5000);
                        }
                    }
                    
                    // 10秒後隱藏氣泡
                    setTimeout(() => {
                        bubbleElement.style.display = 'none';
                    }, 10000);
                }
            }
            
            // 執行推薦操作
            function executeRecommendedAction() {
                if (gameData.suggestedActions.nextAction) {
                    // 點擊推薦按鈕
                    const actionBtn = document.getElementById(`${gameData.suggestedActions.nextAction}`);
                    if (actionBtn) {
                        actionBtn.click();
                    }
                } else if (gameData.suggestedActions.nextBuildingId || gameData.suggestedActions.nextFlowerId) {
                    // 顯示通用提示
                    showHint('提示', '點擊空白格子開始建造或種植', '🔍');
                }
                
                // 隱藏建議氣泡
                if (elements.actionSuggestion) {
                    elements.actionSuggestion.style.display = 'none';
                }
            }
        } // 結束 initializeGame 函數
