/**
 * 层级卡片渲染模块
 * 处理词表层级卡片的显示和交互（模态弹窗方式）
 */

import { gameState } from '../core/game-state.js';
import { getSupabase } from '../supabase-client.js';

let currentWordlist = null;
let allTags = [];
let selectedLevel2 = null;
let modalOverlay = null;

/**
 * 渲染第二层级卡片
 * @param {Object} wordlist - 词表对象
 * @param {Array} tags - 所有标签列表
 */
export function renderLevel2Cards(wordlist, tags) {
  currentWordlist = wordlist;
  allTags = tags;
  selectedLevel2 = null;

  const level2Container = document.getElementById('level-2-cards');
  
  if (!level2Container) return;

  // 清理舊的模態窗口（防止狀態混亂）
  if (modalOverlay && modalOverlay.parentNode) {
    modalOverlay.remove();
    modalOverlay = null;
  }

  // 隐藏旧的三级容器（如果存在）
  const oldLevel3Container = document.getElementById('level-3-cards');
  if (oldLevel3Container) {
    oldLevel3Container.style.display = 'none';
  }

  // 获取第二层级标签
  const level2Tags = tags.filter(t => t.tag_level === 2);

  if (level2Tags.length === 0) {
    // 如果没有层级，直接显示AI模式提示
    level2Container.innerHTML = '<p style="text-align: center; color: #999;">此詞表無層級劃分</p>';
    return;
  }

  // 渲染卡片
  level2Container.innerHTML = level2Tags.map(tag => {
    const descText = tag.description || '';
    const isSelected = selectedLevel2 === tag.tag_code;
    
    return `
      <label class="level-card ${isSelected ? 'selected' : ''}" data-tag="${tag.tag_code}">
        <input type="radio" name="level-2" value="${tag.tag_code}" ${isSelected ? 'checked' : ''}>
        <div class="level-name">${tag.tag_display_name}</div>
        ${descText ? `<div class="level-desc">${descText}</div>` : ''}
        <div class="level-selection-info"></div>
      </label>
    `;
  }).join('');

  // 绑定点击事件 - 弹出模态窗口
  level2Container.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      
      const tagCode = this.dataset.tag;
      const tagName = this.querySelector('.level-name').textContent;
      
      // 标记为选中
      level2Container.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      
      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      selectedLevel2 = tagCode;
      gameState.level2Tag = tagCode;

      // 弹出模态窗口选择三级
      showLevel3Modal(tagCode, tagName);
    });
  });
  
  // 恢复之前的选择显示
  if (gameState.level2Tag && gameState.level2Tag === selectedLevel2) {
    updateLevel2CardSelection();
  }
}

/**
 * 显示三级选择模态窗口
 * @param {string} level2TagCode - 二级标签代码
 * @param {string} level2TagName - 二级标签名称
 */
async function showLevel3Modal(level2TagCode, level2TagName) {
  // 创建或获取模态窗口
  if (!modalOverlay) {
    createModalOverlay();
  }

  // 查询该二级分类下的三级标签
  const level3Tags = await loadLevel3TagsForLevel2(level2TagCode);

  // 渲染模态窗口内容
  renderModalContent(level2TagName, level3Tags);

  // 显示模态窗口（先显示，再添加动画类）
  modalOverlay.style.display = 'flex';
  
  // 强制重排，确保动画生效
  modalOverlay.offsetHeight;
  
  // 添加 active 类触发动画
  requestAnimationFrame(() => {
    modalOverlay.classList.add('active');
  });
  
  document.body.style.overflow = 'hidden'; // 防止背景滚动
}

/**
 * 创建模态窗口遮罩层
 */
function createModalOverlay() {
  modalOverlay = document.createElement('div');
  modalOverlay.className = 'level-modal-overlay';
  modalOverlay.innerHTML = `
    <div class="level-modal" onclick="event.stopPropagation()">
      <div class="level-modal-header">
        <div class="level-modal-title"></div>
        <button class="level-modal-close" aria-label="关闭">✕</button>
      </div>
      <div class="level-modal-body"></div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // 绑定关闭事件
  const closeBtn = modalOverlay.querySelector('.level-modal-close');
  closeBtn.addEventListener('click', closeModal);

  // 点击遮罩层关闭
  modalOverlay.addEventListener('click', closeModal);
}

/**
 * 渲染模态窗口内容
 * @param {string} level2TagName - 二级标签名称
 * @param {Array} level3Tags - 三级标签列表
 */
function renderModalContent(level2TagName, level3Tags) {
  const titleEl = modalOverlay.querySelector('.level-modal-title');
  const bodyEl = modalOverlay.querySelector('.level-modal-body');

  titleEl.innerHTML = `<span>📚</span> ${level2TagName}`;

  // 渲染内容
  let html = `
    <div class="use-whole-unit-section">
      <button class="use-whole-unit-btn" data-action="use-whole">
        <span class="icon">✨</span>
        <span>使用「${level2TagName}」的全部課文</span>
      </button>
    </div>
  `;

  if (level3Tags.length > 0) {
    html += `
      <div class="level-3-hint">或選擇具體課文：</div>
      <div class="level-3-cards-grid">
        ${level3Tags.map(tag => `
          <div class="level-3-card ${gameState.level3Tag === tag.tag_code ? 'selected' : ''}" 
               data-tag="${tag.tag_code}">
            <div class="level-3-card-name">${tag.tag_display_name}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  bodyEl.innerHTML = html;

  // 绑定"使用整个单元"按钮事件
  const useWholeBtn = bodyEl.querySelector('.use-whole-unit-btn');
  useWholeBtn.addEventListener('click', function() {
    gameState.level3Tag = null; // 不选择具体三级
    this.classList.add('selected');
    
    // 延迟关闭，让用户看到按钮变化
    setTimeout(() => {
      closeModal();
    }, 300);
  });

  // 绑定三级卡片点击事件
  bodyEl.querySelectorAll('.level-3-card').forEach(card => {
    card.addEventListener('click', function() {
      // 取消其他卡片选中
      bodyEl.querySelectorAll('.level-3-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');

      const tagCode = this.dataset.tag;
      gameState.level3Tag = tagCode;

      // 延迟关闭，让用户看到选中效果
      setTimeout(() => {
        closeModal();
      }, 300);
    });
  });
}

/**
 * 关闭模态窗口
 */
function closeModal() {
  if (modalOverlay) {
    // 先移除 active 类触发淡出动画
    modalOverlay.classList.remove('active');
    
    // 等待动画完成后隐藏
    setTimeout(() => {
      modalOverlay.style.display = 'none';
    }, 250); // 与 CSS transition 时间一致 (0.25s)
    
    document.body.style.overflow = ''; // 恢复背景滚动
    
    // 更新二级卡片显示
    updateLevel2CardSelection();
  }
}

/**
 * 更新二级卡片的选择显示
 */
function updateLevel2CardSelection() {
  // 清除所有卡片的选择状态
  const allCards = document.querySelectorAll('.level-card');
  allCards.forEach(c => {
    c.classList.remove('has-selection');
    const info = c.querySelector('.level-selection-info');
    if (info) info.textContent = '';
  });
  
  // 如果没有选择，直接返回
  if (!selectedLevel2 || !gameState.level2Tag) return;
  
  const card = document.querySelector(`.level-card[data-tag="${selectedLevel2}"]`);
  if (!card) return;
  
  const infoEl = card.querySelector('.level-selection-info');
  if (!infoEl) return;
  
  // 只更新当前选中的卡片
  if (gameState.level2Tag === selectedLevel2) {
    if (gameState.level3Tag === null) {
      // 使用整个单元
      infoEl.textContent = '✨ 全部課文';
      card.classList.add('has-selection');
    } else if (gameState.level3Tag) {
      // 选择了具体课文 - 需要找到课文名称
      const level3Tag = allTags.find(t => t.tag_code === gameState.level3Tag);
      if (level3Tag) {
        infoEl.textContent = `📄 ${level3Tag.tag_display_name}`;
        card.classList.add('has-selection');
      }
    }
  }
}

/**
 * 查询并加载某个二级分类下的三级标签
 * @param {string} level2TagCode - 二级标签代码
 * @returns {Promise<Array>} 三级标签列表
 */
async function loadLevel3TagsForLevel2(level2TagCode) {
  const supabase = getSupabase();
  
  // 获取所有三级标签
  const allLevel3Tags = allTags.filter(t => t.tag_level === 3);
  
  if (allLevel3Tags.length === 0) {
    console.log('ℹ️ 沒有三級標籤，直接返回空數組');
    return [];
  }
  
  try {
    console.log('🔍 查詢單元下的課文:', level2TagCode, '| 詞表ID:', currentWordlist?.id);
    
    if (!currentWordlist || !currentWordlist.id) {
      console.error('❌ currentWordlist 未定義或缺少 ID');
      return allLevel3Tags;
    }
    
    // 查询该二级分类下有哪些三级分类（添加超時保護：10秒）
    const queryPromise = supabase
      .from('wordlist_vocabulary')
      .select('level_3_tag')
      .eq('wordlist_id', currentWordlist.id)
      .eq('level_2_tag', level2TagCode)
      .not('level_3_tag', 'is', null);
    
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => {
        console.warn('⚠️ 查詢超時（10秒），使用降級方案');
        resolve({ data: null, error: { message: '查詢超時' } });
      }, 10000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    const { data: vocabData, error } = result;
    
    if (error) {
      console.error('❌ 查詢三級標籤失敗:', error);
      return allLevel3Tags;  // 降級：顯示所有三級標籤
    }
    
    console.log('✅ 查詢成功，返回數據:', vocabData?.length, '條記錄');
    
    // 提取唯一的三級標籤代碼
    const level3TagCodes = [...new Set(vocabData.map(v => v.level_3_tag))];
    console.log('✅ 找到課文數量:', level3TagCodes.length);
    
    // 過濾出對應的三級標籤對象
    const filteredLevel3Tags = allLevel3Tags.filter(tag => 
      level3TagCodes.includes(tag.tag_code)
    );
    
    console.log('✅ 已過濾三級標籤:', filteredLevel3Tags.length, '個');
    
    return filteredLevel3Tags;
    
  } catch (error) {
    console.error('❌ 加載三級標籤失敗:', error);
    return allLevel3Tags;  // 降級：顯示所有三級標籤
  }
}

/**
 * 清空层级卡片（保留用于兼容）
 */
export function clearHierarchyCards() {
  const level2Container = document.getElementById('level-2-cards');

  if (level2Container) {
    level2Container.innerHTML = '';
  }

  // 关闭并完全移除模态窗口
  closeModal();
  if (modalOverlay && modalOverlay.parentNode) {
    modalOverlay.remove();
    modalOverlay = null; // 重置為 null，下次會重新創建
  }

  // 清除选择状态
  selectedLevel2 = null;
  gameState.level2Tag = null;
  gameState.level3Tag = null;
  
  // 清除所有卡片的选择显示
  const allCards = document.querySelectorAll('.level-card');
  allCards.forEach(c => {
    c.classList.remove('has-selection');
    const info = c.querySelector('.level-selection-info');
    if (info) info.textContent = '';
  });
}

/**
 * 获取当前选中的层级
 * @returns {Object} { level2Tag, level3Tag }
 */
export function getSelectedHierarchy() {
  return {
    level2Tag: gameState.level2Tag,
    level3Tag: gameState.level3Tag
  };
}

// 废弃的函数（保留用于兼容）
export function renderLevel3Cards() {
  console.warn('renderLevel3Cards() 已废弃，现在使用模态窗口方式');
}
