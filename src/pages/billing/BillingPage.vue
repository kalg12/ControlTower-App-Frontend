<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Card from '@/components/ui/Card.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { billingService } from '@/services/billing.service'
import dayjs from 'dayjs'
import type { BillingEvent } from '@/types/billing'

const page = ref(0)
const pageSize = 20

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['billing-events', page.value]),
  queryFn: () => billingService.listEvents(page.value, pageSize),
  staleTime: 30000,
  retry: 1
})

const events = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function onPage(event: { page: number }) {
  page.value = event.page
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY HH:mm')
}

function formatAmount(amount?: number, currency?: string) {
  if (amount == null) return '—'
  const curr = (currency ?? 'USD').toUpperCase()
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount)
}

function eventSeverity(eventType: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (eventType.includes('PAYMENT_SUCCESS') || eventType.includes('PAID')) return 'success'
  if (eventType.includes('REFUND')) return 'warn'
  if (eventType.includes('FAIL') || eventType.includes('DISPUTE')) return 'danger'
  if (eventType.includes('SUBSCRIPTION')) return 'info'
  return 'secondary'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Billing</h2>
        <p class="text-sm text-[var(--text-muted)]">Stripe billing event history for this tenant</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined v-tooltip.top="'Refresh'" @click="refetch()" />
    </div>

    <!-- Error -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load billing events. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Billing events table -->
    <Card>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-[var(--text)]">Event History</h3>
          <span class="text-xs text-[var(--text-muted)]">{{ totalRecords }} total events</span>
        </div>
      </template>

      <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="4" />

      <DataTable
        v-else
        lazy
        :first="page * pageSize"
        :value="events"
        :loading="isLoading"
        :rows="pageSize"
        :total-records="totalRecords"
        paginator
        striped-rows
        class="text-sm"
        @page="onPage"
      >
        <Column field="createdAt" header="Date" sortable style="width: 160px">
          <template #body="{ data: row }: { data: BillingEvent }">
            <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
          </template>
        </Column>

        <Column field="eventType" header="Event" style="min-width: 200px">
          <template #body="{ data: row }: { data: BillingEvent }">
            <div class="flex items-center gap-2">
              <Tag :severity="eventSeverity(row.eventType)" :value="row.eventType" class="text-xs font-mono" />
            </div>
          </template>
        </Column>

        <Column field="amount" header="Amount" style="width: 130px">
          <template #body="{ data: row }: { data: BillingEvent }">
            <span class="font-semibold text-[var(--text)]">{{ formatAmount(row.amount, row.currency) }}</span>
          </template>
        </Column>

        <Column field="stripeEventId" header="Stripe Event ID" style="min-width: 180px">
          <template #body="{ data: row }: { data: BillingEvent }">
            <span class="text-xs text-[var(--text-muted)] font-mono truncate block max-w-[180px]">
              {{ row.stripeEventId ?? '—' }}
            </span>
          </template>
        </Column>

        <template #empty>
          <div class="text-center py-8 text-[var(--text-muted)]">No billing events found</div>
        </template>
      </DataTable>
    </Card>

    <!-- Coming soon note -->
    <div class="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text-muted)]">
      <span class="font-medium text-[var(--text)]">Subscription management</span> — Invoice history, plan management, and Stripe customer portal are coming in a future update.
    </div>
  </div>
</template>
