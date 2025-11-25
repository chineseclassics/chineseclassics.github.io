<script setup>
// 空山 Vue 版根組件
import { onMounted } from 'vue'

onMounted(() => {
  // 檢測 iOS 設備
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) {
    document.documentElement.classList.add('ios-device')
  }
})
</script>

<template>
  <!-- 背景 Canvas -->
  <canvas id="background-canvas"></canvas>
  
  <!-- Toast 提示容器 -->
  <div id="sound-reminder-toast" class="sound-reminder-toast" aria-live="polite" aria-atomic="true" hidden>
    <div class="sound-reminder-toast-inner">
      <i class="fas fa-volume-up sound-reminder-icon" aria-hidden="true"></i>
      <span class="sound-reminder-text">旅人，請打開聲音，聆聽空山的聲色意境</span>
    </div>
  </div>

  <!-- 主容器 -->
  <div id="app" class="app-container">
    <!-- 加載畫面（可選） -->
    <div v-if="false" id="loading-screen" class="loading-screen">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">空山</p>
      </div>
    </div>

    <!-- 路由視圖 -->
    <router-view></router-view>
  </div>
</template>

<style>
/* 全局樣式已在 style.css 中導入 */
</style>

