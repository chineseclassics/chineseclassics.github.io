/**
 * 記憶答題驗證系統
 * 處理記憶解鎖的答題驗證邏輯
 */

import { gameData } from './state.js';
import { getElements } from './core/elements.js';
import { showMemoryDialog } from './ui/dialogs.js';
import { showHint } from './ui/hints.js';
import { updateResourceDisplay } from './ui/display.js';
import { updateLists } from './ui/lists.js';

// 答題狀態
let quizState = {
    memory: null,
    currentQuestionIndex: 0,
    questions: [],
    startTime: null,
    wrongAnswers: 0, // 當前題目的答錯次數
    questionResults: [] // 每題的結果 { time: 秒數, wrongCount: 答錯次數, reward: 資源獎勵 }
};

/**
 * 顯示記憶答題界面
 * @param {Object} memory - 記憶對象
 */
export function showMemoryQuiz(memory) {
    console.log('showMemoryQuiz 被調用，記憶:', memory);
    console.log('記憶 ID:', memory.id);
    console.log('記憶回目:', memory.relatedChapter);
    
    // 載入問題數據
    loadQuestionsForMemory(memory).then(() => {
        console.log('問題載入完成，記憶問題:', memory.questions);
        console.log('問題數量:', memory.questions ? memory.questions.length : 0);
        
        if (!memory.questions || memory.questions.length === 0) {
            console.error('此記憶沒有問題數據！記憶 ID:', memory.id, '回目:', memory.relatedChapter);
            alert(`錯誤：此記憶（${memory.name}，第 ${memory.relatedChapter} 回）尚未準備問題數據。請檢查 reading-questions.json 文件。`);
            showHint('錯誤', '此記憶尚未準備問題數據', '❌');
            return;
        }

        // 初始化答題狀態
        quizState = {
            memory: memory,
            currentQuestionIndex: 0,
            questions: memory.questions,
            startTime: null,
            wrongAnswers: 0,
            questionResults: []
        };

        console.log('答題狀態已初始化:', quizState);

        // 顯示答題對話框
        const quizOverlay = document.getElementById('quiz-dialog-overlay');
        const quizDialog = document.getElementById('quiz-dialog');
        const quizTitle = document.getElementById('quiz-dialog-title');
        
        console.log('答題對話框元素檢查:', {
            quizOverlay: !!quizOverlay,
            quizDialog: !!quizDialog,
            quizTitle: !!quizTitle
        });
        
        if (!quizOverlay || !quizDialog || !quizTitle) {
            console.error('答題對話框元素不存在！');
            console.error('quizOverlay:', quizOverlay);
            console.error('quizDialog:', quizDialog);
            console.error('quizTitle:', quizTitle);
            alert('錯誤：答題對話框元素不存在！請檢查 HTML 結構。');
            return;
        }

        // 設置標題
        quizTitle.textContent = `第 ${memory.relatedChapter} 回的記憶 - ${memory.name}`;
        
        // 顯示對話框（需要添加 active 類和設置 display）
        quizOverlay.style.display = 'flex';
        quizOverlay.classList.add('active');
        // 確保可見性
        quizOverlay.style.opacity = '1';
        quizOverlay.style.pointerEvents = 'auto';
        console.log('答題對話框已顯示');
        
        // 顯示第一題
        console.log('準備顯示第一題');
        showQuestion(0);
        
        // 添加取消按鈕事件
        const cancelBtn = document.getElementById('quiz-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                hideQuizDialog();
            };
        } else {
            console.warn('取消按鈕不存在');
        }
    }).catch((error) => {
        console.error('載入問題數據時發生錯誤:', error);
        alert('載入問題數據失敗：' + error.message);
    });
}

/**
 * 載入記憶的問題數據
 * @param {Object} memory - 記憶對象
 */
async function loadQuestionsForMemory(memory) {
    console.log('loadQuestionsForMemory 開始，記憶:', memory.id, '回目:', memory.relatedChapter);
    
    // 如果記憶已經有問題數據，直接返回
    if (memory.questions && memory.questions.length > 0) {
        console.log('記憶已有問題數據，直接返回');
        return;
    }

    try {
        // 從 reading-questions.json 載入問題
        console.log('開始載入 reading-questions.json');
        const response = await fetch('assets/data/reading-questions.json');
        
        if (!response.ok) {
            throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('成功載入問題數據，章節數:', data.chapters ? data.chapters.length : 0);
        
        // 找到對應回目的問題
        const chapterData = data.chapters.find(c => c.chapter === memory.relatedChapter);
        console.log('找到的回目數據:', chapterData);
        
        if (chapterData) {
            const memoryData = chapterData.memories.find(m => m.id === memory.id);
            console.log('找到的記憶數據:', memoryData);
            
            if (memoryData && memoryData.questions) {
                memory.questions = memoryData.questions;
                console.log('成功載入問題，問題數量:', memory.questions.length);
            } else {
                console.warn('記憶數據中沒有找到問題！記憶 ID:', memory.id);
            }
        } else {
            console.warn('沒有找到對應回目的數據！回目:', memory.relatedChapter);
        }
    } catch (error) {
        console.error('載入問題數據失敗:', error);
        throw error; // 重新拋出錯誤，讓調用者處理
    }
}

/**
 * 顯示題目
 * @param {number} questionIndex - 題目索引
 */
function showQuestion(questionIndex) {
    console.log('showQuestion 被調用，題目索引:', questionIndex);
    console.log('問題總數:', quizState.questions ? quizState.questions.length : 0);
    
    const question = quizState.questions[questionIndex];
    if (!question) {
        console.error('問題不存在！索引:', questionIndex);
        return;
    }

    console.log('顯示問題:', question.question);
    console.log('選項:', question.options);
    console.log('正確答案索引:', question.correct);

    // 重置答題狀態
    quizState.currentQuestionIndex = questionIndex;
    quizState.startTime = Date.now();
    quizState.wrongAnswers = 0;

    // 更新進度顯示
    const currentSpan = document.getElementById('quiz-current');
    const totalSpan = document.getElementById('quiz-total');
    if (currentSpan) currentSpan.textContent = questionIndex + 1;
    if (totalSpan) totalSpan.textContent = quizState.questions.length;
    
    // 更新進度條
    const progressBarFill = document.getElementById('quiz-progress-bar-fill');
    if (progressBarFill) {
        const progressPercent = ((questionIndex + 1) / quizState.questions.length) * 100;
        progressBarFill.style.width = `${progressPercent}%`;
    }

    // 顯示問題
    const questionElement = document.getElementById('quiz-question');
    if (questionElement) {
        questionElement.textContent = question.question;
        console.log('問題文字已設置');
    } else {
        console.error('問題元素不存在！');
    }

    // 顯示選項
    const optionsElement = document.getElementById('quiz-options');
    if (optionsElement) {
        optionsElement.innerHTML = '';
        question.options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'quiz-option-button';
            optionBtn.textContent = option;
            optionBtn.onclick = () => handleAnswer(index, question.correct);
            optionsElement.appendChild(optionBtn);
        });
        console.log('選項按鈕已創建，數量:', question.options.length);
    } else {
        console.error('選項元素不存在！');
    }

    // 隱藏反饋
    const feedbackElement = document.getElementById('quiz-feedback');
    if (feedbackElement) {
        feedbackElement.style.display = 'none';
        feedbackElement.innerHTML = '';
    }

    // 開始計時
    startTimer();
    console.log('問題顯示完成');
}

/**
 * 開始計時器
 */
function startTimer() {
    const timerElement = document.getElementById('quiz-timer');
    if (!timerElement) return;

    const timeLimit = 30; // 30 秒限制
    let timeLeft = timeLimit;
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timerElement) {
            timerElement.textContent = `剩餘時間：${timeLeft} 秒`;
            
            // 時間警告
            if (timeLeft <= 10) {
                timerElement.style.color = '#ff4444';
            } else {
                timerElement.style.color = '';
            }
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // 超時處理
            handleTimeout();
        }
    }, 1000);

    // 保存計時器 ID，以便清除
    quizState.timerInterval = timerInterval;
}

/**
 * 處理超時
 */
function handleTimeout() {
    const timeSpent = (Date.now() - quizState.startTime) / 1000;
    
    // 記錄結果（超時，無法獲得資源）
    quizState.questionResults.push({
        time: timeSpent,
        wrongCount: quizState.wrongAnswers,
        reward: 0,
        timeout: true
    });

    // 顯示超時提示
    showFeedback('時間到！此題無法獲得資源。', false);
    
    // 繼續下一題或完成
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

/**
 * 處理答案選擇
 * @param {number} selectedIndex - 選擇的選項索引
 * @param {number} correctIndex - 正確答案索引
 */
function handleAnswer(selectedIndex, correctIndex) {
    // 清除計時器
    if (quizState.timerInterval) {
        clearInterval(quizState.timerInterval);
    }

    const timeSpent = (Date.now() - quizState.startTime) / 1000;
    const isCorrect = selectedIndex === correctIndex;

    if (isCorrect) {
        // 答對了
        const reward = calculateQuestionReward(timeSpent, quizState.wrongAnswers);
        
        // 記錄結果
        quizState.questionResults.push({
            time: timeSpent,
            wrongCount: quizState.wrongAnswers,
            reward: reward,
            timeout: false
        });

        showFeedback(`答對了！獲得 ${reward}% 資源獎勵。`, true);
        
        // 繼續下一題
        setTimeout(() => {
            nextQuestion();
        }, 1500);
    } else {
        // 答錯了
        quizState.wrongAnswers++;
        showFeedback('答錯了，請重試。', false);
        
        // 可以繼續答題（不自動進入下一題）
    }
}

/**
 * 計算單題資源獎勵
 * @param {number} timeSpent - 答題時間（秒）
 * @param {number} wrongCount - 答錯次數
 * @returns {number} 資源獎勵比例（0-1）
 */
function calculateQuestionReward(timeSpent, wrongCount) {
    // 時間係數
    let timeCoefficient = 1.0;
    if (timeSpent <= 10) {
        timeCoefficient = 1.1; // +10%
    } else if (timeSpent <= 25) {
        timeCoefficient = 1.0; // 100%
    } else if (timeSpent <= 30) {
        timeCoefficient = 0.9; // -10%
    } else {
        timeCoefficient = 0; // 超時
    }

    // 答錯係數
    let wrongCoefficient = 1.0;
    if (wrongCount === 0) {
        wrongCoefficient = 1.0; // 100%
    } else if (wrongCount === 1) {
        wrongCoefficient = 0.8; // 80%
    } else if (wrongCount === 2) {
        wrongCoefficient = 0.6; // 60%
    } else if (wrongCount === 3) {
        wrongCoefficient = 0.4; // 40%
    } else {
        wrongCoefficient = 0.2; // 20%（最低）
    }

    return Math.round(timeCoefficient * wrongCoefficient * 100);
}

/**
 * 顯示答題反饋
 * @param {string} message - 反饋訊息
 * @param {boolean} isCorrect - 是否答對
 */
function showFeedback(message, isCorrect) {
    const feedbackElement = document.getElementById('quiz-feedback');
    if (!feedbackElement) return;

    const memory = quizState.memory;
    let feedbackHTML = `<div style="font-weight: bold; margin-bottom: 8px;">${message}</div>`;
    
    if (isCorrect) {
        // 顯示當前資源獲得比例
        const currentReward = calculateQuestionReward(
            (Date.now() - quizState.startTime) / 1000,
            quizState.wrongAnswers
        );
        feedbackHTML += `<div style="font-size: 14px; color: #666; margin-top: 5px;">
            當前資源獲得比例：${currentReward}%
        </div>`;
    } else {
        // 答錯時提示重新閱讀
        if (memory.relatedChapter) {
            feedbackHTML += `<div style="font-size: 14px; color: #ff8800; margin-top: 5px;">
                建議重新閱讀第 ${memory.relatedChapter} 回原文
            </div>`;
        }
    }
    
    feedbackElement.style.display = 'block';
    feedbackElement.style.color = isCorrect ? '#4CAF50' : '#ff4444';
    feedbackElement.style.background = isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)';
    feedbackElement.innerHTML = feedbackHTML;
}

/**
 * 進入下一題或完成答題
 */
function nextQuestion() {
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
        // 還有下一題
        showQuestion(quizState.currentQuestionIndex + 1);
    } else {
        // 完成所有題目
        completeQuiz();
    }
}

/**
 * 完成答題並解鎖記憶
 */
function completeQuiz() {
    const memory = quizState.memory;
    
    // 計算總資源獎勵
    const totalReward = calculateTotalReward();
    
    // 標記記憶為已驗證和解鎖
    memory.readingVerified = true;
    memory.unlocked = true;
    memory.collected = true; // 保持向後兼容

    // 給予資源獎勵
    if (memory.type === "tear") {
        gameData.resources.tear += totalReward;
    } else if (memory.type === "stone") {
        gameData.resources.stone += totalReward;
    }

    // 更新資源顯示（帶動畫）
    updateResourceDisplay();
    
    // 顯示資源變化動畫
    const elements = getElements();
    if (memory.type === "tear" && elements.tearCount) {
        elements.tearCount.classList.add('resource-change');
        setTimeout(() => elements.tearCount?.classList.remove('resource-change'), 500);
    } else if (memory.type === "stone" && elements.stoneCount) {
        elements.stoneCount.classList.add('resource-change');
        setTimeout(() => elements.stoneCount?.classList.remove('resource-change'), 500);
    }
    
    // 動態導入檢查劇情線里程碑
    import('./game/memories.js').then(({ checkStoryLineMilestones }) => {
        if (memory.storyLineId) {
            checkStoryLineMilestones(memory.storyLineId);
        }
    });
    
    updateLists();

    // 隱藏答題對話框
    hideQuizDialog();

    // 顯示解鎖成功對話框
    showMemoryDialog({
        title: `記憶解鎖：${memory.name}`,
        content: `
            <div class="poem">${memory.content}</div>
            <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
                你通過答題驗證，成功解鎖了這段記憶！
            </p>
            <p style="margin-top: 10px; text-align: center;">
                獲得 ${totalReward} ${memory.type === "tear" ? "絳珠" : "靈石"}
            </p>
        `
    });

    // 顯示提示
    showHint('記憶解鎖', `成功解鎖「${memory.name}」`, '✨');
}

/**
 * 計算總資源獎勵
 * @returns {number} 總資源數量
 */
function calculateTotalReward() {
    const memory = quizState.memory;
    const baseReward = memory.baseReward || memory.tearReward || 10;
    
    // 計算所有題目的平均獎勵比例
    let totalRatio = 0;
    let validQuestions = 0;
    
    quizState.questionResults.forEach(result => {
        if (!result.timeout) {
            totalRatio += result.reward / 100; // 轉換為比例
            validQuestions++;
        }
    });

    // 如果沒有有效題目，返回 0
    if (validQuestions === 0) {
        return 0;
    }

    // 計算平均比例
    const averageRatio = totalRatio / validQuestions;
    
    // 總資源 = 基礎資源 × 平均比例 × 題目數量
    return Math.round(baseReward * averageRatio * validQuestions);
}

/**
 * 隱藏答題對話框
 */
function hideQuizDialog() {
    const quizOverlay = document.getElementById('quiz-dialog-overlay');
    if (quizOverlay) {
        quizOverlay.style.display = 'none';
        quizOverlay.classList.remove('active');
        quizOverlay.style.opacity = '0';
        quizOverlay.style.pointerEvents = 'none';
    }
    
    // 清除計時器
    if (quizState.timerInterval) {
        clearInterval(quizState.timerInterval);
    }
    
    // 重置狀態
    quizState = {
        memory: null,
        currentQuestionIndex: 0,
        questions: [],
        startTime: null,
        wrongAnswers: 0,
        questionResults: []
    };
}

