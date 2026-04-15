<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { auditService } from '@/services/audit.service'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import dayjs from 'dayjs'
import type { AuditLog } from '@/types/audit'

const { t } = useI18n()

const page = ref(0)
const pageSize = 25
const searchAction = ref('')
const searchResource = ref('')
const dateFrom = ref<Date | null>(null)
const dateTo = ref<Date | null>(null)

const queryFilters = computed(() => ({
  page: page.value,
  size: pageSize,
  action: searchAction.value || undefined,
  resourceType: searchResource.value || undefined,
  from: dateFrom.value ? dayjs(dateFrom.value).startOf('day').toISOString() : undefined,
  to: dateTo.value ? dayjs(dateTo.value).endOf('day').toISOString() : undefined,
}))

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['audit', queryFilters.value]),
  queryFn: () => auditService.list(queryFilters.value),
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
  if (action.startsWith('DELETE') || action.includes('DISABLE') || action.includes('FAILED') || action.includes('CANCELLED') || action.includes('SUSPENDED')) return 'danger'
  if (action.startsWith('CREATE') || action.startsWith('REGISTER') || action.includes('ACTIVATED') || action.includes('REACTIVATED') || action.includes('RESOLVED')) return 'success'
  if (action.startsWith('UPDATE') || action.startsWith('PATCH') || action.includes('CHANGED') || action.includes('ASSIGNED')) return 'warn'
  if (action === 'LOGIN') return 'info'
  if (action === 'LOGOUT') return 'secondary'
  return 'secondary'
}

function resultSeverity(result?: string): 'success' | 'danger' | 'warn' | 'secondary' {
  if (result === 'SUCCESS') return 'success'
  if (result === 'FAILURE') return 'danger'
  if (result === 'PARTIAL') return 'warn'
  return 'secondary'
}

function tryFormatJson(raw?: string): string {
  if (!raw) return '—'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0 }, 400)
}

function clearFilters() {
  searchAction.value = ''
  searchResource.value = ''
  dateFrom.value = null
  dateTo.value = null
  page.value = 0
}

const expandedRows = ref<Record<string, boolean>>({})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('audit.title') }}</h2>
          <p class="text-sm text-[var(--text-muted)]">{{ t('audit.totalCount', { count: totalRecords }) }}</p>
        </div>
        <PageInfoButton :title="t('audit.title')" :description="t('pageInfo.audit')" />
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <InputText v-model="searchAction" :placeholder="t('audit.filterAction')" class="flex-1 min-w-[160px]" @input="onSearch" />
      <InputText v-model="searchResource" :placeholder="t('audit.filterResource')" class="flex-1 min-w-[160px]" @input="onSearch" />
      <DatePicker v-model="dateFrom" :placeholder="t('audit.filterFrom')" show-icon date-format="dd M yy" class="flex-1 min-w-[160px]" @update:model-value="page = 0" />
      <DatePicker v-model="dateTo" :placeholder="t('audit.filterTo')" show-icon date-format="dd M yy" class="flex-1 min-w-[160px]" @update:model-value="page = 0" />
      <Button icon="pi pi-times" severity="secondary" outlined :title="t('audit.clearFilters')" @click="clearFilters" />
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('audit.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="7" />

    <DataTable
      v-else
      v-model:expanded-rows="expandedRows"
      lazy
      :first="page * pageSize"
      :value="logs"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      paginator-template="PrevPageLink PageLinks NextPageLink"
      striped-rows
      class="rounded-xl overflow-hidden text-sm"
      data-key="id"
      @page="onPage"
    >
      <Column expander style="width: 3rem" />
      <Column field="createdAt" :header="t('audit.timestamp')" sortable style="width: 175px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>
      <Column field="userName" :header="t('audit.user')" style="min-width: 150px">
        <template #body="{ data: row }: { data: AuditLog }">
          <div>
            <span class="text-[var(--text)] font-medium">{{ row.userName ?? t('audit.system') }}</span>
            <span v-if="row.userEmail" class="block text-xs text-[var(--text-muted)]">{{ row.userEmail }}</span>
          </div>
        </template>
      </Column>
      <Column field="action" :header="t('audit.action')" style="width: 200px">
        <template #body="{ data: row }: { data: AuditLog }">
          <Tag :severity="actionSeverity(row.action)" :value="row.action" class="text-xs font-mono" />
        </template>
      </Column>
      <Column field="result" :header="t('audit.result')" style="width: 110px">
        <template #body="{ data: row }: { data: AuditLog }">
          <Tag v-if="row.result" :severity="resultSeverity(row.result)" :value="row.result" class="text-xs" />
          <span v-else class="text-[var(--text-muted)] text-xs">—</span>
        </template>
      </Column>
      <Column field="resourceType" :header="t('audit.resource')" style="width: 140px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ row.resourceType ?? '—' }}</span>
        </template>
      </Column>
      <Column field="ipAddress" :header="t('audit.ip')" style="width: 130px">
        <template #body="{ data: row }: { data: AuditLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ row.ipAddress ?? '—' }}</span>
        </template>
      </Column>

      <!-- Expanded row: resourceId, oldValue, newValue -->
      <template #expansion="{ data: row }: { data: AuditLog }">
        <div class="px-4 py-3 space-y-3 bg-[var(--surface)] text-sm">
          <div v-if="row.resourceId" class="flex gap-2">
            <span class="font-medium text-[var(--text-muted)] w-28 shrink-0">{{ t('audit.resourceId') }}</span>
            <span class="font-mono text-xs text-[var(--text)] break-all">{{ row.resourceId }}</span>
          </div>
          <div v-if="row.oldValue" class="flex gap-2">
            <span class="font-medium text-[var(--text-muted)] w-28 shrink-0">{{ t('audit.oldValue') }}</span>
            <pre class="font-mono text-xs text-orange-600 dark:text-orange-400 whitespace-pre-wrap break-all max-h-40 overflow-auto">{{ tryFormatJson(row.oldValue) }}</pre>
          </div>
          <div v-if="row.newValue" class="flex gap-2">
            <span class="font-medium text-[var(--text-muted)] w-28 shrink-0">{{ t('audit.newValue') }}</span>
            <pre class="font-mono text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap break-all max-h-40 overflow-auto">{{ tryFormatJson(row.newValue) }}</pre>
          </div>
          <div v-if="!row.resourceId && !row.oldValue && !row.newValue" class="text-[var(--text-muted)] text-xs italic">
            {{ t('audit.noDetails') }}
          </div>
        </div>
      </template>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">{{ t('audit.noRows') }}</div>
      </template>
    </DataTable>
  </div>
</template>
