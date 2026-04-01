<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { ticketsService } from '@/services/tickets.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { TicketStatus, TicketPriority } from '@/types/ticket'

dayjs.extend(relativeTime)

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()

const id = computed(() => route.params.id as string)

const { data: ticket, isLoading, isError } = useQuery({
  queryKey: computed(() => ['ticket', id.value]),
  queryFn: () => ticketsService.getById(id.value),
  staleTime: 15000
})

const statusOptions: { label: string; value: TicketStatus }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending Customer', value: 'PENDING_CUSTOMER' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]

const selectedStatus = ref<TicketStatus | null>(null)
const isChangingStatus = ref(false)

// Sync selected status when ticket data loads or changes
watch(ticket, (val) => {
  if (val) selectedStatus.value = val.status
}, { immediate: true })

async function onStatusChange(newStatus: TicketStatus) {
  if (!ticket.value || newStatus === ticket.value.status) return
  isChangingStatus.value = true
  try {
    await ticketsService.update(id.value, { status: newStatus })
    await queryClient.invalidateQueries({ queryKey: ['ticket', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    toast.success('Status updated')
  } catch {
    toast.error('Failed to update status')
    selectedStatus.value = ticket.value.status
  } finally {
    isChangingStatus.value = false
  }
}

const commentText = ref('')
const isSubmittingComment = ref(false)

async function submitComment() {
  if (!commentText.value.trim()) return
  isSubmittingComment.value = true
  try {
    await ticketsService.addComment(id.value, commentText.value.trim())
    commentText.value = ''
    toast.success('Comment added')
  } catch {
    toast.error('Failed to add comment')
  } finally {
    isSubmittingComment.value = false
  }
}

function statusSeverity(status: TicketStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    OPEN: 'info',
    IN_PROGRESS: 'warn',
    PENDING_CUSTOMER: 'warn',
    RESOLVED: 'success',
    CLOSED: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function prioritySeverity(priority: TicketPriority): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketPriority, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    LOW: 'secondary',
    MEDIUM: 'warn',
    HIGH: 'danger',
    CRITICAL: 'danger'
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
      <Button
        icon="pi pi-arrow-left"
        label="Back to Tickets"
        severity="secondary"
        text
        @click="router.push('/tickets')"
      />
      <div v-if="ticket && !isLoading" class="flex items-center gap-2">
        <Select
          v-model="selectedStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="Change Status"
          class="w-52"
          :disabled="isChangingStatus"
          @change="(e: { value: TicketStatus }) => onStatusChange(e.value)"
        />
      </div>
    </div>

    <!-- Error state -->
    <div v-if="isError" class="flex flex-col items-center py-16 gap-4">
      <p class="text-[var(--text-muted)]">Ticket not found.</p>
      <Button label="Back to Tickets" @click="router.push('/tickets')" />
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
          Created {{ fromNow(ticket.createdAt) }}
          <span v-if="ticket.clientId"> · Client: <span class="font-mono text-xs">{{ ticket.clientId }}</span></span>
          <span v-if="ticket.clientName"> ({{ ticket.clientName }})</span>
        </p>
        <div class="flex gap-2 mb-4">
          <Tag :severity="statusSeverity(ticket.status)" :value="ticket.status.replace(/_/g, ' ')" />
          <Tag :severity="prioritySeverity(ticket.priority)" :value="ticket.priority" />
        </div>
        <p class="text-[var(--text)] whitespace-pre-wrap">{{ ticket.description }}</p>
      </div>

      <!-- Bottom grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Metadata -->
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
          <h2 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide mb-3">Details</h2>

          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">Status</span>
            <Tag :severity="statusSeverity(ticket.status)" :value="ticket.status.replace(/_/g, ' ')" />
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">Priority</span>
            <Tag :severity="prioritySeverity(ticket.priority)" :value="ticket.priority" />
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">Assignee</span>
            <span class="text-[var(--text)]">{{ ticket.assigneeName ?? ticket.assigneeId ?? '—' }}</span>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">Created</span>
            <span class="text-[var(--text)]">{{ formatDate(ticket.createdAt) }}</span>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">Updated</span>
            <span class="text-[var(--text)]">{{ formatDate(ticket.updatedAt) }}</span>
          </div>

          <div v-if="ticket.slaDeadline" class="flex justify-between text-sm">
            <span class="text-[var(--text-muted)]">SLA Deadline</span>
            <span class="text-[var(--text)]">{{ formatDate(ticket.slaDeadline) }}</span>
          </div>

          <div v-if="ticket.tags && ticket.tags.length" class="flex flex-col gap-1 pt-1">
            <span class="text-[var(--text-muted)] text-sm">Tags</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="tag in ticket.tags"
                :key="tag"
                class="text-xs bg-[var(--surface-alt,#f0f0f0)] text-[var(--text)] px-2 py-0.5 rounded-full"
              >{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Add Comment -->
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-3">
          <h2 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide">Add Comment</h2>
          <Textarea
            v-model="commentText"
            placeholder="Write a comment..."
            :rows="5"
            class="w-full"
            :disabled="isSubmittingComment"
          />
          <div class="flex justify-end">
            <Button
              label="Submit Comment"
              icon="pi pi-send"
              :loading="isSubmittingComment"
              :disabled="!commentText.trim()"
              @click="submitComment"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
