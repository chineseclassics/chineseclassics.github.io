import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './styles/index.css'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'

// 版本檢查（與 index.html 中的版本保持一致）
const APP_VERSION = '2025-01-20'

// 檢查並處理 chunk 加載失敗
function handleChunkLoadError(error: Error) {
  console.error('[App] Chunk 加載失敗:', error)
  
  // 檢查是否是網絡錯誤或緩存問題
  if (
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('Loading CSS chunk') ||
    error.name === 'ChunkLoadError' ||
    error.message.includes('network')
  ) {
    console.warn('[App] 檢測到資源加載失敗，可能是緩存問題，嘗試強制刷新...')
    
    // 清除緩存標記
    const versionKey = 'judou_app_version'
    localStorage.removeItem(versionKey)
    
    // 保存當前路徑
    sessionStorage.setItem('redirect', window.location.pathname + window.location.search)
    
    // 強制重新加載
    window.location.reload()
    return true
  }
  return false
}

// 全局錯誤處理
window.addEventListener('error', (event) => {
  if (event.error && handleChunkLoadError(event.error)) {
    event.preventDefault()
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && handleChunkLoadError(event.reason)) {
    event.preventDefault()
  }
})

// 異步初始化應用
async function initApp() {
  console.log('[App] 開始初始化...', APP_VERSION)
  
  try {
    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)

    // 等待路由就緒
    await router.isReady()
    console.log('[App] 路由已就緒')

    // 初始化認證狀態（等待完成）
    console.log('[App] 初始化認證...')
    const authStore = useAuthStore(pinia)
    await authStore.init()
    console.log('[App] 認證初始化完成')

    // GitHub Pages SPA 路由重定向處理
    // 從 URL 參數獲取（404.html 重定向）
    const urlParams = new URLSearchParams(window.location.search)
    const spaPath = urlParams.get('_spa_path')
    if (spaPath) {
      // 清除 URL 參數，導航到正確路徑
      window.history.replaceState(null, '', '/judou/')
      const path = decodeURIComponent(spaPath)
      console.log('[App] SPA 重定向到:', path)
      router.replace(path)
    }

    console.log('[App] 掛載應用...')
    app.mount('#app')
    console.log('[App] 應用已掛載')
  } catch (err: any) {
    console.error('[App] 初始化錯誤:', err)
    
    // 嘗試處理 chunk 加載錯誤
    if (handleChunkLoadError(err)) {
      return // 已觸發重新加載
    }
    
    // 其他錯誤：顯示錯誤信息
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h2>應用初始化失敗</h2>
          <p>${err?.message || '未知錯誤'}</p>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem;">
            重新載入
          </button>
        </div>
      `
    }
  }
}

initApp()
