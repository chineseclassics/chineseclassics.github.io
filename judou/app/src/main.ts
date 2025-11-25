import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './styles/index.css'
import App from './App.vue'

// GitHub Pages SPA 路由重定向處理
const redirect = sessionStorage.getItem('redirect')
if (redirect) {
  sessionStorage.removeItem('redirect')
  // 使用 router 導航到保存的路徑
  router.isReady().then(() => {
    const path = redirect.replace('/judou', '') || '/'
    router.replace(path)
  })
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
