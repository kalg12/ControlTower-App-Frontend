<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { dashboardService } from '@/services/dashboard.service'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import { Building2, MessageSquare, Activity, CreditCard, AlertTriangle } from 'lucide-vue-next'

dayjs.extend(relativeTime)

ChartJS.register(ArcElement, Tooltip, Legend)

const { data, isLoading, isError } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => dashboardService.getDashboard(),
  staleTime: 30000
})

const healthChartData = computed(() => ({
  labels: ['Up', 'Degraded', 'Down'],
  datasets: [
    {
      data: [
        data.value?.branchesUp ?? 0,
        data.value?.branchesDegraded ?? 0,
        data.value?.branchesDown ?? 0
      ],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 4
    }
  ]
}))

const healthChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { font: { size: 11 }, padding: 12, boxWidth: 10 }
    }
  }
}

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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard :lines="3" />
        <SkeletonCard :lines="5" />
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
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Clients</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.totalClients }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Building2 class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <!-- Open Tickets -->
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Open Tickets</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.openTickets }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <MessageSquare class="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div v-if="data.slaBreachedTickets > 0" class="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger)]">
            <AlertTriangle class="w-3 h-3" />
            {{ data.slaBreachedTickets }} SLA breached
          </div>
          <div v-if="data.ticketsInProgress > 0" class="mt-1 text-xs text-[var(--text-muted)]">
            {{ data.ticketsInProgress }} in progress
          </div>
        </Card>

        <!-- Health -->
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Branch Health</p>
              <p class="text-2xl font-bold text-[var(--text)]">
                {{ data.branchesUp }}
                <span class="text-sm font-normal text-[var(--text-muted)]">/ {{ data.activeBranches }}</span>
              </p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <Activity class="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-[var(--text-muted)]">Uptime</span>
              <span class="text-xs font-medium text-[var(--text)]">{{ healthPercentage }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
              <div
                class="h-full rounded-full bg-green-500 transition-all duration-500"
                :style="{ width: healthPercentage + '%' }"
              />
            </div>
            <div v-if="data.branchesDown > 0 || data.branchesDegraded > 0" class="mt-1.5 flex items-center gap-2 text-xs">
              <span v-if="data.branchesDown > 0" class="text-red-500">{{ data.branchesDown }} down</span>
              <span v-if="data.branchesDegraded > 0" class="text-amber-500">{{ data.branchesDegraded }} degraded</span>
            </div>
          </div>
        </Card>

        <!-- Licenses -->
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Active Licenses</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.activeLicenses }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <CreditCard class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-3 text-xs">
            <span v-if="data.trialLicenses > 0" class="text-blue-500">{{ data.trialLicenses }} trial</span>
            <span v-if="data.expiredLicenses > 0" class="text-red-500">{{ data.expiredLicenses }} expired</span>
          </div>
        </Card>
      </div>

      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Health Status Breakdown (doughnut chart) -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">Health Status Breakdown</h2>
              <RouterLink to="/health" class="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors">
                View all
              </RouterLink>
            </div>
          </template>
          <div class="flex flex-col items-center gap-4">
            <div class="h-48 w-48">
              <Doughnut :data="healthChartData" :options="healthChartOptions" />
            </div>
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                <span class="text-[var(--text-muted)]">Up ({{ data.branchesUp }})</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span class="text-[var(--text-muted)]">Degraded ({{ data.branchesDegraded }})</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span class="text-[var(--text-muted)]">Down ({{ data.branchesDown }})</span>
              </div>
            </div>
          </div>
        </Card>

        <!-- Incidents & Notifications Summary -->
        <Card>
          <template #header>
            <h2 class="text-sm font-semibold text-[var(--text)]">Summary</h2>
          </template>
          <div class="space-y-3">
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span class="text-sm text-[var(--text-muted)]">Open Incidents</span>
              <Badge :variant="data.openIncidents > 0 ? 'danger' : 'success'">
                {{ data.openIncidents }}
              </Badge>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span class="text-sm text-[var(--text-muted)]">Tickets In Progress</span>
              <Badge variant="purple">{{ data.ticketsInProgress }}</Badge>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span class="text-sm text-[var(--text-muted)]">SLA Breached</span>
              <Badge :variant="data.slaBreachedTickets > 0 ? 'danger' : 'success'">
                {{ data.slaBreachedTickets }}
              </Badge>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span class="text-sm text-[var(--text-muted)]">Trial Licenses</span>
              <Badge variant="info">{{ data.trialLicenses }}</Badge>
            </div>
            <div class="flex items-center justify-between py-2">
              <span class="text-sm text-[var(--text-muted)]">Unread Notifications</span>
              <Badge :variant="data.unreadNotifications > 0 ? 'warning' : 'default'">
                {{ data.unreadNotifications }}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
