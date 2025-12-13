<template>
  <div class="story-review">
    <div class="review-container">
      <!-- 標題區域 -->
      <header class="review-header">
        <h1 class="story-title">
          <PhBookOpenText :size="28" weight="duotone" class="title-icon" />
          {{ displayTitle }}
        </h1>
        <div class="story-meta">
          <span class="meta-item">
            <PhUsers :size="16" weight="fill" />
            {{ participants.length }} 位創作者
          </span>
          <span class="meta-item">
            <PhFilmStrip :size="16" weight="fill" />
            {{ panelCount }} 個分鏡
          </span>
        </div>
      </header>

      <!-- 分鏡漫畫展示區域 -->
      <div class="storyboard-panels" ref="panelsRef">
        <!-- 故事開頭 -->
        <div 
          v-if="storyOpening" 
          class="story-panel opening-panel"
        >
          <div class="panel-badge opening-badge">
            <PhSparkle :size="14" weight="fill" /> 故事開頭
          </div>
          <div class="panel-content text-panel">
            <p class="panel-text opening-text">{{ storyOpening.content }}</p>
          </div>
          <div class="panel-author" v-if="storyOpening.authorName">
            <PhPen :size="14" weight="fill" />
            <span>{{ storyOpening.authorName }}</span>
          </div>
        </div>

        <!-- 分鏡內容（圖文交替） -->
        <template v-for="(panel, index) in storyPanels" :key="panel.id">
          <!-- 圖片分鏡 -->
          <div 
            v-if="panel.itemType === 'image'" 
            class="story-panel image-panel"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="panel-badge">
              <PhPaintBrush :size="14" weight="fill" /> 第 {{ getPanelNumber(index) }} 幕
            </div>
            <div class="panel-content">
              <img 
                :src="panel.content" 
                :alt="`第 ${getPanelNumber(index)} 幕畫作`"
                class="panel-image"
                loading="lazy"
                @error="handleImageError"
              />
            </div>
            <div class="panel-author" v-if="panel.authorName">
              <PhPaintBrush :size="14" weight="fill" />
              <span>{{ panel.authorName }}</span>
            </div>
          </div>

          <!-- 文字分鏡（勝出句子） -->
          <div 
            v-else-if="panel.itemType === 'text'" 
            class="story-panel text-panel-wrapper"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="panel-content text-panel">
              <div class="speech-bubble">
                <p class="panel-text">{{ panel.content }}</p>
              </div>
            </div>
            <div class="panel-author" v-if="panel.authorName">
              <PhPen :size="14" weight="fill" />
              <span>{{ panel.authorName }}</span>
            </div>
          </div>
        </template>

        <!-- 故事結尾（如果有） -->
        <div 
          v-if="storyEnding" 
          class="story-panel ending-panel"
        >
          <div class="panel-badge ending-badge">
            <PhStar :size="14" weight="fill" /> 故事結尾
          </div>
          <div class="panel-content text-panel">
            <p class="panel-text ending-text">{{ storyEnding.content }}</p>
          </div>
          <div class="panel-author" v-if="storyEnding.authorName">
            <PhPen :size="14" weight="fill" />
            <span>{{ storyEnding.authorName }}</span>
          </div>
        </div>

        <!-- 完結標記 -->
        <div class="story-end-mark">
          <PhSealCheck :size="32" weight="duotone" class="end-icon" />
          <span class="end-text">完</span>
        </div>
      </div>

      <!-- 排行榜和貢獻統計 -->
      <div class="stats-section" v-if="scores.length > 0">
        <h2 class="section-title">
          <PhTrophy :size="22" weight="duotone" class="section-icon" />
          創作者排行榜
        </h2>
        <div class="leaderboard">
          <div 
            v-for="(player, index) in sortedScores" 
            :key="player.userId"
            class="leaderboard-item"
            :class="{ 
              'is-first': index === 0,
              'is-second': index === 1,
              'is-third': index === 2
            }"
          >
            <div class="rank-badge">
              <PhCrown v-if="index === 0" :size="18" weight="fill" class="crown-icon" />
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </div>
            <div class="player-info">
              <span class="player-name">{{ player.nickname }}</span>
              <div class="player-stats">
                <span class="stat-item" v-if="player.sentenceWins > 0">
                  <PhPen :size="12" weight="fill" /> {{ player.sentenceWins }} 句勝出
                </span>
                <span class="stat-item" v-if="player.drawingCount > 0">
                  <PhPaintBrush :size="12" weight="fill" /> {{ player.drawingCount }} 幅畫作
                </span>
              </div>
            </div>
            <div class="player-score">
              {{ player.totalScore }} 分
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按鈕區域 -->
      <div class="action-buttons">
        <button 
          class="action-btn btn-primary"
          @click="handleRestart"
        >
          <PhArrowCounterClockwise :size="20" weight="bold" />
          重新開始
        </button>
        <button 
          class="action-btn btn-secondary"
          @click="handleGoHome"
        >
          <PhHouse :size="20" weight="bold" />
          返回首頁
        </button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
/**
 * StoryReview 組件 - 分鏡接龍模式的故事回顧頁面
 * 
 * 以分鏡漫畫形式展示完整的故事鏈，包含：
 * - 圖文交替的分鏡展示
 * - 每個分鏡的作者標註
 * - 創作者排行榜和貢獻統計
 * - 重新開始和返回首頁按鈕
 * 
 * Requirements: 8.2, 8.3, 8.4, 8.6, 8.7
 */

import { ref, computed } from 'vue'
import {
  PhBookOpenText,
  PhUsers,
  PhFilmStrip,
  PhSparkle,
  PhPaintBrush,
  PhPen,
  PhStar,
  PhSealCheck,
  PhTrophy,
  PhCrown,
  PhArrowCounterClockwise,
  PhHouse
} from '@phosphor-icons/vue'
import type { StoryChainItem, PlayerScore, Participant } from '../types/storyboard'

// ============================================
// Props 定義
// Requirements: 8.2, 8.3, 8.4, 8.7
// ============================================

interface Props {
  /** 故事鏈數據 */
  storyChain: StoryChainItem[]
  /** 故事標題（房間名稱或故事開頭） */
  title: string
  /** 參與者列表 */
  participants: Participant[]
  /** 玩家得分和貢獻統計 */
  scores: PlayerScore[]
}

const props = withDefaults(defineProps<Props>(), {
  storyChain: () => [],
  title: '',
  participants: () => [],
  scores: () => []
})

// ============================================
// Emits 定義
// Requirements: 8.6
// ============================================

const emit = defineEmits<{
  /** 重新開始遊戲 */
  (e: 'restart'): void
  /** 返回首頁 */
  (e: 'go-home'): void
}>()

// ============================================
// Refs
// ============================================

const panelsRef = ref<HTMLElement | null>(null)

// ============================================
// 計算屬性
// ============================================

/**
 * 顯示的標題
 * Requirements: 8.7 - 使用房間名稱或故事開頭
 */
const displayTitle = computed(() => {
  if (props.title) return props.title
  // 如果沒有標題，使用故事開頭的前 20 個字符
  if (storyOpening.value) {
    const content = storyOpening.value.content
    return content.length > 20 ? content.slice(0, 20) + '...' : content
  }
  return '我們的故事'
})

/**
 * 故事開頭（第一個文字項目，roundNumber = 0）
 */
const storyOpening = computed(() => {
  return props.storyChain.find(
    item => item.itemType === 'text' && item.roundNumber === 0
  ) || null
})

/**
 * 故事結尾（最後一個 roundNumber 為 -1 的文字項目，如果有的話）
 */
const storyEnding = computed(() => {
  return props.storyChain.find(
    item => item.itemType === 'text' && item.roundNumber === -1
  ) || null
})

/**
 * 分鏡內容（排除開頭和結尾）
 * Requirements: 8.2, 8.3 - 圖文交替展示
 */
const storyPanels = computed(() => {
  return props.storyChain.filter(
    item => item.roundNumber > 0 && item.roundNumber !== -1
  ).sort((a, b) => {
    // 先按輪次排序，再按創建時間排序
    if (a.roundNumber !== b.roundNumber) {
      return a.roundNumber - b.roundNumber
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
})

/**
 * 分鏡數量
 */
const panelCount = computed(() => {
  return props.storyChain.filter(item => item.itemType === 'image').length
})

/**
 * 按得分排序的玩家列表
 * Requirements: 9.5 - 最終排行榜
 */
const sortedScores = computed(() => {
  return [...props.scores].sort((a, b) => b.totalScore - a.totalScore)
})

// ============================================
// 方法
// ============================================

/**
 * 獲取分鏡編號
 */
function getPanelNumber(index: number): number {
  // 計算當前是第幾個圖片分鏡
  let imageCount = 0
  for (let i = 0; i <= index; i++) {
    if (storyPanels.value[i]?.itemType === 'image') {
      imageCount++
    }
  }
  return imageCount
}

/**
 * 處理圖片載入錯誤
 */
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect fill="%23f0f0f0" width="200" height="150"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E圖片載入失敗%3C/text%3E%3C/svg%3E'
}

/**
 * 處理重新開始
 * Requirements: 8.6
 */
function handleRestart() {
  emit('restart')
}

/**
 * 處理返回首頁
 * Requirements: 8.6
 */
function handleGoHome() {
  emit('go-home')
}
</script>



<style scoped>
/* ============================================
   基礎佈局
   ============================================ */

.story-review {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  padding: 1rem;
  overflow-y: auto;
}

.review-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ============================================
   標題區域
   Requirements: 8.7 - 顯示故事標題
   ============================================ */

.review-header {
  text-align: center;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--shadow-color);
  animation: headerFadeIn 0.6s ease-out;
}

@keyframes headerFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.story-title {
  font-size: 1.8rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  line-height: 1.3;
}

.title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.story-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* ============================================
   分鏡漫畫展示區域
   Requirements: 8.2, 8.3, 8.4
   ============================================ */

.storyboard-panels {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 分鏡面板基礎樣式 */
.story-panel {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  box-shadow: 4px 4px 0 var(--shadow-color);
  overflow: hidden;
  animation: panelSlideIn 0.5s ease-out both;
  position: relative;
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 分鏡標籤 */
.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-head);
  color: white;
  background: var(--color-secondary);
  padding: 0.35rem 0.75rem;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.opening-badge {
  background: linear-gradient(135deg, #f5c518, #e6a800);
  color: #333;
}

.ending-badge {
  background: linear-gradient(135deg, #e07b67, #c9604c);
}

/* 分鏡內容區域 */
.panel-content {
  padding: 0;
}

/* 圖片分鏡 */
.image-panel .panel-content {
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.panel-image {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
  display: block;
}

/* 文字分鏡 */
.text-panel {
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--bg-highlight), var(--bg-secondary));
}

.text-panel-wrapper .text-panel {
  padding: 1rem 1.5rem;
}

.speech-bubble {
  position: relative;
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.speech-bubble::before {
  content: '';
  position: absolute;
  left: 20px;
  top: -10px;
  border-width: 0 10px 10px 10px;
  border-style: solid;
  border-color: transparent transparent var(--border-light) transparent;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  left: 22px;
  top: -7px;
  border-width: 0 8px 8px 8px;
  border-style: solid;
  border-color: transparent transparent var(--bg-card) transparent;
}

.panel-text {
  font-family: var(--font-body);
  font-size: 1.1rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

.opening-text {
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
}

.ending-text {
  font-size: 1.15rem;
  font-style: italic;
  text-align: center;
}

/* 故事開頭面板 */
.opening-panel {
  border-color: #f5c518;
  box-shadow: 4px 4px 0 rgba(245, 197, 24, 0.4);
}

.opening-panel .text-panel {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
}

/* 故事結尾面板 */
.ending-panel {
  border-color: var(--color-primary);
  box-shadow: 4px 4px 0 rgba(224, 123, 103, 0.4);
}

.ending-panel .text-panel {
  background: linear-gradient(135deg, #fce4ec, #f8bbd9);
}

/* 作者標註 */
/* Requirements: 8.4 - 標註作者名稱 */
.panel-author {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-top: 2px dashed var(--border-light);
}

/* 完結標記 */
.story-end-mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-tertiary);
  animation: endMarkFadeIn 0.8s ease-out 0.5s both;
}

@keyframes endMarkFadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.end-icon {
  color: var(--color-success);
}

.end-text {
  font-size: 1.5rem;
  font-family: var(--font-head);
  font-weight: bold;
  color: var(--text-secondary);
}

/* ============================================
   排行榜和貢獻統計
   Requirements: 9.5, 9.6
   ============================================ */

.stats-section {
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--shadow-color);
  padding: 1.25rem;
  animation: statsFadeIn 0.6s ease-out 0.3s both;
}

@keyframes statsFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.section-icon {
  color: var(--color-warning);
}

.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
  border-radius: 0;
  transition: all 0.2s ease;
}

.leaderboard-item:hover {
  transform: translateX(4px);
  border-color: var(--border-color);
}

.leaderboard-item.is-first {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-color: #f5c518;
}

.leaderboard-item.is-second {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
  border-color: #bdbdbd;
}

.leaderboard-item.is-third {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-color: #ffb74d;
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.leaderboard-item.is-first .rank-badge {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #333;
}

.leaderboard-item.is-second .rank-badge {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
}

.leaderboard-item.is-third .rank-badge {
  background: linear-gradient(135deg, #cd7f32, #b87333);
}

.crown-icon {
  color: #333;
}

.rank-number {
  font-family: var(--font-head);
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 0.25rem;
}

.player-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.player-score {
  font-size: 1.1rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--color-success);
  flex-shrink: 0;
}

/* ============================================
   操作按鈕區域
   Requirements: 8.6
   ============================================ */

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 1rem 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  border: 3px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.action-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--shadow-color);
}

.action-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background: #c9604c;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

/* ============================================
   滾動條樣式
   ============================================ */

.story-review::-webkit-scrollbar {
  width: 8px;
}

.story-review::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.story-review::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 4px;
}

.story-review::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}

/* ============================================
   移動端優化
   ============================================ */

@media (max-width: 768px) {
  .story-review {
    padding: 0.5rem;
  }

  .review-container {
    gap: 1rem;
  }

  .review-header {
    padding: 1rem;
    box-shadow: 4px 4px 0 var(--shadow-color);
  }

  .story-title {
    font-size: 1.4rem;
    flex-direction: column;
    gap: 0.35rem;
  }

  .story-meta {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .story-panel {
    box-shadow: 3px 3px 0 var(--shadow-color);
  }

  .panel-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }

  .panel-text {
    font-size: 1rem;
  }

  .opening-text,
  .ending-text {
    font-size: 1.05rem;
  }

  .text-panel {
    padding: 1rem;
  }

  .speech-bubble {
    padding: 0.75rem 1rem;
  }

  .panel-author {
    font-size: 0.75rem;
    padding: 0.4rem 0.6rem;
  }

  .stats-section {
    padding: 1rem;
    box-shadow: 4px 4px 0 var(--shadow-color);
  }

  .section-title {
    font-size: 1.1rem;
  }

  .leaderboard-item {
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }

  .rank-badge {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }

  .player-name {
    font-size: 0.9rem;
  }

  .player-stats {
    gap: 0.5rem;
  }

  .stat-item {
    font-size: 0.7rem;
  }

  .player-score {
    font-size: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    box-shadow: 3px 3px 0 var(--shadow-color);
  }
}

/* 小屏幕進一步優化 */
@media (max-width: 480px) {
  .review-header {
    padding: 0.75rem;
  }

  .story-title {
    font-size: 1.2rem;
  }

  .image-panel .panel-content {
    min-height: 150px;
  }

  .panel-image {
    max-height: 300px;
  }

  .story-end-mark {
    padding: 1.5rem;
  }

  .end-text {
    font-size: 1.2rem;
  }
}
</style>
