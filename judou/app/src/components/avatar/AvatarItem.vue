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
.avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-surface-100);
}

.avatar-item.is-unlocked:hover {
  background: var(--color-surface-200);
  transform: translateY(-2px);
}

.avatar-item.is-locked {
  cursor: not-allowed;
}

.avatar-item.is-current {
  background: var(--color-primary-100);
  border: 2px solid var(--color-primary-400);
}

/* 頭像圖片區域 */
.avatar-image-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-surface-50);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.2s ease;
}

.avatar-image.locked-image {
  filter: grayscale(100%) brightness(0.7);
}

/* 鎖定遮罩 */
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.lock-icon {
  font-size: 1.25rem;
}

/* 當前使用標記 */
.current-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary-500);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-surface-50);
}

.current-icon {
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

/* 頭像名稱 */
.avatar-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: center;
  line-height: 1.2;
}

.is-locked .avatar-name {
  color: var(--color-text-muted);
}

/* 解鎖提示 */
.unlock-hint {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 響應式 */
@media (max-width: 640px) {
  .avatar-image-wrapper {
    width: 56px;
    height: 56px;
  }

  .avatar-name {
    font-size: 0.7rem;
  }

  .unlock-hint {
    font-size: 0.6rem;
  }
}
</style>

