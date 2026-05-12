<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { proposalsService } from '@/services/proposals.service'
import { qk } from '@/queries/keys'
import dayjs from 'dayjs'
import type { ProposalStatus } from '@/types/proposal'

const props = defineProps<{ clientId: string }>()
const router = useRouter()
const { t } = useI18n()

const statusFilter = ref<ProposalStatus | undefined>(undefined)

const { data: result, isLoading } = useQuery({
  queryKey: qk.proposalsByClient(props.clientId, statusFilter.value),
  queryFn: () => proposalsService.listByClient(props.clientId, {
    status: statusFilter.value,
    page: 0,
    size: 50,
  }),
  staleTime: 30000,
})

const proposals = computed(() => result.value?.content ?? [])

function statusSeverity(status: ProposalStatus) {
  const map: Record<ProposalStatus, string> = {
    DRAFT: 'secondary', SENT: 'info', VIEWED: 'warn',
    ACCEPTED: 'success', REJECTED: 'danger', EXPIRED: 'secondary',
  }
  return map[status] ?? 'secondary'
}

function statusLabel(status: ProposalStatus) {
  const map: Record<ProposalStatus, string> = {
    DRAFT: t('proposals.status.draft'), SENT: t('proposals.status.sent'), VIEWED: t('proposals.status.viewed'),
    ACCEPTED: t('proposals.status.accepted'), REJECTED: t('proposals.status.rejected'), EXPIRED: t('proposals.status.expired'),
  }
  return map[status] ?? status
}

const statusOptions = computed(() => [
  { label: t('proposals.status.all'), value: undefined },
  { label: t('proposals.status.draft'), value: 'DRAFT' },
  { label: t('proposals.status.sent'), value: 'SENT' },
  { label: t('proposals.status.viewed'), value: 'VIEWED' },
  { label: t('proposals.status.accepted'), value: 'ACCEPTED' },
  { label: t('proposals.status.rejected'), value: 'REJECTED' },
  { label: t('proposals.status.expired'), value: 'EXPIRED' },
])

function formatCurrency(amount: number, currency: string) {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${currency}`
}

function formatDate(d?: string | null) {
  return d ? dayjs(d).format('DD MMM YYYY') : '—'
}

function goNew() {
  router.push(`/proposals/new?clientId=${props.clientId}`)
}
</script>

<template>
  <div class="space-y-3 pt-2">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="$t('clientDetail.statusPlaceholder')"
        class="w-44"
      />
      <Button :label="$t('clientDetail.newProposal')" icon="pi pi-plus" @click="goNew" />
    </div>

    <DataTable
      :value="proposals"
      :loading="isLoading"
      stripedRows
      tableStyle="min-width: 40rem"
    >
      <Column field="number" :header="$t('clientDetail.columnNumber')" style="width: 140px">
        <template #body="{ data }">
          <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
            @click="router.push(`/proposals/${data.id}`)">
            {{ data.number }}
          </span>
        </template>
      </Column>
      <Column field="title" :header="$t('clientDetail.columnTitle')" />
      <Column field="status" :header="$t('clientDetail.columnStatus')" style="width: 120px">
        <template #body="{ data }">
          <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
        </template>
      </Column>
      <Column field="total" :header="$t('clientDetail.columnTotal')" style="width: 160px">
        <template #body="{ data }">
          <span class="font-semibold">{{ formatCurrency(data.total, data.currency) }}</span>
        </template>
      </Column>
      <Column field="createdAt" :header="$t('clientDetail.columnDate')" style="width: 120px">
        <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
      </Column>
      <Column header="" style="width: 60px">
        <template #body="{ data }">
          <Button icon="pi pi-arrow-right" text size="small" @click="router.push(`/proposals/${data.id}`)" v-tooltip="$t('clientDetail.viewDetail')" />
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-file-edit text-3xl mb-2 block opacity-40" />
          <p class="text-sm">{{ $t('clientDetail.noProposals') }}</p>
          <Button :label="$t('clientDetail.createFirstProposal')" text size="small" class="mt-2" @click="goNew" />
        </div>
      </template>
    </DataTable>
  </div>
</template>
