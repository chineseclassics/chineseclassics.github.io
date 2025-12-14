<template>
  <div class="storyboard-summary">
    <div class="summary-card">
      <!-- 標題 -->
      <div class="summary-header">
        <h2 class="summary-title">
          <PhFilmStrip :size="24" weight="duotone" class="title-icon" />
          本鏡完成
        </h2>
        <div class="round-info">
          第 {{ gameNumber || 1 }} 場 · 第 {{ roundNumber }} / {{ totalRounds }} 鏡
        </div>
      </div>

      <!-- 本鏡圖文展示（漫畫分鏡風格） -->
      <div class="comic-panel-section">
        <!-- 分鏡標籤 -->
        <div class="panel-badge">
          <PhFilmStrip :size="14" weight="fill" /> 第 {{ roundNumber }} 鏡
        </div>
        
        <!-- 圖像區域 -->
        <div class="panel-image-area" v-if="roundImage">
          <img :src="roundImage" :alt="`第 ${roundNumber} 鏡畫作`" class="panel-image" />
          <div class="image-author">
            <PhPaintBrush :size="12" weight="fill" />
            <span>{{ drawerName }}</span>
            <span class="author-score" v-if="drawerScore > 0">+{{ drawerScore }}</span>
          </div>
        </div>
        
        <!-- 文字區域（勝出句子，明顯標識） -->
        <div class="panel-text-area winning">
          <div class="winning-label">
            <PhTrophy :size="16" weight="fill" class="trophy-icon" />
            <span>勝出句子</span>
          </div>
          <div class="speech-bubble winning-bubble">
            <p class="panel-text">{{ winningSentence }}</p>
          </div>
          <div class="text-author">
            <PhPen :size="12" weight="fill" />
            <span>{{ winnerName }}</span>
            <span class="author-score" v-if="screenwriterScore > 0">+{{ screenwriterScore }}</span>
            <span class="vote-count" v-if="winnerVoteCount > 0">
              <PhHeart :size="12" weight="fill" /> {{ winnerVoteCount }}票
            </span>
            <span v-if="hasTie" class="tie-badge">平票隨機</span>
          </div>
        </div>
      </div>

      <!-- 分鏡師信息 -->
      <div class="drawer-section">
        <div class="drawer-info">
          <PhPaintBrush :size="18" weight="duotone" class="drawer-icon" />
          <span class="drawer-label">分鏡師</span>
          <span class="drawer-name">{{ drawerName }}</span>
          <span class="drawer-score" v-if="drawerScore > 0">+{{ drawerScore }} 分</span>
        </div>
        <div class="score-breakdown" v-if="voterCount > 0">
          <span class="breakdown-item">基礎分 5 + 投票人數 {{ voterCount }} × 2 = {{ drawerScore }}</span>
        </div>
      </div>

      <!-- 投票統計 -->
      <div class="voting-stats" v-if="submissions.length > 0">
        <div class="section-title">投票結果</div>
        <div class="submissions-list">
          <div 
            v-for="(item, index) in sortedSubmissions" 
            :key="item.submission.id"
            class="submission-item"
            :class="{ 'is-winner': item.submission.id === winnerSubmissionId }"
          >
            <span class="submission-rank">{{ index + 1 }}</span>
            <span class="submission-sentence">{{ item.submission.sentence }}</span>
            <span class="submission-author">{{ getAuthorName(item.submission.userId) }}</span>
            <span class="submission-votes">
              <PhHeart :size="14" weight="fill" /> {{ item.voteCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- 無提交提示 -->
      <div class="no-submissions" v-else>
        <PhSmileySad :size="24" weight="duotone" />
        <span>本鏡沒有編劇提交句子</span>
      </div>

      <!-- 畫作評分區域 -->
      <div class="rating-section" v-if="!isDrawer">
        <div class="section-title">為這幅畫評分</div>
        <div class="star-rating">
          <button 
            v-for="star in 5" 
            :key="star"
            class="star-btn"
            :class="{ 'active': star <= (hoverRating || myRating), 'selected': star <= myRating }"
            @mouseenter="hoverRating = star"
            @mouseleave="hoverRating = 0"
            @click="submitRating(star)"
            :disabled="hasRated"
          >
            <PhStar :size="24" :weight="star <= (hoverRating || myRating) ? 'fill' : 'duotone'" />
          </button>
        </div>
        <div class="rating-info">
          <span v-if="hasRated" class="rated-text">你的評分：{{ myRating }} 星</span>
          <span v-else class="rate-hint">點擊星星評分</span>
        </div>
      </div>

      <!-- 下一鏡提示 -->
      <div class="next-round-info" v-if="nextDrawerName && !isLastRound">
        <div class="next-drawer-label">下一鏡分鏡師</div>
        <div class="next-drawer-name-display">
          <PhPencil :size="18" weight="duotone" /> {{ nextDrawerName }}
        </div>
      </div>

      <!-- 完成一場提示和按鈕 -->
      <div class="game-round-complete" v-if="isGameRoundComplete && isHost">
        <div class="round-complete-label">
          <PhConfetti :size="20" weight="duotone" /> 一場完成！
        </div>
        <p class="round-complete-desc">
          所有玩家都已輪流擔任分鏡師一次。
        </p>
        <div class="round-complete-actions">
          <!-- 繼續下一場 -->
          <button 
            class="paper-btn btn-primary next-game-btn"
            @click="$emit('continue-next-game')"
          >
            <PhArrowRight :size="18" weight="bold" />
            繼續下一場
          </button>
          <!-- 設為最後一場 -->
          <button 
            class="paper-btn btn-warning set-final-btn"
            @click="$emit('set-final-round')"
          >
            <PhFlag :size="18" weight="bold" />
            設為最後一場
          </button>
          <!-- 結束遊戲 -->
          <button 
            class="paper-btn btn-secondary end-game-btn"
            @click="$emit('end-game')"
          >
            <PhStop :size="18" weight="bold" />
            結束遊戲
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  PhFilmStrip, 
  PhTrophy, 
  PhHeart, 
  PhPaintBrush, 
  PhPencil, 
  PhPen,
  PhStar, 
  PhConfetti,
  PhSmileySad,
  PhArrowRight,
  PhFlag,
  PhStop
} from '@phosphor-icons/vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useRoomStore } from '../stores/room'
import type { Submission } from '../types/storyboard'

const props = defineProps<{
  roundNumber: number
  totalRounds: number
  gameNumber?: number
  // 當前輪次畫作圖像
  roundImage?: string
  // 勝出句子信息
  winningSentence: string
  winnerName: string
  winnerId: string
  winnerSubmissionId?: string
  winnerVoteCount: number
  hasTie?: boolean
  // 畫家信息
  drawerName: string
  drawerId: string
  drawerScore: number
  voterCount: number
  // 編劇得分
  screenwriterScore: number
  // 所有提交
  submissions: Array<{ submission: Submission; voteCount: number }>
  // 輪次 ID（用於評分）
  roundId: string
  // 控制
  isHost: boolean
  isLastRound: boolean
  nextDrawerName?: string
  isGameRoundComplete?: boolean
}>()

const emit = defineEmits<{
  (e: 'rating-submitted', rating: number): void
  (e: 'continue-next-game'): void
  (e: 'set-final-round'): void
  (e: 'end-game'): void
}>()

const authStore = useAuthStore()
const roomStore = useRoomStore()

// 評分狀態
const myRating = ref(0)
const hoverRating = ref(0)
const hasRated = ref(false)
const ratings = ref<Array<{ rater_id: string; rating: number }>>([])

// 計算屬性
const isDrawer = computed(() => authStore.user?.id === props.drawerId)

// 按投票數排序的提交列表
const sortedSubmissions = computed(() => {
  return [...props.submissions].sort((a, b) => b.voteCount - a.voteCount)
})

// 獲取作者名稱
function getAuthorName(userId: string): string {
  const participant = roomStore.participants.find(p => p.user_id === userId)
  return participant?.nickname || '未知'
}

// 提交評分
async function submitRating(rating: number) {
  if (hasRated.value || isDrawer.value || !authStore.user) return

  try {
    const { error } = await supabase
      .from('drawing_ratings')
      .upsert({
        round_id: props.roundId,
        rater_id: authStore.user.id,
        drawer_id: props.drawerId,
        rating: rating
      }, {
        onConflict: 'round_id,rater_id'
      })

    if (error) throw error

    myRating.value = rating
    hasRated.value = true
    emit('rating-submitted', rating)
  } catch (err) {
    console.error('提交評分錯誤:', err)
  }
}

// 載入評分
async function loadRatings() {
  try {
    const { data, error } = await supabase
      .from('drawing_ratings')
      .select('rater_id, rating')
      .eq('round_id', props.roundId)

    if (error) throw error

    ratings.value = data || []

    // 檢查當前用戶是否已評分
    if (authStore.user) {
      const myExistingRating = ratings.value.find(r => r.rater_id === authStore.user!.id)
      if (myExistingRating) {
        myRating.value = myExistingRating.rating
        hasRated.value = true
      }
    }
  } catch (err) {
    console.error('載入評分錯誤:', err)
  }
}

onMounted(() => {
  loadRatings()
})

// 監聽 roundId 變化，重新載入
watch(() => props.roundId, () => {
  myRating.value = 0
  hoverRating.value = 0
  hasRated.value = false
  loadRatings()
})
</script>


<style scoped>
.storyboard-summary {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 0.5rem;
  animation: summaryPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes summaryPopIn {
  0% { opacity: 0; transform: scale(0.8) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.summary-card {
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  padding: 1rem 1.25rem;
  box-shadow: 6px 6px 0 var(--shadow-color);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-header {
  text-align: center;
  margin-bottom: 0.5rem;
}

.summary-title {
  font-size: 1.4rem;
  font-family: var(--font-head);
  margin: 0 0 0.35rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-primary);
}

.title-icon {
  color: var(--color-primary);
  animation: iconBounce 2s ease-in-out infinite;
}

@keyframes iconBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.round-info {
  color: var(--text-secondary);
  font-size: 0.85rem;
  background: var(--bg-secondary);
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 0;
}

/* 勝出句子區域 */
/* ========== 漫畫分鏡風格展示 ========== */
.comic-panel-section {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  box-shadow: 3px 3px 0 var(--shadow-color);
  overflow: hidden;
  animation: revealPulse 0.6s ease-out;
}

.comic-panel-section .panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  padding: 0.2rem 0.5rem;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.panel-image-area {
  position: relative;
  background: #f5f5f5;
  border-bottom: 2px dashed var(--border-light);
}

.panel-image-area .panel-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  display: block;
  /* 移除 paper.css 的不規則邊框效果 */
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.panel-image-area .image-author {
  position: absolute;
  bottom: 0.3rem;
  right: 0.3rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.9);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}

.panel-text-area {
  padding: 0.6rem 0.75rem;
  background: linear-gradient(135deg, var(--bg-highlight), var(--bg-secondary));
}

/* 勝出句子明顯標識 */
.panel-text-area.winning {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-top: 3px solid #ffc107;
}

.winning-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #e65100;
  margin-bottom: 0.5rem;
}

.winning-label .trophy-icon {
  color: #ffc107;
}

.speech-bubble.winning-bubble {
  border-color: #ffc107;
  background: white;
}

.panel-text-area .speech-bubble {
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  position: relative;
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.panel-text-area .speech-bubble::before {
  content: '';
  position: absolute;
  left: 20px;
  top: -8px;
  border-width: 0 8px 8px 8px;
  border-style: solid;
  border-color: transparent transparent var(--border-light) transparent;
}

.panel-text-area .speech-bubble::after {
  content: '';
  position: absolute;
  left: 21px;
  top: -5px;
  border-width: 0 7px 7px 7px;
  border-style: solid;
  border-color: transparent transparent var(--bg-card) transparent;
}

.panel-text-area .panel-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 0;
}

.panel-text-area .text-author {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

.author-score {
  color: var(--color-success);
  font-weight: 600;
}

.vote-count {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  color: #e91e63;
  font-weight: 600;
  margin-left: 0.3rem;
}

.trophy-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  color: #ffc107;
  font-weight: 600;
  margin-left: 0.3rem;
}

.tie-badge {
  font-size: 0.65rem;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  margin-left: 0.3rem;
}

/* 舊的勝出句子區域樣式（保留兼容性） */
.winning-sentence-section {
  text-align: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-radius: 0;
  border: 3px solid #ff9800;
  animation: revealPulse 0.6s ease-out;
}

@keyframes revealPulse {
  0% { transform: scale(0.95); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

.section-label {
  font-size: 0.85rem;
  color: #e65100;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-weight: 600;
}

.trophy-icon {
  color: #ffc107;
}

.winning-sentence {
  font-size: 1.3rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.winner-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.winner-label {
  color: var(--text-secondary);
}

.winner-name {
  font-weight: bold;
  color: var(--text-primary);
}

.winner-score {
  background: var(--color-success);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 0;
  font-size: 0.85rem;
  font-weight: bold;
  animation: scorePopIn 0.4s ease-out 0.3s both;
}

@keyframes scorePopIn {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.vote-info {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.vote-icon {
  color: #e91e63;
}

.tie-badge {
  background: var(--color-warning);
  color: var(--text-primary);
  padding: 0.1rem 0.4rem;
  border-radius: 0;
  font-size: 0.75rem;
}

/* 畫家信息 */
.drawer-section {
  text-align: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 0;
  border: 2px dashed var(--border-light);
}

.drawer-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.drawer-icon {
  color: var(--color-secondary);
}

.drawer-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.drawer-name {
  font-weight: bold;
  font-family: var(--font-head);
  font-size: 1rem;
}

.drawer-score {
  background: var(--color-warning);
  color: var(--text-primary);
  padding: 0.15rem 0.5rem;
  border-radius: 0;
  font-size: 0.85rem;
  font-weight: bold;
}

.score-breakdown {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* 投票統計 */
.voting-stats {
  margin-top: 0.5rem;
}

.section-title {
  font-weight: bold;
  font-family: var(--font-head);
  margin-bottom: 0.4rem;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 150px;
  overflow-y: auto;
}

.submission-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: var(--bg-secondary);
  border-radius: 0;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  gap: 0.5rem;
}

.submission-item.is-winner {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-color: #ff9800;
}

.submission-rank {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: bold;
  flex-shrink: 0;
}

.submission-item.is-winner .submission-rank {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #333;
}

.submission-sentence {
  flex: 1;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-author {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.submission-votes {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: #e91e63;
  flex-shrink: 0;
}

/* 無提交提示 */
.no-submissions {
  text-align: center;
  color: var(--text-tertiary);
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* 評分區域 */
.rating-section {
  text-align: center;
  padding: 0.6rem 0.75rem;
  border: 2px dashed var(--border-light);
  border-radius: 0;
  background: var(--bg-secondary);
}

.star-rating {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.4rem 0;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  padding: 0.2rem;
}

.star-btn:hover:not(:disabled),
.star-btn.active {
  color: #f5c518;
  transform: scale(1.2);
}

.star-btn.selected {
  color: #f5c518;
}

.star-btn:disabled {
  cursor: default;
}

.rating-info {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.rated-text {
  color: var(--color-secondary);
  font-weight: bold;
}

/* 下一輪提示 */
.next-round-info {
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-radius: 0;
  text-align: center;
  border: 2px solid var(--color-success);
}

.next-drawer-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.2rem;
}

.next-drawer-name-display {
  font-size: 1rem;
  font-weight: bold;
  color: var(--color-success);
  font-family: var(--font-head);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

/* 完成一局提示 */
.game-round-complete {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-radius: 0;
  text-align: center;
  border: 3px solid var(--color-success);
}

.round-complete-label {
  font-size: 1rem;
  font-weight: bold;
  color: #2e7d32;
  font-family: var(--font-head);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.round-complete-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
}

.round-complete-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.next-game-btn,
.set-final-btn,
.end-game-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-warning {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-color: var(--color-warning);
  color: #e65100;
}

.btn-warning:hover {
  background: linear-gradient(135deg, #ffe0b2, #ffcc80);
}

/* 移動端優化 */
@media (max-width: 768px) {
  .storyboard-summary {
    max-width: 100%;
    padding: 0.25rem;
  }

  .summary-card {
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }

  .summary-title {
    font-size: 1.2rem;
  }

  .winning-sentence {
    font-size: 1.1rem;
  }

  .submissions-list {
    max-height: 120px;
  }
}
</style>
