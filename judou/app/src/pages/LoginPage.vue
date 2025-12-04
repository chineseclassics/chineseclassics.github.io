<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, type AuthResult } from '../stores/authStore'
import BeanIcon from '../components/common/BeanIcon.vue'
import { Mail, Lock, User } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

// Logo URL（使用 BASE_URL 確保路徑正確）
const logoUrl = `${import.meta.env.BASE_URL}images/bean-icon.png`

// 表單狀態
const isLogin = ref(true) // true: 登入, false: 註冊
const email = ref('')
const password = ref('')
const displayName = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// 切換登入/註冊模式
function toggleMode() {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
  email.value = ''
  password.value = ''
  displayName.value = ''
}

// 處理 Google 登入
async function handleGoogleLogin() {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const success = await authStore.loginWithGoogle()
    if (!success && authStore.error) {
      errorMessage.value = authStore.error
    }
  } catch (error) {
    errorMessage.value = (error as Error).message || '登入失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}

// 處理 Email 登入/註冊
async function handleEmailAuth() {
  if (!email.value || !password.value) {
    errorMessage.value = '請填寫所有必填欄位'
    return
  }

  // 驗證郵箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    errorMessage.value = '請輸入有效的郵箱地址'
    return
  }

  // 驗證密碼長度
  if (password.value.length < 6) {
    errorMessage.value = '密碼長度至少需要 6 個字符'
    return
  }

  // 註冊時驗證顯示名稱
  if (!isLogin.value && !displayName.value.trim()) {
    errorMessage.value = '請輸入顯示名稱'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    let result: AuthResult
    if (isLogin.value) {
      result = await authStore.signInWithEmail(email.value, password.value)
    } else {
      result = await authStore.signUpWithEmail(email.value, password.value, displayName.value)
    }

    if (result.success) {
      // 註冊成功但需要郵箱確認
      if (!isLogin.value && result.needsEmailConfirmation) {
        errorMessage.value = '✅ ' + (result.message || '請檢查您的郵箱以確認註冊')
        setTimeout(() => {
          toggleMode() // 切換回登入模式
        }, 3000)
        return
      }
      
      // 登入成功，檢查是否有重定向參數
      const redirect = router.currentRoute.value.query.redirect as string | undefined
      if (redirect) {
        router.push(redirect)
      } else {
        router.push({ name: 'home' })
      }
    } else {
      errorMessage.value = result.error || '操作失敗，請稍後再試'
    }
  } catch (error) {
    errorMessage.value = (error as Error).message || '操作失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}

// 頁面動畫
const pageLoaded = ref(false)
onMounted(() => {
  setTimeout(() => {
    pageLoaded.value = true
  }, 100)
})

// 如果已經登入，跳轉到首頁
watch(() => authStore.isAuthenticated, (authenticated) => {
  if (authenticated && !authStore.loading) {
    // 檢查是否有重定向參數
    const redirect = router.currentRoute.value.query.redirect as string | undefined
    if (redirect) {
      router.push(redirect)
    } else {
      router.push({ name: 'home' })
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="login-page edamame-bg">
    <div class="login-container" :class="{ 'loaded': pageLoaded }">
      <div class="login-layout">
        <!-- 左側：Logo + 介紹 -->
        <div class="login-left sprout-up">
          <div class="logo-section">
            <div class="logo-wrapper">
              <img 
                :src="logoUrl" 
                alt="句豆" 
                class="logo-icon"
              />
            </div>
            <h1 class="app-title">句豆</h1>
            <p class="app-subtitle">古文閱讀與斷句練習</p>
          </div>

          <div class="intro-card edamame-glass">
            <h2 class="intro-title">用句讀的方式學習古文</h2>
            <p class="intro-text">
              句豆是一個古文學習平臺，用游戲化的方式，結合傳統的句讀方法，
              提供斷句練習與古文閱讀功能，幫助您深入理解古文的語義和結構，提升閱讀能力。
            </p>
            <div class="intro-features">
              <div class="feature-item">
                <BeanIcon :size="18" />
                <span>斷句練習</span>
              </div>
              <div class="feature-item">
                <BeanIcon :size="18" />
                <span>閱讀模式</span>
              </div>
              <div class="feature-item">
                <BeanIcon :size="18" />
                <span>班級對戰</span>
              </div>
              <div class="feature-item">
                <BeanIcon :size="18" />
                <span>進度追蹤</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右側：登入/註冊表單 -->
        <div class="login-right sprout-up" style="animation-delay: 0.1s">
          <div class="auth-card edamame-glass">
            <div class="auth-header">
              <h2 class="auth-title">{{ isLogin ? '登入' : '註冊' }}</h2>
              <p class="auth-subtitle">
                {{ isLogin ? '歡迎回來' : '開始您的學習之旅' }}
              </p>
            </div>

            <!-- 錯誤訊息 -->
            <div v-if="errorMessage" class="error-message" :class="{ 'success': errorMessage.startsWith('✅') }">
              {{ errorMessage }}
            </div>

            <!-- Google 登入按鈕 -->
            <button 
              @click="handleGoogleLogin"
              :disabled="isLoading"
              class="auth-btn google-btn edamame-btn edamame-btn-primary"
            >
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>使用 Google 登入</span>
            </button>

            <div class="divider">
              <span>或</span>
            </div>

            <!-- Email 表單 -->
            <form @submit.prevent="handleEmailAuth" class="email-form">
              <!-- 註冊模式：顯示名稱 -->
              <div v-if="!isLogin" class="form-group">
                <label class="form-label">
                  <User class="label-icon" :size="18" />
                  顯示名稱
                </label>
                <input
                  v-model="displayName"
                  type="text"
                  class="edamame-input"
                  placeholder="請輸入您的顯示名稱"
                  :disabled="isLoading"
                />
              </div>

              <!-- 郵箱 -->
              <div class="form-group">
                <label class="form-label">
                  <Mail class="label-icon" :size="18" />
                  郵箱
                </label>
                <input
                  v-model="email"
                  type="email"
                  class="edamame-input"
                  placeholder="請輸入您的郵箱"
                  :disabled="isLoading"
                  required
                />
              </div>

              <!-- 密碼 -->
              <div class="form-group">
                <label class="form-label">
                  <Lock class="label-icon" :size="18" />
                  密碼
                </label>
                <input
                  v-model="password"
                  type="password"
                  class="edamame-input"
                  placeholder="請輸入您的密碼（至少 6 個字符）"
                  :disabled="isLoading"
                  required
                />
              </div>

              <!-- 提交按鈕 -->
              <button 
                type="submit"
                :disabled="isLoading"
                class="auth-btn submit-btn edamame-btn edamame-btn-primary"
              >
                <span v-if="!isLoading">{{ isLogin ? '登入' : '註冊' }}</span>
                <span v-else>處理中...</span>
              </button>
            </form>

            <!-- 切換模式 -->
            <div class="auth-footer">
              <p>
                {{ isLogin ? '還沒有帳號？' : '已經有帳號？' }}
                <button 
                  @click="toggleMode" 
                  class="toggle-btn"
                  :disabled="isLoading"
                >
                  {{ isLogin ? '立即註冊' : '立即登入' }}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部版權信息 -->
    <div class="login-footer">
      <p class="footer-text">
        <span>© 2025 太虛幻境</span>
        <span class="footer-separator">·</span>
        <span>開發：汪涵屹、張老師</span>
        <span class="footer-separator">·</span>
        <span>美術：丁奕辰、徐揚洋</span>
        <span class="footer-separator">·</span>
        <span>書院中文經典</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  position: relative;
  overflow: hidden;
}

/* 背景動畫 */
.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 30%, rgba(139, 178, 79, 0.1), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(227, 194, 111, 0.1), transparent 50%);
  animation: backgroundFloat 20s ease-in-out infinite;
  z-index: 0;
}

@keyframes backgroundFloat {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-10px, -10px);
  }
}

.login-container {
  width: 100%;
  max-width: 1200px;
  z-index: 1;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out);
}

.login-container.loaded {
  opacity: 1;
  transform: translateY(0);
}

/* 左右分欄佈局 */
.login-layout {
  display: flex;
  gap: var(--space-6);
  align-items: flex-end;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  min-height: fit-content;
}

.login-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--space-6);
  min-width: 0;
}

.login-right {
  flex: 0 0 420px;
  display: flex;
  align-items: flex-end;
  min-width: 0;
}

/* Logo 區域 */
.logo-section {
  text-align: center;
}

.logo-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  border-radius: 50%;
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-lg);
  position: relative;
  animation: logoFloat 3s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.logo-wrapper::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600));
  opacity: 0.2;
  filter: blur(10px);
  animation: logoGlow 3s ease-in-out infinite;
}

@keyframes logoGlow {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

.logo-icon {
  width: 70px;
  height: 70px;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.app-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin: 0 0 var(--space-1) 0;
  background: linear-gradient(120deg, var(--color-primary-700), var(--color-primary-400));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: var(--font-ui);
}

.app-subtitle {
  font-size: var(--text-base);
  color: var(--color-neutral-600);
  margin: 0 0 var(--space-4) 0;
  font-family: var(--font-ui);
}

/* 介紹卡片 */
.intro-card {
  padding: var(--space-5);
}

.intro-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-900);
  margin: 0 0 var(--space-3) 0;
  font-family: var(--font-ui);
}

.intro-text {
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
  line-height: var(--leading-normal);
  margin: 0 0 var(--space-4) 0;
}

.intro-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
}

/* 認證卡片 */
.auth-card {
  width: 100%;
  padding: var(--space-6);
  max-height: 90vh;
  overflow-y: auto;
}

.auth-card::-webkit-scrollbar {
  width: 6px;
}

.auth-card::-webkit-scrollbar-track {
  background: transparent;
}

.auth-card::-webkit-scrollbar-thumb {
  background: var(--color-primary-300);
  border-radius: var(--radius-full);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-5);
}

.auth-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-neutral-900);
  margin: 0 0 var(--space-1) 0;
  font-family: var(--font-ui);
}

.auth-subtitle {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  margin: 0;
}

/* 錯誤訊息 */
.error-message {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  font-size: var(--text-xs);
  background: rgba(220, 107, 107, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(220, 107, 107, 0.3);
}

.error-message.success {
  background: rgba(139, 178, 79, 0.1);
  color: var(--color-success);
  border-color: rgba(139, 178, 79, 0.3);
}

/* Google 登入按鈕 */
.google-btn {
  width: 100%;
  margin-bottom: var(--space-4);
  background: white;
  color: var(--color-neutral-700);
  border: 2px solid var(--color-neutral-200);
  box-shadow: var(--shadow-sm);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

.google-btn:hover {
  border-color: var(--color-neutral-300);
  box-shadow: var(--shadow-md);
}

.google-icon {
  flex-shrink: 0;
}

/* 分隔線 */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: var(--space-4) 0;
  color: var(--color-neutral-500);
  font-size: var(--text-xs);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-neutral-200);
}

.divider span {
  padding: 0 var(--space-4);
}

/* 表單 */
.email-form {
  margin-bottom: var(--space-4);
}

.form-group {
  margin-bottom: var(--space-3);
}

.form-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-neutral-700);
  margin-bottom: var(--space-1);
  font-family: var(--font-ui);
}

.label-icon {
  color: var(--color-primary-600);
}

.submit-btn {
  width: 100%;
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

/* 切換模式 */
.auth-footer {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  margin-top: var(--space-3);
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--color-primary-600);
  font-weight: var(--font-semibold);
  cursor: pointer;
  padding: 0;
  margin-left: var(--space-1);
  text-decoration: underline;
  font-family: var(--font-ui);
  transition: color var(--duration-base) var(--ease-out);
}

.toggle-btn:hover:not(:disabled) {
  color: var(--color-primary-700);
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 響應式設計 */
@media (max-width: 960px) {
  .login-page {
    max-height: none;
    min-height: 100vh;
    padding: var(--space-4) var(--space-4);
    align-items: flex-start;
    padding-top: var(--space-6);
  }

  .login-container {
    max-width: 100%;
  }

  .login-layout {
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
  }

  .login-left {
    order: 2;
    text-align: center;
  }

  .login-right {
    flex: 1 1 auto;
    order: 1;
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }

  .logo-section {
    margin-bottom: var(--space-3);
  }

  .logo-wrapper {
    width: 80px;
    height: 80px;
  }

  .logo-icon {
    width: 60px;
    height: 60px;
  }

  .app-title {
    font-size: var(--text-2xl);
  }

  .intro-card {
    padding: var(--space-4);
  }

  .auth-card {
    padding: var(--space-5);
    max-height: none;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: var(--space-3);
    padding-top: var(--space-4);
  }

  .login-layout {
    gap: var(--space-3);
  }

  .login-right {
    max-width: 100%;
  }

  .intro-features {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .auth-card {
    padding: var(--space-4);
  }

  .logo-wrapper {
    width: 70px;
    height: 70px;
  }

  .logo-icon {
    width: 50px;
    height: 50px;
  }

  .login-footer {
    padding-top: var(--space-1);
    margin-top: var(--space-1);
  }

  .footer-text {
    font-size: 10px;
    gap: 4px;
  }
}

/* 底部版權信息 */
.login-footer {
  text-align: center;
  padding: var(--space-2) 0;
  margin-top: var(--space-8);
  flex-shrink: 0;
  z-index: 1;
}

.footer-text {
  margin: 0;
  font-size: 11px;
  color: var(--color-neutral-500);
  font-family: var(--font-ui);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  line-height: 1.3;
  opacity: 0.75;
}

.footer-separator {
  color: var(--color-neutral-400);
  opacity: 0.5;
}

/* 動畫 */
.sprout-up {
  animation: sproutUp 0.6s var(--ease-sprout) forwards;
  opacity: 0;
}

@keyframes sproutUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

