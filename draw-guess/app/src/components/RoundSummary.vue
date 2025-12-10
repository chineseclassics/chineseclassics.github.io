<template>
  <div class="round-summary">
    <div class="summary-card">
      <!-- 等待選詞狀態的頂部提示 -->
      <div v-if="isWaitingForSelection" class="selection-waiting-banner">
        <div class="waiting-icon">
          <span class="pencil-animate"><PhPencil :size="24" weight="duotone" /></span>
        </div>
        <div class="waiting-text">
          <span class="next-drawer-name">{{ nextDrawerName }}</span> 正在選詞...
        </div>
        <div class="waiting-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>

      <!-- 標題 -->
      <div class="summary-header">
        <h2 class="summary-title">
          <PhClipboardText v-if="isWaitingForSelection" :size="24" weight="duotone" class="title-icon" />
          <PhPaintBrush v-else :size="24" weight="duotone" class="title-icon" />
          {{ isWaitingForSelection ? '上一輪回顧' : '輪次結束' }}
        </h2>
        <div class="round-info">第 {{ roundNumber }} / {{ totalRounds }} 輪</div>
      </div>

      <!-- 正確答案 -->
      <div class="answer-reveal">
        <div class="answer-label">正確答案</div>
        <div class="answer-text">{{ correctAnswer }}</div>
      </div>

      <!-- 畫家信息 -->
      <div class="drawer-section">
        <div class="drawer-info">
          <span class="drawer-label">畫家</span>
          <span class="drawer-name">{{ drawerName }}</span>
          <span class="drawer-score" v-if="drawerScore > 0">+{{ drawerScore }} 分</span>
        </div>
      </div>

      <!-- 猜中玩家列表 -->
      <div class="guessers-section">
        <div class="section-title">猜中的玩家</div>
        <div v-if="correctGuessers.length === 0" class="no-guessers">
          沒有人猜中 <PhSmileySad :size="18" weight="duotone" />
        </div>
        <div v-else class="guessers-list">
          <div 
            v-for="(guesser, index) in correctGuessers" 
            :key="guesser.userId"
            class="guesser-item"
          >
            <span class="guesser-rank">{{ index + 1 }}</span>
            <span class="guesser-name">{{ guesser.name }}</span>
            <span class="guesser-score">+{{ guesser.score }}</span>
          </div>
        </div>
      </div>

      <!-- 畫作評分區域 - 等待選詞時也可以繼續評分 -->
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

      <!-- 平均評分顯示 -->
      <div class="average-rating" v-if="totalRatings > 0">
        <span class="avg-label">平均評分</span>
        <span class="avg-score">{{ averageRating.toFixed(1) }}</span>
        <span class="avg-stars">
          <PhStar v-for="n in Math.round(averageRating)" :key="n" :size="16" weight="fill" class="star-icon" />
        </span>
        <span class="avg-count">({{ totalRatings }} 人已評)</span>
      </div>

      <!-- 下一位畫手提示 -->
      <div class="next-drawer-info" v-if="nextDrawerName && !isLastRound">
        <div class="next-drawer-label">下一輪畫手</div>
        <div class="next-drawer-name-display"><PhPencil :size="18" weight="duotone" /> {{ nextDrawerName }}</div>
      </div>

      <!-- 最後一輪提示 -->
      <div class="game-ending-info" v-if="isLastRound">
        <div class="ending-label"><PhConfetti :size="20" weight="duotone" /> 這是最後一輪！</div>
      </div>

      <!-- 倒計時由外部控制，組件內不再顯示 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { PhPencil, PhClipboardText, PhPaintBrush, PhSmileySad, PhStar, PhConfetti } from '@phosphor-icons/vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  roundNumber: number
  totalRounds: number
  correctAnswer: string
  drawerName: string
  drawerId: string
  drawerScore: number
  correctGuessers: Array<{ userId: string; name: string; score: number }>
  roundId: string
  isHost: boolean
  isLastRound: boolean
  // 等待選詞狀態相關
  isWaitingForSelection?: boolean
  nextDrawerName?: string
}>()

const emit = defineEmits<{
  (e: 'rating-submitted', rating: number): void
}>()

const authStore = useAuthStore()

// 評分狀態
const myRating = ref(0)
const hoverRating = ref(0)
const hasRated = ref(false)
const ratings = ref<Array<{ rater_id: string; rating: number }>>([])

// 計算屬性
const isDrawer = computed(() => authStore.user?.id === props.drawerId)

const averageRating = computed(() => {
  if (ratings.value.length === 0) return 0
  const sum = ratings.value.reduce((acc, r) => acc + r.rating, 0)
  return sum / ratings.value.length
})

const totalRatings = computed(() => ratings.value.length)

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

// 訂閱評分更新
function subscribeRatings() {
  const channel = supabase
    .channel(`ratings:${props.roundId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'drawing_ratings',
      filter: `round_id=eq.${props.roundId}`
    }, () => {
      loadRatings()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

let unsubscribe: (() => void) | null = null

onMounted(() => {
  loadRatings()
  unsubscribe = subscribeRatings()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// 監聽 roundId 變化，重新載入
watch(() => props.roundId, () => {
  loadRatings()
})
</script>

<style scoped>
.round-summary {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 0.5rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  animation: summaryPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes summaryPopIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.summary-card {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  padding: 1.25rem 1.5rem;
  box-shadow: 6px 6px 0 var(--shadow-color);
  position: relative;
  overflow: hidden;
}

/* 裝飾性背景紋理 */
.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 10% 10%, rgba(224, 123, 103, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 90% 90%, rgba(107, 175, 178, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

.summary-header {
  text-align: center;
  margin-bottom: 1rem;
  position: relative;
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
  border-radius: 28px 125px 15px 225px / 125px 30px 205px 225px;
}

/* 答案顯示 */
.answer-reveal {
  text-align: center;
  padding: 0.875rem;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  margin-bottom: 0.875rem;
  border: 2px solid var(--color-success);
  animation: revealPulse 0.6s ease-out;
}

@keyframes revealPulse {
  0% { transform: scale(0.95); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

.answer-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.answer-text {
  font-size: 1.8rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: #2e7d32;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.1);
}

/* 畫家信息 */
.drawer-section {
  text-align: center;
  padding: 0.6rem;
  background: var(--bg-secondary);
  border-radius: 125px 25px 185px 25px / 25px 205px 25px 205px;
  margin-bottom: 0.875rem;
  border: 2px dashed var(--border-light);
}

.drawer-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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
  border-radius: 28px 125px 15px 225px / 125px 30px 205px 225px;
  font-size: 0.85rem;
  font-weight: bold;
  animation: scorePopIn 0.4s ease-out 0.3s both;
}

@keyframes scorePopIn {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* 猜中玩家 */
.guessers-section {
  margin-bottom: 0.875rem;
}

.section-title {
  font-weight: bold;
  font-family: var(--font-head);
  margin-bottom: 0.4rem;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.no-guessers {
  text-align: center;
  color: var(--text-tertiary);
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 15px 225px 25px 115px / 225px 150px 155px 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.guessers-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 120px;
  overflow-y: auto;
}

.guesser-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: var(--bg-secondary);
  border-radius: 250px 15px 20px 115px / 15px 80px 105px 115px;
  animation: guesserSlideIn 0.3s ease-out both;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.guesser-item:hover {
  border-color: var(--border-light);
  transform: translateX(3px);
}

.guesser-item:nth-child(1) { animation-delay: 0.1s; }
.guesser-item:nth-child(2) { animation-delay: 0.2s; }
.guesser-item:nth-child(3) { animation-delay: 0.3s; }
.guesser-item:nth-child(4) { animation-delay: 0.4s; }
.guesser-item:nth-child(5) { animation-delay: 0.5s; }

@keyframes guesserSlideIn {
  from { opacity: 0; transform: translateX(-15px); }
  to { opacity: 1; transform: translateX(0); }
}

.guesser-rank {
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
  margin-right: 0.5rem;
}

.guesser-item:first-child .guesser-rank {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #333;
  box-shadow: 0 2px 4px rgba(255, 179, 0, 0.4);
}

.guesser-name {
  flex: 1;
  font-family: var(--font-head);
  font-size: 0.85rem;
}

.guesser-score {
  color: var(--color-success);
  font-weight: bold;
  font-size: 0.85rem;
}

/* 評分區域 */
.rating-section {
  text-align: center;
  padding: 0.75rem;
  border: 2px dashed var(--border-light);
  border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;
  margin-bottom: 0.875rem;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.rating-section:hover {
  border-color: var(--color-warning);
  background: rgba(240, 192, 120, 0.1);
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
  display: flex;
  align-items: center;
  justify-content: center;
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

.star-icon {
  color: #f5c518;
}

.rating-info {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.rated-text {
  color: var(--color-secondary);
  font-weight: bold;
}

/* 平均評分 */
.average-rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-radius: 125px 25px 185px 25px / 25px 205px 25px 205px;
  margin-bottom: 0.875rem;
  border: 2px solid var(--color-warning);
}

.avg-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.avg-score {
  font-size: 1.3rem;
  font-weight: bold;
  color: #f57c00;
}

.avg-stars {
  font-size: 0.9rem;
  display: flex;
  gap: 2px;
}

.avg-count {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* 底部 */
.summary-footer {
  text-align: center;
  margin-top: 1rem;
}

.countdown {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.next-btn {
  background: var(--color-secondary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  font-size: 1rem;
  font-family: var(--font-head);
  cursor: pointer;
  transition: background 0.2s;
}

.next-btn:hover {
  background: var(--color-secondary-dark, #0056b3);
}

/* ============================================
   等待選詞狀態樣式
   ============================================ */

.selection-waiting-banner {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border: 2px solid var(--color-secondary);
  border-radius: 15px 225px 25px 115px / 225px 150px 155px 25px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  animation: waitingPulse 2s ease-in-out infinite;
}

@keyframes waitingPulse {
  0%, 100% {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 0 rgba(107, 175, 178, 0.3);
  }
  50% {
    border-color: #5a9ea1;
    box-shadow: 0 0 8px 2px rgba(107, 175, 178, 0.2);
  }
}

.waiting-icon {
  color: var(--color-secondary);
}

.pencil-animate {
  display: inline-block;
  animation: pencilWrite 1s ease-in-out infinite;
}

@keyframes pencilWrite {
  0%, 100% {
    transform: rotate(-10deg) translateY(0);
  }
  50% {
    transform: rotate(10deg) translateY(-3px);
  }
}

.waiting-text {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-family: var(--font-head);
}

.next-drawer-name {
  font-weight: bold;
  color: var(--color-secondary);
}

.waiting-dots {
  display: flex;
  gap: 0.25rem;
}

.waiting-dots .dot {
  width: 8px;
  height: 8px;
  background: var(--color-secondary);
  border-radius: 50%;
  animation: dotBounce 1.4s ease-in-out infinite;
}

.waiting-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.waiting-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.waiting-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotBounce {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* 下一位畫手提示 */
.next-drawer-info {
  margin-top: 0.875rem;
  padding: 0.6rem 0.875rem;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  text-align: center;
  border: 2px solid var(--color-success);
  animation: fadeInUp 0.4s ease-out 0.2s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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

/* 最後一輪提示 */
.game-ending-info {
  margin-top: 0.875rem;
  padding: 0.6rem 0.875rem;
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-radius: 125px 25px 185px 25px / 25px 205px 25px 205px;
  text-align: center;
  border: 2px solid var(--color-warning);
  animation: celebratePulse 1.5s ease-in-out infinite;
}

@keyframes celebratePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.ending-label {
  font-size: 1rem;
  font-weight: bold;
  color: #f57c00;
  font-family: var(--font-head);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
</style>
