<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { tenantsService } from '@/services/tenants.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Tenant } from '@/types/tenant'

const toast = useToast()
const queryClient = useQueryClient()
const confirm = useConfirm()

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')
const actionLoading = ref<string | null>(null)

const { data: result, isLoading } = useQuery({
  queryKey: computed(() => ['tenants', page.value]),
  queryFn: () => tenantsService.list({ page: page.value, size: pageSize }),
  staleTime: 15000
})

const tenants = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const filteredTenants = computed(() => {
  const q = globalFilter.value.trim().toLowerCase()
  if (!q) return tenants.value
  return tenants.value.filter(t =>
    t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
  )
})

function statusSeverity(status: Tenant['status']): 'success' | 'warn' | 'secondary' {
  const map: Record<string, 'success' | 'warn' | 'secondary'> = {
    ACTIVE: 'success',
    SUSPENDED: 'warn',
    INACTIVE: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

function suspendTenant(tenant: Tenant) {
  confirm.require({
    message: `Suspend "${tenant.name}"? They will lose access.`,
    header: 'Suspend Tenant',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Suspend', severity: 'warn' },
    accept: async () => {
      actionLoading.value = tenant.id
      try {
        await tenantsService.suspend(tenant.id)
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
        toast.success('Tenant suspended', `"${tenant.name}" has been suspended.`)
      } catch {
        toast.error('Failed to suspend tenant')
      } finally {
        actionLoading.value = null
      }
    }
  })
}

function reactivateTenant(tenant: Tenant) {
  confirm.require({
    message: `Reactivate "${tenant.name}"?`,
    header: 'Reactivate Tenant',
    icon: 'pi pi-check-circle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Reactivate', severity: 'success' },
    accept: async () => {
      actionLoading.value = tenant.id
      try {
        await tenantsService.reactivate(tenant.id)
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
        toast.success('Tenant reactivated', `"${tenant.name}" is now active.`)
      } catch {
        toast.error('Failed to reactivate tenant')
      } finally {
        actionLoading.value = null
      }
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Tenants</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total tenants</p>
      </div>
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        @click="queryClient.invalidateQueries({ queryKey: ['tenants'] })"
      />
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search tenants..."
        class="max-w-md"
      />
    </div>

    <!-- DataTable -->
    <DataTable
      :value="filteredTenants"
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
        <template #body="{ data: row }: { data: Tenant }">
          <p class="text-sm font-medium text-[var(--text)]">{{ row.name }}</p>
        </template>
      </Column>

      <Column field="slug" header="Slug" style="min-width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="text-sm font-mono text-[var(--text-muted)]">{{ row.slug }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 120px">
        <template #body="{ data: row }: { data: Tenant }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
          <div class="flex items-center gap-2">
            <Button
              v-if="row.status === 'ACTIVE'"
              label="Suspend"
              severity="warn"
              size="small"
              outlined
              :loading="actionLoading === row.id"
              @click="suspendTenant(row)"
            />
            <Button
              v-else-if="row.status === 'SUSPENDED'"
              label="Reactivate"
              severity="success"
              size="small"
              outlined
              :loading="actionLoading === row.id"
              @click="reactivateTenant(row)"
            />
            <span v-else class="text-[var(--text-muted)] text-sm">—</span>
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No tenants found</div>
      </template>
    </DataTable>
  </div>
</template>
