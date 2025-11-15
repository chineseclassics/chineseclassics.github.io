// 遊戲變數
let currentScene = "start";
let isTyping = false;
const typingSpeed = 50;
let gameHistory = [];
let gameEndCondition = null;

// 遊戲數據
const gameData = {
    player: {
        attributes: {
            emotion: 8,      // 情感
            insight: 6,      // 洞察
            etiquette: 5,    // 禮儀
            poetry: 7        // 詩文
        },
        relationships: {
            daiyu: 90,       // 與黛玉的關係
            baochai: 65,     // 與寶釵的關係
            xifeng: 50       // 與王熙鳳的關係
        },
        thoughts: []
    },
    
    inventory: [
        "通靈寶玉",
        "荷包一個（黛玉所贈）",
        "《會真記》殘本"
    ],
    
    scenes: {} // 將從JSON文件加載
};

// DOM元素
let gameTextElement, choicesContainer, innerThoughtContainer, innerThoughtElement, thoughtCabinetElement, inventoryElement;

// 場景映射表 - 為缺失場景提供替代場景
const sceneMapping = {
    // 缺失場景的映射
    "secret_visit_daiyu": "visit_daiyu_first",
    "check_on_daiyu": "visit_daiyu_first",
    "leave_for_daiyu": "visit_daiyu_first",
    "deflect_xifeng": "greeting_grandma",
    "concerned_about_protocol": "greeting_grandma",
    "bring_food_to_daiyu": "visit_daiyu_first",
    "wait_in_room": "contemplation",
    "offer_food": "gentle_greeting",
    "share_view": "gentle_greeting",
    "discuss_literature": "gentle_greeting",
    "apologize_for_sneaking": "gentle_greeting",
    "compliment_focus": "gentle_greeting",
    "express_deep_concern": "gentle_greeting",
    "offer_companionship": "gentle_greeting",
    "discuss_poetry_with_baochai": "talk_to_baochai",
    "compliment_baochai": "talk_to_baochai",
    "ask_baochai_about_daiyu": "talk_to_baochai",
    "participate_actively": "greeting_grandma",
    "excuse_yourself": "visit_daiyu_first",
    "overhear_daiyu": "greeting_grandma",
    "share_wisdom_daiyu": "visit_daiyu_first",
    "return_to_gathering": "greeting_grandma",
    "final_farewell_daiyu": "visit_daiyu_first",
    "read_poetry": "contemplation"
};

// 結局判定條件
const endingConditions = {
    // 出家修行結局
    monk_ending: {
        check: () => gameData.player.attributes.insight >= 15 && gameData.player.attributes.emotion <= 3,
        priority: 5
    },
    // 與黛玉的愛情結局
    daiyu_love_ending: {
        check: () => gameData.player.relationships.daiyu >= 150 && gameData.player.attributes.emotion >= 15,
        priority: 4
    },
    // 與寶釵的婚姻結局
    baochai_marriage_ending: {
        check: () => gameData.player.relationships.baochai >= 120 && gameData.player.attributes.etiquette >= 12,
        priority: 3
    },
    // 悲劇結局
    tragic_ending: {
        check: () => gameData.player.relationships.daiyu <= 30 && gameData.player.relationships.baochai <= 30 && gameData.player.attributes.etiquette <= 2,
        priority: 2
    },
    // 默認結局
    default_ending: {
        check: () => true,
        priority: 1
    }
};

// 初始化函數
async function initGame() {
    // 獲取DOM元素
    gameTextElement = document.getElementById('game-text');
    choicesContainer = document.getElementById('choices-container');
    innerThoughtContainer = document.getElementById('inner-thought-container');
    innerThoughtElement = document.getElementById('inner-thought');
    thoughtCabinetElement = document.getElementById('thought-cabinet');
    inventoryElement = document.getElementById('inventory');

    // 加載場景數據
    await loadScenes();
    
    // 更新UI
    updateUI();
    
    // 開始遊戲
    displayScene(currentScene);
}

// 加載場景數據
async function loadScenes() {
    try {
        const response = await fetch('scenes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        gameData.scenes = await response.json();
        console.log('場景數據加載成功');
    } catch (error) {
        console.error('加載場景數據失敗:', error);
        // 如果加載失敗，使用基本場景數據
        gameData.scenes = {
            start: {
                text: "遊戲數據加載失敗，請檢查網絡連接。",
                innerThought: "通靈寶玉微微發涼，似乎感受到了不安。",
                choices: [
                    { text: "重新開始", nextScene: "start" }
                ]
            }
        };
    }
}

// 顯示場景
function displayScene(sceneId) {
    // 檢查場景是否存在，如果不存在則使用映射
    if (!gameData.scenes[sceneId]) {
        if (sceneMapping[sceneId]) {
            sceneId = sceneMapping[sceneId];
        } else {
            console.warn(`場景 ${sceneId} 不存在，使用錯誤場景`);
            sceneId = "error_scene";
        }
    }

    const scene = gameData.scenes[sceneId];
    if (!scene) {
        console.error(`場景 ${sceneId} 完全不存在`);
        return;
    }

    currentScene = sceneId;
    gameHistory.push(sceneId);

    // 檢查是否需要觸發結局
    checkForEnding();

    // 顯示場景文本
    displayText(scene.text);

    // 顯示內心獨白
    if (scene.innerThought) {
        displayInnerThought(scene.innerThought);
    }

    // 處理思想添加
    if (scene.addThought) {
        addThought(scene.addThought.title, scene.addThought.description);
    }

    // 處理屬性修改
    if (scene.modifyAttributes) {
        modifyAttributes(scene.modifyAttributes);
    }

    // 處理關係修改
    if (scene.modifyRelationships) {
        modifyRelationships(scene.modifyRelationships);
    }

    // 顯示選項
    displayChoices(scene.choices);
}

// 檢查結局條件
function checkForEnding() {
    if (gameEndCondition) return; // 已經觸發結局

    // 按優先級檢查結局條件
    const endings = Object.entries(endingConditions).sort((a, b) => b[1].priority - a[1].priority);
    
    for (const [endingId, condition] of endings) {
        if (condition.check()) {
            gameEndCondition = endingId;
            
            // 在適當的時機觸發結局
            if (shouldTriggerEnding()) {
                setTimeout(() => {
                    displayScene(endingId);
                }, 2000);
            }
            break;
        }
    }
}

// 判斷是否應該觸發結局
function shouldTriggerEnding() {
    // 遊戲進行了足夠的步驟
    const minSteps = 15;
    
    // 或者達到了特定的劇情節點
    const endingTriggerScenes = [
        "contemplation",
        "enlightenment_path",
        "cherish_present",
        "visit_daiyu_first"
    ];
    
    return gameHistory.length >= minSteps || 
           endingTriggerScenes.includes(currentScene) ||
           Math.random() < 0.1; // 10%的隨機觸發機會
}

// 打字機效果顯示文本
function displayText(text) {
    if (isTyping) return;
    
    gameTextElement.innerHTML = '';
    isTyping = true;
    
    let index = 0;
    const timer = setInterval(() => {
        if (index < text.length) {
            gameTextElement.innerHTML += text.charAt(index);
            index++;
        } else {
            clearInterval(timer);
            isTyping = false;
        }
    }, typingSpeed);
}

// 顯示內心獨白
function displayInnerThought(thought) {
    innerThoughtElement.textContent = thought;
    innerThoughtContainer.classList.remove('hidden');
    innerThoughtContainer.classList.add('thought');
}

// 顯示選項
function displayChoices(choices) {
    if (!choices || choices.length === 0) return;
    
    setTimeout(() => {
        choicesContainer.innerHTML = '';
        
        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'choice-btn bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700 rounded-lg px-4 py-3 mb-2 w-full text-left hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 font-kai';
            button.textContent = choice.text;
            button.onclick = () => makeChoice(choice);
            
            choicesContainer.appendChild(button);
        });
    }, Math.max(1000, typingSpeed * 20));
}

// 做出選擇
function makeChoice(choice) {
    if (isTyping) return;

    // 處理選擇的屬性修改
    if (choice.modifyAttributes) {
        modifyAttributes(choice.modifyAttributes);
    }

    // 處理選擇的關係修改
    if (choice.modifyRelationships) {
        modifyRelationships(choice.modifyRelationships);
    }

    // 進入下一個場景
    displayScene(choice.nextScene);
}

// 修改屬性
function modifyAttributes(modifications) {
    for (const [attr, value] of Object.entries(modifications)) {
        if (gameData.player.attributes.hasOwnProperty(attr)) {
            gameData.player.attributes[attr] = Math.max(0, Math.min(20, gameData.player.attributes[attr] + value));
        }
    }
    updateUI();
}

// 修改關係
function modifyRelationships(modifications) {
    for (const [person, value] of Object.entries(modifications)) {
        if (gameData.player.relationships.hasOwnProperty(person)) {
            gameData.player.relationships[person] = Math.max(0, Math.min(200, gameData.player.relationships[person] + value));
        }
    }
    updateUI();
}

// 添加思想
function addThought(title, description) {
    const thought = { title, description, timestamp: new Date().toISOString() };
    gameData.player.thoughts.push(thought);
    updateThoughtCabinet();
}

// 更新思想內閣
function updateThoughtCabinet() {
    thoughtCabinetElement.innerHTML = '';
    
    gameData.player.thoughts.forEach(thought => {
        const thoughtElement = document.createElement('div');
        thoughtElement.className = 'mb-3 p-3 bg-amber-50 dark:bg-amber-900 rounded-lg border border-amber-200 dark:border-amber-700';
        thoughtElement.innerHTML = `
            <h4 class="font-bold text-amber-800 dark:text-amber-200 font-kai">${thought.title}</h4>
            <p class="text-amber-700 dark:text-amber-300 text-sm mt-1 font-song">${thought.description}</p>
        `;
        thoughtCabinetElement.appendChild(thoughtElement);
    });
}

// 更新UI
function updateUI() {
    // 更新屬性顯示
    document.getElementById('emotion').textContent = gameData.player.attributes.emotion;
    document.getElementById('insight').textContent = gameData.player.attributes.insight;
    document.getElementById('etiquette').textContent = gameData.player.attributes.etiquette;
    document.getElementById('poetry').textContent = gameData.player.attributes.poetry;

    // 更新關係顯示
    document.getElementById('daiyu-relation').textContent = gameData.player.relationships.daiyu;
    document.getElementById('baochai-relation').textContent = gameData.player.relationships.baochai;
    document.getElementById('xifeng-relation').textContent = gameData.player.relationships.xifeng;

    // 更新背包顯示
    inventoryElement.innerHTML = '';
    gameData.inventory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'mb-2 p-2 bg-green-50 dark:bg-green-900 rounded border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 font-kai';
        itemElement.textContent = item;
        inventoryElement.appendChild(itemElement);
    });

    // 更新思想內閣
    updateThoughtCabinet();
}

// 重新開始遊戲
function restartGame() {
    // 重置遊戲數據
    gameData.player = {
        attributes: {
            emotion: 8,
            insight: 6,
            etiquette: 5,
            poetry: 7
        },
        relationships: {
            daiyu: 90,
            baochai: 65,
            xifeng: 50
        },
        thoughts: []
    };

    gameHistory = [];
    gameEndCondition = null;
    currentScene = "start";

    // 更新UI並開始遊戲
    updateUI();
    displayScene("start");
}

// 深色模式切換
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
}

// 初始化深色模式
if (localStorage.getItem('darkMode') === 'true' || 
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// 頁面加載完成後初始化遊戲
document.addEventListener('DOMContentLoaded', initGame); 