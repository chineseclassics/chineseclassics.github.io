import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './styles/index.css'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'

// 異步初始化應用
async function initApp() {
  console.log('[App] 開始初始化...')
  
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // 初始化認證狀態（等待完成）
  console.log('[App] 初始化認證...')
  const authStore = useAuthStore(pinia)
  await authStore.init()
  console.log('[App] 認證初始化完成')

  // GitHub Pages SPA 路由重定向處理
  // 方式 1：從 URL 參數獲取（404.html 重定向）
  const urlParams = new URLSearchParams(window.location.search)
  const spaPath = urlParams.get('_spa_path')
  if (spaPath) {
    // 清除 URL 參數，導航到正確路徑
    window.history.replaceState(null, '', '/judou/')
    await router.isReady()
    const path = decodeURIComponent(spaPath)
    console.log('[App] SPA 重定向到:', path)
    router.replace(path)
  }
  
  // 方式 2：從 sessionStorage 獲取（舊方式，保留兼容）
  const redirect = sessionStorage.getItem('redirect')
  console.log('[App] 檢查 sessionStorage redirect:', redirect)
  if (redirect) {
    sessionStorage.removeItem('redirect')
    await router.isReady()
    const path = redirect.replace('/judou', '') || '/'
    console.log('[App] sessionStorage 重定向到:', path)
    router.replace(path)
  }

  console.log('[App] 掛載應用...')
  app.mount('#app')
  console.log('[App] 應用已掛載')
}

initApp().catch(err => {
  console.error('[App] 初始化錯誤:', err)
})
