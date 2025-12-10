<template>
  <div class="room-join">
    <WiredCard elevation="3">
      <div class="room-join-content">
        <h2 class="text-hand-title room-join-title">加入房間</h2>

        <form @submit.prevent="handleSubmit" class="room-join-form">
          <!-- 房間碼 -->
          <div class="form-group">
            <WiredInput
              v-model="form.code"
              label="房間碼"
              placeholder="000000"
              :maxlength="6"
              type="text"
              hint="輸入 6 位數字房間碼"
              class="room-code-input"
              @update:modelValue="handleCodeInput"
            />
          </div>

          <!-- 暱稱 -->
          <div class="form-group">
            <WiredInput
              v-model="form.nickname"
              label="暱稱"
              placeholder="輸入您的暱稱"
              :maxlength="20"
              type="text"
            />
          </div>

          <!-- 錯誤提示 -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <div class="form-actions">
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              style="display: none;"
              aria-hidden="true"
            />
            <WiredButton
              :disabled="loading || !isFormValid"
              :loading="loading"
              variant="primary"
              block
              class="submit-button"
              @click="handleSubmit"
            >
              {{ loading ? '加入中' : '加入房間' }}
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
import { useAuthStore } from '../stores/auth'
import { WiredCard, WiredInput, WiredButton } from './wired'

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
function handleCodeInput(value: string) {
  const filteredValue = value.replace(/\D/g, '').slice(0, 6)
  if (filteredValue !== value) {
    form.value.code = filteredValue
  }
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

.room-join-content {
  padding: 0;
}

.room-join-title {
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-primary);
}

.room-join-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.room-code-input :deep(wired-input) {
  font-size: 2rem;
  letter-spacing: 0.5rem;
  text-align: center;
  font-weight: bold;
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
  .room-join-title {
    font-size: 1.5rem;
  }
  
  .room-code-input :deep(wired-input) {
    font-size: 1.5rem;
    letter-spacing: 0.3rem;
  }
}
</style>

