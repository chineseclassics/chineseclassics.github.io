<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import type { PracticeLibraryText } from '@/types/practiceLibrary'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', value: PracticeLibraryText): void
}>()

const library = usePracticeLibraryStore()

onMounted(() => {
  if (!library.state.categories.length) {
    library.fetchLibrary()
  }
})

watch(
  () => props.open,
  (value) => {
    if (value && !library.state.categories.length) {
      library.fetchLibrary()
    }
  }
)

const gradeOptions = computed(() => library.rootCategories)
const moduleOptions = computed(() => library.modules)
const themeOptions = computed(() => library.themes)
const textOptions = computed(() => library.visibleTexts)

function close() {
  emit('update:open', false)
}

function selectGrade(id: string) {
  library.selectGrade(id)
}

function selectModule(id: string) {
  library.selectModule(id)
}

function selectTheme(id: string) {
  library.selectTheme(id)
}

function handleSelect(text: PracticeLibraryText) {
  library.selectText(text.id)
  emit('select', text)
  close()
}
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="open" class="picker-overlay" @click.self="close">
        <div class="picker-panel edamame-glass">
          <header class="picker-header">
            <div>
              <p class="edamame-text-level-detail">挑選練習素材 · 三層分類</p>
              <h2 class="edamame-heading-gradient">練習素材庫</h2>
            </div>
            <button class="edamame-btn edamame-btn-outline edamame-btn-sm" @click="close">關閉</button>
          </header>

          <section class="picker-body">
            <div class="picker-column">
              <h3 class="column-title">第一層</h3>
              <ul>
                <li
                  v-for="grade in gradeOptions"
                  :key="grade.id"
                  :class="['column-item', { active: library.state.selectedGradeId === grade.id }]"
                  @click="selectGrade(grade.id)"
                >
                  <strong>{{ grade.name }}</strong>
                  <p>{{ grade.description }}</p>
                </li>
              </ul>
            </div>

            <div class="picker-column">
              <h3 class="column-title">第二層</h3>
              <p v-if="!moduleOptions.length" class="column-empty">請先選擇第一層分類</p>
              <ul v-else>
                <li
                  v-for="module in moduleOptions"
                  :key="module.id"
                  :class="['column-item', { active: library.state.selectedModuleId === module.id }]"
                  @click="selectModule(module.id)"
                >
                  <strong>{{ module.name }}</strong>
                  <p>{{ module.description }}</p>
                </li>
              </ul>
            </div>

            <div class="picker-column">
              <h3 class="column-title">第三層</h3>
              <p v-if="moduleOptions.length && !themeOptions.length" class="column-empty">目前分類下沒有細分主題</p>
              <ul v-else>
                <li
                  v-for="theme in themeOptions"
                  :key="theme.id"
                  :class="['column-item', { active: library.state.selectedThemeId === theme.id }]"
                  @click="selectTheme(theme.id)"
                >
                  <strong>{{ theme.name }}</strong>
                  <p>{{ theme.description }}</p>
                </li>
              </ul>
            </div>

            <div class="picker-column texts-column">
              <h3 class="column-title">作品列表</h3>
              <p v-if="!textOptions.length" class="column-empty">請先完成分類選擇</p>
              <ul v-else class="text-list">
                <li
                  v-for="text in textOptions"
                  :key="text.id"
                  :class="['text-item', { active: library.state.selectedTextId === text.id }]"
                  @click="handleSelect(text)"
                >
                  <div>
                    <strong>{{ text.title }}</strong>
                    <p class="text-meta">
                      {{ text.author }} · 難度 {{ text.difficulty === 1 ? '初級' : text.difficulty === 2 ? '中級' : '高級' }}
                    </p>
                    <p class="text-summary">{{ text.summary }}</p>
                  </div>
                  <span class="edamame-text-level-detail">選擇</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 2000;
}

.picker-panel {
  width: min(1200px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.picker-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  overflow-y: auto;
}

.picker-column {
  background: rgba(255, 255, 255, 0.65);
  border-radius: var(--radius-xl);
  padding: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 320px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.texts-column {
  grid-column: span 2;
}

.column-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-700);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.column-item,
.text-item {
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all var(--duration-base) var(--ease-out);
  background: rgba(255, 255, 255, 0.7);
}

.column-item:hover,
.text-item:hover {
  border-color: rgba(139, 178, 79, 0.4);
  transform: translateY(-2px);
}

.column-item.active,
.text-item.active {
  border-color: rgba(139, 178, 79, 0.8);
  box-shadow: var(--shadow-sm);
  background: rgba(139, 178, 79, 0.08);
}

.column-item strong,
.text-item strong {
  display: block;
  font-size: var(--text-base);
  color: var(--color-neutral-800);
}

.column-item p,
.text-item p {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.column-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.text-list {
  max-height: 420px;
  overflow-y: auto;
}

.text-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.text-meta {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

.text-summary {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

@media (max-width: 960px) {
  .picker-panel {
    height: 100%;
    border-radius: 0;
  }

  .picker-body {
    grid-template-columns: 1fr;
  }

  .texts-column {
    grid-column: span 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-base) ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

