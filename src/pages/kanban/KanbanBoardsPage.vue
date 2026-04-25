<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from '@/composables/useToast'
import { useBoardsList, useKanbanMutations } from '@/queries/kanban'
import { useQuery } from '@tanstack/vue-query'
import { clientsService } from '@/services/clients.service'
import type { BoardVisibility } from '@/types/kanban'
import { LayoutGrid, Pencil, Trash2, Building2 } from 'lucide-vue-next'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const auth = useAuthStore()
const canWriteKanban = computed(() => auth.hasPermission('kanban:write'))

const page = ref(0)
const { data, isLoading, isError, refetch } = useBoardsList(page, 20)
const { createBoard, updateBoard, deleteBoard } = useKanbanMutations()

const boards = computed(() => data.value?.content ?? [])

const showCreate = ref(false)
const creating = ref(false)
const formName = ref('')
const formDesc = ref('')
const formVis = ref<BoardVisibility>('TEAM')

const showEdit = ref(false)
const editingId = ref<string | null>(null)
const savingEdit = ref(false)
const editName = ref('')
const editDesc = ref('')
const editVis = ref<BoardVisibility>('TEAM')

const { data: clientsData } = useQuery({
  queryKey: ['clients-list-kanban'],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60_000
})
const allClients = computed(() => clientsData.value?.content ?? [])
const clientOpts = computed(() => [
  { label: t('kanban.noClient'), value: null },
  ...allClients.value.map(c => ({ label: c.name, value: c.id }))
])
const clientNameMap = computed(() => Object.fromEntries(allClients.value.map(c => [c.id, c.name])))

const formClientId = ref<string | null>(null)
const editClientId = ref<string | null>(null)

const visOptions = computed(() => [
  { label: t('kanban.visibilityTeam'), value: 'TEAM' as const },
  { label: t('kanban.visibilityPrivate'), value: 'PRIVATE' as const }
])

function openCreate() {
  formName.value = ''
  formDesc.value = ''
  formVis.value = 'TEAM'
  formClientId.value = null
  showCreate.value = true
}

async function submitCreate() {
  const name = formName.value.trim()
  if (!name) return
  creating.value = true
  try {
    const b = await createBoard.mutateAsync({
      name,
      description: formDesc.value.trim() || undefined,
      visibility: formVis.value,
      clientId: formClientId.value || undefined
    })
    showCreate.value = false
    router.push({ name: 'kanban-board', params: { id: b.id } })
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    creating.value = false
  }
}

function openEdit(b: { id: string; name: string; description?: string | null; visibility: BoardVisibility; clientId?: string | null }) {
  editingId.value = b.id
  editName.value = b.name
  editDesc.value = b.description ?? ''
  editVis.value = b.visibility
  editClientId.value = b.clientId ?? null
  showEdit.value = true
}

async function submitEdit() {
  const id = editingId.value
  const name = editName.value.trim()
  if (!id || !name) return
  savingEdit.value = true
  try {
    await updateBoard.mutateAsync({
      id,
      body: {
        name,
        description: editDesc.value.trim() || undefined,
        visibility: editVis.value,
        clientId: editClientId.value || undefined
      }
    })
    showEdit.value = false
    editingId.value = null
    toast.success(t('common.save'))
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    savingEdit.value = false
  }
}

function confirmDeleteBoard(id: string) {
  confirm.require({
    message: t('kanban.deleteBoardConfirm'),
    header: t('kanban.deleteBoard'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await deleteBoard.mutateAsync(id)
        toast.success(t('common.delete'))
        refetch()
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--text)] flex items-center gap-2">
          <LayoutGrid class="w-7 h-7 text-[var(--primary)]" />
          {{ t('kanban.title') }}
          <PageInfoButton :title="t('kanban.title')" :description="t('pageInfo.kanban')" />
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('kanban.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          :label="t('kanban.openWorkHub')"
          icon="pi pi-th-large"
          severity="secondary"
          outlined
          @click="router.push({ name: 'kanban-work' })"
        />
        <Button
          v-if="canWriteKanban"
          :label="t('kanban.createBoard')"
          icon="pi pi-plus"
          @click="openCreate"
        />
      </div>
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <SkeletonCard v-for="i in 6" :key="i" />
    </div>

    <div v-else-if="isError" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <p class="text-[var(--text-muted)] mb-4">{{ t('errors.loadFailed') }}</p>
      <Button :label="t('common.retry')" icon="pi pi-refresh" @click="() => refetch()" />
    </div>

    <EmptyState
      v-else-if="!boards.length"
      :title="t('kanban.noBoards')"
      :action-label="canWriteKanban ? t('kanban.createBoard') : undefined"
      @action="openCreate"
    >
      <template #icon>
        <LayoutGrid class="w-6 h-6" />
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="b in boards"
        :key="b.id"
        class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3 hover:border-[var(--primary)]/40 transition-colors"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="font-semibold text-[var(--text)] truncate">{{ b.name }}</h2>
            <p v-if="b.description" class="text-sm text-[var(--text-muted)] line-clamp-2 mt-1">{{ b.description }}</p>
          </div>
          <Tag :value="b.visibility" severity="secondary" class="text-[10px] shrink-0" />
        </div>
        <div v-if="b.clientId && clientNameMap[b.clientId]" class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Building2 class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">{{ clientNameMap[b.clientId] }}</span>
        </div>
        <div class="flex items-center gap-2 mt-auto pt-2">
          <Button
            :label="t('kanban.openBoard')"
            icon="pi pi-arrow-right"
            icon-pos="right"
            class="flex-1"
            @click="router.push({ name: 'kanban-board', params: { id: b.id } })"
          />
          <Button
            v-if="canWriteKanban"
            outlined
            :aria-label="t('kanban.editBoard')"
            @click="openEdit(b)"
          >
            <Pencil class="w-4 h-4" />
          </Button>
          <Button
            v-if="canWriteKanban"
            severity="danger"
            outlined
            :aria-label="t('kanban.deleteBoard')"
            @click="confirmDeleteBoard(b.id)"
          >
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showEdit" :header="t('kanban.editBoard')" modal class="w-full max-w-md" :dismissable-mask="true" @hide="editingId = null">
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.boardName') }}</label>
          <InputText v-model="editName" class="w-full" :placeholder="t('kanban.boardName')" autofocus />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.description') }}</label>
          <Textarea v-model="editDesc" rows="3" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.visibility') }}</label>
          <Select v-model="editVis" :options="visOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.client') }}</label>
          <Select v-model="editClientId" :options="clientOpts" option-label="label" option-value="value" class="w-full" :placeholder="t('kanban.noClient')" show-clear />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showEdit = false" />
          <Button :label="t('common.save')" icon="pi pi-check" :loading="savingEdit" :disabled="!editName.trim()" @click="submitEdit" />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="showCreate" :header="t('kanban.createBoard')" modal class="w-full max-w-md" :dismissable-mask="true">
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.boardName') }}</label>
          <InputText v-model="formName" class="w-full" :placeholder="t('kanban.boardName')" autofocus />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.description') }}</label>
          <Textarea v-model="formDesc" rows="3" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.visibility') }}</label>
          <Select v-model="formVis" :options="visOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-[var(--text)]">{{ t('kanban.client') }}</label>
          <Select v-model="formClientId" :options="clientOpts" option-label="label" option-value="value" class="w-full" :placeholder="t('kanban.noClient')" show-clear />
        </div>
        <p
          class="text-xs text-[var(--text-muted)] leading-relaxed rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-raised)]/40 p-3"
        >
          {{ t('kanban.defaultColumnsHint') }}
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showCreate = false" />
          <Button :label="t('common.create')" icon="pi pi-check" :loading="creating" :disabled="!formName.trim()" @click="submitCreate" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
