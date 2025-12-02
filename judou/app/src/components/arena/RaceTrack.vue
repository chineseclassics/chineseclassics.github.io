<!--
  句豆 - 賽道組件
  展示隊伍在賽道上的排名和位置，類似南風詩詞的賽道設計
-->
<template>
  <div class="race-track-container">
    <!-- 賽道背景 -->
    <div class="race-track" :style="trackStyle">
      <!-- 起點標記 -->
      <div class="track-start">
        <span class="start-label">起點</span>
      </div>
      
      <!-- 終點標記 -->
      <div class="track-finish">
        <span class="finish-label">終點</span>
        <div class="finish-line"></div>
      </div>
      
      <!-- 隊伍圖標（在賽道上） -->
      <div
        v-for="team in sortedTeams"
        :key="team.id"
        class="team-racer"
        :class="{ 'my-team': team.isMyTeam, 'is-first': team.rank === 1 }"
        :style="getRacerStyle(team)"
      >
        <!-- 隊伍徽章 -->
        <TeamBadge
          v-if="team.productType"
          :product-type="team.productType"
          :size="racerSize"
          class="racer-badge"
        />
        
        <!-- 排名標籤 -->
        <div class="racer-rank-badge">{{ team.rank }}</div>
        
        <!-- 隊伍平均分顯示（在圖標下方） -->
        <div class="racer-score-label">
          {{ team.displayAvg.toFixed(1) }}
        </div>
        
        <!-- 隊伍信息氣泡（懸停顯示） -->
        <div class="racer-tooltip">
          <div class="tooltip-name">{{ team.name }}</div>
          <div class="tooltip-score">平均分: {{ team.displayAvg.toFixed(2) }}</div>
          <div v-if="team.memberCount" class="tooltip-members">
            {{ team.completedCount }}/{{ team.memberCount }} 完成
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部排名信息（可選） -->
    <div v-if="showRankings" class="rankings-info">
      <div
        v-for="team in sortedTeams"
        :key="team.id"
        class="ranking-item"
        :class="{ 'my-team': team.isMyTeam }"
      >
        <span class="ranking-number">#{{ team.rank }}</span>
        <TeamBadge
          v-if="team.productType"
          :product-type="team.productType"
          :size="40"
          class="ranking-badge"
        />
        <span class="ranking-name">{{ team.name }}</span>
        <span class="ranking-score">{{ team.displayAvg.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TeamBadge from './TeamBadge.vue'
import { type GameTeam, type BeanProductType } from '@/types/game'

interface TeamRacer {
  id: string
  team: GameTeam
  displayAvg: number
  rank: number
  productType: BeanProductType | null
  isMyTeam: boolean
  memberCount?: number
  completedCount?: number
  name: string
}

interface Props {
  teams: TeamRacer[]
  maxScore?: number  // 最大分數（用於計算百分比），如果不提供則自動計算
  height?: number | string  // 賽道高度
  racerSize?: number  // 選手圖標大小
  showRankings?: boolean  // 是否顯示底部排名信息
}

const props = withDefaults(defineProps<Props>(), {
  maxScore: undefined,
  height: 120,
  racerSize: 48,
  showRankings: false,
})

// 按分數排序的隊伍列表
const sortedTeams = computed(() => {
  return [...props.teams].sort((a, b) => b.displayAvg - a.displayAvg)
})

// 計算最大分數（用於定位）
const computedMaxScore = computed(() => {
  if (props.maxScore !== undefined && props.maxScore > 0) {
    return props.maxScore
  }
  const scores = props.teams.map(t => t.displayAvg)
  const max = Math.max(...scores, 1)  // 至少為1，避免除零
  return max
})

// 賽道樣式
const trackStyle = computed(() => {
  const heightValue = typeof props.height === 'number' 
    ? `${props.height}px` 
    : props.height
  return {
    height: heightValue,
  }
})

// 計算每個隊伍在賽道上的位置
function getRacerStyle(team: TeamRacer) {
  // 優化的位置計算邏輯：
  // 1. 起點留出 8% 空間，終點留出 15% 空間（確保第一名不會太靠近終點）
  // 2. 使用可用的 77% 空間來展示相對位置和差距
  const startMargin = 8  // 起點邊距
  const endMargin = 15   // 終點邊距（給第一名留出空間）
  const availableSpace = 100 - startMargin - endMargin  // 77%
  
  let percentage: number
  
  if (computedMaxScore.value <= 0 || sortedTeams.value.length === 0) {
    // 如果沒有分數或沒有隊伍，平均分佈
    const rankIndex = sortedTeams.value.findIndex(t => t.id === team.id)
    percentage = startMargin + (availableSpace / Math.max(1, sortedTeams.value.length - 1)) * rankIndex
  } else {
    // 計算基礎位置：根據分數比例
    const scoreRatio = team.displayAvg / computedMaxScore.value
    
    // 為了更好地展示相對差距，使用非線性映射
    // 分數差距越大，視覺距離越大
    const normalizedRatio = Math.pow(scoreRatio, 0.7)  // 使用 0.7 次方，讓差距更明顯
    const mappedPercentage = startMargin + (normalizedRatio * availableSpace)
    
    // 確保第一名不會太靠近終點（最多到 85%）
    percentage = Math.min(mappedPercentage, 100 - endMargin)
    
    // 如果分數相同，按排名稍微錯開（但保持在同一條賽道上）
    const sameScoreTeams = sortedTeams.value.filter(t => 
      Math.abs(t.displayAvg - team.displayAvg) < 0.01
    )
    if (sameScoreTeams.length > 1) {
      const sameScoreRank = sameScoreTeams.findIndex(t => t.id === team.id)
      percentage += sameScoreRank * 0.5  // 相同分數時，每個隊伍偏移 0.5%
    }
  }
  
  // 確保在有效範圍內
  percentage = Math.max(startMargin, Math.min(100 - endMargin, percentage))
  
  // 所有隊伍都在完全同一水平線上，不做垂直偏移
  // 通過水平位置的差異來展示相對距離和排序
  
  return {
    left: `${percentage}%`,
    top: '50%',
    transform: `translateX(-50%) translateY(-50%)`,
  }
}
</script>

<style scoped>
.race-track-container {
  width: 100%;
  background: rgba(58, 80, 32, 0.2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(139, 178, 79, 0.2);
  backdrop-filter: blur(4px);
}

/* 賽道主體 - 單一跑道設計 */
.race-track {
  position: relative;
  width: 100%;
  /* 使用句豆綠色系的深色漸變，適合深色背景 */
  background: linear-gradient(
    to bottom,
    rgba(88, 122, 43, 0.3) 0%,
    rgba(69, 97, 36, 0.4) 25%,
    rgba(58, 80, 32, 0.5) 35%,
    rgba(58, 80, 32, 0.5) 65%,
    rgba(69, 97, 36, 0.4) 75%,
    rgba(88, 122, 43, 0.3) 100%
  );
  border-top: 3px solid var(--color-primary-500, #8bb24f);
  border-bottom: 3px solid var(--color-primary-500, #8bb24f);
  overflow: visible;  /* 允許隊伍圖標超出邊界 */
  
  /* 添加跑道中心線效果，強調這是單一跑道 */
  background-image: 
    repeating-linear-gradient(
      to right,
      transparent 0,
      transparent calc(50% - 1px),
      rgba(139, 178, 79, 0.2) calc(50% - 1px),
      rgba(139, 178, 79, 0.2) calc(50% + 1px),
      transparent calc(50% + 1px),
      transparent 100%
    );
}

/* 起點標記 */
.track-start {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(58, 80, 32, 0.6);
  border-right: 2px dashed var(--color-primary-400, #a8c870);
  z-index: 1;
  backdrop-filter: blur(4px);
}

.start-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary-200, #deedc4);
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* 終點標記 */
.track-finish {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(58, 80, 32, 0.6);
  border-left: 3px solid var(--color-harvest, #e3a63d);
  z-index: 1;
  backdrop-filter: blur(4px);
}

.finish-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-harvest, #e3a63d);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin-bottom: 20px;
}

.finish-line {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: repeating-linear-gradient(
    to bottom,
    var(--color-harvest, #e3a63d) 0px,
    var(--color-harvest, #e3a63d) 10px,
    rgba(58, 80, 32, 0.8) 10px,
    rgba(58, 80, 32, 0.8) 20px
  );
}

/* 隊伍選手 */
.team-racer {
  position: absolute;
  z-index: 10;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, left, top;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  /* 確保圖標和分數在同一垂直線上 */
  transform-origin: center center;
  /* 確保所有子元素都垂直居中對齊 */
  text-align: center;
}

.team-racer.my-team {
  z-index: 15;
  filter: drop-shadow(0 4px 12px rgba(251, 191, 36, 0.6));
}

.team-racer.is-first {
  filter: drop-shadow(0 4px 16px rgba(251, 191, 36, 0.8));
}

.racer-badge {
  position: relative;
  border: 3px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.team-racer.my-team .racer-badge {
  transform: scale(1.15);
}

.team-racer.my-team .racer-badge {
  border-color: #fbbf24;
  border-width: 4px;
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.5);
}

.team-racer.is-first .racer-badge {
  border-color: #f59e0b;
  border-width: 4px;
  animation: pulse-first 2s ease-in-out infinite;
}

@keyframes pulse-first {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(251, 191, 36, 0.5);
  }
  50% {
    box-shadow: 0 6px 24px rgba(251, 191, 36, 0.8);
  }
}

/* 排名標籤 */
.racer-rank-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 24px;
  height: 24px;
  background: #dc2626;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.team-racer.is-first .racer-rank-badge {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  animation: pulse-badge 1.5s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 隊伍分數標籤 */
.racer-score-label {
  position: relative;
  min-width: 50px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 12;
  border: 2px solid rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums; /* 等寬數字，避免數字跳動 */
  flex-shrink: 0;
  /* 確保與父元素對齊，不影響父元素的 transform */
  align-self: center;
  margin: 0 auto;
}

.team-racer.my-team .racer-score-label {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 12px rgba(251, 191, 36, 0.5);
}

.team-racer.is-first .racer-score-label {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 2px 12px rgba(251, 191, 36, 0.6);
  animation: pulse-score 2s ease-in-out infinite;
}

@keyframes pulse-score {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 工具提示 */
.racer-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 20;
}

.racer-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.85);
}

.team-racer:hover .racer-tooltip {
  opacity: 1;
}

.tooltip-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.tooltip-score {
  font-size: 0.7rem;
  opacity: 0.9;
}

.tooltip-members {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-top: 2px;
}

/* 底部排名信息 */
.rankings-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  justify-content: center;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.ranking-item.my-team {
  border-color: #fbbf24;
  background: #fef3c7;
  font-weight: 600;
}

.ranking-number {
  font-weight: 700;
  color: #dc2626;
  font-size: 0.875rem;
}

.ranking-badge {
  flex-shrink: 0;
}

.ranking-name {
  font-size: 0.875rem;
  color: #374151;
}

.ranking-score {
  font-weight: 600;
  color: #059669;
  font-size: 0.875rem;
}
</style>
