// =====================================================
// 詩歌展示功能模塊
// =====================================================

/**
 * 渲染豎排詩歌
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
  contentEl.className = 'poem-text';
  // 將詩句拆分為行，保留原始文字供發光層使用
  if (poem.content) {
    const contentLines = poem.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const originalContent = contentLines.join('\n');
    // 以 <br> 呈現行距，同時為發光層提供 data-text 原文
    contentEl.innerHTML = contentLines.join('<br>');
    contentEl.dataset.text = originalContent;
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
 */
export function renderPoemList(container, poems) {
  if (!container || !poems || poems.length === 0) {
    container.innerHTML = '<p class="placeholder-text">暫無詩歌</p>';
    return;
  }
  
  container.innerHTML = '';
  
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
    
    poemCard.addEventListener('click', () => {
      // 觸發詩歌查看事件
      if (window.AppState && window.AppState.showPoemViewer) {
        window.AppState.showPoemViewer(poem.id);
      }
    });
    
    container.appendChild(poemCard);
  });
}

