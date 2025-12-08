<template>
  <div class="room-join">
    <h2 class="text-xl font-light text-text-primary mb-4">加入房間</h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- 房間碼 -->
      <div>
        <label class="block text-sm text-text-secondary mb-1">房間碼</label>
        <input
          v-model="form.code"
          type="text"
          class="input-minimal w-full text-center text-2xl tracking-widest"
          placeholder="000000"
          maxlength="6"
          pattern="[0-9]{6}"
          required
          @input="handleCodeInput"
        />
        <div class="text-xs text-text-secondary mt-1">
          輸入 6 位數字房間碼
        </div>
      </div>

      <!-- 暱稱 -->
      <div>
        <label class="block text-sm text-text-secondary mb-1">暱稱</label>
        <input
          v-model="form.nickname"
          type="text"
          class="input-minimal w-full"
          placeholder="輸入您的暱稱"
          maxlength="20"
          required
        />
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
          {{ loading ? '加入中...' : '加入房間' }}
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
  @apply w-full max-w-md mx-auto;
}
</style>

