<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import {
  Users, Activity, Zap, BarChart2, Navigation, Layout, SquarePlus,
  ArrowRightLeft, Trash2, CheckSquare, Send, Megaphone, MessageSquare,
  ChevronLeft, ChevronRight
} from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import AppAvatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
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
const activeTab = ref<'all' | 'navigation' | 'action'>('all')

watch([dateFrom, dateTo, activeTab], () => { page.value = 0 })

const eventTypeFilter = computed<ActivityEventType | undefined>(() =>
  activeTab.value === 'all' ? undefined : activeTab.value.toUpperCase() as ActivityEventType
)

// ── Queries ───────────────────────────────────────────────────────
const queryParams = computed(() => ({
  page: page.value,
  size: PAGE_SIZE,
  eventType: eventTypeFilter.value,
  from: dateFrom.value ? dayjs(dateFrom.value).startOf('day').toISOString() : undefined,
  to: dateTo.value ? dayjs(dateTo.value).endOf('day').toISOString() : undefined,
}))

const { data: activeUsersCount } = useQuery({
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

// Sidebar data: today's full feed (no type filter)
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

// ── Derived ───────────────────────────────────────────────────────
const logs = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)
const totalPages = computed(() => result.value?.totalPages ?? 0)
const todayLogs = computed(() => todayResult.value?.content ?? [])

const groupedLogs = computed(() => {
  const map = new Map<string, UserActivity[]>()
  for (const log of logs.value) {
    const key = dayjs(log.visitedAt).format('YYYY-MM-DD')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: formatDayLabel(key),
    items,
  }))
})

const liveUsers = computed(() => {
  const cutoff = dayjs().subtract(15, 'minute')
  const seen = new Map<string, { name: string; email: string }>()
  for (const l of todayLogs.value) {
    if (dayjs(l.visitedAt).isAfter(cutoff) && !seen.has(l.userId)) {
      seen.set(l.userId, { name: l.userName, email: l.userEmail })
    }
  }
  return Array.from(seen.values())
})

const todayUniqueUsers = computed(() => new Set(todayLogs.value.map(l => l.userId)).size)

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

const topUsers = computed(() => {
  const freq = new Map<string, { name: string; count: number }>()
  for (const l of todayLogs.value) {
    if (!freq.has(l.userId)) freq.set(l.userId, { name: l.userName, count: 0 })
    freq.get(l.userId)!.count++
  }
  return Array.from(freq.values()).sort((a, b) => b.count - a.count).slice(0, 5)
})

// ── Helpers ───────────────────────────────────────────────────────
function formatDayLabel(dateKey: string): string {
  const d = dayjs(dateKey)
  const today = dayjs().startOf('day')
  if (d.isSame(today, 'day')) return t('activity.today')
  if (d.isSame(today.subtract(1, 'day'), 'day')) return t('activity.yesterday')
  return d.format('D MMM YYYY')
}

function formatTime(dateStr: string): string {
  return dayjs(dateStr).format('HH:mm')
}

function formatDuration(s?: number): string {
  if (!s) return ''
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

interface ActionMeta { icon: unknown; color: string; bg: string; label: string }

function getMeta(log: UserActivity): ActionMeta {
  if (log.eventType === 'NAVIGATION') {
    return { icon: Navigation, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: t('activity.navigation') }
  }
  const map: Record<string, ActionMeta> = {
    BOARD_CREATED:     { icon: Layout,         color: 'text-violet-500',  bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.boardCreated') },
    BOARD_DELETED:     { icon: Trash2,          color: 'text-violet-400',  bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.boardDeleted') },
    CARD_CREATED:      { icon: SquarePlus,      color: 'text-violet-500',  bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.cardCreated') },
    CARD_MOVED:        { icon: ArrowRightLeft,  color: 'text-violet-500',  bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.cardMoved') },
    CARD_DELETED:      { icon: Trash2,          color: 'text-violet-400',  bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.cardDeleted') },
    CHECKLIST_TOGGLED: { icon: CheckSquare,     color: 'text-violet-400',  bg: 'bg-violet-100 dark:bg-violet-950', label: t('activity.actions.checklistToggled') },
    CAMPAIGN_CREATED:  { icon: Megaphone,       color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', label: t('activity.actions.campaignCreated') },
    CAMPAIGN_SENT:     { icon: Send,            color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', label: t('activity.actions.campaignSent') },
    CAMPAIGN_DELETED:  { icon: Trash2,          color: 'text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', label: t('activity.actions.campaignDeleted') },
    INTERACTION_LOGGED:{ icon: MessageSquare,   color: 'text-orange-500',  bg: 'bg-orange-100 dark:bg-orange-950', label: t('activity.actions.interactionLogged') },
  }
  return map[log.actionName ?? ''] ?? { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950', label: log.actionName?.replace(/_/g, ' ') ?? 'Action' }
}

function getLabel(log: UserActivity): string {
  if (log.eventType === 'ACTION' && log.description) return log.description
  return log.pageTitle || log.routePath
}

const hasActiveFilters = computed(() => !!(dateFrom.value || dateTo.value || activeTab.value !== 'all'))

function clearFilters() {
  dateFrom.value = null
  dateTo.value = null
  activeTab.value = 'all'
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

    <!-- Stats row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center shrink-0">
            <Users class="w-4.5 h-4.5 text-green-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.activeUsers') }}</p>
            <p class="text-xl font-bold text-green-500">{{ activeUsersCount ?? liveUsers.length }}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Activity class="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.eventsToday') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ todayLogs.length }}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center shrink-0">
            <Users class="w-4.5 h-4.5 text-violet-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.uniqueUsersToday') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ todayUniqueUsers }}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <BarChart2 class="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.totalEvents') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ totalRecords }}</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Segmented tabs -->
      <div class="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm bg-[var(--surface)]">
        <button
          v-for="tab in (['all', 'navigation', 'action'] as const)"
          :key="tab"
          class="px-3.5 py-1.5 font-medium transition-colors"
          :class="activeTab === tab
            ? 'bg-[var(--primary)] text-white'
            : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'"
          @click="activeTab = tab"
        >
          {{ t('activity.tab.' + tab) }}
        </button>
      </div>

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
      <button
        v-if="hasActiveFilters"
        class="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--text-muted)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
        @click="clearFilters"
      >
        <span>{{ t('audit.clearFilters') }}</span>
      </button>
    </div>

    <!-- Error banner -->
    <div
      v-if="isError"
      class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3"
    >
      <span>{{ t('activity.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Two-column layout -->
    <div class="flex gap-5 items-start">

      <!-- ── Timeline (left) ───────────────────────────────────── -->
      <div class="flex-1 min-w-0 space-y-1">

        <!-- Loading skeleton -->
        <template v-if="isLoading && !result">
          <div v-for="i in 10" :key="i" class="flex gap-3 px-3 py-3 animate-pulse">
            <div class="w-9 h-9 rounded-full bg-[var(--surface-hover)] shrink-0" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-3 rounded bg-[var(--surface-hover)] w-1/4" />
              <div class="h-3 rounded bg-[var(--surface-hover)] w-1/2" />
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <EmptyState
          v-else-if="!isLoading && logs.length === 0"
          :title="t('activity.noData')"
          :description="hasActiveFilters ? t('activity.noDataFiltered') : undefined"
        >
          <template #icon><Activity class="w-6 h-6" /></template>
        </EmptyState>

        <!-- Day groups -->
        <template v-else>
          <div v-for="group in groupedLogs" :key="group.label" class="space-y-0.5">
            <!-- Day header -->
            <div class="flex items-center gap-3 px-3 py-2">
              <span class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{{ group.label }}</span>
              <div class="flex-1 h-px bg-[var(--border)]" />
              <span class="text-xs text-[var(--text-muted)]">{{ group.items.length }}</span>
            </div>

            <!-- Events -->
            <div
              v-for="log in group.items"
              :key="log.id"
              class="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group cursor-default"
            >
              <!-- User avatar -->
              <AppAvatar :name="log.userName || '?'" size="sm" class="shrink-0 mt-0.5" />

              <!-- Action icon -->
              <div
                class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                :class="getMeta(log).bg"
              >
                <component :is="getMeta(log).icon" class="w-3.5 h-3.5" :class="getMeta(log).color" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span class="text-sm font-medium text-[var(--text)]">{{ log.userName }}</span>
                  <span
                    class="text-[11px] px-1.5 py-0.5 rounded-full font-medium leading-none"
                    :class="log.eventType === 'NAVIGATION'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400'"
                  >{{ getMeta(log).label }}</span>
                  <span v-if="log.eventType === 'NAVIGATION' && log.durationSeconds" class="text-xs text-[var(--text-muted)]">
                    {{ formatDuration(log.durationSeconds) }}
                  </span>
                  <span v-if="log.eventType === 'ACTION' && log.entityType" class="text-xs text-[var(--text-muted)]">
                    {{ log.entityType }}
                  </span>
                </div>
                <p class="text-xs text-[var(--text-muted)] truncate mt-0.5">{{ getLabel(log) }}</p>
              </div>

              <!-- Time -->
              <span class="text-xs text-[var(--text-muted)] shrink-0 mt-1 tabular-nums">{{ formatTime(log.visitedAt) }}</span>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between pt-3 px-3">
            <span class="text-xs text-[var(--text-muted)]">
              {{ t('activity.pageOf', { current: page + 1, total: Math.max(totalPages, 1) }) }}
              &mdash; {{ totalRecords }} {{ t('activity.totalEventsLabel') }}
            </span>
            <div class="flex gap-1">
              <button
                class="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="page === 0"
                @click="page--"
              >
                <ChevronLeft class="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              <button
                class="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="page >= totalPages - 1"
                @click="page++"
              >
                <ChevronRight class="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- ── Sidebar (right, sticky) ───────────────────────────── -->
      <aside class="hidden lg:flex flex-col gap-4 w-64 shrink-0 sticky top-4">

        <!-- Live users now -->
        <Card>
          <template #header>
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.liveUsers') }}</span>
            <div class="flex items-center gap-1.5 text-xs text-green-500 font-medium">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {{ t('activity.live') }}
            </div>
          </template>
          <div v-if="liveUsers.length === 0" class="text-xs text-[var(--text-muted)] text-center py-3">
            {{ t('activity.noLiveUsers') }}
          </div>
          <div v-else class="space-y-2.5">
            <div v-for="u in liveUsers.slice(0, 6)" :key="u.email" class="flex items-center gap-2.5">
              <div class="relative shrink-0">
                <AppAvatar :name="u.name" size="sm" />
                <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--surface)]" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium text-[var(--text)] truncate">{{ u.name }}</p>
                <p class="text-[11px] text-[var(--text-muted)] truncate">{{ u.email }}</p>
              </div>
            </div>
          </div>
        </Card>

        <!-- Top pages today -->
        <Card>
          <template #header>
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.topPagesToday') }}</span>
          </template>
          <div v-if="topPages.length === 0" class="text-xs text-[var(--text-muted)] text-center py-3">—</div>
          <div v-else class="space-y-3">
            <div v-for="p in topPages" :key="p.label" class="space-y-1">
              <div class="flex justify-between items-center gap-2 text-xs">
                <span class="text-[var(--text)] truncate">{{ p.label }}</span>
                <span class="text-[var(--text-muted)] tabular-nums shrink-0">{{ p.count }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                <div
                  class="h-full rounded-full bg-blue-500"
                  :style="{ width: `${Math.round((p.count / maxPageCount) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </Card>

        <!-- Top users today -->
        <Card>
          <template #header>
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.topUsersToday') }}</span>
          </template>
          <div v-if="topUsers.length === 0" class="text-xs text-[var(--text-muted)] text-center py-3">—</div>
          <div v-else class="space-y-2.5">
            <div v-for="(u, i) in topUsers" :key="u.name" class="flex items-center gap-2.5">
              <span class="text-xs font-semibold text-[var(--text-muted)] w-4 tabular-nums shrink-0">{{ i + 1 }}</span>
              <AppAvatar :name="u.name" size="sm" />
              <span class="text-xs text-[var(--text)] flex-1 truncate">{{ u.name }}</span>
              <span class="text-xs font-semibold text-[var(--text-muted)] shrink-0 tabular-nums">{{ u.count }}</span>
            </div>
          </div>
        </Card>

      </aside>
    </div>
  </div>
</template>
