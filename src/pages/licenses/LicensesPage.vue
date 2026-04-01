<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { licensesService } from '@/services/licenses.service'
import { useToast } from '@/composables/useToast'
import Badge from '@/components/ui/Badge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Button from '@/components/ui/Button.vue'
import Spinner from '@/components/ui/Spinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { CreditCard, RefreshCw, PauseCircle } from 'lucide-vue-next'
import type { License, LicenseStatus } from '@/types/license'

const toast = useToast()
const loading = ref(true)
const licenses = ref<License[]>([])

const mockLicenses: License[] = [
  { id: '1', tenantId: 't1', clientId: 'c1', clientName: 'Restaurante El Torito', plan: { id: 'p1', name: 'Professional', maxBranches: 10, features: ['Multi-branch', 'Analytics', 'API Access'] }, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 86400000 * 45).toISOString(), cancelAtPeriodEnd: false },
  { id: '2', tenantId: 't1', clientId: 'c2', clientName: 'Farmacia San Pablo', plan: { id: 'p2', name: 'Enterprise', maxBranches: 50, features: ['Unlimited branches', 'Priority support', 'Custom integrations'] }, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 86400000 * 12).toISOString(), cancelAtPeriodEnd: false },
  { id: '3', tenantId: 't1', clientId: 'c3', clientName: 'Oxxo Sucursal Norte', plan: { id: 'p1', name: 'Starter', maxBranches: 3, features: ['Basic POS', 'Reports'] }, status: 'TRIAL', currentPeriodEnd: new Date(Date.now() + 86400000 * 7).toISOString(), cancelAtPeriodEnd: false },
  { id: '4', tenantId: 't1', clientId: 'c4', clientName: 'Auto Servicio Garza', plan: { id: 'p1', name: 'Professional', maxBranches: 10, features: ['Multi-branch', 'Analytics'] }, status: 'EXPIRED', currentPeriodEnd: new Date(Date.now() - 86400000 * 5).toISOString(), cancelAtPeriodEnd: true },
  { id: '5', tenantId: 't1', clientId: 'c5', clientName: 'Boutique La Moda', plan: { id: 'p1', name: 'Starter', maxBranches: 3, features: ['Basic POS'] }, status: 'SUSPENDED', currentPeriodEnd: new Date(Date.now() + 86400000 * 20).toISOString(), cancelAtPeriodEnd: false }
]

const columns = [
  { key: 'clientName', label: 'Client', sortable: true },
  { key: 'plan', label: 'Plan' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'currentPeriodEnd', label: 'Expires', width: '130px', align: 'right' as const },
  { key: 'actions', label: '', width: '100px', align: 'right' as const }
]

async function fetchLicenses() {
  loading.value = true
  try {
    const res = await licensesService.list({ size: 50 })
    licenses.value = res.content
  } catch {
    licenses.value = mockLicenses
  } finally {
    loading.value = false
  }
}

onMounted(fetchLicenses)

function statusVariant(status: LicenseStatus): string {
  const map: Record<LicenseStatus, string> = {
    ACTIVE: 'success', TRIAL: 'info', EXPIRED: 'danger', SUSPENDED: 'warning', CANCELLED: 'default'
  }
  return map[status] ?? 'default'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = date.getTime() - Date.now()
  const days = Math.floor(diff / 86400000)
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  if (days <= 7) return `${days}d left`
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isExpiringSoon(dateStr: string): boolean {
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 86400000 * 14
}

async function handleSuspend(license: License) {
  if (!confirm(`Suspend license for ${license.clientName}?`)) return
  try {
    await licensesService.suspend(license.id)
    const idx = licenses.value.findIndex(l => l.id === license.id)
    if (idx >= 0) licenses.value[idx].status = 'SUSPENDED'
    toast.success('License suspended')
  } catch {
    toast.error('Failed to suspend license')
  }
}

async function handleReactivate(license: License) {
  try {
    await licensesService.reactivate(license.id)
    const idx = licenses.value.findIndex(l => l.id === license.id)
    if (idx >= 0) licenses.value[idx].status = 'ACTIVE'
    toast.success('License reactivated')
  } catch {
    toast.error('Failed to reactivate license')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Licenses</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ licenses.length }} total licenses</p>
      </div>
      <Button variant="outline" size="sm" @click="fetchLicenses">
        <RefreshCw class="w-4 h-4" />
        Refresh
      </Button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-16">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <template v-else>
      <DataTable :columns="columns" :rows="licenses as any[]" :loading="false">
        <template #cell-clientName="{ row }">
          <span class="font-medium text-[var(--text)]">{{ row.clientName as string }}</span>
        </template>
        <template #cell-plan="{ row }">
          <div>
            <p class="text-sm font-medium text-[var(--text)]">{{ (row.plan as License['plan']).name }}</p>
            <p class="text-xs text-[var(--text-muted)]">Up to {{ (row.plan as License['plan']).maxBranches }} branches</p>
          </div>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="(statusVariant(row.status as LicenseStatus) as any)" dot>{{ row.status as string }}</Badge>
        </template>
        <template #cell-currentPeriodEnd="{ row }">
          <span :class="[
            'text-sm',
            isExpiringSoon(row.currentPeriodEnd as string) ? 'text-[var(--warning)] font-medium' :
            (row.status as string) === 'EXPIRED' ? 'text-[var(--danger)]' :
            'text-[var(--text-muted)]'
          ]">
            {{ formatDate(row.currentPeriodEnd as string) }}
          </span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              v-if="(row.status as string) === 'ACTIVE' || (row.status as string) === 'TRIAL'"
              class="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
              title="Suspend"
              @click="handleSuspend(row as unknown as License)"
            >
              <PauseCircle class="w-4 h-4" />
            </button>
            <button
              v-if="(row.status as string) === 'SUSPENDED' || (row.status as string) === 'EXPIRED'"
              class="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
              title="Reactivate"
              @click="handleReactivate(row as unknown as License)"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <EmptyState
        v-if="licenses.length === 0"
        title="No licenses found"
        description="License data will appear here once clients are registered."
      >
        <template #icon><CreditCard class="w-6 h-6" /></template>
      </EmptyState>
    </template>
  </div>
</template>
