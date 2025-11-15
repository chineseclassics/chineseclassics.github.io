// 深色模式偵測
function initThemeDetection() {
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
}
initThemeDetection();

// 游戏状态管理类
class GameState {
    constructor() {
        this.currentScene = 'intro';
        this.currentChapter = 1;
        this.voices = {
            filialPiety: 30,    // 孝女之心
            masterTraining: 10, // 师门之训
            tenderness: 20,     // 柔情之意
            loyalty: 10,        // 忠义之念
            seekingDao: 15      // 山水求道
        };
        this.learnedWords = [];
        this.globalProgress = 5;
        this.chapterProgress = 10;
        this.relationships = {
            father: 50,
            husband: 0,
            liuChangyi: 0,
            weiShuai: 30,
            master: 0
        };
        this.unlockedEndings = [];
        this.achievements = [];
        this.gameHistory = [];
        this.age = 10;
        this.location = "聶家";
        this.specialFlags = {};
    }

    updateVoice(voiceName, change) {
        this.voices[voiceName] = Math.max(0, Math.min(100, this.voices[voiceName] + change));
        this.updateVoiceDisplay();
        this.checkVoiceReactions(voiceName, change);
        this.checkSpecialEvents();
    }

    updateVoiceDisplay() {
        Object.keys(this.voices).forEach(voiceName => {
            const voiceElement = document.querySelector(`[data-voice="${voiceName}"]`);
            if (voiceElement) {
                const level = Math.floor(this.voices[voiceName] / 10) + 1;
                const progress = this.voices[voiceName];

                voiceElement.querySelector('.level-number').textContent = level;
                voiceElement.querySelector('.progress-bar').style.width = `${progress}%`;

                // 更新引言
                const quotes = this.getVoiceQuotes(voiceName, level);
                voiceElement.querySelector('.voice-quote').textContent = quotes;

                // 高亮活跃的声音
                if (progress >= 60) {
                    voiceElement.classList.add('voice-active');
                } else {
                    voiceElement.classList.remove('voice-active');
                }
            }
        });
    }

    getVoiceQuotes(voiceName, level) {
        const quotes = {
            filialPiety: [
                "家人就是一切...",
                "父親養育之恩，豈可輕忘？",
                "家族榮耀高於個人...",
                "血濃於水的親情...",
                "聶氏門第不可墜落！",
                "為了家族，我願意犧牲一切",
                "家族的期望是我的使命",
                "祖先的靈魂在看著我",
                "家族復興在我一身",
                "血脈傳承永不斷絕"
            ],
            masterTraining: [
                "服從是唯一的選擇...",
                "師父的教導刻骨銘心",
                "紀律就是力量",
                "感情只會讓刀鋒遲鈍",
                "我是師父鍛造的武器",
                "冷酷是生存的必需",
                "殺戮是我存在的意義",
                "師門之訓不可違背",
                "我已經沒有回頭路",
                "血與死亡是我的宿命"
            ],
            tenderness: [
                "愛讓世界變得溫暖...",
                "若能有一處安穩的家...",
                "溫柔的力量也很強大",
                "愛可以化解一切仇恨",
                "想要保護所愛的人",
                "情感是人性的光輝",
                "愛情能戰勝一切困難",
                "溫暖的懷抱是最好的避風港",
                "為愛而生，為愛而死",
                "真愛可以超越生死"
            ],
            loyalty: [
                "忠義是我的信念...",
                "既受恩惠，當以命報之！",
                "君臣之義不可違",
                "忠誠是武者的靈魂",
                "為主君赴湯蹈火在所不辭",
                "義氣千秋，永不背叛",
                "忠臣不事二主",
                "義重如山，死而後已",
                "忠義之心昭日月",
                "生為忠臣，死為義鬼"
            ],
            seekingDao: [
                "山中有真意...",
                "山中有真意，但識者幾人？",
                "超脫世俗才是正道",
                "大道至簡，返璞歸真",
                "身在塵世，心向青天",
                "世間種種皆是虛妄",
                "唯有超脫才能得真自由",
                "天地有大美而不言",
                "道法自然，無為而治",
                "已到無我無相之境"
            ]
        };
        return quotes[voiceName][Math.min(level - 1, quotes[voiceName].length - 1)];
    }

    checkVoiceReactions(changedVoice, change) {
        // 只检查声音冲突
        this.checkVoiceConflicts();
    }

    checkVoiceConflicts() {
        const conflicts = [
            { voices: ['filialPiety', 'seekingDao'], threshold: 70 },
            { voices: ['masterTraining', 'tenderness'], threshold: 60 },
            { voices: ['loyalty', 'seekingDao'], threshold: 65 }
        ];

        conflicts.forEach(conflict => {
            const [voice1, voice2] = conflict.voices;
            if (this.voices[voice1] >= conflict.threshold && this.voices[voice2] >= conflict.threshold) {
                this.triggerVoiceConflict(voice1, voice2);
            }
        });
    }

    triggerVoiceConflict(voice1, voice2) {
        if (!this.specialFlags[`conflict_${voice1}_${voice2}`]) {
            this.specialFlags[`conflict_${voice1}_${voice2}`] = true;
            this.showSpecialEvent(`内心聲音衝突！${this.getVoiceName(voice1)}與${this.getVoiceName(voice2)}發生激烈爭執...`);
        }
    }

    getVoiceName(voiceName) {
        const names = {
            filialPiety: '孝女之心',
            masterTraining: '師門之訓',
            tenderness: '柔情之意',
            loyalty: '忠義之念',
            seekingDao: '山水求道'
        };
        return names[voiceName];
    }

    checkSpecialEvents() {
        // 检查师门突破
        if (this.voices.masterTraining >= 70 && this.voices.seekingDao >= 50 && !this.specialFlags.masterBreakthrough) {
            this.specialFlags.masterBreakthrough = true;
            this.showSpecialEvent('師門桎梏開始鬆動！內心的自由意志正在覺醒...');
            this.unlockAchievement('master_breakthrough', '師門突破', '開始質疑師父的絕對權威');
        }

        // 检查道悟境界
        if (this.voices.seekingDao >= 80 && !this.specialFlags.daoEnlightenment) {
            this.specialFlags.daoEnlightenment = true;
            this.showSpecialEvent('道悟境界提升！開始理解超脫世俗的真諦...');
            this.unlockAchievement('dao_enlightenment', '道悟初成', '達到較高的精神境界');
        }

        // 检查情感觉醒
        if (this.voices.tenderness >= 70 && this.voices.filialPiety >= 50 && !this.specialFlags.emotionalAwakening) {
            this.specialFlags.emotionalAwakening = true;
            this.showSpecialEvent('情感覺醒！家庭與愛情的美好讓心靈更加豐富...');
            this.unlockAchievement('emotional_awakening', '情感覺醒', '體驗到愛的多重面向');
        }
    }

    showSpecialEvent(text) {
        const eventDiv = document.getElementById('specialEvent');
        const eventText = document.getElementById('specialEventText');
        eventText.textContent = text;
        eventDiv.classList.remove('hidden');

        setTimeout(() => {
            eventDiv.classList.add('hidden');
        }, 5000);
    }

    unlockAchievement(id, name, description) {
        if (!this.achievements.find(a => a.id === id)) {
            this.achievements.push({ id, name, description, unlockedAt: new Date() });
            this.updateAchievementsDisplay();
            this.showAchievementNotification(name, description);
        }
    }

    showAchievementNotification(name, description) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification fixed top-4 right-4 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-start">
                <span class="text-2xl mr-3">🏆</span>
                <div>
                    <h4 class="font-bold">成就解鎖！</h4>
                    <p class="text-sm font-semibold">${name}</p>
                    <p class="text-xs opacity-90">${description}</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 4000);
    }

    updateAchievementsDisplay() {
        const container = document.getElementById('achievements');
        if (this.achievements.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-500 dark:text-gray-400">暫無解鎖成就</span>';
        } else {
            container.innerHTML = this.achievements.map(a => 
                `<div class="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded mb-1">
                    <span class="font-semibold">${a.name}</span>
                    <br><span class="text-xs opacity-75">${a.description}</span>
                </div>`
            ).join('');
        }
    }



    addLearnedWord(word, meaning) {
        if (!this.learnedWords.find(w => w.word === word)) {
            this.learnedWords.push({ word, meaning });
            this.updateLearnedWordsDisplay();

            // 词汇学习成就
            if (this.learnedWords.length >= 10) {
                this.unlockAchievement('word_collector', '詞彙收集家', '學會了10個文言文詞彙');
            }
            if (this.learnedWords.length >= 20) {
                this.unlockAchievement('word_master', '詞彙大師', '學會了20個文言文詞彙');
            }
        }
    }

    updateLearnedWordsDisplay() {
        const container = document.getElementById('learnedWords');
        if (this.learnedWords.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-500 dark:text-gray-400">暫無收集詞彙</span>';
        } else {
            container.innerHTML = this.learnedWords.map(w => 
                `<span class="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs mr-1 mb-1" title="${w.meaning}">${w.word}</span>`
            ).join('');
        }
    }

    updateProgress(chapterProgress, globalProgress = null) {
        this.chapterProgress = chapterProgress;
        if (globalProgress !== null) {
            this.globalProgress = globalProgress;
        }

        document.getElementById('chapterProgress').style.width = `${chapterProgress}%`;
        document.getElementById('progressText').textContent = `${chapterProgress}%`;
        document.getElementById('globalProgress').style.width = `${this.globalProgress}%`;
    }

    updateChapter(chapter, title) {
        this.currentChapter = chapter;
        document.getElementById('chapterIndicator').textContent = `第${chapter}章：${title}`;
    }

    unlockEnding(endingId, endingName, description) {
        if (!this.unlockedEndings.find(e => e.id === endingId)) {
            this.unlockedEndings.push({ 
                id: endingId, 
                name: endingName, 
                description: description,
                unlockedAt: new Date(),
                playthrough: this.gameHistory.length + 1
            });
            this.updateEndingsDisplay();

            // 结局解锁成就
            if (this.unlockedEndings.length >= 1) {
                this.unlockAchievement('first_ending', '初次體驗', '解鎖了第一個結局');
            }
            if (this.unlockedEndings.length >= 5) {
                this.unlockAchievement('ending_explorer', '結局探索者', '解鎖了5個不同結局');
            }
            if (this.unlockedEndings.length >= 10) {
                this.unlockAchievement('ending_collector', '結局收集家', '解鎖了10個不同結局');
            }
        }
    }

    updateEndingsDisplay() {
        const container = document.getElementById('endingsCollection');
        if (this.unlockedEndings.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-500 dark:text-gray-400">尚未達成任何結局</span>';
        } else {
            container.innerHTML = this.unlockedEndings.map(e => 
                `<div class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded mb-1">
                    <span class="font-semibold">${e.name}</span>
                    <br><span class="text-xs opacity-75">第${e.playthrough}周目達成</span>
                </div>`
            ).join('');
        }
    }

    saveGame() {
        const saveData = {
            gameState: this,
            timestamp: new Date(),
            version: '2.0'
        };
        localStorage.setItem('nieYinNiang_save', JSON.stringify(saveData));
        this.createFloatingMessage('💾 遊戲進度已保存');
    }

    loadGame() {
        try {
            const saveData = JSON.parse(localStorage.getItem('nieYinNiang_save'));
            if (saveData && saveData.gameState) {
                Object.assign(this, saveData.gameState);
                this.updateVoiceDisplay();
                this.updateLearnedWordsDisplay();
                this.updateAchievementsDisplay();
                this.updateEndingsDisplay();
                this.updateProgress(this.chapterProgress, this.globalProgress);
                this.updateChapter(this.currentChapter, this.getChapterTitle(this.currentChapter));
                this.createFloatingMessage('📁 遊戲進度已載入');
                return true;
            }
        } catch (error) {
            console.error('載入遊戲失敗:', error);
        }
        return false;
    }

    getChapterTitle(chapter) {
        const titles = {
            1: '初心之問',
            2: '師門塑造', 
            3: '親情回歸',
            4: '世俗枷鎖',
            5: '忠誠考驗',
            6: '護主決戰',
            7: '終極選擇'
        };
        return titles[chapter] || '未知章節';
    }
}

// 创建文言文词汇提示
function createWordTooltip(word, meaning) {
    return `<span class="word-tooltip">${word}<span class="tooltip-content">${meaning}</span></span>`;
}

// 故事场景定义（完整版）
const storyScenes = {
    // 第一章：初心之問 (10岁)
    intro: {
        title: "不速之客",
        chapter: 1,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第一章：初心之問 · 唐貞元年間 · 魏博大將府 · 你十歲
                </div>
            </div>

            <p class="text-lg leading-relaxed mb-4">
                你是魏博大將聶鋒之女，年方十歲。貞元的日光，正暖暖地照在府邸的庭院。
            </p>

            <p class="leading-relaxed mb-4">
                午後，你在院中臨帖，筆尖墨香與滿架薔薇的芬芳交织。忽聞門外傳來一聲${createWordTooltip('叱', '大聲呵斥')}，打破了這份寧靜。你好奇地放下筆，悄悄移步至門邊。
            </p>

            <p class="leading-relaxed mb-4">
                一位青衣尼姑立於門前，氣度沉靜，正與你的父親說話。她的目光轉向你，眼中竟露出一絲${createWordTooltip('悅', '喜歡')}色，語氣平緩卻不容置疑：「這女孩天資清奇，若隨我修行，他日成就不可限量。」
            </p>

            <div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 my-4">
                <p class="text-sm italic">💡 一個尋常午後，因一位不速之客而不再尋常。你的命運，正悄然立於岔路口。</p>
            </div>
        `,
        choices: [
            {
                text: "📚 屏息凝神，想聽得更真切些",
                description: "（她們在說什麼？和我有關嗎？）",
                effects: { seekingDao: 5, tenderness: 5 },
                learnedWords: [{ word: '悅', meaning: '喜歡' }],
                nextScene: 'curiosity'
            },
            {
                text: "🏠 躲到父親寬闊的背後",
                description: "（陌生人的眼神讓我不安，父親身邊最是安穩）",
                effects: { filialPiety: 10, tenderness: 5 },
                learnedWords: [{ word: '悅', meaning: '喜歡' }, { word: '叱', meaning: '大聲呵斥' }],
                nextScene: 'hideByFather'
            },
            {
                text: "😤 坦然走出，面對未知的目光",
                description: "（既然與我有關，我便應當在場）",
                effects: { seekingDao: 10, loyalty: 5 },
                learnedWords: [{ word: '悅', meaning: '喜歡' }],
                nextScene: 'braveFace'
            }
        ]
    },

    curiosity: {
        title: "偷聽的小女孩",
        chapter: 1,
        content: `
            <p class="leading-relaxed mb-4">
                你躲在門後，豎起耳朵仔細聽著。只聽父親聶鋒${createWordTooltip('叱', '大聲呵斥')}道：「我女兒年幼，不需要什麼教導！你這尼姑莫要胡言亂語！」
            </p>

            <p class="leading-relaxed mb-4">
                尼姑卻不以為然，淡淡一笑：「押衙莫要${createWordTooltip('驚駭', '吃驚害怕')}，老尼只見此孩有慧根，欲加點化。即便押衙鎖於鐵櫃，老尼亦能帶去。」
            </p>

            <p class="leading-relaxed mb-6">
                你聽得心中五味雜陳，既為父親的保護感到溫暖，又對尼姑口中的「教導」充滿好奇...
            </p>

            <div class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"這個尼姑說話好奇怪...什麼叫'有慧根'？外面的世界真的那麼神奇嗎？"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "🤔 思考尼姑話中的深意",
                description: "（什麼是慧根？為什麼她說我不一樣？）",
                effects: { seekingDao: 15, filialPiety: -5 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'deepThinking'
            },
            {
                text: "😨 為父親的安全擔心",
                description: "（這個人說話好可怕，我要保護父親）",
                effects: { filialPiety: 15, tenderness: 10 },
                learnedWords: [{ word: '叱', meaning: '大聲呵斥' }, { word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'worryForFather'
            }
        ]
    },

    hideByFather: {
        title: "父親的保護",
        chapter: 1,
        content: `
            <p class="leading-relaxed mb-4">
                你怯怯地躲到父親身後，小手緊緊抓住父親的衣袍。聶鋒感受到你的恐懼，更加${createWordTooltip('叱', '大聲呵斥')}道：「你這妖尼，休要嚇唬我的女兒！」
            </p>

            <p class="leading-relaxed mb-6">
                你在父親的懷抱中感到無比安全，但心中也隱約感到，這個尼姑似乎並不簡單...
            </p>

            <div class="bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">💝 孝女之心:</span> 
                    <em>"父親這麼保護我，我一定要做個好女兒，不讓他擔心。"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "🤗 緊緊抱住父親",
                description: "（父親是我在這個世界上最重要的人）",
                effects: { filialPiety: 20, tenderness: 10 },
                learnedWords: [{ word: '叱', meaning: '大聲呵斥' }],
                nextScene: 'finalChoice'
            },
            {
                text: "👀 偷偷觀察尼姑",
                description: "（雖然害怕，但還是想看看她到底是什麼人）",
                effects: { filialPiety: 10, seekingDao: 10 },
                learnedWords: [{ word: '悅', meaning: '喜歡' }],
                nextScene: 'finalChoice'
            }
        ]
    },

    braveFace: {
        title: "勇敢的你",
        chapter: 1,
        content: `
            <p class="leading-relaxed mb-4">
                你深吸一口氣，從門後走了出來，直視著尼姑的眼睛。雖然只有十歲，但你的目光中已帶著一絲不同尋常的堅定。
            </p>

            <p class="leading-relaxed mb-6">
                尼姑微笑道：「小娃娃，你想不想學到真正的本領？想不想看看這個世界的真相？」
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"我不知道為什麼，但我覺得不應該讓別人替我做決定。"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "🗣️ 直接問尼姑的目的",
                description: "（我要知道您到底想教我什麼）",
                effects: { seekingDao: 20, loyalty: -5 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'finalChoice'
            },
            {
                text: "👨 先看父親的反應",
                description: "（雖然我很好奇，但父親的想法也很重要）",
                effects: { filialPiety: 10, seekingDao: 10 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'finalChoice'
            }
        ]
    },

    deepThinking: {
        title: "慧根的困惑",
        chapter: 1,
        content: `
            <p class="leading-relaxed mb-4">
                你陷入了深深的思考。「慧根」二字如種入心，於幼小的心靈中悄然生根。
            </p>

            <p class="leading-relaxed mb-6">
                正此時，父親發現了你的${createWordTooltip('影響', '身影與聲響')}...
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"也許...也許我真的和其他孩子不一樣？"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "🏃 立刻跑到父親身邊",
                description: "（我不能讓父親擔心）",
                effects: { filialPiety: 15 },
                learnedWords: [{ word: '影響', meaning: '身影與聲響' }],
                nextScene: 'finalChoice'
            },
            {
                text: "🤫 繼續躲著思考",
                description: "（我需要更多時間想清楚）",
                effects: { seekingDao: 10, filialPiety: -5 },
                learnedWords: [{ word: '影響', meaning: '身影與聲響' }],
                nextScene: 'finalChoice'
            }
        ]
    },

    worryForFather: {
        title: "保護父親的決心",
        chapter: 1,
        content: `
            <p class="leading-relaxed mb-4">
                看到父親因保護你而與尼姑爭執，你心中忽起護父之念，決意不再躲於暗處。
            </p>

            <p class="leading-relaxed mb-6">
                你走了出來，站在父親身邊，小小的身軀挺得筆直...
            </p>

            <div class="bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">💝 孝女之心:</span> 
                    <em>"父親為了我這麼辛苦，我不能再讓他為難了。"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "💪 站在父親面前保護他",
                description: "（雖然我很小，但我要保護父親）",
                effects: { filialPiety: 25, loyalty: 10 },
                nextScene: 'finalChoice'
            },
            {
                text: "🙏 請求尼姑不要為難父親",
                description: "（也許好好說話可以解決問題）",
                effects: { filialPiety: 15, tenderness: 15 },
                nextScene: 'finalChoice'
            }
        ]
    },

    finalChoice: {
        title: "命運的岔路",
        chapter: 1,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-red-500 text-white px-4 py-2 rounded-full text-sm mb-4">
                    抉擇之刻
                </div>
            </div>

            <p class="leading-relaxed mb-4">
                紛亂之際，尼姑的目光越過你的父親，徑直落在你身上，聲音清冷如玉石相擊：「女孩，塵世的富貴與安穩，或山巔的孤寂與真相，你選哪一條路？」
            </p>

            <p class="leading-relaxed mb-4">
                父親${createWordTooltip('驚駭', '吃驚害怕')}道：「我女兒尚幼，豈容你在此蠱惑！」尼姑卻只看著你，淡然道：「路，終究要自己選。」
            </p>

            <div class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 你心底的聲音，此刻響成一片：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>「父親的懷抱如此溫暖，我怎能捨得離開？」</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>「可『真相』究竟是什麼？山的後面，又是怎樣的世界？」</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>「若我離去，父親會多麼心碎……」</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6 font-semibold text-lg">
                你的回答，將畫下你人生的第一筆，深遠，且再難塗改。
            </p>
        `,
        choices: [
            {
                text: "🏠 「我要留下，陪著父親」",
                description: "（世間萬般，不及此刻的溫暖與安穩）",
                effects: { filialPiety: 30, tenderness: 15, seekingDao: -20 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'chapter1_stayHome'
            },
            {
                text: "🌟 「我……想去看一看」",
                description: "（心中有個聲音告诉我，我属于更远的地方）",
                effects: { seekingDao: 35, filialPiety: -15, masterTraining: 20 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'chapter2_start'
            },
            {
                text: "🤝 「請給我……一些時間」",
                description: "（如此重大的決定，我不能立刻回答）",
                effects: { seekingDao: 10, filialPiety: 10, tenderness: 10 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'chapter1_postpone'
            }
        ]
    },

    // 第一章结局
    chapter1_stayHome: {
        title: "庭院深深",
        chapter: 1,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第一章 · 終
                </div>
            </div>

            <p class="leading-relaxed mb-4">
                你最終還是選擇了留下。尼姑深深地看了你一眼，沒有再說什麼，轉身離去，青色的身影消失在巷口的日光裡。
            </p>

            <p class="leading-relaxed mb-4">
                父親將你緊緊摟在懷中，手掌溫厚而有力。庭院重歸寧靜，彷彿什麼也未曾發生。往後的歲月，你身處錦繡，備受寵愛，依循著世家女子的軌跡成長。
            </p>

            <p class="leading-relaxed mb-6">
                你的童年將在安穩中度過，但那扇通往未知的門，真的就此關上了嗎？
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道 (潛藏):</span> 
                    <em>然而，在無數個獨自一人的午後，當你看向遠山，總會不經意地想起那個尼姑，想起她口中的「另一個世界」。心中的那顆種子，並未枯萎，只是沉睡。</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "⏳ 五年後...",
                description: "",
                nextScene: 'chapter2_alternative'
            }
        ]
    },

    chapter1_postpone: {
        title: "片刻的寧靜",
        chapter: 1,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第一章 · 待續
                </div>
            </div>

            <p class="leading-relaxed mb-4">
                面對如此重大的抉擇，你出人意料地保持了鎮靜。「請給我一些時間，」你說，聲音不大，但很清晰。
            </p>

            <p class="leading-relaxed mb-4">
                尼姑的眼中閃過一絲讚許。「也好。智慧不僅在於選擇，更在於懂得何時選擇。」她對你父親說：「一個月後，我會再來。到那時，希望你們已有了答案。」說罷，她轉身飄然而去。
            </p>

            <p class="leading-relaxed mb-6">
                你获得了一个月的宝贵时间来思考你的未来。这一个月，将决定你一生的走向。
            </p>
        `,
        choices: [
            {
                text: "⏳ 一個月後...",
                description: "",
                nextScene: 'chapter2_thinking'
            }
        ]
    },

    // 第二章開始（選擇跟隨尼姑）
    chapter2_start: {
        title: "石穴初探",
        chapter: 2,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第二章：師門 · 深山石穴 · 十歲至十五歲
                </div>
            </div>

            <p class="leading-relaxed mb-4">
                你選擇了未知。那夜，你消失得悄無聲息，如一滴水融入大海。父親聶鋒${createWordTooltip('涕泣', '哭')}不止，四處尋覓，卻只換來空寂的回音。
            </p>

            <blockquote class="quote-text">
                你初被尼姑${createWordTooltip('挈', '帶著')}而行，不知幾里。及明，至大石穴之嵌空數十步，寂無居人，猿狖極多，松蘿益邃。已有二女，亦各十歲。皆聰明婉麗，不食，能於峭壁上飛走，若捷猱登${createWordTooltip('木', '樹')}，無有蹶失。
            </blockquote>

            <div class="bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">⚡ 師門之訓:</span> 
                    <em>"從今日起，忘掉你的名字，忘掉你的過去。你只是一塊璞玉，等待我的雕琢。"</em>
                </p>
            </div>

            <blockquote class="quote-text">
                尼姑給你一粒藥，兼令長執寶劍一口，長二尺${createWordTooltip('許', '大約')}，鋒利吹毛，令專逐二女${createWordTooltip('攀緣', '拉著向上爬')}...
            </blockquote>
        `,
        choices: [
            {
                text: "😨 恐懼與思念如潮水湧來",
                description: "（這裏陰冷而陌生，我想念父親的懷抱）",
                effects: { filialPiety: 10, tenderness: 15, masterTraining: -5 },
                learnedWords: [{ word: '涕泣', meaning: '哭' }, { word: '挈', meaning: '帶著' }],
                nextScene: 'chapter2_homesick'
            },
            {
                text: "🗡️ 收斂心神，努力適應",
                description: "（既已選擇，便不應退縮，唯有向前）",
                effects: { masterTraining: 15, loyalty: 5, filialPiety: -5 },
                learnedWords: [{ word: '木', 'meaning': '樹' }, { word: '許', meaning: '大約' }],
                nextScene: 'chapter2_adapt'
            },
            {
                text: "🤔 靜默觀察，尋求答案",
                description: "（師父、師姐、這石穴……一切皆是謎，我需看清）",
                effects: { seekingDao: 20, masterTraining: 5 },
                learnedWords: [{ word: '攀緣', meaning: '拉著向上爬' }],
                nextScene: 'chapter2_observe'
            }
        ]
    },

    chapter2_alternative: {
        title: "庭院中的修行",
        chapter: 2,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第二章：家中歲月 · 聶府 · 十歲至十五歲
                </div>
            </div>

            <p class="leading-relaxed mb-4">
                五年時光，如庭院中的花開花落，悄然逝去。你已是十五歲的少女，身姿亭亭，眉目間卻比同齡人多了一份沉靜。
            </p>

            <p class="leading-relaxed mb-4">
                安穩的日子未能撫平你內心的波瀾。每當夜深人靜，你總會想起那位青衣尼姑，和她口中那個未知的、更廣闊的世界。
            </p>

            <p class="leading-relaxed mb-6">
                一日，府中來客，談及江湖奇聞、俠客義行，你在一旁靜聽，心中的種子似乎在悄然發芽。
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"留在這裡，我守護了親情，但我是不是……也辜負了另一種可能的自己？"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "💭 追悔當日的選擇",
                description: "（若當時踏出那一步，如今的我會身在何方？）",
                effects: { seekingDao: 15, filialPiety: -10 },
                nextScene: 'chapter2_regret'
            },
            {
                text: "🏠 更加珍視眼前的溫暖",
                description: "（江湖雖遠，不及家中一盞燈火）",
                effects: { filialPiety: 20, tenderness: 15 },
                nextScene: 'chapter2_family_focused'
            },
            {
                text: "📚 於庭院中，開始自己的修行",
                description: "（身雖在此，心可馳騁千里。道，不一定只在山野）",
                effects: { seekingDao: 10, loyalty: 10 },
                nextScene: 'chapter2_self_study'
            }
        ]
    },

    chapter2_thinking: {
        title: "抉擇之思",
        chapter: 2,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第二章：抉擇之思 · 聶府 · 一個月的猶豫
                </div>
            </div>

            <p class="leading-relaxed mb-4">
                尼姑留下了一個為期一月的約定。這段時日，你白日承歡膝下，夜晚則獨坐窗前，看月升月落，反覆叩問己心。
            </p>

            <p class="leading-relaxed mb-4">
                父親的憂慮，是你眼中的不捨；家僕的談笑，是你耳邊的安穩；而窗外的風聲，卻又像是遠方的呼喚。去與留，在你心中反覆交戰。
            </p>

            <p class="leading-relaxed mb-6">
                一月期滿，尼姑如約而至。你已有了答案。
            </p>

            <div class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"哪一個，才是我真正的人生？是成為父親的驕傲，還是成為我自己？"</em>
                </p>
            </div>
        `,
        choices: [
            {
                text: "🏠 「我決定留下，但希望學習一些本領」",
                description: "（我要保護家人，但也要有保護他們的能力）",
                effects: { filialPiety: 15, loyalty: 15, masterTraining: 10 },
                nextScene: 'chapter2_compromise'
            },
            {
                text: "🌟 「我決定跟您走，但希望能經常回家看看」",
                description: "（我要學習，但不想完全斷絕親情）",
                effects: { seekingDao: 20, masterTraining: 15, filialPiety: 5 },
                nextScene: 'chapter2_conditional'
            },
            {
                text: "⚖️ 「我還是不知道該怎麼選擇」",
                description: "（這個選擇真的太難了）",
                effects: { seekingDao: 5, filialPiety: 5, tenderness: 10 },
                nextScene: 'chapter2_still_confused'
            }
        ]
    },

    // 第二章的訓練場景
    chapter2_homesick: {
        title: "思念是唯一的行李",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                這座石穴，如同一座沒有溫度的巢。夜深之際，思念便化作無形的藤蔓，將你緊緊缠绕。你想念父親寬厚的手掌，想念家中飯菜的香氣。
            </p>

            <p class="leading-relaxed mb-4">
                師父看穿了你的軟弱，聲音沒有一絲波澜：「既入此門，便當斬斷塵緣。你的家，只在此處。」
            </p>

            <div class="bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">💝 孝女之心:</span> 
                    <em>"父親現在一定很擔心我...我是不是做錯了？"</em>
                </p>
                <p class="text-sm mt-2">
                    <span class="font-semibold">⚡ 師門之訓:</span> 
                    <em>"過去的一切都是弱點，必須斬斷這些情感的枷鎖。"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                儘管內心痛苦，你仍開始艱苦訓練；但思鄉之情使你難以專心，常在練習中失手...
            </p>
        `,
        choices: [
            {
                text: "😢 暗中哭泣，但繼續堅持訓練",
                description: "（再痛苦也要堅持下去）",
                effects: { filialPiety: 10, masterTraining: 10, tenderness: 5 },
                nextScene: 'chapter2_training1'
            },
            {
                text: "💪 努力壓抑思鄉之情，專心學習",
                description: "（不能讓師父失望，我要變強）",
                effects: { masterTraining: 20, filialPiety: -10 },
                nextScene: 'chapter2_training1'
            },
            {
                text: "🙏 請求師父允許自己給家裡寫信",
                description: "（至少讓父親知道我還活著）",
                effects: { filialPiety: 15, masterTraining: -5 },
                nextScene: 'chapter2_write_letter'
            }
        ]
    },

    chapter2_adapt: {
        title: "沉寂的學徒",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你將思念深藏心底，如石沉大海，不再泛起波瀾。你沉默地觀察、模仿、超越。你的汗水，是這石穴中唯一的言語。
            </p>

            <blockquote class="quote-text">
                你漸覺身輕如風。一年後，刺猿狖百無一失；後刺虎豹，皆${createWordTooltip('決', '斷')}其首而歸。三年後能飛，使刺鷹隼，無不${createWordTooltip('中', '命中')}。
            </blockquote>

            <div class="bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">⚡ 師門之訓:</span> 
                    <em>"很好。你正在變成我想要的樣子。記住，服從與專注，便是你的力量。"</em>
                </p>
            </div>

            <blockquote class="quote-text">
                劍之刃漸減五寸，飛禽遇之，不知其來也。
            </blockquote>
            <p class="leading-relaxed mb-6">
                你的技藝日益精進，心卻彷彿也隨之變得鋒利而冰冷。
            </p>
        `,
        choices: [
            {
                text: "😊 為技藝的精進感到一絲滿足",
                description: "（我正在變強，這便是我選擇的路）",
                effects: { masterTraining: 20, loyalty: 10 },
                learnedWords: [{ word: '決', meaning: '斷' }, { word: '中', meaning: '命中' }],
                nextScene: 'chapter2_first_mission'
            },
            {
                text: "🤔 思考殺戮的本質",
                description: "（為何要殺這些生靈？這份力量，究竟應用於何處？）",
                effects: { seekingDao: 15, masterTraining: 5 },
                learnedWords: [{ word: '決', meaning: '斷' }],
                nextScene: 'chapter2_moral_doubt'
            },
            {
                text: "😰 對生命的逝去感到不安",
                description: "（每一次出手，都讓我覺得心頭一緊，但我必須克服）",
                effects: { tenderness: 10, masterTraining: 10 },
                learnedWords: [{ word: '中', meaning: '命中' }],
                nextScene: 'chapter2_reluctant_killer'
            }
        ]
    },

    chapter2_observe: {
        title: "沉默的觀察",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                訓練之餘，你總是在觀察。你發現兩位師姐技藝雖高，眼神卻是空洞的，像是精緻的人偶，只會執行命令。
            </p>

            <p class="leading-relaxed mb-4">
                師父對她們的控制，細緻到每一次呼吸。你忽然明白，師父想要的，不是傳人，而是完美的工具。這讓你感到一絲不寒而慄。
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"若強大意味著失去自我，那這份強大，還是我想要的嗎？"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                你的沉思，引來了師父的注意。她的聲音在你身後響起，冰冷如鐵：「觀察可以，但不要思考。服從，是你唯一需要學會的。」
            </p>
        `,
        choices: [
            {
                text: "😔 表面服從，內心保持思考",
                description: "（我要假裝順從，但不能停止思考）",
                effects: { seekingDao: 20, masterTraining: 5 },
                nextScene: 'chapter2_hidden_thoughts'
            },
            {
                text: "🤝 嘗試與師姐們私下交流",
                description: "（也許可以了解她們的真實想法）",
                effects: { tenderness: 15, seekingDao: 10 },
                nextScene: 'chapter2_connect_sisters'
            },
            {
                text: "😨 被師父的威嚴震懾，開始服從",
                description: "（師父好可怕，我還是乖乖聽話吧）",
                effects: { masterTraining: 15, seekingDao: -5 },
                nextScene: 'chapter2_surrender_to_master'
            }
        ]
    },

    // 第二章補充：隱匿思緒（承接「觀察者的視角」分支）
    chapter2_hidden_thoughts: {
        title: "隱匿思緒",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你表面恪守規訓，內心卻若水潛流，不露痕跡。你於深夜獨坐石壁旁，默背師訓，又暗自思量：<span class="italic">"術可成於勁，心未可囚於格。"</span>
            </p>
            <p class="leading-relaxed mb-4">
                你記起初至石穴，師父以藥一粒，令長執劍，追兩師姐於峭壁<span>${createWordTooltip('攀緣','拉著向上爬')}</span>之時；身輕如風，心卻沉如石。此刻，你在心底悄悄安置一處自留之地，不使旁人得見。
            </p>
            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">🌊 山水求道:</span> <em>"術為器，心為主。主若迷，器雖利，亦不知所向。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🗡️ 暗自磨劍，備不測之需",
                description: "（術不可荒，心不可弛）",
                effects: { masterTraining: 10, seekingDao: 10 },
                nextScene: 'chapter2_first_mission'
            },
            {
                text: "📜 暗記行藏，留退路一線",
                description: "（凡事不可盡，須存自全之道）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter2_moral_doubt'
            }
        ]
    },

    // 第二章補充：與師姐私語（承接「觀察者的視角」分支）
    chapter2_connect_sisters: {
        title: "石縫私語",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你於汲水之際，低聲問二師姐往事。師姐淡然道：「初來亦如汝，後來便無所思。」言至此處，眼波竟有微顫，如風掠秋水，紋理難平。
            </p>
            <p class="leading-relaxed mb-4">
                一師姐笑而不語，忽於石壁上輕躍三步，又回眸道：「心若起波，足便亂。師父最忌此。」
            </p>
            <div class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">💕 柔情之意:</span> <em>"原來她們也曾是會笑、會怕的人。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🤝 與師姐結一暗號，互通心跡",
                description: "（人心相印，方可不失本真）",
                effects: { tenderness: 15, seekingDao: 10 },
                nextScene: 'chapter2_hidden_resistance'
            },
            {
                text: "😶 收斂情思，免為人覺",
                description: "（此地多目，言多必失）",
                effects: { masterTraining: 10 },
                nextScene: 'chapter2_first_mission'
            }
        ]
    },

    // 第二章補充：向師命折腰（承接「觀察者的視角」分支）
    chapter2_surrender_to_master: {
        title: "命下如山",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                師父立於陰影，目光寒如刃：「觀不可多，思不可繁。汝之心，當如止水。」
            </p>
            <p class="leading-relaxed mb-4">
                你俯首而應，聲息極輕。你知此時逆轉無益，且先藏鋒斂息，待有可乘之隙。
            </p>
            <div class="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 border-l-4 border-gray-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 內心聲音的交鋒：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"手中之刃，勝於心中之念。服從是生存的唯一法則。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"表面順從，內心仍可保持自我。總有一天，我會找到真正的出路。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🗡️ 謹遵教令，加緊操練",
                description: "（先求不敗，再求不失）",
                effects: { masterTraining: 20, seekingDao: -5 },
                nextScene: 'chapter2_training1'
            },
            {
                text: "🕊️ 以退為進，養晦待時",
                description: "（退一步，天地或開）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter2_moral_doubt'
            }
        ]
    },

    // 第二章的關鍵任務 - 首次殺人
    chapter2_first_mission: {
        title: "染血的匕首",
        chapter: 2,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-red-500 text-white px-4 py-2 rounded-full text-sm mb-4">
                    試煉
                </div>
            </div>

            <blockquote class="quote-text">
                至四年，留二女守穴，${createWordTooltip('挈', '帶著')}我於${createWordTooltip('都市', '城市市場')}，不知何處也。指其人者，一一數其${createWordTooltip('過', '過錯')}，曰：『為我刺其首來，無使知覺。定其膽，若飛鳥之容易也。』
            </blockquote>

            <p class="leading-relaxed mb-4">
                師父交給你一把羊角匕首，刃寬三寸，寒光凜冽。這是你的第一次試煉，目標是一位罪大惡極的貪官。然而，當你潛伏在暗處，看到的只是一個正在燈下讀信、面容疲憊的中年人。
            </p>

            <div class="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-l-4 border-red-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 內心聲音激烈衝突：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"這就是你存在的意義。執行任務，不要猶豫。"</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"他也是有家人的人...我真的要這樣做嗎？"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"殺戮真的是正義嗎？還是只是師父的工具？"</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6">
                你潛入目標的房間，匕首已舉。這一刻的選擇，將決定你未來的道路...
            </p>
        `,
        choices: [
            {
                text: "⚔️ 冷酷地完成任務",
                description: "（師父是對的，我必須成為完美的武器）",
                effects: { masterTraining: 30, tenderness: -15, seekingDao: -10 },
                learnedWords: [{ word: '挈', meaning: '帶著' }, { word: '都市', meaning: '城市市場' }, { word: '過', meaning: '過錯' }],
                nextScene: 'chapter2_cold_killer'
            },
            {
                text: "💭 調查目標的罪行後再決定",
                description: "（我要確認他真的罪有應得）",
                effects: { seekingDao: 20, masterTraining: 5 },
                learnedWords: [{ word: '過', meaning: '過錯' }],
                nextScene: 'chapter2_investigate'
            },
            {
                text: "😰 猶豫不決，遲遲不下手",
                description: "（我做不到...即使他是壞人）",
                effects: { tenderness: 20, masterTraining: -10 },
                learnedWords: [{ word: '都市', meaning: '城市市場' }],
                nextScene: 'chapter2_hesitate'
            }
        ]
    },

    // 第二章補充：訓練之苦（承接「思鄉」「師命」分支）
    chapter2_training1: {
        title: "石穴寒訓",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                黎明之前，石穴露寒。你負石登壁，攀援如猱，步步皆驚。掌心磨作薄繭，劍鋒映出微光，冷入骨髓。
            </p>
            <p class="leading-relaxed mb-4">
                師父立於上，聲若鐵：「身可疲，意不可墮。見<span>${createWordTooltip('都市','城市市場')}</span>中萬象，心不動，手乃準。」
            </p>
            <div class="bg-gradient-to-r from-gray-50 to-pink-50 dark:from-gray-700 dark:to-pink-900/20 border-l-4 border-gray-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 苦痛中的內心掙扎：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"刃之所至，不假人情。痛苦是成長的代價，堅持下去。"</em></p>
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>"父親知道我在這裡承受這樣的痛苦，會心疼吧..."</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"這樣的訓練真的能讓我變得更強嗎？還是只是在磨滅我的人性？"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🗡️ 將苦當磨，專志於術",
                description: "（技至純熟，心自沉著）",
                effects: { masterTraining: 20 },
                nextScene: 'chapter2_first_mission'
            },
            {
                text: "💭 苦中問道，省察殺與不殺",
                description: "（術精之外，尚有是非）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter2_moral_doubt'
            }
        ]
    },

    // 第二章補充：書信家聲（承接「請允寫信」分支）
    chapter2_write_letter: {
        title: "尺素家聲",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你以燈花細火，展紙成幅。寫至「父親近安」，筆忽一顫，墨暈如淚。你又自刪其詞，唯留「女在山中，勿念」。
            </p>
            <p class="leading-relaxed mb-4">
                書既畢，復自焚其副本。你知此信未必可達，但一聲心語，已寄風中。
            </p>
            <div class="bg-gradient-to-r from-pink-50 to-gray-50 dark:from-pink-900/20 dark:to-gray-700 border-l-4 border-pink-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 思親之痛與現實掙扎：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>"寸心如線，牽繫不斷。父親，女兒想您了..."</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"這樣的軟弱會被師父發現的，我不能暴露自己的情感。"</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"至少讓父親知道我還活著，這是我能給他的唯一安慰。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🕯️ 收好殘字碎墨，封於小囊",
                description: "（不願旁人見我柔處）",
                effects: { filialPiety: 10, tenderness: 10 },
                nextScene: 'chapter2_training1'
            },
            {
                text: "🗡️ 以苦為砺，回到操練",
                description: "（情不礙志）",
                effects: { masterTraining: 10 },
                nextScene: 'chapter2_first_mission'
            }
        ]
    },

    // 第二章補充：道義之辨（承接「努力適應」「隱匿思緒」分支）
    chapter2_moral_doubt: {
        title: "道義之辨",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你於林間練息，觀飛禽搏風，念及昔年「刺猿狖百無一失」，忽覺胸中有微隙：
                <span class="italic">"百中之勇易，百忍之仁難。"</span>
            </p>
            <p class="leading-relaxed mb-4">
                你試以己心比他心，問若所斬者非徒惡名，亦有親稚。念至於此，腕上微頓，刃光亦淡。
            </p>
            <div class="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/20 dark:to-gray-700 border-l-4 border-blue-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 道德與職責的天人交戰：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"殺與不殺，其間一念，當問於道。每個生命都有其存在的意義。"</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"師父的命令就是一切，不要被無謂的同情心影響判斷。"</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"如果他們也有家人...我真的能狠下心來嗎？"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🕵️ 先審其人，再論其罪",
                description: "（是非不可以耳目一偏）",
                effects: { seekingDao: 20 },
                nextScene: 'chapter2_first_mission'
            },
            {
                text: "⚖️ 固守底線，寧遲不濫",
                description: "（刀快，心更須穩）",
                effects: { tenderness: 10, seekingDao: 10 },
                nextScene: 'chapter2_hesitate'
            }
        ]
    },

    // 第二章補充：刀下難落（承接「努力適應」分支）
    chapter2_reluctant_killer: {
        title: "刀下難落",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你試於木樁演刺，刀至樁前，忽作三分遲疑。你記起城中一父與子嬉笑之景，耳畔仍嗣響孩童笑語。
            </p>
            <p class="leading-relaxed mb-4">
                師父遠立不語，唯目光如霜。你自知此念不容久留，遂閉氣三息，刀意復直。
            </p>
            <div class="bg-gradient-to-r from-purple-50 to-gray-50 dark:from-purple-900/20 dark:to-gray-700 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 人性與冷酷的拉鋸：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"原來，我仍是人。這些溫暖的記憶證明我沒有完全變成工具。"</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"這種軟弱必須克服，殺手不能有感情。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"也許保持人性才是真正的力量，而不是變成無情的機器。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "😔 接納遲疑，學與之共處",
                description: "（不必裝作無情）",
                effects: { tenderness: 15 },
                nextScene: 'chapter2_hesitate'
            },
            {
                text: "🗡️ 反覆練心，求一擊必中",
                description: "（技進一分，心煩退一分）",
                effects: { masterTraining: 15 },
                nextScene: 'chapter2_first_mission'
            }
        ]
    },

    // 第二章補充：悔念如潮（承接「家中歲月」分支）
    chapter2_regret: {
        title: "悔念如潮",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                夜雨入簷，燈影顫動。你獨坐，念及當日一念之差，心潮翻覆。你望向門外，似見青衣尼之背影隱於雨幕。
            </p>
            <p class="leading-relaxed mb-4">
                你握拳復鬆，低語自問：<span class="italic">"是我錯過了，還是我守住了？"</span>
            </p>
        `,
        choices: [
            {
                text: "📚 自設課程，補己之欠",
                description: "（人可自成一學）",
                effects: { seekingDao: 10, loyalty: 5 },
                nextScene: 'chapter2_self_study'
            },
            {
                text: "🏠 收斂外心，安於家內",
                description: "（先讓父親心安）",
                effects: { filialPiety: 15, tenderness: 10 },
                nextScene: 'chapter2_family_focused'
            }
        ]
    },

    // 第二章補充：家務有常（承接「家中歲月」分支）
    chapter2_family_focused: {
        title: "家務有常",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                清晨掃庭，暮鼓理帳。日月相環，家事井然。你心緒漸寧，卻每於靜夜忽聞松風，似是群山相召。
            </p>
            <div class="bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">💝 孝女之心:</span> <em>"親在，心有所繫。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🌿 留意世事，伺機再學",
                description: "（不失於一端）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter2_self_study'
            },
            {
                text: "🧭 立志他日，再行遠路",
                description: "（時機未至，志不可失）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter3_return_home'
            }
        ]
    },

    // 第二章補充：自課武藝（承接「家中歲月」「悔念」分支）
    chapter2_self_study: {
        title: "自課武藝",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你自置木樁，繩系沙囊，晨昏各練。你以<span>${createWordTooltip('度','穿過')}</span>門影察步伐之快，以蠟滴之聲聽呼吸之勻。月色如洗，庭中劍影如水。
            </p>
            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">🌊 山水求道:</span> <em>"師在心中，萬物皆可為友。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🗡️ 自成一格，練至小成",
                description: "（他日或可一試身手）",
                effects: { seekingDao: 10, masterTraining: 5 },
                nextScene: 'chapter3_return_home'
            },
            {
                text: "📖 旁搜典籍，融會古今",
                description: "（手與心並進）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter3_return_home'
            }
        ]
    },

    // 第二章補充：兩相權衡（承接「三天的深思」分支）
    chapter2_compromise: {
        title: "兩相權衡",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你向師父言明：願學而不絕親情。師父冷笑：「情可用，不可信。」你不辯，只於心下自記其語。
            </p>
        `,
        choices: [
            {
                text: "🗡️ 先學為要，後圖自全",
                description: "（權其輕重）",
                effects: { masterTraining: 10, seekingDao: 5 },
                nextScene: 'chapter2_training1'
            },
            {
                text: "🏞️ 逢機外出，寄信平安",
                description: "（心有所安）",
                effects: { filialPiety: 10 },
                nextScene: 'chapter2_write_letter'
            }
        ]
    },

    // 第二章補充：從權之約（承接「三天的深思」分支）
    chapter2_conditional: {
        title: "從權之約",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                師父道：「隨我則不可縱心。」你答：「不縱，非無心也。」師父微蹙眉，終不復言。
            </p>
        `,
        choices: [
            {
                text: "🪶 觀其所禁，思其所以然",
                description: "（不逆，亦不盲從）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter2_observe'
            },
            {
                text: "🗡️ 練至手熟，待問是非",
                description: "（先備其術）",
                effects: { masterTraining: 10 },
                nextScene: 'chapter2_training1'
            }
        ]
    },

    // 第二章補充：猶疑之夜（承接「三天的深思」分支）
    chapter2_still_confused: {
        title: "猶疑之夜",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                夜氣如水，心事如絲。你反覆權衡，覺萬事終難兩全，惟願心不欺己。
            </p>
        `,
        choices: [
            {
                text: "🌫️ 隨師入山，再觀其變",
                description: "（行中求悟）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter2_adapt'
            },
            {
                text: "🧘 收拾心緒，專行一途",
                description: "（多思不如一行）",
                effects: { masterTraining: 10 },
                nextScene: 'chapter2_training1'
            }
        ]
    },

    // 第二章補充：冷刃無聲（承接「冷酷地完成任務」分支）
    chapter2_cold_killer: {
        title: "冷刃無聲",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                白日<span>${createWordTooltip('都市','城市市場')}</span>，人聲喧騰；一瞬之間，世間似無聲。匕首入，氣息止。你立於簾影之後，只見窗外風過羅巾，並不回頭。
            </p>
            <p class="leading-relaxed mb-4">
                你將首級化水，以藥潑之，無痕可尋。步出之時，忽聞遠巷兒啼，心上一動，又旋即平寂。
            </p>
            <div class="bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">⚡ 師門之訓:</span> <em>"手應令，心勿顧。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🩸 以無情自護，不問前程",
                description: "（情斷一寸，路直一丈）",
                effects: { masterTraining: 20, tenderness: -10 },
                nextScene: 'chapter2_hardened_heart'
            },
            {
                text: "🕯️ 夜深自省，問心所安",
                description: "（刃快，心未必安）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter2_moral_awakening'
            }
        ]
    },

    // 第二章補充：心甲漸厚（承接「猶豫之後」「冷刃無聲」分支）
    chapter2_hardened_heart: {
        title: "心甲漸厚",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                自此以後，你言笑漸少，目光如霜。你知柔處最易為人所制，遂以冷為甲，藏之不示。
            </p>
            <p class="leading-relaxed mb-4">
                然深夜偶夢孩啼，驚坐而起，胸口似有細針隱隱。
            </p>
        `,
        choices: [
            {
                text: "🛡️ 堅其甲胄，勿受外物侵",
                description: "（情若不動，誰能傷我）",
                effects: { masterTraining: 15, tenderness: -10 },
                nextScene: 'chapter2_moral_awakening'
            },
            {
                text: "🕯️ 記下此夢，慎守本心",
                description: "（冷非真強）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter2_moral_awakening'
            }
        ]
    },

    // 第二章補充：暗潮不息（承接「猶豫之後」「師姐相助」分支）
    chapter2_hidden_resistance: {
        title: "暗潮不息",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                你與師姐以指節輕叩石縫為記：一短一長，便知平安。你們在師命與人心之間，悄悄保存一線餘地。
            </p>
            <p class="leading-relaxed mb-4">
                日後每遇出城行事，你必先審其人，細察其過<span>${createWordTooltip('過','過錯')}</span>是否實有。此念一行，心境自異。
            </p>
        `,
        choices: [
            {
                text: "🕵️ 先察而後動",
                description: "（人之是非，當問其實）",
                effects: { seekingDao: 20, tenderness: 10 },
                nextScene: 'chapter2_first_mission'
            },
            {
                text: "🗡️ 若非至惡，不輕動刃",
                description: "（刀在手，德在心）",
                effects: { tenderness: 10 },
                nextScene: 'chapter2_hesitate'
            }
        ]
    },

    chapter2_hesitate: {
        title: "遲疑的鋒刃",
        chapter: 2,
        content: `
            <blockquote class="quote-text">
                ${createWordTooltip('度', '穿過')}其門${createWordTooltip('隙', '縫')}，無有障礙，${createWordTooltip('伏', '趴著')}之樑上。至瞑，持得其首而歸。尼大怒曰：『何太晚${createWordTooltip('如是', '像這樣')}！』
            </blockquote>

            <p class="leading-relaxed mb-4">
                你遲遲未能下手。只因你在暗處，看到那名官員正在逗弄膝下的一個小兒，那孩子笑得天真爛漫。那一刻，他不是貪官，只是一位父親。你的心，亂了。
            </p>

            <div class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">💕 柔情之意:</span> 
                    <em>"他也會逗孩子玩...他也有溫柔的一面。我怎麼能殺死他？"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                師父察覺了你的猶豫，聲音比以往更加冰冷：<span class="font-bold">『已後遇此輩，先斷其所愛，然後決之。』</span>這句話，如同一根冰錐，刺入你的心底。
            </p>
        `,
        choices: [
            {
                text: "😨 被師父的話嚇到，開始反思",
                description: "（先殺他愛的人？師父怎麼能說出這樣的話？）",
                effects: { seekingDao: 25, masterTraining: -15 },
                learnedWords: [{ word: '度', meaning: '穿過' }, { word: '隙', meaning: '縫' }, { word: '叱', meaning: '大聲呵斥' }],
                nextScene: 'chapter2_moral_awakening'
            },
            {
                text: "😔 強迫自己接受師父的教導",
                description: "（師父說得對，感情只會成為弱點）",
                effects: { masterTraining: 20, tenderness: -20 },
                learnedWords: [{ word: '伏', meaning: '趴著' }, { word: '如是', meaning: '像這樣' }],
                nextScene: 'chapter2_hardened_heart'
            },
            {
                text: "💔 內心痛苦但表面服從",
                description: "（我必須假裝同意，但心裡永遠不會接受）",
                effects: { seekingDao: 15, masterTraining: 5, tenderness: 5 },
                learnedWords: [{ word: '戲弄', meaning: '逗弄' }],
                nextScene: 'chapter2_hidden_resistance'
            }
        ]
    },

    // 第二章結束，進入第三章
    chapter2_moral_awakening: {
        title: "道心初明",
        chapter: 2,
        content: `
            <p class="leading-relaxed mb-4">
                「先斷其所愛」，師父的話在你心中掀起驚濤駭浪。你終於徹底明白，師父所傳授的「道」，是一條絕情絕義、泯滅人性的死路。她要的不是弟子，而是一柄沒有思想的刀。
            </p>

            <blockquote class="quote-text">
                尼曰：『${createWordTooltip('汝', '你')}術已成，可歸家。』遂送還，云：『後二十年，方可一見。』
            </blockquote>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"我的道，不能是這樣的。真正的力量，應當有情，有義，有自己的抉擇。"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                五年修行，你攜一身絕技與滿心迷惘，踏上了歸家之路。
            </p>
        `,
        choices: [
            {
                text: "🏠 急切地想要回到父親身邊",
                description: "（五年了，我太想念家人了）",
                effects: { filialPiety: 25, tenderness: 15 },
                learnedWords: [{ word: '汝', meaning: '你' }],
                nextScene: 'chapter3_return_home'
            },
            {
                text: "🤔 思考如何運用所學的武藝",
                description: "（我要用這些技能做正確的事）",
                effects: { seekingDao: 20, loyalty: 10 },
                nextScene: 'chapter3_return_home'
            }
        ]
    },

    // 第三章：親情回歸
    chapter3_return_home: {
        title: " homecoming ",
        chapter: 3,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第三章：歸家 · 聶府 · 十五歲
                </div>
            </div>

            <blockquote class="quote-text">
                後五年，尼送你歸，告鋒曰：「${createWordTooltip('教已成', '教育已完成')}矣，子卻領取。」尼欻亦不見。一家悲喜，問其所學。
            </blockquote>

            <p class="leading-relaxed mb-4">
                你站在熟悉的家門前，空氣中是庭院裡那棵老槐樹熟悉的味道，混著淡淡的炊煙氣。五年，長得足夠一個女童抽條成少女。父親的鬢角，也已染上了風霜。他看著你，眼神裡有狂喜，有難以置信，還有一絲...你读不懂的陌生與探究。
            </p>

            <blockquote class="quote-text">
                你曰：「初但讀經念咒，餘無他也。」鋒不信，${createWordTooltip('懇詰', '再三問')}。你曰：「真說又恐不信，如何？」鋒曰：「但真說之。」
            </blockquote>

            <div class="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-l-4 border-pink-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 你心底的聲音，此刻響成一片：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>「父親……我回來了。可我該如何告訴他，他的女兒，雙手已不再潔白？」</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>「真相是利刃，會刺伤所有靠近的人。沉默是最好的保護。」</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>「誠實，是通往理解的第一步，但也可能，是隔閡的開始。」</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6">
                面對父親急切而担忧的目光，你將如何拼凑這失落的五年？
            </p>
        `,
        choices: [
            {
                text: "💝 完全誠實地告訴父親一切",
                description: "（父親有權知道我經歷了什麼）",
                effects: { filialPiety: 20, seekingDao: 10, masterTraining: -10 },
                learnedWords: [{ word: '教已成', meaning: '教育已完成' }, { word: '懇詰', meaning: '再三問' }],
                nextScene: 'chapter3_tell_truth'
            },
            {
                text: "🤥 隱瞞真相，保護父親",
                description: "（他知道了只會擔心，還是不說吧）",
                effects: { filialPiety: 10, masterTraining: 15, tenderness: 10 },
                learnedWords: [{ word: '懇詰', meaning: '再三問' }],
                nextScene: 'chapter3_hide_truth'
            },
            {
                text: "⚖️ 選擇性地說一些真話",
                description: "（說一部分真話，但省略最殘酷的部分）",
                effects: { filialPiety: 15, seekingDao: 15 },
                learnedWords: [{ word: '教已成', meaning: '教育已完成' }],
                nextScene: 'chapter3_partial_truth'
            }
        ]
    },

    chapter3_tell_truth: {
        title: "真相的重量",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                燭火搖曳，你選擇了坦誠。你講起石穴的清冷，劍鋒的寒光，猿狖的哀鸣，以及……第一滴濺在手背上的人血。你的聲音很平靜，彷彿在說別人的故事。
            </p>

            <p class="leading-relaxed mb-4">
                父親的臉色在燭光下變得慘白，從${createWordTooltip('驚駭', '吃驚害怕')}到恐懼。他看著你，像是看著一個熟悉的陌生人。他下意識地後退了半步，這個細微的動作，像一根針，輕輕刺入你的心。
            </p>

            <div class="bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">💝 孝女之心:</span> 
                    <em>"父親害怕我了...我是不是不應該說實話？"</em>
                </p>
            </div>

            <blockquote class="quote-text">
                鋒聞語，甚懼。後遇夜即失蹤，及明而返。鋒已不敢詰之，${createWordTooltip('因茲', '因此')}亦不甚憐愛。
            </blockquote>
            <p class="leading-relaxed mb-6">
                一道無形的牆，在你與最亲近的人之间，悄然筑起。空氣中彌漫著父愛的餘溫，以及一絲無法言說的恐懼。
            </p>
        `,
        choices: [
            {
                text: "😢 努力修復與父親的關係",
                description: "（我要證明我還是他的女兒）",
                effects: { filialPiety: 25, tenderness: 20, masterTraining: -15 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }, { word: '因茲', meaning: '因此' }],
                nextScene: 'chapter3_repair_relationship'
            },
            {
                text: "😔 接受父親的疏遠，獨自承受痛苦",
                description: "（這是我選擇的後果，我必須承受）",
                effects: { seekingDao: 20, filialPiety: -5 },
                learnedWords: [{ word: '因茲', meaning: '因此' }],
                nextScene: 'chapter3_accept_distance'
            },
            {
                text: "🌃 開始夜間行動，避免讓父親看到",
                description: "（我會保護這個家，但不讓他知道）",
                effects: { loyalty: 15, masterTraining: 10 },
                learnedWords: [{ word: '驚駭', meaning: '吃驚害怕' }],
                nextScene: 'chapter3_night_activities'
            }
        ]
    },

    chapter3_hide_truth: {
        title: "溫柔的謊言",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你選擇了沉默與微笑。你說山中歲月清苦，但師父教你讀書明理，日子倒也平靜。父親鬆了一口氣，府邸裡的氣氛重新變得溫暖。
            </p>

            <p class="leading-relaxed mb-4">
                然而，每當夜深人靜，謊言的重量便壓上心頭。你觸摸著指尖的薄繭，那是揮劍留下的印記；你閉上眼，還能聞到血腥味的幻覺。你活在兩個世界裡，白日是溫順的女兒，夜晚是沉默的刺客。
            </p>

            <div class="bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">⚡ 師門之訓:</span> 
                    <em>"很好，保持秘密是必要的。普通人不會理解我們的使命。"</em>
                </p>
                <p class="text-sm mt-2">
                    <span class="font-semibold">💝 孝女之心:</span> 
                    <em>"但這樣欺騙父親讓我很痛苦..."</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                夜深人靜時，你常偷偷練習武藝，卻發現自己愈發難以融入尋常家常...
            </p>
        `,
        choices: [
            {
                text: "🎭 努力扮演正常的女兒",
                description: "（我要努力做一個普通的好女兒）",
                effects: { filialPiety: 20, tenderness: 15, masterTraining: -10 },
                nextScene: 'chapter3_pretend_normal'
            },
            {
                text: "🌙 繼續秘密訓練，準備未來",
                description: "（我不能荒廢武藝，將來可能會用到）",
                effects: { masterTraining: 15, seekingDao: 10 },
                nextScene: 'chapter3_secret_training'
            },
            {
                text: "💭 考慮要不要說出部分真相",
                description: "（也許我應該讓父親知道一些，但不是全部）",
                effects: { filialPiety: 10, seekingDao: 15 },
                nextScene: 'chapter3_consider_truth'
            }
        ]
    },

    // 第三章補充：選擇性說真話
    chapter3_partial_truth: {
        title: "隱而不盡",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你選擇只說一部分。你提到山中清苦、讀經練息，卻隱去殺與血。父親點頭稱善，卻總覺你目光深處另有波瀾。
            </p>
            <div class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">💕 柔情之意:</span> <em>"我不願他因我受驚。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🎭 維持現狀，免他憂心",
                description: "（護他亦護己）",
                effects: { tenderness: 10, filialPiety: 10 },
                nextScene: 'chapter3_pretend_normal'
            },
            {
                text: "💬 擇時再談，圖一日坦誠",
                description: "（言有先後）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter3_consider_truth'
            }
        ]
    },

    // 第三章補充：修補父女關係（承接真相之後）
    chapter3_repair_relationship: {
        title: "弭隙回溫",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                父親的目光仍有驚懼。你放下兵刃，陪他晨起夜坐，說童時小事，言笑如昔。驚影漸退，親情回暖。
            </p>
            <div class="bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-400 p-4 my-4">
                <p class="text-sm"><span class="font-semibold">💝 孝女之心:</span> <em>"親在，便有歸處。"</em></p>
            </div>
        `,
        choices: [
            {
                text: "🏠 安父之心，議婚家事",
                description: "（家門漸定）",
                effects: { filialPiety: 15, tenderness: 10 },
                nextScene: 'chapter3_marriage_choice'
            },
            {
                text: "🕯️ 夜間巡護，不擾其眠",
                description: "（護之於無形）",
                effects: { loyalty: 10, masterTraining: 5 },
                nextScene: 'chapter3_night_activities'
            }
        ]
    },

    // 第三章補充：接受疏遠（承接真相之後）
    chapter3_accept_distance: {
        title: "各守一隅",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你不再強求解釋，只在院外守著他的燈。風過竹影，人各有心。你明白，有些傷需要時間才能平。
            </p>
        `,
        choices: [
            {
                text: "🌙 轉行夜事，避其所驚",
                description: "（不見，亦是愛）",
                effects: { loyalty: 10, seekingDao: 10 },
                nextScene: 'chapter3_night_activities'
            },
            {
                text: "🏠 談婚論嫁，寬父之心",
                description: "（以家事鎮心事）",
                effects: { filialPiety: 10 },
                nextScene: 'chapter3_marriage_choice'
            }
        ]
    },

    // 第三章補充：夜間行動（承接多條線）
    chapter3_night_activities: {
        title: "夜行無聲",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                夜深，你輕步越牆，於市井巷陌解數樁小患，不留姓名。天將明時，回到院中，露水未乾。
            </p>
        `,
        choices: [
            {
                text: "🛡️ 專守家域，斷其宵小",
                description: "（施力於近）",
                effects: { loyalty: 10, masterTraining: 10 },
                nextScene: 'chapter3_marriage_choice'
            },
            {
                text: "🧭 探詢時政，識人間是非",
                description: "（見識漸廣）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter3_marriage_choice'
            }
        ]
    },

    // 第三章補充：扮作尋常（承接隱瞞真相）
    chapter3_pretend_normal: {
        title: "若無其事",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                白日陪父，談柴米油鹽；夜深靜坐，聽心跳與風聲。你學著把刀意藏在微笑裡。
            </p>
        `,
        choices: [
            {
                text: "💕 應允親事，求家常安穩",
                description: "（凡心一念）",
                effects: { tenderness: 15, filialPiety: 10 },
                nextScene: 'chapter3_marriage_choice'
            },
            {
                text: "🗡️ 暗自練功，不廢於術",
                description: "（進退兩全）",
                effects: { masterTraining: 10, seekingDao: 10 },
                nextScene: 'chapter3_secret_training'
            }
        ]
    },

    // 第三章補充：秘密練習（承接隱瞞真相）
    chapter3_secret_training: {
        title: "燈下藏鋒",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你以水紋測步，以燭影校手，招式漸熟，心氣漸平。屋外犬吠一聲，你便收功如初。
            </p>
        `,
        choices: [
            {
                text: "🏠 回歸家務，應家中所需",
                description: "（收與放）",
                effects: { filialPiety: 10 },
                nextScene: 'chapter3_marriage_choice'
            },
            {
                text: "💬 思及坦誠之時",
                description: "（誠可解結）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter3_consider_truth'
            }
        ]
    },

    // 第三章補充：權衡坦誠（承接隱瞞真相）
    chapter3_consider_truth: {
        title: "言與不言",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你衡量言語的輕重：若盡言，恐父心驚；若不言，則心有閡。你決定尋一個不傷之法。
            </p>

            <div class="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-l-4 border-pink-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 內心的左右為難：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>"父親已經承受了太多痛苦，我怎麼能再讓他為我的過去而煩惱？"</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"但隱瞞不是愛，而是另一種傷害...他有權知道真相。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"真實與善意之間，該如何取捨？也許真正的智慧在於找到平衡。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🕊️ 先言其苦，後隱其血",
                description: "（緩步入心）",
                effects: { tenderness: 10, seekingDao: 10 },
                nextScene: 'chapter3_partial_truth'
            },
            {
                text: "🗣️ 擇良辰坦白",
                description: "（終須相告）",
                effects: { seekingDao: 10 },
                nextScene: 'chapter3_tell_truth'
            }
        ]
    },

    // 第三章補充：婚事走向（承接婚姻抉擇）
    chapter3_true_love: {
        title: "真心如初",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你以真意相待，與磨鏡少年共理薄酌清歡。偶有江湖舊識相尋，你淡然婉拒，只說：「我心有所守。」
            </p>

            <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 內心的溫暖和平：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"這份平凡的幸福，是我從未體驗過的珍貴。或許這就是我真正想要的生活。"</em></p>
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>"父親看到我如此安穩，一定也會感到欣慰吧。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🏠 經營小家，安父之心",
                description: "（柔能定風）",
                effects: { tenderness: 20, filialPiety: 10 },
                nextScene: 'chapter4_start'
            }
        ]
    },

    chapter3_marriage_cover: {
        title: "假作人間",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你將婚姻視為掩護，笑語有度，情不外露。對方雖樸實多情，你卻自守如冰，免其牽連。
            </p>

            <div class="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-700 dark:to-purple-900/20 border-l-4 border-gray-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 內心的冷酷與良知：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"感情是弱點，保持距離才能保護他，也保護自己。"</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"但看到他真誠的眼神，我總覺得這樣欺騙是不對的..."</em></p>
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"至少要保護他的安全，這是我能給他的最大善意。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🗡️ 暗中行事，護其無知",
                description: "（情雖不近，義不相負）",
                effects: { masterTraining: 10, loyalty: 10 },
                nextScene: 'chapter4_start'
            }
        ]
    },

    chapter3_complex_marriage: {
        title: "半真半疑",
        chapter: 3,
        content: `
            <p class="leading-relaxed mb-4">
                你帶著試探的心步入婚姻。有時溫柔，有時疏離；你在凡俗與江湖之間，學著放下又拾起。
            </p>

            <div class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 內心的拉扯與矛盾：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"也許我真的可以嘗試過普通人的生活...感受被愛與去愛的滋味。"</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"不要忘記你的本質，這種安逸只會讓你變弱。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"人生本就應該體驗各種可能，這也是一種修行。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "💕 嘗試信任，給予真心",
                description: "（情深可鎮心魔）",
                effects: { tenderness: 15 },
                nextScene: 'chapter3_true_love'
            },
            {
                text: "🗡️ 保持距離，不涉其險",
                description: "（以退為護）",
                effects: { masterTraining: 10, seekingDao: 10 },
                nextScene: 'chapter3_marriage_cover'
            }
        ]
    },

    // 第四章補充：魏府效力的分路
    chapter4_loyal_service: {
        title: "受命以行",
        chapter: 4,
        content: `
            <p class="leading-relaxed mb-4">
                你披甲入府，按令行事。文移之間，已聞許州賢名；兵器之側，亦覺風雲將起。
            </p>

            <div class="bg-gradient-to-r from-red-50 to-gray-50 dark:from-red-900/20 dark:to-gray-700 border-l-4 border-red-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 忠誠與個人的權衡：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"既受此位，當盡此責。無論前路如何，我都會恪守本分。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"但許州真的如傳言中那般邪惡嗎？還是要親眼看到才能判斷。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "⚔️ 整裝赴任，待命而行",
                description: "（身在其位）",
                effects: { loyalty: 20, masterTraining: 10 },
                nextScene: 'chapter5_mission'
            }
        ]
    },

    chapter4_family_first: {
        title: "以家為重",
        chapter: 4,
        content: `
            <p class="leading-relaxed mb-4">
                你以家庭為先，只在名義上領差。心繫灶下煙，偶於夜間解小患，盡己之義而不張揚。
            </p>

            <div class="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-l-4 border-pink-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 溫暖的內心獨白：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>"家才是我真正的歸宿，這些小小的安穩時光比任何功名都珍貴。"</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"能在暗中幫助無辜的人，這樣的力量使用才有意義。"</em></p>
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"我的忠誠首先屬於家人，然後才是他人。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🛡️ 守小我，亦關大局",
                description: "（時局難料）",
                effects: { tenderness: 15, filialPiety: 10 },
                nextScene: 'chapter5_mission'
            }
        ]
    },

    chapter4_cautious_approach: {
        title: "觀微知著",
        chapter: 4,
        content: `
            <p class="leading-relaxed mb-4">
                你按兵不動，先觀其人。魏帥言辭間多忌刻，你心下暗記，不為所役。
            </p>

            <div class="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/20 dark:to-gray-700 border-l-4 border-blue-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 智慧的考量：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"急於行動者常失於莽撞，先觀察再判斷才是智者之道。"</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"情報是最好的武器，了解敵人才能制勝。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🕵️ 以觀代行，求證是非",
                description: "（慎而後動）",
                effects: { seekingDao: 15 },
                nextScene: 'chapter5_mission'
            }
        ]
    },

    // 第五章補充：任務走向
    chapter5_execute_mission: {
        title: "令下如山",
        chapter: 5,
        content: `
            <p class="leading-relaxed mb-4">
                你收斂心緒，依令啟程。許州道上風正清，你將刀意隱在衣縫，步伐如常。
            </p>

            <div class="bg-gradient-to-r from-red-50 to-gray-50 dark:from-red-900/20 dark:to-gray-700 border-l-4 border-red-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 職責與良心的角力：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"既受人恩，當報人事。主君有令，不可違背。"</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>"執行任務，不要多想。這就是我存在的意義。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"但真正的忠誠，是否應該建立在對與錯的判斷之上？"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🗡️ 直入許州，尋便下手",
                description: "（忠於其職）",
                effects: { loyalty: 20, masterTraining: 10 },
                nextScene: 'chapter5_investigate'
            }
        ]
    },

    chapter5_consider_refusal: {
        title: "進退兩難",
        chapter: 5,
        content: `
            <p class="leading-relaxed mb-4">
                你思及丈夫與家，念及人主之良賢；刀在腰間，心卻在衡。最終，你決定先行探事，再作斷語。
            </p>

            <div class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 情義與正義的天平：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>"我的丈夫，我的家...他們是我心中最柔軟的部分，我不能讓他們失望。"</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"也許真正的智慧在於親自判斷是非，而不是盲從命令。"</em></p>
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"但我也不能輕易背叛主君的信任..."</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "🕵️ 先察其人而後動",
                description: "（不負此生）",
                effects: { seekingDao: 20, tenderness: 10 },
                nextScene: 'chapter5_investigate'
            }
        ]
    },

    chapter5_loyalty_question: {
        title: "忠所歸處",
        chapter: 5,
        content: `
            <p class="leading-relaxed mb-4">
                你於劉府外遠觀人心，想到：「忠或不在其人，在其義。」心念一起，足下之路便明了幾分。
            </p>

            <div class="bg-gradient-to-r from-blue-50 to-red-50 dark:from-blue-900/20 dark:to-red-900/20 border-l-4 border-blue-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 忠誠哲學的覺醒：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"真正的忠誠不應該是盲從，而是對正義和道德的堅持。"</em></p>
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"忠於一個人還是忠於正確的事？這是我必須面對的選擇。"</em></p>
                </div>
            </div>
        `,
        choices: [
            {
                text: "⚖️ 審主審義，擇其可從",
                description: "（忠於更大的正直）",
                effects: { seekingDao: 20, loyalty: -5 },
                nextScene: 'chapter5_impressed'
            }
        ]
    },

    chapter5_neutrality: {
        title: "不屬之地",
        chapter: 5,
        content: `
            <p class="leading-relaxed mb-4">
                你心思脫離權勢之爭，願以一己之力，只護值得護之人。劉昌裔望你一眼，微笑而允。
            </p>
        `,
        choices: [
            {
                text: "🛡️ 回守其人，不問其黨",
                description: "（義自在心）",
                effects: { seekingDao: 20, loyalty: 10 },
                nextScene: 'chapter6_prepare_battle'
            }
        ]
    },

    // 第六章補充：正面死戰（承接與精精兒後之分路）
    chapter6_direct_battle: {
        title: "刃上聞道",
        chapter: 6,
        content: `
            <p class="leading-relaxed mb-4">
                你選擇正面相搏。兵刃交鳴之際，心忽然空明：生死一瞬，所護之人便是你之道。
            </p>
        `,
        choices: [
            {
                text: "🧘 以心制勝，回歸靜定",
                description: "（勝不矜，敗不屈）",
                effects: { seekingDao: 20, loyalty: 15 },
                nextScene: 'chapter6_battle_kongkong'
            }
        ]
    },

    // 第七章補充：更深的隨侍（承接化身蠛蠓之後）
    chapter7_deeper_loyalty: {
        title: "義深如初",
        chapter: 7,
        content: `
            <p class="leading-relaxed mb-4">
                自此之後，你對劉公之護更謹。你知他有度，你亦自有持。忠非媚上，是守一份明亮。
            </p>
        `,
        choices: [
            {
                text: "⚔️ 以退為進，不戀權場",
                description: "（心歸山水）",
                effects: { seekingDao: 20 },
                nextScene: 'chapter7_enlightenment'
            }
        ]
    },

    // 第七章補充：最終抉擇（承接覺悟）
    chapter7_final_choice: {
        title: "最後之問",
        chapter: 7,
        content: `
            <p class="leading-relaxed mb-4">
                你靜看人間萬象，知可留、可走、可守、可放。此刻的一念，將成為你此生的歸處。
            </p>
        `,
        choices: [
            {
                text: "🌊 尋山水，訪至人",
                description: "（歸於自在）",
                effects: { seekingDao: 30 },
                nextScene: 'ending_transcendence'
            }
        ]
    },
    // 第三章的關鍵轉折 - 選擇丈夫
    chapter3_marriage_choice: {
        title: "人生的第二個重大選擇",
        chapter: 3,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-purple-500 text-white px-4 py-2 rounded-full text-sm mb-4">
                    人生轉折點
                </div>
            </div>

            <blockquote class="quote-text">
                忽值磨鏡少年及門，女曰：「此人可與我為夫。」白父，父不敢不從，遂嫁之。其夫但能淬鏡，餘無他能。
            </blockquote>

            <p class="leading-relaxed mb-4">
                那天，一名磨鏡少年來到府前。他衣衫樸素，眼神專注而清澈，打磨銅鏡的動作一絲不苟。陽光灑在他專注的側臉上，你忽然感到一種久違的平靜。你對父親說，就是他了。
            </p>

            <div class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 為何選擇他？你心底的聲音們有著不同的解讀：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>「或許……我只是渴望一份簡單的、不被干擾的溫暖。」</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>「一個普通人，是最好的掩護。他不會察覺你的秘密，也不會成為你的弱點。」</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>「他的專注，近乎於道。在他身邊，或許能找到另一種修行的方式。」</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6">
                這段突如其來的婚姻，對你而言，究竟意味著什麼？
            </p>
        `,
        choices: [
            {
                text: "💕 真心愛上這個純樸的男子",
                description: "（我想要體驗真正的愛情和家庭幸福）",
                effects: { tenderness: 30, filialPiety: 15, masterTraining: -15 },
                nextScene: 'chapter3_true_love'
            },
            {
                text: "🎭 將婚姻視為掩護身份的工具",
                description: "（這是一個完美的偽裝，沒人會懷疑家庭主婦）",
                effects: { masterTraining: 20, seekingDao: 10, tenderness: -5 },
                nextScene: 'chapter3_marriage_cover'
            },
            {
                text: "🤔 帶著複雜的心情接受婚姻",
                description: "（我不確定自己想要什麼，但願意嘗試）",
                effects: { tenderness: 15, filialPiety: 10, seekingDao: 10 },
                nextScene: 'chapter3_complex_marriage'
            }
        ]
    },

    // 第四章：世俗枷鎖（父親去世，效力魏帥）
    chapter4_start: {
        title: "尘世的锚",
        chapter: 4,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第四章：尘世缰锁 · 魏博军府 · 成年
                </div>
            </div>

            <blockquote class="quote-text">
                數年後，父卒。魏帥稍知其異，遂以金帛署為左右吏。如此又數年。
            </blockquote>

            <p class="leading-relaxed mb-4">
                父亲的离去，像是斩断了你与这红尘最后的、也是最温暖的一根联系。灵堂的烛火燃尽，你感到前所未有的孤单，仿佛立于旷野，四顾茫然。你丈夫的陪伴，是你此刻唯一的慰藉。
            </p>

            <p class="leading-relaxed mb-4">
                你的不凡，终究难以长久隐藏。魏帅听闻你的事迹，送来金帛与官职，邀你入府为他效力。这份「赏识」，更像一道新的枷锁。
            </p>

            <div class="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20 border-l-4 border-gray-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 你心底的聲音，轻声议论：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-pink-600">💝 孝女之心:</span> <em>「父亲不在了，我当承其遗志，护持家门。」</em></p>
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>「魏帅于我家有恩，食君之禄，当忠君之事。」</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>「我只想和夫君磨镜为生，过最寻常的日子……」</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>「入世，还是出世？或许，这也是一种修行。」</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6">
                父亲为你挡开的尘世，终究还是迎面而来。你如何选择？
            </p>
        `,
        choices: [
            {
                text: "⚔️ 全心全意為魏帥效力",
                description: "（這是報答恩情和展現能力的機會）",
                effects: { loyalty: 25, masterTraining: 15, filialPiety: 10 },
                nextScene: 'chapter4_loyal_service'
            },
            {
                text: "🏠 以家庭為重，只是形式上接受",
                description: "（我的重心還是在家庭，工作只是謀生手段）",
                effects: { tenderness: 20, filialPiety: 15, loyalty: 5 },
                nextScene: 'chapter4_family_first'
            },
            {
                text: "🤔 保持警惕，觀察魏帥的真實意圖",
                description: "（先看看他到底想要我做什麼）",
                effects: { seekingDao: 20, loyalty: 5, masterTraining: 5 },
                nextScene: 'chapter4_cautious_approach'
            }
        ]
    },

    // 第五章：忠誠考驗（刺殺劉昌裔）
    chapter5_mission: {
        title: "奉命之刃",
        chapter: 5,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第五章：忠義的裂痕 · 許州道上
                </div>
            </div>

            <blockquote class="quote-text">
                至元和間，魏帥與陳許節度使劉昌裔不協，使你賊其首。你辭帥之許。
            </blockquote>

            <p class="leading-relaxed mb-4">
                这一天还是来了。魏帅召你入内，屏退左右，命令你去许州，取刘昌裔首级。刘昌裔，当代名臣，以贤德闻名于世。这个名字，让你腰间的匕首感到一丝冰冷的讽刺。
            </p>

            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 my-6">
                <h4 class="font-semibold mb-2">💭 你的内心，掀起滔天巨浪：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>「主公之命，不可不从。这是为臣之纲常。」</em></p>
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>「若忠即为不义，这'忠'，还值得守护吗？」</em></p>
                    <p><span class="font-semibold text-gray-600">⚡ 師門之訓:</span> <em>「思考，是多余的。执行，是唯一的答案。」</em></p>
                    <p><span class="font-semibold text-purple-600">💕 柔情之意:</span> <em>「此行凶险，若我一去不返，夫君该如何自处……」</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6">
                前往许州的路上，蹄声单调，你的心却乱如奔马。你握着缰绳的手，第一次感到了迟疑。
            </p>
        `,
        choices: [
            {
                text: "⚔️ 堅決執行任務，忠於魏帥",
                description: "（既然接受了任務，就要完成到底）",
                effects: { loyalty: 30, masterTraining: 15, seekingDao: -15 },
                nextScene: 'chapter5_execute_mission'
            },
            {
                text: "🕵️ 先暗中調查劉昌裔的為人",
                description: "（我要確認他是否真的該死）",
                effects: { seekingDao: 25, loyalty: 5 },
                nextScene: 'chapter5_investigate'
            },
            {
                text: "💭 內心掙扎，考慮拒絕任務",
                description: "（也許我應該找個藉口不執行這個任務）",
                effects: { seekingDao: 20, tenderness: 10, loyalty: -10 },
                nextScene: 'chapter5_consider_refusal'
            }
        ]
    },

    chapter5_investigate: {
        title: "许州城下",
        chapter: 5,
        content: `
            <p class="leading-relaxed mb-4">
                你没有急于动手。白日，你作寻常妇人打扮，行走于许州街市。你听见的是百姓对刘昌裔的称颂，看到的是市井的安乐祥和。这一切，都与魏帅口中的「乱臣贼子」截然不同。
            </p>

            <blockquote class="quote-text">
                刘能神算，已知其来。召衙将，令来日早至城北，候一丈夫、一女子，各跨白黑卫至门。遇有鹊前噪，丈夫以弓弹之，不中，妻夺夫弹，一丸而毙鹊者...
            </blockquote>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"他竟然早就知道我會來...這個人確實不簡單。"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                次日，城门之下，当你的丈夫举弹射鹊不中，你接过弹弓，一击而下时，你看到了远处官将眼中了然的神情。那一刻，你如坠冰窟——他竟算到如此地步！
            </p>
        `,
        choices: [
            {
                text: "😱 被劉昌裔的智慧震撼",
                description: "（這樣的人怎麼能殺死？）",
                effects: { seekingDao: 25, loyalty: -15 },
                nextScene: 'chapter5_impressed'
            },
            {
                text: "⚖️ 重新思考忠誠的意義",
                description: "（真正的忠誠是忠於正義，還是忠於主人？）",
                effects: { seekingDao: 20, loyalty: -5 },
                nextScene: 'chapter5_loyalty_question'
            }
        ]
    },

    chapter5_impressed: {
        title: "神人之度",
        chapter: 5,
        content: `
            <blockquote class="quote-text">
                揖之云：「吾欲相見，故遠相祗迎也。」衙將受約束，遇之。你與丈夫曰：「劉僕射果神人。不然者，何以洞吾也。願見劉公。」
            </blockquote>

            <p class="leading-relaxed mb-4">
                你与丈夫被恭敬地请入府内。刘昌裔端坐堂上，温言如春风：「二位远道而来，不必拘礼。」他丝毫没有提及刺杀之事，彷佛你们只是久别重逢的故人。
            </p>

            <blockquote class="quote-text">
                劉勞之。你與丈夫拜曰：「合負僕射萬死。」劉曰：「不然，各親其主，人之常事。魏今與許何異？願請留此，勿相疑也。」
            </blockquote>

            <div class="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold text-blue-600">🌊 山水求道:</span> 
                    <em>"他不但不怪罪我，還理解我的處境...這就是真正的大度。"</em>
                </p>
                <p class="text-sm mt-2">
                    <span class="font-semibold text-red-600">⚔️ 忠義之念:</span> 
                    <em>"這樣的人才值得我效忠！"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                你謝曰：「僕射左右無人，願舍彼而就此，服公神明也。」知魏帥之不及劉。
            </p>
        `,
        choices: [
            {
                text: "🙏 正式背叛魏帥，投靠劉昌裔",
                description: "（真正的忠誠應該獻給值得的人）",
                effects: { loyalty: 20, seekingDao: 25, masterTraining: -10 },
                nextScene: 'chapter5_switch_loyalty'
            },
            {
                text: "⚖️ 提出中立，不再參與政治鬥爭",
                description: "（我不想再為任何人的野心殺戮）",
                effects: { seekingDao: 30, loyalty: -20 },
                nextScene: 'chapter5_neutrality'
            }
        ]
    },

    chapter5_switch_loyalty: {
        title: "易主之誓",
        chapter: 5,
        content: `
            <blockquote class="quote-text">
                劉問其所須，曰：「每日只要錢二百文足矣。」乃依所請。忽不見二衛所之。劉使人尋之，不知所向。後潛搜布囊中，見二紙衛，一黑一白。
            </blockquote>

            <p class="leading-relaxed mb-4">
                你正式投靠劉昌裔。你的要求簡單到讓他驚訝：每日二百文錢，僅夠家用。你那兩匹神駿的坐騎也悄然消失，只在他派人送來的行囊中，變為兩張剪紙，一黑一白。
            </p>

            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold text-red-600">⚔️ 忠義之念:</span> 
                    <em>"從今以後，我的劍只為正義而舞！"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                然而，背叛的代價，很快便會找上門來。你望向北方的天空，平靜地對劉昌裔說：「魏帥不會善罷甘休。他的下一個刺客，已在路上。」
            </p>
        `,
        choices: [
            {
                text: "⚔️ 主動迎戰即將到來的刺客",
                description: "（既然選擇了這條路，就要承擔後果）",
                effects: { loyalty: 25, masterTraining: 20 },
                nextScene: 'chapter6_prepare_battle'
            },
            {
                text: "🛡️ 專注於保護劉昌裔",
                description: "（我的使命是保護值得保護的人）",
                effects: { loyalty: 30, tenderness: 10 },
                nextScene: 'chapter6_prepare_battle'
            }
        ]
    },

    // 第六章：護主決戰
    chapter6_prepare_battle: {
        title: "紅綃之誓",
        chapter: 6,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第六章：死生之决 · 許州府邸 · 一線之間
                </div>
            </div>

            <blockquote class="quote-text">
                「今宵請剪髮，繫之以紅綃，送於魏帥枕前，以表不回。」劉聽之。至四更，卻返，曰：「送其信了。後夜必使精精兒來殺某及賊僕射之首。此時亦萬計殺之，乞不憂耳。」
            </blockquote>

            <p class="leading-relaxed mb-4">
                你剪下一缕青丝，用红绡系好。這不僅是與過去的诀別，也是賭上性命的誓言。劉昌裔看著燭火下你決絕的側臉，心中再無半分疑慮，唯有全然的信任。
            </p>

            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">⚔️ 忠義之念:</span> 
                    <em>"為了保護值得保護的人，我願意與世界為敵！"</em>
                </p>
                <p class="text-sm mt-2">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"這一戰，將決定我的道路是否正確。"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                劉昌裔從容依舊，豁達無畏。能遇此主，夫復何求。
            </p>
        `,
        choices: [
            {
                text: "⚔️ 做好戰鬥的一切準備",
                description: "（我要用盡全力保護劉公）",
                effects: { loyalty: 25, masterTraining: 15 },
                nextScene: 'chapter6_battle_jjing'
            },
            {
                text: "🧘 保持內心平靜，以不變應萬變",
                description: "（真正的高手在於心境的平和）",
                effects: { seekingDao: 20, loyalty: 15 },
                nextScene: 'chapter6_battle_jjing'
            }
        ]
    },

    chapter6_battle_jjing: {
        title: "幻影之斗",
        chapter: 6,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-red-500 text-white px-4 py-2 rounded-full text-sm mb-4">
                    生死一瞬
                </div>
            </div>

            <blockquote class="quote-text">
                是夜明燭，半宵之後，果有二幡子，一紅一白，飄飄然如相擊於床四隅。良久，見一人自空而踣，身首異處。你亦出曰：「精精兒已斃。」
            </blockquote>

            <p class="leading-relaxed mb-4">
                戰鬥激烈而短暫。你憑藉多年的訓練與堅定之念，成功擊敗精精兒；你也明白，更大的挑戰尚在後頭。
            </p>

            <p class="leading-relaxed mb-4">
                拽出於堂之下，以藥化之為水，毛髮不存矣。你曰：「後夜當使妙手空空兒繼至。空空兒之神術，人莫能窺其用，鬼莫能躡其蹤……我之藝，故不能造其境。」
            </p>

            <div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 my-4">
                <p class="text-sm">
                    <span class="font-semibold">🌊 山水求道:</span> 
                    <em>"空空兒的境界比我高...但為了保護劉公，我必須超越自己的極限。"</em>
                </p>
            </div>

            <p class="leading-relaxed mb-6">
                面對更強大的對手，你必須想出非常手段...
            </p>
        `,
        choices: [
            {
                text: "🐛 化身蠛蠓，潛入劉公體內保護",
                description: "（只有這樣才能阻止空空兒）",
                effects: { loyalty: 30, seekingDao: 25 },
                nextScene: 'chapter6_battle_kongkong'
            },
            {
                text: "⚔️ 正面迎戰，以命相搏",
                description: "（即使明知不敵，也要堂堂正正一戰）",
                effects: { loyalty: 35, masterTraining: 20 },
                nextScene: 'chapter6_direct_battle'
            }
        ]
    },

    chapter6_battle_kongkong: {
        title: "虛空之防",
        chapter: 6,
        content: `
            <blockquote class="quote-text">
                「但以于闐玉周其頸，擁以衾，汝當化為蠛蠓，潛入僕射腸中聽伺，其餘無逃避處。」劉如言。
            </blockquote>

            <p class="leading-relaxed mb-4">
                這是你從未嘗試過的境界。你將自己化為最微小的存在，潛入劉昌裔體內，以最親密的方式護他。此刻，你感受前所未有的超脫。
            </p>

            <p class="leading-relaxed mb-4">
                至三更，瞑目未熟，果聞頸上鏗然，聲甚厲。你自口中躍出，賀曰：「僕射無患矣。此人如俊鶻，一搏不中，即翩然遠逝，恥其不中。才未逾一更，已千里矣。」
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-6">
                <h4 class="font-semibold mb-2">🌟 精神境界的昇華：</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-semibold text-blue-600">🌊 山水求道:</span> <em>"我體驗到了與他人生命完全融合的境界...這就是超脫嗎？"</em></p>
                    <p><span class="font-semibold text-red-600">⚔️ 忠義之念:</span> <em>"真正的忠誠就是願意為對方犧牲一切，包括自我。"</em></p>
                </div>
            </div>

            <p class="leading-relaxed mb-6">
                後視其玉，果有匕首劃處，痕逾數分。自此劉轉厚禮之。你在此次戰鬥中不僅護了劉公，更重要者，你找到了新的精神境界...
            </p>
        `,
        choices: [
            {
                text: "🌟 為自己的境界提升感到喜悅",
                description: "（我找到了新的人生意義）",
                effects: { seekingDao: 35, loyalty: 20 },
                nextScene: 'chapter7_enlightenment'
            },
            {
                text: "🤝 更加堅定對劉公的忠誠",
                description: "（這樣的主君值得我終生效忠）",
                effects: { loyalty: 40, seekingDao: 15 },
                nextScene: 'chapter7_deeper_loyalty'
            }
        ]
    },

    // 第七章：終極選擇
    chapter7_enlightenment: {
        title: "道之所在",
        chapter: 7,
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-ancient-gold text-white px-4 py-2 rounded-full text-sm mb-4">
                    第七章：抉择 · 尘世之外
                </div>
            </div>

            <blockquote class="quote-text">
                自元和八年，劉自許入覲，你不願從焉。云：「自此尋山水，訪至人，但乞一虛給與其夫。」劉如約。
            </blockquote>

            <p class="leading-relaxed mb-4">
                劉昌裔奉詔入京，前途無量，他盛情邀你同往。你卻搖了搖頭。那場化身蠛蠓的經歷，讓你窺見了另一片天地。功名利祿，於你已是過眼雲煙。
            </p>

            <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-6 my-6">
                <h4 class="font-bold text-lg mb-3">🌊 山水求道的最終覺醒</h4>
                <p class="text-sm mb-2">在與空空兒的戰鬥中，你體驗到了化身蠛蠓的超脫境界。</p>
                <p class="text-sm mb-2">你意識到真正的自由不是為任何人而活，而是超越所有世俗的束縛。</p>
                <p class="text-sm">尋山水、訪至人，追求更高的精神境界，這才是你的終極目標。</p>
            </div>

            <p class="leading-relaxed mb-6">
                這個選擇讓劉昌裔既理解又感慨。他知道，真正的高人最終都會選擇超脫...
            </p>
        `,
        choices: [
            {
                text: "🌊 踏上尋山水訪至人的道路",
                description: "（我終於找到了人生的真正意義）",
                effects: { seekingDao: 50 },
                nextScene: 'ending_transcendence'
            },
            {
                text: "🤔 再次考慮是否要完全超脫",
                description: "（也許我還有一些世俗的牽掛沒有放下）",
                effects: { seekingDao: 30, tenderness: 10 },
                nextScene: 'chapter7_final_choice'
            }
        ]
    },

    // 最終結局：超脫聖者
    ending_transcendence: {
        title: "不知所之",
        chapter: 7,
        isEnding: true,
        endingId: 'transcendence_sage',
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full text-xl font-bold ending-badge">
                    🌊 最終結局：不知所之
                </div>
            </div>

            <blockquote class="quote-text">
                後漸不知所之。及劉薨於統軍，你亦鞭驢而一至京師，柩前慟哭而去。
            </blockquote>

            <p class="leading-relaxed mb-4">
                你辭別了劉昌裔，與丈夫一同歸隱。世間再無人知你的踪跡。直到數年後，劉昌裔於任上病故，你獨自一人，騎著那頭神妙的白驢，來到京師的靈柩前，大哭一場，而後再次消失於人海。
            </p>

            <blockquote class="quote-text">
                開成年，昌裔子縱除陵州刺史，至蜀棧道，遇你，貌若當時。甚喜相見，依前跨白衛如故。你語縱曰：「郎君大災，不合適此。」出藥一粒，令縱吞之。又云：「來年火急拋官歸洛，方脫此禍。吾藥力只保一年患耳。」
            </blockquote>

            <blockquote class="quote-text">
                縱亦不甚信。遺其繒彩，你一無所受，但沉醉而去。後一年，縱不休官，果卒於陵州。自此無復有人見你矣。
            </blockquote>

            <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-l-4 border-blue-400 p-6 my-6">
                <h4 class="font-bold text-lg mb-3">🌟 你的最終形象</h4>
                <p class="mb-2"><strong>🌊 山水求道達到極致</strong> - 完全超脫了世俗的一切束縛</p>
                <p class="mb-2"><strong>🔮 預知未來的能力</strong> - 能夠看破生死，洞察命運</p>
                <p class="mb-2"><strong>💨 來去如風的存在</strong> - 如神仙般飄渺，不受任何拘束</p>
                <p class="mb-2"><strong>🎭 保持人性關懷</strong> - 雖然超脫但仍關心故人</p>
                <p><strong>♾️ 永恆的自由</strong> - 達到了道家理想中的至高境界</p>
            </div>

            <div id="finalStats" class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 my-6">
                <h4 class="font-semibold mb-2">📊 最終數值統計</h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>🌊 山水求道: <span class="font-bold text-blue-600" id="finalSeekingDao">--/100</span></div>
                    <div>⚔️ 忠義之念: <span class="font-bold text-red-600" id="finalLoyalty">--/100</span></div>
                    <div>💝 孝女之心: <span class="font-bold text-pink-600" id="finalFilialPiety">--/100</span></div>
                    <div>💕 柔情之意: <span class="font-bold text-purple-600" id="finalTenderness">--/100</span></div>
                    <div>⚡ 師門之訓: <span class="font-bold text-gray-600" id="finalMasterTraining">--/100</span></div>
                </div>
            </div>

            <div class="text-center mt-8">
                <p class="text-xl font-bold mb-4">🎉 恭喜完成遊戲！</p>
                <p class="text-lg mb-4">你體驗了自己從家族女兒到超脫聖者的完整人生軌跡</p>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                    這是原文的經典結局，體現了道家「超脫塵世、追求真我」的哲學思想
                </p>
            </div>
        `,
        choices: [
            {
                text: "🔄 開始新的人生軌跡",
                description: "（體驗不同的選擇，探索其他結局）",
                effects: {},
                nextScene: 'restart_plus'
            },
            {
                text: "📖 查看結局圖鑑",
                description: "（看看還有哪些結局沒有解鎖）",
                effects: {},
                nextScene: 'show_endings'
            }
        ]
    },

    // 新遊戲+ 開始
    restart_plus: {
        title: "新的輪迴",
        content: `
            <div class="text-center mb-6">
                <div class="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                    🔄 新遊戲+ 模式
                </div>
            </div>

            <p class="text-lg leading-relaxed mb-4">
                時光倒流，回到那個決定命運的午後...
            </p>

            <p class="leading-relaxed mb-4">
                但這一次，你的靈魂深處似乎保留著前世的一些記憶碎片。你能隱約感知到不同選擇可能帶來的後果...
            </p>

            <div class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-4 my-6">
                <h4 class="font-semibold mb-2">🌟 新遊戲+ 特色</h4>
                <ul class="text-sm space-y-1">
                    <li>• 保留已解鎖的結局和成就</li>
                    <li>• 某些關鍵選擇會顯示「似曾相識」的感覺</li>
                    <li>• 可以更容易地探索之前沒有嘗試過的路線</li>
                    <li>• 隱藏選項可能會出現</li>
                </ul>
            </div>

            <p class="leading-relaxed mb-6">
                這一次，你會選擇怎樣的人生道路呢？
            </p>
        `,
        choices: [
            {
                text: "🌟 開始全新的人生體驗",
                description: "（帶著前世的智慧，探索新的可能）",
                effects: {},
                nextScene: 'intro'
            }
        ]
    }
};

// 游戏实例
let game = new GameState();
let typingSkipRequested = false; // 打字機跳過請求標誌

//（已改為逐段人工改寫第二人稱，移除機械轉換）

// 显示故事场景
function showScene(sceneName) {
    const scene = storyScenes[sceneName];
    if (!scene) return;

    game.currentScene = sceneName;

    // 重置打字機跳過標誌，確保新場景自動開始
    typingSkipRequested = false;

    // 更新章节信息
    if (scene.chapter && scene.chapter !== game.currentChapter) {
        game.updateChapter(scene.chapter, game.getChapterTitle(scene.chapter));
    }

                // 先隱藏選項
    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';
    choicesContainer.classList.add('hidden');

    // 清理之前的內心獨白
    const existingVoices = document.getElementById('choiceInnerVoices');
    if (existingVoices) {
        existingVoices.remove();
    }

    // 設置故事内容到隱藏狀態，然後開始打字機效果
    const storyContainer = document.getElementById('storyContent');
    storyContainer.innerHTML = scene.content;
    storyContainer.style.visibility = 'hidden'; // 先完全隱藏，直到打字開始

    applyStoryTypewriter(() => {
        const handledInnerVoices = applyInnerVoiceTypewriterIfPresent(() => {
            renderChoiceInnerVoices(scene, () => {
                renderChoicesForScene(scene);
            });
        });
        if (!handledInnerVoices) {
            renderChoiceInnerVoices(scene, () => {
                renderChoicesForScene(scene);
            });
        }
    });

    // 处理结局
    if (scene.isEnding && scene.endingId) {
        game.unlockEnding(scene.endingId, scene.title, scene.content.substring(0, 100) + '...');

        // 更新最终数值显示
        if (sceneName === 'ending_transcendence') {
            setTimeout(() => {
                updateFinalStats();
            }, 100);
        }
    }

    // 添加学到的词汇
    if (scene.learnedWords) {
        scene.learnedWords.forEach(word => {
            game.addLearnedWord(word.word, word.meaning);
        });
    }

    // 更新进度
    updateSceneProgress(sceneName);
}

// 渲染選項內心獨白
function renderChoiceInnerVoices(scene, callback) {
    if (!scene.choices || scene.choices.length === 0) {
        callback();
        return;
    }

    // 提取所有選項的內心獨白
    const innerVoices = [];
    scene.choices.forEach(choice => {
        if (choice.description && choice.effects) {
            // 移除括號，提取內心獨白文字
            const innerText = choice.description.replace(/[（）()]/g, '').trim();
            if (innerText) {
                // 找到effects中賦值最高的思想內閣
                const maxEffect = Math.max(...Object.values(choice.effects).map(Math.abs));
                // 如果有多個相同的最高值，優先選擇正值，然後按照重要性順序
                const voicePriority = ['filialPiety', 'seekingDao', 'loyalty', 'tenderness', 'masterTraining'];
                const maxEffectVoices = Object.keys(choice.effects).filter(
                    voice => Math.abs(choice.effects[voice]) === maxEffect
                );

                let dominantVoice;
                if (maxEffectVoices.length === 1) {
                    dominantVoice = maxEffectVoices[0];
                } else {
                    // 優先選擇正值
                    const positiveVoices = maxEffectVoices.filter(voice => choice.effects[voice] > 0);
                    const targetVoices = positiveVoices.length > 0 ? positiveVoices : maxEffectVoices;

                    // 按優先級選擇
                    dominantVoice = voicePriority.find(voice => targetVoices.includes(voice)) || targetVoices[0];
                }

                innerVoices.push({
                    text: innerText,
                    voice: dominantVoice,
                    value: choice.effects[dominantVoice]
                });
            }
        }
    });

    if (innerVoices.length === 0) {
        callback();
        return;
    }

    // 創建內心獨白容器
    const voiceContainer = document.createElement('div');
    voiceContainer.className = 'mt-6 space-y-3';
    voiceContainer.id = 'choiceInnerVoices';

    // 添加標題
    const titleElement = document.createElement('h4');
    titleElement.className = 'font-semibold text-gray-800 dark:text-gray-200 mb-3';
    titleElement.innerHTML = '💭 內心的聲音在響起...';
    voiceContainer.appendChild(titleElement);

    // 思想內閣配置
    const voiceConfig = {
        filialPiety: { icon: '💝', name: '孝女之心', color: 'pink' },
        masterTraining: { icon: '⚡', name: '師門之訓', color: 'gray' },
        tenderness: { icon: '💕', name: '柔情之意', color: 'purple' },
        loyalty: { icon: '⚔️', name: '忠義之念', color: 'red' },
        seekingDao: { icon: '🌊', name: '山水求道', color: 'blue' }
    };

    // 為每個內心聲音創建元素
    innerVoices.forEach((voice, index) => {
        const config = voiceConfig[voice.voice];
        if (config) {
            const voiceElement = document.createElement('div');
            voiceElement.className = `bg-${config.color}-50 dark:bg-${config.color}-900/20 border-l-4 border-${config.color}-400 p-3 rounded-r-lg voice-text-hidden`;
            voiceElement.innerHTML = `
                <div class="flex items-start space-x-2">
                    <span class="text-lg">${config.icon}</span>
                    <div>
                        <span class="font-semibold text-${config.color}-600 dark:text-${config.color}-400">${config.name}:</span>
                        <span class="ml-2 text-sm italic voice-text">"${voice.text}"</span>
                    </div>
                </div>
            `;
            voiceContainer.appendChild(voiceElement);
        }
    });

    // 插入到故事容器後
    const storyContainer = document.getElementById('storyContent');
    storyContainer.appendChild(voiceContainer);

    // 依次播放打字機效果
    let currentIndex = 0;
    function typeNextVoice() {
        if (currentIndex >= innerVoices.length) {
            callback();
            return;
        }

        const voiceElement = voiceContainer.children[currentIndex + 1]; // +1 因為第一個是標題
        const textElement = voiceElement.querySelector('.voice-text');
        const originalText = innerVoices[currentIndex].text;

        voiceElement.classList.remove('voice-text-hidden');
        textElement.textContent = '"';

        typeText(textElement, `"${originalText}"`, 30, () => {
            currentIndex++;
            setTimeout(typeNextVoice, 500);
        });
    }

    setTimeout(typeNextVoice, 300);
}

// 渲染當前場景的選項
function renderChoicesForScene(scene) {
    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';
    if (scene.choices && scene.choices.length > 0) {
        scene.choices.forEach((choice, index) => {
            const choiceElement = document.createElement('div');

            let borderColor = 'border-gray-200 dark:border-gray-600';
            if (choice.effects) {
                const maxEffect = Math.max(...Object.values(choice.effects).map(Math.abs));
                if (maxEffect >= 25) {
                    borderColor = 'border-primary';
                } else if (maxEffect >= 15) {
                    borderColor = 'border-blue-300 dark:border-blue-600';
                }
            }

            choiceElement.className = `choice-hover ${borderColor} rounded-lg p-4 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-lg`;

            const choiceText = choice.text;
            choiceElement.innerHTML = `
                <div class="flex items-start space-x-3">
                    <span class="text-2xl font-bold text-primary">${index + 1}</span>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-800 dark:text-gray-200 mb-1">${choiceText}</p>
                        ${choice.effects ? `<div class="mt-2 text-xs text-primary">${getEffectDescription(choice.effects)}</div>` : ''}
                    </div>
                </div>
            `;

            choiceElement.addEventListener('click', () => makeChoice(choice));
            choicesContainer.appendChild(choiceElement);
        });

        // 顯示選項容器
        choicesContainer.classList.remove('hidden');
    }
}

// 內心聲音：移除標題並逐條打字顯示，完成後再顯示選項
function applyInnerVoiceTypewriterIfPresent(onComplete) {
    const storyRoot = document.getElementById('storyContent');
    if (!storyRoot) return false;

    const choicesContainer = document.getElementById('choicesContainer');

    // 1) 先尋找帶有標題「你心底的聲音」的區塊
    const headers = Array.from(storyRoot.querySelectorAll('h4'))
        .filter(h => h.textContent && h.textContent.includes('你心底的聲音'));

    const voiceLines = [];
    if (headers.length > 0) {
        headers.forEach(h => {
            const parent = h.parentElement;
            if (parent) {
                parent.removeChild(h); // 去掉標題
                const list = parent.querySelector('.space-y-2, .space-y-2.text-sm');
                if (list) {
                    voiceLines.push(...Array.from(list.querySelectorAll('p')));
                }
            }
        });
    }

    // 2) 若沒有標題樣式，則通用搜尋：匹配含有聲音標籤 + <em> 的段落
    if (voiceLines.length === 0) {
        const labelKeywords = ['孝女之心', '師門之訓', '柔情之意', '忠義之念', '山水求道'];
        const paragraphs = Array.from(storyRoot.querySelectorAll('p'));
        paragraphs.forEach(p => {
            const spans = Array.from(p.querySelectorAll('span'));
            const hasLabel = spans.some(s => labelKeywords.some(k => (s.textContent || '').includes(k)));
            const hasEm = !!p.querySelector('em');
            if (hasLabel && hasEm) {
                voiceLines.push(p);
            }
        });
    }

    if (voiceLines.length === 0) return false; // 本場景沒有可打字的內心聲音

    // 隱藏選項直到打字完成
    if (choicesContainer) {
        choicesContainer.classList.add('hidden');
    }

    // 打字中狀態，支援跳過
    document.body.dataset.typingActive = '1';

    // 備份內心聲音行的原始內容，並隱藏其外層樣式框（避免空框先出現）
    const originalVoiceContents = new Map();
    const voiceBoxByP = new Map();
    voiceLines.forEach(p => {
        // 提取關鍵信息
        const labelKeywords = ['孝女之心', '師門之訓', '柔情之意', '忠義之念', '山水求道'];
        const labelSpan = Array.from(p.querySelectorAll('span')).find(s => labelKeywords.some(k => (s.textContent || '').includes(k))) || p.querySelector('span');
        const em = p.querySelector('em');
        const text = em ? em.textContent : (p.textContent || '');

        originalVoiceContents.set(p, { labelSpan: labelSpan ? labelSpan.cloneNode(true) : null, text, hasEm: !!em });
        p.innerHTML = ''; // 立即清空避免閃爍
        p.style.visibility = 'hidden';

        // 找到可能的外層樣式框（背景/邊框容器），先隱藏，待打字時再顯示
        let box = p.closest('div');
        while (box && box !== storyRoot) {
            const className = box.className || '';
            if (className.includes('border-l-4') || className.includes('bg-') || className.includes('bg-gradient')) {
                voiceBoxByP.set(p, { box, originalDisplay: box.style.display });
                box.style.display = 'none';
                break;
            }
            box = box.parentElement;
        }
    });

    // 打字函式：使用備份的內容進行打字
    const typeLine = (p, done) => {
        // 顯示外層樣式框
        const boxInfo = voiceBoxByP.get(p);
        if (boxInfo && boxInfo.box) {
            const restore = boxInfo.originalDisplay || boxInfo.box.dataset.voiceBoxOriginalDisplay || '';
            boxInfo.box.style.display = restore;
        }

        p.style.visibility = 'visible';
        const backup = originalVoiceContents.get(p);
        if (!backup) { done(); return; }

        if (backup.labelSpan) {
            p.appendChild(backup.labelSpan);
            p.appendChild(document.createTextNode(' '));
        }
        const target = document.createElement(backup.hasEm ? 'em' : 'span');
        p.appendChild(target);

        // 若已請求跳過，直接填充
        if (typingSkipRequested) {
            target.textContent = backup.text;
            done();
            return;
        }

        let i = 0;
        const speed = 60; // 每字毫秒（便於閱讀）
        const timer = setInterval(() => {
            if (typingSkipRequested) {
                clearInterval(timer);
                target.textContent = backup.text;
                done();
                return;
            }
            target.textContent += backup.text.charAt(i);
            i++;
            if (i >= backup.text.length) {
                clearInterval(timer);
                setTimeout(done, 900); // 每行結束停頓
            }
        }, speed);
    };

    // 將剩餘所有行立即展開（用於跳過）
    const revealAllRemaining = (startIndex) => {
        for (let k = startIndex; k < voiceLines.length; k++) {
            const p = voiceLines[k];
            const backup = originalVoiceContents.get(p);
            if (!backup) continue;

            const boxInfo = voiceBoxByP.get(p);
            if (boxInfo && boxInfo.box) {
                const restore = boxInfo.originalDisplay || boxInfo.box.dataset.voiceBoxOriginalDisplay || '';
                boxInfo.box.style.display = restore;
            }

            p.style.visibility = 'visible';
            p.innerHTML = '';
            if (backup.labelSpan) {
                p.appendChild(backup.labelSpan.cloneNode(true));
                p.appendChild(document.createTextNode(' '));
            }
            const target = document.createElement(backup.hasEm ? 'em' : 'span');
            target.textContent = backup.text;
            p.appendChild(target);
        }
    };

    let idx = 0;
    const next = () => {
        if (idx >= voiceLines.length) {
            delete document.body.dataset.typingActive;
            if (typeof onComplete === 'function') onComplete();
            if (choicesContainer) choicesContainer.classList.remove('hidden');
            return;
        }
        if (typingSkipRequested) {
            revealAllRemaining(idx);
            delete document.body.dataset.typingActive;
            if (typeof onComplete === 'function') onComplete();
            if (choicesContainer) choicesContainer.classList.remove('hidden');
            return;
        }
        typeLine(voiceLines[idx], () => {
            idx++;
            next();
        });
    };

    setTimeout(next, 150);
    return true;
}

// 判斷段落是否為「內心聲音」專用（含標籤＋em）
function isVoiceParagraph(p) {
    const labelKeywords = ['孝女之心', '師門之訓', '柔情之意', '忠義之念', '山水求道'];
    const spans = Array.from(p.querySelectorAll('span'));
    const hasLabel = spans.some(s => labelKeywords.some(k => (s.textContent || '').includes(k)));
    return hasLabel && !!p.querySelector('em');
}

// 劇情文字打字機（對一般段落與引文，保留原有標籤結構）
function applyStoryTypewriter(onComplete) {
    const storyRoot = document.getElementById('storyContent');
    if (!storyRoot) { if (typeof onComplete === 'function') onComplete(); return; }

    // 找到所有內心聲音段落（p）
    const allParagraphs = Array.from(storyRoot.querySelectorAll('p'));
    const voiceParagraphs = allParagraphs.filter(isVoiceParagraph);

    // 需要打字的普通節點（排除內心聲音）；僅處理 p 和 blockquote，避免誤處理包含內心聲音的容器 div
    const nodes = Array.from(storyRoot.querySelectorAll('p, blockquote'))
        .filter(el => !isVoiceParagraph(el));

    if (nodes.length === 0) { if (typeof onComplete === 'function') onComplete(); return; }

    document.body.dataset.typingActive = '1';
    typingSkipRequested = false;

    // 先隱藏所有普通節點與內心聲音段落，避免在容器顯示時閃現
    nodes.forEach(node => { node.style.visibility = 'hidden'; });
    voiceParagraphs.forEach(p => {
        p.style.visibility = 'hidden';
        // 同步隱藏內心聲音的外層樣式容器，並保存原display供稍後恢復
        let box = p.closest('div');
        while (box && box !== storyRoot) {
            const className = box.className || '';
            if (className.includes('border-l-4') || className.includes('bg-') || className.includes('bg-gradient')) {
                if (!box.dataset.voiceBoxOriginalDisplay) {
                    box.dataset.voiceBoxOriginalDisplay = box.style.display || '';
                }
                box.style.display = 'none';
                break;
            }
            box = box.parentElement;
        }
    });

    // 最後再顯示容器
    storyRoot.style.visibility = 'visible';

    // 通用遞迴打字：逐節點（文字/元素）輸出
    function typeNodeChildrenSequential(childNodes, parent, done) {
        let i = 0;
        const next = () => {
            if (i >= childNodes.length) { done(); return; }
            const child = childNodes[i++];
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent || '';
                const span = document.createElement('span');
                parent.appendChild(span);
                const speed = typingSkipRequested ? 0 : 40;
                if (speed === 0) {
                    span.textContent = text;
                    next();
                } else {
                    let j = 0;
                    const timer = setInterval(() => {
                        if (typingSkipRequested) {
                            clearInterval(timer);
                            span.textContent = text;
                            next();
                            return;
                        }
                        span.textContent += text.charAt(j++);
                        if (j >= text.length) {
                            clearInterval(timer);
                            next();
                        }
                    }, speed);
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const clone = child.cloneNode(false);
                parent.appendChild(clone);
                typeNodeChildrenSequential(Array.from(child.childNodes), clone, next);
            } else {
                next();
            }
        };
        next();
    }

    // 備份所有節點的原始內容，然後清空（僅普通節點）
    const originalContents = new Map();
    nodes.forEach(el => {
        originalContents.set(el, Array.from(el.childNodes));
        el.innerHTML = ''; // 立即清空，避免閃爍
    });

    // 順序處理每個段落/引文
    let idx = 0;
    const renderNext = () => {
        if (idx >= nodes.length) {
            delete document.body.dataset.typingActive;
            if (typeof onComplete === 'function') onComplete();
            return;
        }
        const el = nodes[idx++];
        const originalChildren = originalContents.get(el) || [];
        el.style.visibility = 'visible';
        typeNodeChildrenSequential(originalChildren, el, () => {
            const pause = typingSkipRequested ? 0 : 200; // 段落間短暫停頓
            setTimeout(renderNext, pause);
        });
    };

    setTimeout(renderNext, 150);
}

// 更新场景进度
function updateSceneProgress(sceneName) {
    const progressMap = {
        // 第一章
        'intro': { chapter: 10, global: 5 },
        'curiosity': { chapter: 25, global: 8 },
        'hideByFather': { chapter: 25, global: 8 },
        'braveFace': { chapter: 25, global: 8 },
        'deepThinking': { chapter: 40, global: 12 },
        'worryForFather': { chapter: 40, global: 12 },
        'finalChoice': { chapter: 75, global: 15 },
        'chapter1_stayHome': { chapter: 100, global: 20 },
        'chapter1_postpone': { chapter: 100, global: 20 },

        // 第二章
        'chapter2_start': { chapter: 15, global: 25 },
        'chapter2_alternative': { chapter: 15, global: 25 },
        'chapter2_thinking': { chapter: 15, global: 25 },
        'chapter2_homesick': { chapter: 30, global: 30 },
        'chapter2_adapt': { chapter: 30, global: 30 },
        'chapter2_observe': { chapter: 30, global: 30 },
        'chapter2_training1': { chapter: 45, global: 33 },
        'chapter2_write_letter': { chapter: 35, global: 31 },
        'chapter2_moral_doubt': { chapter: 45, global: 33 },
        'chapter2_reluctant_killer': { chapter: 45, global: 33 },
        'chapter2_regret': { chapter: 35, global: 31 },
        'chapter2_family_focused': { chapter: 35, global: 31 },
        'chapter2_self_study': { chapter: 40, global: 32 },
        'chapter2_compromise': { chapter: 25, global: 27 },
        'chapter2_conditional': { chapter: 25, global: 27 },
        'chapter2_still_confused': { chapter: 20, global: 26 },
        'chapter2_hidden_thoughts': { chapter: 40, global: 32 },
        'chapter2_connect_sisters': { chapter: 40, global: 32 },
        'chapter2_surrender_to_master': { chapter: 40, global: 32 },
        'chapter2_first_mission': { chapter: 60, global: 35 },
        'chapter2_hesitate': { chapter: 75, global: 38 },
        'chapter2_cold_killer': { chapter: 80, global: 38 },
        'chapter2_hardened_heart': { chapter: 90, global: 39 },
        'chapter2_hidden_resistance': { chapter: 90, global: 39 },
        'chapter2_moral_awakening': { chapter: 100, global: 40 },

        // 第三章
        'chapter3_return_home': { chapter: 20, global: 45 },
        'chapter3_tell_truth': { chapter: 50, global: 50 },
        'chapter3_hide_truth': { chapter: 50, global: 50 },
        'chapter3_marriage_choice': { chapter: 80, global: 55 },
        'chapter3_true_love': { chapter: 100, global: 60 },
        'chapter3_partial_truth': { chapter: 55, global: 50 },
        'chapter3_repair_relationship': { chapter: 60, global: 52 },
        'chapter3_accept_distance': { chapter: 60, global: 52 },
        'chapter3_night_activities': { chapter: 65, global: 53 },
        'chapter3_pretend_normal': { chapter: 65, global: 53 },
        'chapter3_secret_training': { chapter: 65, global: 53 },
        'chapter3_consider_truth': { chapter: 55, global: 50 },
        'chapter3_marriage_cover': { chapter: 100, global: 60 },
        'chapter3_complex_marriage': { chapter: 90, global: 58 },

        // 第四章
        'chapter4_start': { chapter: 25, global: 65 },
        'chapter4_loyal_service': { chapter: 100, global: 70 },
        'chapter4_family_first': { chapter: 80, global: 68 },
        'chapter4_cautious_approach': { chapter: 60, global: 67 },

        // 第五章
        'chapter5_mission': { chapter: 20, global: 75 },
        'chapter5_investigate': { chapter: 50, global: 78 },
        'chapter5_impressed': { chapter: 80, global: 82 },
        'chapter5_switch_loyalty': { chapter: 100, global: 85 },
        'chapter5_execute_mission': { chapter: 40, global: 77 },
        'chapter5_consider_refusal': { chapter: 35, global: 76 },
        'chapter5_loyalty_question': { chapter: 65, global: 80 },
        'chapter5_neutrality': { chapter: 85, global: 84 },

        // 第六章
        'chapter6_prepare_battle': { chapter: 30, global: 88 },
        'chapter6_battle_jjing': { chapter: 60, global: 92 },
        'chapter6_battle_kongkong': { chapter: 100, global: 95 },
        'chapter6_direct_battle': { chapter: 80, global: 94 },

        // 第七章
        'chapter7_enlightenment': { chapter: 50, global: 98 },
        'chapter7_deeper_loyalty': { chapter: 70, global: 98 },
        'chapter7_final_choice': { chapter: 90, global: 99 },
        'ending_transcendence': { chapter: 100, global: 100 }
    };

    const progress = progressMap[sceneName];
    if (progress) {
        game.updateProgress(progress.chapter, progress.global);
    }
}

// 处理选择
function makeChoice(choice) {
    // 应用效果
    if (choice.effects) {
        Object.keys(choice.effects).forEach(voiceName => {
            game.updateVoice(voiceName, choice.effects[voiceName]);
        });
    }

    // 添加学到的词汇
    if (choice.learnedWords) {
        choice.learnedWords.forEach(word => {
            game.addLearnedWord(word.word, word.meaning);
        });
    }



    // 延迟跳转到下一个场景（縮短等待時間，提升流暢度）
    setTimeout(() => {
        if (choice.nextScene === 'restart') {
            restartGame();
        } else if (choice.nextScene === 'restart_plus') {
            restartGamePlus();
        } else if (choice.nextScene === 'show_endings') {
            showEndingsModal();
        } else {
            showScene(choice.nextScene);
        }
    }, 150);
}





// 获取效果描述
function getEffectDescription(effects) {
    const descriptions = [];
    Object.keys(effects).forEach(voiceName => {
        const change = effects[voiceName];
        if (Math.abs(change) >= 5) {
            const voiceNames = {
                filialPiety: '孝女之心',
                masterTraining: '師門之訓',
                tenderness: '柔情之意',
                loyalty: '忠義之念',
                seekingDao: '山水求道'
            };
            descriptions.push(`${voiceNames[voiceName]} ${change > 0 ? '+' : ''}${change}`);
        }
    });
    return descriptions.join(', ');
}

// 重启游戏
function restartGame() {
    game = new GameState();
    game.updateVoiceDisplay();
    game.updateLearnedWordsDisplay();
    game.updateAchievementsDisplay();
    game.updateEndingsDisplay();
    showScene('intro');
}

// 新游戏+ 重启
function restartGamePlus() {
    const oldEndings = [...game.unlockedEndings];
    const oldAchievements = [...game.achievements];

    game = new GameState();
    game.unlockedEndings = oldEndings;
    game.achievements = oldAchievements;

    game.updateVoiceDisplay();
    game.updateLearnedWordsDisplay();
    game.updateAchievementsDisplay();
    game.updateEndingsDisplay();
    showScene('intro');
}

// 显示结局图鉴模态框
function showEndingsModal() {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    title.textContent = '結局圖鑑';

    const allEndings = [
        { id: 'transcendence_sage', name: '超脫聖者', description: '達到道家理想境界的原文結局' },
        { id: 'family_warmth', name: '溫暖的家', description: '選擇家庭的第一章結局' },
        { id: 'wise_delay', name: '智慧的延遲', description: '深思熟慮的第一章結局' },
        { id: 'loyal_minister', name: '一代名臣', description: '忠義之念主導的結局' },
        { id: 'happy_family', name: '平凡幸福', description: '柔情之意主導的結局' },
        { id: 'clan_revival', name: '聶氏中興', description: '孝女之心主導的結局' },
        { id: 'cold_weapon', name: '無情殺器', description: '師門之訓主導的悲劇結局' },
        // 更多結局...
    ];

    const unlockedIds = game.unlockedEndings.map(e => e.id);

    const endingsHtml = `
        <div class="space-y-4">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
                已解鎖 ${game.unlockedEndings.length}/${allEndings.length} 個結局
            </p>
            <div class="grid gap-3">
                ${allEndings.map(ending => {
                    const unlocked = unlockedIds.includes(ending.id);
                    return `
                        <div class="border rounded-lg p-3 ${unlocked ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 bg-gray-50 dark:bg-gray-700'}">
                            <div class="flex items-center justify-between">
                                <h4 class="font-semibold ${unlocked ? 'text-green-800 dark:text-green-200' : 'text-gray-500'}">${unlocked ? ending.name : '???'}</h4>
                                <span class="text-sm ${unlocked ? 'text-green-600' : 'text-gray-400'}">${unlocked ? '✓ 已解鎖' : '🔒 未解鎖'}</span>
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${unlocked ? ending.description : '完成特定選擇路線後解鎖'}</p>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="mt-6 pt-4 border-t">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    💡 提示：嘗試不同的選擇組合可以解鎖更多結局
                </p>
            </div>
        </div>
    `;
    content.innerHTML = endingsHtml;

    modal.classList.remove('hidden');
}

// 显示帮助模态框
function showHelpModal() {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    title.textContent = '遊戲說明';
    const helpHtml = `
        <div class="space-y-4 text-gray-600 dark:text-gray-300">
            <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">🎮 遊戲玩法</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                    <li>通過選擇不同的選項來影響你的性格發展</li>
                    <li>每個選擇會影響五種內心聲音的強弱</li>
                    <li>不同的聲音組合會導致不同的結局</li>
                    <li>一共有18種不同的結局等你探索</li>
                </ul>
            </div>

            <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">💭 思想內閣系統</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                    <li>💝 孝女之心：家族責任感和傳統女性美德</li>
                    <li>⚡ 師門之訓：師父的控制和冷酷的殺手訓練</li>
                    <li>💕 柔情之意：對愛情和親密關係的渴望</li>
                    <li>⚔️ 忠義之念：對主君和義理的堅持</li>
                    <li>🌊 山水求道：對超脫世俗的精神追求</li>
                </ul>
            </div>

            <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">📚 學習功能</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                    <li>鼠標懸停在藍色詞彙上可查看釋義</li>
                    <li>每個章節會學習到相關的文言文詞彙</li>
                    <li>完成特定條件可以獲得成就獎勵</li>
                    <li>詞彙筆記會記錄所有學過的詞彙</li>
                </ul>
            </div>

            <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">🏆 進階功能</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                    <li>可以儲存和載入遊戲進度</li>
                    <li>新遊戲+模式保留已解鎖內容</li>
                    <li>結局圖鑑追蹤解鎖進度</li>
                    <li>成就系統記錄遊戲里程碑</li>
                </ul>
            </div>
        </div>
    `;
    content.innerHTML = helpHtml;

    modal.classList.remove('hidden');
}

// 事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化遊戲
    game.updateVoiceDisplay();
    showScene('intro');

    // 點擊空白處跳過所有打字機動畫
    document.addEventListener('click', (e) => {
        // 僅當點擊非按鈕/非選項/非連結區域時生效
        const target = e.target;
        const isInteractive = target.closest('button, a, #choicesContainer, .choice-hover');
        if (!isInteractive) {
            if (document.body.dataset.typingActive === '1') {
                typingSkipRequested = true;
            }
        }
    });

    // 按鈕事件
    document.getElementById('saveGameBtn').addEventListener('click', () => game.saveGame());
    document.getElementById('loadGameBtn').addEventListener('click', () => {
        if (game.loadGame()) {
            showScene(game.currentScene);
        } else {
            game.createFloatingMessage('❌ 沒有找到存檔');
        }
    });
    document.getElementById('restartBtn').addEventListener('click', () => {
        if (confirm('確定要重新開始遊戲嗎？當前進度將會丟失。')) {
            restartGame();
        }
    });
    document.getElementById('endingsBtn').addEventListener('click', showEndingsModal);
    document.getElementById('helpBtn').addEventListener('click', showHelpModal);

    // 模態框關閉
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('modalOverlay').classList.add('hidden');
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            document.getElementById('modalOverlay').classList.add('hidden');
        }
    });
});

// 更新最終數值顯示
function updateFinalStats() {
    const finalSeekingDao = document.getElementById('finalSeekingDao');
    const finalLoyalty = document.getElementById('finalLoyalty');
    const finalFilialPiety = document.getElementById('finalFilialPiety');
    const finalTenderness = document.getElementById('finalTenderness');
    const finalMasterTraining = document.getElementById('finalMasterTraining');

    if (finalSeekingDao) finalSeekingDao.textContent = `${game.voices.seekingDao}/100`;
    if (finalLoyalty) finalLoyalty.textContent = `${game.voices.loyalty}/100`;
    if (finalFilialPiety) finalFilialPiety.textContent = `${game.voices.filialPiety}/100`;
    if (finalTenderness) finalTenderness.textContent = `${game.voices.tenderness}/100`;
    if (finalMasterTraining) finalMasterTraining.textContent = `${game.voices.masterTraining}/100`;
}

// 自定義確認對話框（替代被禁用的confirm）
function showConfirmDialog(message, onConfirm) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    title.textContent = '確認';
    content.innerHTML = `
        <div class="text-center">
            <p class="text-gray-700 dark:text-gray-300 mb-6">${message}</p>
            <div class="flex justify-center space-x-4">
                <button id="cancelBtn" class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">取消</button>
                <button id="confirmBtn" class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">確認</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    document.getElementById('cancelBtn').onclick = () => {
        modal.classList.add('hidden');
    };

    document.getElementById('confirmBtn').onclick = () => {
        modal.classList.add('hidden');
        onConfirm();
    };
}
