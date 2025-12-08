<template>
  <div class="room-join">
    <div class="card">
      <div class="card-body">
        <h2 class="card-title text-hand-title">加入房間</h2>

        <form @submit.prevent="handleSubmit">
          <!-- 房間碼 -->
          <div class="form-group">
            <label>房間碼</label>
            <input
              v-model="form.code"
              type="text"
              class="text-center"
              style="font-size: 2rem; letter-spacing: 0.5rem;"
              placeholder="000000"
              maxlength="6"
              pattern="[0-9]{6}"
              required
              @input="handleCodeInput"
            />
            <div class="text-small">
              輸入 6 位數字房間碼
            </div>
          </div>

          <!-- 暱稱 -->
          <div class="form-group">
            <label>暱稱</label>
            <input
              v-model="form.nickname"
              type="text"
              placeholder="輸入您的暱稱"
              maxlength="20"
              required
            />
          </div>

          <!-- 錯誤提示 -->
          <div v-if="error" class="alert alert-danger">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <div class="row flex-spaces margin-top-medium">
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              class="paper-btn btn-primary"
            >
              {{ loading ? '加入中...' : '加入房間' }}
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
import { useAuthStore } from '../stores/auth'

const emit = defineEmits<{
  cancel: []
  joined: []
}>()

const { joinRoom, loading } = useRoom()
const authStore = useAuthStore()

const form = ref({
  code: '',
  nickname: authStore.profile?.display_name || '',
})

const error = ref<string | null>(null)

// 處理房間碼輸入（只允許數字）
function handleCodeInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.code = target.value.replace(/\D/g, '').slice(0, 6)
  error.value = null
}

const isFormValid = computed(() => {
  return (
    form.value.code.length === 6 &&
    form.value.nickname.trim().length > 0 &&
    form.value.nickname.length <= 20
  )
})

// 提交表單
async function handleSubmit() {
  if (!isFormValid.value) {
    error.value = '請檢查表單輸入'
    return
  }

  error.value = null

  const result = await joinRoom(form.value.code, form.value.nickname.trim())

  if (result.success) {
    emit('joined')
  } else {
    error.value = result.error || '加入房間失敗'
  }
}
</script>

<style scoped>
.room-join {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>

