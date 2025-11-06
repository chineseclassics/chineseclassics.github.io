// 主應用初始化邏輯
export function initializeApp() {
    // 墨寶積分系統 - 完整的玩家數據結構
    let playerData = {
        points: 0,
        level: 1,
        levelName: '墨韻初心',
        dailyLoginStreak: 0,
        lastLoginDate: null,
        totalCharactersLearned: 0,
        totalWordsLearned: 0,
        totalStrokePractices: 0,
        totalMemoryGames: 0,
        totalRadicalGames: 0,
        totalCollections: 0,
        perfectMemoryGames: 0,
        perfectRadicalGames: 0,
        functionsUsed: new Set(),
        firstTimeActions: new Set(),
        achievements: new Set(),
        statistics: {
            charactersToday: 0,
            wordsToday: 0,
            practiceToday: 0,
            gamesPlayedToday: 0,
            lastResetDate: new Date().toDateString()
        }
    };

    // 等級系統定義
    const levelSystem = [
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

    // 成就系統定義 - 按類別組織
    const achievementCategories = {
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

    // 積分獎勵規則
    const pointRewards = {
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

    // 字詞本功能變量
    let vocabularyBook = {
        items: [] // 統一存儲字和詞
    };
    let currentSearchCharacter = '';
    let currentSearchWord = '';
    let lastLookedUpCharacter = '';
    let lastLookedUpCharacterPinyin = '';
    let lastLookedUpWord = '';
    let lastLookedUpWordPinyin = '';



    // 書法經典字庫
    const calligraphyData = [
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

    // 今日漢字庫 - 專為中小學生設計的有意義且可供聯想的漢字
    const meaningfulCharacters = [
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

    // 顯示今日漢字
    function showDailyCharacter() {
        const dailyCharElement = document.getElementById('daily-character');

        // 從有意義的漢字庫中隨機選擇一個
        const randomIndex = Math.floor(Math.random() * meaningfulCharacters.length);
        const todayCharacter = meaningfulCharacters[randomIndex];

        // 設置今日漢字
        dailyCharElement.textContent = todayCharacter;

        // 添加動畫效果
        dailyCharElement.classList.add('bounce');
        setTimeout(() => {
            dailyCharElement.classList.remove('bounce');
        }, 1000);
    }

    // 顯示今日隨機漢字
    showDailyCharacter();

    // 本地存儲鍵名（新/舊）
    const STORAGE_KEYS = {
        playerData: 'hanzishu_player_data',
        playerDataLegacy: 'diandianmobao_player_data',
        vocabularyBook: 'hanzishu_vocabulary_book',
        vocabularyBookLegacy: 'vocabularyBook'
    };

    // ===== 墨寶積分系統核心功能 =====

    // 載入玩家數據
    function loadPlayerData() {
        const savedNew = localStorage.getItem(STORAGE_KEYS.playerData);
        const savedOld = localStorage.getItem(STORAGE_KEYS.playerDataLegacy);
        const raw = savedNew || savedOld;
        if (raw) {
            const data = JSON.parse(raw);
            // 轉換Set類型的數據
            if (data.functionsUsed && Array.isArray(data.functionsUsed)) {
                data.functionsUsed = new Set(data.functionsUsed);
            }
            if (data.firstTimeActions && Array.isArray(data.firstTimeActions)) {
                data.firstTimeActions = new Set(data.firstTimeActions);
            }
            if (data.achievements && Array.isArray(data.achievements)) {
                data.achievements = new Set(data.achievements);
            }
            Object.assign(playerData, data);

            // 若來自舊鍵且新鍵尚未存在，執行遷移並刪除舊鍵
            if (!savedNew && savedOld) {
                const dataToSave = {
                    ...playerData,
                    functionsUsed: Array.from(playerData.functionsUsed),
                    firstTimeActions: Array.from(playerData.firstTimeActions),
                    achievements: Array.from(playerData.achievements)
                };
                localStorage.setItem(STORAGE_KEYS.playerData, JSON.stringify(dataToSave));
                try { localStorage.removeItem(STORAGE_KEYS.playerDataLegacy); } catch (e) {}
            } else if (savedNew && savedOld) {
                // 新舊鍵同時存在時，刪除舊鍵確保只保留一份
                try { localStorage.removeItem(STORAGE_KEYS.playerDataLegacy); } catch (e) {}
            }
        }

        // 檢查每日重置
        const today = new Date().toDateString();
        if (playerData.statistics.lastResetDate !== today) {
            playerData.statistics = {
                charactersToday: 0,
                wordsToday: 0,
                practiceToday: 0,
                gamesPlayedToday: 0,
                lastResetDate: today
            };
        }

        updateUI();
        handleDailyLogin();
    }

    // 保存玩家數據
    function savePlayerData() {
        const dataToSave = {
            ...playerData,
            functionsUsed: Array.from(playerData.functionsUsed),
            firstTimeActions: Array.from(playerData.firstTimeActions),
            achievements: Array.from(playerData.achievements)
        };
        localStorage.setItem(STORAGE_KEYS.playerData, JSON.stringify(dataToSave));
    }

    // 處理每日登入
    function handleDailyLogin() {
        const today = new Date().toDateString();
        const lastLogin = playerData.lastLoginDate;

        if (lastLogin !== today) {
            if (lastLogin) {
                const lastDate = new Date(lastLogin);
                const todayDate = new Date(today);
                const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (daysDiff === 1) {
                    // 連續登入
                    playerData.dailyLoginStreak++;
                } else {
                    // 中斷連續登入
                    playerData.dailyLoginStreak = 1;
                }
            } else {
                // 首次登入
                playerData.dailyLoginStreak = 1;
                checkAchievement('first_login');
            }

            playerData.lastLoginDate = today;

            // 每日登入獎勵
            let dailyPoints = pointRewards.dailyLogin;
            if (playerData.dailyLoginStreak > 1) {
                dailyPoints += pointRewards.streakBonus * Math.min(playerData.dailyLoginStreak - 1, 10);
            }

            awardPoints(dailyPoints, `每日登入 +${dailyPoints} 🖌️`);

            // 檢查連續登入成就
            if (playerData.dailyLoginStreak >= 3) checkAchievement('streak_3');
            if (playerData.dailyLoginStreak >= 7) checkAchievement('streak_7');
            if (playerData.dailyLoginStreak >= 30) checkAchievement('streak_30');

            savePlayerData();
        }
    }

    // 獎勵積分
    function awardPoints(points, message = '') {
        playerData.points += points;
        updatePlayerLevel();
        updateUI();
        savePlayerData();

        if (message) {
            showPointNotification(message);
        }
    }

    // 更新玩家等級
    function updatePlayerLevel() {
        const currentLevel = levelSystem.find(level => 
            playerData.points >= level.minPoints && playerData.points <= level.maxPoints
        );

        if (currentLevel && currentLevel.level !== playerData.level) {
            const oldLevel = playerData.level;
            playerData.level = currentLevel.level;
            playerData.levelName = currentLevel.name;

            if (currentLevel.level > oldLevel) {
                showLevelUpNotification(currentLevel.level, currentLevel.name);
            }
        }
    }

    // 檢查成就
    // 成就系統已移除
    function checkAchievement() {
        // 成就系統已移除：空實作以保持兼容
    }

    function updateAchievements() {
        // 成就系統已移除：空實作以保持兼容
    }

    // 更新UI顯示（成就相關已移除）
    function updateUI() {
        // 更新頂部狀態欄
        document.getElementById('player-level').textContent = playerData.level;
        document.getElementById('player-level-name').textContent = playerData.levelName;
        document.getElementById('player-points').textContent = playerData.points;
        document.getElementById('login-streak').textContent = playerData.dailyLoginStreak;

        // 更新進度條
        const currentLevelData = levelSystem.find(l => l.level === playerData.level);
        if (currentLevelData) {
            const progress = ((playerData.points - currentLevelData.minPoints) / 
                            (currentLevelData.maxPoints - currentLevelData.minPoints)) * 100;
            document.getElementById('level-progress-fill').style.width = `${Math.min(progress, 100)}%`;
            document.getElementById('level-progress-text').textContent = 
                `${playerData.points - currentLevelData.minPoints}/${currentLevelData.maxPoints - currentLevelData.minPoints}`;
        }
    }

    // 成就顯示已移除

    // 更新最近獲得的成就
    function updateRecentAchievements() {
        const container = document.getElementById('recent-achievements');
        container.innerHTML = '';

        // 獲取最近解鎖的3個成就
        const recentAchievements = [];
        for (const [categoryKey, category] of Object.entries(achievementCategories)) {
            for (const achievement of category.achievements) {
                if (playerData.achievements.has(achievement.id)) {
                    recentAchievements.push(achievement);
                }
            }
        }

        // 顯示最近的3個成就
        const recent = recentAchievements.slice(-3);

        if (recent.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--light-text); font-size: 12px; padding: 10px;">
                    開始學習來解鎖成就吧！
                </div>
            `;
        } else {
            recent.forEach(achievement => {
                const achievementEl = document.createElement('div');
                achievementEl.className = 'recent-achievement';
                achievementEl.innerHTML = `
                    <div class="recent-achievement-icon">${achievement.icon}</div>
                    <div class="recent-achievement-info">
                        <div class="recent-achievement-name">${achievement.name}</div>
                        <div class="recent-achievement-desc">${achievement.desc}</div>
                    </div>
                    <div class="recent-achievement-points">+${achievement.points}</div>
                `;
                container.appendChild(achievementEl);
            });
        }
    }

    // 更新成就進度概覽
    function updateAchievementProgress() {
        const categories = {
            'basic': { element: 'basic-progress', total: 4 },
            'stroke': { element: 'stroke-progress', total: 4 },
            'memory': { element: 'memory-progress', total: 4 }
        };

        for (const [categoryKey, categoryInfo] of Object.entries(categories)) {
            const category = achievementCategories[categoryKey];
            if (category) {
                let unlocked = 0;
                for (const achievement of category.achievements) {
                    if (playerData.achievements.has(achievement.id)) {
                        unlocked++;
                    }
                }
                document.getElementById(categoryInfo.element).textContent = `${unlocked}/${categoryInfo.total}`;
            }
        }
    }

    // 更新成就計數
    function updateAchievementCounts() {
        const totalAchievements = Object.values(achievementCategories).reduce((total, category) => total + category.achievements.length, 0);
        const unlockedAchievements = playerData.achievements.size;

        document.getElementById('achievement-count').textContent = `(${unlockedAchievements}/${totalAchievements})`;
        document.getElementById('achievements-modal-count').textContent = `(${unlockedAchievements}/${totalAchievements})`;
    }

    // 更新模態窗口中的全部成就
    function updateFullAchievementsDisplay() {
        const container = document.getElementById('achievements-modal-list');
        container.innerHTML = '';

        // 按類別顯示成就
        for (const [categoryKey, category] of Object.entries(achievementCategories)) {
            // 添加類別標題
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'achievement-category';
            categoryTitle.textContent = category.name;
            container.appendChild(categoryTitle);

            // 創建該類別的成就網格容器
            const achievementGrid = document.createElement('div');
            achievementGrid.className = 'achievement-grid';

            // 添加該類別的成就
            for (const achievement of category.achievements) {
                const achievementEl = document.createElement('div');
                achievementEl.className = `achievement ${playerData.achievements.has(achievement.id) ? 'unlocked' : 'locked'}`;

                // 計算進度
                let progress = '';
                if (achievement.requirement) {
                    let current = 0;
                    switch (achievement.id) {
                        case 'stroke_beginner':
                        case 'stroke_intermediate':
                        case 'stroke_advanced':
                        case 'stroke_master':
                            current = playerData.totalStrokePractices;
                            break;
                        case 'memory_good':
                        case 'memory_expert':
                        case 'memory_legend':
                            current = playerData.totalMemoryGames;
                            break;
                        case 'radical_builder':
                        case 'radical_master':
                            current = playerData.totalRadicalGames;
                            break;
                        case 'char_collector':
                        case 'char_scholar':
                        case 'char_master':
                            current = playerData.totalCharactersLearned;
                            break;
                        case 'word_starter':
                        case 'word_expert':
                            current = playerData.totalWordsLearned;
                            break;
                        case 'collector':
                        case 'treasure_hunter':
                        case 'archive_keeper':
                            current = playerData.totalCollections;
                            break;
                        case 'streak_3':
                        case 'streak_7':
                        case 'streak_30':
                            current = playerData.dailyLoginStreak;
                            break;
                    }
                    progress = `${Math.min(current, achievement.requirement)}/${achievement.requirement}`;
                }

                achievementEl.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-details">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.desc}</div>
                        ${progress ? `<div class="achievement-progress">${progress}</div>` : ''}
                    </div>
                    <div class="achievement-points">+${achievement.points}</div>
                `;

                achievementGrid.appendChild(achievementEl);
            }

            container.appendChild(achievementGrid);
        }
    }
    // 顯示積分通知
    function showPointNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'point-notification';
        notification.innerHTML = `<span>🖌️</span> ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // 顯示升級通知
    function showLevelUpNotification(level, levelName) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <div>🎉 恭喜升級！</div>
            <div>等級 ${level}: ${levelName}</div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3500);
    }

    // 成就通知已移除

    // 初始化積分系統（成就相關已移除）
    loadPlayerData();

    // 設置成就模態窗口事件監聽器
    function setupAchievementsModal() {
        const viewAllBtn = document.getElementById('view-all-achievements');
        const modal = document.getElementById('achievements-modal');
        const closeBtn = document.getElementById('achievements-modal-close');

        // 打開模態窗口
        viewAllBtn.addEventListener('click', () => {
            updateFullAchievementsDisplay();
            modal.style.display = 'flex';
        });

        // 關閉模態窗口
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 點擊背景關閉模態窗口
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // ESC鍵關閉模態窗口
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }

    // 成就系統已移除：不再初始化成就模態窗口

    // 獲取所有DOM元素（必須在函數定義之前）
    const navLookup = document.getElementById('nav-lookup');
    const navWordLookup = document.getElementById('nav-word-lookup');
    const navPractice = document.getElementById('nav-practice');
    const navMemory = document.getElementById('nav-memory');
    const navRadical = document.getElementById('nav-radical');

    const characterDisplaySection = document.getElementById('character-display-section');
    const wordLookupContainer = document.getElementById('word-lookup-container');
    const quizContainer = document.getElementById('quiz-container');
    const memoryGameContainer = document.getElementById('memory-game-container');
    const radicalGameContainer = document.getElementById('radical-game-container');

    // 切換主導航頁面
    function switchMainFunction(activeButton, activeSection) {
        // 重置所有按鈕的激活狀態
        [navLookup, navWordLookup, navPractice, navMemory, navRadical].forEach(button => {
            button.classList.remove('active');
        });

        // 隱藏所有功能區域
        [characterDisplaySection, wordLookupContainer, quizContainer, memoryGameContainer, radicalGameContainer].forEach(section => {
            section.style.display = 'none';
        });

        // 激活選中的按鈕和區域
        activeButton.classList.add('active');

        // 根據不同的功能區域設置正確的display值
        if (activeSection === quizContainer) {
            activeSection.style.display = 'block';  // 筆順大師使用block布局
        } else {
            activeSection.style.display = 'flex';   // 其他功能區域使用flex布局
        }

        // 處理搜索框和字符選擇器的顯示/隱藏
        const searchSection = document.getElementById('character-search-section');
        if (activeSection === characterDisplaySection) {
            // 在筆順查詢頁面顯示搜索框
            searchSection.style.display = 'block';
            // 保持字符選擇器的當前狀態（不強制隱藏）
        } else {
            // 在其他頁面隱藏搜索框和字符選擇器
            searchSection.style.display = 'none';
            hideCharacterSelector();
        }

        // 根據不同頁面啟動對應功能
        if (activeSection === memoryGameContainer) {
            // 啟動記憶遊戲，使用隨機選取的字而不是當前字符
            startIndependentMemoryGame();
        } else if (activeSection === radicalGameContainer) {
            // 若切換到部首組字，初始化部首組字遊戲
            startRadicalGame();
        }
        // 移除筆順練習的自動啟動，讓外部控制何時啟動
    }

    // 添加一個標記來避免衝突
    let preventAutoStart = false;

    // 設置主導航事件監聽器
    navLookup.addEventListener('click', function() {
        switchMainFunction(navLookup, characterDisplaySection);
        // 記錄功能使用
        playerData.functionsUsed.add('stroke_lookup');
        checkAchievement('explorer');
    });

    navWordLookup.addEventListener('click', function() {
        switchMainFunction(navWordLookup, wordLookupContainer);
        // 記錄功能使用
        playerData.functionsUsed.add('word_lookup_page');
        checkAchievement('explorer');
    });
    navPractice.addEventListener('click', function() {
        switchMainFunction(navPractice, quizContainer);
        // 記錄功能使用
        playerData.functionsUsed.add('practice_page');
        checkAchievement('explorer');
        // 只有在沒有設置防止自動啟動標記時才啟動隨機練習
        if (!preventAutoStart) {
            setTimeout(() => {
                startIndependentQuizMode();
            }, 100);
        } else {
            // 重置標記
            preventAutoStart = false;
        }
    });

    navMemory.addEventListener('click', function() {
        switchMainFunction(navMemory, memoryGameContainer);
        // 記錄功能使用
        playerData.functionsUsed.add('memory_page');
        checkAchievement('explorer');
    });
    // 獲取DOM元素
    const characterInput = document.getElementById('character-input');
    const searchButton = document.getElementById('search-button');
    const characterDisplay = document.getElementById('character-display');
    const characterSelector = document.getElementById('character-selector');
    const characterButtons = document.getElementById('character-buttons');
    const pinyinDisplay = document.getElementById('pinyin-display');
    const characterDefinition = document.getElementById('character-definition');
    const definitionContent = document.getElementById('definition-content');
    const definitionLoading = document.getElementById('definition-loading');
    const strokeCount = document.getElementById('stroke-count');
    const animateButton = document.getElementById('animate-button');
    const speakButton = document.getElementById('speak-button');
    const quizButton = document.getElementById('quiz-button');
    const errorMessage = document.getElementById('error-message');
    const loader = document.getElementById('loader');
    const characterTarget = document.getElementById('character-target');

    // 字詞查詢相關元素
    const wordInput = document.getElementById('word-input');
    const wordSearchButton = document.getElementById('word-search-button');
    const wordErrorMessage = document.getElementById('word-error-message');
    const wordLoader = document.getElementById('word-loader');
    const wordResultSection = document.getElementById('word-result-section');
    const wordTitle = document.getElementById('word-title');
    const wordPronunciation = document.getElementById('word-pronunciation');
    const wordSpeakButton = document.getElementById('word-speak-button');
    const wordPracticeButton = document.getElementById('word-practice-button');
    const wordDefinition = document.getElementById('word-definition');
    const wordDefinitionContent = document.getElementById('word-definition-content');
    const wordDefinitionLoading = document.getElementById('word-definition-loading');

    // 遊戲相關元素
    const quizResult = document.getElementById('quiz-result');

    const quizRetry = document.getElementById('quiz-retry');
    const quizHint = document.getElementById('quiz-hint');
    const quizProgress = document.getElementById('quiz-progress');
    const quizTargetField = document.getElementById('quiz-target-field');
    const strokeHint = document.getElementById('stroke-hint');
    const strokeAnimationHint = document.getElementById('stroke-animation-hint');
    const characterBoardEl = document.querySelector('.character-board');
    const quizTargetEl = document.querySelector('.quiz-target');

    // 尺寸與置中修復：統一以容器實際尺寸驅動
    let lastCharacterWidth = 0;
    let lastQuizWidth = 0;
    let resizeTimer = null;

    function getSquareContainerSize(containerEl, fallbackSize) {
        try {
            if (!containerEl) return fallbackSize;
            const rect = containerEl.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            const size = Math.max(0, Math.min(width || 0, height || 0));
            return size > 0 ? size : fallbackSize;
        } catch (e) {
            return fallbackSize;
        }
    }

    function updateWriterDimensions(force = false) {
        // 以容器寬度為準，忽略僅高度變動（如地址列收合）
        if (characterBoardEl && writer) {
            const rect = characterBoardEl.getBoundingClientRect();
            const containerWidth = Math.round(rect.width);
            if (force || (containerWidth > 0 && containerWidth !== lastCharacterWidth)) {
                const size = getSquareContainerSize(characterBoardEl, (window.innerWidth > 768 ? 240 : 260));
                try {
                    writer.updateDimensions({ width: size, height: size });
                    lastCharacterWidth = containerWidth;
                } catch (e) {}
            }
        }

        if (quizTargetEl && quizWriter) {
            const rect = quizTargetEl.getBoundingClientRect();
            const containerWidth = Math.round(rect.width);
            if (force || (containerWidth > 0 && containerWidth !== lastQuizWidth)) {
                const size = getSquareContainerSize(quizTargetEl, (window.innerWidth > 768 ? 240 : 260));
                try {
                    quizWriter.updateDimensions({ width: size, height: size });
                    lastQuizWidth = containerWidth;
                } catch (e) {}
            }
        }
    }

    // 記憶遊戲相關元素
    const memoryCharacters = document.getElementById('memory-characters');
    const memoryOptions = document.getElementById('memory-options');
    const memoryTimer = document.getElementById('memory-timer');
    const memoryStart = document.getElementById('memory-start');
    const memoryResult = document.getElementById('memory-result');
    const levelButtons = document.querySelectorAll('#memory-game-container .level-btn');

    // 不需要選項卡相關元素，已移除舊的選項卡功能

    // 學習記錄
    let learnedCharacters = [];
    let currentCharacterId = 0;
    let currentCharacter = '';
    let writer = null;
    let quizWriter = null;
    let hintTimer = null;

    // 記憶遊戲狀態
    let memoryGameActive = false;
    let memoryLevel = 3;
    let memoryTargetChars = [];
    let memorySelectedChars = [];
    let memoryTimer_id = null;
    let memoryOptionElements = [];  // 存储选项元素的引用
    let memorySelectionStartTime = null;  // 記錄用戶開始選字的時間
    let memorySelectionDuration = 0;  // 記錄用戶選字所用時間（秒）



    // 常用漢字列表（适合小學生學習的基礎漢字）
    const commonCharacters = [
        '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
        '人', '大', '小', '中', '天', '地', '日', '月', '水', '火',
        '木', '金', '土', '山', '石', '田', '口', '手', '足', '目',
        '耳', '心', '女', '子', '好', '文', '字', '學', '生', '先',
        '花', '草', '魚', '鳥', '羊', '馬', '牛', '豬', '米', '茶'
    ];

    // 檢查是否為中文字
    function isChineseCharacter(char) {
        return /[\u4e00-\u9fa5]/.test(char);
    }

    // 檢查是否全為中文字符
    function isAllChineseCharacters(text) {
        return /^[\u4e00-\u9fa5]+$/.test(text);
    }

    // 提取文本中的所有中文字符
    function extractChineseCharacters(text) {
        const matches = text.match(/[\u4e00-\u9fa5]/g);
        return matches ? [...new Set(matches)] : []; // 去重
    }

    // 查詢萌典API獲取字義
    async function fetchCharacterDefinition(character) {
        try {
            // 顯示加載狀態
            characterDefinition.style.display = 'block';
            characterDefinition.style.opacity = '1';
            characterDefinition.style.transform = 'translateY(0)';
            characterDefinition.style.transition = 'none';
            definitionLoading.style.display = 'block';
            definitionContent.innerHTML = '';

            const response = await fetch(`https://www.moedict.tw/uni/${encodeURIComponent(character)}`);

            if (!response.ok) {
                throw new Error('查詢失敗');
            }

            const data = await response.json();

            // 調試：打印完整數據結構
            console.log('萌典API返回數據:', JSON.stringify(data, null, 2));

            displayCharacterDefinition(data);
        } catch (error) {
            console.error('萌典API查詢錯誤:', error);
            definitionContent.innerHTML = '<div class="definition-item"><span class="definition-text">暫時無法獲取字義解釋</span></div>';
        } finally {
            definitionLoading.style.display = 'none';
        }
    }

                    // 顯示字義解釋
    function displayCharacterDefinition(data) {
        if (!data || !data.heteronyms || data.heteronyms.length === 0) {
            definitionContent.innerHTML = '<div class="definition-item"><div class="definition-text">未找到字義資料</div></div>';
            // 添加漸入動畫
            characterDefinition.style.opacity = '0';
            characterDefinition.style.transform = 'translateY(20px)';
            setTimeout(() => {
                characterDefinition.style.transition = 'all 0.4s ease-out';
                characterDefinition.style.opacity = '1';
                characterDefinition.style.transform = 'translateY(0)';
            }, 100);
            return;
        }

        let html = '';

        // 遍歷所有讀音和釋義
        data.heteronyms.forEach((heteronym, index) => {
            if (heteronym.definitions && heteronym.definitions.length > 0) {
                // 顯示拼音（如果有的話）
                const pinyin = heteronym.pinyin || '';
                if (pinyin && index === 0) {
                    // 更新主要的拼音顯示
                    pinyinDisplay.textContent = pinyin;
                    // 保存到查詢歷史以供字詞本使用
                    lastLookedUpCharacterPinyin = pinyin;
                }

                // 遍歷所有釋義
                heteronym.definitions.forEach((def, defIndex) => {
                    html += '<div class="definition-item">';

                    // 詞性標籤和中文釋義內容在同一行
                    html += '<div class="definition-main">';
                    if (def.type) {
                        html += `<span class="definition-type">${def.type}</span>`;
                    }
                    if (def.def) {
                        html += `<span class="definition-text">${def.def}</span>`;
                    }
                    html += '</div>';

                    // 英文釋義
                    if (def.english) {
                        html += `<div class="definition-english">🇺🇸 ${def.english}</div>`;
                    }

                    // 檢查是否有其他格式的英文釋義
                    if (def.en) {
                        html += `<div class="definition-english">🇺🇸 ${def.en}</div>`;
                    }

                    // 例句顯示 - 檢查多種可能的例句字段
                    const examples = [];

                    // 檢查 example 字段
                    if (def.example) {
                        if (Array.isArray(def.example)) {
                            examples.push(...def.example);
                        } else if (typeof def.example === 'string') {
                            examples.push(def.example);
                        }
                    }

                    // 檢查 quote 字段
                    if (def.quote) {
                        if (Array.isArray(def.quote)) {
                            examples.push(...def.quote);
                        } else if (typeof def.quote === 'string') {
                            examples.push(def.quote);
                        }
                    }

                    // 檢查 synonyms 相關的例句
                    if (def.synonyms && Array.isArray(def.synonyms)) {
                        def.synonyms.forEach(syn => {
                            if (syn.example) {
                                if (Array.isArray(syn.example)) {
                                    examples.push(...syn.example);
                                } else if (typeof syn.example === 'string') {
                                    examples.push(syn.example);
                                }
                            }
                        });
                    }

                    // 顯示例句（最多2個）
                    examples.slice(0, 2).forEach(example => {
                        if (example && example.trim()) {
                            // 移除HTML標籤，只保留純文本，並清理多餘空格
                            let cleanExample = example.replace(/<[^>]*>/g, '').trim();

                            // 限制例句長度，避免過長
                            if (cleanExample.length > 50) {
                                cleanExample = cleanExample.substring(0, 47) + '...';
                            }

                            html += `<div class="definition-example">${cleanExample}</div>`;
                        }
                    });

                    html += '</div>';
                });
            }
        });

        if (html) {
            definitionContent.innerHTML = html;
        } else {
            definitionContent.innerHTML = '<div class="definition-item"><div class="definition-text">未找到詳細釋義</div></div>';
        }

        // 添加漸入動畫
        characterDefinition.style.opacity = '0';
        characterDefinition.style.transform = 'translateY(20px)';
        setTimeout(() => {
            characterDefinition.style.transition = 'all 0.4s ease-out';
            characterDefinition.style.opacity = '1';
            characterDefinition.style.transform = 'translateY(0)';
        }, 100);
    }

    // 顯示加載動畫
    function showLoader() {
        loader.classList.add('active');
    }

    // 隱藏加載動畫
    function hideLoader() {
        loader.classList.remove('active');
    }

    // 創建字符選擇器
    function createCharacterSelector(characters) {
        characterButtons.innerHTML = '';

        characters.forEach((char, index) => {
            const button = document.createElement('button');
            button.className = 'character-btn';
            button.textContent = char;
            button.dataset.character = char;

            // 設置第一個字符為激活狀態
            if (index === 0) {
                button.classList.add('active');
            }

            // 點擊事件
            button.addEventListener('click', function() {
                // 移除其他按鈕的激活狀態
                characterButtons.querySelectorAll('.character-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                // 激活當前按鈕
                this.classList.add('active');

                // 切換到這個字符
                switchToCharacter(char, 'user');
            });

            characterButtons.appendChild(button);
        });

        // 顯示選擇器
        characterSelector.style.display = 'block';
        }

    // 隱藏字符選擇器
    function hideCharacterSelector() {
        characterSelector.style.display = 'none';
        characterButtons.innerHTML = '';
        // 同時隱藏字義解釋區
        characterDefinition.style.display = 'none';
    }

    // 切換到指定字符
    function switchToCharacter(character, source = 'user') {
        currentCharacter = character;
        currentSearchCharacter = character; // 更新當前搜索的字符

        // 保存到字詞本查詢歷史
        lastLookedUpCharacter = character;
        lastLookedUpCharacterPinyin = ''; // 將從萌典API獲取

        // 更新顯示的漢字和拼音
        characterDisplay.textContent = character;
        pinyinDisplay.textContent = ''; // 拼音將從萌典API獲取並更新

        showLoader();

        // 清理writer
        cleanupWriter('main');

        // 清空並添加新容器
        characterTarget.innerHTML = '';

        // 更新收藏按鈕狀態
        updateFavoriteButtonState('character', character);

        // 初始化漢字筆順
        const charInitSize = getSquareContainerSize(characterBoardEl, (window.innerWidth > 768 ? 240 : 260));
        writer = HanziWriter.create('character-target', character, {
            width: Math.max(200, charInitSize),
            height: Math.max(200, charInitSize),
            padding: 20,  // 增加內邊距確保漢字在田字格內
            strokeColor: '#232D52',
            outlineColor: '#DDD8C8',
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 1000,
            radicalColor: '#8E3E1A',
            onLoadCharDataSuccess: function() {
                hideLoader();

                // 顯示筆畫數
                if (writer && writer._char && writer._char.strokes) {
                    const totalStrokes = writer._char.strokes.length;
                    strokeCount.textContent = `筆畫數：${totalStrokes}`;
                    updateQuizProgressSteps(totalStrokes);
                }

                // 自動播放筆順動畫
                writer.animateCharacter();

                // 添加到學習記錄
                addToLearnedCharacters(character);

                // 墨寶積分系統 - 字符查詢獎勵（僅在用戶主動查詢時給予）
                if (source === 'user') {
                    playerData.totalCharactersLearned++;
                    playerData.statistics.charactersToday++;
                    playerData.functionsUsed.add('character_lookup');

                    // 首次查詢獎勵
                    if (!playerData.firstTimeActions.has('first_character')) {
                        playerData.firstTimeActions.add('first_character');
                        checkAchievement('first_character');
                    }

                    // 查詢積分獎勵
                    awardPoints(pointRewards.characterLookup, `查詢漢字 +${pointRewards.characterLookup} 🖌️`);

                    // 檢查學習里程成就
                    checkAchievement('char_collector');
                    checkAchievement('char_scholar');
                    checkAchievement('char_master');

                    // 檢查時間相關成就
                    checkAchievement('night_owl');
                    checkAchievement('early_bird');

                    // 更新成就
                    updateAchievements();
                }

                // 查詢字義解釋
                fetchCharacterDefinition(character);
            },
            onLoadCharDataError: function() {
                hideLoader();
                alert('找不到這個漢字的筆順資料，請嘗試其他漢字');

                // 即使筆順資料失敗，也嘗試查詢字義
                fetchCharacterDefinition(character);
            }
        });
    }
    // 查詢漢字
    function queryCharacter() {
        const inputText = characterInput.value.trim();

        // 驗證輸入
        if (!inputText) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = '請輸入漢字';
            return;
        }

        // 提取中文字符
        const chineseCharacters = extractChineseCharacters(inputText);

        if (chineseCharacters.length === 0) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = '請輸入有效的中文字';
            return;
        }

        if (chineseCharacters.length > 20) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = '最多只能輸入20個漢字';
            return;
        }

        // 隱藏筆順挑戰模式和記憶遊戲，顯示一般模式
        showNormalMode();

        // 隱藏錯誤訊息
        errorMessage.style.display = 'none';

        if (chineseCharacters.length === 1) {
            // 單個字符，隱藏選擇器，直接顯示
            hideCharacterSelector();
            switchToCharacter(chineseCharacters[0], 'user');
        } else {
            // 多個字符，顯示選擇器
            createCharacterSelector(chineseCharacters);
            // 默認顯示第一個字符
            switchToCharacter(chineseCharacters[0], 'user');
        }
    }

    // 清理writer實例
    function cleanupWriter(type) {
        if (type === 'main' || type === 'all') {
            // 清理主顯示區的writer
            if (writer) {
                try {
                    if (writer.isLoadingCharData) {
                        console.log('主显示区正在加载数据，无法清理');
                        return;
                    }

                    if (typeof writer.cancelQuiz === 'function') {
                        writer.cancelQuiz();
                    }
                    if (typeof writer.hideCharacter === 'function') {
                        writer.hideCharacter();
                    }
                    writer = null;
                } catch (e) {
                    console.error('清理writer時出錯:', e);
                }
            }
        }

        if (type === 'quiz' || type === 'all') {
            // 清理練習區的writer
            if (quizWriter) {
                try {
                    if (quizWriter.isLoadingCharData) {
                        console.log('练习区正在加载数据，无法清理');
                        return;
                    }

                    if (typeof quizWriter.cancelQuiz === 'function') {
                        quizWriter.cancelQuiz();
                    }
                    if (typeof quizWriter.hideCharacter === 'function') {
                        quizWriter.hideCharacter();
                    }
                    quizWriter = null;
                } catch (e) {
                    console.error('清理quizWriter時出錯:', e);
                }
            }
        }

        // 清除提示定时器
        if (hintTimer) {
            clearInterval(hintTimer);
            hintTimer = null;
        }
    }

    // 朗讀當前漢字（使用太虛幻境 TTS 系統）
    async function speakCharacter() {
        const character = characterDisplay.textContent;
        if (!character) return;

        // 停止任何正在播放的語音
        if (window.speechSynthesis) {
            speechSynthesis.cancel();
        }

        // 使用太虛幻境 TTS（優先在線 TTS，失敗時回退瀏覽器語音）
        if (window.taixuSpeak) {
            await window.taixuSpeak(character, {
                voice: 'zh-CN-XiaoxiaoNeural', // 普通話女聲
                rate: 0.8,
                pitch: 1.2  // 提高音調，更適合兒童
            });

            // 添加彈跳效果
            characterDisplay.classList.add('bounce');
            setTimeout(() => {
                characterDisplay.classList.remove('bounce');
            }, 1000);
        } else {
            console.warn('TTS 功能未載入，請確認已引入 taixu-tts.js');
        }
    }

    // 啟動筆順練習模式 - 獨立模式，不需要先查詢漢字
    function startIndependentQuizMode() {
        // 隨機選擇一個漢字進行練習
        const randomChar = getRandomCharacter();
        currentCharacter = randomChar;

        showLoader();

        // 清理之前的quizWriter
        cleanupWriter('quiz');

        // 清空練習區域並創建新的容器
        quizTargetField.innerHTML = '';

        // 只需要處理quiz容器內部的元素狀態，不需要重複設置容器的顯示狀態
        // 因為switchMainFunction已經處理了容器的顯示/隱藏
        quizResult.style.display = 'none';

        // 隱藏提示
        strokeHint.style.display = 'none';
        strokeAnimationHint.classList.remove('visible');

        console.log('开始创建quizWriter，字符:', currentCharacter);

        // 创建新的笔顺练习实例
        const quizInitSize = getSquareContainerSize(quizTargetEl, (window.innerWidth > 768 ? 240 : 260));
        quizWriter = HanziWriter.create('quiz-target-field', currentCharacter, {
            width: Math.max(200, quizInitSize),
            height: Math.max(200, quizInitSize),
            padding: 20,  // 增加內邊距確保漢字在田字格內
            strokeColor: '#232D52',
            outlineColor: '#DDD8C8',
            radicalColor: '#8E3E1A',
            drawingWidth: 30, // 提高命中率
            drawingColor: '#8E3E1A', // 用户绘制笔画的颜色
            showOutline: true, // 显示轮廓
            onLoadCharDataSuccess: function() {
                console.log('quizWriter加载成功');
                hideLoader();

                // 獲取總筆畫數並更新進度條
                if (quizWriter && quizWriter._char && quizWriter._char.strokes) {
                    const totalStrokes = quizWriter._char.strokes.length;
                    updateQuizProgressSteps(totalStrokes);
                    console.log('总笔画数:', totalStrokes);
                }

                // 启动笔顺练习
                startQuizPractice();
            },
            onLoadCharDataError: function(err) {
                console.error('加载失败:', err);
                hideLoader();
                alert('無法載入筆順練習數據，將嘗試其他漢字');
                // 再嘗試另一個漢字
                challengeNextCharacter();
            }
        });
    }

    // 現在也保留舊的 startQuizMode 用於筆順查詢中的練習功能
    function startQuizMode() {
        if (!currentCharacter) {
            startIndependentQuizMode();
            return;
        }

        showLoader();

        // 清理之前的quizWriter
        cleanupWriter('quiz');

        // 清空練習區域並創建新的容器
        quizTargetField.innerHTML = '';

        // 只需要處理quiz容器內部的元素狀態，不需要重複設置容器的顯示狀態
        // 因為switchMainFunction已經處理了容器的顯示/隱藏
        quizResult.style.display = 'none';

        // 隱藏提示
        strokeHint.style.display = 'none';
        strokeAnimationHint.classList.remove('visible');

        console.log('开始创建quizWriter，字符:', currentCharacter);

        // 创建新的笔顺练习实例
        const quizInitSize2 = getSquareContainerSize(quizTargetEl, (window.innerWidth > 768 ? 240 : 260));
        quizWriter = HanziWriter.create('quiz-target-field', currentCharacter, {
            width: Math.max(200, quizInitSize2),
            height: Math.max(200, quizInitSize2),
            padding: 20,  // 增加內邊距確保漢字在田字格內
            strokeColor: '#232D52',
            outlineColor: '#DDD8C8',
            radicalColor: '#8E3E1A',
            drawingWidth: 30, // 提高命中率
            drawingColor: '#8E3E1A', // 用户绘制笔画的颜色
            showOutline: true, // 显示轮廓
            onLoadCharDataSuccess: function() {
                console.log('quizWriter加载成功');
                hideLoader();

                // 獲取總筆畫數並更新進度條
                if (quizWriter && quizWriter._char && quizWriter._char.strokes) {
                    const totalStrokes = quizWriter._char.strokes.length;
                    updateQuizProgressSteps(totalStrokes);
                    console.log('总笔画数:', totalStrokes);
                }

                // 启动笔顺练习
                startQuizPractice();
            },
            onLoadCharDataError: function(err) {
                console.error('加载失败:', err);
                hideLoader();
                alert('無法載入筆順練習數據，請嘗試其他漢字');
                showNormalMode();
            }
        });
    }

    // 启动笔顺练习
    function startQuizPractice() {
        if (!quizWriter) {
            console.error('quizWriter不存在，无法启动练习');
            return;
        }

        console.log('启动笔顺练习');

        // 显示引导提示
        showStrokeHint(0);

        // 启动Quiz模式
        quizWriter.quiz({
            showHintAfterMisses: 1, // 错一次就显示提示
            highlightOnComplete: true, // 完成时高亮显示整个字符
            strokeHighlightSpeed: 2, // 高亮速度
            drawingFadeDuration: 0, // 移除淡出時間，加快下一筆
            onMistake: function(strokeNumber) {
                console.log('用户点击错误，笔画索引:', strokeNumber);
                // 震动提示
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }

                // 显示提示
                showStrokeHint(strokeNumber);
            },
            onCorrectStroke: function(strokeNumber, mistakesOnStroke) {
                console.log('用户点击正确，笔画索引:', strokeNumber, '错误次数:', mistakesOnStroke);
                // 更新進度
                updateQuizProgress(strokeNumber);

                // 立即提示下一筆（移除300ms延遲）
                showStrokeHint(strokeNumber + 1);
            },
            onComplete: function() {
                console.log('完成所有笔画');
                // 隐藏提示
                hideStrokeHint();

                // 显示结果
                showQuizResult(true);

                // 墨寶積分系統 - 筆順練習獎勵
                playerData.totalStrokePractices++;
                playerData.statistics.practiceToday++;
                playerData.functionsUsed.add('stroke_practice');

                // 筆順練習積分獎勵
                awardPoints(pointRewards.strokePractice, `筆順練習 +${pointRewards.strokePractice} 🖌️`);

                // 檢查筆順練習成就
                checkAchievement('stroke_beginner');
                checkAchievement('stroke_intermediate');
                checkAchievement('stroke_advanced');
                checkAchievement('stroke_master');

                // 更新成就
                addToLearnedCharacters(currentCharacter);
                updateAchievements();
            }
        });
    }
    // 显示笔画提示
    function showStrokeHint(strokeNumber) {
        // 停止之前的提示定时器
        if (hintTimer) {
            clearInterval(hintTimer);
            hintTimer = null;
        }

        // 如果已经完成所有笔画，隐藏提示
        if (!quizWriter || !quizWriter._char || 
            !quizWriter._char.strokes || 
            strokeNumber >= quizWriter._char.strokes.length) {
            hideStrokeHint();
            return;
        }

        // 获取笔画开始位置
        const stroke = quizWriter._char.strokes[strokeNumber];
        if (!stroke) {
            console.error('无法获取笔画:', strokeNumber);
            return;
        }

        // 获取笔画开始坐标
        const startPoint = stroke.getStartingPoint();
        const width = window.innerWidth > 768 ? 240 : 260;  // 與HanziWriter尺寸一致（行動端放大）
        const padding = 20;  // 與HanziWriter padding一致
        const startX = (startPoint.x * (width - padding * 2) / 1024) + padding;
        const startY = (startPoint.y * (width - padding * 2) / 1024) + padding;

        // 设置提示位置
        strokeHint.style.left = `${startX - 15}px`;
        strokeHint.style.top = `${startY - 15}px`;
        strokeHint.style.display = 'block';

        // 显示文字提示
        strokeAnimationHint.classList.add('visible');

        // 定时移动提示，模拟笔画轨迹
        let progress = 0;
        const points = stroke.points;

        hintTimer = setInterval(() => {
            progress += 0.05;
            if (progress > 1) progress = 0;

            const idx = Math.floor(progress * (points.length - 1));
            const point = points[idx];

            const x = (point.x * (width - padding * 2) / 1024) + padding;
            const y = (point.y * (width - padding * 2) / 1024) + padding;

            strokeHint.style.left = `${x - 15}px`;
            strokeHint.style.top = `${y - 15}px`;
        }, 100);
    }

    // 隐藏笔画提示
    function hideStrokeHint() {
        strokeHint.style.display = 'none';
        strokeAnimationHint.classList.remove('visible');

        if (hintTimer) {
            clearInterval(hintTimer);
            hintTimer = null;
        }
    }

    // 回到一般顯示模式
    function showNormalMode() {
        // 點擊頂部導航，切換到筆順查詢
        navLookup.click();
    }

    // 重設筆順練習模式
    function resetQuizMode() {
        // 隱藏結果
        quizResult.style.display = 'none';

        // 重新启动笔顺练习
        startQuizMode();
    }

    // 更新筆順練習進度條數量
    function updateQuizProgressSteps(totalStrokes) {
        // 清空進度條
        quizProgress.innerHTML = '';

        // 創建進度步驟元素
        for (let i = 0; i < totalStrokes; i++) {
            const step = document.createElement('div');
            step.className = 'quiz-progress-level';
            step.textContent = `第${i+1}筆`;
            if (i === 0) step.classList.add('active');
            quizProgress.appendChild(step);
        }
    }

    // 更新筆順練習進度
    function updateQuizProgress(currentStroke) {
        const steps = document.querySelectorAll('.quiz-progress-level');

        steps.forEach((step, index) => {
            if (index <= currentStroke) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    // 顯示筆順練習結果
    function showQuizResult(success) {
        quizResult.style.display = 'block';

        if (success) {
            quizResult.className = 'quiz-result success';
            quizResult.querySelector('.quiz-result-message').textContent = '真棒！你完成了這個漢字！';
            quizResult.querySelector('.quiz-result-detail').textContent = 
                `你成功按照正確的筆順完成了「${currentCharacter}」字！`;

            // 播放成功音效
            playSuccessSound();
        } else {
            quizResult.className = 'quiz-result error';
            quizResult.querySelector('.quiz-result-message').textContent = '加油！再試一次！';
            quizResult.querySelector('.quiz-result-detail').textContent = 
                '記住筆順的正確順序，慢慢寫會更容易記住哦！';
        }
    }

    // 播放成功音效
    function playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 創建振盪器
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const oscillator3 = audioContext.createOscillator();

            // 創建音量控制
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0.1;  // 設置較低的音量

            // 連接振盪器到音量控制
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            oscillator3.connect(gainNode);

            // 連接音量控制到輸出
            gainNode.connect(audioContext.destination);

            // 設置音頻參數
            oscillator1.type = 'sine';
            oscillator2.type = 'sine';
            oscillator3.type = 'sine';

            oscillator1.frequency.value = 523.25;  // C5
            oscillator2.frequency.value = 659.25;  // E5
            oscillator3.frequency.value = 783.99;  // G5

            // 設置音量逐漸降低
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);

            // 開始播放
            oscillator1.start();
            oscillator2.start(audioContext.currentTime + 0.1);
            oscillator3.start(audioContext.currentTime + 0.2);

            // 停止播放
            oscillator1.stop(audioContext.currentTime + 1.5);
            oscillator2.stop(audioContext.currentTime + 1.5);
            oscillator3.stop(audioContext.currentTime + 1.5);
        } catch(e) {
            console.error('播放音效失敗:', e);
        }
    }

    // 添加到學習記錄 (僅内存存儲)
    function addToLearnedCharacters(character) {
        if (!learnedCharacters.includes(character)) {
            learnedCharacters.push(character);
            console.log('字符已添加到學習記錄:', character);
        }
    }

    // 載入學習記錄 (在沙盒环境中无法使用 localStorage)
    function loadLearnedCharacters() {
        // 在沙盒環境中，學習記錄僅保存在當前會話中
        console.log('初始化學習記錄');
        // 可以预设一些字符作为初始学习记录
        if (learnedCharacters.length === 0) {
            learnedCharacters = ['人'];
        }
    }

    // 成就系統已移除

    // 移除了選項卡切換功能，因為新界面不再使用選項卡

    // 啟動記憶遊戲 - 獨立功能，不依賴筆順查詢
    function startIndependentMemoryGame() {
        // 顯示記憶遊戲界面
        characterDisplaySection.style.display = 'none';
        quizContainer.style.display = 'none';
        memoryGameContainer.style.display = 'block';

        // 重置遊戲到初始狀態
        resetMemoryGame();
    }

    // 保留舊函數用於筆順查詢使用
    function startMemoryGame() {
        startIndependentMemoryGame();
    }

    // 開始記憶遊戲挑戰
    function startMemoryChallenge() {
        // 檢查memoryLevel是否為有效數字，如果不是則重置為3
        if (isNaN(memoryLevel) || memoryLevel < 3) {
            memoryLevel = 3;
            console.warn('memoryLevel無效，重置為默認值3');
        }

        // 重置游戏状态
        memoryGameActive = true;
        memorySelectedChars = [];  // 确保清空之前的选择

        // 更新按鈕狀態
        updateMemoryButton();

        // 清除上一轮选项的选中状态
        memoryOptionElements.forEach(option => {
            option.classList.remove('selected');
        });

        // 清空结果显示
        memoryResult.style.display = 'none';

        // 清空选项区域，移除所有之前的选项
        memoryOptions.innerHTML = '';
        memoryOptionElements = [];

        // 從常用漢字中隨機選擇目標字符
        memoryTargetChars = getRandomCharacters(memoryLevel);

        // 顯示目標字符，根據難度調整排列方式
        memoryCharacters.innerHTML = '';

        if (memoryLevel === 5) {
            // 5字挑戰顯示在一行
            memoryCharacters.style.gridTemplateColumns = 'repeat(5, 60px)';
        } else if (memoryLevel === 8) {
            // 8字挑戰分為兩行，每行4個
            memoryCharacters.style.gridTemplateColumns = 'repeat(4, 60px)';
        } else {
            // 3字挑戰使用默認排列
            memoryCharacters.style.gridTemplateColumns = 'repeat(3, 60px)';
        }

        // 添加目標字符到顯示區
        memoryTargetChars.forEach(char => {
            const charElement = document.createElement('div');
            charElement.className = 'memory-character';
            charElement.textContent = char;
            memoryCharacters.appendChild(charElement);
        });

        // 開始倒計時
        let timeLeft = 5; // 5秒記憶時間
        memoryTimer.textContent = `記憶時間：${timeLeft}秒`;

        memoryTimer_id = setInterval(() => {
            timeLeft--;
            memoryTimer.textContent = `記憶時間：${timeLeft}秒`;

            if (timeLeft <= 0) {
                clearInterval(memoryTimer_id);
                hideCharactersAndShowOptions();
            }
        }, 1000);
    }
    // 隱藏字符並顯示選項
    function hideCharactersAndShowOptions() {
        // 隱藏目標字符
        const charElements = document.querySelectorAll('.memory-character');
        charElements.forEach(el => {
            el.classList.add('hidden');
            el.textContent = '?';
        });

        // 記錄開始選擇的時間
        memorySelectionStartTime = new Date();

        // 開始計時並顯示
        updateSelectionTimer();

        // 根據難度級別設定待選字數量
        let totalOptionsCount;
        let columnsPerRow;

        if (memoryLevel === 3) {
            totalOptionsCount = 9;   // 3字挑戰顯示9個選項
            columnsPerRow = 3;       // 每行3個，共3行
        } else if (memoryLevel === 5) {
            totalOptionsCount = 15;  // 5字挑戰顯示15個選項
            columnsPerRow = 5;       // 每行5個，共3行
        } else if (memoryLevel === 8) {
            totalOptionsCount = 24;  // 8字挑戰顯示24個選項
            columnsPerRow = 6;       // 每行6個，共4行
        }

        // 根據小螢幕調整列數
        if (window.innerWidth < 500) {
            if (memoryLevel === 8) {
                columnsPerRow = 4; // 在小螢幕上改為4列，6行
            } else if (memoryLevel === 5) {
                columnsPerRow = 3; // 在小螢幕上改為3列，5行
            }
        }

        // 生成選項（包括目標字符和足夠的干擾字符）
        const allOptions = [...memoryTargetChars];
        while (allOptions.length < totalOptionsCount) {
            const randomChar = getRandomCharacter();
            if (!allOptions.includes(randomChar)) {
                allOptions.push(randomChar);
            }
        }

        // 打亂選項順序
        shuffleArray(allOptions);

        // 清空舊選項，避免事件重複
        memoryOptions.innerHTML = '';
        memoryOptionElements = [];

        // 設置網格列數
        memoryOptions.style.gridTemplateColumns = `repeat(${columnsPerRow}, 1fr)`;

        // 顯示選項
        allOptions.forEach(char => {
            const option = document.createElement('div');
            option.className = 'memory-option';
            option.textContent = char;
            option.dataset.char = char;  // 使用數據屬性存儲字符

            // 使用事件委托而不是直接添加事件
            memoryOptions.appendChild(option);
            memoryOptionElements.push(option);  // 保存選項元素引用
        });

        // 更新提示
        memoryTimer.textContent = `請選擇您記得的${memoryLevel}個漢字 | 用時：0秒`;
    }

    // 選擇記憶選項（使用事件委托处理）
    function selectMemoryOption(char, optionElement) {
        console.log('选择选项:', char);

        // 如果游戏未激活，忽略点击
        if (!memoryGameActive) {
            console.log('游戏未激活，忽略点击');
            return;
        }

        // 如果已经选择了这个字符，取消选择
        const charIndex = memorySelectedChars.indexOf(char);
        if (charIndex !== -1) {
            console.log('取消选择:', char);
            memorySelectedChars.splice(charIndex, 1);
            optionElement.classList.remove('selected');
            return;
        }

        // 如果已经选择了足够的字符，且这不是取消选择操作，则忽略
        if (memorySelectedChars.length >= memoryLevel) {
            console.log('已选择足够的字符，忽略点击');
            return;
        }

        // 添加到选择列表并更新样式
        console.log('添加到选择列表:', char);
        memorySelectedChars.push(char);
        optionElement.classList.add('selected');

        // 检查是否已选择足够的字符
        if (memorySelectedChars.length === memoryLevel) {
            console.log('已选择足够字符，检查结果');
            setTimeout(checkMemoryResult, 500);
        }
    }

    // 更新選字計時
    function updateSelectionTimer() {
        if (!memorySelectionStartTime || !memoryGameActive) return;

        const now = new Date();
        const elapsedSeconds = Math.floor((now - memorySelectionStartTime) / 1000);
        memorySelectionDuration = elapsedSeconds;

        // 更新顯示的用時
        memoryTimer.textContent = `請選擇您記得的${memoryLevel}個漢字 | 用時：${elapsedSeconds}秒`;

        // 如果遊戲仍在進行中，繼續更新計時
        if (memoryGameActive) {
            setTimeout(updateSelectionTimer, 1000);
        }
    }

    // 檢查記憶遊戲結果
    function checkMemoryResult() {
        // 停止計時
        memoryGameActive = false;

        // 計算正確數量
        let correctCount = 0;

        // 清除上一次的結果標記
        memoryOptionElements.forEach(option => {
            option.classList.remove('correct', 'wrong', 'missed');
        });

        // 用於記錄已經處理過的選項，避免重複處理
        const processedOptions = new Set();

        // 檢查用戶選擇的每個字符
        memorySelectedChars.forEach(char => {
            // 查找對應的選項元素
            const optionElement = memoryOptionElements.find(element => 
                element.dataset.char === char && !processedOptions.has(element)
            );

            if (!optionElement) return;

            // 標記為已處理
            processedOptions.add(optionElement);

            // 檢查是否選對
            if (memoryTargetChars.includes(char)) {
                // 選對了 - 綠色
                optionElement.classList.remove('selected');
                optionElement.classList.add('correct');
                correctCount++;

                // 將這個字符添加到學習記錄
                addToLearnedCharacters(char);
            } else {
                // 選錯了 - 紅色
                optionElement.classList.remove('selected');
                optionElement.classList.add('wrong');
            }
        });

        // 標記那些應該選但沒選的字符
        memoryTargetChars.forEach(targetChar => {
            // 如果這個目標字符沒有被用戶選中
            if (!memorySelectedChars.includes(targetChar)) {
                // 查找這個字符的選項元素
                const missedOption = memoryOptionElements.find(element => 
                    element.dataset.char === targetChar && !processedOptions.has(element)
                );

                if (missedOption) {
                    // 標記為應該選的
                    missedOption.classList.add('missed');
                    processedOptions.add(missedOption);
                }
            }
        });

        // 墨寶積分系統 - 記憶遊戲獎勵
        playerData.totalMemoryGames++;
        playerData.statistics.gamesPlayedToday++;
        playerData.functionsUsed.add('memory');

        // 首次遊戲獎勵
        if (!playerData.firstTimeActions.has('memory_first')) {
            playerData.firstTimeActions.add('memory_first');
            checkAchievement('memory_first');
        }

        // 根據表現給予積分
        let gamePoints = pointRewards.memoryGame;
        if (correctCount === memoryLevel) {
            // 完美表現
            gamePoints = pointRewards.memoryGamePerfect;
            playerData.perfectMemoryGames++;

            // 檢查閃電記憶成就（5秒內完成）
            if (memorySelectionDuration > 0 && memorySelectionDuration <= 5) {
                checkAchievement('lightning_memory');
            }
        }

        awardPoints(gamePoints, `記憶挑戰 +${gamePoints} 🖌️`);

        // 檢查記憶遊戲成就
        checkAchievement('memory_good');
        checkAchievement('memory_expert');
        checkAchievement('memory_legend');
        checkAchievement('perfectionist');
        checkAchievement('game_master');

        // 更新成就
        updateAchievements();

        // 顯示結果
        memoryResult.style.display = 'block';

        // 獲取最終用時
        const timeString = memorySelectionDuration > 0 
            ? `，用時：${memorySelectionDuration}秒`
            : '';

        if (correctCount === memoryLevel) {
            // 全部正確
            memoryResult.className = 'memory-result success';
            memoryResult.querySelector('.memory-result-message').textContent = '太棒了！你全部記住了！';
            memoryResult.querySelector('.memory-result-score').textContent = `得分：${correctCount}/${memoryLevel}${timeString}`;
            playSuccessSound();
        } else if (correctCount >= memoryLevel / 2) {
            // 部分正確
            memoryResult.className = 'memory-result success';
            memoryResult.querySelector('.memory-result-message').textContent = '做得不錯！再接再厲！';
            memoryResult.querySelector('.memory-result-score').textContent = `得分：${correctCount}/${memoryLevel}${timeString}`;
        } else {
            // 大部分錯誤
            memoryResult.className = 'memory-result error';
            memoryResult.querySelector('.memory-result-message').textContent = '加油！需要多練習！';
            memoryResult.querySelector('.memory-result-score').textContent = `得分：${correctCount}/${memoryLevel}${timeString}`;
        }

        // 更新按鈕狀態
        updateMemoryButton();

        // 重新顯示原始字符
        const charElements = document.querySelectorAll('.memory-character');
        charElements.forEach((el, idx) => {
            if (idx < memoryTargetChars.length) {
                el.classList.remove('hidden');
                el.textContent = memoryTargetChars[idx];
            }
        });
    }

    // 停止記憶遊戲
    function stopMemoryGame() {
        memoryGameActive = false;
        if (memoryTimer_id) {
            clearInterval(memoryTimer_id);
            memoryTimer_id = null;
        }
    }

    // 重置記憶遊戲到初始狀態
    function resetMemoryGame() {
        // 停止遊戲
        stopMemoryGame();

        // 重置遊戲狀態
        memoryGameActive = false;
        memorySelectedChars = [];
        memoryOptionElements = [];
        memoryTargetChars = [];
        memorySelectionStartTime = null;
        memorySelectionDuration = 0;

        // 清空界面
        memoryOptions.innerHTML = '';
        memoryCharacters.innerHTML = '';
        memoryResult.style.display = 'none';

        // 重置提示文字和按鈕
        memoryTimer.textContent = '準備開始...';
        updateMemoryButton();
    }

    // 更新記憶遊戲按鈕文字
    function updateMemoryButton() {
        if (memoryGameActive) {
            memoryStart.textContent = '停止遊戲';
            memoryStart.className = 'btn btn-outline';
        } else if (memoryResult.style.display === 'block') {
            memoryStart.textContent = '再來一局';
            memoryStart.className = 'btn btn-primary';
        } else {
            memoryStart.textContent = '開始遊戲';
            memoryStart.className = 'btn btn-primary';
        }
        memoryStart.disabled = false;
    }

    // 開始新一局遊戲 - 重置並立即開始
    function startNewRound() {
        // 先清除結果顯示和重置部分狀態
        memoryResult.style.display = 'none';
        memorySelectedChars = [];
        memoryOptionElements = [];
        memorySelectionStartTime = null;
        memorySelectionDuration = 0;

        // 清空選項和字符顯示區域
        memoryOptions.innerHTML = '';
        memoryCharacters.innerHTML = '';

        // 直接開始新遊戲
        startMemoryChallenge();
    }

    // ============ 字詞本功能 ============

    // 初始化字詞本
    function initVocabularyBook() {
        // 從本地存儲載入字詞本
        const savedNew = localStorage.getItem(STORAGE_KEYS.vocabularyBook);
        const savedOld = localStorage.getItem(STORAGE_KEYS.vocabularyBookLegacy);
        const raw = savedNew || savedOld;
        if (raw) {
            const data = JSON.parse(raw);
            // 兼容舊版本數據
            if (data.characters || data.words) {
                vocabularyBook.items = [];
                if (data.characters) {
                    data.characters.forEach(item => {
                        vocabularyBook.items.push({...item, type: 'character'});
                    });
                }
                if (data.words) {
                    data.words.forEach(item => {
                        vocabularyBook.items.push({...item, type: 'word'});
                    });
                }
                // 按時間戳排序
                vocabularyBook.items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                saveVocabularyBook(); // 保存為新格式（也會寫入新鍵）
            } else {
                vocabularyBook = data;
            }

            // 若來源為舊鍵且新鍵尚未存在，執行遷移並刪除舊鍵
            if (!savedNew && savedOld) {
                saveVocabularyBook();
                try { localStorage.removeItem(STORAGE_KEYS.vocabularyBookLegacy); } catch (e) {}
            } else if (savedNew && savedOld) {
                // 新舊鍵同時存在時，刪除舊鍵確保只保留一份
                try { localStorage.removeItem(STORAGE_KEYS.vocabularyBookLegacy); } catch (e) {}
            }
        }
        updateVocabularyBookDisplay();
        setupVocabularyBookEventListeners();
    }

    // 保存字詞本到本地存儲
    function saveVocabularyBook() {
        localStorage.setItem(STORAGE_KEYS.vocabularyBook, JSON.stringify(vocabularyBook));
    }

    // 添加字詞到收藏
    function addToVocabularyBook(text, pinyin, type) {
        // 檢查是否已經收藏
        const exists = vocabularyBook.items.find(item => item.text === text);
        if (exists) {
            return false; // 已經收藏過了
        }

        // 添加到收藏（最新的在前面）
        vocabularyBook.items.unshift({
            text: text,
            pinyin: pinyin || '',
            type: type,
            timestamp: Date.now()
        });

        saveVocabularyBook();
        updateVocabularyBookDisplay();

        // 墨寶積分系統 - 收藏獎勵
        playerData.totalCollections++;
        playerData.functionsUsed.add('collection');

        // 首次收藏獎勵
        if (!playerData.firstTimeActions.has('first_collection')) {
            playerData.firstTimeActions.add('first_collection');
            checkAchievement('first_collection');
        }

        // 收藏積分獎勵
        awardPoints(pointRewards.collection, `收藏字詞 +${pointRewards.collection} 🖌️`);

        // 檢查收藏成就
        checkAchievement('collector');
        checkAchievement('treasure_hunter');
        checkAchievement('archive_keeper');

        return true; // 成功添加
    }

    // 從收藏中移除字詞（全局函數）
    window.removeFromVocabularyBook = function(text) {
        const index = vocabularyBook.items.findIndex(item => item.text === text);

        if (index !== -1) {
            vocabularyBook.items.splice(index, 1);
            saveVocabularyBook();
            updateVocabularyBookDisplay();
            return true;
        }
        return false;
    }

    // 檢查是否已收藏
    function isInVocabularyBook(text) {
        return vocabularyBook.items.some(item => item.text === text);
    }

    // 創建字詞項目HTML
    function createVocabularyItemHTML(item, number) {
        const characters = item.text.split('');
        const pinyinParts = item.pinyin ? item.pinyin.split(' ') : [];

        let characterBoxes = '';
        characters.forEach((char, index) => {
            const charPinyin = pinyinParts[index] || '';
            characterBoxes += `
                <div class="vocabulary-character-container">
                    ${charPinyin ? `<div class="vocabulary-character-pinyin">${charPinyin}</div>` : ''}
                    <div class="vocabulary-character-box">
                        <div class="vocabulary-character">${char}</div>
                    </div>
                </div>
            `;
        });

        return `
            <div class="vocabulary-item" onclick="navigateToVocabularyItem('${item.type}', '${item.text}')">
                <div class="vocabulary-item-number">${number}.</div>
                <div class="vocabulary-item-content">
                    <div class="vocabulary-item-text">
                        ${characterBoxes}
                    </div>
                </div>
                <button class="vocabulary-remove" onclick="event.stopPropagation(); removeFromVocabularyBook('${item.text}')">×</button>
            </div>
        `;
    }

    // 更新字詞本顯示
    function updateVocabularyBookDisplay() {
        const vocabularyList = document.getElementById('vocabulary-list');
        const vocabularyCount = document.getElementById('vocabulary-count');
        const vocabularyMore = document.getElementById('vocabulary-more');
        const totalCountSpan = document.getElementById('total-count');

        if (!vocabularyList || !vocabularyCount) return;

        const totalCount = vocabularyBook.items.length;
        vocabularyCount.textContent = `(${totalCount})`;

        if (totalCount === 0) {
            vocabularyList.innerHTML = `
                <div class="empty-vocabulary">
                    <div class="empty-icon">📚</div>
                    <div class="empty-text">還沒有收藏任何字詞</div>
                    <div class="empty-hint">查詢字詞時點擊收藏按鈕</div>
                </div>
            `;
            if (vocabularyMore) vocabularyMore.style.display = 'none';
            return;
        }

        // 顯示最近的5個
        const displayItems = vocabularyBook.items.slice(0, 5);

        vocabularyList.innerHTML = displayItems.map((item, index) => {
            return createVocabularyItemHTML(item, index + 1);
        }).join('');

        // 顯示或隱藏"查看全部"按鈕
        if (vocabularyMore && totalCountSpan) {
            if (totalCount > 5) {
                vocabularyMore.style.display = 'block';
                totalCountSpan.textContent = totalCount;
            } else {
                vocabularyMore.style.display = 'none';
            }
        }
        // 觸發漢字樹重繪（節流）
        try { if (typeof requestHanziTreeRerender === 'function') { requestHanziTreeRerender(); } } catch (e) {}
    }
    // 打開模態窗口
    function openVocabularyModal() {
        const modal = document.getElementById('vocabulary-modal');
        const modalList = document.getElementById('vocabulary-modal-list');
        const modalCount = document.getElementById('vocabulary-modal-count');

        if (!modal || !modalList || !modalCount) return;

        modalCount.textContent = `(${vocabularyBook.items.length})`;

        modalList.innerHTML = vocabularyBook.items.map((item, index) => {
            return createVocabularyItemHTML(item, index + 1);
        }).join('');

        modal.style.display = 'flex';
    }

    // 關閉模態窗口
    function closeVocabularyModal() {
        const modal = document.getElementById('vocabulary-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 導航到字詞項目（全局函數）
    window.navigateToVocabularyItem = function(type, text) {
        closeVocabularyModal(); // 關閉模態窗口

        if (type === 'character') {
            // 跳轉到字的筆順查詢（不給積分）
            const navLookup = document.getElementById('nav-lookup');
            const characterDisplaySection = document.getElementById('character-display-section');
            switchMainFunction(navLookup, characterDisplaySection);
            const characterInput = document.getElementById('character-input');
            if (characterInput) {
                characterInput.value = text;
                hideCharacterSelector();
                switchToCharacter(text, 'vocabulary');
            }
        } else {
            // 跳轉到詞語查詢（不給積分）
            const navWordLookup = document.getElementById('nav-word-lookup');
            const wordLookupContainer = document.getElementById('word-lookup-container');
            switchMainFunction(navWordLookup, wordLookupContainer);
            const wordInput = document.getElementById('word-input');
            if (wordInput) {
                wordInput.value = text;
                fetchWordDefinition(text, 'vocabulary');
            }
        }
    }

    // 設置字詞本事件監聽器
    function setupVocabularyBookEventListeners() {
        // 字收藏按鈕
        const characterFavoriteBtn = document.getElementById('character-favorite-btn');
        if (characterFavoriteBtn) {
            characterFavoriteBtn.addEventListener('click', () => {
                // 以目前顯示的字符為主，回退到最近查過的字符
                const currentChar = (typeof currentCharacter !== 'undefined' && currentCharacter) ? currentCharacter : lastLookedUpCharacter;
                const currentPinyin = lastLookedUpCharacterPinyin;

                if (!currentChar) {
                    showVocabularyFeedback('請先查詢一個字！', true);
                    return;
                }

                const exists = isInVocabularyBook(currentChar);

                if (exists) {
                    removeFromVocabularyBook(currentChar);
                    characterFavoriteBtn.textContent = '💝 收藏';
                    characterFavoriteBtn.classList.remove('favorited');
                    showVocabularyFeedback('已取消收藏');
                } else {
                    if (addToVocabularyBook(currentChar, currentPinyin || '', 'character')) {
                        characterFavoriteBtn.textContent = '💖 已收藏';
                        characterFavoriteBtn.classList.add('favorited');
                        showVocabularyFeedback('字已收藏！');
                    }
                }
            });
        }

        // 詞語收藏按鈕
        const wordFavoriteBtn = document.getElementById('word-favorite-btn');
        if (wordFavoriteBtn) {
            wordFavoriteBtn.addEventListener('click', () => {
                // 以目前顯示的詞為主，回退到最近查過的詞
                const currentWord = (typeof window.currentWord !== 'undefined' && window.currentWord) ? window.currentWord : lastLookedUpWord;
                const currentPinyin = lastLookedUpWordPinyin;

                if (!currentWord) {
                    showVocabularyFeedback('請先查詢一個詞語！', true);
                    return;
                }

                const exists = isInVocabularyBook(currentWord);

                if (exists) {
                    removeFromVocabularyBook(currentWord);
                    wordFavoriteBtn.textContent = '💝 收藏';
                    wordFavoriteBtn.classList.remove('favorited');
                    showVocabularyFeedback('已取消收藏');
                } else {
                    if (addToVocabularyBook(currentWord, currentPinyin || '', 'word')) {
                        wordFavoriteBtn.textContent = '💖 已收藏';
                        wordFavoriteBtn.classList.add('favorited');
                        showVocabularyFeedback('詞已收藏！');
                    }
                }
            });
        }

        // 查看全部按鈕
        const moreBtn = document.getElementById('vocabulary-more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', openVocabularyModal);
        }

        // 模態窗口關閉
        const modalClose = document.getElementById('vocabulary-modal-close');
        const modal = document.getElementById('vocabulary-modal');
        if (modalClose && modal) {
            modalClose.addEventListener('click', closeVocabularyModal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeVocabularyModal();
                }
            });
        }
    }
    // 更新收藏按鈕狀態
    function updateFavoriteButtonState(type, text) {
        const btn = type === 'character' ? 
            document.getElementById('character-favorite-btn') : 
            document.getElementById('word-favorite-btn');

        if (!btn) return;

        const exists = isInVocabularyBook(text);

        if (exists) {
            btn.textContent = '💖 已收藏';
            btn.classList.add('favorited');
        } else {
            btn.textContent = '💝 收藏';
            btn.classList.remove('favorited');
        }
    }

    // 顯示字詞本反饋消息
    function showVocabularyFeedback(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? 'var(--danger)' : 'var(--success)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: toastSlideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }

    // 獲取隨機漢字
    function getRandomCharacter() {
        const randomIndex = Math.floor(Math.random() * commonCharacters.length);
        return commonCharacters[randomIndex];
    }

    // 獲取不重複的隨機漢字集合
    function getRandomCharacters(count) {
        const result = [];
        const availableChars = [...commonCharacters];

        while (result.length < count && availableChars.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableChars.length);
            const char = availableChars.splice(randomIndex, 1)[0];
            result.push(char);
        }

        return result;
    }

    // 隨機打亂數組
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 獲取不重複的隨機漢字（用於筆順挑戰下一個）
    function getNextRandomCharacter() {
        let nextChar;
        // 優先從學習過的字符中選擇，增加複習效果
        if (learnedCharacters.length > 1) {
            // 排除當前字符，避免連續出現相同的字
            const availableChars = learnedCharacters.filter(char => char !== currentCharacter);
            if (availableChars.length > 0) {
                // 有60%概率從學習過的字符中選擇
                if (Math.random() < 0.6) {
                    const randomIndex = Math.floor(Math.random() * availableChars.length);
                    nextChar = availableChars[randomIndex];
                    return nextChar;
                }
            }
        }

        // 從常用漢字中選擇一個不同於當前字符的漢字
        let filteredChars = commonCharacters.filter(char => char !== currentCharacter);
        const randomIndex = Math.floor(Math.random() * filteredChars.length);
        nextChar = filteredChars[randomIndex];
        return nextChar;
    }

    // 挑戰下一個漢字
    function challengeNextCharacter() {
        // 獲取隨機漢字
        const nextChar = getNextRandomCharacter();

        // 更新當前字符
        currentCharacter = nextChar;

        // 更新輸入框
        characterInput.value = nextChar;

        // 重置並開始新的挑戰
        quizResult.style.display = 'none';
        startQuizMode();
    }

    // 預加載語音引擎
    function preloadVoices() {
        if ('speechSynthesis' in window) {
            // 先獲取一次聲音列表以初始化語音引擎
            speechSynthesis.getVoices();

            // 在某些瀏覽器上需要等待 voiceschanged 事件
            speechSynthesis.addEventListener('voiceschanged', function() {
                speechSynthesis.getVoices();
            });
        }
    }

    // 設置事件監聽器
    searchButton.addEventListener('click', queryCharacter);

    // 添加回車鍵支持
    characterInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            queryCharacter();
        }
    });

    animateButton.addEventListener('click', function() {
        if (writer && typeof writer.animateCharacter === 'function') {
            writer.animateCharacter();
        }
    });

    speakButton.addEventListener('click', speakCharacter);

    quizButton.addEventListener('click', function() {
        // 切換到筆順大師功能區，並使用當前查詢的字符進行練習
        if (currentCharacter) {
            // 保存當前字符，防止被重置
            const targetCharacter = currentCharacter;
            console.log('練習書寫按鈕點擊，目標字符:', targetCharacter);

            // 直接同步切換，避免閃動
            // 重置所有按鈕的激活狀態
            [navLookup, navPractice, navMemory, navRadical].forEach(button => {
                button.classList.remove('active');
            });

            // 隱藏所有功能區域
            [characterDisplaySection, memoryGameContainer, radicalGameContainer].forEach(section => {
                section.style.display = 'none';
            });

            // 激活筆順大師按鈕和區域
            navPractice.classList.add('active');
            quizContainer.style.display = 'block';

            // 隱藏搜索框和字符選擇器
            const searchSection = document.getElementById('character-search-section');
            searchSection.style.display = 'none';
            hideCharacterSelector();

            // 確保使用正確的字符並立即開始筆順練習
            currentCharacter = targetCharacter;
            startQuizMode();
        } else {
            // 如果沒有當前字符，則切換到筆順大師並開始隨機練習
            switchMainFunction(navPractice, quizContainer);
            setTimeout(() => {
        startIndependentQuizMode();
            }, 100);
        }
    });



    quizRetry.addEventListener('click', resetQuizMode);

    quizHint.addEventListener('click', function() {
        if (quizWriter && quizWriter._currentStroke !== undefined) {
            showStrokeHint(quizWriter._currentStroke);
        }
    });

    // 下一個漢字按鈕點擊事件
    document.getElementById('quiz-next').addEventListener('click', challengeNextCharacter);

    // 記憶遊戲控制按鈕 - 智能按鈕，根據遊戲狀態改變功能
    memoryStart.addEventListener('click', function() {
        if (memoryGameActive) {
            // 如果遊戲正在進行，停止遊戲並重置
        stopMemoryGame();
            resetMemoryGame();
        } else if (memoryResult.style.display === 'block') {
            // 如果顯示了結果，直接開始新一局遊戲
            startNewRound();
        } else {
            // 否則開始新遊戲
            startMemoryChallenge();
        }
    });

    // 使用事件委托处理记忆游戏选项点击
    memoryOptions.addEventListener('click', function(e) {
        // 只处理选项元素的点击
        if (e.target.classList.contains('memory-option')) {
            selectMemoryOption(e.target.dataset.char, e.target);
        }
    });

    // 設置記憶挑戰難度按鈕點擊事件
    levelButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 只處理記憶挑戰容器內的按鈕
            const memoryLevelButtons = document.querySelectorAll('#memory-game-container .level-btn');
            memoryLevelButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const level = parseInt(this.getAttribute('data-level'));
            if (!isNaN(level) && level > 0) {
                memoryLevel = level;
                console.log('記憶挑戰難度設置為:', memoryLevel);
            }
        });
    });

    // 調整大小時更新漢字顯示（僅在寬度改變時，使用容器實際尺寸）
    window.addEventListener('resize', function() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => updateWriterDimensions(false), 120);
    });

    // 初始化記憶挑戰難度
    function initMemoryGameLevel() {
        const activeMemoryButton = document.querySelector('#memory-game-container .level-btn.active');
        if (activeMemoryButton) {
            const level = parseInt(activeMemoryButton.getAttribute('data-level'));
            if (!isNaN(level) && level > 0) {
                memoryLevel = level;
                console.log('初始化記憶挑戰難度為:', memoryLevel);
            }
        }
    }

    // 添加田字格觸摸事件處理，防止頁面滾動
    function preventTouchScroll(element) {
        element.addEventListener('touchstart', function(e) {
            // 如果是田字格區域，阻止滾動
            e.stopPropagation();
        }, { passive: false });

        element.addEventListener('touchmove', function(e) {
            // 阻止滾動事件
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        element.addEventListener('touchend', function(e) {
            e.stopPropagation();
        }, { passive: false });
    }

    // 為田字格元素添加防滾動處理（已暫時停用以測試 iOS 延遲）
    // preventTouchScroll(characterTarget);
    // preventTouchScroll(quizTargetField);

    // 載入學習記錄和預加載語音
    loadLearnedCharacters();
    updateAchievements();
    preloadVoices();

    // 初始化記憶挑戰
    initMemoryGameLevel();

    // 部首組字遊戲功能

    // 添加對部首組字遊戲導航按鈕的監聽

    navRadical.addEventListener('click', function() {
        // 使用通用的切換功能，保持代碼一致性
        switchMainFunction(navRadical, radicalGameContainer);
        // 記錄功能使用
        playerData.functionsUsed.add('radical_game');
        checkAchievement('explorer');
    });

    // 部首字典 - 常用部首及其可組成的字
    const radicalDictionary = {
        'easy': [
            { target: '好', components: ['女', '子'] },
            { target: '明', components: ['日', '月'] },
            { target: '休', components: ['亻', '木'] },
            { target: '看', components: ['手', '目'] },
            { target: '林', components: ['木', '木'] },
            { target: '男', components: ['田', '力'] },
            { target: '信', components: ['亻', '言'] },
            { target: '同', components: ['口', '冂'] },
            { target: '和', components: ['禾', '口'] },
            { target: '坐', components: ['土', '人'] },
            // 新增简单汉字
            { target: '好', components: ['女', '子'] },
            { target: '你', components: ['亻', '尔'] },
            { target: '他', components: ['亻', '也'] },
            { target: '她', components: ['女', '也'] },
            { target: '们', components: ['亻', '门'] },
            { target: '叫', components: ['口', '丩'] },
            { target: '吃', components: ['口', '乞'] },
            { target: '吗', components: ['口', '马'] },
            { target: '吧', components: ['口', '巴'] },
            { target: '听', components: ['口', '斤'] },
            { target: '呢', components: ['口', '尼'] },
            { target: '呀', components: ['口', '牙'] },
            { target: '哪', components: ['口', '那'] },
            { target: '家', components: ['宀', '豕'] },
            { target: '对', components: ['又', '寸'] },
            { target: '时', components: ['日', '寸'] },
            { target: '想', components: ['相', '心'] },
            { target: '里', components: ['田', '土'] },
            { target: '走', components: ['土', '走'] },
            { target: '起', components: ['走', '己'] },
            { target: '这', components: ['辶', '文'] },
            { target: '都', components: ['者', '阝'] },
            { target: '什', components: ['亻', '十'] },
            { target: '从', components: ['人', '人'] },
            { target: '们', components: ['亻', '门'] },
            { target: '会', components: ['人', '云'] },
            { target: '但', components: ['亻', '旦'] },
            { target: '住', components: ['亻', '主'] },
            { target: '作', components: ['亻', '乍'] },
            { target: '坐', components: ['土', '人'] },
            { target: '安', components: ['宀', '女'] },
            { target: '定', components: ['宀', '正'] },
            { target: '客', components: ['宀', '各'] },
            { target: '容', components: ['宀', '谷'] },
            { target: '字', components: ['宀', '子'] },
            { target: '它', components: ['宀', '匕'] },
            { target: '室', components: ['宀', '至'] },
            { target: '家', components: ['宀', '豕'] },
            { target: '害', components: ['宀', '丰'] }
        ],
        'medium': [
            { target: '想', components: ['相', '心'] },
            { target: '福', components: ['礻', '畐'] },
            { target: '謝', components: ['言', '射'] },
            { target: '飯', components: ['飠', '反'] },
            { target: '歡', components: ['欠', '雚'] },
            { target: '學', components: ['𦥯', '子'] },
            { target: '語', components: ['言', '吾'] },
            { target: '親', components: ['見', '辛'] },
            { target: '聽', components: ['耳', '𢆶'] },
            { target: '說', components: ['言', '兌'] },
            // 新增中等难度汉字
            { target: '教', components: ['孝', '攵'] },
            { target: '授', components: ['扌', '受'] },
            { target: '採', components: ['扌', '采'] },
            { target: '握', components: ['扌', '屋'] },
            { target: '摘', components: ['扌', '啇'] },
            { target: '提', components: ['扌', '是'] },
            { target: '換', components: ['扌', '奐'] },
            { target: '搭', components: ['扌', '荅'] },
            { target: '撥', components: ['扌', '發'] },
            { target: '撞', components: ['扌', '童'] },
            { target: '樂', components: ['幺', '木'] },
            { target: '機', components: ['木', '幾'] },
            { target: '權', components: ['木', '雚'] },
            { target: '樓', components: ['木', '婁'] },
            { target: '標', components: ['木', '票'] },
            { target: '樹', components: ['木', '尌'] },
            { target: '橋', components: ['木', '喬'] },
            { target: '櫃', components: ['木', '貴'] },
            { target: '清', components: ['氵', '青'] },
            { target: '港', components: ['氵', '巷'] },
            { target: '湖', components: ['氵', '胡'] },
            { target: '潔', components: ['氵', '絜'] },
            { target: '潮', components: ['氵', '朝'] },
            { target: '濤', components: ['氵', '壽'] },
            { target: '激', components: ['氵', '敫'] },
            { target: '煮', components: ['者', '灬'] },
            { target: '熟', components: ['孰', '灬'] },
            { target: '熱', components: ['埶', '灬'] },
            { target: '燉', components: ['享', '灬'] },
            { target: '燒', components: ['堯', '灬'] },
            { target: '愛', components: ['爫', '心'] },
            { target: '懂', components: ['董', '心'] },
            { target: '慢', components: ['曼', '心'] },
            { target: '憂', components: ['夂', '心'] },
            { target: '應', components: ['广', '應'] },
            { target: '懷', components: ['褱', '心'] }
        ],
        'hard': [
            { target: '鱷', components: ['魚', '咢'] },
            { target: '籠', components: ['竹', '龍'] },
            { target: '鼕', components: ['鼓', '冬'] },
            { target: '鸚', components: ['鳥', '嬰'] },
            { target: '鱺', components: ['魚', '朁'] },
            { target: '驢', components: ['馬', '戾'] },
            { target: '靈', components: ['雨', '靈'] },
            { target: '鷹', components: ['鳥', '英'] },
            { target: '鷺', components: ['鳥', '路'] },
            { target: '鱟', components: ['魚', '候'] },
            // 新增高难度汉字
            { target: '曉', components: ['日', '堯'] },
            { target: '礙', components: ['石', '疑'] },
            { target: '讓', components: ['言', '襄'] },
            { target: '識', components: ['言', '戠'] },
            { target: '讚', components: ['言', '贊'] },
            { target: '警', components: ['言', '敬'] },
            { target: '譯', components: ['言', '睪'] },
            { target: '議', components: ['言', '義'] },
            { target: '離', components: ['离', '隹'] },
            { target: '難', components: ['堇', '隹'] },
            { target: '雞', components: ['鳥', '奚'] },
            { target: '雜', components: ['隹', '集'] },
            { target: '雖', components: ['虽', '唯'] },
            { target: '電', components: ['雨', '電'] },
            { target: '露', components: ['雨', '路'] },
            { target: '響', components: ['郎', '音'] },
            { target: '頂', components: ['丁', '頁'] },
            { target: '頑', components: ['元', '頁'] },
            { target: '領', components: ['令', '頁'] },
            { target: '須', components: ['彡', '頁'] },
            { target: '額', components: ['客', '頁'] },
            { target: '顯', components: ['日', '頁'] },
            { target: '顧', components: ['雇', '頁'] },
            { target: '願', components: ['原', '頁'] },
            { target: '類', components: ['田', '頁'] },
            { target: '顫', components: ['亶', '頁'] },
            { target: '飄', components: ['票', '風'] },
            { target: '飆', components: ['猋', '風'] },
            { target: '餓', components: ['我', '食'] },
            { target: '餘', components: ['余', '食'] },
            { target: '館', components: ['飠', '官'] },
            { target: '饑', components: ['飠', '几'] },
            { target: '饒', components: ['飠', '堯'] },
            { target: '騎', components: ['馬', '奇'] },
            { target: '騰', components: ['馬', '滕'] },
            { target: '驅', components: ['馬', '區'] },
            { target: '驚', components: ['馬', '敬'] },
            { target: '驗', components: ['馬', '僉'] },
            { target: '髮', components: ['彡', '髟'] },
            { target: '魔', components: ['麻', '鬼'] }
        ]
    };

    // 替代部首 - 因為某些部首難以顯示，用簡化的代替
    const simplifiedRadicals = {
        '亻': '人',   // 單人旁簡化為人
        '礻': '示',   // 示字旁簡化為示
        '飠': '食',   // 食字旁簡化為食
        '龸': '龍',   // 簡化龍字
        '𦥯': '學',   // 簡化學字上部
        '𢆶': '允',   // 簡化允字
        '辶': '走',   // 走之旁簡化為走
        '忄': '心',   // 豎心旁簡化為心
        '氵': '水',   // 三點水簡化為水
        '扌': '手',   // 提手旁簡化為手
        '犭': '犬',   // 反犬旁簡化為犬
        '阝': '阜',   // 阜字旁簡化為阜
        '灬': '火',   // 四點底簡化為火
        '艹': '草',   // 草字頭簡化為草
        '衤': '衣',   // 衣字旁簡化為衣
        '血': '血',
        '刂': '刀',
        '爿': '片',
        '囗': '口',
        '宀': '宀'
    };

    // 當前遊戲狀態
    let currentRadicalLevel = 'easy';
    let currentRadicalPuzzle = null;
    let selectedRadicals = [];
    let currentRadicalAttempts = 0;

    // 取得簡化後的部首
    function getSimplifiedRadical(radical) {
        return simplifiedRadicals[radical] || radical;
    }

    // 啟動部首組字遊戲
    function startRadicalGame() {
        // 獲取當前難度級別
        const radicalLevelButtons = document.querySelectorAll('.radical-level .level-btn');
        radicalLevelButtons.forEach(btn => {
            if (btn.classList.contains('active')) {
                currentRadicalLevel = btn.getAttribute('data-level');
            }
        });

        // 重置遊戲狀態
        selectedRadicals = [];
        currentRadicalAttempts = 0;

        // 隱藏結果和提示
        document.getElementById('radical-result').style.display = 'none';
        document.getElementById('radical-hint').style.display = 'none';

        // 從字典中隨機選擇一個難度相符的謎題
        const puzzles = radicalDictionary[currentRadicalLevel];
        const randomIndex = Math.floor(Math.random() * puzzles.length);
        currentRadicalPuzzle = puzzles[randomIndex];

        // 顯示目標字
        document.getElementById('target-word').textContent = '?';

        // 清空工作區和提示區
        const dropArea = document.getElementById('radical-drop-area');
        dropArea.innerHTML = '<div class="drop-placeholder">拖放部首到此處組字</div>';

        // 準備部首選項
        const radicalsContainer = document.getElementById('radicals-container');
        radicalsContainer.innerHTML = '';

        // 創建目標字的部首
        const targetRadicals = [...currentRadicalPuzzle.components];

        // 添加一些隨機部首作為干擾項
        const allRadicals = [];
        Object.values(radicalDictionary).forEach(puzzles => {
            puzzles.forEach(puzzle => {
                puzzle.components.forEach(radical => {
                    if (!allRadicals.includes(radical)) {
                        allRadicals.push(radical);
                    }
                });
            });
        });

        // 過濾掉已選中的部首
        const availableRadicals = allRadicals.filter(r => !targetRadicals.includes(r));

        // 隨機選擇額外部首
        const extraRadicalsCount = currentRadicalLevel === 'easy' ? 4 : 
                                  currentRadicalLevel === 'medium' ? 6 : 8;

        for (let i = 0; i < extraRadicalsCount && availableRadicals.length > 0; i++) {
            const randomIdx = Math.floor(Math.random() * availableRadicals.length);
            const radical = availableRadicals.splice(randomIdx, 1)[0];
            targetRadicals.push(radical);
        }

        // 打亂部首順序
        shuffleArray(targetRadicals);

        // 創建部首元素
        targetRadicals.forEach(radical => {
            const radicalElement = document.createElement('div');
            radicalElement.className = 'radical-item';
            // 使用簡化後的部首
            radicalElement.textContent = getSimplifiedRadical(radical);
            radicalElement.dataset.radical = radical;

            radicalElement.addEventListener('click', function() {
                selectRadical(this);
            });

            radicalsContainer.appendChild(radicalElement);
        });
    }

    // 選擇部首
    function selectRadical(radicalElement) {
        const radical = radicalElement.dataset.radical;

        // 如果部首已經被選中，則不執行任何操作
        if (radicalElement.classList.contains('selected')) {
            return;
        }

        // 標記為已選中
        radicalElement.classList.add('selected');

        // 將部首添加到工作區
        const dropArea = document.getElementById('radical-drop-area');

        // 移除預設提示文字
        const placeholder = dropArea.querySelector('.drop-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // 創建部首元素
        const workspaceRadical = document.createElement('div');
        workspaceRadical.className = 'radical-item-workspace';
        workspaceRadical.textContent = getSimplifiedRadical(radical);
        workspaceRadical.dataset.radical = radical;

        // 添加點擊事件以移除
        workspaceRadical.addEventListener('click', function() {
            // 從選中列表中移除
            const idx = selectedRadicals.indexOf(radical);
            if (idx !== -1) {
                selectedRadicals.splice(idx, 1);
            }

            // 取消原始部首的選中狀態
            const originalRadical = document.querySelector(`.radical-item[data-radical="${radical}"]`);
            if (originalRadical) {
                originalRadical.classList.remove('selected');
            }

            // 移除工作區中的部首
            this.remove();

            // 如果工作區為空，則顯示提示
            if (dropArea.children.length === 0) {
                dropArea.innerHTML = '<div class="drop-placeholder">拖放部首到此處組字</div>';
            }
        });

        // 添加到工作區
        dropArea.appendChild(workspaceRadical);

        // 添加到選中列表
        selectedRadicals.push(radical);
    }
    // 檢查組字結果
    function checkRadicalResult() {
        // 檢查選擇的部首是否和目標字的部首相符
        const targetComponents = currentRadicalPuzzle.components;

        // 如果選擇的部首數量不符合，則直接顯示錯誤
        if (selectedRadicals.length !== targetComponents.length) {
            showRadicalResult(false);
            return;
        }

        // 檢查所有部首是否匹配
        const allMatch = targetComponents.every(component => 
            selectedRadicals.includes(component)
        );

        if (allMatch) {
            // 完全匹配
            showRadicalResult(true);
            addToLearnedCharacters(currentRadicalPuzzle.target);

            // 墨寶積分系統 - 部首遊戲獎勵
            playerData.totalRadicalGames++;
            playerData.statistics.gamesPlayedToday++;
            playerData.functionsUsed.add('radical');

            // 首次遊戲獎勵
            if (!playerData.firstTimeActions.has('radical_first')) {
                playerData.firstTimeActions.add('radical_first');
                checkAchievement('radical_first');
            }

            // 根據表現給予積分
            let gamePoints = pointRewards.radicalGame;
            if (currentRadicalAttempts === 1) {
                // 一次成功，完美表現
                gamePoints = pointRewards.radicalGamePerfect;
                playerData.perfectRadicalGames++;
            }

            awardPoints(gamePoints, `部首組字 +${gamePoints} 🖌️`);

            // 檢查部首遊戲成就
            checkAchievement('radical_builder');
            checkAchievement('radical_master');
            checkAchievement('perfectionist');
            checkAchievement('game_master');

            updateAchievements();
        } else {
            // 不匹配
            showRadicalResult(false);
        }

        // 增加嘗試次數
        currentRadicalAttempts++;
    }

    // 創建特效 - 只保留水墨擴散效果
    function createSuccessAnimation(targetElement) {
        // 獲取元素位置
        const rect = targetElement.getBoundingClientRect();
        const container = document.getElementById('radical-game-container');

        // 測試水墨特效是否顯示
        console.log("創建成功動畫, 目標元素尺寸:", rect.width, "x", rect.height, "位置:", rect.left, rect.top);

        // 創建墨水擴散效果 - 增加數量並使效果更明顯
        for (let i = 0; i < 7; i++) {
            const inkSplash = document.createElement('div');
            inkSplash.className = 'ink-splash';

            // 以目標字為中心，適當擴散
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // 在中心周圍產生隨機位置
            const distance = i === 0 ? 0 : Math.random() * 40; // 第一個墨滴在中心
            const angle = Math.random() * Math.PI * 2;
            const randomX = centerX + Math.cos(angle) * distance;
            const randomY = centerY + Math.sin(angle) * distance;

            // 添加隨機旋轉効果
            const randomRotation = Math.random() * 360;
            inkSplash.style.transform = `rotate(${randomRotation}deg)`;

            inkSplash.style.left = `${randomX - 100}px`; // 調整中心點
            inkSplash.style.top = `${randomY - 100}px`;  // 調整中心點

            // 隨機縮放 - 不同大小的墨水效果
            const randomScale = 0.8 + Math.random() * 0.8; // 0.8-1.6倍
            inkSplash.style.transform += ` scale(${randomScale})`;

            document.body.appendChild(inkSplash);

            // 適當延遲後顯示，創造墨滴依次擴散的效果
            setTimeout(() => {
                inkSplash.style.opacity = "1";
            }, i * 80);

            // 2秒後移除
            setTimeout(() => {
                inkSplash.remove();
            }, 2000 + i * 100);

            // 發出輕微提示音效果，幫助使用者理解特效是與成功相關的
            console.log("墨水擴散效果已創建: " + i);
        }

        // 目標字元素的發光動畫 - 保留這個以強調成功字符
        targetElement.style.animation = 'character-glow 1.5s ease-in-out';

        // 動畫結束後清除
        setTimeout(() => {
            targetElement.style.animation = '';
        }, 1500);
    }

    // 顯示組字結果
    function showRadicalResult(success) {
        const resultElement = document.getElementById('radical-result');
        resultElement.style.display = 'block';

        // 顯示目標字
        const targetWordElement = document.getElementById('target-word');
        targetWordElement.textContent = currentRadicalPuzzle.target;

        if (success) {
            resultElement.className = 'radical-result success';
            resultElement.querySelector('.radical-result-message').textContent = '非常棒！你成功組字了！';
            resultElement.querySelector('.radical-result-detail').textContent = 
                `你成功組合了「${currentRadicalPuzzle.target}」字！`;

            // 播放成功音效
            playSuccessSound();

            // 成功組字特效
            createSuccessAnimation(targetWordElement);
        } else {
            resultElement.className = 'radical-result error';
            resultElement.querySelector('.radical-result-message').textContent = '加油！再試一次！';

            const correctComponents = currentRadicalPuzzle.components.map(c => getSimplifiedRadical(c)).join('、');
            resultElement.querySelector('.radical-result-detail').textContent = 
                `「${currentRadicalPuzzle.target}」字由 ${correctComponents} 組成`;
        }
    }

    // 顯示提示
    function showRadicalHint() {
        const hintElement = document.getElementById('radical-hint');
        hintElement.style.display = 'block';

        const components = currentRadicalPuzzle.components.map(c => 
            `「${getSimplifiedRadical(c)}」`
        ).join('和');

        hintElement.textContent = `提示：${components}組成「${currentRadicalPuzzle.target}」`;
    }

    // 清空工作區
    function clearRadicalWorkspace() {
        // 清空選中列表
        selectedRadicals = [];

        // 清空工作區
        const dropArea = document.getElementById('radical-drop-area');
        dropArea.innerHTML = '<div class="drop-placeholder">拖放部首到此處組字</div>';

        // 取消所有部首的選中狀態
        const selectedRadicalElements = document.querySelectorAll('.radical-item.selected');
        selectedRadicalElements.forEach(el => {
            el.classList.remove('selected');
        });
    }

    // 設置部首遊戲相關的事件監聽器
    const radicalLevelButtons = document.querySelectorAll('.radical-level .level-btn');
    radicalLevelButtons.forEach(button => {
        button.addEventListener('click', function() {
            radicalLevelButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentRadicalLevel = this.getAttribute('data-level');
            startRadicalGame();
        });
    });

    // 檢查按鈕
    document.getElementById('radical-check').addEventListener('click', checkRadicalResult);

    // 提示按鈕
    document.getElementById('radical-hint-btn').addEventListener('click', showRadicalHint);

    // 清空按鈕
    document.getElementById('radical-clear').addEventListener('click', clearRadicalWorkspace);

    // 下一題按鈕
    document.getElementById('radical-next').addEventListener('click', startRadicalGame);

    // ===== 字詞表選擇功能 =====

    // 系統內建字詞表（層級結構）
    let systemWordlists = [];

    // 用戶自定義字詞表（簡單結構）
    let customWordlists = [];

    // 當前選擇狀態
    let currentSelection = {
        system: null,      // 當前選擇的體系
        systemIndex: -1,   // 當前體系索引
        grade: null,       // 當前選擇的學段/冊次
        gradeIndex: -1,    // 當前學段索引
        unit: null,        // 當前選擇的單元
        unitIndex: -1,     // 當前單元索引
        lesson: null,      // 當前選擇的課
        lessonIndex: -1,   // 當前課索引
        level: 0           // 當前確認的層級 (1-4)
    };

    // 當前選中的字詞表（用於顯示）
    let currentWordlist = null;

    // 獲取字詞表相關元素
    const selectSystem = document.getElementById('select-system');
    const selectGrade = document.getElementById('select-grade');
    const selectUnit = document.getElementById('select-unit');
    const selectLesson = document.getElementById('select-lesson');
    const level1 = document.getElementById('level-1');
    const level2 = document.getElementById('level-2');
    const level3 = document.getElementById('level-3');
    const level4 = document.getElementById('level-4');
    const wordlistDisplay = document.getElementById('wordlist-display');
    const wordlistItems = document.getElementById('wordlist-items');
    const addWordlistModal = document.getElementById('add-wordlist-modal');
    const addWordlistModalClose = document.getElementById('add-wordlist-modal-close');
    const customWordlistName = document.getElementById('custom-wordlist-name');
    const customWordlistContent = document.getElementById('custom-wordlist-content');
    const confirmAddWordlist = document.getElementById('confirm-add-wordlist');
    const cancelAddWordlist = document.getElementById('cancel-add-wordlist');

    // 初始化多層級字詞表選擇器
    function initializeMultiLevelSelector() {
        // 加載保存的自定義字詞表
        loadCustomWordlists();

        // 填充第一級選項（體系）
        populateSystemOptions();

        // 綁定事件監聽器
        bindLevelSelectors();
    }

    // 從 localStorage 加載自定義字詞表
    function loadCustomWordlists() {
        try {
            const saved = localStorage.getItem('customWordlists');
            if (saved) {
                customWordlists = JSON.parse(saved);
            }
        } catch (error) {
            console.error('加載自定義字詞表失敗:', error);
            customWordlists = [];
        }
    }

    // 保存自定義字詞表到 localStorage
    function saveCustomWordlists() {
        try {
            localStorage.setItem('customWordlists', JSON.stringify(customWordlists));
        } catch (error) {
            console.error('保存自定義字詞表失敗:', error);
        }
    }

    // 填充第一級選項（體系）
    function populateSystemOptions() {
        // 清空現有選項（保留默認選項）
        selectSystem.innerHTML = '<option value="">請選擇...</option>';

        // 添加系統內建字詞表
        systemWordlists.forEach((system, index) => {
            const option = document.createElement('option');
            option.value = `system-${index}`;
            option.textContent = `📚 ${system.name}`;
            selectSystem.appendChild(option);
        });

        // 添加分隔線（使用禁用的選項）
        if (customWordlists.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────────';
            selectSystem.appendChild(separator);

            // 添加自定義字詞表
            customWordlists.forEach((wordlist, index) => {
                const option = document.createElement('option');
                option.value = `custom-${index}`;
                option.textContent = `✏️ ${wordlist.name}`;
                selectSystem.appendChild(option);
            });
        }

        // 添加分隔線
        const separator2 = document.createElement('option');
        separator2.disabled = true;
        separator2.textContent = '──────────────';
        selectSystem.appendChild(separator2);

        // 添加「添加字詞表」選項
        const addOption = document.createElement('option');
        addOption.value = 'add-custom';
        addOption.textContent = '➕ 添加字詞表';
        selectSystem.appendChild(addOption);
    }

    // 填充第二級選項（學段/冊次）
    function populateGradeOptions(grades) {
        selectGrade.innerHTML = '<option value="">請選擇...</option>';
        if (grades && grades.length > 0) {
            grades.forEach((grade, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = grade.name;
                selectGrade.appendChild(option);
            });
        }
    }

    // 填充第三級選項（單元）
    function populateUnitOptions(units) {
        selectUnit.innerHTML = '<option value="">請選擇...</option>';
        if (units && units.length > 0) {
            units.forEach((unit, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = unit.name;
                selectUnit.appendChild(option);
            });
        }
    }

    // 填充第四級選項（課）
    function populateLessonOptions(lessons) {
        selectLesson.innerHTML = '<option value="">請選擇...</option>';
        if (lessons && lessons.length > 0) {
            lessons.forEach((lesson, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = lesson.name;
                selectLesson.appendChild(option);
            });
        }
    }

    // 顯示指定層級
    function showLevel(levelNum) {
        const levelElement = document.getElementById(`level-${levelNum}`);
        if (levelElement) {
            levelElement.style.display = 'block';
        }
    }

    // 從指定層級開始隱藏後續層級
    function hideLevelsFrom(startLevel) {
        for (let i = startLevel; i <= 4; i++) {
            const levelElement = document.getElementById(`level-${i}`);
            if (levelElement) {
                levelElement.style.display = 'none';
            }
        }
        // 同時清空字詞顯示
        wordlistDisplay.style.display = 'none';
    }

    // 解析字詞內容（支持逗號、空格、換行分隔）
    function parseWordlistContent(content) {
        if (!content) return [];

        // 替換所有可能的分隔符為統一的分隔符
        let normalized = content
            .replace(/[，、；]/g, ',')  // 中文標點替換為逗號
            .replace(/[\s\n\r]+/g, ',')  // 空白字符替換為逗號
            .split(',')                   // 以逗號分割
            .map(item => item.trim())     // 去除首尾空白
            .filter(item => item.length > 0);  // 過濾空項

        // 去重
        return [...new Set(normalized)];
    }

    // 層級選擇變化處理
    function onSystemChange() {
        const selectedValue = selectSystem.value;

        if (!selectedValue || selectedValue === '') {
            hideLevelsFrom(2);
            currentSelection.system = null;
            currentSelection.systemIndex = -1;
            return;
        }

        // 處理「添加字詞表」選項
        if (selectedValue === 'add-custom') {
            addWordlistModal.style.display = 'flex';
            customWordlistName.value = '';
            customWordlistContent.value = '';
            customWordlistName.focus();
            // 重置下拉菜單
            selectSystem.value = '';
            return;
        }

        // 解析選擇的值
        const [type, indexStr] = selectedValue.split('-');
        const index = parseInt(indexStr);

        if (type === 'custom') {
            // 處理自定義字詞表（無層級結構）
            const wordlist = customWordlists[index];
            if (wordlist) {
                hideLevelsFrom(2);
                displayWordlist(wordlist);
            }
            return;
        }

        // 處理系統字詞表（有層級結構）
        currentSelection.system = systemWordlists[index];
        currentSelection.systemIndex = index;
        currentSelection.level = 0;

        // 重置後續選擇
        currentSelection.grade = null;
        currentSelection.gradeIndex = -1;
        currentSelection.unit = null;
        currentSelection.unitIndex = -1;
        currentSelection.lesson = null;
        currentSelection.lessonIndex = -1;

        // 顯示第2級並填充選項
        showLevel(2);
        populateGradeOptions(currentSelection.system.children);

        // 隱藏後續層級
        hideLevelsFrom(3);
    }

    function onGradeChange() {
        const selectedIndex = selectGrade.value;

        if (!selectedIndex || selectedIndex === '') {
            hideLevelsFrom(3);
            currentSelection.grade = null;
            currentSelection.gradeIndex = -1;
            return;
        }

        currentSelection.grade = currentSelection.system.children[selectedIndex];
        currentSelection.gradeIndex = parseInt(selectedIndex);
        currentSelection.level = 2;

        // 重置後續選擇
        currentSelection.unit = null;
        currentSelection.unitIndex = -1;
        currentSelection.lesson = null;
        currentSelection.lessonIndex = -1;

        // 檢查是否有下級（children）
        if (currentSelection.grade.children && currentSelection.grade.children.length > 0) {
            // 有下級，顯示第3級
            showLevel(3);
            populateUnitOptions(currentSelection.grade.children);
            hideLevelsFrom(4);
        } else if (currentSelection.grade.items && currentSelection.grade.items.length > 0) {
            // 沒有下級但有字詞，直接顯示字詞
            hideLevelsFrom(3);
            displayWordlist({
                name: currentSelection.grade.name,
                items: currentSelection.grade.items
            });
        } else {
            // 既沒有下級也沒有字詞
            hideLevelsFrom(3);
        }
    }

    function onUnitChange() {
        const selectedIndex = selectUnit.value;

        if (!selectedIndex || selectedIndex === '') {
            hideLevelsFrom(4);
            currentSelection.unit = null;
            currentSelection.unitIndex = -1;
            return;
        }

        currentSelection.unit = currentSelection.grade.children[selectedIndex];
        currentSelection.unitIndex = parseInt(selectedIndex);
        currentSelection.level = 3;

        // 重置後續選擇
        currentSelection.lesson = null;
        currentSelection.lessonIndex = -1;

        // 檢查是否有下級（children）
        if (currentSelection.unit.children && currentSelection.unit.children.length > 0) {
            // 有下級，顯示第4級
            showLevel(4);
            populateLessonOptions(currentSelection.unit.children);
            wordlistDisplay.style.display = 'none';
        } else if (currentSelection.unit.items && currentSelection.unit.items.length > 0) {
            // 沒有下級但有字詞，直接顯示字詞
            hideLevelsFrom(4);
            displayWordlist({
                name: currentSelection.unit.name,
                items: currentSelection.unit.items
            });
        } else {
            // 既沒有下級也沒有字詞
            hideLevelsFrom(4);
            wordlistDisplay.style.display = 'none';
        }
    }

    function onLessonChange() {
        const selectedIndex = selectLesson.value;

        if (!selectedIndex || selectedIndex === '') {
            currentSelection.lesson = null;
            currentSelection.lessonIndex = -1;
            wordlistDisplay.style.display = 'none';
            return;
        }

        currentSelection.lesson = currentSelection.unit.children[selectedIndex];
        currentSelection.lessonIndex = parseInt(selectedIndex);
        currentSelection.level = 4;

        // 檢查是否有字詞
        if (currentSelection.lesson.items && currentSelection.lesson.items.length > 0) {
            displayWordlist({
                name: currentSelection.lesson.name,
                items: currentSelection.lesson.items
            });
        } else {
            wordlistDisplay.style.display = 'none';
        }
    }

    // 收集指定層級的所有字詞
    function collectItemsAtLevel(level) {
        let items = [];
        let node;

        switch(level) {
            case 2: node = currentSelection.grade; break;
            case 3: node = currentSelection.unit; break;
            case 4: node = currentSelection.lesson; break;
        }

        if (!node) return [];

        function collectRecursive(n) {
            if (n.items && Array.isArray(n.items)) {
                items.push(...n.items);
            }
            if (n.children && Array.isArray(n.children)) {
                n.children.forEach(child => collectRecursive(child));
            }
        }

        collectRecursive(node);
        return [...new Set(items)]; // 去重
    }

    // 確認按鈕點擊處理
    function onLevelConfirm(level) {
        currentSelection.level = level;

        // 收集該級別的所有字詞
        const allItems = collectItemsAtLevel(level);

        if (allItems.length === 0) {
            showToast('該級別尚無字詞數據');
            return;
        }

        // 獲取名稱
        let name = '';
        if (level === 2 && currentSelection.grade) name = currentSelection.grade.name;
        if (level === 3 && currentSelection.unit) name = currentSelection.unit.name;
        if (level === 4 && currentSelection.lesson) name = currentSelection.lesson.name;

        // 顯示字詞列表
        displayWordlist({
            name: name,
            items: allItems
        });
    }

    // 顯示字詞表內容（使用田字格）
    function displayWordlist(wordlist) {
        if (!wordlist || !wordlist.items || wordlist.items.length === 0) {
            wordlistDisplay.style.display = 'none';
            return;
        }

        currentWordlist = wordlist;
        wordlistItems.innerHTML = '';
        wordlistItems.className = 'wordlist-items wordlist-tianzige-display';

        // 檢查當前是否在字詞查詢界面
        const isWordLookupMode = wordLookupContainer.style.display === 'flex';

        // 根據模式顯示不同的內容
        if (isWordLookupMode) {
            // 字詞查詢模式：保持原始詞語，按詞顯示
            wordlist.items.forEach(item => {
                displayWordInTianzige(item, true);
            });
        } else {
            // 筆順查詢模式：拆分為單字，按字顯示
            const chars = new Set();
            wordlist.items.forEach(item => {
                // 將詞語拆分為單個字
                for (let char of item) {
                    if (/[\u4e00-\u9fa5]/.test(char)) {  // 只保留中文字符
                        chars.add(char);
                    }
                }
            });

            // 顯示單字
            [...chars].forEach(char => {
                displayWordInTianzige(char, false);
            });
        }

        wordlistDisplay.style.display = 'block';
    }
    // 在田字格中顯示字或詞
    function displayWordInTianzige(text, isWordMode) {
        if (isWordMode) {
            // 字詞查詢模式：創建詞組容器
            const wordGroup = document.createElement('div');
            wordGroup.className = 'wordlist-word-group';
            wordGroup.dataset.word = text;

            // 為詞組中的每個字創建田字格
            for (let char of text) {
                if (/[\u4e00-\u9fa5]/.test(char)) {
                    const charBtn = document.createElement('div');
                    charBtn.className = 'wordlist-char-btn word-mode';
                    charBtn.textContent = char;
                    wordGroup.appendChild(charBtn);
                }
            }

            // 詞組點擊事件：查詢整個詞
            wordGroup.addEventListener('click', function() {
                const wordInput = document.getElementById('word-input');
                if (wordInput) {
                    wordInput.value = text;
                    fetchWordDefinition(text, 'wordlist');
                }
            });

            wordlistItems.appendChild(wordGroup);

        } else {
            // 筆順查詢模式：單字獨立顯示
            const charBtn = document.createElement('button');
            charBtn.className = 'wordlist-char-btn stroke-mode';
            charBtn.textContent = text;
            charBtn.dataset.character = text;

            // 單字點擊事件：顯示筆順
            charBtn.addEventListener('click', function() {
                const characterInput = document.getElementById('character-input');
                if (characterInput) {
                    characterInput.value = text;
                    hideCharacterSelector();
                    switchToCharacter(text, 'wordlist');
                }
            });

            wordlistItems.appendChild(charBtn);
        }
    }

    // 清除字詞表選擇
    function clearWordlistSelection() {
        currentWordlist = null;
        currentSelection = {
            system: null,
            systemIndex: -1,
            grade: null,
            gradeIndex: -1,
            unit: null,
            unitIndex: -1,
            lesson: null,
            lessonIndex: -1,
            level: 0
        };

        // 重置所有選擇器
        selectSystem.value = '';
        selectGrade.value = '';
        selectUnit.value = '';
        selectLesson.value = '';

        // 隱藏所有層級（除了第一級）
        hideLevelsFrom(2);

        wordlistDisplay.style.display = 'none';
        wordlistItems.innerHTML = '';
    }

    // 綁定層級選擇器事件
    function bindLevelSelectors() {
        // 第1級：體系選擇
        selectSystem.addEventListener('change', onSystemChange);

        // 第2級：學段/冊次選擇
        selectGrade.addEventListener('change', onGradeChange);

        // 第3級：單元選擇
        selectUnit.addEventListener('change', onUnitChange);

        // 第4級：課選擇
        selectLesson.addEventListener('change', onLessonChange);

        // 確認按鈕
        const confirmBtns = document.querySelectorAll('.level-confirm-btn');
        confirmBtns.forEach((btn, index) => {
            btn.addEventListener('click', function() {
                // index 0 對應 level 2, index 1 對應 level 3, index 2 對應 level 4
                onLevelConfirm(index + 2);
            });
        });
    }

    // 關閉添加字詞表模態窗口
    function closeAddWordlistModal() {
        addWordlistModal.style.display = 'none';
        customWordlistName.value = '';
        customWordlistContent.value = '';
    }

    addWordlistModalClose.addEventListener('click', closeAddWordlistModal);
    cancelAddWordlist.addEventListener('click', closeAddWordlistModal);

    // 點擊模態窗口背景關閉
    addWordlistModal.addEventListener('click', function(e) {
        if (e.target === addWordlistModal) {
            closeAddWordlistModal();
        }
    });
    // 確認添加自定義字詞表
    confirmAddWordlist.addEventListener('click', function() {
        const name = customWordlistName.value.trim();
        const content = customWordlistContent.value.trim();

        if (!name) {
            alert('請輸入字詞表名稱');
            customWordlistName.focus();
            return;
        }

        if (!content) {
            alert('請輸入字詞內容');
            customWordlistContent.focus();
            return;
        }

        // 解析字詞內容
        const items = parseWordlistContent(content);

        if (items.length === 0) {
            alert('未能識別到有效的字詞，請檢查格式');
            customWordlistContent.focus();
            return;
        }

        // 創建新的字詞表
        const newWordlist = {
            name: name,
            items: items,
            type: 'custom',
            createdAt: new Date().toISOString()
        };

        // 添加到自定義字詞表列表
        customWordlists.push(newWordlist);

        // 保存到 localStorage
        saveCustomWordlists();

        // 關閉模態窗口
        closeAddWordlistModal();

        // 自動顯示新添加的字詞表
        displayWordlist(newWordlist);

        // 顯示成功提示
        showToast(`已添加字詞表「${name}」，包含 ${items.length} 個字詞`);
    });

    // 簡單的 Toast 提示函數
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }

    // 添加動畫樣式
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // 添加系統內建字詞表的函數（供後續使用）
    function addSystemWordlist(wordlistData) {
        systemWordlists.push(wordlistData);
        populateSystemOptions();
    }

    // 監聽導航切換，更新字詞表顯示
    [navLookup, navWordLookup].forEach(button => {
        button.addEventListener('click', function() {
            // 如果有選中的字詞表，重新顯示以更新顯示模式
            if (currentWordlist) {
                // 延遲一點執行，確保界面已經切換
                setTimeout(() => {
                    displayWordlist(currentWordlist);
                }, 100);
            }
        });
    });

    // 初始化多層級字詞表選擇器
    initializeMultiLevelSelector();

    // 添加弘立預備班漢字表
    addSystemWordlist({
        name: "弘立預備班漢字表",
        children: [
            {
                name: "上冊",
                items: [
                    "一", "二", "三", "十", "土", "上", "工", "牛", "生", "八",
                    "人", "大", "天", "下", "太", "不", "六", "口", "中", "日",
                    "田", "小", "少", "山", "牙", "刀", "力", "月", "用", "又",
                    "友", "也", "地", "它", "你", "七", "四", "元", "巴", "九",
                    "丸", "女", "她", "去", "台", "玩", "拍", "比", "叫", "心",
                    "思", "我", "找"
                ]
            },
            {
                name: "下冊",
                items: [
                    "耳", "目", "手", "足", "木", "禾", "米", "果", "火", "水",
                    "羊", "馬", "車", "舟", "門", "戶", "毛", "巾", "子", "石",
                    "林", "明", "分", "男", "古", "言", "舌", "五", "年", "左",
                    "右", "來", "多", "立", "坐", "走", "吃", "唱", "有", "在",
                    "是", "的", "和", "好", "他", "牠", "爸", "媽", "朋", "具",
                    "早", "午", "青", "草", "花", "朵"
                ]
            }
        ]
    });

    // ===== 字詞查詢功能 =====

    // 字詞查詢變量
    let currentWord = '';

    // 檢查是否為有效的中文字詞
    function isValidChineseWord(text) {
        // 檢查是否為1-10個中文字符（支持單字和詞語）
        return /^[\u4e00-\u9fa5]{1,10}$/.test(text.trim());
    }

    // 清理文本中的特殊符號（如萌典API返回的~符號）
    function cleanText(text) {
        if (!text) return '';
        // 移除~符號和其他特殊標記
        return text.replace(/~/g, '').replace(/`/g, '').trim();
    }

    // 查詢字詞解釋（統一入口）
    async function fetchWordDefinition(word, source = 'user') {
        currentSearchWord = word; // 更新當前搜索的詞語

        // 保存到字詞本查詢歷史
        lastLookedUpWord = word;

        try {
            showWordLoader();
            hideWordError();

            // 判斷是單字還是詞語
            if (word.length === 1) {
                // 單字查詢：復用筆順查詢的單字解釋功能
                await fetchSingleCharacterDefinition(word);
            } else {
                // 詞語查詢：使用萌典詞語API
                await fetchMultiCharacterDefinition(word);
            }
        } catch (error) {
            console.error('字詞查詢錯誤:', error);
            showWordError('暫時無法獲取字詞解釋，請稍後重試');
        } finally {
            hideWordLoader();
            // 更新收藏按鈕狀態
            updateFavoriteButtonState('word', word);

            // 墨寶積分系統 - 詞語查詢獎勵（僅在用戶主動查詢時給予）
            if (source === 'user') {
                playerData.totalWordsLearned++;
                playerData.statistics.wordsToday++;
                playerData.functionsUsed.add('word_lookup');

                // 首次查詢獎勵
                if (!playerData.firstTimeActions.has('first_word')) {
                    playerData.firstTimeActions.add('first_word');
                    checkAchievement('first_word');
                }

                // 查詢積分獎勵
                awardPoints(pointRewards.wordLookup, `查詢詞語 +${pointRewards.wordLookup} 🖌️`);

                // 檢查學習里程成就
                checkAchievement('word_starter');
                checkAchievement('word_expert');

                // 檢查時間相關成就
                checkAchievement('night_owl');
                checkAchievement('early_bird');
            }
        }
    }

    // 單字查詢（復用筆順查詢功能）
    async function fetchSingleCharacterDefinition(character) {
        const response = await fetch(`https://www.moedict.tw/uni/${encodeURIComponent(character)}`);

        if (!response.ok) {
            throw new Error('查詢失敗');
        }

        const data = await response.json();
        console.log('萌典單字API返回數據:', JSON.stringify(data, null, 2));

        displaySingleCharacterDefinition(data, character);
    }

    // 詞語查詢
    async function fetchMultiCharacterDefinition(word) {
        const response = await fetch(`https://www.moedict.tw/a/${encodeURIComponent(word)}.json`);

        if (!response.ok) {
            throw new Error('查詢失敗');
        }

        const data = await response.json();
        console.log('萌典詞語API返回數據:', JSON.stringify(data, null, 2));

        displayMultiCharacterDefinition(data, word);
    }

    // 顯示單字定義（復用筆順查詢的邏輯）
    function displaySingleCharacterDefinition(data, character) {
        currentWord = character;

        // 設置字詞標題
        wordTitle.textContent = character;

        // 設置讀音
        let pronunciation = '';
        if (data && data.heteronyms && data.heteronyms.length > 0) {
            const pronunciations = data.heteronyms.map(h => h.pinyin || '').filter(p => p);
            if (pronunciations.length > 0) {
                pronunciation = pronunciations.join('、');
            }
        }
        wordPronunciation.textContent = pronunciation ? `[${pronunciation}]` : '';

        // 保存拼音到查詢歷史
        lastLookedUpWordPinyin = pronunciation;

        // 顯示結果區域
        wordResultSection.style.display = 'block';

        // 使用與筆順查詢相同的解釋顯示邏輯
        displaySingleCharacterContent(data);
    }

    // 顯示單字解釋內容（復用筆順查詢邏輯）
    function displaySingleCharacterContent(data) {
        if (!data || !data.heteronyms || data.heteronyms.length === 0) {
            wordDefinitionContent.innerHTML = '<div class="definition-item"><div class="definition-text">未找到字義資料</div></div>';
            return;
        }

        let html = '';

        // 遍歷所有讀音和釋義（與筆順查詢相同的邏輯）
        data.heteronyms.forEach((heteronym, index) => {
            if (heteronym.definitions && heteronym.definitions.length > 0) {
                // 遍歷所有釋義
                heteronym.definitions.forEach((def, defIndex) => {
                    html += '<div class="definition-item">';

                    // 詞性標籤和中文釋義內容在同一行
                    html += '<div class="definition-main">';
                    if (def.type) {
                        html += `<span class="definition-type">${cleanText(def.type)}</span>`;
                    }
                    if (def.def) {
                        html += `<span class="definition-text">${cleanText(def.def)}</span>`;
                    }
                    html += '</div>';

                    // 英文釋義
                    if (def.english) {
                        html += `<div class="definition-english">🇺🇸 ${cleanText(def.english)}</div>`;
                    }

                    // 檢查是否有其他格式的英文釋義
                    if (def.en) {
                        html += `<div class="definition-english">🇺🇸 ${cleanText(def.en)}</div>`;
                    }

                    // 例句顯示
                    const examples = [];

                    // 檢查 example 字段
                    if (def.example) {
                        if (Array.isArray(def.example)) {
                            examples.push(...def.example);
                        } else if (typeof def.example === 'string') {
                            examples.push(def.example);
                        }
                    }

                    // 檢查 quote 字段
                    if (def.quote) {
                        if (Array.isArray(def.quote)) {
                            examples.push(...def.quote);
                        } else if (typeof def.quote === 'string') {
                            examples.push(def.quote);
                        }
                    }

                    // 顯示例句（最多2個）
                    examples.slice(0, 2).forEach(example => {
                        if (example && example.trim()) {
                            // 清理例句中的特殊符號和HTML標籤
                            let cleanExample = cleanText(example.replace(/<[^>]*>/g, '').trim());

                            // 限制例句長度，避免過長
                            if (cleanExample.length > 50) {
                                cleanExample = cleanExample.substring(0, 47) + '...';
                            }

                            html += `<div class="definition-example">${cleanExample}</div>`;
                        }
                    });

                    html += '</div>';
                });
            }
        });

        if (html) {
            wordDefinitionContent.innerHTML = html;
        } else {
            wordDefinitionContent.innerHTML = '<div class="definition-item"><div class="definition-text">未找到詳細釋義</div></div>';
        }
    }

    // 顯示詞語定義
    function displayMultiCharacterDefinition(data, word) {
        currentWord = word;

        // 設置詞語標題
        wordTitle.textContent = word;

        // 設置讀音（如果有的話）
        let pronunciation = '';
        if (data && data.h && data.h.length > 0) {
            const heteronyms = data.h;
            const pronunciations = heteronyms.map(h => h.p || '').filter(p => p);
            if (pronunciations.length > 0) {
                pronunciation = pronunciations.join('、');
            }
        }
        wordPronunciation.textContent = pronunciation ? `[${pronunciation}]` : '';

        // 保存拼音到查詢歷史
        lastLookedUpWordPinyin = pronunciation;

        // 顯示結果區域
        wordResultSection.style.display = 'block';

        // 設置詞語解釋
        displayMultiCharacterContent(data, word);
    }

    // 顯示詞語解釋內容（修復符號問題）
    function displayMultiCharacterContent(data, word) {
        wordDefinitionContent.innerHTML = '';

        if (!data || !data.h || data.h.length === 0) {
            wordDefinitionContent.innerHTML = '<div class="definition-item"><div class="definition-text">未找到詞語資料</div></div>';
            return;
        }

        let html = '';

        // 遍歷所有讀音和釋義
        data.h.forEach((heteronym, index) => {
            if (heteronym.d && heteronym.d.length > 0) {
                heteronym.d.forEach((definition, defIndex) => {
                    html += '<div class="definition-item">';

                    // 詞性標籤和中文釋義內容在同一行（與單字查詢保持一致）
                    html += '<div class="definition-main">';
                    if (definition.f) {
                        html += `<span class="definition-type">${cleanText(definition.f)}</span>`;
                    }
                    if (definition.d) {
                        html += `<span class="definition-text">${cleanText(definition.d)}</span>`;
                    }
                    html += '</div>';

                    // 顯示例句（如果有，清理特殊符號）
                    if (definition.e && definition.e.length > 0) {
                        definition.e.forEach(example => {
                            const cleanExample = cleanText(example);
                            if (cleanExample) {
                                html += `<div class="definition-example">${cleanExample}</div>`;
                            }
                        });
                    }

                    html += '</div>';
                });
            }
        });

        if (html === '') {
            html = '<div class="definition-item"><div class="definition-text">未找到詳細解釋</div></div>';
        }

        wordDefinitionContent.innerHTML = html;
    }

    // 顯示字詞查詢錯誤
    function showWordError(message) {
        wordErrorMessage.textContent = message;
        wordErrorMessage.style.display = 'block';
        wordResultSection.style.display = 'none';
    }

    // 隱藏字詞查詢錯誤
    function hideWordError() {
        wordErrorMessage.style.display = 'none';
    }

    // 顯示字詞查詢載入器
    function showWordLoader() {
        wordLoader.style.display = 'block';
    }

    // 隱藏字詞查詢載入器
    function hideWordLoader() {
        wordLoader.style.display = 'none';
    }

    // 朗讀字詞（使用太虛幻境 TTS 系統）
    async function speakWord(word) {
        if (!word) return;

        // 停止當前語音
        if (window.speechSynthesis) {
            speechSynthesis.cancel();
        }

        // 使用太虛幻境 TTS（優先在線 TTS，失敗時回退瀏覽器語音）
        if (window.taixuSpeak) {
            await window.taixuSpeak(word, {
                voice: 'zh-CN-XiaoxiaoNeural', // 普通話女聲
                rate: 0.8,
                pitch: 1.0
            });
        } else {
            console.warn('TTS 功能未載入，請確認已引入 taixu-tts.js');
        }
    }

    // 字詞拆字練習功能
    function startWordPractice(word) {
        if (!word) return;

        // 獲取詞語中的每個字符
        const characters = Array.from(word);

        if (characters.length === 0) return;

        // 切換到筆順查詢頁面
        switchMainFunction(navLookup, characterDisplaySection);

        // 設置第一個字符進行查詢
        const firstChar = characters[0];
        characterInput.value = firstChar;
        searchButton.click();

        // 提示用戶
        setTimeout(() => {
            alert(`開始練習「${word}」的第一個字「${firstChar}」！\n您可以依次練習每個字的筆順。`);
        }, 500);
    }

    // 字詞查詢事件監聽器
    wordSearchButton.addEventListener('click', function() {
        const word = wordInput.value.trim();

        if (!word) {
            showWordError('請輸入字或詞語');
            return;
        }

        if (!isValidChineseWord(word)) {
            showWordError('請輸入有效的中文字或詞語（1-10個字）');
            return;
        }

        fetchWordDefinition(word, 'user');
    });

    // 字詞輸入框回車事件
    wordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            wordSearchButton.click();
        }
    });

    // 字詞朗讀按鈕事件
    wordSpeakButton.addEventListener('click', function() {
        if (currentWord) {
            speakWord(currentWord);
        }
    });
    // 字詞拆字練習按鈕事件
    wordPracticeButton.addEventListener('click', function() {
        if (currentWord) {
            startWordPractice(currentWord);
        }
    });

    // 最後進行初始化
    // 初始化字詞本
    initVocabularyBook();

    // 載入默認漢字（不給積分）
    characterInput.value = '人';
    hideCharacterSelector();
    switchToCharacter('人', 'init');

    // ============ 我的漢字樹：資料、遮罩與渲染 ============
    const hanziTree = {
        sidebar: {
            canvas: document.getElementById('hanzi-tree-canvas'),
            trunkCanvas: document.getElementById('hanzi-tree-trunk'),
            container: document.getElementById('hanzi-tree-cloud')
        },
        modal: {
            canvas: document.getElementById('hanzi-tree-canvas-large'),
            trunkCanvas: document.getElementById('hanzi-tree-trunk-large'),
            container: document.getElementById('hanzi-tree-cloud-large'),
            root: document.getElementById('hanzi-tree-modal'),
            openBtn: document.getElementById('hanzi-tree-expand-btn'),
            closeBtn: document.getElementById('hanzi-tree-modal-close')
        },
        svg: {
            loaded: false,
            promise: null,
            viewBox: '0 0 1024 1024',
            crownMaskSVG: null,
            trunkSVG: null
        },
        tooltipEl: null,
        rerenderTimer: null
    };

    // 建立簡單可愛樹形遮罩（之後可替換為圖片/SVG）
    function drawCuteTreeMaskToCanvas(canvas) {
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        // 兼容脫離DOM情況：優先使用既有width/height，其次用offset/父容器尺寸，最後使用預設值
        const domW = canvas.offsetWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0);
        const domH = canvas.offsetHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : 0);
        const w = canvas.width || domW || 300;
        const h = canvas.height || domH || 200;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);

        // 樹冠：多個圓形疊加（加粗輪廓，有助於填滿形狀邊緣）
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.01));
        const cx = w * 0.5;
        // 提升樹冠位置與尺度，盡量利用水平空間
        const cy = h * 0.32;
        const r = Math.min(w, h) * 0.35;
        const circles = [
            {x: cx - r*1.05, y: cy - r*0.22, r: r*1.05},
            {x: cx + r*1.05, y: cy - r*0.22, r: r*1.0},
            {x: cx - r*0.25, y: cy - r*1.1, r: r*0.95},
            {x: cx + r*0.35, y: cy + r*0.24, r: r*1.0},
            {x: cx - r*0.65, y: cy + r*0.35, r: r*0.9}
        ];
        ctx.beginPath();
        circles.forEach(c => { ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); });
        ctx.fill();
        ctx.stroke();

        // 注意：遮罩僅用於樹冠，樹幹與土地改由背景裝飾呈現
        return canvas;
    }

    function buildWordCloudListFromFavorites() {
        const items = (vocabularyBook.items || []).slice();
        if (items.length === 0) return [];
        // 依時間排序（新→舊），確保有明顯權重差
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const maxW = Math.min(12, Math.max(8, items.length + 4));
        const minW = 2;
        const span = Math.max(1, maxW - minW);
        return items.map((item, index) => {
            const isChar = item.text.length === 1;
            // 基於排名的權重，確保有梯度；詞語略加權
            let w = Math.max(minW, maxW - index);
            if (!isChar) w += 1;
            // 長詞（>=3字）再略加權
            if (item.text.length >= 3) w += 1;
            const color = isChar ? '#2E7D32' : '#43A047';
            return [item.text, w, { color, data: item }];
        });
    }

    function renderHanziTree(target, opts = {}) {
        const container = target.container;
        const canvas = target.canvas;
        if (!container || !canvas || typeof WordCloud === 'undefined') return;
        const rect = container.getBoundingClientRect();
        const dpr = (window.devicePixelRatio || 1);
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = rect.width + 'px';
        canvas.height = rect.height + 'px';

        // 準備遮罩畫布
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');

        // 先畫SVG樹幹（在文字雲下層的trunkCanvas）
        drawTreeTrunk(target);

        // 製作樹冠遮罩（使用tree.svg的綠色部分）
        ensureHanziTreeSvgLoaded().then(() => {
            return drawSvgStringToCtx(maskCtx, hanziTree.svg.crownMaskSVG, maskCanvas.width, maskCanvas.height, { alignBottom: false })
                .then(() => {
                    try {
                        // 將非透明像素標準化為黑色遮罩
                        const imgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                        const data = imgData.data;
                        for (let i = 0; i < data.length; i += 4) {
                            const a = data[i + 3];
                            if (a > 10) {
                                data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
                            } else {
                                data[i + 3] = 0;
                            }
                        }
                        maskCtx.putImageData(imgData, 0, 0);
                    } catch (e) {
                        // 忽略，使用已有像素
                    }
                    // 裁切底部，避免覆蓋樹幹與土地
                    const cutY = Math.floor(maskCanvas.height * 0.56);
                    maskCtx.clearRect(0, cutY, maskCanvas.width, maskCanvas.height - cutY);
                    doWordCloud();
                });
        }).catch(() => {
            // 任何錯誤，使用回退遮罩
            const temp = document.createElement('canvas');
            temp.width = rect.width; temp.height = rect.height;
            temp.style.width = rect.width + 'px'; temp.style.height = rect.height + 'px';
            drawCuteTreeMaskToCanvas(temp);
            maskCtx.drawImage(temp, 0, 0, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
            doWordCloud();
        });

        function doWordCloud() {
            const list = buildWordCloudListFromFavorites();
            const itemCount = list.length;
            // 依項目數自適應密度與字級範圍（CSS像素）
            const gridSizeCss = itemCount <= 8 ? 1 : Math.max(2, Math.floor((rect.width + rect.height) / 360));
            const gridSize = Math.max(1, Math.floor(gridSizeCss * dpr));
            const maxFontCss = opts.maxFont || (itemCount <= 8 ? Math.max(22, Math.floor(rect.height * 0.20)) : Math.max(18, Math.floor(rect.height * 0.14)));
            const minFontCss = opts.minFont || (itemCount <= 8 ? Math.max(10, Math.floor(rect.height * 0.065)) : Math.max(9, Math.floor(rect.height * 0.048)));
            // 擴大嘗試次數，盡量填滿遮罩
            WordCloud(canvas, {
                list,
                gridSize,
                weightFactor: function(size) {
                    // 依權重在[min,max]之間映射，並乘以dpr以保持CSS像素大小
                    return dpr * (minFontCss + (maxFontCss - minFontCss) * (size - 2) / 10);
                },
                rotateRatio: 0,
                shrinkToFit: false,
                drawOutOfBound: false,
                fontFamily: 'Noto Serif TC, serif',
                backgroundColor: 'rgba(0,0,0,0)',
                color: function(word, weight) {
                    const entry = list.find(e => e[0] === word && e[1] === weight);
                    return entry && entry[2] && entry[2].color ? entry[2].color : '#2E7D32';
                },
                clearCanvas: true,
                drawMask: true,
                maskCanvas: maskCanvas,
                maskColor: 'rgba(46, 125, 50, 0.08)',
                abortThreshold: 6000, // 預設2000，增大
                abort: function() { return false; },
                hover: function(item, dimension, evt) { handleTreeHover(item, dimension, evt); },
                click: function(item) { handleTreeClick(item); }
            });
        }
    }

    function ensureHanziTreeSvgLoaded() {
        if (hanziTree.svg.loaded) return Promise.resolve();
        if (hanziTree.svg.promise) return hanziTree.svg.promise;
        const url = 'images/hanzishu/tree.svg';
        hanziTree.svg.promise = fetch(url).then(r => r.text()).then(txt => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(txt, 'image/svg+xml');
            const svgEl = doc.querySelector('svg');
            const viewBox = svgEl && svgEl.getAttribute('viewBox') ? svgEl.getAttribute('viewBox') : '0 0 1024 1024';
            hanziTree.svg.viewBox = viewBox;
            const paths = Array.from(doc.querySelectorAll('path'));
            // 綠色樹冠與棕色樹幹
            const crown = paths.find(p => (p.getAttribute('fill') || '').toLowerCase() === '#1ca538');
            const trunk = paths.find(p => (p.getAttribute('fill') || '').toLowerCase() === '#65320b');
            // 構造樹冠遮罩SVG（填充黑色）
            if (crown) {
                const d = crown.getAttribute('d') || '';
                hanziTree.svg.crownMaskSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}" fill="#000000"/></svg>`;
            }
            // 構造樹幹SVG（保留原棕色）
            if (trunk) {
                const d = trunk.getAttribute('d') || '';
                const fill = trunk.getAttribute('fill') || '#65320b';
                hanziTree.svg.trunkSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}" fill="${fill}"/></svg>`;
            }
            hanziTree.svg.loaded = true;
        });
        return hanziTree.svg.promise;
    }

    function drawSvgStringToCtx(ctx, svgString, targetW, targetH, opts = {}) {
        if (!svgString) return Promise.resolve();
        return new Promise((resolve) => {
            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.onload = () => {
                try {
                    ctx.clearRect(0, 0, targetW, targetH);
                    const vw = 1024, vh = 1024; // 根據viewBox比例繪製
                    const ar = vw / vh;
                    let dw, dh;
                    if ((targetW / targetH) >= ar) { dh = targetH; dw = dh * ar; } else { dw = targetW; dh = dw / ar; }
                    const dx = Math.floor((targetW - dw) / 2);
                    const alignBottom = !!opts.alignBottom;
                    const dy = alignBottom ? Math.floor(targetH - dh) : Math.floor((targetH - dh) / 2);
                    ctx.drawImage(img, dx, dy, dw, dh);
                } finally {
                    URL.revokeObjectURL(url);
                    resolve();
                }
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
            img.src = url;
        });
    }
    function drawTreeTrunk(target) {
        const canvas = target.trunkCanvas;
        const container = target.container;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        const dpr = (window.devicePixelRatio || 1);
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = rect.width + 'px';
        canvas.height = rect.height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 使用簡潔垂直樹幹（去除分叉），對齊地面上方
        const groundRatio = 0.14; // 與CSS土地高度一致
        const trunkHeightRatio = 0.28; // 與原設計接近，與樹冠銜接
        const trunkWidthRatio = 0.06; // 視覺上適中的寬度
        const trunkHeight = Math.floor(canvas.height * trunkHeightRatio);
        const trunkWidth = Math.floor(canvas.width * trunkWidthRatio);
        const x = Math.floor(canvas.width / 2 - trunkWidth / 2);
        const y = Math.floor(canvas.height * (1 - groundRatio) - trunkHeight);
        const grad = ctx.createLinearGradient(0, y, 0, y + trunkHeight);
        grad.addColorStop(0, '#8D6E63');
        grad.addColorStop(1, '#5D4037');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, trunkWidth, trunkHeight);
    }

    function handleTreeHover(item, dimension, evt) {
        if (!item) { destroyTreeTooltip(); return; }
        const data = item[2] && item[2].data;
        if (!data) { destroyTreeTooltip(); return; }
        const text = data.text || '';
        const pinyin = data.pinyin || '';
        const tip = pinyin ? `${text} · ${pinyin}` : text;
        if (!hanziTree.tooltipEl) {
            const el = document.createElement('div');
            el.className = 'hanzi-tree-tooltip';
            document.body.appendChild(el);
            hanziTree.tooltipEl = el;
        }
        hanziTree.tooltipEl.textContent = tip;
        hanziTree.tooltipEl.style.left = evt.clientX + 'px';
        hanziTree.tooltipEl.style.top = evt.clientY + 'px';
    }

    function destroyTreeTooltip() {
        if (hanziTree.tooltipEl && hanziTree.tooltipEl.parentElement) {
            hanziTree.tooltipEl.parentElement.removeChild(hanziTree.tooltipEl);
        }
        hanziTree.tooltipEl = null;
    }

    function handleTreeClick(item) {
        if (!item) return;
        const data = item[2] && item[2].data; if (!data) return;
        const text = data.text; if (!text) return;
        if (text.length === 1) {
            const navLookup = document.getElementById('nav-lookup');
            const characterDisplaySection = document.getElementById('character-display-section');
            switchMainFunction(navLookup, characterDisplaySection);
            const characterInput = document.getElementById('character-input');
            if (characterInput) { characterInput.value = text; hideCharacterSelector(); switchToCharacter(text, 'tree'); }
        } else {
            const navWordLookup = document.getElementById('nav-word-lookup');
            const wordLookupContainer = document.getElementById('word-lookup-container');
            switchMainFunction(navWordLookup, wordLookupContainer);
            const wordInput = document.getElementById('word-input');
            if (wordInput) { wordInput.value = text; fetchWordDefinition(text, 'tree'); }
        }
    }

    function requestHanziTreeRerender() {
        if (hanziTree.rerenderTimer) clearTimeout(hanziTree.rerenderTimer);
        hanziTree.rerenderTimer = setTimeout(() => {
            renderHanziTree(hanziTree.sidebar);
            if (hanziTree.modal.root && hanziTree.modal.root.style.display === 'flex') {
                renderHanziTree(hanziTree.modal);
            }
        }, 200);
    }

    if (hanziTree.modal.openBtn) {
        hanziTree.modal.openBtn.addEventListener('click', () => {
            if (hanziTree.modal.root) {
                hanziTree.modal.root.style.display = 'flex';
                requestHanziTreeRerender();
            }
        });
    }
    if (hanziTree.modal.closeBtn) {
        hanziTree.modal.closeBtn.addEventListener('click', () => {
            if (hanziTree.modal.root) {
                hanziTree.modal.root.style.display = 'none';
                destroyTreeTooltip();
            }
        });
    }

    // 初次渲染
    requestHanziTreeRerender();
}
