// =====================================================
// 詩歌展示功能模塊
// =====================================================

/**
 * 渲染豎排詩歌
 */
export function renderVerticalPoem(container, poem) {
  if (!container || !poem) return;
  
  const lines = poem.content.split('\n').filter(line => line.trim());
  
  container.innerHTML = '';
  
  // 標題
  if (poem.title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'poem-title';
    titleEl.textContent = poem.title;
    container.appendChild(titleEl);
  }
  
  // 詩歌內容
  lines.forEach((line, index) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'poem-line';
    lineEl.textContent = line;
    container.appendChild(lineEl);
  });
  
  // 作者信息
  if (poem.author || poem.dynasty) {
    const authorEl = document.createElement('div');
    authorEl.className = 'poem-author';
    const authorText = poem.dynasty && poem.author 
      ? `${poem.dynasty} · ${poem.author}`
      : poem.author || poem.dynasty;
    authorEl.textContent = authorText;
    container.appendChild(authorEl);
  }
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
  
  poems.forEach(poem => {
    const poemCard = document.createElement('div');
    poemCard.className = 'poem-card';
    poemCard.innerHTML = `
      <div class="poem-card-title">${poem.title || '無題'}</div>
      <div class="poem-card-author">${poem.dynasty || ''} ${poem.author || ''}</div>
      <div class="poem-card-preview">${poem.content.split('\n')[0]}</div>
    `;
    
    poemCard.addEventListener('click', () => {
      // 觸發詩歌查看事件
      if (window.AppState && window.AppState.showPoemViewer) {
        window.AppState.showPoemViewer(poem.id);
      }
    });
    
    container.appendChild(poemCard);
  });
}

