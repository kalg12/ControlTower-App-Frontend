<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { useToast } from '@/composables/useToast'
import { licensesService } from '@/services/licenses.service'
import dayjs from 'dayjs'
import type { License, LicenseStatus } from '@/types/license'

const toast = useToast()
const queryClient = useQueryClient()
const confirm = useConfirm()
const page = ref(0)
const pageSize = 20

const { data: result, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['licenses', page.value]),
  queryFn: () => licensesService.list({ page: page.value, size: pageSize }),
  staleTime: 15000
})

const licenses = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function statusSeverity(status: LicenseStatus): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
  const map: Record<LicenseStatus, 'success' | 'warn' | 'danger' | 'secondary' | 'info'> = {
    ACTIVE: 'success',
    TRIAL: 'info',
    EXPIRED: 'danger',
    SUSPENDED: 'warn',
    CANCELLED: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = dayjs(dateStr)
  const diff = d.diff(dayjs(), 'day')
  if (diff < 0) return `Expired ${Math.abs(diff)}d ago`
  if (diff === 0) return 'Expires today'
  if (diff <= 7) return `${diff}d left`
  return d.format('DD MMM YYYY')
}

function isExpiringSoon(dateStr?: string): boolean {
  if (!dateStr) return false
  const diff = dayjs(dateStr).diff(dayjs(), 'day')
  return diff >= 0 && diff <= 14
}

function onPage(event: { page: number }) {
  page.value = event.page
}

function handleSuspend(license: License) {
  confirm.require({
    message: `Suspend license for ${license.clientName ?? license.clientId}?`,
    header: 'Suspend License',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Suspend', severity: 'warn' },
    accept: async () => {
      try {
        await licensesService.suspend(license.id)
        queryClient.invalidateQueries({ queryKey: ['licenses'] })
        toast.success('License suspended')
      } catch {
        toast.error('Failed to suspend license')
      }
    }
  })
}

function handleReactivate(license: License) {
  confirm.require({
    message: `Reactivate license for ${license.clientName ?? license.clientId}?`,
    header: 'Reactivate License',
    icon: 'pi pi-check-circle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Reactivate', severity: 'success' },
    accept: async () => {
      try {
        await licensesService.reactivate(license.id)
        queryClient.invalidateQueries({ queryKey: ['licenses'] })
        toast.success('License reactivated')
      } catch {
        toast.error('Failed to reactivate license')
      }
    }
  })
}

function handleCancel(license: License) {
  confirm.require({
    message: `Cancel license for ${license.clientName ?? license.clientId}? This cannot be undone.`,
    header: 'Cancel License',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Keep License', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Cancel License', severity: 'danger' },
    accept: async () => {
      try {
        await licensesService.cancel(license.id)
        queryClient.invalidateQueries({ queryKey: ['licenses'] })
        toast.success('License cancelled')
      } catch {
        toast.error('Failed to cancel license')
      }
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Licenses</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total licenses</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <DataTable
      :value="licenses"
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
      <Column field="clientId" header="Client" sortable style="min-width: 150px">
        <template #body="{ data: row }: { data: License }">
          <span class="font-medium text-[var(--text)] text-sm">{{ row.clientName ?? row.clientId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="planName" header="Plan" style="min-width: 120px">
        <template #body="{ data: row }: { data: License }">
          <span class="text-[var(--text)] text-sm">{{ row.planName ?? row.plan?.name ?? '—' }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 120px">
        <template #body="{ data: row }: { data: License }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>

      <Column field="currentPeriodEnd" header="Period End" sortable style="width: 150px">
        <template #body="{ data: row }: { data: License }">
          <span
            class="text-sm"
            :class="isExpiringSoon(row.currentPeriodEnd)
              ? 'text-amber-500 font-medium'
              : row.status === 'EXPIRED' ? 'text-red-500' : 'text-[var(--text-muted)]'"
          >
            {{ formatDate(row.currentPeriodEnd) }}
          </span>
        </template>
      </Column>

      <Column header="Actions" style="width: 130px">
        <template #body="{ data: row }: { data: License }">
          <div class="flex items-center gap-1">
            <Button
              v-if="row.status === 'ACTIVE' || row.status === 'TRIAL'"
              icon="pi pi-pause"
              severity="warn"
              text
              rounded
              v-tooltip.top="'Suspend'"
              @click="handleSuspend(row)"
            />
            <Button
              v-if="row.status === 'SUSPENDED' || row.status === 'EXPIRED'"
              icon="pi pi-play"
              severity="success"
              text
              rounded
              v-tooltip.top="'Reactivate'"
              @click="handleReactivate(row)"
            />
            <Button
              v-if="row.status !== 'CANCELLED'"
              icon="pi pi-times-circle"
              severity="danger"
              text
              rounded
              v-tooltip.top="'Cancel license'"
              @click="handleCancel(row)"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No licenses found</div>
      </template>
    </DataTable>
  </div>
</template>
