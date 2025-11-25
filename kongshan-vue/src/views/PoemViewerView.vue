<script setup>
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePoems } from '../composables/usePoems'
import { useAtmospheres } from '../composables/useAtmospheres'
import { useAuth } from '../composables/useAuth'
import { useEditorStore } from '../stores/editor'
import { AudioEngine } from '../lib/audio-engine'
import { SoundMixer } from '../lib/sound-mixer'
import { BackgroundRenderer } from '../lib/background-renderer'
import { getAtmosphereSounds } from '../utils/atmosphere-helper'
import SoundControls from '../components/SoundControls.vue'
import AtmosphereEditor from '../components/AtmosphereEditor/index.vue'

const router = useRouter()
const route = useRoute()
const { currentPoem, loadPoemById } = usePoems()
const {
  atmospheres,
  currentAtmosphere,
  currentIndex,
  hasAtmospheres,
  isCurrentLiked,
  loadAtmospheres,
  nextAtmosphere,
  setCurrentAtmosphereById,
  toggleLike,
  saveAtmosphere,
  clear: clearAtmospheres,
} = useAtmospheres()
const { userId, userMetadata } = useAuth()
const editorStore = useEditorStore()

const loading = ref(true)
const atmosphereStatusTimer = ref(null)

// 元素引用
const poemContent = ref(null)

// 音頻和背景引擎
const audioEngine = ref(null)
const soundMixer = ref(null)
const backgroundRenderer = ref(null)
const baseBackgroundConfig = ref(null)

// 當前意境的作者信息
const currentAtmosphereAuthor = computed(() => {
  if (!currentAtmosphere.value) return null
  
  const isOwnAtmosphere = currentAtmosphere.value.created_by === userId.value
  const displayName = isOwnAtmosphere 
    ? (userMetadata.value?.fullName || userMetadata.value?.email || '我')
    : '旅人'
  
  let statusNote = ''
  if (currentAtmosphere.value.status !== 'approved' && isOwnAtmosphere) {
    if (currentAtmosphere.value.status === 'pending') {
      statusNote = '（待審核）'
    } else if (currentAtmosphere.value.status === 'rejected') {
      statusNote = '（未通過審核）'
    } else {
      statusNote = '（尚未公開）'
    }
  }
  
  return `${displayName} 的聲色意境${statusNote}`
})

// 初始化音頻和背景引擎
onMounted(async () => {
  // 初始化音頻引擎
  audioEngine.value = new AudioEngine()
  soundMixer.value = new SoundMixer(audioEngine.value)
  
  // 初始化背景渲染器
  const canvas = document.getElementById('background-canvas')
  if (canvas) {
    backgroundRenderer.value = new BackgroundRenderer(canvas)
  }
  
  // 加載詩歌
  const poemId = route.params.id
  if (poemId) {
    await loadPoemById(poemId)
    
    // 詩歌數據已加載，Vue 模板會自動渲染
    await nextTick()
    if (currentPoem.value) {
      console.log('🎯 onMounted 詩歌已加載:', currentPoem.value.title)
    } else {
      console.warn('⚠️ 詩歌數據未加載')
    }
    
    // 加載聲色意境
    if (userId.value) {
      await loadAtmospheres(poemId, userId.value)
    } else {
      await loadAtmospheres(poemId)
    }
    
    // 應用第一個聲色意境
    if (currentAtmosphere.value) {
      await applyAtmosphere(currentAtmosphere.value, true)
    }
  }
  loading.value = false
})

// 清理
onUnmounted(async () => {
  editorStore.close()
  clearAtmospheres()
  if (atmosphereStatusTimer.value) {
    clearTimeout(atmosphereStatusTimer.value)
  }
  
  // 清理音頻
  if (soundMixer.value) {
    await soundMixer.value.clear()
  }
  if (audioEngine.value) {
    await audioEngine.value.close()
  }
  
  // 清理背景
  if (backgroundRenderer.value) {
    backgroundRenderer.value.clear()
  }
})

// 渲染豎排詩歌（從原版遷移）
const renderVerticalPoem = (container, poem) => {
  console.log('📝 renderVerticalPoem 被調用:', { container, poem })
  if (!container || !poem) {
    console.warn('⚠️ 容器或詩歌數據為空')
    return
  }
  
  console.log('📝 詩歌內容:', poem.content)
  container.innerHTML = ''
  
  const poemWrapper = document.createElement('div')
  poemWrapper.className = 'poem-wrapper'
  
  const contentArea = document.createElement('div')
  contentArea.className = 'poem-content-area'
  
  // 標題和作者
  const metaContainer = document.createElement('div')
  metaContainer.className = 'poem-meta'
  
  let metaText = ''
  if (poem.title) {
    metaText = poem.title
  }
  if (poem.author || poem.dynasty) {
    const authorText = poem.dynasty && poem.author 
      ? `${poem.dynasty} · ${poem.author}`
      : poem.author || poem.dynasty
    metaText += (metaText ? '　' : '') + authorText
  }
  
  if (metaText) {
    metaContainer.textContent = metaText
    contentArea.appendChild(metaContainer)
  }
  
  // 詩歌內容
  const contentEl = document.createElement('div')
  contentEl.className = 'poem-text'
  if (poem.content) {
    const contentLines = poem.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    const originalContent = contentLines.join('\n')
    contentEl.innerHTML = contentLines.join('<br>')
    contentEl.dataset.text = originalContent
  }
  contentArea.appendChild(contentEl)
  
  poemWrapper.appendChild(contentArea)
  container.appendChild(poemWrapper)
  console.log('✅ 詩歌渲染完成，容器內容:', container.innerHTML.substring(0, 200))
}

// 返回列表
const goBack = () => {
  clearAtmospheres()
  router.push('/poems')
}

// 切換意境
const handleCycleAtmosphere = async () => {
  nextAtmosphere()
  if (currentAtmosphere.value) {
    await applyAtmosphere(currentAtmosphere.value, true)
  }
}

// 編輯意境
const handleEditAtmosphere = () => {
  if (!currentPoem.value) return
  editorStore.open(currentPoem.value, currentAtmosphere.value)
}

// 保存意境
const handleSaveAtmosphere = async (atmosphereData) => {
  if (!userId.value) {
    alert('請先登入')
    return
  }
  
  try {
    const savedData = await saveAtmosphere(atmosphereData, userId.value)
    
    // 根據保存後的狀態顯示不同提示（注意：編輯器已經顯示過提示，這裡不再重複）
    // 只在控制台記錄
    console.log(`✅ 意境已保存，狀態: ${savedData?.status || atmosphereData.status}`)
    
    // 重新加載意境列表
    if (currentPoem.value) {
      await loadAtmospheres(currentPoem.value.id, userId.value)
      
      // 應用新創作的意境（如果是第一個）
      if (currentAtmosphere.value) {
        await applyAtmosphere(currentAtmosphere.value, true)
      }
    }
  } catch (error) {
    console.error('保存意境失敗:', error)
    alert('保存失敗：' + error.message)
  }
}

// 應用聲色意境（音頻 + 背景）
const applyAtmosphere = async (atmosphere, showStatus = false) => {
  if (!atmosphere) return
  
  try {
    // 淡出舊音效
    if (soundMixer.value) {
      await soundMixer.value.clear(true, 500)
    }
    
    // 應用背景
    if (backgroundRenderer.value && atmosphere.background_config) {
      await backgroundRenderer.value.setConfigWithTransition(atmosphere.background_config, 600)
      
      // 根據背景配置自動計算並應用文字顏色
      const textColor = getTargetTextColor(atmosphere.background_config)
      applyTextColorWithTransition(textColor, 600)
    }
    
    // 加載並播放音效
    if (atmosphere.sound_combination && Array.isArray(atmosphere.sound_combination)) {
      const sounds = await getAtmosphereSounds(atmosphere)
      
      for (const sound of sounds) {
        if (soundMixer.value) {
          await soundMixer.value.addTrack({
            ...sound,
            volume: sound.volume !== undefined ? sound.volume : 0.7,
            loop: sound.loop !== undefined ? sound.loop : true,
          })
        }
      }
      
      // 播放所有音效（淡入）
      if (soundMixer.value) {
        await soundMixer.value.playAll(true, 500)
      }
    }
    
    // 顯示意境信息
    if (showStatus && currentAtmosphereAuthor.value) {
      showAtmosphereStatus(currentAtmosphereAuthor.value, atmosphere.status === 'approved')
    }
  } catch (error) {
    console.error('應用聲色意境失敗:', error)
  }
}

// getAtmosphereSounds 已從 utils/atmosphere-helper.js 導入

// 背景文字顏色映射表（根據背景配色方案自動設置文字顏色）
const backgroundTextColorMap = {
  'night': '#FFFFFF',           // 夜色：白色文字
  'dawn': '#2C3E50',            // 晨曦：深色文字
  'autumn': '#FFFFFF',          // 秋色：白色文字
  'spring': '#2C3E50',          // 春意：深色文字
  'sunset': '#FFFFFF',          // 暮色：白色文字
  'bamboo': '#FFFFFF',          // 竹林：白色文字
  'winter-snow': '#2C3E50',     // 冬雪：深色文字
  'plum-blossom': '#2C3E50',    // 梅花：深色文字
  'starry-night': '#FFFFFF',    // 星夜：白色文字
  'rotating-stars': '#FDF7FF',  // 星移：高亮白色文字
  'twinkling-stars': '#FFFFFF', // 靜夜星空：白色文字
  'green-mountain': '#FFFFFF',  // 青山：白色文字
  'cloud-mist': '#2C3E50',      // 雲霧：深色文字
  'falling-flowers': '#2C3E50', // 落花：深色文字
  'lantern-valley': '#FFFFFF',  // 元宵：白色文字
  'rainfall': '#FFFFFF',        // 雨幕：白色文字
}

// 計算顏色亮度（用於自動判斷文字顏色）
const getLuminance = (hex) => {
  const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!rgb) return 0
  
  const r = parseInt(rgb[1], 16) / 255
  const g = parseInt(rgb[2], 16) / 255
  const b = parseInt(rgb[3], 16) / 255
  
  // 使用相對亮度公式
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

// 根據背景配置獲取目標文字顏色
const getTargetTextColor = (backgroundConfig) => {
  if (!backgroundConfig?.color_scheme?.colors) {
    return '#2C3E50' // 默認深色
  }

  const bgId = backgroundConfig.color_scheme.id
  const colors = backgroundConfig.color_scheme.colors
  
  // 如果是自定義配色（沒有 id 或 id 以 custom- 開頭），根據亮度自動判斷
  if (!bgId || bgId.startsWith('custom-')) {
    const avgLuminance = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length
    return avgLuminance > 0.5 ? '#2C3E50' : '#FFFFFF'
  }
  
  // 預設配色：使用映射表
  return backgroundTextColorMap[bgId] || '#2C3E50'
}

// 應用文字顏色（帶過渡動畫）
const applyTextColorWithTransition = (targetColor, duration = 600) => {
  const root = document.documentElement
  
  // 設置 CSS 變量（會自動應用到使用這些變量的元素）
  root.style.setProperty('--poem-text-color', targetColor)
  root.style.setProperty('--poem-glow-color', targetColor)
  root.style.setProperty('--poem-meta-color', targetColor)
  
  // 更新發光效果顏色
  updatePoemTextGlow(targetColor)
}

// 更新詩歌文字發光效果
const updatePoemTextGlow = (textColor) => {
  const root = document.documentElement
  const isLight = textColor === '#FFFFFF' || textColor === '#FDF7FF'
  
  if (isLight) {
    // 白色文字：使用白色發光
    root.style.setProperty('--poem-glow-shadow-min', '0 0 8px rgba(255, 255, 255, 0.3), 0 0 12px rgba(255, 255, 255, 0.18)')
    root.style.setProperty('--poem-glow-shadow-max', '0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.48)')
  } else {
    // 深色文字：使用深色發光（或無發光）
    root.style.setProperty('--poem-glow-shadow-min', '0 0 8px rgba(44, 62, 80, 0.15), 0 0 12px rgba(44, 62, 80, 0.1)')
    root.style.setProperty('--poem-glow-shadow-max', '0 0 15px rgba(44, 62, 80, 0.3), 0 0 25px rgba(44, 62, 80, 0.2)')
  }
}

// 點讚
const handleToggleLike = async () => {
  if (!userId.value || !currentAtmosphere.value) return
  
  await toggleLike(currentAtmosphere.value.id, userId.value)
  if (currentAtmosphereAuthor.value) {
    showAtmosphereStatus(currentAtmosphereAuthor.value, currentAtmosphere.value.status === 'approved')
  }
}

// 顯示意境狀態（使用原版的邏輯）
const showAtmosphereStatus = (text, showLikeButton) => {
  const statusEl = document.getElementById('atmosphere-status')
  const statusText = document.getElementById('atmosphere-status-text')
  const likeBtn = document.getElementById('atmosphere-like-btn')
  
  if (!statusEl || !statusText || !likeBtn) return
  
  statusText.textContent = text || ''
  
  if (showLikeButton) {
    likeBtn.classList.remove('is-hidden')
  } else {
    likeBtn.classList.add('is-hidden')
  }
  
  statusEl.hidden = false
  statusEl.classList.remove('visible')
  void statusEl.offsetWidth
  statusEl.classList.add('visible')
  
  if (atmosphereStatusTimer.value) {
    clearTimeout(atmosphereStatusTimer.value)
  }
  
  atmosphereStatusTimer.value = setTimeout(() => {
    statusEl.classList.remove('visible')
    setTimeout(() => {
      if (!statusEl.classList.contains('visible')) {
        statusEl.hidden = true
      }
    }, 360)
  }, 3000)
}

// 監聽意境變化，自動更新 UI
watch([currentAtmosphere, isCurrentLiked], () => {
  const likeBtn = document.getElementById('atmosphere-like-btn')
  const likeCount = document.getElementById('atmosphere-like-count')
  
  if (!likeBtn || !likeCount) return
  
  if (!currentAtmosphere.value) {
    likeBtn.classList.add('is-hidden')
    likeBtn.setAttribute('aria-pressed', 'false')
    likeBtn.disabled = true
    likeCount.textContent = '0'
    return
  }
  
  if (currentAtmosphere.value.status !== 'approved') {
    likeBtn.classList.add('is-hidden')
    likeBtn.disabled = true
    likeCount.textContent = String(currentAtmosphere.value.like_count || 0)
    return
  }
  
  likeBtn.classList.remove('is-hidden')
  likeBtn.setAttribute('aria-pressed', isCurrentLiked.value ? 'true' : 'false')
  likeBtn.disabled = !userId.value
  likeCount.textContent = String(currentAtmosphere.value.like_count || 0)
})

// 監聽當前詩歌變化（使用 Vue 模板渲染，不再調用 renderVerticalPoem）
watch(currentPoem, (newPoem) => {
  if (newPoem) {
    console.log('🎯 詩歌已加載:', newPoem.title)
  }
}, { immediate: true })
</script>

<template>
  <div class="screen" id="poem-viewer-screen">
    <div class="poem-viewer-container">
      <!-- 頂部工具欄 -->
      <div class="poem-viewer-topbar">
        <!-- 返回按鈕 -->
        <button 
          id="back-to-list-btn" 
          class="back-button" 
          type="button" 
          aria-label="返回詩歌列表"
          @click="goBack"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span class="sr-only">返回</span>
        </button>

        <!-- 切換意境按鈕 -->
        <button 
          id="atmosphere-cycle-btn" 
          class="atmosphere-cycle-logo" 
          type="button" 
          aria-label="切換聲色意境"
          @click="handleCycleAtmosphere"
        >
          <i class="fas fa-mountain-sun" aria-hidden="true"></i>
          <span class="sr-only">切換聲色意境</span>
        </button>

        <!-- 創作意境按鈕 -->
        <button 
          id="edit-atmosphere-btn" 
          class="edit-atmosphere-button" 
          aria-label="創作聲色意境" 
          title="創作聲色意境"
          @click="handleEditAtmosphere"
        >
          <span class="sr-only">創作聲色意境</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>

      <!-- 意境狀態提示 -->
      <div id="atmosphere-status" class="atmosphere-status" hidden>
        <div class="atmosphere-status-inner">
          <span id="atmosphere-status-text" class="atmosphere-status-text"></span>
          <button 
            id="atmosphere-like-btn" 
            class="atmosphere-like-button" 
            type="button" 
            aria-label="點讚聲色意境" 
            aria-pressed="false"
            @click="handleToggleLike"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
            <span id="atmosphere-like-count" class="atmosphere-like-count">0</span>
          </button>
        </div>
      </div>

      <!-- 詩歌內容 - 豎排版 -->
      <div ref="poemContent" id="poem-content" class="poem-content-vue">
        <div v-if="currentPoem" class="poem-wrapper-vue">
          <div class="poem-content-area-vue">
            <div class="poem-meta-vue">{{ currentPoem.title }}　{{ currentPoem.dynasty }} · {{ currentPoem.author }}</div>
            <div class="poem-text-vue" :data-text="currentPoem.content">{{ currentPoem.content }}</div>
          </div>
        </div>
        <div v-else class="poem-loading-vue">載入中...</div>
      </div>

      <!-- 音效控制面板 -->
      <SoundControls 
        v-if="soundMixer && soundMixer.getTracks().length > 0"
        :sound-mixer="soundMixer"
      />

      <!-- 聲色意境選擇器（待實現） -->
      <div id="atmosphere-selector" class="atmosphere-selector" style="display: none;">
        <!-- 意境選擇將在後續實現 -->
      </div>
    </div>

    <!-- 聲色意境編輯器 -->
    <AtmosphereEditor
      :sound-mixer="soundMixer"
      :background-renderer="backgroundRenderer"
      @save="handleSaveAtmosphere"
      @close="editorStore.close()"
    />
  </div>
</template>

<style scoped>
/* ===== 詩歌內容顯示（豎排版）- Vue 專用樣式 ===== */

.poem-content-vue {
  flex-grow: 1;
  width: 100vw;
  height: 100vh;
  padding: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.poem-wrapper-vue {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  padding: 0;
  overflow: visible;
  touch-action: manipulation;
}

.poem-content-area-vue {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: var(--spacing-xl);
  box-sizing: border-box;
  overflow: hidden;
  touch-action: manipulation;
}

/* 呼吸動畫關鍵幀 */
@keyframes breathe {
  0% {
    opacity: 0.92;
    transform: scale(0.985);
  }
  33% {
    opacity: 1;
    transform: scale(1.008);
  }
  100% {
    opacity: 0.92;
    transform: scale(0.985);
  }
}

/* 發光層動畫 */
@keyframes breathe-glow {
  0% {
    opacity: var(--poem-glow-opacity-min, 0.25);
    transform: scale(var(--poem-glow-scale-min, 0.99));
  }
  33% {
    opacity: var(--poem-glow-opacity-max, 0.85);
    transform: scale(var(--poem-glow-scale-max, 1.015));
  }
  100% {
    opacity: var(--poem-glow-opacity-min, 0.25);
    transform: scale(var(--poem-glow-scale-min, 0.99));
  }
}

/* 詩歌正文 - 豎排版從右到左 */
.poem-text-vue {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-serif);
  font-size: 3rem;
  line-height: 2.5;
  letter-spacing: 0.4em;
  color: var(--poem-text-color, var(--color-text-primary, #324235));
  font-weight: 400;
  white-space: pre-line;
  position: relative;
  text-shadow: var(--poem-glow-shadow-min, 0 0 8px rgba(255, 255, 255, 0.3), 0 0 12px rgba(255, 255, 255, 0.18));
  animation: breathe 8s ease-in-out infinite;
  animation-timing-function: cubic-bezier(0.45, 0.05, 0.55, 0.95);
  will-change: opacity, transform;
  transform-origin: center center;
  transition: color 0.4s ease;
}

/* 發光層 */
.poem-text-vue::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  display: block;
  writing-mode: inherit;
  text-orientation: inherit;
  pointer-events: none;
  white-space: pre-line;
  color: transparent;
  text-shadow: var(--poem-glow-shadow-max, 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.48));
  transform-origin: center center;
  animation: breathe-glow 8s ease-in-out infinite;
  animation-timing-function: cubic-bezier(0.45, 0.05, 0.55, 0.95);
  opacity: var(--poem-glow-opacity-min, 0.25);
}

/* 詩歌標題和作者 */
.poem-meta-vue {
  position: absolute;
  bottom: var(--spacing-xl);
  left: var(--spacing-xl);
  font-family: var(--font-serif);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  color: var(--poem-meta-color, var(--color-text-tertiary));
  font-size: 1.2rem;
  letter-spacing: 0.2em;
  opacity: 0.7;
  white-space: nowrap;
  z-index: 10;
  max-height: calc(100vh - var(--spacing-xl) * 2);
  overflow: hidden;
  transition: color 0.4s ease;
}

/* 載入提示 */
.poem-loading-vue {
  font-size: 1.5rem;
  color: var(--color-text-tertiary);
}

/* ===== 移動端適配 ===== */
@media (max-width: 768px) {
  .poem-wrapper-vue {
    padding: clamp(2.5rem, 10vh, 4rem) clamp(1.5rem, 6vw, 2.75rem) clamp(6rem, 18vh, 8.5rem);
  }

  .poem-content-area-vue {
    padding: var(--spacing-md);
  }

  .poem-text-vue {
    font-size: clamp(1.8rem, 6.2vw, 2.35rem);
    line-height: 2.05;
    letter-spacing: 0.26em;
  }

  .poem-meta-vue {
    bottom: calc(var(--spacing-sm) + 60px + var(--spacing-md));
    left: calc(var(--spacing-sm) + 52px);
    font-size: 0.95rem;
    letter-spacing: 0.18em;
    opacity: 0.82;
    max-height: calc(100vh - var(--spacing-sm) - 60px - var(--spacing-md) - var(--spacing-md));
  }
}
</style>
