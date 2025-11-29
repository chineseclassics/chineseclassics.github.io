<!--
  句豆 - 頭像選擇器組件
  
  用於讓用戶瀏覽和選擇頭像
-->

<template>
  <div class="avatar-selector">
    <!-- 當前頭像展示 -->
    <div class="current-avatar-section">
      <div 
        class="current-avatar-wrapper" 
        role="button"
        tabindex="0"
        aria-label="點擊更換頭像"
        @click="showModal = true"
        @keydown.enter="showModal = true"
        @keydown.space.prevent="showModal = true"
      >
        <img
          v-if="avatarStore.currentAvatarUrl"
          :src="avatarStore.currentAvatarUrl"
          :alt="avatarStore.currentAvatar?.name || '頭像'"
          class="current-avatar-img"
        />
        <div v-else class="current-avatar-placeholder">
          <BeanIcon :size="36" />
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

            <!-- 頭像分組（從普通到傳奇，方便新用戶先看到可用的） -->
            <div class="avatar-groups">
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
import BeanIcon from '@/components/common/BeanIcon.vue'

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
   句豆設計系統 - 頭像選擇器
   主題：種豆南山下，悠然見成長
   ===================================================== */

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
  border: 3px solid #deedc4;
  transition: all 0.2s ease;
  background: #f8faf5;
  box-shadow: 0 2px 8px rgba(139, 178, 79, 0.15);
}

.current-avatar-wrapper:hover {
  border-color: #8bb24f;
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(139, 178, 79, 0.25);
}

.current-avatar-wrapper:focus {
  outline: none;
  border-color: #8bb24f;
  box-shadow: 0 0 0 3px rgba(139, 178, 79, 0.3);
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
  background: linear-gradient(135deg, #eff6e5, #deedc4);
}

.placeholder-icon {
  font-size: 2rem;
}

.edit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(88, 122, 43, 0.6);
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
  color: #44403c;
}

.avatar-hint {
  font-size: 0.75rem;
  color: #78716c;
}

/* =====================================================
   彈窗樣式 - 毛玻璃效果（句豆風格）
   ===================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(58, 80, 32, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  /* 毛玻璃效果 - 句豆風格 */
  background: linear-gradient(
    145deg,
    rgba(248, 250, 245, 0.95) 0%,
    rgba(239, 246, 229, 0.92) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 178, 79, 0.2);
  border-radius: 1.5rem;
  max-width: 560px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 
    0 8px 32px rgba(58, 80, 32, 0.15),
    0 2px 8px rgba(139, 178, 79, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(139, 178, 79, 0.15);
  position: sticky;
  top: 0;
  background: linear-gradient(
    180deg,
    rgba(248, 250, 245, 0.98) 0%,
    rgba(248, 250, 245, 0.95) 100%
  );
  z-index: 1;
  border-radius: 1.5rem 1.5rem 0 0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #587a2b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title::before {
  content: '🌱';
  font-size: 1.1rem;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(139, 178, 79, 0.2);
  background: rgba(255, 255, 255, 0.7);
  color: #78716c;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 300;
}

.close-btn:hover {
  background: rgba(139, 178, 79, 0.1);
  color: #587a2b;
  border-color: #8bb24f;
  transform: rotate(90deg);
}

/* =====================================================
   頭像統計
   ===================================================== */
.avatar-stats {
  padding: 0.875rem 1.5rem;
  background: linear-gradient(90deg, rgba(139, 178, 79, 0.08), rgba(139, 178, 79, 0.03));
  border-bottom: 1px solid rgba(139, 178, 79, 0.1);
}

.stats-text {
  font-size: 0.875rem;
  color: #57534e;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stats-text::before {
  content: '🌱';
  font-size: 0.9rem;
}

.stats-text strong {
  color: #6f9638;
  font-weight: 700;
  font-size: 1rem;
}

/* =====================================================
   頭像分組
   ===================================================== */
.avatar-groups {
  padding: 1.25rem 1.5rem;
}

.avatar-group {
  margin-bottom: 1.75rem;
}

.avatar-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 2px solid;
}

/* 傳奇 - 金色 */
.group-header.legendary {
  border-color: #f59e0b;
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.1), transparent);
  padding: 0.5rem 0.75rem;
  margin-left: -0.75rem;
  margin-right: -0.75rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.group-header.legendary .rarity-label {
  color: #d97706;
}

/* 珍貴 - 紫色 */
.group-header.epic {
  border-color: #a855f7;
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.08), transparent);
  padding: 0.5rem 0.75rem;
  margin-left: -0.75rem;
  margin-right: -0.75rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.group-header.epic .rarity-label {
  color: #9333ea;
}

/* 稀有 - 藍色 */
.group-header.rare {
  border-color: #3b82f6;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.08), transparent);
  padding: 0.5rem 0.75rem;
  margin-left: -0.75rem;
  margin-right: -0.75rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.group-header.rare .rarity-label {
  color: #2563eb;
}

/* 普通 - 灰綠色 */
.group-header.common {
  border-color: #8bb24f;
  background: linear-gradient(90deg, rgba(139, 178, 79, 0.08), transparent);
  padding: 0.5rem 0.75rem;
  margin-left: -0.75rem;
  margin-right: -0.75rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.group-header.common .rarity-label {
  color: #6f9638;
}

.rarity-stars {
  font-size: 0.7rem;
  letter-spacing: -2px;
}

.rarity-label {
  font-size: 0.875rem;
  font-weight: 700;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 0.875rem;
}

/* =====================================================
   加載狀態
   ===================================================== */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: #78716c;
}

.loading-spinner {
  animation: spin 1.5s ease-in-out infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  gap: 0.625rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #8bb24f, #6f9638);
  color: white;
  border-radius: 2rem;
  box-shadow: 
    0 4px 20px rgba(111, 150, 56, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  font-weight: 600;
  font-size: 0.9rem;
}

.toast-icon {
  font-size: 1.25rem;
}

/* =====================================================
   動畫
   ===================================================== */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.92) translateY(30px);
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-30px) scale(0.9);
}

/* =====================================================
   響應式
   ===================================================== */
@media (max-width: 640px) {
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal-content {
    max-height: 85vh;
    border-radius: 1.5rem 1.5rem 0 0;
    margin-top: auto;
  }

  .modal-header {
    border-radius: 1.5rem 1.5rem 0 0;
  }

  .avatar-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .current-avatar-wrapper {
    width: 60px;
    height: 60px;
  }

  .avatar-groups {
    padding: 1rem;
  }
}

/* =====================================================
   滾動條美化
   ===================================================== */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: rgba(139, 178, 79, 0.05);
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: rgba(139, 178, 79, 0.3);
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 178, 79, 0.5);
}
</style>

