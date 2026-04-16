<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { BookOpen, Search, Plus, Eye } from 'lucide-vue-next'
import { useKbArticles, useKbMutations } from '@/queries/knowledge-base'
import { useAuthStore } from '@/stores/auth'
import type { KbArticleFilters, KbArticleRequest, KbStatus } from '@/types/knowledge-base'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const canWrite = computed(() => auth.hasPermission('kb:write'))

// ── Filters ──────────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedStatus = ref<KbStatus | undefined>('PUBLISHED')
const selectedCategory = ref<string | undefined>(undefined)

const filters = computed<KbArticleFilters>(() => ({
  q: searchQuery.value.trim() || undefined,
  status: selectedStatus.value,
  category: selectedCategory.value,
  size: 50
}))

const { data, isLoading } = useKbArticles(filters)

const articles = computed(() => data.value?.data ?? (data.value as any)?.content ?? [])

// Derive unique categories from loaded articles
const categories = computed<string[]>(() => {
  const cats = articles.value.map((a: any) => a.category).filter(Boolean)
  return [...new Set<string>(cats)]
})

// ── Create dialog ────────────────────────────────────────────────────────
const showCreate = ref(false)
const form = ref<KbArticleRequest>({ title: '', content: '', category: '', tags: [], status: 'DRAFT' })
const tagsInput = ref('')

const mutations = useKbMutations()

const statusOptions: { label: string; value: KbStatus }[] = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' }
]

function openCreate() {
  form.value = { title: '', content: '', category: '', tags: [], status: 'DRAFT' }
  tagsInput.value = ''
  showCreate.value = true
}

async function submitCreate() {
  if (!form.value.title.trim()) return
  form.value.tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
  await mutations.create.mutateAsync(form.value)
  showCreate.value = false
}

function statusSeverity(s: KbStatus): 'success' | 'secondary' | 'warn' {
  if (s === 'PUBLISHED') return 'success'
  if (s === 'ARCHIVED') return 'secondary'
  return 'warn'
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <BookOpen class="w-6 h-6 text-[var(--primary)]" />
        <h1 class="text-xl font-bold text-[var(--text)]">{{ t('kb.title') }}</h1>
      </div>
      <Button v-if="canWrite" size="small" @click="openCreate">
        <Plus class="w-4 h-4 mr-1" />
        {{ t('kb.newArticle') }}
      </Button>
    </div>

    <!-- Filters row -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <Search class="w-3.5 h-3.5" />
        </span>
        <InputText
          v-model="searchQuery"
          size="small"
          :placeholder="t('kb.searchPlaceholder')"
          class="w-full !pl-8 text-sm"
        />
      </div>

      <!-- Status filter chips -->
      <div class="flex gap-1.5">
        <button
          :class="[
            'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
            selectedStatus === 'PUBLISHED'
              ? 'bg-green-500 text-white border-green-500'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]'
          ]"
          @click="selectedStatus = selectedStatus === 'PUBLISHED' ? undefined : 'PUBLISHED'"
        >{{ t('kb.published') }}</button>
        <button
          :class="[
            'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
            selectedStatus === 'DRAFT'
              ? 'bg-yellow-400 text-white border-yellow-400'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]'
          ]"
          @click="selectedStatus = selectedStatus === 'DRAFT' ? undefined : 'DRAFT'"
        >{{ t('kb.draft') }}</button>
      </div>

      <!-- Category filter -->
      <div v-if="categories.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="[
            'px-2.5 py-0.5 text-xs rounded border transition-colors',
            selectedCategory === cat
              ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]'
          ]"
          @click="selectedCategory = selectedCategory === cat ? undefined : cat"
        >{{ cat }}</button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-36 rounded-[var(--radius)] bg-[var(--surface-raised)] animate-pulse" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!articles.length"
      class="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]"
    >
      <BookOpen class="w-10 h-10 mb-3 opacity-40" />
      <p>{{ t('kb.noArticles') }}</p>
    </div>

    <!-- Article grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="article in articles"
        :key="article.id"
        class="group flex flex-col gap-2 p-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:shadow-sm cursor-pointer transition-all"
        @click="router.push(`/knowledge-base/${article.id}`)"
      >
        <!-- Title + status -->
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] line-clamp-2 flex-1">
            {{ article.title }}
          </p>
          <Tag :value="article.status" :severity="statusSeverity(article.status)" class="text-xs flex-shrink-0" />
        </div>

        <!-- Category + tags -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            v-if="article.category"
            class="px-2 py-0.5 text-xs rounded bg-[var(--surface-raised)] text-[var(--text-muted)]"
          >{{ article.category }}</span>
          <span
            v-for="tag in article.tags.slice(0, 3)"
            :key="tag"
            class="px-1.5 py-0.5 text-xs rounded border border-[var(--border)] text-[var(--text-muted)]"
          >#{{ tag }}</span>
        </div>

        <!-- Footer -->
        <div class="flex items-center gap-2 mt-auto pt-1 text-xs text-[var(--text-muted)]">
          <Eye class="w-3.5 h-3.5" />
          <span>{{ article.views }}</span>
          <span class="ml-auto">{{ dayjs(article.updatedAt).fromNow() }}</span>
        </div>
      </div>
    </div>

    <!-- Create dialog -->
    <Dialog
      v-model:visible="showCreate"
      :header="t('kb.newArticle')"
      modal
      :style="{ width: '600px', maxWidth: '95vw' }"
    >
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.title') }} *</label>
          <InputText v-model="form.title" size="small" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.category') }}</label>
            <InputText v-model="form.category" size="small" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.status') }}</label>
            <Select
              v-model="form.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              size="small"
              class="w-full"
            />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.tags') }}</label>
          <InputText v-model="tagsInput" size="small" class="w-full" :placeholder="t('kb.form.tagsPlaceholder')" />
        </div>
        <div>
          <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.content') }}</label>
          <Textarea v-model="form.content" rows="8" class="w-full text-sm" auto-resize />
        </div>
      </div>

      <template #footer>
        <Button size="small" severity="secondary" :label="t('common.cancel')" @click="showCreate = false" />
        <Button
          size="small"
          :label="t('common.create')"
          :loading="mutations.create.isPending.value"
          :disabled="!form.title.trim()"
          @click="submitCreate"
        />
      </template>
    </Dialog>
  </div>
</template>
