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
  const redirect = sessionStorage.getItem('redirect')
  if (redirect) {
    sessionStorage.removeItem('redirect')
    await router.isReady()
    const path = redirect.replace('/judou', '') || '/'
    router.replace(path)
  }

  console.log('[App] 掛載應用...')
  app.mount('#app')
  console.log('[App] 應用已掛載')
}

initApp().catch(err => {
  console.error('[App] 初始化錯誤:', err)
})
