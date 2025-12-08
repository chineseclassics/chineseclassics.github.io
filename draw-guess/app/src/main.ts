import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

// 使用 Pinia
const pinia = createPinia()
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 初始化認證狀態
const authStore = useAuthStore()
// 先設置監聽器，再初始化（避免監聽器錯過初始會話）
authStore.setupAuthListener()
authStore.init()

app.mount('#app')

// 只在生產環境或非 localhost 環境加載太虛幻境應用切換器
// 這樣可以避免本地開發時加載其他應用的資源（404 錯誤）
if (import.meta.env.PROD || window.location.hostname !== 'localhost') {
  const script = document.createElement('script')
  script.src = '/assets/js/taixu-app-switcher.js'
  script.async = true
  document.body.appendChild(script)
}
