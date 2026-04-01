<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Card from '@/components/ui/Card.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-vue-next'
import { healthService } from '@/services/health.service'
import type { HealthCheck, HealthStatus } from '@/types/health'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { data: checks, isLoading, refetch } = useQuery({
  queryKey: ['health-clients'],
  queryFn: () => healthService.getClients(),
  staleTime: 15000,
  refetchInterval: 60000 // auto-refresh every minute
})

const items = computed(() => checks.value ?? [])

const summary = computed(() => {
  const arr = items.value
  return {
    total: arr.length,
    up: arr.filter(c => c.status === 'UP' || c.status === 'HEALTHY').length,
    degraded: arr.filter(c => c.status === 'DEGRADED').length,
    down: arr.filter(c => c.status === 'DOWN').length
  }
})

function statusSeverity(status: HealthStatus): 'success' | 'warn' | 'danger' | 'secondary' {
  if (status === 'UP' || status === 'HEALTHY') return 'success'
  if (status === 'DEGRADED') return 'warn'
  if (status === 'DOWN') return 'danger'
  return 'secondary'
}

function formatTime(dateStr: string) {
  return dayjs(dateStr).fromNow()
}

function latencyClass(ms?: number) {
  if (!ms) return 'text-[var(--text-muted)]'
  if (ms > 500) return 'text-red-500 font-medium'
  if (ms > 200) return 'text-amber-500 font-medium'
  return 'text-green-500 font-medium'
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Health Monitoring</h2>
        <p class="text-sm text-[var(--text-muted)]">Real-time status of all branch POS systems</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-3 gap-4">
        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.up }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">Up / Healthy</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.degraded }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">Degraded</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
              <XCircle class="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.down }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">Down</p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Health checks table -->
      <DataTable
        :value="items"
        :loading="false"
        removable-sort
        striped-rows
        class="rounded-xl overflow-hidden"
      >
        <Column field="branchId" header="Branch ID" sortable style="min-width: 160px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="font-medium text-[var(--text)] font-mono text-sm">{{ row.branchId }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" style="width: 130px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <Tag :severity="statusSeverity(row.status)" :value="row.status" />
          </template>
        </Column>

        <Column field="latencyMs" header="Latency" sortable style="width: 110px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span :class="latencyClass(row.latencyMs)">
              {{ row.latencyMs != null ? `${row.latencyMs}ms` : '—' }}
            </span>
          </template>
        </Column>

        <Column field="version" header="Version" style="width: 110px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.version ?? '—' }}</span>
          </template>
        </Column>

        <Column field="openIncidents" header="Open Incidents" style="width: 130px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <Tag
              :severity="row.openIncidents > 0 ? 'danger' : 'success'"
              :value="String(row.openIncidents)"
            />
          </template>
        </Column>

        <Column field="lastCheckedAt" header="Last Check" sortable style="width: 140px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="text-[var(--text-muted)] text-sm">{{ formatTime(row.lastCheckedAt) }}</span>
          </template>
        </Column>

        <template #empty>
          <div class="text-center py-8 text-[var(--text-muted)]">No health data available</div>
        </template>
      </DataTable>
    </template>
  </div>
</template>
