<template>
  <div class="container margin-top-large word-admin">
    <div class="row flex-center">
      <div class="col-12 col-lg-10">
        <div class="card">
          <div class="card-body">
            <div class="header-row">
              <div>
                <h2 class="card-title text-hand-title">詞句庫管理</h2>
                <p class="text-secondary">
                  僅限指定管理員：gnoluy@gmail.com、ylzhang@isf.edu.hk
                </p>
              </div>
              <router-link to="/" class="paper-btn btn-secondary btn-small">返回首頁</router-link>
            </div>

            <div v-if="!authStore.user" class="alert alert-warning margin-top-small">
              請先登入 Google 帳號後再管理詞句庫。
            </div>
            <div v-else-if="!isAdmin" class="alert alert-danger margin-top-small">
              您沒有詞句庫管理權限，請使用指定管理員郵箱登入。
            </div>

            <div v-if="authStore.user && isAdmin" class="admin-body">
              <!-- 主題切換 -->
              <div class="panel">
                <div class="panel-header">
                  <div>
                    <h4 class="text-hand-title">主題列表</h4>
                    <p class="text-small text-secondary">可切換主題、啟用 / 停用</p>
                  </div>
                  <div class="inline-actions">
                    <button class="paper-btn btn-secondary btn-small" @click="refreshCollections">
                      重新載入
                    </button>
                  </div>
                </div>

                <div v-if="loadingCollections" class="text-small text-secondary">載入主題中...</div>
                <div v-else class="collection-row">
                  <select v-model="selectedCollectionId" @change="handleCollectionChange">
                    <option v-for="c in collections" :key="c.id" :value="c.id">
                      {{ c.title }}（{{ c.entry_count }} 條）
                    </option>
                  </select>
                  <label class="toggle">
                    <input
                      type="checkbox"
                      :checked="selectedCollection?.is_active"
                      @change="toggleActive"
                    />
                    <span>啟用主題</span>
                  </label>
                </div>
              </div>

              <!-- 新增主題 -->
              <div class="panel">
                <div class="panel-header">
                  <h4 class="text-hand-title">新增主題</h4>
                </div>
                <div class="row">
                  <div class="col-12 col-md-4">
                    <input v-model="newCollectionTitle" type="text" placeholder="主題名稱" />
                  </div>
                  <div class="col-12 col-md-6">
                    <input v-model="newCollectionDesc" type="text" placeholder="主題描述（可空）" />
                  </div>
                  <div class="col-12 col-md-2">
                    <button class="paper-btn btn-primary btn-block" @click="handleCreateCollection">
                      新增主題
                    </button>
                  </div>
                </div>
              </div>

              <!-- 條目管理 -->
              <div class="panel">
                <div class="panel-header">
                  <div>
                    <h4 class="text-hand-title">條目管理</h4>
                    <p class="text-small text-secondary">新增詞條後可立即被房間使用</p>
                  </div>
                </div>

                <div class="row align-center">
                  <div class="col-12 col-md-5">
                    <input v-model="newEntryText" type="text" placeholder="詞條（必填）" />
                  </div>
                  <div class="col-12 col-md-3">
                    <input v-model="newEntryCategory" type="text" placeholder="分類（可空，如人物）" />
                  </div>
                  <div class="col-12 col-md-2">
                    <button class="paper-btn btn-primary btn-block" @click="handleAddEntry">
                      新增條目
                    </button>
                  </div>
                </div>

                <div class="entry-list" v-if="selectedCollectionId">
                  <div class="entry-row header">
                    <span>詞條</span>
                    <span>分類</span>
                    <span>操作</span>
                  </div>
                  <div
                    v-if="loadingEntries[selectedCollectionId]"
                    class="text-small text-secondary margin-top-small"
                  >
                    條目載入中...
                  </div>
                  <div v-else-if="currentEntries.length === 0" class="text-small text-secondary margin-top-small">
                    尚無詞條，請新增。
                  </div>
                  <div
                    v-else
                    v-for="entry in currentEntries"
                    :key="entry.id"
                    class="entry-row"
                  >
                    <span class="entry-text">{{ entry.text }}</span>
                    <span class="entry-tag">{{ entry.category || '—' }}</span>
                    <span>
                      <button
                        class="paper-btn btn-danger btn-small"
                        @click="handleDeleteEntry(entry.id)"
                      >
                        刪除
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="message" class="alert alert-success margin-top-small">
                {{ message }}
              </div>
              <div v-if="errorMsg" class="alert alert-danger margin-top-small">
                {{ errorMsg }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useWordLibrary } from '../composables/useWordLibrary'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const {
  collections,
  entriesMap,
  loadingCollections,
  loadingEntries,
  isAdmin,
  refreshAdminStatus,
  loadCollections,
  loadEntries,
  addEntry,
  deleteEntry,
  toggleCollectionActive,
  addCollection,
} = useWordLibrary()

const selectedCollectionId = ref<string>('')
const newEntryText = ref('')
const newEntryCategory = ref('')
const newCollectionTitle = ref('')
const newCollectionDesc = ref('')
const message = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const selectedCollection = computed(() =>
  collections.value.find(c => c.id === selectedCollectionId.value) || null
)

const currentEntries = computed(() => {
  if (!selectedCollectionId.value) return []
  return entriesMap.value[selectedCollectionId.value] || []
})

watch(selectedCollectionId, async (id) => {
  if (id) {
    await loadEntries(id, true)
  }
})

function clearMessages() {
  message.value = null
  errorMsg.value = null
}

async function initAdmin() {
  clearMessages()
  await refreshAdminStatus(true)
  await loadCollections({ includeInactive: true })
  if (collections.value.length > 0) {
    selectedCollectionId.value = collections.value[0].id
    await loadEntries(selectedCollectionId.value)
  }
}

async function refreshCollections() {
  clearMessages()
  await loadCollections({ includeInactive: true })
}

async function handleCollectionChange() {
  clearMessages()
  if (selectedCollectionId.value) {
    await loadEntries(selectedCollectionId.value, true)
  }
}

async function handleAddEntry() {
  clearMessages()
  if (!selectedCollectionId.value) {
    errorMsg.value = '請先選擇主題'
    return
  }

  const result = await addEntry(
    selectedCollectionId.value,
    newEntryText.value,
    newEntryCategory.value
  )

  if (result.success) {
    message.value = '已新增詞條'
    newEntryText.value = ''
    newEntryCategory.value = ''
    await loadEntries(selectedCollectionId.value, true)
  } else {
    errorMsg.value = result.error || '新增失敗'
  }
}

async function handleDeleteEntry(entryId: string) {
  clearMessages()
  if (!selectedCollectionId.value) return
  const result = await deleteEntry(entryId, selectedCollectionId.value)
  if (result.success) {
    message.value = '已刪除詞條'
    await loadEntries(selectedCollectionId.value, true)
  } else {
    errorMsg.value = result.error || '刪除失敗'
  }
}

async function toggleActive() {
  clearMessages()
  if (!selectedCollectionId.value || !selectedCollection.value) return
  const nextState = !selectedCollection.value.is_active
  const result = await toggleCollectionActive(selectedCollectionId.value, nextState)
  if (!result.success) {
    errorMsg.value = result.error || '更新狀態失敗'
  } else {
    message.value = nextState ? '主題已啟用' : '主題已停用'
    await loadCollections({ includeInactive: true })
  }
}

async function handleCreateCollection() {
  clearMessages()
  if (!newCollectionTitle.value.trim()) {
    errorMsg.value = '請填寫主題名稱'
    return
  }
  const result = await addCollection({
    title: newCollectionTitle.value,
    description: newCollectionDesc.value,
  })
  if (result.success && result.collection) {
    message.value = '已新增主題'
    newCollectionTitle.value = ''
    newCollectionDesc.value = ''
    await loadCollections({ includeInactive: true })
    selectedCollectionId.value = result.collection.id
    await loadEntries(selectedCollectionId.value, true)
  } else {
    errorMsg.value = result.error || '新增主題失敗'
  }
}

onMounted(() => {
  initAdmin()
})
</script>

<style scoped>
.word-admin {
  min-height: 80vh;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.admin-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  border: 1px dashed var(--border-light);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-secondary);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.inline-actions {
  display: flex;
  gap: 8px;
}

.collection-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.entry-list {
  margin-top: 12px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.entry-row {
  display: grid;
  grid-template-columns: 2fr 1fr 120px;
  padding: 10px;
  border-bottom: 1px dashed var(--border-light);
  align-items: center;
}

.entry-row.header {
  background: var(--bg-highlight);
  font-weight: 700;
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-text {
  font-weight: 600;
}

.entry-tag {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .entry-row {
    grid-template-columns: 1.2fr 0.8fr 1fr;
  }
}
</style>

