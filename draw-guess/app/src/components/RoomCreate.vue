<template>
  <div class="room-create">
    <div class="card">
      <div class="card-body">
        <h2 class="card-title text-hand-title">創建房間</h2>

        <form @submit.prevent="handleSubmit">
          <!-- 房間名稱 -->
          <div class="form-group">
            <label>房間名稱</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="輸入房間名稱"
              maxlength="50"
              required
            />
          </div>

          <!-- 自定義詞語 -->
          <div class="form-group">
            <label>自定義詞語（至少 6 個，每個 1-32 字符，最多 600 字符）</label>
            <textarea
              v-model="form.wordsText"
              rows="6"
              placeholder="輸入詞語，用逗號（，或,）或換行分隔&#10;例如：春天，友誼，勇氣"
              @input="handleWordsInput"
            ></textarea>
            <div class="text-small">
              已輸入 {{ wordCount }} 個詞語，{{ totalChars }} / 600 字符
            </div>
            <div v-if="wordCount < 6" class="text-small" style="color: #e8590c;">
              還需要 {{ 6 - wordCount }} 個詞語
            </div>
          </div>

          <!-- 遊戲設置 -->
          <div class="margin-top-medium">
            <h4 class="text-hand-title">遊戲設置</h4>

            <!-- 繪畫時間 -->
            <div class="form-group">
              <label>繪畫時間（秒）</label>
              <input
                v-model.number="form.settings.draw_time"
                type="number"
                min="60"
                max="180"
                required
              />
            </div>

            <!-- 提示數量 -->
            <div class="form-group">
              <label>提示數量</label>
              <input
                v-model.number="form.settings.hints_count"
                type="number"
                min="0"
                max="5"
                required
              />
            </div>

            <!-- 輪數說明 -->
            <div class="alert alert-secondary margin-top-small">
              <strong>輪數說明：</strong>遊戲開始時，輪數會自動設定為房間人數，確保每個人都有一次機會畫畫。
            </div>
          </div>

          <!-- 錯誤提示 -->
          <div v-if="error" class="alert alert-danger margin-top-small">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <div class="row flex-spaces margin-top-medium">
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              class="paper-btn btn-primary"
            >
              {{ loading ? '創建中...' : '創建房間' }}
            </button>
            <button
              type="button"
              @click="$emit('cancel')"
              class="paper-btn btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
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
    draw_time: 60,
    rounds: 0, // 輪數將在開始遊戲時自動設定為房間人數
    word_count_per_round: 1, // 保留此字段以兼容數據庫，但不再顯示
    hints_count: 2,
  },
})

const error = ref<string | null>(null)

// 解析詞語文本（支持中文逗號「，」和英文逗號「,」以及換行）
function parseWords(text: string): string[] {
  return text
    .split(/[，,\n]/) // 支持中文逗號、英文逗號和換行
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
    words.value.every(word => word.length >= 1 && word.length <= 32)
    // 移除輪數驗證，輪數將在開始遊戲時自動設定
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
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}
</style>

