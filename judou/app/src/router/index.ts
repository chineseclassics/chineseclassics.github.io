import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
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
      {
        path: 'arena/teacher/board/:roomId',
        name: 'arena-teacher-board',
        component: () => import('../pages/arena/teacher/GameBoard.vue'),
        meta: {
          title: '句豆 - 鬥豆台',
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

// 全局路由錯誤處理 - 處理懶加載 chunk 失敗
router.onError((error, to) => {
  console.error('[Router] 路由錯誤:', error, '目標:', to.fullPath)
  
  // 檢查是否是 chunk 加載失敗（通常是 "Loading chunk xxx failed"）
  if (
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('Loading CSS chunk') ||
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.name === 'ChunkLoadError' ||
    error.name === 'TypeError'
  ) {
    console.error('[Router] Chunk 加載失敗，正在清除緩存並重新加載頁面...', error.message)
    
    // 清除版本標記，觸發緩存清除
    localStorage.removeItem('judou_app_version')
    
    // 保存目標路徑，重新加載後恢復
    sessionStorage.setItem('redirect', to.fullPath)
    
    // 強制重新加載
    window.location.reload()
    return
  }
  
  // 其他路由錯誤：記錄但不阻止
  console.warn('[Router] 路由錯誤（非 chunk 加載問題）:', error.message)
})

export default router
