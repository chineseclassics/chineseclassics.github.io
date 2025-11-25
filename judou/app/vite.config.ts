import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署路徑
  base: '/judou/',
  
  // 輸出到上層目錄（judou-vue/）
  build: {
    outDir: '../',
    emptyOutDir: false, // 不清空目錄，保留 app/ 和 docs/
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
    port: 5173,        // 固定端口
    strictPort: true,  // 如果端口被佔用則報錯，而不是換端口
    fs: {
      // 允許訪問父目錄
      allow: ['..', '../..'],
    },
  },
})
