<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { billingService } from '@/services/billing.service'
import dayjs from 'dayjs'
import type { BillingEvent } from '@/types/billing'

const { t } = useI18n()

const page = ref(0)
const pageSize = 20

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['billing', page.value]),
  queryFn: () => billingService.list({ page: page.value, size: pageSize }),
  staleTime: 30000,
})

const events = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY, HH:mm')
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount / 100)
}

function onPage(event: { page: number }) {
  page.value = event.page
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('billing.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('billing.subtitle') }}</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('billing.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-else-if="isLoading" :rows="5" :cols="4" />

    <DataTable v-else lazy :first="page * pageSize" :value="events" :loading="isLoading" :rows="pageSize" :total-records="totalRecords" paginator paginator-template="PrevPageLink PageLinks NextPageLink" striped-rows class="rounded-xl overflow-hidden" @page="onPage">
      <Column field="createdAt" :header="t('billing.date')" sortable style="width: 180px">
        <template #body="{ data: row }: { data: BillingEvent }">
          <span class="text-sm text-[var(--text-muted)] font-mono">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>
      <Column field="type" :header="t('billing.event')" style="min-width: 180px">
        <template #body="{ data: row }: { data: BillingEvent }">
          <span class="text-sm font-medium text-[var(--text)]">{{ row.type }}</span>
        </template>
      </Column>
      <Column field="amount" :header="t('billing.amount')" style="width: 130px">
        <template #body="{ data: row }: { data: BillingEvent }">
          <span class="text-sm font-semibold text-[var(--text)]">{{ row.amount ? formatAmount(row.amount, row.currency || 'MXN') : '—' }}</span>
        </template>
      </Column>
      <Column field="stripeEventId" :header="t('billing.stripeEventId')" style="min-width: 240px">
        <template #body="{ data: row }: { data: BillingEvent }">
          <span class="text-xs text-[var(--text-muted)] font-mono truncate block max-w-xs" :title="row.stripeEventId">{{ row.stripeEventId ?? '—' }}</span>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-10 text-[var(--text-muted)]">{{ t('billing.noRows') }}</div>
      </template>
    </DataTable>

    <!-- Coming soon -->
    <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <p class="text-sm font-medium text-[var(--text)]">{{ t('billing.comingSoon') }}</p>
    </div>
  </div>
</template>
