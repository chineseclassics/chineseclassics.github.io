<script setup>
/**
 * 背景配色選擇器組件
 * 顯示預設配色和自定義配色功能
 * 支持即時預覽（選擇時立即應用到背景）
 */
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore, BACKGROUND_PRESETS } from '../../stores/editor'

// 接收 backgroundRenderer 用於即時預覽
const props = defineProps({
  backgroundRenderer: {
    type: Object,
    default: null,
  },
})

const store = useEditorStore()
const {
  selectedBackground,
  customColors,
  showCustomColorPicker,
} = storeToRefs(store)

// 監聽自定義顏色變化，即時預覽
watch(
  () => [customColors.value.color1, customColors.value.color2, customColors.value.direction],
  () => {
    if (showCustomColorPicker.value) {
      applyCustomColorPreview()
    }
  },
  { deep: true }
)

// 處理預設配色選擇
const handlePresetClick = (preset) => {
  store.selectBackground(preset)
  // 立即應用背景預覽
  applyBackgroundPreview(preset)
}

// 處理自定義配色卡片點擊
const handleCustomClick = () => {
  store.openCustomColorPicker()
  // 打開時立即預覽當前自定義顏色
  applyCustomColorPreview()
}

// 背景文字顏色映射表
const backgroundTextColorMap = {
  'night': '#FFFFFF',
  'dawn': '#2C3E50',
  'autumn': '#FFFFFF',
  'spring': '#2C3E50',
  'sunset': '#FFFFFF',
  'bamboo': '#FFFFFF',
  'winter-snow': '#2C3E50',
  'plum-blossom': '#2C3E50',
  'starry-night': '#FFFFFF',
  'rotating-stars': '#FDF7FF',
  'twinkling-stars': '#FFFFFF',
  'green-mountain': '#FFFFFF',
  'cloud-mist': '#2C3E50',
  'falling-flowers': '#2C3E50',
  'lantern-valley': '#FFFFFF',
  'rainfall': '#FFFFFF',
}

// 計算顏色亮度
function getLuminance(hex) {
  const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!rgb) return 0

  const r = parseInt(rgb[1], 16) / 255
  const g = parseInt(rgb[2], 16) / 255
  const b = parseInt(rgb[3], 16) / 255

  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

// 應用預設配色預覽
function applyBackgroundPreview(preset) {
  if (!props.backgroundRenderer) return

  const backgroundConfig = {
    color_scheme: {
      id: preset.id,
      colors: preset.colors,
      direction: preset.direction || 'diagonal',
    },
    particle_animation: preset.particle_animation || null,
    abstract_elements: [],
  }

  try {
    props.backgroundRenderer.setConfigWithTransition(backgroundConfig, 300)
    // 使用映射表獲取文字顏色
    applyTextColorForPreset(preset.id, preset.colors)
  } catch (error) {
    console.warn('應用背景預覽失敗:', error)
  }
}

// 應用自定義配色預覽
function applyCustomColorPreview() {
  if (!props.backgroundRenderer) return

  const backgroundConfig = {
    color_scheme: {
      colors: [customColors.value.color1, customColors.value.color2],
      direction: customColors.value.direction || 'diagonal',
    },
    abstract_elements: [],
  }

  try {
    props.backgroundRenderer.setConfigWithTransition(backgroundConfig, 300)
    // 自定義配色根據亮度計算
    applyTextColorForCustom([customColors.value.color1, customColors.value.color2])
  } catch (error) {
    console.warn('應用自定義背景預覽失敗:', error)
  }
}

// 根據預設配色應用文字顏色
function applyTextColorForPreset(presetId, colors) {
  const root = document.documentElement
  
  // 優先使用映射表
  let textColor = backgroundTextColorMap[presetId]
  
  // 如果映射表沒有，根據亮度計算
  if (!textColor && colors && colors.length > 0) {
    const avgLuminance = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length
    textColor = avgLuminance > 0.5 ? '#2C3E50' : '#FFFFFF'
  }
  
  textColor = textColor || '#2C3E50'
  
  root.style.setProperty('--poem-text-color', textColor)
  root.style.setProperty('--poem-glow-color', textColor)
  root.style.setProperty('--poem-meta-color', textColor)
  updatePoemTextGlow(textColor)
}

// 根據自定義配色應用文字顏色
function applyTextColorForCustom(colors) {
  if (!colors || colors.length === 0) return

  const root = document.documentElement
  const avgLuminance = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length
  const textColor = avgLuminance > 0.5 ? '#2C3E50' : '#FFFFFF'

  root.style.setProperty('--poem-text-color', textColor)
  root.style.setProperty('--poem-glow-color', textColor)
  root.style.setProperty('--poem-meta-color', textColor)
  updatePoemTextGlow(textColor)
}

// 更新詩歌文字發光效果
function updatePoemTextGlow(textColor) {
  const root = document.documentElement
  const isLight = textColor === '#FFFFFF' || textColor === '#FDF7FF'
  
  if (isLight) {
    root.style.setProperty('--poem-glow-shadow-min', '0 0 8px rgba(255, 255, 255, 0.3), 0 0 12px rgba(255, 255, 255, 0.18)')
    root.style.setProperty('--poem-glow-shadow-max', '0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.48)')
  } else {
    root.style.setProperty('--poem-glow-shadow-min', '0 0 8px rgba(44, 62, 80, 0.15), 0 0 12px rgba(44, 62, 80, 0.1)')
    root.style.setProperty('--poem-glow-shadow-max', '0 0 15px rgba(44, 62, 80, 0.3), 0 0 25px rgba(44, 62, 80, 0.2)')
  }
}

// 處理顏色輸入同步
const syncColor1FromPicker = (event) => {
  customColors.value.color1 = event.target.value.toUpperCase()
}

const syncColor1FromHex = (event) => {
  const value = event.target.value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    customColors.value.color1 = value.toUpperCase()
  }
}

const syncColor2FromPicker = (event) => {
  customColors.value.color2 = event.target.value.toUpperCase()
}

const syncColor2FromHex = (event) => {
  const value = event.target.value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    customColors.value.color2 = value.toUpperCase()
  }
}

// 處理方向變化
const handleDirectionChange = (event) => {
  customColors.value.direction = event.target.value
}

// 保存自定義配色
const handleSaveCustom = () => {
  // 驗證顏色格式
  if (!/^#[0-9A-Fa-f]{6}$/.test(customColors.value.color1) ||
      !/^#[0-9A-Fa-f]{6}$/.test(customColors.value.color2)) {
    alert('請輸入有效的顏色代碼（格式：#RRGGBB）')
    return
  }
  store.saveCustomColor()
}

// 取消自定義配色
const handleCancelCustom = () => {
  store.cancelCustomColor()
}

// 檢查是否選中
const isSelected = (presetId) => {
  return selectedBackground.value?.id === presetId
}

// 自定義預覽樣式（用於小預覽框）
const customPreviewStyle = () => {
  const direction = customColors.value.direction === 'vertical' ? '180deg' : 
                   customColors.value.direction === 'horizontal' ? '90deg' : '135deg'
  return {
    background: `linear-gradient(${direction}, ${customColors.value.color1} 0%, ${customColors.value.color2} 100%)`,
  }
}
</script>

<template>
  <div class="editor-section">
    <label class="editor-label">背景配色</label>
    <div id="background-selector" class="background-selector">
      <!-- 自定義配色卡片 -->
      <div
        class="background-card background-card-custom"
        :class="{ selected: selectedBackground?.isCustom }"
        @click="handleCustomClick"
      >
        <div class="background-preview" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
          +
        </div>
        <div class="background-name">自定義</div>
      </div>

      <!-- 預設配色 -->
      <div
        v-for="preset in BACKGROUND_PRESETS"
        :key="preset.id"
        class="background-card"
        :class="{ selected: isSelected(preset.id) }"
        :data-bg-id="preset.id"
        @click="handlePresetClick(preset)"
      >
        <div
          class="background-preview"
          :style="{
            background: `linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 100%)`,
          }"
        ></div>
        <div class="background-name">{{ preset.name }}</div>
      </div>
    </div>

    <!-- 自定義配色選擇器 -->
    <div v-if="showCustomColorPicker" id="custom-color-picker" class="custom-color-picker">
      <div class="custom-color-row">
        <label class="custom-color-label">顏色 1</label>
        <div class="custom-color-input-group">
          <input
            type="color"
            id="custom-color-1"
            class="custom-color-input"
            :value="customColors.color1"
            @input="syncColor1FromPicker"
          />
          <input
            type="text"
            id="custom-color-1-hex"
            class="custom-color-hex"
            :value="customColors.color1"
            maxlength="7"
            placeholder="#000000"
            @input="syncColor1FromHex"
            @blur="syncColor1FromHex"
          />
        </div>
      </div>

      <div class="custom-color-row">
        <label class="custom-color-label">顏色 2</label>
        <div class="custom-color-input-group">
          <input
            type="color"
            id="custom-color-2"
            class="custom-color-input"
            :value="customColors.color2"
            @input="syncColor2FromPicker"
          />
          <input
            type="text"
            id="custom-color-2-hex"
            class="custom-color-hex"
            :value="customColors.color2"
            maxlength="7"
            placeholder="#000000"
            @input="syncColor2FromHex"
            @blur="syncColor2FromHex"
          />
        </div>
      </div>

      <div class="custom-color-row">
        <label class="custom-color-label">方向</label>
        <div class="custom-color-direction">
          <label class="custom-radio">
            <input
              type="radio"
              name="custom-direction"
              value="diagonal"
              :checked="customColors.direction === 'diagonal'"
              @change="handleDirectionChange"
            />
            <span>對角</span>
          </label>
          <label class="custom-radio">
            <input
              type="radio"
              name="custom-direction"
              value="vertical"
              :checked="customColors.direction === 'vertical'"
              @change="handleDirectionChange"
            />
            <span>垂直</span>
          </label>
          <label class="custom-radio">
            <input
              type="radio"
              name="custom-direction"
              value="horizontal"
              :checked="customColors.direction === 'horizontal'"
              @change="handleDirectionChange"
            />
            <span>水平</span>
          </label>
        </div>
      </div>

      <div class="custom-color-preview" id="custom-color-preview" :style="customPreviewStyle()"></div>

      <div class="custom-color-actions">
        <button
          type="button"
          class="editor-btn editor-btn-primary"
          id="custom-color-save"
          @click="handleSaveCustom"
        >
          保存配色
        </button>
        <button
          type="button"
          class="editor-btn editor-btn-secondary"
          id="custom-color-cancel"
          @click="handleCancelCustom"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>

