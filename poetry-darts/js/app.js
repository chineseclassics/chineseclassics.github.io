import { createApp, ref, onMounted, computed, watch } from 'vue';
import { poemData } from './data/poems.js';
import { GameScene } from './core/scene.js';
import { GestureManager } from './core/gesture.js';
import { AudioManager } from './core/audio.js';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/68e37887-dcbc-4a22-af54-b314b9cce5eb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        location: 'app.js:top',
        message: 'app.js module loading',
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'initial-debug',
        hypothesisId: '1'
    })
}).catch(() => {});
// #endregion

const app = createApp({
    setup() {
        // 狀態變量
        const score = ref(0);
        const combo = ref(0);
        const gameMode = ref('fill'); // 'fill' or 'emoji'
        const gameState = ref('IDLE'); // 'IDLE', 'ACTIVE', 'HOLDING', 'FLYING', 'RESULT'
        const isStarted = ref(false);
        const isHandDetected = ref(false);
        const isHolding = ref(false);
        const wakeProgress = ref(0);
        const feedbackMsg = ref('');
        const showResult = ref(false);
        const isCorrect = ref(false);
        
        // 當前題目數據
        const currentPoem = ref(null);
        const displayVerse = ref([]);
        const targetAnswer = ref('');
        const foundEmojis = ref([]);
        
        // 手勢準心位置
        const cursorX = ref(0);
        const cursorY = ref(0);
        
        // 當前瞄準的目標（用於 UI 顯示）
        const currentAimTarget = ref(null);
        
        // 核心組件實例
        let scene = null;
        let gesture = null;
        let audio = null;
        
        // DOM 引用
        const webcam = ref(null);
        const outputCanvas = ref(null);
        const canvasContainer = ref(null);

        // 初始化
        onMounted(() => {
            initManagers();
        });

        const initManagers = () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/68e37887-dcbc-4a22-af54-b314b9cce5eb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: 'app.js:initManagers',
                    message: 'initManagers started',
                    data: { canvas_ref: !!canvasContainer.value },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'initial-debug',
                    hypothesisId: 'B'
                })
            }).catch(() => {});
            // #endregion

            // 初始化音效
            audio = new AudioManager();
            
            try {
                // 初始化 3D 場景
                scene = new GameScene(canvasContainer.value, {
                    onHit: handleHit,
                    onMiss: handleMiss
                });
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/68e37887-dcbc-4a22-af54-b314b9cce5eb', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        location: 'app.js:initManagers',
                        message: 'GameScene created',
                        data: { scene_exists: !!scene },
                        timestamp: Date.now(),
                        sessionId: 'debug-session',
                        runId: 'initial-debug',
                        hypothesisId: 'B'
                    })
                }).catch(() => {});
                // #endregion
            } catch (err) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/68e37887-dcbc-4a22-af54-b314b9cce5eb', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        location: 'app.js:initManagers',
                        message: 'GameScene creation failed',
                        data: { error: err.message },
                        timestamp: Date.now(),
                        sessionId: 'debug-session',
                        runId: 'initial-debug',
                        hypothesisId: 'B'
                    })
                }).catch(() => {});
                // #endregion
            }

            // 初始化手勢識別
            gesture = new GestureManager(webcam.value, outputCanvas.value, {
                onResults: handleGestureResults,
                onWake: (progress) => {
                    wakeProgress.value = progress;
                    if (progress >= 100 && gameState.value === 'IDLE') {
                        setGameState('ACTIVE');
                        audio.play('wake');
                    }
                }
            });
        };

        // 開始遊戲
        const startGame = () => {
            isStarted.value = true;
            nextQuestion();
            gesture.start();
            scene.animate();
        };

        // 切換題庫
        const nextQuestion = () => {
            showResult.value = false;
            feedbackMsg.value = '';
            foundEmojis.value = [];
            
            // 隨機選題
            const index = Math.floor(Math.random() * poemData.length);
            currentPoem.value = poemData[index];
            
            if (gameMode.value === 'fill') {
                prepareFillMode();
            } else {
                prepareEmojiMode();
            }
            
            setGameState('ACTIVE');
            scene.resetDart();
        };

        // 準備填空模式
        const prepareFillMode = () => {
            const verse = currentPoem.value.verse;
            // 隨機挖掉一個中文字（避開標點）
            const chars = Array.from(verse);
            const chineseChars = chars.map((c, i) => ({ char: c, index: i }))
                                    .filter(item => /[\u4e00-\u9fa5]/.test(item.char));
            
            const target = chineseChars[Math.floor(Math.random() * chineseChars.length)];
            targetAnswer.value = target.char;
            
            const display = [...chars];
            display[target.index] = '▢';
            displayVerse.value = display;
            
            // 獲取干擾項
            const options = generateFillOptions(target.char);
            scene.updateTarget(options, 'text');
        };

        // 準備意象模式
        const prepareEmojiMode = () => {
            const correctOnes = currentPoem.value.correctEmojis;
            const allOptions = generateEmojiOptions(correctOnes);
            scene.updateTarget(allOptions, 'emoji');
        };

        // 生成干擾字
        const generateFillOptions = (correctChar) => {
            // 這裡可以從一個常用字庫中隨機抓取，或者根據當前字生成形近/義近字
            // 為了簡化，我們先隨機抓幾個詩句中的字
            const distractors = ['雲', '山', '水', '月', '花', '人', '天', '歸', '去', '來']
                                .filter(c => c !== correctChar)
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 5);
            
            return [correctChar, ...distractors].sort(() => Math.random() - 0.5);
        };

        // 生成干擾 Emoji
        const generateEmojiOptions = (correctEmojis) => {
            const allEmojis = ["🌸", "🌙", "🌊", "⛰️", "🌬️", "🔥", "🍂", "❄️", "🚣", "🏯", "🐦", "🏡", "🍷", "🕯️", "🐎", "🦋", "🧪", "🏹", "🔔", "🧶"];
            const distractors = allEmojis.filter(e => !correctEmojis.includes(e))
                                        .sort(() => Math.random() - 0.5)
                                        .slice(0, 6 - correctEmojis.length);
            
            return [...correctEmojis, ...distractors].sort(() => Math.random() - 0.5);
        };

        // 結果頁面手勢確認計數器
        let resultPalmCount = 0;
        const resultPalmThreshold = 15; // 需要連續 15 幀（約 0.5 秒）

        // 處理手勢結果
        const handleGestureResults = (res) => {
            isHandDetected.value = res.detected;
            cursorX.value = res.screenX;
            cursorY.value = res.screenY;
            
            if (!res.detected) {
                resultPalmCount = 0;
                return;
            }

            // 結果頁面：張開手掌繼續下一題（需要持續一段時間）
            if (gameState.value === 'RESULT' && showResult.value) {
                if (res.isPalmOpen) {
                    resultPalmCount++;
                    if (resultPalmCount >= resultPalmThreshold) {
                        resultPalmCount = 0;
                        nextQuestion();
                    }
                } else {
                    resultPalmCount = Math.max(0, resultPalmCount - 2);
                }
                return;
            }

            // 狀態機處理
            if (gameState.value === 'ACTIVE' || gameState.value === 'HOLDING') {
                const worldPos = res.worldPos;
                
                // 1. 抓取判定（ACTIVE 狀態）
                if (gameState.value === 'ACTIVE') {
                    // 檢查手部是否在抓取範圍內
                    const inRange = scene.isInGrabRange(worldPos);
                    
                    if (inRange) {
                        feedbackMsg.value = '👌 捏合手指抓取飛鏢';
                        // 只有在捏取時才真正抓取
                        if (res.isPinching) {
                            grabDart(worldPos);
                        }
                    } else {
                        feedbackMsg.value = '✋ 將手移動到飛鏢區域';
                    }
                } 
                // 2. 持球與投擲（HOLDING 狀態）
                else if (gameState.value === 'HOLDING') {
                    scene.updateDartPosition(worldPos);
                    currentAimTarget.value = scene.currentTarget;
                    
                    // 投擲判定：必須檢測到手掌張開 + 有一定速度
                    if (res.isPalmOpen && res.speed > 3) {
                        releaseDart(res.velocity);
                    }
                }
            }
        };

        const grabDart = (handPos) => {
            setGameState('HOLDING');
            isHolding.value = true;
            scene.onGrabbed(handPos); // 抓取飛鏢，傳入手部位置
            audio.play('grab');
            feedbackMsg.value = '🎯 瞄準目標，張開手掌投擲！';
        };

        const releaseDart = (velocity) => {
            setGameState('FLYING');
            isHolding.value = false;
            currentAimTarget.value = null;
            scene.throwDart(velocity);
            audio.play('throw');
            feedbackMsg.value = '';
        };

        const handleHit = (hitValue) => {
            if (gameMode.value === 'fill') {
                if (hitValue === targetAnswer.value) {
                    processCorrect();
                } else {
                    processWrong();
                }
            } else {
                // 意象模式：需要射中三個
                if (currentPoem.value.correctEmojis.includes(hitValue) && !foundEmojis.value.includes(hitValue)) {
                    foundEmojis.value.push(hitValue);
                    audio.play('hit_correct');
                    
                    if (foundEmojis.value.length === 3) {
                        processCorrect();
                    } else {
                        feedbackMsg.value = `還差 ${3 - foundEmojis.value.length} 個意象！`;
                        setGameState('ACTIVE');
                        scene.resetDart();
                    }
                } else {
                    audio.play('hit_wrong');
                    feedbackMsg.value = '這個意象不對喔，再試試！';
                    setGameState('ACTIVE');
                    scene.resetDart();
                }
            }
        };

        const handleMiss = () => {
            feedbackMsg.value = '脫靶了，再來一次！';
            setGameState('ACTIVE');
            scene.resetDart();
        };

        const processCorrect = () => {
            score.value += 100 + (combo.value * 20);
            combo.value++;
            isCorrect.value = true;
            showResult.value = true;
            setGameState('RESULT');
            audio.play('success');
        };

        const processWrong = () => {
            combo.value = 0;
            isCorrect.value = false;
            showResult.value = true;
            setGameState('RESULT');
            audio.play('fail');
        };

        const switchMode = (mode) => {
            if (gameMode.value === mode) return;
            gameMode.value = mode;
            audio.play('click');
            nextQuestion();
        };

        const setGameState = (s) => {
            gameState.value = s;
        };

        return {
            score, combo, gameMode, gameState, isStarted, isHandDetected, isHolding,
            wakeProgress, feedbackMsg, showResult, isCorrect, currentPoem,
            displayVerse, foundEmojis, cursorX, cursorY, currentAimTarget,
            webcam, outputCanvas, canvasContainer,
            startGame, nextQuestion, switchMode
        };
    }
});

app.mount('#app');

