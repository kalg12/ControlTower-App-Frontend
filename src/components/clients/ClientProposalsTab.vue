<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
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
    DRAFT: 'Borrador', SENT: 'Enviada', VIEWED: 'Vista',
    ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', EXPIRED: 'Vencida',
  }
  return map[status] ?? status
}

const statusOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Enviada', value: 'SENT' },
  { label: 'Vista', value: 'VIEWED' },
  { label: 'Aceptada', value: 'ACCEPTED' },
  { label: 'Rechazada', value: 'REJECTED' },
  { label: 'Vencida', value: 'EXPIRED' },
]

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
        placeholder="Estado"
        class="w-44"
      />
      <Button label="Nueva propuesta" icon="pi pi-plus" @click="goNew" />
    </div>

    <DataTable
      :value="proposals"
      :loading="isLoading"
      stripedRows
      tableStyle="min-width: 40rem"
    >
      <Column field="number" header="Número" style="width: 140px">
        <template #body="{ data }">
          <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
            @click="router.push(`/proposals/${data.id}`)">
            {{ data.number }}
          </span>
        </template>
      </Column>
      <Column field="title" header="Título" />
      <Column field="status" header="Estado" style="width: 120px">
        <template #body="{ data }">
          <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
        </template>
      </Column>
      <Column field="total" header="Total" style="width: 160px">
        <template #body="{ data }">
          <span class="font-semibold">{{ formatCurrency(data.total, data.currency) }}</span>
        </template>
      </Column>
      <Column field="createdAt" header="Fecha" style="width: 120px">
        <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
      </Column>
      <Column header="" style="width: 60px">
        <template #body="{ data }">
          <Button icon="pi pi-arrow-right" text size="small" @click="router.push(`/proposals/${data.id}`)" v-tooltip="'Ver detalle'" />
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-file-edit text-3xl mb-2 block opacity-40" />
          <p class="text-sm">No hay propuestas para este cliente.</p>
          <Button label="Crear primera propuesta" text size="small" class="mt-2" @click="goNew" />
        </div>
      </template>
    </DataTable>
  </div>
</template>
