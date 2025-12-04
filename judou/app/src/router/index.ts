import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // 登入頁面（不需要認證）
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: {
      title: '句豆 - 登入',
      requiresAuth: false,
    },
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../pages/HomePage.vue'),
        meta: {
          title: '句豆 - 主頁',
          requiresAuth: true,
        },
      },
      {
        path: 'icon-test',
        name: 'icon-test',
        component: () => import('../pages/IconTestPage.vue'),
        meta: {
          title: '句豆 - 圖標測試',
        },
      },
      {
        path: 'practice',
        name: 'practice',
        component: () => import('../pages/PracticePage.vue'),
        meta: {
          title: '句豆 - 練習',
        },
      },
      {
                path: 'history',
                name: 'history',
                component: () => import('../pages/HistoryPage.vue'),
                meta: {
                  title: '句豆 - 歷史紀錄',
                },
              },
      {
        path: 'my-texts',
        name: 'my-texts',
        component: () => import('../pages/AdminTextsPage.vue'),
        meta: {
          title: '句豆 - 自訂練習',
          mode: 'teacher',
        },
      },
      {
        path: 'admin/texts',
        name: 'admin-texts',
        component: () => import('../pages/AdminTextsPage.vue'),
        meta: {
          title: '句豆 - 系統文庫',
          mode: 'admin',
        },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('../pages/AdminUsersPage.vue'),
        meta: {
          title: '句豆 - 用戶管理',
        },
      },
      {
        path: 'my-classes',
        name: 'my-classes',
        component: () => import('../pages/MyClassesPage.vue'),
        meta: {
          title: '句豆 - 我的班級',
        },
      },
      {
        path: 'admin/classes',
        name: 'admin-classes',
        redirect: { name: 'my-classes' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../pages/UserProfilePage.vue'),
        meta: {
          title: '句豆 - 個人中心',
        },
      },
      // 閱讀模式路由
      {
        path: 'reading',
        name: 'reading-list',
        component: () => import('../pages/ReadingListPage.vue'),
        meta: {
          title: '句豆 - 閱讀文庫',
        },
      },
      {
        path: 'reading/:id',
        name: 'reading-detail',
        component: () => import('../pages/ReadingDetailPage.vue'),
        meta: {
          title: '句豆 - 閱讀',
        },
      },
      // 閱讀文庫管理（老師/管理員）
      {
        path: 'admin/reading',
        name: 'admin-reading',
        component: () => import('../pages/AdminReadingPage.vue'),
        meta: {
          title: '句豆 - 閱讀文庫管理',
        },
      },
      // =====================================================
      // 鬥豆（對戰系統）路由
      // =====================================================
      {
        path: 'arena',
        name: 'arena',
        component: () => import('../pages/arena/ArenaPage.vue'),
        meta: {
          title: '句豆 - 鬥豆',
        },
      },
      // 老師模式 - 課堂鬥豆
      {
        path: 'arena/teacher/create',
        name: 'arena-teacher-create',
        component: () => import('../pages/arena/teacher/CreateGame.vue'),
        meta: {
          title: '句豆 - 創建課堂鬥豆',
        },
      },
      {
        path: 'arena/teacher/lobby/:roomId',
        name: 'arena-teacher-lobby',
        component: () => import('../pages/arena/teacher/GameLobby.vue'),
        meta: {
          title: '句豆 - 課堂鬥豆等待室',
        },
      },
      // 學生模式 - PK 競技
      {
        path: 'arena/create',
        name: 'arena-create',
        component: () => import('../pages/arena/student/CreateRoom.vue'),
        meta: {
          title: '句豆 - 創建鬥豆場',
        },
      },
      {
        path: 'arena/lobby/:roomId',
        name: 'arena-lobby',
        component: () => import('../pages/arena/student/RoomLobby.vue'),
        meta: {
          title: '句豆 - 鬥豆場等待室',
        },
      },
      // 共享頁面 - 做題和結果
      {
        path: 'arena/play/:roomId',
        name: 'arena-play',
        component: () => import('../pages/arena/shared/GamePlay.vue'),
        meta: {
          title: '句豆 - 鬥豆中',
        },
      },
      {
        path: 'arena/result/:roomId',
        name: 'arena-result',
        component: () => import('../pages/arena/shared/GameResult.vue'),
        meta: {
          title: '句豆 - 鬥豆結果',
        },
      },
    ],
  },
  // 老師模式 - 全屏大屏幕（不顯示側邊欄）
  {
    path: '/arena/teacher/board/:roomId',
    name: 'arena-teacher-board',
    component: () => import('../pages/arena/teacher/GameBoard.vue'),
    meta: {
      title: '句豆 - 鬥豆台',
      fullscreen: true,
    },
  },
]

const router = createRouter({
  // GitHub Pages 部署路徑
  history: createWebHistory('/judou/'),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title as string
  }
})

// 路由守衛 - 檢查認證狀態
router.beforeEach(async (to, _from, next) => {
  // 動態導入 authStore（避免循環依賴）
  const { useAuthStore } = await import('../stores/authStore')
  const authStore = useAuthStore()
  
  // 如果認證還在初始化中，等待完成
  if (authStore.loading && !authStore.initialized) {
    await authStore.init()
  }
  
  // 檢查路由是否需要認證
  const requiresAuth = to.meta?.requiresAuth !== false // 默認需要認證
  
  // 如果路由不需要認證（如登入頁），直接通過
  if (!requiresAuth) {
    // 如果已經登入，跳轉到首頁
    if (authStore.isAuthenticated && to.name === 'login') {
      next({ name: 'home' })
      return
    }
    next()
    return
  }
  
  // 需要認證的路由
  if (!authStore.isAuthenticated) {
    // 保存目標路由，登入後跳轉回來
    const redirectPath = to.fullPath !== '/judou/' ? to.fullPath : undefined
    next({ 
      name: 'login',
      query: redirectPath ? { redirect: redirectPath } : undefined
    })
  } else {
    next()
  }
})

// 全局路由錯誤處理 - 處理懶加載 chunk 失敗
router.onError((error, to) => {
  // 檢查是否是 chunk 加載失敗（通常是 "Loading chunk xxx failed"）
  if (
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('Loading CSS chunk') ||
    error.name === 'ChunkLoadError'
  ) {
    console.error('[Router] Chunk 加載失敗，正在重新加載頁面...', error.message)
    // 保存目標路徑，重新加載後恢復
    sessionStorage.setItem('redirect', to.fullPath)
    window.location.reload()
  }
})

export default router
