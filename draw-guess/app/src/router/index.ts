import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/room/:code?',
    name: 'room',
    component: () => import('../views/RoomView.vue'),
  },
]

const router = createRouter({
  // GitHub Pages 部署路徑（與 Vite base 保持一致）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router

