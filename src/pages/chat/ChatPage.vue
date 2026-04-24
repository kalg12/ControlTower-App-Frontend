<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { chatService } from '@/services/chat.service'
import { qk } from '@/queries/keys'
import type { ChatConversation, ConversationStatus } from '@/types/chat'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ChatConversationView from '@/components/chat/ChatConversationView.vue'
import ChatTransferDialog from '@/components/chat/ChatTransferDialog.vue'

const qc = useQueryClient()
const statusFilter = ref<ConversationStatus | undefined>()
const selectedConv = ref<ChatConversation | null>(null)
const showTransfer = ref(false)

const { data, isLoading } = useQuery({
  queryKey: computed(() => qk.chatConversations(statusFilter.value)),
  queryFn: () => chatService.listConversations({ status: statusFilter.value, size: 50 }),
  refetchInterval: 15000,
})

const conversations = computed(() => data.value?.content ?? [])

const claimMut = useMutation({
  mutationFn: (id: string) => chatService.claim(id),
  onSuccess: (conv) => { invalidate(); selectedConv.value = conv },
})

const closeMut = useMutation({
  mutationFn: (id: string) => chatService.close(id),
  onSuccess: () => { invalidate(); selectedConv.value = null },
})

function invalidate() {
  qc.invalidateQueries({ queryKey: ['chat-conversations'] })
  qc.invalidateQueries({ queryKey: qk.chatUnreadCount() })
}

function statusSeverity(status: ConversationStatus) {
  const map: Record<ConversationStatus, string> = {
    WAITING: 'warn', ACTIVE: 'success', TRANSFERRED: 'info',
    CLOSED: 'secondary', ARCHIVED: 'secondary',
  }
  return map[status] ?? 'secondary'
}

function statusLabel(status: ConversationStatus) {
  const labels: Record<ConversationStatus, string> = {
    WAITING: 'Esperando', ACTIVE: 'Activo', TRANSFERRED: 'Transferido',
    CLOSED: 'Cerrado', ARCHIVED: 'Archivado',
  }
  return labels[status] ?? status
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m} min`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

const statusOptions = [
  { label: 'Todas', value: undefined },
  { label: 'Esperando', value: 'WAITING' },
  { label: 'Activas', value: 'ACTIVE' },
  { label: 'Cerradas', value: 'CLOSED' },
  { label: 'Archivadas', value: 'ARCHIVED' },
]
</script>

<template>
  <div class="flex gap-4 h-full">
    <!-- List panel -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-[var(--text)]">Chat de Soporte</h1>
        <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Filtrar estado" class="w-44 text-sm" />
      </div>

      <DataTable :value="conversations" :loading="isLoading" stripedRows rowHover
                 class="rounded-xl overflow-hidden shadow-sm border border-[var(--border)]"
                 selectionMode="single" @rowSelect="(e) => selectedConv = e.data">
        <Column field="visitorName" header="Visitante">
          <template #body="{ data: row }">
            <div class="font-medium text-sm">{{ row.visitorName }}</div>
            <div v-if="row.visitorEmail" class="text-xs text-[var(--text-muted)]">{{ row.visitorEmail }}</div>
          </template>
        </Column>
        <Column field="status" header="Estado">
          <template #body="{ data: row }">
            <Tag :value="statusLabel(row.status)" :severity="statusSeverity(row.status)" />
          </template>
        </Column>
        <Column field="agentName" header="Agente">
          <template #body="{ data: row }">
            <span class="text-sm text-[var(--text-muted)]">{{ row.agentName ?? '—' }}</span>
          </template>
        </Column>
        <Column field="source" header="Fuente">
          <template #body="{ data: row }">
            <span class="text-xs bg-[var(--bg-subtle)] px-2 py-0.5 rounded-full">{{ row.source }}</span>
          </template>
        </Column>
        <Column field="createdAt" header="Inicio">
          <template #body="{ data: row }">
            <span class="text-xs text-[var(--text-muted)]">{{ timeAgo(row.createdAt) }}</span>
          </template>
        </Column>
        <Column header="">
          <template #body="{ data: row }">
            <div class="flex gap-1">
              <Button v-if="row.status === 'WAITING'" label="Tomar" size="small" severity="success" @click.stop="claimMut.mutate(row.id)" />
              <Button v-if="row.status === 'ACTIVE'" label="Ver" size="small" @click.stop="selectedConv = row" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Conversation side panel -->
    <Transition name="slide-left">
      <div v-if="selectedConv" class="w-[400px] flex-shrink-0 border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg flex flex-col" style="height: calc(100vh - 140px)">
        <ChatConversationView
          :conversation="selectedConv"
          @close="selectedConv = null"
          @transfer="showTransfer = true"
          @closed="() => { invalidate(); selectedConv = null }"
        />
      </div>
    </Transition>
  </div>

  <ChatTransferDialog
    v-if="showTransfer && selectedConv"
    :conversation="selectedConv"
    @close="showTransfer = false"
    @transferred="() => { showTransfer = false; invalidate() }"
  />
</template>

<style scoped>
.slide-left-enter-active, .slide-left-leave-active { transition: all 0.25s ease; }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateX(20px); }
</style>
