import { gameData, featureFlags, config, actionCosts } from './state.js';
// 導入新模塊
import { initElements, getElements } from './core/elements.js';
import { initializeActionCostLabels, updateActionPointsUI, consumeActionPoints, consumeActionPointsWithHint, resetActionPoints } from './core/action-points.js';
import { showDialog, hideDialog, showMemoryDialog, hideMemoryDialog, showRpgDialog } from './ui/dialogs.js';
import { showHint, removeHint } from './ui/hints.js';
import { updateResourceDisplay, updateCycleProgress, getConditionText } from './ui/display.js';
import { updateLists } from './ui/lists.js';
import { toggleMenu, closeMenu, showCurrentGoals } from './ui/menu.js';
import { startTutorial, nextTutorialStep, skipTutorial } from './ui/tutorial.js';
import { initGarden, handleCellClick } from './game/garden.js';
import { plantFlower, waterFlowerWithTear, showWateringDialog, checkSpecialInteractions } from './game/flowers.js';
import { showBuildDialog, buildStructure, repairBuilding } from './game/buildings.js';
import { collectMemory, spawnMemory, checkStoryLineMilestones } from './game/memories.js';
import { advanceJieqi } from './game/seasons.js';
import { showMemorySelectionDialog } from './game/memory-discovery.js';
import { checkEvents, triggerWhiteFade } from './game/events.js';
import { updateSuggestedActions, showSuggestion, executeRecommendedAction } from './utils/suggestions.js';
import { detectDarkMode } from './utils/helpers.js';
import { particleSystem } from './ui/particles.js';

// 遊戲主流程
export function initializeGame() {
            // 使用新的元素管理器
            const elements = initElements();

            // 初始化粒子系統
            particleSystem.init('particle-container');

            initializeActionCostLabels();
            updateActionPointsUI();
            
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
                
                // 每隔一段時間更新推薦操作（已禁用提示氣泡顯示）
                // setInterval(updateSuggestedActions, 10000);
            } catch (error) {
                console.error("遊戲初始化錯誤:", error);
                showHint('錯誤', '遊戲初始化失敗，請刷新頁面重試', '❌');
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
                    nextAction: 'unlock-memory' // 建議答題解鎖記憶
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
                        <p style="margin-top: 15px;">白茫茫之上，記憶重新破碎。</p>
                        <p style="margin-top: 15px;">這一世，你將重新用絳珠灌溉花魂，重建大觀園的記憶。</p>
                        <p style="margin-top: 20px; color: #5D5CDE;">願你能找回更多的記憶，讓這場夢不至完全消散...</p>
                    </div>`
                });
                
                // 延遲顯示教學
                setTimeout(() => {
                    startTutorial();
                }, 2000);
            }
            
            // 添加事件監聽
            function addEventListeners() {
                // 行動按鈕
                if (elements.advanceJieqiBtn) {
                    elements.advanceJieqiBtn.addEventListener('click', advanceJieqi);
                }
                
                // 尋找記憶按鈕
                const searchMemoriesBtn = document.getElementById('search-memories');
                if (searchMemoriesBtn) {
                    console.log('找到尋找記憶按鈕，添加事件監聽器');
                    searchMemoriesBtn.onclick = async (e) => {
                        console.log('尋找記憶按鈕被點擊');
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            await showMemorySelectionDialog();
                        } catch (err) {
                            console.error('顯示記憶選擇對話框失敗:', err);
                            console.error('錯誤堆棧:', err.stack);
                            alert('顯示記憶選擇對話框失敗：' + (err.message || err));
                        }
                    };
                } else {
                    console.error('尋找記憶按鈕不存在！');
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
            
            // 顯示開場對話
            function showIntroDialog() {
                // 根據設計文檔優化的開場對話
                // 建立世界觀：正文結束後，石頭在太虛幻境版大觀園中整理記憶
                // 明確玩家身份：神瑛侍者 = 賈寶玉 = 青埂峰頑石（三位一體）
                // 明確遊戲空間：石頭內部的記憶空間版大觀園
                // 明確核心主題：記憶 vs 時間
                // 明確玩家目標：用林黛玉的絳珠灌溉大觀園花魂，重建園中景致與眾人的美好記憶
                const dialogMessages = [
                    "白茫茫大地一片真乾淨...",
                    "正文已結束，人間的故事已經散場。",
                    "而你，青埂峰下的頑石，帶著殘留的記憶與情感，在太虛幻境中甦醒。",
                    "你是神瑛侍者，也是賈寶玉，更是這塊通靈寶玉本身——三位一體。",
                    "此刻，你身處的不是真實的大觀園，而是石頭內部的記憶空間。",
                    "這裡的一切——建築、花魂、四季流轉——都是記憶的投影。",
                    "時間會沖刷一切，連夢都會被忘記。",
                    "你對那一生的記憶，只剩下模糊的感覺：",
                    "「有很多女子...她們行止見識皆在我之上...」",
                    "「大觀園中曾有過詩社、遊園、四季景致...」",
                    "「但那些美好的細節，正在一點點消散...」",
                    "警幻仙子告訴你：只有林黛玉的絳珠，才能澆灌大觀園中的花魂。",
                    "這些花魂，是那些女子的化身。",
                    "用絳珠灌溉她們，讓她們重新綻放，你才能找回那些美好的記憶。",
                    "你的目標是：",
                    "收集絳珠，重建大觀園的建築與景致，",
                    "用絳珠灌溉花魂，讓她們重新甦醒，",
                    "在時間抹平一切之前，盡可能保留大觀園最美好的記憶與細節。",
                    "這不是改命，也不是救人，",
                    "而是在時間的洪流中，記錄一場夢。",
                    "願你能找回足夠的記憶，讓這場夢不至完全消散..."
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
            
            // 檢查用戶閒置時間
            function checkIdleTime() {
                const currentTime = Date.now();
                const idleTime = currentTime - gameData.lastActionTime;
                
                // 如果閒置時間超過30秒，且沒有活躍對話框
                if (idleTime > 30000 && 
                    !elements.dialogOverlay.classList.contains('active') && 
                    !elements.memoryDialogOverlay.classList.contains('active') &&
                    !elements.tutorialOverlay.classList.contains('active')) {
                    
                    // 更新建議的下一步操作（已禁用提示氣泡顯示）
                    // updateSuggestedActions();
                    
                    // 顯示推薦行動（已禁用）
                    // showSuggestion();
                }
            }
        } // 結束 initializeGame 函數
