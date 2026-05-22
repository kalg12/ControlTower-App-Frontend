<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import Tag from 'primevue/tag'
import { dashboardService } from '@/services/dashboard.service'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { RefreshCw, AlertCircle } from 'lucide-vue-next'
import type { ApexOptions } from 'apexcharts'
import {
  Building2,
  MessageSquare,
  Activity,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  TimerIcon,
  ShieldCheckIcon,
  type LucideIcon
} from 'lucide-vue-next'
import { useTimeAnalytics } from '@/queries/time-tracking'
import { formatMinutes } from '@/types/time-tracking'
import 'dayjs/locale/es'

const { t, locale } = useI18n()

dayjs.extend(relativeTime)
watch(locale, (loc) => {
  dayjs.locale(loc === 'es' ? 'es' : 'en')
}, { immediate: true })

const router = useRouter()

const { data, isLoading, isError, refetch, isFetching } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => dashboardService.getDashboard(),
  staleTime: 30000,
  refetchInterval: 60000
})

// Branch Health — Donut chart (ApexCharts)
const healthDonutSeries = computed(() => {
  const up = data.value?.branchesUp ?? 0
  const deg = data.value?.branchesDegraded ?? 0
  const down = data.value?.branchesDown ?? 0
  return (up + deg + down === 0) ? [1, 0, 0] : [up, deg, down]
})

const healthDonutOptions = computed<ApexOptions>(() => ({
  chart: { type: 'donut', background: 'transparent', toolbar: { show: false } },
  labels: [t('dashboard.chartUp'), t('dashboard.chartDegraded'), t('dashboard.chartDown')],
  colors: ['#22c55e', '#f59e0b', '#ef4444'],
  legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit' },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: { donut: { size: '65%', labels: {
      show: true,
      total: {
        show: true,
        label: t('dashboard.chartTotal'),
        formatter: () => String(data.value?.activeBranches ?? 0)
      }
    } } }
  },
  stroke: { width: 0 },
  tooltip: { theme: 'dark' },
  states: { hover: { filter: { type: 'none' as const } } },
  noData: { text: t('dashboard.noData'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

// Ticket breakdown — Radial bar chart
const ticketRadialSeries = computed(() => {
  const total = (data.value?.openTickets ?? 0) + (data.value?.ticketsInProgress ?? 0)
  if (!total) return [0, 0]
  return [
    Math.round(((data.value?.openTickets ?? 0) / total) * 100),
    Math.round(((data.value?.ticketsInProgress ?? 0) / total) * 100)
  ]
})

const ticketRadialOptions = computed<ApexOptions>(() => ({
  chart: { type: 'radialBar', background: 'transparent', toolbar: { show: false } },
  labels: [t('dashboard.chartOpen'), t('dashboard.chartInProgress')],
  colors: ['#6366f1', '#f59e0b'],
  legend: { show: true, position: 'bottom', fontSize: '12px', fontFamily: 'inherit' },
  plotOptions: {
    radialBar: {
      hollow: { size: '40%' },
      track: { background: 'var(--surface-raised, #f0f0f0)', strokeWidth: '100%' },
      dataLabels: {
        name: { fontSize: '12px', fontFamily: 'inherit' },
        value: { fontSize: '14px', fontFamily: 'inherit', fontWeight: 600 }
      }
    }
  },
  tooltip: { theme: 'dark' },
  states: { hover: { filter: { type: 'none' as const } } },
  noData: { text: t('dashboard.noTickets'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

// License breakdown — bar chart
const licenseBarSeries = computed(() => [{
  name: t('dashboard.licenses'),
  data: [
    data.value?.activeLicenses ?? 0,
    data.value?.trialLicenses ?? 0,
    data.value?.expiredLicenses ?? 0
  ]
}])

const licenseBarOptions = computed<ApexOptions>(() => ({
  chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
  xaxis: {
    categories: [t('dashboard.chartActive'), t('dashboard.chartTrial'), t('dashboard.chartExpired')],
    labels: { style: { fontFamily: 'inherit', fontSize: '12px' } }
  },
  yaxis: { labels: { style: { fontFamily: 'inherit' } }, show: false },
  colors: ['#22c55e', '#6366f1', '#ef4444'],
  plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '50%' } },
  legend: { show: false },
  dataLabels: { enabled: true, style: { fontFamily: 'inherit', fontWeight: 600, fontSize: '12px' } },
  tooltip: { theme: 'dark' },
  grid: { show: false },
  states: { hover: { filter: { type: 'none' as const } } },
  noData: { text: t('dashboard.noLicenses'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

const healthPercentage = computed(() => {
  if (!data.value?.activeBranches) return 0
  return Math.round(((data.value.branchesUp ?? 0) / data.value.activeBranches) * 100)
})

const healthColor = computed(() => {
  if (healthPercentage.value >= 90) return 'bg-green-500'
  if (healthPercentage.value >= 70) return 'bg-amber-500'
  return 'bg-red-500'
})

function formatNow() {
  return dayjs().format('DD MMM YYYY, HH:mm')
}

// Time analytics widget
const { data: timeAnalytics, isLoading: loadingTimeAnalytics } = useTimeAnalytics()

interface StatCard {
  label: string
  value: string | number
  icon: LucideIcon
  iconBg: string
  iconColor: string
  href?: string
  meta?: string
  metaColor?: string
}

const statCards = computed<StatCard[]>(() => [
  {
    label: t('dashboard.clients'),
    value: data.value?.totalClients ?? 0,
    icon: Building2,
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    href: '/clients',
    meta: t('dashboard.viewAllClients'),
    metaColor: 'text-[var(--text-muted)]'
  },
  {
    label: t('dashboard.openTickets'),
    value: data.value?.openTickets ?? 0,
    icon: MessageSquare,
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    href: '/tickets',
    meta: (data.value?.slaBreachedTickets ?? 0) > 0
      ? `${data.value?.slaBreachedTickets} ${t('dashboard.slaBreach')}`
      : t('dashboard.slaOk'),
    metaColor: (data.value?.slaBreachedTickets ?? 0) > 0 ? 'text-[var(--danger)]' : 'text-green-500'
  },
  {
    label: t('dashboard.branchHealth'),
    value: `${healthPercentage.value}%`,
    icon: Activity,
    iconBg: 'bg-green-50 dark:bg-green-950/50',
    iconColor: 'text-green-600 dark:text-green-400',
    href: '/pos',
    meta: `${data.value?.branchesUp ?? 0}/${data.value?.activeBranches ?? 0} ${t('dashboard.up')}`,
    metaColor: 'text-[var(--text-muted)]'
  },
  {
    label: t('dashboard.licenses'),
    value: data.value?.activeLicenses ?? 0,
    icon: CreditCard,
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
    href: '/licenses',
    meta: (data.value?.trialLicenses ?? 0) > 0
      ? `${data.value?.trialLicenses} ${t('dashboard.trial')}`
      : (data.value?.expiredLicenses ?? 0) > 0
        ? `${data.value?.expiredLicenses} ${t('dashboard.expired')}`
        : t('dashboard.allGood'),
    metaColor: (data.value?.expiredLicenses ?? 0) > 0 ? 'text-[var(--danger)]' : 'text-green-500'
  }
])

const summaryCards = computed<StatCard[]>(() => [
  {
    label: t('dashboard.openIncidents'),
    value: data.value?.openIncidents ?? 0,
    icon: AlertTriangle,
    iconBg: (data.value?.openIncidents ?? 0) > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-green-50 dark:bg-green-950/50',
    iconColor: (data.value?.openIncidents ?? 0) > 0 ? 'text-red-500' : 'text-green-500',
    meta: undefined
  },
  {
    label: t('dashboard.inProgress'),
    value: data.value?.ticketsInProgress ?? 0,
    icon: Clock,
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-500',
    meta: undefined
  },
  {
    label: t('dashboard.slaBreached'),
    value: data.value?.slaBreachedTickets ?? 0,
    icon: AlertTriangle,
    iconBg: (data.value?.slaBreachedTickets ?? 0) > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-green-50 dark:bg-green-950/50',
    iconColor: (data.value?.slaBreachedTickets ?? 0) > 0 ? 'text-red-500' : 'text-green-500',
    meta: undefined
  },
  {
    label: t('dashboard.notifications'),
    value: data.value?.unreadNotifications ?? 0,
    icon: MessageSquare,
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-500',
    meta: undefined
  }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div>
          <h1 class="text-xl font-bold text-[var(--text)]">{{ t('nav.dashboard') }}</h1>
          <p class="text-sm text-[var(--text-muted)]">{{ t('dashboard.updated') }} {{ formatNow() }}</p>
        </div>
        <PageInfoButton :title="t('nav.dashboard')" :description="t('pageInfo.dashboard')" />
      </div>
      <button
        class="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-3 py-1.5 rounded-md hover:bg-[var(--surface-raised)] border border-[var(--border)]"
        :class="isFetching ? 'opacity-50 pointer-events-none' : ''"
        @click="refetch()"
      >
        <RefreshCw :class="['w-3.5 h-3.5', isFetching ? 'animate-spin' : '']" />
        {{ isFetching ? t('dashboard.refreshing') : t('dashboard.refresh') }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <template v-if="isLoading">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard v-for="i in 4" :key="i" :lines="1" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard v-for="i in 3" :key="i" :lines="4" />
      </div>
    </template>

    <!-- Error banner (non-blocking) -->
    <div v-if="isError && !isLoading"
      class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <AlertCircle class="w-4 h-4" />
        <span>{{ t('dashboard.loadFailed') }}</span>
      </div>
      <button
        class="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
        @click="refetch()"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <template v-if="!isLoading">
      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 cursor-pointer hover:border-[var(--primary)]/40 hover:shadow-sm transition-all duration-150 active:scale-[0.99]"
          :class="card.href ? 'cursor-pointer' : ''"
          @click="card.href ? router.push(card.href) : undefined"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{{ card.label }}</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ card.value }}</p>
            </div>
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', card.iconBg]">
              <component :is="card.icon" :class="['w-5 h-5', card.iconColor]" />
            </div>
          </div>
          <p v-if="card.meta" :class="['text-xs mt-3 flex items-center gap-1', card.metaColor ?? 'text-[var(--text-muted)]']">
            <TrendingUp v-if="card.href === '/clients'" class="w-3 h-3" />
            <CheckCircle2 v-else-if="card.metaColor === 'text-green-500' && !card.href" class="w-3 h-3" />
            <AlertTriangle v-else-if="card.metaColor === 'text-[var(--danger)]'" class="w-3 h-3" />
            {{ card.meta }}
          </p>
          <!-- Health bar -->
          <div v-if="card.label === t('dashboard.branchHealth')" class="mt-3 h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="healthColor"
              :style="{ width: healthPercentage + '%' }"
            />
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Branch Health Donut -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">{{ t('dashboard.branchStatus') }}</h2>
              <RouterLink to="/health" class="text-xs font-medium text-[var(--primary)] hover:underline">{{ t('dashboard.viewHealth') }}</RouterLink>
            </div>
          </template>
          <VueApexCharts
            type="donut"
            height="220"
            :series="healthDonutSeries"
            :options="healthDonutOptions"
          />
          <!-- Alert branches list -->
          <div v-if="(data?.alertBranches?.length ?? 0) > 0" class="mt-3 space-y-1.5">
            <div
              v-for="b in data!.alertBranches"
              :key="b.branchId"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-raised)]"
            >
              <div class="min-w-0 flex-1">
                <span class="text-xs font-medium text-[var(--text)] truncate block">{{ b.branchName ?? b.branchId }}</span>
                <span class="text-xs text-[var(--text-muted)] truncate block">{{ b.clientName }}</span>
              </div>
              <Tag
                :severity="b.status === 'DOWN' ? 'danger' : 'warn'"
                :value="b.status"
                class="text-xs ml-2 flex-shrink-0"
              />
            </div>
          </div>
          <p v-else class="text-xs text-green-500 text-center mt-3 flex items-center justify-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5" />
            {{ t('dashboard.allSystemsOperational') }}
          </p>
        </Card>

        <!-- Ticket Radial -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">{{ t('dashboard.ticketBreakdown') }}</h2>
              <RouterLink to="/tickets" class="text-xs font-medium text-[var(--primary)] hover:underline">{{ t('dashboard.viewTickets') }}</RouterLink>
            </div>
          </template>
          <VueApexCharts
            type="radialBar"
            height="220"
            :series="ticketRadialSeries"
            :options="ticketRadialOptions"
          />
        </Card>

        <!-- License Bar -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">{{ t('dashboard.licenseOverview') }}</h2>
              <RouterLink to="/licenses" class="text-xs font-medium text-[var(--primary)] hover:underline">{{ t('dashboard.manage') }}</RouterLink>
            </div>
          </template>
          <VueApexCharts
            type="bar"
            height="220"
            :series="licenseBarSeries"
            :options="licenseBarOptions"
          />
        </Card>
      </div>

      <!-- Summary stats row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="card in summaryCards"
          :key="card.label"
          class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4"
        >
          <div class="flex items-center gap-3">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', card.iconBg]">
              <component :is="card.icon" :class="['w-5 h-5', card.iconColor]" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ card.label }}</p>
              <p class="text-xl font-bold" :class="card.iconColor">{{ card.value }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Performance Widget -->
      <Card>
        <div class="flex items-center gap-2 mb-4">
          <TimerIcon class="w-4 h-4 text-[var(--text-muted)]" />
          <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('dashboardPage.timePerformance') }}</h3>
          <span class="text-xs text-[var(--text-muted)] ml-auto">{{ t('dashboardPage.last30Days') }}</span>
        </div>

        <div v-if="loadingTimeAnalytics" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="h-24 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        </div>

        <div v-else-if="timeAnalytics" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Avg resolution time -->
          <div class="rounded-xl bg-[var(--surface-raised)] p-4 text-center">
            <Clock class="w-5 h-5 text-indigo-500 mx-auto mb-2" />
            <p class="text-lg font-bold text-[var(--text)]">
              {{ formatMinutes(Math.round(timeAnalytics.avgResolutionMinutes)) }}
            </p>
            <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('dashboardPage.avgResolution') }}</p>
          </div>

          <!-- SLA compliance -->
          <div class="rounded-xl bg-[var(--surface-raised)] p-4 text-center">
            <ShieldCheckIcon class="w-5 h-5 mx-auto mb-2"
              :class="timeAnalytics.slaComplianceRate >= 90 ? 'text-green-500' : timeAnalytics.slaComplianceRate >= 75 ? 'text-yellow-500' : 'text-red-500'" />
            <p class="text-lg font-bold text-[var(--text)]">{{ timeAnalytics.slaComplianceRate.toFixed(1) }}%</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('dashboardPage.slaCompliance') }}</p>
          </div>

          <!-- Total logged -->
          <div class="rounded-xl bg-[var(--surface-raised)] p-4 text-center">
            <TrendingUp class="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p class="text-lg font-bold text-[var(--text)]">
              {{ formatMinutes(Number(timeAnalytics.totalLoggedMinutes)) }}
            </p>
            <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('dashboardPage.totalLoggedTime') }}</p>
          </div>

          <!-- Total entries -->
          <div class="rounded-xl bg-[var(--surface-raised)] p-4 text-center">
            <Activity class="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p class="text-lg font-bold text-[var(--text)]">{{ timeAnalytics.totalEntries }}</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('dashboardPage.timeEntries') }}</p>
          </div>
        </div>

        <!-- Top users by logged time -->
        <div v-if="timeAnalytics && timeAnalytics.topUsers.length > 0" class="mt-4 border-t border-[var(--border)] pt-4">
          <p class="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">{{ t('dashboardPage.topAgentsByTime') }}</p>
          <div class="space-y-2">
            <div v-for="(u, i) in timeAnalytics.topUsers.slice(0, 5)" :key="u.userId"
                 class="flex items-center gap-3 text-sm">
              <span class="w-6 h-6 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] ring-1 ring-[var(--border)]">{{ i + 1 }}</span>
              <span class="flex-1 text-[var(--text)] font-medium text-sm truncate">{{ u.fullName }}</span>
              <span class="font-semibold text-[var(--text)] tabular-nums">{{ formatMinutes(Number(u.totalMinutes)) }}</span>
            </div>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>
