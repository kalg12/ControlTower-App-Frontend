<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { clientsService } from '@/services/clients.service'
import dayjs from 'dayjs'
import type { Client } from '@/types/client'

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')

const { data: result, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['clients', page.value]),
  queryFn: () => clientsService.list({ page: page.value, size: pageSize }),
  staleTime: 15000
})

const clients = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  if (!status) return 'secondary'
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'secondary'
  if (status === 'SUSPENDED') return 'danger'
  return 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
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
        <h2 class="text-lg font-semibold text-[var(--text)]">Clients</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total clients</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search clients..."
        class="max-w-md"
        @input="onSearch"
      />
    </div>

    <!-- DataTable -->
    <DataTable
      :value="clients"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      lazy
      removable-sort
      striped-rows
      class="rounded-xl overflow-hidden"
      @page="onPage"
    >
      <Column field="name" header="Name" sortable style="min-width: 180px">
        <template #body="{ data: row }: { data: Client }">
          <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
        </template>
      </Column>

      <Column field="legalName" header="Legal Name" style="min-width: 160px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.legalName ?? '—' }}</span>
        </template>
      </Column>

      <Column field="country" header="Country" style="width: 110px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.country ?? '—' }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 110px">
        <template #body="{ data: row }: { data: Client }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status ?? 'N/A'" />
        </template>
      </Column>

      <Column field="taxId" header="Tax ID" style="width: 130px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.taxId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No clients found</div>
      </template>
    </DataTable>
  </div>
</template>
