<template>
  <button
    class="sound-toggle"
    :class="{ 'sound-off': !soundEnabled }"
    @click="handleToggle"
    :title="soundEnabled ? '關閉音效' : '開啟音效'"
  >
    <PhSpeakerHigh v-if="soundEnabled" :size="20" weight="duotone" />
    <PhSpeakerSlash v-else :size="20" weight="duotone" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhSpeakerHigh, PhSpeakerSlash } from '@phosphor-icons/vue'
import { useSoundStore } from '../stores/sound'
import { useSoundEffects } from '../composables/useSoundEffects'

const soundStore = useSoundStore()
const { playClick } = useSoundEffects()

const soundEnabled = computed(() => soundStore.soundEnabled)

function handleToggle() {
  // 如果要開啟音效，先播放點擊音
  if (!soundEnabled.value) {
    soundStore.toggleSound()
    // 延遲一點播放，確保狀態已更新
    setTimeout(() => playClick(), 50)
  } else {
    soundStore.toggleSound()
  }
}
</script>

<style scoped>
.sound-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color, #5a4a3a);
  border-radius: 8px;
  background: var(--bg-card, #fff);
  color: var(--text-primary, #5a4a3a);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 2px 2px 0 var(--shadow-color, rgba(0, 0, 0, 0.1));
}

.sound-toggle:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--shadow-color, rgba(0, 0, 0, 0.1));
  background: var(--bg-hover, #f5f0e8);
}

.sound-toggle:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--shadow-color, rgba(0, 0, 0, 0.1));
}

.sound-toggle.sound-off {
  color: var(--text-tertiary, #999);
  opacity: 0.7;
}

.sound-toggle.sound-off:hover {
  opacity: 1;
}
</style>

