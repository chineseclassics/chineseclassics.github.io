import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './styles/index.css'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'

// 異步初始化應用
async function initApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // 初始化認證狀態（等待完成）
  const authStore = useAuthStore(pinia)
  await authStore.init()

  // GitHub Pages SPA 路由重定向處理
  const redirect = sessionStorage.getItem('redirect')
  if (redirect) {
    sessionStorage.removeItem('redirect')
    await router.isReady()
    const path = redirect.replace('/judou', '') || '/'
    router.replace(path)
  }

  app.mount('#app')
}

initApp()
