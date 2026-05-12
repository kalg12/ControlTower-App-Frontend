<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { logsService } from '@/services/logs.service'
import { useNotificationsStore } from '@/stores/notifications'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { qk } from '@/queries/keys'
import dayjs from 'dayjs'
import type { RemoteLog, LogLevel } from '@/types/logs'

const { t } = useI18n()
const notifStore = useNotificationsStore()

const page = ref(0)
const pageSize = 50
const levelFilter = ref('')
const serviceFilter = ref('')
const businessFilter = ref('')
const dateFrom = ref<Date | null>(null)
const dateTo = ref<Date | null>(null)

const LEVEL_OPTIONS = [
  { label: t('logs.levelAll'), value: '' },
  { label: 'WARN', value: 'WARN' },
  { label: 'ERROR', value: 'ERROR' },
  { label: 'CRITICAL', value: 'CRITICAL' },
]

const queryFilters = computed(() => ({
  page: page.value,
  size: pageSize,
  level: levelFilter.value || undefined,
  service: serviceFilter.value || undefined,
  businessName: businessFilter.value || undefined,
  from: dateFrom.value ? dayjs(dateFrom.value).startOf('day').toISOString() : undefined,
  to: dateTo.value ? dayjs(dateTo.value).endOf('day').toISOString() : undefined,
}))

const {
  data: result,
  isLoading,
  isError,
  refetch,
} = useQuery({
  queryKey: computed(() => qk.remoteLogs(JSON.stringify(queryFilters.value))),
  queryFn: () => logsService.list(queryFilters.value),
  staleTime: 30_000,
})

const logs = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

// Refresh when a REMOTE_LOG_ERROR notification arrives
watch(
  () => notifStore.items,
  (items) => {
    if (items.some(n => n.type === 'REMOTE_LOG_ERROR' && !n.read)) {
      refetch()
    }
  },
  { deep: true }
)

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY HH:mm:ss')
}

function levelSeverity(level?: LogLevel): 'danger' | 'warn' | 'info' | 'secondary' {
  if (level === 'CRITICAL' || level === 'ERROR') return 'danger'
  if (level === 'WARN') return 'warn'
  if (level === 'INFO') return 'info'
  return 'secondary'
}

function truncate(msg: string, len = 120) {
  return msg.length > len ? msg.substring(0, len) + '…' : msg
}

function onPage(event: { page: number }) {
  page.value = event.page
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0 }, 400)
}

function clearFilters() {
  levelFilter.value = ''
  serviceFilter.value = ''
  businessFilter.value = ''
  dateFrom.value = null
  dateTo.value = null
  page.value = 0
}

const expandedRows = ref<Record<string, boolean>>({})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('logs.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('logs.subtitle') }}</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <Select
        v-model="levelFilter"
        :options="LEVEL_OPTIONS"
        option-label="label"
        option-value="value"
        :placeholder="t('logs.levelFilter')"
        class="min-w-[160px]"
        @change="page = 0"
      />
      <InputText
        v-model="serviceFilter"
        :placeholder="t('logs.serviceFilter')"
        class="flex-1 min-w-[150px]"
        @input="onSearch"
      />
      <InputText
        v-model="businessFilter"
        :placeholder="t('logs.businessFilter')"
        class="flex-1 min-w-[150px]"
        @input="onSearch"
      />
      <DatePicker
        v-model="dateFrom"
        :placeholder="t('logs.from')"
        show-icon
        date-format="dd M yy"
        class="min-w-[150px]"
        @update:model-value="page = 0"
      />
      <DatePicker
        v-model="dateTo"
        :placeholder="t('logs.to')"
        show-icon
        date-format="dd M yy"
        class="min-w-[150px]"
        @update:model-value="page = 0"
      />
      <Button icon="pi pi-times" severity="secondary" outlined :title="$t('logsPage.clearFilters')" @click="clearFilters" />
    </div>

    <!-- Error state -->
    <div
      v-if="isError"
      class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between"
    >
      <span>{{ $t('logsPage.loadError') }}</span>
      <Button :label="$t('logsPage.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-if="isLoading && !result" :rows="8" :cols="5" />

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
      :empty-message="t('logs.noRows')"
      @page="onPage"
    >
      <Column expander style="width: 3rem" />

      <Column :header="t('logs.colTime')" style="width: 175px">
        <template #body="{ data: row }: { data: RemoteLog }">
          <span class="text-[var(--text-muted)] font-mono text-xs">{{ formatDate(row.receivedAt) }}</span>
        </template>
      </Column>

      <Column :header="t('logs.colLevel')" style="width: 110px">
        <template #body="{ data: row }: { data: RemoteLog }">
          <Tag :severity="levelSeverity(row.level)" :value="row.level" class="text-xs font-mono" />
        </template>
      </Column>

      <Column :header="t('logs.colBusiness')" style="width: 140px">
        <template #body="{ data: row }: { data: RemoteLog }">
          <span class="text-[var(--text-muted)] text-xs">{{ row.businessName ?? '—' }}</span>
        </template>
      </Column>

      <Column :header="t('logs.colService')" style="width: 160px">
        <template #body="{ data: row }: { data: RemoteLog }">
          <span class="font-mono text-xs text-[var(--text)]">{{ row.serviceName ?? '—' }}</span>
        </template>
      </Column>

      <Column :header="t('logs.colMessage')">
        <template #body="{ data: row }: { data: RemoteLog }">
          <span class="text-[var(--text)] text-xs">{{ truncate(row.message) }}</span>
        </template>
      </Column>

      <!-- Expanded: stack trace + metadata -->
      <template #expansion="{ data: row }: { data: RemoteLog }">
        <div class="px-4 py-3 space-y-3 bg-[var(--surface)] text-sm">
          <div v-if="row.stackTrace">
            <p class="font-medium text-[var(--text-muted)] mb-1 text-xs">{{ t('logs.expandStack') }}</p>
            <pre class="font-mono text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all max-h-60 overflow-auto rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">{{ row.stackTrace }}</pre>
          </div>
          <div v-if="row.metadata && Object.keys(row.metadata).length">
            <p class="font-medium text-[var(--text-muted)] mb-1 text-xs">{{ t('logs.expandMeta') }}</p>
            <pre class="font-mono text-xs text-[var(--text)] whitespace-pre-wrap break-all max-h-40 overflow-auto rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">{{ JSON.stringify(row.metadata, null, 2) }}</pre>
          </div>
          <div v-if="!row.stackTrace && (!row.metadata || !Object.keys(row.metadata).length)" class="text-xs text-[var(--text-muted)]">
            {{ row.message }}
          </div>
        </div>
      </template>
    </DataTable>
  </div>
</template>
