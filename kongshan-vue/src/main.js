import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'

// 異步初始化應用
async function initApp() {
  // 創建應用實例
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  
  // 掛載應用
  app.mount('#app')

  // 初始化認證（必須在掛載後）
  const { useAuthStore } = await import('./stores/auth')
  const authStore = useAuthStore()
  
  // 等待認證初始化完成
  await authStore.initialize()
  authStore.setupAuthListener()
  
  console.log('✅ 空山 Vue 版應用初始化完成')
}

initApp().catch(err => {
  console.error('❌ 應用初始化失敗:', err)
})

