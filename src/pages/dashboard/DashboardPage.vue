<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { dashboardService, type DashboardData } from '@/services/dashboard.service'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { Building2, MessageSquare, Activity, CreditCard, AlertTriangle } from 'lucide-vue-next'
import type { TicketStatus, TicketPriority } from '@/types/ticket'
import type { HealthStatus } from '@/types/health'

const loading = ref(true)
const data = ref<DashboardData | null>(null)

const mockData: DashboardData = {
  stats: {
    totalClients: 48,
    openTickets: 17,
    healthyBranches: 142,
    totalBranches: 156,
    activeLicenses: 48,
    criticalAlerts: 3
  },
  recentTickets: [
    { id: '1', title: 'POS system not printing receipts', status: 'OPEN', priority: 'HIGH', tenantId: 't1', clientName: 'Restaurante El Torito', createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date().toISOString(), description: '' },
    { id: '2', title: 'Inventory sync failing', status: 'IN_PROGRESS', priority: 'CRITICAL', tenantId: 't1', clientName: 'Farmacia San Pablo', createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date().toISOString(), description: '' },
    { id: '3', title: 'Card reader not connecting', status: 'PENDING_CUSTOMER', priority: 'MEDIUM', tenantId: 't1', clientName: 'Oxxo Sucursal Norte', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), description: '' },
    { id: '4', title: 'Wrong tax calculation on invoices', status: 'OPEN', priority: 'HIGH', tenantId: 't1', clientName: 'Auto Servicio Garza', createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), description: '' },
    { id: '5', title: 'Login issues after update', status: 'RESOLVED', priority: 'LOW', tenantId: 't1', clientName: 'Boutique La Moda', createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date().toISOString(), description: '' }
  ],
  healthOverview: [
    { id: '1', branchId: 'b1', branchName: 'Sucursal Centro', clientName: 'Restaurante El Torito', clientId: 'c1', status: 'HEALTHY', latencyMs: 45, checkedAt: new Date().toISOString() },
    { id: '2', branchId: 'b2', branchName: 'Sucursal Norte', clientName: 'Farmacia San Pablo', clientId: 'c2', status: 'DOWN', latencyMs: undefined, checkedAt: new Date().toISOString(), message: 'Connection timeout' },
    { id: '3', branchId: 'b3', branchName: 'Localidad Polanco', clientName: 'Oxxo Sucursal Norte', clientId: 'c3', status: 'DEGRADED', latencyMs: 820, checkedAt: new Date().toISOString(), message: 'High latency' },
    { id: '4', branchId: 'b4', branchName: 'Sucursal Sur', clientName: 'Auto Servicio Garza', clientId: 'c4', status: 'HEALTHY', latencyMs: 38, checkedAt: new Date().toISOString() },
    { id: '5', branchId: 'b5', branchName: 'Plaza Satélite', clientName: 'Boutique La Moda', clientId: 'c5', status: 'HEALTHY', latencyMs: 62, checkedAt: new Date().toISOString() }
  ]
}

async function fetchData() {
  loading.value = true
  try {
    data.value = await dashboardService.getDashboard()
  } catch {
    // Use mock data when API is not available
    data.value = mockData
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function ticketStatusVariant(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    OPEN: 'info',
    IN_PROGRESS: 'purple',
    PENDING_CUSTOMER: 'warning',
    RESOLVED: 'success',
    CLOSED: 'default'
  }
  return map[status] ?? 'default'
}

function ticketPriorityVariant(priority: TicketPriority): string {
  const map: Record<TicketPriority, string> = {
    LOW: 'default',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger'
  }
  return map[priority] ?? 'default'
}

function healthVariant(status: HealthStatus): string {
  const map: Record<HealthStatus, string> = {
    HEALTHY: 'success',
    DEGRADED: 'warning',
    DOWN: 'danger',
    UNKNOWN: 'default'
  }
  return map[status] ?? 'default'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const healthPercentage = computed(() => {
  if (!data.value?.stats.totalBranches) return 0
  return Math.round((data.value.stats.healthyBranches / data.value.stats.totalBranches) * 100)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Loading skeleton -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Spinner class="w-8 h-8 text-[var(--primary)]" />
    </div>

    <template v-else-if="data">
      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Clients -->
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Clients</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.stats.totalClients }}</p>
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
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.stats.openTickets }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <MessageSquare class="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div v-if="data.stats.criticalAlerts > 0" class="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger)]">
            <AlertTriangle class="w-3 h-3" />
            {{ data.stats.criticalAlerts }} critical
          </div>
        </Card>

        <!-- Health -->
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Healthy Branches</p>
              <p class="text-2xl font-bold text-[var(--text)]">
                {{ data.stats.healthyBranches }}
                <span class="text-sm font-normal text-[var(--text-muted)]">/ {{ data.stats.totalBranches }}</span>
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
          </div>
        </Card>

        <!-- Licenses -->
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Active Licenses</p>
              <p class="text-2xl font-bold text-[var(--text)]">{{ data.stats.activeLicenses }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <CreditCard class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </Card>
      </div>

      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Tickets -->
        <Card :padding="false">
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">Recent Tickets</h2>
              <RouterLink to="/tickets" class="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors">
                View all
              </RouterLink>
            </div>
          </template>

          <div class="divide-y divide-[var(--border-subtle)]">
            <div
              v-for="ticket in data.recentTickets"
              :key="ticket.id"
              class="px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <div class="flex items-start justify-between gap-3 mb-1.5">
                <p class="text-sm font-medium text-[var(--text)] line-clamp-1 flex-1">{{ ticket.title }}</p>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <Badge :variant="(ticketPriorityVariant(ticket.priority) as any)" dot>{{ ticket.priority }}</Badge>
                  <Badge :variant="(ticketStatusVariant(ticket.status) as any)">{{ ticket.status.replace('_', ' ') }}</Badge>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-[var(--text-muted)]">{{ ticket.clientName }}</span>
                <span class="text-xs text-[var(--text-placeholder)]">{{ formatRelativeTime(ticket.createdAt) }}</span>
              </div>
            </div>

            <div v-if="data.recentTickets.length === 0" class="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No recent tickets
            </div>
          </div>
        </Card>

        <!-- Health Overview -->
        <Card :padding="false">
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h2 class="text-sm font-semibold text-[var(--text)]">Health Overview</h2>
              <RouterLink to="/health" class="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors">
                View all
              </RouterLink>
            </div>
          </template>

          <div class="divide-y divide-[var(--border-subtle)]">
            <div
              v-for="check in data.healthOverview"
              :key="check.id"
              class="px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-[var(--text)] truncate">{{ check.branchName }}</p>
                  <p class="text-xs text-[var(--text-muted)] truncate">{{ check.clientName }}</p>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  <span v-if="check.latencyMs" class="text-xs text-[var(--text-muted)]">{{ check.latencyMs }}ms</span>
                  <Badge :variant="(healthVariant(check.status) as any)" dot>{{ check.status }}</Badge>
                </div>
              </div>
              <p v-if="check.message" class="text-xs text-[var(--text-muted)] mt-1">{{ check.message }}</p>
            </div>

            <div v-if="data.healthOverview.length === 0" class="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No health data available
            </div>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
