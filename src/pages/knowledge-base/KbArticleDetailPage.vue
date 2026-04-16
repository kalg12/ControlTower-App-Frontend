<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { ArrowLeft, Edit, Trash2, Eye } from 'lucide-vue-next'
import { useKbArticle, useKbMutations } from '@/queries/knowledge-base'
import { useAuthStore } from '@/stores/auth'
import type { KbArticleRequest, KbStatus } from '@/types/knowledge-base'
import dayjs from 'dayjs'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const confirm = useConfirm()

const id = computed(() => route.params.id as string)
const canWrite = computed(() => auth.hasPermission('kb:write'))

const { data: article, isLoading } = useKbArticle(id)

// ── Edit ─────────────────────────────────────────────────────────────────
const showEdit = ref(false)
const editForm = ref<KbArticleRequest>({ title: '', content: '', category: '', tags: [], status: 'DRAFT' })
const tagsInput = ref('')
const mutations = useKbMutations()

const statusOptions: { label: string; value: KbStatus }[] = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' }
]

function openEdit() {
  if (!article.value) return
  editForm.value = {
    title: article.value.title,
    content: article.value.content ?? '',
    category: article.value.category ?? '',
    tags: article.value.tags ?? [],
    status: article.value.status
  }
  tagsInput.value = (article.value.tags ?? []).join(', ')
  showEdit.value = true
}

async function submitEdit() {
  if (!editForm.value.title.trim()) return
  editForm.value.tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
  await mutations.update.mutateAsync({ id: id.value, data: editForm.value })
  showEdit.value = false
}

function confirmDelete() {
  confirm.require({
    message: t('kb.deleteConfirm'),
    header: t('common.confirm'),
    acceptClass: 'p-button-danger',
    accept: async () => {
      await mutations.remove.mutateAsync(id.value)
      router.push('/knowledge-base')
    }
  })
}

function statusSeverity(s?: KbStatus): 'success' | 'secondary' | 'warn' {
  if (s === 'PUBLISHED') return 'success'
  if (s === 'ARCHIVED') return 'secondary'
  return 'warn'
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto space-y-6">
    <ConfirmDialog />

    <!-- Back + actions -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <Button severity="secondary" size="small" @click="router.push('/knowledge-base')">
        <ArrowLeft class="w-4 h-4 mr-1" />
        {{ t('kb.backToList') }}
      </Button>
      <div v-if="canWrite && article" class="flex gap-2">
        <Button severity="secondary" size="small" @click="openEdit">
          <Edit class="w-3.5 h-3.5 mr-1" />
          {{ t('common.edit') }}
        </Button>
        <Button severity="danger" size="small" @click="confirmDelete">
          <Trash2 class="w-3.5 h-3.5 mr-1" />
          {{ t('common.delete') }}
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div class="h-8 w-2/3 rounded bg-[var(--surface-raised)] animate-pulse" />
      <div class="h-4 w-1/4 rounded bg-[var(--surface-raised)] animate-pulse" />
      <div class="h-64 rounded bg-[var(--surface-raised)] animate-pulse" />
    </div>

    <template v-else-if="article">
      <!-- Title -->
      <h1 class="text-2xl font-bold text-[var(--text)]">{{ article.title }}</h1>

      <!-- Meta row -->
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <Tag :value="article.status" :severity="statusSeverity(article.status)" />
        <Tag v-if="article.category" :value="article.category" severity="secondary" />
        <Tag
          v-for="tag in article.tags"
          :key="tag"
          :value="'#' + tag"
          severity="contrast"
          class="text-xs"
        />
        <span class="flex items-center gap-1 ml-auto text-[var(--text-muted)]">
          <Eye class="w-3.5 h-3.5" />
          {{ article.views }} {{ t('kb.views') }}
        </span>
        <span class="text-[var(--text-muted)]">·</span>
        <span class="text-[var(--text-muted)]">{{ dayjs(article.updatedAt).format('DD MMM YYYY') }}</span>
      </div>

      <!-- Content -->
      <div class="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <p
          v-if="article.content"
          class="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed"
        >{{ article.content }}</p>
        <p v-else class="text-sm text-[var(--text-muted)] italic">{{ t('kb.noContent') }}</p>
      </div>
    </template>

    <!-- Edit dialog -->
    <Dialog
      v-model:visible="showEdit"
      :header="t('kb.editArticle')"
      modal
      :style="{ width: '600px', maxWidth: '95vw' }"
    >
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.title') }} *</label>
          <InputText v-model="editForm.title" size="small" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.category') }}</label>
            <InputText v-model="editForm.category" size="small" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-[var(--text)] mb-1 block">{{ t('kb.form.status') }}</label>
            <Select
              v-model="editForm.status"
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
          <Textarea v-model="editForm.content" rows="10" class="w-full text-sm" auto-resize />
        </div>
      </div>

      <template #footer>
        <Button size="small" severity="secondary" :label="t('common.cancel')" @click="showEdit = false" />
        <Button
          size="small"
          :label="t('common.save')"
          :loading="mutations.update.isPending.value"
          :disabled="!editForm.title.trim()"
          @click="submitEdit"
        />
      </template>
    </Dialog>
  </div>
</template>
