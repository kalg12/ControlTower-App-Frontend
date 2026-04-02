<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import { billingService } from '@/services/billing.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Invoice, InvoiceStatus } from '@/types/billing'

const toast = useToast()

const { data: overview, isLoading, isError, refetch } = useQuery({
  queryKey: ['billing-overview'],
  queryFn: () => billingService.getOverview(),
  staleTime: 60000,
  retry: 1
})

const invoices = computed(() => overview.value?.invoices ?? [])
const subscription = computed(() => overview.value?.subscription)

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD MMM YYYY')
}

function invoiceSeverity(status: InvoiceStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<InvoiceStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    PAID: 'success',
    OPEN: 'info',
    DRAFT: 'secondary',
    VOID: 'secondary',
    UNCOLLECTIBLE: 'danger'
  }
  return map[status] ?? 'secondary'
}

function subStatusSeverity(status: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  if (status === 'ACTIVE' || status === 'TRIALING') return 'success'
  if (status === 'PAST_DUE' || status === 'INCOMPLETE') return 'danger'
  if (status === 'CANCELED') return 'secondary'
  return 'warn'
}

async function openPortal() {
  try {
    const { url } = await billingService.createPortalSession()
    window.open(url, '_blank')
  } catch {
    toast.error('Failed to open billing portal')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Billing</h2>
        <p class="text-sm text-[var(--text-muted)]">Manage your subscription and invoices</p>
      </div>
      <Button label="Manage Billing" icon="pi pi-external-link" severity="secondary" outlined @click="openPortal" />
    </div>

    <!-- Error -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load billing data. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Loading skeletons -->
    <template v-if="isLoading">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard v-for="i in 3" :key="i" />
      </div>
    </template>

    <template v-else>
      <!-- Subscription card -->
      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-[var(--text)]">Subscription</h3>
        </template>

        <div v-if="subscription" class="flex items-center justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              <p class="font-semibold text-[var(--text)] capitalize">{{ subscription.plan }}</p>
              <Tag :severity="subStatusSeverity(subscription.status)" :value="subscription.status" />
            </div>
            <p class="text-sm text-[var(--text-muted)]">
              Current period: {{ formatDate(subscription.currentPeriodStart) }} — {{ formatDate(subscription.currentPeriodEnd) }}
            </p>
            <p v-if="subscription.cancelAtPeriodEnd" class="text-sm text-amber-500 font-medium">
              Cancels at end of current period
            </p>
          </div>
        </div>

        <div v-else class="text-sm text-[var(--text-muted)]">
          No active subscription found.
        </div>
      </Card>

      <!-- Stats row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Total Paid</p>
          <p class="text-2xl font-bold text-[var(--text)] mt-1">
            {{ overview ? formatAmount(overview.totalPaid, overview.currency) : '—' }}
          </p>
        </Card>
        <Card>
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Total Due</p>
          <p class="text-2xl font-bold text-amber-500 mt-1">
            {{ overview ? formatAmount(overview.totalDue, overview.currency) : '—' }}
          </p>
        </Card>
        <Card>
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Invoices</p>
          <p class="text-2xl font-bold text-[var(--text)] mt-1">{{ invoices.length }}</p>
        </Card>
      </div>

      <!-- Invoices table -->
      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-[var(--text)]">Invoice History</h3>
        </template>

        <DataTable
          :value="invoices"
          :rows="10"
          paginator
          striped-rows
          class="text-sm"
        >
          <Column field="createdAt" header="Date" sortable style="width: 130px">
            <template #body="{ data: row }: { data: Invoice }">
              <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
            </template>
          </Column>

          <Column field="description" header="Description" style="min-width: 180px">
            <template #body="{ data: row }: { data: Invoice }">
              <span class="text-[var(--text)]">{{ row.description ?? 'Subscription invoice' }}</span>
            </template>
          </Column>

          <Column field="amount" header="Amount" style="width: 130px">
            <template #body="{ data: row }: { data: Invoice }">
              <span class="font-semibold text-[var(--text)]">{{ formatAmount(row.amount, row.currency) }}</span>
            </template>
          </Column>

          <Column field="status" header="Status" style="width: 120px">
            <template #body="{ data: row }: { data: Invoice }">
              <Tag :severity="invoiceSeverity(row.status)" :value="row.status" />
            </template>
          </Column>

          <Column field="dueDate" header="Due Date" style="width: 120px">
            <template #body="{ data: row }: { data: Invoice }">
              <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.dueDate) }}</span>
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-6 text-[var(--text-muted)]">No invoices found</div>
          </template>
        </DataTable>
      </Card>
    </template>
  </div>
</template>
