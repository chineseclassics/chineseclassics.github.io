<template>
  <div class="room-create">
    <WiredCard elevation="3">
      <div class="room-create-content">
        <h2 class="text-hand-title room-create-title">創建房間</h2>

        <form @submit.prevent="handleSubmit" class="room-create-form">
          <!-- 房間名稱 -->
          <div class="form-group">
            <WiredInput
              v-model="form.name"
              label="房間名稱"
              placeholder="輸入房間名稱"
              :maxlength="50"
              type="text"
            />
          </div>

          <!-- 自定義詞語 -->
          <div class="form-group">
            <WiredTextarea
              v-model="form.wordsText"
              label="自定義詞語（至少 6 個，每個 1-32 字符，最多 600 字符）"
              placeholder="輸入詞語，用逗號或換行分隔&#10;例如：春天,友誼,勇氣"
              :rows="6"
              @input="handleWordsInput"
            />
            <div class="form-hint">
              已輸入 {{ wordCount }} 個詞語，{{ totalChars }} / 600 字符
            </div>
            <div v-if="wordCount < 6" class="form-warning">
              還需要 {{ 6 - wordCount }} 個詞語
            </div>
          </div>

          <!-- 遊戲設置 -->
          <div class="game-settings">
            <h4 class="text-hand-title settings-title">遊戲設置</h4>

            <!-- 繪畫時間 -->
            <div class="form-group">
              <WiredInput
                v-model="form.settings.draw_time"
                label="繪畫時間（秒）"
                type="number"
                hint="60-180 秒"
              />
            </div>

            <!-- 輪數 -->
            <div class="form-group">
              <WiredInput
                v-model="form.settings.rounds"
                label="輪數"
                type="number"
                :hint="`最多 ${Math.min(10, wordCount)} 輪（不能超過詞語總數）`"
              />
            </div>

            <!-- 每輪可選詞數 -->
            <div class="form-group">
              <WiredInput
                v-model="form.settings.word_count_per_round"
                label="每輪可選詞數"
                type="number"
                hint="1-5 個"
              />
            </div>

            <!-- 提示數量 -->
            <div class="form-group">
              <WiredInput
                v-model="form.settings.hints_count"
                label="提示數量"
                type="number"
                hint="0-5 個"
              />
            </div>
          </div>

          <!-- 錯誤提示 -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <div class="form-actions">
            <WiredButton
              :disabled="loading || !isFormValid"
              :loading="loading"
              variant="primary"
              block
              @click="handleSubmit"
            >
              {{ loading ? '創建中' : '創建房間' }}
            </WiredButton>
            <WiredButton
              :disabled="loading"
              variant="secondary"
              block
              @click="$emit('cancel')"
            >
              取消
            </WiredButton>
          </div>
        </form>
      </div>
    </WiredCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoom } from '../composables/useRoom'
import { WiredCard, WiredInput, WiredTextarea, WiredButton } from './wired'

const emit = defineEmits<{
  cancel: []
  created: [roomCode: string]
}>()

const { createRoom, loading } = useRoom()

const form = ref({
  name: '',
  wordsText: '',
  settings: {
    draw_time: '60' as string | number,
    rounds: '5' as string | number,
    word_count_per_round: '3' as string | number,
    hints_count: '2' as string | number,
  },
})

const error = ref<string | null>(null)

// 解析詞語文本
function parseWords(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map(word => word.trim())
    .filter(word => word.length > 0)
}

// 處理詞語輸入
function handleWordsInput() {
  error.value = null
}

// 計算屬性
const words = computed(() => parseWords(form.value.wordsText))
const wordCount = computed(() => words.value.length)
const totalChars = computed(() => form.value.wordsText.length)

const isFormValid = computed(() => {
  const drawTime = Number(form.value.settings.draw_time)
  const rounds = Number(form.value.settings.rounds)
  const wordCountPerRound = Number(form.value.settings.word_count_per_round)
  const hintsCount = Number(form.value.settings.hints_count)
  
  return (
    form.value.name.trim().length > 0 &&
    form.value.name.length <= 50 &&
    wordCount.value >= 6 &&
    totalChars.value <= 600 &&
    words.value.every(word => word.length >= 1 && word.length <= 32) &&
    drawTime >= 60 && drawTime <= 180 &&
    rounds >= 3 && rounds <= Math.min(10, wordCount.value) &&
    wordCountPerRound >= 1 && wordCountPerRound <= 5 &&
    hintsCount >= 0 && hintsCount <= 5
  )
})

// 提交表單
async function handleSubmit() {
  if (!isFormValid.value) {
    error.value = '請檢查表單輸入'
    return
  }

  error.value = null

  try {
    // 構建詞語列表
    const wordsList = words.value.map(text => ({
      text,
      source: 'custom' as const,
    }))

    // 轉換設置為數字類型
    const settings = {
      draw_time: Number(form.value.settings.draw_time),
      rounds: Number(form.value.settings.rounds),
      word_count_per_round: Number(form.value.settings.word_count_per_round),
      hints_count: Number(form.value.settings.hints_count),
    }

    const result = await createRoom({
      name: form.value.name.trim(),
      words: wordsList,
      settings,
    })

    if (result.success && result.room) {
      emit('created', result.room.code)
    } else {
      error.value = result.error || '創建房間失敗'
      console.error('創建房間失敗:', result.error)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '創建房間時發生錯誤'
    console.error('創建房間異常:', err)
  }
}
</script>

<style scoped>
.room-create {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.room-create-content {
  padding: 0;
}

.room-create-title {
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-primary);
}

.room-create-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
  margin-top: 0.25rem;
}

.form-warning {
  font-size: 0.85rem;
  color: var(--color-danger);
  font-family: var(--font-body);
  margin-top: 0.25rem;
  font-weight: 500;
}

.game-settings {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--border-light);
}

.settings-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.error-message {
  padding: 0.75rem;
  background-color: var(--color-danger);
  color: white;
  border-radius: 8px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  text-align: center;
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 響應式設計 */
@media (max-width: 640px) {
  .room-create-title,
  .settings-title {
    font-size: 1.5rem;
  }
}
</style>

