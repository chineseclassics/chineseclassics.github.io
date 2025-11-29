<!--
  句豆 - 頭像選擇器組件
  
  用於讓用戶瀏覽和選擇頭像
-->

<template>
  <div class="avatar-selector">
    <!-- 當前頭像展示 -->
    <div class="current-avatar-section">
      <div class="current-avatar-wrapper" @click="showModal = true">
        <img
          v-if="avatarStore.currentAvatarUrl"
          :src="avatarStore.currentAvatarUrl"
          :alt="avatarStore.currentAvatar?.name || '頭像'"
          class="current-avatar-img"
        />
        <div v-else class="current-avatar-placeholder">
          <span class="placeholder-icon">🫘</span>
        </div>
        <div class="edit-overlay">
          <span class="edit-icon">✏️</span>
        </div>
      </div>
      <div class="current-avatar-info">
        <span class="avatar-name">{{ avatarStore.currentAvatar?.name || '選擇頭像' }}</span>
        <span class="avatar-hint">點擊更換頭像</span>
      </div>
    </div>

    <!-- 頭像選擇彈窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">選擇頭像</h2>
              <button class="close-btn" @click="showModal = false">×</button>
            </div>

            <!-- 頭像統計 -->
            <div class="avatar-stats">
              <span class="stats-text">
                已解鎖 <strong>{{ avatarStore.unlockedCount }}</strong> / {{ avatarStore.totalCount }}
              </span>
            </div>

            <!-- 頭像分組 -->
            <div class="avatar-groups">
              <!-- 傳奇 -->
              <div v-if="avatarStore.avatarsByRarity.legendary.length" class="avatar-group">
                <div class="group-header legendary">
                  <span class="rarity-stars">⭐⭐⭐⭐</span>
                  <span class="rarity-label">傳奇</span>
                </div>
                <div class="avatar-grid">
                  <AvatarItem
                    v-for="avatar in avatarStore.avatarsByRarity.legendary"
                    :key="avatar.id"
                    :avatar="avatar"
                    :is-unlocked="avatarStore.isUnlocked(avatar.id)"
                    :is-current="avatar.id === avatarStore.currentAvatarId"
                    @select="handleSelect(avatar)"
                  />
                </div>
              </div>

              <!-- 珍貴 -->
              <div v-if="avatarStore.avatarsByRarity.epic.length" class="avatar-group">
                <div class="group-header epic">
                  <span class="rarity-stars">⭐⭐⭐</span>
                  <span class="rarity-label">珍貴</span>
                </div>
                <div class="avatar-grid">
                  <AvatarItem
                    v-for="avatar in avatarStore.avatarsByRarity.epic"
                    :key="avatar.id"
                    :avatar="avatar"
                    :is-unlocked="avatarStore.isUnlocked(avatar.id)"
                    :is-current="avatar.id === avatarStore.currentAvatarId"
                    @select="handleSelect(avatar)"
                  />
                </div>
              </div>

              <!-- 稀有 -->
              <div v-if="avatarStore.avatarsByRarity.rare.length" class="avatar-group">
                <div class="group-header rare">
                  <span class="rarity-stars">⭐⭐</span>
                  <span class="rarity-label">稀有</span>
                </div>
                <div class="avatar-grid">
                  <AvatarItem
                    v-for="avatar in avatarStore.avatarsByRarity.rare"
                    :key="avatar.id"
                    :avatar="avatar"
                    :is-unlocked="avatarStore.isUnlocked(avatar.id)"
                    :is-current="avatar.id === avatarStore.currentAvatarId"
                    @select="handleSelect(avatar)"
                  />
                </div>
              </div>

              <!-- 普通 -->
              <div v-if="avatarStore.avatarsByRarity.common.length" class="avatar-group">
                <div class="group-header common">
                  <span class="rarity-stars">⭐</span>
                  <span class="rarity-label">普通</span>
                </div>
                <div class="avatar-grid">
                  <AvatarItem
                    v-for="avatar in avatarStore.avatarsByRarity.common"
                    :key="avatar.id"
                    :avatar="avatar"
                    :is-unlocked="avatarStore.isUnlocked(avatar.id)"
                    :is-current="avatar.id === avatarStore.currentAvatarId"
                    @select="handleSelect(avatar)"
                  />
                </div>
              </div>
            </div>

            <!-- 加載中 -->
            <div v-if="avatarStore.isLoading" class="loading-state">
              <span class="loading-spinner">⏳</span>
              <span>載入中...</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 新解鎖提示 -->
    <Transition name="toast">
      <div v-if="newUnlockedAvatar" class="unlock-toast">
        <div class="toast-content">
          <span class="toast-icon">🎉</span>
          <span class="toast-text">解鎖新頭像：{{ newUnlockedAvatar.name }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAvatarStore, type Avatar } from '@/stores/avatarStore'
import { useAuthStore } from '@/stores/authStore'
import AvatarItem from './AvatarItem.vue'

const avatarStore = useAvatarStore()
const authStore = useAuthStore()

// 狀態
const showModal = ref(false)
const newUnlockedAvatar = ref<Avatar | null>(null)

// 初始化
onMounted(async () => {
  await avatarStore.initialize()
})

// 監聽登錄狀態變化
watch(
  () => authStore.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      await avatarStore.initialize()
    } else {
      avatarStore.reset()
    }
  }
)

/**
 * 選擇頭像
 */
async function handleSelect(avatar: Avatar) {
  // 檢查是否已解鎖
  if (!avatarStore.isUnlocked(avatar.id)) {
    // 顯示解鎖提示
    return
  }

  // 設置當前頭像
  const success = await avatarStore.setCurrentAvatar(avatar.id)
  if (success) {
    showModal.value = false
  }
}

/**
 * 顯示新解鎖提示
 */
function showUnlockToast(avatar: Avatar) {
  newUnlockedAvatar.value = avatar
  setTimeout(() => {
    newUnlockedAvatar.value = null
  }, 3000)
}

// 暴露方法給父組件
defineExpose({
  showUnlockToast,
  openModal: () => { showModal.value = true }
})
</script>

<style scoped>
/* =====================================================
   當前頭像展示
   ===================================================== */
.current-avatar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.current-avatar-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid var(--color-primary-200);
  transition: all 0.2s ease;
  background: var(--color-surface-50);
}

.current-avatar-wrapper:hover {
  border-color: var(--color-primary-400);
  transform: scale(1.05);
}

.current-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.current-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200));
}

.placeholder-icon {
  font-size: 2rem;
}

.edit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.current-avatar-wrapper:hover .edit-overlay {
  opacity: 1;
}

.edit-icon {
  font-size: 1.5rem;
}

.current-avatar-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.avatar-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.avatar-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* =====================================================
   彈窗樣式
   ===================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--color-surface-50);
  border-radius: 1rem;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface-50);
  z-index: 1;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--color-surface-100);
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-surface-200);
  color: var(--color-text-primary);
}

/* =====================================================
   頭像統計
   ===================================================== */
.avatar-stats {
  padding: 0.75rem 1.5rem;
  background: var(--color-surface-100);
  border-bottom: 1px solid var(--color-border);
}

.stats-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.stats-text strong {
  color: var(--color-primary-500);
}

/* =====================================================
   頭像分組
   ===================================================== */
.avatar-groups {
  padding: 1rem;
}

.avatar-group {
  margin-bottom: 1.5rem;
}

.avatar-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid;
}

.group-header.legendary {
  border-color: #f59e0b;
}

.group-header.epic {
  border-color: #a855f7;
}

.group-header.rare {
  border-color: #3b82f6;
}

.group-header.common {
  border-color: #78716c;
}

.rarity-stars {
  font-size: 0.75rem;
}

.rarity-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.75rem;
}

/* =====================================================
   加載狀態
   ===================================================== */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* =====================================================
   新解鎖提示
   ===================================================== */
.unlock-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border-radius: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  font-weight: 500;
}

.toast-icon {
  font-size: 1.25rem;
}

/* =====================================================
   動畫
   ===================================================== */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(20px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* =====================================================
   響應式
   ===================================================== */
@media (max-width: 640px) {
  .modal-content {
    max-height: 90vh;
    border-radius: 1rem 1rem 0 0;
    margin-top: auto;
  }

  .avatar-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .current-avatar-wrapper {
    width: 60px;
    height: 60px;
  }
}
</style>

