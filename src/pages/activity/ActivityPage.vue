<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Card from '@/components/ui/Card.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { activityService } from '@/services/activity.service'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { Users, Clock, Activity, MapPin } from 'lucide-vue-next'

const { t, locale } = useI18n()
dayjs.locale(locale.value === 'es' ? 'es' : 'en')

const page = ref(0)
const pageSize = 25
const searchUser = ref('')
const searchUserId = ref<string | undefined>(undefined)

// Active users count
const { data: activeUsers } = useQuery({
  queryKey: ['active-users'],
  queryFn: () => activityService.activeUsers(),
  refetchInterval: 30000,
  staleTime: 15000,
})

// Activity log
const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['activity-log', page.value, searchUserId.value]),
  queryFn: () => activityService.query({
    page: page.value,
    size: pageSize,
    userId: searchUserId.value,
  }),
  staleTime: 20000,
})

const logs = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function formatTime(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY, HH:mm:ss')
}

function fromNow(dateStr: string) {
  return dayjs(dateStr).fromNow()
}

function formatDuration(seconds?: number) {
  if (!seconds && seconds !== 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function onPage(event: { page: number }) {
  page.value = event.page
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; refetch() }, 400)
}

// Unique users for filter dropdown
const uniqueUsers = computed(() => {
  const map = new Map<string, { id: string; name: string; email: string }>()
  for (const log of logs.value) {
    if (!map.has(log.userId)) {
      map.set(log.userId, { id: log.userId, name: log.userName, email: log.userEmail })
    }
  }
  return Array.from(map.values())
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('activity.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('activity.subtitle') }}</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
            <Users class="w-4.5 h-4.5 text-green-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.activeUsers') }}</p>
            <p class="text-xl font-bold text-green-500">{{ activeUsers ?? '—' }}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
            <Activity class="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.totalEvents') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ totalRecords }}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
            <Clock class="w-4.5 h-4.5 text-violet-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.uniqueUsers') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ uniqueUsers.length }}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
            <MapPin class="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">{{ t('activity.pagesTracked') }}</p>
            <p class="text-xl font-bold text-[var(--text)]">{{ new Set(logs.map(l => l.routePath)).size }}</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <InputText
        v-model="searchUser"
        :placeholder="t('activity.filterUser')"
        class="flex-1"
        @input="onSearch"
      />
      <Select
        v-model="searchUserId"
        :options="uniqueUsers"
        option-label="name"
        option-value="id"
        :placeholder="t('activity.filterByUser')"
        class="w-56"
        @change="onSearch"
      />
    </div>

    <!-- Error state -->
    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('activity.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Table -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="6" />

    <DataTable
      v-else
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
      @page="onPage"
    >
      <Column field="userName" :header="t('activity.user')" style="min-width: 160px">
        <template #body="{ data: row }">
          <div>
            <span class="font-medium text-[var(--text)]">{{ row.userName }}</span>
            <span class="block text-xs text-[var(--text-muted)]">{{ row.userEmail }}</span>
          </div>
        </template>
      </Column>

      <Column field="pageTitle" :header="t('activity.page')" style="min-width: 180px">
        <template #body="{ data: row }">
          <div>
            <span class="text-sm font-medium text-[var(--text)]">{{ row.pageTitle ?? '—' }}</span>
            <span class="block text-xs text-[var(--text-muted)] font-mono">{{ row.routePath }}</span>
          </div>
        </template>
      </Column>

      <Column field="durationSeconds" :header="t('activity.duration')" style="width: 100px">
        <template #body="{ data: row }">
          <span class="text-sm text-[var(--text-muted)]">{{ formatDuration(row.durationSeconds) }}</span>
        </template>
      </Column>

      <Column field="ipAddress" :header="t('audit.ip')" style="width: 130px">
        <template #body="{ data: row }">
          <span class="text-xs text-[var(--text-muted)] font-mono">{{ row.ipAddress ?? '—' }}</span>
        </template>
      </Column>

      <Column field="visitedAt" :header="t('activity.visitedAt')" sortable style="width: 180px">
        <template #body="{ data: row }">
          <div>
            <span class="text-xs text-[var(--text-muted)] font-mono">{{ formatTime(row.visitedAt) }}</span>
            <span class="block text-xs text-[var(--text-muted)]">{{ fromNow(row.visitedAt) }}</span>
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">{{ t('activity.noData') }}</div>
      </template>
    </DataTable>
  </div>
</template>
