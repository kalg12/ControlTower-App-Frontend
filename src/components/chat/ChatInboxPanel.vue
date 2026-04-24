<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { Client as StompClient } from '@stomp/stompjs'
import { useAuthStore } from '@/stores/auth'
import { chatService } from '@/services/chat.service'
import { qk } from '@/queries/keys'
import type { ChatConversation, ChatMessagePayload } from '@/types/chat'
import ChatConversationView from './ChatConversationView.vue'
import ChatTransferDialog from './ChatTransferDialog.vue'
import { useConfirm } from 'primevue/useconfirm'

const auth = useAuthStore()
const qc = useQueryClient()
const confirm = useConfirm()

const open = ref(false)
const activeTab = ref<'WAITING' | 'ACTIVE' | 'ALL'>('WAITING')
const selectedConv = ref<ChatConversation | null>(null)
const showTransfer = ref(false)
const soundEnabled = ref(localStorage.getItem('chat:sound') !== 'false')

// ── Queries ─────────────────────────────────────────────────────────────────

const { data: waitingData } = useQuery({
  queryKey: qk.chatConversations('WAITING'),
  queryFn: () => chatService.listConversations({ status: 'WAITING', size: 50 }),
  refetchInterval: 15000,
  enabled: computed(() => auth.hasPermission('chat:read')),
})

const { data: activeData } = useQuery({
  queryKey: qk.chatConversations('ACTIVE'),
  queryFn: () => chatService.listConversations({ status: 'ACTIVE', size: 50 }),
  refetchInterval: 15000,
  enabled: computed(() => auth.hasPermission('chat:read')),
})

const { data: unreadData } = useQuery({
  queryKey: qk.chatUnreadCount(),
  queryFn: () => chatService.countWaiting(),
  refetchInterval: 20000,
  enabled: computed(() => auth.hasPermission('chat:read')),
})

const waitingList = computed(() => waitingData.value?.content ?? [])
const activeList = computed(() => activeData.value?.content ?? [])
const unreadCount = computed(() => unreadData.value ?? 0)

const displayList = computed(() => {
  if (activeTab.value === 'WAITING') return waitingList.value
  if (activeTab.value === 'ACTIVE') return activeList.value
  return [...waitingList.value, ...activeList.value]
})

// ── Mutations ────────────────────────────────────────────────────────────────

const claimMut = useMutation({
  mutationFn: (id: string) => chatService.claim(id),
  onSuccess: (conv) => {
    invalidateAll()
    selectedConv.value = conv
  },
})

const closeMut = useMutation({
  mutationFn: (id: string) => chatService.close(id),
  onSuccess: () => { invalidateAll(); selectedConv.value = null },
})

const archiveMut = useMutation({
  mutationFn: (id: string) => chatService.archive(id),
  onSuccess: () => { invalidateAll(); selectedConv.value = null },
})

function invalidateAll() {
  qc.invalidateQueries({ queryKey: ['chat-conversations'] })
  qc.invalidateQueries({ queryKey: qk.chatUnreadCount() })
}

// ── STOMP subscription for real-time queue ───────────────────────────────────

const stompClient = ref<StompClient | null>(null)

onMounted(() => {
  if (!auth.hasPermission('chat:read') || !auth.accessToken) return

  const baseUrl = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080').replace(/\/ws$/, '')
  const client = new StompClient({
    brokerURL: `${baseUrl}/ws`,
    connectHeaders: { Authorization: `Bearer ${auth.accessToken}` },
    reconnectDelay: 5000,
    onConnect: () => {
      const tenantId = auth.user?.tenantId
      if (!tenantId) return
      client.subscribe(`/topic/chat.queue.${tenantId}`, () => {
        invalidateAll()
        playBeep()
      })
    },
  })
  client.activate()
  stompClient.value = client
})

onUnmounted(() => stompClient.value?.deactivate())

// ── Sound ────────────────────────────────────────────────────────────────────

function playBeep() {
  if (!soundEnabled.value) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 523
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  localStorage.setItem('chat:sound', String(soundEnabled.value))
}

// ── Actions ──────────────────────────────────────────────────────────────────

function openConversation(conv: ChatConversation) {
  if (conv.status === 'WAITING') {
    claimMut.mutate(conv.id)
  } else {
    selectedConv.value = conv
  }
}

function confirmClose(conv: ChatConversation) {
  confirm.require({
    message: `¿Cerrar la conversación con ${conv.visitorName}?`,
    header: 'Cerrar conversación',
    accept: () => closeMut.mutate(conv.id),
  })
}

function confirmArchive(conv: ChatConversation) {
  confirm.require({
    message: `¿Archivar esta conversación?`,
    header: 'Archivar',
    accept: () => archiveMut.mutate(conv.id),
  })
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(name: string) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[Math.abs(h)]
}
</script>

<template>
  <!-- Bubble button -->
  <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

    <!-- Conversation view panel -->
    <Transition name="slide-up">
      <div v-if="open && selectedConv" class="w-[380px] h-[520px] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg)] flex flex-col">
        <ChatConversationView
          :conversation="selectedConv"
          @close="selectedConv = null"
          @transfer="showTransfer = true"
          @closed="() => { invalidateAll(); selectedConv = null }"
        />
      </div>

      <!-- Inbox panel -->
      <div v-else-if="open" class="w-[380px] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg)] flex flex-col" style="max-height: 520px">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-white">
          <div class="flex items-center gap-2">
            <i class="pi pi-comments text-lg" />
            <span class="font-semibold">Chat de Soporte</span>
          </div>
          <div class="flex items-center gap-2">
            <button class="opacity-70 hover:opacity-100 transition-opacity text-lg" @click="toggleSound" :title="soundEnabled ? 'Silenciar' : 'Activar sonido'">
              {{ soundEnabled ? '🔔' : '🔕' }}
            </button>
            <button class="opacity-70 hover:opacity-100 transition-opacity" @click="open = false">
              <i class="pi pi-minus" />
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-[var(--border)]">
          <button
            v-for="tab in [{ key: 'WAITING', label: 'Esperando' }, { key: 'ACTIVE', label: 'Activos' }, { key: 'ALL', label: 'Todos' }]"
            :key="tab.key"
            class="flex-1 py-2 text-xs font-medium transition-colors"
            :class="activeTab === tab.key ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
            @click="activeTab = tab.key as any"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'WAITING' && waitingList.length" class="ml-1 rounded-full bg-red-500 text-white px-1.5 py-0.5 text-[10px]">{{ waitingList.length }}</span>
          </button>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          <div v-if="!displayList.length" class="flex flex-col items-center justify-center h-32 text-[var(--text-muted)] text-sm gap-2">
            <i class="pi pi-inbox text-2xl opacity-40" />
            <span>Sin conversaciones</span>
          </div>

          <div
            v-for="conv in displayList"
            :key="conv.id"
            class="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] cursor-pointer group"
            @click="openConversation(conv)"
          >
            <!-- Avatar -->
            <div class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                 :style="{ background: avatarColor(conv.visitorName) }">
              {{ initials(conv.visitorName) }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm truncate">{{ conv.visitorName }}</span>
                <span class="text-[10px] text-[var(--text-muted)] ml-2 flex-shrink-0">{{ timeAgo(conv.createdAt) }}</span>
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs rounded-full px-2 py-0.5 font-medium"
                      :class="{
                        'bg-yellow-100 text-yellow-700': conv.status === 'WAITING',
                        'bg-green-100 text-green-700': conv.status === 'ACTIVE',
                        'bg-gray-100 text-gray-500': conv.status === 'CLOSED' || conv.status === 'ARCHIVED',
                      }">
                  {{ conv.status === 'WAITING' ? 'Esperando' : conv.status === 'ACTIVE' ? 'En vivo' : conv.status }}
                </span>
                <span v-if="conv.agentName" class="text-[10px] text-[var(--text-muted)] truncate">{{ conv.agentName }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex-shrink-0 hidden group-hover:flex items-center gap-1" @click.stop>
              <button v-if="conv.status === 'ACTIVE'" class="p-1 rounded hover:bg-red-50 text-red-500 text-xs" title="Cerrar" @click="confirmClose(conv)">
                <i class="pi pi-times" />
              </button>
              <button v-if="conv.status === 'CLOSED'" class="p-1 rounded hover:bg-gray-100 text-gray-400 text-xs" title="Archivar" @click="confirmArchive(conv)">
                <i class="pi pi-inbox" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Floating button -->
    <button
      class="w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center relative"
      @click="open = !open"
    >
      <i class="pi pi-comments text-xl" />
      <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>
  </div>

  <!-- Transfer dialog -->
  <ChatTransferDialog
    v-if="showTransfer && selectedConv"
    :conversation="selectedConv"
    @close="showTransfer = false"
    @transferred="() => { showTransfer = false; invalidateAll() }"
  />
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }
</style>
