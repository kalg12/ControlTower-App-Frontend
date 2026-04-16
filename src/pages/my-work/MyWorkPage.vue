<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ticketsService } from '@/services/tickets.service'
import { qk } from '@/queries/keys'
import { Briefcase, AlertTriangle, Clock, CheckCircle2, ChevronRight } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const { data: openTickets } = useQuery({
  queryKey: qk.myWork(),
  queryFn: () => ticketsService.list({ assigneeId: auth.user!.id, status: 'OPEN', size: 50 }),
  staleTime: 60_000
})

const { data: inProgressTickets } = useQuery({
  queryKey: computed(() => ['my-work-inprogress']),
  queryFn: () => ticketsService.list({ assigneeId: auth.user!.id, status: 'IN_PROGRESS', size: 50 }),
  staleTime: 60_000
})

const { data: waitingTickets } = useQuery({
  queryKey: computed(() => ['my-work-waiting']),
  queryFn: () => ticketsService.list({ assigneeId: auth.user!.id, status: 'WAITING', size: 50 }),
  staleTime: 60_000
})

const { data: slaAtRiskTickets } = useQuery({
  queryKey: computed(() => ['my-work-sla-risk']),
  queryFn: () => ticketsService.list({ assigneeId: auth.user!.id, slaAtRisk: true, slaWindowHours: 4, size: 20 }),
  staleTime: 60_000
})

const open = computed(() => openTickets.value?.content ?? [])
const inProgress = computed(() => inProgressTickets.value?.content ?? [])
const waiting = computed(() => waitingTickets.value?.content ?? [])
const slaRisk = computed(() => slaAtRiskTickets.value?.content ?? [])

const priorityColor: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

const statusBadge: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  WAITING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
        <Briefcase class="w-6 h-6" />
        {{ t('myWork.title') }}
      </h1>
      <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('myWork.subtitle') }}</p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
        <div class="flex items-center gap-2 mb-1">
          <Clock class="w-4 h-4 text-blue-500" />
          <span class="text-xs text-[var(--text-muted)]">{{ t('myWork.open') }}</span>
        </div>
        <p class="text-3xl font-bold text-[var(--text)]">{{ open.length }}</p>
      </div>
      <div class="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
        <div class="flex items-center gap-2 mb-1">
          <CheckCircle2 class="w-4 h-4 text-yellow-500" />
          <span class="text-xs text-[var(--text-muted)]">{{ t('myWork.inProgress') }}</span>
        </div>
        <p class="text-3xl font-bold text-[var(--text)]">{{ inProgress.length }}</p>
      </div>
      <div class="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
        <div class="flex items-center gap-2 mb-1">
          <Clock class="w-4 h-4 text-purple-500" />
          <span class="text-xs text-[var(--text-muted)]">{{ t('myWork.waiting') }}</span>
        </div>
        <p class="text-3xl font-bold text-[var(--text)]">{{ waiting.length }}</p>
      </div>
      <div class="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
        <div class="flex items-center gap-2 mb-1">
          <AlertTriangle class="w-4 h-4 text-red-500" />
          <span class="text-xs text-[var(--text-muted)]">{{ t('myWork.slaRisk') }}</span>
        </div>
        <p class="text-3xl font-bold text-red-500">{{ slaRisk.length }}</p>
      </div>
    </div>

    <!-- SLA At-Risk section -->
    <div v-if="slaRisk.length > 0" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <h2 class="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
        <AlertTriangle class="w-4 h-4" />
        {{ t('myWork.slaRisk') }}
      </h2>
      <div class="space-y-2">
        <button
          v-for="ticket in slaRisk"
          :key="ticket.id"
          class="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-100 dark:border-red-900 hover:border-red-400 transition-colors text-left"
          @click="router.push(`/tickets/${ticket.id}`)"
        >
          <span class="flex-1 text-sm font-medium text-[var(--text)] truncate">{{ ticket.title }}</span>
          <span :class="['text-[10px] font-bold px-1.5 py-0.5 rounded-full', priorityColor[ticket.priority] ?? '']">{{ ticket.priority }}</span>
          <span class="text-xs text-[var(--text-muted)]">{{ formatDate(ticket.updatedAt) }}</span>
          <ChevronRight class="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>
    </div>

    <!-- Active tickets -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Open -->
      <div class="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 class="font-semibold text-[var(--text)] text-sm">{{ t('myWork.open') }}</h2>
          <span class="text-xs text-[var(--text-muted)]">{{ open.length }}</span>
        </div>
        <div v-if="open.length === 0" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('myWork.noTickets') }}</div>
        <div v-else class="divide-y divide-[var(--border)]">
          <button
            v-for="ticket in open.slice(0, 10)"
            :key="ticket.id"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors text-left"
            @click="router.push(`/tickets/${ticket.id}`)"
          >
            <span class="flex-1 text-sm text-[var(--text)] truncate">{{ ticket.title }}</span>
            <span :class="['text-[10px] font-bold px-1.5 py-0.5 rounded-full', priorityColor[ticket.priority] ?? '']">{{ ticket.priority }}</span>
            <ChevronRight class="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      <!-- In Progress -->
      <div class="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 class="font-semibold text-[var(--text)] text-sm">{{ t('myWork.inProgress') }}</h2>
          <span class="text-xs text-[var(--text-muted)]">{{ inProgress.length }}</span>
        </div>
        <div v-if="inProgress.length === 0" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('myWork.noTickets') }}</div>
        <div v-else class="divide-y divide-[var(--border)]">
          <button
            v-for="ticket in inProgress.slice(0, 10)"
            :key="ticket.id"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors text-left"
            @click="router.push(`/tickets/${ticket.id}`)"
          >
            <span class="flex-1 text-sm text-[var(--text)] truncate">{{ ticket.title }}</span>
            <span :class="['text-[10px] font-bold px-1.5 py-0.5 rounded-full', priorityColor[ticket.priority] ?? '']">{{ ticket.priority }}</span>
            <ChevronRight class="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
