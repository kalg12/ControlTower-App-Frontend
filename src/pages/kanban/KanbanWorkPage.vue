<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { isAxiosError } from 'axios'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import { useAuthStore } from '@/stores/auth'
import { kanbanService } from '@/services/kanban.service'
import { usersService } from '@/services/users.service'
import { tenantsService } from '@/services/tenants.service'
import type { KanbanColumnKind, KanbanWorkItem, KanbanCard, CardPriority } from '@/types/kanban'
import { ClipboardList, Users, Flag, Calendar, Tag as TagIcon, Search, BarChart3, Clock, AlertTriangle, CheckCircle } from 'lucide-vue-next'
import dayjs from 'dayjs'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const isSuperAdmin = computed(() => auth.user?.superAdmin)

const filterTenant = ref<string | null>(null)
const filterBoard = ref<string | null>(null)
const filterAssignee = ref<string | null>(null)
const filterPriority = ref<CardPriority | null>(null)
const filterDueFrom = ref<Date | null>(null)
const filterDueTo = ref<Date | null>(null)
const filterLabel = ref<string>('')
const searchText = ref('')

const columns = ref<{ id: string; name: string; kind: KanbanColumnKind | null }[]>([
  { id: 'TODO', name: 'To Do', kind: 'TODO' },
  { id: 'IN_PROGRESS', name: 'In Progress', kind: 'IN_PROGRESS' },
  { id: 'DONE', name: 'Done', kind: 'DONE' },
  { id: 'HISTORY', name: 'History', kind: 'HISTORY' }
])

const { data: allItems, isLoading, isError, error: workItemsError, refetch } = useQuery({
  queryKey: computed(() => ['kanban', isSuperAdmin.value ? 'supervisor-items' : 'work-items', filterTenant.value, filterBoard.value, filterAssignee.value, filterPriority.value]),
  queryFn: async () => {
    if (isSuperAdmin.value) {
      return kanbanService.listSupervisorItems({
        tenantId: filterTenant.value || undefined,
        assigneeId: filterAssignee.value || undefined,
        priority: filterPriority.value || undefined
      })
    }
    return kanbanService.listWorkItems({
      assigneeId: filterAssignee.value || undefined,
      columnKind: undefined
    })
  },
  staleTime: 15_000
})

const { data: tenantOptions } = useQuery({
  queryKey: ['tenants', 'all'],
  queryFn: () => tenantsService.list({ page: 0, size: 500 }).then(r => r.content),
  enabled: isSuperAdmin
})

const { data: userOptions } = useQuery({
  queryKey: computed(() => ['users', isSuperAdmin.value ? 'all' : 'tenant', filterTenant.value]),
  queryFn: () => {
    const tenantId = isSuperAdmin.value && filterTenant.value ? filterTenant.value : auth.user!.tenantId
    return usersService.list({ tenantId, page: 0, size: 500 }).then(r => r.content)
  },
  enabled: computed(() => !!auth.user?.tenantId)
})

const filteredItems = computed(() => {
  if (!allItems.value) return []
  let items = allItems.value

  if (filterTenant.value) {
    items = items.filter(i => i.tenantId === filterTenant.value)
  }
  if (filterPriority.value) {
    items = items.filter(i => i.card.priority === filterPriority.value)
  }
  if (filterAssignee.value) {
    items = items.filter(i => i.card.assigneeIds?.includes(filterAssignee.value))
  }
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    items = items.filter(i => i.card.title.toLowerCase().includes(search))
  }
  if (filterLabel.value) {
    items = items.filter(i => i.card.labels?.some(l => l.toLowerCase().includes(filterLabel.value.toLowerCase())))
  }
  if (filterDueFrom.value) {
    items = items.filter(i => i.card.dueDate && dayjs(i.card.dueDate).isAfter(dayjs(filterDueFrom.value), 'day'))
  }
  if (filterDueTo.value) {
    items = items.filter(i => i.card.dueDate && dayjs(i.card.dueDate).isBefore(dayjs(filterDueTo.value), 'day'))
  }

  return items
})

const itemsByColumn = computed(() => {
  const grouped: Record<string, KanbanWorkItem[]> = {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
    HISTORY: []
  }

  filteredItems.value.forEach(item => {
    const kind = item.columnKind as KanbanColumnKind
    if (kind && grouped[kind]) {
      grouped[kind].push(item)
    }
  })

  return grouped
})

const metrics = computed(() => {
  const items = filteredItems.value
  return {
    total: items.length,
    todo: itemsByColumn.value.TODO.length,
    inProgress: itemsByColumn.value.IN_PROGRESS.length,
    done: itemsByColumn.value.DONE.length,
    history: itemsByColumn.value.HISTORY.length,
    overdue: items.filter(i => {
      if (!i.card.dueDate) return false
      if (i.columnKind === 'DONE' || i.columnKind === 'HISTORY') return false
      return dayjs(i.card.dueDate).isBefore(dayjs(), 'day')
    }).length,
    attended: items.filter(i => i.card.wasOverdue && i.card.attendedAt).length
  }
})

const tenantOpts = computed(() => [
  { label: t('kanban.allTenants'), value: null as string | null },
  ...(tenantOptions.value ?? []).map(t => ({ label: t.name, value: t.id }))
])

const assigneeOpts = computed(() => [
  { label: t('kanban.allUsers'), value: null as string | null },
  ...(userOptions.value ?? []).map(u => ({ label: u.fullName || u.email, value: u.id }))
])

const priorityOpts = computed(() => [
  { label: t('kanban.allPriorities'), value: null as CardPriority | null },
  { label: t('kanban.priorityLow'), value: 'LOW' as CardPriority },
  { label: t('kanban.priorityMedium'), value: 'MEDIUM' as CardPriority },
  { label: t('kanban.priorityHigh'), value: 'HIGH' as CardPriority },
  { label: t('kanban.priorityCritical'), value: 'CRITICAL' as CardPriority }
])

function prioritySeverity(p?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  const x = p?.toUpperCase()
  if (x === 'CRITICAL' || x === 'HIGH') return 'danger'
  if (x === 'MEDIUM') return 'warn'
  return 'secondary'
}

function isCardOverdue(card: KanbanCard, columnKind?: string | null): boolean {
  if (!card.dueDate) return false
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return false
  return dayjs(card.dueDate).isBefore(dayjs(), 'day')
}

function dueBadgeLabel(card: KanbanCard, columnKind?: string | null): string | null {
  if (!card.dueDate) return null
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return null
  const d = dayjs(card.dueDate)
  const today = dayjs()
  if (d.isBefore(today, 'day')) return 'VENCIDA'
  if (d.isSame(today, 'day')) return 'HOY'
  if (d.isSame(today.add(1, 'day'), 'day')) return 'MAÑANA'
  return null
}

function formatDue(date: string): string {
  return dayjs(date).format('MMM D')
}

function openBoard(item: KanbanWorkItem) {
  router.push({ name: 'kanban-board', params: { id: item.boardId } })
}

async function onDragChange(columnKind: string, event: { added?: { element: KanbanWorkItem } }) {
  if (event.added) {
    const item = event.added.element
    try {
      const targetColumn = columns.value.find(c => c.kind === columnKind)
      if (targetColumn) {
        await kanbanService.moveCard(item.id, {
          targetColumnId: targetColumn.id,
          position: 0
        })
        toast.success(t('kanban.cardMoved'))
        refetch()
      }
    } catch (e) {
      toast.error(t('kanban.moveCardFailed'))
      refetch()
    }
  }
}

function workItemsErrorHint(err: unknown): string {
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

function clearFilters() {
  filterTenant.value = null
  filterBoard.value = null
  filterAssignee.value = null
  filterPriority.value = null
  filterDueFrom.value = null
  filterDueTo.value = null
  filterLabel.value = ''
  searchText.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <ClipboardList class="w-6 h-6 text-[var(--primary)]" />
          {{ t('kanban.workHubTitle') }}
          <PageInfoButton :title="t('kanban.workHubTitle')" :description="t('pageInfo.workHub')" />
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('kanban.workHubSubtitle') }}</p>
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

    <div class="flex flex-wrap gap-2 items-center p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-1">
          <BarChart3 class="w-4 h-4 text-[var(--primary)]" />
          <span class="font-medium">{{ metrics.total }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.total') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <Clock class="w-4 h-4 text-orange-500" />
          <span class="font-medium text-orange-500">{{ metrics.todo }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.colTodo') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 rounded-full border-2 border-blue-500"></div>
          <span class="font-medium text-blue-500">{{ metrics.inProgress }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.colInProgress') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <CheckCircle class="w-4 h-4 text-green-500" />
          <span class="font-medium text-green-500">{{ metrics.done }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.colDone') }}</span>
        </div>
        <div v-if="metrics.overdue > 0" class="flex items-center gap-1">
          <AlertTriangle class="w-4 h-4 text-red-500" />
          <span class="font-medium text-red-500">{{ metrics.overdue }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.overdue') }}</span>
        </div>
        <div v-if="metrics.attended > 0" class="flex items-center gap-1">
          <CheckCircle class="w-4 h-4 text-green-600" />
          <span class="font-medium text-green-600">{{ metrics.attended }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.attended') }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 items-end">
      <div v-if="isSuperAdmin" class="flex flex-col gap-1 min-w-[180px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Users class="w-3 h-3" /> {{ t('kanban.company') }}
        </label>
        <Select
          v-model="filterTenant"
          :options="tenantOpts"
          option-label="label"
          option-value="value"
          class="w-full"
          :placeholder="t('kanban.allTenants')"
        />
      </div>

      <div class="flex flex-col gap-1 min-w-[180px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Users class="w-3 h-3" /> {{ t('kanban.assignee') }}
        </label>
        <Select
          v-model="filterAssignee"
          :options="assigneeOpts"
          option-label="label"
          option-value="value"
          class="w-full"
          :placeholder="t('kanban.allUsers')"
        />
      </div>

      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Flag class="w-3 h-3" /> {{ t('kanban.priority') }}
        </label>
        <Select
          v-model="filterPriority"
          :options="priorityOpts"
          option-label="label"
          option-value="value"
          class="w-full"
          :placeholder="t('kanban.allPriorities')"
        />
      </div>

      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Search class="w-3 h-3" /> {{ t('kanban.search') }}
        </label>
        <InputText
          v-model="searchText"
          :placeholder="t('kanban.searchPlaceholder')"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Calendar class="w-3 h-3" /> {{ t('kanban.dueFrom') }}
        </label>
        <Calendar v-model="filterDueFrom" date-format="yy-mm-dd" placeholder="yyyy-mm-dd" class="w-full" show-icon />
      </div>

      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Calendar class="w-3 h-3" /> {{ t('kanban.dueTo') }}
        </label>
        <Calendar v-model="filterDueTo" date-format="yy-mm-dd" placeholder="yyyy-mm-dd" class="w-full" show-icon />
      </div>

      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <TagIcon class="w-3 h-3" /> {{ t('kanban.label') }}
        </label>
        <InputText v-model="filterLabel" :placeholder="t('kanban.labelPlaceholder')" class="w-full" />
      </div>

      <div class="flex items-end gap-2">
        <Button :label="t('kanban.clearFilters')" severity="secondary" text size="small" @click="clearFilters" />
      </div>
    </div>

    <div v-if="isError" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-2">
      <p class="text-[var(--text)] font-medium">{{ t('errors.loadFailed') }}</p>
      <p class="text-sm text-[var(--text-muted)]">{{ workItemsErrorHint(workItemsError) }}</p>
    </div>

    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <div
        v-for="col in columns"
        :key="col.id"
        class="w-80 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col max-h-[calc(100vh-16rem)]"
      >
        <div class="p-3 border-b border-[var(--border)] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="font-semibold text-[var(--text)]">{{ col.name }}</h2>
            <Tag severity="secondary" class="text-xs">{{ itemsByColumn[col.kind as KanbanColumnKind]?.length || 0 }}</Tag>
          </div>
        </div>

        <div
          :list="itemsByColumn[col.kind as KanbanColumnKind]"
          group="work-hub"
          class="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-20rem)]"
        >
          <div v-for="item in itemsByColumn[col.kind as KanbanColumnKind]" :key="item.id">
            <button
              type="button"
              class="w-full text-left rounded-lg border bg-[var(--surface-raised)] p-3 hover:border-[var(--primary)]/50 transition-colors"
              :class="isCardOverdue(item.card, item.columnKind)
                ? 'border-red-400 dark:border-red-600'
                : 'border-[var(--border)]'"
              @click="openBoard(item)"
            >
              <div class="flex items-start justify-between gap-1 mb-1">
                <p class="font-medium text-sm text-[var(--text)] line-clamp-2">{{ item.card.title }}</p>
                <span
                  v-if="dueBadgeLabel(item.card, item.columnKind)"
                  class="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                  :class="isCardOverdue(item.card, item.columnKind) ? 'bg-red-500' : 'bg-orange-400'"
                >{{ dueBadgeLabel(item.card, item.columnKind) }}</span>
              </div>
              <div v-if="item.card.wasOverdue && item.card.attendedAt" class="text-[10px] text-green-600 dark:text-green-400 mb-1">
                ✓ {{ t('kanban.attended') }}
              </div>
              <p v-if="item.card.description" class="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{{ item.card.description }}</p>
              <div class="flex items-center justify-between gap-1 mt-2">
                <div class="flex flex-wrap gap-1">
                  <Tag v-if="item.card.priority" :severity="prioritySeverity(item.card.priority)" class="text-[10px]">
                    {{ item.card.priority }}
                  </Tag>
                  <Tag v-if="item.card.dueDate && col.kind !== 'DONE' && col.kind !== 'HISTORY'" severity="info" class="text-[10px]">
                    {{ formatDue(item.card.dueDate) }}
                  </Tag>
                  <Tag v-if="item.checklistProgress" severity="secondary" class="text-[10px]">
                    {{ item.checklistProgress }}
                  </Tag>
                </div>
                <div v-if="item.card.assigneeIds && item.card.assigneeIds.length > 0" class="flex -space-x-1.5 flex-shrink-0">
                  <div
                    v-for="(uid, idx) in (item.card.assigneeIds || []).slice(0, 3)"
                    :key="uid"
                    :style="{ zIndex: 3 - idx }"
                    class="w-5 h-5 rounded-full bg-[var(--primary)] border border-[var(--surface)] flex items-center justify-center text-[8px] font-bold text-white"
                  >
                    {{ item.assigneeNames?.[idx]?.[0]?.toUpperCase() || '?' }}
                  </div>
                </div>
              </div>
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>