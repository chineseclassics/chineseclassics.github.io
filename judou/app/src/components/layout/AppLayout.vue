<script setup lang="ts">
import SidebarMenu from './SidebarMenu.vue'
import MobileRadialMenu from './MobileRadialMenu.vue'
</script>

<template>
  <div class="app-layout">
    <!-- 桌面端：固定側邊欄 -->
    <SidebarMenu />
    
    <!-- 移動端：放射狀菜單 -->
    <MobileRadialMenu />
    
    <section class="app-main">
      <div class="app-content">
        <router-view />
      </div>
    </section>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-primary-50);
}

.app-main {
  flex: 1;
  padding: clamp(1rem, 3vw, 3rem);
  display: flex;
  justify-content: center;
  align-items: stretch;
}

.app-content {
  width: min(1200px, 100%);
}

@media (max-width: 960px) {
  .app-layout {
    flex-direction: column;
  }

  .app-main {
    padding: clamp(1rem, 5vw, 2rem);
  }
}
</style>
