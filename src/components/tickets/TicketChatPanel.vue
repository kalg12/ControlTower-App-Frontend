<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import { ticketsService } from '@/services/tickets.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useNotificationsStore } from '@/stores/notifications'

dayjs.extend(relativeTime)

const props = defineProps<{ ticketId: string }>()
const toast = useToast()
const qc = useQueryClient()
const notifStore = useNotificationsStore()

const replyText = ref('')
const isSubmitting = ref(false)
const bottomRef = ref<HTMLElement | null>(null)

const { data: comments, isLoading } = useQuery({
  queryKey: computed(() => ['ticket-comments', props.ticketId]),
  queryFn: () => ticketsService.getComments(props.ticketId),
  staleTime: 15_000,
  refetchInterval: 30_000,
})

// Refresh comments when a POS_CHAT notification arrives
const stopWatch = watch(
  () => notifStore.items[0],
  (latest) => {
    if (latest?.type === 'POS_CHAT') {
      qc.invalidateQueries({ queryKey: ['ticket-comments', props.ticketId] })
    }
  }
)
onUnmounted(() => stopWatch())

watch(comments, () => {
  nextTick(() => {
    bottomRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
})

async function submitReply() {
  if (!replyText.value.trim()) return
  isSubmitting.value = true
  try {
    await ticketsService.addComment(props.ticketId, replyText.value.trim(), false)
    replyText.value = ''
    await qc.invalidateQueries({ queryKey: ['ticket-comments', props.ticketId] })
    toast.success('Reply sent')
  } catch {
    toast.error('Failed to send reply')
  } finally {
    isSubmitting.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submitReply()
  }
}

function fromNow(dateStr: string) {
  return dayjs(dateStr).fromNow()
}
</script>

<template>
  <div class="rounded-xl border border-orange-200 dark:border-orange-800 bg-[var(--surface)] flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-orange-50 dark:bg-orange-950/20">
      <i class="pi pi-comments text-orange-500 text-sm" />
      <span class="text-sm font-semibold text-orange-600 dark:text-orange-400">Chat con POS</span>
      <span v-if="comments" class="ml-auto text-xs text-[var(--text-muted)]">
        {{ comments.length }} mensaje{{ comments.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[120px] max-h-[320px]">
      <template v-if="isLoading">
        <Skeleton v-for="i in 3" :key="i" height="2.5rem" class="rounded-xl" />
      </template>

      <template v-else-if="!comments || comments.length === 0">
        <p class="text-center text-sm text-[var(--text-muted)] py-4">
          No hay mensajes aún.
        </p>
      </template>

      <template v-else>
        <div
          v-for="msg in comments"
          :key="msg.id"
          class="flex flex-col gap-0.5"
          :class="msg.senderType === 'OPERATOR' ? 'items-end' : 'items-start'"
        >
          <p class="text-xs font-medium text-[var(--text-muted)]">
            {{ msg.senderType === 'OPERATOR' ? 'Tú (operador)' : 'Cliente POS' }}
          </p>
          <div
            class="max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words"
            :class="msg.senderType === 'OPERATOR'
              ? 'bg-[var(--primary)] text-white rounded-tr-sm'
              : 'bg-orange-100 dark:bg-orange-900/40 text-[var(--text)] rounded-tl-sm'"
          >
            {{ msg.content }}
          </div>
          <p class="text-[10px] text-[var(--text-muted)]">{{ fromNow(msg.createdAt) }}</p>
        </div>
        <div ref="bottomRef" />
      </template>
    </div>

    <!-- Reply input -->
    <div class="px-5 py-3 border-t border-[var(--border)] flex gap-2 items-end">
      <Textarea
        v-model="replyText"
        placeholder="Escribe una respuesta al cliente POS..."
        :rows="2"
        class="flex-1 resize-none text-sm"
        :disabled="isSubmitting"
        @keydown="handleKeydown"
      />
      <Button
        icon="pi pi-send"
        :loading="isSubmitting"
        :disabled="!replyText.trim()"
        @click="submitReply"
        v-tooltip.top="'Enviar (Enter)'"
      />
    </div>
  </div>
</template>
