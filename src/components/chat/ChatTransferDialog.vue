<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { chatService } from '@/services/chat.service'
import type { ChatConversation } from '@/types/chat'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'

const props = defineProps<{ conversation: ChatConversation }>()
const emit = defineEmits<{ close: []; transferred: [] }>()

const qc = useQueryClient()
const note = ref('')
const selectedAgentId = ref<string | null>(null)

// Load users list — reuse existing users query
const { data: usersData } = useQuery({
  queryKey: ['users-for-transfer'],
  queryFn: async () => {
    const { default: api } = await import('@/services/api')
    const res = await api.get('/users', { params: { page: 0, size: 100 } })
    return res.data
  },
})

const agents = computed(() => (usersData.value?.content ?? []).filter((u: any) => u.id !== props.conversation.agentId))

const transferMut = useMutation({
  mutationFn: () => chatService.transfer(props.conversation.id, {
    toAgentId: selectedAgentId.value!,
    note: note.value || undefined,
  }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    emit('transferred')
  },
})

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(name: string) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[Math.abs(h)]
}
</script>

<template>
  <Dialog :visible="true" modal header="Transferir conversación" :style="{ width: '420px' }" @update:visible="emit('close')">
    <div class="space-y-4">
      <!-- Agent list -->
      <div>
        <label class="text-sm font-medium text-[var(--text)] mb-2 block">Seleccionar agente</label>
        <div class="space-y-1 max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
          <div
            v-for="agent in agents"
            :key="agent.id"
            class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
            :class="selectedAgentId === agent.id ? 'bg-[var(--primary)]/10' : ''"
            @click="selectedAgentId = agent.id"
          >
            <div v-if="agent.avatarUrl" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img :src="agent.avatarUrl" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                 :style="{ background: avatarColor(agent.fullName) }">
              {{ initials(agent.fullName) }}
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium">{{ agent.fullName }}</div>
              <div class="text-xs text-[var(--text-muted)]">{{ agent.email }}</div>
            </div>
            <i v-if="selectedAgentId === agent.id" class="pi pi-check text-[var(--primary)]" />
          </div>
        </div>
      </div>

      <!-- Note -->
      <div>
        <label class="text-sm font-medium text-[var(--text)] mb-1 block">Nota para el agente (opcional)</label>
        <Textarea v-model="note" rows="2" class="w-full" placeholder="Contexto de la conversación..." />
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" @click="emit('close')" />
      <Button
        label="Transferir"
        icon="pi pi-arrow-right"
        :disabled="!selectedAgentId || transferMut.isPending.value"
        :loading="transferMut.isPending.value"
        @click="transferMut.mutate()"
      />
    </template>
  </Dialog>
</template>
