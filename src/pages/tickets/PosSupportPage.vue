<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ticketsService } from '@/services/tickets.service'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Inbox,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-vue-next'

dayjs.extend(relativeTime)

const router = useRouter()
const { t } = useI18n()

const { data: stats, isLoading: statsLoading } = useQuery({
  queryKey: ['pos-ticket-stats'],
  queryFn: () => ticketsService.getStats(),
  staleTime: 60_000,
})

const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
  queryKey: ['tickets', { source: 'POS' }],
  queryFn: () => ticketsService.list({ source: 'POS', size: 50 }),
  staleTime: 30_000,
})

const tickets = computed(() => ticketsData.value?.content ?? [])

const statCards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: t('posSupport.totalTickets'), value: s.total, icon: Inbox, color: 'text-blue-500' },
    { label: t('posSupport.open'), value: s.byStatus['OPEN'] ?? 0, icon: AlertCircle, color: 'text-orange-500' },
    { label: t('posSupport.inProgress'), value: s.byStatus['IN_PROGRESS'] ?? 0, icon: TrendingUp, color: 'text-yellow-500' },
    { label: t('posSupport.resolved'), value: (s.byStatus['RESOLVED'] ?? 0) + (s.byStatus['CLOSED'] ?? 0), icon: CheckCircle2, color: 'text-green-500' },
  ]
})

const statusSeverity: Record<string, string> = {
  OPEN: 'info',
  IN_PROGRESS: 'warn',
  WAITING: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'secondary',
}

const prioritySeverity: Record<string, string> = {
  LOW: 'secondary',
  MEDIUM: 'info',
  HIGH: 'warn',
  CRITICAL: 'danger',
}

function goToTicket(id: string) {
  router.push(`/tickets/${id}`)
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-start gap-2">
      <div>
        <h1 class="text-xl font-semibold text-[var(--text)]">{{ t('posSupport.title') }}</h1>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">{{ t('posSupport.subtitle') }}</p>
      </div>
      <PageInfoButton :title="t('posSupport.title')" :description="t('pageInfo.posSupport')" class="mt-1" />
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-if="statsLoading">
        <SkeletonCard v-for="i in 4" :key="i" />
      </template>
      <template v-else>
        <Card v-for="card in statCards" :key="card.label">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-[var(--text-muted)] font-medium">{{ card.label }}</p>
              <p class="text-2xl font-bold text-[var(--text)] mt-1">{{ card.value }}</p>
            </div>
            <component :is="card.icon" :class="['w-8 h-8', card.color]" />
          </div>
        </Card>
      </template>
    </div>

    <!-- Tickets table -->
    <Card>
      <template #header>
        <h2 class="text-sm font-semibold text-[var(--text)]">{{ t('posSupport.recentTickets') }}</h2>
      </template>

      <SkeletonTable v-if="ticketsLoading" :rows="6" :cols="5" />

      <DataTable
        v-else
        :value="tickets"
        striped-rows
        hover
        class="text-sm"
        @row-click="(e) => goToTicket(e.data.id)"
        row-hover
        style="cursor: pointer"
      >
        <Column field="title" :header="t('tickets.title')" style="min-width: 200px">
          <template #body="{ data }">
            <span class="font-medium">{{ data.title }}</span>
          </template>
        </Column>
        <Column field="status" :header="t('tickets.status')" style="width: 130px">
          <template #body="{ data }">
            <Tag :severity="statusSeverity[data.status]" :value="data.status" />
          </template>
        </Column>
        <Column field="priority" :header="t('tickets.priority')" style="width: 110px">
          <template #body="{ data }">
            <Tag :severity="prioritySeverity[data.priority]" :value="data.priority" />
          </template>
        </Column>
        <Column :header="t('tickets.branchLabel')" style="width: 160px">
          <template #body="{ data }">
            {{ data.posContext?.branchName ?? '—' }}
          </template>
        </Column>
        <Column :header="t('tickets.createdAt')" style="width: 130px">
          <template #body="{ data }">
            <span class="text-[var(--text-muted)]">{{ dayjs(data.createdAt).fromNow() }}</span>
          </template>
        </Column>
      </DataTable>
    </Card>
  </div>
</template>
