import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署路徑（開發和生產環境都使用相同路徑，與句豆一致）
  base: '/draw-guess/',
  
  // 與句豆一致：輸出到上層目錄（draw-guess/），直接推送即可部署 GitHub Pages
  build: {
    outDir: '../',
    emptyOutDir: false, // 保留 app/ 與 docs/
  },
  
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 開發環境中映射 /assets 到根目錄的 assets
      '/assets': path.resolve(__dirname, '../../assets'),
    },
  },
  server: {
    port: 5174,        // 固定端口（5173 被句豆使用）
    strictPort: true,  // 如果端口被佔用則報錯，而不是換端口
    fs: {
      // 允許訪問父目錄
      allow: ['..', '../..'],
    },
  },
})
