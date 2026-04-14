<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Avatar from 'primevue/avatar'
import {
  Users, Activity, Zap, BarChart2, Navigation, Layout, SquarePlus,
  Columns, ArrowRightLeft, Trash2, CheckSquare, Send, Megaphone,
  MessageSquare, RefreshCw, XCircle, ChevronLeft, ChevronRight
} from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import { activityService } from '@/services/activity.service'
import type { UserActivity, ActivityEventType } from '@/services/activity.service'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
dayjs.locale(locale.value === 'es' ? 'es' : 'en')

// ── State ─────────────────────────────────────────────────────────
const page = ref(0)
const PAGE_SIZE = 30
const dateFrom = ref<Date | null>(null)
const dateTo = ref<Date | null>(null)
const eventTypeFilter = ref<ActivityEventType | undefined>(undefined)

// ── Queries ───────────────────────────────────────────────────────
const queryParams = computed(() => ({
  page: page.value,
  size: PAGE_SIZE,
  eventType: eventTypeFilter.value,
  from: dateFrom.value ? dayjs(dateFrom.value).startOf('day').toISOString() : undefined,
  to: dateTo.value ? dayjs(dateTo.value).endOf('day').toISOString() : undefined,
}))

const { data: activeUsers, isLoading: loadingActive } = useQuery({
  queryKey: ['active-users'],
  queryFn: () => activityService.activeUsers(),
  refetchInterval: 30_000,
  staleTime: 15_000,
})

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['activity-log', queryParams.value]),
  queryFn: () => activityService.query(queryParams.value),
  staleTime: 20_000,
})

// All data for sidebar stats (no eventType / date filter)
const { data: todayResult } = useQuery({
  queryKey: ['activity-today'],
  queryFn: () => activityService.query({
    from: dayjs().startOf('day').toISOString(),
    size: 200,
    page: 0,
  }),
  refetchInterval: 60_000,
  staleTime: 30_000,
})

watch([dateFrom, dateTo, eventTypeFilter], () => { page.value = 0 })

// ── Derived ───────────────────────────────────────────────────────
const logs = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)
const totalPages = computed(() => result.value?.totalPages ?? 0)

/** Group logs by calendar day label */
const groupedLogs = computed(() => {
  const map = new Map<string, UserActivity[]>()
  for (const log of logs.value) {
    const key = dayjs(log.visitedAt).startOf('day').toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: formatDayLabel(key),
    items,
  }))
})

const todayLogs = computed(() => todayResult.value?.content ?? [])

// Unique users active today (15-min window)
const liveUsers = computed(() => {
  const cutoff = dayjs().subtract(15, 'minute')
  const seen = new Map<string, { name: string; email: string }>()
  for (const l of todayLogs.value) {
    if (dayjs(l.visitedAt).isAfter(cutoff)) {
      if (!seen.has(l.userId)) seen.set(l.userId, { name: l.userName, email: l.userEmail })
    }
  }
  return Array.from(seen.values())
})

const todayEventCount = computed(() => todayLogs.value.length)

const todayUniqueUsers = computed(() => {
  return new Set(todayLogs.value.map(l => l.userId)).size
})

// Top 5 pages today (NAVIGATION only)
const topPages = computed(() => {
  const freq = new Map<string, number>()
  for (const l of todayLogs.value) {
    if (l.eventType === 'NAVIGATION') {
      const key = l.pageTitle || l.routePath
      freq.set(key, (freq.get(key) ?? 0) + 1)
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }))
})

const maxPageCount = computed(() => topPages.value[0]?.count ?? 1)

// Top 5 users today
const topUsers = computed(() => {
  const freq = new Map<string, { name: string; count: number }>()
  for (const l of todayLogs.value) {
    if (!freq.has(l.userId)) freq.set(l.userId, { name: l.userName, count: 0 })
    freq.get(l.userId)!.count++
  }
  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

// ── Helpers ───────────────────────────────────────────────────────
function formatDayLabel(isoDate: string): string {
  const d = dayjs(isoDate)
  const today = dayjs().startOf('day')
  if (d.isSame(today)) return t('activity.today')
  if (d.isSame(today.subtract(1, 'day'))) return t('activity.yesterday')
  return d.format('D MMM YYYY')
}

function fromNow(dateStr: string): string {
  return dayjs(dateStr).fromNow()
}

function formatTime(dateStr: string): string {
  return dayjs(dateStr).format('HH:mm')
}

function formatDuration(seconds?: number): string {
  if (!seconds && seconds !== 0) return ''
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Icon + color per action/event
interface ActionMeta {
  icon: unknown
  color: string
  bg: string
  label: string
}

function getActionMeta(log: UserActivity): ActionMeta {
  if (log.eventType === 'NAVIGATION') {
    return { icon: Navigation, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: t('activity.navigation') }
  }
  const a = log.actionName ?? ''
  if (a === 'BOARD_CREATED') return { icon: Layout, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.boardCreated') }
  if (a === 'BOARD_DELETED') return { icon: Trash2, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.boardDeleted') }
  if (a === 'CARD_CREATED') return { icon: SquarePlus, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.cardCreated') }
  if (a === 'CARD_MOVED') return { icon: ArrowRightLeft, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.cardMoved') }
  if (a === 'CARD_DELETED') return { icon: Trash2, color: 'text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.cardDeleted') }
  if (a === 'CHECKLIST_TOGGLED') return { icon: CheckSquare, color: 'text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.checklistToggled') }
  if (a === 'CAMPAIGN_CREATED') return { icon: Megaphone, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', label: t('activity.actions.campaignCreated') }
  if (a === 'CAMPAIGN_SENT') return { icon: Send, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', label: t('activity.actions.campaignSent') }
  if (a === 'CAMPAIGN_DELETED') return { icon: Trash2, color: 'text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', label: t('activity.actions.campaignDeleted') }
  if (a === 'INTERACTION_LOGGED') return { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-950', label: t('activity.actions.interactionLogged') }
  // Generic fallback
  return { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950', label: a.replace(/_/g, ' ') }
}

function getEventLabel(log: UserActivity): string {
  if (log.eventType === 'ACTION' && log.description) return log.description
  if (log.pageTitle) return log.pageTitle
  return log.routePath
}

// ── Pagination ────────────────────────────────────────────────────
function prevPage() { if (page.value > 0) page.value-- }
function nextPage() { if (page.value < totalPages.value - 1) page.value++ }

// ── Filter tabs ───────────────────────────────────────────────────
type Tab = 'all' | 'navigation' | 'action'
const activeTab = ref<Tab>('all')

function setTab(tab: Tab) {
  activeTab.value = tab
  eventTypeFilter.value = tab === 'all' ? undefined : tab.toUpperCase() as ActivityEventType
  page.value = 0
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('activity.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('activity.subtitle') }}</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined :loading="isLoading" @click="refetch()" />
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center shrink-0">
            <Users class="w-4.5 h-4.5 text-green-500" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-[var(--text-muted)] truncate">{{ t('activity.activeUsers') }}</p>
            <p class="text-xl font-bold text-green-500">
              <span v-if="loadingActive">—</span>
              <span v-else>{{ activeUsers ?? liveUsers.length }}</span>
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Activity class="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-[var(--text-muted)] truncate">{{ t('activity.eventsToday') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ todayEventCount }}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center shrink-0">
            <Users class="w-4.5 h-4.5 text-violet-500" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-[var(--text-muted)] truncate">{{ t('activity.uniqueUsersToday') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ todayUniqueUsers }}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <BarChart2 class="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-[var(--text-muted)] truncate">{{ t('activity.totalEvents') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ totalRecords }}</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Segmented tabs -->
      <div class="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
        <button
          v-for="tab in (['all', 'navigation', 'action'] as const)"
          :key="tab"
          class="px-3 py-1.5 transition-colors"
          :class="activeTab === tab
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'"
          @click="setTab(tab)"
        >
          {{ t('activity.tab.' + tab) }}
        </button>
      </div>

      <!-- Date range -->
      <DatePicker
        v-model="dateFrom"
        :placeholder="t('audit.filterFrom')"
        show-icon
        date-format="dd M yy"
        class="flex-1 min-w-[140px]"
      />
      <DatePicker
        v-model="dateTo"
        :placeholder="t('audit.filterTo')"
        show-icon
        date-format="dd M yy"
        class="flex-1 min-w-[140px]"
      />
      <Button
        icon="pi pi-times"
        severity="secondary"
        outlined
        :disabled="!dateFrom && !dateTo && activeTab === 'all'"
        @click="dateFrom = null; dateTo = null; setTab('all')"
      />
    </div>

    <!-- Error -->
    <div
      v-if="isError"
      class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between"
    >
      <span>{{ t('activity.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Main two-column layout -->
    <div class="flex gap-5 items-start">

      <!-- Timeline (left, ~70%) -->
      <div class="flex-1 min-w-0 space-y-6">

        <!-- Loading skeleton -->
        <div v-if="isLoading && !result" class="space-y-4">
          <div v-for="i in 8" :key="i" class="flex gap-3 animate-pulse">
            <div class="w-8 h-8 rounded-full bg-[var(--surface-hover)] shrink-0 mt-0.5" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 rounded bg-[var(--surface-hover)] w-1/3" />
              <div class="h-3 rounded bg-[var(--surface-hover)] w-2/3" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="!isLoading && logs.length === 0" class="text-center py-16 text-[var(--text-muted)]">
          <Activity class="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{{ t('activity.noData') }}</p>
        </div>

        <!-- Grouped by day -->
        <template v-else>
          <div v-for="group in groupedLogs" :key="group.label" class="space-y-2">
            <!-- Day separator -->
            <div class="flex items-center gap-2 text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wide">
              <span>{{ group.label }}</span>
              <div class="flex-1 h-px bg-[var(--border)]" />
            </div>

            <!-- Events -->
            <div class="space-y-1">
              <div
                v-for="log in group.items"
                :key="log.id"
                class="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-hover)] transition-colors group"
              >
                <!-- Avatar -->
                <Avatar
                  :label="getInitials(log.userName)"
                  shape="circle"
                  size="normal"
                  class="shrink-0 text-xs font-semibold mt-0.5"
                />

                <!-- Action icon -->
                <div
                  class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  :class="getActionMeta(log).bg"
                >
                  <component :is="getActionMeta(log).icon" class="w-3.5 h-3.5" :class="getActionMeta(log).color" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-medium text-[var(--text)]">{{ log.userName }}</span>
                    <!-- Badge -->
                    <span
                      class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      :class="log.eventType === 'NAVIGATION'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400'"
                    >
                      {{ getActionMeta(log).label }}
                    </span>
                    <!-- Duration chip (navigation) -->
                    <span
                      v-if="log.eventType === 'NAVIGATION' && log.durationSeconds"
                      class="text-xs text-[var(--text-muted)] flex items-center gap-1"
                    >
                      <component :is="'span'" class="opacity-60">·</component>
                      {{ formatDuration(log.durationSeconds) }}
                    </span>
                    <!-- Entity chip (action) -->
                    <span
                      v-if="log.eventType === 'ACTION' && log.entityType"
                      class="text-xs text-[var(--text-muted)]"
                    >
                      <component :is="'span'" class="opacity-60">·</component>
                      {{ log.entityType }}
                    </span>
                  </div>
                  <p class="text-xs text-[var(--text-muted)] truncate mt-0.5">{{ getEventLabel(log) }}</p>
                </div>

                <!-- Time -->
                <div class="text-xs text-[var(--text-muted)] shrink-0 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {{ formatTime(log.visitedAt) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between pt-2">
            <span class="text-xs text-[var(--text-muted)]">
              {{ t('activity.pageOf', { current: page + 1, total: totalPages }) }}
            </span>
            <div class="flex gap-2">
              <Button size="small" severity="secondary" outlined :disabled="page === 0" @click="prevPage">
                <template #icon><ChevronLeft class="w-4 h-4" /></template>
              </Button>
              <Button size="small" severity="secondary" outlined :disabled="page >= totalPages - 1" @click="nextPage">
                <template #icon><ChevronRight class="w-4 h-4" /></template>
              </Button>
            </div>
          </div>
        </template>
      </div>

      <!-- Sidebar (right, ~30%) — only on md+ -->
      <aside class="hidden lg:flex flex-col gap-4 w-72 shrink-0 sticky top-4">

        <!-- Live users -->
        <Card>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.liveUsers') }}</span>
            <span class="flex items-center gap-1 text-xs text-green-500">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {{ t('activity.live') }}
            </span>
          </div>
          <div v-if="liveUsers.length === 0" class="text-xs text-[var(--text-muted)] py-2 text-center">
            {{ t('activity.noLiveUsers') }}
          </div>
          <div v-else class="space-y-2">
            <div v-for="u in liveUsers.slice(0, 8)" :key="u.email" class="flex items-center gap-2">
              <div class="relative shrink-0">
                <Avatar :label="getInitials(u.name)" shape="circle" size="small" class="text-xs font-semibold" />
                <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--surface)]" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium text-[var(--text)] truncate">{{ u.name }}</p>
                <p class="text-xs text-[var(--text-muted)] truncate">{{ u.email }}</p>
              </div>
            </div>
          </div>
        </Card>

        <!-- Top pages today -->
        <Card>
          <div class="mb-3">
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.topPagesToday') }}</span>
          </div>
          <div v-if="topPages.length === 0" class="text-xs text-[var(--text-muted)] py-2 text-center">—</div>
          <div v-else class="space-y-2">
            <div v-for="p in topPages" :key="p.label" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-[var(--text)] truncate max-w-[170px]">{{ p.label }}</span>
                <span class="text-[var(--text-muted)] shrink-0 ml-2">{{ p.count }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all"
                  :style="{ width: `${Math.round((p.count / maxPageCount) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </Card>

        <!-- Top users today -->
        <Card>
          <div class="mb-3">
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.topUsersToday') }}</span>
          </div>
          <div v-if="topUsers.length === 0" class="text-xs text-[var(--text-muted)] py-2 text-center">—</div>
          <div v-else class="space-y-2">
            <div v-for="u in topUsers" :key="u.name" class="flex items-center gap-2">
              <Avatar :label="getInitials(u.name)" shape="circle" size="small" class="text-xs font-semibold shrink-0" />
              <span class="text-xs text-[var(--text)] flex-1 truncate">{{ u.name }}</span>
              <span class="text-xs font-semibold text-[var(--text-muted)] shrink-0">{{ u.count }}</span>
            </div>
          </div>
        </Card>

      </aside>
    </div>
  </div>
</template>
