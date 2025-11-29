<!--
  句豆 - 單個頭像項目組件
  
  用於在頭像網格中顯示單個頭像
-->

<template>
  <div
    class="avatar-item"
    :class="{
      'is-unlocked': isUnlocked,
      'is-locked': !isUnlocked,
      'is-current': isCurrent
    }"
    @click="handleClick"
  >
    <!-- 頭像圖片 -->
    <div class="avatar-image-wrapper">
      <img
        :src="avatarUrl"
        :alt="avatar.name"
        class="avatar-image"
        :class="{ 'locked-image': !isUnlocked }"
      />
      
      <!-- 鎖定遮罩 -->
      <div v-if="!isUnlocked" class="lock-overlay">
        <span class="lock-icon">🔒</span>
      </div>

      <!-- 當前使用標記 -->
      <div v-if="isCurrent" class="current-badge">
        <span class="current-icon">✓</span>
      </div>
    </div>

    <!-- 頭像名稱 -->
    <div class="avatar-name">{{ avatar.name }}</div>

    <!-- 解鎖條件提示 -->
    <div v-if="!isUnlocked" class="unlock-hint">
      {{ avatar.unlock_description || getDefaultUnlockHint() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAvatarStore, type Avatar } from '@/stores/avatarStore'

const props = defineProps<{
  avatar: Avatar
  isUnlocked: boolean
  isCurrent: boolean
}>()

const emit = defineEmits<{
  select: [avatar: Avatar]
}>()

const avatarStore = useAvatarStore()

// 計算頭像 URL
const avatarUrl = computed(() => avatarStore.getAvatarUrl(props.avatar))

/**
 * 獲取默認解鎖提示
 */
function getDefaultUnlockHint(): string {
  switch (props.avatar.unlock_type) {
    case 'level':
      return `Lv.${props.avatar.unlock_value} 解鎖`
    case 'achievement':
      return '完成成就解鎖'
    case 'event':
      return '活動限定'
    default:
      return '暫未開放'
  }
}

/**
 * 點擊處理
 */
function handleClick() {
  emit('select', props.avatar)
}
</script>

<style scoped>
/* =====================================================
   句豆設計系統 - 頭像卡片
   ===================================================== */
.avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(139, 178, 79, 0.1);
}

.avatar-item.is-unlocked:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(139, 178, 79, 0.2);
  border-color: rgba(139, 178, 79, 0.3);
}

.avatar-item.is-locked {
  cursor: not-allowed;
  opacity: 0.75;
}

.avatar-item.is-locked:hover {
  transform: none;
}

.avatar-item.is-current {
  background: linear-gradient(135deg, #eff6e5, #deedc4);
  border: 2px solid #8bb24f;
  box-shadow: 
    0 4px 12px rgba(139, 178, 79, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* 頭像圖片區域 */
.avatar-image-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #f8faf5, #eff6e5);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.avatar-image.locked-image {
  filter: grayscale(100%) brightness(0.65) contrast(0.9);
}

/* 鎖定遮罩 */
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(68, 64, 60, 0.5);
  backdrop-filter: blur(1px);
}

.lock-icon {
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* 當前使用標記 */
.current-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8bb24f, #6f9638);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(111, 150, 56, 0.4);
}

.current-icon {
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

/* 頭像名稱 */
.avatar-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #44403c;
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-locked .avatar-name {
  color: #a8a29e;
}

.is-current .avatar-name {
  color: #587a2b;
}

/* 解鎖提示 */
.unlock-hint {
  font-size: 0.625rem;
  color: #a8a29e;
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.125rem 0.375rem;
  background: rgba(168, 162, 158, 0.1);
  border-radius: 0.25rem;
}

/* 響應式 */
@media (max-width: 640px) {
  .avatar-item {
    padding: 0.5rem;
    gap: 0.375rem;
  }

  .avatar-image-wrapper {
    width: 52px;
    height: 52px;
  }

  .avatar-name {
    font-size: 0.7rem;
  }

  .unlock-hint {
    font-size: 0.575rem;
  }

  .current-badge {
    width: 18px;
    height: 18px;
  }

  .current-icon {
    font-size: 0.6rem;
  }
}
</style>

