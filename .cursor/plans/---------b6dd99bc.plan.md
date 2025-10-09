<!-- b6dd99bc-515e-4210-bc60-b9a74863027e 62471aad-1352-4129-b0e9-dae93365cfe2 -->
# 优化预加载时机和添加翻转动画

## 分析确认

查看代码后确认：

1. **输入框状态**：`displayAIResponse()` 结束时已经设置 `userInput.disabled = true`
2. **提交按钮状态**：同时设置 `submitBtn.disabled = true`
3. **提交时禁用**：`confirmAndSubmit()` 也已经禁用输入和按钮

所以**只需要**管理词汇按钮的禁用/启用即可！

## 实施方案

### 1. 提前预加载时机

**修改**: `story-vocab/js/app.js`

在 `handleStartGame()` 和 `confirmAndSubmit()` 中，在调用 `displayAIResponse()` **之前**立即预加载：

```javascript
const data = await getAIResponse();

// 🚀 立即预加载（在打字机效果前）
if (data.recommendedWords && data.recommendedWords.length > 0) {
    const wordsToPreload = data.recommendedWords
        .filter(w => !gameState.usedWords.map(u => u.word).includes(w.word))
        .map(w => w.word);
    
    if (wordsToPreload.length > 0) {
        console.log(`🚀 提前预加载 ${wordsToPreload.length} 个词汇...`);
        preloadWords(wordsToPreload, getWordBriefInfo).catch(err => {
            console.log('⚠️ 预加载失败（不影响使用）:', err);
        });
    }
}

await displayAIResponse(data);
```

**同时移除**: `story-vocab/js/ui/screens.js` 中 `displayAIResponse()` 的旧预加载代码（line 162-170）

### 2. 优化displayAIResponse流程

**修改**: `story-vocab/js/ui/screens.js` 的 `displayAIResponse()` 函数

关键改动：**确保AI句子打字机效果完全结束并给用户阅读时间后，才开始词汇卡片翻转动画**

```javascript
export async function displayAIResponse(data) {
    console.log('🎨 displayAIResponse 被调用，数据:', data);
    
    const storyDisplay = document.getElementById('story-display');
    if (!storyDisplay) return;
    
    // ... 获取或创建 AI 消息元素（现有代码）
    
    // 🆕 禁用旧词汇按钮（在打字机效果前）
    document.querySelectorAll('.word-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
    });
    
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    const messageContent = aiMessage.querySelector('.message-content');
    
    // 等待一小段时间，让用户看到加载动画
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空加载动画，开始打字机效果
    messageContent.innerHTML = '';
    
    // 用打字机效果显示纯文本（速度 60ms/字）
    await typewriterEffect(messageContent, data.aiSentence, 60);
    
    // 替换为可点击的词语版本
    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.recommendedWords);
    
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    
    // ⏸️ 给用户300ms时间阅读完整的AI句子
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 显示词汇选项（过滤掉已使用的词汇）
    const wordsContainer = document.getElementById('word-choices');
    if (!wordsContainer) return;
    
    if (data.recommendedWords && data.recommendedWords.length > 0) {
        const usedWordsList = gameState.usedWords.map(w => w.word);
        const availableWords = data.recommendedWords.filter(wordObj => 
            !usedWordsList.includes(wordObj.word)
        );
        
        if (availableWords.length === 0) {
            wordsContainer.innerHTML = '<div style="color: var(--text-light); padding: 20px; text-align: center;">所有推薦詞彙都已使用，請等待AI提供新詞彙...</div>';
        } else {
            // 🎴 使用翻转动画更新词汇卡片（动画完成后自动启用）
            await updateWordCardsWithFlipAnimation(availableWords);
        }
    }
    
    // 重置输入（现有代码保持不变）
    gameState.selectedWord = null;
    const selectedWordDisplay = document.getElementById('selected-word-display');
    const userInput = document.getElementById('user-input');
    const submitBtn = document.getElementById('submit-btn');
    
    if (selectedWordDisplay) selectedWordDisplay.textContent = '請先選擇一個詞彙...';
    if (userInput) {
        userInput.value = '';
        userInput.disabled = true;
    }
    if (submitBtn) submitBtn.disabled = true;
}
```

### 3. 翻转动画函数

**新增函数**: 在 `story-vocab/js/ui/screens.js` 中添加

```javascript
/**
 * 使用翻转动画更新词汇卡片
 * @param {Array} newWords - 新的词汇列表
 */
async function updateWordCardsWithFlipAnimation(newWords) {
    const wordsContainer = document.getElementById('word-choices');
    if (!wordsContainer) return;
    
    const existingCards = wordsContainer.querySelectorAll('.word-btn');
    
    if (existingCards.length === 0) {
        // 第一次显示，直接创建（无动画）
        newWords.forEach(wordObj => {
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn';
            wordBtn.innerHTML = `
                <div>${wordObj.word}</div>
                <div class="word-meta">${wordObj.pinyin || ''}</div>
            `;
            wordBtn.onclick = () => selectWord(wordObj);
            wordsContainer.appendChild(wordBtn);
        });
    } else {
        // 有旧卡片，执行翻转动画
        // 1. 翻转隐藏旧卡片（已经是disabled状态）
        existingCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('flipping-out');
            }, index * 80);
        });
        
        // 2. 等待翻转完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. 清空并创建新卡片（初始为禁用状态）
        wordsContainer.innerHTML = '';
        newWords.forEach(wordObj => {
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn flipping-in';
            wordBtn.disabled = true; // 🔒 初始禁用
            wordBtn.classList.add('disabled');
            wordBtn.innerHTML = `
                <div>${wordObj.word}</div>
                <div class="word-meta">${wordObj.pinyin || ''}</div>
            `;
            wordBtn.onclick = () => selectWord(wordObj);
            wordsContainer.appendChild(wordBtn);
        });
        
        // 4. 触发翻入动画
        setTimeout(() => {
            wordsContainer.querySelectorAll('.word-btn').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.remove('flipping-in');
                    card.classList.add('flipped-in');
                }, index * 80);
            });
        }, 50);
        
        // 5. 动画完成后清理动画类并启用按钮
        await new Promise(resolve => setTimeout(resolve, 600));
        wordsContainer.querySelectorAll('.word-btn').forEach(card => {
            card.classList.remove('flipped-in');
            // 🔓 动画完成后启用按钮
            card.disabled = false;
            card.classList.remove('disabled');
        });
    }
}
```

### 4. CSS动画样式

**修改**: `story-vocab/css/components.css`

```css
/* 词汇卡片基础样式 */
.word-btn {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

/* 禁用状态 */
.word-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

/* 翻转动画 */
.word-btn.flipping-out {
    animation: flipOut 0.4s ease forwards;
}

.word-btn.flipping-in {
    opacity: 0;
    transform: rotateY(-90deg);
}

.word-btn.flipped-in {
    animation: flipIn 0.4s ease forwards;
}

@keyframes flipOut {
    0% {
        transform: rotateY(0deg);
        opacity: 1;
    }
    100% {
        transform: rotateY(90deg);
        opacity: 0;
    }
}

@keyframes flipIn {
    0% {
        transform: rotateY(-90deg);
        opacity: 0;
    }
    100% {
        transform: rotateY(0deg);
        opacity: 1;
    }
}
```

## 优化后的完整流程

```
【用户提交句子】
  ↓
confirmAndSubmit()
  ↓
getAIResponse() 返回数据（含推荐词汇）
  ↓
🚀 立即预加载新词汇（后台静默进行）
  ↓
displayAIResponse(data) 被调用
  ↓
🔒 禁用旧词汇按钮（添加 disabled 类）
  ↓
显示"AI创作中"加载动画（500ms）
  ↓
⌨️ 打字机效果显示AI句子（完整显示）
  ↓
🔄 替换为可点击的词语版本
  ↓
⏸️ 短暂停留（300ms）让用户阅读完整句子
  ↓
🎴 翻转动画开始：
    - 旧卡片翻出（禁用状态）
    - 新卡片翻入（禁用状态）
  ↓
🔓 动画完成后启用新词汇按钮
  ↓
重置输入框（disabled）和提交按钮（disabled）
  ↓
✅ 用户选择新词汇后自动启用输入
```

## 关键改进点

1. ✅ **预加载提前** - 在打字机前就开始，节省1-2秒等待时间
2. ✅ **清晰的流程分段** - 打字机 → 阅读时间 → 翻转动画，三段分明
3. ✅ **动画完成后启用** - 翻转动画结束后才能点击，避免误操作
4. ✅ **优雅的视觉反馈** - 翻转效果让用户清楚看到词汇更新
5. ✅ **无副作用** - 不影响现有的输入框和按钮逻辑

## 实施文件清单

1. 🔧 **修改**: `story-vocab/js/app.js` - 提前触发预加载（2处）
2. 🔧 **修改**: `story-vocab/js/ui/screens.js` - 优化流程，添加翻转动画函数
3. 🎨 **修改**: `story-vocab/css/components.css` - 添加翻转动画样式

### To-dos

- [ ] 在 dictionary.js 中创建 getWordBriefInfo() 函数，调用萌典 API 获取简化释义数据
- [ ] 修改 word-manager.js 的 selectWord() 函数，集成 API 调用并更新显示内容
- [ ] 优化 CSS 样式，支持电脑版单行显示和移动版自动换行
- [ ] 测试功能：选择不同词语，验证 API 调用、显示效果和错误处理