<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { licensesService } from '@/services/licenses.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { License } from '@/types/license'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: ['licenses'],
  queryFn: () => licensesService.list({ page: 0, size: 200 }),
  staleTime: 30000,
})

const licenses = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function periodEndText(license: License) {
  if (!license.currentPeriodEnd) return '—'
  const diff = dayjs(license.currentPeriodEnd).diff(dayjs(), 'day')
  if (diff < 0) return t('licenses.expiredAgo', { days: Math.abs(diff) })
  if (diff === 0) return t('licenses.expiresToday')
  return t('licenses.daysLeft', { days: diff })
}

function statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'TRIAL') return 'warn'
  if (status === 'EXPIRED' || status === 'CANCELLED') return 'danger'
  return 'secondary'
}

function confirmSuspend(license: License) {
  const clientName = license.clientName || license.id
  confirm.require({
    message: license.status === 'SUSPENDED'
      ? t('licenses.reactivateConfirm', { client: clientName })
      : t('licenses.suspendConfirm', { client: clientName }),
    header: license.status === 'SUSPENDED' ? t('licenses.reactivateTitle') : t('licenses.suspendTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: license.status === 'SUSPENDED' ? t('common.reactivate') : t('common.suspend'), severity: license.status === 'SUSPENDED' ? 'success' : 'warn' },
    accept: async () => {
      try {
        if (license.status === 'SUSPENDED') {
          await licensesService.reactivate(license.id)
          toast.success(t('licenses.reactivateSuccess'))
        } else {
          await licensesService.suspend(license.id)
          toast.success(t('licenses.suspendSuccess'))
        }
        await queryClient.invalidateQueries({ queryKey: ['licenses'] })
      } catch {
        toast.error(license.status === 'SUSPENDED' ? t('licenses.reactivateFailed') : t('licenses.suspendFailed'))
      }
    }
  })
}

function confirmCancel(license: License) {
  confirm.require({
    message: t('licenses.cancelConfirm', { client: license.clientName || license.id }),
    header: t('licenses.cancelTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('licenses.keepLicense'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.cancel'), severity: 'danger' },
    accept: async () => {
      try {
        await licensesService.cancel(license.id)
        await queryClient.invalidateQueries({ queryKey: ['licenses'] })
        toast.success(t('licenses.cancelSuccess'))
      } catch {
        toast.error(t('licenses.cancelFailed'))
      }
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('licenses.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('licenses.totalCount', { count: totalRecords }) }}</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('licenses.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-else-if="isLoading" :rows="5" :cols="5" />

    <DataTable v-else :value="licenses" striped-rows class="rounded-xl overflow-hidden">
      <Column field="clientName" :header="t('licenses.client')" style="min-width: 180px">
        <template #body="{ data: row }: { data: License }">
          <span class="font-medium text-[var(--text)]">{{ row.clientName ?? '—' }}</span>
        </template>
      </Column>
      <Column field="plan" :header="t('licenses.plan')" style="width: 130px">
        <template #body="{ data: row }: { data: License }">
          <span class="text-sm text-[var(--text-muted)]">{{ row.plan ?? '—' }}</span>
        </template>
      </Column>
      <Column field="status" :header="t('licenses.status')" style="width: 120px">
        <template #body="{ data: row }: { data: License }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>
      <Column field="periodEnd" :header="t('licenses.periodEnd')" style="width: 150px">
        <template #body="{ data: row }: { data: License }">
          <span class="text-sm" :class="row.status === 'EXPIRED' ? 'text-red-500' : 'text-[var(--text-muted)]'">
            {{ periodEndText(row) }}
          </span>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 130px">
        <template #body="{ data: row }: { data: License }">
          <div class="flex gap-1">
            <Button :icon="row.status === 'SUSPENDED' ? 'pi pi-play' : 'pi pi-pause'" :severity="row.status === 'SUSPENDED' ? 'success' : 'warn'" text rounded size="small" v-tooltip.top="row.status === 'SUSPENDED' ? t('common.reactivate') : t('common.suspend')" @click="confirmSuspend(row)" />
            <Button v-if="row.status !== 'CANCELLED' && row.status !== 'EXPIRED'" icon="pi pi-ban" severity="danger" text rounded size="small" v-tooltip.top="t('licenses.cancel')" @click="confirmCancel(row)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-10 text-[var(--text-muted)]">{{ t('licenses.noRows') }}</div>
      </template>
    </DataTable>
  </div>
</template>
