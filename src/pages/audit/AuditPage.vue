<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { auditService } from '@/services/audit.service'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import dayjs from 'dayjs'
import type { AuditLog } from '@/types/audit'

const page = ref(0)
const pageSize = 25
const searchUser = ref('')
const searchAction = ref('')

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['audit', page.value, searchUser.value, searchAction.value]),
  queryFn: () => auditService.list({
    page: page.value,
    size: pageSize,
    userId: searchUser.value || undefined,
    action: searchAction.value || undefined
  }),
  staleTime: 20000
})

const logs = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY HH:mm:ss')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

function actionSeverity(action: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  if (action.startsWith('DELETE') || action.includes('DISABLE')) return 'danger'
  if (action.startsWith('CREATE') || action.startsWith('REGISTER')) return 'success'
  if (action.startsWith('UPDATE') || action.startsWith('PATCH')) return 'warn'
  return 'secondary'
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
        <h2 class="text-lg font-semibold text-[var(--text)]">Audit Log</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} events recorded</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <InputText
        v-model="searchUser"
        placeholder="Filter by user..."
        class="flex-1"
        @input="onSearch"
      />
      <InputText
        v-model="searchAction"
        placeholder="Filter by action..."
        class="flex-1"
        @input="onSearch"
      />
    </div>

    <!-- Error state -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load audit logs. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="5" />

    <!-- DataTable -->
    <DataTable
      v-else
      :value="logs"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      lazy
      paginator-template="PrevPageLink PageLinks NextPageLink"
      striped-rows
      class="rounded-xl overflow-hidden text-sm"
      @page="onPage"
    >
      <Column field="createdAt" header="Timestamp" sortable style="width: 180px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column field="userName" header="User" style="min-width: 140px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text)]">{{ row.userName ?? row.userId ?? 'System' }}</span>
        </template>
      </Column>

      <Column field="action" header="Action" style="width: 180px">
        <template #body="{ data: row }: { data: AuditLog }">
          <Tag :severity="actionSeverity(row.action)" :value="row.action" class="text-xs font-mono" />
        </template>
      </Column>

      <Column field="resourceType" header="Resource" style="width: 140px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ row.resourceType }}</span>
        </template>
      </Column>

      <Column field="resourceId" header="Resource ID" style="width: 200px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs truncate block max-w-[180px]">{{ row.resourceId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="details" header="Details" style="min-width: 200px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] text-xs line-clamp-1">{{ row.details ?? '—' }}</span>
        </template>
      </Column>

      <Column field="ipAddress" header="IP" style="width: 130px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ row.ipAddress ?? '—' }}</span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No audit events found</div>
      </template>
    </DataTable>
  </div>
</template>
