<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { ticketsService } from '@/services/tickets.service'
import dayjs from 'dayjs'
import type { Ticket, TicketStatus, TicketPriority } from '@/types/ticket'

const page = ref(0)
const pageSize = 20
const statusFilter = ref<TicketStatus | null>(null)
const priorityFilter = ref<TicketPriority | null>(null)
const globalFilter = ref('')

const { data: result, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['tickets', page.value, statusFilter.value, priorityFilter.value]),
  queryFn: () => ticketsService.list({
    page: page.value,
    size: pageSize,
    status: statusFilter.value ?? undefined,
    priority: priorityFilter.value ?? undefined,
    search: globalFilter.value || undefined
  }),
  staleTime: 15000
})

const tickets = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const statuses: { label: string; value: TicketStatus | null }[] = [
  { label: 'All Status', value: null },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending Customer', value: 'PENDING_CUSTOMER' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]

const priorities: { label: string; value: TicketPriority | null }[] = [
  { label: 'All Priority', value: null },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' }
]

function statusSeverity(status: TicketStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    OPEN: 'info',
    IN_PROGRESS: 'warn',
    PENDING_CUSTOMER: 'warn',
    RESOLVED: 'success',
    CLOSED: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function prioritySeverity(priority: TicketPriority): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketPriority, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    LOW: 'secondary',
    MEDIUM: 'warn',
    HIGH: 'danger',
    CRITICAL: 'danger'
  }
  return map[priority] ?? 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

function applyFilters() {
  page.value = 0
  refetch()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; refetch() }, 400)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Support Tickets</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total tickets</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search tickets..."
        class="flex-1"
        @input="onSearch"
      />
      <Select
        v-model="statusFilter"
        :options="statuses"
        option-label="label"
        option-value="value"
        placeholder="All Status"
        class="w-48"
        @change="applyFilters"
      />
      <Select
        v-model="priorityFilter"
        :options="priorities"
        option-label="label"
        option-value="value"
        placeholder="All Priority"
        class="w-44"
        @change="applyFilters"
      />
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- DataTable -->
    <DataTable
      :value="tickets"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      lazy
      :paginator-template="'PrevPageLink PageLinks NextPageLink RowsPerPageDropdown'"
      :rows-per-page-options="[10, 20, 50]"
      removable-sort
      striped-rows
      class="rounded-xl overflow-hidden"
      @page="onPage"
    >
      <Column field="title" header="Title" sortable style="min-width: 240px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="font-medium text-[var(--text)] line-clamp-1">{{ row.title }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 150px">
        <template #body="{ data: row }: { data: Ticket }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status.replace('_', ' ')" />
        </template>
      </Column>

      <Column field="priority" header="Priority" style="width: 110px">
        <template #body="{ data: row }: { data: Ticket }">
          <Tag :severity="prioritySeverity(row.priority)" :value="row.priority" />
        </template>
      </Column>

      <Column field="clientId" header="Client" style="min-width: 140px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.clientId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No tickets found</div>
      </template>
    </DataTable>
  </div>
</template>
