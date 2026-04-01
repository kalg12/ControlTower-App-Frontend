<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import { dashboardService } from '@/services/dashboard.service'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
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

dayjs.extend(relativeTime)

const router = useRouter()

const { data, isLoading, isError } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => dashboardService.getDashboard(),
  staleTime: 30000
})

// Branch Health — Donut chart (ApexCharts)
const healthDonutSeries = computed(() => [
  data.value?.branchesUp ?? 0,
  data.value?.branchesDegraded ?? 0,
  data.value?.branchesDown ?? 0
])

const healthDonutOptions = computed<ApexOptions>(() => ({
  chart: { type: 'donut', background: 'transparent', toolbar: { show: false } },
  labels: ['Up', 'Degraded', 'Down'],
  colors: ['#22c55e', '#f59e0b', '#ef4444'],
  legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit' },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: { donut: { size: '65%', labels: {
      show: true,
      total: {
        show: true,
        label: 'Total',
        formatter: () => String(data.value?.activeBranches ?? 0)
      }
    } } }
  },
  stroke: { width: 0 },
  tooltip: { theme: 'dark' }
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
  labels: ['Open', 'In Progress'],
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
  tooltip: { theme: 'dark' }
}))

// License breakdown — bar chart
const licenseBarSeries = computed(() => [{
  name: 'Licenses',
  data: [
    data.value?.activeLicenses ?? 0,
    data.value?.trialLicenses ?? 0,
    data.value?.expiredLicenses ?? 0
  ]
}])

const licenseBarOptions = computed<ApexOptions>(() => ({
  chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
  xaxis: { categories: ['Active', 'Trial', 'Expired'], labels: { style: { fontFamily: 'inherit', fontSize: '12px' } } },
  yaxis: { labels: { style: { fontFamily: 'inherit' } } },
  colors: ['#22c55e', '#6366f1', '#ef4444'],
  plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '50%' } },
  legend: { show: false },
  dataLabels: { enabled: true, style: { fontFamily: 'inherit', fontWeight: 600 } },
  tooltip: { theme: 'dark' },
  grid: { borderColor: 'var(--border, #e5e7eb)' }
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

    <!-- Error state -->
    <div v-else-if="isError" class="flex items-center justify-center py-20">
      <p class="text-sm text-[var(--text-muted)]">Failed to load dashboard data. Please try again.</p>
    </div>

    <template v-else-if="data">
      <!-- Last updated -->
      <p class="text-xs text-[var(--text-placeholder)] text-right">Updated {{ formatNow() }}</p>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Clients -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/clients')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Clients</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.totalClients }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Building2 class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
            <TrendingUp class="w-3 h-3" /> View all clients
          </p>
        </Card>

        <!-- Open Tickets -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/tickets')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Open Tickets</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.openTickets }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <MessageSquare class="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span v-if="data.slaBreachedTickets > 0" class="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle class="w-3 h-3" /> {{ data.slaBreachedTickets }} SLA breach
            </span>
            <span v-else class="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3" /> SLA OK
            </span>
          </div>
        </Card>

        <!-- Health -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/health')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Branch Health</p>
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
          <p class="text-xs text-[var(--text-muted)] mt-1.5">{{ data.branchesUp }}/{{ data.activeBranches }} up</p>
        </Card>

        <!-- Licenses -->
        <Card class="cursor-pointer hover:border-[var(--primary)]/40 transition-colors" @click="router.push('/licenses')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Licenses</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.activeLicenses }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <CreditCard class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-3 text-xs">
            <span v-if="data.trialLicenses > 0" class="text-blue-500">{{ data.trialLicenses }} trial</span>
            <span v-if="data.expiredLicenses > 0" class="text-red-500">{{ data.expiredLicenses }} expired</span>
            <span v-if="!data.trialLicenses && !data.expiredLicenses" class="text-green-500 flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3" /> All good
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
              <h2 class="text-sm font-semibold text-[var(--text)]">Branch Status</h2>
              <RouterLink to="/health" class="text-xs text-[var(--primary)] hover:underline font-medium">View Health</RouterLink>
            </div>
          </template>
          <VueApexCharts
            type="donut"
            height="220"
            :series="healthDonutSeries"
            :options="healthDonutOptions"
          />
        </Card>

        <!-- Ticket Radial -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">Ticket Breakdown</h2>
              <RouterLink to="/tickets" class="text-xs text-[var(--primary)] hover:underline font-medium">View Tickets</RouterLink>
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
              <h2 class="text-sm font-semibold text-[var(--text)]">License Overview</h2>
              <RouterLink to="/licenses" class="text-xs text-[var(--primary)] hover:underline font-medium">Manage</RouterLink>
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
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', data.openIncidents > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950']">
              <AlertTriangle :class="['w-4.5 h-4.5', data.openIncidents > 0 ? 'text-red-500' : 'text-green-500']" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">Open Incidents</p>
              <p class="text-xl font-bold" :class="data.openIncidents > 0 ? 'text-red-500' : 'text-green-500'">{{ data.openIncidents }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center flex-shrink-0">
              <Clock class="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">In Progress</p>
              <p class="text-xl font-bold text-[var(--text)]">{{ data.ticketsInProgress }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', data.slaBreachedTickets > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950']">
              <AlertTriangle :class="['w-4.5 h-4.5', data.slaBreachedTickets > 0 ? 'text-red-500' : 'text-green-500']" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">SLA Breached</p>
              <p class="text-xl font-bold" :class="data.slaBreachedTickets > 0 ? 'text-red-500' : 'text-green-500'">{{ data.slaBreachedTickets }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
              <MessageSquare class="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">Notifications</p>
              <p class="text-xl font-bold text-[var(--text)]">{{ data.unreadNotifications }}</p>
            </div>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
