/**
 * 层级卡片渲染模块
 * 处理词表层级卡片的显示和交互
 */

import { gameState } from '../core/game-state.js';

let currentWordlist = null;
let allTags = [];
let selectedLevel2 = null;

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
  const level3Container = document.getElementById('level-3-cards');
  
  if (!level2Container) return;

  // 隐藏第三层级
  if (level3Container) {
    level3Container.style.display = 'none';
    level3Container.innerHTML = '';
  }

  // 获取第二层级标签
  const level2Tags = tags.filter(t => t.tag_level === 2);

  if (level2Tags.length === 0) {
    // 如果没有层级，直接显示AI模式提示
    level2Container.innerHTML = '<p style="text-align: center; color: #999;">此詞表無層級劃分</p>';
    return;
  }

  // 渲染卡片（复用 L1-L6 的样式，使用 .level-card 类）
  level2Container.innerHTML = level2Tags.map(tag => `
    <label class="level-card" data-tag="${tag.tag_code}">
      <input type="radio" name="level-2" value="${tag.tag_code}">
      <div class="level-name">${tag.tag_display_name}</div>
      <div class="level-desc">${wordlist.hierarchy_config?.level_2_label || '第二層級'}</div>
    </label>
  `).join('');

  // 绑定点击事件
  level2Container.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', function() {
      // 取消其他卡片的选中状态
      level2Container.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      
      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const tagCode = this.dataset.tag;
      selectedLevel2 = tagCode;

      // 保存到 gameState
      gameState.level2Tag = tagCode;
      gameState.level3Tag = null;

      // 检查是否有第三层级
      const level3Tags = allTags.filter(t => t.tag_level === 3);
      if (level3Tags.length > 0) {
        renderLevel3Cards(level3Tags);
      } else {
        // 没有第三层级，隐藏第三层级区域
        if (level3Container) {
          level3Container.style.display = 'none';
        }
      }
    });
  });
}

/**
 * 渲染第三层级卡片
 * @param {Array} level3Tags - 第三层级标签列表
 */
export function renderLevel3Cards(level3Tags) {
  const level3Container = document.getElementById('level-3-cards');
  
  if (!level3Container) return;

  // 显示第三层级容器
  level3Container.style.display = 'grid';

  // 渲染卡片
  level3Container.innerHTML = level3Tags.map(tag => `
    <label class="level-card" data-tag="${tag.tag_code}">
      <input type="radio" name="level-3" value="${tag.tag_code}">
      <div class="level-name">${tag.tag_display_name}</div>
      <div class="level-desc">${currentWordlist?.hierarchy_config?.level_3_label || '第三層級'}</div>
    </label>
  `).join('');

  // 绑定点击事件
  level3Container.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', function() {
      // 取消其他卡片的选中状态
      level3Container.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      
      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const tagCode = this.dataset.tag;

      // 保存到 gameState
      gameState.level3Tag = tagCode;
    });
  });
}

/**
 * 清空层级卡片
 */
export function clearHierarchyCards() {
  const level2Container = document.getElementById('level-2-cards');
  const level3Container = document.getElementById('level-3-cards');

  if (level2Container) {
    level2Container.innerHTML = '';
  }

  if (level3Container) {
    level3Container.innerHTML = '';
    level3Container.style.display = 'none';
  }

  selectedLevel2 = null;
  gameState.level2Tag = null;
  gameState.level3Tag = null;
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

