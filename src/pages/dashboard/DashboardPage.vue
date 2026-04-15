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
import type { ApexOptions } from 'apexcharts'
import {
  Building2,
  MessageSquare,
  Activity,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-vue-next'
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
  yaxis: { labels: { style: { fontFamily: 'inherit' } } },
  colors: ['#22c55e', '#6366f1', '#ef4444'],
  plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '50%' } },
  legend: { show: false },
  dataLabels: { enabled: true, style: { fontFamily: 'inherit', fontWeight: 600 } },
  tooltip: { theme: 'dark' },
  grid: { borderColor: 'var(--border, #e5e7eb)' },
  noData: { text: t('dashboard.noLicenses'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

const healthPercentage = computed(() => {
  if (!data.value?.activeBranches) return 0
  return Math.round(((data.value.branchesUp ?? 0) / data.value.activeBranches) * 100)
})

function formatNow() {
  return dayjs().format('DD MMM YYYY, HH:mm')
}
</script>

<template>
  <div class="space-y-6">
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
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {{ t('dashboard.loadFailed') }}
    </div>

    <template v-if="!isLoading">
      <!-- Header row: last updated + refresh -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <p class="text-xs text-[var(--text-placeholder)]">{{ t('dashboard.updated') }} {{ formatNow() }}</p>
          <PageInfoButton :title="t('nav.dashboard')" :description="t('pageInfo.dashboard')" />
        </div>
        <button
          class="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2.5 py-1.5 rounded-md hover:bg-[var(--surface-raised)]"
          :class="isFetching ? 'opacity-50 pointer-events-none' : ''"
          @click="refetch()"
        >
          <svg :class="['w-3.5 h-3.5', isFetching ? 'animate-spin' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isFetching ? t('dashboard.refreshing') : t('dashboard.refresh') }}
        </button>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Clients -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/clients')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{{ t('dashboard.clients') }}</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data?.totalClients ?? 0 }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Building2 class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
            <TrendingUp class="w-3 h-3" /> {{ t('dashboard.viewAllClients') }}
          </p>
        </Card>

        <!-- Open Tickets -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/tickets')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{{ t('dashboard.openTickets') }}</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data?.openTickets ?? 0 }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <MessageSquare class="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span v-if="(data?.slaBreachedTickets ?? 0) > 0" class="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle class="w-3 h-3" /> {{ data?.slaBreachedTickets }} {{ t('dashboard.slaBreach') }}
            </span>
            <span v-else class="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3" /> {{ t('dashboard.slaOk') }}
            </span>
          </div>
        </Card>

        <!-- Health -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/health')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{{ t('dashboard.branchHealth') }}</p>
              <p class="text-2xl font-bold text-[var(--text)]">
                {{ healthPercentage }}<span class="text-base font-normal text-[var(--text-muted)]">%</span>
              </p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <Activity class="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div class="mt-3 h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="healthPercentage >= 90 ? 'bg-green-500' : healthPercentage >= 70 ? 'bg-amber-500' : 'bg-red-500'"
              :style="{ width: healthPercentage + '%' }"
            />
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-1.5">{{ data?.branchesUp ?? 0 }}/{{ data?.activeBranches ?? 0 }} {{ t('dashboard.up') }}</p>
        </Card>

        <!-- Licenses -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/licenses')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{{ t('dashboard.licenses') }}</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data?.activeLicenses ?? 0 }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <CreditCard class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-3 text-xs">
            <span v-if="(data?.trialLicenses ?? 0) > 0" class="text-blue-500">{{ data?.trialLicenses }} {{ t('dashboard.trial') }}</span>
            <span v-if="(data?.expiredLicenses ?? 0) > 0" class="text-red-500">{{ data?.expiredLicenses }} {{ t('dashboard.expired') }}</span>
            <span v-if="!(data?.trialLicenses) && !(data?.expiredLicenses)" class="text-green-500 flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3" /> {{ t('dashboard.allGood') }}
            </span>
          </div>
        </Card>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Branch Health Donut -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">{{ t('dashboard.branchStatus') }}</h2>
              <RouterLink to="/health" class="text-xs text-[var(--primary)] hover:underline font-medium">{{ t('dashboard.viewHealth') }}</RouterLink>
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
              class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--surface-raised)]"
            >
              <div class="min-w-0">
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
              <RouterLink to="/tickets" class="text-xs text-[var(--primary)] hover:underline font-medium">{{ t('dashboard.viewTickets') }}</RouterLink>
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
              <RouterLink to="/licenses" class="text-xs text-[var(--primary)] hover:underline font-medium">{{ t('dashboard.manage') }}</RouterLink>
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
        <Card>
          <div class="flex items-center gap-3">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', (data?.openIncidents ?? 0) > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950']">
              <AlertTriangle :class="['w-4.5 h-4.5', (data?.openIncidents ?? 0) > 0 ? 'text-red-500' : 'text-green-500']" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('dashboard.openIncidents') }}</p>
              <p class="text-xl font-bold" :class="(data?.openIncidents ?? 0) > 0 ? 'text-red-500' : 'text-green-500'">{{ data?.openIncidents ?? 0 }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center flex-shrink-0">
              <Clock class="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('dashboard.inProgress') }}</p>
              <p class="text-xl font-bold text-[var(--text)]">{{ data?.ticketsInProgress ?? 0 }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', (data?.slaBreachedTickets ?? 0) > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950']">
              <AlertTriangle :class="['w-4.5 h-4.5', (data?.slaBreachedTickets ?? 0) > 0 ? 'text-red-500' : 'text-green-500']" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('dashboard.slaBreached') }}</p>
              <p class="text-xl font-bold" :class="(data?.slaBreachedTickets ?? 0) > 0 ? 'text-red-500' : 'text-green-500'">{{ data?.slaBreachedTickets ?? 0 }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
              <MessageSquare class="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('dashboard.notifications') }}</p>
              <p class="text-xl font-bold text-[var(--text)]">{{ data?.unreadNotifications ?? 0 }}</p>
            </div>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
