<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { ticketsService } from '@/services/tickets.service'
import { csatService } from '@/services/csat.service'
import { useToast } from '@/composables/useToast'
import { qk } from '@/queries/keys'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { MessageSquare, TimerIcon, ShieldCheckIcon, ShieldAlertIcon, GitMerge, Star, Send, AlertTriangle } from 'lucide-vue-next'
import SourceBadge from '@/components/tickets/SourceBadge.vue'
import PosContextPanel from '@/components/tickets/PosContextPanel.vue'
import TicketChatPanel from '@/components/tickets/TicketChatPanel.vue'
import SlaCountdown from '@/components/time/SlaCountdown.vue'
import TimerWidget from '@/components/time/TimerWidget.vue'
import TimeEntriesList from '@/components/time/TimeEntriesList.vue'
import ClientContextCard from '@/components/clients/ClientContextCard.vue'
import NotesPanel from '@/components/notes/NotesPanel.vue'
import KbSearchWidget from '@/components/kb/KbSearchWidget.vue'
import { useUsers } from '@/queries/users'
import type { TicketStatus, TicketPriority } from '@/types/ticket'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
watch(locale, (loc) => { dayjs.locale(loc === 'es' ? 'es' : 'en') }, { immediate: true })

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const id = computed(() => route.params.id as string)

const { data: ticket, isLoading, isError } = useQuery({
  queryKey: computed(() => ['ticket', id.value]),
  queryFn: () => ticketsService.getById(id.value),
  staleTime: 15000
})

const { data: comments, isLoading: isLoadingComments } = useQuery({
  queryKey: computed(() => ['ticket-comments', id.value]),
  queryFn: () => ticketsService.getComments(id.value),
  staleTime: 15000,
  enabled: computed(() => !!id.value),
})

const statusOptions = computed(() => [
  { label: t('ticketDetail.statusOpen'), value: 'OPEN' as TicketStatus },
  { label: t('ticketDetail.statusInProgress'), value: 'IN_PROGRESS' as TicketStatus },
  { label: t('ticketDetail.statusWaiting'), value: 'WAITING' as TicketStatus },
  { label: t('ticketDetail.statusResolved'), value: 'RESOLVED' as TicketStatus },
  { label: t('ticketDetail.statusClosed'), value: 'CLOSED' as TicketStatus },
])

const selectedStatus = ref<TicketStatus | null>(null)
const isChangingStatus = ref(false)

watch(ticket, (val) => {
  if (val) selectedStatus.value = val.status
}, { immediate: true })

async function onStatusChange(newStatus: TicketStatus) {
  if (!ticket.value || newStatus === ticket.value.status) return
  isChangingStatus.value = true
  try {
    await ticketsService.updateStatus(id.value, newStatus)
    await queryClient.invalidateQueries({ queryKey: ['ticket', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    toast.success(t('ticketDetail.updateSuccess'))
  } catch {
    toast.error(t('ticketDetail.updateFailed'))
    selectedStatus.value = ticket.value.status
  } finally {
    isChangingStatus.value = false
  }
}

// ── Assignee ──────────────────────────────────────────────────────────
const { data: usersPage } = useUsers(200)
const users = computed(() => usersPage.value?.content ?? [])
const selectedAssignee = ref<string | null>(null)
const isChangingAssignee = ref(false)

watch(ticket, (val) => {
  if (val) selectedAssignee.value = val.assigneeId ?? null
}, { immediate: true })

async function onAssigneeChange(assigneeId: string | null) {
  if (!ticket.value) return
  isChangingAssignee.value = true
  try {
    if (assigneeId) {
      await ticketsService.assign(id.value, assigneeId)
    }
    await queryClient.invalidateQueries({ queryKey: ['ticket', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    toast.success('Agente asignado')
  } catch {
    toast.error('No se pudo cambiar el agente')
    selectedAssignee.value = ticket.value.assigneeId ?? null
  } finally {
    isChangingAssignee.value = false
  }
}

async function autoAssign() {
  isChangingAssignee.value = true
  try {
    const res = await ticketsService.autoAssign(id.value)
    selectedAssignee.value = res.assigneeId ?? null
    await queryClient.invalidateQueries({ queryKey: ['ticket', id.value] })
    toast.success(`Auto-asignado a ${res.assigneeName ?? res.assigneeId}`)
  } catch {
    toast.error('No se pudo auto-asignar')
  } finally {
    isChangingAssignee.value = false
  }
}

function confirmDelete() {
  confirm.require({
    message: t('ticketDetail.deleteConfirm'),
    header: t('ticketDetail.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await ticketsService.delete(id.value)
        await queryClient.invalidateQueries({ queryKey: ['tickets'] })
        toast.success(t('ticketDetail.deleteSuccess'))
        router.push('/tickets')
      } catch {
        toast.error(t('ticketDetail.deleteFailed'))
      }
    }
  })
}

// ── Merge ─────────────────────────────────────────────────────────────
const mergeDialogOpen = ref(false)
const mergeTargetId = ref('')
const mergeMutation = useMutation({
  mutationFn: () => ticketsService.merge(id.value, mergeTargetId.value.trim()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    toast.success(t('ticketDetail.mergeSuccess'))
    mergeDialogOpen.value = false
    router.push('/tickets')
  },
  onError: () => toast.error(t('ticketDetail.mergeFailed'))
})

// ── CSAT ──────────────────────────────────────────────────────────────
const csatSending = ref(false)
async function sendCsat() {
  csatSending.value = true
  try {
    await csatService.createOrGet(id.value)
    toast.success(t('ticketDetail.csatSent'))
    queryClient.invalidateQueries({ queryKey: qk.csatTicket(id.value) })
  } catch {
    toast.error(t('ticketDetail.csatFailed'))
  } finally {
    csatSending.value = false
  }
}

const { data: csatList } = useQuery({
  queryKey: computed(() => qk.csatTicket(id.value)),
  queryFn: () => csatService.listByTicket(id.value),
  staleTime: 30_000,
  enabled: computed(() => !!id.value)
})

const latestCsat = computed(() => csatList.value?.[0] ?? null)

const commentText = ref('')
const isSubmittingComment = ref(false)

async function submitComment() {
  if (!commentText.value.trim()) return
  isSubmittingComment.value = true
  try {
    await ticketsService.addComment(id.value, commentText.value.trim())
    commentText.value = ''
    await queryClient.invalidateQueries({ queryKey: ['ticket-comments', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['ticket', id.value] })
    toast.success(t('ticketDetail.commentSuccess'))
  } catch {
    toast.error(t('ticketDetail.commentFailed'))
  } finally {
    isSubmittingComment.value = false
  }
}

function statusSeverity(status: TicketStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    OPEN: 'info', IN_PROGRESS: 'warn', WAITING: 'warn', RESOLVED: 'success', CLOSED: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function prioritySeverity(priority: TicketPriority): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketPriority, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    LOW: 'secondary', MEDIUM: 'warn', HIGH: 'danger', CRITICAL: 'danger'
  }
  return map[priority] ?? 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY, HH:mm')
}

function fromNow(dateStr: string) {
  return dayjs(dateStr).fromNow()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back + Actions -->
    <div class="flex items-center justify-between gap-4">
      <Button icon="pi pi-arrow-left" :label="t('ticketDetail.backToTickets')" severity="secondary" text @click="router.push('/tickets')" />
      <div v-if="ticket && !isLoading" class="flex items-center gap-2">
        <Select
          v-model="selectedStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('ticketDetail.status')"
          class="w-52"
          :disabled="isChangingStatus"
          @change="(e: { value: TicketStatus }) => onStatusChange(e.value)"
        />
        <Button icon="pi pi-code-branch" severity="secondary" outlined v-tooltip.top="t('ticketDetail.mergeTicket')" @click="mergeDialogOpen = true" />
        <Button icon="pi pi-trash" severity="danger" outlined v-tooltip.top="t('ticketDetail.deleteTicket')" @click="confirmDelete" />
      </div>
    </div>

    <!-- Error state -->
    <div v-if="isError" class="flex flex-col items-center py-16 gap-4">
      <p class="text-[var(--text-muted)]">{{ t('ticketDetail.notFound') }}</p>
      <Button :label="t('ticketDetail.backToTickets')" @click="router.push('/tickets')" />
    </div>

    <!-- Loading state -->
    <template v-else-if="isLoading">
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <Skeleton height="2rem" class="mb-2" />
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="1rem" width="40%" class="mt-2" />
        <Skeleton height="5rem" class="mt-4" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
          <Skeleton height="1rem" width="80%" v-for="i in 5" :key="i" />
        </div>
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
          <Skeleton height="6rem" />
          <Skeleton height="2.5rem" />
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else-if="ticket">
      <!-- Main card -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 class="text-xl font-semibold text-[var(--text)] mb-2">{{ ticket.title }}</h1>
        <p class="text-sm text-[var(--text-muted)] mb-4">
          {{ t('ticketDetail.created') }} {{ fromNow(ticket.createdAt) }}
          <span v-if="ticket.clientName"> · {{ ticket.clientName }}</span>
          <span v-else-if="ticket.clientId"> · {{ t('tickets.client') }}: <span class="font-mono text-xs">{{ ticket.clientId }}</span></span>
        </p>
        <div class="flex flex-wrap gap-2 mb-4">
          <Tag :severity="statusSeverity(ticket.status)" :value="ticket.status.replace(/_/g, ' ')" />
          <Tag :severity="prioritySeverity(ticket.priority)" :value="ticket.priority" />
          <SourceBadge v-if="ticket.source" :source="ticket.source" />
          <!-- Escalation badge -->
          <span v-if="(ticket as any).escalatedAt" class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            <AlertTriangle class="w-3 h-3" />{{ t('ticketDetail.escalated') }}
          </span>
        </div>
        <p class="text-[var(--text)] whitespace-pre-wrap">{{ ticket.description }}</p>
        <PosContextPanel v-if="ticket.source === 'POS' && ticket.posContext" :ctx="ticket.posContext" class="mt-4" />
        <TicketChatPanel v-if="ticket.source === 'POS'" :ticket-id="ticket.id" class="mt-4" />
      </div>

      <!-- Bottom grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Metadata -->
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
          <!-- Client context card -->
          <ClientContextCard v-if="ticket.clientId" :client-id="ticket.clientId" class="mb-4" />

          <h2 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide mb-3">{{ t('ticketDetail.details') }}</h2>
          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">{{ t('ticketDetail.status') }}</span>
            <Tag :severity="statusSeverity(ticket.status)" :value="ticket.status.replace(/_/g, ' ')" />
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">{{ t('ticketDetail.priority') }}</span>
            <Tag :severity="prioritySeverity(ticket.priority)" :value="ticket.priority" />
          </div>
          <div class="flex items-center justify-between text-sm gap-2">
            <span class="text-[var(--text-muted)] shrink-0">{{ t('ticketDetail.assignee') }}</span>
            <div class="flex items-center gap-1">
              <Select
                v-model="selectedAssignee"
                :options="users"
                option-label="fullName"
                option-value="id"
                placeholder="Sin asignar"
                class="w-40 text-xs"
                :disabled="isChangingAssignee"
                show-clear
                @change="(e: { value: string | null }) => onAssigneeChange(e.value)"
              />
              <Button
                icon="pi pi-bolt"
                severity="secondary"
                text
                rounded
                size="small"
                v-tooltip.top="'Auto-asignar al agente con menor carga'"
                :loading="isChangingAssignee"
                @click="autoAssign"
              />
            </div>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">{{ t('ticketDetail.created') }}</span>
            <span class="text-[var(--text)]">{{ formatDate(ticket.createdAt) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">{{ t('ticketDetail.updatedAt') }}</span>
            <span class="text-[var(--text)]">{{ formatDate(ticket.updatedAt) }}</span>
          </div>
          <!-- SLA countdown (inline in metadata) -->
          <div v-if="ticket.slaDueAt && !['RESOLVED', 'CLOSED'].includes(ticket.status)" class="pt-1">
            <SlaCountdown
              :due-at="ticket.slaDueAt"
              :created-at="ticket.createdAt"
              :breached="ticket.slaBreached"
            />
          </div>
          <!-- Static SLA result for terminal statuses -->
          <div v-else-if="ticket.slaDueAt && ['RESOLVED', 'CLOSED'].includes(ticket.status)" class="pt-1 flex items-center gap-1.5 text-sm font-medium"
               :class="ticket.slaBreached ? 'text-red-500' : 'text-green-600 dark:text-green-400'">
            <ShieldCheckIcon v-if="!ticket.slaBreached" class="h-4 w-4" />
            <ShieldAlertIcon v-else class="h-4 w-4" />
            <span>{{ ticket.slaBreached ? t('ticketDetail.slaBreached') : t('ticketDetail.slaMet') }}</span>
          </div>
          <div v-else-if="ticket.slaDeadline" class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">{{ t('ticketDetail.slaDeadline') }}</span>
            <span class="text-[var(--text)]">{{ formatDate(ticket.slaDeadline) }}</span>
          </div>
          <div v-if="ticket.estimatedMinutes" class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">Tiempo estimado</span>
            <span class="text-[var(--text)] font-medium">
              {{ ticket.estimatedMinutes >= 60
                  ? `${Math.floor(ticket.estimatedMinutes / 60)}h ${ticket.estimatedMinutes % 60 > 0 ? `${ticket.estimatedMinutes % 60}m` : ''}`
                  : `${ticket.estimatedMinutes}m` }}
            </span>
          </div>
          <div v-if="ticket.labels && ticket.labels.length" class="flex flex-col gap-1 pt-1">
            <span class="text-[var(--text-muted)] text-sm">{{ t('ticketDetail.labels') }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="tag in ticket.labels" :key="tag" class="text-xs bg-[var(--surface-raised)] text-[var(--text)] px-2 py-0.5 rounded-full">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4">
          <h2 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide flex items-center gap-2">
            <MessageSquare class="w-4 h-4" />
            {{ t('ticketDetail.comments') }}
            <span v-if="comments?.length" class="text-xs font-normal text-[var(--text-muted)]">({{ comments.length }})</span>
          </h2>
          <div v-if="isLoadingComments" class="space-y-3">
            <div v-for="i in 2" :key="i" class="flex gap-3">
              <Skeleton shape="circle" size="2rem" />
              <div class="flex-1 space-y-1.5">
                <Skeleton height="0.75rem" width="30%" />
                <Skeleton height="0.75rem" width="80%" />
              </div>
            </div>
          </div>
          <div v-else-if="comments?.length" class="space-y-3 max-h-72 overflow-y-auto pr-1">
            <div v-for="c in comments" :key="c.id" class="flex gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                :class="c.senderType === 'OPERATOR'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'">
                {{ c.senderType === 'OPERATOR' ? 'CT' : 'POS' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-medium text-[var(--text)]">
                    {{ c.senderType === 'OPERATOR' ? (c.authorName || t('ticketDetail.agent')) : t('ticketDetail.posUser') }}
                  </span>
                  <span class="text-xs text-[var(--text-muted)]">{{ fromNow(c.createdAt) }}</span>
                </div>
                <p class="text-sm text-[var(--text)] whitespace-pre-wrap break-words">{{ c.content }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-[var(--text-muted)]">{{ t('ticketDetail.noComments') }}</p>
          <div class="border-t border-[var(--border)] pt-4 flex flex-col gap-2">
            <Textarea v-model="commentText" :placeholder="t('ticketDetail.commentPlaceholder')" :rows="3" class="w-full" :disabled="isSubmittingComment" />
            <div class="flex justify-end">
              <Button :label="t('ticketDetail.send')" icon="pi pi-send" :loading="isSubmittingComment" :disabled="!commentText.trim()" @click="submitComment" />
            </div>
          </div>
        </div>
      </div>

      <!-- Internal notes -->
      <NotesPanel linked-to="TICKET" :linked-id="ticket.id" />

      <!-- Knowledge Base search -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <KbSearchWidget />
      </div>

      <!-- Time tracking panel -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <h2 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide flex items-center gap-2">
          <TimerIcon class="w-4 h-4" />
          Tiempo de trabajo
        </h2>
        <TimerWidget entity-type="TICKET" :entity-id="ticket.id" />
        <TimeEntriesList entity-type="TICKET" :entity-id="ticket.id" />
      </div>

      <!-- CSAT panel -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide flex items-center gap-2">
            <Star class="w-4 h-4" />
            {{ t('ticketDetail.csatTitle') }}
          </h2>
          <Button
            :label="t('ticketDetail.csatSend')"
            size="small"
            severity="secondary"
            :loading="csatSending"
            :disabled="!!latestCsat"
            @click="sendCsat"
          />
        </div>
        <div v-if="!latestCsat" class="text-sm text-[var(--text-muted)]">{{ t('ticketDetail.csatNone') }}</div>
        <div v-else class="flex items-center gap-4 flex-wrap">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-[var(--text-muted)]">{{ t('ticketDetail.csatStatus') }}</span>
            <span class="text-sm font-medium" :class="latestCsat.respondedAt ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'">
              {{ latestCsat.respondedAt ? t('ticketDetail.csatResponded') : t('ticketDetail.csatPending') }}
            </span>
          </div>
          <div v-if="latestCsat.rating" class="flex flex-col gap-0.5">
            <span class="text-xs text-[var(--text-muted)]">{{ t('ticketDetail.csatRating') }}</span>
            <div class="flex gap-0.5">
              <Star v-for="n in 5" :key="n" :class="['w-4 h-4', n <= latestCsat.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300']" />
            </div>
          </div>
          <div v-if="latestCsat.comment" class="flex-1 min-w-32">
            <span class="text-xs text-[var(--text-muted)]">{{ t('ticketDetail.csatComment') }}</span>
            <p class="text-sm text-[var(--text)] italic">"{{ latestCsat.comment }}"</p>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-[var(--text-muted)]">{{ t('ticketDetail.csatLink') }}</span>
            <a :href="`/survey/${latestCsat.token}`" target="_blank" class="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              <Send class="w-3 h-3" />{{ t('ticketDetail.csatOpen') }}
            </a>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Merge Dialog -->
  <Dialog v-model:visible="mergeDialogOpen" :header="t('ticketDetail.mergeTicket')" modal class="w-full max-w-md">
    <div class="space-y-4 pt-2">
      <p class="text-sm text-[var(--text-muted)]">{{ t('ticketDetail.mergeHint') }}</p>
      <div>
        <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">{{ t('ticketDetail.mergeTargetId') }}</label>
        <InputText v-model="mergeTargetId" class="w-full" placeholder="UUID del ticket destino" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" text @click="mergeDialogOpen = false" />
        <Button
          :label="t('ticketDetail.mergeConfirm')"
          severity="danger"
          :disabled="!mergeTargetId.trim()"
          :loading="mergeMutation.isPending.value"
          @click="mergeMutation.mutate()"
        />
      </div>
    </template>
  </Dialog>
</template>
