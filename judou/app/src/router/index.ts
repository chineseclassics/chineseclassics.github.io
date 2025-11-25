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
        path: 'practice',
        name: 'practice',
        component: () => import('../pages/PracticePage.vue'),
        meta: {
          title: '句豆 - 練習',
        },
      },
              {
                path: 'leaderboard',
                name: 'leaderboard',
                component: () => import('../pages/LeaderboardPage.vue'),
                meta: {
                  title: '句豆 - 排行榜',
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
        path: 'admin/texts',
        name: 'admin-texts',
        component: () => import('../pages/AdminTextsPage.vue'),
        meta: {
          title: '句豆 - 文章管理',
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

export default router
