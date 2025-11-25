import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PoemListView from '../views/PoemListView.vue'
import PoemViewerView from '../views/PoemViewerView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  // 使用 History 模式（開發環境）
  // 部署到 GitHub Pages 時需要配置 404.html 重定向
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false }
    },
    {
      path: '/poems',
      name: 'poems',
      component: PoemListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/poems/:id',
      name: 'poemViewer',
      component: PoemViewerView,
      meta: { requiresAuth: true }
    },
    // 後續添加：管理後台
  ]
})

// 路由守衛：檢查認證狀態
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 等待認證初始化完成（避免首次加載時的競態條件）
  if (authStore.loading && authStore.authStatus === 'initializing') {
    // 等待一下認證狀態
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 需要認證但未登入，重定向到首頁
    next({ name: 'home' })
  } else if (to.name === 'home' && authStore.isAuthenticated) {
    // 已登入訪問首頁，重定向到詩歌列表
    next({ name: 'poems' })
  } else {
    next()
  }
})

export default router

