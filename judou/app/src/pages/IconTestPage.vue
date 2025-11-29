<!--
  圖標庫測試頁面
  用於比較不同圖標庫在側邊欄中的效果
-->

<script setup lang="ts">
import BeanIcon from '@/components/common/BeanIcon.vue'

// Lucide Icons
import { 
  Home as LucideHome,
  BookOpen as LucideBookOpen,
  Swords as LucideSwords,
  Footprints as LucideFootprints,
  Users as LucideUsers,
  PenLine as LucidePenLine,
} from 'lucide-vue-next'

// Heroicons
import {
  HomeIcon as HeroHome,
  BookOpenIcon as HeroBookOpen,
  TrophyIcon as HeroTrophy,
  ClockIcon as HeroClock,
  UserGroupIcon as HeroUsers,
  PencilSquareIcon as HeroPen,
} from '@heroicons/vue/24/outline'

// Tabler Icons
import {
  IconHome,
  IconBook,
  IconSword,
  IconHistory,
  IconUsers,
  IconPencil,
} from '@tabler/icons-vue'

// Phosphor Icons
import {
  PhHouse as House,
  PhBookOpen as BookOpen,
  PhTrophy as Trophy,
  PhClockCounterClockwise as ClockCounterClockwise,
  PhUsers as Users,
  PhPencilSimple as PencilSimple,
} from '@phosphor-icons/vue'

// 測試項目
const testItems = [
  { label: '首頁', iconName: 'home' },
  { label: '句豆', iconName: 'bean' },
  { label: '品豆', iconName: 'reading' },
  { label: '鬥豆', iconName: 'arena' },
  { label: '豆跡', iconName: 'history' },
  { label: '豆莢', iconName: 'class' },
  { label: '自訂練習', iconName: 'custom' },
]

// 圖標庫配置
const iconLibraries = [
  {
    name: 'Lucide',
    icons: {
      home: LucideHome,
      bean: BeanIcon,
      reading: LucideBookOpen,
      arena: LucideSwords,
      history: LucideFootprints,
      class: LucideUsers,
      custom: LucidePenLine,
    }
  },
  {
    name: 'Heroicons',
    icons: {
      home: HeroHome,
      bean: BeanIcon,
      reading: HeroBookOpen,
      arena: HeroTrophy,
      history: HeroClock,
      class: HeroUsers,
      custom: HeroPen,
    }
  },
  {
    name: 'Tabler',
    icons: {
      home: IconHome,
      bean: BeanIcon,
      reading: IconBook,
      arena: IconSword,
      history: IconHistory,
      class: IconUsers,
      custom: IconPencil,
    }
  },
  {
    name: 'Phosphor',
    icons: {
      home: House,
      bean: BeanIcon,
      reading: BookOpen,
      arena: Trophy,
      history: ClockCounterClockwise,
      class: Users,
      custom: PencilSimple,
    }
  },
]
</script>

<template>
  <div class="icon-test-page">
    <div class="test-header">
      <h1>圖標庫測試</h1>
      <p>比較不同圖標庫在側邊欄中的視覺效果</p>
    </div>

    <div class="test-grid">
      <div 
        v-for="library in iconLibraries" 
        :key="library.name"
        class="test-column"
      >
        <h2 class="library-name">{{ library.name }}</h2>
        <div class="sidebar-preview">
          <div class="sidebar-section">
            <p class="section-label">常用功能</p>
            <ul class="sidebar-list">
              <li 
                v-for="item in testItems" 
                :key="item.label"
                class="sidebar-item"
              >
                <span class="item-icon">
                  <BeanIcon 
                    v-if="item.iconName === 'bean'" 
                    :size="20" 
                  />
                  <component 
                    v-else 
                    :is="library.icons[item.iconName as keyof typeof library.icons]" 
                    :size="20"
                    :stroke-width="library.name === 'Phosphor' ? undefined : 2"
                    :weight="library.name === 'Phosphor' ? 'regular' : undefined"
                  />
                </span>
                <span class="item-label">{{ item.label }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="notes">
      <h3>說明</h3>
      <ul>
        <li>所有圖標統一設置為 20px 大小</li>
        <li>線條粗細統一為 2px（如果支持）</li>
        <li>「句豆」圖標使用自定義 BeanIcon</li>
        <li>請比較各圖標庫的視覺風格、清晰度和一致性</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.icon-test-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.test-header {
  margin-bottom: 2rem;
  text-align: center;
}

.test-header h1 {
  font-size: 2rem;
  color: #587a2b;
  margin-bottom: 0.5rem;
}

.test-header p {
  color: #78716c;
  font-size: 1rem;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

@media (min-width: 1200px) {
  .test-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.test-column {
  background: #f8faf5;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.library-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #587a2b;
  margin-bottom: 1rem;
  text-align: center;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #deedc4;
}

.sidebar-preview {
  background: #ffffff;
  border-radius: 0.75rem;
  padding: 1rem;
  min-height: 400px;
}

.sidebar-section {
  margin-bottom: 1rem;
}

.section-label {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: #78716c;
  margin-bottom: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
}

.sidebar-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
  cursor: pointer;
}

.sidebar-item:hover {
  background: #f0f4e8;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #44403c;
}

.item-label {
  font-size: 0.9rem;
  color: #44403c;
  font-weight: 500;
}

.notes {
  background: #fff8e1;
  border-left: 4px solid #f59e0b;
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin-top: 2rem;
}

.notes h3 {
  font-size: 1.1rem;
  color: #d97706;
  margin-bottom: 0.75rem;
}

.notes ul {
  margin: 0;
  padding-left: 1.5rem;
}

.notes li {
  color: #78716c;
  margin-bottom: 0.5rem;
  line-height: 1.6;
}
</style>

