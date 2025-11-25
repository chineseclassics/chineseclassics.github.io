import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

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
    },
  },
})
