<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import {
  Users, Activity, BarChart2, Navigation, Layout, SquarePlus,
  ArrowRightLeft, Trash2, CheckSquare, Send, Megaphone,
  MessageSquare, ChevronLeft, ChevronRight, Zap, Clock
} from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import AppAvatar from '@/components/ui/Avatar.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { activityService } from '@/services/activity.service'
import type { UserActivity, ActivityEventType } from '@/services/activity.service'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
watch(locale, (loc) => dayjs.locale(loc === 'es' ? 'es' : 'en'), { immediate: true })

// ── State ─────────────────────────────────────────────────────────
const page = ref(0)
const PAGE_SIZE = 40
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
    key,
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
const todayActionCount = computed(() => todayLogs.value.filter(l => l.eventType === 'ACTION').length)

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
  return d.format('dddd, D MMM')
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

interface ActionMeta { icon: unknown; color: string; dot: string; badgeBg: string; badgeText: string; label: string }

const ACTION_MAP: Record<string, Omit<ActionMeta, 'label'>> = {
  BOARD_CREATED:      { icon: Layout,        color: 'text-violet-500', dot: 'bg-violet-500', badgeBg: 'bg-violet-100 dark:bg-violet-950', badgeText: 'text-violet-600 dark:text-violet-300' },
  BOARD_DELETED:      { icon: Trash2,         color: 'text-red-400',   dot: 'bg-red-400',    badgeBg: 'bg-red-100 dark:bg-red-950',       badgeText: 'text-red-600 dark:text-red-300' },
  CARD_CREATED:       { icon: SquarePlus,     color: 'text-violet-500', dot: 'bg-violet-500', badgeBg: 'bg-violet-100 dark:bg-violet-950', badgeText: 'text-violet-600 dark:text-violet-300' },
  CARD_MOVED:         { icon: ArrowRightLeft, color: 'text-indigo-500', dot: 'bg-indigo-500', badgeBg: 'bg-indigo-100 dark:bg-indigo-950', badgeText: 'text-indigo-600 dark:text-indigo-300' },
  CARD_DELETED:       { icon: Trash2,         color: 'text-red-400',   dot: 'bg-red-400',    badgeBg: 'bg-red-100 dark:bg-red-950',       badgeText: 'text-red-600 dark:text-red-300' },
  CHECKLIST_TOGGLED:  { icon: CheckSquare,    color: 'text-violet-400', dot: 'bg-violet-400', badgeBg: 'bg-violet-100 dark:bg-violet-950', badgeText: 'text-violet-600 dark:text-violet-300' },
  CAMPAIGN_CREATED:   { icon: Megaphone,      color: 'text-emerald-500',dot: 'bg-emerald-500',badgeBg: 'bg-emerald-100 dark:bg-emerald-950',badgeText: 'text-emerald-600 dark:text-emerald-300' },
  CAMPAIGN_SENT:      { icon: Send,           color: 'text-emerald-500',dot: 'bg-emerald-500',badgeBg: 'bg-emerald-100 dark:bg-emerald-950',badgeText: 'text-emerald-600 dark:text-emerald-300' },
  CAMPAIGN_DELETED:   { icon: Trash2,         color: 'text-red-400',   dot: 'bg-red-400',    badgeBg: 'bg-red-100 dark:bg-red-950',       badgeText: 'text-red-600 dark:text-red-300' },
  INTERACTION_LOGGED: { icon: MessageSquare,  color: 'text-orange-500', dot: 'bg-orange-500', badgeBg: 'bg-orange-100 dark:bg-orange-950', badgeText: 'text-orange-600 dark:text-orange-300' },
}

const NAV_META: Omit<ActionMeta, 'label'> = {
  icon: Navigation,
  color: 'text-blue-400',
  dot: 'bg-slate-300 dark:bg-slate-600',
  badgeBg: 'bg-slate-100 dark:bg-slate-800',
  badgeText: 'text-slate-500 dark:text-slate-400',
}

function getMeta(log: UserActivity): ActionMeta {
  if (log.eventType === 'NAVIGATION') {
    return { ...NAV_META, label: t('activity.navigation') }
  }
  const base = ACTION_MAP[log.actionName ?? ''] ?? {
    icon: Zap, color: 'text-blue-500', dot: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-950', badgeText: 'text-blue-600 dark:text-blue-300',
  }
  const labelKey = `activity.actions.${camelCase(log.actionName ?? '')}`
  return { ...base, label: t(labelKey, log.actionName?.replace(/_/g, ' ') ?? 'Action') }
}

function camelCase(s: string): string {
  return s.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
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
  <div class="space-y-6">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <div>
          <h1 class="text-xl font-semibold text-[var(--text)]">{{ t('activity.title') }}</h1>
          <p class="text-sm text-[var(--text-muted)] mt-0.5">{{ t('activity.subtitle') }}</p>
        </div>
        <PageInfoButton :title="t('activity.title')" :description="t('pageInfo.activity')" />
      </div>
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        size="small"
        :loading="isLoading"
        @click="refetch()"
      />
    </div>

    <!-- ── Stats ────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Active now -->
      <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4">
        <div class="flex items-start justify-between mb-3">
          <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{{ t('activity.activeUsers') }}</p>
          <div class="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/60 flex items-center justify-center">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
        <p class="text-2xl font-bold text-[var(--text)]">{{ activeUsersCount ?? liveUsers.length }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('activity.last15min') }}</p>
      </div>

      <!-- Events today -->
      <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4">
        <div class="flex items-start justify-between mb-3">
          <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{{ t('activity.eventsToday') }}</p>
          <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
            <Activity class="w-4 h-4 text-blue-500" />
          </div>
        </div>
        <p class="text-2xl font-bold text-[var(--text)]">{{ todayLogs.length }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ todayActionCount }} {{ t('activity.actions') }}</p>
      </div>

      <!-- Unique users -->
      <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4">
        <div class="flex items-start justify-between mb-3">
          <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{{ t('activity.uniqueUsersToday') }}</p>
          <div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center">
            <Users class="w-4 h-4 text-violet-500" />
          </div>
        </div>
        <p class="text-2xl font-bold text-[var(--text)]">{{ todayUniqueUsers }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('activity.uniqueDesc') }}</p>
      </div>

      <!-- Total in view -->
      <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4">
        <div class="flex items-start justify-between mb-3">
          <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{{ t('activity.totalEvents') }}</p>
          <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
            <BarChart2 class="w-4 h-4 text-amber-500" />
          </div>
        </div>
        <p class="text-2xl font-bold text-[var(--text)]">{{ totalRecords }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('activity.allTime') }}</p>
      </div>
    </div>

    <!-- ── Filters ───────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Tabs -->
      <div class="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
        <button
          v-for="tab in (['all', 'navigation', 'action'] as const)"
          :key="tab"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === tab
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'"
          @click="activeTab = tab"
        >
          {{ t('activity.tab.' + tab) }}
        </button>
      </div>

      <div class="flex flex-1 items-center gap-2 min-w-0">
        <DatePicker
          v-model="dateFrom"
          :placeholder="t('audit.filterFrom')"
          show-icon
          date-format="dd M yy"
          class="flex-1 min-w-[130px]"
        />
        <DatePicker
          v-model="dateTo"
          :placeholder="t('audit.filterTo')"
          show-icon
          date-format="dd M yy"
          class="flex-1 min-w-[130px]"
        />
      </div>

      <button
        v-if="hasActiveFilters"
        class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-muted)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors whitespace-nowrap"
        @click="clearFilters"
      >
        {{ t('audit.clearFilters') }}
      </button>
    </div>

    <!-- ── Error ─────────────────────────────────────────────────── -->
    <div
      v-if="isError"
      class="flex items-center justify-between gap-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3"
    >
      <p class="text-sm text-red-600 dark:text-red-400">{{ t('activity.loadFailed') }}</p>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- ── Main content ──────────────────────────────────────────── -->
    <div class="flex gap-6 items-start">

      <!-- Timeline -->
      <div class="flex-1 min-w-0">

        <!-- Skeleton -->
        <div v-if="isLoading && !result" class="space-y-0">
          <div v-for="i in 12" :key="i" class="flex gap-3 py-3 animate-pulse">
            <div class="w-8 h-8 rounded-full bg-[var(--surface-hover)] shrink-0" />
            <div class="flex-1 pt-1 space-y-2">
              <div class="h-3 bg-[var(--surface-hover)] rounded w-1/3" />
              <div class="h-3 bg-[var(--surface-hover)] rounded w-2/3" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="!isLoading && logs.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-14 h-14 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mb-4">
            <Activity class="w-7 h-7 text-[var(--text-muted)]" />
          </div>
          <p class="text-sm font-medium text-[var(--text)]">{{ t('activity.noData') }}</p>
          <p v-if="hasActiveFilters" class="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{{ t('activity.noDataFiltered') }}</p>
        </div>

        <!-- Feed -->
        <div v-else class="space-y-8">
          <div v-for="group in groupedLogs" :key="group.key">

            <!-- Day label -->
            <div class="flex items-center gap-3 mb-3">
              <span class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">{{ group.label }}</span>
              <div class="flex-1 h-px bg-[var(--border)]" />
              <span class="text-xs text-[var(--text-muted)]">{{ group.items.length }}</span>
            </div>

            <!-- Events list with connecting line -->
            <div class="relative">
              <!-- Vertical connector line -->
              <div class="absolute left-[15px] top-4 bottom-4 w-px bg-[var(--border)]" />

              <div class="space-y-1">
                <div
                  v-for="log in group.items"
                  :key="log.id"
                  class="relative flex items-start gap-3 pl-2 pr-3 py-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition-colors cursor-default group"
                >
                  <!-- Dot on the line -->
                  <div
                    class="relative z-10 w-4 h-4 rounded-full border-2 border-[var(--surface)] flex items-center justify-center shrink-0 mt-1"
                    :class="getMeta(log).dot"
                  />

                  <!-- User avatar -->
                  <AppAvatar :name="log.userName || '?'" size="sm" class="shrink-0 mt-0" />

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                      <span class="text-sm font-semibold text-[var(--text)]">{{ log.userName }}</span>
                      <!-- Badge -->
                      <span
                        class="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                        :class="[getMeta(log).badgeBg, getMeta(log).badgeText]"
                      >
                        <component :is="getMeta(log).icon" class="w-3 h-3" />
                        {{ getMeta(log).label }}
                      </span>
                    </div>
                    <p class="text-xs text-[var(--text-muted)] mt-0.5 truncate">{{ getLabel(log) }}</p>

                    <!-- Meta chips -->
                    <div class="flex items-center gap-3 mt-1">
                      <span v-if="log.eventType === 'NAVIGATION' && log.durationSeconds" class="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <Clock class="w-3 h-3" />
                        {{ formatDuration(log.durationSeconds) }}
                      </span>
                      <span v-if="log.eventType === 'ACTION' && log.entityType" class="text-[11px] text-[var(--text-muted)]">
                        {{ log.entityType }}
                      </span>
                    </div>
                  </div>

                  <!-- Timestamp -->
                  <time class="text-xs text-[var(--text-muted)] shrink-0 mt-1 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ formatTime(log.visitedAt) }}
                  </time>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <p class="text-xs text-[var(--text-muted)]">
              {{ t('activity.pageOf', { current: page + 1, total: Math.max(totalPages, 1) }) }}
              <span class="mx-1">·</span>
              {{ totalRecords.toLocaleString() }} {{ t('activity.totalEventsLabel') }}
            </p>
            <div class="flex gap-1">
              <button
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="page === 0"
                @click="page--"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="page >= totalPages - 1"
                @click="page++"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sidebar ────────────────────────────────────────────── -->
      <aside class="hidden lg:flex flex-col gap-4 w-60 xl:w-64 shrink-0 sticky top-4">

        <!-- Live right now -->
        <Card>
          <template #header>
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.liveUsers') }}</span>
            <div class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span class="text-xs font-medium text-green-500">{{ t('activity.live') }}</span>
            </div>
          </template>
          <div v-if="liveUsers.length === 0" class="text-xs text-[var(--text-muted)] text-center py-4">
            {{ t('activity.noLiveUsers') }}
          </div>
          <div v-else class="space-y-3">
            <div v-for="u in liveUsers.slice(0, 6)" :key="u.email" class="flex items-center gap-2.5">
              <div class="relative shrink-0">
                <AppAvatar :name="u.name" size="sm" />
                <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--surface)]" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium text-[var(--text)] truncate leading-tight">{{ u.name }}</p>
                <p class="text-[11px] text-[var(--text-muted)] truncate">{{ u.email }}</p>
              </div>
            </div>
          </div>
        </Card>

        <!-- Top pages -->
        <Card>
          <template #header>
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.topPagesToday') }}</span>
          </template>
          <div v-if="topPages.length === 0" class="text-xs text-[var(--text-muted)] text-center py-4">—</div>
          <div v-else class="space-y-3">
            <div v-for="p in topPages" :key="p.label">
              <div class="flex justify-between items-baseline text-xs mb-1">
                <span class="text-[var(--text)] truncate max-w-[150px] xl:max-w-[170px]">{{ p.label }}</span>
                <span class="text-[var(--text-muted)] tabular-nums ml-2 shrink-0">{{ p.count }}</span>
              </div>
              <div class="h-1 rounded-full bg-[var(--border)]">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-500"
                  :style="{ width: `${Math.round((p.count / maxPageCount) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </Card>

        <!-- Top users -->
        <Card>
          <template #header>
            <span class="text-sm font-semibold text-[var(--text)]">{{ t('activity.topUsersToday') }}</span>
          </template>
          <div v-if="topUsers.length === 0" class="text-xs text-[var(--text-muted)] text-center py-4">—</div>
          <div v-else class="space-y-3">
            <div v-for="(u, i) in topUsers" :key="u.name" class="flex items-center gap-2">
              <span class="text-xs font-bold text-[var(--text-muted)] w-4 shrink-0 tabular-nums">{{ i + 1 }}</span>
              <AppAvatar :name="u.name" size="sm" class="shrink-0" />
              <span class="text-xs text-[var(--text)] flex-1 truncate">{{ u.name }}</span>
              <span class="text-xs font-semibold text-[var(--text-muted)] shrink-0 tabular-nums">{{ u.count }}</span>
            </div>
          </div>
        </Card>

      </aside>
    </div>

  </div>
</template>
