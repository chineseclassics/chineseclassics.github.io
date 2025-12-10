<template>
  <div class="round-summary">
    <div class="summary-card">
      <!-- 等待選詞狀態的頂部提示 -->
      <div v-if="isWaitingForSelection" class="selection-waiting-banner">
        <div class="waiting-icon">
          <span class="pencil-animate">✏️</span>
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
        <h2 class="summary-title">{{ isWaitingForSelection ? '📋 上一輪回顧' : '🎨 輪次結束' }}</h2>
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
          沒有人猜中 😢
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
            ⭐
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
        <span class="avg-stars">{{ '⭐'.repeat(Math.round(averageRating)) }}</span>
        <span class="avg-count">({{ totalRatings }} 人已評)</span>
      </div>

      <!-- 倒計時由外部控制，組件內不再顯示 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
  max-width: 500px;
  margin: 0 auto;
  padding: 1rem;
}

.summary-card {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.summary-title {
  font-size: 1.5rem;
  font-family: var(--font-head);
  margin: 0 0 0.5rem 0;
}

.round-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 答案顯示 */
.answer-reveal {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.answer-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.answer-text {
  font-size: 2rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: #2e7d32;
}

/* 畫家信息 */
.drawer-section {
  text-align: center;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.drawer-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.drawer-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.drawer-name {
  font-weight: bold;
  font-family: var(--font-head);
}

.drawer-score {
  background: var(--color-warning);
  color: var(--text-primary);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
}

/* 猜中玩家 */
.guessers-section {
  margin-bottom: 1rem;
}

.section-title {
  font-weight: bold;
  font-family: var(--font-head);
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.no-guessers {
  text-align: center;
  color: var(--text-tertiary);
  padding: 0.5rem;
}

.guessers-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.guesser-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.guesser-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: bold;
  margin-right: 0.5rem;
}

.guesser-item:first-child .guesser-rank {
  background: #ffd700;
  color: #333;
}

.guesser-name {
  flex: 1;
  font-family: var(--font-head);
}

.guesser-score {
  color: #28a745;
  font-weight: bold;
}

/* 評分區域 */
.rating-section {
  text-align: center;
  padding: 1rem;
  border: 2px dashed var(--border-light);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.star-rating {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.star-btn {
  font-size: 1.8rem;
  background: none;
  border: none;
  cursor: pointer;
  filter: grayscale(100%);
  transition: all 0.2s;
  padding: 0.25rem;
}

.star-btn:hover:not(:disabled),
.star-btn.active {
  filter: grayscale(0%);
  transform: scale(1.1);
}

.star-btn.selected {
  filter: grayscale(0%);
}

.star-btn:disabled {
  cursor: default;
}

.rating-info {
  font-size: 0.85rem;
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
  padding: 0.75rem;
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.avg-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.avg-score {
  font-size: 1.5rem;
  font-weight: bold;
  color: #f57c00;
}

.avg-stars {
  font-size: 1rem;
}

.avg-count {
  font-size: 0.8rem;
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
  border-radius: 8px;
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
  border: 2px solid #64b5f6;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #64b5f6;
    box-shadow: 0 0 0 0 rgba(100, 181, 246, 0.4);
  }
  50% {
    border-color: #2196f3;
    box-shadow: 0 0 8px 2px rgba(33, 150, 243, 0.3);
  }
}

.waiting-icon {
  font-size: 1.5rem;
}

.pencil-animate {
  display: inline-block;
  animation: pencil-write 1s ease-in-out infinite;
}

@keyframes pencil-write {
  0%, 100% {
    transform: rotate(-10deg) translateY(0);
  }
  50% {
    transform: rotate(10deg) translateY(-3px);
  }
}

.waiting-text {
  font-size: 1rem;
  color: var(--text-primary);
}

.next-drawer-name {
  font-weight: bold;
  color: #1976d2;
}

.waiting-dots {
  display: flex;
  gap: 0.25rem;
}

.waiting-dots .dot {
  width: 6px;
  height: 6px;
  background: #64b5f6;
  border-radius: 50%;
  animation: dot-bounce 1.4s ease-in-out infinite;
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

@keyframes dot-bounce {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
