<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { clientsService } from '@/services/clients.service'
import { ticketsService } from '@/services/tickets.service'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { Building2, ExternalLink } from 'lucide-vue-next'

const props = defineProps<{ clientId: string }>()
const router = useRouter()

const { data: client, isLoading: loadingClient } = useQuery({
  queryKey: computed(() => ['client', props.clientId]),
  queryFn: () => clientsService.getById(props.clientId),
  staleTime: 60_000,
  enabled: computed(() => !!props.clientId),
})

const { data: openTickets, isLoading: loadingTickets } = useQuery({
  queryKey: computed(() => ['tickets-client-open', props.clientId]),
  queryFn: () => ticketsService.list({ clientId: props.clientId, status: 'OPEN', size: 1 }),
  staleTime: 30_000,
  enabled: computed(() => !!props.clientId),
})

const openCount = computed(() => openTickets.value?.totalElements ?? 0)

function statusSeverity(status?: string) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'SUSPENDED') return 'danger'
  return 'secondary'
}

function healthColor(score?: number) {
  if (!score && score !== 0) return 'text-[var(--text-muted)]'
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}
</script>

<template>
  <div class="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
    <!-- Loading -->
    <div v-if="loadingClient" class="space-y-2">
      <Skeleton height="1rem" width="60%" />
      <Skeleton height="0.75rem" width="40%" />
    </div>

    <!-- Content -->
    <template v-else-if="client">
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
            <Building2 class="w-4 h-4 text-blue-500" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-[var(--text)] truncate">{{ client.name }}</p>
            <p v-if="client.segment" class="text-xs text-[var(--text-muted)]">{{ client.segment.replace('_', ' ') }}</p>
          </div>
        </div>
        <Button
          icon="pi pi-arrow-up-right"
          severity="secondary"
          text
          rounded
          size="small"
          v-tooltip.top="'Ver cliente'"
          @click="router.push(`/clients/${clientId}`)"
        />
      </div>

      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-lg bg-[var(--surface)] p-2">
          <p class="text-xs text-[var(--text-muted)]">Estado</p>
          <Tag :severity="statusSeverity(client.status)" :value="client.status ?? '—'" class="text-xs mt-0.5" />
        </div>
        <div class="rounded-lg bg-[var(--surface)] p-2">
          <p class="text-xs text-[var(--text-muted)]">Health</p>
          <p class="text-base font-bold" :class="healthColor(client.healthScore)">
            {{ client.healthScore ?? '—' }}
          </p>
        </div>
        <div class="rounded-lg bg-[var(--surface)] p-2">
          <p class="text-xs text-[var(--text-muted)]">Tickets abiertos</p>
          <p class="text-base font-bold" :class="openCount > 0 ? 'text-amber-500' : 'text-[var(--text)]'">
            <span v-if="loadingTickets">…</span>
            <span v-else>{{ openCount }}</span>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
