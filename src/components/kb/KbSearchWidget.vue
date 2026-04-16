<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import { BookOpen, Search, ExternalLink } from 'lucide-vue-next'
import { kbService } from '@/services/kb.service'
import type { KbArticle } from '@/types/knowledge-base'

const { t } = useI18n()
const router = useRouter()

const searchQuery = ref('')
const results = ref<KbArticle[]>([])
const isSearching = ref(false)
const selectedArticle = ref<KbArticle | null>(null)
const showDialog = ref(false)

let debounceTimer: ReturnType<typeof setTimeout>

watch(searchQuery, (q) => {
  clearTimeout(debounceTimer)
  if (!q.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      const res = await kbService.list({ q: q.trim(), status: 'PUBLISHED', size: 5 })
      results.value = res.data ?? (res as any).content ?? []
    } catch {
      results.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
})

async function selectArticle(article: KbArticle) {
  try {
    selectedArticle.value = await kbService.getById(article.id)
  } catch {
    selectedArticle.value = article
  }
  showDialog.value = true
  results.value = []
  searchQuery.value = ''
}

function openInKb() {
  if (!selectedArticle.value) return
  showDialog.value = false
  router.push(`/knowledge-base/${selectedArticle.value.id}`)
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <BookOpen class="w-4 h-4 text-[var(--primary)]" />
      <span class="text-sm font-semibold text-[var(--text)]">{{ t('kb.suggestedArticles') }}</span>
    </div>

    <!-- Search input -->
    <div class="relative">
      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <Search class="w-3.5 h-3.5" />
      </span>
      <InputText
        v-model="searchQuery"
        size="small"
        :placeholder="t('kb.searchPlaceholder')"
        class="w-full !pl-8 text-sm"
      />
      <span v-if="isSearching" class="absolute right-2.5 top-1/2 -translate-y-1/2">
        <i class="pi pi-spin pi-spinner text-xs text-[var(--text-muted)]" />
      </span>
    </div>

    <!-- Results dropdown -->
    <div
      v-if="results.length"
      class="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-md divide-y divide-[var(--border)]"
    >
      <button
        v-for="article in results"
        :key="article.id"
        class="w-full text-left px-3 py-2.5 hover:bg-[var(--surface-raised)] transition-colors group"
        @click="selectArticle(article)"
      >
        <p class="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)] line-clamp-1">
          {{ article.title }}
        </p>
        <p v-if="article.category" class="text-xs text-[var(--text-muted)] mt-0.5">
          {{ article.category }}
        </p>
      </button>
    </div>

    <!-- Article detail dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="selectedArticle?.title"
      modal
      :style="{ width: '680px', maxWidth: '95vw' }"
    >
      <div v-if="selectedArticle" class="space-y-3">
        <!-- Meta -->
        <div class="flex flex-wrap items-center gap-2">
          <Tag v-if="selectedArticle.category" :value="selectedArticle.category" severity="secondary" />
          <Tag
            v-for="tag in selectedArticle.tags"
            :key="tag"
            :value="tag"
            severity="contrast"
            class="text-xs"
          />
          <span class="text-xs text-[var(--text-muted)] ml-auto">{{ selectedArticle.views }} {{ t('kb.views') }}</span>
        </div>

        <!-- Content -->
        <div
          class="prose prose-sm max-w-none text-[var(--text)] bg-[var(--surface-raised)] rounded-[var(--radius)] p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
        >
          {{ selectedArticle.content || t('kb.noContent') }}
        </div>
      </div>

      <template #footer>
        <Button size="small" severity="secondary" :label="t('common.close')" @click="showDialog = false" />
        <Button size="small" @click="openInKb">
          <ExternalLink class="w-3.5 h-3.5 mr-1" />
          {{ t('kb.viewInKb') }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>
