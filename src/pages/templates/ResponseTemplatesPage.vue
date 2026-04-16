<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue3-toastify'
import { templatesService } from '@/services/templates.service'
import { qk } from '@/queries/keys'
import type { ResponseTemplate, ResponseTemplateRequest } from '@/types/templates'
import { Plus, Edit2, Trash2, Search, FileText, Zap } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'

const { t } = useI18n()
const queryClient = useQueryClient()
const confirm = useConfirm()

const q = ref('')
const category = ref('')
const debouncedQ = ref('')
let debounce: ReturnType<typeof setTimeout>
function updateQ(v: string) {
  q.value = v
  clearTimeout(debounce)
  debounce = setTimeout(() => { debouncedQ.value = v }, 300)
}

const { data, isLoading } = useQuery({
  queryKey: computed(() => qk.templates(JSON.stringify({ q: debouncedQ.value, category: category.value }))),
  queryFn: () => templatesService.list({ q: debouncedQ.value || undefined, category: category.value || undefined, size: 100 }),
  staleTime: 30_000
})

const templates = computed(() => data.value?.content ?? [])

// Dialog state
const dialogOpen = ref(false)
const editing = ref<ResponseTemplate | null>(null)
const form = ref<ResponseTemplateRequest>({ name: '', body: '', category: '', shortcut: '' })

function openCreate() {
  editing.value = null
  form.value = { name: '', body: '', category: '', shortcut: '' }
  dialogOpen.value = true
}

function openEdit(tpl: ResponseTemplate) {
  editing.value = tpl
  form.value = { name: tpl.name, body: tpl.body, category: tpl.category ?? '', shortcut: tpl.shortcut ?? '' }
  dialogOpen.value = true
}

const createMutation = useMutation({
  mutationFn: (data: ResponseTemplateRequest) => templatesService.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['templates'] })
    toast.success(t('templates.created'))
    dialogOpen.value = false
  },
  onError: () => toast.error(t('templates.saveFailed'))
})

const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: ResponseTemplateRequest }) => templatesService.update(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['templates'] })
    toast.success(t('templates.updated'))
    dialogOpen.value = false
  },
  onError: () => toast.error(t('templates.saveFailed'))
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => templatesService.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['templates'] })
    toast.success(t('templates.deleted'))
  }
})

function save() {
  const payload = { ...form.value, category: form.value.category || undefined, shortcut: form.value.shortcut || undefined }
  if (editing.value) {
    updateMutation.mutate({ id: editing.value.id, data: payload })
  } else {
    createMutation.mutate(payload)
  }
}

function deleteTemplate(tpl: ResponseTemplate) {
  confirm.require({
    message: t('templates.deleteConfirm'),
    header: t('common.confirm'),
    accept: () => deleteMutation.mutate(tpl.id)
  })
}

const categories = computed(() => {
  const cats = new Set(templates.value.map(t => t.category).filter(Boolean))
  return Array.from(cats) as string[]
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <FileText class="w-6 h-6" />
          {{ t('templates.title') }}
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">{{ t('templates.subtitle') }}</p>
      </div>
      <Button :label="t('templates.new')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <div class="relative flex-1 min-w-48">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          :value="q"
          type="text"
          :placeholder="t('common.search')"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-placeholder)] outline-none focus:border-[var(--primary)]"
          @input="updateQ(($event.target as HTMLInputElement).value)"
        />
      </div>
      <select
        v-model="category"
        class="px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)]"
      >
        <option value="">{{ t('templates.allCategories') }}</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="templates.length === 0" class="py-20 text-center">
      <FileText class="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-40 mb-3" />
      <p class="text-[var(--text-muted)]">{{ t('templates.empty') }}</p>
      <Button :label="t('templates.new')" class="mt-4" @click="openCreate" />
    </div>

    <!-- Grid -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 flex flex-col gap-2 hover:border-[var(--primary)] transition-colors"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-sm text-[var(--text)] truncate">{{ tpl.name }}</h3>
          <div class="flex gap-1 flex-shrink-0">
            <button class="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text)]" @click="openEdit(tpl)">
              <Edit2 class="w-3.5 h-3.5" />
            </button>
            <button class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--text-muted)] hover:text-red-500" @click="deleteTemplate(tpl)">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p class="text-xs text-[var(--text-muted)] line-clamp-3 flex-1">{{ tpl.body }}</p>
        <div class="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--border)]">
          <span v-if="tpl.category" class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--text-muted)]">{{ tpl.category }}</span>
          <span v-if="tpl.shortcut" class="flex items-center gap-1 text-[10px] text-[var(--primary)]">
            <Zap class="w-3 h-3" />/{{ tpl.shortcut }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <Dialog v-model:visible="dialogOpen" :header="editing ? t('templates.edit') : t('templates.new')" modal class="w-full max-w-lg">
    <div class="space-y-4 pt-2">
      <div>
        <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">{{ t('templates.name') }} *</label>
        <InputText v-model="form.name" class="w-full" :placeholder="t('templates.namePlaceholder')" />
      </div>
      <div>
        <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">{{ t('templates.body') }} *</label>
        <Textarea v-model="form.body" class="w-full" rows="6" :placeholder="t('templates.bodyPlaceholder')" auto-resize />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">{{ t('templates.category') }}</label>
          <InputText v-model="form.category" class="w-full" :placeholder="t('templates.categoryPlaceholder')" />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">{{ t('templates.shortcut') }}</label>
          <InputText v-model="form.shortcut" class="w-full" placeholder="e.g. greeting" />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" text @click="dialogOpen = false" />
        <Button
          :label="t('common.save')"
          :disabled="!form.name.trim() || !form.body.trim()"
          :loading="createMutation.isPending.value || updateMutation.isPending.value"
          @click="save"
        />
      </div>
    </template>
  </Dialog>
</template>
