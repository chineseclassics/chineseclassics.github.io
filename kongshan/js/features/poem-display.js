// =====================================================
// 詩歌展示功能模塊
// =====================================================

/**
 * 打字機效果動畫 - 豎排排版專用
 * @param {HTMLElement} contentEl - 詩句內容元素
 * @param {string} content - 詩句內容
 * @param {number} charDelay - 每個字符的延遲時間（毫秒），默認 150ms
 */
async function animateTypewriter(contentEl, content, charDelay = 150) {
  if (!contentEl || !content) return;
  
  // 將詩句拆分為列（在豎排中，\n 分隔的是列）
  const columns = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (columns.length === 0) return;
  
  // 清空內容，準備逐字符添加
  contentEl.innerHTML = '';
  
  // 保存原始內容供發光層使用
  const originalContent = columns.join('\n');
  contentEl.dataset.text = originalContent;
  
  // 在豎排中，writing-mode: vertical-rl 表示從右到左
  // 第一列（數組第一個）會顯示在最右邊
  // 我們需要從第一列開始，每列從上到下逐字符顯示
  const totalColumns = columns.length;
  
  // 收集所有字符的顯示順序（從第一列到最後一列，每列從上到下）
  const characters = [];
  columns.forEach((column, colIndex) => {
    for (let charIndex = 0; charIndex < column.length; charIndex++) {
      characters.push({
        char: column[charIndex],
        columnIndex: colIndex,
        charIndex: charIndex
      });
    }
  });
  
  // 創建列容器結構（按順序，第一列在最右邊）
  const columnContainers = [];
  columns.forEach((column, index) => {
    const colContainer = document.createElement('span');
    colContainer.className = 'poem-column';
    contentEl.appendChild(colContainer);
    
    // 如果不是最後一列，添加 <br> 分隔
    if (index < columns.length - 1) {
      const br = document.createElement('br');
      contentEl.appendChild(br);
    }
    
    columnContainers.push(colContainer);
  });
  
  // 逐字符顯示動畫
  let currentIndex = 0;
  for (const charInfo of characters) {
    const charSpan = document.createElement('span');
    charSpan.className = 'poem-char';
    charSpan.textContent = charInfo.char;
    charSpan.style.opacity = '0';
    
    // 將字符添加到對應的列容器
    columnContainers[charInfo.columnIndex].appendChild(charSpan);
    
    // 使用 setTimeout 控制顯示時機
    await new Promise(resolve => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          charSpan.style.opacity = '1';
          resolve();
        });
      }, currentIndex * charDelay);
    });
    
    currentIndex++;
  }
  
  // 打字機效果完成後，啟動呼吸動畫
  await new Promise(resolve => setTimeout(resolve, charDelay));
  contentEl.classList.add('poem-text-breathing');
}

/**
 * 渲染豎排詩歌（帶打字機效果）
 */
export function renderVerticalPoem(container, poem) {
  if (!container || !poem) return;
  
  container.innerHTML = '';
  
  // 創建一個包裝容器
  const poemWrapper = document.createElement('div');
  poemWrapper.className = 'poem-wrapper';
  
  // 創建內容區域容器，包裹文本和元數據
  const contentArea = document.createElement('div');
  contentArea.className = 'poem-content-area';
  
  // 創建標題和作者的容器（放在最前面，顯示在左下角）
  const metaContainer = document.createElement('div');
  metaContainer.className = 'poem-meta';
  
  // 組合標題和作者在同一個豎行
  let metaText = '';
  if (poem.title) {
    metaText = poem.title;
  }
  if (poem.author || poem.dynasty) {
    const authorText = poem.dynasty && poem.author 
      ? `${poem.dynasty} · ${poem.author}`
      : poem.author || poem.dynasty;
    metaText += (metaText ? '　' : '') + authorText; // 使用全角空格分隔
  }
  
  if (metaText) {
    metaContainer.textContent = metaText;
    contentArea.appendChild(metaContainer);
  }
  
  // 詩歌內容 - 放在最後（豎排版中會顯示在中間偏右）
  const contentEl = document.createElement('div');
  contentEl.className = 'poem-text'; // 初始不添加 breathing 類，等打字機完成後再添加
  
  // 如果有內容，啟動打字機效果
  if (poem.content) {
    // 異步啟動打字機動畫
    animateTypewriter(contentEl, poem.content, 150); // 150ms 每個字符，速度適中
  } else {
    contentEl.textContent = '';
    contentEl.dataset.text = '';
  }
  
  contentArea.appendChild(contentEl);
  
  poemWrapper.appendChild(contentArea);
  container.appendChild(poemWrapper);
}

/**
 * 渲染詩歌列表
 * @param {HTMLElement} container - 容器元素
 * @param {Array} poems - 詩句數組
 * @param {boolean} showEmptyMessage - 是否顯示空列表提示
 */
export function renderPoemList(container, poems, showEmptyMessage = true) {
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!poems || poems.length === 0) {
    if (showEmptyMessage) {
      container.innerHTML = '<p class="placeholder-text">暫無詩歌</p>';
    }
    return;
  }
  
  poems.forEach((poem, index) => {
    const poemCard = document.createElement('div');
    poemCard.className = 'poem-card';
    
    // 檢查並處理詩句內容
    let verseText = '';
    if (poem.content) {
      const lines = poem.content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);
      // 將每行詩句保持換行顯示
      verseText = lines.join('\n');
    } else {
      console.warn(`詩歌 ${index} 沒有內容:`, poem);
      verseText = '（無內容）';
    }
    
    // 調試：檢查前幾個詩歌的內容
    if (index < 3) {
      console.log(`詩歌 ${index}:`, {
        title: poem.title,
        author: poem.author,
        dynasty: poem.dynasty,
        content: poem.content,
        verseText: verseText
      });
    }
    
    // 使用 textContent 創建元素，避免 HTML 轉義問題
    const verseEl = document.createElement('div');
    verseEl.className = 'poem-card-verse';
    verseEl.textContent = verseText;
    
    poemCard.appendChild(verseEl);
    
    // 如果有聲色意境，添加 badge
    if (poem.hasAtmosphere) {
      const badge = document.createElement('div');
      badge.className = 'poem-card-badge';
      badge.setAttribute('aria-label', '此詩句有聲色意境');
      badge.setAttribute('title', '此詩句有聲色意境');
      
      // 創建默認圓點
      const dot = document.createElement('span');
      dot.className = 'poem-card-badge-dot';
      
      // 創建 hover 時顯示的圖標
      const icon = document.createElement('i');
      icon.className = 'fas fa-mountain-sun poem-card-badge-icon';
      icon.setAttribute('aria-hidden', 'true');
      
      badge.appendChild(dot);
      badge.appendChild(icon);
      poemCard.appendChild(badge);
    }
    
    poemCard.addEventListener('click', async () => {
      // 在用戶交互時初始化 AudioContext（移動端特別重要）
      if (window.AppState && window.AppState.audioEngine) {
        try {
          // 在用戶點擊時強制初始化 AudioContext
          await window.AppState.audioEngine.init(true); // forceResume = true
          console.log('✅ 用戶交互觸發 AudioContext 初始化');
        } catch (error) {
          console.warn('⚠️ AudioContext 初始化失敗（將繼續嘗試）:', error);
          // 不阻止繼續，可能在某些情況下仍能播放
        }
      }
      
      // 觸發詩歌查看事件
      if (window.AppState && window.AppState.showPoemViewer) {
        window.AppState.showPoemViewer(poem.id);
      }
    });
    
    container.appendChild(poemCard);
  });
}

