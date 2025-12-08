<template>
  <div class="room-create">
    <h2 class="text-xl font-light text-text-primary mb-4">創建房間</h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- 房間名稱 -->
      <div>
        <label class="block text-sm text-text-secondary mb-1">房間名稱</label>
        <input
          v-model="form.name"
          type="text"
          class="input-minimal w-full"
          placeholder="輸入房間名稱"
          maxlength="50"
          required
        />
      </div>

      <!-- 自定義詞語 -->
      <div>
        <label class="block text-sm text-text-secondary mb-1">
          自定義詞語（至少 6 個，每個 1-32 字符，最多 600 字符）
        </label>
        <textarea
          v-model="form.wordsText"
          class="input-minimal w-full h-32 resize-none"
          placeholder="輸入詞語，用逗號或換行分隔&#10;例如：春天,友誼,勇氣"
          @input="handleWordsInput"
        />
        <div class="text-xs text-text-secondary mt-1">
          已輸入 {{ wordCount }} 個詞語，{{ totalChars }} / 600 字符
        </div>
        <div v-if="wordCount < 6" class="text-xs text-red-600 mt-1">
          還需要 {{ 6 - wordCount }} 個詞語
        </div>
      </div>

      <!-- 遊戲設置 -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-text-primary">遊戲設置</h3>

        <!-- 繪畫時間 -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">繪畫時間（秒）</label>
          <input
            v-model.number="form.settings.draw_time"
            type="number"
            class="input-minimal w-full"
            min="60"
            max="180"
            required
          />
        </div>

        <!-- 輪數 -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">輪數</label>
          <input
            v-model.number="form.settings.rounds"
            type="number"
            class="input-minimal w-full"
            :min="3"
            :max="Math.min(10, wordCount)"
            required
          />
          <div class="text-xs text-text-secondary mt-1">
            最多 {{ Math.min(10, wordCount) }} 輪（不能超過詞語總數）
          </div>
        </div>

        <!-- 每輪可選詞數 -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">每輪可選詞數</label>
          <input
            v-model.number="form.settings.word_count_per_round"
            type="number"
            class="input-minimal w-full"
            min="1"
            max="5"
            required
          />
        </div>

        <!-- 提示數量 -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">提示數量</label>
          <input
            v-model.number="form.settings.hints_count"
            type="number"
            class="input-minimal w-full"
            min="0"
            max="5"
            required
          />
        </div>
      </div>

      <!-- 錯誤提示 -->
      <div v-if="error" class="text-sm text-red-600 bg-red-50 p-2 rounded-minimal border-thin border-red-200">
        {{ error }}
      </div>

      <!-- 提交按鈕 -->
      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="btn-minimal flex-1"
        >
          {{ loading ? '創建中...' : '創建房間' }}
        </button>
        <button
          type="button"
          @click="$emit('cancel')"
          class="btn-minimal"
        >
          取消
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoom } from '../composables/useRoom'

const emit = defineEmits<{
  cancel: []
  created: [roomCode: string]
}>()

const { createRoom, loading } = useRoom()

const form = ref({
  name: '',
  wordsText: '',
  settings: {
    draw_time: 120,
    rounds: 5,
    word_count_per_round: 3,
    hints_count: 2,
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
  return (
    form.value.name.trim().length > 0 &&
    form.value.name.length <= 50 &&
    wordCount.value >= 6 &&
    totalChars.value <= 600 &&
    words.value.every(word => word.length >= 1 && word.length <= 32) &&
    form.value.settings.rounds <= wordCount.value
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

    const result = await createRoom({
      name: form.value.name.trim(),
      words: wordsList,
      settings: form.value.settings,
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
  @apply w-full max-w-md mx-auto;
}
</style>

