<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useAuthStore } from '@/stores/auth'
import { kanbanService } from '@/services/kanban.service'
import { usersService } from '@/services/users.service'
import type { KanbanColumnKind, KanbanWorkItem } from '@/types/kanban'
import { ClipboardList } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const filterAssignee = ref<string | null>(null)
const filterColumnKind = ref<KanbanColumnKind | ''>('')

const { data: items, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => [
    'kanban',
    'work-items',
    filterAssignee.value ?? '',
    filterColumnKind.value
  ]),
  queryFn: () =>
    kanbanService.listWorkItems({
      assigneeId: filterAssignee.value || undefined,
      columnKind: (filterColumnKind.value || undefined) as KanbanColumnKind | undefined
    }),
  staleTime: 15_000
})

const { data: userOptions } = useQuery({
  queryKey: computed(() => ['users', 'work-hub', auth.user?.tenantId]),
  queryFn: () =>
    usersService.list({ tenantId: auth.user!.tenantId, page: 0, size: 200 }),
  enabled: computed(() => !!auth.user?.tenantId)
})

const assigneeOpts = computed(() => [
  { label: t('kanban.workAllUsers'), value: null as string | null },
  ...(userOptions.value?.content ?? []).map((u) => ({
    label: u.fullName || u.email,
    value: u.id
  }))
])

const kindOpts = computed(() => [
  { label: t('kanban.workAllColumns'), value: '' as const },
  { label: t('kanban.colTodo'), value: 'TODO' as const },
  { label: t('kanban.colInProgress'), value: 'IN_PROGRESS' as const },
  { label: t('kanban.colDone'), value: 'DONE' as const },
  { label: t('kanban.colHistory'), value: 'HISTORY' as const }
])

function openBoard(row: KanbanWorkItem) {
  router.push({ name: 'kanban-board', params: { id: row.boardId } })
}

function prioritySeverity(p: string): 'success' | 'warn' | 'danger' | 'secondary' {
  const x = p?.toUpperCase()
  if (x === 'CRITICAL' || x === 'HIGH') return 'danger'
  if (x === 'MEDIUM') return 'warn'
  if (x === 'LOW') return 'secondary'
  return 'secondary'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <ClipboardList class="w-6 h-6 text-[var(--primary)]" />
          {{ t('kanban.workHubTitle') }}
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('kanban.workHubSubtitle') }}</p>
      </div>
      <Button :label="t('common.retry')" icon="pi pi-refresh" severity="secondary" outlined @click="() => refetch()" />
    </div>

    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1 min-w-[200px]">
        <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('kanban.assignee') }}</label>
        <Select
          v-model="filterAssignee"
          :options="assigneeOpts"
          option-label="label"
          option-value="value"
          class="w-full"
          :placeholder="t('kanban.workAllUsers')"
        />
      </div>
      <div class="flex flex-col gap-1 min-w-[200px]">
        <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('kanban.workColumnKind') }}</label>
        <Select
          v-model="filterColumnKind"
          :options="kindOpts"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
    </div>

    <div v-if="isError" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <p class="text-[var(--text-muted)]">{{ t('errors.loadFailed') }}</p>
    </div>

    <DataTable
      v-else
      :value="items ?? []"
      :loading="isLoading"
      striped-rows
      class="rounded-xl overflow-hidden"
      data-key="card.id"
    >
      <Column field="boardName" :header="t('kanban.boardName')" sortable style="min-width: 140px" />
      <Column field="columnName" :header="t('kanban.columnName')" sortable style="min-width: 120px">
        <template #body="{ data }: { data: KanbanWorkItem }">
          <div class="flex flex-col gap-0.5">
            <span>{{ data.columnName }}</span>
            <Tag v-if="data.columnKind" severity="secondary" class="text-[10px] w-fit">{{ data.columnKind }}</Tag>
          </div>
        </template>
      </Column>
      <Column field="card.title" :header="t('kanban.cardTitle')" sortable style="min-width: 200px">
        <template #body="{ data }: { data: KanbanWorkItem }">
          <span class="font-medium">{{ data.card.title }}</span>
        </template>
      </Column>
      <Column :header="t('kanban.priority')" style="width: 110px">
        <template #body="{ data }: { data: KanbanWorkItem }">
          <Tag v-if="data.card.priority" :severity="prioritySeverity(data.card.priority)" class="text-[10px]">
            {{ data.card.priority }}
          </Tag>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 120px">
        <template #body="{ data }: { data: KanbanWorkItem }">
          <Button :label="t('kanban.openBoard')" size="small" text @click="openBoard(data)" />
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">{{ t('kanban.workEmpty') }}</div>
      </template>
    </DataTable>
  </div>
</template>
