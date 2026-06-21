<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { isAxiosError } from 'axios'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import { useAuthStore } from '@/stores/auth'
import { kanbanService } from '@/services/kanban.service'
import { usersService } from '@/services/users.service'
import { clientsService } from '@/services/clients.service'
import { tenantsService } from '@/services/tenants.service'
import { aiService } from '@/services/ai.service'
import { useToast } from '@/composables/useToast'
import type { KanbanWorkItem, KanbanCard, CardPriority } from '@/types/kanban'
import {
  ClipboardList, Users, Flag, Tag as TagIcon, Search, BarChart3,
  Clock, AlertTriangle, CheckCircle, LayoutGrid, Sparkles, Copy, Check,
  Building2, Calendar
} from 'lucide-vue-next'
import dayjs from 'dayjs'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const isSuperAdmin = computed(() => auth.user?.superAdmin)

// ── Filters ──────────────────────────────────────────────────────────────────
const filterTenant    = ref<string | null>(null)
const filterBoard     = ref<string | null>(null)
const filterAssignee  = ref<string | null>(null)
const filterPriority  = ref<CardPriority | null>(null)
const filterDueFrom   = ref<Date | null>(null)
const filterDueTo     = ref<Date | null>(null)
const filterLabel     = ref<string>('')
const searchText      = ref('')

// ── Data queries ──────────────────────────────────────────────────────────────
const { data: allItems, isError, error: workItemsError, refetch } = useQuery({
  queryKey: computed(() => [
    'kanban', isSuperAdmin.value ? 'supervisor-items' : 'work-items',
    filterTenant.value, filterBoard.value, filterAssignee.value, filterPriority.value
  ]),
  queryFn: async () => {
    if (isSuperAdmin.value) {
      return kanbanService.listSupervisorItems({
        tenantId: filterTenant.value || undefined,
        boardId: filterBoard.value || undefined,
        assigneeId: filterAssignee.value || undefined,
        priority: filterPriority.value || undefined
      })
    }
    return kanbanService.listWorkItems({
      boardId: filterBoard.value || undefined,
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

const { data: boardOptions } = useQuery({
  queryKey: ['kanban-boards'],
  queryFn: () => kanbanService.listBoards(0, 100).then(r => r.content ?? r),
  staleTime: 60_000
})

const { data: userOptions } = useQuery({
  queryKey: computed(() => ['users', isSuperAdmin.value ? 'all' : 'tenant', filterTenant.value]),
  queryFn: () => {
    const tenantId = isSuperAdmin.value && filterTenant.value ? filterTenant.value : auth.user!.tenantId
    return usersService.list({ tenantId, page: 0, size: 500 }).then(r => r.content)
  },
  enabled: computed(() => !!auth.user?.tenantId)
})

const { data: clientOptions } = useQuery({
  queryKey: ['clients', 'work-hub'],
  queryFn: () => clientsService.list({ size: 300 }),
  staleTime: 3 * 60_000
})

const clientMap = computed(() => {
  const map = new Map<string, string>()
  ;(clientOptions.value?.content ?? []).forEach(c => map.set(c.id, c.name))
  return map
})

function clientName(id?: string | null): string | null {
  if (!id) return null
  return clientMap.value.get(id) ?? null
}

// ── Filtered items ────────────────────────────────────────────────────────────
const filteredItems = computed(() => {
  if (!allItems.value) return []
  let items = allItems.value
  if (filterTenant.value)   items = items.filter(i => i.tenantId === filterTenant.value)
  if (filterPriority.value) items = items.filter(i => i.card.priority === filterPriority.value)
  if (filterAssignee.value) items = items.filter(i => i.card.assigneeIds?.includes(filterAssignee.value as string))
  if (searchText.value) {
    const s = searchText.value.toLowerCase()
    items = items.filter(i => i.card.title.toLowerCase().includes(s) || i.boardName.toLowerCase().includes(s))
  }
  if (filterLabel.value) {
    const lf = filterLabel.value.toLowerCase()
    items = items.filter(i => i.card.labels?.some(l => l.toLowerCase().includes(lf)))
  }
  if (filterDueFrom.value) {
    items = items.filter(i => i.card.dueDate && dayjs(i.card.dueDate).isAfter(dayjs(filterDueFrom.value), 'day'))
  }
  if (filterDueTo.value) {
    items = items.filter(i => i.card.dueDate && dayjs(i.card.dueDate).isBefore(dayjs(filterDueTo.value), 'day'))
  }
  return items
})

// ── Column grouping ───────────────────────────────────────────────────────────
const dynamicColumns = computed(() => {
  const colMap = new Map<string, { id: string; name: string; kind: string | null; boardName: string }>()
  filteredItems.value.forEach(item => {
    if (!colMap.has(item.columnId))
      colMap.set(item.columnId, { id: item.columnId, name: item.columnName, kind: item.columnKind ?? null, boardName: item.boardName })
  })
  const kindOrder = (k: string | null) => k === 'TODO' ? 0 : k === 'IN_PROGRESS' ? 1 : k === 'DONE' ? 3 : k === 'HISTORY' ? 4 : 2
  return Array.from(colMap.values()).sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name))
})

const itemsByColumnId = computed(() => {
  const grouped: Record<string, KanbanWorkItem[]> = {}
  filteredItems.value.forEach(item => {
    if (!grouped[item.columnId]) grouped[item.columnId] = []
    grouped[item.columnId].push(item)
  })
  return grouped
})

// ── Metrics ───────────────────────────────────────────────────────────────────
const metrics = computed(() => {
  const items = filteredItems.value
  return {
    total:      items.length,
    todo:       items.filter(i => i.columnKind === 'TODO').length,
    inProgress: items.filter(i => i.columnKind === 'IN_PROGRESS').length,
    done:       items.filter(i => i.columnKind === 'DONE').length,
    overdue:    items.filter(i => {
      if (!i.card.dueDate) return false
      if (i.columnKind === 'DONE' || i.columnKind === 'HISTORY') return false
      return dayjs(i.card.dueDate).isBefore(dayjs(), 'day')
    }).length,
    attended:   items.filter(i => i.card.wasOverdue && i.card.attendedAt).length
  }
})

// ── Select options ────────────────────────────────────────────────────────────
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
  { label: t('kanban.priorityLow'),      value: 'LOW'      as CardPriority },
  { label: t('kanban.priorityMedium'),   value: 'MEDIUM'   as CardPriority },
  { label: t('kanban.priorityHigh'),     value: 'HIGH'     as CardPriority },
  { label: t('kanban.priorityCritical'), value: 'CRITICAL' as CardPriority }
])
const boardOpts = computed(() => [
  { label: t('kanban.allBoards'), value: null as string | null },
  ...(boardOptions.value ?? []).map(b => ({ label: b.name, value: b.id }))
])

// ── Helpers ───────────────────────────────────────────────────────────────────
function prioritySeverity(p?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  const x = p?.toUpperCase()
  if (x === 'CRITICAL' || x === 'HIGH') return 'danger'
  if (x === 'MEDIUM') return 'warn'
  return 'secondary'
}

function columnKindStyle(kind: string | null) {
  if (kind === 'TODO')        return { dot: 'bg-orange-400', header: 'border-orange-400/40', badge: 'bg-orange-500/10 text-orange-400' }
  if (kind === 'IN_PROGRESS') return { dot: 'bg-blue-400',   header: 'border-blue-400/40',   badge: 'bg-blue-500/10 text-blue-400' }
  if (kind === 'DONE')        return { dot: 'bg-green-400',  header: 'border-green-400/40',  badge: 'bg-green-500/10 text-green-400' }
  if (kind === 'HISTORY')     return { dot: 'bg-gray-400',   header: 'border-gray-400/40',   badge: 'bg-gray-500/10 text-gray-400' }
  return { dot: 'bg-[var(--primary)]', header: 'border-[var(--border)]', badge: 'bg-[var(--primary)]/10 text-[var(--primary)]' }
}

function isCardOverdue(card: KanbanCard, columnKind?: string | null): boolean {
  if (!card.dueDate) return false
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return false
  return dayjs(card.dueDate).isBefore(dayjs(), 'day')
}

function dueFriendlyLabel(card: KanbanCard, columnKind?: string | null): { label: string; cls: string } | null {
  if (!card.dueDate) return null
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return null
  const d    = dayjs(card.dueDate)
  const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day')
  if (diff < -1) return { label: `Hace ${Math.abs(diff)}d`, cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
  if (diff === -1) return { label: 'Ayer',       cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
  if (diff === 0)  return { label: 'Hoy',        cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' }
  if (diff === 1)  return { label: 'Mañana',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
  if (diff < 7)   return { label: `En ${diff}d`, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
  return { label: d.format('D MMM'),              cls: 'bg-[var(--surface-ground)] text-[var(--text-muted)] border-[var(--border)]' }
}

function openBoard(item: KanbanWorkItem) {
  router.push({ name: 'kanban-board', params: { id: item.boardId } })
}

function clearFilters() {
  filterTenant.value   = null
  filterBoard.value    = null
  filterAssignee.value = null
  filterPriority.value = null
  filterDueFrom.value  = null
  filterDueTo.value    = null
  filterLabel.value    = ''
  searchText.value     = ''
}

function workItemsErrorHint(err: unknown): string {
  if (isAxiosError(err)) {
    const st = err.response?.status
    if (st === 401) return t('errors.sessionExpired')
    if (st === 403) return t('errors.forbidden')
    if (st === 404) return t('errors.notFound')
    if (st && st >= 500) return t('errors.server')
    if (st) return `${t('errors.loadFailed')} (HTTP ${st})`
  }
  return t('errors.loadFailed')
}

// ── AI Prompt ─────────────────────────────────────────────────────────────────
const aiSelectedItem  = ref<KanbanWorkItem | null>(null)
const aiLoading       = ref(false)
const aiResult        = ref('')
const showAiDialog    = ref(false)
const aiCopied        = ref(false)

async function generatePrompt(item: KanbanWorkItem, regenerate = false) {
  aiSelectedItem.value = item
  aiLoading.value = true
  if (regenerate) showAiDialog.value = true
  try {
    const result = await aiService.assist({
      task: 'GENERATE_CARD_PROMPT',
      context: {
        cardTitle:       item.card.title,
        cardDescription: item.card.description ?? undefined,
        cardChecklist:   (item.card.checklist ?? []).map(i => i.text),
        cardPriority:    item.card.priority,
        boardName:       item.boardName,
        clientName:      clientName(item.card.clientId) ?? undefined
      }
    })
    aiResult.value      = result
    showAiDialog.value  = true
    aiCopied.value      = false
  } catch {
    toast.error('No se pudo generar el prompt. Inténtalo de nuevo.')
  } finally {
    aiLoading.value = false
  }
}

async function copyAiResult() {
  await navigator.clipboard.writeText(aiResult.value)
  aiCopied.value = true
  setTimeout(() => { aiCopied.value = false }, 2000)
}

function renderAiMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="ai-h2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="ai-h1">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="ai-bold">$1</strong>')
    .replace(/^(\d+)\.\s(.+)$/gm, '<div class="ai-num"><span class="ai-num-n">$1.</span><span>$2</span></div>')
    .replace(/^[-*]\s(.+)$/gm,    '<div class="ai-bullet"><span class="ai-bullet-dot">•</span><span>$1</span></div>')
    .replace(/\n{2,}/g, '<div class="ai-gap"></div>')
    .replace(/\n/g, '<br>')
}
</script>

<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <ClipboardList class="w-5 h-5 text-[var(--primary)]" />
          {{ t('kanban.workHubTitle') }}
          <PageInfoButton :title="t('kanban.workHubTitle')" :description="t('pageInfo.workHub')" />
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">{{ t('kanban.workHubSubtitle') }}</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <Button
          :label="t('kanban.backToBoards')"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          size="small"
          @click="router.push({ name: 'kanban' })"
        />
        <Button
          :label="t('common.retry')"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          size="small"
          @click="() => refetch()"
        />
      </div>
    </div>

    <!-- Metrics bar -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm">
      <div class="flex items-center gap-1.5">
        <BarChart3 class="w-4 h-4 text-[var(--primary)]" />
        <span class="font-semibold text-[var(--text)]">{{ metrics.total }}</span>
        <span class="text-[var(--text-muted)]">{{ t('kanban.total') }}</span>
      </div>
      <div class="w-px h-4 bg-[var(--border)] hidden sm:block" />
      <div class="flex items-center gap-1.5">
        <Clock class="w-4 h-4 text-orange-500" />
        <span class="font-semibold text-orange-500">{{ metrics.todo }}</span>
        <span class="text-[var(--text-muted)]">{{ t('kanban.colTodo') }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3.5 h-3.5 rounded-full border-2 border-blue-500" />
        <span class="font-semibold text-blue-500">{{ metrics.inProgress }}</span>
        <span class="text-[var(--text-muted)]">{{ t('kanban.colInProgress') }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <CheckCircle class="w-4 h-4 text-green-500" />
        <span class="font-semibold text-green-500">{{ metrics.done }}</span>
        <span class="text-[var(--text-muted)]">{{ t('kanban.colDone') }}</span>
      </div>
      <template v-if="metrics.overdue > 0">
        <div class="w-px h-4 bg-[var(--border)] hidden sm:block" />
        <div class="flex items-center gap-1.5">
          <AlertTriangle class="w-4 h-4 text-red-500" />
          <span class="font-semibold text-red-500">{{ metrics.overdue }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.overdue') }}</span>
        </div>
      </template>
      <template v-if="metrics.attended > 0">
        <div class="flex items-center gap-1.5">
          <CheckCircle class="w-4 h-4 text-emerald-600" />
          <span class="font-semibold text-emerald-600">{{ metrics.attended }}</span>
          <span class="text-[var(--text-muted)]">{{ t('kanban.attended') }}</span>
        </div>
      </template>
    </div>

    <!-- Filter bar -->
    <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div v-if="isSuperAdmin" class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <Users class="w-3 h-3" /> {{ t('kanban.company') }}
          </label>
          <Select v-model="filterTenant" :options="tenantOpts" option-label="label" option-value="value"
            class="w-full" :placeholder="t('kanban.allTenants')" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <LayoutGrid class="w-3 h-3" /> {{ t('kanban.board') }}
          </label>
          <Select v-model="filterBoard" :options="boardOpts" option-label="label" option-value="value"
            class="w-full" :placeholder="t('kanban.allBoards')" show-clear />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <Users class="w-3 h-3" /> {{ t('kanban.assignee') }}
          </label>
          <Select v-model="filterAssignee" :options="assigneeOpts" option-label="label" option-value="value"
            class="w-full" :placeholder="t('kanban.allUsers')" show-clear />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <Flag class="w-3 h-3" /> {{ t('kanban.priority') }}
          </label>
          <Select v-model="filterPriority" :options="priorityOpts" option-label="label" option-value="value"
            class="w-full" :placeholder="t('kanban.allPriorities')" show-clear />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <Search class="w-3 h-3" /> {{ t('kanban.search') }}
          </label>
          <InputText v-model="searchText" :placeholder="t('kanban.searchPlaceholder')" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <TagIcon class="w-3 h-3" /> {{ t('kanban.label') }}
          </label>
          <InputText v-model="filterLabel" :placeholder="t('kanban.labelPlaceholder')" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('kanban.dueFrom') }}</label>
          <DatePicker v-model="filterDueFrom" date-format="yy-mm-dd" placeholder="yyyy-mm-dd" class="w-full" show-icon icon-display="input" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('kanban.dueTo') }}</label>
          <DatePicker v-model="filterDueTo" date-format="yy-mm-dd" placeholder="yyyy-mm-dd" class="w-full" show-icon icon-display="input" />
        </div>
        <div class="flex items-end">
          <Button :label="t('kanban.clearFilters')" icon="pi pi-filter-slash" severity="secondary" outlined size="small" class="w-full" @click="clearFilters" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="isError" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-2">
      <p class="text-[var(--text)] font-medium">{{ t('errors.loadFailed') }}</p>
      <p class="text-sm text-[var(--text-muted)]">{{ workItemsErrorHint(workItemsError) }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!allItems || allItems.length === 0" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
      {{ t('kanban.noWorkItems') }}
    </div>

    <!-- Kanban board -->
    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <div
        v-for="col in dynamicColumns"
        :key="col.id"
        class="w-80 shrink-0 rounded-xl border bg-[var(--surface)] flex flex-col"
        :class="columnKindStyle(col.kind).header"
        style="max-height: calc(100vh - 16rem)"
      >
        <!-- Column header -->
        <div class="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full shrink-0" :class="columnKindStyle(col.kind).dot" />
            <div class="min-w-0">
              <h2 class="font-semibold text-sm text-[var(--text)] truncate">{{ col.name }}</h2>
              <p class="text-[10px] text-[var(--text-muted)] truncate">{{ col.boardName }}</p>
            </div>
          </div>
          <span
            class="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
            :class="columnKindStyle(col.kind).badge"
          >{{ itemsByColumnId[col.id]?.length || 0 }}</span>
        </div>

        <!-- Cards -->
        <div class="flex-1 p-2 space-y-2 overflow-y-auto">
          <div v-for="item in itemsByColumnId[col.id]" :key="item.id" class="group relative">
            <!-- Card -->
            <div
              class="w-full text-left rounded-lg border bg-[var(--surface-raised)] p-3 hover:border-[var(--primary)]/40 transition-all cursor-pointer"
              :class="isCardOverdue(item.card, item.columnKind) ? 'border-red-400/60' : 'border-[var(--border)]'"
              @click="openBoard(item)"
            >
              <!-- Title row + AI button -->
              <div class="flex items-start justify-between gap-1 mb-1.5">
                <p class="font-medium text-sm text-[var(--text)] line-clamp-2 flex-1">{{ item.card.title }}</p>
                <!-- AI button — stops propagation so it doesn't open board -->
                <button
                  type="button"
                  class="shrink-0 p-1 rounded-md text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-all"
                  :class="{ '!opacity-100 text-[var(--primary)]': aiLoading && aiSelectedItem?.id === item.id }"
                  :title="'Generar prompt con IA'"
                  @click.stop="generatePrompt(item)"
                >
                  <span v-if="aiLoading && aiSelectedItem?.id === item.id" class="pi pi-spin pi-spinner" style="font-size:13px" />
                  <Sparkles v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Board name badge -->
              <div class="flex items-center gap-1 mb-2">
                <span class="text-[10px] text-[var(--text-muted)] bg-[var(--surface-ground)] border border-[var(--border)] rounded px-1.5 py-0.5 truncate max-w-[180px]">
                  {{ item.boardName }}
                </span>
              </div>

              <!-- Description -->
              <p v-if="item.card.description" class="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">{{ item.card.description }}</p>

              <!-- Client chip -->
              <div v-if="clientName(item.card.clientId)" class="flex items-center gap-1 mb-2">
                <Building2 class="w-3 h-3 text-[var(--primary)] shrink-0" />
                <span class="text-[11px] font-medium text-[var(--primary)] truncate">{{ clientName(item.card.clientId) }}</span>
              </div>

              <!-- Attended badge -->
              <div v-if="item.card.wasOverdue && item.card.attendedAt" class="text-[10px] text-green-600 dark:text-green-400 mb-1.5 flex items-center gap-1">
                <CheckCircle class="w-3 h-3" />
                {{ t('kanban.attended') }}
              </div>

              <!-- Tags row -->
              <div class="flex items-center justify-between gap-1 mt-1">
                <div class="flex flex-wrap gap-1">
                  <Tag v-if="item.card.priority" :severity="prioritySeverity(item.card.priority)" class="text-[10px] !py-0">
                    {{ item.card.priority }}
                  </Tag>

                  <!-- Due date friendly label -->
                  <template v-if="dueFriendlyLabel(item.card, item.columnKind) as { label: string; cls: string } | null">
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                      :class="dueFriendlyLabel(item.card, item.columnKind)!.cls"
                    >
                      <Calendar class="w-2.5 h-2.5" />
                      {{ dueFriendlyLabel(item.card, item.columnKind)!.label }}
                    </span>
                  </template>

                  <Tag v-if="item.checklistProgress" severity="secondary" class="text-[10px] !py-0">
                    ✓ {{ item.checklistProgress }}
                  </Tag>
                  <Tag v-for="lbl in (item.card.labels ?? []).slice(0, 2)" :key="lbl" severity="info" class="text-[10px] !py-0">
                    {{ lbl }}
                  </Tag>
                </div>

                <!-- Assignee avatars -->
                <div v-if="item.card.assigneeIds && item.card.assigneeIds.length > 0" class="flex -space-x-1.5 shrink-0">
                  <div
                    v-for="(uid, idx) in (item.card.assigneeIds || []).slice(0, 3)"
                    :key="uid"
                    :style="{ zIndex: 3 - idx }"
                    class="w-5 h-5 rounded-full bg-[var(--primary)] border-2 border-[var(--surface-raised)] flex items-center justify-center text-[8px] font-bold text-white"
                    :title="item.assigneeNames?.[idx] || ''"
                  >
                    {{ item.assigneeNames?.[idx]?.[0]?.toUpperCase() || '?' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Prompt Dialog -->
    <Dialog v-model:visible="showAiDialog" modal class="w-full max-w-2xl">
      <template #header>
        <div class="flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-[var(--primary)]" />
          <span class="font-semibold text-base">Prompt generado con IA</span>
          <span v-if="aiSelectedItem" class="text-sm text-[var(--text-muted)] font-normal truncate max-w-[200px]">
            — {{ aiSelectedItem.card.title }}
          </span>
        </div>
      </template>

      <div
        class="overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-ground)] p-5 text-sm leading-7 text-[var(--text-color)]"
        style="max-height: 55vh; min-height: 180px;"
      >
        <div v-if="aiLoading" class="flex items-center justify-center py-12 gap-3 text-[var(--text-muted)]">
          <span class="pi pi-spin pi-spinner" />
          Generando prompt…
        </div>
        <div v-else class="prose-ai" v-html="renderAiMarkdown(aiResult)" />
      </div>

      <div class="flex items-center gap-3 pt-4">
        <Button
          severity="secondary"
          outlined
          :loading="aiLoading"
          :disabled="aiLoading || !aiSelectedItem"
          class="flex-1"
          @click="aiSelectedItem && generatePrompt(aiSelectedItem, true)"
        >
          <template #icon><Sparkles class="w-4 h-4 mr-1.5" /></template>
          Más ideas
        </Button>
        <Button
          :severity="aiCopied ? 'success' : 'primary'"
          :disabled="aiLoading"
          class="flex-1"
          @click="copyAiResult"
        >
          <template #icon>
            <component :is="aiCopied ? Check : Copy" class="w-4 h-4 mr-1.5" />
          </template>
          {{ aiCopied ? '¡Copiado!' : 'Copiar al portapapeles' }}
        </Button>
      </div>
    </Dialog>

  </div>
</template>

<style scoped>
.prose-ai :deep(.ai-h1) {
  font-size: 1.1rem; font-weight: 700; color: var(--primary);
  margin-top: 1.25rem; margin-bottom: 0.5rem;
}
.prose-ai :deep(.ai-h2) {
  font-size: 1rem; font-weight: 600; color: var(--text-color);
  margin-top: 1rem; margin-bottom: 0.4rem;
  padding-bottom: 0.2rem; border-bottom: 1px solid var(--border);
}
.prose-ai :deep(.ai-h3) {
  font-size: 0.875rem; font-weight: 600; color: var(--text-color);
  margin-top: 0.75rem; margin-bottom: 0.25rem;
}
.prose-ai :deep(.ai-bold) { font-weight: 600; color: var(--text-color); }
.prose-ai :deep(.ai-num)  { display: flex; gap: 0.5rem; margin-top: 0.35rem; padding-left: 0.25rem; }
.prose-ai :deep(.ai-num-n) { color: var(--primary); font-weight: 700; min-width: 1.25rem; flex-shrink: 0; }
.prose-ai :deep(.ai-bullet) { display: flex; gap: 0.5rem; margin-top: 0.35rem; padding-left: 0.25rem; }
.prose-ai :deep(.ai-bullet-dot) { color: var(--primary); font-weight: 700; flex-shrink: 0; }
.prose-ai :deep(.ai-gap) { height: 0.75rem; }
</style>
