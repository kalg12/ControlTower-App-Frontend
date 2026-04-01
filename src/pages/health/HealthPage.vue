<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { healthService } from '@/services/health.service'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Spinner from '@/components/ui/Spinner.vue'
import DataTable from '@/components/ui/DataTable.vue'
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-vue-next'
import type { HealthCheck, HealthSummary, HealthStatus } from '@/types/health'

const loading = ref(true)
const checks = ref<HealthCheck[]>([])
const summary = ref<HealthSummary>({ total: 0, healthy: 0, degraded: 0, down: 0, unknown: 0 })

const mockChecks: HealthCheck[] = [
  { id: '1', branchId: 'b1', branchName: 'Sucursal Centro', clientName: 'Restaurante El Torito', clientId: 'c1', status: 'HEALTHY', latencyMs: 45, checkedAt: new Date().toISOString() },
  { id: '2', branchId: 'b2', branchName: 'Sucursal Norte', clientName: 'Farmacia San Pablo', clientId: 'c2', status: 'DOWN', checkedAt: new Date().toISOString(), message: 'Connection timeout after 5000ms' },
  { id: '3', branchId: 'b3', branchName: 'Localidad Polanco', clientName: 'Oxxo Sucursal Norte', clientId: 'c3', status: 'DEGRADED', latencyMs: 820, checkedAt: new Date().toISOString(), message: 'High latency detected' },
  { id: '4', branchId: 'b4', branchName: 'Sucursal Sur', clientName: 'Auto Servicio Garza', clientId: 'c4', status: 'HEALTHY', latencyMs: 38, checkedAt: new Date().toISOString() },
  { id: '5', branchId: 'b5', branchName: 'Plaza Satélite', clientName: 'Boutique La Moda', clientId: 'c5', status: 'HEALTHY', latencyMs: 62, checkedAt: new Date().toISOString() },
  { id: '6', branchId: 'b6', branchName: 'Sucursal Oriente', clientName: 'Supermercado Familia', clientId: 'c6', status: 'HEALTHY', latencyMs: 91, checkedAt: new Date().toISOString() },
  { id: '7', branchId: 'b7', branchName: 'Centro Histórico', clientName: 'Farmacia San Pablo', clientId: 'c2', status: 'UNKNOWN', checkedAt: new Date().toISOString(), message: 'No recent data' },
  { id: '8', branchId: 'b8', branchName: 'Plaza Mayor', clientName: 'Restaurante El Torito', clientId: 'c1', status: 'HEALTHY', latencyMs: 55, checkedAt: new Date().toISOString() }
]

const mockSummary: HealthSummary = { total: 8, healthy: 5, degraded: 1, down: 1, unknown: 1 }

const columns = [
  { key: 'branchName', label: 'Branch', sortable: true },
  { key: 'clientName', label: 'Client' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'latencyMs', label: 'Latency', width: '100px', align: 'right' as const },
  { key: 'message', label: 'Message' },
  { key: 'checkedAt', label: 'Last Check', width: '130px', align: 'right' as const }
]

async function fetchData() {
  loading.value = true
  try {
    const [checksRes, summaryRes] = await Promise.all([
      healthService.getChecks({ size: 50 }),
      healthService.getSummary()
    ])
    checks.value = checksRes.content
    summary.value = summaryRes
  } catch {
    checks.value = mockChecks
    summary.value = mockSummary
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function statusVariant(status: HealthStatus): string {
  const map: Record<HealthStatus, string> = {
    HEALTHY: 'success', DEGRADED: 'warning', DOWN: 'danger', UNKNOWN: 'default'
  }
  return map[status] ?? 'default'
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-[var(--text)]">Health Monitoring</h2>
      <p class="text-sm text-[var(--text-muted)]">Real-time status of all branch POS systems</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.healthy }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">Healthy</p>
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

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center">
              <HelpCircle class="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.unknown }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">Unknown</p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Table -->
      <DataTable :columns="columns" :rows="checks as any[]" :loading="false">
        <template #cell-branchName="{ row }">
          <span class="font-medium text-[var(--text)]">{{ row.branchName as string }}</span>
        </template>
        <template #cell-clientName="{ row }">
          <span class="text-[var(--text-muted)]">{{ row.clientName as string }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="(statusVariant(row.status as HealthStatus) as any)" dot>{{ row.status as string }}</Badge>
        </template>
        <template #cell-latencyMs="{ row }">
          <span :class="[
            'text-sm font-medium',
            !row.latencyMs ? 'text-[var(--text-muted)]' :
            (row.latencyMs as number) > 500 ? 'text-[var(--danger)]' :
            (row.latencyMs as number) > 200 ? 'text-[var(--warning)]' :
            'text-[var(--success)]'
          ]">
            {{ row.latencyMs ? `${row.latencyMs}ms` : '—' }}
          </span>
        </template>
        <template #cell-message="{ row }">
          <span class="text-xs text-[var(--text-muted)] italic">{{ row.message as string ?? '—' }}</span>
        </template>
        <template #cell-checkedAt="{ row }">
          <span class="text-[var(--text-muted)]">{{ formatTime(row.checkedAt as string) }}</span>
        </template>
      </DataTable>
    </template>
  </div>
</template>
