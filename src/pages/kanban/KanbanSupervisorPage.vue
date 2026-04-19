<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { isAxiosError } from 'axios'
import Button from 'primevue/button'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Dialog from 'primevue/dialog'
import { useAuthStore } from '@/stores/auth'
import { kanbanService } from '@/services/kanban.service'
import { usersService } from '@/services/users.service'
import { tenantsService } from '@/services/tenants.service'
import type { KanbanWorkItem, SupervisorFilters, KanbanColumnKind, CardPriority } from '@/types/kanban'
import { clipboardList, filter, checkSquare, arrowLeft, users, calendar, flag, tag, clock } from 'lucide-vue-next'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const isSuperAdmin = computed(() => auth.user?.superAdmin)

const filters = ref<SupervisorFilters>({
  tenantId: undefined,
  boardId: undefined,
  assigneeId: undefined,
  columnKind: undefined,
  priority: undefined,
  dueDateFrom: undefined,
  dueDateTo: undefined,
  label: undefined
})

const selectedItems = ref<KanbanWorkItem[]>([])
const showFilters = ref(true)
const showBulkDialog = ref(false)
const bulkAction = ref<'reassign' | 'move' | 'delete' | null>(null)

const { data: items, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['kanban', 'supervisor', filters.value],
  queryFn: () => kanbanService.listSupervisorItems(filters.value),
  enabled: computed(() => !!isSuperAdmin.value),
  staleTime: 15_000
})

const { data: tenantOptions } = useQuery({
  queryKey: ['tenants', 'all'],
  queryFn: () => tenantsService.list({ page: 0, size: 500 }).then((r) => r.content),
  enabled: computed(() => !!isSuperAdmin.value)
})

const { data: userOptions } = useQuery({
  queryKey: ['users', 'all'],
  queryFn: () => usersService.listAll(),
  enabled: computed(() => !!isSuperAdmin.value)
})

const priorityOpts = computed(() => [
  { label: t('kanban.allPriorities'), value: undefined as CardPriority | undefined },
  { label: t('kanban.priorityLow'), value: 'LOW' as CardPriority },
  { label: t('kanban.priorityMedium'), value: 'MEDIUM' as CardPriority },
  { label: t('kanban.priorityHigh'), value: 'HIGH' as CardPriority },
  { label: t('kanban.priorityCritical'), value: 'CRITICAL' as CardPriority }
])

const columnKindOpts = computed(() => [
  { label: t('kanban.allColumns'), value: undefined as KanbanColumnKind | undefined },
  { label: t('kanban.colTodo'), value: 'TODO' as KanbanColumnKind },
  { label: t('kanban.colInProgress'), value: 'IN_PROGRESS' as KanbanColumnKind },
  { label: t('kanban.colDone'), value: 'DONE' as KanbanColumnKind },
  { label: t('kanban.colHistory'), value: 'HISTORY' as KanbanColumnKind }
])

const tenantOpts = computed(() => [
  { label: t('kanban.allTenants'), value: undefined as string | undefined },
  ...(tenantOptions.value ?? []).map((t) => ({ label: t.name, value: t.id }))
])

const assigneeOpts = computed(() => [
  { label: t('kanban.allUsers'), value: undefined as string | undefined },
  ...(userOptions.value ?? []).map((u) => ({ label: u.fullName || u.email, value: u.id }))
])

function prioritySeverity(p?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  const x = p?.toUpperCase()
  if (x === 'CRITICAL' || x === 'HIGH') return 'danger'
  if (x === 'MEDIUM') return 'warn'
  if (x === 'LOW') return 'secondary'
  return 'secondary'
}

function errorHint(err: unknown): string {
  if (isAxiosError(err)) {
    const st = err.response?.status
    if (st === 401) return t('errors.sessionExpired')
    if (st === 403) return t('errors.forbidden')
    const body = err.response?.data as { message?: string } | undefined
    if (body?.message && typeof body.message === 'string') return body.message
    if (st) return `${t('errors.loadFailed')} (HTTP ${st})`
  }
  return t('errors.loadFailed')
}

const totalItems = computed(() => items.value?.length ?? 0)
const selectedCount = computed(() => selectedItems.value.length)

function toggleSelect(item: KanbanWorkItem) {
  const idx = selectedItems.value.findIndex((i) => i.id === item.id)
  if (idx >= 0) {
    selectedItems.value.splice(idx, 1)
  } else {
    selectedItems.value.push(item)
  }
}

function selectAll() {
  if (selectedCount.value === totalItems.value) {
    selectedItems.value = []
  } else {
    selectedItems.value = [...(items.value ?? [])]
  }
}

function clearFilters() {
  filters.value = {
    tenantId: undefined,
    boardId: undefined,
    assigneeId: undefined,
    columnKind: undefined,
    priority: undefined,
    dueDateFrom: undefined,
    dueDateTo: undefined,
    label: undefined
  }
  selectedItems.value = []
}

function openBoard(item: KanbanWorkItem) {
  router.push({ name: 'kanban-board', params: { id: item.boardId } })
}

function isSelected(item: KanbanWorkItem): boolean {
  return selectedItems.value.some((i) => i.id === item.id)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <clipboardList class="w-6 h-6 text-[var(--primary)]" />
          {{ t('kanban.supervisorTitle') }}
          <PageInfoButton :title="t('kanban.supervisorTitle')" :description="t('pageInfo.supervisor')" />
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('kanban.supervisorSubtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          :label="t('kanban.backToBoards')"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="router.push({ name: 'kanban' })"
        />
        <Button :label="t('common.retry')" icon="pi pi-refresh" severity="secondary" outlined @click="() => refetch()" />
      </div>
    </div>

    <div v-if="!isSuperAdmin" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <p class="text-[var(--text)]">{{ t('errors.forbidden') }}</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap gap-2 items-center">
        <Button
          :label="showFilters ? t('kanban.hideFilters') : t('kanban.showFilters')"
          :icon="showFilters ? 'pi pi-filter-slash' : 'pi pi-filter'"
          severity="secondary"
          outlined
          size="small"
          @click="showFilters = !showFilters"
        />
        <div class="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span>{{ totalItems }} {{ t('kanban.cards') }}</span>
          <span v-if="selectedCount > 0">| {{ selectedCount }} {{ t('kanban.selected') }}</span>
        </div>
      </div>

      <div v-if="showFilters" class="flex flex-wrap gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div class="flex flex-col gap-1 min-w-[180px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <users class="w-3 h-3" /> {{ t('kanban.company') }}
          </label>
          <Select
            v-model="filters.tenantId"
            :options="tenantOpts"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="t('kanban.allTenants')"
            :empty-message="t('kanban.noTenants')"
          />
        </div>

        <div class="flex flex-col gap-1 min-w-[180px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <users class="w-3 h-3" /> {{ t('kanban.assignee') }}
          </label>
          <Select
            v-model="filters.assigneeId"
            :options="assigneeOpts"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="t('kanban.allUsers')"
          />
        </div>

        <div class="flex flex-col gap-1 min-w-[150px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <flag class="w-3 h-3" /> {{ t('kanban.priority') }}
          </label>
          <Select
            v-model="filters.priority"
            :options="priorityOpts"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="t('kanban.allPriorities')"
          />
        </div>

        <div class="flex flex-col gap-1 min-w-[150px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <checkSquare class="w-3 h-3" /> {{ t('kanban.status') }}
          </label>
          <Select
            v-model="filters.columnKind"
            :options="columnKindOpts"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="t('kanban.allColumns')"
          />
        </div>

        <div class="flex flex-col gap-1 min-w-[160px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <calendar class="w-3 h-3" /> {{ t('kanban.dueFrom') }}
          </label>
          <Calendar
            v-model="filters.dueDateFrom"
            date-format="yy-mm-dd"
            placeholder="yyyy-mm-dd"
            class="w-full"
            show-icon
          />
        </div>

        <div class="flex flex-col gap-1 min-w-[160px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <calendar class="w-3 h-3" /> {{ t('kanban.dueTo') }}
          </label>
          <Calendar
            v-model="filters.dueDateTo"
            date-format="yy-mm-dd"
            placeholder="yyyy-mm-dd"
            class="w-full"
            show-icon
          />
        </div>

        <div class="flex flex-col gap-1 min-w-[180px]">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <tag class="w-3 h-3" /> {{ t('kanban.label') }}
          </label>
          <InputText
            v-model="filters.label"
            :placeholder="t('kanban.labelPlaceholder')"
            class="w-full"
          />
        </div>

        <div class="flex items-end gap-2">
          <Button :label="t('kanban.clearFilters')" severity="secondary" text size="small" @click="clearFilters" />
        </div>
      </div>

      <div v-if="selectedCount > 0" class="flex flex-wrap gap-2 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        <span class="text-sm text-[var(--text-muted)]">{{ selectedCount }} {{ t('kanban.selected') }}</span>
        <Button :label="t('kanban.reassign')" size="small" outlined @click="showBulkDialog = true; bulkAction = 'reassign'" />
        <Button :label="t('kanban.move')" size="small" outlined @click="showBulkDialog = true; bulkAction = 'move'" />
        <Button :label="t('kanban.delete')" severity="danger" size="small" outlined @click="showBulkDialog = true; bulkAction = 'delete'" />
        <Button :label="t('common.cancel')" size="small" text @click="selectedItems = []" />
      </div>

      <div v-if="isError" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-2">
        <p class="text-[var(--text)] font-medium">{{ t('errors.loadFailed') }}</p>
        <p class="text-sm text-[var(--text-muted)]">{{ errorHint(error) }}</p>
      </div>

      <DataTable
        v-else
        :value="items ?? []"
        :loading="isLoading"
        striped-rows
        class="rounded-xl overflow-hidden"
        data-key="id"
        :paginator="totalItems > 50"
        :rows="50"
        :rows-per-page-options="[20, 50, 100]"
        removable-sort
        scrollable
        scroll-height="600px"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column field="tenantName" :header="t('kanban.company')" sortable style="min-width: 140px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <span class="font-medium">{{ data.tenantName || '-' }}</span>
          </template>
        </Column>
        <Column field="boardName" :header="t('kanban.boardName')" sortable style="min-width: 140px" />
        <Column field="columnName" :header="t('kanban.column')" sortable style="min-width: 120px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <div class="flex flex-col gap-0.5">
              <span>{{ data.columnName }}</span>
              <Tag v-if="data.columnKind" severity="secondary" class="text-[10px] w-fit">{{ data.columnKind }}</Tag>
            </div>
          </template>
        </Column>
        <Column field="card.title" :header="t('kanban.title')" sortable style="min-width: 200px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <div class="flex flex-col gap-0.5">
              <span class="font-medium">{{ data.card.title }}</span>
              <div v-if="data.card.labels?.length" class="flex gap-1 flex-wrap">
                <Tag v-for="lbl in data.card.labels" :key="lbl" severity="info" class="text-[10px]">{{ lbl }}</Tag>
              </div>
            </div>
          </template>
        </Column>
        <Column :header="t('kanban.priority')" style="width: 100px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <Tag v-if="data.card.priority" :severity="prioritySeverity(data.card.priority)" class="text-[10px]">
              {{ data.card.priority }}
            </Tag>
          </template>
        </Column>
        <Column :header="t('kanban.dueDate')" field="card.dueDate" sortable style="width: 110px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <span :class="{ 'text-red-500': data.overdue }">{{ data.card.dueDate || '-' }}</span>
          </template>
        </Column>
        <Column :header="t('kanban.checklist')" style="width: 80px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <span v-if="data.checklistProgress" class="text-sm">{{ data.checklistProgress }}</span>
            <span v-else class="text-[var(--text-placeholder)]">-</span>
          </template>
        </Column>
        <Column :header="t('kanban.assignees')" style="min-width: 150px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <div v-if="data.assigneeNames?.length" class="flex flex-col gap-0.5">
              <span v-for="name in data.assigneeNames" :key="name" class="text-sm">{{ name }}</span>
            </div>
            <span v-else class="text-[var(--text-placeholder)]">-</span>
          </template>
        </Column>
        <Column :header="t('common.actions')" style="width: 100px">
          <template #body="{ data }: { data: KanbanWorkItem }">
            <Button :label="t('kanban.open')" size="small" text @click="openBoard(data)" />
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8 text-[var(--text-muted)]">{{ t('kanban.noItems') }}</div>
        </template>
      </DataTable>
    </template>
  </div>