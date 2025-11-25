<script setup>
/**
 * 分頁組件
 */
const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['update:currentPage'])

const goToPage = (page) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page)
  }
}
</script>

<template>
  <div v-if="totalPages > 1" class="pagination-container">
    <div class="pagination">
      <button
        class="pagination-btn pagination-btn-nav"
        :disabled="currentPage === 1"
        aria-label="上一頁"
        @click="goToPage(currentPage - 1)"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <span class="pagination-info">第 {{ currentPage }} / {{ totalPages }} 頁</span>
      <button
        class="pagination-btn pagination-btn-nav"
        :disabled="currentPage >= totalPages"
        aria-label="下一頁"
        @click="goToPage(currentPage + 1)"
      >
        <i class="fas fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 使用全局 atmosphere-editor.css 樣式 */
</style>

